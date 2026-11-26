// Supabase Edge Function: weather-threshold-alert
// Surveillance permanente Benhar (lat=35.286281, lon=3.103180) toutes les 30 min (cron) ou en test manuel.
// Déclenche dès que temp >= max_temp_threshold (Chaleur) OU temp <= min_temp_threshold (Gel) avec cooldown 6h :
//   1. Notification critique APK via FCM (Edge Function `send-push-alert`, canal `doula_urgent_alerts`)
//   2. E-mail automatique côté serveur via Resend (`RESEND_API_KEY`) OU SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)
//   3. WhatsApp automatique côté serveur via CallMeBot API

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const BENHAR_LAT = 35.286281;
const BENHAR_LON = 3.103180;
const DEFAULT_FARM_ID = "00000000-0000-0000-0000-000000000001";
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 heures

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface AlertContact {
  id?: string;
  name?: string;
  role?: string;
  phone?: string;
  callmebotKey?: string;
  email?: string;
  channels?: {
    apk?: boolean;
    whatsapp?: boolean;
    email?: boolean;
  };
}

interface AlertSettingsRow {
  farm_id?: string;
  max_temp_threshold?: number;
  min_temp_threshold?: number;
  maxTempThreshold?: number;
  minTempThreshold?: number;
  contacts?: AlertContact[];
  last_heat_alert_at?: string | null;
  last_frost_alert_at?: string | null;
}

async function fetchBenharWeather(): Promise<{ temp: number; humidity: number; windKmh: number }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${BENHAR_LAT}&longitude=${BENHAR_LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();
  return {
    temp: Number(data?.current?.temperature_2m ?? 0),
    humidity: Number(data?.current?.relative_humidity_2m ?? 0),
    windKmh: Number(data?.current?.wind_speed_10m ?? 0),
  };
}

function formatMessage(params: {
  kind: "heat" | "frost";
  temp: number;
  threshold: number;
  humidity: number;
  windKmh: number;
  isTest: boolean;
  lang: string;
}) {
  const tStr = `${params.temp.toFixed(1)}°C`;
  const thStr = `${params.threshold}°C`;
  const prefix = params.isTest ? (params.lang === "ar" ? "[تجربة] " : "[TEST] ") : "";

  if (params.kind === "frost") {
    return {
      title:
        params.lang === "ar"
          ? `${prefix}🥶 تنبيه صقيع بنهار : ${tStr} (≤ ${thStr})`
          : `${prefix}🥶 Alerte Gel Benhar : ${tStr} (≤ ${thStr})`,
      body:
        params.lang === "ar"
          ? `محطة بنهار (مزرعة الدولة): درجة الحرارة الحالية ${tStr} (الحد الأدنى ${thStr}). الرطوبة ${Math.round(params.humidity)}% · الرياح ${Math.round(params.windKmh)} كم/سا.`
          : `Station Benhar (Doula Agro) : température actuelle ${tStr} (seuil gel : ${thStr}). Humidité ${Math.round(params.humidity)}% · Vent ${Math.round(params.windKmh)} km/h. Activez la protection antigel.`,
    };
  }

  return {
    title:
      params.lang === "ar"
        ? `${prefix}🔥 تنبيه حرارة مرتفعة بنهار : ${tStr} (≥ ${thStr})`
        : `${prefix}🔥 Alerte Chaleur Benhar : ${tStr} (≥ ${thStr})`,
    body:
      params.lang === "ar"
        ? `محطة بنهار (مزرعة الدولة): درجة الحرارة الحالية ${tStr} (الحد الأقصى ${thStr}). الرطوبة ${Math.round(params.humidity)}% · الرياح ${Math.round(params.windKmh)} كم/سا.`
        : `Station Benhar (Doula Agro) : température actuelle ${tStr} (seuil chaleur : ${thStr}). Humidité ${Math.round(params.humidity)}% · Vent ${Math.round(params.windKmh)} km/h. Évitez la pulvérisation et renforcez l'irrigation.`,
  };
}

async function sendEmailServerSide(
  toEmails: string[],
  subject: string,
  textBody: string,
): Promise<{ sent: number; provider: string }> {
  const validEmails = toEmails
    .map((e) => e.trim())
    .filter((e) => e.includes("@") && !e.toLowerCase().endsWith(".local"));
  if (validEmails.length === 0) return { sent: 0, provider: "none" };

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("ALERT_FROM_EMAIL") || "Doula Agro <onboarding@resend.dev>";

  // Option 1 : Resend API (recommandé — 1 seul secret RESEND_API_KEY)
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: validEmails,
        subject,
        text: textBody,
      }),
    });
    if (res.ok) {
      return { sent: validEmails.length, provider: "resend" };
    }
    const errText = await res.text();
    console.warn("[weather-threshold-alert] Resend error:", errText);
  }

  // Option 2 : SMTP direct (ex: Gmail App Password)
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpPort = Number(Deno.env.get("SMTP_PORT") || "587");

  if (smtpHost && smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: Deno.env.get("ALERT_FROM_EMAIL") || smtpUser,
      to: validEmails.join(", "),
      subject,
      text: textBody,
    });
    return { sent: validEmails.length, provider: "smtp" };
  }

  return { sent: 0, provider: "unconfigured" };
}

