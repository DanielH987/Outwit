/**
 * This class represents the main activity of the Outwit Android application.
 * It extends the AppCompatActivity class and is responsible for initializing
 * and setting the content view for the application's user interface.
 */
package edu.byuh.cis.cs203.outwit.activities;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.DialogInterface;
import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;

import java.util.Calendar;

import edu.byuh.cis.cs203.outwit.views.Gameview;
import edu.byuh.cis.cs203.outwit.NotificationReceiver;
import edu.byuh.cis.cs203.outwit.R;

public class MainActivity extends AppCompatActivity {

    private Gameview game;
    private MediaPlayer background_music;

    /**
     * Called when the activity is first created. This method is responsible for
     * initializing the activity, creating an instance of the Patsview class, and
     * setting it as the content view for the activity.
     *
     * @param savedInstanceState A Bundle containing the saved state of the activity,
     *                           which can be null if the activity is being created for
     *                           the first time.
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        background_music = MediaPlayer.create(this, R.raw.morning);
        background_music.setLooping(true);
        background_music.setVolume(1, 1);

        // Initialize the Patsview instance with a reference to this activity
        game = new Gameview(this);
        // Set the Patsview as the content view for this activity
        setContentView(game);
    }

    @Override
    public void onResume() {
        super.onResume();
        game.resumeGame();
        if (Preferences.getMusicPref(this)) {
            background_music.start();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        game.pauseGame();
        if (Preferences.getMusicPref(this)) {
            background_music.pause();
        }
    }

    @Override
    public void onBackPressed() {
        // Create an AlertDialog builder
        AlertDialog.Builder builder = new AlertDialog.Builder(this);

        // Set the message and buttons of the dialog
        builder.setMessage(R.string.exit_game)
                .setPositiveButton(R.string.exit_game_button1, new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        // User clicked the "Exit" button, so close the activity
                        finish();
                    }
                })
                .setNegativeButton(R.string.exit_game_button2, new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        // User cancelled the dialog, just close the dialog
                        dialog.dismiss();
                    }
                });

        // Create and show the AlertDialog
        AlertDialog alertDialog = builder.create();
        alertDialog.show();
    }


    @Override
    public void onDestroy() {
        super.onDestroy();
        background_music.release();
    }




    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel("game_notification_channel", "Game Notifications", NotificationManager.IMPORTANCE_DEFAULT);
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void scheduleWeeklyReminder() {
        // Set the time for the reminder (e.g., every Sunday at 3 PM)
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY);
        calendar.set(Calendar.HOUR_OF_DAY, 0); // 3 PM
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);

        // Create an Intent for the NotificationReceiver
        Intent intent = new Intent(this, NotificationReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);

        // Get the AlarmManager and set the repeating reminder
        AlarmManager alarmManager = (AlarmManager) getSystemService(ALARM_SERVICE);
        alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), AlarmManager.INTERVAL_DAY * 7, pendingIntent);
    }

}
