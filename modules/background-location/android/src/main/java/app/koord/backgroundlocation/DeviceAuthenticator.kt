package app.koord.backgroundlocation

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import java.security.InvalidKeyException
import java.security.NoSuchAlgorithmException
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class DeviceAuthenticator(private val context: Context) {

    private val masterKeyAlias: String by lazy {
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
    }

    private val sharedPreferences: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            "secret_device_prefs",
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    companion object {
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_DEVICE_SECRET = "device_secret"
        private const val HMAC_ALGORITHM = "HmacSHA256"
        private const val TAG = "DeviceAuthenticator"
    }

    // Public properties to get the stored values. They are now nullable.
    val deviceToken: String?
        get() = sharedPreferences.getString(KEY_DEVICE_TOKEN, null)

    private val deviceSecret: String?
        get() = sharedPreferences.getString(KEY_DEVICE_SECRET, null)

    /**
     * Stores the device credentials securely.
     * This should be called from the module with credentials obtained from the backend.
     */
    fun storeCredentials(token: String, secret: String) {
        sharedPreferences.edit()
            .putString(KEY_DEVICE_TOKEN, token)
            .putString(KEY_DEVICE_SECRET, secret)
            .apply()
        Log.d(TAG, "Stored provided device token: ${token.take(8)}... and secret: ${secret.take(5)}...")
    }

    /**
     * Computes the HMAC-SHA256 signature of the given data using the device secret.
     * @param data The data to sign.
     * @return The Base64 encoded HMAC signature, or an empty string if the secret is not available.
     */
    fun computeHmac(data: String): String {
        val secret = deviceSecret
        if (secret == null) {
            Log.e(TAG, "Cannot compute HMAC: Device secret is not available.")
            return ""
        }
        try {
            val secretKeySpec = SecretKeySpec(secret.toByteArray(Charsets.UTF_8), HMAC_ALGORITHM)
            val mac = Mac.getInstance(HMAC_ALGORITHM)
            mac.init(secretKeySpec)
            val hmacBytes = mac.doFinal(data.toByteArray(Charsets.UTF_8))
            return hmacBytes.toHex()
        } catch (e: NoSuchAlgorithmException) {
            Log.e(TAG, "HMAC Algorithm not found: $HMAC_ALGORITHM", e)
        } catch (e: InvalidKeyException) {
            Log.e(TAG, "Invalid HMAC key", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error computing HMAC: ${e.message}", e)
        }
        return ""
    }
}

// Extension function to convert ByteArray to a hex string
fun ByteArray.toHex(): String = joinToString(separator = "") { eachByte -> "%02x".format(eachByte) }
