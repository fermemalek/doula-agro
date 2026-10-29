import { useEffect, useState } from "react";

const KEY = "doula-config";

export type ConfigRole = "admin" | "executant" | "ingenieur";

export interface AppConfig {
  role: ConfigRole;
  bgColor: string; // CSS color or empty
  bgImage: string; // data URL or empty
  configured: boolean;
  lang?: "fr" | "ar";
}

const DEFAULT: AppConfig = { role: "admin", bgColor: "", bgImage: "", configured: false, lang: "fr" };

let current: AppConfig = DEFAULT;
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* noop */
  }
}
load();

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(current));
  listeners.forEach((l) => l());
}

export function getConfig(): AppConfig {
  return current;
}

export function saveConfig(patch: Partial<AppConfig>) {
  current = { ...current, ...patch };
  persist();
}

export function resetConfig() {
  current = DEFAULT;
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export function useConfig(): AppConfig {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return current;
}
