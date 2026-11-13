import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "./realtime";
import { deletePurchasesForReco } from "@/lib/suppliers-store";

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

const LOCAL_DELETED_KEY = "doula_deleted_recos";

export function getLocalDeletedRecoIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return new Set(list);
  } catch {
    return new Set();
  }
}

export function addLocalDeletedRecoId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const s = getLocalDeletedRecoIds();
    s.add(id);
    localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(Array.from(s)));
  } catch {}
}

export function cleanRecoTitle(title: string | null | undefined): string {
  if (!title) return "";
  let s = title.replace(/(\([^)]+\))\s*\1+/g, (_, p1) => p1);
  s = s.replace(/(\((?:Programme|Passage|Traitement)[^)]*\))\s*(\((?:Programme|Passage|Traitement)[^)]*\))/g, (_, _p1, p2) => p2);
  return s.trim();
}

export function useRecommendations() {
  useRealtimeInvalidate("rt-recommendations", "recommendations", [KEY]);
  useRealtimeInvalidate("rt-deleted-recos", "supplier_purchases", [KEY]);

  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Recommendation[]> => {
      // 1. Lire toutes les recommandations depuis Supabase
      const { data, error } = await supabase.from("recommendations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // 2. Lire les suppressions synchronisées dans le cloud (supplier_purchases)
      const cloudDeletedIds = new Set<string>();
      try {
        const { data: delRecords } = await (supabase as any)
          .from("supplier_purchases")
          .select("product_name")
          .eq("supplier_name", "__SYSTEM_DELETED_RECO__");
        if (delRecords) {
          delRecords.forEach((r: any) => {
            if (r.product_name) cloudDeletedIds.add(r.product_name);
          });
        }
      } catch (err) {
        console.warn("[recommendations] Cloud deletion sync lookup skipped:", err);
      }

      // 3. Lire les suppressions enregistrées localement
      const localDeletedIds = getLocalDeletedRecoIds();
      const allDeletedIds = new Set([...cloudDeletedIds, ...localDeletedIds]);

      // 4. Filtrer les recommandations supprimées
      const valid = (data ?? []).filter((r: any) => {
        if (!r || !r.id) return false;
        if (allDeletedIds.has(r.id)) return false;
        if (r.payload?.deleted === true) return false;
        if (typeof r.title === "string" && r.title.startsWith("[SUPPRIMÉ]")) return false;
        if (typeof r.title === "string" && r.title.startsWith("__SYSTEM_")) return false;
        return true;
      });

      return valid.map((r) => {
        let title = cleanRecoTitle(r.title);
        let payload = (r.payload || {}) as Record<string, any>;

        // Correction agronomique des prescriptions du 09 Mars 2026 (distinctes A1/A2 et Passage 1/Passage 2)
        if (r.id === "f1134c54-4d72-4ac1-adec-fc351da039dd" || (title.includes("2026-03-09") && payload.program?.entries?.some((e: any) => e.bac === "B"))) {
          title = "NABLARA, REDIX 25 - 2026-03-09 (Programme A2)";
          if (payload.program) {
            payload = { ...payload, program: { ...payload.program, label: "Programme A2" } };
          }
        } else if (r.id === "9c93efd3-9f1a-402d-9bbb-e498ec8ab34d" || (title.includes("2026-03-09") && payload.program?.items?.some((it: any) => (it.name || "").includes("Algreen")))) {
          title = "NABLARA, REDIX 25 - 2026-03-09 (Passage 2)";
          if (payload.program) {
            payload = { ...payload, program: { ...payload.program, label: "Passage 2" } };
          }
        }

        return {
          ...r,
          title,
          payload,
        };
      }) as Recommendation[];
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
  status?: RecoStatus;
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
        status: input.status || "envoyee",
        created_by: u.user.id,
        created_at: input.created_at || new Date().toISOString(),
      };

      // 1. Mise à jour optimiste immédiate dans le cache
      qc.setQueryData<Recommendation[]>(KEY, (old) => {
        if (!old) return [newRecord as Recommendation];
        return [newRecord as Recommendation, ...old];
      });

      // 2. Écriture directe dans Supabase cloud pour synchro instantanée entre appareils
      let directInserted = false;
      try {
        const { error } = await supabase.from("recommendations").insert(newRecord as never);
        if (!error) directInserted = true;
      } catch (err) {
        console.warn("Direct Supabase insert failed, offline sync will retry:", err);
      }

      // 3. File d'attente hors-ligne seulement si l'insertion directe a échoué (mode hors-ligne)
      if (!directInserted) {
        const { enqueueOp, scheduleSync } = await import("@/lib/offline/sync-engine");
        await enqueueOp({
          op: "recommendation.create",
          table: "recommendations",
          record_id: newId,
          payload: newRecord,
        });
        scheduleSync();
      }

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
    let directUpdated = false;
    try {
      const { error } = await supabase
        .from("recommendations")
        .update({
          status,
          reviewed_by: u.user?.id ?? null,
          reviewed_at: reviewedAt,
        })
        .eq("id", id);
      if (!error) directUpdated = true;
    } catch (err) {
      console.warn("Direct update to recommendations failed, offline sync will retry:", err);
    }

    // 3. Enqueue offline op ONLY if direct update failed (mode hors-ligne)
    if (!directUpdated) {
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
    }
  };

  const accept = useMutation({
    mutationFn: async (id: string) => queueReview(id, "acceptee"),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => queueReview(id, "rejetee"),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const resetAllToPending = useMutation({
    mutationFn: async () => {
      // 1. Mise à jour optimiste immédiate dans le cache
      qc.setQueryData<Recommendation[]>(KEY, (old) => {
        if (!old) return old;
        return old.map((r) => ({
          ...r,
          status: "envoyee" as RecoStatus,
          reviewed_at: null,
          reviewed_by: null,
          transferred_record_id: null,
        }));
      });

      // 2. Mise à jour directe dans Supabase pour toutes les recommandations
      try {
        await (supabase as any)
          .from("recommendations")
          .update({
            status: "envoyee",
            reviewed_at: null,
            reviewed_by: null,
            transferred_record_id: null,
          })
          .neq("id", "00000000-0000-0000-0000-000000000000");
      } catch (err) {
        console.warn("[recommendations] Direct resetAllToPending failed:", err);
      }

      // 3. Purge locale des enregistrements générés
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("doula-modules");
          localStorage.removeItem("doula-suppliers");
        } catch {}
      }

      // 4. Dual-clean des achats dans Supabase
      try {
        await (supabase as any)
          .from("supplier_purchases")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
      } catch {}
    },
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
      status?: RecoStatus;
    }) => {
      const nowIso = new Date().toISOString();
      const patch: Record<string, unknown> = {
        title: input.title,
        comment: input.comment ?? null,
        parcel_ids: input.parcel_ids,
        payload: input.payload ?? {},
        photo_urls: input.photo_urls ?? [],
        ...(input.status ? { status: input.status } : {}),
        updated_at: nowIso,
      };

      // 1. Mise à jour optimiste immédiate dans React Query cache
      qc.setQueryData<Recommendation[]>(KEY, (old) => {
        if (!old) return old;
        return old.map((r) => (r.id === input.id ? { ...r, ...patch } : r));
      });

      // 2. Écriture directe immédiate dans Supabase
      let directUpdated = false;
      try {
        const { error } = await supabase
          .from("recommendations")
          .update(patch as never)
          .eq("id", input.id);
        if (!error) directUpdated = true;
      } catch (err) {
        console.warn("Direct update to recommendations failed:", err);
      }

      // 3. File d'attente hors-ligne seulement si l'écriture directe a échoué
      if (!directUpdated) {
        const { enqueueOp, scheduleSync } = await import("@/lib/offline/sync-engine");
        const cur = qc.getQueryData<Recommendation[]>(KEY)?.find((r) => r.id === input.id);
        await enqueueOp({
          op: "recommendation.update",
          table: "recommendations",
          record_id: input.id,
          base_updated_at: cur?.updated_at ?? null,
          payload: {
            id: input.id,
            base_updated_at: cur?.updated_at ?? null,
            patch,
          },
        });
        scheduleSync();
      }

      return { id: input.id, ...patch } as unknown as Recommendation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // 1. Enregistrer immédiatement dans le cache local permanent
      addLocalDeletedRecoId(id);

      // Nettoyer aussi les achats fournisseurs générés par cette recommandation
      try {
        const targetReco = qc.getQueryData<Recommendation[]>(KEY)?.find((r) => r.id === id);
        const productNames: string[] = [];
        const pProgram = (targetReco?.payload as any)?.program;
        if (Array.isArray(pProgram?.products)) {
          for (const pr of pProgram.products) {
            const n = (pr.product || pr.name)?.trim();
            if (n) productNames.push(n);
          }
        }
        deletePurchasesForReco(id, productNames);
      } catch (err) {
        console.warn("deletePurchasesForReco error:", err);
      }

      // 2. Nettoyer aussi les modules et l'historique phyto locaux
      if (typeof window !== "undefined") {
        try {
          const rawMod = localStorage.getItem("doula-modules");
          if (rawMod) {
            const parsed = JSON.parse(rawMod);
            let changed = false;
            for (const pid of Object.keys(parsed)) {
              for (const modKey of ["phytosanitaire", "fertilisation", "irrigation", "pulverisation"]) {
                const arr = parsed[pid]?.[modKey];
                if (Array.isArray(arr)) {
                  const f = arr.filter((r: any) => r.id !== id && r.reco_id !== id);
                  if (f.length !== arr.length) {
                    parsed[pid][modKey] = f;
                    changed = true;
                  }
                }
              }
            }
            if (changed) localStorage.setItem("doula-modules", JSON.stringify(parsed));
          }
          const rawHist = localStorage.getItem("doula_dismissed_phyto_history");
          const histList: string[] = rawHist ? JSON.parse(rawHist) : [];
          if (!histList.includes(id)) histList.push(id, `reco-${id}`);
          localStorage.setItem("doula_dismissed_phyto_history", JSON.stringify(histList));
        } catch {}
      }

      // 3. Retrait optimiste immédiat du cache React Query
      qc.setQueryData<Recommendation[]>(KEY, (old) => {
        if (!old) return [];
        return old.filter((r) => r.id !== id);
      });

      // 4. Enregistrement de la suppression dans le Cloud Supabase (accessible à tous les utilisateurs authentifiés)
      try {
        await (supabase as any).from("supplier_purchases").upsert({
          id: `del_reco_${id}`,
          farm_id: "00000000-0000-0000-0000-000000000001",
          supplier_name: "__SYSTEM_DELETED_RECO__",
          product_name: id,
          purchase_date: new Date().toISOString(),
          quantity: 0,
          unit: "reco",
          price_per_unit: 0,
          total_cost: 0,
          paid_amount: 0,
          consumed: 0,
        });
      } catch (err) {
        console.warn("[recommendations] Cloud deletion marker upsert error:", err);
      }

      // 5. Tentative de soft-delete direct dans la table recommendations
      try {
        await supabase
          .from("recommendations")
          .update({
            payload: { deleted: true, deleted_at: new Date().toISOString() },
            title: `[SUPPRIMÉ] ${id}`,
            status: "rejetee",
          } as never)
          .eq("id", id);
      } catch (err) {
        console.warn("[recommendations] Soft-delete error:", err);
      }

      // 6. Tentative de hard-delete direct dans Supabase (fonctionne si admin)
      try {
        await supabase.from("recommendations").delete().eq("id", id);
      } catch (err) {
        console.warn("[recommendations] Direct hard-delete error:", err);
      }

      // 7. File d'attente hors-ligne si besoin
      try {
        const { enqueueOp, scheduleSync } = await import("@/lib/offline/sync-engine");
        await enqueueOp({
          op: "recommendation.delete",
          table: "recommendations",
          record_id: id,
          payload: { id },
        });
        scheduleSync();
      } catch {}
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return { create, update, accept, reject, remove, resetAllToPending };
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
