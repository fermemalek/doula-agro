import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { Reminder } from "@/lib/reminders-store";

// Nouveau canal v2 : Android ne met jamais à jour un canal déjà créé (Bypass DND + son TYPE_ALARM)
export const URGENT_CHANNEL_ID = "doula_urgent_alerts_v2";

interface UrgentAlertsNativePlugin {
  createUrgentChannel(): Promise<{ channelId: string }>;
  fireImmediateUrgentNotification(params: {
    id: number;
    title: string;
    body: string;
    playRingtone?: boolean;
  }): Promise<{ fired: boolean; id: number }>;
  scheduleNativeCriticalAlarm(params: {
    id: number;
    title: string;
    body: string;
    delayMs: number;
    playRingtone?: boolean;
  }): Promise<{ scheduled: boolean; id: number; mode: string }>;
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

export interface TestCriticalAlertResult {
  ok: boolean;
  id: number;
  pendingConfirmed: boolean;
  fallbackUsed?: boolean;
  error?: string;
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

/**
 * Génère toujours un entier 32-bit positif strict [100000..999999] compatible Java `int` Android.
 * (Ne jamais passer Date.now() qui dépasse 2^31-1 et fait échouer silencieusement Android.)
 */
export function generateSafeAndroidId(): number {
  return Math.floor(100000 + Math.random() * 899999);
}

function resolveSafeAndroidId(seed?: number | string): number {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    const n = Math.floor(Math.abs(seed));
    if (n >= 1 && n <= 2_000_000_000) return n;
    return (n % 899_999) + 100_000;
  }
  if (typeof seed === "string" && seed.length > 0) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (Math.abs(h) % 899_999) + 100_000;
  }
  return generateSafeAndroidId();
}

function playFallbackAlarmBeep(): void {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch {}
}

let initialized = false;

/**
 * Initialise le canal Android haute priorité "doula_urgent_alerts_v2" (son d'alarme + bypass DND)
 * sans jamais lancer d'erreur sur navigateur Web.
 */
