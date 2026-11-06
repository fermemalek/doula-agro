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
  familyChemical: string;
  phiDays: number; // Délai Avant Récolte (DAR / PHI en jours)
  reiHours: number; // Délai de Réentrée (DRE / REI en heures)
  standardDose: string;
  maxApplicationsPerSeason: number;
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

export interface SprayApplicationRecord {
  id: string;
  parcelId: string;
  crop: CropType;
  date: string; // ISO String
  targetPestId: string;
  activeIngredientId: string;
  codeGroup: string; // Stocké à l'écriture pour éviter les jointures lourdes en offline
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
// 3. SERVICE PRINCIPAL : MOTEUR INGÉNIEUR IRAC / FRAC
// ==========================================

export class PhytosanitaryEngine {
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
   * en vérifiant la résistance acquise et l'historique de la parcelle.
   */
  static evaluateTreatmentOptions(params: {
    targetPest: PestTarget;
    parcelHistory: SprayApplicationRecord[];
    allIngredients: ActiveIngredient[];
    currentSeasonYear: number;
  }) {
    const { targetPest, parcelHistory, allIngredients, currentSeasonYear } = params;

    // Récupérer les traitements appliqués cette saison sur la parcelle contre cette cible
    const currentSeasonLogs = parcelHistory.filter((log) => {
      const logYear = new Date(log.date).getFullYear();
      return logYear === currentSeasonYear && log.targetPestId === targetPest.id;
    });

    // Dernier traitement effectué contre cette cible
    const lastApplication = currentSeasonLogs.length > 0
      ? [...currentSeasonLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;

    // Matières actives homologuées pour la cible
    const candidateIngredients = allIngredients.filter((ing) =>
      targetPest.compatibleActiveIngredients.includes(ing.id)
    );

    return candidateIngredients.map((ingredient) => {
      let isAllowed = true;
      let blockReason = '';
      let priorityScore = 100;

      // Compter les applications de ce groupe spécifique sur la saison
      const groupApplicationsCount = currentSeasonLogs.filter(
        (log) => log.codeGroup === ingredient.codeGroup
      ).length;

      // 1. RÈGLE CRITIQUE ANTI-RÉSISTANCE : Pas 2 fois le même mode d'action d'affilée
      if (lastApplication && lastApplication.codeGroup === ingredient.codeGroup) {
        isAllowed = false;
        blockReason = `Blocage Anti-Résistance : Le dernier traitement utilisait déjà le groupe [${ingredient.codeGroup}]. L'alternance vers un autre mode d'action (FRAC/IRAC) est obligatoire.`;
        priorityScore = 0;
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
      }

      return {
        ingredient,
        isAllowed,
        blockReason,
        priorityScore,
        currentSeasonUsageCount: groupApplicationsCount,
        lastUsedDate: lastApplication?.codeGroup === ingredient.codeGroup ? lastApplication.date : null,
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
    const rule = TANK_MIX_COMPATIBILITY_RULES.find(
      (r) =>
        (r.groupA === ingredientA.codeGroup && r.groupB === ingredientB.codeGroup) ||
        (r.groupB === ingredientA.codeGroup && r.groupA === ingredientB.codeGroup)
    );

    if (rule && !rule.isCompatible) {
      return {
        safe: false,
        warning: rule.warningNotice || 'Risque de blocage physico-chimique en cuve.',
      };
    }

    return { safe: true };
  }
}
