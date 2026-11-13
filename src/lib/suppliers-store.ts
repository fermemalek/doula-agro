import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueueOp } from "./offline/sync-engine";

const KEY = "doula-suppliers";

export interface SupplierPurchase {
  id: string;
  recoId?: string;
  orderNumber?: string; // N° de Bon d'Achat (ex: "BA-2026-03-10")
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
  const idStr = String(dbItem.id || "");
  let recoId = dbItem.reco_id;
  let orderNumber = dbItem.order_number;

  if (idStr.startsWith("p-ba-")) {
    const parts = idStr.split("-");
    if (!recoId && parts[2]) recoId = parts[2];
    if (!orderNumber && parts[3]) orderNumber = `BA-${parts[3]}`;
  } else if (idStr.startsWith("p-reco-")) {
    const parts = idStr.split("-");
    if (!recoId && parts[2]) recoId = parts[2];
  }

  return {
    id: dbItem.id,
    recoId,
    orderNumber,
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

function safeParseFloat(val: any): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function cleanBuggyPurchases(sourceList: SupplierPurchase[]): { clean: SupplierPurchase[]; removed: SupplierPurchase[] } {
  const removed: SupplierPurchase[] = [];
  const clean = sourceList.filter((p) => {
    // 1. Filtrer les marqueurs techniques internes ou enregistrements de suppression
    if (
      !p.supplierName ||
      p.supplierName.startsWith("__SYSTEM_") ||
      p.supplierName.startsWith("sys-") ||
      p.id.startsWith("del_reco_") ||
      (p.quantity <= 0 && p.totalCost <= 0)
    ) {
      removed.push(p);
      return false;
    }

    const isRecoPurchase = p.supplierName.includes("Achat Validé") || (p.id && p.id.startsWith("p-reco-"));
    const isAbnormalVolume = p.quantity >= 500;
    if (isRecoPurchase && isAbnormalVolume) {
      removed.push(p);
      return false;
    }
    return true;
  });
  return { clean, removed };
}

/**
 * Réaligne strictement les achats générés par les recommandations :
 * Règle d'or : J'achète ce que je valide dans la recommandation (Acheté = Consommé = Validé, Restant = 0).
 * Pour l'historique : 100% payé, aucune dette restante fictive.
 */
export function reconcilePurchases(sourceList: SupplierPurchase[]): { clean: SupplierPurchase[]; changedItems: SupplierPurchase[] } {
  const changedItems: SupplierPurchase[] = [];
  const list = sourceList.map((item) => ({ ...item }));

  for (const p of list) {
    const sNorm = (p.supplierName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isRecoPurchase =
      sNorm.includes("achat valide") ||
      sNorm.includes("historique") ||
      Boolean(p.recoId) ||
      (p.id && (p.id.startsWith("p-reco-") || p.id.startsWith("p-ba-")));
    let itemChanged = false;

    // Réalignement de la dette pour l'historique ingénieur :
    // Si un achat issu d'une recommandation est resté affecté à "Fournisseur à désigner" ou a une dette
    if (isRecoPurchase) {
      if (sNorm.includes("designer")) {
        p.supplierName = "Achat Validé (Historique Ingénieur)";
        itemChanged = true;
      }
      if (p.paidAmount !== p.totalCost) {
        p.paidAmount = p.totalCost; // 100% payé = 0 DA de dette
        itemChanged = true;
      }
    }

    // Cas 1 : Produits foliaires où le débit initial a été multiplié par le nombre de parcelles (ex: Algreen ou Calcium-Bore 1.5 L acheté vs 3 L consommé)
    const norm = (p.productName || "").trim().toLowerCase();
    if (norm.includes("algreen") || norm.includes("calcium-bore") || norm.includes("calcium bore") || norm.includes("foliaire")) {
      if (p.consumed === 3 && p.quantity === 1.5) {
        p.consumed = 1.5;
        itemChanged = true;
      }
    }

    // Cas 2 : Recommandations validées où Acheté != Consommé
    // Règle d'or : On achète exactement le volume consommé validé par le programme (Restant = 0)
    if (isRecoPurchase) {
      if (p.consumed > 0 && p.quantity !== p.consumed) {
        p.quantity = p.consumed;
        p.totalCost = parseFloat((p.quantity * (p.pricePerUnit || 0)).toFixed(2));
        p.paidAmount = p.totalCost;
        itemChanged = true;
      }
    } else {
      // Pour tout achat général, si consommé dépasse quantity (reste négatif), on réaligne pour assainir le stock
      if (p.consumed > p.quantity) {
        p.quantity = p.consumed;
        p.totalCost = parseFloat((p.quantity * (p.pricePerUnit || 0)).toFixed(2));
        itemChanged = true;
      }
    }

    if (itemChanged) {
      changedItems.push(p);
    }
  }

  return { clean: list, changedItems };
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

  // 1. Nettoyage automatique des enregistrements aberrants générés par l'ancien bug de volume
  const { clean, removed } = cleanBuggyPurchases(purchases);
  purchases = clean;
  if (removed.length > 0) {
    for (const b of removed) {
      void (async () => {
        try {
          await supabase.from("supplier_purchases" as any).delete().eq("id" as never, b.id as never);
        } catch { }
      })();
    }
  }

  // 2. Réalignement strict des achats de recommandations (Acheté = Consommé = Validé, Restant = 0)
  const { clean: reconciled, changedItems } = reconcilePurchases(purchases);
  if (changedItems.length > 0 || removed.length > 0) {
    purchases = reconciled;
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(purchases));
    }
    for (const item of changedItems) {
      void (async () => {
        try {
          await supabase.from("supplier_purchases" as any).upsert(mapToDb(item) as never, { onConflict: "id" });
        } catch { }
      })();
    }
  }
}
load();

/**
 * Supprime tous les achats fournisseurs générés par une recommandation
 * (utilisé lors de la suppression ou ré-évaluation d'une recommandation).
 */
export function deletePurchasesForReco(recoId: string, recoProductNames?: string[]) {
  const toDelete = purchases.filter((p) => {
    if (p.recoId && p.recoId === recoId) return true;
    if (p.id.includes(recoId)) return true;
    const sNorm = (p.supplierName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isRecoPurchase = sNorm.includes("achat valide") || sNorm.includes("historique") || (p.id && (p.id.startsWith("p-reco-") || p.id.startsWith("p-ba-")));
    if (recoProductNames && recoProductNames.length > 0 && isRecoPurchase) {
      const pNorm = p.productName.trim().toLowerCase();
      if (recoProductNames.some((rName) => {
        const rn = rName.trim().toLowerCase();
        return pNorm === rn || pNorm.includes(rn) || rn.includes(pNorm);
      })) {
        return true;
      }
    }
    return false;
  });

  if (toDelete.length > 0) {
    const deleteIds = new Set(toDelete.map((p) => p.id));
    purchases = purchases.filter((p) => !deleteIds.has(p.id));
    persist();

    for (const p of toDelete) {
      void (async () => {
        try {
          await supabase.from("supplier_purchases" as any).delete().eq("id" as never, p.id as never);
        } catch (err) {
          console.warn("Direct delete of reco purchase failed:", err);
        }
        if (!p.id.startsWith("p-reco-")) {
          void enqueueOp({
            op: "purchase.delete",
            table: "supplier_purchases",
            record_id: p.id,
            payload: { id: p.id },
          });
        }
      })();
    }
  }
}

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
      const mapped = dbData.map(mapFromDb);
      const { clean, removed } = cleanBuggyPurchases(mapped);
      const { clean: reconciled, changedItems } = reconcilePurchases(clean);

      // Si le stockage local a des achats que le cloud n'a pas encore, on les synchronise vers Supabase
      const cloudIds = new Set(reconciled.map((c) => c.id));
      const localOnly = purchases.filter((p) => !cloudIds.has(p.id) && !p.id.startsWith("sys-del-"));

      purchases = [...reconciled, ...localOnly];
      persist();

      for (const item of changedItems) {
        void (async () => {
          try {
            await supabase.from("supplier_purchases" as any).upsert(mapToDb(item) as never, { onConflict: "id" });
          } catch { }
        })();
      }

      if (localOnly.length > 0) {
        for (const loc of localOnly) {
          void (async () => {
            try {
              await supabase.from("supplier_purchases" as any).upsert(mapToDb(loc) as never, { onConflict: "id" });
            } catch { }
          })();
        }
      }

      if (removed.length > 0) {
        for (const b of removed) {
          try {
            await supabase.from("supplier_purchases" as any).delete().eq("id" as never, b.id as never);
          } catch { }
        }
      }
    }
  } catch (err) {
    console.warn("Erreur lors de la récupération des achats en ligne", err);
  }
}

