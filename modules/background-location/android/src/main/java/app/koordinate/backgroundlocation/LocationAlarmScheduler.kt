package app.koordinate.backgroundlocation

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Date

/**
 * Schedules AlarmManager-based location fallback alarms.
 * Fires every 6 minutes to catch gaps when FusedLocationProvider is throttled.
 */
object LocationAlarmScheduler {
    private const val TAG = "LocationAlarmScheduler"
    private const val ALARM_REQUEST_CODE = 1001
    private const val ALARM_INTERVAL_MS = 6 * 60 * 1000L  // 6 minutes
    
    fun scheduleNextAlarm(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager not available")
            return
        }
        
        val intent = Intent(context, LocationAlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val nextAlarmTime = System.currentTimeMillis() + ALARM_INTERVAL_MS
        
        try {
            // Android 12+ requires SCHEDULE_EXACT_ALARM permission
            // For location tracking foreground services, this is usually auto-granted
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        nextAlarmTime,
                        pendingIntent
                    )
                    Log.d(TAG, "Next alarm scheduled for: ${Date(nextAlarmTime)}")
                } else {
                    Log.w(TAG, "Cannot schedule exact alarms. Fallback may not work reliably.")
                    // Fall back to inexact alarm (less reliable but better than nothing)
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        nextAlarmTime,
                        pendingIntent
                    )
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    nextAlarmTime,
                    pendingIntent
                )
                Log.d(TAG, "Next alarm scheduled for: ${Date(nextAlarmTime)}")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception scheduling alarm: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling alarm: ${e.message}")
        }
    }
    
    fun cancelAlarms(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager not available")
            return
        }
        
        val intent = Intent(context, LocationAlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
        Log.d(TAG, "Location fallback alarms cancelled")
    }
}
