import { supabase } from "@/integrations/supabase/client";
import {
  offlineDB,
  nextRetryAt,
  MAX_PENDING_AGE_MS,
  type OutboxEntry,
  type PhotoOutboxEntry,
} from "./db";
import { getNetworkStatus, subscribeNetwork } from "./network";

type Handler = (entry: OutboxEntry) => Promise<void>;

const handlers = new Map<string, Handler>();

/** Register a handler for a given op name. Called from cloud/*.ts. */
export function registerOp(op: string, handler: Handler): void {
  handlers.set(op, handler);
}

let runningPromise: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<() => void>();

export interface OutboxStats {
  pending: number;
  processing: number;
  error: number;
  photos_pending: number;
  failed_retrying: number;
}

export async function getStats(): Promise<OutboxStats> {
  const [pendingEntries, processing, error, photos_pending] = await Promise.all([
    offlineDB.outbox.where("status").equals("pending").toArray(),
    offlineDB.outbox.where("status").equals("processing").count(),
    offlineDB.outbox.where("status").equals("error").count(),
    offlineDB.photos_outbox.where("status").anyOf(["pending", "processing"]).count(),
  ]);

  const pending = pendingEntries.length;
  const failed_retrying = pendingEntries.filter((e) => e.attempts > 0).length;

  return { pending, processing, error, photos_pending, failed_retrying };
}

export function subscribeStats(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function notify() {
  subscribers.forEach((cb) => cb());
}

/** Enqueue a mutation. */
export async function enqueueOp(params: {
  client_id?: string;
  op: string;
  table: string;
  record_id?: string | null;
  payload: unknown;
  base_updated_at?: string | null;
}): Promise<string> {
  const client_id = params.client_id ?? crypto.randomUUID();
  const now = Date.now();
  const entry: OutboxEntry = {
    client_id,
    op: params.op,
    table: params.table,
    record_id: params.record_id ?? null,
    payload: params.payload,
    base_updated_at: params.base_updated_at ?? null,
    status: "pending",
    attempts: 0,
    next_retry_at: now,
    created_at: now,
    updated_at: now,
  };
  await offlineDB.outbox.put(entry);
  notify();
  scheduleSync(50);
  return client_id;
}

/** Enqueue a photo for upload. */
export async function enqueuePhoto(params: {
  blob: Blob;
  filename: string;
  content_type: string;
  bucket: string;
  path: string;
  linked_outbox_id?: string | null;
  linked_field?: string | null;
}): Promise<string> {
  const client_id = crypto.randomUUID();
  await offlineDB.photos_outbox.put({
    client_id,
    blob: params.blob,
    filename: params.filename,
    content_type: params.content_type,
    bucket: params.bucket,
    path: params.path,
    linked_outbox_id: params.linked_outbox_id ?? null,
    linked_field: params.linked_field ?? null,
    status: "pending",
    attempts: 0,
    next_retry_at: Date.now(),
    created_at: Date.now(),
  });
  notify();
  scheduleSync(50);
  return client_id;
}

async function processPhoto(p: PhotoOutboxEntry): Promise<void> {
  const file = new File([p.blob], p.filename, { type: p.content_type });
  const { error } = await supabase.storage
    .from(p.bucket)
    .upload(p.path, file, { upsert: false, contentType: p.content_type });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;

  // If linked to an outbox entry, append the path to its payload field.
  if (p.linked_outbox_id && p.linked_field) {
    const linked = await offlineDB.outbox.get(p.linked_outbox_id);
    if (linked) {
      const payload = (linked.payload ?? {}) as Record<string, unknown>;
      const arr = Array.isArray(payload[p.linked_field])
        ? [...(payload[p.linked_field] as string[])]
        : [];
      if (!arr.includes(p.path)) arr.push(p.path);
      payload[p.linked_field] = arr;
      await offlineDB.outbox.update(p.linked_outbox_id, {
        payload,
        updated_at: Date.now(),
      });
    }
  }

  // Cleanup: delete blob from local storage immediately after successful upload.
  await offlineDB.photos_outbox.delete(p.client_id);
}

async function processEntry(e: OutboxEntry): Promise<void> {
  const handler = handlers.get(e.op);
  if (!handler) throw new Error(`Aucun handler pour op="${e.op}"`);
  await handler(e);
  await offlineDB.outbox.delete(e.client_id);
}

function serializeError(err: any): string {
  if (!err) return "Unknown error";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const parts: string[] = [];
    if (err.message) parts.push(err.message);
    if (err.details) parts.push(`Details: ${err.details}`);
    if (err.hint) parts.push(`Hint: ${err.hint}`);
    if (err.code) parts.push(`Code: ${err.code}`);
    if (parts.length > 0) return parts.join(" | ");
    try {
      return JSON.stringify(err);
    } catch {
      // ignore
    }
  }
  return String(err);
}

