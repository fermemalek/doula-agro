import type { FreshFruitHarvestRecord } from "@/components/modules/RecolteFruitsFrais";
import type { MandataireBordereau } from "@/components/modules/BordereauEditorCard";

export const SEED_FLAG_BORDEREAU_36387 = "doula_seed_bordereau_36387";

export function buildBordereau36387Record(): Omit<FreshFruitHarvestRecord, "id" | "createdAt"> {
  const lines = [
    { id: "b36387_l1",  colis: "10",  nature: "Calibre 22 (ت/22)", poidsNetKg: "33.5",  prixUnitaire: "300", montantManualDA: "10050.00" },
    { id: "b36387_l2",  colis: "16",  nature: "Calibre 22 (ت/22)", poidsNetKg: "52.3",  prixUnitaire: "280", montantManualDA: "14644.00" },
    { id: "b36387_l3",  colis: "10",  nature: "Calibre 22 (ت/22)", poidsNetKg: "30.0",  prixUnitaire: "260", montantManualDA: "7800.00" },
    { id: "b36387_l4",  colis: "249", nature: "Calibre 22 (ت/22)", poidsNetKg: "777.8", prixUnitaire: "250", montantManualDA: "194437.50" },
    { id: "b36387_l5",  colis: "315", nature: "Calibre 26 (ت/26)", poidsNetKg: "957.3", prixUnitaire: "200", montantManualDA: "191450.00" },
    { id: "b36387_l6",  colis: "57",  nature: "Calibre 00 (ت/00)", poidsNetKg: "240.8", prixUnitaire: "250", montantManualDA: "60187.50" },
    { id: "b36387_l7",  colis: "11",  nature: "Vrac (فراك)",       poidsNetKg: "85.6",  prixUnitaire: "180", montantManualDA: "15408.00" },
    { id: "b36387_l8",  colis: "9",   nature: "Vrac (فراك)",       poidsNetKg: "59.4",  prixUnitaire: "160", montantManualDA: "9504.00" },
    { id: "b36387_l9",  colis: "108", nature: "Vrac (فراك)",       poidsNetKg: "777.3", prixUnitaire: "150", montantManualDA: "116595.00" },
    { id: "b36387_l10", colis: "57",  nature: "Vrac (فراك)",       poidsNetKg: "412.2", prixUnitaire: "140", montantManualDA: "57708.00" },
    { id: "b36387_l11", colis: "33",  nature: "Vrac (فراك)",       poidsNetKg: "228.8", prixUnitaire: "130", montantManualDA: "29744.00" },
    { id: "b36387_l12", colis: "2",   nature: "Vrac (فراك)",       poidsNetKg: "11.3",  prixUnitaire: "70",  montantManualDA: "787.50" },
  ];

  const bordereau: MandataireBordereau = {
    id: "bd_36387",
    mandataireName: "BENCHERIFA HAMED",
    marcheCarreau: "Marché de gros - Eucalyptus • Carreau N° 44",
    numeroBordereau: "36387",
    dateFolio: "2026-09-13",
    accountLabel: "مواس (Mouaas) — Pommier 1 & 2 (Gala One)",
    paymentStatus: "paye",
    lines,
    commissionPercent: "8",
    commissionManualDA: "56665.24",
    droitsMarcheDA: "0",
    avanceProducteurDA: "0",
  };

  return {
    recordMode: "fruits_frais",
    schemaVersion: 2,
    date: "2026-09-13",
    selectedParcelIds: ["pommier1", "pommier2"],
    unit: "Kg",
    qty: "3666.1",
    totalKg: 3666.1,
    totalColis: 877,
    price: "",
    harvestLots: [
      { id: "lot_36387_1", nature: "Calibre 22 (ت/22)", colis: "285", poidsNetKg: "893.6" },
      { id: "lot_36387_2", nature: "Calibre 26 (ت/26)", colis: "315", poidsNetKg: "957.3" },
      { id: "lot_36387_3", nature: "Calibre 00 (ت/00)", colis: "57",  poidsNetKg: "240.8" },
      { id: "lot_36387_4", nature: "Vrac (فراك)",       colis: "220", poidsNetKg: "1574.6" },
    ],
    rebutKg: "0",
    rebutPercent: 0,
    destination: "mandataire",
    bordereaux: [bordereau],
    frigoBlocks: [],
    directBlocks: [],
    mandataireName: "BENCHERIFA HAMED",
    paymentStatus: "paye",
    frigoExits: [],
    commissionAmount: 56665.24,
    mainOeuvre: "0",
    transport: "0",
    emballages: "0",
    autres: "0",
    totalVente: 708315.5,
    totalDeductionsMandataire: 56665.24,
    netBordereauVentes: 651650.26,
    chargesFerme: 0,
    totalCharges: 56665.24,
    total: 56665.24,
    net: 651650.26,
    notes: "Bordereau officiel C 44 PAYÉ — Compte مواس (Mouaas) · Pommier 1 & 2 (Gala One)",
  };
}

/**
 * Initialise de manière idempotente le bordereau réel N° 36387 sur Pommier 1 (& 2).
 * Ne ré-injecte jamais s'il a déjà été créé ou supprimé manuellement (flag `doula_seed_bordereau_36387`).
 */
export function seedBordereau36387IfNeeded(
  existingPommier1Records: FreshFruitHarvestRecord[],
  addRecord: (parcelId: string, mod: "recolte", payload: Omit<FreshFruitHarvestRecord, "id" | "createdAt">) => void,
): boolean {
  try {
    if (localStorage.getItem(SEED_FLAG_BORDEREAU_36387) === "1") {
      return false;
    }
  } catch {
    // ignore storage errors
  }

  const alreadyExists = existingPommier1Records.some((r) =>
    (r.bordereaux || []).some((b) => String(b.numeroBordereau || "").trim() === "36387"),
  );

  try {
    localStorage.setItem(SEED_FLAG_BORDEREAU_36387, "1");
  } catch {
    // ignore storage errors
  }

  if (alreadyExists) return false;

  addRecord("pommier1", "recolte", buildBordereau36387Record());
  return true;
}
