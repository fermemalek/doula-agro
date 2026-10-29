import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueueOp } from "./offline/sync-engine";

const KEY = "doula-predictions";

export interface ParcelPrediction {
  id: string; // format: parcelId-lineNumber-treeNumber
  parcelId: string;
  lineNumber: number;
  treeNumber: number;
  isFruiting: boolean;
  estimatedQty: number;
  treeType?: string; // 'gala' | 'golden' | 'granny'
}

let predictions: ParcelPrediction[] = [];
const listeners = new Set<() => void>();

function mapFromDb(dbItem: any): ParcelPrediction {
  return {
    id: dbItem.id,
    parcelId: dbItem.parcel_id,
    lineNumber: dbItem.line_number,
    treeNumber: dbItem.tree_number,
    isFruiting: dbItem.is_fruiting,
    estimatedQty: dbItem.estimated_qty,
    treeType: dbItem.tree_type ?? undefined,
  };
}

function mapToDb(p: ParcelPrediction) {
  return {
    id: p.id,
    parcel_id: p.parcelId,
    line_number: p.lineNumber,
    tree_number: p.treeNumber,
    is_fruiting: p.isFruiting,
    estimated_qty: p.estimatedQty,
    tree_type: p.treeType ?? null,
  };
}

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      predictions = JSON.parse(raw);
    } else {
      predictions = [];
    }
  } catch {
    predictions = [];
  }
}
load();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(predictions));
  }
  listeners.forEach((l) => l());
}

async function fetchOnline() {
  try {
    const { data: dbData, error } = await supabase
      .from("parcel_predictions" as any)
      .select("*");
    if (!error && dbData) {
      predictions = dbData.map(mapFromDb);
      persist();
    }
  } catch (err) {
    console.warn("Erreur lors de la récupération des prévisions en ligne", err);
  }
}

// Lancement de la récupération initiale en arrière-plan
fetchOnline();

// Abonnement en temps réel aux changements de la table
if (typeof window !== "undefined") {
  supabase
    .channel("realtime-parcel-predictions")
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "parcel_predictions" } as never,
      (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (eventType === "INSERT" || eventType === "UPDATE") {
          const mapped = mapFromDb(newRecord);
          const idx = predictions.findIndex((p) => p.id === mapped.id);
          if (idx >= 0) {
            predictions[idx] = mapped;
          } else {
            predictions.push(mapped);
          }
          persist();
        } else if (eventType === "DELETE") {
          const idx = predictions.findIndex((p) => p.id === oldRecord.id);
          if (idx >= 0) {
            predictions.splice(idx, 1);
            persist();
          }
        }
      }
    )
    .subscribe();
}

export function usePredictions(parcelId?: string): ParcelPrediction[] {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Initial fetch on mount
    void fetchOnline();

    // Fetch on focus
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchOnline();
      }
    };

    // Fetch on online status recovery
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
    return predictions.filter((p) => p.parcelId === parcelId);
  }
  return predictions;
}

export function usePredictionActions() {
  const upsertPrediction = useCallback((pred: Omit<ParcelPrediction, "id">) => {
    const id = `${pred.parcelId}-${pred.lineNumber}-${pred.treeNumber}`;
    const newPrediction: ParcelPrediction = {
      id,
      ...pred,
    };

    const idx = predictions.findIndex((p) => p.id === id);
    if (idx >= 0) {
      predictions[idx] = newPrediction;
    } else {
      predictions.push(newPrediction);
    }
    persist();

    void enqueueOp({
      op: "prediction.upsert",
      table: "parcel_predictions",
      client_id: id,
      payload: mapToDb(newPrediction),
    });
  }, []);

  const upsertPredictionsBatch = useCallback((batch: Omit<ParcelPrediction, "id">[]) => {
    const updatedItems: ParcelPrediction[] = [];

    for (const pred of batch) {
      const id = `${pred.parcelId}-${pred.lineNumber}-${pred.treeNumber}`;
      const newPrediction: ParcelPrediction = {
        id,
        ...pred,
      };

      const idx = predictions.findIndex((p) => p.id === id);
      if (idx >= 0) {
        predictions[idx] = newPrediction;
      } else {
        predictions.push(newPrediction);
      }
      updatedItems.push(newPrediction);
    }
    persist();

    for (const item of updatedItems) {
      void enqueueOp({
        op: "prediction.upsert",
        table: "parcel_predictions",
        client_id: item.id,
        payload: mapToDb(item),
      });
    }
  }, []);

  return { upsertPrediction, upsertPredictionsBatch };
}
