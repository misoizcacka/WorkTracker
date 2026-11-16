package app.koordinate.backgroundlocation

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Date

/**
 * Schedules independent AlarmManager alarms for force-checking geofence state during PASSIVE mode.
 * Uses setExactAndAllowWhileIdle() to wake device from Doze Mode every 5 minutes.
 * 
 * This is the ONLY reliable way to detect geofence exits when device is stationary and in Doze Mode.
 * FusedLocationProvider is completely blocked during Doze, so we need AlarmManager to wake the device.
 */
object ForceCheckAlarmScheduler {
    private const val TAG = "ForceCheckAlarmScheduler"
    private const val ALARM_REQUEST_CODE = 1002  // Unique code (different from LocationAlarmReceiver's 1001)
    
    fun scheduleNextAlarm(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager not available")
            return
        }
        
        val intent = Intent(context, ForceCheckAlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val nextAlarmTime = System.currentTimeMillis() + Constants.PERIODIC_FORCE_CHECK_INTERVAL_MS
        
        try {
            // Android 12+ requires SCHEDULE_EXACT_ALARM permission
            // For foreground location services, this is usually auto-granted
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        nextAlarmTime,
                        pendingIntent
                    )
                    Log.d(TAG, "✅ Next force-check alarm scheduled for: ${Date(nextAlarmTime)} (${Constants.PERIODIC_FORCE_CHECK_INTERVAL_MS / 1000}s from now)")
                    LocationFileLogger.d(context, "ForceCheckScheduler", "Next alarm: ${Date(nextAlarmTime)}")
                } else {
                    Log.w(TAG, "⚠️ Cannot schedule exact alarms - force-check may be delayed")
                    // Fall back to inexact alarm (less reliable during Doze but better than nothing)
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
                Log.d(TAG, "✅ Next force-check alarm scheduled for: ${Date(nextAlarmTime)} (${Constants.PERIODIC_FORCE_CHECK_INTERVAL_MS / 1000}s from now)")
                LocationFileLogger.d(context, "ForceCheckScheduler", "Next alarm: ${Date(nextAlarmTime)}")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception scheduling alarm: ${e.message}")
            LocationFileLogger.e(context, "ForceCheckScheduler", "Security error: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling alarm: ${e.message}")
            LocationFileLogger.e(context, "ForceCheckScheduler", "Error: ${e.message}")
        }
    }
    
    fun cancelAlarm(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager not available")
            return
        }
        
        val intent = Intent(context, ForceCheckAlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
        Log.d(TAG, "🛑 Force-check alarms cancelled")
        LocationFileLogger.d(context, "ForceCheckScheduler", "Alarms cancelled")
    }
}
