import { useCallback, useEffect, useState } from "react";

const KEY = "doula-anomalies";

export type AnomalyType = "maladie" | "casse" | "fuite" | "autre";

export interface Anomaly {
  id: string;
  createdAt: number;
  parcelId: string;
  type: AnomalyType;
  comment: string;
  photoDataUrl?: string;
  resolved?: boolean;
}

let data: Anomaly[] = [];
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = JSON.parse(raw);
  } catch {
    /* noop */
  }
}
load();
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

export function useAnomalies(): Anomaly[] {
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

export function useAnomaliesActions() {
  const add = useCallback((a: Omit<Anomaly, "id" | "createdAt">) => {
    data.unshift({ id: crypto.randomUUID(), createdAt: Date.now(), ...a });
    persist();
  }, []);
  const remove = useCallback((id: string) => {
    data = data.filter((a) => a.id !== id);
    persist();
  }, []);
  const resolve = useCallback((id: string) => {
    const a = data.find((x) => x.id === id);
    if (a) {
      a.resolved = true;
      persist();
    }
  }, []);
  return { add, remove, resolve };
}

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  maladie: "Maladie",
  casse: "Casse",
  fuite: "Fuite",
  autre: "Autre",
};
