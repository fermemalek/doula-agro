import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "./realtime";

export type RecoKind = "fertilisation" | "phytosanitaire" | "irrigation";
export type RecoMethod = "pulverisation" | "irrigation";
export type CropGroup = "oliviers" | "pommiers" | "nectarinier" | "redix25" | "nablara" | "casuarina" | "autres" | "p9" | "p10" | "p11" | "p12";
export type RecoStatus = "envoyee" | "acceptee" | "rejetee" | "transferee";

export interface Recommendation {
  id: string;
  farm_id: string;
  kind: RecoKind;
  title: string;
  comment: string | null;
  parcel_ids: string[];
  payload: Record<string, unknown>;
  photo_urls: string[];
  status: RecoStatus;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  transferred_record_id: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = ["recommendations"] as const;

export function cleanRecoTitle(title: string | null | undefined): string {
  if (!title) return "";
  let s = title.replace(/(\([^)]+\))\s*\1+/g, (_, p1) => p1);
  s = s.replace(/(\((?:Programme|Passage|Traitement)[^)]*\))\s*(\((?:Programme|Passage|Traitement)[^)]*\))/g, (_, _p1, p2) => p2);
  return s.trim();
}

export function useRecommendations() {
  useRealtimeInvalidate("rt-recommendations", "recommendations", [KEY]);
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Recommendation[]> => {
      const { data, error } = await supabase.from("recommendations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        title: cleanRecoTitle(r.title),
      })) as Recommendation[];
    },
  });
}

export interface CreateRecommendationInput {
  kind: RecoKind;
  title: string;
  comment?: string;
  parcel_ids: string[];
  payload?: Record<string, unknown>;
  photo_urls?: string[];
  created_at?: string;
}

export function useRecommendationActions() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (input: CreateRecommendationInput) => {
      const { data: { session: __s } } = await supabase.auth.getSession(); const u = { user: __s?.user ?? null };
      if (!u.user) throw new Error("Non authentifié");
      const newId = crypto.randomUUID();
      const newRecord = {
        id: newId,
        kind: input.kind,
        title: input.title,
        comment: input.comment ?? null,
        parcel_ids: input.parcel_ids,
        payload: input.payload ?? {},
        photo_urls: input.photo_urls ?? [],
        created_by: u.user.id,
        created_at: input.created_at || new Date().toISOString(),
      };

      // 1. Mise à jour optimiste immédiate dans le cache
      qc.setQueryData<Recommendation[]>(KEY, (old) => {
        if (!old) return [newRecord as Recommendation];
        return [newRecord as Recommendation, ...old];
      });

      // 2. Écriture directe dans Supabase cloud pour synchro instantanée entre appareils
      try {
        await supabase.from("recommendations").insert(newRecord as never);
      } catch (err) {
        console.warn("Direct Supabase insert failed, offline sync will retry:", err);
      }

      // 3. File d'attente hors-ligne & déclenchement de la synchronisation
      const { enqueueOp, scheduleSync } = await import("@/lib/offline/sync-engine");
      await enqueueOp({
        op: "recommendation.create",
        table: "recommendations",
        record_id: newId,
        payload: newRecord,
      });
      scheduleSync();

      return newRecord as Recommendation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const queueReview = async (id: string, status: "acceptee" | "rejetee") => {
    const { data: { session: __s } } = await supabase.auth.getSession();
    const u = { user: __s?.user ?? null };
    const reviewedAt = new Date().toISOString();

    // 1. Optimistic update in query cache for instant UI response
    qc.setQueryData<Recommendation[]>(KEY, (old) => {
      if (!old) return old;
      return old.map((r) =>
        r.id === id ? { ...r, status, reviewed_at: reviewedAt } : r
      );
    });

    // 2. Direct update to Supabase for immediate cloud persistence
    try {
      await supabase
        .from("recommendations")
        .update({
          status,
          reviewed_by: u.user?.id ?? null,
          reviewed_at: reviewedAt,
        })
        .eq("id", id);
    } catch (err) {
      console.warn("Direct update to recommendations failed, offline sync will retry:", err);
    }

    // 3. Enqueue offline op as fallback / sync tracking
    const { enqueueOp, scheduleSync } = await import("@/lib/offline/sync-engine");
    const cur = qc.getQueryData<Recommendation[]>(KEY)?.find((r) => r.id === id);
    await enqueueOp({
      op: "recommendation.update",
      table: "recommendations",
      record_id: id,
      base_updated_at: cur?.updated_at ?? null,
      payload: {
        id,
        base_updated_at: cur?.updated_at ?? null,
        patch: {
          status,
          reviewed_by: u.user?.id ?? null,
          reviewed_at: reviewedAt,
        },
      },
    });
    scheduleSync();
  };

  const accept = useMutation({
    mutationFn: async (id: string) => queueReview(id, "acceptee"),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => queueReview(id, "rejetee"),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      comment?: string | null;
      parcel_ids: string[];
      payload?: Record<string, unknown>;
      photo_urls?: string[];
    }) => {
      const { enqueueOp } = await import("@/lib/offline/sync-engine");
      const cur = qc.getQueryData<Recommendation[]>(KEY)?.find((r) => r.id === input.id);
      await enqueueOp({
        op: "recommendation.update",
        table: "recommendations",
        record_id: input.id,
        base_updated_at: cur?.updated_at ?? null,
        payload: {
          id: input.id,
          base_updated_at: cur?.updated_at ?? null,
          patch: {
            title: input.title,
            comment: input.comment ?? null,
            parcel_ids: input.parcel_ids,
            payload: input.payload ?? {},
            photo_urls: input.photo_urls ?? [],
          },
        },
      });
      return { id: input.id } as Recommendation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // 1. Retrait optimiste immédiat de l'interface
      qc.setQueryData<Recommendation[]>(KEY, (old) => {
        if (!old) return [];
        return old.filter((r) => r.id !== id);
      });

      // 2. Suppression directe dans Supabase cloud
      try {
        await supabase.from("recommendations").delete().eq("id", id);
      } catch (err) {
        console.warn("Direct delete failed, offline sync will retry:", err);
      }

      // 3. File d'attente hors-ligne & déclenchement synchro
      const { enqueueOp, scheduleSync } = await import("@/lib/offline/sync-engine");
      await enqueueOp({
        op: "recommendation.delete",
        table: "recommendations",
        record_id: id,
        payload: { id },
      });
      scheduleSync();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return { create, update, accept, reject, remove };
}

/** Upload photos via le tampon offline (compression auto + retry). */
export async function uploadRecommendationPhotos(files: File[]): Promise<string[]> {
  const { data: { session: __s } } = await supabase.auth.getSession(); const u = { user: __s?.user ?? null };
  if (!u.user) throw new Error("Non authentifié");
  const { queuePhotosForUpload } = await import("@/lib/offline/photos");
  return queuePhotosForUpload({
    files,
    userId: u.user.id,
    folder: "recommendations",
  });
}
