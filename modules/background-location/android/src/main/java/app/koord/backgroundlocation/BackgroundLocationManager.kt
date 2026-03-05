package app.koord.backgroundlocation

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID
import java.util.concurrent.TimeUnit

object BackgroundLocationManager {

    private const val TAG = "LocationEventSender"
    private const val PERIODIC_WORK_NAME = "LocationUpdateUniqueWork"
    private const val PERIODIC_WORK_TAG = "LocationUpdateWorkerTag"

    private val sentEventsCache = mutableMapOf<String, Long>() // Key: "geofenceId_type", Value: Timestamp

    @Synchronized
    private fun isDuplicateEvent(geofenceId: String, type: String): Boolean {
        val key = "${geofenceId}_$type"
        val now = System.currentTimeMillis()
        val lastSent = sentEventsCache[key] ?: 0L
        if (now - lastSent < 120000L) { // 2 minute deduplication window
            return true
        }
        sentEventsCache[key] = now
        // Clean up old entries from cache to prevent memory leak
        if (sentEventsCache.size > 50) {
            val iterator = sentEventsCache.entries.iterator()
            while (iterator.hasNext()) {
                if (now - iterator.next().value > 120000L) iterator.remove()
            }
        }
        return false
    }

    // Sends a geofence transition event (ENTER/EXIT) to Supabase
    suspend fun sendGeofenceTransitionEvent(
        context: Context,
        geofenceId: String,
        eventType: String, // e.g., "ENTER_GEOFENCE", "EXIT_GEOFENCE"
        workerId: String,
        companyId: String,
        latitude: Double,
        longitude: Double,
        supabaseService: SupabaseService
    ) {
        if (isDuplicateEvent(geofenceId, eventType)) {
            Log.d(TAG, "Deduplicated duplicate $eventType for $geofenceId. Skipping.")
            return
        }

        val eventId = UUID.randomUUID().toString()
        val timestamp = System.currentTimeMillis()
        
        val success = supabaseService.sendGeofenceTransitionEvent(
            id = eventId,
            timestamp = timestamp,
            type = eventType,
            assignmentId = geofenceId,
            workerId = workerId,
            companyId = companyId,
            latitude = latitude,
            longitude = longitude
        )
        if (success) {
            Log.d(TAG, "$eventType event for $geofenceId sent to Supabase.")
        } else {
            Log.e(TAG, "Failed to send $eventType event for $geofenceId to Supabase.")
        }
    }

    // Starts the periodic location updates
    fun startPeriodicUpdates(context: Context) {
        Log.d(TAG, "Attempting to start periodic location updates.")
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<PeriodicLocationPingWorker>(
            15, TimeUnit.MINUTES, // Repeat every 15 minutes
            5, TimeUnit.MINUTES // Flex interval for execution within the last 5 minutes of the period
        )
        .setConstraints(constraints)
        .addTag(PERIODIC_WORK_TAG)
        .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            workRequest
        )
        Log.d(TAG, "Periodic LocationUpdateWorker scheduled.")
    }

    // Stops the periodic location updates
    fun stopPeriodicUpdates(context: Context) {
        Log.d(TAG, "Attempting to stop periodic location updates.")
        WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_WORK_NAME)
        Log.d(TAG, "Periodic LocationUpdateWorker cancelled.")
    }
}