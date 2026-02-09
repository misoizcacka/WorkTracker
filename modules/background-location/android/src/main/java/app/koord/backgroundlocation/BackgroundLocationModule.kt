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
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.ExistingPeriodicWorkPolicy
import java.util.concurrent.TimeUnit
import android.content.Context // Needed for getSharedPreferences

class BackgroundLocationModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("BackgroundLocation")

        // Async function to start background location tracking
        AsyncFunction("start") { workerId: String, assignmentId: String, companyId: String, supabaseUrl: String, supabasePublishableKey: String, accessToken: String, promise: Promise ->
            val context = appContext.reactContext ?: run {
                promise.reject("APP_CONTEXT_ERROR", "React Application Context is null.", null)
                return@AsyncFunction
            }
            val appPackageName = context.packageName // Obtain appPackageName internally

            // Check permissions
            val hasFineLocationPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val hasCoarseLocationPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            var hasBackgroundLocationPermission = true // Assume true for devices < Android 10

            if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10 (API 29) and above
                hasBackgroundLocationPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
            }

            if (!hasFineLocationPermission && !hasCoarseLocationPermission) {
                val errorMessage = "Location permissions (ACCESS_FINE_LOCATION or ACCESS_COARSE_LOCATION) not granted."
                Log.e("BackgroundLocationModule", errorMessage)
                promise.reject("PERMISSION_DENIED", errorMessage, null) // Explicitly pass null
                return@AsyncFunction
            }

            if (!hasBackgroundLocationPermission) {
                val errorMessage = "Background location permission (ACCESS_BACKGROUND_LOCATION) not granted. Required for Android 10+."
                Log.e("BackgroundLocationModule", errorMessage)
                promise.reject("PERMISSION_DENIED", errorMessage, null) // Explicitly pass null
                return@AsyncFunction
            }

            // 1. Store parameters in SharedPreferences for the Worker to retrieve
            context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE).edit().apply {
                putString(Constants.KEY_WORKER_ID, workerId)
                putString(Constants.KEY_ASSIGNMENT_ID, assignmentId)
                putString(Constants.KEY_COMPANY_ID, companyId)
                putString(Constants.KEY_SUPABASE_URL, supabaseUrl)
                putString(Constants.KEY_SUPABASE_PUBLISHABLE_KEY, supabasePublishableKey)
                putString(Constants.KEY_ACCESS_TOKEN, accessToken) // Store the access token
                apply()
            }
            Log.d("BackgroundLocationModule", "Stored worker and assignment data in SharedPreferences.")


            // 2. Start the foreground service
            val serviceIntent = Intent(context, PeriodicLocationTrackingService::class.java).apply {
                // You can pass a custom message for the notification if needed
                putExtra("inputExtra", "Tracking in progress for Worker: $workerId")
            }

            // Diagnostic: Check if app is in foreground before starting FGS (Android 14+ eligibility)
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            val appProcesses = activityManager.runningAppProcesses ?: emptyList()
            val currentProcess = appProcesses.find { it.pid == android.os.Process.myPid() }
            val isForeground = currentProcess?.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
            Log.d("BackgroundLocationModule", "Before FGS start: App process importance: ${currentProcess?.importance}, isForeground: $isForeground")
            if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Log.d("BackgroundLocationModule", "PeriodicLocationTrackingService started.")

            // 3. Schedule the periodic worker
            val workRequest = PeriodicWorkRequestBuilder<LocationUpdateWorker>(
                15, TimeUnit.MINUTES, // Repeat every 15 minutes
                5, TimeUnit.MINUTES // Flex interval for execution within the last 5 minutes of the period
            )
            .addTag("LocationUpdateWorkerTag") // A tag to identify this work
            .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "LocationUpdateUniqueWork", // Unique name for this work
                ExistingPeriodicWorkPolicy.UPDATE, // Update existing work if any
                workRequest
            )
            Log.d("BackgroundLocationModule", "LocationUpdateWorker scheduled.")
            
            promise.resolve(Unit)
        }

        // Async function to stop background location tracking
        AsyncFunction("stop") { promise: Promise ->
            val context = appContext.reactContext ?: run {
                promise.reject("APP_CONTEXT_ERROR", "React Application Context is null.", null) // Explicitly pass null
                return@AsyncFunction
            }
            
            // 1. Cancel the periodic worker
            WorkManager.getInstance(context).cancelUniqueWork("LocationUpdateUniqueWork")
            Log.d("BackgroundLocationModule", "LocationUpdateUniqueWork cancelled.")

            // 2. Stop the foreground service
            val serviceIntent = Intent(context, PeriodicLocationTrackingService::class.java)
            context.stopService(serviceIntent)
            Log.d("BackgroundLocationModule", "PeriodicLocationTrackingService stopped.")

            // 3. Clear parameters from SharedPreferences
            context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
            Log.d("BackgroundLocationModule", "Cleared SharedPreferences.")

            promise.resolve(Unit)
        }
    }
}
