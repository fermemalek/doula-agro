import { getEmbeddedPestSvg } from './visualAssets.ts';
/**
 * DOULA AGRI-MANAGER - MODULE INGÉNIEUR AGRONOME
 * Moteur de Recommandation Phytosanitaire & Gestion de la Résistance (IRAC / FRAC)
 * Architecture : Compatible SQLite / Supabase / Zustand / Offline-First
 */

// ==========================================
// 1. TYPES & STRUCTURES DE DONNÉES
// ==========================================

export type CropType = 'peche' | 'nectarine' | 'pomme' | 'olive';

export type GrowthStage = 
  | 'dormance'
  | 'gonflement_bourgeons'
  | 'floraison'
  | 'chute_petales_nouaison'
  | 'grossissement_fruit'
  | 'maturation'
  | 'post_recolte'
  | 'chute_feuilles'
  | 'post_recolte_chute_feuilles';

export type PestCategory = 'insecte' | 'acarien' | 'champignon' | 'bacterie';

export type ActionCodeType = 'FRAC' | 'IRAC';

export type SystemicType = 'contact' | 'systemique' | 'translaminaire';

export interface TreatmentActionRule {
  isRainExpectedSoon: boolean;    // Pluie > 20 mm prévue sous 48h (lessivage)
  hasVisibleSymptoms: boolean;    // Maladie déjà installée (action curative requise)
  isRapidShootsGrowth: boolean;   // Débourrement / Pousse rapide du printemps
  daysBeforeHarvest: number;      // Proximité de la récolte (< 15j pour sécurité DAR)
}

export interface ModeOfActionRecommendation {
  recommendedType: SystemicType[];
  adviceNoticeFr: string;
  adviceNoticeAr: string;
  idealMixStrategyFr: string;
  idealMixStrategyAr: string;
  dominantReason: 'curative' | 'rain' | 'growth' | 'harvest' | 'preventive';
}

export interface ActiveIngredient {
  id: string;
  name: string;
  commonNameFr: string;
  nameAr?: string;
  type: ActionCodeType;
  codeGroup: string; // Ex: 'FRAC 3', 'IRAC 1B', 'FRAC M01'
  multiCodes?: string[]; // Pour les associations, ex: ['FRAC 7', 'FRAC 11']
  familyChemical: string;
  phiDays: number; // Délai Avant Récolte (DAR / PHI en jours)
  reiHours: number; // Délai de Réentrée (DRE / REI en heures)
  standardDose: string;
  standardDosePerHa?: string;
  maxApplicationsPerSeason: number;
  formulation?: 'WSB' | 'WG' | 'WDG' | 'WP' | 'SC' | 'FL' | 'EC' | 'SL' | 'SP';
  isMultiSite?: boolean; // Contact multi-site (immunité anti-résistance)
  systemicType: SystemicType; // Mode d'action physique : Contact vs Systémique vs Translaminaire
}

export interface SymptomOrganSample {
  organ: 'feuille' | 'fruit' | 'fleur' | 'rameau' | 'racine' | 'general';
  organFr: string;
  organAr: string;
  imageUrl?: string;
  descriptionFr?: string;
  descriptionAr?: string;
}

export interface PestTarget {
  id: string;
  nameScientific: string;
  nameFr: string;
  nameAr: string;
  category: PestCategory;
  applicableStages: GrowthStage[];
  crops: CropType[];
  compatibleActiveIngredients: string[]; // IDs des matières actives
  descriptionFr?: string;
  descriptionAr?: string;
  // Système visuel hybride en 3 niveaux
  primarySampleUrl?: string; // Niveau 1 : vignette locale / représentative
  referenceGallery?: string[]; // Niveau 2 : galerie d'images complémentaires
  symptomOrgans?: SymptomOrganSample[]; // Niveau 2 : détails des dégâts par organe
}

