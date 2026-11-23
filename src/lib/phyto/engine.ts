/**
 * DOULA AGRI-MANAGER - MODULE INGÉNIEUR AGRONOME
 * Moteur de Recommandation Phytosanitaire & Gestion de la Résistance (IRAC / FRAC)
 * Architecture : Compatible SQLite / Supabase / Zustand / Offline-First
 */

import {
  PHYTO_DATABASE,
  COMMERCIAL_TO_ACTIVE,
  getIracFracCode,
  getMatiereActive,
  isProductBlockedAtStage,
  type BlockedStageKey,
  type PhytoCultureKey,
  type PhytoProductInfo,
} from '@/data/phytosanitaires';

// ==========================================
// 1. TYPES & STRUCTURES DE DONNÉES
// ==========================================

export function mapGrowthStageToBlockedKey(stage?: GrowthStage): BlockedStageKey | null {
  if (stage === 'floraison') return 'floraison';
  if (stage === 'chute_petales_nouaison') return 'chute_petales';
  if (stage === 'grossissement_fruit') return 'grossissement';
  if (stage === 'maturation') return 'maturation';
  return null;
}

export function checkProductBlockedForGrowthStage(
  product: PhytoProductInfo,
  stage?: GrowthStage
): { blocked: boolean; reason?: string } {
  if (!product.blockedStages || product.blockedStages.length === 0) {
    return { blocked: false };
  }
  const mapped = mapGrowthStageToBlockedKey(stage);
  if (mapped) {
    return isProductBlockedAtStage(product, mapped);
  }
  if (product.blockedStages.includes('foliaire_interdit')) {
    return { blocked: true, reason: product.blockedReason };
  }
  return { blocked: false };
}

export const SPECIES_LABELS: Record<PhytoCultureKey, { fr: string; ar: string; icon: string }> = {
  olivier: { fr: 'Olivier', ar: 'زيتون', icon: '🫒' },
  pommier: { fr: 'Pommier', ar: 'تفاح', icon: '🍎' },
  nectarinier: { fr: 'Nectarinier', ar: 'نكتارين', icon: '🍑' },
};

/**
 * Contrôle multi-espèces strict : bloque un produit si AU MOINS UNE des espèces sélectionnées
 * est dans un stade bloqué (en précisant quelles espèces bloquent).
 */
export function checkMultiSpeciesProductStage(
  product: PhytoProductInfo,
  speciesStages: Array<{ species: PhytoCultureKey; stage: GrowthStage }>
): { blocked: boolean; blockingSpecies: PhytoCultureKey[]; reason?: string } {
  const blockingSpecies: PhytoCultureKey[] = [];
  let firstReason: string | undefined;
  for (const item of speciesStages) {
    const res = checkProductBlockedForGrowthStage(product, item.stage);
    if (res.blocked) {
      if (!blockingSpecies.includes(item.species)) blockingSpecies.push(item.species);
      if (!firstReason && res.reason) firstReason = res.reason;
    }
  }
  if (blockingSpecies.length > 0) {
    const namesFr = blockingSpecies.map((s) => SPECIES_LABELS[s].fr).join(', ');
    const namesAr = blockingSpecies.map((s) => SPECIES_LABELS[s].ar).join('، ');
    return {
      blocked: true,
      blockingSpecies,
      reason: `${firstReason || 'Bloqué au stade actuel'} (${namesFr} / ${namesAr})`,
    };
  }
  return { blocked: false, blockingSpecies: [] };
}

export type CropType = 'peche' | 'nectarine' | 'pomme' | 'olive';

export interface AgriculturalSeason {
  label: string;
  startYear: number;
  endYear: number;
  startDate: string;
  endDate: string;
}

/**
 * Calcule la campagne agricole réelle selon l'espèce :
 * - Pommier & Nectarinier : du 1er novembre (N) au 31 octobre (N+1)
 * - Olivier : du 1er décembre (N) au 30 novembre (N+1) (après récolte)
 */
export function getAgriculturalSeason(
  species?: string,
  date: Date | string = new Date()
): AgriculturalSeason {
  const d =
    typeof date === 'string'
      ? /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
        ? new Date(`${date.trim()}T12:00:00`)
        : new Date(date)
      : date;
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const year = safeDate.getFullYear();
  const month = safeDate.getMonth(); // 0 = Jan, 10 = Nov, 11 = Dec

  const sp = (species || '').toLowerCase();
  const isOlive = sp.includes('oliv');

  if (isOlive) {
    const startYear = month >= 11 ? year : year - 1;
    const endYear = startYear + 1;
    return {
      label: `${startYear}–${endYear}`,
      startYear,
      endYear,
      startDate: `${startYear}-12-01`,
      endDate: `${endYear}-11-30`,
    };
  }

  const startYear = month >= 10 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    label: `${startYear}–${endYear}`,
    startYear,
    endYear,
    startDate: `${startYear}-11-01`,
    endDate: `${endYear}-10-31`,
  };
}

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

/**
 * Stades phénologiques portant des fruits (seuls stades où le contrôle DAR / "Récolte proche" s'applique).
 * Les stades sans fruits (dormance, gonflement bourgeons, floraison, post-récolte, chute des feuilles)
 * ne doivent jamais déclencher d'alerte HARVEST ni de blocage DAR.
 */
export const FRUIT_BEARING_STAGES: GrowthStage[] = [
  'chute_petales_nouaison',
  'grossissement_fruit',
  'maturation',
];

export function isFruitBearingStage(stage?: GrowthStage): boolean {
  if (!stage) return true;
  return FRUIT_BEARING_STAGES.includes(stage);
}

/**
 * Détermine automatiquement le stade phénologique par défaut selon l'espèce, la date courante
 * et la date de récolte prévue éventuelle (calibré sur Ferme Malek — Benhar / Djelfa).
 * Si une date de récolte proche ou fraîchement passée est renseignée par l'utilisateur,
 * le stade phénologique s'adapte dynamiquement (Maturation, Grossissement ou Post-récolte).
 */
