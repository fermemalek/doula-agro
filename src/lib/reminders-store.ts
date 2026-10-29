import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const KEY = "doula-reminders";

export type ReminderFrequency = "daily" | "weekdays" | "weekly";

export interface Reminder {
  id: string;
  title: string;
  time: string; // "HH:mm"
  frequency: ReminderFrequency;
  parcelId?: string;
  active: boolean;
  lastCheckedAt?: string; // ISO date "YYYY-MM-DD"
  createdAt: number;
}

let data: Reminder[] = [];
const listeners = new Set<() => void>();

// Helper: Hash UUID to a unique 32-bit positive integer (under 1,000,000)
function getNumericId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1000000;
}

// Helper: Sync all active reminders with Capacitor LocalNotifications
async function syncNativeReminders(reminders: Reminder[]) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // 1. Cancel all existing notifications first
    const pending = await LocalNotifications.getPending();
    const idsToCancel = pending.notifications
      .filter((n) => n.id !== 9999) // don't cancel active agitator notification
      .map((n) => n.id);
    if (idsToCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: idsToCancel.map((id) => ({ id })) });
    }

    // 2. Request permissions if not granted
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }

    // 3. Schedule all active reminders
    const notificationsToSchedule = [];
    for (const r of reminders) {
      if (!r.active) continue;

      const [hStr, mStr] = r.time.split(":");
      const hour = parseInt(hStr) || 0;
      const minute = parseInt(mStr) || 0;
      const baseId = getNumericId(r.id);

      if (r.frequency === "daily") {
        notificationsToSchedule.push({
          id: baseId,
          title: "Rappel du matin",
          body: r.title,
          schedule: {
            on: { hour, minute },
            every: "day" as const,
            allowWhileIdle: true,
          },
          sound: "default",
        });
      } else if (r.frequency === "weekly") {
        notificationsToSchedule.push({
          id: baseId,
          title: "Rappel hebdomadaire",
          body: r.title,
          schedule: {
            on: { weekday: 2, hour, minute }, // 2 = Monday
            every: "week" as const,
            allowWhileIdle: true,
          },
          sound: "default",
        });
      } else if (r.frequency === "weekdays") {
        // Weekdays Mon-Fri (weekday 2 to 6)
        for (let weekday = 2; weekday <= 6; weekday++) {
          notificationsToSchedule.push({
            id: baseId + weekday * 1000000,
            title: "Rappel du matin (semaine)",
            body: r.title,
            schedule: {
              on: { weekday, hour, minute },
              every: "week" as const,
              allowWhileIdle: true,
            },
            sound: "default",
          });
        }
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
    }
  } catch (e) {
    console.warn("Failed to sync native reminders", e);
  }
}

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

// Trigger Native Sync 1.5 seconds after app startup to ensure Capacitor is ready
if (typeof window !== "undefined") {
  setTimeout(() => {
    syncNativeReminders(data);
  }, 1500);
}

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
  syncNativeReminders(data);
}

export function useReminders(): Reminder[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return data;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
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
  const add = useCallback((r: Omit<Reminder, "id" | "createdAt" | "active"> & { active?: boolean }) => {
    data.unshift({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      active: r.active ?? true,
      ...r,
    });
    persist();
  }, []);
  const remove = useCallback((id: string) => {
    data = data.filter((r) => r.id !== id);
    persist();
  }, []);
  const toggleActive = useCallback((id: string) => {
    const r = data.find((x) => x.id === id);
    if (r) {
      r.active = !r.active;
      persist();
    }
  }, []);
  const markChecked = useCallback((id: string) => {
    const r = data.find((x) => x.id === id);
    if (r) {
      r.lastCheckedAt = todayKey();
      persist();
    }
  }, []);
  const unmarkChecked = useCallback((id: string) => {
    const r = data.find((x) => x.id === id);
    if (r) {
      r.lastCheckedAt = undefined;
      persist();
    }
  }, []);
  return { add, remove, toggleActive, markChecked, unmarkChecked };
}
