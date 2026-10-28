package app.koordinate.backgroundlocation

import android.content.Context
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

/**
 * File-based logger for location tracking diagnostics.
 * Saves logs to device storage so they can be reviewed after a test session,
 * even when the phone isn't connected to a computer.
 * 
 * Logs are limited to 5MB and automatically rotate to prevent filling storage.
 */
object LocationFileLogger {
    private const val LOG_FILE_NAME = "location_tracking.log"
    private const val OLD_LOG_FILE_NAME = "location_tracking_old.log"
    private const val MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024  // 5MB max
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)
    
    /**
     * Log a message to both logcat and file.
     */
    fun log(context: Context, tag: String, level: String, message: String) {
        // Also log to logcat based on level
        when (level) {
            "D" -> Log.d(tag, message)
            "I" -> Log.i(tag, message)
            "W" -> Log.w(tag, message)
            "E" -> Log.e(tag, message)
            else -> Log.d(tag, message)
        }
        
        // Write to file
        try {
            val logFile = getLogFile(context)
            val timestamp = dateFormat.format(Date())
            val logLine = "[$timestamp] $level/$tag: $message\n"
            
            // Check file size, rotate if too big
            if (logFile.exists() && logFile.length() > MAX_LOG_SIZE_BYTES) {
                val backupFile = File(context.filesDir, OLD_LOG_FILE_NAME)
                if (backupFile.exists()) {
                    backupFile.delete()
                }
                logFile.renameTo(backupFile)
            }
            
            logFile.appendText(logLine)
        } catch (e: Exception) {
            Log.e("LocationFileLogger", "Failed to write log: ${e.message}")
        }
    }
    
    /**
     * Convenience methods for different log levels
     */
    fun d(context: Context, tag: String, message: String) = log(context, tag, "D", message)
    fun i(context: Context, tag: String, message: String) = log(context, tag, "I", message)
    fun w(context: Context, tag: String, message: String) = log(context, tag, "W", message)
    fun e(context: Context, tag: String, message: String) = log(context, tag, "E", message)
    
    /**
     * Get the current log file path
     */
    fun getLogFile(context: Context): File {
        return File(context.filesDir, LOG_FILE_NAME)
    }
    
    /**
     * Get the backup/old log file path
     */
    fun getOldLogFile(context: Context): File {
        return File(context.filesDir, OLD_LOG_FILE_NAME)
    }
    
    /**
     * Read all logs as a string (current + old if exists)
     */
    fun getLogsAsString(context: Context): String {
        return try {
            val currentLogs = getLogFile(context).let { if (it.exists()) it.readText() else "" }
            val oldLogs = getOldLogFile(context).let { if (it.exists()) it.readText() else "" }
            
            if (oldLogs.isNotEmpty() && currentLogs.isNotEmpty()) {
                "=== OLDER LOGS (Rotated) ===\n$oldLogs\n\n=== CURRENT LOGS ===\n$currentLogs"
            } else if (currentLogs.isNotEmpty()) {
                currentLogs
            } else if (oldLogs.isNotEmpty()) {
                oldLogs
            } else {
                "No logs available"
            }
        } catch (e: Exception) {
            "Failed to read logs: ${e.message}"
        }
    }
    
    /**
     * Get recent logs (last N lines)
     */
    fun getRecentLogs(context: Context, lines: Int = 100): String {
        return try {
            val allLogs = getLogsAsString(context)
            val logLines = allLogs.split("\n")
            logLines.takeLast(lines).joinToString("\n")
        } catch (e: Exception) {
            "Failed to read logs: ${e.message}"
        }
    }
    
    /**
     * Clear all logs
     */
    fun clearLogs(context: Context) {
        try {
            getLogFile(context).delete()
            getOldLogFile(context).delete()
            log(context, "LocationFileLogger", "I", "Logs cleared")
        } catch (e: Exception) {
            Log.e("LocationFileLogger", "Failed to clear logs: ${e.message}")
        }
    }
    
    /**
     * Get log statistics
     */
    fun getLogStats(context: Context): Map<String, Any> {
        return try {
            val currentFile = getLogFile(context)
            val oldFile = getOldLogFile(context)
            
            val currentSize = if (currentFile.exists()) currentFile.length() else 0L
            val oldSize = if (oldFile.exists()) oldFile.length() else 0L
            val totalSize = currentSize + oldSize
            
            val currentLines = if (currentFile.exists()) {
                currentFile.readText().split("\n").size
            } else 0
            
            mapOf(
                "current_size_bytes" to currentSize,
                "old_size_bytes" to oldSize,
                "total_size_bytes" to totalSize,
                "current_size_mb" to String.format("%.2f", currentSize / 1024.0 / 1024.0),
                "total_size_mb" to String.format("%.2f", totalSize / 1024.0 / 1024.0),
                "line_count" to currentLines,
                "max_size_mb" to String.format("%.2f", MAX_LOG_SIZE_BYTES / 1024.0 / 1024.0)
            )
        } catch (e: Exception) {
            mapOf("error" to e.message.toString())
        }
    }
}
