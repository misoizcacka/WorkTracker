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
    private val COLUMN_COMPANY_ID = "company_id"
    private val COLUMN_TYPE = "type"
    private val COLUMN_ASSIGNMENT_ID = "assignment_id"
    private val COLUMN_WORKER_ID = "worker_id"
    private val COLUMN_LATITUDE = "latitude"
    private val COLUMN_LONGITUDE = "longitude"
    private val COLUMN_NOTES = "notes"
    private val COLUMN_SYNCED = "synced"
    private val TRANSITION_EVENT_TYPES = setOf("enter_geofence", "exit_geofence")

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
        } else if (!columnExists(db, TABLE_NAME, COLUMN_COMPANY_ID)) {
            rebuildLocationEventsTable(db, copyLegacyRows = false)
            Log.d("LocationDbHelper", "Rebuilt $TABLE_NAME without copying legacy rows missing $COLUMN_COMPANY_ID.")
        } else if (!columnIsNotNull(db, TABLE_NAME, COLUMN_COMPANY_ID)) {
            rebuildLocationEventsTable(db, copyLegacyRows = true)
            Log.d("LocationDbHelper", "Rebuilt $TABLE_NAME to require $COLUMN_COMPANY_ID.")
        }
        return db
    }

    fun insertLocationEvent(
        id: String,
        timestamp: Long, // Use long for Unix timestamp
        companyId: String,
        type: String,
        assignmentId: String,
        workerId: String,
        latitude: Double,
        longitude: Double,
        notes: String?,
        synced: Int // 0 for not synced
    ): Boolean {
        var db: SQLiteDatabase? = null
        try {
            db = openOrCreateAndPrepareDatabase()

            if (shouldSkipTransitionInsert(db, assignmentId, type)) {
                Log.d("LocationDbHelper", "Skipping duplicate transition $type for assignment $assignmentId")
                return false
            }
            
            val values = ContentValues().apply {
                put(COLUMN_ID, id)
                put(COLUMN_TIMESTAMP, SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date(timestamp))) // ISO 8601 string
                put(COLUMN_COMPANY_ID, companyId)
                put(COLUMN_TYPE, type)
                put(COLUMN_ASSIGNMENT_ID, assignmentId)
                put(COLUMN_WORKER_ID, workerId)
                put(COLUMN_LATITUDE, latitude)
                put(COLUMN_LONGITUDE, longitude)
                put(COLUMN_NOTES, notes)
                put(COLUMN_SYNCED, synced)
            }
            val result = db.insertWithOnConflict(TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_IGNORE)
            if (result != -1L) {
                Log.d("LocationDbHelper", "Location event inserted successfully: $id")
                return true
            } else {
                Log.d("LocationDbHelper", "Location event already present or ignored: $id")
                return false
            }
        } catch (e: Exception) {
            Log.e("LocationDbHelper", "Error inserting location event: ${e.message}", e)
            return false
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

    private fun columnExists(db: SQLiteDatabase, tableName: String, columnName: String): Boolean {
        val cursor = db.rawQuery("PRAGMA table_info($tableName)", null)
        val nameColumnIndex = cursor.getColumnIndex("name")
        while (cursor.moveToNext()) {
            if (nameColumnIndex >= 0 && cursor.getString(nameColumnIndex) == columnName) {
                cursor.close()
                return true
            }
        }
        cursor.close()
        return false
    }

    private fun columnIsNotNull(db: SQLiteDatabase, tableName: String, columnName: String): Boolean {
        val cursor = db.rawQuery("PRAGMA table_info($tableName)", null)
        val nameColumnIndex = cursor.getColumnIndex("name")
        val notNullColumnIndex = cursor.getColumnIndex("notnull")
        while (cursor.moveToNext()) {
            if (nameColumnIndex >= 0 && cursor.getString(nameColumnIndex) == columnName) {
                val isNotNull = notNullColumnIndex >= 0 && cursor.getInt(notNullColumnIndex) == 1
                cursor.close()
                return isNotNull
            }
        }
        cursor.close()
        return false
    }

    private fun rebuildLocationEventsTable(db: SQLiteDatabase, copyLegacyRows: Boolean) {
        db.beginTransaction()
        try {
            db.execSQL("ALTER TABLE $TABLE_NAME RENAME TO ${TABLE_NAME}_legacy")
            db.execSQL(CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL)
            if (copyLegacyRows) {
                db.execSQL(
                    """
                    INSERT INTO $TABLE_NAME (id, timestamp, company_id, type, assignment_id, worker_id, latitude, longitude, notes, synced)
                    SELECT id, timestamp, company_id, type, assignment_id, worker_id, latitude, longitude, notes, synced
                    FROM ${TABLE_NAME}_legacy
                    WHERE company_id IS NOT NULL
                    """.trimIndent()
                )
            }
            db.execSQL("DROP TABLE ${TABLE_NAME}_legacy")
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    private fun shouldSkipTransitionInsert(db: SQLiteDatabase, assignmentId: String, type: String): Boolean {
        if (!TRANSITION_EVENT_TYPES.contains(type)) {
            return false
        }

        val cursor = db.rawQuery(
            """
            SELECT $COLUMN_TYPE
            FROM $TABLE_NAME
            WHERE $COLUMN_ASSIGNMENT_ID = ?
              AND $COLUMN_TYPE IN (?, ?)
            ORDER BY $COLUMN_TIMESTAMP DESC
            LIMIT 1
            """.trimIndent(),
            arrayOf(assignmentId, "enter_geofence", "exit_geofence")
        )

        try {
            if (!cursor.moveToFirst()) {
                return false
            }
            val typeColumnIndex = cursor.getColumnIndex(COLUMN_TYPE)
            if (typeColumnIndex < 0) {
                return false
            }
            val lastTransitionType = cursor.getString(typeColumnIndex)
            return lastTransitionType == type
        } finally {
            cursor.close()
        }
    }

    // Re-using the SQL statement for local_location_events table creation from database.ts
    private val CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL = """
        CREATE TABLE IF NOT EXISTS local_location_events (
            id TEXT PRIMARY KEY NOT NULL,
            timestamp TEXT NOT NULL,
            company_id TEXT NOT NULL,
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