export function getDefaultPhenologicalStage(
  species: 'olivier' | 'olive' | 'pommier' | 'pomme' | 'nectarinier' | 'nectarine' | 'peche',
  date: Date = new Date(),
  harvestDateIso?: string
): GrowthStage {
  const isOlive = species === 'olivier' || species === 'olive';

  // 1. Si une date de récolte explicite est fournie, ajuster dynamiquement le stade physiologique
  if (harvestDateIso && /^\d{4}-\d{2}-\d{2}$/.test(harvestDateIso.trim())) {
    const todayNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const harvestNoon = new Date(`${harvestDateIso.trim()}T12:00:00`);
    if (!Number.isNaN(harvestNoon.getTime())) {
      const diffDays = Math.round((harvestNoon.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24));
      const maturationWindow = isOlive ? 40 : 35;
      const sizingWindow = isOlive ? 110 : 75;

      // Récolte imminente ou en cours (0 à 35–40 j avant récolte) → Maturation pré-récolte (DAR actif)
      if (diffDays >= 0 && diffDays <= maturationWindow) {
        return 'maturation';
      }
      // Grossissement du fruit (36–41 j à 75–110 j avant récolte) → Grossissement (DAR actif)
      if (diffDays > maturationWindow && diffDays <= sizingWindow) {
        return 'grossissement_fruit';
      }
      // Récolte tout juste terminée (dans les 35 derniers jours) → Post-récolte
      if (diffDays < 0 && diffDays >= -35) {
        return 'post_recolte';
      }
    }
  }

  // 2. Sinon, calendrier phénologique de référence par espèce
  const mmdd = (date.getMonth() + 1) * 100 + date.getDate();

  if (isOlive) {
    if (mmdd <= 228) return 'dormance';
    if (mmdd <= 425) return 'gonflement_bourgeons';
    if (mmdd <= 531) return 'floraison';
    if (mmdd <= 630) return 'chute_petales_nouaison';
    if (mmdd <= 1015) return 'grossissement_fruit';
    if (mmdd <= 1120) return 'maturation';
    if (mmdd <= 1215) return 'post_recolte';
    return 'dormance';
  }

  if (species === 'pommier' || species === 'pomme') {
    if (mmdd <= 220) return 'dormance';
    if (mmdd <= 320) return 'gonflement_bourgeons';
    if (mmdd <= 415) return 'floraison';
    if (mmdd <= 510) return 'chute_petales_nouaison';
    if (mmdd <= 720) return 'grossissement_fruit';
    if (mmdd <= 910) return 'maturation';
    if (mmdd <= 1025) return 'post_recolte';
    if (mmdd <= 1130) return 'chute_feuilles';
    return 'dormance';
  }

  // Nectarinier / Pêcher (Nablara & Redix 25)
  if (mmdd <= 131) return 'dormance';
  if (mmdd <= 210) return 'gonflement_bourgeons';
  if (mmdd <= 310) return 'floraison';
  if (mmdd <= 410) return 'chute_petales_nouaison';
  if (mmdd <= 605) return 'grossissement_fruit';
  if (mmdd <= 710) return 'maturation';
  if (mmdd <= 1020) return 'post_recolte';
  if (mmdd <= 1130) return 'chute_feuilles';
  return 'dormance';
}

export interface TreatmentActionRule {
  isRainExpectedSoon: boolean;    // Pluie > 20 mm prévue sous 48h (lessivage)
  hasVisibleSymptoms: boolean;    // Maladie déjà installée (action curative requise)
  isRapidShootsGrowth: boolean;   // Débourrement / Pousse rapide du printemps
  daysBeforeHarvest: number;      // Proximité de la récolte (< 15j pour sécurité DAR)
  oliveDestination?: 'huile' | 'table'; // Destination de la récolte (conflit de lipophilie)
  growthStage?: GrowthStage;      // Stade phénologique actif (désactive DAR hors stades fruitiers)
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
  phiDays: number; // Délai Avant Récolte standard / table (en jours)
  phiDaysOil?: number; // Délai Avant Récolte spécifique pour trituration / huile d'olive (en jours)
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
  status?: string; // Ex: 'executed' | 'accepted' | 'acceptee' | 'transferee' | 'envoyee' | 'pending' | 'rejetee'
}

/**
 * Vérifie qu'un traitement est réellement exécuté ou accepté (jamais "pending" / "envoyee" / "rejetee").
 * Utilisé pour la rotation anti-résistance (45 j), le quota saisonnier et l'historique phyto.
 */
