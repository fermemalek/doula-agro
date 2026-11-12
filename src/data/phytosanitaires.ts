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

export interface TankMixCheckResult {
  status: "compatible" | "warning" | "incompatible";
  title: string;
  message: string;
  advice?: string;
  codeA?: string;
  codeB?: string;
  typeA?: string;
  typeB?: string;
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

  const codeA = getIracFracCode(cleanA);
  const codeB = getIracFracCode(cleanB);

  const activeA = isAr ? getMatiereActiveAr(cleanA) || getMatiereActive(cleanA) : getMatiereActive(cleanA);
  const activeB = isAr ? getMatiereActiveAr(cleanB) || getMatiereActive(cleanB) : getMatiereActive(cleanB);

  const typeA = COMMERCIAL_TO_ACTIVE[cleanA]?.type || (codeA.includes("IRAC") ? "IRAC" : codeA.includes("FRAC") ? "FRAC" : "");
  const typeB = COMMERCIAL_TO_ACTIVE[cleanB]?.type || (codeB.includes("IRAC") ? "IRAC" : codeB.includes("FRAC") ? "FRAC" : "");

  // 1. Même produit ou même matière active exacte
  if (cleanA.toLowerCase() === cleanB.toLowerCase() || (activeA && activeB && activeA.toLowerCase() === activeB.toLowerCase())) {
    return {
      status: "warning",
      title: isAr ? "⚠️ تكرار نفس المادة الفعالة (Double Emploi)" : "⚠️ Même matière active sélectionnée",
      message: isAr
        ? `المنتجان يحتويان على نفس المادة (${activeA || cleanA}). هذا تكرار غير مفيد وقد يسبب جرعة زائدة.`
        : `Les deux sélections contiennent la même substance active (${activeA || cleanA}). Risque de surdosage ou double emploi inutile.`,
      advice: isAr
        ? "اختر مادتين فعالتين مختلفتين، مثلاً: مبيد فطري + مبيد حشري للحصول على فعالية مزدوجة."
        : "Associez plutôt deux modes d'action différents (ex: Fongicide + Insecticide) pour une protection combinée.",
      codeA, codeB, typeA, typeB
    };
  }

  // 2. Incompatibilités chimiques majeures
  const isCuivreA = codeA.includes("M01") || cleanA.toLowerCase().includes("cuivre") || cleanA.toLowerCase().includes("nucop") || cleanA.toLowerCase().includes("curenox");
  const isCuivreB = codeB.includes("M01") || cleanB.toLowerCase().includes("cuivre") || cleanB.toLowerCase().includes("nucop") || cleanB.toLowerCase().includes("curenox");

  const isFosetylA = codeA.includes("P07") || codeA.includes("33") || cleanA.toLowerCase().includes("fosetyl") || cleanA.toLowerCase().includes("aliette");
  const isFosetylB = codeB.includes("P07") || codeB.includes("33") || cleanB.toLowerCase().includes("fosetyl") || cleanB.toLowerCase().includes("aliette");

  const isTriazoleA = codeA.includes("FRAC 3") || cleanA.toLowerCase().includes("score") || cleanA.toLowerCase().includes("folicur") || cleanA.toLowerCase().includes("topas");
  const isTriazoleB = codeB.includes("FRAC 3") || cleanB.toLowerCase().includes("score") || cleanB.toLowerCase().includes("folicur") || cleanB.toLowerCase().includes("topas");

  const isSoufreA = codeA.includes("M02") || cleanA.toLowerCase().includes("soufre");
  const isSoufreB = codeB.includes("M02") || cleanB.toLowerCase().includes("soufre");

  const isCaptaneA = codeA.includes("M04") || cleanA.toLowerCase().includes("captan") || cleanA.toLowerCase().includes("criptan");
  const isCaptaneB = codeB.includes("M04") || cleanB.toLowerCase().includes("captan") || cleanB.toLowerCase().includes("criptan");

  const isHuileA = cleanA.toLowerCase().includes("huile");
  const isHuileB = cleanB.toLowerCase().includes("huile");

  // Incompatibilité Cuivre + Fosétyl
  if ((isCuivreA && isFosetylB) || (isCuivreB && isFosetylA)) {
    return {
      status: "incompatible",
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

  // Incompatibilité Captane + Huile
  if ((isCaptaneA && isHuileB) || (isCaptaneB && isHuileA)) {
    return {
      status: "incompatible",
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
        ? "ترتيب الإذابة: المساحيق والحبيبات القابلة للبلل أولاً، ثم المعلقات السائلة (SC)، ثم المستحلبات (EC)."
        : "Ordre d'incorporation cuve : Poudres/Granulés (WP/WG) en 1er, puis Suspensions (SC), puis Concentrés Émulsionnables (EC).",
      codeA, codeB, typeA, typeB
    };
  }

  // 4. Contact multisite + Systémique
  const isMultiSiteA = codeA.includes("M0") || codeA.includes("M");
  const isMultiSiteB = codeB.includes("M0") || codeB.includes("M");
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
    cible: "",
    dosage: "",
    volume: "1 Kg",
    price: "2500",
    dar: "0j",
  },
  {
    name: "Dicis",
    matiereActive: "",
    matiereActiveAr: "",
    cible: "",
    dosage: "",
    volume: "1 Kg",
    price: "0",
    dar: "0j",
  },
  {
    name: "Difénoconazole Score",
    matiereActive: "Difénoconazole",
    matiereActiveAr: "ديفينوكونازول",
    cible: "Fongicide systémique (triazole)",
    dosage: "",
    volume: "1 Kg",
    price: "22000",
    dar: "14j",
  }
];
