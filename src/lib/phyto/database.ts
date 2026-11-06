import { ActiveIngredient, PestTarget, GrowthStage, CropType } from './engine';

// ==========================================
// 1. STADES PHÉNOLOGIQUES (FR & AR)
// ==========================================

export interface StageInfo {
  id: GrowthStage;
  labelFr: string;
  labelAr: string;
  descriptionFr: string;
  descriptionAr: string;
  icon: string;
}

export const PHENOLOGICAL_STAGES: StageInfo[] = [
  {
    id: 'dormance',
    labelFr: 'Dormance (Repos hivernal)',
    labelAr: 'السكون الشتوي (راحة الأشجار)',
    descriptionFr: 'Arbres au repos complet, pas de feuilles.',
    descriptionAr: 'الأشجار في حالة سكون تام قبل انطلاق العصارة.',
    icon: '❄️',
  },
  {
    id: 'gonflement_bourgeons',
    labelFr: 'Gonflement des bourgeons / Débourrement',
    labelAr: 'انتفاخ البراعم وانفتاحها',
    descriptionFr: 'Pointes vertes visibles, départ de la végétation.',
    descriptionAr: 'ظهور القمم الخضراء وانفتاح البراعم الزهرية والخضرية.',
    icon: '🌱',
  },
  {
    id: 'floraison',
    labelFr: 'Floraison (Boutons roses/blancs à pleine fleur)',
    labelAr: 'الإزهار (تفتح الأزهار)',
    descriptionFr: 'Période critique de pollinisation. Attention aux abeilles.',
    descriptionAr: 'فترة تفتح الأزهار. يُمنع رش المبيدات الحشرية الضارة بالنحل.',
    icon: '🌸',
  },
  {
    id: 'chute_petales_nouaison',
    labelFr: 'Chute des pétales & Nouaison',
    labelAr: 'سقوط البتلات وعقد الثمار',
    descriptionFr: 'Formation des jeunes fruits, très vulnérables aux champignons.',
    descriptionAr: 'تشكل الثمار الصغيرة وحمايتها من لسعات الحشرات والفطريات الأولى.',
    icon: '🍏',
  },
  {
    id: 'grossissement_fruit',
    labelFr: 'Grossissement des fruits',
    labelAr: 'نمو وتضخم الثمار',
    descriptionFr: 'Développement de la pulpe et du calibre.',
    descriptionAr: 'زيادة حجم الثمار وتطور المجموع الخضري.',
    icon: '🍑',
  },
  {
    id: 'maturation',
    labelFr: 'Véraison & Maturation',
    labelAr: 'النضج والتلوين قبل الجني',
    descriptionFr: 'Coloration, accumulation de sucres. Respect strict des DAR.',
    descriptionAr: 'تلوين الثمار وجمع السكريات. الاحترام الصارم لفترة الأمان (DAR).',
    icon: '🍇',
  },
  {
    id: 'post_recolte_chute_feuilles',
    labelFr: 'Post-récolte & Chute des feuilles',
    labelAr: 'ما بعد الجني وسقوط الأوراق',
    descriptionFr: 'Traitements d’assainissement automnal (cuivre, etc.).',
    descriptionAr: 'معالجة النحاس الوقائية لتطهير الجروح بعد الجني وسقوط الأوراق.',
    icon: '🍂',
  },
];

// ==========================================
// 2. MATIÈRES ACTIVES HOMOLOGUÉES (FRAC / IRAC)
// ==========================================

