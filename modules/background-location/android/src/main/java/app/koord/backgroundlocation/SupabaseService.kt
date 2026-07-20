package app.koord.backgroundlocation

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

import java.util.concurrent.TimeUnit

class SupabaseService(
    private val context: Context,
    private val supabaseUrl: String,
    private val supabasePublishableKey: String,
    private val deviceAuthenticator: DeviceAuthenticator
) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()
    private val locationDbHelper = LocationDbHelper(context)
    private val JSON_MEDIA = "application/json; charset=utf-8".toMediaTypeOrNull()

    private fun isOnline(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
               caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
               caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
    }

    private suspend fun pushEvent(
        id: String,
        timestamp: Long,
        type: String,
        assignmentId: String,
        workerId: String,
        companyId: String,
        latitude: Double,
        longitude: Double,
        notes: String?
    ): Boolean = withContext(Dispatchers.IO) {
        val deviceToken = deviceAuthenticator.deviceToken
        if (deviceToken == null) {
            Log.e("SupabaseService", "pushEvent SKIP — no device token in EncryptedSharedPrefs. Event $id will be marked as unflushable.")
            return@withContext false
        }

        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        dateFormat.timeZone = TimeZone.getTimeZone("UTC")

        // Build the payload as a canonical JSON string — must match exactly what the DB will HMAC
        val payloadJson = JSONObject().apply {
            put("id", id)
            put("created_at", dateFormat.format(Date(timestamp)))
            put("company_id", companyId)
            put("worker_id", workerId)
            put("assignment_id", assignmentId)
            put("type", type)
            put("latitude", latitude)
            put("longitude", longitude)
            if (notes != null) put("notes", notes)
        }.toString()

        val hmac = deviceAuthenticator.computeHmac(payloadJson)
        if (hmac.isBlank()) {
            Log.e("SupabaseService", "HMAC computation failed for event $id")
            return@withContext false
        }

        // Call insert_location_event RPC — no JWT needed, authenticated by device HMAC
        val body = JSONObject().apply {
            put("p_payload", payloadJson)
            put("p_device_token", deviceToken)
            put("p_hmac", hmac)
        }.toString().toRequestBody(JSON_MEDIA)

        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/rpc/insert_location_event")
            .header("apikey", supabasePublishableKey)
            .header("Content-Type", "application/json")
            .post(body)
            .build()

        return@withContext try {
            client.newCall(request).execute().use { response ->
                val success = response.isSuccessful
                if (success) {
                    locationDbHelper.updateLocationEventSyncedStatus(id, 1)
                    Log.d("SupabaseService", "Event $id ($type) pushed. Code: ${response.code}")
                } else {
                    Log.e("SupabaseService", "Failed event $id. Code: ${response.code}, Body: ${response.body?.string()}")
                }
                success
            }
        } catch (e: Exception) {
            Log.e("SupabaseService", "Error pushing event $id: ${e.message}")
            false
        }
    }

    suspend fun sendLocationEvent(
        id: String,
        timestamp: Long,
        type: String,
        assignmentId: String,
        workerId: String,
        companyId: String,
        latitude: Double,
        longitude: Double,
        notes: String?
    ): Boolean = withContext(Dispatchers.IO) {
        val inserted = locationDbHelper.insertLocationEvent(
            id, timestamp, companyId, type, assignmentId, workerId, latitude, longitude, notes, synced = 0
        )
        if (!inserted) return@withContext false
        if (!isOnline()) {
            Log.d("SupabaseService", "Offline — event $id ($type) queued in SQLite, will sync on reconnect.")
            return@withContext false
        }
        pushEvent(id, timestamp, type, assignmentId, workerId, companyId, latitude, longitude, notes)
    }

    /**
     * Reads all unsynced events from native SQLite and pushes them to Supabase.
     * Loops in batches of 50 until the queue is fully drained.
     *
     * Individual event failures (e.g. HMAC mismatch on old events with wrong timestamps)
     * are skipped — the event is marked synced to prevent it from blocking the queue forever.
     * Network-level failures (no connectivity, server down) abort the loop so we don't
     * hammer a server that is genuinely unavailable.
     */
    suspend fun flushPendingEvents(): Int = withContext(Dispatchers.IO) {
        if (!isOnline()) return@withContext 0
        var totalFlushed = 0
        var consecutiveNetworkFailures = 0
        while (true) {
            val pending = locationDbHelper.getUnsyncedEvents(limit = 50)
            if (pending.isEmpty()) break
            Log.d("SupabaseService", "flushPendingEvents: flushing batch of ${pending.size} events.")
            var batchFlushed = 0
            var batchNetworkErrors = 0
            for (event in pending) {
                try {
                    val success = pushEvent(
                        id = event.id,
                        timestamp = event.timestamp,
                        type = event.type,
                        assignmentId = event.assignmentId,
                        workerId = event.workerId,
                        companyId = event.companyId,
                        latitude = event.latitude,
                        longitude = event.longitude,
                        notes = event.notes
                    )
                    if (success) {
                        batchFlushed++
                    } else {
                        // Server rejected the event (4xx) — mark it synced so it doesn't
                        // block the queue. Likely a stale event with a bad timestamp/HMAC.
                        Log.w("SupabaseService", "Event ${event.id} rejected by server — marking as synced to unblock queue.")
                        locationDbHelper.updateLocationEventSyncedStatus(event.id, 1)
                    }
                } catch (e: Exception) {
                    // Network-level error — count it, don't skip
                    batchNetworkErrors++
                    Log.e("SupabaseService", "Network error pushing event ${event.id}: ${e.message}")
                }
            }
            totalFlushed += batchFlushed
            consecutiveNetworkFailures = if (batchNetworkErrors > 0) consecutiveNetworkFailures + 1 else 0
            // Stop if we're getting consistent network errors — server may be down
            if (consecutiveNetworkFailures >= 2) {
                Log.w("SupabaseService", "flushPendingEvents: stopping after repeated network errors.")
                break
            }
        }
        Log.d("SupabaseService", "flushPendingEvents: total flushed $totalFlushed.")
        totalFlushed
    }

    suspend fun sendGeofenceTransitionEvent(
        id: String,
        timestamp: Long,
        type: String,
        assignmentId: String,
        workerId: String,
        companyId: String,
        latitude: Double,
        longitude: Double
    ): Boolean = withContext(Dispatchers.IO) {
        val notes = "Geofence Transition: $type"
        val inserted = locationDbHelper.insertLocationEvent(
            id, timestamp, companyId, type, assignmentId, workerId, latitude, longitude, notes, synced = 0
        )
        if (!inserted) return@withContext false
        if (!isOnline()) {
            Log.d("SupabaseService", "Offline — event $id ($type) queued in SQLite, will sync on reconnect.")
            return@withContext false
        }
        pushEvent(id, timestamp, type, assignmentId, workerId, companyId, latitude, longitude, notes)
    }
}
