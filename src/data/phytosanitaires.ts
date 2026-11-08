export interface PhytoProductInfo {
  name: string;
  matiereActive?: string;
  matiereActiveAr?: string;
  cible: string;
  dosage: string;
  volume: string;
  price: string;
  dar: string;
}

export const COMMERCIAL_TO_ACTIVE: Record<string, { activeFr: string; activeAr: string }> = {
  "Bellis": { activeFr: "Boscalide + Pyraclostrobine", activeAr: "بوسكاليد + بيراكلوستروبين" },
  "Signum WG": { activeFr: "Boscalide + Pyraclostrobine", activeAr: "بوسكاليد + بيراكلوستروبين" },
  "Decis Expert": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين" },
  "Deltacal": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين" },
  "Sivento": { activeFr: "Flupyradifurone", activeAr: "فلوبيراديفورون" },
  "Calypso": { activeFr: "Thiaclopride", activeAr: "ثياكلوبريد" },
  "Sherpa 25 EC": { activeFr: "Cyperméthrine", activeAr: "سيبيرمثرين" },
  "Verlan": { activeFr: "Abamectine", activeAr: "أبامكتين" },
  "Erlan": { activeFr: "Acétamipride", activeAr: "أسيتامبريد" },
  "Acetaplan": { activeFr: "Acétamipride", activeAr: "أسيتامبريد" },
  "Aceplan": { activeFr: "Acétamipride", activeAr: "أسيتامبريد" },
  "Mospilan 20 SP": { activeFr: "Acétamipride", activeAr: "أسيتامبريد" },
  "Amistar": { activeFr: "Azoxystrobine", activeAr: "أزوكسيستروبين" },
  "Azostar 325SC": { activeFr: "Azoxystrobine + Difénoconazole", activeAr: "أزوكسيستروبين + ديفينوكونازول" },
  "Zorro": { activeFr: "Abamectine", activeAr: "أبامكتين" },
  "Fosetyl Aluminium": { activeFr: "Fosétyl-Aluminium", activeAr: "فوسيتيل الألومنيوم" },
  "Aliette Flash": { activeFr: "Fosétyl-Aluminium", activeAr: "فوسيتيل الألومنيوم" },
  "Luna": { activeFr: "Fluopyram + Tébuconazole", activeAr: "فلوبيرام + تيبوكونازول" },
  "Luna Experience": { activeFr: "Fluopyram + Tébuconazole", activeAr: "فلوبيرام + تيبوكونازول" },
  "Criptan": { activeFr: "Captane", activeAr: "كابتان" },
  "Phytocap": { activeFr: "Captane", activeAr: "كابتان" },
  "Captan 50": { activeFr: "Captane", activeAr: "كابتان" },
  "Extrachim": { activeFr: "Matières actives diverses", activeAr: "مواد فعالة متعددة" },
  "Rustilan": { activeFr: "Acétamipride", activeAr: "أسيتامبريد" },
  "Tachigazol": { activeFr: "Hymexazol", activeAr: "هيميكسازول" },
  "Score 250 EC": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول" },
  "Folicur 250 EW": { activeFr: "Tébuconazole", activeAr: "تيبوكونازول" },
  "Topas 100 EC": { activeFr: "Penconazole", activeAr: "بنكونازول" },
  "Movento 100 SC": { activeFr: "Spirotétramate", activeAr: "سبيروتتراماط" },
  "Coragen 20 SC": { activeFr: "Chlorantraniliprole", activeAr: "كلورانترانيليبرول" },
  "Delan 70 WG": { activeFr: "Dithianon", activeAr: "ديثيانون" },
  "Vertimec 018 EC": { activeFr: "Abamectine", activeAr: "أبامكتين" },
  "Bactimec": { activeFr: "Abamectine", activeAr: "أبامكتين" },
  "Nucop 35 WG": { activeFr: "Oxychlorure de cuivre", activeAr: "أوكسيكلورور النحاس" },
  "Curenox 50": { activeFr: "Oxychlorure de cuivre", activeAr: "أوكسيكلورور النحاس" },
  "Nativo 75 WG": { activeFr: "Tébuconazole + Trifloxystrobine", activeAr: "تيبوكونازول + تريفلوكسيستروبين" },
  "Exirel": { activeFr: "Cyantraniliprole", activeAr: "سيانترانيليبرول" },
  "Tracer 480 SC": { activeFr: "Spinosad", activeAr: "سبينوساد" },
  "Spintor": { activeFr: "Spinosad", activeAr: "سبينوساد" },
  "Teldor 500 SC": { activeFr: "Fenhexamide", activeAr: "فينهكساميد" },
};

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
