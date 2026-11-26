// Supabase Edge Function: send-push-alert
// Envoie des notifications Push critiques via FCM HTTP v1 sur le canal Android "doula_urgent_alerts"
// Secret requis dans Supabase Dashboard -> Edge Functions -> Secrets :
//   FIREBASE_SERVICE_ACCOUNT_JSON = contenu JSON complet de la clé de compte de service Firebase

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface PushRequestBody {
  title?: string;
  body?: string;
  targetRoles?: string[];
  usernames?: string[];
  data?: Record<string, string>;
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n");
  const b64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getGoogleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${claimSet}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`OAuth2 token error (${tokenRes.status}): ${errText}`);
  }
  const tokenJson = await tokenRes.json();
  return tokenJson.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const saRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!saRaw) {
      return new Response(
        JSON.stringify({
          ok: false,
          skipped: true,
          reason: "FIREBASE_SERVICE_ACCOUNT_JSON secret not configured yet",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sa = JSON.parse(saRaw) as ServiceAccount;
    const payload = (await req.json()) as PushRequestBody;
    const title = payload.title?.trim() || "🚨 Alerte Urgente — Doula Agro";
    const body = payload.body?.trim() || "Nouvelle notification critique de la ferme.";
    const targetRoles = Array.isArray(payload.targetRoles) ? payload.targetRoles : [];
    const usernames = Array.isArray(payload.usernames) ? payload.usernames : [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let query = adminClient.from("device_push_tokens").select("id, fcm_token, username, role");
    if (targetRoles.length > 0) {
      query = query.in("role", targetRoles);
    }
    if (usernames.length > 0) {
      query = query.in("username", usernames);
    }

    const { data: rows, error } = await query;
    if (error) {
      throw new Error(`DB query error: ${error.message}`);
    }

    const tokens = (rows ?? []).filter((r) => typeof r.fcm_token === "string" && r.fcm_token.length > 0);
    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, message: "No matching device tokens" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await getGoogleAccessToken(sa);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

    let sent = 0;
    const invalidTokens: string[] = [];

    for (const row of tokens) {
      const fcmRes = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: row.fcm_token,
            notification: { title, body },
            data: payload.data ?? {},
            android: {
              priority: "HIGH",
              notification: {
                channel_id: "doula_urgent_alerts",
                sound: "default",
                visibility: "PUBLIC",
                default_vibrate_timings: true,
              },
            },
          },
        }),
      });

      if (fcmRes.ok) {
        sent++;
      } else {
        const errBody = await fcmRes.text();
        if (errBody.includes("UNREGISTERED") || errBody.includes("INVALID_ARGUMENT")) {
          invalidTokens.push(row.fcm_token);
        }
      }
    }

    if (invalidTokens.length > 0) {
      await adminClient.from("device_push_tokens").delete().in("fcm_token", invalidTokens);
    }

    return new Response(
      JSON.stringify({ ok: true, sent, total: tokens.length, cleaned: invalidTokens.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
