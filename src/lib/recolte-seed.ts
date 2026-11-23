import type { FreshFruitHarvestRecord } from "@/components/modules/RecolteFruitsFrais";
import type { MandataireBordereau } from "@/components/modules/BordereauEditorCard";

export const SEED_FLAG_BORDEREAU_36387 = "doula_seed_bordereau_36387";
export const SEED_FLAG_BORDEREAU_002_2026 = "doula_seed_bordereau_002_2026";
export const SEED_FLAG_BORDEREAU_2026_03 = "doula_seed_bordereau_2026_03";
export const SEED_FLAG_BORDEREAU_001_2026 = "doula_seed_bordereau_001_2026";

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

export function buildBordereau002_2026Record(): Omit<FreshFruitHarvestRecord, "id" | "createdAt"> {
  const lines = [
    { id: "b002_l1",  colis: "8",   nature: "Frag",       poidsNetKg: "55.0",  prixUnitaire: "100", montantManualDA: "5500.00" },
    { id: "b002_l2",  colis: "4",   nature: "Calibre 20", poidsNetKg: "14.4",  prixUnitaire: "300", montantManualDA: "4320.00" },
    { id: "b002_l3",  colis: "260", nature: "Calibre 26", poidsNetKg: "727.0", prixUnitaire: "205", montantManualDA: "149035.00" },
    { id: "b002_l4",  colis: "5",   nature: "Déchet 26",  poidsNetKg: "13.0",  prixUnitaire: "50",  montantManualDA: "650.00" },
    { id: "b002_l5",  colis: "330", nature: "Calibre 22", poidsNetKg: "924.0", prixUnitaire: "250", montantManualDA: "231000.00" },
    { id: "b002_l6",  colis: "4",   nature: "Déchet 22",  poidsNetKg: "0.0",   prixUnitaire: "0",   montantManualDA: "0.00" },
    { id: "b002_l7",  colis: "10",  nature: "Calibre 20", poidsNetKg: "29.0",  prixUnitaire: "300", montantManualDA: "8700.00" },
    { id: "b002_l8",  colis: "184", nature: "Calibre 20", poidsNetKg: "552.0", prixUnitaire: "280", montantManualDA: "154560.00" },
    { id: "b002_l9",  colis: "6",   nature: "Déchet 20",  poidsNetKg: "0.0",   prixUnitaire: "0",   montantManualDA: "0.00" },
    { id: "b002_l10", colis: "4",   nature: "Calibre 20", poidsNetKg: "12.0",  prixUnitaire: "300", montantManualDA: "3600.00" },
  ];

  const bordereau: MandataireBordereau = {
    id: "bd_002_2026",
    mandataireName: "Frigo Karim",
    marcheCarreau: "Frigo Karim • Carré 84",
    numeroBordereau: "002/2026",
    dateFolio: "2026-09-24",
    accountLabel: "عبد الرحمان ع. ق. (Abderrahmane) — Pommier 1 & 2 (Gala One)",
    paymentStatus: "paye",
    lines,
    commissionPercent: "9",
    commissionManualDA: "50160.00",
    droitsMarcheDA: "2000.00",
    fraisTransportDA: "8000.00",
    avanceProducteurDA: "0",
  };

  return {
    recordMode: "fruits_frais",
    schemaVersion: 2,
    date: "2026-09-24",
    selectedParcelIds: ["pommier1", "pommier2"],
    unit: "Kg",
    qty: "2326.4",
    totalKg: 2326.4,
    totalColis: 815,
    price: "",
    harvestLots: [
      { id: "lot_002_1", nature: "Calibre 20", colis: "202", poidsNetKg: "607.4" },
      { id: "lot_002_2", nature: "Calibre 22", colis: "330", poidsNetKg: "924.0" },
      { id: "lot_002_3", nature: "Calibre 26", colis: "260", poidsNetKg: "727.0" },
      { id: "lot_002_4", nature: "Frag",       colis: "8",   poidsNetKg: "55.0" },
      { id: "lot_002_5", nature: "Déchet (20/22/26)", colis: "15", poidsNetKg: "13.0" },
    ],
    rebutKg: "0",
    rebutPercent: 0,
    destination: "mandataire",
    bordereaux: [bordereau],
    frigoBlocks: [],
    directBlocks: [],
    mandataireName: "Frigo Karim",
    paymentStatus: "paye",
    frigoExits: [],
    commissionAmount: 60160,
    mainOeuvre: "0",
    transport: "0",
    emballages: "0",
    autres: "0",
    totalVente: 557365,
    totalDeductionsMandataire: 60160,
    netBordereauVentes: 497205,
    chargesFerme: 0,
    totalCharges: 60160,
    total: 60160,
    net: 497205,
    notes:
      "Sortie / vente Frigo Karim • Carré 84 — 815 caisses (26=265, 20=208, 22=334 au départ / 08 فراد) · COM 9% (50 160 DA) + Droit d'entrée (2 000 DA) + Transport (8 000 DA). الصافي manuscrit sur bon papier = 495 205,00 DA, écart de 2 000 DA à vérifier.",
  };
}