export function isExecutedOrAcceptedStatus(status?: string | null): boolean {
  if (!status) return true;
  const s = status.trim().toLowerCase();
  if (
    s === 'envoyee' ||
    s === 'envoyée' ||
    s === 'pending' ||
    s === 'en_attente' ||
    s === 'en attente' ||
    s === 'rejetee' ||
    s === 'rejetée' ||
    s === 'rejected' ||
    s === 'annulee' ||
    s === 'annulée' ||
    s === 'cancelled'
  ) {
    return false;
  }
  return (
    s === 'executed' ||
    s === 'execute' ||
    s === 'exécuté' ||
    s === 'executee' ||
    s === 'exécutée' ||
    s === 'accepted' ||
    s === 'acceptee' ||
    s === 'acceptée' ||
    s === 'transferee' ||
    s === 'transférée' ||
    s === 'done' ||
    s === 'fait' ||
    s === 'termine' ||
    s === 'terminé' ||
    s === 'validee' ||
    s === 'validée'
  );
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
    warningNotice: 'Incompatibilité majeure Soufre + Huile minérale : Risque très grave de brûlures foliaires et nécrose des fruits. Respecter 21 jours d\'intervalle.',
  },
  {
    groupA: 'FRAC M04',      // Captane
    groupB: 'HUILE_MINERALE', // Huile blanche / minérale
    isCompatible: false,
    warningNotice: 'Incompatibilité absolue Captane + Huile minérale : Pénétration cuticulaire violente provoquant la destruction des tissus foliaires et du fruit. Délai de 21 jours obligatoire.',
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
  },
  {
    groupA: 'FRAC M02',      // Soufre
    groupB: 'CHALEUR_FORTE', // Forte chaleur (> 28°C)
    isCompatible: false,
    warningNotice: 'Alerte phytotoxicité Soufre par forte chaleur (> 28°C) : Dégagement de vapeurs soufrées provoquant des brûlures sur l’épiderme des pommes.',
  },
  {
    groupA: 'FRAC M01',      // Cuivre
    groupB: 'PRE_RECOLTE',   // Finition des fruits
    isCompatible: false,
    warningNotice: 'Alerte roussissure Cuivre en pré-récolte : Risque de rugosité (russeting) altérant la valeur marchande des fruits.',
  },
  {
    groupA: 'FRAC M01',      // Cuivre
    groupB: 'ENGRAIS_KNO3',  // Nitrate de potassium
    isCompatible: false,
    warningNotice: 'Incompatibilité Cuivre + Nitrate de Potassium (KNO3) : Effet de salinité ionique brutale provoquant la floculation de la bouillie et la libération massive d’ions Cu2+ phytotoxiques (brûlures des feuilles et des olives).',
  },
  {
    groupA: 'FRAC M01',      // Cuivre
    groupB: 'BORE_FOLIAIRE', // Bore foliaire
    isCompatible: false,
    warningNotice: 'Incompatibilité Cuivre + Bore : Le bore alcalinise le milieu (pH > 8.5), entraînant la précipitation irréversible du cuivre en boues insolubles, colmatage des buses et neutralisation de l’action fongicide.',
  }
];

// ==========================================
// 3. ORDRE OFFICIEL D'INCORPORATION EN CUVE
// ==========================================

