import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

/** Liste des exécutants disponibles pour l'assignation (basée uniquement sur les profils existants). */
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
        });
    },
  });
}
