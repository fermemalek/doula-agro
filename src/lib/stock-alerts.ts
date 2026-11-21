import type { Recommendation } from "@/lib/cloud/recommendations";
import type { SupplierPurchase } from "@/lib/suppliers-store";
import type { Parcel } from "@/data/parcels";
import { FERTILIZER_DATABASE } from "@/data/fertilizers";
import { PHYTO_DATABASE } from "@/data/phytosanitaires";
import { AGRIMAX_PHYSICAL_RETURNS } from "@/data/agrimax-purchases";

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

export type RecoStockStatus = "available" | "low" | "missing";

export interface RecoStockReport {
  hasMissingStock: boolean;
  isLowStock: boolean;
  stockStatus: RecoStockStatus;
  items: RecoProductStockItem[];
  missingItems: RecoProductStockItem[];
  lowStockItems: RecoProductStockItem[];
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
 * CORRECTION 6 — Volumes de bouillie réels par parcelle (Cuve 1 000 L) :
 * - Oliviers (P1 à P4) : 500 L / parcelle (2 000 L total)
 * - Nectarines (P5, P6) : 1 000 L / parcelle (2 000 L total)
 * - Pommiers (P7, P8)   : 500 L / parcelle (1 000 L total P7+P8)
 */
export function getParcelSprayVolumeLiters(parcel: Parcel): number {
  const pId = (parcel?.id || "").toLowerCase();
  const pType = (parcel?.type || "").toLowerCase();
  if (pId === "nablara" || pId === "p5" || pId === "redix25" || pId === "p6" || pType === "nectarine") {
    return 1000;
  }
  if (pId.startsWith("pommier") || pId === "p7" || pId === "p8" || pType === "pommier") {
    return 500;
  }
  if (pId === "p1" || pId === "p2" || pId === "p3" || pId === "p4" || pType === "olivier") {
    return 500;
  }
  return 1000;
}

/**
 * CORRECTION 6 — Unités strictes des acides :
 * - Acide Phosphorique & Acide Nitrique => toujours en Litres ("litres")
 * - Acide Citrique & Acide Ascorbique   => toujours en Kilogrammes ("kg")
 */
export function enforceAcidUnit(productName: string, fallbackUnit: "kg" | "litres"): "kg" | "litres" {
  const norm = (productName || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (norm.includes("acide phosphorique") || norm.includes("acide nitrique")) {
    return "litres";
  }
  if (norm.includes("acide citrique") || norm.includes("acide ascorbique")) {
    return "kg";
  }
  return fallbackUnit;
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

function normalizeProductKey(raw: string): string {
  return (raw || "")
    .split("/")[0]
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_(),.%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PRODUCT_SYNONYM_GROUPS: string[][] = [
  ["uree", "uree 46", "urea"],
  ["calcibore", "calcibore 10l", "calcium bore", "ca bore", "bore calcium"],
  ["sulfate de potassium", "sulfate de potasse", "potasse", "0 0 50", "sop"],
  ["npk 13 0 46", "13 0 46", "nitrate de potassium", "nitrate de potasse"],
  ["nitrate de calcium", "nitrate de chaux"],
  ["nitrate de magnesium", "nitrate de magnesie"],
  ["sulfate de magnesium", "sulfate de magnesie", "sulfate ed magnesium", "sulfate de magnsium"],
  ["sulfate d ammonium", "sulfate dammonium", "sulfate d ammonium 21", "ammonitrate 21"],
  ["acide phosphorique", "acide phosphorique 85", "acide phosphorique 85 20l"],
  ["acide nitrique", "acide nitrique 20l"],
  ["ferland", "ferland 648", "fer chelate", "fer chelate 6", "chelate de fer", "fer eddha", "fer 6"],
  ["fertimix", "fertimix plus", "oligo elements", "oligoelements", "micro elements", "oligo"],
  ["algua live", "algua live 1l", "algalive", "algreen", "algreen 1l", "algues marines", "algue marine", "extrait d algues", "algues"],
  ["humi plus", "humi plus 20l", "humiplus", "acide humique", "acides humiques", "humique"],
  ["acetaplan", "acetaplan 200 sl", "acetaplan 200 sl 1 1l", "acetamipride", "mospilan"],
  ["zoro", "zorro", "abamectine", "abamectin", "vertimec"],
  ["decis", "decis expert", "decis expert 100 ec", "dicis", "deltamethrine"],
  ["azostar", "azostar 1l", "azostar 325sc", "azostar 325 sc", "azoxystrobine", "amistar"],
  ["lamdoc", "lamdoc 50 ec", "lamdoc 50ec", "lambda cyhalothrine"],
  ["bouillie bordelaise", "bouille bordelaise", "bouillie bordelaise wg 10kg", "cuivre"],
  ["foliboost", "foliboost bz", "foliboost bz 1kg", "bore zinc"],
];

export function matchProductName(a: string, b: string): boolean {
  if (!a || !b) return false;
  const cleanA = normalizeProductKey(a);
  const cleanB = normalizeProductKey(b);
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;
  if (cleanA.length >= 4 && cleanB.length >= 4 && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) {
    return true;
  }

  for (const group of PRODUCT_SYNONYM_GROUPS) {
    const matchA = group.some(
      (kw) => cleanA === kw || cleanA.includes(kw) || (cleanA.length >= 5 && kw.includes(cleanA))
    );
    const matchB = group.some(
      (kw) => cleanB === kw || cleanB.includes(kw) || (cleanB.length >= 5 && kw.includes(cleanB))
    );
    if (matchA && matchB) return true;
  }
  return false;
}

/**
 * BUG 3 — Correction des doses Phyto aberrantes (ml saisis en L ou doses à 0)
 * Base 1 000 L = 1 cuve Pommiers (P7+P8), 2 cuves Nectarines (P5+P6), 2 cuves Oliviers (P1–P4)
 */
export function normalizePhytoDoseQuantity(
  p: { product?: string; name?: string; dosage?: string; qty?: string | number; volume?: string | number },
  sprayVolumeL: number,
  surfaceHa: number = 1
): { quantity: number; dosePer1000L: number; unit: "kg" | "litres" } {
  const prodName = (p.product || p.name || "").trim();
  const norm = prodName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const nbCuves = Math.max(0.5, (sprayVolumeL || 1000) / 1000);

  // Corrections explicites des doses aberrantes / à 0 issues de l'audit Campagne 2026
  if (norm.includes("decis") || norm.includes("deltamethrine") || norm.includes("dicis")) {
    return { quantity: parseFloat((1 * nbCuves).toFixed(2)), dosePer1000L: 1, unit: "litres" };
  }
  if (norm.includes("verlan") || norm.includes("abamectine") || norm.includes("zoro") || norm.includes("zorro")) {
    return { quantity: parseFloat((1 * nbCuves).toFixed(2)), dosePer1000L: 1, unit: "litres" };
  }
  if (norm.includes("calypso")) {
    return { quantity: parseFloat((1 * nbCuves).toFixed(2)), dosePer1000L: 1, unit: "litres" };
  }
  if (norm.includes("coragen") || norm.includes("chlorantraniliprole")) {
    return { quantity: parseFloat((1 * nbCuves).toFixed(2)), dosePer1000L: 1, unit: "litres" };
  }
  if (norm.includes("score") || norm.includes("difenoconazole")) {
    return { quantity: parseFloat((1 * nbCuves).toFixed(2)), dosePer1000L: 1, unit: "litres" };
  }
  if (norm.includes("bellis")) {
    return { quantity: parseFloat((0.5 * nbCuves).toFixed(2)), dosePer1000L: 0.5, unit: "kg" };
  }

  const parsed = parsePhytoProductQuantity({ ...p, volume: sprayVolumeL || 1000 }, surfaceHa);
  // Garde-fou anti-aberration : aucun phyto liquide/poudre ne dépasse 15 L ou 15 kg / 1000 L (sauf Soufre / Bouillie)
  const isHighDoseMineral = norm.includes("soufre") || norm.includes("bouillie") || norm.includes("cuivre");
  if (!isHighDoseMineral && parsed.quantity > 15 * nbCuves) {
    // Saisie en ml/g au lieu de L/kg -> diviser par 1000
    const fixed = Math.max(0.1, parseFloat((parsed.quantity / 1000).toFixed(2)));
    return { quantity: fixed, dosePer1000L: parseFloat((fixed / nbCuves).toFixed(2)), unit: parsed.unit };
  }
  return {
    quantity: parsed.quantity,
    dosePer1000L: parseFloat((parsed.quantity / nbCuves).toFixed(2)),
    unit: parsed.unit,
  };
}

/**
 * BUG 3 — Correction de dose Fertigation spécifique (SOP Nectarines 09/07 : 8.5 kg/ha au lieu de 7.5 kg/ha)
 */
export function normalizeFertDoseHa(
  productName: string,
  rawDoseHa: number,
  recoDate: string,
  speciesId: string
): number {
  const norm = (productName || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const isSop = norm.includes("sulfate de potassium") || norm.includes("sulfate de potasse") || norm.includes("sop") || norm.includes("0 0 50");
  const isNectarine = speciesId === "nablara" || speciesId === "redix25" || speciesId === "p5" || speciesId === "p6";
  if (isSop && isNectarine && recoDate.startsWith("2026-07-09") && Math.abs(rawDoseHa - 7.5) < 0.05) {
    return 8.5;
  }
  return rawDoseHa;
}

export function getTargetParcelsForReco(reco: Recommendation, parcels: Parcel[] = []): Parcel[] {
  if (!reco || !Array.isArray(parcels)) return [];

  const titleLower = (reco.title || "").toLowerCase();
  const payload = (reco.payload ?? {}) as any;
  const rawGroups = payload?.crop_group;
  const groups: string[] = Array.isArray(rawGroups)
    ? rawGroups
    : rawGroups
      ? [rawGroups]
      : [];
  const groupsStr = groups.join(" ").toLowerCase();
  const contextText = `${titleLower} ${groupsStr}`;

  // BUG 1 — Étanchéité stricte par espèce (une reco Oliviers ne doit JAMAIS fuiter sur Pommiers/Nectarines)
  const mentionsOliv = contextText.includes("oliv") || contextText.includes("زيتون");
  const mentionsPomm = contextText.includes("pomm") || contextText.includes("تفاح") || contextText.includes("gala");
  const mentionsNect = contextText.includes("nectar") || contextText.includes("nablara") || contextText.includes("redix");

  const filterBySpeciesSeal = (list: Parcel[]): Parcel[] => {
    if (mentionsOliv && !mentionsPomm && !mentionsNect) {
      return list.filter((p) => p.type === "olivier" || ["p1", "p2", "p3", "p4"].includes(p.id.toLowerCase()));
    }
    if (mentionsPomm && !mentionsOliv && !mentionsNect) {
      return list.filter((p) => p.type === "pommier" || p.id.toLowerCase().startsWith("pommier") || p.id === "p7" || p.id === "p8");
    }
    if (mentionsNect && !mentionsOliv && !mentionsPomm) {
      return list.filter((p) => p.type === "nectarine" || ["nablara", "redix25", "p5", "p6"].includes(p.id.toLowerCase()));
    }
    return list;
  };

  if (reco.parcel_ids && reco.parcel_ids.length > 0) {
    const direct = parcels.filter((p) => p && reco.parcel_ids.includes(p.id));
    const sealed = filterBySpeciesSeal(direct);
    if (sealed.length > 0) return sealed;
    return direct;
  }

  if (groups.length === 0) return filterBySpeciesSeal(parcels);

  const parcelMatchesGroup = (parcel: Parcel, group: string) => {
    if (!parcel || !group || typeof group !== "string") return false;
    const g = group.toLowerCase();
    const pType = (parcel.type || "").toLowerCase();
    const pId = (parcel.id || "").toLowerCase();
    const pName = (parcel.name || "").toLowerCase();

    if (g === "oliviers" || g === "oliviers_s1" || g === "oliviers_s2") return pType === "olivier";
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

  return filterBySpeciesSeal(parcels.filter((p) => groups.some((g) => parcelMatchesGroup(p, g))));
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
    isLowStock: false,
    stockStatus: "available",
    items: [],
    missingItems: [],
    lowStockItems: [],
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
              // Dédoublonner strictement les matières identiques saisies par mégarde dans le même bac
              const seenInBac = new Set<string>();
              for (const it of entry.items) {
                const name = it.name?.trim();
                if (!name) continue;
                const normName = name.toLowerCase().replace(/\s+/g, " ");
                if (seenInBac.has(normName)) continue;
                seenInBac.add(normName);

                const doseHa = safeParseFloat(it.qty);
                const price = safeParseFloat(it.price);
                const rawUnit: "kg" | "litres" = (it.unit === "litres" || it.unit === "L") ? "litres" : "kg";
                const unit = enforceAcidUnit(name, rawUnit);

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
        // Pulvérisation foliaire : distinguer strictement doses / 1 000 L (nbCuves) vs doses / ha (surface)
        const totalSprayVolumeL = targetParcels.reduce(
          (sum, parcel) => sum + getParcelSprayVolumeLiters(parcel),
          0
        ) || 1000;
        const nbCuves1000L = totalSprayVolumeL / 1000;
        const totalSurface = targetParcels.reduce(
          (sum, parcel) => sum + (safeParseFloat(parcel?.info?.surface) || 1),
          0
        ) || 1;

        if (Array.isArray(program.items)) {
          for (const it of program.items) {
            const name = it.name?.trim();
            if (!name) continue;
            const qty = safeParseFloat(it.qty);
            const price = safeParseFloat(it.price);
            const rawUnit: "kg" | "litres" = (it.unit === "litres" || it.unit === "L") ? "litres" : "kg";
            const unit = enforceAcidUnit(name, rawUnit);
            const dosageHint = String(it.dosage || it.unit || it.note || "").toLowerCase();
            const isPerHa = dosageHint.includes("/ha") || dosageHint.includes("/ ha") || dosageHint.includes("هكتار");
            const isPer1000L = dosageHint.includes("1000") || dosageHint.includes("cuve") || dosageHint.includes("hl");
            const computedQty = isPerHa
              ? parseFloat((qty * totalSurface).toFixed(2))
              : isPer1000L
                ? parseFloat((qty * nbCuves1000L).toFixed(2))
                : qty;

            if (!sumsMap[name]) {
              sumsMap[name] = { name, neededPerPassage: 0, unit, price };
            }
            sumsMap[name].neededPerPassage += computedQty;
          }
        }
      }
    } else if (reco.kind === "phytosanitaire") {
      if (Array.isArray(program.products)) {
        const totalSurface = targetParcels.reduce(
          (sum, parcel) => sum + (safeParseFloat(parcel?.info?.surface) || 1),
          0
        ) || 1;
        const totalSprayVolumeL = targetParcels.reduce(
          (sum, parcel) => sum + getParcelSprayVolumeLiters(parcel),
          0
        ) || 1000;

        for (const p of program.products) {
          const name = (p.product || p.name)?.trim();
          if (!name) continue;
          const parsed = normalizePhytoDoseQuantity(p, totalSprayVolumeL, totalSurface);
          const unit = enforceAcidUnit(name, parsed.unit);
          const price = safeParseFloat(p.price);
          if (!sumsMap[name]) {
            sumsMap[name] = { name, neededPerPassage: 0, unit, price };
          }
          sumsMap[name].neededPerPassage += parsed.quantity;
        }
      }
    }

    // Stock net disponible par produit (déduit aussi le retour physique Agrimax du 04/08/2026)
    const getProductStock = (prodName: string): number => {
      const grossAvailable = safeSuppliers
        .filter((p) => p && matchProductName(p.productName, prodName))
        .reduce((sum, p) => sum + Math.max(0, (p.quantity || 0) - (p.consumed || 0)), 0);

      const returnedQty = AGRIMAX_PHYSICAL_RETURNS
        .filter((ret) => matchProductName(ret.productName, prodName))
        .reduce((sum, ret) => sum + ret.returnedQuantity, 0);

      return Math.max(0, grossAvailable - returnedQty);
    };

    const items: RecoProductStockItem[] = [];
    const missingItems: RecoProductStockItem[] = [];
    const lowStockItems: RecoProductStockItem[] = [];
    let totalEstimatedMissingCost = 0;

    for (const key of Object.keys(sumsMap)) {
      const raw = sumsMap[key];
      const totalNeeded = parseFloat((raw.neededPerPassage * repeatPassages).toFixed(2));
      const available = parseFloat(getProductStock(raw.name).toFixed(2));
      const missing = parseFloat(Math.max(0, totalNeeded - available).toFixed(2));
      const remainingAfter = parseFloat(Math.max(0, available - totalNeeded).toFixed(2));
      const cost = parseFloat((missing * raw.price).toFixed(2));
      const isMissing = missing > 0;
      // Stock minimum (Orange) : disponible pour ce passage, mais réserve restante <= 1 passage ou <= 2 unités
      const isLow = !isMissing && totalNeeded > 0 && (remainingAfter <= totalNeeded || remainingAfter <= 2);

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
      } else if (isLow) {
        lowStockItems.push(item);
      }
    }

    const stockStatus: RecoStockStatus =
      missingItems.length > 0 ? "missing" : lowStockItems.length > 0 ? "low" : "available";

    return {
      hasMissingStock: missingItems.length > 0,
      isLowStock: lowStockItems.length > 0,
      stockStatus,
      items,
      missingItems,
      lowStockItems,
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

    // Passages supplémentaires dans la semaine
    if (effectivePassages === 2) {
      const d2 = new Date(d1);
      d2.setDate(d1.getDate() + secondDayOffset);
      const iso2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
      if (!dates.includes(iso2)) {
        dates.push(iso2);
      }
    } else if (effectivePassages === 3) {
      // 3 passages par semaine (ex: J0, J+2, J+4)
      for (const off of [2, 4]) {
        const dX = new Date(d1);
        dX.setDate(d1.getDate() + off);
        const isoX = `${dX.getFullYear()}-${String(dX.getMonth() + 1).padStart(2, "0")}-${String(dX.getDate()).padStart(2, "0")}`;
        if (!dates.includes(isoX)) {
          dates.push(isoX);
        }
      }
    } else if (effectivePassages > 3) {
      for (let p = 1; p < effectivePassages; p++) {
        const off = Math.round((p * 7) / effectivePassages);
        const dX = new Date(d1);
        dX.setDate(d1.getDate() + off);
        const isoX = `${dX.getFullYear()}-${String(dX.getMonth() + 1).padStart(2, "0")}-${String(dX.getDate()).padStart(2, "0")}`;
        if (!dates.includes(isoX)) {
          dates.push(isoX);
        }
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


