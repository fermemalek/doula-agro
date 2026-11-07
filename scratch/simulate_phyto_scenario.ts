import { PhytosanitaryEngine, TreatmentActionRule, SprayApplicationRecord } from '../src/lib/phyto/engine.ts';
import { PEST_TARGETS_DATABASE, ACTIVE_INGREDIENTS_DATABASE, COMMERCIAL_PRODUCTS_DZ } from '../src/lib/phyto/database.ts';

// 1. Définition du scénario demandé
const currentDate = new Date('2026-05-15T10:00:00Z'); // Simulation au mois de mai (grossissement des fruits)
const tenDaysAgo = new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000);

// Cible : Moniliose
const targetPest = PEST_TARGETS_DATABASE.find(p => p.id === 'nec_monilia_fruit') || PEST_TARGETS_DATABASE.find(p => p.nameScientific.includes('Monilinia'))!;

// Conditions réelles de terrain saisies par l'utilisateur
const conditions: TreatmentActionRule = {
  hasVisibleSymptoms: true,    // "Des symptômes sont déjà visibles sur quelques fruits"
  isRainExpectedSoon: true,    // "Une forte pluie est annoncée sous 48h"
  isRapidShootsGrowth: true,   // Stade grossissement actif
  daysBeforeHarvest: 35,       // Grossissement (environ 35 jours avant récolte)
};

// Historique de la parcelle : Il y a 10 jours, Tébuconazole (FRAC 3) a été pulvérisé
const parcelHistory: SprayApplicationRecord[] = [
  {
    id: 'reco-hist-001',
    parcelId: 'parcelle-nectarine-01',
    crop: 'nectarine',
    date: tenDaysAgo.toISOString(),
    targetPestId: targetPest.id,
    activeIngredientId: 'ing_tebuconazole',
    codeGroup: '3',
    multiCodes: ['3'],
  }
];

// 2. Évaluation de l'arbre de décision agronomique
const modeDecision = PhytosanitaryEngine.recommendModeOfAction(conditions);

// 3. Évaluation scientifique complète du moteur phytosanitaire
const evaluatedResults = PhytosanitaryEngine.evaluateTreatmentOptions({
  targetPest,
  parcelHistory,
  allIngredients: ACTIVE_INGREDIENTS_DATABASE,
  currentSeasonYear: 2026,
  currentDate,
  conditions,
});

// 4. Produits commerciaux DZ correspondants
const commercialProducts = COMMERCIAL_PRODUCTS_DZ.filter(cp => 
  cp.crops.includes('nectarine') && cp.targetPests.some(t => t.toLowerCase().includes('monili'))
);

// Formatage de la sortie JSON pour vérification
const simulationReport = {
  scenario: {
    verger: 'Nectariniers (Prunus persica)',
    stade: 'Grossissement des fruits',
    bioagresseur: {
      nomFr: targetPest.nameFr,
      nomAr: targetPest.nameAr,
      nomScientifique: targetPest.nameScientific,
    },
    conditionsTerrain: {
      symptomesVisibles: conditions.hasVisibleSymptoms,
      pluieImminenteSous48h: conditions.isRainExpectedSoon,
      delaiAvantRecolteJours: conditions.daysBeforeHarvest,
    },
    historiqueParcelle: {
      traitementPrecedent: 'Tébuconazole (Score / Folicur - FRAC 3)',
      dateTraitementPrecedent: tenDaysAgo.toISOString().split('T')[0],
      joursEcoules: 10,
    }
  },
  arbreDecisionContactVsSystemique: {
    modeRecommande: modeDecision.recommendedType,
    raisonDominante: modeDecision.dominantReason,
    avisTechniqueFr: modeDecision.adviceNoticeFr,
    avisTechniqueAr: modeDecision.adviceNoticeAr,
    strategieCuveTankMixFr: modeDecision.idealMixStrategyFr,
    strategieCuveTankMixAr: modeDecision.idealMixStrategyAr,
  },
  matieresActivesEvaluees: evaluatedResults.map(res => {
    const phiDays = res.ingredient.phiDays;
    const dateSecurite = new Date(currentDate.getTime() + phiDays * 24 * 60 * 60 * 1000);
    return {
      matiereActive: res.ingredient.name,
      familleChimique: res.ingredient.familyChemical,
      groupeFRAC: res.ingredient.codeGroup,
      modePhysique: res.systemicType,
      statutAutorisation: res.isAllowed ? 'AUTORISÉ (Recommandé)' : 'BLOQUÉ / INTERDIT (Anti-Résistance)',
      estAdapteSituationActuelle: res.isSituationallyRecommended,
      scorePriorite: res.priorityScore,
      motifBlocageOuAlerte: res.blockReason || 'Aucun blocage - Conforme aux règles FRAC',
      delaiAvantRecolte_DAR: `${phiDays} jours`,
      dateRecolteSecurisee: dateSecurite.toISOString().split('T')[0],
    };
  })
};

console.log(JSON.stringify(simulationReport, null, 2));
