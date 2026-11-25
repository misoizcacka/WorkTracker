package app.koordinate.backgroundlocation

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

    /**
     * Outcome of a single upload attempt. Only SUCCESS and REJECTED change the row's status.
     * RETRYABLE leaves the row queued (synced = 0) so a later flush tries again.
     */
    private enum class PushResult { SUCCESS, RETRYABLE, REJECTED }

    companion object {
        /** Row is stored on the server. */
        const val SYNC_STATUS_SYNCED = 1

        /**
         * The server permanently rejected the row (bad payload, HMAC mismatch, too old).
         * It is kept on the device for diagnosis and recovery but never retried, so it
         * can't block the queue.
         */
        const val SYNC_STATUS_REJECTED = 2

        /**
         * HTTP codes PostgREST returns for errors that a retry won't fix (RAISE EXCEPTION,
         * invalid input, conflicts). Everything else (401/403/404/408/429/5xx, network
         * errors) is treated as temporary.
         */
        private val PERMANENT_HTTP_CODES = setOf(400, 409, 422)
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
    ): PushResult = withContext(Dispatchers.IO) {
        val deviceToken = deviceAuthenticator.deviceToken
        if (deviceToken == null) {
            Log.e("SupabaseService", "pushEvent: no device token in EncryptedSharedPrefs. Event $id stays queued for retry.")
            return@withContext PushResult.RETRYABLE
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
            // Secret unavailable (e.g. keystore not ready). Keep the event for a later retry.
            Log.e("SupabaseService", "HMAC computation failed for event $id. Event stays queued for retry.")
            return@withContext PushResult.RETRYABLE
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
                when {
                    response.isSuccessful -> {
                        locationDbHelper.updateLocationEventSyncedStatus(id, SYNC_STATUS_SYNCED)
                        Log.d("SupabaseService", "Event $id ($type) pushed. Code: ${response.code}")
                        PushResult.SUCCESS
                    }
                    response.code in PERMANENT_HTTP_CODES -> {
                        locationDbHelper.updateLocationEventSyncedStatus(id, SYNC_STATUS_REJECTED)
                        Log.e("SupabaseService", "Event $id rejected permanently. Code: ${response.code}, Body: ${response.body?.string()}")
                        PushResult.REJECTED
                    }
                    else -> {
                        Log.w("SupabaseService", "Event $id failed temporarily. Code: ${response.code}. Stays queued for retry.")
                        PushResult.RETRYABLE
                    }
                }
            }
        } catch (e: Exception) {
            // Network-level failure (no connectivity, timeout, DNS). Keep the event queued.
            Log.e("SupabaseService", "Network error pushing event $id: ${e.message}. Stays queued for retry.")
            PushResult.RETRYABLE
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
        pushEvent(id, timestamp, type, assignmentId, workerId, companyId, latitude, longitude, notes) == PushResult.SUCCESS
    }

    /**
     * Reads unsynced events from native SQLite (oldest first) and pushes them to Supabase
     * in batches of 50 until the queue is drained.
     *
     * - SUCCESS: row marked synced.
     * - REJECTED (permanent 4xx): row moved to SYNC_STATUS_REJECTED so it doesn't block the queue.
     * - RETRYABLE (network error, 5xx, auth/token not available): the flush stops and the row
     *   stays queued. The same condition would hit every following row, and continuing would
     *   re-read the same rows forever.
     */
    suspend fun flushPendingEvents(): Int = withContext(Dispatchers.IO) {
        if (!isOnline()) return@withContext 0
        var totalFlushed = 0
        var totalRejected = 0
        flush@ while (true) {
            val pending = locationDbHelper.getUnsyncedEvents(limit = 50)
            if (pending.isEmpty()) break
            Log.d("SupabaseService", "flushPendingEvents: flushing batch of ${pending.size} events.")
            for (event in pending) {
                val result = pushEvent(
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
                when (result) {
                    PushResult.SUCCESS -> totalFlushed++
                    PushResult.REJECTED -> totalRejected++
                    PushResult.RETRYABLE -> {
                        Log.w("SupabaseService", "flushPendingEvents: temporary failure, stopping. Remaining events stay queued.")
                        break@flush
                    }
                }
            }
        }
        Log.d("SupabaseService", "flushPendingEvents: flushed $totalFlushed, rejected $totalRejected.")
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
        longitude: Double,
        mockLocation: Boolean = false
    ): Boolean = withContext(Dispatchers.IO) {
        val notes = "Geofence Transition: $type" + if (mockLocation) " | ${Constants.MOCK_LOCATION_TAG}" else ""
        val inserted = locationDbHelper.insertLocationEvent(
            id, timestamp, companyId, type, assignmentId, workerId, latitude, longitude, notes, synced = 0
        )
        if (!inserted) return@withContext false
        if (!isOnline()) {
            Log.d("SupabaseService", "Offline — event $id ($type) queued in SQLite, will sync on reconnect.")
            return@withContext false
        }
        pushEvent(id, timestamp, type, assignmentId, workerId, companyId, latitude, longitude, notes) == PushResult.SUCCESS
    }
}
