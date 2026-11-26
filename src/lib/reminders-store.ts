import { useCallback, useEffect, useState } from "react";
import { syncScheduledRemindersToNative } from "@/lib/notifications-native";

const KEY = "doula-reminders";

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

function load() {
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
load();

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  }
  listeners.forEach((l) => l());
  void syncScheduledRemindersToNative(data);
}

export function useReminders(): Reminder[] {
  const [snapshot, setSnapshot] = useState<Reminder[]>(() => data);
  useEffect(() => {
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
      data = [newItem, ...data];
      persist();
    },
    [],
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<Reminder, "id" | "createdAt">>) => {
      data = data.map((item) => (item.id === id ? { ...item, ...patch } : item));
      persist();
    },
    [],
  );

  const remove = useCallback((id: string) => {
    data = data.filter((r) => r.id !== id);
    persist();
  }, []);

  const toggleActive = useCallback((id: string) => {
    data = data.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item,
    );
    persist();
  }, []);

  const markChecked = useCallback((id: string) => {
    const today = todayKey();
    data = data.map((item) =>
      item.id === id ? { ...item, lastCheckedAt: today } : item,
    );
    persist();
  }, []);

  const unmarkChecked = useCallback((id: string) => {
    data = data.map((item) =>
      item.id === id ? { ...item, lastCheckedAt: undefined } : item,
    );
    persist();
  }, []);

  return { add, update, remove, toggleActive, markChecked, unmarkChecked };
}
