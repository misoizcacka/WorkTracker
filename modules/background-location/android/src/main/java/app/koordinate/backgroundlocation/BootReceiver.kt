package app.koordinate.backgroundlocation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Restarts tracking after the phone reboots or the app is updated, if a session is still open.
 * Without MY_PACKAGE_REPLACED, tracking stayed dead after every app update until the worker
 * opened the app.
 */
class BootReceiver : BroadcastReceiver() {

    private val restartActions = setOf(
        Intent.ACTION_BOOT_COMPLETED,
        "android.intent.action.QUICKBOOT_POWERON", // HTC and some other OEMs use this instead
        Intent.ACTION_MY_PACKAGE_REPLACED,
    )

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action !in restartActions) return

        Log.d("BootReceiver", "${intent.action}: checking if tracking should resume.")
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
        // These broadcasts are exempt from Android's background foreground-service start limits,
        // but a revoked location permission can still make the start fail. Don't crash the app.
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e("BootReceiver", "Could not restart tracking service: ${e.message}")
            LocationFileLogger.e(context, "Boot", "Could not restart tracking after ${intent.action}: ${e.message}")
        }
    }
}
