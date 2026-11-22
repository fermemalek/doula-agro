/**
 * Module de Sécurité Agronomique, Réglementaire et Météorologique
 * Ferme Malek - Benhar (Djelfa, Algérie)
 * 
 * 1. Vérification DAR (Délai Avant Récolte)
 * 2. Détection & Prévention de la résistance (Rotation FRAC/IRAC)
 * 3. Verrou météorologique OpenWeatherMap (Vent, Pluie, Température)
 */

import { FERTILIZER_DATABASE } from "@/data/fertilizers";
import { getIracFracCode } from "@/data/phytosanitaires";
import type { Parcel } from "@/data/parcels";
import type { Recommendation } from "@/lib/cloud/recommendations";

export interface DARCheckResult {
  isCompliant: boolean;
  warnings: string[];
  blockingErrors: string[];
}

export interface FRACIRACCheckResult {
  isCompliant: boolean;
  warnings: string[];
}

export interface WeatherSafetyResult {
  isSafe: boolean;
  shouldDelayToNextDay: boolean;
  reason?: string;
  details?: {
    tempC?: number;
    windKmh?: number;
    rainMm?: number;
    description?: string;
  };
}

/**
 * Dates de récolte prévisionnelles centralisées par espèce (Campagne 2026 — configurables par année) :
 * - Nectarinier (P5, P6) : 25 Juin (2026-06-25)
 * - Pommier (P7, P8)     : 1er Août (2026-08-01)
 * - Olivier (P1 à P4)    : 15 Novembre (2026-11-15)
 */
export type HarvestSpeciesKey = "nectarinier" | "pommier" | "olivier";

export const DEFAULT_HARVEST_DATES_BY_SPECIES: Record<
  HarvestSpeciesKey,
  { month: number; day: number; labelFr: string; labelAr: string }
> = {
  nectarinier: { month: 6, day: 25, labelFr: "Nectarinier", labelAr: "النكتارين" },
  pommier: { month: 8, day: 1, labelFr: "Pommier", labelAr: "التفاح" },
  olivier: { month: 11, day: 15, labelFr: "Olivier", labelAr: "الزيتون" },
};

export function resolveHarvestSpeciesKey(parcelIdOrSpecies: string, parcelType = ""): HarvestSpeciesKey {
  const s = `${parcelIdOrSpecies || ""} ${parcelType || ""}`.toLowerCase();
  if (s.includes("nablara") || s.includes("p5") || s.includes("redix") || s.includes("p6") || s.includes("nectar") || s.includes("pech")) {
    return "nectarinier";
  }
  if (s.includes("pomm") || s.includes("p7") || s.includes("p8") || s.includes("apple")) {
    return "pommier";
  }
  return "olivier";
}

export function getEstimatedHarvestDateISO(
  parcelIdOrSpecies: string,
  parcelType = "",
  referenceDateOrYear: number | Date | string = new Date(),
  customOverrides?: Partial<Record<HarvestSpeciesKey, string>>
): string {
  const key = resolveHarvestSpeciesKey(parcelIdOrSpecies, parcelType);
  if (customOverrides && customOverrides[key]) {
    return customOverrides[key]!;
  }
  const cfg = DEFAULT_HARVEST_DATES_BY_SPECIES[key];

  // Si on reçoit une date de référence (traitement / aujourd'hui), avancer automatiquement à année + 1 si déjà passée
  if (typeof referenceDateOrYear === "number") {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const candidate = new Date(referenceDateOrYear, cfg.month - 1, cfg.day);
    const targetYear = candidate.getTime() < todayMidnight.getTime() ? referenceDateOrYear + 1 : referenceDateOrYear;
    return `${targetYear}-${String(cfg.month).padStart(2, "0")}-${String(cfg.day).padStart(2, "0")}`;
  }

  const refDate =
    typeof referenceDateOrYear === "string"
      ? new Date(`${referenceDateOrYear.slice(0, 10)}T00:00:00`)
      : new Date(referenceDateOrYear.getFullYear(), referenceDateOrYear.getMonth(), referenceDateOrYear.getDate());
  const baseYear = isNaN(refDate.getTime()) ? new Date().getFullYear() : refDate.getFullYear();
  const candidate = new Date(baseYear, cfg.month - 1, cfg.day);
  const targetYear = !isNaN(refDate.getTime()) && candidate.getTime() < refDate.getTime() ? baseYear + 1 : baseYear;
  return `${targetYear}-${String(cfg.month).padStart(2, "0")}-${String(cfg.day).padStart(2, "0")}`;
}

