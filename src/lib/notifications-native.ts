import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { Reminder } from "@/lib/reminders-store";

export const URGENT_CHANNEL_ID = "doula_urgent_alerts";

interface UrgentAlertsNativePlugin {
  createUrgentChannel(): Promise<{ channelId: string }>;
  getPermissionsStatus(): Promise<{
    notifications: boolean;
    dndBypass: boolean;
    channelBypassDnd: boolean;
    exactAlarm: boolean;
    batteryUnrestricted: boolean;
  }>;
  openDndSettings(): Promise<void>;
  openChannelSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  openBatteryOptimizationSettings(): Promise<void>;
}

const UrgentAlerts = registerPlugin<UrgentAlertsNativePlugin>("UrgentAlerts");

export interface CriticalPermissionsStatus {
  isNative: boolean;
  notifications: boolean;
  dndBypass: boolean;
  channelBypassDnd: boolean;
  exactAlarm: boolean;
  batteryUnrestricted: boolean;
}

export function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

let initialized = false;

/**
 * Initialise le canal Android haute priorité "doula_urgent_alerts" (son d'alarme + bypass DND)
 * sans jamais lancer d'erreur sur navigateur Web.
 */
export async function initUrgentNotifications(): Promise<void> {
  if (initialized || !isNativePlatform()) return;
  initialized = true;
  try {
    if (isNativeAndroid()) {
      await UrgentAlerts.createUrgentChannel().catch(() => {});
      await LocalNotifications.createChannel({
        id: URGENT_CHANNEL_ID,
        name: "Urgence Ferme (Doula Agro)",
        description: "Alertes critiques : arrosage, traitements phyto, gel, vent fort et urgences.",
        importance: 5,
        vibration: true,
        visibility: 1,
        lights: true,
        lightColor: "#EF4444",
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[notifications-native] initUrgentNotifications:", err);
  }
}

export async function getCriticalPermissionsStatus(): Promise<CriticalPermissionsStatus> {
  if (!isNativeAndroid()) {
    const webNotif =
      typeof window !== "undefined" &&
      "Notification" in window &&
      window.Notification.permission === "granted";
    return {
      isNative: false,
      notifications: webNotif,
      dndBypass: false,
      channelBypassDnd: false,
      exactAlarm: false,
      batteryUnrestricted: false,
    };
  }

  try {
    const [nativeStatus, capPerm] = await Promise.all([
      UrgentAlerts.getPermissionsStatus(),
      LocalNotifications.checkPermissions().catch(() => ({ display: "prompt" })),
    ]);
    return {
      isNative: true,
      notifications: nativeStatus.notifications || capPerm.display === "granted",
      dndBypass: Boolean(nativeStatus.dndBypass),
      channelBypassDnd: Boolean(nativeStatus.channelBypassDnd),
      exactAlarm: Boolean(nativeStatus.exactAlarm),
      batteryUnrestricted: Boolean(nativeStatus.batteryUnrestricted),
    };
  } catch {
    return {
      isNative: true,
      notifications: false,
      dndBypass: false,
      channelBypassDnd: false,
      exactAlarm: false,
      batteryUnrestricted: false,
    };
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      await initUrgentNotifications();
      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted";
    } catch {
      return false;
    }
  }
  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      const p = await window.Notification.requestPermission();
      return p === "granted";
    } catch {
      return false;
    }
  }
  return false;
}

export async function openDndSettings(): Promise<void> {
  if (!isNativeAndroid()) return;
  await UrgentAlerts.openDndSettings().catch(() => {});
}

export async function openUrgentChannelSettings(): Promise<void> {
  if (!isNativeAndroid()) return;
  await UrgentAlerts.openChannelSettings().catch(() => {});
}

export async function openExactAlarmSettings(): Promise<void> {
  if (!isNativeAndroid()) return;
  await UrgentAlerts.openExactAlarmSettings().catch(() => {});
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (!isNativeAndroid()) return;
  await UrgentAlerts.openBatteryOptimizationSettings().catch(() => {});
}

function stableNumericId(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 900_000) + 10_000;
}

