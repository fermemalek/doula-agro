import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isNativePlatform,
  scheduleCriticalNotification,
} from "@/lib/notifications-native";

export const BENHAR_LAT = 35.286281;
export const BENHAR_LON = 3.103180;
export const DEFAULT_FARM_ID = "00000000-0000-0000-0000-000000000001";
export const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 heures

const SETTINGS_KEY = "doula-weather-alert-settings-v2";
const HEAT_COOLDOWN_KEY = "doula-weather-cooldown-heat";
const FROST_COOLDOWN_KEY = "doula-weather-cooldown-frost";

export interface WeatherAlertContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  callmebotKey: string;
  email: string;
  channels: {
    apk: boolean;
    whatsapp: boolean;
    email: boolean;
  };
}

export interface WeatherAlertSettings {
  maxTempThreshold: number; // Défaut 35°C
  minTempThreshold: number; // Défaut 2°C (gel Benhar)
  contacts: WeatherAlertContact[];
  updatedAt: string;
}

export function sanitizeEmail(raw: string | null | undefined): string {
  const trimmed = (raw || "").trim();
  if (!trimmed || trimmed.toLowerCase().endsWith(".local")) return "";
  return trimmed;
}

const DEFAULT_SETTINGS: WeatherAlertSettings = {
  maxTempThreshold: 35,
  minTempThreshold: 2,
  contacts: [],
  updatedAt: new Date(0).toISOString(),
};

function sanitizeContacts(list: unknown): WeatherAlertContact[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: typeof item.id === "string" && item.id ? item.id : `contact_${idx}_${Date.now()}`,
      name: typeof item.name === "string" ? item.name : "",
      role: typeof item.role === "string" ? item.role : "",
      phone: typeof item.phone === "string" ? item.phone : "",
      callmebotKey: typeof item.callmebotKey === "string" ? item.callmebotKey : "",
      email: sanitizeEmail(typeof item.email === "string" ? item.email : ""),
      channels: {
        apk: item.channels && typeof item.channels === "object" ? Boolean((item.channels as any).apk ?? true) : true,
        whatsapp: item.channels && typeof item.channels === "object" ? Boolean((item.channels as any).whatsapp ?? false) : false,
        email: item.channels && typeof item.channels === "object" ? Boolean((item.channels as any).email ?? false) : false,
      },
    }));
}

export function loadLocalWeatherAlertSettings(): WeatherAlertSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WeatherAlertSettings>;
      return {
        maxTempThreshold:
          typeof parsed.maxTempThreshold === "number" && !Number.isNaN(parsed.maxTempThreshold)
            ? parsed.maxTempThreshold
            : 35,
        minTempThreshold:
          typeof parsed.minTempThreshold === "number" && !Number.isNaN(parsed.minTempThreshold)
            ? parsed.minTempThreshold
            : 2,
        contacts: sanitizeContacts(parsed.contacts),
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      };
    }
    // Migration douce depuis l'ancienne clé seuil chaleur
    const legacyMax = parseFloat(localStorage.getItem("doula-meteo-max-temp") || "");
    return {
      ...DEFAULT_SETTINGS,
      maxTempThreshold: !Number.isNaN(legacyMax) ? legacyMax : 35,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalWeatherAlertSettings(settings: WeatherAlertSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem("doula-meteo-max-temp", String(settings.maxTempThreshold));
  } catch {}
}

const listeners = new Set<() => void>();
let cachedSettings: WeatherAlertSettings | null = null;

function notifyAll() {
  listeners.forEach((fn) => fn());
}

export function getWeatherAlertSettingsSnapshot(): WeatherAlertSettings {
  if (!cachedSettings) {
    cachedSettings = loadLocalWeatherAlertSettings();
  }
  return cachedSettings;
}

export async function persistWeatherAlertSettings(
  next: WeatherAlertSettings,
): Promise<{ syncedCloud: boolean }> {
  const sanitized: WeatherAlertSettings = {
    maxTempThreshold: Number(next.maxTempThreshold),
    minTempThreshold: Number(next.minTempThreshold),
    contacts: sanitizeContacts(next.contacts),
    updatedAt: new Date().toISOString(),
  };
  cachedSettings = sanitized;
  saveLocalWeatherAlertSettings(sanitized);
  notifyAll();

  if (import.meta.env.MODE === "test") return { syncedCloud: false };
  try {
    const { error } = await (supabase as any)
      .from("weather_alert_settings")
      .upsert(
        {
          farm_id: DEFAULT_FARM_ID,
          max_temp_threshold: sanitized.maxTempThreshold,
          min_temp_threshold: sanitized.minTempThreshold,
          contacts: sanitized.contacts,
          updated_at: sanitized.updatedAt,
        },
        { onConflict: "farm_id" },
      );
    return { syncedCloud: !error };
  } catch {
    return { syncedCloud: false };
  }
}

