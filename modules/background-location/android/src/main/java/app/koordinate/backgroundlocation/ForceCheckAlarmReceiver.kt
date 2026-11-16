package app.koordinate.backgroundlocation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.PowerManager
import android.util.Log
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Independent AlarmManager-based force-check receiver.
 * Fires every 5 minutes during PASSIVE mode to wake device from Doze
 * and verify worker is still inside geofence using HIGH_ACCURACY GPS.
 * 
 * This bypasses Android Doze Mode restrictions that block FusedLocationProvider updates.
 */
class ForceCheckAlarmReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "ForceCheckAlarm"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        // Acquire short wake lock to ensure we complete the check before device sleeps again
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "koordinate:force_check_wakelock"
        )
        
        try {
            // Hold wake lock for max 10 seconds (GPS timeout)
            wakeLock.acquire(10_000L)
            
            Log.d(TAG, "⏰ Force-check alarm fired - waking device to verify geofence state")
            LocationFileLogger.i(context, "ForceCheck", "⏰ Periodic force-check alarm fired")
            
            val sharedPrefs = context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
            
            // Check if we're still in PASSIVE mode
            val isInsideGeofence = sharedPrefs.getBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, false)
            if (!isInsideGeofence) {
                Log.d(TAG, "Not in PASSIVE mode - skipping force-check")
                LocationFileLogger.d(context, "ForceCheck", "Skipped - not in PASSIVE mode")
                ForceCheckAlarmScheduler.cancelAlarm(context)
                return
            }
            
            // Perform force-check in background coroutine
            val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
            val pendingResult = goAsync() // Keep receiver alive for async work
            
            scope.launch {
                try {
                    performForceCheck(context, sharedPrefs)
                } catch (e: Exception) {
                    Log.e(TAG, "Error in force-check: ${e.message}", e)
                    LocationFileLogger.e(context, "ForceCheck", "Error: ${e.message}")
                } finally {
                    // Reschedule next alarm
                    ForceCheckAlarmScheduler.scheduleNextAlarm(context)
                    pendingResult.finish()
                }
            }
        } finally {
            // Wake lock will be released automatically after 10s timeout or when manually released
            if (wakeLock.isHeld) {
                wakeLock.release()
            }
        }
    }
    
    private suspend fun performForceCheck(context: Context, sharedPrefs: android.content.SharedPreferences) {
        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
        
        // Force HIGH_ACCURACY GPS request with 10-second timeout
        val location = withTimeoutOrNull(10_000L) {
            try {
                fusedLocationClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    null
                ).await()
            } catch (e: SecurityException) {
                Log.e(TAG, "Location permission denied: ${e.message}")
                null
            } catch (e: Exception) {
                Log.e(TAG, "Error getting location: ${e.message}")
                null
            }
        }
        
        if (location == null) {
            Log.w(TAG, "⚠️ GPS timeout after 10s - no fresh location available")
            LocationFileLogger.w(context, "ForceCheck", "GPS timeout - no location")
            return
        }
        
        // Validate location quality
        val quality = Constants.getLocationQuality(location)
        if (quality == null || quality.trustScore < 60) {
            Log.w(TAG, "⚠️ Location quality too low (trust: ${quality?.trustScore}%) - rejecting")
            LocationFileLogger.w(context, "ForceCheck", "Low quality: trust ${quality?.trustScore}%")
            return
        }
        
        Log.d(TAG, "✅ Got HIGH_ACCURACY location: ${location.latitude}, ${location.longitude} (accuracy: ${location.accuracy.toInt()}m, trust: ${quality.trustScore}%)")
        LocationFileLogger.i(
            context,
            "ForceCheck",
            "Location: ${location.latitude}, ${location.longitude} | Accuracy: ${location.accuracy.toInt()}m | Trust: ${quality.trustScore}%"
        )
        
        // Check distance to current geofence
        val currentAssignmentId = sharedPrefs.getString(Constants.KEY_ASSIGNMENT_ID, null)
        if (currentAssignmentId == null) {
            Log.w(TAG, "No active assignment - cannot verify geofence")
            return
        }
        
        // Load active assignments from shared prefs
        val assignmentsJson = sharedPrefs.getString(Constants.SHARED_PREFS_KEY_GEOFENCE_ASSIGNMENTS, null)
        if (assignmentsJson == null) {
            Log.w(TAG, "No geofence assignments found")
            return
        }
        
        val assignments = try {
            com.google.gson.Gson().fromJson<List<GeofenceAssignment>>(
                assignmentsJson,
                object : com.google.gson.reflect.TypeToken<List<GeofenceAssignment>>() {}.type
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse assignments JSON: ${e.message}")
            emptyList()
        }
        
        val currentAssignment = assignments.find { it.id == currentAssignmentId }
        if (currentAssignment == null) {
            Log.w(TAG, "Current assignment not found in geofence list")
            return
        }
        
        // Calculate distance to geofence center
        val geofenceLocation = Location("geofence").apply {
            latitude = currentAssignment.latitude
            longitude = currentAssignment.longitude
        }
        val distance = location.distanceTo(geofenceLocation)
        val isInside = distance <= currentAssignment.radius
        
        Log.d(TAG, "Distance to geofence: ${distance.toInt()}m (radius: ${currentAssignment.radius.toInt()}m) - ${if (isInside) "INSIDE" else "OUTSIDE"}")
        LocationFileLogger.i(
            context,
            "ForceCheck",
            "Distance: ${distance.toInt()}m | Radius: ${currentAssignment.radius.toInt()}m | Status: ${if (isInside) "INSIDE ✅" else "OUTSIDE ⚠️"}"
        )
        
        if (!isInside) {
            // Worker has left geofence! Trigger EXIT_PENDING mode
            Log.w(TAG, "🚨 FORCE-CHECK DETECTED EXIT: Worker is outside geofence!")
            LocationFileLogger.w(context, "ForceCheck", "🚨 EXIT DETECTED - Triggering EXIT_PENDING mode")
            
            // Update shared prefs
            sharedPrefs.edit()
                .putBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, false)
                .putBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, true)
                .apply()
            
            // Notify service to switch to EXIT_PENDING mode
            val serviceIntent = Intent(context, PeriodicLocationTrackingService::class.java).apply {
                action = "FORCE_CHECK_EXIT_DETECTED"
                putExtra("latitude", location.latitude)
                putExtra("longitude", location.longitude)
                putExtra("accuracy", location.accuracy)
            }
            
            try {
                context.startService(serviceIntent)
                Log.d(TAG, "Sent EXIT_PENDING trigger to service")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start service: ${e.message}")
            }
            
            // Cancel future force-check alarms (EXIT_PENDING mode will take over)
            ForceCheckAlarmScheduler.cancelAlarm(context)
        } else {
            Log.d(TAG, "✅ Worker still inside geofence - continuing PASSIVE mode")
            LocationFileLogger.d(context, "ForceCheck", "✅ Still inside - PASSIVE continues")
        }
    }
}
