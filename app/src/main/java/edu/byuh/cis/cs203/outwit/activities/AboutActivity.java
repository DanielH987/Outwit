package edu.byuh.cis.cs203.outwit.activities;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.MenuItem;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;

import edu.byuh.cis.cs203.outwit.R;

public class AboutActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_about);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true); // Add a back button in the action bar
        setTitle(R.string.sound_settings); // Set the title for the About screen
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                // Handle the up button press, navigate back to the title screen
                // For example, you can use an Intent to start the title screen activity
                Intent intent = new Intent(this, Preferences.class);
                startActivity(intent);
                return true;
            // Add other cases for other menu items if needed
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    public void openLink(View view) {
        String url = "";

        // Determine which link was clicked based on the view's ID or any other identifier.
        if (view.getId() == R.id.soundtrack1TextView) {
            url = "http://creativecommons.org/licenses/by/4.0/";
        } else if (view.getId() == R.id.soundtrack2TextView) {
            url = "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3";
        }

        // Create an Intent to open the web browser with the specified URL.
        if (!url.isEmpty()) {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        }
    }

}

