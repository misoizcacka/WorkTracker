package app.koordinate.backgroundlocation

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
import kotlinx.coroutines.tasks.await
import java.util.UUID

class PeriodicLocationTrackingService : Service() {

    companion object {
        /**
         * In-process liveness flag. Set true in onCreate, false in onDestroy.
         * WorkManager reads this instead of the deprecated getRunningServices().
         * AtomicBoolean is used for safe cross-thread reads (WorkManager runs on
         * a background thread in the same process).
         */
        val isRunning = java.util.concurrent.atomic.AtomicBoolean(false)
    }

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
        isRunning.set(true)
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

        // 1. PRIORITIZE GEOFENCE CHECK (with hybrid GPS+WiFi quality detection)
        // Get location quality for hybrid geofence detection
        val quality = Constants.getLocationQuality(location)
        
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
                
                // HYBRID GEOFENCE POLICY:
                // - ENTER: Accept GPS OR high-quality WiFi (trust >= 60, well inside geofence)
                // - EXIT: Require GPS (trust >= 75, no WiFi exits - too risky)
                val eventType = if (isNowInside) "enter_geofence" else "exit_geofence"
                val canTriggerTransition: Boolean = if (quality == null) {
                    false
                } else if (isNowInside) {
                    // ENTER: Allow GPS or high-quality WiFi
                    val isGPS = quality.source == LocationSource.GPS_HIGH_QUALITY || 
                                quality.source == LocationSource.GPS_MEDIUM_QUALITY
                    val isGoodWiFi = quality.trustScore >= 60 && location.accuracy < it.radius * 0.4f
                    isGPS || isGoodWiFi
                } else {
                    // EXIT: Require GPS only
                    quality.trustScore >= 75  // GPS_MEDIUM_QUALITY or better
                }
                
                if (!canTriggerTransition) {
                    val reason = if (quality == null) {
                        "location quality too poor"
                    } else if (isNowInside) {
                        "WiFi quality insufficient for entry (trust: ${quality.trustScore}%, accuracy: ${location.accuracy.toInt()}m)"
                    } else {
                        "GPS required for exit (got: ${quality.source.label}, trust: ${quality.trustScore}%)"
                    }
                    LocationFileLogger.w(
                        this@PeriodicLocationTrackingService,
                        "Geofence",
                        "⚠️ Geofence $eventType blocked: $reason"
                    )
                    Log.w("PeriodicLocationTrackingService", "Skipping geofence transition: $reason")
                    return@forEach
                }
                
                Log.d("PeriodicLocationTrackingService", "MANUAL transition/initial state detected for ${it.id}: $status (source: ${quality?.source?.label})")
                sharedPrefs.edit().putBoolean(manualKey, isNowInside).apply()
                transitionDetected = true

