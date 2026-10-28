package app.koordinate.backgroundlocation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.location.Location
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import java.util.UUID

/**
 * AlarmManager-based fallback for location tracking.
 * Fires every 6 minutes to ensure we never have gaps longer than that, even if
 * FusedLocationProvider is throttled by Doze mode or battery optimization.
 * 
 * Only grabs location if the last event was >5 minutes ago, avoiding duplicates
 * when the primary FusedLocationProvider is working correctly.
 */
class LocationAlarmReceiver : BroadcastReceiver() {
    private val TAG = "LocationAlarmReceiver"
    
    companion object {
        private val receiverScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        const val MIN_TIME_SINCE_LAST_EVENT_MS = 5 * 60 * 1000L  // 5 minutes
    }

    override fun onReceive(context: Context, intent: Intent) {
        val sharedPrefs = context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val workerId = sharedPrefs.getString(Constants.KEY_WORKER_ID, null)
        val assignmentId = sharedPrefs.getString(Constants.KEY_ASSIGNMENT_ID, null)
        val companyId = sharedPrefs.getString(Constants.KEY_COMPANY_ID, null)
        
        if (workerId == null || assignmentId == null || companyId == null) {
            Log.w(TAG, "Missing worker/assignment/company ID. Alarm fallback inactive.")
            return
        }
        
        // Check when the last FusedLocationProvider event was sent (not AlarmManager events)
        val lastFusedEventTime = sharedPrefs.getLong(Constants.KEY_LAST_FUSED_EVENT_TIME, 0L)
        val lastAlarmEventTime = sharedPrefs.getLong(Constants.KEY_LAST_ALARM_EVENT_TIME, 0L)
        val timeSinceFused = System.currentTimeMillis() - lastFusedEventTime
        val timeSinceAlarm = System.currentTimeMillis() - lastAlarmEventTime
        
        if (timeSinceFused < MIN_TIME_SINCE_LAST_EVENT_MS) {
            Log.d(TAG, "FusedLocation: ${timeSinceFused / 1000}s ago, AlarmManager: ${timeSinceAlarm / 1000}s ago. Skipping (primary working).")
            LocationFileLogger.d(context, TAG, "AlarmManager check: FusedLocation ${timeSinceFused / 1000}s ago, AlarmManager ${timeSinceAlarm / 1000}s ago - primary working, skipping")
            // Reschedule next alarm and exit
            LocationAlarmScheduler.scheduleNextAlarm(context)
            return
        }
        
        // FusedLocationProvider appears to be failing — grab location now
        Log.d(TAG, "FusedLocation: ${timeSinceFused / 1000}s ago, AlarmManager: ${timeSinceAlarm / 1000}s ago. Fallback ACTIVE.")
        LocationFileLogger.w(context, TAG, "⚠️ AlarmManager FALLBACK ACTIVATED! FusedLocation gap: ${timeSinceFused / 1000}s (>${MIN_TIME_SINCE_LAST_EVENT_MS / 1000}s threshold)")
        
        val pendingResult = goAsync()
        receiverScope.launch {
            try {
                val location = getCurrentLocation(context)
                if (location != null) {
                    sendFallbackLocationEvent(context, location, workerId, assignmentId, companyId)
                } else {
                    Log.w(TAG, "Alarm fallback: failed to get current location.")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Alarm fallback error: ${e.message}")
            } finally {
                // Always reschedule next alarm
                LocationAlarmScheduler.scheduleNextAlarm(context)
                pendingResult.finish()
            }
        }
    }
    
    private suspend fun getCurrentLocation(context: Context): Location? {
        val fusedLocationClient: FusedLocationProviderClient = 
            LocationServices.getFusedLocationProviderClient(context)
        
        // Check if worker is in ACTIVE mode (outside geofence, traveling)
        val sharedPrefs = context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val isInside = sharedPrefs.getBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, false)
        
        // Use HIGH_ACCURACY when traveling (ACTIVE mode) to force real GPS
        // Use BALANCED when stationary (PASSIVE mode) to save battery
        val priority = if (isInside) {
            Priority.PRIORITY_BALANCED_POWER_ACCURACY  // Stationary: WiFi/network OK
        } else {
            Priority.PRIORITY_HIGH_ACCURACY  // Traveling: Force GPS
        }
        
        return try {
            // Use getCurrentLocation with a 10-second timeout
            // This forces a fresh location even in Doze mode
            withTimeoutOrNull(10_000L) {
                fusedLocationClient.getCurrentLocation(
                    priority,
                    null
                ).await()
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission denied: ${e.message}")
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error getting current location: ${e.message}")
            null
        }
    }
    
    private suspend fun sendFallbackLocationEvent(
        context: Context,
        location: Location,
        workerId: String,
        assignmentId: String,
        companyId: String
    ) {
        // HYBRID LOCATION QUALITY: Accept GPS (any quality) + high-quality WiFi for fallback
        val quality = Constants.getLocationQuality(location)
        
        if (quality == null) {
            LocationFileLogger.w(
                context,
                TAG,
                "⚠️ AlarmManager: Location quality too poor (accuracy: ${location.accuracy.toInt()}m), rejecting fallback."
            )
            Log.w(TAG, "AlarmManager rejecting location with insufficient quality")
            return
        }
        
        // For AlarmManager fallback: accept GPS (any) + WiFi with trust >= 60
        if (quality.trustScore < 60) {
            LocationFileLogger.w(
                context,
                TAG,
                "⚠️ AlarmManager: Location trust score too low (${quality.trustScore}%, source: ${quality.source.label}), rejecting fallback."
            )
            Log.w(TAG, "AlarmManager rejecting location with trust score ${quality.trustScore}")
            return
        }
        
        val sharedPrefs = context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val supabaseUrl = sharedPrefs.getString(Constants.KEY_SUPABASE_URL, null)
        val supabaseKey = sharedPrefs.getString(Constants.KEY_SUPABASE_PUBLISHABLE_KEY, null)
        
        if (supabaseUrl == null || supabaseKey == null) {
            Log.w(TAG, "Missing Supabase credentials. Cannot send fallback event.")
            return
        }
        
        val supabaseService = SupabaseService(context, supabaseUrl, supabaseKey, DeviceAuthenticator(context))
        val eventId = UUID.randomUUID().toString()
        val timestamp = System.currentTimeMillis()
        
        // Determine if we're in active or passive mode
        val isInside = sharedPrefs.getBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, false)
        val type = if (isInside) "passive_tracking" else "active_tracking"
        
        // Prepare notes with quality metadata
        val notes = buildString {
            append("AlarmManager fallback ($type)")
            append(" | Source: ${quality.source.label}")
            append(" | Trust: ${quality.trustScore}%")
            if (quality.payrollVerified) append(" | ✅ Payroll verified")
        }
        
        val success = supabaseService.sendLocationEvent(
            id = eventId,
            timestamp = timestamp,
            type = type,
            assignmentId = assignmentId,
            workerId = workerId,
            companyId = companyId,
            latitude = location.latitude,
            longitude = location.longitude,
            notes = notes
        )
        
        if (success) {
            // Record AlarmManager event timestamp (separate from FusedLocation timestamps)
            sharedPrefs.edit()
                .putLong(Constants.KEY_LAST_ALARM_EVENT_TIME, timestamp)
                .apply()
            
            val qualityIcon = when(quality.source) {
                LocationSource.GPS_HIGH_QUALITY -> "🟢"
                LocationSource.GPS_MEDIUM_QUALITY -> "🟡"
                LocationSource.WIFI_HIGH_CONFIDENCE -> "🔵"
                else -> "⚪"
            }
            
            Log.d(TAG, "Alarm fallback: location event sent successfully.")
            LocationFileLogger.i(
                context, 
                TAG, 
                "$qualityIcon AlarmManager fallback: Location captured and sent (${location.latitude}, ${location.longitude}) " +
                "accuracy: ${location.accuracy}m, source: ${quality.source.label}, trust: ${quality.trustScore}%"
            )
        } else {
            Log.w(TAG, "Alarm fallback: failed to send location event (queued in SQLite).")
            LocationFileLogger.w(
                context, 
                TAG, 
                "AlarmManager fallback: Event queued offline (${location.latitude}, ${location.longitude}) " +
                "accuracy: ${location.accuracy}m, source: ${quality.source.label}"
            )
        }
        
        if (success) {
            // Record AlarmManager event timestamp (separate from FusedLocation timestamps)
            sharedPrefs.edit()
                .putLong(Constants.KEY_LAST_ALARM_EVENT_TIME, timestamp)
                .apply()
            Log.d(TAG, "Alarm fallback: location event sent successfully.")
            LocationFileLogger.i(context, TAG, "✓ AlarmManager fallback: Location captured and sent (${location.latitude}, ${location.longitude})")
        } else {
            Log.w(TAG, "Alarm fallback: failed to send location event (queued in SQLite).")
            LocationFileLogger.w(context, TAG, "AlarmManager fallback: Event queued offline (${location.latitude}, ${location.longitude})")
        }
    }
}