export const TANK_MIX_ORDER_STEPS = [
  { step: 1, type: 'WSB', labelFr: 'Sachets hydrosolubles (WSB)', labelAr: 'الأكياس القابلة للذوبان في الماء (WSB)' },
  { step: 2, type: 'WG/WDG', labelFr: 'Granulés dispersibles dans l’eau (WG / WDG)', labelAr: 'الحبيبات القابلة للانتشار (WG / WDG)' },
  { step: 3, type: 'WP', labelFr: 'Poudres mouillables (WP)', labelAr: 'المساحيق القابلة للبلل (WP)' },
  { step: 4, type: 'SC/FL', labelFr: 'Suspensions concentrées (SC / FL)', labelAr: 'المعلقات المركزة (SC / FL)' },
  { step: 5, type: 'SP', labelFr: 'Poudres solubles (SP) — avant les huiles/EC', labelAr: 'المساحيق القابلة للذوبان (SP) — قبل المستحلبات' },
  { step: 6, type: 'EC/EW', labelFr: 'Concentrés émulsionnables (EC / EW)', labelAr: 'المستحلبات المركزة (EC / EW)' },
  { step: 7, type: 'SL', labelFr: 'Solutions liquides solubles (SL)', labelAr: 'المحاليل السائلة القابلة للذوبان (SL)' },
  { step: 8, type: 'ADJ', labelFr: 'Mouillants, Adjuvants et Engrais foliaires', labelAr: 'المواد الناشرة والمبللة والأسمدة الورقية في الأخير' },
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
    // 1. SÉCURITÉ ABSOLUE PRÉ-RÉCOLTE : Cueillette imminente (< 15 jours) — UNIQUEMENT sur stades avec fruits
    // Primauté de la santé publique et des LMR : éviter à tout prix les résidus chimiques
    if (isFruitBearingStage(conditions.growthStage) && conditions.daysBeforeHarvest < 15) {
      return {
        recommendedType: ['contact', 'translaminaire'],
        dominantReason: 'harvest',
        adviceNoticeFr: `Sécurité pré-récolte critique (${conditions.daysBeforeHarvest}j avant récolte) : Priorité absolue aux matières actives à DAR ultra-court (<= ${conditions.daysBeforeHarvest}j) ou contact non rémanent pour garantir l'absence de résidus chimiques dans les fruits récoltés.`,
        adviceNoticeAr: `أمان قصوى قبل الجني (${conditions.daysBeforeHarvest} أيام قبل القطف) : الأولوية الصارمة للمواد ذات فترة أمان قصيرة جداً (أقل من ${conditions.daysBeforeHarvest} أيام) أو مبيدات الملامسة سريعة التحلل لضمان خلو الثمار تماماً من المتبقيات.`,
        idealMixStrategyFr: 'Exclure impérativement toute matière dont le DAR dépasse le délai de récolte. Privilégier un produit biologique (ex: Bacillus) ou pénétrant à DAR court (ex: Émamectine 7j, Boscalide 7j).',
        idealMixStrategyAr: 'منع كلي لأي مادة يتجاوز أجل أمانها (DAR) موعد الجني. الأفضلية للمكافحة الحيوية (Bacillus) أو المواد سريعة التحلل (Emamectine 7j).',
      };
    }

    // 2. Priorité Curative : Infection active et symptômes visibles
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

    // 3. Alerte Lessivage Météo : Pluie > 20 mm imminente sous 48h
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
    growthStage?: GrowthStage;
    crop?: CropType;
    selectedSpecies?: PhytoCultureKey[];
    speciesStages?: Array<{ species: PhytoCultureKey; stage: GrowthStage }>;
  }) {
    const {
      targetPest,
      parcelHistory,
      allIngredients,
      currentSeasonYear,
      currentDate = new Date(),
      conditions,
      growthStage,
      crop,
      selectedSpecies,
      speciesStages,
    } = params;
    const isMultiSpecies = Array.isArray(selectedSpecies) && selectedSpecies.length > 1;

    const modeRecommendation = conditions ? PhytosanitaryEngine.recommendModeOfAction(conditions) : null;

    // Campagne agricole réelle par espèce (Pommier/Nectarinier : 1 nov → 31 oct ; Olivier : 1 déc → 30 nov)
    const effectiveSpeciesForSeason: string =
      crop ||
      selectedSpecies?.[0] ||
      (targetPest.crops.length === 1 ? targetPest.crops[0] : 'pommier');
    const activeSeason = getAgriculturalSeason(effectiveSpeciesForSeason, currentDate);

    // Récupérer UNIQUEMENT les traitements réellement exécutés ou acceptés durant cette campagne agricole
    // (exclut strictement "pending" / "envoyee" / "rejetee" de la rotation 45 j et du quota saisonnier)
    const currentSeasonLogs = parcelHistory.filter((log) => {
      if (!isExecutedOrAcceptedStatus(log.status)) return false;
      const logSeason = getAgriculturalSeason(effectiveSpeciesForSeason, log.date);
      return logSeason.label === activeSeason.label && log.targetPestId === targetPest.id;
    });

    // Dernier traitement effectué contre cette cible
    const lastApplication = currentSeasonLogs.length > 0
      ? [...currentSeasonLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;

    // Calculer les jours écoulés depuis le dernier traitement
    const daysSinceLastApp = lastApplication
      ? Math.floor((currentDate.getTime() - new Date(lastApplication.date).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Matières actives homologuées pour la cible (et en mode multi-espèces : INTERSECTION stricte sur PHYTO_DATABASE)
    const candidateIngredients = allIngredients.filter((ing) => {
      if (!targetPest.compatibleActiveIngredients.includes(ing.id)) return false;
      if (!isMultiSpecies || !selectedSpecies) return true;
      const ingNameNorm = ing.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const ingCode = (ing.codeGroup || '').toUpperCase().trim();
      const hasSharedSpecialty = PHYTO_DATABASE.some((p) => {
        if (!p.cultures || !selectedSpecies.every((sp) => p.cultures!.includes(sp))) return false;
        const pAct = (p.matiereActive || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const pCode = (p.codeGroup || '').toUpperCase().trim();
        return (
          (pAct && (pAct.includes(ingNameNorm) || ingNameNorm.includes(pAct.split('·')[0].trim()))) ||
          (pCode && pCode === ingCode)
        );
      });
      return hasSharedSpecialty;
    });

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

      // 1. PRIORITÉ ABSOLUE — QUOTA ANNUEL SAISONNIER (évalué AVANT la fenêtre glissante de 45 jours)
      // Les acaricides spécifiques IRAC 10A, 10B, 20B, 21A, 25A sont strictement plafonnés à 1 passage/saison
      const SINGLE_USE_ACARICIDE_CODES = ['10A', '10B', '20B', '21A', '25A'];
      const effectiveMaxPerSeason = ingredientCodes.some((c) => SINGLE_USE_ACARICIDE_CODES.includes(c))
        ? Math.min(1, ingredient.maxApplicationsPerSeason || 1)
        : ingredient.maxApplicationsPerSeason;

      let quotaBlocked = false;
      if (groupApplicationsCount >= effectiveMaxPerSeason) {
        isAllowed = false;
        quotaBlocked = true;
        blockReason = `Quota campagne ${activeSeason.label} atteint (${groupApplicationsCount}/${effectiveMaxPerSeason}) — bloqué pour éviter la résistance | تم بلوغ الحد الأقصى لحملة ${activeSeason.label} (${groupApplicationsCount}/${effectiveMaxPerSeason}) — ممنوع لتفادي المقاومة`;
        priorityScore = 0;
      }

      // 2. RÈGLE CRITIQUE ANTI-RÉSISTANCE (fenêtre glissante 45j, uniquement si le quota annuel n'est pas atteint)
      if (isAllowed && hasDirectCodeConflict) {
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
          // Plus de 45 jours écoulés (et quota annuel non atteint) : ré-autorisation possible avec avertissement
          priorityScore -= 20;
        }
      }

      // 3. RÈGLE CRITIQUE DE SANTÉ PUBLIQUE : Délai Avant Récolte (DAR Standard ou Spécial Huile d'Olive 28 j sur IRAC 3A)
      const PYRETHROID_3A_REGEX = /deltam[eé]thrin|cyperm[eé]thrin|lambda-?cyhalothrin|alpha-?cyperm[eé]thrin|esfenval[eé]rat|bifenthrin/i;
      const isOliveCrop =
        crop === 'olive' ||
        (isMultiSpecies && selectedSpecies?.includes('olivier')) ||
        conditions?.oliveDestination === 'huile' ||
        (crop === undefined && targetPest.crops.includes('olive'));
      const isPyrethroid3ALipophilic =
        ingredientCodes.includes('3A') ||
        PYRETHROID_3A_REGEX.test(ingredient.name || '') ||
        PYRETHROID_3A_REGEX.test(ingredient.commonNameFr || '');

      const baseDar = Number(ingredient.phiDays ?? 0);
      const isOliveOilPyrethroidDar = isOliveCrop && isPyrethroid3ALipophilic;
      const effectiveDar = isOliveOilPyrethroidDar
        ? Math.max(baseDar, ingredient.phiDaysOil ?? 0, 28)
        : (isOliveCrop && ingredient.phiDaysOil ? Math.max(baseDar, ingredient.phiDaysOil) : baseDar);

      const darLabelFr = isOliveOilPyrethroidDar
        ? `${effectiveDar} j (DAR spécial Huile d'Olive)`
        : `${effectiveDar} jours`;
      const darLabelAr = isOliveOilPyrethroidDar
        ? `${effectiveDar} يوم (DAR خاص بزيت الزيتون)`
        : `${effectiveDar} يوم`;

      let darBlocked = false;
      const daysToHarvest = conditions?.daysBeforeHarvest;
      const effectiveStage = growthStage ?? conditions?.growthStage;
      const anyFruitStage =
        isMultiSpecies && speciesStages && speciesStages.length > 0
          ? speciesStages.some((s) => isFruitBearingStage(s.stage))
          : isFruitBearingStage(effectiveStage);
      if (
        anyFruitStage &&
        daysToHarvest !== undefined &&
        Number.isFinite(daysToHarvest) &&
        effectiveDar > daysToHarvest
      ) {
        isAllowed = false;
        darBlocked = true;
        const frMsg = `⛔ DAR dépassé (DAR ${effectiveDar} j > ${daysToHarvest} j avant récolte)`;
        const arMsg = `⛔ ممنوع — فترة الأمان (${effectiveDar} يوم) أطول من المدة المتبقية للجني (${daysToHarvest} يوم)`;
        blockReason = `${frMsg} | ${arMsg}`;
        priorityScore = 0;
      }

      // 4. SÉCURITÉ ABEILLES EN FLORAISON (التزهير) + CONTRÔLE STADE PHÉNOLOGIQUE (PHYTO_DATABASE, multi-espèces strict)
      let beeBlock = false;
      let beeWarning = '';
      let stageBlocked = false;
      const floweringSpecies =
        isMultiSpecies && speciesStages && speciesStages.length > 0
          ? speciesStages.filter((s) => s.stage === 'floraison').map((s) => s.species)
          : growthStage === 'floraison'
            ? [crop === 'olive' ? 'olivier' : crop === 'pomme' ? 'pommier' : 'nectarinier'] as PhytoCultureKey[]
            : [];
      if (floweringSpecies.length > 0) {
        const isPyrethroid3A = ingredientCodes.includes('3A');
        const isNeonic4A = ingredientCodes.includes('4A');
        const spSuffix = isMultiSpecies
          ? ` (${floweringSpecies.map((s) => `${SPECIES_LABELS[s].fr}/${SPECIES_LABELS[s].ar}`).join(', ')})`
          : '';
        if (isPyrethroid3A) {
          isAllowed = false;
          beeBlock = true;
          blockReason = `ممنوع وقت التزهير — خطر على النحل${spSuffix} | Interdit en floraison : Pyréthrinoïde (IRAC 3A) hautement toxique pour les abeilles${spSuffix}.`;
          priorityScore = 0;
        } else if (isNeonic4A) {
          beeWarning = `تحذير نحل (IRAC 4A)${spSuffix} : مادة حساسة وقت التزهير — تجنب الرش نهاراً أثناء نشاط النحل (رش ليلاً فقط أو استبدلها بمبيد انتقائي).`;
          priorityScore = Math.max(10, priorityScore - 25);
        }
      }

      // Vérification complémentaire via PHYTO_DATABASE & isProductBlockedAtStage() (multi-espèces : le plus strict prime)
      const stagesToCheck: Array<{ species: PhytoCultureKey; stage: GrowthStage }> =
        isMultiSpecies && speciesStages && speciesStages.length > 0
          ? speciesStages
          : growthStage
            ? [{ species: (crop === 'olive' ? 'olivier' : crop === 'pomme' ? 'pommier' : 'nectarinier'), stage: growthStage }]
            : [];

      if (isAllowed && stagesToCheck.length > 0) {
        const ingNameNorm = ingredient.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const matchingDbProducts = PHYTO_DATABASE.filter((p) => {
          if (isMultiSpecies && selectedSpecies && (!p.cultures || !selectedSpecies.every((sp) => p.cultures!.includes(sp)))) {
            return false;
          }
          const pAct = (p.matiereActive || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const pCode = (p.codeGroup || '').toUpperCase().trim();
          const ingCode = (ingredient.codeGroup || '').toUpperCase().trim();
          return (pAct && (pAct.includes(ingNameNorm) || ingNameNorm.includes(pAct.split('·')[0].trim()))) || (pCode && pCode === ingCode);
        });
        if (matchingDbProducts.length > 0) {
          const blockedChecks = matchingDbProducts.map((p) => checkMultiSpeciesProductStage(p, stagesToCheck));
          if (blockedChecks.every((c) => c.blocked)) {
            const firstReason = blockedChecks.find((c) => c.reason)?.reason;
            isAllowed = false;
            stageBlocked = true;
            blockReason = firstReason || `Produit bloqué au stade phénologique sélectionné.`;
            priorityScore = 0;
          }
        }
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
        isBlocked: !isAllowed,
        isMultiSite,
        systemicType: ingredient.systemicType,
        isSituationallyRecommended,
        blockReason,
        beeBlock,
        beeWarning,
        stageBlocked,
        quotaBlocked,
        darBlocked,
        effectiveDar,
        isOliveOilPyrethroidDar,
        darLabelFr,
        darLabelAr,
        effectiveMaxPerSeason,
        agriculturalSeason: activeSeason.label,
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
 * en utilisant import.meta.env.BASE_URL (compatible local + GitHub Pages /doula-agro/ sur toutes les routes).
 */
export function resolvePhytoImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const rawBase =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  let effectiveBase = rawBase;
  if (rawBase === './' || rawBase === '.') {
    if (typeof window !== 'undefined' && /^\/doula-agro(\/|$)/.test(window.location.pathname)) {
      effectiveBase = '/doula-agro/';
    } else {
      effectiveBase = '/';
    }
  }
  const cleanBase = effectiveBase.endsWith('/') ? effectiveBase : `${effectiveBase}/`;
  const cleanPath = url.replace(/^\/+/, '');
  return `${cleanBase}${cleanPath}`;
}

/**
 * Associe chaque bioagresseur à sa véritable photographie de terrain (100% photo réelle).
 * Fini les schémas 3D / SVG : chargement instantané de vraies photos en verger.
 */
export const REAL_PEST_PHOTOS_MAP: Record<string, string> = {
  // Nectarine / Pêche
  nec_cloque: 'assets/phyto/photos/nec_cloque.jpg',
  nec_chancre_bacterien: 'assets/phyto/photos/oli_bacteriose.jpg',
  nec_cochenille_blanche: 'assets/phyto/photos/nec_cochenille_blanche.jpg',
  nec_coryneum: 'assets/phyto/photos/nec_coryneum.jpg',
  nec_tetranyque_tisserand: 'assets/phyto/photos/pom_acariens.jpg',
  nec_monilia_fleur: 'assets/phyto/photos/nec_monilia.jpg',
  nec_monilia_fruit: 'assets/phyto/photos/nec_monilia.jpg',
  nec_thrips: 'assets/phyto/photos/nec_thrips.jpg',
  nec_oidium: 'assets/phyto/photos/nec_oidium.jpg',
  nec_puceron_vert: 'assets/phyto/photos/pom_pucerons.jpg',
  nec_tordeuse_orientale: 'assets/phyto/photos/nec_tordeuse.jpg',
  nec_rouille: 'assets/phyto/photos/nec_coryneum.jpg',
  nec_petite_mineuse: 'assets/phyto/photos/pom_mineuse.jpg',
  nec_ceratite: 'assets/phyto/photos/nec_ceratite.jpg',

  // Pommier
  pom_tavelure: 'assets/phyto/photos/pom_tavelure.jpg',
  pom_feu_bacterien: 'assets/phyto/photos/pom_feu_bacterien.jpg',
  pom_carpocapse: 'assets/phyto/photos/pom_carpocapse.jpg',
  pom_puceron_cendre: 'assets/phyto/photos/pom_pucerons.jpg',
  pom_puceron_lanigere: 'assets/phyto/photos/pom_pucerons.jpg',
  pom_oidium: 'assets/phyto/photos/pom_oidium.jpg',
  pom_acarien_rouge: 'assets/phyto/photos/pom_acarien_rouge.jpg',
  pom_psylle: 'assets/phyto/photos/pom_psylle.jpg',
  pom_mineuse: 'assets/phyto/photos/pom_mineuse.jpg',
  pom_pou_san_jose: 'assets/phyto/photos/pom_pou_san_jose.jpg',
  pom_botrytis: 'assets/phyto/photos/pom_botrytis.jpg',
  pom_zeuzere: 'assets/phyto/photos/pom_zeuzere.jpg',
  pom_aleurode: 'assets/phyto/photos/pom_aleurode.jpg',
  pom_tordeuse: 'assets/phyto/photos/pom_tordeuse.jpg',

  // Olivier
  oli_oeil_paon: 'assets/phyto/photos/oli_oeil_paon.jpg',
  oli_tuberculose: 'assets/phyto/photos/oli_bacteriose.jpg',
  oli_psylle: 'assets/phyto/photos/oli_psylle.jpg',
  oli_teigne: 'assets/phyto/photos/oli_teigne.jpg',
  oli_mouche: 'assets/phyto/photos/oli_mouche.jpg',
  oli_anthracnose: 'assets/phyto/photos/oli_anthracnose.jpg',
  oli_cochenille_noire: 'assets/phyto/photos/oli_cochenille.jpg',
  oli_thrips: 'assets/phyto/photos/oli_thrips.jpg',
  oli_limaces: 'assets/phyto/photos/oli_limaces.jpg',
};

export function getPestVisualAsset(pest: { id: string; category?: string; primarySampleUrl?: string }): string {
  // 1. Priorité absolue aux vraies photographies locales embarquées (fonctionne hors-ligne & sans liens externes cassés)
  const realPhoto = REAL_PEST_PHOTOS_MAP[pest.id];
  if (realPhoto) {
    const resolved = resolvePhytoImageUrl(realPhoto);
    if (resolved) return resolved;
  }
  // 2. Sinon URL spécifique si définie et non SVG
  if (pest.primarySampleUrl && !pest.primarySampleUrl.endsWith('.svg') && !pest.primarySampleUrl.startsWith('data:image/svg')) {
    const resolved = resolvePhytoImageUrl(pest.primarySampleUrl);
    if (resolved) return resolved;
  }
  // 3. Fallback photographique propre
  const defaultPhoto = resolvePhytoImageUrl('assets/phyto/photos/pom_tavelure.jpg');
  return defaultPhoto || '';
}

// ==========================================
// 10. CONTRÔLE TEMPOREL, ROTATION FRAC/IRAC & QUOTA (PENDING + ACCEPTED + EXECUTED)
// ==========================================

export interface PhytoTemporalConflict {
  isBlocking: boolean;
  rule: 'interval_14d' | 'rotation_group' | 'quota_season' | 'multisite_notice';
  productName: string;
  conflictProductName: string;
  conflictDate: string;
  conflictStatus: string;
  sharedCode?: string;
  daysDiff?: number;
  title: string;
  message: string;
}

const MULTISITE_CODE_RE = /\b(FRAC\s*M0?[1-9]|IRAC\s*UN|ADJUVANT|ATTRACTIF)\b/i;

function normalizePhytoStr(v: string | undefined): string {
  return (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extractActiveTokens(productName: string): string[] {
  const fromMap = getMatiereActive(productName);
  const dbMatch = PHYTO_DATABASE.find((p) => normalizePhytoStr(p.name) === normalizePhytoStr(productName));
  const raw = fromMap || dbMatch?.matiereActive || '';
  if (!raw) return [];
  return raw
    .split('+')
    .map((part) => normalizePhytoStr(part.split('·')[0]).replace(/[^a-z0-9\s-]/g, '').trim())
    .filter((t) => t.length >= 3);
}

function extractResistanceCodes(productName: string): string[] {
  const code = getIracFracCode(productName);
  const dbMatch = PHYTO_DATABASE.find((p) => normalizePhytoStr(p.name) === normalizePhytoStr(productName));
  const raw = code || COMMERCIAL_TO_ACTIVE[productName]?.codeGroup || dbMatch?.codeGroup || '';
  if (!raw) return [];
  return raw
    .split('+')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

function isMultisiteCode(code: string): boolean {
  return MULTISITE_CODE_RE.test(code);
}

function getMaxPerSeasonForProduct(productName: string): number | null {
  const dbMatch = PHYTO_DATABASE.find((p) => normalizePhytoStr(p.name) === normalizePhytoStr(productName));
  if (dbMatch?.maxPerSeason && dbMatch.maxPerSeason > 0) return dbMatch.maxPerSeason;
  return null;
}

function normalizeCropTokens(groups: string[], parcelIds: string[] = []): Set<string> {
  const set = new Set<string>();
  const all = [...groups, ...parcelIds].map((x) => normalizePhytoStr(String(x)));
  for (const s of all) {
    if (!s) continue;
    if (s.includes('oliv') || /^p[1-4]$/.test(s)) {
      set.add('oliviers');
    } else if (s.includes('pomm') || s === 'p7' || s === 'p8') {
      set.add('pommiers');
    } else if (s.includes('nablara') || s === 'p5') {
      set.add('nablara');
    } else if (s.includes('redix') || s === 'p6') {
      set.add('redix25');
    } else if (s.includes('nectar')) {
      set.add('nablara');
      set.add('redix25');
    } else {
      set.add(s);
    }
  }
  return set;
}

function cropSetsOverlap(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  for (const item of a) {
    if (b.has(item)) return true;
  }
  return false;
}

function daysBetweenISO(dateA: string, dateB: string): number {
  const a = new Date(`${dateA.slice(0, 10)}T12:00:00`).getTime();
  const b = new Date(`${dateB.slice(0, 10)}T12:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 9999;
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

function isActiveRecoStatus(status: string | undefined): boolean {
  const s = normalizePhytoStr(status);
  if (!s) return true;
  return !['refusee', 'refused', 'rejected', 'annulee', 'cancelled', 'deleted'].includes(s);
}

export function evaluatePhytoTemporalConflicts(params: {
  proposedProducts: Array<{ product: string; date: string; passageLabel?: string }>;
  targetCropGroups: string[];
  allRecommendations: any[];
  modulePhytoRecords?: any[];
  excludeRecoId?: string | null;
  lang?: 'fr' | 'ar';
}): PhytoTemporalConflict[] {
  const {
    proposedProducts,
    targetCropGroups,
    allRecommendations,
    modulePhytoRecords = [],
    excludeRecoId = null,
    lang = 'fr',
  } = params;

  const isAr = lang === 'ar';
  const targetTokens = normalizeCropTokens(targetCropGroups);
  if (targetTokens.size === 0 || proposedProducts.length === 0) return [];

  // 1. Collecter tous les traitements phyto actifs (pending + accepted + executed) sur les mêmes parcelles
  interface ExistingApp {
    productName: string;
    date: string;
    status: string;
    activeTokens: string[];
    codes: string[];
  }

  const existingApps: ExistingApp[] = [];
  const handledRecoIds = new Set<string>();

  for (const r of allRecommendations || []) {
    if (!r || r.kind !== 'phytosanitaire') continue;
    if (excludeRecoId && r.id === excludeRecoId) continue;
    if (!isActiveRecoStatus(r.status)) continue;

    const payload = (r.payload || {}) as any;
    const rawGroups = Array.isArray(payload.crop_group)
      ? payload.crop_group
      : payload.crop_group
        ? [payload.crop_group]
        : [];
    const recoTokens = normalizeCropTokens(rawGroups, Array.isArray(r.parcel_ids) ? r.parcel_ids : []);
    if (!cropSetsOverlap(targetTokens, recoTokens)) continue;

    handledRecoIds.add(r.id);

    const prog = payload.program || {};
    const appDate = String(prog.date || r.created_at || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appDate)) continue;

    const prods = Array.isArray(prog.products)
      ? prog.products
      : Array.isArray(payload.products)
        ? payload.products
        : [];

    for (const p of prods) {
      const pName = String(p?.product || p?.name || '').trim();
      if (!pName) continue;
      existingApps.push({
        productName: pName,
        date: appDate,
        status: String(r.status || 'envoyee'),
        activeTokens: extractActiveTokens(pName),
        codes: extractResistanceCodes(pName),
      });
    }
  }

  for (const rec of modulePhytoRecords || []) {
    if (!rec) continue;
    if (rec.reco_id && (handledRecoIds.has(rec.reco_id) || (excludeRecoId && rec.reco_id === excludeRecoId))) {
      continue;
    }
    const recTokens = normalizeCropTokens([], [String(rec.parcelId || rec.parcel_id || '')]);
    if (!cropSetsOverlap(targetTokens, recTokens)) continue;
    const modDate = String(rec.executed_at || rec.executedAt || rec.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(modDate)) continue;

    const list = Array.isArray(rec.products) ? rec.products : [];
    for (const p of list) {
      const pName = String(p?.product || p?.name || '').trim();
      if (!pName) continue;
      existingApps.push({
        productName: pName,
        date: modDate,
        status: String(rec.status || 'executed'),
        activeTokens: extractActiveTokens(pName),
        codes: extractResistanceCodes(pName),
      });
    }
  }

  const conflicts: PhytoTemporalConflict[] = [];
  const seenConflictKeys = new Set<string>();

  const pushUnique = (c: PhytoTemporalConflict) => {
    const key = `${c.rule}|${normalizePhytoStr(c.productName)}|${c.conflictDate}|${c.sharedCode || ''}`;
    if (seenConflictKeys.has(key)) return;
    seenConflictKeys.add(key);
    conflicts.push(c);
  };

  // Trier l'historique par date décroissante pour identifier le traitement immédiatement précédent
  const sortedExisting = [...existingApps].sort((a, b) => b.date.localeCompare(a.date));

  for (const prop of proposedProducts) {
    const prodName = (prop.product || '').trim();
    const propDate = String(prop.date || '').slice(0, 10);
    if (!prodName || !/^\d{4}-\d{2}-\d{2}$/.test(propDate)) continue;

    const propNormName = normalizePhytoStr(prodName);
    const propActives = extractActiveTokens(prodName);
    const propCodes = extractResistanceCodes(prodName);
    const propSingleSiteCodes = propCodes.filter((c) => !isMultisiteCode(c));

    // A. Vérifier intervalle <= 14 jours (même produit ou même matière active)
    for (const ex of sortedExisting) {
      const diff = Math.abs(daysBetweenISO(propDate, ex.date));
      const sameProd = normalizePhytoStr(ex.productName) === propNormName;
      const sameActive =
        propActives.length > 0 &&
        ex.activeTokens.length > 0 &&
        propActives.some((a) => ex.activeTokens.includes(a));

      if ((sameProd || sameActive) && diff <= 14) {
        pushUnique({
          isBlocking: true,
          rule: 'interval_14d',
          productName: prodName,
          conflictProductName: ex.productName,
          conflictDate: ex.date,
          conflictStatus: ex.status,
          daysDiff: diff,
          title: isAr
            ? `⛔ تكرار ممنوع خلال ≤ 14 يوماً (${prodName})`
            : `⛔ Répétition interdite à ≤ 14 jours (${prodName})`,
          message: isAr
            ? `⛔ لا يمكن تكرار ${prodName} أو نفس المادة الفعالة خلال أقل من 14 يوماً (توجد توصية بتاريخ ${ex.date} — ${ex.productName}).`
            : `⛔ Impossible de répéter ${prodName} ou la même matière active à ≤ 14 jours d'écart (recommandation existante le ${ex.date} — ${ex.productName}).`,
        });
      }
    }

    // B. Vérifier même groupe FRAC/IRAC consécutif ou < 45 jours (hors multisites M01/M02/M04/M09)
    if (propSingleSiteCodes.length > 0) {
      const priorBeforeDate = sortedExisting.filter((ex) => ex.date <= propDate);
      const immediatePrevDate = priorBeforeDate.length > 0 ? priorBeforeDate[0].date : null;

      for (const ex of sortedExisting) {
        const sharedCodes = propSingleSiteCodes.filter((c) => ex.codes.includes(c));
        if (sharedCodes.length === 0) continue;

        const diff = Math.abs(daysBetweenISO(propDate, ex.date));
        const isConsecutive = immediatePrevDate !== null && ex.date === immediatePrevDate;

        if (diff < 45 || isConsecutive) {
          const sharedStr = sharedCodes.join(' + ');
          pushUnique({
            isBlocking: true,
            rule: 'rotation_group',
            productName: prodName,
            conflictProductName: ex.productName,
            conflictDate: ex.date,
            conflictStatus: ex.status,
            sharedCode: sharedStr,
            daysDiff: diff,
            title: isAr
              ? `⛔ حظر تناوب مجموعة المقاومة (${sharedStr})`
              : `⛔ Rotation FRAC/IRAC obligatoire (${sharedStr})`,
            message: isAr
              ? `⛔ لا يمكن تكرار ${prodName} أو نفس مجموعة المقاومة (${sharedStr}) خلال أقل من 45 يوماً أو بشكل متتالي (توجد توصية بتاريخ ${ex.date} — ${ex.productName}).`
              : `⛔ Impossible de répéter le groupe ${sharedStr} (${prodName}) à moins de 45 jours ou consécutivement (recommandation existante le ${ex.date} — ${ex.productName}).`,
          });
        }
      }
    }

    // C. Vérifier quota annuel max/saison
    const maxPerSeason = getMaxPerSeasonForProduct(prodName);
    if (maxPerSeason) {
      const primarySpecies = targetTokens.has('oliviers') ? 'olivier' : 'pommier';
      const season = getAgriculturalSeason(primarySpecies, propDate);
      const sameSeasonApps = sortedExisting.filter((ex) => {
        if (ex.date < season.startDate || ex.date > season.endDate) return false;
        const sameProd = normalizePhytoStr(ex.productName) === propNormName;
        const sameActive =
          propActives.length > 0 &&
          ex.activeTokens.length > 0 &&
          propActives.some((a) => ex.activeTokens.includes(a));
        return sameProd || sameActive;
      });
      if (sameSeasonApps.length >= maxPerSeason) {
        const lastDate = sameSeasonApps[0].date;
        pushUnique({
          isBlocking: true,
          rule: 'quota_season',
          productName: prodName,
          conflictProductName: sameSeasonApps[0].productName,
          conflictDate: lastDate,
          conflictStatus: sameSeasonApps[0].status,
          title: isAr
            ? `⛔ تم بلوغ الحد الأقصى السنوي (${sameSeasonApps.length}/${maxPerSeason})`
            : `⛔ Quota annuel atteint (${sameSeasonApps.length}/${maxPerSeason})`,
          message: isAr
            ? `⛔ تم تجاوز الحد الأقصى السنوي لـ ${prodName} (${sameSeasonApps.length}/${maxPerSeason} في الموسم ${season.label} — آخر توصية بتاريخ ${lastDate}).`
            : `⛔ Quota annuel dépassé pour ${prodName} (${sameSeasonApps.length}/${maxPerSeason} autorisé(s) sur la campagne ${season.label} — dernière recommandation le ${lastDate}).`,
        });
      }
    }
  }

  return conflicts;
}