/**
 * Planifie une notification critique (résiste au mode Doze / veille via allowWhileIdle: true).
 */
export async function scheduleCriticalNotification(params: {
  id?: number | string;
  title: string;
  body: string;
  at?: Date;
  extra?: Record<string, unknown>;
}): Promise<boolean> {
  const numId =
    typeof params.id === "number"
      ? params.id
      : params.id
        ? stableNumericId(params.id)
        : Math.floor(Date.now() % 1_000_000);
  const fireAt = params.at && params.at.getTime() > Date.now() ? params.at : new Date(Date.now() + 1500);

  if (isNativePlatform()) {
    try {
      await initUrgentNotifications();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: numId,
            title: params.title,
            body: params.body,
            channelId: URGENT_CHANNEL_ID,
            schedule: {
              at: fireAt,
              allowWhileIdle: true,
            },
            extra: params.extra,
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn("[notifications-native] scheduleCriticalNotification error:", err);
      return false;
    }
  }

  // Fallback navigateur Web (si permission accordée)
  if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
    const delay = Math.max(0, fireAt.getTime() - Date.now());
    if (delay <= 60_000) {
      window.setTimeout(() => {
        try {
          new window.Notification(params.title, { body: params.body });
        } catch {}
      }, delay);
      return true;
    }
  }
  return false;
}

export async function scheduleTestCriticalAlert(isAr: boolean): Promise<boolean> {
  return scheduleCriticalNotification({
    id: 999901,
    title: isAr ? "🚨 تنبيه تجريبي عاجل — Doula Agro" : "🚨 Test Alerte Critique — Doula Agro",
    body: isAr
      ? "تم التحقق: التنبيه الصوتي والاهتزاز يعملان حتى في وضع السكون."
      : "Vérification réussie : l'alerte sonore et la vibration fonctionnent même en veille / silence.",
    at: new Date(Date.now() + 5000),
    extra: { kind: "test_critical" },
  });
}

/**
 * Synchronise les rappels quotidiens/hebdomadaires de la ferme vers des alarmes Android exactes.
 */
export async function syncScheduledRemindersToNative(reminders: Reminder[]): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await initUrgentNotifications();
    const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
    const oldReminderIds = (pending.notifications || [])
      .filter((n) => (n.extra as any)?.source === "doula_reminder")
      .map((n) => ({ id: n.id }));
    if (oldReminderIds.length > 0) {
      await LocalNotifications.cancel({ notifications: oldReminderIds }).catch(() => {});
    }

    const activeReminders = reminders.filter((r) => r.active && /^\d{2}:\d{2}$/.test(r.time));
    const now = new Date();
    for (const r of activeReminders) {
      const [hh, mm] = r.time.split(":").map(Number);
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }
      await scheduleCriticalNotification({
        id: `rem_${r.id}`,
        title: `⏰ Rappel Ferme — ${r.title}`,
        body: `Heure programmée : ${r.time}`,
        at: next,
        extra: { source: "doula_reminder", reminderId: r.id },
      });
    }
  } catch (err) {
    console.warn("[notifications-native] syncScheduledRemindersToNative:", err);
  }
}

export async function notifyUrgentRecommendation(title: string, isAr: boolean): Promise<void> {
  await scheduleCriticalNotification({
    id: `reco_${Date.now()}`,
    title: isAr ? "🚨 توصية جديدة عاجلة من المهندس" : "🚨 Nouvelle recommandation de l'ingénieur",
    body: title,
    at: new Date(Date.now() + 1000),
    extra: { kind: "new_recommendation" },
  });
}

export async function notifyWeatherCriticalAlert(reason: string, isAr: boolean): Promise<void> {
  await scheduleCriticalNotification({
    id: `weather_${new Date().toISOString().slice(0, 10)}`,
    title: isAr ? "⚠️ تنبيه طقس حرج — مزرعة عبد المالك" : "⚠️ Alerte Météo Critique — Doula Agro",
    body: reason,
    at: new Date(Date.now() + 1000),
    extra: { kind: "weather_critical" },
  });
}
