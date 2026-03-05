package app.koord.backgroundlocation

object Constants {
    const val SHARED_PREFS_NAME = "location_tracking_prefs"
    const val KEY_WORKER_ID = "worker_id"
    const val KEY_ASSIGNMENT_ID = "assignment_id" // Current active assignment ID (not for geofence)
    const val KEY_COMPANY_ID = "company_id"
    const val KEY_SUPABASE_URL = "supabase_url"
    const val KEY_SUPABASE_PUBLISHABLE_KEY = "supabase_publishable_key"
    const val KEY_APP_PACKAGE_NAME = "app_package_name"

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
    const val ACTION_START_ACTIVE_TRACKING = "app.koord.backgroundlocation.ACTION_START_ACTIVE_TRACKING"
    const val ACTION_STOP_ACTIVE_TRACKING = "app.koord.backgroundlocation.ACTION_STOP_ACTIVE_TRACKING"
}