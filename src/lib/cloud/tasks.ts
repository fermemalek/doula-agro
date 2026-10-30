import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/role";
import { useRealtimeInvalidate } from "./realtime";

export type TaskKind =
  | "generale"
  | "irrigation"
  | "fertilisation"
  | "pulverisation"
  | "maintenance"
  | "recolte"
  | "correction_anomalie";

export type TaskPriority = "basse" | "normale" | "haute" | "urgente";
export type TaskStatus = "a_faire" | "en_cours" | "fait" | "rejete" | "annule";

export interface CloudTask {
  id: string;
  farm_id: string;
  parcel_id: string | null;
  title: string;
  description: string | null;
  kind: TaskKind;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  linked_alert_id: string | null;
  recurrence: unknown;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = ["tasks"] as const;

export function useTasks() {
  useRealtimeInvalidate("rt-tasks", "tasks", [KEY]);
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<CloudTask[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CloudTask[];
    },
  });
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  kind?: TaskKind;
  priority?: TaskPriority;
  due_date?: string | null;
  parcel_id?: string | null;
  assigned_to?: string | null;
  linked_alert_id?: string | null;
}

export function useTaskActions() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: { session: __s } } = await supabase.auth.getSession(); const u = { user: __s?.user ?? null };
      if (!u.user) throw new Error("Non authentifié");
      const { enqueueOp } = await import("@/lib/offline/sync-engine");
      await enqueueOp({
        op: "task.create",
        table: "tasks",
        payload: {
          title: input.title,
          description: input.description ?? null,
          kind: input.kind ?? "generale",
          priority: input.priority ?? "normale",
          due_date: input.due_date ?? null,
          parcel_id: input.parcel_id ?? null,
          assigned_to: input.assigned_to ?? null,
          linked_alert_id: input.linked_alert_id ?? null,
          created_by: u.user.id,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const queueUpdate = async (id: string, patch: Record<string, unknown>) => {
    const { enqueueOp } = await import("@/lib/offline/sync-engine");
    const cur = qc.getQueryData<CloudTask[]>(KEY)?.find((t) => t.id === id);
    await enqueueOp({
      op: "task.update",
      table: "tasks",
      record_id: id,
      base_updated_at: cur?.updated_at ?? null,
      payload: { id, base_updated_at: cur?.updated_at ?? null, patch },
    });
  };

  const markDone = useMutation({
    mutationFn: async (id: string) => queueUpdate(id, { status: "fait" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      queueUpdate(id, { status: "a_faire", reject_reason: reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { enqueueOp } = await import("@/lib/offline/sync-engine");
      await enqueueOp({ op: "task.delete", table: "tasks", record_id: id, payload: { id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      queueUpdate(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return { create, markDone, reject, remove, update };
}

/** Liste des exécutants/administrateurs disponibles pour les tâches (exclut les comptes ingénieurs). */
export function useExecutants() {
  return useQuery({
    queryKey: ["executants"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      if (!profiles || profiles.length === 0) {
        return [] as {
          id: string;
          name: string;
          role: string;
          phone: string | null;
          email: string | null;
        }[];
      }

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r) => {
        roleMap.set(r.user_id, r.role as string);
      });

      return profiles
        .filter((p) => Boolean(p.full_name && p.full_name.trim()))
        .map((p) => {
          const raw = (p.phone || "").trim();
          let email: string | null = null;
          let phone: string | null = null;
          if (raw.includes("|")) {
            const [first, second] = raw.split("|");
            email = first?.trim() || null;
            phone = second?.trim() || null;
          } else if (raw.includes("@")) {
            email = raw;
          } else if (raw) {
            phone = raw;
          }
          return {
            id: p.id,
            name: p.full_name!.trim(),
            role: roleMap.get(p.id) || "executant",
            phone,
            email,
          };
        })
        .filter((e) => {
          const r = (e.role || "").toLowerCase();
          const n = (e.name || "").toLowerCase();
          const em = (e.email || "").toLowerCase();
          // Exclure tous les comptes ingénieurs (ainsi que le compte khadij) du module Tâches
          if (r === "ingenieur") return false;
          if (n.includes("khadij") || em.includes("doujadz")) return false;
          return true;
        });
    },
  });
}

/**
 * Retourne les tâches en cours assignées à l'utilisateur actuellement connecté
 * (fonctionne aussi bien pour un Exécutant que pour un Administrateur comme Abderrahmane ou Abdelmalek,
 * même si la connexion s'est faite via un alias e-mail/identifiant).
 */
export function useMyAssignedTasks() {
  const { data: tasks = [] } = useTasks();
  const { data: executants = [] } = useExecutants();
  const { userId, session } = useRole();

  return useMemo(() => {
    const matchedIds = new Set<string>();
    if (userId && userId !== "00000000-0000-0000-0000-000000000000") {
      matchedIds.add(userId);
    }

    const sessionEmail = (session?.user?.email || "").trim().toLowerCase();
    const sessionLocal = sessionEmail.includes("@") ? sessionEmail.split("@")[0] : sessionEmail;
    const sessionFullName = ((session?.user?.user_metadata?.full_name as string) || "")
      .trim()
      .toLowerCase();

    let matchedMemberName: string | null = null;

    for (const ex of executants) {
      const exName = ex.name.trim().toLowerCase();
      const exEmail = (ex.email || "").trim().toLowerCase();
      const exEmailLocal = exEmail.includes("@") ? exEmail.split("@")[0] : exEmail;

      const isDirectId = ex.id === userId;
      const isEmailMatch =
        Boolean(sessionEmail) &&
        sessionEmail !== "agri@farmfriendy.local" &&
        (exEmail === sessionEmail ||
          exEmailLocal === sessionLocal ||
          sessionLocal.includes(exName) ||
          (exEmailLocal && sessionLocal.includes(exEmailLocal)));
      const isNameMatch =
        Boolean(sessionFullName) &&
        sessionFullName !== "administrateur" &&
        exName === sessionFullName;

      if (isDirectId || isEmailMatch || isNameMatch) {
        matchedIds.add(ex.id);
        if (!matchedMemberName) matchedMemberName = ex.name;
      }
    }

    const myTasks = tasks.filter(
      (t) =>
        (t.status === "a_faire" || t.status === "en_cours") &&
        Boolean(t.assigned_to && matchedIds.has(t.assigned_to)),
    );

    return {
      myTasks,
      matchedIds,
      matchedMemberName,
    };
  }, [tasks, executants, userId, session]);
}

const EXTERNAL_WORKERS_STORAGE_KEY = "doula-external-workers";

export function getSavedExternalWorkers(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXTERNAL_WORKERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string" && x.trim()) : [];
  } catch {
    return [];
  }
}

export function saveExternalWorkersList(names: string[]) {
  if (typeof window === "undefined") return;
  try {
    const unique = Array.from(
      new Set(names.map((n) => n.trim()).filter(Boolean)),
    );
    localStorage.setItem(EXTERNAL_WORKERS_STORAGE_KEY, JSON.stringify(unique));
  } catch {}
}

/**
 * Encode les noms des autres exécutants (sans compte dans l'application) dans la description
 * sous la forme "[Exécutants: Nom1, Nom2] Description..."
 */
export function packTaskDescription(
  cleanDescription: string,
  externalWorkers: string[],
  reminderPrefix = "",
): string | null {
  const workers = Array.from(
    new Set(externalWorkers.map((w) => w.trim()).filter(Boolean)),
  );
  const workersTag = workers.length > 0 ? `[Exécutants: ${workers.join(", ")}] ` : "";
  const prefix = reminderPrefix.trim() ? `${reminderPrefix.trim()} ` : "";
  const combined = `${workersTag}${prefix}${cleanDescription.trim()}`.trim();
  return combined || null;
}

/**
 * Extrait les noms des autres exécutants (sans compte) et la description propre.
 */
export function unpackTaskDescription(rawDescription: string | null | undefined): {
  externalWorkers: string[];
  cleanDescription: string;
  reminderPrefix: string;
} {
  const full = (rawDescription || "").trim();
  const workersMatch = full.match(/^(\[Ex[^\]:]*cutants:\s*[^\]]+\])\s*(.*)$/s);
  const workersPart = workersMatch ? workersMatch[1] : "";
  const rest = workersMatch ? workersMatch[2] : full;
  const remMatch = rest.match(/^(\[Rappel:[^\]]*\])\s*(.*)$/s);
  const reminderPrefix = remMatch ? remMatch[1] : "";
  const raw = (workersPart ? workersPart + " " : "") + (remMatch ? remMatch[2] : rest);
  const res = unpackWorkers(raw.trim());
  return { ...res, reminderPrefix };
}

function unpackWorkers(rawDescription: string): {
  externalWorkers: string[];
  cleanDescription: string;
} {
  const raw = rawDescription.trim();
  const match = raw.match(/^\[Exécutants:\s*([^\]]+)\]\s*(.*)$/s);
  if (!match) {
    return { externalWorkers: [], cleanDescription: raw };
  }
  const workers = match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    externalWorkers: workers,
    cleanDescription: (match[2] || "").trim(),
  };
}
