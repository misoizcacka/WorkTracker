package app.koord.backgroundlocation

import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import android.Manifest
import android.util.Log
import android.content.Context
import com.google.android.gms.location.LocationServices
import android.app.PendingIntent
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// Re-adding the missing data classes
data class GeofenceAssignment(
    val id: String,
    val latitude: Double,
    val longitude: Double,
    val radius: Float,
    val type: String,
    val status: String
)

data class SupabaseConfig(
    val url: String,
    val key: String,
    val locationName: String? = null
)

class BackgroundLocationModule : Module() {

    // Coroutine scope tied to this module instance — cancelled when the module is destroyed.
    private val moduleJob = SupervisorJob()
    private val moduleScope = CoroutineScope(Dispatchers.IO + moduleJob)

    private fun getGeofencePendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, GeofenceBroadcastReceiver::class.java).apply {
            setPackage(context.packageName)
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        
        return PendingIntent.getBroadcast(
            context,
            Constants.GEOFENCE_PENDING_INTENT_REQUEST_CODE,
            intent,
            flags
        )
    }

    override fun definition() = ModuleDefinition {
        Name("BackgroundLocation")

        AsyncFunction("start") { workerId: String, assignmentId: String, companyId: String, supabaseConfig: String, deviceToken: String, deviceSecret: String, geofenceAssignments: String, promise: Promise ->
            val reactContext = appContext.reactContext ?: run {
                promise.reject("APP_CONTEXT_ERROR", "React Application Context is null.", null)
                return@AsyncFunction
            }
            val context = reactContext.applicationContext

            val parsedSupabaseConfig = Gson().fromJson(supabaseConfig, SupabaseConfig::class.java)
            DeviceAuthenticator(context).storeCredentials(deviceToken, deviceSecret)

            val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            if (!hasFine) {
                promise.reject("PERMISSION_DENIED", "ACCESS_FINE_LOCATION not granted.", null)
                return@AsyncFunction
            }

            context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE).edit().apply {
                putString(Constants.KEY_WORKER_ID, workerId)
                putString(Constants.KEY_ASSIGNMENT_ID, assignmentId)
                putString(Constants.KEY_COMPANY_ID, companyId)
                putString(Constants.KEY_SUPABASE_URL, parsedSupabaseConfig.url)
                putString(Constants.KEY_SUPABASE_PUBLISHABLE_KEY, parsedSupabaseConfig.key)
                putString(Constants.SHARED_PREFS_KEY_GEOFENCE_ASSIGNMENTS, geofenceAssignments)
                putString(Constants.KEY_LOCATION_NAME, parsedSupabaseConfig.locationName ?: "")
                apply()
            }
            
            val serviceIntent = Intent(context, PeriodicLocationTrackingService::class.java).apply {
                putExtra("geofence_data", geofenceAssignments)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            
            Log.d("BackgroundLocationModule", "Tracking service started with geofence data.")
            promise.resolve(Unit)
        }

        AsyncFunction("flushPendingEvents") { promise: Promise ->
            val context = appContext.reactContext?.applicationContext ?: run {
                promise.reject("APP_CONTEXT_ERROR", "Context is null.", null)
                return@AsyncFunction
            }
            val sharedPrefs = context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
            val supabaseUrl = sharedPrefs.getString(Constants.KEY_SUPABASE_URL, null)
            val supabaseKey = sharedPrefs.getString(Constants.KEY_SUPABASE_PUBLISHABLE_KEY, null)
            if (supabaseUrl == null || supabaseKey == null) {
                promise.resolve(0) // No config, can't flush
                return@AsyncFunction
            }
            moduleScope.launch {
                try {
                    val supabaseService = SupabaseService(context, supabaseUrl, supabaseKey, DeviceAuthenticator(context))
                    val flushed = supabaseService.flushPendingEvents()
                    promise.resolve(flushed)
                } catch (e: Exception) {
                    promise.reject("FLUSH_ERROR", "Failed to flush pending events: ${e.message}", e)
                }
            }
        }

        AsyncFunction("stop") { promise: Promise ->
            val context = appContext.reactContext?.applicationContext ?: run {
                promise.reject("APP_CONTEXT_ERROR", "Context is null.", null)
                return@AsyncFunction
            }
            
            // Stop the service and clear prefs immediately — these are synchronous and safe.
            context.stopService(Intent(context, PeriodicLocationTrackingService::class.java))
            BackgroundLocationManager.stopPeriodicUpdates(context)
            context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()

            // Resolve the promise only after the async geofence removal has completed
            // so a rapid stop() → start() sequence doesn't race with old geofences still registered.
            LocationServices.getGeofencingClient(context)
                .removeGeofences(getGeofencePendingIntent(context))
                .addOnCompleteListener {
                    // Resolve regardless of success/failure — the service is already stopped.
                    promise.resolve(Unit)
                }
        }
    }
}
