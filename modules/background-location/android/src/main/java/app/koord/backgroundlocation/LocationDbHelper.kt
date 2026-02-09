package app.koord.backgroundlocation

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.io.File
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

    private fun getDatabaseFile(): File {
        return context.getDatabasePath(DATABASE_NAME)
    }

    private fun openOrCreateAndPrepareDatabase(): SQLiteDatabase {
        val databaseFile = getDatabaseFile()
        val parentDir = databaseFile.parentFile
        if (parentDir != null && !parentDir.exists()) {
            val created = parentDir.mkdirs()
            if (created) {
                Log.d("LocationDbHelper", "Created database directory: ${parentDir.absolutePath}")
            } else {
                Log.e("LocationDbHelper", "Failed to create database directory: ${parentDir.absolutePath}")
            }
        }

        val db = SQLiteDatabase.openOrCreateDatabase(databaseFile.absolutePath, null)
        
        // Ensure table exists
        if (!tableExists(db, TABLE_NAME)) {
            db.execSQL(CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL)
            Log.d("LocationDbHelper", "Table $TABLE_NAME created.")
        }
        return db
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
            db = openOrCreateAndPrepareDatabase()
            
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

    fun updateLocationEventSyncedStatus(id: String, syncedStatus: Int) {
        var db: SQLiteDatabase? = null
        try {
            db = openOrCreateAndPrepareDatabase()
            
            val values = ContentValues().apply {
                put(COLUMN_SYNCED, syncedStatus)
            }
            val rowsAffected = db.update(TABLE_NAME, values, "$COLUMN_ID = ?", arrayOf(id))
            if (rowsAffected > 0) {
                Log.d("LocationDbHelper", "Location event $id synced status updated to $syncedStatus")
            } else {
                Log.w("LocationDbHelper", "Failed to update synced status for location event $id. Event not found or no change.")
            }
        } catch (e: Exception) {
            Log.e("LocationDbHelper", "Error updating synced status for location event $id: ${e.message}", e)
        } finally {
            db?.close()
        }
    }

    private fun tableExists(db: SQLiteDatabase, tableName: String): Boolean {
        val cursor = db.rawQuery("SELECT DISTINCT tbl_name FROM sqlite_master WHERE tbl_name = '$tableName'", null)
        val exists = cursor.count > 0
        cursor.close()
        return exists
    }

    // Re-using the SQL statement for local_location_events table creation from database.ts
    private val CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL = """
        CREATE TABLE IF NOT EXISTS local_location_events (
            id TEXT PRIMARY KEY NOT NULL,
            timestamp TEXT NOT NULL,
            type TEXT NOT NULL,
            assignment_id TEXT NOT NULL,
            worker_id TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            notes TEXT,
            synced INTEGER DEFAULT 0 NOT NULL
        );
    """.trimIndent()
}