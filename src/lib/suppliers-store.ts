import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueueOp } from "./offline/sync-engine";

const KEY = "doula-suppliers";

export interface SupplierPurchase {
  id: string;
  supplierName: string;
  productName: string;
  purchaseDate: string;
  quantity: number;
  unit: "kg" | "litres";
  pricePerUnit: number;
  totalCost: number;
  paidAmount: number; // Advance / montant effectué
  consumed: number; // quantity consumed
}

let purchases: SupplierPurchase[] = [];
const listeners = new Set<() => void>();

function mapFromDb(dbItem: any): SupplierPurchase {
  return {
    id: dbItem.id,
    supplierName: dbItem.supplier_name,
    productName: dbItem.product_name,
    purchaseDate: dbItem.purchase_date,
    quantity: dbItem.quantity,
    unit: dbItem.unit,
    pricePerUnit: dbItem.price_per_unit,
    totalCost: dbItem.total_cost,
    paidAmount: dbItem.paid_amount,
    consumed: dbItem.consumed,
  };
}

function mapToDb(p: SupplierPurchase) {
  return {
    id: p.id,
    supplier_name: p.supplierName,
    product_name: p.productName,
    purchase_date: p.purchaseDate,
    quantity: p.quantity,
    unit: p.unit,
    price_per_unit: p.pricePerUnit,
    total_cost: p.totalCost,
    paid_amount: p.paidAmount,
    consumed: p.consumed,
    farm_id: '00000000-0000-0000-0000-000000000001',
  };
}

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      purchases = JSON.parse(raw);
    } else {
      purchases = [];
    }
  } catch {
    purchases = [];
  }
}
load();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(purchases));
  }
  listeners.forEach((l) => l());
}

async function fetchOnline() {
  try {
    const { data: dbData, error } = await supabase
      .from("supplier_purchases" as any)
      .select("*")
      .order("purchase_date" as any, { ascending: false });
    if (!error && dbData) {
      purchases = dbData.map(mapFromDb);
      persist();
    }
  } catch (err) {
    console.warn("Erreur lors de la récupération des achats en ligne", err);
  }
}

// Lancement de la récupération en arrière-plan au chargement
fetchOnline();

// Abonnement en temps réel aux changements de la table
if (typeof window !== "undefined") {
  supabase
    .channel("realtime-supplier-purchases")
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "supplier_purchases" } as never,
      (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (eventType === "INSERT") {
          const mapped = mapFromDb(newRecord);
          if (!purchases.some((p) => p.id === mapped.id)) {
            purchases.unshift(mapped);
            persist();
          }
        } else if (eventType === "UPDATE") {
          const mapped = mapFromDb(newRecord);
          const idx = purchases.findIndex((p) => p.id === mapped.id);
          if (idx >= 0) {
            purchases[idx] = mapped;
            persist();
          }
        } else if (eventType === "DELETE") {
          const idx = purchases.findIndex((p) => p.id === oldRecord.id);
          if (idx >= 0) {
            purchases.splice(idx, 1);
            persist();
          }
        }
      }
    )
    .subscribe();
}

export function useSuppliers(): SupplierPurchase[] {
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
  return purchases;
}

/**
 * Débite une quantité consommée du stock en méthode FIFO.
 */
export function debitProductStock(productName: string, quantityToDebit: number) {
  const normName = productName.trim().toLowerCase();
  
  const matches = purchases.filter(
    (p) => p.productName.trim().toLowerCase() === normName && p.quantity > p.consumed
  );
  
  matches.sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
  
  let remainingToDebit = quantityToDebit;
  const updatedPurchases: { id: string; consumed: number }[] = [];
  
  for (const purchase of matches) {
    if (remainingToDebit <= 0) break;
    
    const available = purchase.quantity - purchase.consumed;
    const toConsume = Math.min(remainingToDebit, available);
    
    const idx = purchases.findIndex((p) => p.id === purchase.id);
    if (idx >= 0) {
      purchases[idx].consumed = parseFloat((purchases[idx].consumed + toConsume).toFixed(2));
      remainingToDebit -= toConsume;
      updatedPurchases.push({ id: purchase.id, consumed: purchases[idx].consumed });
    }
  }
  
  if (remainingToDebit > 0) {
    const fallback = purchases.find((p) => p.productName.trim().toLowerCase() === normName);
    if (fallback) {
      const idx = purchases.findIndex((p) => p.id === fallback.id);
      if (idx >= 0) {
        purchases[idx].consumed = parseFloat((purchases[idx].consumed + remainingToDebit).toFixed(2));
        updatedPurchases.push({ id: fallback.id, consumed: purchases[idx].consumed });
      }
    }
  }
  
  persist();

  // Envoi des mises à jour à Supabase
  for (const item of updatedPurchases) {
    void enqueueOp({
      op: "purchase.update",
      table: "supplier_purchases",
      record_id: item.id,
      payload: {
        id: item.id,
        patch: { consumed: item.consumed },
      },
    });
  }
}

export function useSupplierActions() {
  const addPurchase = useCallback((purchase: Omit<SupplierPurchase, "id" | "consumed">) => {
    const newPurchase: SupplierPurchase = {
      id: "p-" + crypto.randomUUID(),
      consumed: 0,
      ...purchase,
    };
    purchases.unshift(newPurchase);
    persist();

    void enqueueOp({
      op: "purchase.create",
      table: "supplier_purchases",
      client_id: newPurchase.id,
      payload: mapToDb(newPurchase),
    });
  }, []);

  const updatePurchase = useCallback((id: string, patch: Partial<SupplierPurchase>) => {
    const idx = purchases.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const updated = { ...purchases[idx], ...patch };
      purchases[idx] = updated;
      persist();

      void enqueueOp({
        op: "purchase.update",
        table: "supplier_purchases",
        record_id: id,
        payload: {
          id,
          patch: mapToDb(updated),
        },
      });
    }
  }, []);

  const deletePurchase = useCallback((id: string) => {
    const idx = purchases.findIndex((p) => p.id === id);
    if (idx >= 0) {
      purchases.splice(idx, 1);
      persist();

      void enqueueOp({
        op: "purchase.delete",
        table: "supplier_purchases",
        record_id: id,
        payload: { id },
      });
    }
  }, []);

  const deleteAllPurchases = useCallback(() => {
    const ids = purchases.map((p) => p.id);
    purchases = [];
    persist();

    for (const id of ids) {
      void enqueueOp({
        op: "purchase.delete",
        table: "supplier_purchases",
        record_id: id,
        payload: { id },
      });
    }
  }, []);

  return { addPurchase, updatePurchase, deletePurchase, deleteAllPurchases };
}

export function resetAllConsumedQuantities() {
  const updated: { id: string; consumed: number }[] = [];
  purchases = purchases.map((p) => {
    updated.push({ id: p.id, consumed: 0 });
    return { ...p, consumed: 0 };
  });
  persist();

  for (const item of updated) {
    void enqueueOp({
      op: "purchase.update",
      table: "supplier_purchases",
      record_id: item.id,
      payload: {
        id: item.id,
        patch: { consumed: 0 },
      },
    });
  }
}