export interface CommercialProductDZ {
  tradeName: string;
  activeIngredient: string;
  category: 'fongicide' | 'insecticide' | 'acaricide';
  groupCode: string; // Ex: 'FRAC 3', 'IRAC 4A', 'FRAC M01'
  multiCodes?: string[]; // Pour les mélanges commerciaux (ex: Signum, Nativo)
  crops: CropType[];
  targetPests: string[];
  standardDose: string;
  phiDays: number;
  formulation: 'WSB' | 'WG' | 'WDG' | 'WP' | 'SC' | 'FL' | 'EC' | 'SL' | 'SP';
  systemicType?: SystemicType;
  remarksFr?: string;
  remarksAr?: string;
}

export interface SprayApplicationRecord {
  id: string;
  parcelId: string;
  crop: CropType;
  date: string; // ISO String
  targetPestId: string;
  activeIngredientId: string;
  codeGroup: string; // Stocké à l'écriture pour éviter les jointures lourdes en offline
  multiCodes?: string[];
}

export interface CompatibilityRule {
  groupA: string;
  groupB: string;
  isCompatible: boolean;
  warningNotice?: string;
}

// ==========================================
// 2. RÈGLES D'INCOMPATIBILITÉ DE MÉLANGE EN CUVE (TANK MIX)
// ==========================================

export const TANK_MIX_COMPATIBILITY_RULES: CompatibilityRule[] = [
  {
    groupA: 'FRAC M01', // Cuivre (Bouillie bordelaise / Oxychlorure)
    groupB: 'FRAC 3',   // Triazoles (DMI)
    isCompatible: false,
    warningNotice: 'Incompatibilité Cuivre + Triazole (FRAC 3) : Risque de phytotoxicité ou altération physico-chimique de la bouillie.',
  },
  {
    groupA: 'FRAC M02',      // Soufre
    groupB: 'HUILE_MINERALE', // Huile blanche / minérale
    isCompatible: false,
    warningNotice: 'Incompatibilité Soufre + Huile minérale : Risque grave de brûlure foliaire. Délai de 21 jours obligatoire entre les deux traitements.',
  },
  {
    groupA: 'FRAC M01', // Cuivre
    groupB: 'FRAC 33',  // Fosétyl-Aluminium
    isCompatible: false,
    warningNotice: 'Incompatibilité Cuivre + Fosétyl-Aluminium : Risque de floculation et de libération excessive d’ions cuivre phytotoxiques.',
  },
  {
    groupA: 'FRAC M01',      // Cuivre
    groupB: 'HUILE_MINERALE', // Huiles
    isCompatible: false,
    warningNotice: 'Incompatibilité Cuivre + Huile en période végétative : Risque de nécrose des bourgeons.',
  }
];

// ==========================================
// 3. ORDRE OFFICIEL D'INCORPORATION EN CUVE
// ==========================================

export const TANK_MIX_ORDER_STEPS = [
  { step: 1, type: 'WSB', labelFr: 'Sachets hydrosolubles (WSB)', labelAr: 'الأكياس القابلة للذوبان في الماء' },
  { step: 2, type: 'WG/WDG', labelFr: 'Granulés dispersibles dans l’eau (WG / WDG)', labelAr: 'الحبيبات القابلة للانتشار' },
  { step: 3, type: 'WP', labelFr: 'Poudres mouillables (WP)', labelAr: 'المساحيق القابلة للبلل' },
  { step: 4, type: 'SC/FL', labelFr: 'Suspensions concentrées (SC / FL)', labelAr: 'المعلقات المركزة' },
  { step: 5, type: 'EC/EW', labelFr: 'Concentrés émulsionnables (EC / EW)', labelAr: 'المستحلبات المركزة' },
  { step: 6, type: 'SL/SP', labelFr: 'Solutions et poudres solubles (SL / SP)', labelAr: 'المحاليل السائلة القابلة للذوبان' },
  { step: 7, type: 'ADJ', labelFr: 'Mouillants, Adjuvants et Engrais foliaires', labelAr: 'المواد الناشرة والمبللة والأسمدة الورقية في الأخير' },
];

