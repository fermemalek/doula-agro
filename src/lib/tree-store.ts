import { useEffect, useState, useCallback } from "react";

const KEY = "doula-trees";

export type Vitality = "sain" | "replante" | "faible" | "mort" | "oublie";
export type Problem = "aucun" | "fuite" | "tuyau" | "maladie";
export type Pollinator = string; // "" | "G" | "S" | custom letter(s)

export interface Tree {
  vitality: Vitality;
  problem: Problem;
  pollinator: Pollinator;
  heightCm: string;
  trunkMm: string;
  photos: string[]; // data URLs
  notes: string;
}

export const VITALITY_LABEL: Record<Vitality, string> = {
  sain: "Sain",
  replante: "Replanté",
  faible: "Faible",
  mort: "Mort",
  oublie: "Oublié",
};

export const VITALITY_COLOR: Record<Vitality, string> = {
  sain: "#1f5f3f",
  replante: "#7cc28a",
  faible: "#e58a3a",
  mort: "#c1361b",
  oublie: "#f0c419",
};

const DEFAULT_TREE: Tree = {
  vitality: "sain",
  problem: "aucun",
  pollinator: "",
  heightCm: "",
  trunkMm: "",
  photos: [],
  notes: "",
};

type Store = Record<string, Record<string, Tree>>; // parcelId -> "L1P1" -> Tree

let data: Store = {};
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = JSON.parse(raw);
  } catch {
    data = {};
  }
}
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}
load();

export function treeKey(l: number, p: number) {
  return `L${l}P${p}`;
}

export function useTrees(parcelId: string) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return data[parcelId] || {};
}

export function getTree(parcelId: string, key: string): Tree {
  return (data[parcelId] && data[parcelId][key]) || DEFAULT_TREE;
}

export function useTreeActions() {
  const update = useCallback((parcelId: string, key: string, patch: Partial<Tree>) => {
    const cur = (data[parcelId] && data[parcelId][key]) || DEFAULT_TREE;
    // Nouvelles références à chaque mise à jour pour déclencher les re-renders.
    data = {
      ...data,
      [parcelId]: { ...(data[parcelId] || {}), [key]: { ...cur, ...patch } },
    };
    persist();
  }, []);
  return { update };
}

// Alerts (fuite/tuyau go to in-app exécutant feed)
const ALERT_KEY = "doula-alerts";
export interface Alert {
  id: string;
  createdAt: number;
  parcelId: string;
  treeKey: string;
  problem: Problem;
  resolved: boolean;
}

let alerts: Alert[] = [];
const alertListeners = new Set<() => void>();
function loadAlerts() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(ALERT_KEY);
    if (raw) alerts = JSON.parse(raw);
  } catch {
    alerts = [];
  }
}
function persistAlerts() {
  if (typeof window !== "undefined") localStorage.setItem(ALERT_KEY, JSON.stringify(alerts));
  alertListeners.forEach((l) => l());
}
loadAlerts();

export function useAlerts() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    alertListeners.add(fn);
    return () => {
      alertListeners.delete(fn);
    };
  }, []);
  return alerts;
}

export function pushAlert(a: Omit<Alert, "id" | "createdAt" | "resolved">) {
  alerts.unshift({ id: crypto.randomUUID(), createdAt: Date.now(), resolved: false, ...a });
  persistAlerts();
}

export function resolveAlert(id: string) {
  const a = alerts.find((x) => x.id === id);
  if (a) {
    a.resolved = true;
    persistAlerts();
  }
}
