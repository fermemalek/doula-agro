import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReminders } from "@/lib/reminders-store";
import { useRole } from "@/lib/role";
import { useTranslation } from "@/lib/i18n";
import {
  initUrgentNotifications,
  isNativePlatform,
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

const WIND_ALERT_KEY = "doula-last-wind-critical-alert";

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

  // 2. Synchronisation différée des rappels programmés vers Capacitor LocalNotifications
  useEffect(() => {
    if (!session || !isNativePlatform()) return;
    const timer = window.setTimeout(() => {
      void syncScheduledRemindersToNative(reminders).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [session, reminders]);

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

  return null;
}