export async function initUrgentNotifications(): Promise<void> {
  if (initialized || !isNativePlatform()) return;
  initialized = true;
  try {
    if (isNativeAndroid()) {
      // Crée en priorité via le plugin Java natif (setBypassDnd + USAGE_ALARM + TYPE_ALARM)
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

/**
 * Planifie une notification critique (ID 32-bit strict + allowWhileIdle: true sur doula_urgent_alerts_v2).
 */
export async function scheduleCriticalNotification(params: {
  id?: number | string;
  title: string;
  body: string;
  at?: Date;
  extra?: Record<string, unknown>;
}): Promise<boolean> {
  const numId = resolveSafeAndroidId(params.id);
  const fireAt =
    params.at && params.at.getTime() > Date.now() + 500
      ? params.at
      : new Date(Date.now() + 1500);

  if (isNativeAndroid()) {
    try {
      await initUrgentNotifications();
      const delayMs = Math.max(500, fireAt.getTime() - Date.now());
      await UrgentAlerts.scheduleNativeCriticalAlarm({
        id: numId,
        title: params.title,
        body: params.body,
        delayMs,
        playRingtone: true,
      });
      return true;
    } catch (err) {
      console.warn("[notifications-native] scheduleNativeCriticalAlarm fallback:", err);
    }
  }

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
      console.warn("[notifications-native] scheduleCriticalNotification error, trying immediate fallback:", err);
      if (isNativeAndroid()) {
        try {
          await UrgentAlerts.fireImmediateUrgentNotification({
            id: numId,
            title: params.title,
            body: params.body,
            playRingtone: false,
          });
          return true;
        } catch {}
      }
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

/**
 * Test fiable à 5 secondes :
 * 1) ID entier 32-bit strict (100000..999999)
 * 2) Schedule avec { at: +5000ms, allowWhileIdle: true } sur doula_urgent_alerts_v2
 * 3) Vérification via LocalNotifications.getPending() que l'alarme est bien en file Android
 * 4) En fallback si allowWhileIdle échoue (ex: restriction OEM), déclenche l'alerte native + son d'alarme
 */
export async function scheduleTestCriticalAlert(isAr: boolean): Promise<TestCriticalAlertResult> {
  const id = generateSafeAndroidId();
  const title = isAr
    ? "🚨 تنبيه تجريبي عاجل — مزرعة عبد المالك"
    : "🚨 Test Alerte Critique — Doula Agro";
  const body = isAr
    ? "تم التحقق: التنبيه الصوتي والاهتزاز يعملان حتى في وضع السكون."
    : "Vérification réussie : l'alerte sonore et la vibration fonctionnent même en veille / silence.";

  if (!isNativePlatform()) {
    const ok = await scheduleCriticalNotification({
      id,
      title,
      body,
      at: new Date(Date.now() + 5000),
      extra: { source: "doula_urgent_once", kind: "test_critical" },
    });
    return { ok, id, pendingConfirmed: ok };
  }

  if (isNativeAndroid()) {
    try {
      await initUrgentNotifications();
      const res = await UrgentAlerts.scheduleNativeCriticalAlarm({
        id,
        title,
        body,
        delayMs: 5000,
        playRingtone: true,
      });
      return {
        ok: Boolean(res?.scheduled),
        id,
        pendingConfirmed: Boolean(res?.scheduled),
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      try {
        playFallbackAlarmBeep();
        await UrgentAlerts.fireImmediateUrgentNotification({
          id,
          title,
          body,
          playRingtone: true,
        });
        return { ok: true, id, pendingConfirmed: false, fallbackUsed: true, error: errMsg };
      } catch (fbErr) {
        return {
          ok: false,
          id,
          pendingConfirmed: false,
          error: `${errMsg} | fallback: ${fbErr instanceof Error ? fbErr.message : String(fbErr)}`,
        };
      }
    }
  }

  try {
    await initUrgentNotifications();
    const fireAt = new Date(Date.now() + 5000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          channelId: URGENT_CHANNEL_ID,
          schedule: {
            at: fireAt,
            allowWhileIdle: true,
          },
          extra: { source: "doula_urgent_once", kind: "test_critical" },
        },
      ],
    });

    const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
    const pendingConfirmed = (pending.notifications || []).some((n) => n.id === id);

    // Si Android n'a pas conservé l'alarme en file, fallback natif direct après 5s
    if (!pendingConfirmed && isNativeAndroid()) {
      window.setTimeout(() => {
        playFallbackAlarmBeep();
        void UrgentAlerts.fireImmediateUrgentNotification({
          id,
          title,
          body,
          playRingtone: true,
        }).catch(() => {});
      }, 5000);
      return { ok: true, id, pendingConfirmed: false, fallbackUsed: true };
    }

    return { ok: true, id, pendingConfirmed };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[notifications-native] scheduleTestCriticalAlert error:", errMsg);

    // Fallback : déclenchement immédiat / 5s natif + tonalité d'alarme
    if (isNativeAndroid()) {
      try {
        playFallbackAlarmBeep();
        await UrgentAlerts.fireImmediateUrgentNotification({
          id,
          title,
          body,
          playRingtone: true,
        });
        return {
          ok: true,
          id,
          pendingConfirmed: false,
          fallbackUsed: true,
          error: errMsg,
        };
      } catch (fbErr) {
        return {
          ok: false,
          id,
          pendingConfirmed: false,
          error: `${errMsg} | fallback: ${fbErr instanceof Error ? fbErr.message : String(fbErr)}`,
        };
      }
    }

    return { ok: false, id, pendingConfirmed: false, error: errMsg };
  }
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
    id: generateSafeAndroidId(),
    title: isAr ? "🚨 توصية جديدة عاجلة من المهندس" : "🚨 Nouvelle recommandation de l'ingénieur",
    body: title,
    at: new Date(Date.now() + 1000),
    extra: { source: "doula_urgent_once", kind: "new_recommendation" },
  });
}

export async function notifyWeatherCriticalAlert(reason: string, isAr: boolean): Promise<void> {
  await scheduleCriticalNotification({
    id: generateSafeAndroidId(),
    title: isAr ? "⚠️ تنبيه طقس حرج — مزرعة عبد المالك" : "⚠️ Alerte Météo Critique — Doula Agro",
    body: reason,
    at: new Date(Date.now() + 1000),
    extra: { source: "doula_urgent_once", kind: "weather_critical" },
  });
}
