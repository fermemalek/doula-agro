import { PhytosanitaryEngine, TreatmentActionRule, SprayApplicationRecord, TANK_MIX_COMPATIBILITY_RULES } from '../src/lib/phyto/engine.ts';
import { PEST_TARGETS_DATABASE, ACTIVE_INGREDIENTS_DATABASE } from '../src/lib/phyto/database.ts';

// 1. Définition du contexte temporel
const currentDate = new Date('2026-08-20T09:00:00Z');
const date14DaysAgo = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);
const date28DaysAgo = new Date(currentDate.getTime() - 28 * 24 * 60 * 60 * 1000);

// 2. Cibles
const tavelurePest = PEST_TARGETS_DATABASE.find(p => p.id === 'pom_tavelure')!;
const carpocapsePest = PEST_TARGETS_DATABASE.find(p => p.id === 'pom_carpocapse')!;

// 3. Conditions de terrain saisies
const conditions: TreatmentActionRule = {
  hasVisibleSymptoms: true,    // Début de réapparition de taches sur feuilles hautes
  isRainExpectedSoon: false,   // Période sèche et chaude (aucune pluie)
  isRapidShootsGrowth: false,  // Fruits formés en finition
  daysBeforeHarvest: 10,       // Récolte prévue dans exactement 10 jours
};

// 4. Historique réel de la parcelle
const parcelHistory: SprayApplicationRecord[] = [
  // Il y a 28 jours : Coragen (Chlorantraniliprole - IRAC 28)
  {
    id: 'hist-28d',
    parcelId: 'parcelle-pomme-04',
    crop: 'pomme',
    date: date28DaysAgo.toISOString(),
    targetPestId: carpocapsePest.id,
    activeIngredientId: 'ing_chlorantraniliprole',
    codeGroup: 'IRAC 28',
    multiCodes: ['28'],
  },
  // Il y a 14 jours : Score (Difénoconazole - FRAC 3)
  {
    id: 'hist-14d-fungi',
    parcelId: 'parcelle-pomme-04',
    crop: 'pomme',
    date: date14DaysAgo.toISOString(),
    targetPestId: tavelurePest.id,
    activeIngredientId: 'ing_difenoconazole',
    codeGroup: 'FRAC 3',
    multiCodes: ['3'],
  },
  // Il y a 14 jours : Mospilan (Acétamipride - IRAC 4A)
  {
    id: 'hist-14d-insect',
    parcelId: 'parcelle-pomme-04',
    crop: 'pomme',
    date: date14DaysAgo.toISOString(),
    targetPestId: carpocapsePest.id,
    activeIngredientId: 'ing_acetamipride',
    codeGroup: 'IRAC 4A',
    multiCodes: ['4A'],
  }
];

// 5. Évaluation de l'arbre de décision
const modeDecision = PhytosanitaryEngine.recommendModeOfAction(conditions);

// 6. Évaluation Tavelure (Fongicide)
const evalTavelure = PhytosanitaryEngine.evaluateTreatmentOptions({
  targetPest: tavelurePest,
  parcelHistory,
  allIngredients: ACTIVE_INGREDIENTS_DATABASE,
  currentSeasonYear: 2026,
  currentDate,
  conditions,
});

// 7. Évaluation Carpocapse (Insecticide)
const evalCarpocapse = PhytosanitaryEngine.evaluateTreatmentOptions({
  targetPest: carpocapsePest,
  parcelHistory,
  allIngredients: ACTIVE_INGREDIENTS_DATABASE,
  currentSeasonYear: 2026,
  currentDate,
  conditions,
});

// 8. Test d'alertes d'incompatibilité de cuve (Tank Mix)
const tankMixAlerts = [
  {
    association: 'Captane (Fongicide) + Huile Blanche Minérale',
    resultat: TANK_MIX_COMPATIBILITY_RULES.find(r => 
      (r.groupA === 'FRAC M04' && r.groupB === 'HUILE_MINERALE') ||
      (r.groupB === 'FRAC M04' && r.groupA === 'HUILE_MINERALE')
    )
  },
  {
    association: 'Soufre (Fongicide) + Forte Chaleur (> 28°C)',
    resultat: TANK_MIX_COMPATIBILITY_RULES.find(r => 
      (r.groupA === 'FRAC M02' && r.groupB === 'CHALEUR_FORTE') ||
      (r.groupB === 'FRAC M02' && r.groupA === 'CHALEUR_FORTE')
    )
  },
  {
    association: 'Cuivre (Bouillie bordelaise) + Pommes en finition pré-récolte',
    resultat: TANK_MIX_COMPATIBILITY_RULES.find(r => 
      (r.groupA === 'FRAC M01' && r.groupB === 'PRE_RECOLTE') ||
      (r.groupB === 'FRAC M01' && r.groupA === 'PRE_RECOLTE')
    )
  }
];

// Synthèse complète
const stressTestReport = {
  contexte: {
    culture: 'Pommier (Malus domestica)',
    recolteDansJours: conditions.daysBeforeHarvest,
    meteo: 'Sec et chaud, aucune pluie sous 10 jours',
    ciblesSimultanees: [
      'Tavelure du pommier (Venturia inaequalis)',
      'Carpocapse des pommes (Cydia pomonella - 2e génération)'
    ]
  },
  arbreDecisionContactVsSystemique: {
    modeRecommande: modeDecision.recommendedType,
    raisonDominante: modeDecision.dominantReason,
    avisTechniqueFr: modeDecision.adviceNoticeFr,
    strategieMixFr: modeDecision.idealMixStrategyFr,
  },
  analyseTavelure_Fongicides: evalTavelure.map(res => ({
    matiere: res.ingredient.name,
    codeFRAC: res.ingredient.codeGroup,
    darJours: res.ingredient.phiDays,
    recolteAutoriseeLe: new Date(currentDate.getTime() + res.ingredient.phiDays * 24 * 3600 * 1000).toISOString().split('T')[0],
    statut: res.isAllowed ? 'AUTORISÉ (Recommandé)' : 'BLOQUÉ',
    motif: res.blockReason || 'Autorisé et conforme DAR & FRAC',
    score: res.priorityScore
  })),
  analyseCarpocapse_Insecticides: evalCarpocapse.map(res => ({
    matiere: res.ingredient.name,
    codeIRAC: res.ingredient.codeGroup,
    darJours: res.ingredient.phiDays,
    recolteAutoriseeLe: new Date(currentDate.getTime() + res.ingredient.phiDays * 24 * 3600 * 1000).toISOString().split('T')[0],
    statut: res.isAllowed ? 'AUTORISÉ (Recommandé)' : 'BLOQUÉ',
    motif: res.blockReason || 'Autorisé et conforme DAR & IRAC',
    score: res.priorityScore
  })),
  alertesIncompatibilitesTankMix: tankMixAlerts.map(a => ({
    combinaison: a.association,
    compatible: a.resultat?.isCompatible ?? true,
    avertissementExpert: a.resultat?.warningNotice ?? 'Aucune alerte spécifique'
  }))
};

console.log(JSON.stringify(stressTestReport, null, 2));
