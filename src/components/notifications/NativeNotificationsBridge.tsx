import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useReminders,
  isDueToday,
  todayKey,
  syncRemindersFromCloud,
} from "@/lib/reminders-store";
import { useRole } from "@/lib/role";
import { useTranslation } from "@/lib/i18n";
import {
  getCriticalPermissionsStatus,
  initUrgentNotifications,
  isNativeAndroid,
  isNativePlatform,
  playAlarmChime,
  scheduleCriticalNotification,
  syncScheduledRemindersToNative,
  notifyUrgentRecommendation,
  notifyWeatherCriticalAlert,
} from "@/lib/notifications-native";
import { registerFcmPush } from "@/lib/push-fcm";
import {
  BENHAR_LAT,
  BENHAR_LON,
  COOLDOWN_MS,
  checkAndTriggerLocalWeatherAlert,
} from "@/lib/weather-alerts-store";
import { CriticalNotificationsCard } from "@/components/notifications/CriticalNotificationsCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const WIND_ALERT_KEY = "doula-last-wind-critical-alert";
const PROMPT_DISMISSED_KEY = "doula-notif-prompt-dismissed";

/**
 * Pont global invisible qui :
 * 1. Initialise le canal Android haute priorité "doula_urgent_alerts" au démarrage.
 * 2. Synchronise les rappels de la ferme vers des alarmes Android exactes.
 * 3. Déclenche une notification critique lors d'une nouvelle recommandation de l'ingénieur.
 * 4. Vérifie les alertes météo critiques (gel <= 1°C ou vent fort > 15 km/h).
 */
