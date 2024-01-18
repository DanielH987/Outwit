package edu.byuh.cis.cs203.outwit;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.app.NotificationManager;
import android.app.PendingIntent;
import androidx.core.app.NotificationCompat;

import edu.byuh.cis.cs203.outwit.activities.MainActivity;

public class NotificationReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        // Create and show the notification
        showNotification(context);
    }

    private void showNotification(Context context) {
        // Create an intent to open your game activity
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);

        // Build the notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "game_notification_channel")
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("Time to play the game!")
                .setContentText("Don't forget to have some fun!")
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        // Get the NotificationManager and show the notification
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(0, builder.build());
    }
}
