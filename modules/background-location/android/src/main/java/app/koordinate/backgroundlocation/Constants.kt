package app.koordinate.backgroundlocation

import android.location.Location

/**
 * Location quality metadata for hybrid GPS+WiFi tracking
 */
data class LocationQuality(
    val location: Location,
    val source: LocationSource,
    val confidence: Confidence,
    val trustScore: Int,  // 0-100
    val payrollVerified: Boolean = false
)

enum class LocationSource(val label: String) {
    GPS_HIGH_QUALITY("gps_high"),       // accuracy <= 20m (strong GPS: 6+ satellites, good HDOP)
    GPS_MEDIUM_QUALITY("gps_medium"),   // accuracy <= 50m (moderate GPS: 4-6 satellites)
    WIFI_HIGH_CONFIDENCE("wifi_high"),  // accuracy <= 100m (good WiFi or weak GPS)
    WIFI_MEDIUM_CONFIDENCE("wifi_medium"), // accuracy <= 200m (moderate WiFi)
    WIFI_LOW_CONFIDENCE("wifi_low"),    // accuracy <= 500m (weak WiFi or cell)
    CELL_TOWER("cell_tower")            // accuracy > 500m (cell tower only)
}

enum class Confidence {
    HIGH,       // GPS high quality - trust 95%
    MEDIUM,     // GPS weak or WiFi high - trust 60-75%
    LOW,        // WiFi medium - trust 40%
    VERY_LOW    // WiFi low or cell tower - trust 20%
}

object Constants {
    const val ACTIVE_TRACKING_INTERVAL_MS = 2 * 60 * 1000L   // 2 min — worker outside geofence, traveling
    const val PASSIVE_TRACKING_INTERVAL_MS = 5 * 60 * 1000L  // 5 min — worker inside geofence, on site

    const val SHARED_PREFS_NAME = "location_tracking_prefs"
    const val KEY_WORKER_ID = "worker_id"
    const val KEY_ASSIGNMENT_ID = "assignment_id" // Current active assignment ID (not for geofence)
    const val KEY_COMPANY_ID = "company_id"
    const val KEY_SUPABASE_URL = "supabase_url"
    const val KEY_SUPABASE_PUBLISHABLE_KEY = "supabase_publishable_key"
    const val KEY_APP_PACKAGE_NAME = "app_package_name"
    const val KEY_LOCATION_NAME = "location_name"
    const val KEY_LAST_LOCATION_EVENT_TIME = "last_location_event_time" // DEPRECATED: Use KEY_LAST_FUSED_EVENT_TIME instead
    const val KEY_LAST_FUSED_EVENT_TIME = "last_fused_event_time" // Timestamp of last FusedLocationProvider event (for AlarmManager monitoring)
    const val KEY_LAST_ALARM_EVENT_TIME = "last_alarm_event_time" // Timestamp of last AlarmManager fallback event (for diagnostics)

    // Geofencing constants
    const val GEOFENCE_RADIUS_METERS = 150f // From frontend ACCEPTABLE_DISTANCE
    const val GEOFENCE_EXPIRATION_IN_MILLISECONDS: Long = -1 // Geofence never expires
    const val GEOFENCE_PENDING_INTENT_REQUEST_CODE = 999
    const val GEOFENCE_NOTIFICATION_ID = 12345

    // Shared Preferences keys for geofencing data
    const val SHARED_PREFS_KEY_GEOFENCE_ASSIGNMENTS = "geofence_assignments_json"
    const val SHARED_PREFS_KEY_ACTIVE_GEOFENCE_ID = "active_geofence_id" // ID of the geofence currently being monitored
    const val SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE = "is_inside_geofence" // Boolean: true if worker is currently inside an assignment geofence

    // Notification channel details (for foreground service and geofence alerts)
    const val NOTIFICATION_CHANNEL_ID = "workhourstracker_location_channel"
    const val NOTIFICATION_CHANNEL_NAME = "WorkHours Tracker Location"

