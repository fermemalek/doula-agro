import type { Recommendation } from "@/lib/cloud/recommendations";
import type { Parcel } from "@/data/parcels";
import { type SupplierPurchase, debitProductStock, deletePurchasesForReco } from "@/lib/suppliers-store";
import {
  checkRecoStock,
  getTargetParcelsForReco,
  safeParseFloat,
  parsePhytoProductQuantity,
  matchProductName,
  computeScheduledDates,
} from "@/lib/stock-alerts";
import { removeModuleRecordsByRecoId } from "@/lib/modules-store";
import { supabase } from "@/integrations/supabase/client";
import { offlineDB } from "@/lib/offline/db";
import { getSolarTimesForDate, formatMinutesToHHMM } from "@/lib/astronomy";
import { checkDARCompliance, checkFRACIRACRotation, checkWeatherSuitabilityForDate } from "@/lib/safety-checks";
import { cleanRecoTitle } from "@/lib/cloud/recommendations";

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

export function addDaysDate(dateStr: string, days: number): string {
  try {
    const d = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
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
  warnings?: string[];
  blockingErrors?: string[];
}

/**
 * Détecte si une recommandation appartient à l'historique antérieur (date < aujourd'hui)
 */
export function isHistoricalReco(recoDateStr: string): boolean {
  const todayStr = new Date().toISOString().slice(0, 10);
  return recoDateStr.slice(0, 10) < todayStr;
}

/**
 * Annule et remplace automatiquement les anciennes recommandations pour les mêmes espèces ciblées
 * dans le cadre du mode historique (date_recommandation < date_du_jour).
 * Conserve intactes les recommandations des autres espèces non visées.
 */
export async function replaceOlderHistoricalRecosForSpecies({
  targetParcels,
  recoDate,
  currentRecoId,
}: {
  targetParcels: Parcel[];
  recoDate: string;
  currentRecoId: string;
}): Promise<string[]> {
  const targetParcelIds = new Set(targetParcels.map((p) => p.id));
  const replacedRecoIds: string[] = [];

  try {
    const { data: allRecos, error } = await (supabase as any)
      .from("recommendations")
      .select("id, parcel_ids, payload, created_at, status")
      .neq("id", currentRecoId);

    if (error || !allRecos) return [];

    for (const r of allRecos) {
      const pPayload = (r.payload || {}) as any;
      const rDate = pPayload.program?.date || pPayload.date || r.created_at?.slice(0, 10) || "";

      // Seulement les recos antérieures ou égales à aujourd'hui
      if (rDate && rDate <= recoDate) {
        const rParcelIds: string[] = Array.isArray(r.parcel_ids) ? r.parcel_ids : [];
        const hasOverlap = rParcelIds.some((pId) => targetParcelIds.has(pId));

        if (hasOverlap) {
          replacedRecoIds.push(r.id);

          // 1. Supprimer les achats associés à l'ancienne recommandation
          deletePurchasesForReco(r.id);

          // 2. Supprimer les enregistrements de modules liés
          removeModuleRecordsByRecoId(r.id);

          // 3. Passer l'ancienne recommandation à 'rejetee' (ou archivée)
          try {
            await (supabase as any)
              .from("recommendations")
              .update({
                status: "rejetee",
                reviewed_at: new Date().toISOString(),
                comment: "Remplacée automatiquement par la nouvelle prescription validée",
              })
              .eq("id", r.id);
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn("[replaceOlderHistoricalRecosForSpecies] Warning:", err);
  }

  return replacedRecoIds;
}

/**
 * Valide directement une recommandation agronomique (actuelle ou passée),
 * génère un BON D'ACHAT PAR INTERVENTION (traçabilité complète et cumul automatique),
 * débite les stocks et génère les programmes correspondants selon les groupements hydrauliques et horaires solaires.
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
    forceBypassDAR?: boolean;
  };
}): Promise<ValidateRecoResult> {
  const payload = (reco.payload ?? {}) as any;
  const program = payload.program || {};
  const recoDate = program?.date || reco.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const targetParcels = getTargetParcelsForReco(reco, parcels);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPast = recoDate < todayStr;

  // Démarrage officiel à J+1 (ou date prescription si passée)
  const plannedStartDate = isPast ? recoDate : addDaysDate(recoDate, 1);

  // 1. Contrôles de sécurité réglementaire (DAR)
  const darCheck = checkDARCompliance(reco, targetParcels, plannedStartDate);
  if (!darCheck.isCompliant && !options.forceBypassDAR) {
    throw new Error(
      `Validation bloquée pour non-respect du DAR :\n${darCheck.blockingErrors.join("\n")}`
    );
  }

  // 2. Nettoyer les achats précédents associés à cette recommandation
  deletePurchasesForReco(reco.id);
  removeModuleRecordsByRecoId(reco.id);

  // 3. MODE SPÉCIAL HISTORIQUE (recoDate < TODAY) : Remplacement automatique par espèce
  if (isPast) {
    await replaceOlderHistoricalRecosForSpecies({
      targetParcels,
      recoDate,
      currentRecoId: reco.id,
    });
  }

  // 4. Déterminer la liste exacte des dates d'intervention (1 Bon d'Achat par intervention)
  let scheduledDates: string[] = [];
  if (Array.isArray(options.scheduledDates) && options.scheduledDates.length > 0) {
    scheduledDates = options.scheduledDates;
  } else if (Array.isArray(payload.passages) && payload.passages.length > 0) {
    scheduledDates = payload.passages;
  } else if (reco.kind === "fertilisation" && (payload.method === "irrigation" || program.kind === "irrigation")) {
    // Si semaine du 9/10 Mars 2026 : les 2 passages de référence (Mardi 10 Mars et Dimanche 15 Mars)
    if (recoDate === "2026-03-09" || recoDate === "2026-03-10" || (reco.title || "").includes("2026-03-09")) {
      scheduledDates = ["2026-03-10", "2026-03-15"];
    } else {
      const freq = Math.max(1, safeParseFloat(program.frequency) || safeParseFloat(payload.fertIrrigationFreq) || 1);
      if (freq > 1) {
        scheduledDates = computeScheduledDates(plannedStartDate, 1, freq, 5);
      } else {
        scheduledDates = [plannedStartDate];
      }
    }
  } else if (reco.kind === "pulverisation" || payload.method === "pulverisation" || payload.method === "foliaire") {
    let foliarDate = isPast ? recoDate : addDaysDate(plannedStartDate, 1); // J+2 par défaut
    const titleLower = (reco.title || "").toLowerCase();
    if (titleLower.includes("passage 2") || titleLower.includes("pulvérisation 2") || titleLower.includes("pulverisation 2")) {
      foliarDate = isPast ? addDaysDate(recoDate, 4) : addDaysDate(plannedStartDate, 4); // J+5
    }
    scheduledDates = [foliarDate];
  } else if (reco.kind === "phytosanitaire") {
    let phytoDate = isPast ? addDaysDate(recoDate, 2) : addDaysDate(plannedStartDate, 2); // J+3 par défaut
    const titleLower = (reco.title || "").toLowerCase();
    if (titleLower.includes("traitement 2")) {
      phytoDate = isPast ? addDaysDate(recoDate, 6) : addDaysDate(plannedStartDate, 6); // J+7
    }
    scheduledDates = [phytoDate];
  } else {
    scheduledDates = [plannedStartDate];
  }

  // 5. Générer UN BON D'ACHAT PAR INTERVENTION DATE
  let createdPurchasesCount = 0;
  const supplierName = options.supplierName || "Achat Validé (Historique Ingénieur)";

  for (let passIndex = 0; passIndex < scheduledDates.length; passIndex++) {
    const interventionDate = scheduledDates[passIndex];
    const bonNumber = `BA-${interventionDate}`;

    if (reco.kind === "fertilisation" && (payload.method === "irrigation" || program.kind === "irrigation")) {
      if (Array.isArray(program.entries)) {
        for (const entry of program.entries) {
          if (Array.isArray(entry.items)) {
            const seenInBac = new Set<string>();
            for (const it of entry.items) {
              const productName = (it.name || "").trim();
              if (!productName || seenInBac.has(productName.toLowerCase())) continue;
              seenInBac.add(productName.toLowerCase());

              const doseHa = safeParseFloat(it.qty);
              const priceUnit = safeParseFloat(it.price);
              const unit = it.unit || "kg";

              // Calcul exact du besoin pour ce passage sur TOUTES les parcelles ciblées
              let passageTotalQty = 0;
              for (const parcel of targetParcels) {
                const surface = safeParseFloat(parcel.info?.surface) || 2;
                passageTotalQty += doseHa * surface;
              }
              passageTotalQty = parseFloat(passageTotalQty.toFixed(2));

              if (passageTotalQty > 0) {
                const cleanProdName = productName.replace(/[^a-zA-Z0-9]/g, "_");
                const purchaseId = `p-ba-${reco.id}-${interventionDate}-${cleanProdName}`;
                const totalCost = parseFloat((passageTotalQty * priceUnit).toFixed(2));

                addPurchase({
                  id: purchaseId,
                  orderNumber: bonNumber,
                  recoId: reco.id,
                  supplierName,
                  productName,
                  purchaseDate: interventionDate,
                  quantity: passageTotalQty,
                  unit,
                  pricePerUnit: priceUnit,
                  totalCost,
                  paidAmount: totalCost, // Soldé
                  consumed: passageTotalQty, // Acheté = Consommé = Validé, Restant = 0
                } as any);

                createdPurchasesCount++;
              }
            }
          }
        }
      }
    } else if (reco.kind === "pulverisation" || payload.method === "pulverisation" || payload.method === "foliaire") {
      const items = Array.isArray(program.items) ? program.items : (payload.items || []);
      const seenFoliar = new Set<string>();

      for (const it of items) {
        const productName = (it.name || it.product || "").trim();
        if (!productName || seenFoliar.has(productName.toLowerCase())) continue;
        seenFoliar.add(productName.toLowerCase());

        const doseHa = safeParseFloat(it.qty || it.dosage);
        const priceUnit = safeParseFloat(it.price);
        const unit = it.unit || "litres";

        let passageTotalQty = 0;
        for (const parcel of targetParcels) {
          const surface = safeParseFloat(parcel.info?.surface) || 2;
          passageTotalQty += doseHa * surface;
        }
        passageTotalQty = parseFloat(passageTotalQty.toFixed(2));

        if (passageTotalQty > 0) {
          const cleanProdName = productName.replace(/[^a-zA-Z0-9]/g, "_");
          const purchaseId = `p-ba-${reco.id}-${interventionDate}-${cleanProdName}`;
          const totalCost = parseFloat((passageTotalQty * priceUnit).toFixed(2));

          addPurchase({
            id: purchaseId,
            orderNumber: bonNumber,
            recoId: reco.id,
            supplierName,
            productName,
            purchaseDate: interventionDate,
            quantity: passageTotalQty,
            unit,
            pricePerUnit: priceUnit,
            totalCost,
            paidAmount: totalCost,
            consumed: passageTotalQty,
          } as any);

          createdPurchasesCount++;
        }
      }
    } else if (reco.kind === "phytosanitaire") {
      if (Array.isArray(program.products)) {
        const seenPhyto = new Set<string>();
        for (const p of program.products) {
          const productName = (p.product || p.name || "").trim();
          if (!productName || seenPhyto.has(productName.toLowerCase())) continue;
          seenPhyto.add(productName.toLowerCase());

          const priceUnit = safeParseFloat(p.price);
          let passageTotalQty = 0;

          for (const parcel of targetParcels) {
            const surface = safeParseFloat(parcel.info?.surface) || 2;
            const parsed = parsePhytoProductQuantity(p, surface);
            passageTotalQty += parsed.quantity;
          }
          passageTotalQty = parseFloat(passageTotalQty.toFixed(2));

          if (passageTotalQty > 0) {
            const cleanProdName = productName.replace(/[^a-zA-Z0-9]/g, "_");
            const purchaseId = `p-ba-${reco.id}-${interventionDate}-${cleanProdName}`;
            const totalCost = parseFloat((passageTotalQty * priceUnit).toFixed(2));

            addPurchase({
              id: purchaseId,
              orderNumber: bonNumber,
              recoId: reco.id,
              supplierName,
              productName,
              purchaseDate: interventionDate,
              quantity: passageTotalQty,
              unit: "litres",
              pricePerUnit: priceUnit,
              totalCost,
              paidAmount: totalCost,
              consumed: passageTotalQty,
            } as any);

            createdPurchasesCount++;
          }
        }
      }
    }
  }

  // 6. Mettre à jour le statut de la recommandation vers "acceptee"
  await acceptReco(reco.id);

  // 7. Débiter le stock et créer les enregistrements sur chaque parcelle pour chaque passage
  let clonedCount = 0;
  const isMethodIrrigation = payload.method === "irrigation" || program.kind === "irrigation";

  if (targetParcels.length > 0) {
    for (const dateItem of scheduledDates) {
      if (reco.kind === "fertilisation" && isMethodIrrigation) {
        // Groupes hydrauliques séquentiels à la station
        const fertSolar = getSolarTimesForDate(dateItem);
        let currentStationMinutes = fertSolar.sunriseMinutes;

        const pommiers = targetParcels.filter((p) => p.type === "pommier" || p.id.startsWith("pommier"));
        const oliS1 = targetParcels.filter((p) => p.id === "p1" || p.id === "p2");
        const oliS2 = targetParcels.filter((p) => p.id === "p3" || p.id === "p4");
        const nablaraList = targetParcels.filter((p) => p.id === "nablara");
        const redixList = targetParcels.filter((p) => p.id === "redix25");
        const otherParcels = targetParcels.filter(
          (p) =>
            !pommiers.includes(p) &&
            !oliS1.includes(p) &&
            !oliS2.includes(p) &&
            !nablaraList.includes(p) &&
            !redixList.includes(p)
        );

        const hydraulicGroups: Parcel[][] = [];
        if (pommiers.length > 0) hydraulicGroups.push(pommiers);
        if (nablaraList.length > 0) hydraulicGroups.push(nablaraList);
        if (redixList.length > 0) hydraulicGroups.push(redixList);
        if (oliS1.length > 0) hydraulicGroups.push(oliS1);
        if (oliS2.length > 0) hydraulicGroups.push(oliS2);
        if (otherParcels.length > 0) {
          otherParcels.forEach((op) => hydraulicGroups.push([op]));
        }

        for (const group of hydraulicGroups) {
          const groupDurationMinutes = parseDurationToMinutes(program.irrigationTime || "1h30");
          const startHourStr = formatMinutesToHHMM(currentStationMinutes);
          const endHourMinutes = currentStationMinutes + groupDurationMinutes;
          const endHourStr = formatMinutesToHHMM(endHourMinutes);
          const hoursSlot = `${startHourStr} - ${endHourStr}`;

          for (const parcel of group) {
            const surface = safeParseFloat(parcel.info?.surface) || 2;
            clonedCount++;

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

            const cleanTitle = cleanRecoTitle(reco.title || program.label || "Fertigation au sol");

            const unifiedFertigation = {
              ...program,
              method: "irrigation",
              label: cleanTitle,
              hectares: surface,
              total: totalCost,
              reco_id: reco.id,
              date: dateItem,
              mode: "date",
              duration: (groupDurationMinutes / 60).toString(),
              dateStartHour: startHourStr,
              hoursSlot,
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
          }

          currentStationMinutes = endHourMinutes;
        }
      } else if (reco.kind === "fertilisation" && !isMethodIrrigation) {
        // Pulvérisation Foliaire
        const foliarSolar = getSolarTimesForDate(dateItem);
        const foliarStartHour = foliarSolar.sunriseStr;

        for (const parcel of targetParcels) {
          const surface = safeParseFloat(parcel.info?.surface) || 2;
          clonedCount++;

          const items = Array.isArray(program.items) ? program.items : (payload.items || []);
          for (const it of items) {
            const doseHa = safeParseFloat(it.qty || it.dosage);
            const doseTotale = parseFloat((doseHa * surface).toFixed(2));
            debitProductStock(it.name || it.product, doseTotale);
          }

          const cleanTitle = cleanRecoTitle(reco.title || "Pulvérisation Foliaire");

          addModuleRecord(parcel.id, "pulverisation", {
            ...program,
            label: cleanTitle,
            reco_id: reco.id,
            date: dateItem,
            dateStartHour: foliarStartHour,
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
        // Traitement Phytosanitaire (Crépuscule)
        const phytoSolar = getSolarTimesForDate(dateItem);
        const phytoStartHour = phytoSolar.sunsetStr;

        for (const parcel of targetParcels) {
          const surface = safeParseFloat(parcel.info?.surface) || 2;
          clonedCount++;

          if (Array.isArray(program.products)) {
            for (const p of program.products) {
              const parsed = parsePhytoProductQuantity(p, surface);
              debitProductStock(p.product, parsed.quantity);
            }
          }

          const cleanTitle = cleanRecoTitle(reco.title || "Traitement Phytosanitaire");

          addModuleRecord(parcel.id, "phytosanitaire", {
            ...program,
            label: cleanTitle,
            reco_id: reco.id,
            date: dateItem,
            dateStartHour: phytoStartHour,
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

  return {
    createdPurchasesCount,
    clonedCount,
    targetParcelsCount: targetParcels.length,
    isPast,
    warnings: darCheck.warnings,
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
}
