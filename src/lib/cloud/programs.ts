import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "./realtime";

export type ProgramKind =
  | "irrigation"
  | "fertilisation"
  | "pulverisation"
  | "phytosanitaire"
  | "recolte"
  | "analyse_sol"
  | "analyse_eau";

export type ProgramStatus = "planifie" | "en_cours" | "execute" | "annule";

export interface CloudProgram {
  id: string;
  farm_id: string;
  parcel_id: string;
  kind: ProgramKind;
  payload: Record<string, unknown>;
  total_cost: number;
  scheduled_at: string | null;
  executed_at: string | null;
  executed_by: string | null;
  assigned_to: string | null;
  status: ProgramStatus;
  created_by: string | null;
  created_at: string;
}

const KEY = ["programs"] as const;

export function usePrograms() {
  useRealtimeInvalidate("rt-programs", "module_records", [KEY]);
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<CloudProgram[]> => {
      const { data, error } = await supabase
        .from("module_records")
        .select("*")
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CloudProgram[];
    },
  });
}

export interface CreateProgramInput {
  parcel_id: string;
  kind: ProgramKind;
  payload?: Record<string, unknown>;
  total_cost?: number;
  scheduled_at?: string | null;
  assigned_to?: string | null;
  status?: ProgramStatus;
}

export function useProgramActions() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (input: CreateProgramInput) => {
      const { data: { session: __s } } = await supabase.auth.getSession(); const u = { user: __s?.user ?? null };
      if (!u.user) throw new Error("Non authentifié");
      const { enqueueOp } = await import("@/lib/offline/sync-engine");
      await enqueueOp({
        op: "program.create",
        table: "module_records",
        payload: {
          parcel_id: input.parcel_id,
          kind: input.kind,
          payload: input.payload ?? {},
          total_cost: input.total_cost ?? 0,
          scheduled_at: input.scheduled_at ?? null,
          assigned_to: input.assigned_to ?? null,
          status: input.status ?? (input.scheduled_at ? "planifie" : "execute"),
          created_by: u.user.id,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const markExecuted = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session: __s } } = await supabase.auth.getSession(); const u = { user: __s?.user ?? null };
      const { enqueueOp } = await import("@/lib/offline/sync-engine");
      await enqueueOp({
        op: "program.update",
        table: "module_records",
        record_id: id,
        payload: {
          id,
          patch: {
            status: "execute",
            executed_at: new Date().toISOString(),
            executed_by: u.user?.id ?? null,
          },
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { enqueueOp } = await import("@/lib/offline/sync-engine");
      await enqueueOp({
        op: "program.delete",
        table: "module_records",
        record_id: id,
        payload: { id },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return { create, markExecuted, remove };
}
