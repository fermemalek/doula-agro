import { useEffect, useState, useCallback, useMemo } from "react";
import { PARCELS, type Parcel, type ParcelInfo, type ParcelStatus } from "@/data/parcels";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "doula-parcels";
const FARM_ID = "00000000-0000-0000-0000-000000000001";

type Overrides = Record<string, { info?: Partial<ParcelInfo>; status?: ParcelStatus; name?: string }>;

let overrides: Overrides = {};
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) overrides = JSON.parse(raw);
  } catch {
    overrides = {};
  }
}
load();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        overrides = JSON.parse(e.newValue);
        listeners.forEach((l) => l());
      } catch {}
    }
  });
}

/**
 * Récupère les parcelles enregistrées dans Supabase Cloud
 * et synchronise les surcharges locales.
 */
export async function fetchCloudParcels() {
  try {
    const { data: cloudParcels, error } = await supabase
      .from("parcels")
      .select("*");

    if (!error && cloudParcels) {
      if (cloudParcels.length === 0) {
        // La table est encore vide dans Supabase Cloud : on initialise les 12 parcelles
        void seedBaselineParcelsToCloud();
        return;
      }

      let changed = false;
      for (const cp of cloudParcels) {
        const meta = typeof cp.metadata === "object" && cp.metadata !== null ? (cp.metadata as any) : {};
        const info = meta.info || {};
        const currentO = overrides[cp.id] || {};

        overrides[cp.id] = {
          ...currentO,
          name: cp.name || currentO.name,
          status: (cp.status as ParcelStatus) || currentO.status,
          info: { ...(currentO.info || {}), ...info },
        };
        changed = true;
      }

      if (changed) {
        persist();
      }
    }
  } catch (err) {
    console.debug("[parcel-store] cloud fetch skipped", err);
  }
}

/**
 * Initialise les parcelles de référence dans Supabase Cloud
 * pour garantir l'intégrité relationnelle (notamment module_records).
 */
async function seedBaselineParcelsToCloud() {
  try {
    const rows = PARCELS.map((p, idx) => {
      const o = overrides[p.id] || {};
      const info = { ...p.info, ...(o.info || {}) };
      return {
        id: p.id,
        farm_id: FARM_ID,
        name: o.name || p.name,
        type: p.type,
        status: o.status || p.status,
        position: idx + 1,
        rows_count: parseInt(info.nbLignes || "0", 10) || 0,
        trees_per_row: parseInt(info.arbresLigne || "0", 10) || 0,
        metadata: { info } as any,
        updated_at: new Date().toISOString(),
      };
    });

    await supabase.from("parcels").upsert(rows, { onConflict: "id" });
  } catch (err) {
    console.debug("[parcel-store] seeding baseline parcels skipped", err);
  }
}

/**
 * Synchronise une parcelle modifiée vers Supabase Cloud
 */
async function syncParcelToCloud(id: string) {
  try {
    const pDef = PARCELS.find((p) => p.id === id);
    if (!pDef) return;
    const currentO = overrides[id] || {};
    const name = currentO.name ?? pDef.name;
    const status = currentO.status ?? pDef.status;
    const info = { ...pDef.info, ...(currentO.info || {}) };
    const position = parseInt(id.replace("p", ""), 10) || 1;

    await supabase.from("parcels").upsert({
      id,
      farm_id: FARM_ID,
      name,
      status,
      type: pDef.type,
      position,
      rows_count: parseInt(info.nbLignes || "0", 10) || 0,
      trees_per_row: parseInt(info.arbresLigne || "0", 10) || 0,
      metadata: { info } as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
  } catch (err) {
    console.warn("[parcel-store] cloud sync failed for parcel " + id, err);
  }
}

// Initialisation et écoute temps réel Supabase
if (typeof window !== "undefined") {
  setTimeout(() => {
    void fetchCloudParcels();
  }, 300);

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      void fetchCloudParcels();
    }
  });

  window.addEventListener("focus", () => {
    void fetchCloudParcels();
  });

  // Abonnement aux modifications de parcelles sur Supabase
  supabase
    .channel("realtime-parcels-sync")
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "parcels" } as never,
      () => {
        void fetchCloudParcels();
      }
    )
    .subscribe();
}

function merge(p: Parcel): Parcel {
  const o = overrides[p.id];
  if (!o) return p;
  return {
    ...p,
    name: o.name ?? p.name,
    status: o.status ?? p.status,
    info: { ...p.info, ...(o.info ?? {}) },
  };
}

export function useParcels(): Parcel[] {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    void fetchCloudParcels();
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return useMemo(() => PARCELS.map(merge), [tick]);
}

export function useParcel(id: string): Parcel | undefined {
  const list = useParcels();
  return list.find((p) => p.id === id);
}

export function useParcelActions() {
  const updateInfo = useCallback((id: string, info: Partial<ParcelInfo>) => {
    overrides[id] = { ...overrides[id], info: { ...overrides[id]?.info, ...info } };
    persist();
    void syncParcelToCloud(id);
  }, []);

  const updateName = useCallback((id: string, name: string) => {
    overrides[id] = { ...overrides[id], name };
    persist();
    void syncParcelToCloud(id);
  }, []);

  const setStatus = useCallback((id: string, status: ParcelStatus) => {
    overrides[id] = { ...overrides[id], status };
    persist();
    void syncParcelToCloud(id);
  }, []);

  return { updateInfo, updateName, setStatus };
}
