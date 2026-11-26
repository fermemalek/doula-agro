package com.fermemalek.doulaagro;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
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
    public static final String CHANNEL_ID = "doula_urgent_alerts_v2";

    public static void ensureUrgentChannel(Context context) {
        try {
            if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
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
            try {
                channel.setBypassDnd(true);
            } catch (Exception e) {
                e.printStackTrace();
            }

            try {
                Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmSound == null) {
                    alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }
                if (alarmSound != null) {
                    AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                    channel.setSound(alarmSound, attrs);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            nm.createNotificationChannel(channel);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PluginMethod
    public void createUrgentChannel(PluginCall call) {
        try {
            ensureUrgentChannel(getContext());
        } catch (Exception e) {
            e.printStackTrace();
        }
        JSObject ret = new JSObject();
        ret.put("channelId", CHANNEL_ID);
        call.resolve(ret);
    }

    @PluginMethod
    public void fireImmediateUrgentNotification(PluginCall call) {
        try {
            Context ctx = getContext();
            int id = call.getInt("id", (int) (100000 + (Math.random() * 899999)));
            String title = call.getString("title", "🚨 Alerte Critique — Doula Agro");
            String body = call.getString("body", "Vérification de l'alerte sonore et vibration.");
            boolean playRingtone = call.getBoolean("playRingtone", true);

            UrgentAlertReceiver.fireNow(ctx, id, title, body, playRingtone);

            JSObject ret = new JSObject();
            ret.put("fired", true);
            ret.put("id", id);
            call.resolve(ret);
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("fireImmediateUrgentNotification failed: " + e.getMessage());
        }
    }

    /**
     * Planifie une alarme critique 100 % native via AlarmManager.setAlarmClock()
     * (jamais différée ni bloquée par Doze, fonctionne écran verrouillé et en mode Silence/DND).
     * Inclut un Handler de secours pour les délais courts (<= 15 s) dédupliqué par ID.
     */
    @PluginMethod
    public void scheduleNativeCriticalAlarm(PluginCall call) {
        try {
            Context ctx = getContext();
            ensureUrgentChannel(ctx);

            int id = call.getInt("id", (int) (100000 + (Math.random() * 899999)));
            String title = call.getString("title", "🚨 Alerte Critique — Doula Agro");
            String body = call.getString("body", "Vérification de l'alerte sonore et vibration.");
            int delayMs = Math.max(500, call.getInt("delayMs", 5000));
            boolean playRingtone = call.getBoolean("playRingtone", true);

            long triggerAtMillis = System.currentTimeMillis() + delayMs;
            String mode = "alarm_clock";

            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Intent receiverIntent = new Intent(ctx, UrgentAlertReceiver.class);
                receiverIntent.putExtra(UrgentAlertReceiver.EXTRA_ID, id);
                receiverIntent.putExtra(UrgentAlertReceiver.EXTRA_TITLE, title);
                receiverIntent.putExtra(UrgentAlertReceiver.EXTRA_BODY, body);
                receiverIntent.putExtra(UrgentAlertReceiver.EXTRA_PLAY_RINGTONE, playRingtone);

                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pendingIntent = PendingIntent.getBroadcast(ctx, id, receiverIntent, flags);

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        Intent showIntent = new Intent(ctx, MainActivity.class);
                        PendingIntent showPi = PendingIntent.getActivity(ctx, id + 1, showIntent, flags);
                        AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPi);
                        am.setAlarmClock(info, pendingIntent);
                        mode = "alarm_clock";
                    } else {
                        am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                        mode = "exact";
                    }
                } catch (Exception se) {
                    se.printStackTrace();
                    mode = "allow_while_idle";
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                        } else {
                            am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                        }
                    } catch (Exception ignored) {
                        mode = "handler_only";
                    }
                }
            } else {
                mode = "handler_only";
            }

            // Filet de sécurité garanti pour les tests courts (<= 15 s) :
            // si AlarmManager est retardé par le constructeur, le Handler déclenche à delayMs + 400ms
            // (UrgentAlertReceiver.FIRED_IDS empêche tout double déclenchement).
            if (delayMs <= 15_000) {
                final Context appCtx = ctx.getApplicationContext();
                new Handler(Looper.getMainLooper()).postDelayed(
                    () -> UrgentAlertReceiver.fireNow(appCtx, id, title, body, playRingtone),
                    delayMs + 400L
                );
            }

            JSObject ret = new JSObject();
            ret.put("scheduled", true);
            ret.put("id", id);
            ret.put("mode", mode);
            call.resolve(ret);
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("scheduleNativeCriticalAlarm failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelNativeCriticalAlarm(PluginCall call) {
        try {
            Context ctx = getContext();
            int id = call.getInt("id", -1);
            if (id > 0) {
                AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    Intent receiverIntent = new Intent(ctx, UrgentAlertReceiver.class);
                    int flags = PendingIntent.FLAG_NO_CREATE;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent pi = PendingIntent.getBroadcast(ctx, id, receiverIntent, flags);
                    if (pi != null) {
                        am.cancel(pi);
                        pi.cancel();
                    }
                }
            }
            call.resolve();
        } catch (Exception e) {
            e.printStackTrace();
            call.resolve();
        }
    }

    @PluginMethod
    public void getPermissionsStatus(PluginCall call) {
        boolean notificationsEnabled = false;
        boolean dndPolicyGranted = false;
        boolean channelBypassDnd = false;
        boolean exactAlarmGranted = false;
        boolean batteryUnrestricted = false;

        try {
            Context ctx = getContext();
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);

            try {
                notificationsEnabled = NotificationManagerCompat.from(ctx).areNotificationsEnabled();
            } catch (Exception e) {
                e.printStackTrace();
            }

            try {
                dndPolicyGranted = true;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && nm != null) {
                    dndPolicyGranted = nm.isNotificationPolicyAccessGranted();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
                    ensureUrgentChannel(ctx);
                    NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
                    if (ch != null) {
                        channelBypassDnd = ch.canBypassDnd();
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            try {
                exactAlarmGranted = true;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && am != null) {
                    exactAlarmGranted = am.canScheduleExactAlarms();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            try {
                batteryUnrestricted = true;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
                    batteryUnrestricted = pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        } catch (Exception e) {
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
                call.resolve();
            } catch (Exception ex) {
                ex.printStackTrace();
                call.reject("Cannot open battery settings: " + ex.getMessage());
            }
        }
    }
}
