package com.fermemalek.doulaagro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            registerPlugin(UrgentAlertsPlugin.class);
        } catch (Exception e) {
            e.printStackTrace();
        }
        super.onCreate(savedInstanceState);
        try {
            UrgentAlertsPlugin.ensureUrgentChannel(this);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
