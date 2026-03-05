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
    private val JSON = "application/json; charset=utf-8".toMediaTypeOrNull()
    private val RPC_PATH = "/rest/v1/rpc/insert_location_event" // NEW: Path for RPC endpoint

    private fun isOnline(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val activeNetwork = connectivityManager.getNetworkCapabilities(network) ?: return false
        return when {
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> true
            else -> false
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
        if (!isOnline()) {
            Log.d("SupabaseService", "Device is offline. Location event $id will be saved locally and synced later.")
            return@withContext false
        }

        val jsonPayload = JSONObject().apply {
            put("id", id)
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            dateFormat.timeZone = TimeZone.getTimeZone("UTC")
            put("created_at", dateFormat.format(Date(timestamp)))
            put("company_id", companyId)
            put("worker_id", workerId)
            put("assignment_id", assignmentId)
            put("type", type)
            put("latitude", latitude)
            put("longitude", longitude)
            put("notes", notes)
        }
        val jsonPayloadString = jsonPayload.toString() // Convert the payload to string for HMAC

        val deviceToken = deviceAuthenticator.deviceToken
        if (deviceToken == null) {
            Log.e("SupabaseService", "Cannot send location event: Device token is null. Device must be registered.")
            return@withContext false
        }
        Log.d("SupabaseService", "Using deviceToken for location event: ${deviceToken.take(8)}...") // NEW LOG
        val hmacSignature = deviceAuthenticator.computeHmac(jsonPayloadString)
        if (hmacSignature.isEmpty()) {
            Log.e("SupabaseService", "Cannot send location event: HMAC signature failed to compute (likely missing secret).")
            return@withContext false
        }

        val rpcRequestBody = JSONObject().apply {
            put("p_payload", jsonPayloadString) // Pass as string
            put("p_device_token", deviceToken)
            put("p_hmac", hmacSignature)
        }.toString().toRequestBody(JSON)

        val requestUrl = "$supabaseUrl$RPC_PATH" // NEW: Use RPC path
        val request = Request.Builder()
            .url(requestUrl)
            .header("apikey", supabasePublishableKey) // Only apikey header needed for RPC
            .post(rpcRequestBody)
            .build()
        
        Log.d("SupabaseService", "Sending location event RPC to: $requestUrl for ID: $id")
        Log.d("SupabaseService", "Headers: apikey=${supabasePublishableKey.take(5)}...") // Only apikey is sent

        return@withContext try {
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() // Read body once
            if (response.isSuccessful) {
                Log.d("SupabaseService", "Location event $id successfully pushed to Supabase via RPC. Code: ${response.code}")
                true
            } else {
                Log.e("SupabaseService", "Failed to push location event $id to Supabase via RPC. Code: ${response.code}, Message: ${response.message}, Body: $responseBody. Saved locally as unsynced.")
                false
            }
        } catch (e: Exception) {
            Log.e("SupabaseService", "Error pushing location event $id to Supabase via RPC: ${e.message}. Saved locally as unsynced.", e)
            false
        }
    }

    suspend fun sendGeofenceTransitionEvent(
        id: String,
        timestamp: Long,
        type: String, // e.g., "ENTER_GEOFENCE", "EXIT_GEOFENCE"
        assignmentId: String,
        workerId: String,
        companyId: String,
        latitude: Double,
        longitude: Double
    ): Boolean = withContext(Dispatchers.IO) {
        if (!isOnline()) {
            Log.d("SupabaseService", "Device is offline. Geofence event $id will be saved locally and synced later.")
            return@withContext false
        }

        val jsonPayload = JSONObject().apply {
            put("id", id)
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            dateFormat.timeZone = TimeZone.getTimeZone("UTC")
            put("created_at", dateFormat.format(Date(timestamp)))
            put("company_id", companyId)
            put("worker_id", workerId)
            put("assignment_id", assignmentId)
            put("type", type)
            put("latitude", latitude)
            put("longitude", longitude)
            put("notes", "Geofence Transition: $type")
        }
        val jsonPayloadString = jsonPayload.toString()

        val deviceToken = deviceAuthenticator.deviceToken
        if (deviceToken == null) {
            Log.e("SupabaseService", "Cannot send geofence event: Device token is null. Device must be registered.")
            return@withContext false
        }
        Log.d("SupabaseService", "Using deviceToken for geofence event: ${deviceToken.take(8)}...") // NEW LOG
        val hmacSignature = deviceAuthenticator.computeHmac(jsonPayloadString)
        if (hmacSignature.isEmpty()) {
            Log.e("SupabaseService", "Cannot send geofence event: HMAC signature failed to compute (likely missing secret).")
            return@withContext false
        }

        val rpcRequestBody = JSONObject().apply {
            put("p_payload", jsonPayloadString) // Pass as string, not JSONObject
            put("p_device_token", deviceToken)
            put("p_hmac", hmacSignature)
        }.toString().toRequestBody(JSON)

        val requestUrl = "$supabaseUrl$RPC_PATH"
        val request = Request.Builder()
            .url(requestUrl)
            .header("apikey", supabasePublishableKey)
            .post(rpcRequestBody)
            .build()
        
        Log.d("SupabaseService", "Sending geofence event RPC to: $requestUrl for ID: $id")

        return@withContext try {
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()
            if (response.isSuccessful) {
                Log.d("SupabaseService", "Geofence event $id ($type) successfully pushed to Supabase via RPC. Code: ${response.code}")
                true
            } else {
                Log.e("SupabaseService", "Failed to push geofence event $id ($type) to Supabase via RPC. Code: ${response.code}, Message: ${response.message}, Body: $responseBody.")
                false
            }
        } catch (e: Exception) {
            Log.e("SupabaseService", "Error pushing geofence event $id ($type) to Supabase via RPC: ${e.message}.", e)
            false
        }
    }
}