export function getEstimatedHarvestDate(parcelId: string, parcelType: string, yearOrDate: number | Date | string = new Date()): Date {
  const iso = getEstimatedHarvestDateISO(parcelId, parcelType, yearOrDate);
  return new Date(`${iso}T00:00:00`);
}

/**
 * Calcule automatiquement joursAvantRecolte = diffInDays(harvestDate, treatmentDate)
 */
export function computeDaysBeforeHarvest(
  parcelIdOrSpecies: string,
  treatmentDate: string | Date = new Date(),
  customHarvestDateISO?: string,
  parcelType = ""
): number {
  const tDate = typeof treatmentDate === "string"
    ? new Date(`${treatmentDate.slice(0, 10)}T00:00:00`)
    : new Date(treatmentDate.getFullYear(), treatmentDate.getMonth(), treatmentDate.getDate());
  const harvestIso = customHarvestDateISO && customHarvestDateISO.length >= 10
    ? customHarvestDateISO.slice(0, 10)
    : getEstimatedHarvestDateISO(parcelIdOrSpecies, parcelType, tDate);
  const hDate = new Date(`${harvestIso}T00:00:00`);
  if (isNaN(hDate.getTime()) || isNaN(tDate.getTime())) return 45;
  return Math.round((hDate.getTime() - tDate.getTime()) / 86400000);
}

/**
 * Récupère le DAR (Délai Avant Récolte en jours) pour un produit phytosanitaire
 */
export function getProductDAR(productName: string): number {
  if (!productName) return 14;
  const pClean = productName.toLowerCase().trim();
  const found = FERTILIZER_DATABASE.find(
    (f) => f.type.toLowerCase().includes("phyto") && f.name.toLowerCase().includes(pClean)
  );
  if (found && typeof found.solubility === "number" && found.solubility > 0 && found.solubility <= 90) {
    return found.solubility;
  }
  // DAR par défaut selon produits usuels
  if (pClean.includes("decis") || pClean.includes("bellis")) return 7;
  if (pClean.includes("score") || pClean.includes("calypso") || pClean.includes("sivanto") || pClean.includes("amistar") || pClean.includes("azostar")) return 14;
  if (pClean.includes("criptan")) return 21;
  return 14;
}

/**
 * 1. Vérification du respect du DAR
 */
