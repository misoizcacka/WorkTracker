package app.koordinate.backgroundlocation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.ActivityRecognitionResult
import com.google.android.gms.location.DetectedActivity

/**
 * LAYER 1: Activity Recognition (Primary Detection)
 * 
 * Receives activity updates from Google Play Services every 30 seconds.
 * Detects when worker is IN_VEHICLE or ON_BICYCLE and forces ACTIVE mode
 * to ensure GPS tracking even if geofence exit was missed.
 * 
 * Key insight: Vehicle/bicycle movement detected by accelerometer/gyroscope
 * works even when GPS/WiFi signal is poor.
 */
class ActivityRecognitionReceiver : BroadcastReceiver() {
    private val TAG = "ActivityRecognition"
    
    override fun onReceive(context: Context, intent: Intent) {
        if (!ActivityRecognitionResult.hasResult(intent)) {
            Log.w(TAG, "No activity recognition result in intent")
            return
        }
        
        val result = ActivityRecognitionResult.extractResult(intent) ?: return
        val activity = result.mostProbableActivity
        val confidence = activity.confidence
        
        // Only act on high-confidence detections (>60%)
        if (confidence < Constants.ACTIVITY_RECOGNITION_CONFIDENCE_THRESHOLD) {
            Log.d(TAG, "Activity confidence too low (${confidence}%), ignoring")
            return
        }
        
        val activityName = getActivityString(activity.type)
        Log.d(TAG, "Activity detected: $activityName (${confidence}% confidence)")
        
        val sharedPrefs = context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val workerId = sharedPrefs.getString(Constants.KEY_WORKER_ID, null)
        
        // Only process if we have an active session
        if (workerId == null) {
            Log.d(TAG, "No active session, ignoring activity update")
            return
        }
        
        when (activity.type) {
            DetectedActivity.IN_VEHICLE,
            DetectedActivity.ON_BICYCLE -> {
                // Worker is traveling → force ACTIVE mode (HIGH_ACCURACY GPS)
                // This overrides geofence state to catch missed exits
                Log.i(TAG, "🚗 Travel detected ($activityName, ${confidence}%) → forcing ACTIVE mode")
                LocationFileLogger.i(
                    context,
                    TAG,
                    "🚗 Travel activity detected: $activityName (${confidence}% confidence) → forcing ACTIVE mode"
                )
                
                // Send intent to service to switch to ACTIVE mode
                val serviceIntent = Intent(context, PeriodicLocationTrackingService::class.java).apply {
                    action = Constants.ACTION_START_ACTIVE_TRACKING
                }
                context.startService(serviceIntent)
            }
            
            DetectedActivity.STILL -> {
                // Worker stationary → trust geofence state
                // If inside geofence → allow PASSIVE mode
                // If outside geofence → stay ACTIVE (they might be at a red light)
                Log.d(TAG, "Worker STILL (${confidence}%) → trusting geofence state")
                LocationFileLogger.d(
                    context,
                    TAG,
                    "Worker STILL (${confidence}% confidence) → no action, trusting geofence"
                )
            }
            
            DetectedActivity.WALKING,
            DetectedActivity.ON_FOOT,
            DetectedActivity.RUNNING -> {
                // Worker moving on foot → normal on-site movement, ignore
                Log.d(TAG, "Worker on foot ($activityName, ${confidence}%) → ignoring (normal on-site movement)")
                LocationFileLogger.d(
                    context,
                    TAG,
                    "On-foot activity: $activityName (${confidence}%) → no action"
                )
            }
            
            DetectedActivity.UNKNOWN,
            DetectedActivity.TILTING -> {
                // Uncertain activity → don't change anything
                Log.d(TAG, "Activity uncertain ($activityName, ${confidence}%) → no action")
            }
        }
    }
    
    private fun getActivityString(activityType: Int): String {
        return when (activityType) {
            DetectedActivity.IN_VEHICLE -> "IN_VEHICLE"
            DetectedActivity.ON_BICYCLE -> "ON_BICYCLE"
            DetectedActivity.ON_FOOT -> "ON_FOOT"
            DetectedActivity.STILL -> "STILL"
            DetectedActivity.WALKING -> "WALKING"
            DetectedActivity.RUNNING -> "RUNNING"
            DetectedActivity.TILTING -> "TILTING"
            DetectedActivity.UNKNOWN -> "UNKNOWN"
            else -> "UNRECOGNIZED($activityType)"
        }
    }
}