                if (workerId != null && companyId != null) {
                    serviceScope.launch {
                        BackgroundLocationManager.sendGeofenceTransitionEvent(
                            applicationContext, it.id, eventType, workerId, companyId, location.latitude, location.longitude, svc
                        )
                        
                        // Log geofence transition to file with quality metadata
                        val qualityIcon = when(quality?.source) {
                            LocationSource.GPS_HIGH_QUALITY -> "🟢"
                            LocationSource.GPS_MEDIUM_QUALITY -> "🟡"
                            LocationSource.WIFI_HIGH_CONFIDENCE -> "🔵"
                            else -> "⚪"
                        }
                        LocationFileLogger.i(
                            this@PeriodicLocationTrackingService,
                            "Geofence",
                            "$qualityIcon ${if (isNowInside) "ENTER" else "EXIT"} geofence ${it.id.take(8)} " +
                            "(dist: ${dist.toInt()}m, source: ${quality?.source?.label}, trust: ${quality?.trustScore}%)"
                        )
                        
                        // Record timestamp so AlarmManager knows geofence events are working
                        sharedPrefs.edit()
                            .putLong(Constants.KEY_LAST_FUSED_EVENT_TIME, System.currentTimeMillis())
                            .apply()
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

        // HYBRID LOCATION QUALITY: Use the quality already calculated above
        // (quality was already computed for geofence checking)
        if (quality == null) {
            LocationFileLogger.w(
                this,
                "LocationUpdate",
                "⚠️ Location quality too poor (accuracy: ${location.accuracy.toInt()}m), rejecting."
            )
            Log.w("PeriodicLocationTrackingService", "Rejecting location with insufficient quality")
            return
        }
        
        // For periodic updates: accept GPS (any) + WiFi with trust >= 40
        if (quality.trustScore < 40) {
            LocationFileLogger.w(
                this,
                "LocationUpdate",
                "⚠️ Location trust score too low (${quality.trustScore}%, source: ${quality.source.label}), rejecting."
            )
            Log.w("PeriodicLocationTrackingService", "Rejecting location with trust score ${quality.trustScore}")
            return
        }

        Log.d("PeriodicLocationTrackingService", "--- PERIODIC LOCATION UPDATE ---")
        if (workerId != null && companyId != null && currentAssignmentId != null) {
            lastLocationSentTime = currentTime
            serviceScope.launch {
                val eventId = UUID.randomUUID().toString()
                val timestamp = System.currentTimeMillis()
                val type = if (isTrackingActive) "active_tracking" else "passive_tracking"
                
                // Prepare notes with quality metadata
                val notes = buildString {
                    append("Periodic update ($type)")
                    append(" | Source: ${quality.source.label}")
                    append(" | Trust: ${quality.trustScore}%")
                    append(" | Confidence: ${quality.confidence}")
                    if (quality.payrollVerified) append(" | ✅ Payroll verified")
                }
                
                svc.sendLocationEvent(
                    id = eventId,
                    timestamp = timestamp,
                    type = type,
                    assignmentId = currentAssignmentId,
                    workerId = workerId,
                    companyId = companyId,
                    latitude = location.latitude,
                    longitude = location.longitude,
                    notes = notes
                )
                
                // Log to file for diagnostics
                val qualityIcon = when(quality.source) {
                    LocationSource.GPS_HIGH_QUALITY -> "🟢"
                    LocationSource.GPS_MEDIUM_QUALITY -> "🟡"
                    LocationSource.WIFI_HIGH_CONFIDENCE -> "🔵"
                    LocationSource.WIFI_MEDIUM_CONFIDENCE -> "⚪"
                    else -> "⚫"
                }
                
                LocationFileLogger.i(
                    this@PeriodicLocationTrackingService,
                    "LocationUpdate",
                    "$qualityIcon Periodic update ($type): (${String.format("%.6f", location.latitude)}, ${String.format("%.6f", location.longitude)}) " +
                    "accuracy: ${location.accuracy}m, source: ${quality.source.label}, trust: ${quality.trustScore}%"
                )
                
                // Record timestamp so AlarmManager knows FusedLocationProvider is working
                sharedPrefs.edit()
                    .putLong(Constants.KEY_LAST_FUSED_EVENT_TIME, timestamp)
                    .apply()
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
        
        // Start AlarmManager fallback — guaranteed location updates every 6 min even in Doze mode
        LocationAlarmScheduler.scheduleNextAlarm(this)
        Log.d("PeriodicLocationTrackingService", "AlarmManager fallback started (6-min intervals)")
        LocationFileLogger.i(this, "Service", "Location tracking started: ${activeAssignments.size} geofences registered")

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
            
            // CRITICAL FIX: Determine correct initial mode by checking actual location
            // Don't just guess - this prevents stationary throttling when worker checks in while on-site
            serviceScope.launch {
                try {
                    val currentLocation = fusedLocationClient.lastLocation.await()
                    
                    if (currentLocation != null) {
                        // Check if worker is inside ANY geofence
                        val isInsideAny = activeAssignments.any { assignment ->
                            val geofenceLocation = Location("geofence").apply {
                                latitude = assignment.latitude
                                longitude = assignment.longitude
                            }
                            val distance = currentLocation.distanceTo(geofenceLocation)
                            val inside = distance <= assignment.radius
                            
                            if (inside) {
                                Log.d("PeriodicLocationTrackingService", 
                                    "Worker is inside geofence ${assignment.id.take(8)} (${distance.toInt()}m from center)")
                            }
                            inside
                        }
                        
                        // Save the CORRECT initial state
                        sharedPrefs.edit()
                            .putBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, isInsideAny)
                            .apply()
                        
                        // Start in the CORRECT mode from the beginning
                        startLocationUpdates(!isInsideAny)
                        
                        LocationFileLogger.i(
                            this@PeriodicLocationTrackingService,
                            "Service",
                            "Initial mode determined: ${if (isInsideAny) "PASSIVE (inside geofence)" else "ACTIVE (outside all geofences)"}"
                        )
                    } else {
                        // Couldn't get location - use safe default (ACTIVE)
                        Log.w("PeriodicLocationTrackingService", "No last location available, defaulting to ACTIVE mode")
                        LocationFileLogger.w(
                            this@PeriodicLocationTrackingService,
                            "Service",
                            "No initial location available, defaulting to ACTIVE mode (safe default)"
                        )
                        startLocationUpdates(true)
                    }
                } catch (e: Exception) {
                    Log.e("PeriodicLocationTrackingService", "Error determining initial mode: ${e.message}, defaulting to ACTIVE")
                    LocationFileLogger.e(
                        this@PeriodicLocationTrackingService,
                        "Service",
                        "Error determining initial mode: ${e.message}, defaulting to ACTIVE"
                    )
                    startLocationUpdates(true)
                }
            }
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
        LocationFileLogger.i(this, "Service", "Mode switched to: ${if (active) "ACTIVE (outside geofence)" else "PASSIVE (inside geofence)"}")
        fusedLocationClient.removeLocationUpdates(locationCallback)
        
        val interval = if (active) {
            Constants.ACTIVE_TRACKING_INTERVAL_MS
        } else {
            Constants.PASSIVE_TRACKING_INTERVAL_MS
        }

        // Active mode (worker outside geofence, traveling):
        //   PRIORITY_HIGH_ACCURACY forces GPS satellites for reliable outdoor tracking.
        //   This ensures we get real GPS (not cell tower triangulation) when traveling.
        //   Battery cost is acceptable because travel periods are short (15-45 min).
        //   setWaitForAccurateLocation(false) allows quick first fix, then improves.
        //   setMaxWaitTime() batches updates for battery efficiency while maintaining data.
        //   setMinUpdateDistanceMeters() prevents stationary spam.
        //
        // Passive mode (worker on site, stationary):
        //   BALANCED_POWER is sufficient — we just need proof-of-presence, not
        //   precise movement tracking. Network + WiFi scanning works great for stationary.
        val priority = if (active) {
            Priority.PRIORITY_HIGH_ACCURACY  // Force GPS for traveling workers
        } else {
            Priority.PRIORITY_BALANCED_POWER_ACCURACY  // WiFi/network OK when stationary
        }
        
        val request = if (active) {
            LocationRequest.Builder(priority, interval)
                .setMinUpdateIntervalMillis(interval / 2)  // Allow faster updates if available
                .setMaxUpdateDelayMillis(interval)         // Never defer longer than our interval
                .setWaitForAccurateLocation(false)         // Don't wait for perfect GPS lock (accept quick fix)
                .setMinUpdateDistanceMeters(20f)           // Only update when moved 20m (prevents stationary throttle)
                .build()
        } else {
            LocationRequest.Builder(priority, interval)
                .setMinUpdateIntervalMillis(interval)      // Passive: stick to the interval
                .setMaxUpdateDelayMillis(interval + 60_000L) // Allow batching — fine for on-site
                .setWaitForAccurateLocation(false)         // Network accuracy is fine when stationary
                .build()
        }

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
        isRunning.set(false)
        fusedLocationClient.removeLocationUpdates(locationCallback)
        BackgroundLocationManager.stopPeriodicUpdates(this)
        LocationAlarmScheduler.cancelAlarms(this)
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
