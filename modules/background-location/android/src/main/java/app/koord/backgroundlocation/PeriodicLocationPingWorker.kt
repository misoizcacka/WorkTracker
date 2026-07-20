package app.koord.backgroundlocation

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.ListenableWorker

class PeriodicLocationPingWorker(appContext: Context, workerParams: WorkerParameters) :
    CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): ListenableWorker.Result {
        Log.d("LocationUpdateWorker", "doWork started.")

        val sharedPrefs = applicationContext.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val workerId = sharedPrefs.getString(Constants.KEY_WORKER_ID, null)

        // If there's no active session (prefs cleared by stop()), do nothing.
        if (workerId == null) {
            Log.d("LocationUpdateWorker", "No active session in SharedPreferences. Nothing to do.")
            return ListenableWorker.Result.success()
        }

        // Check for permissions before attempting any location or service work
        if (!hasLocationPermissions()) {
            Log.e("LocationUpdateWorker", "Location permissions not granted.")
            return ListenableWorker.Result.failure()
        }

        return try {
            // No location event emitted here — the foreground service (once restarted below)
            // will emit active_tracking / passive_tracking events at its own interval.
            // WorkManager's only job is to keep the service alive.

            // --- Service liveness check ---
            // If the foreground tracking service was killed (memory pressure, battery optimizer,
            // manufacturer ROM), restart it here so geofencing resumes. WorkManager is the last
            // safety net — it survives everything the service cannot.
            ensureTrackingServiceRunning(sharedPrefs.getString(Constants.SHARED_PREFS_KEY_GEOFENCE_ASSIGNMENTS, null))

            ListenableWorker.Result.success()
        } catch (e: Exception) {
            Log.e("LocationUpdateWorker", "Error in doWork for $workerId: ${e.message}.", e)
            ListenableWorker.Result.success() // Best-effort — don't retry, next scheduled run will pick up
        }
    }

    /**
     * Checks if PeriodicLocationTrackingService is currently running.
     * If it is not, starts it as a foreground service so geofencing resumes.
     * Only acts when a session is active (SharedPrefs are populated by start()).
     */
    private fun ensureTrackingServiceRunning(geofenceJson: String?) {
        // Read the in-process liveness flag set by the service itself.
        // This is reliable, zero-overhead, and works on all Android versions —
        // unlike the deprecated ActivityManager.getRunningServices().
        val isRunning = PeriodicLocationTrackingService.isRunning.get()
        if (isRunning) {
            Log.d("LocationUpdateWorker", "TrackingService is alive — no restart needed.")
            return
        }

        Log.w("LocationUpdateWorker", "TrackingService is NOT running — restarting to resume geofencing.")
        val serviceIntent = Intent(applicationContext, PeriodicLocationTrackingService::class.java).apply {
            // Pass the stored geofence JSON so the service re-registers all fences on restart,
            // exactly the same as when the JS layer calls BackgroundLocation.start().
            if (geofenceJson != null) {
                putExtra("geofence_data", geofenceJson)
            }
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                applicationContext.startForegroundService(serviceIntent)
            } else {
                applicationContext.startService(serviceIntent)
            }
            Log.d("LocationUpdateWorker", "TrackingService restart initiated.")
        } catch (e: Exception) {
            // On Android 12+ this can throw ForegroundServiceStartNotAllowedException if the
            // app is in a fully background state with no visible activity/notification.
            // Nothing we can do here — the next WorkManager run will try again.
            Log.e("LocationUpdateWorker", "Failed to restart TrackingService: ${e.message}")
        }
    }

    private fun hasLocationPermissions(): Boolean {
        val fineLocationGranted = ContextCompat.checkSelfPermission(
            applicationContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarseLocationGranted = ContextCompat.checkSelfPermission(
            applicationContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        var backgroundLocationGranted = true
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            backgroundLocationGranted = ContextCompat.checkSelfPermission(
                applicationContext,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        }
        val result = (fineLocationGranted || coarseLocationGranted) && backgroundLocationGranted
        Log.d("LocationUpdateWorker", "hasLocationPermissions() - Fine: $fineLocationGranted, Coarse: $coarseLocationGranted, Background: $backgroundLocationGranted -> Result: $result")
        return result
    }
}
