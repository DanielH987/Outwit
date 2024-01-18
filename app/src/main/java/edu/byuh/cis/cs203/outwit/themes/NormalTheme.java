package edu.byuh.cis.cs203.outwit.themes;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.Color;
import edu.byuh.cis.cs203.outwit.R;

public class NormalTheme implements Theme {

    private Context context;

    public NormalTheme(Context context) {
        this.context = context;
    }

    @Override
    public int getDarkCellColor() {
        return context.getResources().getColor(R.color.my_dark_primary);
    }

    @Override
    public int getLightCellColor() {
        return context.getResources().getColor(R.color.my_light_primary);
    }

    @Override
    public int getNeutralCellColor() {
        return context.getResources().getColor(R.color.my_primary);
    }


    @Override
    public int getBorderColor() {
        return context.getResources().getColor(R.color.my_border);
    }

    @Override
    public int getPowerColor() {
        return context.getResources().getColor(R.color.yellow);
    }

}
