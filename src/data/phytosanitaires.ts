// Base phytosanitaire Doula Agro — Enrichie avec 148 spécialités INPV (FITO Algérie)
// Compatible à 100 % avec PhytoAdvisorModal.tsx et engine.ts (champs historiques préservés)

export type PhytoCultureKey = "pommier" | "nectarinier" | "olivier";
export type BlockedStageKey = "floraison" | "chute_petales" | "grossissement" | "maturation" | "foliaire_interdit";

export interface PhytoProductInfo {
  name: string;
  matiereActive?: string;
  matiereActiveAr?: string;
  codeGroup?: string;
  formulation?: string;
  homologation?: string;
  cultures?: PhytoCultureKey[];
  cible: string;
  dosage: string;
  volume: string;
  price: string;
  dar: string;
  dreHours?: number;
  maxPerSeason?: number;
  allowedStages?: string;
  blockedStages?: BlockedStageKey[];
  blockedReason?: string;
  notes?: string;
  validationStatus?: "validated" | "indicative";
}

export interface ActiveSubstanceDetail {
  activeFr: string;
  activeAr: string;
  codeGroup?: string;
  type?: "FRAC" | "IRAC" | "HRAC";
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
  "Dicis": { activeFr: "Deltaméthrine", activeAr: "ديلتاميثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "Difénoconazole Score": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
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
  "Voliam Targo": { activeFr: "Chlorantraniliprole + Abamectine", activeAr: "كلورانترانيليبرول + أبامكتين", codeGroup: "IRAC 28 + IRAC 6", type: "IRAC" },
  "Karate Zeon": { activeFr: "Lambda-cyhalothrine", activeAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "Kumulus WG": { activeFr: "Soufre", activeAr: "كبريت", codeGroup: "FRAC M02", type: "FRAC" },
  "Microthiol Disperss": { activeFr: "Soufre", activeAr: "كبريت", codeGroup: "FRAC M02", type: "FRAC" },
  "Chorus 50 WG": { activeFr: "Cyprodinil", activeAr: "سيبرودينيل", codeGroup: "FRAC 9", type: "FRAC" },
  "Switch 62.5 WG": { activeFr: "Cyprodinil + Fludioxonil", activeAr: "سيبرودينيل + فلوديوكسونيل", codeGroup: "FRAC 9 + FRAC 12", type: "FRAC" },
  "Fontelis": { activeFr: "Penthiopyrade", activeAr: "بينثيوبيراد", codeGroup: "FRAC 7", type: "FRAC" },
  "Sercadis": { activeFr: "Fluxapyroxad", activeAr: "فلوكسابيروكساد", codeGroup: "FRAC 7", type: "FRAC" },
  "Affirm": { activeFr: "Emamectine benzoate", activeAr: "إيمامكتين بنزوات", codeGroup: "IRAC 6", type: "IRAC" },
  "Proclaim": { activeFr: "Emamectine benzoate", activeAr: "إيمامكتين بنزوات", codeGroup: "IRAC 6", type: "IRAC" },
  "Dipel DF": { activeFr: "Bacillus thuringiensis", activeAr: "باسيلوس ثورينجينسيس", codeGroup: "IRAC 11A", type: "IRAC" },
  "Teldor 500 SC": { activeFr: "Fenhexamide", activeAr: "فينهكساميد", codeGroup: "FRAC 17", type: "FRAC" },
  // --- Spécialités INPV Algérie (FITO — Pommier, Nectarinier, Olivier) ---
  "DELTARIN 2,5 %": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "VAPCOMIC": { activeFr: "Abamectine", activeAr: "أبامكتين", codeGroup: "IRAC 6", type: "IRAC" },
  "INSEGAR®": { activeFr: "Fénoxycarbe", activeAr: "فينوكسيكارب", codeGroup: "IRAC 7B", type: "IRAC" },
  "PELT 70 WG": { activeFr: "Thiophanate-méthyle", activeAr: "ثيوفانات الميثيل", codeGroup: "FRAC 1", type: "FRAC" },
  "SCORE": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "SWITCH": { activeFr: "Cyprodinil + Fludioxonil", activeAr: "سيبرودينيل + فلوديوكسونيل", codeGroup: "FRAC 9 + FRAC 12", type: "FRAC" },
  "TEBUCONATE": { activeFr: "Tébuconazole", activeAr: "تيبوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "THIOVIT JET": { activeFr: "Soufre", activeAr: "كبريت", codeGroup: "FRAC M02", type: "FRAC" },
  "TOPAZE": { activeFr: "Penconazole", activeAr: "بنكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "TRINOL": { activeFr: "Triadiménol", activeAr: "ترياديمينول", codeGroup: "FRAC 3", type: "FRAC" },
  "VIDAN 25": { activeFr: "Triadiménol", activeAr: "ترياديمينول", codeGroup: "FRAC 3", type: "FRAC" },
  "AGRIM 25": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "BOUILLIE BORDELAISE WG": { activeFr: "Oxychlorure de cuivre", activeAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "CAPITAN": { activeFr: "Captane", activeAr: "كابتان", codeGroup: "FRAC M04", type: "FRAC" },
  "CAPTAN 50 VALLES": { activeFr: "Captane", activeAr: "كابتان", codeGroup: "FRAC M04", type: "FRAC" },
  "CHAMP FLO": { activeFr: "Hydroxyde de cuivre", activeAr: "هيدروكسيد النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "CHORUS": { activeFr: "Cyprodinil", activeAr: "سيبرودينيل", codeGroup: "FRAC 9", type: "FRAC" },
  "COMAC": { activeFr: "Sulfate de cuivre neutralisé à la chaux", activeAr: "بوردو (كبريتات النحاس مع الجير)", codeGroup: "FRAC M01", type: "FRAC" },
  "DIVISOLE 250 EC": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "COMMANDO": { activeFr: "Acétamipride", activeAr: "أسيتامبريد", codeGroup: "IRAC 4A", type: "IRAC" },
  "ALEMBRA": { activeFr: "Spirotétramate", activeAr: "سبيروتتراماط", codeGroup: "IRAC 23", type: "IRAC" },
  "TREBON": { activeFr: "Étofenprox", activeAr: "إيتوفنبروكس", codeGroup: "IRAC 3A", type: "IRAC" },
  "ALION® 500 SC": { activeFr: "Indaziflame", activeAr: "إندازيفلام", codeGroup: "HRAC 29", type: "HRAC" },
  "STICMAN": { activeFr: "Latex synthétique", activeAr: "لاتكس صناعي (مادة ناشرة)", codeGroup: "Adjuvant", type: "FRAC" },
  "SERCADIS PLUS": { activeFr: "Fluxapyroxade + Difénoconazole", activeAr: "فلوكسابيروكساد + ديفينوكونازول", codeGroup: "FRAC 7 + FRAC 3", type: "FRAC" },
  "CANTUS": { activeFr: "Boscalid", activeAr: "بوسكاليد", codeGroup: "FRAC 7", type: "FRAC" },
  "PERKINS": { activeFr: "Flonicamide", activeAr: "فلونيكاميد", codeGroup: "IRAC 29", type: "IRAC" },
  "OSAKI": { activeFr: "Cyflufénamide", activeAr: "سيفلوفيناميد", codeGroup: "FRAC U06", type: "FRAC" },
  "CYPERSOL 0,8% GR": { activeFr: "Cyperméthrine", activeAr: "سيبيرمثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "TEFLUSOL 0.5% GR": { activeFr: "Téfluthrine", activeAr: "تيفلوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "ZAHAR": { activeFr: "Boscalid + Pyraclostrobine", activeAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", type: "FRAC" },
  "GAMMA": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "AGROIL BLUE": { activeFr: "Huile de paraffine", activeAr: "زيت البارافين المعدني", codeGroup: "IRAC UN", type: "IRAC" },
  "KRISANT": { activeFr: "Pyréthrines", activeAr: "بيرثرين طبيعي", codeGroup: "IRAC 3A", type: "IRAC" },
  "VOLCAN": { activeFr: "Pyraflufen-éthyle", activeAr: "بيرافلوفين إيثيل", codeGroup: "HRAC 14", type: "HRAC" },
  "VECTOR 50 WG": { activeFr: "Cyprodinil", activeAr: "سيبرودينيل", codeGroup: "FRAC 9", type: "FRAC" },
  "AZUMO-WG": { activeFr: "Soufre", activeAr: "كبريت", codeGroup: "FRAC M02", type: "FRAC" },
  "HP22": { activeFr: "Huile blanche", activeAr: "زيت معدني أبيض", codeGroup: "IRAC UN", type: "IRAC" },
  "SWIFT": { activeFr: "Hydroxyde de cuivre", activeAr: "هيدروكسيد النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "FONGI-SOUFRE 98% DP": { activeFr: "Soufre", activeAr: "كبريت", codeGroup: "FRAC M02", type: "FRAC" },
  "SOURCE S": { activeFr: "Soufre micronisé mouillable", activeAr: "كبريت قابل للبلل", codeGroup: "FRAC M02", type: "FRAC" },
  "CYPROFLUX": { activeFr: "Cyprodinil + Fludioxonil", activeAr: "سيبرودينيل + فلوديوكسونيل", codeGroup: "FRAC 9 + FRAC 12", type: "FRAC" },
  "BELANTY": { activeFr: "Méfentrifluconazole", activeAr: "ميفنتريفلوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "EDEN": { activeFr: "Esfenvalérate", activeAr: "إسفينفاليرات", codeGroup: "IRAC 3A", type: "IRAC" },
  "OZIS": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "BOUSTANE": { activeFr: "Pyridabène + Acétamipride", activeAr: "بيريدابين + أسيتامبريد", codeGroup: "IRAC 21A + IRAC 4A", type: "IRAC" },
  "EL MALIK": { activeFr: "Lambda-cyhalothrine + Pyrimicarbe", activeAr: "لامبدا-سيهالوثرين + بيريميكارب", codeGroup: "IRAC 3A + IRAC 1A", type: "IRAC" },
  "CARFENALE": { activeFr: "Carfentrazone", activeAr: "كارفنترازون", codeGroup: "HRAC 14", type: "HRAC" },
  "ABANUTINA": { activeFr: "Abamectine", activeAr: "أبامكتين", codeGroup: "IRAC 6", type: "IRAC" },
  "CYM 25": { activeFr: "Cyperméthrine", activeAr: "سيبيرمثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "CYRUX": { activeFr: "Cyperméthrine", activeAr: "سيبيرمثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "ALPHAZURON 20% SC": { activeFr: "Diflubenzuron", activeAr: "ديفلوبنزورون", codeGroup: "IRAC 15", type: "IRAC" },
  "ALPHYTHRINE 25 EC": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "BATON 100 EC": { activeFr: "Bifenthrine", activeAr: "بيفنثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "BEIDAZIT": { activeFr: "Huile minérale paraffinique", activeAr: "زيت معدني بارافيني", codeGroup: "IRAC UN", type: "IRAC" },
  "BISECT": { activeFr: "Bifenthrine", activeAr: "بيفنثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "DELTAMAC 2,5 EC": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "DELTAPLAN": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "ELECTRA": { activeFr: "Lufénuron", activeAr: "لوفينورون", codeGroup: "IRAC 15", type: "IRAC" },
  "POWER 10% EC": { activeFr: "Cyperméthrine", activeAr: "سيبيرمثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "PROTEUS 170 OD": { activeFr: "Thiaclopride + Deltaméthrine", activeAr: "ثياكلوبريد + دلتامثرين", codeGroup: "IRAC 4A + IRAC 3A", type: "IRAC" },
  "VERTIN 1,8 % EC": { activeFr: "Abamectine", activeAr: "أبامكتين", codeGroup: "IRAC 6", type: "IRAC" },
  "GUERISSEUR": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "KARATEKA": { activeFr: "Lambda-cyhalothrine", activeAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "LAMBDA-CYTHRINE 25 EC": { activeFr: "Lambda-cyhalothrine", activeAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "LAMDOC 50 EC": { activeFr: "Lambda-cyhalothrine", activeAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "LERATEX 5 EC": { activeFr: "Lambda-cyhalothrine", activeAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "PYRUS 400 SC": { activeFr: "Pyriméthanil", activeAr: "بيريميثانيل", codeGroup: "FRAC 9", type: "FRAC" },
  "STROBY WG": { activeFr: "Krésoxim-méthyl", activeAr: "كريسوكسيم ميثيل", codeGroup: "FRAC 11", type: "FRAC" },
  "BELLIS® WG": { activeFr: "Boscalid + Pyraclostrobine", activeAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", type: "FRAC" },
  "BIOCUIVRE": { activeFr: "Cuivre", activeAr: "نحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "CALDO BORDOLES": { activeFr: "Sulfate de cuivre", activeAr: "كبريتات النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "SUMI ALPHA 2,5 EC": { activeFr: "Esfenvalérate", activeAr: "إسفينفاليرات", codeGroup: "IRAC 3A", type: "IRAC" },
  "FOLDON": { activeFr: "Folpet", activeAr: "فولبيت", codeGroup: "FRAC M04", type: "FRAC" },
  "FLINT 50 WG": { activeFr: "Trifloxystrobine", activeAr: "تريفلوكسيستروبين", codeGroup: "FRAC 11", type: "FRAC" },
  "HORIZELL 25 EC": { activeFr: "Tébuconazole", activeAr: "تيبوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "INACOP": { activeFr: "Oxychlorure de cuivre", activeAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "MAGNASOUFRE 80 WG": { activeFr: "Soufre", activeAr: "كبريت", codeGroup: "FRAC M02", type: "FRAC" },
  "MICROTHIOL SPECIAL WG": { activeFr: "Soufre micronisé atomisé", activeAr: "كبريت ميكروني", codeGroup: "FRAC M02", type: "FRAC" },
  "DEKACIM": { activeFr: "Cyperméthrine", activeAr: "سيبيرمثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "TENSTAR": { activeFr: "Bifenthrine", activeAr: "بيفنثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "SUPERALPHA 2,5 EC": { activeFr: "Esfenvalérate", activeAr: "إسفينفاليرات", codeGroup: "IRAC 3A", type: "IRAC" },
  "AIRONE WG": { activeFr: "Oxychlorure de cuivre + Hydroxyde de cuivre", activeAr: "أوكسيكلورور النحاس + هيدروكسيد النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "AMIX": { activeFr: "Sulfate de cuivre", activeAr: "كبريتات النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "DEKAXIM": { activeFr: "Krésoxim-méthyl", activeAr: "كريسوكسيم ميثيل", codeGroup: "FRAC 11", type: "FRAC" },
  "DIMEFOL": { activeFr: "Folpet + Diméthomorphe", activeAr: "فولبيت + ديميثومورف", codeGroup: "FRAC M04 + FRAC 40", type: "FRAC" },
  "BOUILLIE BORDELAISE ALPHYT": { activeFr: "Sulfate de cuivre", activeAr: "كبريتات النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "MAPHYTO-PHANATE 70": { activeFr: "Thiophanate-méthyle", activeAr: "ثيوفانات الميثيل", codeGroup: "FRAC 1", type: "FRAC" },
  "DELTACAL 25 EC": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "Li 700 ®": { activeFr: "Lécithine de Soja", activeAr: "ليسيثين الصويا", codeGroup: "Adjuvant", type: "FRAC" },
  "APOLLO 50 SC": { activeFr: "Clofentézine", activeAr: "كلوفنتيزين", codeGroup: "IRAC 10A", type: "IRAC" },
  "DELTHARIN 2,5 EC ®": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "APOACARICIDE": { activeFr: "Clofentézine", activeAr: "كلوفنتيزين", codeGroup: "IRAC 10A", type: "IRAC" },
  "DALLAS": { activeFr: "Abamectine + Émamectine benzoate", activeAr: "أبامكتين + إيمامكتين بنزوات", codeGroup: "IRAC 6", type: "IRAC" },
  "TUCSON": { activeFr: "Tébufenpyrad", activeAr: "تيبوفينبيراد", codeGroup: "IRAC 21A", type: "IRAC" },
  "DECAPLUS": { activeFr: "Lambda-cyhalothrine", activeAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "KANEMITE®": { activeFr: "Acéquinocyl", activeAr: "أسيكينوسيل", codeGroup: "IRAC 20B", type: "IRAC" },
  "FAST 5 EC": { activeFr: "Esfenvalérate", activeAr: "إسفينفاليرات", codeGroup: "IRAC 3A", type: "IRAC" },
  "DIPROPHYT 25% EC": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "MAGUS 200 SC®": { activeFr: "Fénazaquine", activeAr: "فينازاكين", codeGroup: "IRAC 21A", type: "IRAC" },
  "BAZAR": { activeFr: "Étoxazole", activeAr: "إيتوكسازول", codeGroup: "IRAC 10B", type: "IRAC" },
  "ORTIPLUS": { activeFr: "Azoxystrobine + Difénoconazole", activeAr: "أزوكسيستروبين + ديفينوكونازول", codeGroup: "FRAC 11 + FRAC 3", type: "FRAC" },
  "RAPIDOX 50 WG": { activeFr: "Trifloxystrobine", activeAr: "تريفلوكسيستروبين", codeGroup: "FRAC 11", type: "FRAC" },
  "BOCUS DUO": { activeFr: "Boscalid + Pyraclostrobine", activeAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", type: "FRAC" },
  "ACARINA": { activeFr: "Abamectine", activeAr: "أبامكتين", codeGroup: "IRAC 6", type: "IRAC" },
  "CINIL 50% WG": { activeFr: "Cyprodinil", activeAr: "سيبرودينيل", codeGroup: "FRAC 9", type: "FRAC" },
  "TRIFLOMIGHT 500 WG": { activeFr: "Trifloxystrobine", activeAr: "تريفلوكسيستروبين", codeGroup: "FRAC 11", type: "FRAC" },
  "ACRIMATE": { activeFr: "Abamectine + Fenpyroximate", activeAr: "أبامكتين + فينبيروكسيمات", codeGroup: "IRAC 6 + IRAC 21A", type: "IRAC" },
  "ACARION PLUS": { activeFr: "Étoxazole + Fenpyroximate", activeAr: "إيتوكسازول + فينبيروكسيمات", codeGroup: "IRAC 10B + IRAC 21A", type: "IRAC" },
  "RECYP": { activeFr: "Cyétpyrafène", activeAr: "سيتبيرافين", codeGroup: "IRAC 25A", type: "IRAC" },
  "DECIS 25 EC": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "DELTAMETHRINE 2,5 EC": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "CITROLE": { activeFr: "Huile de pétrole", activeAr: "زيت بترولي معدني", codeGroup: "IRAC UN", type: "IRAC" },
  "NATURAM 5": { activeFr: "Sulfate de cuivre", activeAr: "كبريتات النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "OXICRON 50 WP": { activeFr: "Oxychlorure de cuivre", activeAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "LAINCOIL": { activeFr: "Huile blanche", activeAr: "زيت معدني أبيض", codeGroup: "IRAC UN", type: "IRAC" },
  "LIMACIDE 40": { activeFr: "Méthidathion", activeAr: "ميثيداثيون", codeGroup: "IRAC 1B", type: "IRAC" },
  "LIMATOATE 40% EC": { activeFr: "Diméthoate", activeAr: "ديميثوات", codeGroup: "IRAC 1B", type: "IRAC" },
  "NUTREL": { activeFr: "Protéine hydrolysée", activeAr: "بروتين متحلل (جاذب)", codeGroup: "Attractif / Appât", type: "FRAC" },
  "POINTER 100 SC": { activeFr: "Lambda-cyhalothrine", activeAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "FASTAC 100 EC": { activeFr: "Alpha-cyperméthrine", activeAr: "ألفا-سيبيرمثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "HELIOCUIVRE": { activeFr: "Hydroxyde de cuivre", activeAr: "هيدروكسيد النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "DELTRINE": { activeFr: "Deltaméthrine", activeAr: "دلتامثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "TOUTIA PLUS": { activeFr: "Oxychlorure de cuivre", activeAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", type: "FRAC" },
  "ARBEKYN 25 SC": { activeFr: "Buprofézine", activeAr: "بوبروفيزين", codeGroup: "IRAC 16", type: "IRAC" },
  "SPARVIERO": { activeFr: "Lambda-cyhalothrine", activeAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "TARSSUS": { activeFr: "Cinnamaldéhyde (aldéhyde cinnamique)", activeAr: "سينامالدهيد", codeGroup: "IRAC UN", type: "IRAC" },
  "DELAN 500 SC": { activeFr: "Dithianon", activeAr: "ديثيانون", codeGroup: "FRAC M09", type: "FRAC" },
  "SPINOX 480 SC": { activeFr: "Spinosad", activeAr: "سبينوساد", codeGroup: "IRAC 5", type: "IRAC" },
  "COURT 38% WG": { activeFr: "Boscalid + Pyraclostrobine", activeAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", type: "FRAC" },
  "EFFICAZ 20 SC": { activeFr: "Chlorantraniliprole", activeAr: "كلورانترانيليبرول", codeGroup: "IRAC 28", type: "IRAC" },
  "ARRIVO": { activeFr: "Cyperméthrine", activeAr: "سيبيرمثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "FORCE": { activeFr: "Téfluthrine", activeAr: "تيفلوثرين", codeGroup: "IRAC 3A", type: "IRAC" },
  "VOLIAM TARGO 063 SC": { activeFr: "Chlorantraniliprole + Abamectine", activeAr: "كلورانترانيليبرول + أبامكتين", codeGroup: "IRAC 28 + IRAC 6", type: "IRAC" },
  "NOMOLT": { activeFr: "Téflubenzuron", activeAr: "تيفلوبنزورون", codeGroup: "IRAC 15", type: "IRAC" },
  "PINK": { activeFr: "Trifloxystrobine", activeAr: "تريفلوكسيستروبين", codeGroup: "FRAC 11", type: "FRAC" },
  "SYLLIT 400 SC": { activeFr: "Dodine", activeAr: "دودين", codeGroup: "FRAC U12", type: "FRAC" },
  "SYSTHANE 240 EC": { activeFr: "Myclobutanil", activeAr: "ميكلوبوتانيل", codeGroup: "FRAC 3", type: "FRAC" },
  "ALIETTE® FLASH": { activeFr: "Fosétyl-aluminium", activeAr: "فوسيتيل الألومنيوم", codeGroup: "FRAC P07", type: "FRAC" },
  "ALUFOS": { activeFr: "Fosétyl-aluminium", activeAr: "فوسيتيل الألومنيوم", codeGroup: "FRAC P07", type: "FRAC" },
  "DIFESOLE 25 EC": { activeFr: "Difénoconazole", activeAr: "ديفينوكونازول", codeGroup: "FRAC 3", type: "FRAC" },
  "HELIOSOUFRE SC": { activeFr: "Soufre", activeAr: "كبريت", codeGroup: "FRAC M02", type: "FRAC" },
  "LUNA® EXPERIENCE": { activeFr: "Tébuconazole + Fluopyram", activeAr: "تيبوكونازول + فلوبيرام", codeGroup: "FRAC 3 + FRAC 7", type: "FRAC" },
  "VACCIPLANT": { activeFr: "Laminarine", activeAr: "لامينارين", codeGroup: "FRAC P04", type: "FRAC" },
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

/** Vérifie si un produit doit être bloqué ou masqué pour un stade phénologique donné */
export function isProductBlockedAtStage(
  product: PhytoProductInfo,
  stageKey: BlockedStageKey
): { blocked: boolean; reason?: string } {
  if (!product.blockedStages || product.blockedStages.length === 0) {
    return { blocked: false };
  }
  if (product.blockedStages.includes("foliaire_interdit") || product.blockedStages.includes(stageKey)) {
    return { blocked: true, reason: product.blockedReason };
  }
  return { blocked: false };
}

export interface TankMixCheckResult {
  status: "compatible" | "warning" | "incompatible";
  isBlocking?: boolean;
  isDoubleEmploi?: boolean;
  title: string;
  message: string;
  advice?: string;
  codeA?: string;
  codeB?: string;
  typeA?: string;
  typeB?: string;
}

function normalizeActiveBase(raw: string): string {
  return (raw || "")
    .split("+")
    .map((part) =>
      part
        .split("·")[0]
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/gi, "")
        .toLowerCase()
        .trim(),
    )
    .filter(Boolean)
    .sort()
    .join(" + ");
}

function resolveFullActiveFr(productName: string): string {
  const fromMap = getMatiereActive(productName);
  if (fromMap) return fromMap;
  const lower = productName.trim().toLowerCase();
  const dbMatch = PHYTO_DATABASE.find((p) => p.name.trim().toLowerCase() === lower);
  return dbMatch?.matiereActive || "";
}

const MULTISITE_TANK_CODE_RE = /\b(FRAC\s*M0?[1-9]|IRAC\s*UN|ADJUVANT|ATTRACTIF|DIVERS)\b/i;

const RESISTANCE_GROUP_LABELS: Record<string, string> = {
  "FRAC 1": "MBC / Benzimidazole",
  "FRAC 3": "Triazole / DMI",
  "FRAC 7": "SDHI",
  "FRAC 9": "AP / Anilinopyrimidine",
  "FRAC 11": "QoI / Strobilurine",
  "FRAC 12": "PP / Phénylpyrrole",
  "FRAC 17": "Hydroxyanilide",
  "FRAC 40": "CAA",
  "IRAC 1A": "Carbamate",
  "IRAC 1B": "Organophosphoré",
  "IRAC 3A": "Pyréthrinoïde",
  "IRAC 4A": "Néonicotinoïde",
  "IRAC 4D": "Buténolide",
  "IRAC 5": "Spinosyne",
  "IRAC 6": "Avermectine",
  "IRAC 15": "Benzoylurée",
  "IRAC 21A": "METI",
  "IRAC 23": "Dérivé d'acide tétronique",
  "IRAC 28": "Diamide",
  "IRAC 29": "Flonicamide",
};

function splitResistanceCodes(rawCode: string): string[] {
  if (!rawCode) return [];
  return Array.from(
    new Set(
      rawCode
        .split(/[+/,]/)
        .map((c) => c.trim().replace(/\s+/g, " ").toUpperCase())
        .filter((c) => /^(FRAC|IRAC|HRAC)\s+[A-Z0-9]+$/i.test(c)),
    ),
  );
}

function resolveFullCodeGroup(productName: string): string {
  const fromMap = getIracFracCode(productName);
  if (fromMap) return fromMap;
  const lower = productName.trim().toLowerCase();
  const dbMatch = PHYTO_DATABASE.find((p) => p.name.trim().toLowerCase() === lower);
  return dbMatch?.codeGroup || "";
}

export function checkTankMixCompatibility(
  prodNameA: string,
  prodNameB: string,
  lang: "fr" | "ar" = "fr"
): TankMixCheckResult | null {
  if (!prodNameA || !prodNameB) return null;
  const isAr = lang === "ar";

  const cleanA = prodNameA.trim();
  const cleanB = prodNameB.trim();

  const codeA = resolveFullCodeGroup(cleanA);
  const codeB = resolveFullCodeGroup(cleanB);

  const activeFrRawA = resolveFullActiveFr(cleanA);
  const activeFrRawB = resolveFullActiveFr(cleanB);
  const activeA = isAr ? getMatiereActiveAr(cleanA) || activeFrRawA : activeFrRawA;
  const activeB = isAr ? getMatiereActiveAr(cleanB) || activeFrRawB : activeFrRawB;
  const normActiveA = normalizeActiveBase(activeFrRawA);
  const normActiveB = normalizeActiveBase(activeFrRawB);

  const typeA = COMMERCIAL_TO_ACTIVE[cleanA]?.type || (codeA.includes("IRAC") ? "IRAC" : codeA.includes("FRAC") ? "FRAC" : "");
  const typeB = COMMERCIAL_TO_ACTIVE[cleanB]?.type || (codeB.includes("IRAC") ? "IRAC" : codeB.includes("FRAC") ? "FRAC" : "");

  // 1. Même produit ou même matière active exacte (STRICTEMENT BLOQUANT)
  const sameName = cleanA.toLowerCase() === cleanB.toLowerCase();
  const sameActive =
    (normActiveA && normActiveB && normActiveA === normActiveB) ||
    (activeA && activeB && activeA.toLowerCase() === activeB.toLowerCase());
  if (sameName || sameActive) {
    return {
      status: "incompatible",
      isBlocking: true,
      isDoubleEmploi: true,
      title: isAr ? "⛔ تكرار نفس المادة الفعالة (Double Emploi)" : "⛔ Double emploi de la même matière active",
      message: isAr
        ? `المنتجان يحتويان على نفس المادة (${activeA || cleanA}). هذا التكرار ممنوع تماماً ويسبب جرعة زائدة وخطر المقاومة.`
        : `Les deux produits contiennent la même matière active (${activeA || cleanA}). Ce doublon est strictement bloqué (surdosage et risque de résistance).`,
      advice: isAr
        ? "قم بحذف أحد المنتجين أو استبداله بمادة فعالة ومجموعة كيميائية مختلفة."
        : "Supprimez ou remplacez l'un des deux produits par une matière active d'un autre groupe FRAC/IRAC.",
      codeA, codeB, typeA, typeB
    };
  }

  // 2. Incompatibilités chimiques majeures
  const isCuivreA = codeA.includes("M01") || cleanA.toLowerCase().includes("cuivre") || cleanA.toLowerCase().includes("nucop") || cleanA.toLowerCase().includes("curenox") || cleanA.toLowerCase().includes("bouillie");
  const isCuivreB = codeB.includes("M01") || cleanB.toLowerCase().includes("cuivre") || cleanB.toLowerCase().includes("nucop") || cleanB.toLowerCase().includes("curenox") || cleanB.toLowerCase().includes("bouillie");

  const isFosetylA = codeA.includes("P07") || codeA.includes("33") || cleanA.toLowerCase().includes("fosetyl") || cleanA.toLowerCase().includes("aliette");
  const isFosetylB = codeB.includes("P07") || codeB.includes("33") || cleanB.toLowerCase().includes("fosetyl") || cleanB.toLowerCase().includes("aliette");

  const isTriazoleA = codeA.includes("FRAC 3") || cleanA.toLowerCase().includes("score") || cleanA.toLowerCase().includes("folicur") || cleanA.toLowerCase().includes("topas") || cleanA.toLowerCase().includes("topaze");
  const isTriazoleB = codeB.includes("FRAC 3") || cleanB.toLowerCase().includes("score") || cleanB.toLowerCase().includes("folicur") || cleanB.toLowerCase().includes("topas") || cleanB.toLowerCase().includes("topaze");

  const isPyrethA = codeA.includes("IRAC 3A");
  const isPyrethB = codeB.includes("IRAC 3A");

  const isSoufreA = codeA.includes("M02") || cleanA.toLowerCase().includes("soufre") || cleanA.toLowerCase().includes("thiovit") || cleanA.toLowerCase().includes("kumulus");
  const isSoufreB = codeB.includes("M02") || cleanB.toLowerCase().includes("soufre") || cleanB.toLowerCase().includes("thiovit") || cleanB.toLowerCase().includes("kumulus");

  const isCaptaneA = codeA.includes("M04") || cleanA.toLowerCase().includes("captan") || cleanA.toLowerCase().includes("criptan") || cleanA.toLowerCase().includes("capitan");
  const isCaptaneB = codeB.includes("M04") || cleanB.toLowerCase().includes("captan") || cleanB.toLowerCase().includes("criptan") || cleanB.toLowerCase().includes("capitan");

  const activeFrA = activeFrRawA.toLowerCase();
  const activeFrB = activeFrRawB.toLowerCase();
  const isHuileA = activeFrA.includes("huile") || cleanA.toLowerCase().includes("huile") || cleanA.toLowerCase().includes("agroil") || cleanA.toLowerCase().includes("oil") || cleanA.toLowerCase().includes("citrole") || cleanA.toLowerCase().includes("beidazit") || cleanA.toLowerCase().includes("hp22");
  const isHuileB = activeFrB.includes("huile") || cleanB.toLowerCase().includes("huile") || cleanB.toLowerCase().includes("agroil") || cleanB.toLowerCase().includes("oil") || cleanB.toLowerCase().includes("citrole") || cleanB.toLowerCase().includes("beidazit") || cleanB.toLowerCase().includes("hp22");

  // Incompatibilité Cuivre + Fosétyl
  if ((isCuivreA && isFosetylB) || (isCuivreB && isFosetylA)) {
    return {
      status: "incompatible",
      isBlocking: true,
      title: isAr ? "⛔ تعارض كيميائي خطير (النحاس + فوسيتيل الألومنيوم)" : "⛔ Incompatibilité chimique absolue (Cuivre + Fosétyl-Al)",
      message: isAr
        ? "يمنع منعاً باتاً خلط النحاس مع فوسيتيل الألومنيوم (Fosetyl-Al) لتجنب ترسب المحلول وحروق شديدة للأوراق (Phytotoxicité)."
        : "Risque de floculation brutale de la bouillie et libération massive d’ions Cu2+ phytotoxiques (brûlures foliaires sévères).",
      advice: isAr
        ? "قم بفصل المعاملتين بفاصل زمني لا يقل عن 7 إلى 10 أيام."
        : "Appliquez ces deux produits séparément avec au moins 7 à 10 jours d'intervalle.",
      codeA, codeB, typeA, typeB
    };
  }

  // Incompatibilité Cuivre + Triazole
  if ((isCuivreA && isTriazoleB) || (isCuivreB && isTriazoleA)) {
    return {
      status: "incompatible",
      isBlocking: true,
      title: isAr ? "⛔ تعارض فيزيائي وكيميائي (النحاس + تريازول FRAC 3)" : "⛔ Incompatibilité Cuivre + Triazole (FRAC 3)",
      message: isAr
        ? "خلط النحاس مع مبيدات التريازول (مثل ديفينوكونازول أو تيبوكونازول) يسبب إبطال المفعول وخطر تسمم الأنسجة الفتية."
        : "Risque élevé de phytotoxicité foliaire et altération physico-chimique de la suspension fongicide.",
      advice: isAr
        ? "استعمل كل مبيد على حدة."
        : "Appliquer séparément pour préserver l'efficacité fongicide.",
      codeA, codeB, typeA, typeB
    };
  }

  // Incompatibilité Soufre + Huile
  if ((isSoufreA && isHuileB) || (isSoufreB && isHuileA)) {
    return {
      status: "incompatible",
      isBlocking: true,
      title: isAr ? "⛔ تعارض خطير: كبريت + زيت معدني" : "⛔ Incompatibilité majeure Soufre + Huile",
      message: isAr
        ? "خطر حروق شديدة للأوراق وتلف الثمار. يجب احترام فاصل 21 يوماً بين الكبريت والزيوت."
        : "Risque très grave de brûlures foliaires et nécrose des fruits. Respecter 21 jours d'intervalle minimum.",
      advice: isAr
        ? "لا تخلط الكبريت مع أي زيت معدني إطلاقاً."
        : "Ne jamais mélanger Soufre et Huile dans la même cuve.",
      codeA, codeB, typeA, typeB
    };
  }

  // Incompatibilité Cuivre (bactéricide M01) + Bacillus thuringiensis (IRAC 11A / Dipel)
  const isBtA = codeA.includes("11A") || activeFrA.includes("bacillus") || cleanA.toLowerCase().includes("dipel");
  const isBtB = codeB.includes("11A") || activeFrB.includes("bacillus") || cleanB.toLowerCase().includes("dipel");
  if ((isCuivreA && isBtB) || (isCuivreB && isBtA)) {
    return {
      status: "incompatible",
      isBlocking: true,
      title: isAr ? "⛔ تعارض بيولوجي: النحاس يبطل مفعول البكتيريا (Bt / Dipel)" : "⛔ Incompatibilité biologique : Cuivre + Bacillus thuringiensis (Bt)",
      message: isAr
        ? "النحاس مبيد بكتيري قوي يقضي مباشرة على أبواغ البكتيريا النافعة (Bacillus thuringiensis) في الخزان مما يجعل المعاملة عديمة الفعالية."
        : "Le cuivre est un bactéricide qui inactive/détruit directement les spores de Bacillus thuringiensis (Bt) dans la bouillie.",
      advice: isAr
        ? "لا تخلط أبداً النحاس أو أي منتج قلوي مع Bt — افصل المعاملتين بـ 5 إلى 7 أيام."
        : "Ne jamais mélanger un cuivre ou un produit alcalin avec Bt — espacer de 5 à 7 jours.",
      codeA, codeB, typeA, typeB
    };
  }

  // Incompatibilité Captane + Huile
  if ((isCaptaneA && isHuileB) || (isCaptaneB && isHuileA)) {
    return {
      status: "incompatible",
      isBlocking: true,
      title: isAr ? "⛔ تعارض قاطع: كابتان + زيت معدني" : "⛔ Incompatibilité absolue Captane + Huile",
      message: isAr
        ? "اختراق عنيف لأنسجة الأوراق مما يؤدي إلى تلف المحصول. يجب احترام فاصل 21 يوماً."
        : "Pénétration cuticulaire brutale provoquant la destruction des tissus foliaires et du fruit.",
      advice: isAr
        ? "استعمل الكابتان منفرداً دون خلطه بالزيوت."
        : "Délai de 21 jours obligatoire entre ces deux applications.",
      codeA, codeB, typeA, typeB
    };
  }

  // 2 bis. Intersection individuelle des codes FRAC / IRAC site-spécifiques (ex: Luna FRAC 7+3 vs Bellis FRAC 7+11 → FRAC 7 commun)
  const siteCodesA = splitResistanceCodes(codeA).filter((c) => !MULTISITE_TANK_CODE_RE.test(c));
  const siteCodesB = splitResistanceCodes(codeB).filter((c) => !MULTISITE_TANK_CODE_RE.test(c));
  const sharedSiteCodes = siteCodesA.filter((c) => siteCodesB.includes(c));
  if (sharedSiteCodes.length > 0) {
    const sharedShort = sharedSiteCodes.join(" + ");
    const sharedDetailed = sharedSiteCodes
      .map((c) => (RESISTANCE_GROUP_LABELS[c] ? `${c} - ${RESISTANCE_GROUP_LABELS[c]}` : c))
      .join(" + ");
    return {
      status: "incompatible",
      isBlocking: true,
      title: isAr
        ? `⛔ تعارض في مجموعة المقاومة (${sharedShort} مشترك)`
        : `⛔ Conflit de groupe de résistance (${sharedShort} commun)`,
      message: isAr
        ? `⛔ لا يمكن خلط ${cleanA} و ${cleanB}: كلاهما يحتوي على نفس مجموعة المقاومة (${sharedDetailed}). هذا يسبب تسريع مقاومة الأمراض وجرعة مزدوجة على نفس الهدف.`
        : `⛔ Mélange interdit : ${cleanA} et ${cleanB} partagent le même mode d'action (${sharedDetailed}). Risque élevé de résistance croisée.`,
      advice: isAr
        ? "استبدل أحد المنتجين بدواء ينتمي لمجموعة مقاومة (FRAC/IRAC) مختلفة تماماً دون أي تداخل."
        : "Remplacez l'un des deux produits par une spécialité sans aucun groupe FRAC/IRAC en commun.",
      codeA,
      codeB,
      typeA,
      typeB,
    };
  }

  // Avertissement Pyréthrinoïde (IRAC 3A) + Triazole (FRAC 3) — synergie toxique abeilles
  if ((isPyrethA && isTriazoleB) || (isPyrethB && isTriazoleA)) {
    return {
      status: "warning",
      title: isAr ? "⚠️ تحذير للنحل: بيرثرويد (IRAC 3A) + تريازول (FRAC 3)" : "⚠️ Alerte pollinisateurs : Pyréthrinoïde (3A) + Triazole (FRAC 3)",
      message: isAr
        ? "خلط مبيد بيرثرويد مع تريازول يضاعف السمية تجاه النحل (تآزر سمي). ممنوع تماماً قرب أو أثناء التزهير."
        : "L'association Pyréthrinoïde + Triazole crée une synergie très toxique pour les abeilles. Strictement interdit en période de floraison ou d'exsudats.",
      advice: isAr
        ? "افصل المعاملتين بـ 24 ساعة على الأقل واستخدمهما خارج فترة التزهير فقط."
        : "Séparez les deux applications d'au moins 24 h et réservez ce traitement strictement hors floraison.",
      codeA, codeB, typeA, typeB
    };
  }

  // 3. Synergie optimale : Fongicide (FRAC) + Insecticide (IRAC)
  if ((typeA === "FRAC" && typeB === "IRAC") || (typeA === "IRAC" && typeB === "FRAC")) {
    const fongicide = typeA === "FRAC" ? cleanA : cleanB;
    const insecticide = typeA === "IRAC" ? cleanA : cleanB;
    return {
      status: "compatible",
      title: isAr ? "✅ خلط متوافق وموصى به (مبيد فطري + مبيد حشري)" : "✅ Mélange parfaitement compatible et recommandé",
      message: isAr
        ? `تكامل زراعي ممتاز: مكافحة فطرية بواسطة (${fongicide}) + مكافحة حشرية بواسطة (${insecticide}) في نفس رشة الرش.`
        : `Synergie idéale : Association d'un Fongicide (${fongicide}) et d'un Insecticide (${insecticide}) dans la même bouillie.`,
      advice: isAr
        ? "ترتيب الإذابة: الأكياس (WSB) ثم الحبيبات/المساحيق (WG/WP/SP) ثم المعلقات (SC) ثم المستحلبات (EC) ثم المواد الناشرة."
        : "Ordre d'incorporation cuve : WSB → WG/WP/SP → SC → EC/EW → SL → Adjuvants en dernier.",
      codeA, codeB, typeA, typeB
    };
  }

  // 4. Contact multisite + Systémique
  const isMultiSiteA = codeA.includes("M01") || codeA.includes("M02") || codeA.includes("M04") || codeA.includes("M09");
  const isMultiSiteB = codeB.includes("M01") || codeB.includes("M02") || codeB.includes("M04") || codeB.includes("M09");
  if ((isMultiSiteA && !isMultiSiteB) || (isMultiSiteB && !isMultiSiteA)) {
    return {
      status: "compatible",
      title: isAr ? "✅ خلط متوافق: وقائي بالملامسة + جهازي" : "✅ Association Contact + Systémique compatible",
      message: isAr
        ? `حماية مزدوجة: وقاية خارجية بالملامسة (${isMultiSiteA ? cleanA : cleanB}) مع علاج جهازي داخلي (${isMultiSiteA ? cleanB : cleanA}).`
        : `Double barrière : Protection de contact préventive (${isMultiSiteA ? cleanA : cleanB}) combinée à une action systémique curative (${isMultiSiteA ? cleanB : cleanA}).`,
      advice: isAr
        ? "احرص على تشغيل خلاط الخزان طوال عملية الرش."
        : "Conserver l'agitateur de cuve en marche pendant toute la durée du traitement.",
      codeA, codeB, typeA, typeB
    };
  }

  // 5. Cas général compatible
  return {
    status: "compatible",
    title: isAr ? "✅ خلط متوافق وآمن في الخزان" : "✅ Mélange compatible en cuve",
    message: isAr
      ? `لا يوجد أي تعارض كيميائي معروف بين ${cleanA} (${codeA || "—"}) و ${cleanB} (${codeB || "—"}). يمكن خلطهما في نفس الرش.`
      : `Aucune contre-indication physico-chimique répertoriée entre ${cleanA} (${codeA || "—"}) et ${cleanB} (${codeB || "—"}).`,
    advice: isAr
      ? "تأكد من إذابة كل منتج تدريجياً في ماء الخزان مع استمرار التحريك."
      : "Remplir la cuve à moitié d'eau, dissoudre le 1er produit, puis incorporer le 2ème avant de compléter le volume.",
    codeA, codeB, typeA, typeB
  };
}

export const PHYTO_DATABASE: PhytoProductInfo[] = [
  { name: "Calypso", matiereActive: "Thiaclopride", matiereActiveAr: "ثياكلوبريد", codeGroup: "IRAC 4A", formulation: "SC", cultures: ["pommier", "nectarinier", "olivier"], cible: "Insecticide systémique (Pucerons, Carpocapse du pommier)", dosage: "20 à 30 cc / hl", volume: "1 L", price: "20000", dar: "14j", dreHours: 48, maxPerSeason: 2, blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — abeilles) ; Maturation (< DAR 14 j)" },
  { name: "Sivento", matiereActive: "Flupyradifurone", matiereActiveAr: "فلوبيراديفورون", codeGroup: "IRAC 4D", formulation: "SL", cultures: ["pommier", "nectarinier", "olivier"], cible: "Excellente systémie (Pucerons, Aleurodes)", dosage: "0,5 L / ha", volume: "1 L", price: "10000", dar: "3-14j", dreHours: 24, maxPerSeason: 2, blockedStages: ["floraison"], blockedReason: "Floraison (hors vol abeilles par précaution)" },
  { name: "Verlan", matiereActive: "Abamectine", matiereActiveAr: "أبامكتين", codeGroup: "IRAC 6", formulation: "EC", cultures: ["pommier", "nectarinier"], cible: "Action translaminaire (Acariens, Mineuses, Psylle)", dosage: "40 à 50 cc / hl", volume: "1 L", price: "11000", dar: "7-14j", dreHours: 48, maxPerSeason: 2, blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — très toxique abeilles)" },
  { name: "Bellis", matiereActive: "Boscalide + Pyraclostrobine", matiereActiveAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", formulation: "WG", cultures: ["pommier", "nectarinier"], cible: "Spécifique arbres à noyau & pépins (Coryneum, Moniliose, Oïdium, Tavelure)", dosage: "30 à 50 g / hl", volume: "1 kg", price: "24000", dar: "7j", dreHours: 48, maxPerSeason: 2, blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 7 j) ; traiter le soir si floraison" },
  { name: "Erlan", matiereActive: "Acétamipride", matiereActiveAr: "أسيتامبريد", codeGroup: "IRAC 4A", formulation: "SP", cultures: ["pommier", "nectarinier", "olivier"], cible: "Insectes piqueurs-suceurs (Pucerons, Psylle)", dosage: "200 à 300 g / ha", volume: "1,02 L", price: "2300", dar: "14j", dreHours: 24, maxPerSeason: 2, blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — abeilles) ; Maturation (< DAR 14 j)" },
  { name: "Sherpa 25 EC", matiereActive: "Cyperméthrine", matiereActiveAr: "سيبيرمثرين", codeGroup: "IRAC 3A", formulation: "EC", cultures: ["pommier", "nectarinier", "olivier"], cible: "Effet de choc par contact (Psylle de l'olivier, Noctuelles)", dosage: "0,5 L / ha", volume: "0,250 L", price: "1600", dar: "14j", dreHours: 24, maxPerSeason: 2, blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles)" },
  { name: "Decis Expert", matiereActive: "Deltaméthrine", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", cultures: ["pommier", "nectarinier", "olivier"], cible: "Large spectre, action foudroyante (Carpocapse, Mouche, Teigne)", dosage: "250 ml / ha", volume: "0,250 L", price: "3200", dar: "7j", dreHours: 24, maxPerSeason: 2, blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles)" },
  { name: "Acetaplan", matiereActive: "Acétamipride", matiereActiveAr: "أسيتامبريد", codeGroup: "IRAC 4A", formulation: "SP", cultures: ["pommier", "nectarinier", "olivier"], cible: "Insecticide systémique (Pucerons, Psylle)", dosage: "25 g / hl", volume: "1 L", price: "2000", dar: "14j", dreHours: 24, maxPerSeason: 2, blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — abeilles)" },
  { name: "Amistar", matiereActive: "Azoxystrobine", matiereActiveAr: "أزوكسيستروبين", codeGroup: "FRAC 11", formulation: "SC", cultures: ["pommier", "nectarinier", "olivier"], cible: "Fongicide préventif large spectre", dosage: "0,8 à 1 L / ha", volume: "1 L", price: "4500", dar: "7j", dreHours: 48, maxPerSeason: 2, blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 7 j)" },
  { name: "Azostar 325SC", matiereActive: "Azoxystrobine + Difénoconazole", matiereActiveAr: "أزوكسيستروبين + ديفينوكونازول", codeGroup: "FRAC 11 + FRAC 3", formulation: "SC", cultures: ["pommier", "nectarinier", "olivier"], cible: "Double action (Tavelure du pommier, Oïdium)", dosage: "0,75 à 1 L / ha", volume: "1 L", price: "1000", dar: "14j", dreHours: 48, maxPerSeason: 2, blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j)" },
  { name: "Zorro", matiereActive: "Abamectine", matiereActiveAr: "أبامكتين", codeGroup: "IRAC 6", formulation: "EC", cultures: ["pommier", "nectarinier"], cible: "Acaricide de référence (Acariens rouges, Psylle)", dosage: "40 à 50 cc / hl", volume: "1 L", price: "1000", dar: "7-14j", dreHours: 48, maxPerSeason: 2, blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — très toxique abeilles)" },
  { name: "Fosetyl Aluminium", matiereActive: "Fosétyl-Aluminium", matiereActiveAr: "فوسيتيل الألومنيوم", codeGroup: "FRAC P07", formulation: "WG", cultures: ["pommier", "nectarinier", "olivier"], cible: "Systémie ascendante/descendante (Phytophthora, Mildiou)", dosage: "2,5 kg / ha", volume: "1 Kg", price: "3500", dar: "14-21j", dreHours: 24, maxPerSeason: 3, blockedStages: ["maturation"], blockedReason: "Maturation (< DAR) ; NE PAS mélanger avec Cuivre" },
  { name: "Luna", matiereActive: "Fluopyram + Tébuconazole", matiereActiveAr: "فلوبيرام + تيبوكونازول", codeGroup: "FRAC 7 + FRAC 3", formulation: "SC", cultures: ["pommier", "nectarinier"], cible: "Très haute efficacité (Monilia, Tavelure, Oïdium)", dosage: "0,3 à 0,4 L / ha", volume: "1 L", price: "19250", dar: "14j", dreHours: 48, maxPerSeason: 2, blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j)" },
  { name: "Criptan", matiereActive: "Captane", matiereActiveAr: "كابتان", codeGroup: "FRAC M04", formulation: "WP", cultures: ["pommier", "nectarinier"], cible: "Fongicide de contact (Tavelure, Monilia)", dosage: "1,5 à 2 kg / ha", volume: "1 Kg", price: "2800", dar: "14-21j", dreHours: 48, maxPerSeason: 6, blockedStages: ["maturation"], blockedReason: "Maturation (DAR 21 j) ; incompatible huiles (21 j)" },
  { name: "Extrachim", matiereActive: "Matières actives diverses", matiereActiveAr: "مواد فعالة متعددة", codeGroup: "Divers", cultures: ["pommier", "nectarinier", "olivier"], cible: "Distributeur local proposant plusieurs matières actives", dosage: "Selon le produit", volume: "0,1 Kg", price: "750", dar: "Variable", dreHours: 24, maxPerSeason: 2, blockedStages: [], blockedReason: "Vérifier l'étiquette" },
  { name: "Rustilan", matiereActive: "Acétamipride", matiereActiveAr: "أسيتامبريد", codeGroup: "IRAC 4A", formulation: "SP", cultures: ["pommier", "nectarinier", "olivier"], cible: "Systémique racinaire et foliaire (Pucerons)", dosage: "200 à 300 g / ha", volume: "0,1 Kg", price: "1000", dar: "14j", dreHours: 24, maxPerSeason: 2, blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — abeilles)" },
  { name: "Tachigazol", matiereActive: "Hymexazol", matiereActiveAr: "هيميكسازول", codeGroup: "FRAC 32", formulation: "SL", cultures: ["pommier", "nectarinier", "olivier"], cible: "Désinfection des sols (Fusarium). Apport en irrigation.", dosage: "1 à 2 L / ha", volume: "1,02 L", price: "5500", dar: "N/A", dreHours: 24, maxPerSeason: 2, blockedStages: ["foliaire_interdit"], blockedReason: "Apport sol / irrigation uniquement" },
  { name: "Phytocap", matiereActive: "Captane", matiereActiveAr: "كابتان", codeGroup: "FRAC M04", formulation: "WP", cultures: ["pommier", "nectarinier"], cible: "Fongicide de contact (Tavelure, Moniliose, Criblure)", dosage: "250 g / hl", volume: "1 Kg", price: "2500", dar: "21j", dreHours: 48, maxPerSeason: 6, blockedStages: ["maturation"], blockedReason: "Maturation (DAR 21 j) ; incompatible huiles (21 j)" },
  { name: "Dicis", matiereActive: "Deltaméthrine", matiereActiveAr: "ديلتاميثرين", codeGroup: "IRAC 3A", formulation: "EC", cultures: ["pommier", "nectarinier", "olivier"], cible: "Insecticide choc (Carpocapse, Mouche de l'olive, Pucerons)", dosage: "50 mL / hl", volume: "1 Kg", price: "0", dar: "7j", dreHours: 24, maxPerSeason: 2, blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles)" },
  { name: "Difénoconazole Score", matiereActive: "Difénoconazole", matiereActiveAr: "ديفينوكونازول", codeGroup: "FRAC 3", formulation: "EC", cultures: ["pommier", "nectarinier", "olivier"], cible: "Fongicide systémique (Tavelure, Oïdium, Moniliose, Œil de paon)", dosage: "20 mL / hl", volume: "1 Kg", price: "22000", dar: "14j", dreHours: 48, maxPerSeason: 2, blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j)" },
  // --- Spécialités INPV Algérie (FITO — 148 produits fusionnés) ---
  { name: "DELTARIN 2,5 %", matiereActive: "Deltaméthrine · 2,5 %", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "23 62 237", cultures: ["pommier", "nectarinier", "olivier"], cible: "Carpocapse, Pucerons, Tordeuses, Tordeuse orientale, Puceron vert, Cératite, Mouche de l'olive, Teigne, Psylle", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "VAPCOMIC", matiereActive: "Abamectine · 1,8 %", matiereActiveAr: "أبامكتين", codeGroup: "IRAC 6", formulation: "EC", homologation: "19 58 23", cultures: ["nectarinier"], cible: "Acariens, Thrips", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — très toxique abeilles) ; Maturation (< DAR)", notes: "Indicatif — 50–75 mL/hL (psylle / acariens, cf. FITO)", validationStatus: "indicative" },
  { name: "INSEGAR®", matiereActive: "Fénoxycarbe · 25 %", matiereActiveAr: "فينوكسيكارب", codeGroup: "IRAC 7B", formulation: "WG", homologation: "15 55 237", cultures: ["pommier", "nectarinier"], cible: "Carpocapse, Tordeuses, Mineuse (œufs/larves)", dosage: "40 g/hL", volume: "1 Kg", price: "", dar: "28j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit (début pontes)", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — toxique couvain abeilles), Maturation (< DAR)", notes: "Indicatif — IGR ovicide tordeuses (Insegar)", validationStatus: "indicative" },
  { name: "PELT 70 WG", matiereActive: "Thiophanate-méthyle · 70 %", matiereActiveAr: "ثيوفانات الميثيل", codeGroup: "FRAC 1", formulation: "WG", homologation: "16 56 051", cultures: ["pommier", "nectarinier"], cible: "Moniliose, Tavelure, Oïdium, Botrytis", dosage: "100 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; éviter usages répétés (FRAC 1)", notes: "Indicatif — alterner (risque résistance FRAC 1)", validationStatus: "indicative" },
  { name: "SCORE", matiereActive: "Difénoconazole · 250 g/l", matiereActiveAr: "ديفينوكونازول", codeGroup: "FRAC 3", formulation: "EC", homologation: "22 60 301", cultures: ["pommier", "nectarinier", "olivier"], cible: "Tavelure, Oïdium, Moniliose, Cloque, Œil de paon, Cercosporiose", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — 15 à 25 mL/hL selon pression", validationStatus: "indicative" },
  { name: "SWITCH", matiereActive: "Cyprodinil · 37,5 % + Fludioxonil · 25 %", matiereActiveAr: "سيبرودينيل + فلوديوكسونيل", codeGroup: "FRAC 9 + FRAC 12", formulation: "WG", homologation: "23 62 33", cultures: ["nectarinier"], cible: "Moniliose fleurs & fruits, Botrytis", dosage: "80 g/hL", volume: "1 Kg", price: "", dar: "7j", dreHours: 48, maxPerSeason: 3, allowedStages: "Floraison (soir), Chute pétales, Grossissement fruit, Maturation (> 7 j)", blockedStages: [], blockedReason: "Aucun blocage floraison (traiter le soir hors vol abeilles)", notes: "Indicatif — anti-moniliose / botrytis", validationStatus: "indicative" },
  { name: "TEBUCONATE", matiereActive: "Tébuconazole · 25 %", matiereActiveAr: "تيبوكونازول", codeGroup: "FRAC 3", formulation: "EW", homologation: "19 58 57", cultures: ["nectarinier"], cible: "Oïdium, Moniliose, Cloque", dosage: "40 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — moniliose / oïdium / œil de paon", validationStatus: "indicative" },
  { name: "THIOVIT JET", matiereActive: "Soufre · 80 %", matiereActiveAr: "كبريت", codeGroup: "FRAC M02", formulation: "WG", homologation: "23 62 89", cultures: ["pommier", "nectarinier"], cible: "Oïdium, Acariens (action secondaire)", dosage: "300 g/hL", volume: "1 Kg", price: "", dar: "3j", dreHours: 6, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit (si T° < 28°C)", blockedStages: ["floraison"], blockedReason: "Floraison (coulure) ; Chaleur > 28°C (brûlures) ; < 21 j d'une huile", notes: "Indicatif — éviter T° > 28°C et huiles (21j)", validationStatus: "indicative" },
  { name: "TOPAZE", matiereActive: "Penconazole · 100 g/l", matiereActiveAr: "بنكونازول", codeGroup: "FRAC 3", formulation: "EC", homologation: "R 12 52 028", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Oïdium, Moniliose, Cloque", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — oïdium (Topaze)", validationStatus: "indicative" },
  { name: "TRINOL", matiereActive: "Triadiménol · 250 g/l", matiereActiveAr: "ترياديمينول", codeGroup: "FRAC 3", formulation: "EC", homologation: "15 55 281", cultures: ["nectarinier"], cible: "Oïdium, Moniliose, Cloque", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — oïdium", validationStatus: "indicative" },
  { name: "VIDAN 25", matiereActive: "Triadiménol · 25 %", matiereActiveAr: "ترياديمينول", codeGroup: "FRAC 3", formulation: "EC", homologation: "13 53 021", cultures: ["nectarinier"], cible: "Oïdium, Moniliose, Cloque", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — oïdium", validationStatus: "indicative" },
  { name: "AGRIM 25", matiereActive: "Difénoconazole · 25 %", matiereActiveAr: "ديفينوكونازول", codeGroup: "FRAC 3", formulation: "EC", homologation: "16 56 057", cultures: ["nectarinier"], cible: "Oïdium, Moniliose, Cloque", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — 15 à 25 mL/hL selon pression", validationStatus: "indicative" },
  { name: "BOUILLIE BORDELAISE WG", matiereActive: "Oxychlorure de cuivre · 80 %", matiereActiveAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", formulation: "WG", homologation: "16 56 069", cultures: ["pommier", "nectarinier"], cible: "Cloque du pêcher, Criblure à coryneum, Tavelure, Chancre / Bactériose", dosage: "200 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — oxychlorure concentré", validationStatus: "indicative" },
  { name: "CAPITAN", matiereActive: "Captane · 500 g/kg", matiereActiveAr: "كابتان", codeGroup: "FRAC M04", formulation: "WP", homologation: "23 61 140", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Moniliose fruits, Criblure à coryneum, Moniliose", dosage: "250 g/hL", volume: "1 Kg", price: "", dar: "21j", dreHours: 48, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (DAR 21 j) ; < 21 j d'une huile (phytotoxicité)", notes: "Indicatif — incompatible huiles (21j)", validationStatus: "indicative" },
  { name: "CAPTAN 50 VALLES", matiereActive: "Captane · 50 %", matiereActiveAr: "كابتان", codeGroup: "FRAC M04", formulation: "WP", homologation: "14 54 145", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Moniliose fruits, Criblure à coryneum, Moniliose", dosage: "250 g/hL", volume: "1 Kg", price: "", dar: "21j", dreHours: 48, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (DAR 21 j) ; < 21 j d'une huile (phytotoxicité)", notes: "Indicatif — incompatible huiles (21j)", validationStatus: "indicative" },
  { name: "CHAMP FLO", matiereActive: "Hydroxyde de cuivre · 360 g/l", matiereActiveAr: "هيدروكسيد النحاس", codeGroup: "FRAC M01", formulation: "SC", homologation: "11 51 012", cultures: ["pommier", "nectarinier", "olivier"], cible: "Cloque du pêcher, Criblure à coryneum, Tavelure, Chancre / Bactériose, Œil de paon, Tuberculose, Bactériose", dosage: "250 mL/hL", volume: "1 L", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — cuivre hydroxyde 36%, éviter floraison", validationStatus: "indicative" },
  { name: "CHORUS", matiereActive: "Cyprodinil · 50 %", matiereActiveAr: "سيبرودينيل", codeGroup: "FRAC 9", formulation: "WG", homologation: "15 55 258", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Moniliose fleurs & rameaux", dosage: "50 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 3, allowedStages: "Gonflement bourgeons, Floraison (soir), Chute pétales", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j) ; traiter le soir en floraison", notes: "Indicatif — tavelure / moniliose (Chorus)", validationStatus: "indicative" },
  { name: "COMAC", matiereActive: "Sulfate de cuivre neutralisé à la chaux · 80 % (Cu métal 20 %)", matiereActiveAr: "بوردو (كبريتات النحاس مع الجير)", codeGroup: "FRAC M01", formulation: "WP", homologation: "11 51 014", cultures: ["pommier", "nectarinier", "olivier"], cible: "Cloque du pêcher, Criblure à coryneum, Tavelure, Chancre / Bactériose, Œil de paon, Tuberculose, Bactériose", dosage: "500 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — bouillie bordelaise 20% Cu", validationStatus: "indicative" },
  { name: "DIVISOLE 250 EC", matiereActive: "Difénoconazole · 250 g/l", matiereActiveAr: "ديفينوكونازول", codeGroup: "FRAC 3", formulation: "EC", homologation: "17 57 23", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Oïdium, Moniliose, Cloque", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — 15 à 25 mL/hL selon pression", validationStatus: "indicative" },
  { name: "COMMANDO", matiereActive: "Acétamipride · 20 %", matiereActiveAr: "أسيتامبريد", codeGroup: "IRAC 4A", formulation: "SL", homologation: "19 58 24", cultures: ["nectarinier"], cible: "Puceron vert, Thrips, Cératite", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR 14 j)", notes: "Indicatif — systémique pucerons / mouches / psylle", validationStatus: "indicative" },
  { name: "ALEMBRA", matiereActive: "Spirotétramate · 10 %", matiereActiveAr: "سبيروتتراماط", codeGroup: "IRAC 23", formulation: "SC", homologation: "19 58 168", cultures: ["pommier", "nectarinier"], cible: "Pucerons (cendré/lanigère/vert), Cochenilles, Psylle", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "21j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit (début)", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT abeilles), Maturation (DAR 21 j)", notes: "Indicatif — pucerons / cochenilles / psylle (Movento)", validationStatus: "indicative" },
  { name: "TREBON", matiereActive: "Étofenprox · 287,5 g/l", matiereActiveAr: "إيتوفنبروكس", codeGroup: "IRAC 3A", formulation: "EC", homologation: "19 58 122", cultures: ["pommier", "nectarinier", "olivier"], cible: "Carpocapse, Pucerons, Tordeuses, Tordeuse orientale, Puceron vert, Cératite, Mouche de l'olive, Teigne, Psylle", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — interdit floraison", validationStatus: "indicative" },
  { name: "ALION® 500 SC", matiereActive: "Indaziflame · 500 g/l", matiereActiveAr: "إندازيفلام", codeGroup: "HRAC 29", formulation: "SC", homologation: "17 56 049", cultures: ["pommier", "nectarinier"], cible: "Adventices (désherbage inter-rang)", dosage: "0.1 L/ha", volume: "1 L", price: "", dar: "14j", dreHours: 24, maxPerSeason: 1, allowedStages: "Repos hivernal, Post-récolte (sol uniquement)", blockedStages: ["floraison", "foliaire_interdit"], blockedReason: "Application foliaire / Floraison / Jeunes pousses (phytotoxicité)", notes: "Indicatif — herbicide pré-levée rang verger", validationStatus: "indicative" },
  { name: "STICMAN", matiereActive: "Latex synthétique · 512 g/l", matiereActiveAr: "لاتكس صناعي (مادة ناشرة)", codeGroup: "Adjuvant", formulation: "SL", homologation: "15 55 092", cultures: ["nectarinier"], cible: "Adjuvant de bouillie (mouillant / adhésif)", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "0j", dreHours: 6, maxPerSeason: 6, allowedStages: "Tous stades (selon produit associé)", blockedStages: [], blockedReason: "Aucun (suivre restriction du produit associé)", notes: "Indicatif — adjuvant mouillant/adhésif", validationStatus: "indicative" },
  { name: "SERCADIS PLUS", matiereActive: "Fluxapyroxade · 75 g/l + Difénoconazole · 50 g/l", matiereActiveAr: "فلوكسابيروكساد + ديفينوكونازول", codeGroup: "FRAC 7 + FRAC 3", formulation: "SC", homologation: "22 60 06", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Oïdium, Botrytis, Moniliose", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "21j", dreHours: 48, maxPerSeason: 2, allowedStages: "Floraison (soir), Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR) ; traiter le soir si floraison", notes: "Indicatif — tavelure / oïdium", validationStatus: "indicative" },
  { name: "CANTUS", matiereActive: "Boscalid · 50 %", matiereActiveAr: "بوسكاليد", codeGroup: "FRAC 7", formulation: "WG", homologation: "22 60 02", cultures: ["nectarinier"], cible: "Moniliose, Oïdium", dosage: "100 g/hL", volume: "1 Kg", price: "", dar: "7j", dreHours: 48, maxPerSeason: 3, allowedStages: "Floraison (soir), Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR) ; traiter le soir si floraison", notes: "Indicatif — moniliose / botrytis", validationStatus: "indicative" },
  { name: "PERKINS", matiereActive: "Flonicamide · 25 %", matiereActiveAr: "فلونيكاميد", codeGroup: "IRAC 29", formulation: "WP", homologation: "22 60 363", cultures: ["pommier", "nectarinier"], cible: "Pucerons (vert, cendré, lanigère)", dosage: "14 g/hL", volume: "1 Kg", price: "", dar: "21j", dreHours: 24, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (hors vol abeilles), Maturation (DAR 21 j)", notes: "Indicatif — pucerons sélectif auxiliaires (Teppeki)", validationStatus: "indicative" },
  { name: "OSAKI", matiereActive: "Cyflufénamide · 51,3 g/l", matiereActiveAr: "سيفلوفيناميد", codeGroup: "FRAC U06", formulation: "EW", homologation: "22 60 12", cultures: ["pommier", "nectarinier"], cible: "Oïdium (pommier, nectarinier)", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 24, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j)", notes: "Indicatif — anti-oïdium spécifique", validationStatus: "indicative" },
  { name: "CYPERSOL 0,8% GR", matiereActive: "Cyperméthrine · 0,8 %", matiereActiveAr: "سيبيرمثرين", codeGroup: "IRAC 3A", formulation: "GR", homologation: "21 59 01", cultures: ["nectarinier"], cible: "Ravageurs du sol (vers blancs, taupins)", dosage: "12 kg/ha", volume: "1 Kg", price: "", dar: "30j", dreHours: 24, maxPerSeason: 2, allowedStages: "Repos hivernal, Gonflement bourgeons (au sol)", blockedStages: ["floraison", "maturation", "foliaire_interdit"], blockedReason: "Application foliaire / Floraison / Maturation (sol uniquement)", notes: "Indicatif — granulé sol", validationStatus: "indicative" },
  { name: "TEFLUSOL 0.5% GR", matiereActive: "Téfluthrine · 0,5 %", matiereActiveAr: "تيفلوثرين", codeGroup: "IRAC 3A", formulation: "GR", homologation: "22 60 71", cultures: ["nectarinier"], cible: "Ravageurs du sol (vers blancs, taupins)", dosage: "15 kg/ha", volume: "1 Kg", price: "", dar: "60j", dreHours: 48, maxPerSeason: 2, allowedStages: "Repos hivernal, Gonflement bourgeons (au sol)", blockedStages: ["floraison", "maturation", "foliaire_interdit"], blockedReason: "Application foliaire / Floraison / Maturation (sol uniquement)", notes: "Indicatif — granulé sol (vérifier usage arbo FITO)", validationStatus: "indicative" },
  { name: "ZAHAR", matiereActive: "Boscalid · 25,2 % + Pyraclostrobine · 12,8 %", matiereActiveAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", formulation: "WP", homologation: "23 61 50", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Oïdium, Botrytis, Moniliose", dosage: "75 g/hL", volume: "1 Kg", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Floraison (soir), Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR) ; traiter le soir si floraison", notes: "Indicatif — moniliose / tavelure / alternariose", validationStatus: "indicative" },
  { name: "GAMMA", matiereActive: "Difénoconazole · 250 g/l", matiereActiveAr: "ديفينوكونازول", codeGroup: "FRAC 3", formulation: "EC", homologation: "21 59 16", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Oïdium, Moniliose, Cloque", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — 15 à 25 mL/hL selon pression", validationStatus: "indicative" },
  { name: "AGROIL BLUE", matiereActive: "Huile de paraffine · 83 %", matiereActiveAr: "زيت البارافين المعدني", codeGroup: "IRAC UN", formulation: "EC", homologation: "23 62 176", cultures: ["pommier", "nectarinier", "olivier"], cible: "Cochenilles, Œufs d'acariens & pucerons (hiver)", dosage: "1500 mL/hL", volume: "1 L", price: "", dar: "0j", dreHours: 6, maxPerSeason: 3, allowedStages: "Repos hivernal, Gonflement bourgeons", blockedStages: ["floraison", "chute_petales", "grossissement", "maturation"], blockedReason: "Floraison, Chute pétales, Grossissement fruit, Maturation (brûlures/phytotoxicité)", notes: "Indicatif — traitement d'hiver (1,5 %) hors végétation", validationStatus: "indicative" },
  { name: "KRISANT", matiereActive: "Pyréthrines · 40 g/l", matiereActiveAr: "بيرثرين طبيعي", codeGroup: "IRAC 3A", formulation: "EC", homologation: "25 71 139", cultures: ["nectarinier"], cible: "Tordeuse orientale, Puceron vert, Cératite", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "3j", dreHours: 24, maxPerSeason: 3, allowedStages: "Chute pétales, Grossissement fruit, Maturation (> 3 j)", blockedStages: ["floraison"], blockedReason: "Floraison (danger abeilles — strictement hors vol)", notes: "Indicatif — pyréthrines naturelles, soir hors vol abeilles", validationStatus: "indicative" },
  { name: "VOLCAN", matiereActive: "Pyraflufen-éthyle · 26,5 g/l", matiereActiveAr: "بيرافلوفين إيثيل", codeGroup: "HRAC 14", formulation: "EC", homologation: "Non renseignée", cultures: ["pommier", "nectarinier", "olivier"], cible: "Adventices (désherbage inter-rang)", dosage: "0.8 L/ha", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Repos hivernal, Post-récolte (sol uniquement)", blockedStages: ["floraison", "foliaire_interdit"], blockedReason: "Application foliaire / Floraison / Jeunes pousses (phytotoxicité)", notes: "Indicatif — désherbage dirigé inter-rang", validationStatus: "indicative" },
  { name: "VECTOR 50 WG", matiereActive: "Cyprodinil · 50 %", matiereActiveAr: "سيبرودينيل", codeGroup: "FRAC 9", formulation: "WG", homologation: "22 60 285", cultures: ["nectarinier"], cible: "Tavelure, Moniliose fleurs & rameaux", dosage: "50 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 3, allowedStages: "Gonflement bourgeons, Floraison (soir), Chute pétales", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j) ; traiter le soir en floraison", notes: "Indicatif — tavelure / moniliose (Chorus)", validationStatus: "indicative" },
  { name: "AZUMO-WG", matiereActive: "Soufre · 80 %", matiereActiveAr: "كبريت", codeGroup: "FRAC M02", formulation: "WG", homologation: "4239 4292", cultures: ["pommier", "nectarinier"], cible: "Oïdium, Acariens (action secondaire)", dosage: "300 g/hL", volume: "1 Kg", price: "", dar: "3j", dreHours: 6, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit (si T° < 28°C)", blockedStages: ["floraison"], blockedReason: "Floraison (coulure) ; Chaleur > 28°C (brûlures) ; < 21 j d'une huile", notes: "Indicatif — éviter T° > 28°C et huiles (21j)", validationStatus: "indicative" },
  { name: "HP22", matiereActive: "Huile blanche · 72,2 %", matiereActiveAr: "زيت معدني أبيض", codeGroup: "IRAC UN", formulation: "EC", homologation: "Non renseignée", cultures: ["pommier", "nectarinier"], cible: "Cochenilles, Œufs d'acariens & pucerons (hiver)", dosage: "1500 mL/hL", volume: "1 L", price: "", dar: "0j", dreHours: 6, maxPerSeason: 3, allowedStages: "Repos hivernal, Gonflement bourgeons", blockedStages: ["floraison", "chute_petales", "grossissement", "maturation"], blockedReason: "Floraison, Chute pétales, Grossissement fruit, Maturation (brûlures/phytotoxicité)", notes: "Indicatif — traitement d'hiver (1,5 %) hors végétation", validationStatus: "indicative" },
  { name: "SWIFT", matiereActive: "Hydroxyde de cuivre · 36 %", matiereActiveAr: "هيدروكسيد النحاس", codeGroup: "FRAC M01", formulation: "SC", homologation: "23 62 405", cultures: ["pommier", "nectarinier", "olivier"], cible: "Cloque du pêcher, Criblure à coryneum, Tavelure, Chancre / Bactériose, Œil de paon, Tuberculose, Bactériose", dosage: "250 mL/hL", volume: "1 L", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — cuivre hydroxyde 36%, éviter floraison", validationStatus: "indicative" },
  { name: "FONGI-SOUFRE 98% DP", matiereActive: "Soufre · 98 %", matiereActiveAr: "كبريت", codeGroup: "FRAC M02", formulation: "DP", homologation: "Non renseignée", cultures: ["pommier", "nectarinier"], cible: "Oïdium, Acariens (action secondaire)", dosage: "250 g/hL", volume: "1 Kg", price: "", dar: "3j", dreHours: 6, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit (si T° < 28°C)", blockedStages: ["floraison"], blockedReason: "Floraison (coulure) ; Chaleur > 28°C (brûlures) ; < 21 j d'une huile", notes: "Indicatif — poudrage/mouillable, éviter T° > 28°C", validationStatus: "indicative" },
  { name: "SOURCE S", matiereActive: "Soufre micronisé mouillable · 80 %", matiereActiveAr: "كبريت قابل للبلل", codeGroup: "FRAC M02", formulation: "WG", homologation: "23 62 400", cultures: ["pommier", "nectarinier"], cible: "Oïdium, Acariens (action secondaire)", dosage: "300 g/hL", volume: "1 Kg", price: "", dar: "3j", dreHours: 6, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit (si T° < 28°C)", blockedStages: ["floraison"], blockedReason: "Floraison (coulure) ; Chaleur > 28°C (brûlures) ; < 21 j d'une huile", notes: "Indicatif — éviter T° > 28°C et huiles (21j)", validationStatus: "indicative" },
  { name: "CYPROFLUX", matiereActive: "Cyprodinil · 37,5 % + Fludioxonil · 25 %", matiereActiveAr: "سيبرودينيل + فلوديوكسونيل", codeGroup: "FRAC 9 + FRAC 12", formulation: "WG", homologation: "23 62 392", cultures: ["nectarinier"], cible: "Moniliose fleurs & fruits, Botrytis", dosage: "80 g/hL", volume: "1 Kg", price: "", dar: "7j", dreHours: 48, maxPerSeason: 3, allowedStages: "Floraison (soir), Chute pétales, Grossissement fruit, Maturation (> 7 j)", blockedStages: [], blockedReason: "Aucun blocage floraison (traiter le soir hors vol abeilles)", notes: "Indicatif — anti-moniliose / botrytis", validationStatus: "indicative" },
  { name: "BELANTY", matiereActive: "Méfentrifluconazole · 75 g/l", matiereActiveAr: "ميفنتريفلوكونازول", codeGroup: "FRAC 3", formulation: "SC", homologation: "25 71 119", cultures: ["nectarinier"], cible: "Oïdium, Moniliose, Cloque", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — triazole nouvelle génération", validationStatus: "indicative" },
  { name: "EDEN", matiereActive: "Esfenvalérate · 25 g/l", matiereActiveAr: "إسفينفاليرات", codeGroup: "IRAC 3A", formulation: "WP", homologation: "18 57 170", cultures: ["pommier", "nectarinier"], cible: "Carpocapse, Pucerons, Tordeuses, Tordeuse orientale, Puceron vert, Cératite", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "OZIS", matiereActive: "Difénoconazole · 250 g/l", matiereActiveAr: "ديفينوكونازول", codeGroup: "FRAC 3", formulation: "EC", homologation: "23 62 178", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Oïdium, Moniliose, Cloque", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — 15 à 25 mL/hL selon pression", validationStatus: "indicative" },
  { name: "BOUSTANE", matiereActive: "Pyridabène · 10 % + Acétamipride · 5 %", matiereActiveAr: "بيريدابين + أسيتامبريد", codeGroup: "IRAC 21A + IRAC 4A", formulation: "EC", homologation: "25 74 67", cultures: ["pommier", "nectarinier"], cible: "Pucerons, Carpocapse, Psylle, Puceron vert, Thrips, Cératite", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR 14 j)", notes: "Indicatif — pucerons + acariens", validationStatus: "indicative" },
  { name: "EL MALIK", matiereActive: "Lambda-cyhalothrine · 5 % + Pyrimicarbe · 10 %", matiereActiveAr: "لامبدا-سيهالوثرين + بيريميكارب", codeGroup: "IRAC 3A + IRAC 1A", formulation: "EC", homologation: "19 58 174", cultures: ["pommier", "nectarinier", "olivier"], cible: "Carpocapse, Pucerons, Tordeuses, Tordeuse orientale, Puceron vert, Cératite, Mouche de l'olive, Teigne, Psylle", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — pucerons / chenilles, interdit floraison", validationStatus: "indicative" },
  { name: "CARFENALE", matiereActive: "Carfentrazone · 40 %", matiereActiveAr: "كارفنترازون", codeGroup: "HRAC 14", formulation: "WG", homologation: "Non renseignée", cultures: ["pommier", "nectarinier", "olivier"], cible: "Adventices (désherbage inter-rang)", dosage: "0.05 kg/ha", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Repos hivernal, Post-récolte (sol uniquement)", blockedStages: ["floraison", "foliaire_interdit"], blockedReason: "Application foliaire / Floraison / Jeunes pousses (phytotoxicité)", notes: "Indicatif — désherbage / épamprage", validationStatus: "indicative" },
  { name: "ABANUTINA", matiereActive: "Abamectine · 1,8 %", matiereActiveAr: "أبامكتين", codeGroup: "IRAC 6", formulation: "EC", homologation: "16 56 017", cultures: ["pommier"], cible: "Psylle du pommier, Acariens, Mineuse cerclée", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — très toxique abeilles) ; Maturation (< DAR)", notes: "Indicatif — 50–75 mL/hL (psylle / acariens, cf. FITO)", validationStatus: "indicative" },
  { name: "CYM 25", matiereActive: "Cyperméthrine · 25 %", matiereActiveAr: "سيبيرمثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "16 56 004", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 250 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "CYRUX", matiereActive: "Cyperméthrine · 250 g/l", matiereActiveAr: "سيبيرمثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "20 59 17", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 250 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "ALPHAZURON 20% SC", matiereActive: "Diflubenzuron · 20 %", matiereActiveAr: "ديفلوبنزورون", codeGroup: "IRAC 15", formulation: "SC", homologation: "20 59 01", cultures: ["pommier"], cible: "Carpocapse, Tordeuses, Mineuse (œufs/larves)", dosage: "50 g/hL", volume: "1 Kg", price: "", dar: "28j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit (début pontes)", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — toxique couvain abeilles), Maturation (< DAR)", notes: "Indicatif — IGR chenilles", validationStatus: "indicative" },
  { name: "ALPHYTHRINE 25 EC", matiereActive: "Deltaméthrine · 25 g/l", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "15 55 225", cultures: ["pommier", "olivier"], cible: "Carpocapse, Pucerons, Tordeuses, Mouche de l'olive, Teigne, Psylle", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "BATON 100 EC", matiereActive: "Bifenthrine · 100 g/l", matiereActiveAr: "بيفنثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "15 55 228", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "30 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 100 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "BEIDAZIT", matiereActive: "Huile minérale paraffinique · 76 %", matiereActiveAr: "زيت معدني بارافيني", codeGroup: "IRAC UN", formulation: "EW", homologation: "R 11 51 007", cultures: ["pommier", "olivier"], cible: "Cochenilles, Œufs d'acariens & pucerons (hiver)", dosage: "1500 mL/hL", volume: "1 L", price: "", dar: "0j", dreHours: 6, maxPerSeason: 3, allowedStages: "Repos hivernal, Gonflement bourgeons", blockedStages: ["floraison", "chute_petales", "grossissement", "maturation"], blockedReason: "Floraison, Chute pétales, Grossissement fruit, Maturation (brûlures/phytotoxicité)", notes: "Indicatif — traitement d'hiver (1,5 %) hors végétation", validationStatus: "indicative" },
  { name: "BISECT", matiereActive: "Bifenthrine · 100 g/l", matiereActiveAr: "بيفنثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "20 59 16", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "30 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 100 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "DELTAMAC 2,5 EC", matiereActive: "Deltaméthrine · 25 g/l", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "15 55 235", cultures: ["pommier", "olivier"], cible: "Carpocapse, Pucerons, Tordeuses, Mouche de l'olive, Teigne, Psylle", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "DELTAPLAN", matiereActive: "Deltaméthrine · 26 g/l", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "17 57 40", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "ELECTRA", matiereActive: "Lufénuron · 50 g/l", matiereActiveAr: "لوفينورون", codeGroup: "IRAC 15", formulation: "EC", homologation: "17 57 80", cultures: ["pommier"], cible: "Carpocapse, Tordeuses, Mineuse (œufs/larves)", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit (début pontes)", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — toxique couvain abeilles), Maturation (< DAR)", notes: "Indicatif — IGR tordeuses / carpocapse", validationStatus: "indicative" },
  { name: "POWER 10% EC", matiereActive: "Cyperméthrine · 100 g/l", matiereActiveAr: "سيبيرمثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "16 56 003", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 100 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "PROTEUS 170 OD", matiereActive: "Thiaclopride · 150 g/l + Deltaméthrine · 20 g/l", matiereActiveAr: "ثياكلوبريد + دلتامثرين", codeGroup: "IRAC 4A + IRAC 3A", formulation: "OD", homologation: "19 58 06", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — interdit en floraison (abeilles)", validationStatus: "indicative" },
  { name: "VERTIN 1,8 % EC", matiereActive: "Abamectine · 18 g/l", matiereActiveAr: "أبامكتين", codeGroup: "IRAC 6", formulation: "EC", homologation: "20 59 03", cultures: ["pommier"], cible: "Psylle du pommier, Acariens, Mineuse cerclée", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — très toxique abeilles) ; Maturation (< DAR)", notes: "Indicatif — 50–75 mL/hL (psylle / acariens, cf. FITO)", validationStatus: "indicative" },
  { name: "GUERISSEUR", matiereActive: "Deltaméthrine · 25 g/l", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "08 46 032", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "KARATEKA", matiereActive: "Lambda-cyhalothrine · 5 %", matiereActiveAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "16 56 019", cultures: ["pommier", "olivier"], cible: "Carpocapse, Pucerons, Tordeuses, Mouche de l'olive, Teigne, Psylle", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 50 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "LAMBDA-CYTHRINE 25 EC", matiereActive: "Lambda-cyhalothrine · 25 g/l", matiereActiveAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "16 56 020", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "LAMDOC 50 EC", matiereActive: "Lambda-cyhalothrine · 50 g/l", matiereActiveAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "14 54 006", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 50 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "LERATEX 5 EC", matiereActive: "Lambda-cyhalothrine · 50 g/l", matiereActiveAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "16 56 022", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 50 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "PYRUS 400 SC", matiereActive: "Pyriméthanil · 400 g/l", matiereActiveAr: "بيريميثانيل", codeGroup: "FRAC 9", formulation: "SC", homologation: "13 53 047", cultures: ["pommier"], cible: "Tavelure, Moniliose fleurs & rameaux", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "21j", dreHours: 48, maxPerSeason: 3, allowedStages: "Gonflement bourgeons, Floraison (soir), Chute pétales", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j) ; traiter le soir en floraison", notes: "Indicatif — tavelure / moniliose", validationStatus: "indicative" },
  { name: "STROBY WG", matiereActive: "Krésoxim-méthyl · 50 %", matiereActiveAr: "كريسوكسيم ميثيل", codeGroup: "FRAC 11", formulation: "WG", homologation: "19 58 11", cultures: ["pommier"], cible: "Tavelure, Oïdium", dosage: "20 g/hL", volume: "1 Kg", price: "", dar: "21j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j)", notes: "Indicatif — tavelure / oïdium", validationStatus: "indicative" },
  { name: "BELLIS® WG", matiereActive: "Boscalid · 25,2 % + Pyraclostrobine · 12,8 %", matiereActiveAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", formulation: "WG", homologation: "19 58 09", cultures: ["pommier"], cible: "Tavelure, Oïdium, Botrytis", dosage: "75 g/hL", volume: "1 Kg", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Floraison (soir), Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR) ; traiter le soir si floraison", notes: "Indicatif — moniliose / tavelure / alternariose", validationStatus: "indicative" },
  { name: "BIOCUIVRE", matiereActive: "Cuivre · 80 %", matiereActiveAr: "نحاس", codeGroup: "FRAC M01", formulation: "WP", homologation: "19 58 33", cultures: ["pommier"], cible: "Tavelure, Chancre / Bactériose", dosage: "250 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — fongicide/bactéricide cuprique", validationStatus: "indicative" },
  { name: "CALDO BORDOLES", matiereActive: "Sulfate de cuivre · 20 %", matiereActiveAr: "كبريتات النحاس", codeGroup: "FRAC M01", formulation: "WP", homologation: "15 55 257", cultures: ["pommier"], cible: "Tavelure, Chancre / Bactériose", dosage: "500 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — bouillie bordelaise 20% Cu", validationStatus: "indicative" },
  { name: "SUMI ALPHA 2,5 EC", matiereActive: "Esfenvalérate · 250 g/l", matiereActiveAr: "إسفينفاليرات", codeGroup: "IRAC 3A", formulation: "EC", homologation: "15 55 248", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "10 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — concentré 250 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "FOLDON", matiereActive: "Folpet · 50 %", matiereActiveAr: "فولبيت", codeGroup: "FRAC M04", formulation: "WP", homologation: "07 45 086", cultures: ["pommier"], cible: "Tavelure, Moniliose fruits", dosage: "200 g/hL", volume: "1 Kg", price: "", dar: "21j", dreHours: 48, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (DAR 21 j) ; < 21 j d'une huile (phytotoxicité)", notes: "Indicatif — multi-site contact", validationStatus: "indicative" },
  { name: "FLINT 50 WG", matiereActive: "Trifloxystrobine · 500 g/kg", matiereActiveAr: "تريفلوكسيستروبين", codeGroup: "FRAC 11", formulation: "WG", homologation: "12 52 014", cultures: ["pommier"], cible: "Tavelure, Oïdium", dosage: "15 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j)", notes: "Indicatif — tavelure / oïdium (Flint)", validationStatus: "indicative" },
  { name: "HORIZELL 25 EC", matiereActive: "Tébuconazole · 250 g/l", matiereActiveAr: "تيبوكونازول", codeGroup: "FRAC 3", formulation: "EC", homologation: "16 56 054", cultures: ["pommier"], cible: "Tavelure, Oïdium", dosage: "40 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — moniliose / oïdium / œil de paon", validationStatus: "indicative" },
  { name: "INACOP", matiereActive: "Oxychlorure de cuivre · 87,72 %", matiereActiveAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", formulation: "WP", homologation: "15 55 266", cultures: ["pommier"], cible: "Tavelure, Chancre / Bactériose", dosage: "200 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — oxychlorure concentré", validationStatus: "indicative" },
  { name: "MAGNASOUFRE 80 WG", matiereActive: "Soufre · 80 %", matiereActiveAr: "كبريت", codeGroup: "FRAC M02", formulation: "WG", homologation: "16 56 040", cultures: ["pommier"], cible: "Oïdium, Acariens (action secondaire)", dosage: "300 g/hL", volume: "1 Kg", price: "", dar: "3j", dreHours: 6, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit (si T° < 28°C)", blockedStages: ["floraison"], blockedReason: "Floraison (coulure) ; Chaleur > 28°C (brûlures) ; < 21 j d'une huile", notes: "Indicatif — éviter T° > 28°C et huiles (21j)", validationStatus: "indicative" },
  { name: "MICROTHIOL SPECIAL WG", matiereActive: "Soufre micronisé atomisé · 80 %", matiereActiveAr: "كبريت ميكروني", codeGroup: "FRAC M02", formulation: "WG", homologation: "16 56 039", cultures: ["pommier", "olivier"], cible: "Oïdium, Acariens (action secondaire)", dosage: "300 g/hL", volume: "1 Kg", price: "", dar: "3j", dreHours: 6, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit (si T° < 28°C)", blockedStages: ["floraison"], blockedReason: "Floraison (coulure) ; Chaleur > 28°C (brûlures) ; < 21 j d'une huile", notes: "Indicatif — éviter T° > 28°C et huiles (21j)", validationStatus: "indicative" },
  { name: "DEKACIM", matiereActive: "Cyperméthrine · 25 %", matiereActiveAr: "سيبيرمثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "56 334 08", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 250 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "TENSTAR", matiereActive: "Bifenthrine · 10 %", matiereActiveAr: "بيفنثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "19 58 165", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "30 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 100 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "SUPERALPHA 2,5 EC", matiereActive: "Esfenvalérate · 25 g/l", matiereActiveAr: "إسفينفاليرات", codeGroup: "IRAC 3A", formulation: "EC", homologation: "19 58 83", cultures: ["pommier", "olivier"], cible: "Carpocapse, Pucerons, Tordeuses, Mouche de l'olive, Teigne, Psylle", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "AIRONE WG", matiereActive: "Oxychlorure de cuivre · 14 % + Hydroxyde de cuivre · 14 %", matiereActiveAr: "أوكسيكلورور النحاس + هيدروكسيد النحاس", codeGroup: "FRAC M01", formulation: "WG", homologation: "19 58 108", cultures: ["pommier"], cible: "Tavelure, Chancre / Bactériose", dosage: "250 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — cuivre, éviter floraison", validationStatus: "indicative" },
  { name: "AMIX", matiereActive: "Sulfate de cuivre · 25 %", matiereActiveAr: "كبريتات النحاس", codeGroup: "FRAC M01", formulation: "WP", homologation: "56 344 04", cultures: ["pommier"], cible: "Tavelure, Chancre / Bactériose", dosage: "500 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — sulfate liquide 5%", validationStatus: "indicative" },
  { name: "DEKAXIM", matiereActive: "Krésoxim-méthyl · 50 %", matiereActiveAr: "كريسوكسيم ميثيل", codeGroup: "FRAC 11", formulation: "WP", homologation: "56 344 12", cultures: ["pommier"], cible: "Tavelure, Oïdium", dosage: "20 g/hL", volume: "1 Kg", price: "", dar: "21j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j)", notes: "Indicatif — tavelure / oïdium", validationStatus: "indicative" },
  { name: "DIMEFOL", matiereActive: "Folpet · 60 % + Diméthomorphe · 11,3 %", matiereActiveAr: "فولبيت + ديميثومورف", codeGroup: "FRAC M04 + FRAC 40", formulation: "WG", homologation: "20 59 220", cultures: ["pommier"], cible: "Tavelure, Moniliose fruits", dosage: "200 g/hL", volume: "1 Kg", price: "", dar: "21j", dreHours: 48, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (DAR 21 j) ; < 21 j d'une huile (phytotoxicité)", notes: "Indicatif — folpet + diméthomorphe", validationStatus: "indicative" },
  { name: "BOUILLIE BORDELAISE ALPHYT", matiereActive: "Sulfate de cuivre · 20 %", matiereActiveAr: "كبريتات النحاس", codeGroup: "FRAC M01", formulation: "WP", homologation: "56 17 188", cultures: ["pommier", "olivier"], cible: "Tavelure, Chancre / Bactériose, Œil de paon, Tuberculose, Bactériose", dosage: "500 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Post-récolte, Chute des feuilles", blockedStages: ["floraison", "chute_petales", "grossissement"], blockedReason: "Floraison, Chute pétales, Grossissement fruit (roussissure / phytotoxicité)", notes: "Indicatif — bouillie bordelaise 20% Cu", validationStatus: "indicative" },
  { name: "MAPHYTO-PHANATE 70", matiereActive: "Thiophanate-méthyle · 70 %", matiereActiveAr: "ثيوفانات الميثيل", codeGroup: "FRAC 1", formulation: "WP", homologation: "19 58 96", cultures: ["pommier"], cible: "Moniliose, Tavelure, Oïdium, Botrytis", dosage: "100 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; éviter usages répétés (FRAC 1)", notes: "Indicatif — alterner (risque résistance FRAC 1)", validationStatus: "indicative" },
  { name: "DELTACAL 25 EC", matiereActive: "Deltaméthrine · 25 g/l", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "R 08 46 163", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "Li 700 ®", matiereActive: "Lécithine de Soja · 357 g/l", matiereActiveAr: "ليسيثين الصويا", codeGroup: "Adjuvant", formulation: "SL", homologation: "15 55 093", cultures: ["pommier"], cible: "Adjuvant de bouillie (mouillant / adhésif)", dosage: "150 mL/hL", volume: "1 L", price: "", dar: "0j", dreHours: 6, maxPerSeason: 6, allowedStages: "Tous stades (selon produit associé)", blockedStages: [], blockedReason: "Aucun (suivre restriction du produit associé)", notes: "Indicatif — adjuvant", validationStatus: "indicative" },
  { name: "APOLLO 50 SC", matiereActive: "Clofentézine · 500 g/l", matiereActiveAr: "كلوفنتيزين", codeGroup: "IRAC 10A", formulation: "SC", homologation: "17 56 033", cultures: ["pommier"], cible: "Acariens rouges & jaunes tisserands (œufs / larves)", dosage: "40 mL/hL", volume: "1 L", price: "", dar: "28j", dreHours: 48, maxPerSeason: 1, allowedStages: "Gonflement bourgeons (ovicides), Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (abeilles), Maturation (< DAR 14–28 j)", notes: "Indicatif — acaricide ovicide (1 passage/an)", validationStatus: "indicative" },
  { name: "DELTHARIN 2,5 EC ®", matiereActive: "Deltaméthrine · 25 g/l", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "22 60 310", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "APOACARICIDE", matiereActive: "Clofentézine · 500 g/l", matiereActiveAr: "كلوفنتيزين", codeGroup: "IRAC 10A", formulation: "SC", homologation: "21 59 30", cultures: ["pommier"], cible: "Acariens rouges & jaunes tisserands (œufs / larves)", dosage: "40 mL/hL", volume: "1 L", price: "", dar: "28j", dreHours: 48, maxPerSeason: 1, allowedStages: "Gonflement bourgeons (ovicides), Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (abeilles), Maturation (< DAR 14–28 j)", notes: "Indicatif — acaricide ovicide (1 passage/an)", validationStatus: "indicative" },
  { name: "DALLAS", matiereActive: "Abamectine · 2 % + Émamectine benzoate · 2 %", matiereActiveAr: "أبامكتين + إيمامكتين بنزوات", codeGroup: "IRAC 6", formulation: "EC", homologation: "21 59 06", cultures: ["pommier"], cible: "Psylle du pommier, Acariens, Mineuse cerclée", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — très toxique abeilles) ; Maturation (< DAR)", notes: "Indicatif — lépidoptères + acariens", validationStatus: "indicative" },
  { name: "TUCSON", matiereActive: "Tébufenpyrad · 20 %", matiereActiveAr: "تيبوفينبيراد", codeGroup: "IRAC 21A", formulation: "WP", homologation: "18 57 166", cultures: ["pommier"], cible: "Acariens rouges & jaunes tisserands (œufs / larves)", dosage: "50 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 1, allowedStages: "Gonflement bourgeons (ovicides), Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (abeilles), Maturation (< DAR 14–28 j)", notes: "Indicatif — acaricide METI (1 passage/an)", validationStatus: "indicative" },
  { name: "DECAPLUS", matiereActive: "Lambda-cyhalothrine · 5 %", matiereActiveAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "56 344 07", cultures: ["pommier", "olivier"], cible: "Carpocapse, Pucerons, Tordeuses, Mouche de l'olive, Teigne, Psylle", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 50 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "KANEMITE®", matiereActive: "Acéquinocyl · 15 %", matiereActiveAr: "أسيكينوسيل", codeGroup: "IRAC 20B", formulation: "SC", homologation: "21 59 27", cultures: ["pommier"], cible: "Acariens rouges & jaunes tisserands (œufs / larves)", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 1, allowedStages: "Gonflement bourgeons (ovicides), Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (abeilles), Maturation (< DAR 14–28 j)", notes: "Indicatif — acaricide (1 passage/an)", validationStatus: "indicative" },
  { name: "FAST 5 EC", matiereActive: "Esfenvalérate · 5 %", matiereActiveAr: "إسفينفاليرات", codeGroup: "IRAC 3A", formulation: "EC", homologation: "17 57 02", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 5%, interdit floraison", validationStatus: "indicative" },
  { name: "DIPROPHYT 25% EC", matiereActive: "Difénoconazole · 250 g/l", matiereActiveAr: "ديفينوكونازول", codeGroup: "FRAC 3", formulation: "EC", homologation: "21 59 03", cultures: ["pommier", "olivier"], cible: "Tavelure, Oïdium, Œil de paon, Cercosporiose", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — 15 à 25 mL/hL selon pression", validationStatus: "indicative" },
  { name: "MAGUS 200 SC®", matiereActive: "Fénazaquine · 200 g/l", matiereActiveAr: "فينازاكين", codeGroup: "IRAC 21A", formulation: "SC", homologation: "Non renseignée", cultures: ["pommier"], cible: "Acariens rouges & jaunes tisserands (œufs / larves)", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "21j", dreHours: 48, maxPerSeason: 1, allowedStages: "Gonflement bourgeons (ovicides), Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (abeilles), Maturation (< DAR 14–28 j)", notes: "Indicatif — acaricide METI (1 passage/an)", validationStatus: "indicative" },
  { name: "BAZAR", matiereActive: "Étoxazole · 110 g/l", matiereActiveAr: "إيتوكسازول", codeGroup: "IRAC 10B", formulation: "SC", homologation: "21 59 11", cultures: ["pommier"], cible: "Acariens rouges & jaunes tisserands (œufs / larves)", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 1, allowedStages: "Gonflement bourgeons (ovicides), Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (abeilles), Maturation (< DAR 14–28 j)", notes: "Indicatif — acaricide ovicide/larvicide (1 passage/an)", validationStatus: "indicative" },
  { name: "ORTIPLUS", matiereActive: "Azoxystrobine · 20 % + Difénoconazole · 12,5 %", matiereActiveAr: "أزوكسيستروبين + ديفينوكونازول", codeGroup: "FRAC 11 + FRAC 3", formulation: "SC", homologation: "19 58 176", cultures: ["pommier"], cible: "Tavelure, Oïdium", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — double mode FRAC 11 + 3", validationStatus: "indicative" },
  { name: "RAPIDOX 50 WG", matiereActive: "Trifloxystrobine · 50 %", matiereActiveAr: "تريفلوكسيستروبين", codeGroup: "FRAC 11", formulation: "WG", homologation: "21 59 54", cultures: ["pommier"], cible: "Tavelure, Oïdium", dosage: "15 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j)", notes: "Indicatif — tavelure / oïdium (Flint)", validationStatus: "indicative" },
  { name: "BOCUS DUO", matiereActive: "Boscalid · 25,2 % + Pyraclostrobine · 12,8 %", matiereActiveAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", formulation: "WG", homologation: "23 62 110", cultures: ["pommier"], cible: "Tavelure, Oïdium, Botrytis", dosage: "75 g/hL", volume: "1 Kg", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Floraison (soir), Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR) ; traiter le soir si floraison", notes: "Indicatif — moniliose / tavelure / alternariose", validationStatus: "indicative" },
  { name: "ACARINA", matiereActive: "Abamectine · 1,8 g/l (1,8 %)", matiereActiveAr: "أبامكتين", codeGroup: "IRAC 6", formulation: "EC", homologation: "23 62 390", cultures: ["pommier"], cible: "Psylle du pommier, Acariens, Mineuse cerclée", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — très toxique abeilles) ; Maturation (< DAR)", notes: "Indicatif — 50–75 mL/hL (psylle / acariens, cf. FITO)", validationStatus: "indicative" },
  { name: "CINIL 50% WG", matiereActive: "Cyprodinil · 50 %", matiereActiveAr: "سيبرودينيل", codeGroup: "FRAC 9", formulation: "WG", homologation: "Non renseignée", cultures: ["pommier"], cible: "Tavelure, Moniliose fleurs & rameaux", dosage: "50 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 3, allowedStages: "Gonflement bourgeons, Floraison (soir), Chute pétales", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j) ; traiter le soir en floraison", notes: "Indicatif — tavelure / moniliose (Chorus)", validationStatus: "indicative" },
  { name: "TRIFLOMIGHT 500 WG", matiereActive: "Trifloxystrobine · 500 g/kg", matiereActiveAr: "تريفلوكسيستروبين", codeGroup: "FRAC 11", formulation: "WG", homologation: "23 61 190", cultures: ["pommier", "nectarinier"], cible: "Tavelure, Oïdium, Moniliose", dosage: "15 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j)", notes: "Indicatif — tavelure / oïdium (Flint)", validationStatus: "indicative" },
  { name: "ACRIMATE", matiereActive: "Abamectine · 1,8 % + Fenpyroximate · 5 %", matiereActiveAr: "أبامكتين + فينبيروكسيمات", codeGroup: "IRAC 6 + IRAC 21A", formulation: "SC", homologation: "25 75 43", cultures: ["pommier"], cible: "Psylle du pommier, Acariens, Mineuse cerclée", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — très toxique abeilles) ; Maturation (< DAR)", notes: "Indicatif — acariens / psylle", validationStatus: "indicative" },
  { name: "ACARION PLUS", matiereActive: "Étoxazole · 10 % + Fenpyroximate · 5 %", matiereActiveAr: "إيتوكسازول + فينبيروكسيمات", codeGroup: "IRAC 10B + IRAC 21A", formulation: "SC", homologation: "25 74 66", cultures: ["pommier", "olivier"], cible: "Acariens rouges & jaunes tisserands (œufs / larves)", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 1, allowedStages: "Gonflement bourgeons (ovicides), Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (abeilles), Maturation (< DAR 14–28 j)", notes: "Indicatif — acaricide ovicide/larvicide (1 passage/an)", validationStatus: "indicative" },
  { name: "RECYP", matiereActive: "Cyétpyrafène · 30 %", matiereActiveAr: "سيتبيرافين", codeGroup: "IRAC 25A", formulation: "SC", homologation: "Non renseignée", cultures: ["pommier"], cible: "Acariens rouges & jaunes tisserands (œufs / larves)", dosage: "30 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 1, allowedStages: "Gonflement bourgeons (ovicides), Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (abeilles), Maturation (< DAR 14–28 j)", notes: "Indicatif — acaricide IRAC 25A (1 passage/an)", validationStatus: "indicative" },
  { name: "DECIS 25 EC", matiereActive: "Deltaméthrine · 25 g/l", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "R12 52 011", cultures: ["olivier"], cible: "Mouche de l'olive, Teigne, Psylle", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "DELTAMETHRINE 2,5 EC", matiereActive: "Deltaméthrine · 25 g/l", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "15 55 233", cultures: ["olivier"], cible: "Mouche de l'olive, Teigne, Psylle", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "CITROLE", matiereActive: "Huile de pétrole · 790 g/l", matiereActiveAr: "زيت بترولي معدني", codeGroup: "IRAC UN", formulation: "EC", homologation: "19 58 195", cultures: ["olivier"], cible: "Cochenilles, Œufs d'acariens & pucerons (hiver)", dosage: "1500 mL/hL", volume: "1 L", price: "", dar: "0j", dreHours: 6, maxPerSeason: 3, allowedStages: "Repos hivernal, Gonflement bourgeons", blockedStages: ["floraison", "chute_petales", "grossissement", "maturation"], blockedReason: "Floraison, Chute pétales, Grossissement fruit, Maturation (brûlures/phytotoxicité)", notes: "Indicatif — traitement d'hiver (1,5 %) hors végétation", validationStatus: "indicative" },
  { name: "NATURAM 5", matiereActive: "Sulfate de cuivre · 5 %", matiereActiveAr: "كبريتات النحاس", codeGroup: "FRAC M01", formulation: "SL", homologation: "16 56 042", cultures: ["olivier"], cible: "Œil de paon, Tuberculose, Bactériose", dosage: "500 mL/hL", volume: "1 L", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Grossissement (automne), Post-récolte", blockedStages: ["floraison", "chute_petales"], blockedReason: "Floraison, Chute pétales (coulure fleurs)", notes: "Indicatif — sulfate liquide 5%", validationStatus: "indicative" },
  { name: "OXICRON 50 WP", matiereActive: "Oxychlorure de cuivre · 85 %", matiereActiveAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", formulation: "WP", homologation: "14 54 161", cultures: ["olivier"], cible: "Œil de paon, Tuberculose, Bactériose", dosage: "200 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Grossissement (automne), Post-récolte", blockedStages: ["floraison", "chute_petales"], blockedReason: "Floraison, Chute pétales (coulure fleurs)", notes: "Indicatif — oxychlorure concentré", validationStatus: "indicative" },
  { name: "LAINCOIL", matiereActive: "Huile blanche · 830 g/l", matiereActiveAr: "زيت معدني أبيض", codeGroup: "IRAC UN", formulation: "EC", homologation: "15 55 239", cultures: ["olivier"], cible: "Cochenilles, Œufs d'acariens & pucerons (hiver)", dosage: "1500 mL/hL", volume: "1 L", price: "", dar: "0j", dreHours: 6, maxPerSeason: 3, allowedStages: "Repos hivernal, Gonflement bourgeons", blockedStages: ["floraison", "chute_petales", "grossissement", "maturation"], blockedReason: "Floraison, Chute pétales, Grossissement fruit, Maturation (brûlures/phytotoxicité)", notes: "Indicatif — traitement d'hiver (1,5 %) hors végétation", validationStatus: "indicative" },
  { name: "LIMACIDE 40", matiereActive: "Méthidathion · 400 g/l", matiereActiveAr: "ميثيداثيون", codeGroup: "IRAC 1B", formulation: "EC", homologation: "17 57 37", cultures: ["olivier"], cible: "Mouche de l'olive, Cochenilles, Pucerons", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "28j", dreHours: 48, maxPerSeason: 1, allowedStages: "Chute pétales, Grossissement fruit (début)", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT abeilles), Maturation (DAR 28 j)", notes: "Indicatif — cochenilles, usage restrictif", validationStatus: "indicative" },
  { name: "LIMATOATE 40% EC", matiereActive: "Diméthoate · 400 g/l", matiereActiveAr: "ديميثوات", codeGroup: "IRAC 1B", formulation: "EC", homologation: "20 59 09", cultures: ["olivier"], cible: "Mouche de l'olive, Cochenilles, Pucerons", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "28j", dreHours: 48, maxPerSeason: 1, allowedStages: "Chute pétales, Grossissement fruit (début)", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT abeilles), Maturation (DAR 28 j)", notes: "Indicatif — usage restrictif, vérifier homologation", validationStatus: "indicative" },
  { name: "NUTREL", matiereActive: "Protéine hydrolysée · 24 %", matiereActiveAr: "بروتين متحلل (جاذب)", codeGroup: "Attractif / Appât", formulation: "SL", homologation: "16 56 036", cultures: ["olivier"], cible: "Mouche de l'olive, Cératite (piégeage / appât)", dosage: "1000 mL/hL", volume: "1 L", price: "", dar: "0j", dreHours: 6, maxPerSeason: 6, allowedStages: "Grossissement fruit, Maturation", blockedStages: [], blockedReason: "Aucun (ne pas pulvériser en plein si mélange insecticide en floraison)", notes: "Indicatif — appât protéiné (piégeage / localisation)", validationStatus: "indicative" },
  { name: "POINTER 100 SC", matiereActive: "Lambda-cyhalothrine · 100 g/l", matiereActiveAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", formulation: "SC", homologation: "16 05 02", cultures: ["olivier"], cible: "Mouche de l'olive, Teigne, Psylle", dosage: "12.5 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — concentré 10%, interdit floraison", validationStatus: "indicative" },
  { name: "FASTAC 100 EC", matiereActive: "Alpha-cyperméthrine · 100 g/l", matiereActiveAr: "ألفا-سيبيرمثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "19 58 12", cultures: ["olivier"], cible: "Mouche de l'olive, Teigne, Psylle", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 100 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "HELIOCUIVRE", matiereActive: "Hydroxyde de cuivre · 645 g/l", matiereActiveAr: "هيدروكسيد النحاس", codeGroup: "FRAC M01", formulation: "SC", homologation: "14 54 157", cultures: ["olivier"], cible: "Œil de paon, Tuberculose, Bactériose", dosage: "150 mL/hL", volume: "1 L", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Grossissement (automne), Post-récolte", blockedStages: ["floraison", "chute_petales"], blockedReason: "Floraison, Chute pétales (coulure fleurs)", notes: "Indicatif — cuivre concentré, éviter floraison", validationStatus: "indicative" },
  { name: "DELTRINE", matiereActive: "Deltaméthrine · 2,5 %", matiereActiveAr: "دلتامثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "18 57 230", cultures: ["pommier", "olivier"], cible: "Carpocapse, Pucerons, Tordeuses, Mouche de l'olive, Teigne, Psylle", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 25 g/L (2,5%), interdit floraison", validationStatus: "indicative" },
  { name: "TOUTIA PLUS", matiereActive: "Oxychlorure de cuivre · 50 %", matiereActiveAr: "أوكسيكلورور النحاس", codeGroup: "FRAC M01", formulation: "WP", homologation: "56 17 189", cultures: ["olivier"], cible: "Œil de paon, Tuberculose, Bactériose", dosage: "300 g/hL", volume: "1 Kg", price: "", dar: "15j", dreHours: 24, maxPerSeason: 4, allowedStages: "Repos hivernal, Gonflement bourgeons, Grossissement (automne), Post-récolte", blockedStages: ["floraison", "chute_petales"], blockedReason: "Floraison, Chute pétales (coulure fleurs)", notes: "Indicatif — oxychlorure 50%", validationStatus: "indicative" },
  { name: "ARBEKYN 25 SC", matiereActive: "Buprofézine · 250 g/l", matiereActiveAr: "بوبروفيزين", codeGroup: "IRAC 16", formulation: "SC", homologation: "22 60 13", cultures: ["olivier"], cible: "Cochenilles, Aleurodes", dosage: "100 mL/hL", volume: "1 L", price: "", dar: "21j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit (début pontes)", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — toxique couvain abeilles), Maturation (< DAR)", notes: "Indicatif — cochenilles / aleurodes", validationStatus: "indicative" },
  { name: "SPARVIERO", matiereActive: "Lambda-cyhalothrine · 10 %", matiereActiveAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", formulation: "CS", homologation: "Non renseignée", cultures: ["nectarinier", "olivier"], cible: "Tordeuse orientale, Puceron vert, Cératite, Mouche de l'olive, Teigne, Psylle", dosage: "12.5 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — concentré 10%, interdit floraison", validationStatus: "indicative" },
  { name: "TARSSUS", matiereActive: "Cinnamaldéhyde (aldéhyde cinnamique) · 6 %", matiereActiveAr: "سينامالدهيد", codeGroup: "IRAC UN", formulation: "SL", homologation: "19 58 147", cultures: ["olivier"], cible: "Acariens, Pucerons, Oïdium (biocontrôle)", dosage: "250 mL/hL", volume: "1 L", price: "", dar: "3j", dreHours: 6, maxPerSeason: 3, allowedStages: "Chute pétales, Grossissement fruit, Maturation", blockedStages: ["floraison"], blockedReason: "Floraison (éviter sur fleurs ouvertes / T° > 30°C)", notes: "Indicatif — biocontrôle", validationStatus: "indicative" },
  { name: "KARATE ZEON", matiereActive: "Lambda-cyhalothrine · 50 g/l", matiereActiveAr: "لامبدا-سيهالوثرين", codeGroup: "IRAC 3A", formulation: "CS", homologation: "25 76 48", cultures: ["olivier"], cible: "Mouche de l'olive, Teigne, Psylle", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 50 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "DELAN 500 SC", matiereActive: "Dithianon · 500 g/l", matiereActiveAr: "ديثيانون", codeGroup: "FRAC M09", formulation: "SC", homologation: "20 59 303", cultures: ["nectarinier"], cible: "Tavelure du pommier", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "21j", dreHours: 48, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Maturation (DAR 21 j) ; éviter en pleine floraison", notes: "Indicatif — tavelure pré/post-floraison", validationStatus: "indicative" },
  { name: "SPINOX 480 SC", matiereActive: "Spinosad · 480 g/l", matiereActiveAr: "سبينوساد", codeGroup: "IRAC 5", formulation: "SC", homologation: "22 60 46", cultures: ["nectarinier"], cible: "Thrips, Tordeuse orientale, Cératite", dosage: "25 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 6, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit, Maturation (> 7 j)", blockedStages: ["floraison"], blockedReason: "Floraison (INTERDIT — toxique abeilles 7 j avant/pendant)", notes: "Indicatif — thrips / tordeuses / mouches, hors floraison", validationStatus: "indicative" },
  { name: "COURT 38% WG", matiereActive: "Boscalid · 252 g/kg + Pyraclostrobine · 128 g/kg", matiereActiveAr: "بوسكاليد + بيراكلوستروبين", codeGroup: "FRAC 7 + FRAC 11", formulation: "WG", homologation: "Non renseignée", cultures: ["nectarinier"], cible: "Moniliose, Oïdium", dosage: "75 g/hL", volume: "1 Kg", price: "", dar: "7j", dreHours: 48, maxPerSeason: 2, allowedStages: "Floraison (soir), Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR) ; traiter le soir si floraison", notes: "Indicatif — moniliose / tavelure / alternariose", validationStatus: "indicative" },
  { name: "EFFICAZ 20 SC", matiereActive: "Chlorantraniliprole · 200 g/l", matiereActiveAr: "كلورانترانيليبرول", codeGroup: "IRAC 28", formulation: "SC", homologation: "Non renseignée", cultures: ["nectarinier"], cible: "Carpocapse, Tordeuse orientale, Tordeuses, Zeuzère", dosage: "17.5 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 6, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (par précaution pollinisateurs) ; Maturation (< DAR 14 j)", notes: "Indicatif — carpocapse / tordeuses (Coragen)", validationStatus: "indicative" },
  { name: "ARRIVO", matiereActive: "Cyperméthrine · 250 g/l", matiereActiveAr: "سيبيرمثرين", codeGroup: "IRAC 3A", formulation: "EC", homologation: "15 55 226", cultures: ["pommier"], cible: "Carpocapse, Pucerons, Tordeuses", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "7j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — danger abeilles) ; Maturation (< DAR)", notes: "Indicatif — 250 g/L, interdit floraison", validationStatus: "indicative" },
  { name: "FORCE", matiereActive: "Téfluthrine · 0,5 %", matiereActiveAr: "تيفلوثرين", codeGroup: "IRAC 3A", formulation: "GR", homologation: "16 56 018", cultures: ["pommier"], cible: "Ravageurs du sol (vers blancs, taupins)", dosage: "15 kg/ha", volume: "1 Kg", price: "", dar: "60j", dreHours: 48, maxPerSeason: 2, allowedStages: "Repos hivernal, Gonflement bourgeons (au sol)", blockedStages: ["floraison", "maturation", "foliaire_interdit"], blockedReason: "Application foliaire / Floraison / Maturation (sol uniquement)", notes: "Indicatif — granulé sol (vérifier usage arbo FITO)", validationStatus: "indicative" },
  { name: "VOLIAM TARGO 063 SC", matiereActive: "Chlorantraniliprole · 45 g/l + Abamectine · 18 g/l", matiereActiveAr: "كلورانترانيليبرول + أبامكتين", codeGroup: "IRAC 28 + IRAC 6", formulation: "SC", homologation: "22 60 303", cultures: ["pommier"], cible: "Carpocapse, Tordeuses, Mineuse, Acariens, Psylle", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 3, allowedStages: "Chute pétales, Grossissement fruit", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — abamectine toxique abeilles) ; Maturation (< DAR 14 j)", notes: "Indicatif — 1 à 3 app., bouillie min 1000 L (FITO)", validationStatus: "indicative" },
  { name: "NOMOLT", matiereActive: "Téflubenzuron · 150 g/l", matiereActiveAr: "تيفلوبنزورون", codeGroup: "IRAC 15", formulation: "SC", homologation: "16 56 001", cultures: ["pommier"], cible: "Carpocapse, Tordeuses, Mineuse (œufs/larves)", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 24, maxPerSeason: 2, allowedStages: "Chute pétales, Grossissement fruit (début pontes)", blockedStages: ["floraison", "maturation"], blockedReason: "Floraison (INTERDIT — toxique couvain abeilles), Maturation (< DAR)", notes: "Indicatif — IGR (Nomolt)", validationStatus: "indicative" },
  { name: "PINK", matiereActive: "Trifloxystrobine · 50 %", matiereActiveAr: "تريفلوكسيستروبين", codeGroup: "FRAC 11", formulation: "WG", homologation: "19 58 51", cultures: ["pommier"], cible: "Tavelure, Oïdium", dosage: "15 g/hL", volume: "1 Kg", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14–21 j)", notes: "Indicatif — tavelure / oïdium (Flint)", validationStatus: "indicative" },
  { name: "SYLLIT 400 SC", matiereActive: "Dodine · 400 g/l", matiereActiveAr: "دودين", codeGroup: "FRAC U12", formulation: "SC", homologation: "13 53 048", cultures: ["pommier"], cible: "Tavelure, Œil de paon, Cloque", dosage: "125 mL/hL", volume: "1 L", price: "", dar: "28j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales", blockedStages: ["floraison", "grossissement", "maturation"], blockedReason: "Floraison, Grossissement fruit (roussissure), Maturation (DAR 28 j)", notes: "Indicatif — tavelure / œil de paon", validationStatus: "indicative" },
  { name: "SYSTHANE 240 EC", matiereActive: "Myclobutanil · 240 g/l", matiereActiveAr: "ميكلوبوتانيل", codeGroup: "FRAC 3", formulation: "EC", homologation: "18 57 188", cultures: ["pommier"], cible: "Tavelure, Oïdium", dosage: "30 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — oïdium / tavelure", validationStatus: "indicative" },
  { name: "ALIETTE® FLASH", matiereActive: "Fosétyl-aluminium · 80 %", matiereActiveAr: "فوسيتيل الألومنيوم", codeGroup: "FRAC P07", formulation: "WG", homologation: "19 58 08", cultures: ["pommier"], cible: "Phytophthora / Dépérissement, Bactériose", dosage: "250 g/hL", volume: "1 Kg", price: "", dar: "28j", dreHours: 24, maxPerSeason: 3, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit, Post-récolte", blockedStages: ["maturation"], blockedReason: "Maturation (DAR 28 j) ; jamais en mélange avec Cuivre", notes: "Indicatif — NE PAS mélanger avec cuivre", validationStatus: "indicative" },
  { name: "ALUFOS", matiereActive: "Fosétyl-aluminium · 80 %", matiereActiveAr: "فوسيتيل الألومنيوم", codeGroup: "FRAC P07", formulation: "WP", homologation: "16 05 06", cultures: ["pommier"], cible: "Phytophthora / Dépérissement, Bactériose", dosage: "250 g/hL", volume: "1 Kg", price: "", dar: "28j", dreHours: 24, maxPerSeason: 3, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit, Post-récolte", blockedStages: ["maturation"], blockedReason: "Maturation (DAR 28 j) ; jamais en mélange avec Cuivre", notes: "Indicatif — NE PAS mélanger avec cuivre", validationStatus: "indicative" },
  { name: "DIFESOLE 25 EC", matiereActive: "Difénoconazole · 25 %", matiereActiveAr: "ديفينوكونازول", codeGroup: "FRAC 3", formulation: "EC", homologation: "16 56 056", cultures: ["pommier"], cible: "Tavelure, Oïdium", dosage: "20 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR 14 j) ; en floraison jamais mélangé à un pyréthrinoïde", notes: "Indicatif — 15 à 25 mL/hL selon pression", validationStatus: "indicative" },
  { name: "HELIOSOUFRE SC", matiereActive: "Soufre · 700 g/l", matiereActiveAr: "كبريت", codeGroup: "FRAC M02", formulation: "SC", homologation: "22 60 11", cultures: ["pommier"], cible: "Oïdium, Acariens (action secondaire)", dosage: "350 mL/hL", volume: "1 L", price: "", dar: "3j", dreHours: 6, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Chute pétales, Grossissement fruit (si T° < 28°C)", blockedStages: ["floraison"], blockedReason: "Floraison (coulure) ; Chaleur > 28°C (brûlures) ; < 21 j d'une huile", notes: "Indicatif — éviter si T° > 28°C et mélange huiles", validationStatus: "indicative" },
  { name: "LUNA® EXPERIENCE", matiereActive: "Tébuconazole · 200 g/l + Fluopyram · 200 g/l", matiereActiveAr: "تيبوكونازول + فلوبيرام", codeGroup: "FRAC 3 + FRAC 7", formulation: "SC", homologation: "16 05 07", cultures: ["pommier"], cible: "Tavelure, Oïdium, Botrytis", dosage: "50 mL/hL", volume: "1 L", price: "", dar: "14j", dreHours: 48, maxPerSeason: 2, allowedStages: "Floraison (soir), Chute pétales, Grossissement fruit", blockedStages: ["maturation"], blockedReason: "Maturation (< DAR) ; traiter le soir si floraison", notes: "Indicatif (Tébuconazole + Fluopyram)", validationStatus: "indicative" },
  { name: "VACCIPLANT", matiereActive: "Laminarine · 45 g/l", matiereActiveAr: "لامينارين", codeGroup: "FRAC P04", formulation: "SL", homologation: "14 54 169", cultures: ["pommier"], cible: "Tavelure, Oïdium, Moniliose (stimulation défenses)", dosage: "75 mL/hL", volume: "1 L", price: "", dar: "0j", dreHours: 6, maxPerSeason: 6, allowedStages: "Gonflement bourgeons, Floraison, Chute pétales, Grossissement fruit", blockedStages: [], blockedReason: "Aucun blocage (biocontrôle — DAR 0 j)", notes: "Indicatif — stimulateur défenses (biocontrôle)", validationStatus: "indicative" },
];