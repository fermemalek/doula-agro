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
  | 'post_recolte_chute_feuilles';

export type PestCategory = 'insecte' | 'acarien' | 'champignon' | 'bacterie';

export type ActionCodeType = 'FRAC' | 'IRAC';

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
    return pests.filter(
      (pest) => pest.crops.includes(crop) && pest.applicableStages.includes(stage)
    );
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
  }) {
    const { targetPest, parcelHistory, allIngredients, currentSeasonYear, currentDate = new Date() } = params;

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

      // Codes associés à tester (gestion des mélanges multi-modes, ex: Signum FRAC 7+11)
      const ingredientCodes = ingredient.multiCodes && ingredient.multiCodes.length > 0
        ? ingredient.multiCodes
        : [ingredient.codeGroup];

      const lastAppCodes = lastApplication?.multiCodes && lastApplication.multiCodes.length > 0
        ? lastApplication.multiCodes
        : lastApplication?.codeGroup ? [lastApplication.codeGroup] : [];

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

      // Favoriser les groupes d'action encore jamais utilisés cette saison
      if (isAllowed) {
        priorityScore -= groupApplicationsCount * 25;
        if (isMultiSite) {
          priorityScore += 10; // Bonus pour favoriser les solutions de contact protectrices
        }
      }

      return {
        ingredient,
        isAllowed,
        isMultiSite,
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
