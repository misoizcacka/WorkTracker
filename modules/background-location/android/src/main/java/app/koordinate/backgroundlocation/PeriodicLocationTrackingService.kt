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

/**
 * Tracking modes for the location service.
 * 
 * PASSIVE: Worker confirmed inside geofence - balanced power, 5-min updates
 * EXIT_PENDING: Possible exit detected - HIGH ACCURACY, 30-sec updates to confirm with GPS
 * ACTIVE: Worker confirmed outside geofence - high accuracy, 1-min updates
 */
enum class TrackingMode {
    PASSIVE,        // Inside geofence - balanced power, slow updates
    EXIT_PENDING,   // Verifying exit - HIGH ACCURACY, fast updates
    ACTIVE          // Outside geofence - high accuracy, regular updates
}

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
    private var currentMode = TrackingMode.PASSIVE
    private var isTrackingActive = false  // Deprecated: use currentMode instead
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

        // 1. PRIORITIZE GEOFENCE CHECK (with hybrid GPS+WiFi quality detection + EXIT_PENDING state)
        // Get location quality for hybrid geofence detection
        val quality = Constants.getLocationQuality(location)
        
        val isExitPending = sharedPrefs.getBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, false)
        
        var transitionDetected = false
        var modeChangeNeeded = false
        var newMode: TrackingMode? = null
        
        activeAssignments.forEach {
            val target = Location("target").apply { latitude = it.latitude; longitude = it.longitude }
            val dist = location.distanceTo(target)
            val isNowInside = dist <= it.radius
            val status = if (isNowInside) "INSIDE" else "OUTSIDE"
            Log.d("PeriodicLocationTrackingService", "Fence ${it.id.take(8)}: Dist ${dist.toInt()}m -> $status")

            val manualKey = "manual_inside_${it.id}"
            val hasPreviousState = sharedPrefs.contains(manualKey)
            val wasInside = sharedPrefs.getBoolean(manualKey, !isNowInside)

            // Skip if this isn't the current assignment
            if (it.id != currentAssignmentId) {
                return@forEach
            }

            // Handle transitions
            if (isNowInside != wasInside || !hasPreviousState) {
                val isRealTransition = hasPreviousState
                val isInitialEntry = !hasPreviousState && isNowInside
                val isPhantomExit = !hasPreviousState && !isNowInside
                
                // Don't trigger exits for geofences we were never in
                if (isPhantomExit) {
                    sharedPrefs.edit().putBoolean(manualKey, isNowInside).apply()
                    return@forEach
                }
                
                if (!isRealTransition && !isInitialEntry) {
                    sharedPrefs.edit().putBoolean(manualKey, isNowInside).apply()
                    return@forEach
                }
                
                val eventType = if (isNowInside) "enter_geofence" else "exit_geofence"
                
                // IMPROVED GEOFENCE POLICY WITH EXIT_PENDING STATE:
                if (isNowInside) {
                    // ============ ENTER LOGIC ============
                    // Accept GPS OR high-quality WiFi (trust >= 60, well inside geofence)
                    val canEnter = if (quality == null) {
                        false
                    } else {
                        val isGPS = quality.source == LocationSource.GPS_HIGH_QUALITY || 
                                    quality.source == LocationSource.GPS_MEDIUM_QUALITY
                        val isGoodWiFi = quality.trustScore >= 60 && location.accuracy < it.radius * 0.4f
                        isGPS || isGoodWiFi
                    }
                    
                    if (canEnter) {
                        // CONFIRMED ENTER - switch to PASSIVE immediately
                        Log.d("PeriodicLocationTrackingService", "✅ CONFIRMED ENTER for ${it.id.take(8)} (source: ${quality?.source?.label})")
                        sharedPrefs.edit()
                            .putBoolean(manualKey, true)
                            .putBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, true)
                            .putBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, false)
                            .apply()
                        transitionDetected = true
                        modeChangeNeeded = true
                        newMode = TrackingMode.PASSIVE
                        
                        if (workerId != null && companyId != null) {
                            serviceScope.launch {
                                BackgroundLocationManager.sendGeofenceTransitionEvent(
                                    applicationContext, it.id, eventType, workerId, companyId, location.latitude, location.longitude, svc
                                )
                                val qualityIcon = when(quality?.source) {
                                    LocationSource.GPS_HIGH_QUALITY -> "🟢"
                                    LocationSource.GPS_MEDIUM_QUALITY -> "🟡"
                                    LocationSource.WIFI_HIGH_CONFIDENCE -> "🔵"
                                    else -> "⚪"
                                }
                                LocationFileLogger.i(
                                    this@PeriodicLocationTrackingService,
                                    "Geofence",
                                    "$qualityIcon ENTER geofence ${it.id.take(8)} " +
                                    "(dist: ${dist.toInt()}m, source: ${quality?.source?.label}, trust: ${quality?.trustScore}%)"
                                )
                                sharedPrefs.edit().putLong(Constants.KEY_LAST_FUSED_EVENT_TIME, System.currentTimeMillis()).apply()
                            }
                        }
                    } else {
                        // Entry quality insufficient - log and skip
                        val reason = if (quality == null) {
                            "location quality too poor"
                        } else {
                            "WiFi quality insufficient for entry (trust: ${quality.trustScore}%, accuracy: ${location.accuracy.toInt()}m)"
                        }
                        LocationFileLogger.w(
                            this@PeriodicLocationTrackingService,
                            "Geofence",
                            "⚠️ Geofence entry blocked: $reason"
                        )
                        Log.w("PeriodicLocationTrackingService", "Skipping geofence entry: $reason")
                    }
                } else {
                    // ============ EXIT LOGIC WITH EXIT_PENDING STATE ============
                    
                    // Check if we have GPS quality to CONFIRM exit
                    val hasGPSQuality = quality != null && (
                        quality.source == LocationSource.GPS_HIGH_QUALITY || 
                        quality.source == LocationSource.GPS_MEDIUM_QUALITY
                    )
                    
                    if (hasGPSQuality) {
                        // CONFIRMED EXIT WITH GPS - switch to ACTIVE immediately
                        Log.d("PeriodicLocationTrackingService", "✅ CONFIRMED EXIT for ${it.id.take(8)} with GPS (source: ${quality.source.label})")
                        sharedPrefs.edit()
                            .putBoolean(manualKey, false)
                            .putBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, false)
                            .putBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, false)
                            .apply()
                        transitionDetected = true
                        modeChangeNeeded = true
                        newMode = TrackingMode.ACTIVE
                        
                        if (workerId != null && companyId != null) {
                            serviceScope.launch {
                                BackgroundLocationManager.sendGeofenceTransitionEvent(
                                    applicationContext, it.id, eventType, workerId, companyId, location.latitude, location.longitude, svc
                                )
                                val qualityIcon = when(quality.source) {
                                    LocationSource.GPS_HIGH_QUALITY -> "🟢"
                                    LocationSource.GPS_MEDIUM_QUALITY -> "🟡"
                                    else -> "⚪"
                                }
                                LocationFileLogger.i(
                                    this@PeriodicLocationTrackingService,
                                    "Geofence",
                                    "$qualityIcon EXIT geofence ${it.id.take(8)} " +
                                    "(dist: ${dist.toInt()}m, source: ${quality.source.label}, trust: ${quality.trustScore}%)"
                                )
                                sharedPrefs.edit().putLong(Constants.KEY_LAST_FUSED_EVENT_TIME, System.currentTimeMillis()).apply()
                            }
                        }
                    } else if (!isExitPending) {
                        // POSSIBLE EXIT DETECTED - switch to EXIT_PENDING to verify with GPS
                        // This happens when WiFi/network says we might be outside
                        Log.d("PeriodicLocationTrackingService", "🔍 POSSIBLE EXIT detected for ${it.id.take(8)} - switching to EXIT_PENDING mode to verify with GPS")
                        LocationFileLogger.w(
                            this@PeriodicLocationTrackingService,
                            "Geofence",
                            "🔍 Possible exit detected (got: ${quality?.source?.label ?: "no signal"}, trust: ${quality?.trustScore ?: 0}%, dist: ${dist.toInt()}m) - activating high-accuracy GPS to verify"
                        )
                        sharedPrefs.edit()
                            .putBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, true)
                            .apply()
                        modeChangeNeeded = true
                        newMode = TrackingMode.EXIT_PENDING
                    } else {
                        // Already in EXIT_PENDING mode, still no GPS confirmation
                        Log.d("PeriodicLocationTrackingService", "⏳ EXIT_PENDING: Still waiting for GPS confirmation (got: ${quality?.source?.label ?: "no signal"})")
                        LocationFileLogger.w(
                            this@PeriodicLocationTrackingService,
                            "Geofence",
                            "⏳ EXIT_PENDING: Waiting for GPS (got: ${quality?.source?.label ?: "no signal"}, trust: ${quality?.trustScore ?: 0}%, dist: ${dist.toInt()}m)"
                        )
                    }
                }
            } else if (isExitPending && isNowInside) {
                // FALSE ALARM - we thought we were exiting but GPS confirms we're still inside
                Log.d("PeriodicLocationTrackingService", "❌ FALSE ALARM: GPS confirms still inside ${it.id.take(8)} - switching back to PASSIVE")
                LocationFileLogger.i(
                    this@PeriodicLocationTrackingService,
                    "Geofence",
                    "❌ Exit false alarm - GPS confirms still inside (dist: ${dist.toInt()}m, source: ${quality?.source?.label}, trust: ${quality?.trustScore}%)"
                )
                sharedPrefs.edit()
                    .putBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, false)
                    .apply()
                modeChangeNeeded = true
                newMode = TrackingMode.PASSIVE
            }
        }

        // Apply mode change if needed
        if (modeChangeNeeded && newMode != null) {
            Log.d("PeriodicLocationTrackingService", "🔄 Mode change requested: $currentMode → $newMode")
            switchToMode(newMode)
        }

        if (transitionDetected) {
            lastLocationSentTime = currentTime
        }

        // 2. PERIODIC TRACKING LOGIC
        val interval = when (currentMode) {
            TrackingMode.ACTIVE -> Constants.ACTIVE_TRACKING_INTERVAL_MS  // 1 min
            TrackingMode.EXIT_PENDING -> Constants.EXIT_PENDING_INTERVAL_MS  // 30 sec
            TrackingMode.PASSIVE -> {
                // Use faster intervals for indoor locations to improve exit detection
                val isIndoor = quality?.source == LocationSource.WIFI_HIGH_CONFIDENCE || 
                               quality?.source == LocationSource.WIFI_MEDIUM_CONFIDENCE
                if (isIndoor) 2 * 60 * 1000L else Constants.PASSIVE_TRACKING_INTERVAL_MS
            }
        }
        
        if (currentTime - lastLocationSentTime < interval - 5000L) {
            val modeLabel = when (currentMode) {
                TrackingMode.ACTIVE -> "ACTIVE"
                TrackingMode.EXIT_PENDING -> "EXIT_PENDING"
                TrackingMode.PASSIVE -> {
                    val isIndoor = quality?.source == LocationSource.WIFI_HIGH_CONFIDENCE || 
                                   quality?.source == LocationSource.WIFI_MEDIUM_CONFIDENCE
                    if (isIndoor) "PASSIVE (indoor)" else "PASSIVE (outdoor)"
                }
            }
            Log.d("PeriodicLocationTrackingService", "Skipping periodic update - event recently sent. Mode: $modeLabel")
            return
        }

        // HYBRID LOCATION QUALITY: Use the quality already calculated above
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
                val type = when (currentMode) {
                    TrackingMode.ACTIVE -> "active_tracking"
                    TrackingMode.EXIT_PENDING -> "exit_pending_tracking"
                    TrackingMode.PASSIVE -> "passive_tracking"
                }
                
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
                .setNotificationResponsiveness(0) // Request fastest possible (Android will optimize for battery as needed)
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
                        // Check location quality before using it for initial mode
                        val quality = Constants.getLocationQuality(currentLocation)
                        val isTrustedLocation = quality != null && quality.trustScore >= 60
                        
                        if (!isTrustedLocation) {
                            Log.w("PeriodicLocationTrackingService", 
                                "Initial location quality too low (trust: ${quality?.trustScore}%), defaulting to ACTIVE mode for safety")
                            LocationFileLogger.w(
                                this@PeriodicLocationTrackingService,
                                "Service",
                                "Initial location quality insufficient (source: ${quality?.source?.label}, trust: ${quality?.trustScore}%), defaulting to ACTIVE mode"
                            )
                            startLocationUpdates(true)
                        } else {
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
                                        "Worker is inside geofence ${assignment.id.take(8)} (${distance.toInt()}m from center, source: ${quality.source.label})")
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
                                "Initial mode determined: ${if (isInsideAny) "PASSIVE (inside geofence)" else "ACTIVE (outside all geofences)"} (source: ${quality.source.label}, trust: ${quality.trustScore}%)"
                            )
                        }
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

    private var currentModeIsActive: Boolean? = null  // Deprecated: use currentMode instead
    private var lastGeofenceRegistrationTime: Long = 0L

    /**
     * Switch to a new tracking mode.
     * 
     * PASSIVE: Inside geofence - balanced power, 5-min updates
     * EXIT_PENDING: Verifying exit - HIGH ACCURACY GPS, 30-sec updates
     * ACTIVE: Outside geofence - high accuracy GPS, 1-min updates
     */
    private fun switchToMode(newMode: TrackingMode) {
        if (currentMode == newMode) {
            Log.d("PeriodicLocationTrackingService", "Already in $newMode mode. Skipping restart.")
            return
        }
        
        val oldMode = currentMode
        currentMode = newMode
        isTrackingActive = (newMode == TrackingMode.ACTIVE)  // For backwards compatibility
        currentModeIsActive = isTrackingActive  // For backwards compatibility
        
        LocationFileLogger.i(this, "Service", "Mode switched: $oldMode → $newMode")
        Log.d("PeriodicLocationTrackingService", "🔄 Mode switch: $oldMode → $newMode")
        
        fusedLocationClient.removeLocationUpdates(locationCallback)
        
        val (interval, priority, minUpdateInterval, maxUpdateDelay, minDistance) = when (newMode) {
            TrackingMode.PASSIVE -> {
                // PASSIVE: Worker on-site, stationary
                // Balanced power - WiFi/network OK, slow updates
                Tuple5(
                    Constants.PASSIVE_TRACKING_INTERVAL_MS,
                    Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                    Constants.PASSIVE_TRACKING_INTERVAL_MS,
                    Constants.PASSIVE_TRACKING_INTERVAL_MS + 60_000L,
                    0f  // No distance filter when stationary
                )
            }
            TrackingMode.EXIT_PENDING -> {
                // EXIT_PENDING: Possible exit detected - FORCE GPS to verify
                // High accuracy GPS forced, FAST updates (30 sec)
                Tuple5(
                    Constants.EXIT_PENDING_INTERVAL_MS,
                    Priority.PRIORITY_HIGH_ACCURACY,  // FORCE GPS
                    Constants.EXIT_PENDING_INTERVAL_MS / 2,  // Allow faster updates
                    Constants.EXIT_PENDING_INTERVAL_MS,  // No batching delay
                    0f  // No distance filter - we need every update
                )
            }
            TrackingMode.ACTIVE -> {
                // ACTIVE: Worker traveling between sites
                // High accuracy GPS forced, regular updates (1 min)
                Tuple5(
                    Constants.ACTIVE_TRACKING_INTERVAL_MS,
                    Priority.PRIORITY_HIGH_ACCURACY,  // FORCE GPS
                    Constants.ACTIVE_TRACKING_INTERVAL_MS / 2,  // Allow faster updates
                    Constants.ACTIVE_TRACKING_INTERVAL_MS,  // No batching delay
                    20f  // Only update when moved 20m (prevents stationary throttle)
                )
            }
        }
        
        val requestBuilder = LocationRequest.Builder(priority, interval)
            .setMinUpdateIntervalMillis(minUpdateInterval)
            .setMaxUpdateDelayMillis(maxUpdateDelay)
            .setWaitForAccurateLocation(false)  // Don't wait for perfect GPS lock
        
        if (minDistance > 0f) {
            requestBuilder.setMinUpdateDistanceMeters(minDistance)
        }
        
        val request = requestBuilder.build()

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
            Log.d("PeriodicLocationTrackingService", "✅ Location updates started in $newMode mode (interval: ${interval/1000}s, priority: ${if (priority == Priority.PRIORITY_HIGH_ACCURACY) "HIGH_ACCURACY" else "BALANCED"})")
        } catch (e: SecurityException) { 
            Log.e("PeriodicLocationTrackingService", "Permission error starting location updates: $e") 
        }
    }
    
    // Helper data class for tuple returns
    private data class Tuple5<A, B, C, D, E>(val first: A, val second: B, val third: C, val fourth: D, val fifth: E)

    /**
     * DEPRECATED: Use switchToMode() instead.
     * Kept for backwards compatibility with old code paths.
     */
    private fun startLocationUpdates(active: Boolean) {
        switchToMode(if (active) TrackingMode.ACTIVE else TrackingMode.PASSIVE)
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
