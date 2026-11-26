// Supabase Edge Function: weather-threshold-alert
// Surveillance permanente Benhar (lat=35.286281, lon=3.103180) toutes les 30 min (cron) ou en test manuel.
// Chaque canal (FCM, E-mail Resend/SMTP, WhatsApp CallMeBot) est isolé dans son propre try/catch
// afin qu'une erreur sur un canal n'empêche jamais les autres de partir ni ne renvoie de 500 opaque.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const humStr = `${Math.round(params.humidity)}%`;
  const windVal = `${Math.round(params.windKmh)}`;
  const isAr = params.lang === "ar";
  const prefix = params.isTest ? (isAr ? "[تجربة] " : "[TEST] ") : "";
  const ltrSpan = (v: string) =>
    `<span dir="ltr" style="display:inline-block;white-space:nowrap;unicode-bidi:isolate;font-weight:700;">${v}</span>`;

  if (params.kind === "frost") {
    const title = isAr
      ? `${prefix}🥶 تنبيه صقيع بنهار : ${tStr} (≤ ${thStr})`
      : `${prefix}🥶 Alerte Gel Benhar : ${tStr} (≤ ${thStr})`;
    const body = isAr
      ? `محطة بنهار (مزرعة عبد المالك): درجة الحرارة الحالية ${tStr} (الحد الأدنى ${thStr}). الرطوبة ${humStr} · الرياح ${windVal} كم/سا.`
      : `Station Benhar (Doula Agro) : température actuelle ${tStr} (seuil gel : ${thStr}). Humidité ${humStr} · Vent ${windVal} km/h. Activez la protection antigel.`;
    const html = isAr
      ? `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#111827;text-align:right;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;">
          <h2 style="margin:0 0 10px 0;font-size:17px;color:#0369a1;">${prefix}🥶 تنبيه صقيع بنهار : ${ltrSpan(tStr)} (${ltrSpan(`≤ ${thStr}`)})</h2>
          <p style="margin:0 0 8px 0;"><strong>محطة بنهار (مزرعة عبد المالك)</strong> : درجة الحرارة الحالية ${ltrSpan(tStr)} (الحد الأدنى ${ltrSpan(thStr)}).</p>
          <p style="margin:0;color:#374151;">الرطوبة : ${ltrSpan(humStr)} &nbsp;·&nbsp; الرياح : ${ltrSpan(`${windVal} كم/سا`)}</p>
        </div>`
      : `<div dir="ltr" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;">
          <h2 style="margin:0 0 10px 0;font-size:17px;color:#0369a1;">${title}</h2>
          <p style="margin:0 0 8px 0;"><strong>Station Benhar (Doula Agro)</strong> : température actuelle ${ltrSpan(tStr)} (seuil gel : ${ltrSpan(thStr)}).</p>
          <p style="margin:0;color:#374151;">Humidité : ${ltrSpan(humStr)} &nbsp;·&nbsp; Vent : ${ltrSpan(`${windVal} km/h`)}. Activez la protection antigel.</p>
        </div>`;
    return { title, body, html };
  }

  const title = isAr
    ? `${prefix}🔥 تنبيه حرارة مرتفعة بنهار : ${tStr} (≥ ${thStr})`
    : `${prefix}🔥 Alerte Chaleur Benhar : ${tStr} (≥ ${thStr})`;
  const body = isAr
    ? `محطة بنهار (مزرعة عبد المالك): درجة الحرارة الحالية ${tStr} (الحد الأقصى ${thStr}). الرطوبة ${humStr} · الرياح ${windVal} كم/سا.`
    : `Station Benhar (Doula Agro) : température actuelle ${tStr} (seuil chaleur : ${thStr}). Humidité ${humStr} · Vent ${windVal} km/h. Évitez la pulvérisation et renforcez l'irrigation.`;
  const html = isAr
    ? `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#111827;text-align:right;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:16px;">
        <h2 style="margin:0 0 10px 0;font-size:17px;color:#be123c;">${prefix}🔥 تنبيه حرارة مرتفعة بنهار : ${ltrSpan(tStr)} (${ltrSpan(`≥ ${thStr}`)})</h2>
        <p style="margin:0 0 8px 0;"><strong>محطة بنهار (مزرعة عبد المالك)</strong> : درجة الحرارة الحالية ${ltrSpan(tStr)} (الحد الأقصى ${ltrSpan(thStr)}).</p>
        <p style="margin:0;color:#374151;">الرطوبة : ${ltrSpan(humStr)} &nbsp;·&nbsp; الرياح : ${ltrSpan(`${windVal} كم/سا`)}</p>
      </div>`
    : `<div dir="ltr" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:16px;">
        <h2 style="margin:0 0 10px 0;font-size:17px;color:#be123c;">${title}</h2>
        <p style="margin:0 0 8px 0;"><strong>Station Benhar (Doula Agro)</strong> : température actuelle ${ltrSpan(tStr)} (seuil chaleur : ${ltrSpan(thStr)}).</p>
        <p style="margin:0;color:#374151;">Humidité : ${ltrSpan(humStr)} &nbsp;·&nbsp; Vent : ${ltrSpan(`${windVal} km/h`)}. Évitez la pulvérisation et renforcez l'irrigation.</p>
      </div>`;
  return { title, body, html };
}

