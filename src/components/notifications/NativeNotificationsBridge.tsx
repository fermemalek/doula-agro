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

const WEATHER_ALERT_KEY = "doula-last-weather-critical-alert";
const WEATHER_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 heures
const AIN_OUSSERA_LAT = 35.4514;
const AIN_OUSSERA_LON = 2.9044;

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

  // 1. Initialisation du canal haute priorité au montage
  useEffect(() => {
    void initUrgentNotifications();
  }, []);

  // 2. Synchronisation des rappels programmés vers Capacitor LocalNotifications
  useEffect(() => {
    if (!isNativePlatform()) return;
    void syncScheduledRemindersToNative(reminders);
  }, [reminders]);

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

  // 4. Vérification météo critique (gel <= 1°C ou vent > 15 km/h) — max 1 fois toutes les 6h
  useEffect(() => {
    if (!session || weatherCheckedRef.current) return;
    if (typeof window === "undefined" || typeof fetch !== "function") return;
    // Ne pas déclencher d'appel réseau en mode test (Vitest / jsdom)
    if (import.meta.env.MODE === "test") return;
    weatherCheckedRef.current = true;

    try {
      const lastTs = Number(localStorage.getItem(WEATHER_ALERT_KEY) || "0");
      if (Date.now() - lastTs < WEATHER_THROTTLE_MS) return;
    } catch {}

    const controller = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${AIN_OUSSERA_LAT}&longitude=${AIN_OUSSERA_LON}&current=temperature_2m,wind_speed_10m&timezone=auto`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const temp = data?.current?.temperature_2m;
        const wind = data?.current?.wind_speed_10m;
        const reasons: string[] = [];
        if (typeof temp === "number" && temp <= 1) {
          reasons.push(
            isAr
              ? `خطر الصقيع (${Math.round(temp)}°C) في عين وسارة`
              : `Risque de gel (${Math.round(temp)}°C) à Ain Oussera`,
          );
        }
        if (typeof wind === "number" && wind > 15) {
          reasons.push(
            isAr
              ? `رياح قوية (${Math.round(wind)} كم/سا) — يُنصح بتأجيل الرش`
              : `Vent fort (${Math.round(wind)} km/h) — pulvérisation déconseillée`,
          );
        }
        if (reasons.length > 0 && isNativePlatform()) {
          try {
            localStorage.setItem(WEATHER_ALERT_KEY, String(Date.now()));
          } catch {}
          void notifyWeatherCriticalAlert(reasons.join(" · "), isAr);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [session, isAr]);

  return null;
}