export const ACTIVE_INGREDIENTS_DATABASE: ActiveIngredient[] = [
  // --- FONGICIDES (FRAC) ---
  {
    id: 'ing_tebuconazole',
    name: 'Tébuconazole',
    commonNameFr: 'Tébuconazole 25% (ex: Luna Exp., Folicur)',
    nameAr: 'تيبوكونازول',
    type: 'FRAC',
    codeGroup: 'FRAC 3', // DMI - Triazoles
    familyChemical: 'Triazole',
    phiDays: 14,
    reiHours: 48,
    standardDose: '40-50 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_difenoconazole',
    name: 'Difénoconazole',
    commonNameFr: 'Difénoconazole 250 g/L (ex: Score, Azostar)',
    nameAr: 'ديفينوكونازول',
    type: 'FRAC',
    codeGroup: 'FRAC 3', // DMI - Triazoles
    familyChemical: 'Triazole',
    phiDays: 14,
    reiHours: 24,
    standardDose: '20-30 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_boscalid',
    name: 'Boscalide',
    commonNameFr: 'Boscalide 50% (ex: Bellis, Cantus)',
    nameAr: 'بوسكاليد',
    type: 'FRAC',
    codeGroup: 'FRAC 7', // SDHI
    familyChemical: 'Carboxamide (SDHI)',
    phiDays: 7,
    reiHours: 24,
    standardDose: '30-40 g/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_fluopyram',
    name: 'Fluopyram',
    commonNameFr: 'Fluopyram (ex: Luna Privilege / Experience)',
    nameAr: 'فلوبيرام',
    type: 'FRAC',
    codeGroup: 'FRAC 7', // SDHI
    familyChemical: 'Pyridinyl-ethyl-benzamide (SDHI)',
    phiDays: 7,
    reiHours: 24,
    standardDose: '35-50 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_azoxystrobine',
    name: 'Azoxystrobine',
    commonNameFr: 'Azoxystrobine 250 g/L (ex: Amistar)',
    nameAr: 'أزوكسيستروبين',
    type: 'FRAC',
    codeGroup: 'FRAC 11', // Strobilurines (QoI)
    familyChemical: 'Strobilurine',
    phiDays: 7,
    reiHours: 24,
    standardDose: '80-100 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_pyraclostrobine',
    name: 'Pyraclostrobine',
    commonNameFr: 'Pyraclostrobine (ex: Bellis, Cabrio)',
    nameAr: 'بيراكلوستروبين',
    type: 'FRAC',
    codeGroup: 'FRAC 11', // Strobilurines (QoI)
    familyChemical: 'Strobilurine',
    phiDays: 7,
    reiHours: 24,
    standardDose: '50-60 g/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_fenhexamid',
    name: 'Fenhexamide',
    commonNameFr: 'Fenhexamide 50% (ex: Teldor)',
    nameAr: 'فينهكساميد',
    type: 'FRAC',
    codeGroup: 'FRAC 17', // Hydroxyanilides
    familyChemical: 'Hydroxyanilide',
    phiDays: 3,
    reiHours: 12,
    standardDose: '100-150 g/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_iprodione',
    name: 'Iprodione',
    commonNameFr: 'Iprodione 500 g/L (ex: Rovral)',
    nameAr: 'إيبروديون',
    type: 'FRAC',
    codeGroup: 'FRAC 2', // Dicarboximides
    familyChemical: 'Dicarboximide',
    phiDays: 7,
    reiHours: 24,
    standardDose: '100-150 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_captane',
    name: 'Captane',
    commonNameFr: 'Captane 80% (ex: Criptan, Phytocap)',
    nameAr: 'كابتان',
    type: 'FRAC',
    codeGroup: 'FRAC M04', // Multi-sites phtalimides
    familyChemical: 'Phtalimide',
    phiDays: 14,
    reiHours: 48,
    standardDose: '150-200 g/hL',
    maxApplicationsPerSeason: 4,
  },
  {
    id: 'ing_cuivre',
    name: 'Cuivre (Bouillie / Oxychlorure)',
    commonNameFr: 'Cuivre métal 50% (ex: Bouillie bordelaise)',
    nameAr: 'نحاس (كبريتات أو أوكسيكلورور)',
    type: 'FRAC',
    codeGroup: 'FRAC M01', // Multi-sites minéral
    familyChemical: 'Inorganique (Cuivre)',
    phiDays: 14,
    reiHours: 24,
    standardDose: '300-500 g/hL',
    maxApplicationsPerSeason: 4,
  },
  {
    id: 'ing_soufre',
    name: 'Soufre micronisé',
    commonNameFr: 'Soufre 80% (Mouillable ou poudrage)',
    nameAr: 'كبريت ميكروني',
    type: 'FRAC',
    codeGroup: 'FRAC M02', // Multi-sites inorganique
    familyChemical: 'Inorganique (Soufre)',
    phiDays: 3,
    reiHours: 12,
    standardDose: '400-600 g/hL',
    maxApplicationsPerSeason: 6,
  },
  {
    id: 'ing_fosetyl_al',
    name: 'Fosétyl-Aluminium',
    commonNameFr: 'Fosétyl-Aluminium 80% (ex: Aliette)',
    nameAr: 'فوسيتيل الألمنيوم',
    type: 'FRAC',
    codeGroup: 'FRAC 33', // Phosphonates
    familyChemical: 'Phosphonate éthylique',
    phiDays: 14,
    reiHours: 24,
    standardDose: '250 g/hL',
    maxApplicationsPerSeason: 3,
  },

  // --- INSECTICIDES & ACARICIDES (IRAC) ---
  {
    id: 'ing_acetamipride',
    name: 'Acétamipride',
    commonNameFr: 'Acétamipride 20% (ex: Acetaplan, Erlan, Rustilan)',
    nameAr: 'أسيتامبريد',
    type: 'IRAC',
    codeGroup: 'IRAC 4A', // Néonicotinoïdes
    familyChemical: 'Néonicotinoïde',
    phiDays: 14,
    reiHours: 24,
    standardDose: '25-30 g/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_flupyradifurone',
    name: 'Flupyradifurone',
    commonNameFr: 'Flupyradifurone 200 g/L (ex: Sivento Prime)',
    nameAr: 'فلوبيراديفورون',
    type: 'IRAC',
    codeGroup: 'IRAC 4D', // Buténolides
    familyChemical: 'Buténolide',
    phiDays: 7,
    reiHours: 24,
    standardDose: '50 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_thiaclopride',
    name: 'Thiaclopride',
    commonNameFr: 'Thiaclopride 480 g/L (ex: Calypso)',
    nameAr: 'ثياكلوبريد',
    type: 'IRAC',
    codeGroup: 'IRAC 4A', // Néonicotinoïdes
    familyChemical: 'Néonicotinoïde',
    phiDays: 14,
    reiHours: 48,
    standardDose: '25-30 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_deltamethrine',
    name: 'Deltaméthrine',
    commonNameFr: 'Deltaméthrine 100 g/L (ex: Decis Expert)',
    nameAr: 'دلتامثرين',
    type: 'IRAC',
    codeGroup: 'IRAC 3A', // Pyréthrinoïdes
    familyChemical: 'Pyréthrinoïde de synthèse',
    phiDays: 7,
    reiHours: 24,
    standardDose: '7.5-10 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_cypermethrine',
    name: 'Cyperméthrine',
    commonNameFr: 'Cyperméthrine 250 g/L (ex: Sherpa 25 EC)',
    nameAr: 'سيبيرمثرين',
    type: 'IRAC',
    codeGroup: 'IRAC 3A', // Pyréthrinoïdes
    familyChemical: 'Pyréthrinoïde de synthèse',
    phiDays: 14,
    reiHours: 48,
    standardDose: '30-40 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_abamectine',
    name: 'Abamectine',
    commonNameFr: 'Abamectine 18 g/L (ex: Verlan, Zorro)',
    nameAr: 'أبامكتين',
    type: 'IRAC',
    codeGroup: 'IRAC 6', // Avermectines
    familyChemical: 'Avermectine',
    phiDays: 14,
    reiHours: 24,
    standardDose: '50-75 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_spirotetramat',
    name: 'Spirotétramate',
    commonNameFr: 'Spirotétramate 100 g/L (ex: Movento)',
    nameAr: 'سبيروتتراماط',
    type: 'IRAC',
    codeGroup: 'IRAC 23', // Dérivés d\'acide tétronique
    familyChemical: 'Dérivé d\'acide tétramique',
    phiDays: 14,
    reiHours: 24,
    standardDose: '75-100 cc/hL',
    maxApplicationsPerSeason: 2,
  },
  {
    id: 'ing_huile_minerale',
    name: 'Huile minérale blanche',
    commonNameFr: 'Huile paraffine d\'hiver (Traitement d\'hiver)',
    nameAr: 'زيت معدني شتوي/صيفي',
    type: 'IRAC',
    codeGroup: 'HUILE_MINERALE',
    familyChemical: 'Hydrocarbures aliphatiques',
    phiDays: 21,
    reiHours: 24,
    standardDose: '1.5-2 L/hL',
    maxApplicationsPerSeason: 2,
  }
];

