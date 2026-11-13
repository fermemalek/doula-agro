import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "doula-modules";
const FARM_ID = "00000000-0000-0000-0000-000000000001";

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

const REVERSE_CLOUD_KIND: Record<string, ModuleName> = {
  irrigation: "irrigation",
  fertilisation: "fertilisation",
  pulverisation: "pulverisation",
  phytosanitaire: "phytosanitaire",
  recolte: "recolte",
  analyse_sol: "analyse-sol",
  analyse_eau: "analyse-eau",
};

function extractScheduledAt(record: Record<string, unknown>): string | null {
  const date = (record.date as string | undefined) ?? undefined;
  if (date) {
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

    const recordId = typeof record.id === "string" && record.id.length >= 10 ? record.id : crypto.randomUUID();

    await supabase.from("module_records").upsert({
      id: recordId,
      parcel_id: parcelId,
      kind: kind as never,
      payload: record as never,
      total_cost: total,
      scheduled_at,
      status: scheduled_at ? "planifie" : "execute",
      farm_id: FARM_ID,
      created_by: u.user.id,
    }, { onConflict: "id" });
  } catch (e) {
    console.debug("[modules-store] cloud sync skipped or failed", e);
  }
}

async function deleteFromCloud(id: string) {
  try {
    await supabase.from("module_records").delete().eq("id", id);
  } catch (err) {
    console.debug("[modules-store] cloud delete skipped or failed", err);
  }
}

async function updateInCloud(id: string, fullRecord: any) {
  try {
    const scheduled_at = extractScheduledAt(fullRecord);
    const total =
      typeof fullRecord.total === "number"
        ? fullRecord.total
        : typeof fullRecord.total === "string"
          ? parseFloat(fullRecord.total) || 0
          : 0;

    await supabase.from("module_records").update({
      payload: fullRecord as never,
      total_cost: total,
      scheduled_at,
    }).eq("id", id);
  } catch (err) {
    console.debug("[modules-store] cloud update skipped or failed", err);
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
load();

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

/**
 * Récupère tous les enregistrements de modules depuis Supabase Cloud
 */
export async function fetchCloudModules() {
  try {
    const { data: records, error } = await supabase
      .from("module_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && records) {
      let changed = false;
      for (const rec of records) {
        if (!rec.parcel_id || !rec.kind) continue;
        const mod = REVERSE_CLOUD_KIND[rec.kind];
        if (!mod) continue;

        if (!data[rec.parcel_id]) data[rec.parcel_id] = {} as any;
        if (!data[rec.parcel_id][mod]) data[rec.parcel_id][mod] = [];

        const payload = typeof rec.payload === "object" && rec.payload !== null ? (rec.payload as any) : {};
        const item = {
          id: rec.id,
          createdAt: new Date(rec.created_at).getTime(),
          ...payload,
          total: rec.total_cost ?? payload.total,
          scheduled_at: rec.scheduled_at,
          status: rec.status,
          assigned_to: rec.assigned_to,
          executed_at: rec.executed_at,
        };

        const existingIdx = data[rec.parcel_id][mod].findIndex((existing: any) => existing.id === item.id);
        if (existingIdx >= 0) {
          data[rec.parcel_id][mod][existingIdx] = { ...data[rec.parcel_id][mod][existingIdx], ...item };
        } else {
          data[rec.parcel_id][mod].unshift(item);
          changed = true;
        }
      }

      if (changed) {
        persist();
      }
    }
  } catch (err) {
    console.debug("[modules-store] cloud fetch error", err);
  }
}

/**
 * Migre les enregistrements locaux vers le Cloud dès qu'une session est active
 */
async function syncLocalModulesToCloud() {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    for (const pid of Object.keys(data)) {
      if (!data[pid]) continue;
      for (const mod of Object.keys(data[pid]) as ModuleName[]) {
        const list = data[pid][mod];
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.id) {
              void dualWriteCloud(pid, mod, item);
            }
          }
        }
      }
    }
  } catch (err) {
    console.debug("[modules-store] syncLocalModulesToCloud skipped", err);
  }
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    void fetchCloudModules();
    void syncLocalModulesToCloud();
  }, 400);

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      void fetchCloudModules();
      void syncLocalModulesToCloud();
    }
  });

  window.addEventListener("focus", () => {
    void fetchCloudModules();
  });

  // Écoute temps réel des changements sur la table module_records
  supabase
    .channel("realtime-module-records-sync")
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "module_records" } as never,
      () => {
        void fetchCloudModules();
      }
    )
    .subscribe();
}

function bucket(parcelId: string, mod: ModuleName): any[] {
  if (!data[parcelId]) data[parcelId] = {} as any;
  if (!data[parcelId][mod]) data[parcelId][mod] = [];
  return data[parcelId][mod];
}

export function useModuleRecords<T = any>(parcelId: string, mod: ModuleName): T[] {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    void fetchCloudModules();
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [parcelId, mod]);
  return useMemo(() => bucket(parcelId, mod) as T[], [tick, parcelId, mod]);
}

export function useAllModuleRecords<T = any>(mod: ModuleName): Array<T & { parcelId: string }> {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    void fetchCloudModules();
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [mod]);
  return useMemo(() => {
    const all: Array<T & { parcelId: string }> = [];
    for (const pid of Object.keys(data)) {
      const arr = data[pid]?.[mod] ?? [];
      for (const r of arr) all.push({ ...r, parcelId: pid });
    }
    return all;
  }, [tick, mod]);
}

export function removeModuleRecordsByRecoId(recoId: string) {
  let changed = false;
  const deletedIds: string[] = [];
  for (const pid of Object.keys(data)) {
    if (!data[pid]) continue;
    for (const mod of Object.keys(data[pid]) as ModuleName[]) {
      if (Array.isArray(data[pid][mod])) {
        const initialLen = data[pid][mod].length;
        data[pid][mod] = data[pid][mod].filter((r: any) => {
          const match = r.reco_id === recoId || r.payload?.reco_id === recoId || (typeof r.id === "string" && r.id.includes(recoId));
          if (match && r.id) deletedIds.push(r.id);
          return !match;
        });
        if (data[pid][mod].length !== initialLen) {
          changed = true;
        }
      }
    }
  }
  if (changed) {
    persist();
  }
  if (deletedIds.length > 0) {
    for (const id of deletedIds) {
      void deleteFromCloud(id);
    }
  }
}

export function useModuleActions() {
  const add = useCallback((parcelId: string, mod: ModuleName, record: any) => {
    const id = record.id || crypto.randomUUID();
    const enriched = { id, createdAt: Date.now(), ...record };
    bucket(parcelId, mod).unshift(enriched);
    persist();
    void dualWriteCloud(parcelId, mod, enriched);
  }, []);

  const remove = useCallback((parcelId: string, mod: ModuleName, id: string) => {
    const arr = bucket(parcelId, mod);
    const idx = arr.findIndex((r: any) => r.id === id);
    if (idx >= 0) arr.splice(idx, 1);
    persist();
    void deleteFromCloud(id);
  }, []);

  const update = useCallback((parcelId: string, mod: ModuleName, id: string, patch: any) => {
    const arr = bucket(parcelId, mod);
    const idx = arr.findIndex((r: any) => r.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...patch, id, updatedAt: Date.now() };
      persist();
      void updateInCloud(id, arr[idx]);
    }
  }, []);

  return { add, remove, update };
}