export function NativeNotificationsBridge() {
  const reminders = useReminders();
  const { session, role } = useRole();
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const weatherCheckedRef = useRef(false);
  const [permModalOpen, setPermModalOpen] = useState(false);

  // 0. À la connexion sur APK Android : propose d'activer les autorisations critiques si certaines manquent
  useEffect(() => {
    if (!session || !isNativeAndroid()) return;
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(PROMPT_DISMISSED_KEY) === "1") return;
    } catch {}

    const timer = window.setTimeout(async () => {
      try {
        const st = await getCriticalPermissionsStatus();
        const allReady =
          st.notifications &&
          st.dndBypass &&
          st.channelBypassDnd &&
          st.exactAlarm &&
          st.batteryUnrestricted;
        if (!allReady) {
          setPermModalOpen(true);
        }
      } catch {}
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [session]);

  const dismissPermModal = () => {
    setPermModalOpen(false);
    try {
      sessionStorage.setItem(PROMPT_DISMISSED_KEY, "1");
    } catch {}
  };

  // 1. Initialisation différée du canal haute priorité (après rendu initial / redirection login)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void initUrgentNotifications().catch(() => {});
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  // 1b. Enregistrement FCM distant différé (uniquement si google-services.json est présent au build)
  useEffect(() => {
    if (!session || !role || !isNativePlatform()) return;
    const username =
      (session.user?.user_metadata?.username as string | undefined) ||
      session.user?.email ||
      session.user?.id ||
      "unknown";
    const timer = window.setTimeout(() => {
      void registerFcmPush({ username, role }).catch(() => {});
    }, 800);
    return () => window.clearTimeout(timer);
  }, [session, role]);

  // 2. Synchronisation cloud + alarmes natives des rappels programmés
  useEffect(() => {
    if (!session) return;
    void syncRemindersFromCloud();
  }, [session]);

  useEffect(() => {
    if (!session || !isNativePlatform()) return;
    const timer = window.setTimeout(() => {
      void syncScheduledRemindersToNative(reminders).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [session, reminders]);

  // 2b. Veilleur en direct PC & Mobile (vérifie toutes les 10 s l'heure exacte HH:mm des rappels)
  useEffect(() => {
    if (!session || import.meta.env.MODE === "test") return;
    const checkDueReminders = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const currentHHMM = `${hh}:${mm}`;
      const today = todayKey();

      for (const r of reminders) {
        if (!isDueToday(r) || r.time !== currentHHMM) continue;
        const firedKey = `doula-rem-fired:${r.id}:${today}:${currentHHMM}`;
        try {
          if (localStorage.getItem(firedKey) === "1") continue;
          localStorage.setItem(firedKey, "1");
        } catch {}

        const title = isAr ? `⏰ تذكير المزرعة — ${r.title}` : `⏰ Rappel Ferme — ${r.title}`;
        const body = isAr
          ? `الساعة المبرمجة : ${r.time}`
          : `Heure programmée : ${r.time}`;

        playAlarmChime();
        toast.warning(`${title} (${r.time})`, { duration: 15000 });

        if (!isNativePlatform() && typeof window !== "undefined" && "Notification" in window) {
          if (window.Notification.permission === "granted") {
            try {
              new window.Notification(title, { body });
            } catch {}
          }
        } else if (isNativePlatform()) {
          void scheduleCriticalNotification({
            id: `rem_live_${r.id}`,
            title,
            body,
            at: new Date(Date.now() + 500),
            extra: { source: "doula_urgent_once", kind: "reminder_due", reminderId: r.id },
          });
        }
      }
    };

    checkDueReminders();
    const interval = window.setInterval(checkDueReminders, 10_000);
    return () => window.clearInterval(interval);
  }, [session, reminders, isAr]);

  // 3. Écoute Supabase Realtime : nouvelle recommandation de l'ingénieur → alerte Exécutant / Admin
  useEffect(() => {
    if (!session || role === "ingenieur") return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("doula-urgent-recommendations")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "recommendations" },
          (payload) => {
            const row = payload.new as { title?: string; prescription_type?: string } | undefined;
            const title =
              row?.title ||
              (isAr ? "توصية زراعية جديدة بانتظار التنفيذ" : "Nouvelle recommandation agricole à exécuter");
            void notifyUrgentRecommendation(title, isAr);
          },
        )
        .subscribe();
    } catch {
      // Ignore en environnement hors-ligne / test
    }
    return () => {
      if (channel) {
        try {
          void supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [session, role, isAr]);

  // 4. Vérification météo permanente Benhar (Chaleur >= max, Gel <= min, Vent > 15 km/h) — cooldown 6h par type
  useEffect(() => {
    if (!session || weatherCheckedRef.current) return;
    if (typeof window === "undefined" || typeof fetch !== "function") return;
    // Ne pas déclencher d'appel réseau en mode test (Vitest / jsdom)
    if (import.meta.env.MODE === "test") return;
    weatherCheckedRef.current = true;

    const controller = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${BENHAR_LAT}&longitude=${BENHAR_LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const temp = data?.current?.temperature_2m;
        const humidity = data?.current?.relative_humidity_2m;
        const wind = data?.current?.wind_speed_10m;
        const windKmh = typeof wind === "number" ? wind * 3.6 : 0;

        if (typeof temp === "number") {
          void checkAndTriggerLocalWeatherAlert({
            currentTemp: temp,
            humidity: typeof humidity === "number" ? humidity : 0,
            windKmh,
            isAr,
          });
        }

        if (windKmh > 15 && isNativePlatform()) {
          const lastWind = Number(localStorage.getItem(WIND_ALERT_KEY) || "0");
          if (Date.now() - lastWind >= COOLDOWN_MS) {
            try {
              localStorage.setItem(WIND_ALERT_KEY, String(Date.now()));
            } catch {}
            void notifyWeatherCriticalAlert(
              isAr
                ? `رياح قوية (${Math.round(windKmh)} كم/سا) في بنهار — يُنصح بتأجيل الرش`
                : `Vent fort (${Math.round(windKmh)} km/h) à Benhar — pulvérisation déconseillée`,
              isAr,
            );
          }
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [session, isAr]);

  return (
    <Dialog open={permModalOpen} onOpenChange={(open) => !open && dismissPermModal()}>
      <DialogContent
        dir={isAr ? "rtl" : "ltr"}
        className="max-w-lg max-h-[88vh] overflow-y-auto p-4 sm:p-5"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {isAr ? "تفعيل تنبيهات المزرعة العاجلة" : "Activer les alertes critiques"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isAr
              ? "فعّل هذه الصلاحيات مرة واحدة لتصلك تنبيهات الطوارئ والطقس حتى مع قفل الشاشة. ستجدها دائماً في صفحة «الملف الشخصي»."
              : "Activez ces autorisations une seule fois pour recevoir les alertes même écran verrouillé. Vous pourrez toujours les retrouver dans votre Profil."}
          </DialogDescription>
        </DialogHeader>
        <CriticalNotificationsCard />
        <div className="flex justify-end pt-1">
          <Button type="button" variant="outline" size="sm" onClick={dismissPermModal}>
            {isAr ? "لاحقاً (متاح في الملف الشخصي)" : "Plus tard (accessible dans Profil)"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
