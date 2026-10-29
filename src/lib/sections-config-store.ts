import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueueOp } from "./offline/sync-engine";

const KEY = "doula-sections-config";

export interface SectionConfig {
  id: string; // format: parcelId-lineNumber-sectionNumber
  parcelId: string;
  lineNumber: number;
  sectionNumber: number;
  treeCount: number;
}

let configs: SectionConfig[] = [];
const listeners = new Set<() => void>();

function mapFromDb(dbItem: any): SectionConfig {
  return {
    id: dbItem.id,
    parcelId: dbItem.parcel_id,
    lineNumber: dbItem.line_number,
    sectionNumber: dbItem.section_number,
    treeCount: dbItem.tree_count,
  };
}

function mapToDb(c: SectionConfig) {
  return {
    id: c.id,
    parcel_id: c.parcelId,
    line_number: c.lineNumber,
    section_number: c.sectionNumber,
    tree_count: c.treeCount,
  };
}

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      configs = JSON.parse(raw);
    } else {
      configs = [];
    }
  } catch {
    configs = [];
  }
}
load();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(configs));
  }
  listeners.forEach((l) => l());
}

async function fetchOnline() {
  try {
    const { data: dbData, error } = await supabase
      .from("parcel_sections_config" as any)
      .select("*");
    if (!error && dbData) {
      configs = dbData.map(mapFromDb);
      persist();
    }
  } catch (err) {
    console.warn("Erreur lors de la récupération de la config des sections en ligne", err);
  }
}

fetchOnline();

if (typeof window !== "undefined") {
  supabase
    .channel("realtime-parcel-sections-config")
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "parcel_sections_config" } as never,
      (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (eventType === "INSERT" || eventType === "UPDATE") {
          const mapped = mapFromDb(newRecord);
          const idx = configs.findIndex((c) => c.id === mapped.id);
          if (idx >= 0) {
            configs[idx] = mapped;
          } else {
            configs.push(mapped);
          }
          persist();
        } else if (eventType === "DELETE") {
          const idx = configs.findIndex((c) => c.id === oldRecord.id);
          if (idx >= 0) {
            configs.splice(idx, 1);
            persist();
          }
        }
      }
    )
    .subscribe();
}

export function useSectionsConfig(parcelId?: string): SectionConfig[] {
  const [, setTick] = useState(0);

  useEffect(() => {
    void fetchOnline();

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchOnline();
      }
    };

    const handleOnline = () => {
      void fetchOnline();
    };

    window.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("online", handleOnline);

    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);

    return () => {
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("online", handleOnline);
      listeners.delete(fn);
    };
  }, []);

  if (parcelId) {
    return configs.filter((c) => c.parcelId === parcelId);
  }
  return configs;
}

export function useSectionsConfigActions() {
  const updateSectionTreeCount = useCallback((parcelId: string, lineNumber: number, sectionNumber: number, treeCount: number) => {
    const id = `${parcelId}-${lineNumber}-${sectionNumber}`;
    const newConfig: SectionConfig = {
      id,
      parcelId,
      lineNumber,
      sectionNumber,
      treeCount,
    };

    const idx = configs.findIndex((c) => c.id === id);
    if (idx >= 0) {
      configs[idx] = newConfig;
    } else {
      configs.push(newConfig);
    }
    persist();

    void enqueueOp({
      op: "section_config.upsert",
      table: "parcel_sections_config",
      client_id: id,
      payload: mapToDb(newConfig),
    });
  }, []);

  return { updateSectionTreeCount };
}
