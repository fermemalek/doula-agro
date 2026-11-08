export interface PhytoProductInfo {
  name: string;
  matiereActive?: string;
  matiereActiveAr?: string;
  codeGroup?: string;
  cible: string;
  dosage: string;
  volume: string;
  price: string;
  dar: string;
}

export interface ActiveSubstanceDetail {
  activeFr: string;
  activeAr: string;
  codeGroup?: string;
  type?: "FRAC" | "IRAC";
}

export const COMMERCIAL_TO_ACTIVE: Record<string, ActiveSubstanceDetail> = {
  "Bellis": { activeFr: "Boscalide + Pyraclostrobine", activeAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", type: "FRAC" },
  "Signum WG": { activeFr: "Boscalide + Pyraclostrobine", activeAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", type: "FRAC" },
  "Decis Expert": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "Deltacal": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "Sivento": { activeFr: "Flupyradifurone", activeAr: "فلوبيراديفورون", codeGroup: "IRAC 4D", type: "IRAC" },
  "Calypso": { activeFr: "Thiaclopride", activeAr: "ثياكلوبريد", codeGroup: "IRAC 4A", type: "IRAC" },
  "Sherpa 25 EC": { activeFr: "Cyperméthrine", activeAr: "سيبيرمثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "Verlan": { activeFr: "Abamectine", activeAr: "أبامكتين", codeGroup: "IRAC 6", type: "IRAC" },
  "Erlan": { activeFr: "Acétamipride", activeAr: "أسيتامبريد", codeGroup: "IRAC 4A", type: "IRAC" },
  "Acetaplan": { activeFr: "Acétamipride", activeAr: "أسيتامبريد", codeGroup: "IRAC 4A", type: "IRAC" },
  "Aceplan": { activeFr: "Acétamipride", activeAr: "أسيتامبريد", codeGroup: "IRAC 4A", type: "IRAC" },
  "Mospilan 20 SP": { activeFr: "Acétamipride", activeAr: "أسيتامبريد", codeGroup: "IRAC 4A", type: "IRAC" },
  "Amistar": { activeFr: "Azoxystrobine", activeAr: "أزوكسيستروبين", codeGroup: "FRAC 11", type: "FRAC" },
  "Azostar 325SC": { activeFr: "Azoxystrobine + Difénoconazole", activeAr: "أزوكسيستروبين + ديفينوكونازول", codeGroup: "FRAC 11 + FRAC 3", type: "FRAC" },
  "Zorro": { activeFr: "Abamectine", activeAr: "أبامكتين", codeGroup: "IRAC 6", type: "IRAC" },
  "Fosetyl Aluminium": { activeFr: "Fosétyl-Aluminium", activeAr: "فوسيتيل الألومنيوم", codeGroup: "FRAC P07", type: "FRAC" },
  "Aliette Flash": { activeFr: "Fosétyl-Aluminium", activeAr: "فوسيتيل الألومنيوم", codeGroup: "FRAC P07", type: "FRAC" },
  "Luna": { activeFr: "Fluopyram + Tébuconazole", activeAr: "فلوبيرام + تيبوكونازول", codeGroup: "FRAC 7 + FRAC 3", type: "FRAC" },
  "Luna Experience": { activeFr: "Fluopyram + Tébuconazole", activeAr: "فلوبيرام + تيبوكونازول", codeGroup: "FRAC 7 + FRAC 3", type: "FRAC" },
  "Criptan": { activeFr: "Captane", activeAr: "كابتان", codeGroup: "FRAC M04", type: "FRAC" },
  "Phytocap": { activeFr: "Captane", activeAr: "كابتان", codeGroup: "FRAC M04", type: "FRAC" },
  "Captan 50": { activeFr: "Captane", activeAr: "كابتان", codeGroup: "FRAC M04", type: "FRAC" },
  "Extrachim": { activeFr: "Matières actives diverses", activeAr: "مواد فعالة متعددة", codeGroup: "Divers", type: "FRAC" },
  "Rustilan": { activeFr: "Acétamipride", activeAr: "أسيتامبريد", codeGroup: "IRAC 4A", type: "IRAC" },
  "Tachigazol": { activeFr: "Hymexazol", activeAr: "هيميكسازول", codeGroup: "FRAC 32", type: "FRAC" },
  "Score 250 EC": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "Folicur 250 EW": { activeFr: "Tébuconazole", activeAr: "تيبوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "Topas 100 EC": { activeFr: "Penconazole", activeAr: "بنكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "Movento 100 SC": { activeFr: "Spirotétramate", activeAr: "سبيروتتراماط", codeGroup: "IRAC 23", type: "IRAC" },
  "Coragen 20 SC": { activeFr: "Chlorantraniliprole", activeAr: "كلورانترانيليبرول", codeGroup: "IRAC 28", type: "IRAC" },
  "Delan 70 WG": { activeFr: "Dithianon", activeAr: "ديثيانون", codeGroup: "FRAC M09", type: "FRAC" },
  "Vertimec 018 EC": { activeFr: "Abamectine", activeAr: "أبامكتين", codeGroup: "IRAC 6", type: "IRAC" },
  "Bactimec": { activeFr: "Abamectine", activeAr: "أبامكتين", codeGroup: "IRAC 6", type: "IRAC" },
  "Nucop 35 WG": { activeFr: "Oxychlorure de cuivre", activeAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "Curenox 50": { activeFr: "Oxychlorure de cuivre", activeAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "Nativo 75 WG": { activeFr: "Tébuconazole + Trifloxystrobine", activeAr: "تيبوكونازول + تريفلوكسيستروبين", codeGroup: "FRAC 3 + FRAC 11", type: "FRAC" },
  "Exirel": { activeFr: "Cyantraniliprole", activeAr: "سيانترانيليبرول", codeGroup: "IRAC 28", type: "IRAC" },
  "Tracer 480 SC": { activeFr: "Spinosad", activeAr: "سبينوساد", codeGroup: "IRAC 5", type: "IRAC" },
  "Spintor": { activeFr: "Spinosad", activeAr: "سبينوساد", codeGroup: "IRAC 5", type: "IRAC" },
  "Teldor 500 SC": { activeFr: "Fenhexamide", activeAr: "فينهكساميد", codeGroup: "FRAC 17", type: "FRAC" },
};

export function getIracFracCode(productName: string): string {
  if (!productName) return "";
  const clean = productName.trim();
  if (COMMERCIAL_TO_ACTIVE[clean]?.codeGroup) return COMMERCIAL_TO_ACTIVE[clean].codeGroup!;
  const lower = clean.toLowerCase();
  for (const [k, v] of Object.entries(COMMERCIAL_TO_ACTIVE)) {
    if (k.toLowerCase() === lower || lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) {
      return v.codeGroup || "";
    }
  }
  return "";
}

export function getMatiereActive(productName: string): string {
  if (!productName) return "";
  const clean = productName.trim();
  if (COMMERCIAL_TO_ACTIVE[clean]) return COMMERCIAL_TO_ACTIVE[clean].activeFr;
  const lower = clean.toLowerCase();
  for (const [k, v] of Object.entries(COMMERCIAL_TO_ACTIVE)) {
    if (k.toLowerCase() === lower || lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) {
      return v.activeFr;
    }
  }
  return "";
}

export function getMatiereActiveAr(productName: string): string {
  if (!productName) return "";
  const clean = productName.trim();
  if (COMMERCIAL_TO_ACTIVE[clean]) return COMMERCIAL_TO_ACTIVE[clean].activeAr;
  const lower = clean.toLowerCase();
  for (const [k, v] of Object.entries(COMMERCIAL_TO_ACTIVE)) {
    if (k.toLowerCase() === lower || lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) {
      return v.activeAr;
    }
  }
  return "";
}

export const PHYTO_DATABASE: PhytoProductInfo[] = [
  {
    name: "Calypso",
    matiereActive: "Thiaclopride",
    matiereActiveAr: "ثياكلوبريد",
    cible: "Insecticide systémique (Pucerons, Carpocapse du pommier)",
    dosage: "20 à 30 cc / hl",
    volume: "1 L",
    price: "20000",
    dar: "14j",
  },
  {
    name: "Sivento",
    matiereActive: "Flupyradifurone",
    matiereActiveAr: "فلوبيراديفورون",
    cible: "Excellente systémie (Pucerons, Aleurodes)",
    dosage: "0,5 L / ha",
    volume: "1 L",
    price: "10000",
    dar: "3-14j",
  },
  {
    name: "Verlan",
    matiereActive: "Abamectine",
    matiereActiveAr: "أبامكتين",
    cible: "Action translaminaire (Acariens, Mineuses)",
    dosage: "40 à 50 cc / hl",
    volume: "1 L",
    price: "11000",
    dar: "7-14j",
  },
  {
    name: "Bellis",
    matiereActive: "Boscalide + Pyraclostrobine",
    matiereActiveAr: "بوسكاليد + بيراكلوستروبين",
    cible: "Spécifique arbres à noyau (Coryneum du nectarinier, Oïdium)",
    dosage: "30 à 50 g / hl",
    volume: "1 kg",
    price: "24000",
    dar: "7j",
  },
  {
    name: "Erlan",
    matiereActive: "Acétamipride",
    matiereActiveAr: "أسيتامبريد",
    cible: "Insectes piqueurs-suceurs",
    dosage: "200 à 300 g / ha",
    volume: "1,02 L",
    price: "2300",
    dar: "14j",
  },
  {
    name: "Sherpa 25 EC",
    matiereActive: "Cyperméthrine",
    matiereActiveAr: "سيبيرمثرين",
    cible: "Effet de choc par contact (Psylle de l'olivier, Noctuelles)",
    dosage: "0,5 L / ha",
    volume: "0,250 L",
    price: "1600",
    dar: "14j",
  },
  {
    name: "Decis Expert",
    matiereActive: "Deltaméthrine",
    matiereActiveAr: "دلتامثرين",
    cible: "Large spectre, action foudroyante",
    dosage: "250 ml / ha",
    volume: "0,250 L",
    price: "3200",
    dar: "7j",
  },
  {
    name: "Acetaplan",
    matiereActive: "Acétamipride",
    matiereActiveAr: "أسيتامبريد",
    cible: "Insecticide systémiques",
    dosage: "",
    volume: "1 L",
    price: "2000",
    dar: "",
  },
  {
    name: "Amistar",
    matiereActive: "Azoxystrobine",
    matiereActiveAr: "أزوكسيستروبين",
    cible: "Fongicide préventif large spectre",
    dosage: "0,8 à 1 L / ha",
    volume: "1 L",
    price: "4500",
    dar: "7j",
  },
  {
    name: "Azostar 325SC",
    matiereActive: "Azoxystrobine + Difénoconazole",
    matiereActiveAr: "أزوكسيستروبين + ديفينوكونازول",
    cible: "Double action (Tavelure du pommier, Oïdium)",
    dosage: "0,75 à 1 L / ha",
    volume: "1 L",
    price: "1000",
    dar: "14j",
  },
  {
    name: "Zorro",
    matiereActive: "Abamectine",
    matiereActiveAr: "أبامكتين",
    cible: "Acaricide de référence (Acariens rouges)",
    dosage: "40 à 50 cc / hl",
    volume: "1 L",
    price: "1000",
    dar: "3-30j",
  },
  {
    name: "Fosetyl Aluminium",
    matiereActive: "Fosétyl-Aluminium",
    matiereActiveAr: "فوسيتيل الألومنيوم",
    cible: "Systémie ascendante/descendante (Phytophthora, Mildiou)",
    dosage: "2,5 kg / ha",
    volume: "1 Kg",
    price: "3500",
    dar: "14-21j",
  },
  {
    name: "Luna",
    matiereActive: "Fluopyram + Tébuconazole",
    matiereActiveAr: "فلوبيرام + تيبوكونازول",
    cible: "Très haute efficacité (Monilia, Tavelure, Oïdium)",
    dosage: "0,3 à 0,4 L / ha",
    volume: "1 L",
    price: "19250",
    dar: "3-7j",
  },
  {
    name: "Criptan",
    matiereActive: "Captane",
    matiereActiveAr: "كابتان",
    cible: "Fongicide de contact (Tavelure, Monilia)",
    dosage: "1,5 à 2 kg / ha",
    volume: "1 Kg",
    price: "2800",
    dar: "14-21j",
  },
  {
    name: "Extrachim",
    matiereActive: "Matières actives diverses",
    matiereActiveAr: "مواد فعالة متعددة",
    cible: "Distributeur local proposant plusieurs matières actives",
    dosage: "Selon le produit",
    volume: "0,1 Kg",
    price: "750",
    dar: "Variable",
  },
  {
    name: "Rustilan",
    matiereActive: "Acétamipride",
    matiereActiveAr: "أسيتامبريد",
    cible: "Systémique racinaire et foliaire (Pucerons)",
    dosage: "200 à 300 g / ha",
    volume: "0,1 Kg",
    price: "1000",
    dar: "14j",
  },
  {
    name: "Tachigazol",
    matiereActive: "Hymexazol",
    matiereActiveAr: "هيميكسازول",
    cible: "Désinfection des sols (Fusarium). Apport en irrigation.",
    dosage: "1 à 2 L / ha",
    volume: "1,02 L",
    price: "5500",
    dar: "N/A",
  },
  {
    name: "Phytocap",
    matiereActive: "Captane",
    matiereActiveAr: "كابتان",
    cible: "Désinfection des sols (Fusarium). Apport en irrigation.",
    dosage: "2 à 2 L / ha",
    volume: "1 Kg",
    price: "2500",
    dar: "N/A",
  }
];
