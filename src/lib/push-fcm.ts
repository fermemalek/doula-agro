import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import {
  initUrgentNotifications,
  scheduleCriticalNotification,
} from "@/lib/notifications-native";

declare const __HAS_FIREBASE_ANDROID__: boolean | undefined;

export function isFirebaseAndroidConfigured(): boolean {
  return typeof __HAS_FIREBASE_ANDROID__ !== "undefined" && Boolean(__HAS_FIREBASE_ANDROID__);
}

export interface RegisterFcmParams {
  username: string;
  role: string;
}

export interface RemotePushPayload {
  title: string;
  body: string;
  targetRoles: Array<"admin" | "executant" | "ingenieur">;
  data?: Record<string, string>;
}

let listenersAttached = false;
let lastRegisteredKey = "";

async function saveFcmTokenToSupabase(token: string, params: RegisterFcmParams): Promise<void> {
  if (!token) return;
  try {
    const platform = Capacitor.getPlatform() || "android";
    await (supabase as any)
      .from("device_push_tokens")
      .upsert(
        {
          username: params.username,
          role: params.role,
          fcm_token: token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "fcm_token" },
      );
  } catch (err) {
    console.warn("[push-fcm] saveFcmTokenToSupabase:", err);
  }
}

/**
 * Enregistre l'appareil Android/iOS auprès de FCM (Firebase Cloud Messaging)
 * et sauvegarde le token dans Supabase (`device_push_tokens`).
 * 100 % sans effet et sans erreur sur navigateur Web.
 */
export async function registerFcmPush(params: RegisterFcmParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  // Sécurité critique : ne jamais appeler PushNotifications tant que android/app/google-services.json est absent
  // (évite le crash Java natif IllegalStateException: Default FirebaseApp is not initialized)
  if (!isFirebaseAndroidConfigured()) return;
  const regKey = `${params.username}:${params.role}`;
  if (lastRegisteredKey === regKey) return;

  try {
    await initUrgentNotifications();

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      return;
    }

    if (!listenersAttached) {
      listenersAttached = true;

      await PushNotifications.addListener("registration", (token) => {
        void saveFcmTokenToSupabase(token.value, params);
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.warn("[push-fcm] registrationError:", err);
      });

      // À la réception en premier plan / actif, déclenche une alerte locale sur le canal haute priorité
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        const title = notification.title || "🚨 Alerte Urgente — Doula Agro";
        const body = notification.body || "Nouvelle notification critique de la ferme.";
        void scheduleCriticalNotification({
          id: `fcm_${Date.now()}`,
          title,
          body,
          at: new Date(Date.now() + 500),
          extra: {
            source: "doula_urgent_once",
            ...(notification.data || {}),
          },
        });
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const route = action.notification?.data?.route;
        if (typeof route === "string" && route.startsWith("/") && typeof window !== "undefined") {
          window.location.hash = `#${route}`;
        }
      });
    }

    lastRegisteredKey = regKey;
    await PushNotifications.register();
  } catch (err) {
    console.warn("[push-fcm] registerFcmPush:", err);
  }
}

/**
 * Déclenche l'envoi d'une notification Push FCM via l'Edge Function Supabase `send-push-alert`.
 * Totalement non-bloquant : n'échoue jamais en mode hors-ligne ou en environnement de test.
 */
export function sendRemotePushAlert(payload: RemotePushPayload): void {
  if (import.meta.env.MODE === "test") return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  void supabase.functions
    .invoke("send-push-alert", {
      body: {
        title: payload.title,
        body: payload.body,
        targetRoles: payload.targetRoles,
        data: payload.data ?? {},
      },
    })
    .catch((err) => {
      console.warn("[push-fcm] sendRemotePushAlert (non-blocking):", err);
    });
}
