package edu.byuh.cis.cs203.outwit.activities;

import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.os.Bundle;
import android.text.InputFilter;
import android.text.InputType;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.preference.ListPreference;
import androidx.preference.Preference;
import androidx.preference.PreferenceFragmentCompat;
import androidx.preference.PreferenceManager;

import java.util.Locale;

import edu.byuh.cis.cs203.outwit.R;
import edu.byuh.cis.cs203.outwit.Team;
import edu.byuh.cis.cs203.outwit.themes.GreyTheme;
import edu.byuh.cis.cs203.outwit.themes.BlueTheme;
import edu.byuh.cis.cs203.outwit.themes.NormalTheme;
import edu.byuh.cis.cs203.outwit.themes.Theme;

/**
 * Preferences class represents the activity for managing application preferences.
 * It allows users to configure various settings such as language, chipset, player order, and more.
 */
public class Preferences extends AppCompatActivity {
    private int counterValue = 3;
    private TextView counterTextView;
    /**
     * Initializes the activity and sets up the user interface based on saved preferences.
     *
     * @param savedInstanceState A Bundle containing the saved state of the activity.
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTheme(Preferences.getThemeBarResource(this));
        setContentView(R.layout.settings_activity);

        if (savedInstanceState == null) {
            getSupportFragmentManager()
                    .beginTransaction()
                    .replace(R.id.settings, new SettingsFragment())
                    .commit();
        }
        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.setDisplayHomeAsUpEnabled(true);
            actionBar.setTitle(R.string.settings);
        }
        SettingsFragment.savePlayerName(getApplicationContext(), "dark", getResources().getString(R.string.darks_turn));
        SettingsFragment.savePlayerName(getApplicationContext(), "light", getResources().getString(R.string.lights_turn));

        // Inflate the separate layout file
        View separateLayout = LayoutInflater.from(this).inflate(R.layout.increment_preference, null);

        // Find the TextView within the separate layout
        counterTextView = separateLayout.findViewById(R.id.tvValue);
    }
    /**
     * Handles the click event for the increment button, updating the counter value and TextView.
     *
     * @param v The View that was clicked.
     */
    public void onIncrementClick(View v){
        counterValue++;
        Log.d("YourTag", "Increment clicked. Counter value: " + counterValue);
        counterTextView.setText("" + counterValue);
        Log.d("YourTag", "Increment setText called. Counter value: " + counterValue);
    }
    /**
     * Handles the click event for the decrement button, updating the counter value and TextView.
     *
     * @param v The View that was clicked.
     */
    public void onDecrementClick(View v){
        if (counterValue <= 0) counterValue = 0;
        else counterValue--;
        Log.d("YourTag", "Decrement clicked. Counter value: " + counterValue);
        counterTextView.setText("" + counterValue);
        Log.d("YourTag", "Decrement setText called. Counter value: " + counterValue);
    }


