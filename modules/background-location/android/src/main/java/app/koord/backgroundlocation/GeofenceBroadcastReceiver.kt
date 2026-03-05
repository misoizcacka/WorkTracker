package app.koord.backgroundlocation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofenceStatusCodes
import com.google.android.gms.location.GeofencingEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GeofenceBroadcastReceiver : BroadcastReceiver() {
    private val TAG = "GeofenceReceiver"

    override fun onReceive(context: Context, intent: Intent) {
        val geofencingEvent = GeofencingEvent.fromIntent(intent)
        if (geofencingEvent == null) {
            Log.e(TAG, "onReceive: GeofencingEvent is null")
            return
        }

        if (geofencingEvent.hasError()) {
            val errorCode = geofencingEvent.errorCode
            val errorMessage = GeofenceStatusCodes.getStatusCodeString(errorCode)
            Log.e(TAG, "Geofence Error $errorCode: $errorMessage")
            return
        }

        val transition = geofencingEvent.geofenceTransition
        val triggeringIds = geofencingEvent.triggeringGeofences?.map { it.requestId } ?: emptyList()
        val location = geofencingEvent.triggeringLocation
        val lat = location?.latitude ?: 0.0
        val lon = location?.longitude ?: 0.0

        Log.d(TAG, "Transition: $transition, IDs: $triggeringIds at $lat, $lon")

        if (transition == Geofence.GEOFENCE_TRANSITION_ENTER || transition == Geofence.GEOFENCE_TRANSITION_EXIT) {
            val sharedPrefs = context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
            val workerId = sharedPrefs.getString(Constants.KEY_WORKER_ID, null)
            val companyId = sharedPrefs.getString(Constants.KEY_COMPANY_ID, null)
            val supabaseUrl = sharedPrefs.getString(Constants.KEY_SUPABASE_URL, null)
            val supabaseKey = sharedPrefs.getString(Constants.KEY_SUPABASE_PUBLISHABLE_KEY, null)

            if (workerId == null || companyId == null || supabaseUrl == null || supabaseKey == null) {
                Log.e(TAG, "Missing configuration in GeofenceBroadcastReceiver. Skipping event.")
                return
            }

            val supabaseService = SupabaseService(context, supabaseUrl, supabaseKey, DeviceAuthenticator(context))
            val pendingResult = goAsync()

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val eventType = if (transition == Geofence.GEOFENCE_TRANSITION_ENTER) "enter_geofence" else "exit_geofence"
                    
                    // Switch tracking mode in the service
                    val serviceIntent = Intent(context, PeriodicLocationTrackingService::class.java).apply {
                        action = if (transition == Geofence.GEOFENCE_TRANSITION_ENTER) 
                            Constants.ACTION_STOP_ACTIVE_TRACKING 
                        else 
                            Constants.ACTION_START_ACTIVE_TRACKING
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent)
                    } else {
                        context.startService(serviceIntent)
                    }

                    // Synchronize manual fallback flags
                    val isInside = transition == Geofence.GEOFENCE_TRANSITION_ENTER
                    val editor = sharedPrefs.edit()
                    editor.putBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, isInside)
                    triggeringIds.forEach { editor.putBoolean("manual_inside_$it", isInside) }
                    editor.apply()

                    triggeringIds.forEach { id ->
                        BackgroundLocationManager.sendGeofenceTransitionEvent(
                            context, id, eventType, workerId, companyId, lat, lon, supabaseService
                        )
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error handling geofence transition: ${e.message}")
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }
}
