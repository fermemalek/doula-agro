import Dexie, { Table } from "dexie";

export type OutboxStatus = "pending" | "processing" | "synced" | "error";

export interface OutboxEntry {
  client_id: string;
  /** Logical operation name, e.g. "execution.create", "task.update" */
  op: string;
  /** Target table for conflict detection */
  table: string;
  /** Record id when known (server uuid or client_id for inserts) */
  record_id?: string | null;
  payload: unknown;
  /** Snapshot of the server `updated_at` we read before mutating (for conflict detection). */
  base_updated_at?: string | null;
  status: OutboxStatus;
  attempts: number;
  next_retry_at: number; // epoch ms
  last_error?: string | null;
  created_at: number;
  updated_at: number;
}

export interface PhotoOutboxEntry {
  client_id: string;
  /** Local photo blob */
  blob: Blob;
  filename: string;
  content_type: string;
  /** Bucket + path target */
  bucket: string;
  path: string;
  /** Outbox entry that depends on this photo (so we can swap path -> public URL on completion) */
  linked_outbox_id?: string | null;
  /** Field in linked outbox payload to populate (e.g. "photo_urls") */
  linked_field?: string | null;
  status: OutboxStatus;
  attempts: number;
  next_retry_at: number;
  last_error?: string | null;
  created_at: number;
  uploaded_path?: string | null;
}

export interface ConflictLogEntry {
  id?: number;
  table: string;
  record_id: string;
  base_updated_at: string | null;
  server_updated_at: string | null;
  my_payload: unknown;
  server_snapshot: unknown;
  resolved_strategy: "last-write-wins";
  created_at: number;
  synced_to_server: boolean;
}

class OfflineDB extends Dexie {
  outbox!: Table<OutboxEntry, string>;
  photos_outbox!: Table<PhotoOutboxEntry, string>;
  conflict_log!: Table<ConflictLogEntry, number>;

  constructor() {
    super("ff_offline_v1");
    this.version(1).stores({
      outbox: "client_id, status, next_retry_at, table, op, created_at",
      photos_outbox: "client_id, status, next_retry_at, linked_outbox_id, created_at",
      conflict_log: "++id, table, record_id, created_at, synced_to_server",
    });
  }
}

export const offlineDB = new OfflineDB();

/** Compute next retry timestamp with exponential backoff (2s -> max 5min). */
export function nextRetryAt(attempts: number): number {
  const delays = [2_000, 5_000, 15_000, 60_000, 300_000];
  const idx = Math.min(attempts, delays.length - 1);
  return Date.now() + delays[idx];
}

/** Max age in ms before marking a pending entry as permanently errored (7 days). */
export const MAX_PENDING_AGE_MS = 7 * 24 * 60 * 60 * 1000;
