package com.fermemalek.doulaagro;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UrgentAlerts")
public class UrgentAlertsPlugin extends Plugin {
    public static final String CHANNEL_ID = "doula_urgent_alerts";

    public static void ensureUrgentChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel existing = nm.getNotificationChannel(CHANNEL_ID);
        if (existing != null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Urgence Ferme (Doula Agro)",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Alertes critiques : arrosage, traitements phyto, gel, vent fort et urgences ferme.");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0, 600, 250, 600, 250, 800 });
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setBypassDnd(true);

        Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmSound == null) {
            alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        channel.setSound(alarmSound, attrs);

        nm.createNotificationChannel(channel);
    }

    @PluginMethod
    public void createUrgentChannel(PluginCall call) {
        ensureUrgentChannel(getContext());
        JSObject ret = new JSObject();
        ret.put("channelId", CHANNEL_ID);
        call.resolve(ret);
    }

    @PluginMethod
    public void getPermissionsStatus(PluginCall call) {
        Context ctx = getContext();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);

        boolean notificationsEnabled = NotificationManagerCompat.from(ctx).areNotificationsEnabled();

        boolean dndPolicyGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && nm != null) {
            dndPolicyGranted = nm.isNotificationPolicyAccessGranted();
        }

        boolean channelBypassDnd = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
            ensureUrgentChannel(ctx);
            NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
            if (ch != null) {
                channelBypassDnd = ch.canBypassDnd();
            }
        }

        boolean exactAlarmGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && am != null) {
            exactAlarmGranted = am.canScheduleExactAlarms();
        }

        boolean batteryUnrestricted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
            batteryUnrestricted = pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }

        JSObject ret = new JSObject();
        ret.put("notifications", notificationsEnabled);
        ret.put("dndBypass", dndPolicyGranted);
        ret.put("channelBypassDnd", channelBypassDnd);
        ret.put("exactAlarm", exactAlarmGranted);
        ret.put("batteryUnrestricted", batteryUnrestricted);
        call.resolve(ret);
    }

    @PluginMethod
    public void openDndSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open DND settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openChannelSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            ensureUrgentChannel(ctx);
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
                intent.putExtra(Settings.EXTRA_CHANNEL_ID, CHANNEL_ID);
            } else {
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra("app_package", ctx.getPackageName());
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open channel settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open exact alarm settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openBatteryOptimizationSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
                call.resolve();
            } catch (Exception ex) {
                call.reject("Cannot open battery settings: " + ex.getMessage());
            }
        }
    }
}
