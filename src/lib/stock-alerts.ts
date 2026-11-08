import type { Recommendation } from "@/lib/cloud/recommendations";
import type { SupplierPurchase } from "@/lib/suppliers-store";
import type { Parcel } from "@/data/parcels";
import { FERTILIZER_DATABASE } from "@/data/fertilizers";
import { PHYTO_DATABASE } from "@/data/phytosanitaires";

export interface RecoProductStockItem {
  name: string;
  needed: number;
  available: number;
  missing: number;
  unit: "kg" | "litres";
  price: number;
  cost: number;
  isMissing: boolean;
}

export interface RecoStockReport {
  hasMissingStock: boolean;
  items: RecoProductStockItem[];
  missingItems: RecoProductStockItem[];
  totalEstimatedMissingCost: number;
}

export function safeParseFloat(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  const str = String(val).trim().replace(",", ".");
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calcule avec précision la quantité réelle de produit phytosanitaire nécessaire
 * en fonction de la dose agronomique (par ha ou par hl), de la surface et du volume d'eau.
 * Évite rigoureusement de confondre le volume de bouillie (ex: 1000 L d'eau) avec la quantité de produit !
 */
export function parsePhytoProductQuantity(
  p: { product?: string; name?: string; dosage?: string; volume?: string | number },
  surface: number = 1,
  unitHint?: "kg" | "litres"
): { quantity: number; unit: "kg" | "litres" } {
  const prodName = (p.product || p.name || "").trim();
  const rawDosage = (p.dosage || "").trim().toLowerCase();
  const waterVolume = safeParseFloat(p.volume) || 1000;
  const safeSurface = Math.max(0.01, surface || 1);

  // 1. Déterminer l'unité réelle du produit (kg vs litres) depuis le catalogue si disponible
  let unit: "kg" | "litres" = unitHint || "litres";
  if (!unitHint) {
    const knownProd = FERTILIZER_DATABASE.find(
      (fp) => fp.name.trim().toLowerCase() === prodName.toLowerCase() ||
              prodName.toLowerCase().includes(fp.name.trim().toLowerCase()) ||
              fp.name.trim().toLowerCase().includes(prodName.toLowerCase())
    );
    if (knownProd) {
      unit = knownProd.unit;
    } else {
      const isKgDetected =
        rawDosage.includes("kg") ||
        rawDosage.includes("كغ") ||
        rawDosage.includes("كلغ") ||
        rawDosage.includes("كيلو") ||
        rawDosage.includes(" g ") ||
        rawDosage.includes("g/") ||
        rawDosage.includes("gramme") ||
        rawDosage.includes("غ") ||
        rawDosage.includes("غم") ||
        rawDosage.includes("غرام");
      unit = isKgDetected ? "kg" : "litres";
    }
  }

  // 2. Extraire les nombres du dosage (gère virgules, tirets, "à", "إلى")
  const normalized = rawDosage.replace(/,/g, ".");
  const numbers = normalized.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  
  // Si l'un des nombres est 100 et qu'il s'agit du volume de référence (/ 100 l ou / 100 لتر), on l'exclut
  const filteredNumbers = numbers.filter((n) => {
    if (n === 100 && (
      normalized.includes("/ 100") ||
      normalized.includes("/100") ||
      normalized.includes("100 l") ||
      normalized.includes("100l") ||
      normalized.includes("100لتر") ||
      normalized.includes("100 لتر") ||
      normalized.includes("100ل") ||
      normalized.includes("100 ل")
    )) {
      return false;
    }
    return true;
  });

  let doseValue = 0;
  if (filteredNumbers.length === 1) {
    doseValue = filteredNumbers[0];
  } else if (filteredNumbers.length >= 2) {
    doseValue = (filteredNumbers[0] + filteredNumbers[1]) / 2;
  } else if (numbers.length > 0) {
    doseValue = numbers[0];
  }

  if (doseValue <= 0) {
    const staticPhyto = PHYTO_DATABASE.find(
      (sp) => sp.name.toLowerCase() === prodName.toLowerCase()
    );
    if (staticPhyto && staticPhyto.dosage) {
      return parsePhytoProductQuantity({ ...p, dosage: staticPhyto.dosage }, safeSurface, unit);
    }
    return { quantity: parseFloat((1 * safeSurface).toFixed(2)), unit };
  }

  // 3. Cas A : Dosage par hectolitre (/ hl, / 100 l, 100 لتر)
  const isPerHl =
    normalized.includes("/ hl") ||
    normalized.includes("/hl") ||
    normalized.includes("hl") ||
    normalized.includes("/ 100") ||
    normalized.includes("/100") ||
    normalized.includes("100 لتر") ||
    normalized.includes("100لتر") ||
    normalized.includes("100ل") ||
    normalized.includes("100 ل");

  const isGramsOrMl =
    (normalized.includes("g") ||
     normalized.includes("cc") ||
     normalized.includes("ml") ||
     normalized.includes("غ") ||
     normalized.includes("غم") ||
     normalized.includes("غرام") ||
     normalized.includes("مل")) &&
    !normalized.includes("kg") &&
    !normalized.includes("كغ") &&
    !normalized.includes("كلغ") &&
    !normalized.includes("كيلو");

  if (isPerHl) {
    const hlCount = waterVolume / 100;
    let qtyPerHl = doseValue;
    if (isGramsOrMl) {
      qtyPerHl = doseValue / 1000;
    }
    const totalQty = parseFloat((qtyPerHl * hlCount).toFixed(2));
    return { quantity: Math.max(0.01, totalQty), unit };
  }

  // 4. Cas B : Dosage par hectare (/ ha ou /ha ou هكتار) ou valeur directe
  let qtyPerHa = doseValue;
  if (isGramsOrMl) {
    qtyPerHa = doseValue / 1000;
  }

  const totalQty = parseFloat((qtyPerHa * safeSurface).toFixed(2));
  return { quantity: Math.max(0.01, totalQty), unit };
}

export function matchProductName(a: string, b: string): boolean {
  if (!a || !b) return false;
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  if (cleanA === cleanB) return true;
  // Découper sur le slash (ex: "Urée / يوريا" -> "urée")
  const partA = cleanA.split("/")[0].trim();
  const partB = cleanB.split("/")[0].trim();
  if (partA && partB && (partA === partB || partA.includes(partB) || partB.includes(partA))) {
    return true;
  }
  return false;
}

export function getTargetParcelsForReco(reco: Recommendation, parcels: Parcel[] = []): Parcel[] {
  if (!reco || !Array.isArray(parcels)) return [];

  if (reco.parcel_ids && reco.parcel_ids.length > 0) {
    return parcels.filter((p) => p && reco.parcel_ids.includes(p.id));
  }

  const payload = (reco.payload ?? {}) as any;
  const rawGroups = payload?.crop_group;
  const groups: string[] = Array.isArray(rawGroups)
    ? rawGroups
    : rawGroups
    ? [rawGroups]
    : [];

  if (groups.length === 0) return parcels;

  const parcelMatchesGroup = (parcel: Parcel, group: string) => {
    if (!parcel || !group || typeof group !== "string") return false;
    const g = group.toLowerCase();
    const pType = (parcel.type || "").toLowerCase();
    const pId = (parcel.id || "").toLowerCase();
    const pName = (parcel.name || "").toLowerCase();

    if (g === "oliviers") return pType === "olivier";
    if (g === "pommiers") return pType === "pommier";
    if (g === "nectarinier") return pType === "nectarine";
    if (g === "redix25") return pId === "redix25" || pName.includes("redix");
    if (g === "nablara") return pId === "nablara" || pName.includes("nablara");
    if (g === "casuarina") return pName.includes("casuarina") || pId === "brisevent";
    if (g === "p9") return pId === "p9";
    if (g === "p10") return pId === "p10";
    if (g === "p11") return pId === "p11";
    if (g === "p12") return pId === "p12";
    return false;
  };

  return parcels.filter((p) => groups.some((g) => parcelMatchesGroup(p, g)));
}

/**
 * Calcule les stocks requis et disponibles pour une recommandation.
 * @param reco La recommandation à analyser
 * @param suppliers Liste des achats/stocks fournisseurs
 * @param parcels Liste des parcelles
 * @param repeatPassages Nombre total de répétitions / passages prévus
 * @param customTargetParcels Parcelles explicitement choisies par l'utilisateur
 */
export function checkRecoStock(
  reco: Recommendation,
  suppliers: SupplierPurchase[] = [],
  parcels: Parcel[] = [],
  repeatPassages: number = 1,
  customTargetParcels?: Parcel[]
): RecoStockReport {
  const emptyReport: RecoStockReport = {
    hasMissingStock: false,
    items: [],
    missingItems: [],
    totalEstimatedMissingCost: 0,
  };

  if (!reco) return emptyReport;

  try {
    const targetParcels = Array.isArray(customTargetParcels) && customTargetParcels.length > 0
      ? customTargetParcels
      : getTargetParcelsForReco(reco, parcels);

    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const payload = (reco.payload ?? {}) as any;
    const program = payload?.program || {};

    const sumsMap: Record<string, { name: string; neededPerPassage: number; unit: "kg" | "litres"; price: number }> = {};

    if (reco.kind === "fertilisation") {
      if (payload.method === "irrigation") {
        if (Array.isArray(program.entries)) {
          for (const entry of program.entries) {
            if (Array.isArray(entry.items)) {
              for (const it of entry.items) {
                const name = it.name?.trim();
                if (!name) continue;
                const doseHa = safeParseFloat(it.qty);
                const price = safeParseFloat(it.price);
                const unit: "kg" | "litres" = (it.unit === "litres" || it.unit === "L") ? "litres" : "kg";

                for (const parcel of targetParcels) {
                  const surface = safeParseFloat(parcel?.info?.surface) || 1;
                  const totalParcelQty = doseHa * surface;
                  if (!sumsMap[name]) {
                    sumsMap[name] = { name, neededPerPassage: 0, unit, price };
                  }
                  sumsMap[name].neededPerPassage += totalParcelQty;
                }
              }
            }
          }
        }
      } else {
        // Pulvérisation foliaire
        if (Array.isArray(program.items)) {
          for (const it of program.items) {
            const name = it.name?.trim();
            if (!name) continue;
            const qty = safeParseFloat(it.qty);
            const price = safeParseFloat(it.price);
            const unit: "kg" | "litres" = (it.unit === "litres" || it.unit === "L") ? "litres" : "kg";
            if (!sumsMap[name]) {
              sumsMap[name] = { name, neededPerPassage: 0, unit, price };
            }
            sumsMap[name].neededPerPassage += qty;
          }
        }
      }
    } else if (reco.kind === "phytosanitaire") {
      if (Array.isArray(program.products)) {
        const totalSurface = targetParcels.reduce(
          (sum, parcel) => sum + (safeParseFloat(parcel?.info?.surface) || 1),
          0
        ) || 1;

        for (const p of program.products) {
          const name = (p.product || p.name)?.trim();
          if (!name) continue;
          const parsed = parsePhytoProductQuantity(p, totalSurface);
          const price = safeParseFloat(p.price);
          if (!sumsMap[name]) {
            sumsMap[name] = { name, neededPerPassage: 0, unit: parsed.unit, price };
          }
          sumsMap[name].neededPerPassage += parsed.quantity;
        }
      }
    }

    // Stock disponible par produit
    const getProductStock = (prodName: string): number => {
      return safeSuppliers
        .filter((p) => p && matchProductName(p.productName, prodName))
        .reduce((sum, p) => sum + Math.max(0, (p.quantity || 0) - (p.consumed || 0)), 0);
    };

    const items: RecoProductStockItem[] = [];
    const missingItems: RecoProductStockItem[] = [];
    let totalEstimatedMissingCost = 0;

    for (const key of Object.keys(sumsMap)) {
      const raw = sumsMap[key];
      const totalNeeded = parseFloat((raw.neededPerPassage * repeatPassages).toFixed(2));
      const available = parseFloat(getProductStock(raw.name).toFixed(2));
      const missing = parseFloat(Math.max(0, totalNeeded - available).toFixed(2));
      const cost = parseFloat((missing * raw.price).toFixed(2));
      const isMissing = missing > 0;

      const item: RecoProductStockItem = {
        name: raw.name,
        needed: totalNeeded,
        available,
        missing,
        unit: raw.unit,
        price: raw.price,
        cost,
        isMissing,
      };

      items.push(item);
      if (isMissing) {
        missingItems.push(item);
        totalEstimatedMissingCost += cost;
      }
    }

    return {
      hasMissingStock: missingItems.length > 0,
      items,
      missingItems,
      totalEstimatedMissingCost: parseFloat(totalEstimatedMissingCost.toFixed(2)),
    };
  } catch (err) {
    console.error("Erreur calcul checkRecoStock:", err);
    return emptyReport;
  }
}

/**
 * Calcule l'ensemble des dates d'application selon la date de départ, le nombre de semaines et la fréquence.
 * Ex: Début Mardi 10 Mars, 4 semaines, 2 fois par semaine ->
 *     Semaine 1: Mardi 10 Mars & Samedi 14 Mars (+4j)
 *     Semaine 2: Mardi 17 Mars & Samedi 21 Mars
 *     Semaine 3: Mardi 24 Mars & Samedi 28 Mars
 *     Semaine 4: Mardi 31 Mars & Samedi 04 Avril
 */
export function computeScheduledDates(
  startDateStr: string,
  weeks: number = 1,
  passagesPerWeek: number = 1,
  secondDayOffset: number = 4
): string[] {
  const dates: string[] = [];
  const cleanDate = startDateStr ? startDateStr.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const [y, m, d] = cleanDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);

  if (isNaN(start.getTime())) {
    return [cleanDate];
  }

  const effectiveWeeks = Math.max(1, weeks);
  const effectivePassages = Math.max(1, Math.min(7, passagesPerWeek));

  for (let w = 0; w < effectiveWeeks; w++) {
    // 1er passage de la semaine (ex: Mardi)
    const d1 = new Date(start);
    d1.setDate(start.getDate() + w * 7);
    const iso1 = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`;
    if (!dates.includes(iso1)) {
      dates.push(iso1);
    }

    // 2ème passage si 2x par semaine (ex: Samedi = Mardi + 4 jours)
    if (effectivePassages >= 2) {
      const d2 = new Date(d1);
      d2.setDate(d1.getDate() + secondDayOffset);
      const iso2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
      if (!dates.includes(iso2)) {
        dates.push(iso2);
      }
    }
  }

  return dates.sort();
}

/**
 * Calcule les dates d'irrigation seule (eau claire / sans fertilisation) par semaine.
 * Ex: Si fertigation Mardi (J0) et Samedi (J4), l'irrigation seule se place idéalement le Jeudi (J2).
 */
export function computePureIrrigationDates(
  startDateStr: string,
  weeks: number = 1,
  purePassagesPerWeek: number = 1,
  fertPassagesPerWeek: number = 1,
  secondDayOffset: number = 4
): string[] {
  if (purePassagesPerWeek <= 0) return [];
  const dates: string[] = [];
  const cleanDate = startDateStr ? startDateStr.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const [y, m, d] = cleanDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);

  if (isNaN(start.getTime())) {
    return [];
  }

  const effectiveWeeks = Math.max(1, weeks);

  // Déterminer les jours d'irrigation seule dans la semaine (offsets en jours par rapport à start)
  let offsets: number[] = [];
  if (purePassagesPerWeek === 1) {
    if (fertPassagesPerWeek >= 2) {
      // Si fertigation à J0 et J4 (ex: Mardi et Samedi), irrigation seule à J2 (Jeudi)
      offsets = [Math.floor(secondDayOffset / 2) || 2];
    } else {
      // Si fertigation 1x/semaine à J0, irrigation seule à J3 (ex: Vendredi si Mardi)
      offsets = [3];
    }
  } else if (purePassagesPerWeek === 2) {
    offsets = fertPassagesPerWeek >= 2 ? [2, 6] : [2, 4];
  } else if (purePassagesPerWeek >= 3) {
    offsets = [1, 3, 5];
  }

  for (let w = 0; w < effectiveWeeks; w++) {
    for (const offset of offsets) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + offset);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (!dates.includes(iso)) {
        dates.push(iso);
      }
    }
  }

  return dates.sort();
}