// ==========================================
// 4. SERVICE PRINCIPAL : MOTEUR INGÉNIEUR IRAC / FRAC
// ==========================================

export class PhytosanitaryEngine {
  /**
   * Arbre de décision automatique pour le choix du mode d'action physique :
   * Contact vs Systémique vs Translaminaire
   */
  static recommendModeOfAction(conditions: TreatmentActionRule): ModeOfActionRecommendation {
    // 1. Priorité Curative absolue : Infection active et symptômes visibles
    if (conditions.hasVisibleSymptoms) {
      return {
        recommendedType: ['systemique', 'translaminaire'],
        dominantReason: 'curative',
        adviceNoticeFr: 'Infection active constatée : Privilégier un produit systémique ou translaminaire doté d’un effet curatif / stop (24-72h) pour stopper l’extension interne du mycélium.',
        adviceNoticeAr: 'إصابة فعلية مؤكدة : الأولوية لمبيد جهازي أو عابر للصفائح ذو فاعلية علاجية توقيفية (Stop effect) لاختراق الأنسجة والقضاء على ميسيليوم الفطر الداخلي.',
        idealMixStrategyFr: 'Mélange curatif recommandé : Associer un systémique (effet stop interne) + un contact multi-site (détruit les spores externes et protège le systémique contre les mutations résistantes).',
        idealMixStrategyAr: 'خلطة علاجية مزدوجة : دمج مبيد جهازي داخلي مع مبيد بالملامسة متعدد مواقع التأثير لتطهير السطح الخارجي وحماية المبيد الجهازي من انكسار المقاومة.',
      };
    }

    // 2. Alerte Lessivage Météo : Pluie > 20 mm imminente sous 48h
    if (conditions.isRainExpectedSoon) {
      return {
        recommendedType: ['systemique'],
        dominantReason: 'rain',
        adviceNoticeFr: 'Risque de lessivage par la pluie (> 20 mm sous 48h) : Les produits de contact risquent d’être lavés. Un systémique absorbé en 2 à 4 heures garantit une protection endothérapique durable.',
        adviceNoticeAr: 'تنبيه أمطار وغسيل (> 20 ملم خلال 48 ساعة) : مبيدات الملامسة ستُغسل بمياه الأمطار. المبيد الجهازي الممتص خلال 2 إلى 4 ساعات يضمن حماية داخلية تقاوم الغسيل.',
        idealMixStrategyFr: 'Si un produit de contact est utilisé en pré-pluie, exiger une matière très adhérente ou additif fixateur (ex: Dithianon résistant au délavage).',
        idealMixStrategyAr: 'في حال الرش بالملامسة قبل المطر، يُشترط استعمال مادة لاصقة شديدة المقاومة للغسيل (مثل Dithianon).',
      };
    }

    // 3. Sécurité Pré-récolte : Proximité de la cueillette (DAR critique)
    if (conditions.daysBeforeHarvest < 15) {
      return {
        recommendedType: ['contact'],
        dominantReason: 'harvest',
        adviceNoticeFr: 'Sécurité pré-récolte (DAR court) : À l’approche de la cueillette, privilégier un produit de contact ou à faible rémanence pour éviter tout résidu dans les fruits.',
        adviceNoticeAr: 'أمان ما قبل الجني (DAR) : مع اقتراب القطف، الأفضلية لمبيدات الملامسة أو المواد ذات فترة الأمان القصيرة لضمان خلو الثمار من المتبقيات.',
        idealMixStrategyFr: 'Vérifier impérativement le Délai Avant Récolte (DAR / PHI) légal de chaque matière avant traitement.',
        idealMixStrategyAr: 'التأكد الصارم من فترة الأمان القانونية قبل القطف (DAR / PHI) على العبوة.',
      };
    }

    // 4. Croissance Végétative Rapide du Printemps (Débourrement / Nouaison / Pousses actives)
    if (conditions.isRapidShootsGrowth) {
      return {
        recommendedType: ['systemique', 'translaminaire'],
        dominantReason: 'growth',
        adviceNoticeFr: 'Croissance foliaire rapide : Les matières de contact ne protègent pas les nouvelles feuilles formées après le passage. Un produit systémique circule dans la sève et protège les organes en croissance.',
        adviceNoticeAr: 'نمو خضري سريع : مبيدات الملامسة لا تحمي الأوراق الجديدة النامية بعد الرش. المبيد الجهازي يسري مع العصارة لحماية القمم النامية.',
        idealMixStrategyFr: 'Stratégie alternée : Utiliser un systémique pour couvrir la pousse active, ou rapprocher les passages de contact tous les 7 jours.',
        idealMixStrategyAr: 'خطة متناوبة : استخدام جهازي لتغطية النمو السريع، أو تقريب دورات الرش بالملامسة كل 7 أيام.',
      };
    }

    // 5. Situation Préventive Standard / Période Sèche
    return {
      recommendedType: ['contact', 'systemique'],
      dominantReason: 'preventive',
      adviceNoticeFr: 'Traitement protecteur standard (Temps sec) : Un produit de contact multi-site (Cuivre, Soufre, Captane) est idéal pour limiter la pression sans risque de sélection de résistance.',
      adviceNoticeAr: 'معاملة وقائية قياسية (طقس مستقر) : مبيد بالملامسة متعدد مواقع التأثير (نحاس، كبريت، كابتان) مثالي لبناء درع سطحي مانع للأبواغ دون خطر نشوء مناعة.',
      idealMixStrategyFr: 'Association d’excellence : Contact multi-site seul ou couplé à un systémique pour sécuriser à la fois la surface et l’intérieur de la plante.',
      idealMixStrategyAr: 'مزيج وقائي متوازن : ملامسة متعدد المواقع بمفرده أو مدعوم بجهازي مقنن لحماية السطح والداخل معاً.',
    };
  }

