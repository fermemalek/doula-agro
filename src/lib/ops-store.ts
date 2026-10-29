// Local store for cross-parcel operations: Tâches & Maintenance
import { useEffect, useState, useCallback } from "react";

const KEY = "doula-ops";

export type Priority = "basse" | "moyenne" | "haute";

export type Assignee = "executant" | "admin" | "ingenieur";

export interface TaskRecord {
  id: string;
  createdAt: number;
  date: string; // YYYY-MM-DD
  description: string;
  priority: Priority;
  duration: string; // free text e.g. "2h"
  cost: number;
  parcelId?: string;
  assignees: Assignee[]; // qui est désigné par cette tâche
  done?: boolean; // archivée une fois validée
  doneAt?: number;
}

export interface MaintenanceRecord {
  id: string;
  createdAt: number;
  date: string;
  equipment: string;
  description: string;
  type: string;
  cost: number;
  parcelId?: string;
}

type Store = { tasks: TaskRecord[]; maintenance: MaintenanceRecord[] };
let data: Store = { tasks: [], maintenance: [] };
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = { tasks: [], maintenance: [], ...JSON.parse(raw) };
  } catch {
    /* noop */
  }
}
load();
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

function useSub() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
}

export function useTasks(): TaskRecord[] {
  useSub();
  return data.tasks;
}
export function useMaintenance(): MaintenanceRecord[] {
  useSub();
  return data.maintenance;
}

export function useOpsActions() {
  const addTask = useCallback((r: Omit<TaskRecord, "id" | "createdAt">) => {
    data.tasks.unshift({ id: crypto.randomUUID(), createdAt: Date.now(), ...r });
    persist();
  }, []);
  const removeTask = useCallback((id: string) => {
    data.tasks = data.tasks.filter((t) => t.id !== id);
    persist();
  }, []);
  const completeTask = useCallback((id: string) => {
    const t = data.tasks.find((x) => x.id === id);
    if (t) {
      t.done = true;
      t.doneAt = Date.now();
      persist();
    }
  }, []);
  const addMaint = useCallback((r: Omit<MaintenanceRecord, "id" | "createdAt">) => {
    data.maintenance.unshift({ id: crypto.randomUUID(), createdAt: Date.now(), ...r });
    persist();
  }, []);
  const removeMaint = useCallback((id: string) => {
    data.maintenance = data.maintenance.filter((m) => m.id !== id);
    persist();
  }, []);
  return { addTask, removeTask, completeTask, addMaint, removeMaint };
}
