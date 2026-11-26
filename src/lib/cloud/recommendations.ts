import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "./realtime";
import { deletePurchasesForReco } from "@/lib/suppliers-store";
import { sendRemotePushAlert } from "@/lib/push-fcm";

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
  } catch { }
}

const STATUS_OVERRIDES_KEY = "doula_recos_status_overrides";

export function getRecoStatusOverrides(): Record<string, RecoStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STATUS_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setRecoStatusOverride(id: string, status: RecoStatus) {
  if (typeof window === "undefined") return;
  try {
    const overrides = getRecoStatusOverrides();
    overrides[id] = status;
    localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch { }
}

export function resetAllRecoStatusOverrides(allIds: string[]) {
  if (typeof window === "undefined") return;
  try {
    const overrides: Record<string, RecoStatus> = {};
    for (const id of allIds) {
      overrides[id] = "envoyee";
    }
    localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch { }
}

export function cleanRecoTitle(title: string | null | undefined): string {
  if (!title) return "";
  let s = title.replace(/(\([^)]+\))\s*\1+/g, (_, p1) => p1);
  s = s.replace(/(\((?:Programme|Passage|Traitement|Pulvérisation)[^)]*\))\s*(\((?:Programme|Passage|Traitement|Pulvérisation)[^)]*\))/gi, (_, _p1, p2) => p2);
  // Remplacer dans toutes les recommandations le mot "Passage" par "Pulvérisation" en conservant la numérotation
  s = s.replace(/\bPassage\s*(\d+)/gi, "Pulvérisation $1");
  s = s.replace(/\bPassage\b/gi, "Pulvérisation");
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

      // Supabase est la source de vérité autoritaire : purger les anciens overrides locaux
      // afin qu'un autre PC ne réaffiche jamais d'anciens statuts "acceptee" après une réinitialisation cloud.
      if (typeof window !== "undefined" && Array.isArray(data)) {
        try {
          localStorage.removeItem(STATUS_OVERRIDES_KEY);
        } catch { }
      }

      return valid.map((r) => {
        let title = cleanRecoTitle(r.title);
        let payload = (r.payload || {}) as Record<string, any>;
        const status = (r.status ?? "envoyee") as RecoStatus;

        // Remplacement systématique de Passage par Pulvérisation dans le titre et les sous-programmes
        title = title.replace(/\bPassage\s*(\d+)/gi, "Pulvérisation $1").replace(/\bPassage\b/gi, "Pulvérisation");

        if (payload.program?.label && typeof payload.program.label === "string") {
          const newLabel = payload.program.label
            .replace(/\bPassage\s*(\d+)/gi, "Pulvérisation $1")
            .replace(/\bPassage\b/gi, "Pulvérisation");
          payload = { ...payload, program: { ...payload.program, label: newLabel } };
        }

        if (Array.isArray(payload.passages)) {
          payload = {
            ...payload,
            passages: payload.passages.map((p: any) => ({
              ...p,
              label: typeof p.label === "string"
                ? p.label.replace(/\bPassage\s*(\d+)/gi, "Pulvérisation $1").replace(/\bPassage\b/gi, "Pulvérisation")
                : p.label,
            })),
          };
        }

        // Normalisation et distinction robuste des sous-programmes (A1/A2, Pulvérisation 1/2, Traitement 1/2)
        // Évite toute collision de nommage accidentelle (ex: chiffre 2 présent dans l'année 2026 ou le cultivar Redix 25)
        const isIrrig = r.kind === "fertilisation" && (payload.method === "irrigation" || payload.program?.kind === "irrigation" || title.toLowerCase().includes("irrigation"));
        const isFoliar = r.kind === "fertilisation" && !isIrrig;
        const isPhyto = r.kind === "phytosanitaire";

        const hasParentheses = /\([^)]+\)/.test(title);
        const hasSubProgLabel = Boolean(payload.program?.label);

        if (hasParentheses || hasSubProgLabel) {
          const baseTitle = title
            .replace(/\s*\((?:Programme\s*A\d+|Pulv[ée]risation\s*\d+|Traitement\s*\d+|Passage\s*\d+)[^)]*\)/gi, "")
            .trim();

          if (isFoliar) {
            const items = payload.program?.items || [];
            const itemText = items.map((i: any) => `${i.name || ""} ${i.product || ""}`).join(" ").toLowerCase();

            let pulvNum = 1;
            if (
              /\b(?:Pulv[ée]risation|Passage|رشة)\s*2\b/i.test(title) ||
              /\b(?:Pulv[ée]risation|Passage|رشة)\s*2\b/i.test(payload.program?.label || "") ||
              ((itemText.includes("algreen") || itemText.includes("طحالب") || itemText.includes("oligo") || itemText.includes("عناصر")) &&
                !(itemText.includes("calcium") || itemText.includes("bore") || itemText.includes("كالسيوم") || itemText.includes("بور")))
            ) {
              pulvNum = 2;
            } else if (
              /\b(?:Pulv[ée]risation|Passage|رشة)\s*(\d+)\b/i.test(title) ||
              /\b(?:Pulv[ée]risation|Passage|رشة)\s*(\d+)\b/i.test(payload.program?.label || "")
            ) {
              const match = (title + " " + (payload.program?.label || "")).match(/\b(?:Pulv[ée]risation|Passage|رشة)\s*(\d+)\b/i);
              if (match) pulvNum = parseInt(match[1], 10) || 1;
            }

            // Règle agronomique absolue : Calcium-Bore est impérativement la Pulvérisation 1
            if (itemText.includes("calcium") || itemText.includes("bore") || itemText.includes("كالسيوم") || itemText.includes("بور")) {
              pulvNum = 1;
            }

            const tag = `Pulvérisation ${pulvNum}`;
            title = `${baseTitle} (${tag})`;
            if (payload.program) {
              payload = { ...payload, program: { ...payload.program, label: tag } };
            }
          } else if (isIrrig) {
            const entries = payload.program?.entries || [];
            const entryText = entries.map((e: any) => `${e.name || ""} ${e.product || ""} ${e.bac || ""}`).join(" ").toLowerCase();

            let progTag = "Programme A1";
            const hasBacB = entries.some((e: any) => e.bac === "B") ||
              entryText.includes("potassium") || entryText.includes("magnésium") || entryText.includes("magnesium") || entryText.includes("urée") || entryText.includes("uree") || entryText.includes("phosphorique");
            const hasBacA = entries.some((e: any) => e.bac === "A") ||
              entryText.includes("nitrate") || entryText.includes("chaux") || entryText.includes("calcium") || entryText.includes("nitrique");

            if (hasBacB && !hasBacA) {
              progTag = "Programme A2";
            } else if (hasBacA) {
              progTag = "Programme A1";
            } else if (/\b(?:Prog(?:ramme)?\.?\s*A2|A2)\b/i.test(title) || /\b(?:Prog(?:ramme)?\.?\s*A2|A2)\b/i.test(payload.program?.label || "")) {
              progTag = "Programme A2";
            }

            title = `${baseTitle} (${progTag})`;
            if (payload.program) {
              payload = { ...payload, program: { ...payload.program, label: progTag } };
            }
          } else if (isPhyto) {
            const matchSpecific = title.match(/\(([^)]+)\)$/);
            if (matchSpecific && !/(?:Traitement|Phyto|معاملة)\s*\d+/i.test(matchSpecific[1])) {
              // Conserver le libellé de produit spécifique intact ex: (Soufre mouillable)
            } else {
              let traitNum = 1;
              if (/\b(?:Traitement|Phyto|معاملة)\s*2\b/i.test(title) || /\b(?:Traitement|Phyto|معاملة)\s*2\b/i.test(payload.program?.label || "")) {
                traitNum = 2;
              }
              const tag = `Traitement ${traitNum}`;
              title = `${baseTitle} (${tag})`;
              if (payload.program) {
                payload = { ...payload, program: { ...payload.program, label: tag } };
              }
            }
          }
        }

        return {
          ...r,
          title,
          payload,
          status,
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

      // 4. Notification Push FCM distante (non-bloquante, cible Exécutant + Admin)
      if (directInserted) {
        sendRemotePushAlert({
          title: "🚨 Nouvelle recommandation de l'ingénieur",
          body: newRecord.title || "Une nouvelle ordonnance agricole est prête.",
          targetRoles: ["executant", "admin"],
          data: { kind: "recommendation", id: newId, route: "/recommandations" },
        });
      }

      return newRecord as Recommendation;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["phyto-executions"] });
      void qc.invalidateQueries({ queryKey: ["executions"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("doula:farm-reset"));
      }
    },
  });

  const queueReview = async (id: string, status: "acceptee" | "rejetee") => {
    const { data: { session: __s } } = await supabase.auth.getSession();
    const u = { user: __s?.user ?? null };
    const reviewedAt = new Date().toISOString();

    // 1. Optimistic update in query cache for instant UI response and persistent override
    setRecoStatusOverride(id, status);
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["phyto-executions"] });
      void qc.invalidateQueries({ queryKey: ["executions"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("doula:farm-reset"));
      }
    },
  });

  const reject = useMutation({
    mutationFn: async (id: string) => queueReview(id, "rejetee"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["phyto-executions"] });
      void qc.invalidateQueries({ queryKey: ["executions"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("doula:farm-reset"));
      }
    },
  });

  const resetAllToPending = useMutation({
    mutationFn: async () => {
      const currentList = qc.getQueryData<Recommendation[]>(KEY) || [];

      // 1. Purger les overrides locaux, vider immédiatement le store modules local et mettre à jour React Query
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STATUS_OVERRIDES_KEY);
          const { clearAllModuleRecordsLocal } = await import("@/lib/modules-store");
          clearAllModuleRecordsLocal();
        } catch { }
      }

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

      // 2. Exécuter la réinitialisation complète Cloud + Local (recommendations, module_records,
      //    tasks, task_executions, parcels -> "ok", purge achats auto-générés tout en conservant Agrimax)
      const { resetAllAppliedRecoHistory } = await import("@/lib/reco-validation");
      await resetAllAppliedRecoHistory(currentList);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["programs"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["executions"] });
      qc.invalidateQueries({ queryKey: ["phyto-executions"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doula:farm-reset"));
      }
    },
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      comment?: string | null;
      parcel_ids?: string[];
      payload?: Record<string, unknown>;
      photo_urls?: string[];
      status?: RecoStatus;
    }) => {
      const nowIso = new Date().toISOString();
      const patch: Record<string, unknown> = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.comment !== undefined ? { comment: input.comment } : {}),
        ...(input.parcel_ids !== undefined ? { parcel_ids: input.parcel_ids } : {}),
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
        ...(input.photo_urls !== undefined ? { photo_urls: input.photo_urls } : {}),
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["phyto-executions"] });
      void qc.invalidateQueries({ queryKey: ["executions"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("doula:farm-reset"));
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // 1. Enregistrer immédiatement dans le cache local permanent
      addLocalDeletedRecoId(id);

      // Nettoyer aussi les achats fournisseurs & traitements parcelles générés par cette recommandation (cascade complète)
      const targetReco = qc.getQueryData<Recommendation[]>(KEY)?.find((r) => r.id === id);
      const productNames: string[] = [];
      const pProgram = (targetReco?.payload as any)?.program;
      const recoDate = String(pProgram?.date || (targetReco?.payload as any)?.date || targetReco?.created_at || "").slice(0, 10);
      try {
        if (Array.isArray(pProgram?.products)) {
          for (const pr of pProgram.products) {
            const n = (pr.product || pr.name)?.trim();
            if (n) productNames.push(n);
          }
        }
        if (Array.isArray(pProgram?.entries)) {
          for (const entry of pProgram.entries) {
            if (Array.isArray(entry.items)) {
              for (const it of entry.items) {
                const n = it.name?.trim();
                if (n) productNames.push(n);
              }
            }
          }
        }
        if (Array.isArray(pProgram?.items)) {
          for (const it of pProgram.items) {
            const n = it.name?.trim();
            if (n) productNames.push(n);
          }
        }
        deletePurchasesForReco(id, productNames);
      } catch (err) {
        console.warn("deletePurchasesForReco error:", err);
      }

      // 2. Suppression en cascade dans modules-store (mémoire + localStorage + Supabase module_records)
      try {
        const modStore = await import("@/lib/modules-store");
        modStore.removeModuleRecordsByRecoId(id, {
          date: recoDate,
          productNames,
          title: targetReco?.title,
          parcelIds: targetReco?.parcel_ids,
        });
      } catch {}

      if (typeof window !== "undefined") {
        try {
          const rawHist = localStorage.getItem("doula_dismissed_phyto_history");
          const histList: string[] = rawHist ? JSON.parse(rawHist) : [];
          if (!histList.includes(id)) histList.push(id, `reco-${id}`);
          localStorage.setItem("doula_dismissed_phyto_history", JSON.stringify(histList));
        } catch { }
      }

      // Supprimer aussi dans Supabase module_records par reco_id / recommendationId
      try {
        const { data: cloudRows } = await supabase
          .from("module_records")
          .select("id, kind, payload")
          .in("kind", ["phytosanitaire", "pulverisation", "fertilisation"]);
        if (Array.isArray(cloudRows)) {
          const idsToDrop = cloudRows
            .filter((row: any) => {
              const p = row?.payload || {};
              return (
                p.reco_id === id ||
                p.recommendationId === id ||
                p.sourceRecommendationId === id
              );
            })
            .map((row: any) => row.id);
          if (idsToDrop.length > 0) {
            await supabase.from("module_records").delete().in("id", idsToDrop);
          }
        }
      } catch {}

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
      } catch { }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["phyto-executions"] });
      void qc.invalidateQueries({ queryKey: ["executions"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("doula:farm-reset"));
      }
    },
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
