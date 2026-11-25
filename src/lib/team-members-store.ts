import { useCallback, useEffect, useState } from "react";

export type TeamRolePreset = "Superviseur" | "Exécutant" | "Manœuvre";
export type TeamAvailabilityStatus = "libre" | "occupe" | "absent";

export interface TeamMember {
  id: string;
  name: string;
  role: string; // "Superviseur" | "Exécutant" | "Manœuvre" | libellé personnalisé
  status: TeamAvailabilityStatus;
  createdAt: number;
}

export const TEAM_ROLE_PRESETS: { value: TeamRolePreset; labelFr: string; labelAr: string }[] = [
  { value: "Superviseur", labelFr: "Superviseur", labelAr: "مشرف" },
  { value: "Exécutant", labelFr: "Exécutant", labelAr: "منفذ" },
  { value: "Manœuvre", labelFr: "Manœuvre", labelAr: "عامل" },
];

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: "team_abderrahmane", name: "Abderrahmane", role: "Superviseur", status: "libre", createdAt: 1 },
  { id: "team_abdelmalek", name: "Abdelmalek", role: "Superviseur", status: "libre", createdAt: 2 },
  { id: "team_mohcherif", name: "Mohcherif", role: "Exécutant", status: "libre", createdAt: 3 },
  { id: "team_ghanou", name: "Ghanou", role: "Exécutant", status: "libre", createdAt: 4 },
  { id: "team_djilali", name: "Djilali", role: "Exécutant", status: "libre", createdAt: 5 },
  { id: "team_aboubacar", name: "Aboubacar", role: "Manœuvre", status: "libre", createdAt: 6 },
  { id: "team_ali", name: "Ali", role: "Manœuvre", status: "libre", createdAt: 7 },
];

const STORAGE_KEY = "doula_team_members_v1";
const MIGRATION_FLAG_KEY = "doula_team_members_migrated_real_7_v1";

let membersState: TeamMember[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(membersState));
  } catch {
    // ignore storage quota errors
  }
  notify();
}

function loadAndMigrate() {
  if (typeof window === "undefined") {
    membersState = DEFAULT_TEAM_MEMBERS.map((m) => ({ ...m }));
    return;
  }

  let alreadyMigrated = false;
  try {
    alreadyMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === "1";
  } catch {
    alreadyMigrated = false;
  }

  if (!alreadyMigrated) {
    // Migration unique : purger les anciens 19 profils par défaut / ouvriers externes hérités
    // et initialiser exactement les 7 membres réels de la ferme.
    membersState = DEFAULT_TEAM_MEMBERS.map((m) => ({ ...m }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(membersState));
      localStorage.setItem(MIGRATION_FLAG_KEY, "1");
    } catch {
      // ignore
    }
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        membersState = parsed
          .filter((x) => x && typeof x.name === "string" && x.name.trim())
          .map((x) => ({
            id: String(x.id || `team_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
            name: String(x.name).trim(),
            role: String(x.role || "Exécutant").trim(),
            status: (x.status === "occupe" || x.status === "absent" ? x.status : "libre") as TeamAvailabilityStatus,
            createdAt: Number(x.createdAt) || Date.now(),
          }));
        return;
      }
    }
  } catch {
    // fallback
  }

  membersState = DEFAULT_TEAM_MEMBERS.map((m) => ({ ...m }));
  persist();
}

loadAndMigrate();

export function getTeamRoleLabel(role: string, isAr: boolean): string {
  const norm = role.trim().toLowerCase();
  if (norm === "superviseur" || norm === "مشرف") return isAr ? "مشرف" : "Superviseur";
  if (norm === "exécutant" || norm === "executant" || norm === "منفذ") return isAr ? "منفذ" : "Exécutant";
  if (norm === "manœuvre" || norm === "manoeuvre" || norm === "عامل") return isAr ? "عامل" : "Manœuvre";
  return role;
}

export function getTeamRoleOrder(role: string): number {
  const norm = role.trim().toLowerCase();
  if (norm === "superviseur" || norm === "مشرف") return 0;
  if (norm === "exécutant" || norm === "executant" || norm === "منفذ") return 1;
  if (norm === "manœuvre" || norm === "manoeuvre" || norm === "عامل") return 2;
  return 3;
}

export function useTeamMembersStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadAndMigrate();
        fn();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(fn);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const addMember = useCallback(
    (input: { name: string; role: string; status?: TeamAvailabilityStatus }) => {
      const cleanName = input.name.trim();
      if (!cleanName) return;
      const item: TeamMember = {
        id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        role: input.role.trim() || "Exécutant",
        status: input.status || "libre",
        createdAt: Date.now(),
      };
      membersState = [...membersState, item];
      persist();
    },
    [],
  );

  const updateMember = useCallback(
    (id: string, patch: Partial<Pick<TeamMember, "name" | "role" | "status">>) => {
      membersState = membersState.map((m) =>
        m.id === id
          ? {
              ...m,
              ...(patch.name !== undefined ? { name: patch.name.trim() || m.name } : {}),
              ...(patch.role !== undefined ? { role: patch.role.trim() || m.role } : {}),
              ...(patch.status !== undefined ? { status: patch.status } : {}),
            }
          : m,
      );
      persist();
    },
    [],
  );

  const removeMember = useCallback((id: string) => {
    membersState = membersState.filter((m) => m.id !== id);
    persist();
  }, []);

  return {
    members: membersState,
    addMember,
    updateMember,
    removeMember,
  };
}
