import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "doula-modules";

// Map nos noms locaux vers les "kind" du cloud module_records
const CLOUD_KIND: Partial<Record<string, string>> = {
  irrigation: "irrigation",
  fertilisation: "fertilisation",
  pulverisation: "pulverisation",
  phytosanitaire: "phytosanitaire",
  recolte: "recolte",
  "analyse-sol": "analyse_sol",
  "analyse-eau": "analyse_eau",
  taille: "taille",
  amendement: "amendement",
};

function extractScheduledAt(record: Record<string, unknown>): string | null {
  // Date ISO directe (irrigation date mode, fertilisation, etc.)
  const date = (record.date as string | undefined) ?? undefined;
  if (date) {
    // ajoute heure si dispo
    const hour =
      (record.dateStartHour as string | undefined) ??
      (record.startHour as string | undefined) ??
      "08:00";
    return new Date(`${date}T${hour}:00`).toISOString();
  }
  return null;
}

async function dualWriteCloud(parcelId: string, mod: string, record: Record<string, unknown>) {
  const kind = CLOUD_KIND[mod];
  if (!kind) return;
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const scheduled_at = extractScheduledAt(record);
    const total =
      typeof record.total === "number"
        ? record.total
        : typeof record.total === "string"
          ? parseFloat(record.total) || 0
          : 0;
    await supabase.from("module_records").insert({
      parcel_id: parcelId,
      kind: kind as never,
      payload: record as never,
      total_cost: total,
      scheduled_at,
      status: scheduled_at ? "planifie" : "execute",
      created_by: u.user.id,
    });
  } catch (e) {
    // Best-effort : on garde la version locale même si l'écriture cloud échoue
    console.warn("[modules-store] cloud sync failed", e);
  }
}


export type ModuleName =
  | "pulverisation"
  | "phytosanitaire"
  | "recolte"
  | "analyse-sol"
  | "analyse-eau"
  | "irrigation"
  | "fertilisation"
  | "taille"
  | "amendement";

type Store = Record<string, Record<ModuleName, any[]>>;

let data: Store = {};
const listeners = new Set<() => void>();

const SEED_DATA = {};

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      data = JSON.parse(raw);
      // Nettoyage rétroactif des anciennes données de démonstration dans le localStorage de l'utilisateur
      let changed = false;
      for (const pid of Object.keys(data)) {
        if (data[pid] && Array.isArray(data[pid].fertilisation)) {
          const originalLength = data[pid].fertilisation.length;
          data[pid].fertilisation = data[pid].fertilisation.filter(
            (item: any) =>
              !["excel-nectarine-09mars", "excel-pommier-09mars", "excel-olivier-17mars"].includes(item.id),
          );
          if (data[pid].fertilisation.length !== originalLength) {
            changed = true;
          }
        }
      }
      if (changed) {
        localStorage.setItem(KEY, JSON.stringify(data));
      }
    } else {
      data = {};
      localStorage.setItem(KEY, JSON.stringify(data));
    }
  } catch {
    data = {};
  }
}
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}
load();

function bucket(parcelId: string, mod: ModuleName): any[] {
  if (!data[parcelId]) data[parcelId] = {} as any;
  if (!data[parcelId][mod]) data[parcelId][mod] = [];
  return data[parcelId][mod];
}

export function useModuleRecords<T = any>(parcelId: string, mod: ModuleName): T[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return bucket(parcelId, mod) as T[];
}

export function useAllModuleRecords<T = any>(mod: ModuleName): Array<T & { parcelId: string }> {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  const all: Array<T & { parcelId: string }> = [];
  for (const pid of Object.keys(data)) {
    const arr = data[pid]?.[mod] ?? [];
    for (const r of arr) all.push({ ...r, parcelId: pid });
  }
  return all;
}

export function useModuleActions() {
  const add = useCallback((parcelId: string, mod: ModuleName, record: any) => {
    const enriched = { id: crypto.randomUUID(), createdAt: Date.now(), ...record };
    bucket(parcelId, mod).unshift(enriched);
    persist();
    // Sync cloud (best-effort) pour que l'exécutant voie le programme
    void dualWriteCloud(parcelId, mod, enriched);
  }, []);
  const remove = useCallback((parcelId: string, mod: ModuleName, id: string) => {
    const arr = bucket(parcelId, mod);
    const idx = arr.findIndex((r: any) => r.id === id);
    if (idx >= 0) arr.splice(idx, 1);
    persist();
  }, []);
  const update = useCallback((parcelId: string, mod: ModuleName, id: string, patch: any) => {
    const arr = bucket(parcelId, mod);
    const idx = arr.findIndex((r: any) => r.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...patch, id, updatedAt: Date.now() };
      persist();
    }
  }, []);
  return { add, remove, update };
}