// ==========================================
// 3. CATALOGUE DES BIOAGRESSEURS CIBLÉS
// ==========================================

export const PEST_TARGETS_DATABASE: PestTarget[] = [
  // --- NECTARINIER & PÊCHER ---
  {
    id: 'pest_moniliose_peche',
    nameScientific: 'Monilinia fructicola / laxa',
    nameFr: 'Moniliose (Pourriture brune)',
    nameAr: 'العفن البني للأزهار والثمار (المونيليا)',
    category: 'champignon',
    applicableStages: ['floraison', 'chute_petales_nouaison', 'grossissement_fruit', 'maturation'],
    crops: ['peche', 'nectarine'],
    compatibleActiveIngredients: [
      'ing_tebuconazole',
      'ing_boscalid',
      'ing_fluopyram',
      'ing_fenhexamid',
      'ing_iprodione',
      'ing_captane'
    ],
    descriptionFr: 'Flétrissement des bouquets floraux, chancre sur rameaux, pourriture circulaire avec coussinets de spores sur fruits.',
    descriptionAr: 'ذبول وجفاف الأزهار وظهور تقرحات على الأغصان مع تعفن دائري على الثمار.',
  },
  {
    id: 'pest_cloque_peche',
    nameScientific: 'Taphrina deformans',
    nameFr: 'Cloque du pêcher / nectarinier',
    nameAr: 'تجعد أوراق الخوخ والرحيق (التافرينا)',
    category: 'champignon',
    applicableStages: ['dormance', 'gonflement_bourgeons', 'post_recolte_chute_feuilles'],
    crops: ['peche', 'nectarine'],
    compatibleActiveIngredients: [
      'ing_cuivre',
      'ing_captane',
      'ing_difenoconazole'
    ],
    descriptionFr: 'Feuilles boursouflées, épaissies, déformées et rougeâtres dès le débourrement.',
    descriptionAr: 'انتفاخ وتشوه الأوراق وتلونها باللون الأحمر السميك في بداية الربيع.',
  },
  {
    id: 'pest_oidium_peche',
    nameScientific: 'Podosphaera pannosa',
    nameFr: 'Oïdium du pêcher (Blanc)',
    nameAr: 'البياض الدقيقي (الرماد)',
    category: 'champignon',
    applicableStages: ['chute_petales_nouaison', 'grossissement_fruit'],
    crops: ['peche', 'nectarine'],
    compatibleActiveIngredients: [
      'ing_soufre',
      'ing_tebuconazole',
      'ing_difenoconazole',
      'ing_boscalid',
      'ing_fluopyram',
      'ing_azoxystrobine'
    ],
    descriptionFr: 'Feutrage blanc farineux sur jeunes pousses et taches décolorées sur l\'épiderme des fruits.',
    descriptionAr: 'ظهور مسحوق أبيض كالدقيق على الأوراق والنموات الحديثة وتشوه قشرة الثمار.',
  },
  {
    id: 'pest_pucerons_peche',
    nameScientific: 'Myzus persicae',
    nameFr: 'Puceron vert du pêcher',
    nameAr: 'من الخوخ الأخضر',
    category: 'insecte',
    applicableStages: ['gonflement_bourgeons', 'chute_petales_nouaison', 'grossissement_fruit'],
    crops: ['peche', 'nectarine'],
    compatibleActiveIngredients: [
      'ing_acetamipride',
      'ing_flupyradifurone',
      'ing_spirotetramat',
      'ing_deltamethrine'
    ],
    descriptionFr: 'Crispation et enroulement violent des feuilles, sécrétion de miellat et fumagine.',
    descriptionAr: 'التفاف الأوراق بشدة وإفراز الندوة العسلية مع انتشار فطر العفن الأسود.',
  },
  {
    id: 'pest_ceratite_fruits',
    nameScientific: 'Ceratitis capitata',
    nameFr: 'Cératite (Mouche méditerranéenne des fruits)',
    nameAr: 'ذبابة الفاكهة المتوسطية (السيراتيت)',
    category: 'insecte',
    applicableStages: ['grossissement_fruit', 'maturation'],
    crops: ['peche', 'nectarine', 'pomme'],
    compatibleActiveIngredients: [
      'ing_deltamethrine',
      'ing_cypermethrine',
      'ing_acetamipride'
    ],
    descriptionFr: 'Piqûres de ponte sur fruits virant de couleur, asticots à l\'intérieur de la pulpe et pourriture rapide.',
    descriptionAr: 'وخز الثمار لوضع البيض ودخول اليرقات وتلف اللب مع سقوط الثمار المصابة.',
  },

  // --- POMMIER ---
  {
    id: 'pest_tavelure_pomme',
    nameScientific: 'Venturia inaequalis',
    nameFr: 'Tavelure du pommier',
    nameAr: 'جرب التفاح',
    category: 'champignon',
    applicableStages: ['gonflement_bourgeons', 'floraison', 'chute_petales_nouaison', 'grossissement_fruit'],
    crops: ['pomme'],
    compatibleActiveIngredients: [
      'ing_cuivre',
      'ing_captane',
      'ing_difenoconazole',
      'ing_fluopyram',
      'ing_boscalid',
      'ing_azoxystrobine'
    ],
    descriptionFr: 'Taches brun-olive veloutées sur feuilles puis crevasses et déformations sur les pommes.',
    descriptionAr: 'بقع زيتونية داكنة مخملية على الأوراق وتشقق وتصلب قشرة التفاح.',
  },
  {
    id: 'pest_carpocapse_pomme',
    nameScientific: 'Cydia pomonella',
    nameFr: 'Carpocapse des pommes (Ver de la pomme)',
    nameAr: 'ديدان التفاح (الكاربوكابس)',
    category: 'insecte',
    applicableStages: ['chute_petales_nouaison', 'grossissement_fruit', 'maturation'],
    crops: ['pomme'],
    compatibleActiveIngredients: [
      'ing_thiaclopride',
      'ing_acetamipride',
      'ing_deltamethrine',
      'ing_cypermethrine'
    ],
    descriptionFr: 'Galerie creusée jusqu’au trognon, déjections visibles à l’orifice de pénétration.',
    descriptionAr: 'حفر أنفاق داخل الثمرة حتى البذور مع خروج فضلات دقيقة من فتحة الدخول.',
  },
  {
    id: 'pest_acariens_rouges',
    nameScientific: 'Panonychus ulmi',
    nameFr: 'Acarien rouge des arbres fruitiers',
    nameAr: 'العنكبوت الأحمر الأوروبي',
    category: 'acarien',
    applicableStages: ['grossissement_fruit', 'maturation'],
    crops: ['pomme', 'peche', 'nectarine'],
    compatibleActiveIngredients: [
      'ing_abamectine',
      'ing_spirotetramat'
    ],
    descriptionFr: 'Feuilles plombées, bronzées ou grisâtres, chute prématurée en cas de forte chaleur.',
    descriptionAr: 'اصفرار وتبرقش الأوراق بلون برونزي أو رمادي وجفافها مع الحرارة العالية.',
  },

  // --- OLIVIER ---
  {
    id: 'pest_oeil_paon_olive',
    nameScientific: 'Spilocaea oleagina (Cycloconium)',
    nameFr: 'Œil de paon de l\'olivier',
    nameAr: 'مرض عين الطاووس في الزيتون',
    category: 'champignon',
    applicableStages: ['dormance', 'gonflement_bourgeons', 'post_recolte_chute_feuilles'],
    crops: ['olive'],
    compatibleActiveIngredients: [
      'ing_cuivre',
      'ing_difenoconazole',
      'ing_tebuconazole',
      'ing_azoxystrobine'
    ],
    descriptionFr: 'Taches circulaires concentriques sombres auréolées de jaune sur la face supérieure des feuilles, forte défoliation.',
    descriptionAr: 'بقع دائرية مميزة تشبه ريش الطاووس تسبب تساقطاً كثيفاً للأوراق وضعف الأشجار.',
  },
  {
    id: 'pest_mouche_olive',
    nameScientific: 'Bactrocera oleae',
    nameFr: 'Mouche de l\'olive (Dacus)',
    nameAr: 'ذبابة ثمار الزيتون',
    category: 'insecte',
    applicableStages: ['grossissement_fruit', 'maturation'],
    crops: ['olive'],
    compatibleActiveIngredients: [
      'ing_deltamethrine',
      'ing_cypermethrine',
      'ing_acetamipride'
    ],
    descriptionFr: 'Piqûre triangulaire sur l\'olive, pourriture interne et forte baisse de qualité de l\'huile.',
    descriptionAr: 'لسعة مثلثة على حبات الزيتون وتغذية اليرقة داخل اللب مسببة فساد الزيت وتساقط الحبات.',
  },
  {
    id: 'pest_psylle_olive',
    nameScientific: 'Euphyllura olivina',
    nameFr: 'Psylle de l\'olivier (Coton)',
    nameAr: 'بسيلا الزيتون (القطن الأبيض)',
    category: 'insecte',
    applicableStages: ['gonflement_bourgeons', 'floraison'],
    crops: ['olive'],
    compatibleActiveIngredients: [
      'ing_deltamethrine',
      'ing_cypermethrine',
      'ing_acetamipride'
    ],
    descriptionFr: 'Sécrétions abondantes d\'un duvet cireux cotonneux blanc enveloppant les inflorescences.',
    descriptionAr: 'ظهور كتل قطنية بيضاء شمعية تغطي النورات الزهرية والبراعم وتسبب سقوطها.',
  },
  {
    id: 'pest_teigne_olive',
    nameScientific: 'Prays oleae',
    nameFr: 'Teigne de l\'olivier',
    nameAr: 'عثة الزيتون (الدودة الخضراء)',
    category: 'insecte',
    applicableStages: ['floraison', 'chute_petales_nouaison', 'grossissement_fruit'],
    crops: ['olive'],
    compatibleActiveIngredients: [
      'ing_deltamethrine',
      'ing_cypermethrine',
      'ing_acetamipride'
    ],
    descriptionFr: '3 générations par an : dégâts sur feuilles (anthophage), fleurs (fils de soie) et chute des fruits.',
    descriptionAr: 'تهاجم الأزهار بخيوط حريرية ثم تحفر الثمار في الصيف مسببة سقوطها في الخريف.',
  }
];
