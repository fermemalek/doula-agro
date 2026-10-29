import { useEffect, useState, useCallback } from "react";
import { PARCELS, type Parcel, type ParcelInfo, type ParcelStatus } from "@/data/parcels";

const STORAGE_KEY = "doula-parcels";

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
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  listeners.forEach((l) => l());
}

load();

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
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return PARCELS.map(merge);
}

export function useParcel(id: string): Parcel | undefined {
  const list = useParcels();
  return list.find((p) => p.id === id);
}

export function useParcelActions() {
  const updateInfo = useCallback((id: string, info: Partial<ParcelInfo>) => {
    overrides[id] = { ...overrides[id], info: { ...overrides[id]?.info, ...info } };
    persist();
  }, []);
  const updateName = useCallback((id: string, name: string) => {
    overrides[id] = { ...overrides[id], name };
    persist();
  }, []);
  const setStatus = useCallback((id: string, status: ParcelStatus) => {
    overrides[id] = { ...overrides[id], status };
    persist();
  }, []);
  return { updateInfo, updateName, setStatus };
}
