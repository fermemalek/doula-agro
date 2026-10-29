import { useEffect, useState, useCallback } from "react";
import { SPRING_SCHEDULE, SUMMER_SCHEDULE, type SequentialSchedule } from "@/data/extra_farm_data";

const KEY = "doula-sequential-schedules";

export interface DBSequentialSchedule extends SequentialSchedule {
  id: string;
}

let schedules: DBSequentialSchedule[] = [];
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      schedules = JSON.parse(raw);
    } else {
      schedules = [
        { id: "spring", ...SPRING_SCHEDULE },
        { id: "summer", ...SUMMER_SCHEDULE },
      ];
      localStorage.setItem(KEY, JSON.stringify(schedules));
    }
  } catch {
    schedules = [];
  }
}

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(schedules));
  }
  listeners.forEach((l) => l());
}

load();

export function useSequentialSchedules() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const addSchedule = useCallback((s: Omit<DBSequentialSchedule, "id">) => {
    const newSchedule = { id: crypto.randomUUID(), ...s };
    schedules.push(newSchedule);
    persist();
    return newSchedule.id;
  }, []);

  const updateSchedule = useCallback((id: string, patch: Partial<Omit<DBSequentialSchedule, "id">>) => {
    const idx = schedules.findIndex((s) => s.id === id);
    if (idx >= 0) {
      schedules[idx] = { ...schedules[idx], ...patch };
      persist();
    }
  }, []);

  const deleteSchedule = useCallback((id: string) => {
    schedules = schedules.filter((s) => s.id !== id);
    persist();
  }, []);

  return {
    schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
