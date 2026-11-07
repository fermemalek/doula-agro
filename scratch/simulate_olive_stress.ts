import { PhytosanitaryEngine, TreatmentActionRule, SprayApplicationRecord, TANK_MIX_COMPATIBILITY_RULES } from '../src/lib/phyto/engine.ts';
import { PEST_TARGETS_DATABASE, ACTIVE_INGREDIENTS_DATABASE } from '../src/lib/phyto/database.ts';

// 1. Contexte temporel
const currentDate = new Date('2026-10-10T10:00:00Z');
const date20DaysAgo = new Date(currentDate.getTime() - 20 * 24 * 60 * 60 * 1000);
const date45DaysAgo = new Date(currentDate.getTime() - 45 * 24 * 60 * 60 * 1000);

// 2. Cibles
const mouchePest = PEST_TARGETS_DATABASE.find(p => p.id === 'oli_mouche')!;
const oeilPaonPest = PEST_TARGETS_DATABASE.find(p => p.id === 'oli_oeil_paon')!;

// 3. Conditions réelles de terrain
const conditions: TreatmentActionRule = {
  hasVisibleSymptoms: true,    // Piqûres fraîches 8% + taches d'œil de paon
  isRainExpectedSoon: true,    // 35 mm de pluie intermittente d'automne prévus sur 5 jours
  isRapidShootsGrowth: false,  // Stade véraison / maturation des olives
  daysBeforeHarvest: 21,       // Récolte prévue dans exactement 21 jours
  oliveDestination: 'huile',   // DESTINATION HUILE D'OLIVE EXTRA-VIERGE (Conflit Lipophilie)
};

// 4. Historique de la parcelle
const parcelHistory: SprayApplicationRecord[] = [
  // Il y a 45 jours : Oxychlorure de cuivre (FRAC M01)
  {
    id: 'hist-olive-45d',
    parcelId: 'parcelle-chemlal-01',
    crop: 'olive',
    date: date45DaysAgo.toISOString(),
    targetPestId: oeilPaonPest.id,
    activeIngredientId: 'ing_oxychlorure_cuivre',
    codeGroup: 'FRAC M01',
    multiCodes: ['M01'],
  },
  // Il y a 20 jours : Lambda-cyhalothrine (Karate Zeon - IRAC 3A)
  {
    id: 'hist-olive-20d',
    parcelId: 'parcelle-chemlal-01',
    crop: 'olive',
    date: date20DaysAgo.toISOString(),
    targetPestId: mouchePest.id,
    activeIngredientId: 'ing_deltamethrine', // Groupe IRAC 3A équivalent
    codeGroup: 'IRAC 3A',
    multiCodes: ['3A'],
  }
];

// 5. Évaluation de l'arbre de décision
const modeDecision = PhytosanitaryEngine.recommendModeOfAction(conditions);

// 6. Évaluation Mouche de l'olive (Insecticides)
const evalMouche = PhytosanitaryEngine.evaluateTreatmentOptions({
  targetPest: mouchePest,
  parcelHistory,
  allIngredients: ACTIVE_INGREDIENTS_DATABASE,
  currentSeasonYear: 2026,
  currentDate,
  conditions,
});

// 7. Évaluation Œil de paon (Fongicides sous 35mm de pluie)
const evalOeilPaon = PhytosanitaryEngine.evaluateTreatmentOptions({
  targetPest: oeilPaonPest,
  parcelHistory,
  allIngredients: ACTIVE_INGREDIENTS_DATABASE,
  currentSeasonYear: 2026,
  currentDate,
  conditions,
});

// 8. Test de chimie de cuve (Cuivre + KNO3 + Bore)
const tankMixAnalysis = [
  {
    test: 'Cuivre + Nitrate de Potassium (KNO3)',
    resultat: TANK_MIX_COMPATIBILITY_RULES.find(r => 
      (r.groupA === 'FRAC M01' && r.groupB === 'ENGRAIS_KNO3') ||
      (r.groupB === 'FRAC M01' && r.groupA === 'ENGRAIS_KNO3')
    )
  },
  {
    test: 'Cuivre + Bore foliaire',
    resultat: TANK_MIX_COMPATIBILITY_RULES.find(r => 
      (r.groupA === 'FRAC M01' && r.groupB === 'BORE_FOLIAIRE') ||
      (r.groupB === 'FRAC M01' && r.groupA === 'BORE_FOLIAIRE')
    )
  }
];

