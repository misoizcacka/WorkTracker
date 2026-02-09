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

class SupabaseService(private val context: Context, private val supabaseUrl: String, private val supabasePublishableKey: String, private val accessToken: String) {

    private val client = OkHttpClient()
    private val JSON = "application/json; charset=utf-8".toMediaTypeOrNull()

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
        Log.d("SupabaseService", "sendLocationEvent for ID: $id - URL: $supabaseUrl, Key: ${supabasePublishableKey.take(5)}..., AccessToken: ${accessToken.take(5)}...")
        if (!isOnline()) {
            Log.d("SupabaseService", "Device is offline. Skipping Supabase push for location event: $id")
            return@withContext false
        }

        val json = JSONObject().apply {
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
        Log.d("SupabaseService", "Request JSON payload: $json")

        val requestBody = json.toString().toRequestBody(JSON)
        val requestUrl = "$supabaseUrl/rest/v1/location_events"
        val request = Request.Builder()
            .url(requestUrl)
            .header("apikey", supabasePublishableKey)
            .header("Authorization", "Bearer $accessToken") // Use the access token here
            .post(requestBody)
            .build()
        
        Log.d("SupabaseService", "Sending request to: $requestUrl")
        Log.d("SupabaseService", "Headers: apikey=${supabasePublishableKey.take(5)}..., Authorization=Bearer ${accessToken.take(5)}...")

        return@withContext try {
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() // Read body once
            if (response.isSuccessful) {
                Log.d("SupabaseService", "Location event successfully pushed to Supabase: $id. Code: ${response.code}, Message: ${response.message}")
                true
            } else {
                Log.e("SupabaseService", "Failed to push location event to Supabase: $id. Code: ${response.code}, Message: ${response.message}, Body: $responseBody")
                false
            }
        } catch (e: Exception) {
            Log.e("SupabaseService", "Error pushing location event to Supabase: ${e.message}", e)
            false
        }
    }
}