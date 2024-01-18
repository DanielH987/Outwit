package edu.byuh.cis.cs203.outwit.activities;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageButton;
import android.widget.ImageView;

import androidx.core.content.ContextCompat;
import androidx.core.text.HtmlCompat;

import edu.byuh.cis.cs203.outwit.R;

/**
 * The SplashScreen class represents the initial activity of the application.
 * It provides a simple splash screen with buttons for About, Settings, and Play.
 */
public class SplashScreen extends Activity {
    private ImageButton about;
    private ImageButton settings;
    private ImageButton play;
    private Animation pressAnim;
    private ImageView imageView;
    private int currentThemeResource;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Set the theme before calling super.onCreate
        int themeResource = Preferences.getThemeBarResource(this);
        currentThemeResource = themeResource; // Store the applied theme
        setTheme(themeResource);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash_screen);
        imageView = findViewById(R.id.titleScreen);

        // Initialize buttons and animation
        about = findViewById(R.id.aboutButton);
        settings = findViewById(R.id.settingsButton);
        play = findViewById(R.id.playButton);
        pressAnim = AnimationUtils.loadAnimation(this, R.anim.press_animation);

        // Set click listeners for the buttons
        about.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                about.startAnimation(pressAnim);
                showAboutDialog();
            }
        });
        settings.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                settings.startAnimation(pressAnim);
                openPreferences();
            }
        });
        play.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                play.startAnimation(pressAnim);
                startGameActivity();
            }
        });

        // Set the image resource based on the selected theme
        int imageResource = Preferences.getThemeImageResource(this);
        imageView.setImageResource(imageResource);
        // Set the tint color for the About and Settings buttons based on the theme
        int buttonTintColor = ContextCompat.getColor(this, Preferences.getThemeButtonResource(this));
        about.setColorFilter(buttonTintColor);
        settings.setColorFilter(buttonTintColor);
    }
    @Override
    protected void onResume() {
        super.onResume();
        if (themeHasChanged()) {
            recreate(); // Recreates the current activity to apply the new theme
        }
    }
    private boolean themeHasChanged() {
        // Check if the saved theme in preferences is different from the current theme
        int savedThemeResource = Preferences.getThemeBarResource(this);
        return currentThemeResource != savedThemeResource;
    }

    /**
     * Display the About dialog when the About button is clicked.
     */
    private void showAboutDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(R.string.rules_title);
        builder.setMessage(HtmlCompat.fromHtml(getString(R.string.rules_text), HtmlCompat.FROM_HTML_MODE_LEGACY));
        builder.setPositiveButton("OK", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss();
            }
        });
        AlertDialog alertDialog = builder.create();
        alertDialog.show();
    }

    /**
     * Start the main game activity when the Play button is clicked.
     */
    private void startGameActivity() {
        Intent intent = new Intent(this, MainActivity.class);
        startActivity(intent);
    }

    private void openPreferences() {
        Intent intent = new Intent(this, Preferences.class);
        startActivity(intent);
    }
}
