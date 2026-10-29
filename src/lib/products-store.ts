import { useEffect, useState, useCallback } from "react";
import { FERTILIZER_DATABASE, type FertilizerProduct } from "@/data/fertilizers";

const KEY = "doula-products";

let currentProducts: FertilizerProduct[] = [];
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      currentProducts = JSON.parse(raw);
    } else {
      currentProducts = [...FERTILIZER_DATABASE];
      localStorage.setItem(KEY, JSON.stringify(currentProducts));
    }
  } catch {
    currentProducts = [...FERTILIZER_DATABASE];
  }
}
load();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(currentProducts));
  }
  listeners.forEach((l) => l());
}

export function useProducts(): FertilizerProduct[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return currentProducts;
}

export function useProductActions() {
  const update = useCallback((name: string, patch: Partial<FertilizerProduct>) => {
    const idx = currentProducts.findIndex((p) => p.name === name);
    if (idx >= 0) {
      const next = [...currentProducts];
      next[idx] = { ...next[idx], ...patch };
      currentProducts = next;
      persist();
    }
  }, []);

  const add = useCallback((product: FertilizerProduct) => {
    if (!currentProducts.some((p) => p.name === product.name)) {
      currentProducts = [...currentProducts, product];
      persist();
    }
  }, []);

  return { update, add };
}