/**
 * Initialise de manière idempotente le bon réel N° 002/2026 du 24/09/2026 sur Pommier 1 (& 2).
 * Protégé par le flag unique `doula_seed_bordereau_002_2026`.
 */
export function seedBordereau002_2026IfNeeded(
  existingPommier1Records: FreshFruitHarvestRecord[],
  addRecord: (parcelId: string, mod: "recolte", payload: Omit<FreshFruitHarvestRecord, "id" | "createdAt">) => void,
): boolean {
  try {
    if (localStorage.getItem(SEED_FLAG_BORDEREAU_002_2026) === "1") {
      return false;
    }
  } catch {
    // ignore storage errors
  }

  const alreadyExists = existingPommier1Records.some((r) =>
    (r.bordereaux || []).some((b) => String(b.numeroBordereau || "").trim() === "002/2026"),
  );

  try {
    localStorage.setItem(SEED_FLAG_BORDEREAU_002_2026, "1");
  } catch {
    // ignore storage errors
  }

  if (alreadyExists) return false;

  addRecord("pommier1", "recolte", buildBordereau002_2026Record());
  return true;
}

export function buildBordereau2026_03Record(): Omit<FreshFruitHarvestRecord, "id" | "createdAt"> {
  const lines = [
    // Partie 1 : Royal (301 caisses · 842,0 kg · 169 320,00 DA)
    { id: "b202603_l1",  colis: "5",   nature: "Royal Silver (ساير رويال)", poidsNetKg: "20.0",  prixUnitaire: "280", montantManualDA: "5600.00" },
    { id: "b202603_l2",  colis: "68",  nature: "Royal Calibre 20",          poidsNetKg: "210.0", prixUnitaire: "260", montantManualDA: "54600.00" },
    { id: "b202603_l3",  colis: "20",  nature: "Royal Calibre 26",          poidsNetKg: "54.0",  prixUnitaire: "180", montantManualDA: "9720.00" },
    { id: "b202603_l4",  colis: "54",  nature: "Royal Calibre 26",          poidsNetKg: "140.0", prixUnitaire: "170", montantManualDA: "23800.00" },
    { id: "b202603_l5",  colis: "100", nature: "Royal Calibre 22",          poidsNetKg: "260.0", prixUnitaire: "230", montantManualDA: "59800.00" },
    { id: "b202603_l6",  colis: "3",   nature: "Royal Déchet (دشي)",        poidsNetKg: "0.0",   prixUnitaire: "0",   montantManualDA: "0.00" },
    { id: "b202603_l7",  colis: "51",  nature: "Royal Vrac",                poidsNetKg: "158.0", prixUnitaire: "100", montantManualDA: "15800.00" },
    // Partie 2 : Golden (254 caisses · 774,3 kg · 103 152,00 DA)
    { id: "b202603_l8",  colis: "2",   nature: "Golden Calibre 20",         poidsNetKg: "6.8",   prixUnitaire: "240", montantManualDA: "1632.00" },
    { id: "b202603_l9",  colis: "76",  nature: "Golden Calibre 20",         poidsNetKg: "220.0", prixUnitaire: "160", montantManualDA: "35200.00" },
    { id: "b202603_l10", colis: "2",   nature: "Golden Déchet (دشي)",       poidsNetKg: "0.0",   prixUnitaire: "0",   montantManualDA: "0.00" },
    { id: "b202603_l11", colis: "45",  nature: "Golden Calibre 22",         poidsNetKg: "126.0", prixUnitaire: "150", montantManualDA: "18900.00" },
    { id: "b202603_l12", colis: "10",  nature: "Golden Calibre 26",         poidsNetKg: "31.0",  prixUnitaire: "170", montantManualDA: "5270.00" },
    { id: "b202603_l13", colis: "50",  nature: "Golden Calibre 26",         poidsNetKg: "145.0", prixUnitaire: "100", montantManualDA: "14500.00" },
    { id: "b202603_l14", colis: "20",  nature: "Golden Calibre 26",         poidsNetKg: "55.0",  prixUnitaire: "120", montantManualDA: "6600.00" },
    { id: "b202603_l15", colis: "11",  nature: "Golden Vrac (فراك)",        poidsNetKg: "81.5",  prixUnitaire: "80",  montantManualDA: "6520.00" },
    { id: "b202603_l16", colis: "8",   nature: "Golden 2e choix (دوام)",    poidsNetKg: "26.0",  prixUnitaire: "80",  montantManualDA: "2080.00" },
    { id: "b202603_l17", colis: "27",  nature: "Golden Sayer (ساير)",       poidsNetKg: "83.0",  prixUnitaire: "150", montantManualDA: "12450.00" },
    { id: "b202603_l18", colis: "3",   nature: "Golden Déchet (دشي)",       poidsNetKg: "0.0",   prixUnitaire: "0",   montantManualDA: "0.00" },
  ];

  const bordereau: MandataireBordereau = {
    id: "bd_2026_03",
    mandataireName: "علوي (N° 2026-03)",
    marcheCarreau: "علوي · R.C. 86.2026",
    numeroBordereau: "2026-03",
    dateFolio: "2026-09-30",
    accountLabel: "عبد الرحمان ع. ق. (Abderrahmane) — Pommier 1 & 2 (Gala & Golden)",
    paymentStatus: "en_attente",
    lines,
    commissionPercent: "0",
    commissionManualDA: "0.00",
    droitsMarcheDA: "0",
    fraisTransportDA: "0",
    avanceProducteurDA: "0",
  };

  return {
    recordMode: "fruits_frais",
    schemaVersion: 2,
    date: "2026-09-30",
    selectedParcelIds: ["pommier1", "pommier2"],
    unit: "Kg",
    qty: "1616.3",
    totalKg: 1616.3,
    totalColis: 555,
    price: "",
    harvestLots: [
      { id: "lot_202603_1", nature: "Royal (Gala)",  colis: "301", poidsNetKg: "842.0" },
      { id: "lot_202603_2", nature: "Golden (قولدان)", colis: "254", poidsNetKg: "774.3" },
    ],
    rebutKg: "0",
    rebutPercent: 0,
    destination: "mandataire",
    bordereaux: [bordereau],
    frigoBlocks: [],
    directBlocks: [],
    mandataireName: "علوي (N° 2026-03)",
    paymentStatus: "en_attente",
    frigoExits: [],
    commissionAmount: 0,
    mainOeuvre: "0",
    transport: "0",
    emballages: "0",
    autres: "0",
    totalVente: 272472,
    totalDeductionsMandataire: 0,
    netBordereauVentes: 272472,
    chargesFerme: 0,
    totalCharges: 0,
    total: 0,
    net: 272472,
    notes:
      "Facture N° 2026-03 du 30/09/2026 — علوي (R.C. 86.2026) · 555 caisses (301 Royal + 254 Golden) · Décompte commission/transport non joint sur la page 1 (éditable).",
  };
}