    /**
     * Sets the application's language based on the selected language code.
     *
     * @param context      The context of the application.
     * @param languageCode The language code representing the selected language.
     */
    public static void setAppLanguage(Context context, String languageCode) {
        Resources resources = context.getResources();
        Configuration configuration = resources.getConfiguration();

        // Set the app's new locale based on the selected language code
        Locale newLocale = new Locale(languageCode);
        configuration.setLocale(newLocale);

        // Update resources and configuration to reflect the new locale
        resources.updateConfiguration(configuration, resources.getDisplayMetrics());
    }
    /**
     * Updates the application's language based on the stored preference.
     *
     * @param context The context of the application.
     */
    public static void updateAppLanguage(Context context) {
        String languageCode = PreferenceManager.getDefaultSharedPreferences(context).getString("language", "en");
        setAppLanguage(context, languageCode);
    }
    /**
     * Handles options menu item selection, such as navigating back to the title screen.
     *
     * @param item The selected menu item.
     * @return True if the item is handled, false otherwise.
     */
    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                // This ID represents the Home or Up button.
                onBackPressed();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }
    /**
     * Retrieves the preferred chipset type from the shared preferences.
     *
     * @param c The context of the application.
     * @return The preferred chipset type.
     */
    public static String getChipsetPref(Context c) {
        return PreferenceManager.getDefaultSharedPreferences(c).getString("chipset", "standard");
    }
    /**
     * Retrieves the preferred chip layout from the app's shared preferences.
     *
     * @param c The application context.
     * @return A string representing the preferred chip layout; default is "standard" if not set.
     */
    public static String getChipLayoutPref(Context c) {
        return PreferenceManager.getDefaultSharedPreferences(c).getString("chiplayout", "standard");
    }

    /**
     * Retrieves the preferred starting player from the app's shared preferences.
     *
     * @param c The application context.
     * @return An integer representing the preferred starting player (Team.DARK or Team.LIGHT).
     */
    public static Team getPlayerPref(Context c) {
        String currentPLayer = PreferenceManager.getDefaultSharedPreferences(c).getString("first_player", "random");
        Team currentPlayerInt;

        switch (currentPLayer) {
            case "dark_first":
                currentPlayerInt = Team.DARK;
                break;
            case "light_first":
                currentPlayerInt = Team.LIGHT;
                break;
            default:
                currentPlayerInt = (Math.random() < 0.5) ? Team.LIGHT : Team.DARK;
                break;
        }

        return currentPlayerInt;
    }
    /**
     * Retrieves the preferred animation speed from the app's shared preferences.
     *
     * @param c The application context.
     * @return An integer representing the preferred animation speed; default is 5 if not set.
     */
    public static int getSpeedPref(Context c) {
        String speedPref = PreferenceManager.getDefaultSharedPreferences(c).getString("animation_speed", "5");
        return Integer.parseInt(speedPref);
    }
    /**
     * Retrieves the preferred background music setting from the app's shared preferences.
     *
     * @param c The application context.
     * @return A boolean indicating whether background music is preferred; default is false if not set.
     */
    public static boolean getMusicPref(Context c) {
        return PreferenceManager.getDefaultSharedPreferences(c).getBoolean("background_music", false);
    }
    /**
     * Retrieves the preferred sound effects setting from the app's shared preferences.
     *
     * @param c The application context.
     * @return A boolean indicating whether sound effects are preferred; default is false if not set.
     */
    public static boolean getSoundPref(Context c) {
        return PreferenceManager.getDefaultSharedPreferences(c).getBoolean("sound_effects", false);
    }
    /**
     * Retrieves the preferred player name for renaming from the app's shared preferences.
     *
     * @param c The application context.
     * @return A string representing the preferred player name for renaming; default is "dark" if not set.
     */
    public static String getRenamePref(Context c) {
        return PreferenceManager.getDefaultSharedPreferences(c).getString("rename_player", "dark");
    }
    /**
     * Retrieves the preferred undo moves setting from the app's shared preferences.
     *
     * @param c The application context.
     * @return A string representing the preferred undo moves setting; default is "none" if not set.
     */
    public static String getUndoPref(Context c) {
        return PreferenceManager.getDefaultSharedPreferences(c).getString("undo_moves", "none");
    }
    /**
     * Retrieves the preferred timer setting from the app's shared preferences.
     *
     * @param c The application context.
     * @return A boolean indicating whether the timer is preferred; default is false if not set.
     */
    public static boolean getTimerPref(Context c) {
        return PreferenceManager.getDefaultSharedPreferences(c).getBoolean("timer", false);
    }
    public static Theme getThemePref(Context c) {
        String themePref = PreferenceManager.getDefaultSharedPreferences(c).getString("theme", "standard");
        Theme theme;
        switch (themePref) {
            case "grey":
                theme = new GreyTheme(c);
                break;
            case "blue":
                theme = new BlueTheme(c);
                break;
            default:
                theme = new NormalTheme(c);
                break;
        }
        return theme;
    }
    /**
     * Retrieves the user-selected theme and returns the corresponding image resource ID.
     *
     * @param c The application context.
     * @return The image resource ID based on the selected theme; default is R.drawable.default_title_screen if not set.
     */
    public static int getThemeImageResource(Context c) {
        String themePref = PreferenceManager.getDefaultSharedPreferences(c).getString("theme", "standard");

        switch (themePref) {
            case "grey":
                return R.drawable.title_screen3; // Assuming R.drawable.theme1_title_screen represents the black theme
            case "blue":
                return R.drawable.title_screen2; // Assuming R.drawable.theme2_title_screen represents the white theme
            default:
                return R.drawable.title_screen1; // Default image resource
        }
    }

    public static int getThemeBarResource(Context c) {
        String themePref = PreferenceManager.getDefaultSharedPreferences(c).getString("theme", "standard");

        switch (themePref) {
            case "grey":
                return R.style.Theme_Outwit_Grey; // Assuming R.drawable.theme1_title_screen represents the black theme
            case "blue":
                return R.style.Theme_Outwit_Blue; // Assuming R.drawable.theme2_title_screen represents the white theme
            default:
                return R.style.Theme_Outwit; // Default image resource
        }
    }
    public static int getThemeButtonResource(Context c) {
        String themePref = PreferenceManager.getDefaultSharedPreferences(c).getString("theme", "standard");

        switch (themePref) {
            case "grey":
                return R.color.grey;
            case "blue":
                return R.color.blue;
            default:
                return R.color.beige;
        }
    }
    public static boolean getThemeChipResource(Context c) {
        String themePref = PreferenceManager.getDefaultSharedPreferences(c).getString("theme", "standard");

        switch (themePref) {
            case "standard":
                return true;
            default:
                return false;
        }
    }
    public static boolean getHumanResource(Context c) {
        String themePref = PreferenceManager.getDefaultSharedPreferences(c).getString("player_mode", "human");

        switch (themePref) {
            case "human":
                return false;
            default:
                return true;
        }
    }

    public static String getAITeam(Context c) {
        return PreferenceManager.getDefaultSharedPreferences(c).getString("player_mode", "human");
    }
    public static Team whosePlayingPref(Context c) {
        String playerMode = PreferenceManager.getDefaultSharedPreferences(c).getString("player_mode", "human");
        switch (playerMode) {
            case "humanAi":
                return Team.LIGHT;
            case "aiHuman":
                return Team.DARK;
            default:
                return Team.NEUTRAL;
        }
    }
    /**
     * SettingsFragment represents the fragment for displaying and handling preferences.
     * It extends PreferenceFragmentCompat to manage the preferences UI.
     */
    public static class SettingsFragment extends PreferenceFragmentCompat implements Preference.OnPreferenceChangeListener {
        /**
         * Creates the preferences UI based on the XML resource.
         *
         * @param savedInstanceState A Bundle containing the saved state of the fragment.
         * @param rootKey            The root key of the preference hierarchy.
         */
        @Override
        public void onCreatePreferences(Bundle savedInstanceState, String rootKey) {
            setPreferencesFromResource(R.xml.preferences, rootKey);

            // Find the "Language" preference
            ListPreference languagePreference = findPreference("language");

            if (languagePreference != null) {
                // Set the listener for the "Language" preference
                languagePreference.setOnPreferenceChangeListener(this);
            }

            ListPreference renamePlayerPreference = findPreference("rename_player");

            if (renamePlayerPreference != null) {
                renamePlayerPreference.setOnPreferenceChangeListener(this);
            }

            ListPreference themePreference = findPreference("theme");

            if (themePreference != null) {
                themePreference.setOnPreferenceChangeListener(this);
            }
        }
        /**
         * Displays a dialog for renaming a player based on the selected preference.
         *
         * @param playerId The identifier of the player to be renamed.
         */
        private void showRenamePlayerDialog(String playerId) {
            AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
            builder.setTitle("Rename Player");

            // Set up the input
            final EditText input = new EditText(getActivity());
            input.setInputType(InputType.TYPE_CLASS_TEXT);
            input.setFilters(new InputFilter[]{new InputFilter.LengthFilter(10)});
            builder.setView(input);

            // Set up the buttons
            builder.setPositiveButton("OK", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    String playerName = input.getText().toString().trim();
                    // Assume playerId is the unique identifier for the player
                    savePlayerName(requireActivity(), playerId, playerName);
                    // Do any additional processing with the player name and ID if needed
                }
            });

            builder.setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    dialog.cancel();
                }
            });

            builder.show();
        }

        /**
         * Saves the player name in the shared preferences based on the player identifier.
         *
         * @param context    The context of the application.
         * @param playerId   The identifier of the player.
         * @param playerName The name of the player.
         */
        public static void savePlayerName(Context context, String playerId, String playerName) {
            SharedPreferences preferences = PreferenceManager.getDefaultSharedPreferences(context);
            SharedPreferences.Editor editor = preferences.edit();
            editor.putString(playerId, playerName);
            editor.apply();
        }


        /**
         * Handles preference changes, such as updating the app language or initiating player renaming.
         *
         * @param preference The changed preference.
         * @param newValue   The new value of the preference.
         * @return True if the change is handled, false otherwise.
         */
        @Override
        public boolean onPreferenceChange(Preference preference, Object newValue) {
            if (preference.getKey().equals("language")) {
                // Language preference item was changed
                updateAppLanguage(requireContext());
                getActivity().recreate();
                // Return true to allow the preference to be updated
                return true;
            } else if (preference.getKey().equals("rename_player")) {
                String playerId = getRenamePref(getContext());
                showRenamePlayerDialog(playerId);
                return true;
            } else if (preference.getKey().equals("theme")) {
                getActivity().recreate();
                return true;
            }
            return false;
        }
    }

}