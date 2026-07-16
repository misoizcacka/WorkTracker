package app.koord.backgroundlocation

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID

class PeriodicLocationTrackingService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var geofencingClient: GeofencingClient
    private lateinit var locationCallback: LocationCallback
    // Single SupabaseService instance — created once in onCreate so we reuse the
    // OkHttpClient connection pool and avoid spawning new threads on every callback.
    private var supabaseService: SupabaseService? = null
    private var isTrackingActive = false
    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(
        Dispatchers.IO + serviceJob + CoroutineExceptionHandler { _, throwable ->
            Log.e("PeriodicLocationTrackingService", "Uncaught coroutine exception: ${throwable.message}", throwable)
        }
    )
    private var activeAssignments: List<GeofenceAssignment> = emptyList()
    private var lastLocationSentTime: Long = 0L

    private val geofencePendingIntent: PendingIntent by lazy {
        val intent = Intent(this, GeofenceBroadcastReceiver::class.java)
        // Ensure the intent is explicit to the receiver class
        intent.setPackage(packageName)
        
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        PendingIntent.getBroadcast(this, Constants.GEOFENCE_PENDING_INTENT_REQUEST_CODE, intent, flags)
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        
        // Use applicationContext for clients to avoid service-context permission quirks
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(applicationContext)
        geofencingClient = LocationServices.getGeofencingClient(applicationContext)
        
        // Log battery optimization status - if optimized, geofences often fail
        val powerManager = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
        val isIgnoringBatteryOptimizations = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            powerManager.isIgnoringBatteryOptimizations(packageName)
        } else true
        Log.d("PeriodicLocationTrackingService", "Battery Optimization Ignored: $isIgnoringBatteryOptimizations (Geofencing works best when TRUE)")

        loadAssignmentsFromPrefs()

        // Build the single shared SupabaseService now that prefs are available.
        // If credentials are not stored yet (first cold start before JS calls start()),
        // supabaseService stays null and handleLocationResult will skip sending — safe.
        val sharedPrefs = getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val supabaseUrl = sharedPrefs.getString(Constants.KEY_SUPABASE_URL, null)
        val supabaseKey = sharedPrefs.getString(Constants.KEY_SUPABASE_PUBLISHABLE_KEY, null)
        if (supabaseUrl != null && supabaseKey != null) {
            supabaseService = SupabaseService(applicationContext, supabaseUrl, supabaseKey, DeviceAuthenticator(applicationContext))
        }

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                try {
                    handleLocationResult(locationResult)
                } catch (e: Exception) {
                    Log.e("PeriodicLocationTrackingService", "Unhandled exception in locationCallback: ${e.message}", e)
                }
            }
        }
    }

    private fun handleLocationResult(locationResult: LocationResult) {
        val location = locationResult.lastLocation ?: return
        val currentTime = System.currentTimeMillis()

        if (activeAssignments.isEmpty()) {
            loadAssignmentsFromPrefs()
        }

        val sharedPrefs = getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val workerId = sharedPrefs.getString(Constants.KEY_WORKER_ID, null)
        val companyId = sharedPrefs.getString(Constants.KEY_COMPANY_ID, null)
        val supabaseUrl = sharedPrefs.getString(Constants.KEY_SUPABASE_URL, null)
        val supabaseKey = sharedPrefs.getString(Constants.KEY_SUPABASE_PUBLISHABLE_KEY, null)
        val currentAssignmentId = sharedPrefs.getString(Constants.KEY_ASSIGNMENT_ID, null)

        // Lazily build supabaseService if it wasn't available at onCreate time
        // (credentials arrive via start() which runs after the service is created on boot).
        if (supabaseService == null && supabaseUrl != null && supabaseKey != null) {
            supabaseService = SupabaseService(applicationContext, supabaseUrl, supabaseKey, DeviceAuthenticator(applicationContext))
        }
        val svc = supabaseService ?: return  // no credentials yet — nothing to send

        // 1. PRIORITIZE GEOFENCE CHECK
        var transitionDetected = false
        activeAssignments.forEach {
            val target = Location("target").apply { latitude = it.latitude; longitude = it.longitude }
            val dist = location.distanceTo(target)
            val isNowInside = dist <= it.radius
            val status = if (isNowInside) "INSIDE" else "OUTSIDE"
            Log.d("PeriodicLocationTrackingService", "Fence ${it.id.take(8)}: Dist ${dist.toInt()}m -> $status")

            val manualKey = "manual_inside_${it.id}"
            val hasPreviousState = sharedPrefs.contains(manualKey)
            val wasInside = sharedPrefs.getBoolean(manualKey, !isNowInside)

            if (isNowInside != wasInside || !hasPreviousState) {
                val isRealTransition = hasPreviousState
                val isInitialEntry = !hasPreviousState && isNowInside
                if (!isRealTransition && !isInitialEntry) {
                    sharedPrefs.edit().putBoolean(manualKey, isNowInside).apply()
                    return@forEach
                }
                Log.d("PeriodicLocationTrackingService", "MANUAL transition/initial state detected for ${it.id}: $status")
                sharedPrefs.edit().putBoolean(manualKey, isNowInside).apply()
                transitionDetected = true

                val eventType = if (isNowInside) "enter_geofence" else "exit_geofence"
                if (workerId != null && companyId != null) {
                    serviceScope.launch {
                        BackgroundLocationManager.sendGeofenceTransitionEvent(
                            applicationContext, it.id, eventType, workerId, companyId, location.latitude, location.longitude, svc
                        )
                    }
                }

                if (it.id == currentAssignmentId) {
                    sharedPrefs.edit().putBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, isNowInside).apply()
                    startLocationUpdates(!isNowInside)
                }
            }
        }

        if (transitionDetected) {
            lastLocationSentTime = currentTime
        }

        // 2. PERIODIC TRACKING LOGIC
        val interval = if (isTrackingActive) Constants.ACTIVE_TRACKING_INTERVAL_MS else Constants.PASSIVE_TRACKING_INTERVAL_MS
        if (currentTime - lastLocationSentTime < interval - 5000L) {
            Log.d("PeriodicLocationTrackingService", "Skipping periodic update - event recently sent. Mode: ${if (isTrackingActive) "ACTIVE" else "PASSIVE"}")
            return
        }

        Log.d("PeriodicLocationTrackingService", "--- PERIODIC LOCATION UPDATE ---")
        if (workerId != null && companyId != null && currentAssignmentId != null) {
            lastLocationSentTime = currentTime
            serviceScope.launch {
                val eventId = UUID.randomUUID().toString()
                val timestamp = System.currentTimeMillis()
                val type = if (isTrackingActive) "active_tracking" else "passive_tracking"
                
                svc.sendLocationEvent(
                    id = eventId,
                    timestamp = timestamp,
                    type = type,
                    assignmentId = currentAssignmentId,
                    workerId = workerId,
                    companyId = companyId,
                    latitude = location.latitude,
                    longitude = location.longitude,
                    notes = "Periodic update ($type)"
                )
            }
        }
    }

    private fun loadAssignmentsFromPrefs() {
        try {
            val sharedPrefs = getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
            val json = sharedPrefs.getString(Constants.SHARED_PREFS_KEY_GEOFENCE_ASSIGNMENTS, null)
            if (json != null) {
                val type = object : TypeToken<List<GeofenceAssignment>>() {}.type
                val assignments: List<GeofenceAssignment> = Gson().fromJson(json, type)
                activeAssignments = assignments.filter { it.status != "completed" }
                Log.d("PeriodicLocationTrackingService", "Loaded ${activeAssignments.size} fences.")
            }
        } catch (e: Exception) {
            Log.e("PeriodicLocationTrackingService", "Load Error: ${e.message}")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val appPackageName = applicationContext.packageName
        showForegroundNotification(appPackageName)

        val action = intent?.action
        if (action == Constants.ACTION_START_ACTIVE_TRACKING) {
            startLocationUpdates(true)
            return START_STICKY
        } else if (action == Constants.ACTION_STOP_ACTIVE_TRACKING) {
            startLocationUpdates(false)
            return START_STICKY
        }

        val geofenceJson = intent?.getStringExtra("geofence_data")
        if (geofenceJson != null) {
            // Credentials were just written to SharedPreferences by BackgroundLocationModule.start()
            // — rebuild the SupabaseService so it picks up any updated url/key.
            val sp = getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
            val url = sp.getString(Constants.KEY_SUPABASE_URL, null)
            val key = sp.getString(Constants.KEY_SUPABASE_PUBLISHABLE_KEY, null)
            if (url != null && key != null) {
                supabaseService = SupabaseService(applicationContext, url, key, DeviceAuthenticator(applicationContext))
            }
            registerGeofences(geofenceJson)
        } else {
            // Default to false (outside) so the service starts in ACTIVE mode on restart.
            // This is the safe default: if we don't know, assume the worker needs tracking.
            val isInside = getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, false)
            startLocationUpdates(!isInside)
        }

        return START_STICKY
    }

    private fun registerGeofences(json: String) {
        // Debounce: ignore if we registered less than 3 seconds ago to prevent double-registration races
        val now = System.currentTimeMillis()
        if (now - lastGeofenceRegistrationTime < 3000L) {
            Log.d("PeriodicLocationTrackingService", "registerGeofences debounced — called too soon after last registration.")
            return
        }
        lastGeofenceRegistrationTime = now

        loadAssignmentsFromPrefs()
        
        // Clear in-memory dedup cache so a fresh check-in always fires new events
        BackgroundLocationManager.clearCache()

        // Start WorkManager fallback pings — ensures events are sent even when FusedLocation throttles delivery
        BackgroundLocationManager.startPeriodicUpdates(this)

        // Clear old manual states when re-registering
        val sharedPrefs = getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val editor = sharedPrefs.edit()
        sharedPrefs.all.keys.filter { it.startsWith("manual_inside_") }.forEach { editor.remove(it) }
        editor.apply()

        val geofences = activeAssignments.map {
            Geofence.Builder()
                .setRequestId(it.id)
                .setCircularRegion(it.latitude, it.longitude, it.radius)
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
                .setNotificationResponsiveness(30000) // 30 seconds - more OS friendly than 0
                .build()
        }

        if (geofences.isNotEmpty()) {
            val request = GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                .addGeofences(geofences)
                .build()

            try {
                geofencingClient.removeGeofences(geofencePendingIntent).addOnCompleteListener {
                    geofencingClient.addGeofences(request, geofencePendingIntent).addOnSuccessListener {
                        Log.d("PeriodicLocationTrackingService", "Geofences REGISTERED with BroadcastReceiver (Initial Trigger: ENTER).")
                    }.addOnFailureListener {
                        Log.e("PeriodicLocationTrackingService", "Geofence Registration FAILED: ${it.message}")
                    }
                }
            } catch (e: SecurityException) {
                Log.e("PeriodicLocationTrackingService", "Security error during geofence reg: ${e.message}")
            }
            
            // Default to false (outside/active mode) if we have no prior state.
            val isInside = sharedPrefs.getBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, false)
            startLocationUpdates(!isInside)
        }
    }

    private var currentModeIsActive: Boolean? = null
    private var lastGeofenceRegistrationTime: Long = 0L

    private fun startLocationUpdates(active: Boolean) {
        if (currentModeIsActive == active) {
            Log.d("PeriodicLocationTrackingService", "Updates already in mode: ${if (active) "ACTIVE" else "PASSIVE"}. Skipping restart.")
            return
        }
        
        currentModeIsActive = active
        isTrackingActive = active
        fusedLocationClient.removeLocationUpdates(locationCallback)
        
        val interval = if (active) {
            Constants.ACTIVE_TRACKING_INTERVAL_MS
        } else {
            Constants.PASSIVE_TRACKING_INTERVAL_MS
        }
        // Use BALANCED priority for passive mode — HIGH_ACCURACY on a stationary device
        // triggers the OS "too fast / too close" throttle and stops delivering updates entirely.
        val priority = if (active) Priority.PRIORITY_HIGH_ACCURACY else Priority.PRIORITY_BALANCED_POWER_ACCURACY
        val request = LocationRequest.Builder(priority, interval)
            .setMinUpdateIntervalMillis(interval)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
            Log.d("PeriodicLocationTrackingService", "Updates Started: ${if (active) "ACTIVE" else "PASSIVE"}")
        } catch (e: SecurityException) { Log.e("PeriodicLocationTrackingService", "Perm Error: $e") }
    }

    private fun showForegroundNotification(appPackageName: String) {
        // Class.forName can throw ClassNotFoundException on some Expo/EAS builds where
        // MainActivity lives at a different path — fall back to a generic launch intent.
        val notificationIntent = try {
            Intent(applicationContext, Class.forName("$appPackageName.MainActivity")
                .asSubclass(android.app.Activity::class.java))
        } catch (e: ClassNotFoundException) {
            Log.w("PeriodicLocationTrackingService", "MainActivity not found at $appPackageName.MainActivity, using fallback intent")
            applicationContext.packageManager.getLaunchIntentForPackage(appPackageName)
                ?: Intent(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_LAUNCHER) }
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val iconResId = applicationContext.resources.getIdentifier("ic_launcher", "mipmap", appPackageName)

        val locationName = getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
            .getString(Constants.KEY_LOCATION_NAME, null)

        val contentTitle = if (!locationName.isNullOrBlank()) "Working at $locationName" else "Koord — Work Session Active"
        val contentText = "Location tracking is active."
        
        val notification = NotificationCompat.Builder(this, Constants.NOTIFICATION_CHANNEL_ID)
            .setContentTitle(contentTitle)
            .setContentText(contentText)
            .setSmallIcon(if (iconResId != 0) iconResId else android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(Constants.GEOFENCE_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(Constants.GEOFENCE_NOTIFICATION_ID, notification)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // When the user swipes the app away, restart the service if a session is still active.
        val sharedPrefs = getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val workerId = sharedPrefs.getString(Constants.KEY_WORKER_ID, null)
        if (workerId != null) {
            Log.d("PeriodicLocationTrackingService", "App task removed with active session — scheduling restart.")
            val restartIntent = Intent(applicationContext, PeriodicLocationTrackingService::class.java)
            val pendingIntent = android.app.PendingIntent.getService(
                applicationContext, 1, restartIntent,
                android.app.PendingIntent.FLAG_ONE_SHOT or android.app.PendingIntent.FLAG_IMMUTABLE
            )
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            alarmManager.set(
                android.app.AlarmManager.ELAPSED_REALTIME_WAKEUP,
                android.os.SystemClock.elapsedRealtime() + 2000L,
                pendingIntent
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        BackgroundLocationManager.stopPeriodicUpdates(this)
        serviceJob.cancel()
        Log.d("PeriodicLocationTrackingService", "Service destroyed.")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(Constants.NOTIFICATION_CHANNEL_ID, Constants.NOTIFICATION_CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
