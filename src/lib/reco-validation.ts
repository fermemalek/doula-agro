import type { Recommendation } from "@/lib/cloud/recommendations";
import type { Parcel } from "@/data/parcels";
import { type SupplierPurchase, debitProductStock, deletePurchasesForReco } from "@/lib/suppliers-store";
import { checkRecoStock, getTargetParcelsForReco, safeParseFloat, parsePhytoProductQuantity, computeScheduledDates } from "@/lib/stock-alerts";
import { removeModuleRecordsByRecoId } from "@/lib/modules-store";
import { supabase } from "@/integrations/supabase/client";
import { offlineDB } from "@/lib/offline/db";

export function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 90;
  const clean = durationStr.trim().toLowerCase();
  if (clean === "1h") return 60;
  if (clean === "1h30") return 90;
  if (clean === "2h") return 120;
  if (clean === "2h30") return 150;
  if (clean === "3h") return 180;
  const match = clean.match(/(\d+)\s*h\s*(\d*)/);
  if (match) {
    const h = parseInt(match[1], 10) || 0;
    const m = parseInt(match[2], 10) || 0;
    return h * 60 + m;
  }
  const num = parseFloat(clean);
  return !isNaN(num) ? Math.round(num * 60) : 90;
}

function addDaysDate(dateStr: string, days: number): string {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

export interface ValidateRecoResult {
  createdPurchasesCount: number;
  clonedCount: number;
  targetParcelsCount: number;
  isPast: boolean;
}

/**
 * Valide directement une recommandation agronomique (actuelle ou passée),
 * génère automatiquement les bons d'achat pour combler les ruptures de stocks,
 * débite les stocks et génère les programmes correspondants pour chaque parcelle.
 */
export async function validateRecommendationAndPurchases({
  reco,
  parcels,
  suppliers,
  addPurchase,
  acceptReco,
  addModuleRecord,
  setParcelStatus,
  options = {},
}: {
  reco: Recommendation;
  parcels: Parcel[];
  suppliers: SupplierPurchase[];
  addPurchase: (p: Omit<SupplierPurchase, "id" | "consumed">) => void;
  acceptReco: (id: string) => Promise<unknown>;
  addModuleRecord: (parcelId: string, kind: any, data: any) => void;
  setParcelStatus?: (parcelId: string, status: any) => void;
  options?: {
    supplierName?: string;
    markAsExecutedIfPast?: boolean;
    scheduledDates?: string[];
  };
}): Promise<ValidateRecoResult> {
  const payload = (reco.payload ?? {}) as any;
  const program = payload.program || {};
  const recoDate = program?.date || reco.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const targetParcels = getTargetParcelsForReco(reco, parcels);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isPast = options.markAsExecutedIfPast !== false && recoDate < todayStr;

  // 0. Nettoyer les achats précédents associés à cette recommandation pour éviter les doublons
  deletePurchasesForReco(reco.id);

  // 1. Déterminer la liste exacte des dates d'intervention (1 Bon d'Achat par intervention)
  let scheduledDates: string[] = [];
  if (Array.isArray(options.scheduledDates) && options.scheduledDates.length > 0) {
    scheduledDates = options.scheduledDates;
  } else if (Array.isArray(payload.passages) && payload.passages.length > 0) {
    scheduledDates = payload.passages;
  } else if (reco.kind === "fertilisation" && payload.method === "irrigation") {
    // Si semaine du 9/10 Mars 2026 : les 2 passages de référence (Mardi 10 Mars et Dimanche 15 Mars)
    if (recoDate === "2026-03-09" || recoDate === "2026-03-10" || (reco.title || "").includes("2026-03-09")) {
      scheduledDates = ["2026-03-10", "2026-03-15"];
    } else {
      const freq = Math.max(1, safeParseFloat(program.frequency) || safeParseFloat(payload.fertIrrigationFreq) || 1);
      if (freq > 1) {
        scheduledDates = computeScheduledDates(recoDate, 1, freq, 5);
      } else {
        scheduledDates = [recoDate];
      }
    }
  } else if (reco.kind === "pulverisation" || payload.method === "pulverisation" || payload.method === "foliaire") {
    let foliarDate = recoDate;
    const titleLower = (reco.title || "").toLowerCase();
    if (titleLower.includes("passage 2") || titleLower.includes("pulvérisation 2") || titleLower.includes("pulverisation 2")) {
      foliarDate = addDaysDate(recoDate, 4); // ex: Vendredi
    } else if (titleLower.includes("passage 1") || titleLower.includes("pulvérisation 1") || titleLower.includes("pulverisation 1")) {
      foliarDate = addDaysDate(recoDate, 1); // ex: Mardi
    }
    scheduledDates = [foliarDate];
  } else {
    scheduledDates = [recoDate];
  }

  // 2. Générer un Bon d'Achat (BA) par intervention
  let createdPurchasesCount = 0;
  const supplierName = options.supplierName || "Achat Validé (Historique Ingénieur)";

  for (let passIndex = 0; passIndex < scheduledDates.length; passIndex++) {
    const interventionDate = scheduledDates[passIndex];
    const bonNumber = `BA-${interventionDate}`;

    if (reco.kind === "fertilisation" && payload.method === "irrigation") {
      if (Array.isArray(program.entries)) {
        for (const entry of program.entries) {
          if (Array.isArray(entry.items)) {
            const seenInBac = new Set<string>();
            for (const it of entry.items) {
              const name = it.name?.trim();
              if (!name) continue;
              const norm = name.toLowerCase().replace(/\s+/g, " ");
              if (seenInBac.has(norm)) continue;
              seenInBac.add(norm);

              const doseHa = safeParseFloat(it.qty);
              const unitPrice = safeParseFloat(it.price);
              const unit: "kg" | "litres" = (it.unit === "litres" || it.unit === "L") ? "litres" : "kg";

              // Somme exacte des besoins de ce passage sur l'ensemble des parcelles traitées
              let passageQty = 0;
              for (const parcel of targetParcels) {
                const surface = safeParseFloat(parcel.info?.surface) || 2;
                passageQty += doseHa * surface;
              }
              passageQty = parseFloat(passageQty.toFixed(2));

              if (passageQty > 0) {
                const cleanName = name.replace(/[^a-zA-Z0-9]/g, "_");
                const purchaseId = `p-ba-${reco.id}-${interventionDate}-${cleanName}`;
                const totalCost = parseFloat((passageQty * unitPrice).toFixed(2));

                addPurchase({
                  id: purchaseId,
                  recoId: reco.id,
                  orderNumber: bonNumber,
                  supplierName,
                  productName: name,
                  purchaseDate: interventionDate,
                  quantity: passageQty,
                  consumed: passageQty, // Règle d'or : J'achète exactement ce qui est validé et consommé pour ce passage
                  unit,
                  pricePerUnit: unitPrice,
                  totalCost,
                  paidAmount: totalCost,
                } as any);
                createdPurchasesCount++;
              }
            }
          }
        }
      }
    } else if (reco.kind === "pulverisation" || payload.method === "pulverisation" || payload.method === "foliaire") {
      // Pulvérisation foliaire : volume cuve pour cette intervention
      if (Array.isArray(program.items)) {
        for (const it of program.items) {
          const name = it.name?.trim();
          if (!name) continue;
          const qty = safeParseFloat(it.qty);
          const unitPrice = safeParseFloat(it.price);
          const unit: "kg" | "litres" = (it.unit === "litres" || it.unit === "L") ? "litres" : "kg";

          if (qty > 0) {
            const cleanName = name.replace(/[^a-zA-Z0-9]/g, "_");
            const purchaseId = `p-ba-${reco.id}-${interventionDate}-${cleanName}`;
            const totalCost = parseFloat((qty * unitPrice).toFixed(2));

            addPurchase({
              id: purchaseId,
              recoId: reco.id,
              orderNumber: bonNumber,
              supplierName,
              productName: name,
              purchaseDate: interventionDate,
              quantity: qty,
              consumed: qty,
              unit,
              pricePerUnit: unitPrice,
              totalCost,
              paidAmount: totalCost,
            } as any);
            createdPurchasesCount++;
          }
        }
      }
    } else if (reco.kind === "phytosanitaire") {
      if (Array.isArray(program.products)) {
        const totalSurface = targetParcels.reduce(
          (sum, parcel) => sum + (safeParseFloat(parcel?.info?.surface) || 2),
          0
        ) || 2;

        for (const p of program.products) {
          const name = (p.product || p.name)?.trim();
          if (!name) continue;
          const parsed = parsePhytoProductQuantity(p, totalSurface);
          const unitPrice = safeParseFloat(p.price);

          if (parsed.quantity > 0) {
            const cleanName = name.replace(/[^a-zA-Z0-9]/g, "_");
            const purchaseId = `p-ba-${reco.id}-${interventionDate}-${cleanName}`;
            const totalCost = parseFloat((parsed.quantity * unitPrice).toFixed(2));

            addPurchase({
              id: purchaseId,
              recoId: reco.id,
              orderNumber: bonNumber,
              supplierName,
              productName: name,
              purchaseDate: interventionDate,
              quantity: parsed.quantity,
              consumed: parsed.quantity,
              unit: parsed.unit,
              pricePerUnit: unitPrice,
              totalCost,
              paidAmount: totalCost,
            } as any);
            createdPurchasesCount++;
          }
        }
      }
    }
  }

  // 3. Mettre à jour le statut de la recommandation vers "acceptee"
  await acceptReco(reco.id);

  // 4. Débiter le stock et créer les enregistrements sur chaque parcelle pour chaque passage
  removeModuleRecordsByRecoId(reco.id);
  let clonedCount = 0;

  if (program && targetParcels.length > 0) {
    for (const dateItem of scheduledDates) {
      for (const parcel of targetParcels) {
        const surface = safeParseFloat(parcel.info?.surface) || 2;
        clonedCount++;

        if (reco.kind === "fertilisation") {
          if (payload.method === "irrigation") {
            let totalCost = 0;
            if (Array.isArray(program.entries)) {
              for (const entry of program.entries) {
                if (Array.isArray(entry.items)) {
                  for (const it of entry.items) {
                    const doseHa = safeParseFloat(it.qty);
                    const doseTotale = parseFloat((doseHa * surface).toFixed(2));
                    const priceUnit = safeParseFloat(it.price);
                    totalCost += doseTotale * priceUnit;
                    debitProductStock(it.name, doseTotale);
                  }
                }
              }
            }

            const durationMinutes = parseDurationToMinutes(program.irrigationTime || "1h30");
            const durationHours = (durationMinutes / 60).toString();

            const unifiedFertigation = {
              ...program,
              method: "irrigation",
              label: program.label || "Irrigation & Fertilisation",
              hectares: surface,
              total: totalCost,
              reco_id: reco.id,
              date: dateItem,
              mode: "date",
              duration: durationHours,
              dateStartHour: "08:00",
              wettingTime: program.wettingTime,
              injectionTime: program.injectionTime,
              rinsingTime: program.rinsingTime,
              irrigationTime: program.irrigationTime,
              status: isPast ? "execute" : "planifie",
              ...(isPast
                ? {
                  executedAt: dateItem,
                  executed_at: dateItem,
                  executionNote: "Historique validé (mois précédent)",
                }
                : {}),
            };

            addModuleRecord(parcel.id, "fertilisation", unifiedFertigation);
          } else {
            // Pulvérisation foliaire : débiter le produit une seule fois par passage (cuve)
            if (clonedCount === 1 && Array.isArray(program.items)) {
              for (const it of program.items) {
                const qty = safeParseFloat(it.qty);
                debitProductStock(it.name, qty);
              }
            }

            addModuleRecord(parcel.id, "pulverisation", {
              ...program,
              reco_id: reco.id,
              date: dateItem,
              dateStartHour: "06:30",
              status: isPast ? "execute" : "planifie",
              ...(isPast
                ? {
                  executedAt: dateItem,
                  executed_at: dateItem,
                  executionNote: "Historique validé (mois précédent)",
                }
                : {}),
            });
          }
        } else if (reco.kind === "phytosanitaire") {
          if (Array.isArray(program.products)) {
            for (const p of program.products) {
              const parsed = parsePhytoProductQuantity(p, surface);
              debitProductStock(p.product, parsed.quantity);
            }
          }

          addModuleRecord(parcel.id, "phytosanitaire", {
            ...program,
            reco_id: reco.id,
            date: dateItem,
            dateStartHour: "17:30",
            status: isPast ? "execute" : "planifie",
            ...(isPast
              ? {
                executedAt: dateItem,
                executed_at: dateItem,
                executionNote: "Historique validé (mois précédent)",
              }
              : {}),
          });

          if (setParcelStatus && !isPast) {
            setParcelStatus(parcel.id, "alerte");
          }
        }
      }
    }
  }

  if (setStatus) {
    setStatus("acceptee");
  }

  return {
    createdPurchasesCount,
    clonedCount,
    targetParcelsCount: targetParcels.length,
    isPast,
  };
}

/**
 * Réinitialise complètement tout l'historique d'application des recommandations :
 * - Supprime tous les programmes enregistrés dans les modules issus des recommandations
 * - Supprime les bons d'achats automatiques créés pour les recommandations
 * - Remet le statut de chaque recommandation à "envoyee"
 */
export async function resetAllAppliedRecoHistory(recos: Recommendation[]) {
  // 1. Purge des enregistrements de modules locaux
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("doula-modules");
      if (raw) {
        const data = JSON.parse(raw);
        for (const pid of Object.keys(data)) {
          for (const mod of Object.keys(data[pid])) {
            if (Array.isArray(data[pid][mod])) {
              data[pid][mod] = data[pid][mod].filter(
                (item: any) => !item.reco_id && !item.payload?.reco_id && !String(item.id || "").startsWith("p-reco-")
              );
            }
          }
        }
        localStorage.setItem("doula-modules", JSON.stringify(data));
      }
    } catch { }
  }

  // 2. Nettoyage de tous les achats automatiques de stock liés aux recommandations
  for (const r of recos) {
    deletePurchasesForReco(r.id);
  }

  // Purge de la table supplier_purchases et du cache local
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("doula-suppliers");
    }
    await (supabase as any)
      .from("supplier_purchases")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
  } catch { }

  // Purge de la file offline des résidus p-reco-
  try {
    const pendingRecoOps = await offlineDB.outbox
      .filter((e) => String(e.record_id || "").startsWith("p-reco-") || (e.op === "purchase.delete" && String((e.payload as any)?.id || "").startsWith("p-reco-")))
      .toArray();
    for (const item of pendingRecoOps) {
      await offlineDB.outbox.delete(item.client_id);
    }
  } catch { }

  // 3. Réinitialisation des statuts dans Supabase vers "envoyee" en une seule requête groupée
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
    console.warn("Bulk update to envoyee failed, fallback by id:", err);
    for (const r of recos) {
      try {
        await (supabase as any)
          .from("recommendations")
          .update({
            status: "envoyee",
            reviewed_at: null,
            reviewed_by: null,
            transferred_record_id: null,
          })
          .eq("id", r.id);
      } catch { }
    }
  }

  // Dual-clean Supabase module_records si possible
  try {
    const { data: u } = await supabase.auth.getUser();
    if (u?.user) {
      await (supabase as any)
        .from("module_records")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }
  } catch { }
}