export function checkDARCompliance(
  reco: Recommendation,
  targetParcels: Parcel[],
  plannedDateStr: string
): DARCheckResult {
  const result: DARCheckResult = {
    isCompliant: true,
    warnings: [],
    blockingErrors: [],
  };

  if (reco.kind !== "phytosanitaire") {
    return result;
  }

  const payload = (reco.payload ?? {}) as any;
  const program = payload.program || {};
  const products: any[] = Array.isArray(program.products) ? program.products : [];
  if (products.length === 0) return result;

  const plannedDate = new Date(`${plannedDateStr.slice(0, 10)}T00:00:00`);
  const year = plannedDate.getFullYear();

  for (const parcel of targetParcels) {
    const harvestDate = getEstimatedHarvestDate(parcel.id, parcel.type, year);
    const daysBeforeHarvest = computeDaysBeforeHarvest(parcel.id, plannedDate, undefined, parcel.type);
    const isOlivier = resolveHarvestSpeciesKey(parcel.id, parcel.type) === "olivier";

    for (const prod of products) {
      const pName = prod.product || prod.name || "";
      let darDays = getProductDAR(pName);
      const codeGroup = getIracFracCode(pName).toUpperCase();
      // DAR spécial Huile d'Olive (28 j) sur pyréthrinoïdes IRAC 3A lipophiles
      const isOliveOilLipophile = isOlivier && codeGroup.includes("3A");
      if (isOliveOilLipophile && darDays < 28) {
        darDays = 28;
      }

      const safeHarvestDate = new Date(plannedDate);
      safeHarvestDate.setDate(safeHarvestDate.getDate() + darDays);

      // Ne bloquer le DAR que pour les traitements AVANT récolte (un traitement post-récolte est autorisé)
      if (daysBeforeHarvest >= 0 && darDays > daysBeforeHarvest) {
        result.isCompliant = false;
        const msg = isOliveOilLipophile
          ? `[DAR HUILE D'OLIVE BLOQUANT] Sur ${parcel.name} : "${pName}" (IRAC 3A lipophile) exige un DAR de 28 jours pour huile d'olive, or la récolte estimée (${harvestDate.toISOString().slice(0, 10)}) est dans ${daysBeforeHarvest} jour(s).`
          : `[DAR BLOQUANT] Sur ${parcel.name} : le produit "${pName}" a un DAR de ${darDays} jours. Traitement prévu le ${plannedDateStr.slice(0, 10)}, récolte estimée le ${harvestDate.toISOString().slice(0, 10)} (${daysBeforeHarvest} j restants). Fin du délai DAR le ${safeHarvestDate.toISOString().slice(0, 10)}.`;
        result.blockingErrors.push(msg);
      } else if (daysBeforeHarvest >= 0) {
        const daysRemaining = daysBeforeHarvest - darDays;
        if (daysRemaining <= 7) {
          result.warnings.push(`[ATTENTION DAR] Sur ${parcel.name} : "${pName}" fin de DAR seulement ${daysRemaining} jour(s) avant la récolte (${harvestDate.toISOString().slice(0, 10)}).`);
        }
      }
    }
  }

  return result;
}

/**
 * 2. Vérification de la rotation des matières actives (FRAC / IRAC)
 */