// Lancement de la récupération en arrière-plan au chargement
fetchOnline();

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      void fetchOnline();
    }
  });
}

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
            purchases = [...purchases];
            persist();
          }
        } else if (eventType === "UPDATE") {
          const mapped = mapFromDb(newRecord);
          const idx = purchases.findIndex((p) => p.id === mapped.id);
          if (idx >= 0) {
            purchases[idx] = mapped;
            purchases = [...purchases];
            persist();
          }
        } else if (eventType === "DELETE") {
          const idx = purchases.findIndex((p) => p.id === oldRecord.id);
          if (idx >= 0) {
            purchases.splice(idx, 1);
            purchases = [...purchases];
            persist();
          }
        }
      }
    )
    .subscribe();
}

export function useSuppliers(): SupplierPurchase[] {
  const [data, setData] = useState<SupplierPurchase[]>(() => [...purchases]);
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

    const fn = () => setData([...purchases]);
    listeners.add(fn);

    return () => {
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("online", handleOnline);
      listeners.delete(fn);
    };
  }, []);
  return data;
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

  purchases = [...purchases];
  persist();

  // Envoi des mises à jour à Supabase (directement si en ligne, sinon file hors-ligne)
  for (const item of updatedPurchases) {
    void (async () => {
      let directDone = false;
      try {
        const { error } = await supabase
          .from("supplier_purchases" as any)
          .update({ consumed: item.consumed } as never)
          .eq("id" as never, item.id as never);
        if (!error) directDone = true;
      } catch (err) {
        console.warn("Direct purchase update failed:", err);
      }
      if (!directDone) {
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
    })();
  }
}

