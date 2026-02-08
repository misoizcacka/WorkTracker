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

class BackgroundLocationModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("BackgroundLocation")

        // Async function to start background location tracking
        AsyncFunction("start") { workerId: String, assignmentId: String, companyId: String, supabaseUrl: String, supabaseAnonKey: String, promise: Promise ->
            val context = appContext.reactContext ?: run {
                promise.reject("APP_CONTEXT_ERROR", "React Application Context is null.")
                return@AsyncFunction
            }

            // Check permissions
            val hasFineLocationPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val hasCoarseLocationPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            var hasBackgroundLocationPermission = true // Assume true for devices < Android 10

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10 (API 29) and above
                hasBackgroundLocationPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
            }

            if (!hasFineLocationPermission && !hasCoarseLocationPermission) {
                val errorMessage = "Location permissions (ACCESS_FINE_LOCATION or ACCESS_COARSE_LOCATION) not granted."
                Log.e("BackgroundLocationModule", errorMessage)
                promise.reject("PERMISSION_DENIED", errorMessage)
                return@AsyncFunction
            }

            if (!hasBackgroundLocationPermission) {
                val errorMessage = "Background location permission (ACCESS_BACKGROUND_LOCATION) not granted. Required for Android 10+."
                Log.e("BackgroundLocationModule", errorMessage)
                promise.reject("PERMISSION_DENIED", errorMessage)
                return@AsyncFunction
            }


            val serviceIntent = Intent(context, BackgroundLocationService::class.java).apply {
                putExtra("workerId", workerId)
                putExtra("assignmentId", assignmentId)
                putExtra("companyId", companyId)
                putExtra("supabaseUrl", supabaseUrl)
                putExtra("supabaseAnonKey", supabaseAnonKey)
                // Add any other necessary data as extras
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            println("BackgroundLocation.start invoked on native side. Service started.")
            promise.resolve(Unit)
        }

        // Async function to stop background location tracking
        AsyncFunction("stop") { promise: Promise ->
            val context = appContext.reactContext ?: run {
                promise.reject("APP_CONTEXT_ERROR", "React Application Context is null.")
                return@AsyncFunction
            }
            val serviceIntent = Intent(context, BackgroundLocationService::class.java)
            context.stopService(serviceIntent)
            println("BackgroundLocation.stop invoked on native side. Service stopped.")
            promise.resolve(Unit)
        }
    }
}