async function sendWhatsAppCallMeBot(
  contacts: AlertContact[],
  message: string,
): Promise<number> {
  let sent = 0;
  for (const c of contacts) {
    if (!c.channels?.whatsapp || !c.phone || !c.callmebotKey) continue;
    const phone = c.phone.replace(/[^\d+]/g, "");
    const apikey = c.callmebotKey.trim();
    if (!phone || !apikey) continue;
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;
      const res = await fetch(url);
      if (res.ok) sent++;
    } catch (err) {
      console.warn("[weather-threshold-alert] CallMeBot error:", err);
    }
  }
  return sent;
}

async function dispatchFcmPush(
  supabaseUrl: string,
  serviceRoleKey: string,
  title: string,
  body: string,
  kind: "heat" | "frost",
): Promise<number> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push-alert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        targetRoles: ["admin", "executant", "ingenieur"],
        data: { kind: `weather_${kind}`, route: "/meteo" },
      }),
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return Number(json?.sent ?? 0);
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let reqBody: any = {};
    if (req.method === "POST") {
      try {
        reqBody = await req.json();
      } catch {
        reqBody = {};
      }
    }

    const isTest = Boolean(reqBody?.test);
    const lang = reqBody?.lang === "ar" ? "ar" : "fr";

    // 1. Lire la configuration depuis Supabase (ou le payload de test)
    const { data: dbRow } = await adminClient
      .from("weather_alert_settings")
      .select("*")
      .eq("farm_id", DEFAULT_FARM_ID)
      .maybeSingle();

    const cfg: AlertSettingsRow = reqBody?.settings || dbRow || {};
    const maxThreshold = Number(cfg.maxTempThreshold ?? cfg.max_temp_threshold ?? 35);
    const minThreshold = Number(cfg.minTempThreshold ?? cfg.min_temp_threshold ?? 2);
    const contacts: AlertContact[] = Array.isArray(cfg.contacts) ? cfg.contacts : [];

    // 2. Météo en direct Benhar (ou transmise en test)
    const live =
      isTest && typeof reqBody?.currentTemp === "number"
        ? {
            temp: Number(reqBody.currentTemp),
            humidity: Number(reqBody.humidity ?? 0),
            windKmh: Number(reqBody.windKmh ?? 0),
          }
        : await fetchBenharWeather();

    const triggers: Array<"heat" | "frost"> = [];
    const now = Date.now();

    if (isTest) {
      triggers.push(reqBody?.kind === "frost" ? "frost" : "heat");
    } else {
      const lastHeat = dbRow?.last_heat_alert_at ? Date.parse(dbRow.last_heat_alert_at) : 0;
      const lastFrost = dbRow?.last_frost_alert_at ? Date.parse(dbRow.last_frost_alert_at) : 0;

      if (live.temp >= maxThreshold && now - lastHeat >= COOLDOWN_MS) {
        triggers.push("heat");
      }
      if (live.temp <= minThreshold && now - lastFrost >= COOLDOWN_MS) {
        triggers.push("frost");
      }
    }

    if (triggers.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          triggered: [],
          currentTemp: live.temp,
          maxThreshold,
          minThreshold,
          message: "Température dans la plage normale (ou cooldown 6h actif).",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let emailsSent = 0;
    let whatsappSent = 0;
    let pushSent = 0;
    let emailProvider = "none";

    const emailRecipients = contacts
      .filter((c) => c.channels?.email && c.email)
      .map((c) => c.email as string);

    const apkEnabled = contacts.length === 0 || contacts.some((c) => c.channels?.apk !== false);

    for (const kind of triggers) {
      const threshold = kind === "frost" ? minThreshold : maxThreshold;
      const msg = formatMessage({
        kind,
        temp: live.temp,
        threshold,
        humidity: live.humidity,
        windKmh: live.windKmh,
        isTest,
        lang,
      });

      const [emailRes, waCount, fcmCount] = await Promise.all([
        sendEmailServerSide(emailRecipients, msg.title, msg.body),
        sendWhatsAppCallMeBot(contacts, `${msg.title}\n${msg.body}`),
        apkEnabled ? dispatchFcmPush(supabaseUrl, serviceRoleKey, msg.title, msg.body, kind) : Promise.resolve(0),
      ]);

      emailsSent += emailRes.sent;
      emailProvider = emailRes.provider;
      whatsappSent += waCount;
      pushSent += fcmCount;

      if (!isTest) {
        const patch =
          kind === "frost"
            ? { last_frost_alert_at: new Date().toISOString() }
            : { last_heat_alert_at: new Date().toISOString() };
        await adminClient
          .from("weather_alert_settings")
          .update(patch)
          .eq("farm_id", DEFAULT_FARM_ID);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        test: isTest,
        triggered: triggers,
        currentTemp: live.temp,
        emailsSent,
        emailProvider,
        whatsappSent,
        pushSent,
        message:
          emailProvider === "unconfigured" && emailRecipients.length > 0
            ? "Secret RESEND_API_KEY ou SMTP non configuré dans Supabase."
            : "Alertes traitées avec succès.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