async function runOnce(): Promise<void> {
  if (getNetworkStatus() === "offline") return;
  const now = Date.now();

  // 1) Photos d'abord (pour pouvoir injecter leur path dans les payloads liés)
  const photos = await offlineDB.photos_outbox
    .where("status")
    .anyOf(["pending", "error"])
    .filter((p) => p.next_retry_at <= now)
    .toArray();

  for (const p of photos) {
    await offlineDB.photos_outbox.update(p.client_id, { status: "processing" });
    try {
      await processPhoto(p);
    } catch (err) {
      const attempts = p.attempts + 1;
      const tooOld = now - p.created_at > MAX_PENDING_AGE_MS;
      await offlineDB.photos_outbox.update(p.client_id, {
        status: tooOld ? "error" : "pending",
        attempts,
        next_retry_at: nextRetryAt(attempts),
        last_error: serializeError(err),
      });
    }
  }

  // 2) Outbox entries — only those without pending photos linked
  const entries = await offlineDB.outbox
    .where("status")
    .anyOf(["pending", "error"])
    .filter((e) => e.next_retry_at <= now)
    .sortBy("created_at");

  for (const e of entries) {
    // Skip if any linked photo still pending
    const linked = await offlineDB.photos_outbox
      .where("linked_outbox_id")
      .equals(e.client_id)
      .count();
    if (linked > 0) continue;

    await offlineDB.outbox.update(e.client_id, { status: "processing" });
    try {
      await processEntry(e);
    } catch (err) {
      const attempts = e.attempts + 1;
      const tooOld = now - e.created_at > MAX_PENDING_AGE_MS;
      await offlineDB.outbox.update(e.client_id, {
        status: tooOld ? "error" : "pending",
        attempts,
        next_retry_at: nextRetryAt(attempts),
        last_error: serializeError(err),
        updated_at: Date.now(),
      });
    }
  }

  notify();
}

/** Trigger sync soon. Coalesces multiple rapid calls. */
export function scheduleSync(delay = 0): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void runSync();
  }, delay);
}

export async function runSync(): Promise<void> {
  if (runningPromise) return runningPromise;
  runningPromise = (async () => {
    try {
      await runOnce();
    } finally {
      runningPromise = null;
    }
  })();
  return runningPromise;
}

let started = false;
/** Boot sync: run on network up + periodic check + on app start. */
export function startSyncEngine(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  subscribeNetwork((s) => {
    if (s === "online") scheduleSync(500);
  });

  // Periodic check (covers retries while still online)
  setInterval(() => {
    if (getNetworkStatus() === "online") void runSync();
  }, 30_000);

  // Try once on boot
  scheduleSync(2000);

  // Try when tab becomes visible
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleSync(200);
  });

  // Register service worker for Background Sync (web/PWA)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        try {
          // Periodic Background Sync (Chrome only)
          // @ts-expect-error: experimental API
          if (reg.periodicSync) {
            // @ts-expect-error: experimental API
            await reg.periodicSync.register("ff-offline-sync", {
              minInterval: 15 * 60 * 1000,
            });
          }
        } catch {
          // Non-supporté: silencieux
        }
      })
      .catch(() => {
        // SW non supporté: silencieux
      });
  }
}
