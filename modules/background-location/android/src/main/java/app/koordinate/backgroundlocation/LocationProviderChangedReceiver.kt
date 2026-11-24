package app.koordinate.backgroundlocation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.util.Log
import androidx.core.location.LocationManagerCompat

/**
 * Android removes every registered geofence when location services are turned off and does not
 * restore them when location comes back. Without this receiver, a worker who toggled location
 * during a shift had no geofence events for the rest of it.
 *
 * PROVIDERS_CHANGED is one of the implicit broadcasts that manifest receivers still get on
 * Android 8+.
 */
class LocationProviderChangedReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != LocationManager.PROVIDERS_CHANGED_ACTION) return

        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val enabled = LocationManagerCompat.isLocationEnabled(locationManager)

        if (!enabled) {
            Log.w(TAG, "Location services turned off.")
            LocationFileLogger.w(context, "Provider", "Location services turned off - geofences removed by the system")
            return
        }

        // Only re-register if a session is open and the tracking service is alive. If the process was
        // killed, this broadcast can't start a foreground service; the watchdog or the next app open will.
        val prefs = context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val geofenceJson = prefs.getString(Constants.SHARED_PREFS_KEY_GEOFENCE_ASSIGNMENTS, null)
        if (geofenceJson == null || prefs.getString(Constants.KEY_WORKER_ID, null) == null) return
        if (!PeriodicLocationTrackingService.isRunning.get()) {
            LocationFileLogger.w(context, "Provider", "Location back on, but tracking service not running - can't re-register geofences now")
            return
        }

        Log.d(TAG, "Location services back on - re-registering geofences.")
        LocationFileLogger.i(context, "Provider", "Location services back on - re-registering geofences")
        val serviceIntent = Intent(context, PeriodicLocationTrackingService::class.java).apply {
            putExtra("geofence_data", geofenceJson)
        }
        try {
            // The service is already running in the foreground, so a plain startService only
            // delivers the intent to it.
            context.startService(serviceIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Could not re-register geofences: ${e.message}")
            LocationFileLogger.e(context, "Provider", "Could not re-register geofences: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "LocationProviderChanged"
    }
}
