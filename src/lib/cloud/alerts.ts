import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "./realtime";

export type AlertKind = "fuite" | "tuyau" | "maladie" | "autre" | "casse";
export type AlertStatus =
  | "ouvert"
  | "vue"
  | "assignee"
  | "en_cours"
  | "resolu"
  | "validee";

export interface CloudAlert {
  id: string;
  farm_id: string;
  parcel_id: string;
  tree_id: string | null;
  kind: AlertKind;
  type: AlertKind | null;
  message: string | null;
  comment: string | null;
  status: AlertStatus;
  l: number | null;
  p: number | null;
  photo_urls: string[];
  assigned_to: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  source_role: "admin" | "executant" | "ingenieur" | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = ["alerts"] as const;

export function useAdminIds() {
  return useQuery({
    queryKey: ["admin-ids"],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.user_id as string));
    },
    staleTime: 5 * 60_000,
  });
}

export function useProfilesMap() {
  return useQuery({
    queryKey: ["profiles-map"],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.id as string] = (r.full_name as string) ?? "";
      return map;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAlerts() {
  useRealtimeInvalidate("rt-alerts", "alerts", [KEY]);
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<CloudAlert[]> => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CloudAlert[];
    },
  });
}

export interface CreateAlertInput {
  parcel_id: string;
  type: AlertKind;
  comment?: string;
  photo_urls?: string[];
  tree_id?: string | null;
  l?: number | null;
  p?: number | null;
  /** UI role at the moment of declaration (separate from authenticated identity). */
  source_role?: "admin" | "executant" | "ingenieur";
}

export function useAlertActions() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      const { data: { session: __s } } = await supabase.auth.getSession();
      const u = { user: __s?.user ?? null };
      if (!u.user) throw new Error("Non authentifié");
      const client_id = crypto.randomUUID();
      const nowIso = new Date().toISOString();
      // Optimistic insert so the new alert shows up immediately everywhere
      qc.setQueryData<CloudAlert[]>(KEY, (prev) => {
        const optimistic: CloudAlert = {
          id: client_id,
          farm_id: "00000000-0000-0000-0000-000000000001",
          parcel_id: input.parcel_id,
          tree_id: input.tree_id ?? null,
          kind: input.type,
          type: input.type,
          message: input.comment ?? null,
          comment: input.comment ?? null,
          status: "ouvert",
          l: input.l ?? null,
          p: input.p ?? null,
          photo_urls: input.photo_urls ?? [],
          assigned_to: null,
          resolved_at: null,
          resolved_by: null,
          source_role: input.source_role ?? null,
          created_by: u.user!.id,
          created_at: nowIso,
          updated_at: nowIso,
        };
        return [optimistic, ...(prev ?? [])];
      });
      const { enqueueOp } = await import("@/lib/offline/sync-engine");
      await enqueueOp({
        client_id,
        op: "alert.create",
        table: "alerts",
        payload: {
          parcel_id: input.parcel_id,
          kind: input.type,
          type: input.type,
          comment: input.comment ?? null,
          message: input.comment ?? null,
          photo_urls: input.photo_urls ?? [],
          tree_id: input.tree_id ?? null,
          l: input.l ?? null,
          p: input.p ?? null,
          source_role: input.source_role ?? null,
          created_by: u.user.id,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session: __s } } = await supabase.auth.getSession(); const u = { user: __s?.user ?? null };
      const { enqueueOp } = await import("@/lib/offline/sync-engine");
      const cur = qc.getQueryData<CloudAlert[]>(KEY)?.find((a) => a.id === id);
      await enqueueOp({
        op: "alert.update",
        table: "alerts",
        record_id: id,
        base_updated_at: cur?.updated_at ?? null,
        payload: {
          id,
          base_updated_at: cur?.updated_at ?? null,
          patch: {
            status: "resolu",
            resolved_at: new Date().toISOString(),
            resolved_by: u.user?.id ?? null,
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
        op: "alert.delete",
        table: "alerts",
        record_id: id,
        payload: { id },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return { create, resolve, remove };
}

/** Upload photos via le tampon offline (compression auto + retry). */
export async function uploadAlertPhotos(files: File[]): Promise<string[]> {
  const { data: { session: __s } } = await supabase.auth.getSession(); const u = { user: __s?.user ?? null };
  if (!u.user) throw new Error("Non authentifié");
  const { queuePhotosForUpload } = await import("@/lib/offline/photos");
  return queuePhotosForUpload({
    files,
    userId: u.user.id,
    folder: "alerts",
  });
}

/** Renvoie une URL signée pour afficher une photo. */
export async function signedPhotoUrl(path: string, expiresSec = 3600) {
  const { data } = await supabase.storage
    .from("parcel-photos")
    .createSignedUrl(path, expiresSec);
  return data?.signedUrl ?? null;
}
