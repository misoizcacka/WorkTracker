package app.koord.backgroundlocation

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.ListenableWorker // Explicitly import ListenableWorker for Result class
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.FusedLocationProviderClient
import kotlinx.coroutines.tasks.await
import java.util.UUID
import java.util.concurrent.TimeUnit

class LocationUpdateWorker(appContext: Context, workerParams: WorkerParameters) :
    CoroutineWorker(appContext, workerParams) {

    init {
        Log.d("LocationUpdateWorker", "LocationUpdateWorker instantiated.")
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationDbHelper: LocationDbHelper
    private lateinit var supabaseService: SupabaseService

    override suspend fun doWork(): ListenableWorker.Result {
        Log.d("LocationUpdateWorker", "doWork started.")

        // Initialize components
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(applicationContext)
        locationDbHelper = LocationDbHelper(applicationContext)

        // Retrieve data from SharedPreferences
        val sharedPrefs = applicationContext.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val workerId = sharedPrefs.getString(Constants.KEY_WORKER_ID, null as String?)
        val assignmentId = sharedPrefs.getString(Constants.KEY_ASSIGNMENT_ID, null as String?)
        val companyId = sharedPrefs.getString(Constants.KEY_COMPANY_ID, null as String?)
        val supabaseUrl = sharedPrefs.getString(Constants.KEY_SUPABASE_URL, null as String?)
        val supabasePublishableKey = sharedPrefs.getString(Constants.KEY_SUPABASE_PUBLISHABLE_KEY, null as String?)
        val accessToken = sharedPrefs.getString(Constants.KEY_ACCESS_TOKEN, null as String?)

        Log.d("LocationUpdateWorker", "SharedPreferences values: " +
                "workerId=$workerId, " +
                "assignmentId=$assignmentId, " +
                "companyId=$companyId, " +
                "supabaseUrl=${supabaseUrl?.take(5)}..., " + // Log first 5 chars for brevity/security
                "supabasePublishableKey=${supabasePublishableKey?.take(5)}..., " + // Log first 5 chars
                "accessToken=${accessToken?.take(5)}...") // Log first 5 chars

        if (workerId == null || assignmentId == null || companyId == null || supabaseUrl == null || supabasePublishableKey == null || accessToken == null) {
            Log.e("LocationUpdateWorker", "Missing required parameters in SharedPreferences. Cannot track location.")
            return ListenableWorker.Result.failure()
        }

        // Initialize SupabaseService with retrieved credentials
        supabaseService = SupabaseService(applicationContext, supabaseUrl, supabasePublishableKey, accessToken)

        // Check for permissions
        val hasPermissions = hasLocationPermissions()
        Log.d("LocationUpdateWorker", "Location permissions check result: $hasPermissions")
        if (!hasPermissions) {
            Log.e("LocationUpdateWorker", "Location permissions not granted. Cannot get location.")
            return ListenableWorker.Result.failure()
        }

        return try {
            val location: Location? = fusedLocationClient.lastLocation.await()
            Log.d("LocationUpdateWorker", "FusedLocationProviderClient.lastLocation.await() result: ${location?.latitude}, ${location?.longitude}")

            location?.let {
                val locationEventId = UUID.randomUUID().toString()
                val timestamp = System.currentTimeMillis()
                val type = "PING"
                val notes = "Periodic background location update via WorkManager"

                // 1. Write to local SQLite FIRST
                locationDbHelper.insertLocationEvent(
                    id = locationEventId,
                    timestamp = timestamp,
                    type = type,
                    assignmentId = assignmentId,
                    workerId = workerId,
                    latitude = it.latitude,
                    longitude = it.longitude,
                    notes = notes,
                    synced = 0
                )
                Log.d("LocationUpdateWorker", "Location saved to SQLite: $locationEventId, Lat: ${it.latitude}, Lon: ${it.longitude}")

                // 2. Then best-effort POST to backend
                Log.d("LocationUpdateWorker", "Attempting to send location event to Supabase: $locationEventId")
                val supabasePushSuccessful = supabaseService.sendLocationEvent(
                    id = locationEventId,
                    timestamp = timestamp,
                    type = type,
                    assignmentId = assignmentId,
                    workerId = workerId,
                    companyId = companyId,
                    latitude = it.latitude,
                    longitude = it.longitude,
                    notes = notes
                )
                if (supabasePushSuccessful) {
                    locationDbHelper.updateLocationEventSyncedStatus(locationEventId, 1)
                    Log.d("LocationUpdateWorker", "Successfully pushed and marked as synced: $locationEventId")
                } else {
                    Log.e("LocationUpdateWorker", "Failed to push to Supabase, leaving synced = 0: $locationEventId")
                }
                ListenableWorker.Result.success()
            } ?: run {
                Log.w("LocationUpdateWorker", "Last known location is null.")
                ListenableWorker.Result.success()
            }
        } catch (e: Exception) {
            Log.e("LocationUpdateWorker", "Error getting location or saving event: ${e.message}", e)
            ListenableWorker.Result.failure()
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