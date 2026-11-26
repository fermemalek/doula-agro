package com.fermemalek.doulaagro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UrgentAlertsPlugin.class);
        super.onCreate(savedInstanceState);
        UrgentAlertsPlugin.ensureUrgentChannel(this);
    }
}
