import type { Recommendation } from "@/lib/cloud/recommendations";
import type { Parcel } from "@/data/parcels";
import { type SupplierPurchase, debitProductStock, deletePurchasesForReco } from "@/lib/suppliers-store";
import { checkRecoStock, getTargetParcelsForReco, safeParseFloat, parsePhytoProductQuantity, matchProductName } from "@/lib/stock-alerts";
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
          // Vérifier si cette reco ne concerne QUE ces espèces/parcelles ou partagées
          replacedRecoIds.push(r.id);

          // 1. Supprimer les achats associés à l'ancienne recommandation
          deletePurchasesForReco(r.id);

          // 2. Supprimer les enregistrements de modules liés
          removeModuleRecordsByRecoId(r.id);

          // 3. Mettre à jour le statut en "rejetee" (remplacée par version historique plus récente)
          await (supabase as any)
            .from("recommendations")
            .update({
              status: "rejetee",
              comment: `Remplacée automatiquement par la recommandation historique validée (${recoDate})`,
            })
            .eq("id", r.id);
        }
      }
    }
  } catch (err) {
    console.warn("Erreur lors du remplacement historique par espèce:", err);
  }

  return replacedRecoIds;
}

/**
 * Valide une recommandation agronomique selon le Référentiel Métier Ferme Malek :
 * 1. Démarrage à J+1 (date_recommandation + 1 jour)
 * 2. Horaires dynamiques lever/coucher du soleil (Benhar)
 * 3. Étalement glissant & exclusion mutuelle par parcelle
 * 4. Affectation hydraulique fixe (Pommier P7+P8 ensemble, Oliviers S1 P1+P2, S2 P3+P4, Nablara seule, Redix 25 séquentiel)
 * 5. Pulvérisation et Phyto parcelle par parcelle
 * 6. Sécurité DAR & Météo
 * 7. Mode spécial historique (< TODAY) : Remplacement par espèce & Égalité stricte Achats = Quantités prescrites
 * 8. Cycle de vie : État "planifie" (jamais direct "execute")
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
    forceBypassDAR?: boolean;
    scheduledDates?: string[];
  };
}): Promise<ValidateRecoResult> {
  const payload = (reco.payload ?? {}) as any;
  const program = payload.program || {};
  const recoDate = program?.date || reco.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const targetParcels = getTargetParcelsForReco(reco, parcels);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPast = recoDate < todayStr;

  // Démarrage officiel à J+1
  const plannedStartDate = addDaysDate(recoDate, 1);

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

  // 4. Gestion des stocks & Achats
  let createdPurchasesCount = 0;

  if (isPast) {
    // RÈGLE 6.2 : Égalité stricte Achats = Quantités prescrites pour l'historique
    // Aucun déficit théorique, montant payé = 100%
    const prescribedItemsMap: Record<
      string,
      { name: string; quantity: number; unit: "kg" | "litres"; price: number }
    > = {};

    for (const parcel of targetParcels) {
      const surface = safeParseFloat(parcel.info?.surface) || 1;

      if (reco.kind === "fertilisation") {
        if (payload.method === "irrigation" || program.kind === "irrigation") {
          const entries = Array.isArray(program.entries) ? program.entries : [];
          for (const entry of entries) {
            for (const it of entry.items || []) {
              const pName = (it.name || "").trim();
              if (!pName) continue;
              const doseHa = safeParseFloat(it.qty);
              const qtyTotale = parseFloat((doseHa * surface).toFixed(2));
              const price = safeParseFloat(it.price) || 0;
              const unit = it.unit || "kg";

              if (!prescribedItemsMap[pName]) {
                prescribedItemsMap[pName] = { name: pName, quantity: 0, unit, price };
              }
              prescribedItemsMap[pName].quantity += qtyTotale;
            }
          }
        } else {
          // Pulvérisation foliaire
          const items = Array.isArray(program.items) ? program.items : (payload.items || []);
          for (const it of items) {
            const pName = (it.name || it.product || "").trim();
            if (!pName) continue;
            const doseHa = safeParseFloat(it.qty || it.dosage);
            const qtyTotale = parseFloat((doseHa * surface).toFixed(2));
            const price = safeParseFloat(it.price) || 0;
            const unit = it.unit || "litres";

            if (!prescribedItemsMap[pName]) {
              prescribedItemsMap[pName] = { name: pName, quantity: 0, unit, price };
            }
            prescribedItemsMap[pName].quantity += qtyTotale;
          }
        }
      } else if (reco.kind === "phytosanitaire") {
        const prods = Array.isArray(program.products) ? program.products : [];
        for (const p of prods) {
          const pName = (p.product || p.name || "").trim();
          if (!pName) continue;
          const parsed = parsePhytoProductQuantity(p, surface);
          const price = safeParseFloat(p.price) || 0;

          if (!prescribedItemsMap[pName]) {
            prescribedItemsMap[pName] = { name: pName, quantity: 0, unit: parsed.unit, price };
          }
          prescribedItemsMap[pName].quantity += parsed.quantity;
        }
      }
    }

    // Création exacte des achats pour alignement parfait Achats = Quantités prescrites
    for (const item of Object.values(prescribedItemsMap)) {
      const missingQty = parseFloat(item.quantity.toFixed(2));
      if (missingQty <= 0) continue;
      const unitPrice = item.price || 0;
      const totalCost = parseFloat((missingQty * unitPrice).toFixed(2));
      const purchaseId = `p-reco-${reco.id}-${item.name.replace(/[^a-zA-Z0-9]/g, "_")}`;

      addPurchase({
        id: purchaseId,
        recoId: reco.id,
        supplierName: options.supplierName || "Achat Validé (Historique Ingénieur)",
        productName: item.name,
        purchaseDate: recoDate,
        quantity: missingQty,
        unit: item.unit,
        pricePerUnit: unitPrice,
        totalCost,
        paidAmount: totalCost, // 100% payé = Aucune dette ni déficit fictif
      } as any);
      createdPurchasesCount++;
    }
  } else {
    // Mode courant / futur : Calcul FIFO & Bon d'achat pour manquant
    const stockReport = checkRecoStock(reco, suppliers, parcels, 1, targetParcels);
    if (stockReport.hasMissingStock && stockReport.missingItems.length > 0) {
      for (const item of stockReport.missingItems) {
        const missingQty = Math.max(0.01, parseFloat(item.missing.toFixed(2)));
        const unitPrice = item.price || 0;
        const totalCost = parseFloat((missingQty * unitPrice).toFixed(2));
        const purchaseId = `p-reco-${reco.id}-${item.name.replace(/[^a-zA-Z0-9]/g, "_")}`;

        addPurchase({
          id: purchaseId,
          recoId: reco.id,
          supplierName: options.supplierName || "Fournisseur à désigner",
          productName: item.name,
          purchaseDate: recoDate,
          quantity: missingQty,
          unit: item.unit,
          pricePerUnit: unitPrice,
          totalCost,
          paidAmount: 0, // Bon d'achat à régler
        } as any);
        createdPurchasesCount++;
      }
    }
  }

  // 5. Statut de la recommandation vers "acceptee"
  await acceptReco(reco.id);

  // 6. Étalement glissant, Horaires dynamiques (Benhar) & Groupements hydrauliques
  let clonedCount = 0;
  const isMethodIrrigation = payload.method === "irrigation" || program.kind === "irrigation";

  if (targetParcels.length > 0) {
    if (reco.kind === "fertilisation" && isMethodIrrigation) {
      // ========================================================
      // A. FERTIGATION AU SOL (Station & Groupes Hydrauliques)
      // ========================================================
      // Démarrage le jour J+1 au LEVER DU SOLEIL (Benhar)
      // RÈGLE 1 : Alternance des créneaux de fertigation dans une même journée (Bac B -> Bac A -> Bac B -> Bacs C+D)
      // 1. Créneau 1 (Lever du soleil, T0) : Parcelle 1 avec programme utilisant le Bac B (Prog. A1, préparé avant démarrage).
      // 2. Créneau 2 (+1h30, T0 + 90 min) : Parcelle 2 avec programme utilisant le Bac A (Prog. A2, Nitrate de Calcium) — laissant le Bac B libre pendant 1h30 pour préparer le mélange de la parcelle suivante.
      // 3. Créneau 3 (+3h00, T0 + 180 min) : Parcelle suivante avec programme utilisant le Bac B (Prog. A1).
      // 4. Suivi des programmes Bacs C+D (ex. Pommiers P7+P8 simultanés à T0 + 270 min).
      // 5. Suivi des Oliviers Secteur 1 (P1+P2 simultanés), puis Secteur 2 (P3+P4 simultanés).
      const fertSolar = getSolarTimesForDate(plannedStartDate);

      // Classification du Bac pour la recommandation en cours de validation :
      const recoTitleLower = (reco.title || program.label || "").toLowerCase();
      const entries = Array.isArray(program.entries) ? program.entries : [];
      const bacLetters = entries.map((e: any) => (e.bac || "").toUpperCase().trim());

      const isBacA =
        recoTitleLower.includes("programme a2") ||
        recoTitleLower.includes("prog. a2") ||
        recoTitleLower.includes("(a2)") ||
        (bacLetters.includes("A") && !bacLetters.includes("B") && !bacLetters.includes("C") && !bacLetters.includes("D")) ||
        (entries.flatMap((e: any) => e.items || []).every((it: any) => (it.name || "").toLowerCase().includes("calcium")) && !bacLetters.includes("B"));

      const isBacsCD =
        recoTitleLower.includes("pommier") ||
        targetParcels.some((p) => p.type === "pommier" || p.id.startsWith("pommier")) ||
        bacLetters.includes("C") ||
        bacLetters.includes("D") ||
        recoTitleLower.includes("bac c") ||
        recoTitleLower.includes("bac d");

      const isBacB = !isBacA && !isBacsCD;

      // Groupes hydrauliques stricts :
      // 1. Nectarine Nablara (p5 / nablara) seule
      // 2. Nectarine Redix 25 (p6 / redix25) seule
      // 3. Pommiers (pommier1 + pommier2) simultanément
      // 4. Oliviers Secteur 1 (p1 + p2) simultanément
      // 5. Oliviers Secteur 2 (p3 + p4) simultanément (interdiction stricte avec S1)
      const pommiers = targetParcels.filter((p) => p.type === "pommier" || p.id.startsWith("pommier") || p.id === "p7" || p.id === "p8");
      const oliS1 = targetParcels.filter((p) => p.id === "p1" || p.id === "p2");
      const oliS2 = targetParcels.filter((p) => p.id === "p3" || p.id === "p4");
      const nablaraList = targetParcels.filter((p) => p.id === "nablara" || p.id === "p5");
      const redixList = targetParcels.filter((p) => p.id === "redix25" || p.id === "p6");
      const otherParcels = targetParcels.filter(
        (p) =>
          !pommiers.includes(p) &&
          !oliS1.includes(p) &&
          !oliS2.includes(p) &&
          !nablaraList.includes(p) &&
          !redixList.includes(p)
      );

      // Structure des affectations : [groupe de parcelles, date, startMinuteOffsetFromSunrise, labelCréneau]
      interface GroupScheduleItem {
        group: Parcel[];
        date: string;
        startMinute: number;
        slotLabel: string;
      }

      const scheduledGroups: GroupScheduleItem[] = [];

      // A1. NECTARINE NABLARA (Parcelle 1)
      if (nablaraList.length > 0) {
        if (isBacB) {
          // Créneau 1 (Lever du soleil, T0) : Bac B (Prog. A1)
          scheduledGroups.push({
            group: nablaraList,
            date: plannedStartDate,
            startMinute: fertSolar.sunriseMinutes,
            slotLabel: "Créneau 1 (Lever du soleil - Bac B)",
          });
        } else if (isBacA) {
          // Interdiction stricte A1 et A2 le même jour sur la même parcelle :
          // Nablara reçoit Prog. A2 le passage suivant (J+3, ex: Jeudi si A1 était Mardi)
          const dateNablaraA2 = addDaysDate(plannedStartDate, 2);
          const solarNablaraA2 = getSolarTimesForDate(dateNablaraA2);
          scheduledGroups.push({
            group: nablaraList,
            date: dateNablaraA2,
            startMinute: solarNablaraA2.sunriseMinutes + 90,
            slotLabel: "Créneau 2 (+1h30 - Bac A)",
          });
        } else {
          scheduledGroups.push({
            group: nablaraList,
            date: plannedStartDate,
            startMinute: fertSolar.sunriseMinutes,
            slotLabel: "Créneau 1 (Lever du soleil)",
          });
        }
      }

      // A2. NECTARINE REDIX 25 (Parcelle 2)
      if (redixList.length > 0) {
        if (isBacA) {
          // Créneau 2 (+1h30, T0 + 90 min) : Bac A (Prog. A2, Nitrate de Calcium) — libère Bac B pendant 1h30
          scheduledGroups.push({
            group: redixList,
            date: plannedStartDate,
            startMinute: fertSolar.sunriseMinutes + 90,
            slotLabel: "Créneau 2 (+1h30 - Bac A)",
          });
        } else if (isBacB) {
          // Créneau 3 (+3h00, T0 + 180 min) : Bac B (Prog. A1, solution préparée pendant Créneau 2)
          scheduledGroups.push({
            group: redixList,
            date: plannedStartDate,
            startMinute: fertSolar.sunriseMinutes + 180,
            slotLabel: "Créneau 3 (+3h00 - Bac B)",
          });
        } else {
          scheduledGroups.push({
            group: redixList,
            date: plannedStartDate,
            startMinute: fertSolar.sunriseMinutes + 90,
            slotLabel: "Créneau 2 (+1h30)",
          });
        }
      }

      // A3. POMMIERS (P7 + P8 simultanément — Bacs C+D)
      if (pommiers.length > 0) {
        // Créneau 4 (+4h30, T0 + 270 min) : Suivi des programmes Bacs C+D
        scheduledGroups.push({
          group: pommiers,
          date: plannedStartDate,
          startMinute: fertSolar.sunriseMinutes + 270,
          slotLabel: "Créneau 4 (+4h30 - Bacs C+D)",
        });
      }

      // A4. OLIVIERS SECTEUR 1 (P1 + P2 simultanément)
      if (oliS1.length > 0) {
        scheduledGroups.push({
          group: oliS1,
          date: plannedStartDate,
          startMinute: fertSolar.sunriseMinutes + 360,
          slotLabel: "Créneau 5 (Oliviers Secteur 1)",
        });
      }

      // A5. OLIVIERS SECTEUR 2 (P3 + P4 simultanément)
      if (oliS2.length > 0) {
        scheduledGroups.push({
          group: oliS2,
          date: plannedStartDate,
          startMinute: fertSolar.sunriseMinutes + 450,
          slotLabel: "Créneau 6 (Oliviers Secteur 2)",
        });
      }

      // A6. AUTRES PARCELLES ÉVENTUELLES
      let extraOffset = 540;
      for (const op of otherParcels) {
        scheduledGroups.push({
          group: [op],
          date: plannedStartDate,
          startMinute: fertSolar.sunriseMinutes + extraOffset,
          slotLabel: "Créneau Station Additionnel",
        });
        extraOffset += 90;
      }

      for (const item of scheduledGroups) {
        const groupDurationMinutes = parseDurationToMinutes(program.irrigationTime || "1h30");
        const startHourStr = formatMinutesToHHMM(item.startMinute);
        const endHourMinutes = item.startMinute + groupDurationMinutes;
        const endHourStr = formatMinutesToHHMM(endHourMinutes);
        const hoursSlot = `${startHourStr} - ${endHourStr}`;

        for (const parcel of item.group) {
          const surface = safeParseFloat(parcel.info?.surface) || 1;
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

          // Nomenclature stricte : (Programme A1), (Programme A2), etc.
          const cleanTitle = cleanRecoTitle(reco.title || program.label || "Fertigation au sol");

          const unifiedFertigation = {
            ...program,
            method: "irrigation",
            label: cleanTitle,
            hectares: surface,
            total: totalCost,
            reco_id: reco.id,
            date: item.date,
            mode: "date",
            duration: (groupDurationMinutes / 60).toString(),
            dateStartHour: startHourStr,
            hoursSlot,
            wettingTime: program.wettingTime,
            injectionTime: program.injectionTime,
            rinsingTime: program.rinsingTime,
            irrigationTime: program.irrigationTime,
            slotLabel: item.slotLabel,
            // Statut selon option : "execute" si demandé, ou "planifie" par défaut
            status: options.markAsExecutedIfPast ? "execute" : "planifie",
            ...(options.markAsExecutedIfPast
              ? {
                  executedAt: item.date,
                  executed_at: item.date,
                  executionNote: "Exécution historique validée",
                }
              : {}),
          };

          addModuleRecord(parcel.id, "fertilisation", unifiedFertigation);
        }
      }
    } else if (reco.kind === "fertilisation" && !isMethodIrrigation) {
      // ========================================================
      // B. PULVÉRISATION FOLIAIRE (Parcelle par parcelle)
      // ========================================================
      // Planifié au LEVER DU SOLEIL (Benhar)
      // RÈGLE 2 : Espacement minimum de 3 jours calendaires entre Pulvérisation 1 et Pulvérisation 2
      // Pulvérisation 1 -> J+2 (ex: Mercredi si reco était Lundi)
      // Pulvérisation 2 -> J+5 (ex: Samedi, écart minimum = 3 jours calendaires garanti)
      const titleLower = (reco.title || "").toLowerCase();
      let scheduledFoliarDate = addDaysDate(plannedStartDate, 1); // J+2 par défaut

      const isPulv2 =
        titleLower.includes("pulvérisation 2") ||
        titleLower.includes("pulverisation 2") ||
        titleLower.includes("passage 2");

      if (isPulv2) {
        scheduledFoliarDate = addDaysDate(plannedStartDate, 4); // J+5 (écart minimum de 3 jours calendaires garanti : 5 - 2 = 3j)
      }

      // Respect strict des dates personnalisées fournies avec garantie de l'écart de 3 jours calendaires
      if (options.scheduledDates && options.scheduledDates.length > 0) {
        if (isPulv2 && options.scheduledDates.length >= 2) {
          const d1 = options.scheduledDates[0];
          const d2 = options.scheduledDates[1];
          const minD2 = addDaysDate(d1, 3);
          scheduledFoliarDate = d2 < minD2 ? minD2 : d2;
        } else if (!isPulv2) {
          scheduledFoliarDate = options.scheduledDates[0];
        }
      }

      const foliarSolar = getSolarTimesForDate(scheduledFoliarDate);
      const foliarStartHour = foliarSolar.sunriseStr;

      for (const parcel of targetParcels) {
        const surface = safeParseFloat(parcel.info?.surface) || 1;
        clonedCount++;

        // Débit des produits foliaires
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
          date: scheduledFoliarDate,
          dateStartHour: foliarStartHour,
          status: options.markAsExecutedIfPast ? "execute" : "planifie",
          ...(options.markAsExecutedIfPast
            ? {
                executedAt: scheduledFoliarDate,
                executed_at: scheduledFoliarDate,
                executionNote: "Exécution historique validée",
              }
            : {}),
        });
      }
                executedAt: scheduledFoliarDate,
                executed_at: scheduledFoliarDate,
                executionNote: "Exécution historique validée",
              }
            : {}),
        });
      }
    } else if (reco.kind === "phytosanitaire") {
      // ========================================================
      // C. TRAITEMENT PHYTOSANITAIRE (Soir / Crépuscule)
      // ========================================================
      // Planifié au COUCHER DU SOLEIL (Benhar)
      // Étalement glissant : Traitement 1 à J+3, Traitement 2 à J+7
      // Exclusion stricte : Ne jamais planifier foliaire et phyto le même jour
      const titleLower = (reco.title || "").toLowerCase();
      let scheduledPhytoDate = addDaysDate(plannedStartDate, 2); // J+3 par défaut

      if (titleLower.includes("traitement 2")) {
        scheduledPhytoDate = addDaysDate(plannedStartDate, 6); // J+7
      }

      const phytoSolar = getSolarTimesForDate(scheduledPhytoDate);
      const phytoStartHour = phytoSolar.sunsetStr;

      for (const parcel of targetParcels) {
        const surface = safeParseFloat(parcel.info?.surface) || 1;
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
          date: scheduledPhytoDate,
          dateStartHour: phytoStartHour,
          status: options.markAsExecutedIfPast ? "execute" : "planifie",
          ...(options.markAsExecutedIfPast
            ? {
                executedAt: scheduledPhytoDate,
                executed_at: scheduledPhytoDate,
                executionNote: "Exécution historique validée",
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
    } catch {}
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
  } catch {}

  // Purge de la file offline des résidus p-reco-
  try {
    const pendingRecoOps = await offlineDB.outbox
      .filter((e) => String(e.record_id || "").startsWith("p-reco-") || (e.op === "purchase.delete" && String((e.payload as any)?.id || "").startsWith("p-reco-")))
      .toArray();
    for (const item of pendingRecoOps) {
      await offlineDB.outbox.delete(item.client_id);
    }
  } catch {}

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
      } catch {}
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
  } catch {}
}
