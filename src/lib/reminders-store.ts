import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncScheduledRemindersToNative } from "@/lib/notifications-native";

const KEY = "doula-reminders";
const CLOUD_ROW_ID = "__SYSTEM_FARM_REMINDERS__";
const FARM_ID = "00000000-0000-0000-0000-000000000001";

export type ReminderFrequency = "daily" | "weekdays" | "weekly";

export interface Reminder {
  id: string;
  title: string;
  time: string; // "HH:mm"
  frequency: ReminderFrequency;
  parcelId?: string;
  active: boolean;
  lastCheckedAt?: string; // Local date "YYYY-MM-DD"
  createdAt: number;
}

let data: Reminder[] = [];
const listeners = new Set<() => void>();
let cloudInitialized = false;
let cloudChannel: ReturnType<typeof supabase.channel> | null = null;

function loadLocal() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        data = parsed;
      } else {
        data = [];
      }
    }
  } catch {
    data = [];
  }
}
loadLocal();

function saveLocalAndNotify(next: Reminder[], syncNative = true) {
  data = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  }
  listeners.forEach((l) => l());
  if (syncNative) {
    void syncScheduledRemindersToNative(data);
  }
}

async function pushRemindersToCloud(list: Reminder[]) {
  if (import.meta.env.MODE === "test") return;
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) return;
    await (supabase as any).from("supplier_purchases").upsert(
      {
        id: CLOUD_ROW_ID,
        farm_id: FARM_ID,
        supplier_name: CLOUD_ROW_ID,
        product_name: JSON.stringify(list),
        purchase_date: new Date().toISOString(),
        quantity: 0,
        unit: "json",
        price_per_unit: 0,
        total_cost: 0,
        paid_amount: 0,
        consumed: 0,
      },
      { onConflict: "id" },
    );
  } catch (err) {
    console.warn("[reminders-store] pushRemindersToCloud:", err);
  }
}

function parseCloudReminders(raw: unknown): Reminder[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (x): x is Reminder => Boolean(x && typeof x === "object" && typeof x.id === "string"),
      );
    }
  } catch {}
  return null;
}

/**
 * Charge les rappels depuis Supabase et active la synchronisation temps réel PC ↔ Mobile.
 */
export async function syncRemindersFromCloud(): Promise<void> {
  if (import.meta.env.MODE === "test") return;
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) return;
    const { data: row, error } = await (supabase as any)
      .from("supplier_purchases")
      .select("product_name, updated_at")
      .eq("id", CLOUD_ROW_ID)
      .maybeSingle();

    if (!error && row?.product_name) {
      const remoteList = parseCloudReminders(row.product_name);
      if (remoteList) {
        saveLocalAndNotify(remoteList, true);
      }
    } else if (!error && !row && data.length > 0) {
      // Premier appareil ayant déjà des rappels locaux → pousse vers le cloud
      void pushRemindersToCloud(data);
    }
  } catch (err) {
    console.warn("[reminders-store] syncRemindersFromCloud:", err);
  }
}

export function initRemindersCloudRealtime(): void {
  if (cloudInitialized || import.meta.env.MODE === "test") return;
  cloudInitialized = true;
  void syncRemindersFromCloud();

  try {
    cloudChannel = supabase
      .channel("doula-farm-reminders-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "supplier_purchases",
          filter: `id=eq.${CLOUD_ROW_ID}`,
        },
        (payload) => {
          const nextRaw = (payload.new as any)?.product_name;
          const remoteList = parseCloudReminders(nextRaw);
          if (remoteList) {
            saveLocalAndNotify(remoteList, true);
          }
        },
      )
      .subscribe();
  } catch {}
}

function persist(next: Reminder[]) {
  saveLocalAndNotify(next, true);
  void pushRemindersToCloud(next);
}

export function useReminders(): Reminder[] {
  const [snapshot, setSnapshot] = useState<Reminder[]>(() => data);
  useEffect(() => {
    initRemindersCloudRealtime();
    const fn = () => setSnapshot(data);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return snapshot;
}

/** Date locale YYYY-MM-DD (évite le décalage UTC minuit-1h en Algérie) */
export function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isDueToday(r: Reminder): boolean {
  if (!r || typeof r !== "object" || !r.active) return false;
  const day = new Date().getDay(); // 0=Sun..6=Sat
  if (r.frequency === "daily") return true;
  if (r.frequency === "weekdays") return day >= 1 && day <= 5;
  if (r.frequency === "weekly") return day === 1; // Monday
  return false;
}

export function useRemindersActions() {
  const add = useCallback(
    (r: Omit<Reminder, "id" | "createdAt" | "active"> & { active?: boolean }) => {
      const newItem: Reminder = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        active: r.active ?? true,
        ...r,
      };
      persist([newItem, ...data]);
    },
    [],
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<Reminder, "id" | "createdAt">>) => {
      persist(data.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [],
  );

  const remove = useCallback((id: string) => {
    persist(data.filter((r) => r.id !== id));
  }, []);

  const toggleActive = useCallback((id: string) => {
    persist(
      data.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    );
  }, []);

  const markChecked = useCallback((id: string) => {
    const today = todayKey();
    persist(
      data.map((item) =>
        item.id === id ? { ...item, lastCheckedAt: today } : item,
      ),
    );
  }, []);

  const unmarkChecked = useCallback((id: string) => {
    persist(
      data.map((item) =>
        item.id === id ? { ...item, lastCheckedAt: undefined } : item,
      ),
    );
  }, []);

  return { add, update, remove, toggleActive, markChecked, unmarkChecked };
}