  /**
   * Vérifie si un groupe chimique bénéficie du statut d'immunité multi-site (FRAC M)
   */
  static isMultiSiteGroup(codeGroup: string): boolean {
    const clean = (codeGroup || '').toUpperCase().trim();
    return clean.startsWith('FRAC M') || clean === 'HUILE_MINERALE';
  }

  /**
   * Filtre les ravageurs et maladies observables selon la culture et le stade végétatif
   */
  static getEligiblePests(
    pests: PestTarget[],
    crop: CropType,
    stage: GrowthStage
  ): PestTarget[] {
    return pests.filter((pest) => {
      if (!pest.crops.includes(crop)) return false;
      if (pest.applicableStages.includes(stage)) return true;
      if (
        (stage === 'post_recolte' || stage === 'chute_feuilles') &&
        pest.applicableStages.includes('post_recolte_chute_feuilles')
      ) {
        return true;
      }
      return false;
    });
  }

  /**
   * Évalue et classe les matières actives disponibles face à une cible,
   * en vérifiant la résistance acquise, l'immunité multi-site et l'historique de la parcelle.
   */
  static evaluateTreatmentOptions(params: {
    targetPest: PestTarget;
    parcelHistory: SprayApplicationRecord[];
    allIngredients: ActiveIngredient[];
    currentSeasonYear: number;
    currentDate?: Date;
    conditions?: TreatmentActionRule;
  }) {
    const { targetPest, parcelHistory, allIngredients, currentSeasonYear, currentDate = new Date(), conditions } = params;

    const modeRecommendation = conditions ? PhytosanitaryEngine.recommendModeOfAction(conditions) : null;

    // Récupérer les traitements appliqués cette saison sur la parcelle contre cette cible
    const currentSeasonLogs = parcelHistory.filter((log) => {
      const logYear = new Date(log.date).getFullYear();
      return logYear === currentSeasonYear && log.targetPestId === targetPest.id;
    });

    // Dernier traitement effectué contre cette cible
    const lastApplication = currentSeasonLogs.length > 0
      ? [...currentSeasonLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;

    // Calculer les jours écoulés depuis le dernier traitement
    const daysSinceLastApp = lastApplication
      ? Math.floor((currentDate.getTime() - new Date(lastApplication.date).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Matières actives homologuées pour la cible
    const candidateIngredients = allIngredients.filter((ing) =>
      targetPest.compatibleActiveIngredients.includes(ing.id)
    );

    return candidateIngredients.map((ingredient) => {
      let isAllowed = true;
      let blockReason = '';
      let priorityScore = 100;
      const isMultiSite = ingredient.isMultiSite || PhytosanitaryEngine.isMultiSiteGroup(ingredient.codeGroup);

      // Normalisation des codes FRAC/IRAC (ex: "FRAC 3", "3", "FRAC 7 + FRAC 3" -> ["7", "3"])
      const extractNormalizedCodes = (codesList: string[]): string[] => {
        const out: string[] = [];
        for (const raw of codesList) {
          if (!raw) continue;
          const parts = raw.split('+').map(p => p.replace(/^(FRAC|IRAC)s*/i, '').trim().toUpperCase());
          for (const p of parts) {
            if (p && !out.includes(p)) out.push(p);
          }
        }
        return out;
      };

      const rawIngCodes = ingredient.multiCodes && ingredient.multiCodes.length > 0
        ? ingredient.multiCodes
        : [ingredient.codeGroup];
      const ingredientCodes = extractNormalizedCodes(rawIngCodes);

      const rawLastCodes = lastApplication?.multiCodes && lastApplication.multiCodes.length > 0
        ? lastApplication.multiCodes
        : lastApplication?.codeGroup ? [lastApplication.codeGroup] : [];
      const lastAppCodes = extractNormalizedCodes(rawLastCodes);

      // Vérifier si un des codes concorde avec le dernier traitement
      const hasDirectCodeConflict = ingredientCodes.some(c => lastAppCodes.includes(c));

      // Compter les applications de ce groupe spécifique sur la saison
      const groupApplicationsCount = currentSeasonLogs.filter((log) => {
        const logCodes = log.multiCodes || [log.codeGroup];
        return ingredientCodes.some(c => logCodes.includes(c));
      }).length;

      // 1. RÈGLE CRITIQUE ANTI-RÉSISTANCE (avec immunité des multi-sites & fenêtre de rémanence 45j)
      if (hasDirectCodeConflict) {
        if (isMultiSite) {
          // Statut d'immunité : Les multi-sites (Cuivre, Soufre, Captane) ne sont jamais bloqués
          isAllowed = true;
          priorityScore = 95;
        } else if (daysSinceLastApp < 45) {
          // Bloqué car moins de 45 jours et même mode d'action d'affilée
          isAllowed = false;
          blockReason = `Blocage Anti-Résistance : Le dernier traitement (il y a ${daysSinceLastApp} jours) utilisait déjà le groupe [${ingredient.codeGroup}]. L'alternance vers un autre mode d'action (FRAC/IRAC) est obligatoire pour briser la résistance.`;
          priorityScore = 0;
        } else {
          // Plus de 45 jours écoulés : ré-autorisation possible avec avertissement
          priorityScore -= 20;
        }
      }

      // 2. RÈGLE DE QUOTA : Dépassement du nombre maximal d'applications par saison
      if (groupApplicationsCount >= ingredient.maxApplicationsPerSeason) {
        isAllowed = false;
        blockReason = `Plafond Saison Atteint : ${groupApplicationsCount}/${ingredient.maxApplicationsPerSeason} pulvérisations déjà effectuées pour le groupe [${ingredient.codeGroup}].`;
        priorityScore = 0;
      }

      const isSituationallyRecommended = modeRecommendation 
        ? modeRecommendation.recommendedType.includes(ingredient.systemicType)
        : true;

      // Favoriser les groupes d'action encore jamais utilisés cette saison
      if (isAllowed) {
        priorityScore -= groupApplicationsCount * 25;
        if (isMultiSite) {
          priorityScore += 10; // Bonus pour favoriser les solutions de contact protectrices
        }
        if (isSituationallyRecommended) {
          priorityScore += 15; // Bonus adéquation météo / physiologique (Contact vs Systémique)
        }
      }

      return {
        ingredient,
        isAllowed,
        isMultiSite,
        systemicType: ingredient.systemicType,
        isSituationallyRecommended,
        blockReason,
        priorityScore,
        currentSeasonUsageCount: groupApplicationsCount,
        lastUsedDate: hasDirectCodeConflict ? lastApplication?.date : null,
        daysSinceLastApp,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Vérifie la faisabilité d'un mélange en cuve (Tank Mix) entre deux matières actives
   */
  static checkTankMixFeasibility(
    ingredientA: ActiveIngredient,
    ingredientB: ActiveIngredient
  ): { safe: boolean; warning?: string } {
    const codesA = ingredientA.multiCodes || [ingredientA.codeGroup];
    const codesB = ingredientB.multiCodes || [ingredientB.codeGroup];

    for (const ca of codesA) {
      for (const cb of codesB) {
        const rule = TANK_MIX_COMPATIBILITY_RULES.find(
          (r) => (r.groupA === ca && r.groupB === cb) || (r.groupB === ca && r.groupA === cb)
        );
        if (rule && !rule.isCompatible) {
          return {
            safe: false,
            warning: rule.warningNotice || 'Risque de blocage physico-chimique en cuve.',
          };
        }
      }
    }

    return { safe: true };
  }

  /**
   * Calculateur de cuve et dosage précis
   */
  static calculateTankMixDosage(params: {
    tankVolumeL: number;       // Volume de la cuve (ex: 1000 L)
    dosePerHlNum: number;      // Dose pour 100 L (ex: 50 g ou 30 cc)
    unit: 'g' | 'cc' | 'kg' | 'L';
  }) {
    const { tankVolumeL, dosePerHlNum, unit } = params;
    const numHlInTank = tankVolumeL / 100;
    const totalRequiredInTank = dosePerHlNum * numHlInTank;

    let displayStr = '';
    if (unit === 'g' || unit === 'kg') {
      if (totalRequiredInTank >= 1000) {
        displayStr = `${(totalRequiredInTank / 1000).toFixed(2)} kg`;
      } else {
        displayStr = `${totalRequiredInTank.toFixed(0)} g`;
      }
    } else {
      if (totalRequiredInTank >= 1000) {
        displayStr = `${(totalRequiredInTank / 1000).toFixed(2)} L`;
      } else {
        displayStr = `${totalRequiredInTank.toFixed(0)} cc (mL)`;
      }
    }

    return {
      totalAmount: totalRequiredInTank,
      displayStr,
      numHl: numHlInTank,
    };
  }

  /**
   * Calcule la date minimale de récolte autorisée selon le DAR / PHI
   */
  static calculateHarvestSafetyDate(applicationDate: string | Date, phiDays: number): {
    safeHarvestDate: string;
    isSafeNow: boolean;
    remainingDays: number;
  } {
    const app = new Date(applicationDate);
    const safeDate = new Date(app.getTime() + phiDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = safeDate.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return {
      safeHarvestDate: safeDate.toISOString().slice(0, 10),
      isSafeNow: remainingDays === 0,
      remainingDays,
    };
  }
}

/**
 * Résout le chemin absolu / relatif correct pour les images et assets phytosanitaires
 * selon la base Vite ('./' ou '/') pour fonctionner aussi bien en local que sur GitHub Pages.
 */
export function resolvePhytoImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
  const cleanBase = base.endsWith('/') ? base : base + '/';
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Associe chaque bioagresseur à son illustration visuelle locale de référence (Niveau 1 Offline-First).
 * Garantit qu'aucune image brisée ne s'affiche jamais.
 */
export function getPestVisualAsset(pest: { id: string; category?: string; primarySampleUrl?: string }): string {
  if (pest.primarySampleUrl && pest.primarySampleUrl.startsWith('data:')) {
    return pest.primarySampleUrl;
  }
  return getEmbeddedPestSvg(pest.id, pest.category);
}
