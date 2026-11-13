import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "doula-trees";
const FARM_ID = "00000000-0000-0000-0000-000000000001";

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

export async function fetchCloudTrees() {
  try {
    const { data: cloudTrees, error } = await supabase.from("trees").select("*");
    if (!error && cloudTrees && cloudTrees.length > 0) {
      let changed = false;
      for (const ct of cloudTrees) {
        const key = treeKey(ct.l, ct.p);
        if (!data[ct.parcel_id]) data[ct.parcel_id] = {};
        const cur = data[ct.parcel_id][key] || DEFAULT_TREE;
        data[ct.parcel_id][key] = {
          ...cur,
          vitality: (ct.vitality as Vitality) || cur.vitality,
          pollinator: ct.pollinator ? "P" : cur.pollinator,
          heightCm: ct.height_cm != null ? String(ct.height_cm) : cur.heightCm,
          trunkMm: ct.trunk_mm != null ? String(ct.trunk_mm) : cur.trunkMm,
          notes: ct.notes ?? cur.notes,
          photos: ct.photo_urls && ct.photo_urls.length > 0 ? ct.photo_urls : cur.photos,
        };
        changed = true;
      }
      if (changed) {
        persist();
      }
    }
  } catch (err) {
    console.debug("[tree-store] fetch trees skipped", err);
  }
}

async function syncTreeToCloud(parcelId: string, key: string, tree: Tree) {
  try {
    const match = key.match(/L(\d+)P(\d+)/i);
    if (!match) return;
    const l = parseInt(match[1], 10);
    const p = parseInt(match[2], 10);
    const id = `${parcelId}-l${l}-p${p}`;
    await supabase.from("trees").upsert({
      id,
      farm_id: FARM_ID,
      parcel_id: parcelId,
      l,
      p,
      vitality: tree.vitality,
      pollinator: Boolean(tree.pollinator),
      height_cm: parseFloat(tree.heightCm) || null,
      trunk_mm: parseFloat(tree.trunkMm) || null,
      notes: tree.notes || null,
      photo_urls: tree.photos || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
  } catch (err) {
    console.debug("[tree-store] sync tree skipped", err);
  }
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    void fetchCloudTrees();
  }, 600);

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      void fetchCloudTrees();
    }
  });

  window.addEventListener("focus", () => {
    void fetchCloudTrees();
  });
}

export function useTrees(parcelId: string) {
  const [, setTick] = useState(0);
  useEffect(() => {
    void fetchCloudTrees();
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [parcelId]);
  return data[parcelId] || {};
}

export function getTree(parcelId: string, key: string): Tree {
  return (data[parcelId] && data[parcelId][key]) || DEFAULT_TREE;
}

export function useTreeActions() {
  const update = useCallback((parcelId: string, key: string, patch: Partial<Tree>) => {
    const cur = (data[parcelId] && data[parcelId][key]) || DEFAULT_TREE;
    const updatedTree = { ...cur, ...patch };
    data = {
      ...data,
      [parcelId]: { ...(data[parcelId] || {}), [key]: updatedTree },
    };
    persist();
    void syncTreeToCloud(parcelId, key, updatedTree);
  }, []);
  return { update };
}

// Alerts (fuite/tuyau go to in-app exécutant feed & cloud alerts table)
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
  const id = crypto.randomUUID();
  alerts.unshift({ id, createdAt: Date.now(), resolved: false, ...a });
  persistAlerts();

  void (async () => {
    try {
      const match = a.treeKey.match(/L(\d+)P(\d+)/i);
      const l = match ? parseInt(match[1], 10) : null;
      const p = match ? parseInt(match[2], 10) : null;
      await supabase.from("alerts").insert({
        id,
        farm_id: FARM_ID,
        parcel_id: a.parcelId,
        kind: (a.problem === "aucun" ? "autre" : a.problem) as any,
        status: "ouvert",
        l,
        p,
        message: `Signalement arbre ${a.treeKey} : ${a.problem}`,
      });
    } catch {}
  })();
}