async function sendEmailServerSide(
  toEmails: string[],
  subject: string,
  textBody: string,
  htmlBody: string,
  errors: string[],
): Promise<{ sent: number; provider: string }> {
  const validEmails = toEmails
    .map((e) => e.trim())
    .filter((e) => e.includes("@") && !e.toLowerCase().endsWith(".local"));
  if (validEmails.length === 0) return { sent: 0, provider: "none" };

  // Option 1 : Resend API (HTTP pur — 100 % natif Deno, recommandé)
  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const fromEmail = Deno.env.get("ALERT_FROM_EMAIL")?.trim() || "Doula Agro <onboarding@resend.dev>";

  if (resendKey) {
    try {
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
          html: htmlBody,
        }),
      });
      if (res.ok) {
        return { sent: validEmails.length, provider: "resend" };
      }
      const errText = await res.text();
      errors.push(`E-mail Resend (${res.status}): ${errText.slice(0, 180)}`);
    } catch (err) {
      errors.push(`E-mail Resend: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Option 2 : SMTP direct (lazy-import nodemailer isolé dans try/catch + trim contre retours à la ligne)
  const smtpHost = Deno.env.get("SMTP_HOST")?.trim();
  const smtpUser = Deno.env.get("SMTP_USER")?.trim();
  const smtpPass = Deno.env.get("SMTP_PASS")?.trim();
  const smtpPort = Number((Deno.env.get("SMTP_PORT") || "465").trim());

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailerMod = await import("npm:nodemailer@6.9.16");
      const nodemailer = nodemailerMod.default ?? nodemailerMod;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
      await transporter.sendMail({
        from: Deno.env.get("ALERT_FROM_EMAIL")?.trim() || smtpUser,
        to: validEmails.join(", "),
        subject,
        text: textBody,
        html: htmlBody,
      });
      return { sent: validEmails.length, provider: "smtp" };
    } catch (err) {
      errors.push(`E-mail SMTP (${smtpHost}:${smtpPort}): ${err instanceof Error ? err.message : String(err)}`);
      return { sent: 0, provider: "smtp_error" };
    }
  }

  if (!resendKey) {
    errors.push("E-mail non configuré : ajoutez RESEND_API_KEY (ou SMTP_HOST/SMTP_USER/SMTP_PASS) dans les Secrets Supabase.");
  }
  return { sent: 0, provider: "unconfigured" };
}

async function sendWhatsAppCallMeBot(
  contacts: AlertContact[],
  message: string,
  errors: string[],
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
      if (res.ok) {
        sent++;
      } else {
        const txt = await res.text().catch(() => "");
        errors.push(`WhatsApp (${c.name || phone}): HTTP ${res.status} ${txt.slice(0, 80)}`);
      }
    } catch (err) {
      errors.push(`WhatsApp (${c.name || phone}): ${err instanceof Error ? err.message : String(err)}`);
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
  errors: string[],
): Promise<number> {
  if (!supabaseUrl || !serviceRoleKey) {
    errors.push("FCM: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
    return 0;
  }
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
    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {}
    if (!res.ok) {
      errors.push(`FCM (${res.status}): ${json?.error || text.slice(0, 140)}`);
      return 0;
    }
    if (json?.skipped) {
      errors.push(`FCM ignoré: ${json.reason || "FIREBASE_SERVICE_ACCOUNT_JSON absent"}`);
      return 0;
    }
    if (json?.error) {
      errors.push(`FCM: ${json.error}`);
      return 0;
    }
    return Number(json?.sent ?? 0);
  } catch (err) {
    errors.push(`FCM: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const errors: string[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient =
      supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

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

    // 1. Lire la configuration depuis Supabase avec fallback automatique vers reqBody.settings
    let dbRow: AlertSettingsRow | null = null;
    if (adminClient) {
      try {
        const { data, error } = await adminClient
          .from("weather_alert_settings")
          .select("*")
          .eq("farm_id", DEFAULT_FARM_ID)
          .maybeSingle();
        if (error) {
          errors.push(`Table weather_alert_settings: ${error.message}`);
        } else {
          dbRow = data as AlertSettingsRow | null;
        }
      } catch (err) {
        errors.push(`Lecture DB: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const bodySettings: AlertSettingsRow | null = reqBody?.settings || null;
    const dbContacts = Array.isArray(dbRow?.contacts) ? dbRow!.contacts : [];
    const bodyContacts = Array.isArray(bodySettings?.contacts) ? bodySettings!.contacts : [];

    // En test (ou si la table est vide), priorité aux contacts transmis par le client
    const contacts: AlertContact[] =
      isTest && bodyContacts.length > 0
        ? bodyContacts
        : dbContacts.length > 0
          ? dbContacts
          : bodyContacts;

    const maxThreshold = Number(
      (isTest ? bodySettings?.maxTempThreshold : undefined) ??
        dbRow?.max_temp_threshold ??
        bodySettings?.maxTempThreshold ??
        35,
    );
    const minThreshold = Number(
      (isTest ? bodySettings?.minTempThreshold : undefined) ??
        dbRow?.min_temp_threshold ??
        bodySettings?.minTempThreshold ??
        2,
    );

    // 2. Météo en direct Benhar (ou transmise en test)
    let live = {
      temp: typeof reqBody?.currentTemp === "number" ? Number(reqBody.currentTemp) : 20,
      humidity: typeof reqBody?.humidity === "number" ? Number(reqBody.humidity) : 0,
      windKmh: typeof reqBody?.windKmh === "number" ? Number(reqBody.windKmh) : 0,
    };

    if (!(isTest && typeof reqBody?.currentTemp === "number")) {
      try {
        live = await fetchBenharWeather();
      } catch (err) {
        errors.push(`Open-Meteo: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

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
          sent: { email: 0, fcm: 0, whatsapp: 0 },
          emailsSent: 0,
          pushSent: 0,
          whatsappSent: 0,
          errors,
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
        sendEmailServerSide(emailRecipients, msg.title, msg.body, msg.html, errors),
        sendWhatsAppCallMeBot(contacts, `${msg.title}\n${msg.body}`, errors),
        apkEnabled
          ? dispatchFcmPush(supabaseUrl, serviceRoleKey, msg.title, msg.body, kind, errors)
          : Promise.resolve(0),
      ]);

      emailsSent += emailRes.sent;
      emailProvider = emailRes.provider;
      whatsappSent += waCount;
      pushSent += fcmCount;

      if (!isTest && adminClient) {
        try {
          const patch =
            kind === "frost"
              ? { last_frost_alert_at: new Date().toISOString() }
              : { last_heat_alert_at: new Date().toISOString() };
          await adminClient
            .from("weather_alert_settings")
            .update(patch)
            .eq("farm_id", DEFAULT_FARM_ID);
        } catch {}
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        test: isTest,
        triggered: triggers,
        currentTemp: live.temp,
        sent: {
          email: emailsSent,
          fcm: pushSent,
          whatsapp: whatsappSent,
        },
        emailsSent,
        emailProvider,
        whatsappSent,
        pushSent,
        errors,
        message:
          errors.length > 0
            ? errors.join(" | ")
            : "Alertes traitées avec succès.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    return new Response(
      JSON.stringify({
        ok: false,
        sent: { email: 0, fcm: 0, whatsapp: 0 },
        emailsSent: 0,
        pushSent: 0,
        whatsappSent: 0,
        errors,
        message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
