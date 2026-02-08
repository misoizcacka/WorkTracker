package app.koord.backgroundlocation

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.text.SimpleDateFormat
import java.util.*

class LocationDbHelper(private val context: Context) {

    private val DATABASE_NAME = "workhourstracker.db"
    private val TABLE_NAME = "local_location_events"

    // Column names
    private val COLUMN_ID = "id"
    private val COLUMN_TIMESTAMP = "timestamp"
    private val COLUMN_TYPE = "type"
    private val COLUMN_ASSIGNMENT_ID = "assignment_id"
    private val COLUMN_WORKER_ID = "worker_id"
    private val COLUMN_LATITUDE = "latitude"
    private val COLUMN_LONGITUDE = "longitude"
    private val COLUMN_NOTES = "notes"
    private val COLUMN_SYNCED = "synced"

    private fun getDatabasePath(): String {
        // The database is stored in the files directory of the application's internal storage.
        // For Expo-SQLite, the path is typically /data/data/<package_name>/files/SQLite/<db_name>
        val packageName = context.packageName // Should be "app.koord"
        val basePath = context.filesDir.parentFile?.absolutePath
        return "$basePath/SQLite/$DATABASE_NAME"
    }

    fun insertLocationEvent(
        id: String,
        timestamp: Long, // Use long for Unix timestamp
        type: String,
        assignmentId: String,
        workerId: String,
        latitude: Double,
        longitude: Double,
        notes: String?,
        synced: Int // 0 for not synced
    ) {
        var db: SQLiteDatabase? = null
        try {
            db = SQLiteDatabase.openDatabase(getDatabasePath(), null, SQLiteDatabase.OPEN_READWRITE)
            val values = ContentValues().apply {
                put(COLUMN_ID, id)
                put(COLUMN_TIMESTAMP, SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date(timestamp))) // ISO 8601 string
                put(COLUMN_TYPE, type)
                put(COLUMN_ASSIGNMENT_ID, assignmentId)
                put(COLUMN_WORKER_ID, workerId)
                put(COLUMN_LATITUDE, latitude)
                put(COLUMN_LONGITUDE, longitude)
                put(COLUMN_NOTES, notes)
                put(COLUMN_SYNCED, synced)
            }
            val result = db.insert(TABLE_NAME, null, values)
            if (result != -1L) {
                Log.d("LocationDbHelper", "Location event inserted successfully: $id")
            } else {
                Log.e("LocationDbHelper", "Failed to insert location event: $id")
            }
        } catch (e: Exception) {
            Log.e("LocationDbHelper", "Error inserting location event: ${e.message}", e)
        } finally {
            db?.close()
        }
    }
}