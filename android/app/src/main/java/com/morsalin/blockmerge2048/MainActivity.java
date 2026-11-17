package com.morsalin.blockmerge2048;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        if (Build.VERSION.SDK_INT < 35) {
            setSystemBarColorsLegacy();
        }

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }
    }

    @SuppressWarnings("deprecation")
    private void setSystemBarColorsLegacy() {
        getWindow().setStatusBarColor(Color.parseColor("#0E0520"));
        getWindow().setNavigationBarColor(Color.parseColor("#0B031A"));
    }
}
