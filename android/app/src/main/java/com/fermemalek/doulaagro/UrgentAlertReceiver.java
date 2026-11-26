package com.fermemalek.doulaagro;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Récepteur natif Android déclenché par AlarmManager.setAlarmClock() :
 * réveille l'appareil (WakeLock 8 s), affiche la notification critique sur doula_urgent_alerts_v2,
 * vibre et joue le son d'alarme système (USAGE_ALARM) pendant 4 secondes même écran verrouillé.
 */
public class UrgentAlertReceiver extends BroadcastReceiver {
    public static final String EXTRA_ID = "urgent_id";
    public static final String EXTRA_TITLE = "urgent_title";
    public static final String EXTRA_BODY = "urgent_body";
    public static final String EXTRA_PLAY_RINGTONE = "urgent_play_ringtone";

    private static final Set<Integer> FIRED_IDS = Collections.synchronizedSet(new HashSet<>());

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        int id = intent.getIntExtra(EXTRA_ID, (int) (100000 + (Math.random() * 899999)));
        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        boolean playRingtone = intent.getBooleanExtra(EXTRA_PLAY_RINGTONE, true);
        fireNow(context, id, title, body, playRingtone);
    }

    public static void fireNow(Context context, int id, String title, String body, boolean playRingtone) {
        // Évite tout double déclenchement (AlarmClock + Handler de secours)
        if (!FIRED_IDS.add(id)) {
            return;
        }
        // Nettoie l'ID après 60s
        new Handler(Looper.getMainLooper()).postDelayed(() -> FIRED_IDS.remove(id), 60_000L);

        PowerManager.WakeLock wakeLock = null;
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "DoulaAgro:UrgentAlertWakeLock"
                );
                wakeLock.acquire(8_000L);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        try {
            UrgentAlertsPlugin.ensureUrgentChannel(context);

            String safeTitle = (title != null && !title.isEmpty())
                ? title
                : "🚨 Alerte Critique — Doula Agro";
            String safeBody = (body != null && !body.isEmpty())
                ? body
                : "Vérification de l'alerte sonore et vibration.";

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                piFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent contentIntent = PendingIntent.getActivity(context, id, launchIntent, piFlags);

            Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmSound == null) {
                alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(
                context,
                UrgentAlertsPlugin.CHANNEL_ID
            )
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(safeTitle)
                .setContentText(safeBody)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(safeBody))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setVibrate(new long[] { 0, 600, 250, 600, 250, 800 })
                .setSound(alarmSound)
                .setContentIntent(contentIntent)
                .setAutoCancel(true);

            NotificationManagerCompat.from(context).notify(id, builder.build());

            // Vibration directe (garantie même sur surcouches Oppo/Realme/Xiaomi)
            try {
                Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null && vibrator.hasVibrator()) {
                    long[] pattern = new long[] { 0, 500, 200, 500, 200, 700 };
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                    } else {
                        vibrator.vibrate(pattern, -1);
                    }
                }
            } catch (Exception ve) {
                ve.printStackTrace();
            }

            // Son d'alarme direct (USAGE_ALARM, contourne le volume média/sonnerie silencieux) pendant 4s
            if (playRingtone && alarmSound != null) {
                try {
                    Ringtone ringtone = RingtoneManager.getRingtone(context, alarmSound);
                    if (ringtone != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            ringtone.setAudioAttributes(
                                new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_ALARM)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                    .build()
                            );
                        }
                        ringtone.play();
                        new Handler(Looper.getMainLooper()).postDelayed(() -> {
                            try {
                                if (ringtone.isPlaying()) ringtone.stop();
                            } catch (Exception ignored) {}
                        }, 4_000L);
                    }
                } catch (Exception re) {
                    re.printStackTrace();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            try {
                if (wakeLock != null && wakeLock.isHeld()) {
                    wakeLock.release();
                }
            } catch (Exception ignored) {}
        }
    }
}
