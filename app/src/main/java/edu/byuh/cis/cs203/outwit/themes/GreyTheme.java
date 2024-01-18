package edu.byuh.cis.cs203.outwit.themes;

import android.content.Context;

import edu.byuh.cis.cs203.outwit.R;

public class GreyTheme implements Theme {
    private Context context;

    public GreyTheme(Context context) {
        this.context = context;
    }
    @Override
    public int getDarkCellColor() {
        return context.getResources().getColor(R.color.my_dark_primary2);
    }

    @Override
    public int getLightCellColor() {
        return context.getResources().getColor(R.color.my_light_primary2);
    }

    @Override
    public int getNeutralCellColor() {
        return context.getResources().getColor(R.color.my_primary2);
    }

    @Override
    public int getBorderColor() {
        return context.getResources().getColor(R.color.my_border2);
    }


    @Override
    public int getPowerColor() {
        return context.getResources().getColor(R.color.yellow);
    }

}