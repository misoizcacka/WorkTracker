package app.koord.backgroundlocation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        Log.d("BootReceiver", "Device rebooted. Checking if tracking should resume.")
        val sharedPrefs = context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val workerId = sharedPrefs.getString(Constants.KEY_WORKER_ID, null)
        val currentAssignmentId = sharedPrefs.getString(Constants.KEY_ASSIGNMENT_ID, null)
        val geofenceJson = sharedPrefs.getString(Constants.SHARED_PREFS_KEY_GEOFENCE_ASSIGNMENTS, null)
        // Only resume if prefs are present AND the session was never ended
        // (stop() clears all prefs, so any non-null value here means session is still open)
        if (workerId == null || currentAssignmentId == null || geofenceJson == null) {
            Log.d("BootReceiver", "No active tracking session found. Skipping restart.")
            return
        }

        Log.d("BootReceiver", "Resuming tracking service for worker: $workerId")
        val serviceIntent = Intent(context, PeriodicLocationTrackingService::class.java).apply {
            putExtra("geofence_data", geofenceJson)
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