export function checkFRACIRACRotation(
  reco: Recommendation,
  targetParcels: Parcel[],
  recentRecords: any[]
): FRACIRACCheckResult {
  const result: FRACIRACCheckResult = {
    isCompliant: true,
    warnings: [],
  };

  if (reco.kind !== "phytosanitaire") return result;

  const payload = (reco.payload ?? {}) as any;
  const program = payload.program || {};
  const currentProducts: any[] = Array.isArray(program.products) ? program.products : [];

  for (const parcel of targetParcels) {
    // Trouver les derniers traitements phytos sur cette parcelle
    const parcelPhytos = (recentRecords || [])
      .filter((r) => r.parcel_id === parcel.id && (r.module_id === "phytosanitaire" || r.kind === "phytosanitaire"))
      .sort((a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime());

    if (parcelPhytos.length > 0) {
      const lastPhyto = parcelPhytos[0];
      const lastPayload = (lastPhyto.data || lastPhyto.payload || lastPhyto) as any;
      const lastProducts: any[] = Array.isArray(lastPayload.products) ? lastPayload.products : [];

      for (const curr of currentProducts) {
        const currName = (curr.product || curr.name || "").toLowerCase().trim();
        const currDb = FERTILIZER_DATABASE.find((f) => f.name.toLowerCase().includes(currName));
        const currActive = currDb?.matiereActive || currName;

        for (const prev of lastProducts) {
          const prevName = (prev.product || prev.name || "").toLowerCase().trim();
          const prevDb = FERTILIZER_DATABASE.find((f) => f.name.toLowerCase().includes(prevName));
          const prevActive = prevDb?.matiereActive || prevName;

          if (currActive && prevActive && currActive.toLowerCase() === prevActive.toLowerCase()) {
            result.warnings.push(
              `[RISQUE RÉSISTANCE FRAC/IRAC] Sur ${parcel.name} : La matière active "${currActive}" a déjà été appliquée lors du précédent traitement du ${lastPhyto.date || "récent"}. Il est fortement recommandé d'alterner les familles chimiques.`
            );
          }
        }
      }
    }
  }

  return result;
}

/**
 * 3. Vérification Météo OpenWeatherMap pour Benhar (Djelfa)
 * Coordonnées : 35.286281, 3.103180
 * Limites : Vent > 15-20 km/h, Pluie 4-6h, Temp < 5°C ou > 28°C
 */
const OWM_API_KEY = "bf25aea04e7472340b83660d13931cd5";
const BENHAR_LAT = 35.286281;
const BENHAR_LON = 3.103180;

export async function checkWeatherSuitabilityForDate(targetDateStr: string): Promise<WeatherSafetyResult> {
  const targetDay = targetDateStr.slice(0, 10);
  const now = new Date();
  const targetDate = new Date(`${targetDay}T12:00:00Z`);
  const diffDays = Math.round((targetDate.getTime() - now.getTime()) / 86400000);

  // Si la date est passée ou supérieure à 5 jours, météo non disponible en prévision horaire précise
  if (diffDays < 0 || diffDays > 5) {
    return { isSafe: true, shouldDelayToNextDay: false };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${BENHAR_LAT}&lon=${BENHAR_LON}&appid=${OWM_API_KEY}&units=metric&lang=fr`;
    const res = await fetch(url);
    if (!res.ok) {
      return { isSafe: true, shouldDelayToNextDay: false };
    }
    const data = await res.json();
    const forecasts: any[] = data.list || [];

    // Filtrer les prévisions pour la journée cible (matin et après-midi : 06h à 18h)
    const dayForecasts = forecasts.filter((f) => {
      const dtTxt = f.dt_txt || "";
      return dtTxt.startsWith(targetDay);
    });

    if (dayForecasts.length === 0) {
      return { isSafe: true, shouldDelayToNextDay: false };
    }

    for (const f of dayForecasts) {
      const windKmh = (f.wind?.speed || 0) * 3.6; // m/s to km/h
      const tempC = f.main?.temp || 20;
      const rainMm = f.rain?.["3h"] || 0;
      const desc = f.weather?.[0]?.description || "";

      if (windKmh > 20) {
        return {
          isSafe: false,
          shouldDelayToNextDay: true,
          reason: `Vent fort prévu à Benhar (${Math.round(windKmh)} km/h > 20 km/h). Risque de dérive important des pulvérisations.`,
          details: { windKmh, tempC, rainMm, description: desc },
        };
      }
      if (rainMm > 0.5) {
        return {
          isSafe: false,
          shouldDelayToNextDay: true,
          reason: `Pluie prévue à Benhar (${rainMm} mm). Risque de lessivage des produits de traitement.`,
          details: { windKmh, tempC, rainMm, description: desc },
        };
      }
      if (tempC < 5) {
        return {
          isSafe: false,
          shouldDelayToNextDay: true,
          reason: `Température trop basse (${Math.round(tempC)}°C < 5°C). Efficacité réduite et risque de phytotoxicité.`,
          details: { windKmh, tempC, rainMm, description: desc },
        };
      }
      if (tempC > 28) {
        return {
          isSafe: false,
          shouldDelayToNextDay: true,
          reason: `Forte chaleur prévue (${Math.round(tempC)}°C > 28°C). Évaporation rapide et risque de brûlure foliaire.`,
          details: { windKmh, tempC, rainMm, description: desc },
        };
      }
    }

    return {
      isSafe: true,
      shouldDelayToNextDay: false,
      details: {
        windKmh: Math.round((dayForecasts[0].wind?.speed || 0) * 3.6),
        tempC: Math.round(dayForecasts[0].main?.temp || 20),
        rainMm: dayForecasts[0].rain?.["3h"] || 0,
        description: dayForecasts[0].weather?.[0]?.description || "Favorable",
      },
    };
  } catch (err) {
    console.warn("Échec requête météo Benhar:", err);
    return { isSafe: true, shouldDelayToNextDay: false };
  }
}