/**
 * Initialise de manière idempotente la facture réelle N° 2026-03 du 30/09/2026 sur Pommier 1 (& 2).
 * Protégé par le flag unique `doula_seed_bordereau_2026_03`.
 */
export function seedBordereau2026_03IfNeeded(
  existingPommier1Records: FreshFruitHarvestRecord[],
  addRecord: (parcelId: string, mod: "recolte", payload: Omit<FreshFruitHarvestRecord, "id" | "createdAt">) => void,
): boolean {
  try {
    if (localStorage.getItem(SEED_FLAG_BORDEREAU_2026_03) === "1") {
      return false;
    }
  } catch {
    // ignore storage errors
  }

  const alreadyExists = existingPommier1Records.some((r) =>
    (r.bordereaux || []).some((b) => String(b.numeroBordereau || "").trim() === "2026-03"),
  );

  try {
    localStorage.setItem(SEED_FLAG_BORDEREAU_2026_03, "1");
  } catch {
    // ignore storage errors
  }

  if (alreadyExists) return false;

  addRecord("pommier1", "recolte", buildBordereau2026_03Record());
  return true;
}

export function buildBordereau001_2026Record(): Omit<FreshFruitHarvestRecord, "id" | "createdAt"> {
  const lines = [
    { id: "b001_l1", colis: "40",  nature: "Royal Calibre 26",         poidsNetKg: "104.0", prixUnitaire: "260", montantManualDA: "27040.00" },
    { id: "b001_l2", colis: "348", nature: "Royal Calibre 26",         poidsNetKg: "904.8", prixUnitaire: "180", montantManualDA: "162864.00" },
    { id: "b001_l3", colis: "60",  nature: "Royal Calibre 22",         poidsNetKg: "174.0", prixUnitaire: "270", montantManualDA: "46980.00" },
    { id: "b001_l4", colis: "290", nature: "Royal Calibre 22",         poidsNetKg: "841.0", prixUnitaire: "250", montantManualDA: "210250.00" },
    { id: "b001_l5", colis: "10",  nature: "Déchet Calibre 22 (دشي)", poidsNetKg: "25.0",  prixUnitaire: "40",  montantManualDA: "1000.00" },
    { id: "b001_l6", colis: "107", nature: "Royal Calibre 20",         poidsNetKg: "346.0", prixUnitaire: "330", montantManualDA: "114180.00" },
    { id: "b001_l7", colis: "34",  nature: "Royal Vrac (فراك)",        poidsNetKg: "250.0", prixUnitaire: "95",  montantManualDA: "23750.00" },
  ];

  const bordereau: MandataireBordereau = {
    id: "bd_001_2026",
    mandataireName: "Frigo Karim",
    marcheCarreau: "Frigo Karim • Carré 84",
    numeroBordereau: "001/2026",
    dateFolio: "2026-09-19",
    accountLabel: "عبد الرحمان ع. ق. (Abderrahmane) — Pommier 1 & 2 (Gala One)",
    paymentStatus: "paye",
    lines,
    commissionPercent: "9",
    commissionManualDA: "52745.00",
    droitsMarcheDA: "0",
    fraisTransportDA: "0",
    avanceProducteurDA: "0",
  };

  return {
    recordMode: "fruits_frais",
    schemaVersion: 2,
    date: "2026-09-19",
    selectedParcelIds: ["pommier1", "pommier2"],
    unit: "Kg",
    qty: "2644.8",
    totalKg: 2644.8,
    totalColis: 889,
    price: "",
    harvestLots: [
      { id: "lot_001_1", nature: "Royal Calibre 26",         colis: "388", poidsNetKg: "1008.8" },
      { id: "lot_001_2", nature: "Royal Calibre 22",         colis: "350", poidsNetKg: "1015.0" },
      { id: "lot_001_3", nature: "Déchet Calibre 22 (دشي)", colis: "10",  poidsNetKg: "25.0" },
      { id: "lot_001_4", nature: "Royal Calibre 20",         colis: "107", poidsNetKg: "346.0" },
      { id: "lot_001_5", nature: "Royal Vrac (فراك)",        colis: "34",  poidsNetKg: "250.0" },
    ],
    rebutKg: "0",
    rebutPercent: 0,
    destination: "mandataire",
    bordereaux: [bordereau],
    frigoBlocks: [],
    directBlocks: [],
    mandataireName: "Frigo Karim",
    paymentStatus: "paye",
    frigoExits: [],
    commissionAmount: 52745,
    mainOeuvre: "0",
    transport: "0",
    emballages: "0",
    autres: "0",
    totalVente: 586064,
    totalDeductionsMandataire: 52745,
    netBordereauVentes: 533319,
    chargesFerme: 0,
    totalCharges: 52745,
    total: 52745,
    net: 533319,
    notes:
      "Bon N° 001/2026 du 19/09/2026 — Frigo Karim • Carré 84 · 889 caisses (26=388, 22=360, 20=107, Vrac=34) · COM 9% (52 745 DA) · Payé.",
  };
}

/**
 * Initialise de manière idempotente le bon réel N° 001/2026 du 19/09/2026 sur Pommier 1 (& 2).
 * Protégé par le flag unique `doula_seed_bordereau_001_2026`.
 */
export function seedBordereau001_2026IfNeeded(
  existingPommier1Records: FreshFruitHarvestRecord[],
  addRecord: (parcelId: string, mod: "recolte", payload: Omit<FreshFruitHarvestRecord, "id" | "createdAt">) => void,
): boolean {
  try {
    if (localStorage.getItem(SEED_FLAG_BORDEREAU_001_2026) === "1") {
      return false;
    }
  } catch {
    // ignore storage errors
  }

  const alreadyExists = existingPommier1Records.some((r) =>
    (r.bordereaux || []).some((b) => String(b.numeroBordereau || "").trim() === "001/2026"),
  );

  try {
    localStorage.setItem(SEED_FLAG_BORDEREAU_001_2026, "1");
  } catch {
    // ignore storage errors
  }

  if (alreadyExists) return false;

  addRecord("pommier1", "recolte", buildBordereau001_2026Record());
  return true;
}