export function useWeatherAlertSettings() {
  const [settings, setSettings] = useState<WeatherAlertSettings>(() =>
    getWeatherAlertSettingsSnapshot(),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onUpdate = () => setSettings(getWeatherAlertSettingsSnapshot());
    listeners.add(onUpdate);
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  // Chargement initial depuis Supabase si plus récent
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    let active = true;
    (supabase as any)
      .from("weather_alert_settings")
      .select("max_temp_threshold, min_temp_threshold, contacts, updated_at")
      .eq("farm_id", DEFAULT_FARM_ID)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (!active || !data) return;
        const local = getWeatherAlertSettingsSnapshot();
        const remoteTs = data.updated_at ? Date.parse(data.updated_at) : 0;
        const localTs = local.updatedAt ? Date.parse(local.updatedAt) : 0;
        if (remoteTs >= localTs) {
          const merged: WeatherAlertSettings = {
            maxTempThreshold:
              typeof data.max_temp_threshold === "number"
                ? data.max_temp_threshold
                : Number(data.max_temp_threshold) || 35,
            minTempThreshold:
              typeof data.min_temp_threshold === "number"
                ? data.min_temp_threshold
                : Number(data.min_temp_threshold) ?? 2,
            contacts: sanitizeContacts(data.contacts),
            updatedAt: data.updated_at || new Date().toISOString(),
          };
          cachedSettings = merged;
          saveLocalWeatherAlertSettings(merged);
          notifyAll();
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const updateSettings = useCallback(async (next: WeatherAlertSettings) => {
    setSaving(true);
    try {
      return await persistWeatherAlertSettings(next);
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, updateSettings, saving };
}

export function buildWeatherAlertMessage(params: {
  kind: "heat" | "frost";
  temp: number;
  threshold: number;
  humidity?: number;
  windKmh?: number;
  isAr: boolean;
  isTest?: boolean;
}): { title: string; body: string } {
  const tStr = `${params.temp.toFixed(1)}°C`;
  const thStr = `${params.threshold}°C`;
  const prefix = params.isTest ? (params.isAr ? "[تجربة] " : "[TEST] ") : "";

  if (params.kind === "frost") {
    const title = params.isAr
      ? `${prefix}🥶 تنبيه صقيع بنهار : ${tStr} (≤ ${thStr})`
      : `${prefix}🥶 Alerte Gel Benhar : ${tStr} (≤ ${thStr})`;
    const body = params.isAr
      ? `درجة الحرارة الحالية في بنهار ${tStr} (الحد الأدنى ${thStr}). الرطوبة: ${Math.round(params.humidity ?? 0)}% · الرياح: ${Math.round(params.windKmh ?? 0)} كم/سا. يُنصح بتفعيل الحماية من الصقيع.`
      : `Température actuelle à Benhar : ${tStr} (seuil gel : ${thStr}). Humidité : ${Math.round(params.humidity ?? 0)}% · Vent : ${Math.round(params.windKmh ?? 0)} km/h. Activez la protection antigel.`;
    return { title, body };
  }

  const title = params.isAr
    ? `${prefix}🔥 تنبيه حرارة مرتفعة بنهار : ${tStr} (≥ ${thStr})`
    : `${prefix}🔥 Alerte Chaleur Benhar : ${tStr} (≥ ${thStr})`;
  const body = params.isAr
    ? `درجة الحرارة الحالية في بنهار ${tStr} (الحد الأقصى ${thStr}). الرطوبة: ${Math.round(params.humidity ?? 0)}% · الرياح: ${Math.round(params.windKmh ?? 0)} كم/سا. تجنّب الرش وكثّف الري في الساعات الباردة.`
    : `Température actuelle à Benhar : ${tStr} (seuil chaleur : ${thStr}). Humidité : ${Math.round(params.humidity ?? 0)}% · Vent : ${Math.round(params.windKmh ?? 0)} km/h. Évitez la pulvérisation et renforcez l'irrigation aux heures fraîches.`;
  return { title, body };
}

export function buildWhatsAppShareUrl(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  const encoded = encodeURIComponent(text);
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/**
 * Vérification locale toujours active à l'ouverture de l'app (cooldown 6h par type chaleur / gel).
 */
export async function checkAndTriggerLocalWeatherAlert(params: {
  currentTemp: number;
  humidity?: number;
  windKmh?: number;
  isAr: boolean;
}): Promise<void> {
  if (typeof window === "undefined") return;
  const settings = getWeatherAlertSettingsSnapshot();
  const now = Date.now();

  if (params.currentTemp >= settings.maxTempThreshold) {
    const lastHeat = Number(localStorage.getItem(HEAT_COOLDOWN_KEY) || "0");
    if (now - lastHeat >= COOLDOWN_MS) {
      const msg = buildWeatherAlertMessage({
        kind: "heat",
        temp: params.currentTemp,
        threshold: settings.maxTempThreshold,
        humidity: params.humidity,
        windKmh: params.windKmh,
        isAr: params.isAr,
      });
      if (isNativePlatform()) {
        await scheduleCriticalNotification({
          id: `weather_heat_${new Date().toISOString().slice(0, 10)}`,
          title: msg.title,
          body: msg.body,
          at: new Date(Date.now() + 1000),
          extra: { source: "doula_urgent_once", kind: "weather_heat", route: "/meteo" },
        });
      }
      try {
        localStorage.setItem(HEAT_COOLDOWN_KEY, String(now));
      } catch {}
    }
  }

  if (params.currentTemp <= settings.minTempThreshold) {
    const lastFrost = Number(localStorage.getItem(FROST_COOLDOWN_KEY) || "0");
    if (now - lastFrost >= COOLDOWN_MS) {
      const msg = buildWeatherAlertMessage({
        kind: "frost",
        temp: params.currentTemp,
        threshold: settings.minTempThreshold,
        humidity: params.humidity,
        windKmh: params.windKmh,
        isAr: params.isAr,
      });
      if (isNativePlatform()) {
        await scheduleCriticalNotification({
          id: `weather_frost_${new Date().toISOString().slice(0, 10)}`,
          title: msg.title,
          body: msg.body,
          at: new Date(Date.now() + 1000),
          extra: { source: "doula_urgent_once", kind: "weather_frost", route: "/meteo" },
        });
      }
      try {
        localStorage.setItem(FROST_COOLDOWN_KEY, String(now));
      } catch {}
    }
  }
}

export interface WeatherTestResult {
  localApkScheduled: boolean;
  serverCalled: boolean;
  emailsSent: number;
  whatsappSent: number;
  pushSent: number;
  serverMessage?: string;
}

/**
 * Teste immédiatement une alerte Chaleur ou Gel :
 * 1) Notification critique locale sur le téléphone (canal doula_urgent_alerts)
 * 2) Appel serveur Supabase `weather-threshold-alert` (E-mail Resend/SMTP + WhatsApp CallMeBot + FCM)
 */
export async function triggerWeatherThresholdTest(params: {
  kind: "heat" | "frost";
  currentTemp: number;
  humidity?: number;
  windKmh?: number;
  settings: WeatherAlertSettings;
  isAr: boolean;
}): Promise<WeatherTestResult> {
  const threshold =
    params.kind === "frost"
      ? params.settings.minTempThreshold
      : params.settings.maxTempThreshold;
  const msg = buildWeatherAlertMessage({
    kind: params.kind,
    temp: params.currentTemp,
    threshold,
    humidity: params.humidity,
    windKmh: params.windKmh,
    isAr: params.isAr,
    isTest: true,
  });

  const localApkScheduled = await scheduleCriticalNotification({
    id: params.kind === "frost" ? 999902 : 999903,
    title: msg.title,
    body: msg.body,
    at: new Date(Date.now() + 2000),
    extra: { source: "doula_urgent_once", kind: `test_${params.kind}`, route: "/meteo" },
  });

  if (import.meta.env.MODE === "test") {
    return {
      localApkScheduled,
      serverCalled: false,
      emailsSent: 0,
      whatsappSent: 0,
      pushSent: 0,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("weather-threshold-alert", {
      body: {
        test: true,
        kind: params.kind,
        currentTemp: params.currentTemp,
        humidity: params.humidity ?? 0,
        windKmh: params.windKmh ?? 0,
        lang: params.isAr ? "ar" : "fr",
        settings: params.settings,
      },
    });
    if (error) {
      return {
        localApkScheduled,
        serverCalled: false,
        emailsSent: 0,
        whatsappSent: 0,
        pushSent: 0,
        serverMessage: error.message,
      };
    }
    return {
      localApkScheduled,
      serverCalled: true,
      emailsSent: Number(data?.emailsSent ?? 0),
      whatsappSent: Number(data?.whatsappSent ?? 0),
      pushSent: Number(data?.pushSent ?? 0),
      serverMessage: typeof data?.message === "string" ? data.message : undefined,
    };
  } catch (err) {
    return {
      localApkScheduled,
      serverCalled: false,
      emailsSent: 0,
      whatsappSent: 0,
      pushSent: 0,
      serverMessage: err instanceof Error ? err.message : String(err),
    };
  }
}