export function useSupplierActions() {
  const addPurchase = useCallback((purchase: Omit<SupplierPurchase, "id" | "consumed">) => {
    const newPurchase: SupplierPurchase = {
      id: "p-" + crypto.randomUUID(),
      consumed: 0,
      ...purchase,
    };
    purchases = [newPurchase, ...purchases];
    persist();

    void (async () => {
      let directDone = false;
      try {
        const { error } = await supabase
          .from("supplier_purchases" as any)
          .upsert(mapToDb(newPurchase) as never, { onConflict: "id" });
        if (!error) directDone = true;
      } catch (err) {
        console.warn("Direct purchase upsert failed:", err);
      }
      if (!directDone) {
        void enqueueOp({
          op: "purchase.create",
          table: "supplier_purchases",
          client_id: newPurchase.id,
          payload: mapToDb(newPurchase),
        });
      }
    })();
  }, []);

  const updatePurchase = useCallback((id: string, patch: Partial<SupplierPurchase>) => {
    const idx = purchases.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const updated = { ...purchases[idx], ...patch };
      purchases = purchases.map((p, i) => (i === idx ? updated : p));
      persist();

      void (async () => {
        let directDone = false;
        try {
          const { error } = await supabase
            .from("supplier_purchases" as any)
            .update(mapToDb(updated) as never)
            .eq("id" as never, id as never);
          if (!error) directDone = true;
        } catch (err) {
          console.warn("Direct purchase update failed:", err);
        }
        if (!directDone) {
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
      })();
    }
  }, []);

  const deletePurchase = useCallback((id: string) => {
    const idx = purchases.findIndex((p) => p.id === id);
    if (idx >= 0) {
      purchases = purchases.filter((p) => p.id !== id);
      persist();

      void (async () => {
        let directDone = false;
        try {
          const { error } = await supabase
            .from("supplier_purchases" as any)
            .delete()
            .eq("id" as never, id as never);
          if (!error) directDone = true;
        } catch (err) {
          console.warn("Direct purchase delete failed:", err);
        }
        if (!directDone) {
          void enqueueOp({
            op: "purchase.delete",
            table: "supplier_purchases",
            record_id: id,
            payload: { id },
          });
        }
      })();
    }
  }, []);

  const deleteAllPurchases = useCallback(() => {
    purchases = [];
    persist();

    void (async () => {
      try {
        await supabase
          .from("supplier_purchases" as any)
          .delete()
          .neq("id" as never, "00000000-0000-0000-0000-000000000000" as never);
      } catch (err) {
        console.warn("Direct deleteAllPurchases failed:", err);
      }
    })();
  }, []);

  const realignPurchases = useCallback(() => {
    const { clean, changedItems } = reconcilePurchases(purchases);
    if (changedItems.length > 0) {
      purchases = clean;
      persist();
      for (const item of changedItems) {
        void (async () => {
          try {
            await supabase.from("supplier_purchases" as any).upsert(mapToDb(item) as never, { onConflict: "id" });
          } catch { }
        })();
      }
    }
  }, []);

  return { addPurchase, updatePurchase, deletePurchase, deleteAllPurchases, realignPurchases };
}

export function resetAllConsumedQuantities() {
  const updated: { id: string; consumed: number }[] = [];
  purchases = purchases.map((p) => {
    updated.push({ id: p.id, consumed: 0 });
    return { ...p, consumed: 0 };
  });
  purchases = [...purchases];
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
