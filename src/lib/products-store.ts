import { useEffect, useState, useCallback } from "react";
import { FERTILIZER_DATABASE, type FertilizerProduct } from "@/data/fertilizers";
import { supabase } from "@/integrations/supabase/client";

const KEY = "doula-products";

let currentProducts: FertilizerProduct[] = [];
const listeners = new Set<() => void>();

function mergeWithDefaults(stored: FertilizerProduct[]): FertilizerProduct[] {
  const map = new Map<string, FertilizerProduct>();

  // 1. Initialiser avec la base de référence centrale FERTILIZER_DATABASE
  for (const def of FERTILIZER_DATABASE) {
    map.set(def.name.trim().toLowerCase(), { ...def });
  }

  // 2. Fusionner les produits stockés localement ou reçus du cloud
  for (const item of stored) {
    if (!item || !item.name) continue;
    const key = item.name.trim().toLowerCase();
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        ...item,
        type: item.type && item.type.trim() ? item.type : existing.type,
        matiereActive: item.matiereActive && item.matiereActive.trim() ? item.matiereActive : existing.matiereActive,
        matiereActiveAr: item.matiereActiveAr && item.matiereActiveAr.trim() ? item.matiereActiveAr : existing.matiereActiveAr,
        price: typeof item.price === "number" ? item.price : existing.price,
        solubility: typeof item.solubility === "number" ? item.solubility : existing.solubility,
        unit: item.unit || existing.unit,
        note: item.note !== undefined && item.note !== "" ? item.note : existing.note,
      });
    } else {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      currentProducts = Array.isArray(parsed) ? mergeWithDefaults(parsed) : [...FERTILIZER_DATABASE];
    } else {
      currentProducts = [...FERTILIZER_DATABASE];
    }
    localStorage.setItem(KEY, JSON.stringify(currentProducts));
  } catch {
    currentProducts = [...FERTILIZER_DATABASE];
  }
}
load();

// Supabase Realtime broadcast channel pour synchronisation instantanée entre appareils
const syncChannel = typeof window !== "undefined"
  ? supabase.channel("doula-products-sync")
  : null;

if (syncChannel) {
  syncChannel
    .on("broadcast", { event: "products-update" }, (msg: any) => {
      if (msg && Array.isArray(msg.payload?.products)) {
        currentProducts = mergeWithDefaults(msg.payload.products);
        if (typeof window !== "undefined") {
          localStorage.setItem(KEY, JSON.stringify(currentProducts));
        }
        listeners.forEach((l) => l());
      }
    })
    .subscribe();
}

// Écoute de l'événement de stockage pour les onglets multiples sur un même appareil
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          currentProducts = mergeWithDefaults(parsed);
          listeners.forEach((l) => l());
        }
      } catch {}
    }
  });
}

const SYSTEM_CATALOG_ID = "00000000-0000-4000-8000-000000000002";

async function dualWriteProducts(products: FertilizerProduct[]) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("recommendations").upsert({
      id: SYSTEM_CATALOG_ID,
      farm_id: "00000000-0000-0000-0000-000000000001",
      title: "__SYSTEM_PRODUCTS_CATALOG__",
      kind: "fertilisation",
      status: "acceptee",
      parcel_ids: ["p1"],
      photo_urls: [],
      payload: {
        products,
        updated_at: new Date().toISOString(),
      } as any,
      created_by: u.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
  } catch (err) {
    // Non-bloquant si le réseau ou auth indisponible
    console.debug("[products-store] cloud dual-write skipped or failed", err);
  }
}

async function fetchCloudProducts() {
  try {
    const { data, error } = await supabase
      .from("recommendations")
      .select("payload, updated_at")
      .eq("title", "__SYSTEM_PRODUCTS_CATALOG__")
      .maybeSingle();

    if (!error && data && (data.payload as any)?.products) {
      const prods = (data.payload as any).products;
      if (Array.isArray(prods)) {
        currentProducts = mergeWithDefaults(prods);
        if (typeof window !== "undefined") {
          localStorage.setItem(KEY, JSON.stringify(currentProducts));
        }
        listeners.forEach((l) => l());
      }
    } else if (!error && !data) {
      // Si la base cloud n'a pas encore le catalogue, on y pousse notre catalogue courant
      void dualWriteProducts(currentProducts);
    }
  } catch (err) {
    console.debug("[products-store] cloud fetch skipped", err);
  }
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    void fetchCloudProducts();
  }, 300);

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      void fetchCloudProducts();
    }
  });

  window.addEventListener("focus", () => {
    void fetchCloudProducts();
  });

  // Abonnement aux mises à jour cloud de catalogue
  supabase
    .channel("realtime-catalog-sync")
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "recommendations" } as never,
      (payload: any) => {
        if (payload?.new?.title === "__SYSTEM_PRODUCTS_CATALOG__") {
          void fetchCloudProducts();
        }
      }
    )
    .subscribe();
}

function persist(skipBroadcast = false) {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(currentProducts));
  }
  listeners.forEach((l) => l());

  if (!skipBroadcast && syncChannel) {
    try {
      syncChannel.send({
        type: "broadcast",
        event: "products-update",
        payload: { products: currentProducts },
      });
    } catch {}
  }

  void dualWriteProducts(currentProducts);
}

export function useProducts(): FertilizerProduct[] {
  const [data, setData] = useState<FertilizerProduct[]>(() => [...currentProducts]);
  useEffect(() => {
    void fetchCloudProducts();
    const fn = () => setData([...currentProducts]);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return data;
}

export function useProductActions() {
  const update = useCallback((name: string, patch: Partial<FertilizerProduct>) => {
    const idx = currentProducts.findIndex((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (idx >= 0) {
      const next = [...currentProducts];
      next[idx] = { ...next[idx], ...patch };
      currentProducts = next;
      persist();
    }
  }, []);

  const add = useCallback((product: FertilizerProduct) => {
    const exists = currentProducts.some(
      (p) => p.name.trim().toLowerCase() === product.name.trim().toLowerCase()
    );
    if (!exists) {
      currentProducts = [...currentProducts, product];
      persist();
    } else {
      // Si le produit existe déjà, mettre à jour ses propriétés
      const next = currentProducts.map((p) =>
        p.name.trim().toLowerCase() === product.name.trim().toLowerCase() ? { ...p, ...product } : p
      );
      currentProducts = next;
      persist();
    }
  }, []);

  const remove = useCallback((name: string) => {
    currentProducts = currentProducts.filter(
      (p) => p.name.trim().toLowerCase() !== name.trim().toLowerCase()
    );
    persist();
  }, []);

  const resetToDefaults = useCallback(() => {
    currentProducts = [...FERTILIZER_DATABASE];
    persist();
  }, []);

  return { update, add, remove, resetToDefaults };
}
