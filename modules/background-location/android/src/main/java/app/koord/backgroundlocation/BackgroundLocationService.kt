package app.koord.backgroundlocation

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import app.koord.MainActivity
import app.koord.R // Assuming R.string.app_name and R.mipmap.ic_launcher exist
import com.google.android.gms.location.*
import java.util.UUID // For generating unique IDs for location events
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class BackgroundLocationService : Service() {

    private val CHANNEL_ID = "BackgroundLocationChannel"
    private val NOTIFICATION_ID = 12345

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var locationRequest: LocationRequest
    private lateinit var locationDbHelper: LocationDbHelper
    private lateinit var supabaseService: SupabaseService

    // Parameters to be passed from the caller (e.g., from JS)
    private var workerId: String? = null
    private var assignmentId: String? = null
    private var companyId: String? = null
    private var supabaseUrl: String? = null
    private var supabaseAnonKey: String? = null


    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        locationDbHelper = LocationDbHelper(this)
        // Initialize supabaseService with placeholders. Will be properly initialized in onStartCommand.
        supabaseService = SupabaseService(this, "https://placeholder.supabase.co", "placeholder_anon_key")

        locationRequest = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 15 * 60 * 1000L) // 15 minutes
            .setWaitForActivityUpdates(false) // Do not wait for activity to be active
            .setGranularity(Granularity.GRANULARITY_PERMISSION_LEVEL) // Use full accuracy based on permission
            .setMinUpdateIntervalMillis(5 * 60 * 1000L) // Minimum update interval of 5 minutes
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    Log.d("BackgroundLocationService", "Location: ${location.latitude}, ${location.longitude}")

                    val locationEventId = UUID.randomUUID().toString()
                    val timestamp = System.currentTimeMillis()
                    val type = "periodic_update"
                    val notes = "Background periodic update"

                    val currentWorkerId = workerId
                    val currentAssignmentId = assignmentId
                    val currentCompanyId = companyId

                    if (currentWorkerId != null && currentAssignmentId != null && currentCompanyId != null) {
                        // Save to SQLite
                        locationDbHelper.insertLocationEvent(
                            id = locationEventId,
                            timestamp = timestamp,
                            type = type,
                            assignmentId = currentAssignmentId,
                            workerId = currentWorkerId,
                            latitude = location.latitude,
                            longitude = location.longitude,
                            notes = notes,
                            synced = 0 // Mark as not synced
                        )

                        // Best-effort push to Supabase
                        CoroutineScope(Dispatchers.IO).launch {
                            supabaseService.sendLocationEvent(
                                id = locationEventId,
                                timestamp = timestamp,
                                type = type,
                                assignmentId = currentAssignmentId,
                                workerId = currentWorkerId,
                                companyId = currentCompanyId,
                                latitude = location.latitude,
                                longitude = location.longitude,
                                notes = notes
                            )
                        }
                    } else {
                        Log.w("BackgroundLocationService", "Missing workerId, assignmentId, or companyId. Cannot save location event.")
                    }
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val input = intent?.getStringExtra("inputExtra")

        // Retrieve parameters from intent
        workerId = intent?.getStringExtra("workerId")
        assignmentId = intent?.getStringExtra("assignmentId")
        companyId = intent?.getStringExtra("companyId")
        supabaseUrl = intent?.getStringExtra("supabaseUrl")
        supabaseAnonKey = intent?.getStringExtra("supabaseAnonKey")
        
        Log.d("BackgroundLocationService", "Service started with workerId: $workerId, assignmentId: $assignmentId, companyId: $companyId, supabaseUrl: $supabaseUrl")

        // Re-initialize supabaseService with actual values if available
        if (supabaseUrl != null && supabaseAnonKey != null) {
            supabaseService = SupabaseService(this, supabaseUrl!!, supabaseAnonKey!!)
        } else {
            Log.e("BackgroundLocationService", "Supabase URL or Anon Key not provided. Supabase push will be disabled.")
        }


        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Location Tracking Active")
            .setContentText(input ?: "Tracking your location in the background.")
            .setSmallIcon(R.mipmap.ic_launcher) // Use your app's launcher icon
            .setContentIntent(pendingIntent)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        try {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
            Log.d("BackgroundLocationService", "Location updates started.")
        } catch (unlikely: SecurityException) {
            Log.e("BackgroundLocationService", "Lost location permission. Could not remove updates. ${unlikely}")
        }

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Background Location Service Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            Log.d("BackgroundLocationService", "Location updates removed.")
        } catch (unlikely: SecurityException) {
            Log.e("BackgroundLocationService", "Lost location permission. Could not remove updates. ${unlikely}")
        }
    }
}
