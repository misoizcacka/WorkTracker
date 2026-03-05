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
    val key: String
)

class BackgroundLocationModule : Module() {
    
    private fun getGeofencePendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, PeriodicLocationTrackingService::class.java)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PendingIntent.getForegroundService(context, Constants.GEOFENCE_PENDING_INTENT_REQUEST_CODE, intent, flags)
        } else {
            PendingIntent.getService(context, Constants.GEOFENCE_PENDING_INTENT_REQUEST_CODE, intent, flags)
        }
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

        AsyncFunction("stop") { promise: Promise ->
            val context = appContext.reactContext?.applicationContext ?: run {
                promise.reject("APP_CONTEXT_ERROR", "Context is null.", null)
                return@AsyncFunction
            }
            
            LocationServices.getGeofencingClient(context).removeGeofences(getGeofencePendingIntent(context))
            context.stopService(Intent(context, PeriodicLocationTrackingService::class.java))
            context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
            promise.resolve(Unit)
        }
    }
}
