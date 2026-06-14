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

class SupabaseService(
    private val context: Context,
    private val supabaseUrl: String,
    private val supabasePublishableKey: String,
    private val deviceAuthenticator: DeviceAuthenticator
) {

    private val client = OkHttpClient()
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

    private fun getAccessToken(): String? =
        context.getSharedPreferences(Constants.SHARED_PREFS_NAME, Context.MODE_PRIVATE)
            .getString(Constants.KEY_ACCESS_TOKEN, null)
            .takeIf { !it.isNullOrBlank() }

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
        val accessToken = getAccessToken()
        if (accessToken == null) {
            Log.e("SupabaseService", "No access token available, cannot push event $id")
            return@withContext false
        }

        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        dateFormat.timeZone = TimeZone.getTimeZone("UTC")

        val body = JSONObject().apply {
            put("id", id)
            put("created_at", dateFormat.format(Date(timestamp)))
            put("company_id", companyId)
            put("worker_id", workerId)
            put("assignment_id", assignmentId)
            put("type", type)
            put("latitude", latitude)
            put("longitude", longitude)
            if (notes != null) put("notes", notes)
        }.toString().toRequestBody(JSON_MEDIA)

        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/location_events")
            .header("apikey", supabasePublishableKey)
            .header("Authorization", "Bearer $accessToken")
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=ignore-duplicates")
            .post(body)
            .build()

        return@withContext try {
            val response = client.newCall(request).execute()
            val success = response.isSuccessful
            if (success) {
                locationDbHelper.updateLocationEventSyncedStatus(id, 1)
                Log.d("SupabaseService", "Event $id ($type) pushed. Code: ${response.code}")
            } else {
                Log.e("SupabaseService", "Failed event $id. Code: ${response.code}, Body: ${response.body?.string()}")
            }
            success
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
        if (!isOnline()) return@withContext false
        pushEvent(id, timestamp, type, assignmentId, workerId, companyId, latitude, longitude, notes)
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
        if (!isOnline()) return@withContext false
        pushEvent(id, timestamp, type, assignmentId, workerId, companyId, latitude, longitude, notes)
    }
}
