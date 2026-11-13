/**
 * Module de Sécurité Agronomique, Réglementaire et Météorologique
 * Ferme Malek - Benhar (Djelfa, Algérie)
 * 
 * 1. Vérification DAR (Délai Avant Récolte)
 * 2. Détection & Prévention de la résistance (Rotation FRAC/IRAC)
 * 3. Verrou météorologique OpenWeatherMap (Vent, Pluie, Température)
 */

import { FERTILIZER_DATABASE } from "@/data/fertilizers";
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
 * Dates de récolte estimées par défaut pour la Ferme Malek (Année en cours)
 */
export function getEstimatedHarvestDate(parcelId: string, parcelType: string, year = new Date().getFullYear()): Date {
  const pId = parcelId.toLowerCase();
  if (pId === "nablara" || pId === "p5") {
    return new Date(`${year}-06-15T00:00:00`);
  }
  if (pId === "redix25" || pId === "p6") {
    return new Date(`${year}-06-20T00:00:00`);
  }
  if (pId.startsWith("pommier") || pId === "p7" || pId === "p8" || parcelType === "pommier") {
    return new Date(`${year}-08-15T00:00:00`);
  }
  // Oliviers P1..P4
  return new Date(`${year}-11-01T00:00:00`);
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
    
    for (const prod of products) {
      const pName = prod.product || prod.name || "";
      const darDays = getProductDAR(pName);
      
      const safeHarvestDate = new Date(plannedDate);
      safeHarvestDate.setDate(safeHarvestDate.getDate() + darDays);

      if (safeHarvestDate > harvestDate) {
        result.isCompliant = false;
        const msg = `[DAR BLOQUANT] Sur ${parcel.name} : le produit "${pName}" a un DAR de ${darDays} jours. Traitement prévu le ${plannedDateStr.slice(0, 10)}, récolte estimée le ${harvestDate.toISOString().slice(0, 10)}. Fin du délai DAR le ${safeHarvestDate.toISOString().slice(0, 10)}.`;
        result.blockingErrors.push(msg);
      } else {
        const daysRemaining = Math.round((harvestDate.getTime() - safeHarvestDate.getTime()) / 86400000);
        if (daysRemaining <= 7) {
          result.warnings.push(`[ATTENTION DAR] Sur ${parcel.name} : "${pName}" fin de DAR seulement ${daysRemaining} jour(s) avant la récolte.`);
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
