package app.koord.backgroundlocation

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class PeriodicLocationTrackingService : Service() {

    private val CHANNEL_ID = "BackgroundLocationChannel"
    private val NOTIFICATION_ID = 12345

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val input = intent?.getStringExtra("inputExtra") // Can be used to customize notification text

        val appPackageName = intent?.getStringExtra("appPackageName") ?: applicationContext.packageName // Fallback to current package
        Log.d("PeriodicLocationTrackingService", "Using appPackageName for MainActivity: $appPackageName")

        val notificationIntent = Intent(applicationContext, Class.forName("$appPackageName.MainActivity").asSubclass(android.app.Activity::class.java))
        val pendingIntent = PendingIntent.getActivity(
            applicationContext, // Use applicationContext explicitly
            0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val iconResId = applicationContext.resources.getIdentifier("ic_launcher", "mipmap", appPackageName)
        val finalIcon = if (iconResId != 0) iconResId else android.R.drawable.ic_dialog_info // Use app's launcher icon or fallback

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Active Work Session - Koord") // More descriptive title
            .setContentText("Your work is being tracked. Tap to manage session.") // More descriptive content
            .setSmallIcon(finalIcon)
            .setContentIntent(pendingIntent)
            .setOngoing(true) // Make the notification non-dismissible
            .build()

        startForeground(NOTIFICATION_ID, notification)

        Log.d("PeriodicLocationTrackingService", "Service started. Foreground notification shown.")

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Background Location Service Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager // Use Context.NOTIFICATION_SERVICE
            manager.createNotificationChannel(serviceChannel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d("PeriodicLocationTrackingService", "Service destroyed. Foreground notification removed.")
    }
}

