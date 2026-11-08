import type { Recommendation } from "@/lib/cloud/recommendations";
import type { Parcel } from "@/data/parcels";
import { type SupplierPurchase, debitProductStock } from "@/lib/suppliers-store";
import { checkRecoStock, getTargetParcelsForReco, safeParseFloat } from "@/lib/stock-alerts";

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
  addModuleRecord: (parcelId: string, kind: string, data: any) => void;
  setParcelStatus?: (parcelId: string, status: any) => void;
  options?: {
    supplierName?: string;
    markAsExecutedIfPast?: boolean;
  };
}): Promise<ValidateRecoResult> {
  const payload = (reco.payload ?? {}) as any;
  const program = payload.program || {};
  const recoDate = program?.date || reco.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const targetParcels = getTargetParcelsForReco(reco, parcels);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isPast = options.markAsExecutedIfPast !== false && recoDate < todayStr;

  // 1. Détection et création automatique des achats pour les produits en rupture de stock
  const stockReport = checkRecoStock(reco, suppliers, parcels, 1, targetParcels);
  let createdPurchasesCount = 0;

  if (stockReport.hasMissingStock && stockReport.missingItems.length > 0) {
    for (const item of stockReport.missingItems) {
      const missingQty = Math.max(0.1, parseFloat(item.missing.toFixed(2)));
      const unitPrice = item.price || 0;
      const totalCost = parseFloat((missingQty * unitPrice).toFixed(2));

      addPurchase({
        supplierName: options.supplierName || "Achat Validé (Historique Ingénieur)",
        productName: item.name,
        purchaseDate: recoDate,
        quantity: missingQty,
        unit: item.unit,
        pricePerUnit: unitPrice,
        totalCost,
        paidAmount: totalCost,
      });
      createdPurchasesCount++;
    }
  }

  // 2. Mettre à jour le statut de la recommandation vers "acceptee"
  await acceptReco(reco.id);

  // 3. Débiter le stock et créer les programmes correspondants
  let clonedCount = 0;

  if (program && targetParcels.length > 0) {
    for (const parcel of targetParcels) {
      const surface = safeParseFloat(parcel.info?.surface) || 1;
      clonedCount++;

      if (reco.kind === "fertilisation") {
        if (payload.method === "irrigation") {
          // Fertigation par irrigation
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
            date: recoDate,
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
                  executedAt: recoDate,
                  executed_at: recoDate,
                  executionNote: "Historique validé (mois précédent)",
                }
              : {}),
          };

          addModuleRecord(parcel.id, "fertilisation", unifiedFertigation);
        } else {
          // Pulvérisation foliaire
          if (Array.isArray(program.items)) {
            for (const it of program.items) {
              const qty = safeParseFloat(it.qty);
              debitProductStock(it.name, qty);
            }
          }

          addModuleRecord(parcel.id, "pulverisation", {
            ...program,
            reco_id: reco.id,
            date: recoDate,
            status: isPast ? "execute" : "planifie",
            ...(isPast
              ? {
                  executedAt: recoDate,
                  executed_at: recoDate,
                  executionNote: "Historique validé (mois précédent)",
                }
              : {}),
          });
        }
      } else if (reco.kind === "phytosanitaire") {
        if (Array.isArray(program.products)) {
          for (const p of program.products) {
            const qty = safeParseFloat(p.volume) || safeParseFloat(p.dosage) || 0;
            debitProductStock(p.product, qty);
          }
        }

        addModuleRecord(parcel.id, "phytosanitaire", {
          ...program,
          reco_id: reco.id,
          date: recoDate,
          status: isPast ? "execute" : "planifie",
          ...(isPast
            ? {
                executedAt: recoDate,
                executed_at: recoDate,
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

  return {
    createdPurchasesCount,
    clonedCount,
    targetParcelsCount: targetParcels.length,
    isPast,
  };
}