    // Intent Actions for Service Control
    const val ACTION_START_ACTIVE_TRACKING = "app.koordinate.backgroundlocation.ACTION_START_ACTIVE_TRACKING"
    const val ACTION_STOP_ACTIVE_TRACKING = "app.koordinate.backgroundlocation.ACTION_STOP_ACTIVE_TRACKING"

    // Location quality thresholds
    // Note: Accuracy already encodes satellite quality via HDOP calculation
    // Low accuracy = strong GPS (many satellites, good geometry)
    // High accuracy = WiFi/Cell or weak GPS (few satellites, poor geometry)
    const val GPS_HIGH_QUALITY_MAX_ACCURACY = 20f  // Strong GPS: 6+ satellites
    const val GPS_MEDIUM_QUALITY_MAX_ACCURACY = 50f // Moderate GPS: 4-6 satellites
    const val WIFI_HIGH_MAX_ACCURACY = 100f
    const val WIFI_MEDIUM_MAX_ACCURACY = 200f
    const val WIFI_LOW_MAX_ACCURACY = 500f

    /**
     * Analyze location quality based on accuracy
     * 
     * Android calculates accuracy using: accuracy = deviceChipError × HDOP
     * where HDOP (Horizontal Dilution of Precision) is derived from satellite geometry.
     * 
     * Low accuracy (4-20m) = Strong GPS with many satellites in good positions
     * Medium accuracy (20-100m) = Moderate GPS or high-quality WiFi
     * High accuracy (100-500m) = WiFi or cell tower positioning
     * 
     * Returns null if location quality is too poor to use (>500m accuracy)
     */
    fun getLocationQuality(location: Location): LocationQuality? {
        val accuracy = location.accuracy

        return when {
            // TIER 1: High-quality GPS (Payroll-grade) - Strong satellite fix ✅✅✅
            accuracy <= GPS_HIGH_QUALITY_MAX_ACCURACY ->
                LocationQuality(
                    location = location,
                    source = LocationSource.GPS_HIGH_QUALITY,
                    confidence = Confidence.HIGH,
                    trustScore = 95,
                    payrollVerified = true
                )

            // TIER 2: Medium GPS (Good for tracking) - Moderate satellite fix ✅✅
            accuracy <= GPS_MEDIUM_QUALITY_MAX_ACCURACY ->
                LocationQuality(
                    location = location,
                    source = LocationSource.GPS_MEDIUM_QUALITY,
                    confidence = Confidence.MEDIUM,
                    trustScore = 75,
                    payrollVerified = false
                )

            // TIER 3: WiFi high confidence (good indoor tracking or weak GPS) ✅
            accuracy <= WIFI_HIGH_MAX_ACCURACY ->
                LocationQuality(
                    location = location,
                    source = LocationSource.WIFI_HIGH_CONFIDENCE,
                    confidence = Confidence.MEDIUM,
                    trustScore = 60,
                    payrollVerified = false
                )

            // TIER 4: WiFi medium confidence (approximate indoor tracking) ⚠️
            accuracy <= WIFI_MEDIUM_MAX_ACCURACY ->
                LocationQuality(
                    location = location,
                    source = LocationSource.WIFI_MEDIUM_CONFIDENCE,
                    confidence = Confidence.LOW,
                    trustScore = 40,
                    payrollVerified = false
                )

            // TIER 5: WiFi/Cell low confidence (rough location only) ⚠️⚠️
            accuracy <= WIFI_LOW_MAX_ACCURACY ->
                LocationQuality(
                    location = location,
                    source = LocationSource.WIFI_LOW_CONFIDENCE,
                    confidence = Confidence.VERY_LOW,
                    trustScore = 20,
                    payrollVerified = false
                )

            // TIER 6: Cell tower (very rough) - reject as too inaccurate ❌
            else -> null
        }
    }
}