// Synthèse complète
const oliveStressReport = {
  contexteParcelle: {
    culture: 'Olivier (Olea europaea - Variété Chemlal)',
    destination: 'Production d’Huile d’Olive Extra-Vierge (Trituration)',
    stadePhenologique: 'Fin grossissement / Début véraison',
    delaiAvantRecolte: `${conditions.daysBeforeHarvest} jours`,
    meteo: 'Pluies orageuses (35 mm prévus sous 5 jours), risque majeur de délavage',
    cibles: [
      'Mouche de l’olive (Bactrocera oleae - piqûres 8%)',
      'Œil de paon (Spilocaea oleagina / Venturia oleaginea)'
    ]
  },
  orientationDecisionnelleModeAction: {
    modeRecommande: modeDecision.recommendedType,
    raisonDominante: modeDecision.dominantReason,
    avisTechniqueFr: modeDecision.adviceNoticeFr,
    strategieMixFr: modeDecision.idealMixStrategyFr,
  },
  analyseMoucheOlive_Insecticides: evalMouche.map(res => {
    const isOil = conditions.oliveDestination === 'huile';
    const darApplicable = (isOil && res.ingredient.phiDaysOil) ? res.ingredient.phiDaysOil : res.ingredient.phiDays;
    return {
      matiereActive: res.ingredient.name,
      codeIRAC: res.ingredient.codeGroup,
      modePhysique: res.systemicType,
      darOliveTable: `${res.ingredient.phiDays} jours`,
      darOliveHuile: `${darApplicable} jours`,
      statut: res.isAllowed ? 'AUTORISÉ (Recommandé)' : 'BLOQUÉ',
      motifBlocageOuValidation: res.blockReason || 'Conforme IRAC & DAR Huile',
      scorePriorite: res.priorityScore
    };
  }),
  analyseOeilPaon_Fongicides: evalOeilPaon.map(res => {
    const isOil = conditions.oliveDestination === 'huile';
    const darApplicable = (isOil && res.ingredient.phiDaysOil) ? res.ingredient.phiDaysOil : res.ingredient.phiDays;
    return {
      matiereActive: res.ingredient.name,
      codeFRAC: res.ingredient.codeGroup,
      modePhysique: res.systemicType,
      darOliveTable: `${res.ingredient.phiDays} jours`,
      darOliveHuile: `${darApplicable} jours`,
      statut: res.isAllowed ? 'AUTORISÉ (Recommandé)' : 'BLOQUÉ',
      motifBlocageOuValidation: res.blockReason || 'Conforme FRAC & DAR Huile',
      scorePriorite: res.priorityScore
    };
  }),
  chimieDeCuveEtCompatibiliteEngrais: tankMixAnalysis.map(t => ({
    association: t.test,
    compatible: t.resultat?.isCompatible ?? true,
    avertissementChimique: t.resultat?.warningNotice ?? 'Compatible sous réserve d’agitation continue.'
  })),
  alerteQualiteOrganoleptiqueHuile: {
    impactCuivreTardif: 'Tout traitement cuprique à moins de 30 jours de la trituration transfère des traces de cuivre métallique dans la pâte d’olive. Le cuivre catalyse l’oxydation des acides gras insaturés et des polyphénols, élève l’indice de peroxyde et crée un défaut sensoriel de « flaveur métallique », déclassant irrémédiablement l’huile de la catégorie Extra-Vierge.',
    impactPesticidesLipophiles: 'Les pyréthrinoïdes (Deltaméthrine, Lambda-cyhalothrine) sont fortement solubles dans les lipides et s’accumulent sélectivement dans l’huile lors du décanteur, entraînant des dépassements des Limites Maximales de Résidus (LMR) à l’exportation.'
  }
};

console.log(JSON.stringify(oliveStressReport, null, 2));

