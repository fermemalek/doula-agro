"use strict";

// src/lib/phyto/engine.ts
var TANK_MIX_COMPATIBILITY_RULES = [
  {
    groupA: "FRAC M01",
    // Cuivre (Bouillie bordelaise / Oxychlorure)
    groupB: "FRAC 3",
    // Triazoles (DMI)
    isCompatible: false,
    warningNotice: "Incompatibilit\xE9 Cuivre + Triazole (FRAC 3) : Risque de phytotoxicit\xE9 ou alt\xE9ration physico-chimique de la bouillie."
  },
  {
    groupA: "FRAC M02",
    // Soufre
    groupB: "HUILE_MINERALE",
    // Huile blanche / minérale
    isCompatible: false,
    warningNotice: "Incompatibilit\xE9 Soufre + Huile min\xE9rale : Risque grave de br\xFBlure foliaire. D\xE9lai de 21 jours obligatoire entre les deux traitements."
  },
  {
    groupA: "FRAC M01",
    // Cuivre
    groupB: "FRAC 33",
    // Fosétyl-Aluminium
    isCompatible: false,
    warningNotice: "Incompatibilit\xE9 Cuivre + Fos\xE9tyl-Aluminium : Risque de floculation et de lib\xE9ration excessive d\u2019ions cuivre phytotoxiques."
  },
  {
    groupA: "FRAC M01",
    // Cuivre
    groupB: "HUILE_MINERALE",
    // Huiles
    isCompatible: false,
    warningNotice: "Incompatibilit\xE9 Cuivre + Huile en p\xE9riode v\xE9g\xE9tative : Risque de n\xE9crose des bourgeons."
  }
];
var PhytosanitaryEngine = class _PhytosanitaryEngine {
  /**
   * Arbre de décision automatique pour le choix du mode d'action physique :
   * Contact vs Systémique vs Translaminaire
   */
  static recommendModeOfAction(conditions2) {
    if (conditions2.hasVisibleSymptoms) {
      return {
        recommendedType: ["systemique", "translaminaire"],
        dominantReason: "curative",
        adviceNoticeFr: "Infection active constat\xE9e : Privil\xE9gier un produit syst\xE9mique ou translaminaire dot\xE9 d\u2019un effet curatif / stop (24-72h) pour stopper l\u2019extension interne du myc\xE9lium.",
        adviceNoticeAr: "\u0625\u0635\u0627\u0628\u0629 \u0641\u0639\u0644\u064A\u0629 \u0645\u0624\u0643\u062F\u0629 : \u0627\u0644\u0623\u0648\u0644\u0648\u064A\u0629 \u0644\u0645\u0628\u064A\u062F \u062C\u0647\u0627\u0632\u064A \u0623\u0648 \u0639\u0627\u0628\u0631 \u0644\u0644\u0635\u0641\u0627\u0626\u062D \u0630\u0648 \u0641\u0627\u0639\u0644\u064A\u0629 \u0639\u0644\u0627\u062C\u064A\u0629 \u062A\u0648\u0642\u064A\u0641\u064A\u0629 (Stop effect) \u0644\u0627\u062E\u062A\u0631\u0627\u0642 \u0627\u0644\u0623\u0646\u0633\u062C\u0629 \u0648\u0627\u0644\u0642\u0636\u0627\u0621 \u0639\u0644\u0649 \u0645\u064A\u0633\u064A\u0644\u064A\u0648\u0645 \u0627\u0644\u0641\u0637\u0631 \u0627\u0644\u062F\u0627\u062E\u0644\u064A.",
        idealMixStrategyFr: "M\xE9lange curatif recommand\xE9 : Associer un syst\xE9mique (effet stop interne) + un contact multi-site (d\xE9truit les spores externes et prot\xE8ge le syst\xE9mique contre les mutations r\xE9sistantes).",
        idealMixStrategyAr: "\u062E\u0644\u0637\u0629 \u0639\u0644\u0627\u062C\u064A\u0629 \u0645\u0632\u062F\u0648\u062C\u0629 : \u062F\u0645\u062C \u0645\u0628\u064A\u062F \u062C\u0647\u0627\u0632\u064A \u062F\u0627\u062E\u0644\u064A \u0645\u0639 \u0645\u0628\u064A\u062F \u0628\u0627\u0644\u0645\u0644\u0627\u0645\u0633\u0629 \u0645\u062A\u0639\u062F\u062F \u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u0623\u062B\u064A\u0631 \u0644\u062A\u0637\u0647\u064A\u0631 \u0627\u0644\u0633\u0637\u062D \u0627\u0644\u062E\u0627\u0631\u062C\u064A \u0648\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0645\u0628\u064A\u062F \u0627\u0644\u062C\u0647\u0627\u0632\u064A \u0645\u0646 \u0627\u0646\u0643\u0633\u0627\u0631 \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629."
      };
    }
    if (conditions2.isRainExpectedSoon) {
      return {
        recommendedType: ["systemique"],
        dominantReason: "rain",
        adviceNoticeFr: "Risque de lessivage par la pluie (> 20 mm sous 48h) : Les produits de contact risquent d\u2019\xEAtre lav\xE9s. Un syst\xE9mique absorb\xE9 en 2 \xE0 4 heures garantit une protection endoth\xE9rapique durable.",
        adviceNoticeAr: "\u062A\u0646\u0628\u064A\u0647 \u0623\u0645\u0637\u0627\u0631 \u0648\u063A\u0633\u064A\u0644 (> 20 \u0645\u0644\u0645 \u062E\u0644\u0627\u0644 48 \u0633\u0627\u0639\u0629) : \u0645\u0628\u064A\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u0627\u0645\u0633\u0629 \u0633\u062A\u064F\u063A\u0633\u0644 \u0628\u0645\u064A\u0627\u0647 \u0627\u0644\u0623\u0645\u0637\u0627\u0631. \u0627\u0644\u0645\u0628\u064A\u062F \u0627\u0644\u062C\u0647\u0627\u0632\u064A \u0627\u0644\u0645\u0645\u062A\u0635 \u062E\u0644\u0627\u0644 2 \u0625\u0644\u0649 4 \u0633\u0627\u0639\u0627\u062A \u064A\u0636\u0645\u0646 \u062D\u0645\u0627\u064A\u0629 \u062F\u0627\u062E\u0644\u064A\u0629 \u062A\u0642\u0627\u0648\u0645 \u0627\u0644\u063A\u0633\u064A\u0644.",
        idealMixStrategyFr: "Si un produit de contact est utilis\xE9 en pr\xE9-pluie, exiger une mati\xE8re tr\xE8s adh\xE9rente ou additif fixateur (ex: Dithianon r\xE9sistant au d\xE9lavage).",
        idealMixStrategyAr: "\u0641\u064A \u062D\u0627\u0644 \u0627\u0644\u0631\u0634 \u0628\u0627\u0644\u0645\u0644\u0627\u0645\u0633\u0629 \u0642\u0628\u0644 \u0627\u0644\u0645\u0637\u0631\u060C \u064A\u064F\u0634\u062A\u0631\u0637 \u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u0645\u0627\u062F\u0629 \u0644\u0627\u0635\u0642\u0629 \u0634\u062F\u064A\u062F\u0629 \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0644\u0644\u063A\u0633\u064A\u0644 (\u0645\u062B\u0644 Dithianon)."
      };
    }
    if (conditions2.daysBeforeHarvest < 15) {
      return {
        recommendedType: ["contact"],
        dominantReason: "harvest",
        adviceNoticeFr: "S\xE9curit\xE9 pr\xE9-r\xE9colte (DAR court) : \xC0 l\u2019approche de la cueillette, privil\xE9gier un produit de contact ou \xE0 faible r\xE9manence pour \xE9viter tout r\xE9sidu dans les fruits.",
        adviceNoticeAr: "\u0623\u0645\u0627\u0646 \u0645\u0627 \u0642\u0628\u0644 \u0627\u0644\u062C\u0646\u064A (DAR) : \u0645\u0639 \u0627\u0642\u062A\u0631\u0627\u0628 \u0627\u0644\u0642\u0637\u0641\u060C \u0627\u0644\u0623\u0641\u0636\u0644\u064A\u0629 \u0644\u0645\u0628\u064A\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u0627\u0645\u0633\u0629 \u0623\u0648 \u0627\u0644\u0645\u0648\u0627\u062F \u0630\u0627\u062A \u0641\u062A\u0631\u0629 \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u0642\u0635\u064A\u0631\u0629 \u0644\u0636\u0645\u0627\u0646 \u062E\u0644\u0648 \u0627\u0644\u062B\u0645\u0627\u0631 \u0645\u0646 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0627\u062A.",
        idealMixStrategyFr: "V\xE9rifier imp\xE9rativement le D\xE9lai Avant R\xE9colte (DAR / PHI) l\xE9gal de chaque mati\xE8re avant traitement.",
        idealMixStrategyAr: "\u0627\u0644\u062A\u0623\u0643\u062F \u0627\u0644\u0635\u0627\u0631\u0645 \u0645\u0646 \u0641\u062A\u0631\u0629 \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0642\u0628\u0644 \u0627\u0644\u0642\u0637\u0641 (DAR / PHI) \u0639\u0644\u0649 \u0627\u0644\u0639\u0628\u0648\u0629."
      };
    }
    if (conditions2.isRapidShootsGrowth) {
      return {
        recommendedType: ["systemique", "translaminaire"],
        dominantReason: "growth",
        adviceNoticeFr: "Croissance foliaire rapide : Les mati\xE8res de contact ne prot\xE8gent pas les nouvelles feuilles form\xE9es apr\xE8s le passage. Un produit syst\xE9mique circule dans la s\xE8ve et prot\xE8ge les organes en croissance.",
        adviceNoticeAr: "\u0646\u0645\u0648 \u062E\u0636\u0631\u064A \u0633\u0631\u064A\u0639 : \u0645\u0628\u064A\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u0627\u0645\u0633\u0629 \u0644\u0627 \u062A\u062D\u0645\u064A \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0627\u0644\u0646\u0627\u0645\u064A\u0629 \u0628\u0639\u062F \u0627\u0644\u0631\u0634. \u0627\u0644\u0645\u0628\u064A\u062F \u0627\u0644\u062C\u0647\u0627\u0632\u064A \u064A\u0633\u0631\u064A \u0645\u0639 \u0627\u0644\u0639\u0635\u0627\u0631\u0629 \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0642\u0645\u0645 \u0627\u0644\u0646\u0627\u0645\u064A\u0629.",
        idealMixStrategyFr: "Strat\xE9gie altern\xE9e : Utiliser un syst\xE9mique pour couvrir la pousse active, ou rapprocher les passages de contact tous les 7 jours.",
        idealMixStrategyAr: "\u062E\u0637\u0629 \u0645\u062A\u0646\u0627\u0648\u0628\u0629 : \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062C\u0647\u0627\u0632\u064A \u0644\u062A\u063A\u0637\u064A\u0629 \u0627\u0644\u0646\u0645\u0648 \u0627\u0644\u0633\u0631\u064A\u0639\u060C \u0623\u0648 \u062A\u0642\u0631\u064A\u0628 \u062F\u0648\u0631\u0627\u062A \u0627\u0644\u0631\u0634 \u0628\u0627\u0644\u0645\u0644\u0627\u0645\u0633\u0629 \u0643\u0644 7 \u0623\u064A\u0627\u0645."
      };
    }
    return {
      recommendedType: ["contact", "systemique"],
      dominantReason: "preventive",
      adviceNoticeFr: "Traitement protecteur standard (Temps sec) : Un produit de contact multi-site (Cuivre, Soufre, Captane) est id\xE9al pour limiter la pression sans risque de s\xE9lection de r\xE9sistance.",
      adviceNoticeAr: "\u0645\u0639\u0627\u0645\u0644\u0629 \u0648\u0642\u0627\u0626\u064A\u0629 \u0642\u064A\u0627\u0633\u064A\u0629 (\u0637\u0642\u0633 \u0645\u0633\u062A\u0642\u0631) : \u0645\u0628\u064A\u062F \u0628\u0627\u0644\u0645\u0644\u0627\u0645\u0633\u0629 \u0645\u062A\u0639\u062F\u062F \u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u0623\u062B\u064A\u0631 (\u0646\u062D\u0627\u0633\u060C \u0643\u0628\u0631\u064A\u062A\u060C \u0643\u0627\u0628\u062A\u0627\u0646) \u0645\u062B\u0627\u0644\u064A \u0644\u0628\u0646\u0627\u0621 \u062F\u0631\u0639 \u0633\u0637\u062D\u064A \u0645\u0627\u0646\u0639 \u0644\u0644\u0623\u0628\u0648\u0627\u063A \u062F\u0648\u0646 \u062E\u0637\u0631 \u0646\u0634\u0648\u0621 \u0645\u0646\u0627\u0639\u0629.",
      idealMixStrategyFr: "Association d\u2019excellence : Contact multi-site seul ou coupl\xE9 \xE0 un syst\xE9mique pour s\xE9curiser \xE0 la fois la surface et l\u2019int\xE9rieur de la plante.",
      idealMixStrategyAr: "\u0645\u0632\u064A\u062C \u0648\u0642\u0627\u0626\u064A \u0645\u062A\u0648\u0627\u0632\u0646 : \u0645\u0644\u0627\u0645\u0633\u0629 \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0628\u0645\u0641\u0631\u062F\u0647 \u0623\u0648 \u0645\u062F\u0639\u0648\u0645 \u0628\u062C\u0647\u0627\u0632\u064A \u0645\u0642\u0646\u0646 \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0633\u0637\u062D \u0648\u0627\u0644\u062F\u0627\u062E\u0644 \u0645\u0639\u0627\u064B."
    };
  }
  /**
   * Vérifie si un groupe chimique bénéficie du statut d'immunité multi-site (FRAC M)
   */
  static isMultiSiteGroup(codeGroup) {
    const clean = (codeGroup || "").toUpperCase().trim();
    return clean.startsWith("FRAC M") || clean === "HUILE_MINERALE";
  }
  /**
   * Filtre les ravageurs et maladies observables selon la culture et le stade végétatif
   */
  static getEligiblePests(pests, crop, stage) {
    return pests.filter((pest) => {
      if (!pest.crops.includes(crop)) return false;
      if (pest.applicableStages.includes(stage)) return true;
      if ((stage === "post_recolte" || stage === "chute_feuilles") && pest.applicableStages.includes("post_recolte_chute_feuilles")) {
        return true;
      }
      return false;
    });
  }
  /**
   * Évalue et classe les matières actives disponibles face à une cible,
   * en vérifiant la résistance acquise, l'immunité multi-site et l'historique de la parcelle.
   */
  static evaluateTreatmentOptions(params) {
    const { targetPest: targetPest2, parcelHistory: parcelHistory2, allIngredients, currentSeasonYear, currentDate: currentDate2 = /* @__PURE__ */ new Date(), conditions: conditions2 } = params;
    const modeRecommendation = conditions2 ? _PhytosanitaryEngine.recommendModeOfAction(conditions2) : null;
    const currentSeasonLogs = parcelHistory2.filter((log) => {
      const logYear = new Date(log.date).getFullYear();
      return logYear === currentSeasonYear && log.targetPestId === targetPest2.id;
    });
    const lastApplication = currentSeasonLogs.length > 0 ? [...currentSeasonLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
    const daysSinceLastApp = lastApplication ? Math.floor((currentDate2.getTime() - new Date(lastApplication.date).getTime()) / (1e3 * 60 * 60 * 24)) : 999;
    const candidateIngredients = allIngredients.filter(
      (ing) => targetPest2.compatibleActiveIngredients.includes(ing.id)
    );
    return candidateIngredients.map((ingredient) => {
      let isAllowed = true;
      let blockReason = "";
      let priorityScore = 100;
      const isMultiSite = ingredient.isMultiSite || _PhytosanitaryEngine.isMultiSiteGroup(ingredient.codeGroup);
      const extractNormalizedCodes = (codesList) => {
        const out = [];
        for (const raw of codesList) {
          if (!raw) continue;
          const parts = raw.split("+").map((p) => p.replace(/^(FRAC|IRAC)s*/i, "").trim().toUpperCase());
          for (const p of parts) {
            if (p && !out.includes(p)) out.push(p);
          }
        }
        return out;
      };
      const rawIngCodes = ingredient.multiCodes && ingredient.multiCodes.length > 0 ? ingredient.multiCodes : [ingredient.codeGroup];
      const ingredientCodes = extractNormalizedCodes(rawIngCodes);
      const rawLastCodes = lastApplication?.multiCodes && lastApplication.multiCodes.length > 0 ? lastApplication.multiCodes : lastApplication?.codeGroup ? [lastApplication.codeGroup] : [];
      const lastAppCodes = extractNormalizedCodes(rawLastCodes);
      const hasDirectCodeConflict = ingredientCodes.some((c) => lastAppCodes.includes(c));
      const groupApplicationsCount = currentSeasonLogs.filter((log) => {
        const logCodes = log.multiCodes || [log.codeGroup];
        return ingredientCodes.some((c) => logCodes.includes(c));
      }).length;
      if (hasDirectCodeConflict) {
        if (isMultiSite) {
          isAllowed = true;
          priorityScore = 95;
        } else if (daysSinceLastApp < 45) {
          isAllowed = false;
          blockReason = `Blocage Anti-R\xE9sistance : Le dernier traitement (il y a ${daysSinceLastApp} jours) utilisait d\xE9j\xE0 le groupe [${ingredient.codeGroup}]. L'alternance vers un autre mode d'action (FRAC/IRAC) est obligatoire pour briser la r\xE9sistance.`;
          priorityScore = 0;
        } else {
          priorityScore -= 20;
        }
      }
      if (groupApplicationsCount >= ingredient.maxApplicationsPerSeason) {
        isAllowed = false;
        blockReason = `Plafond Saison Atteint : ${groupApplicationsCount}/${ingredient.maxApplicationsPerSeason} pulv\xE9risations d\xE9j\xE0 effectu\xE9es pour le groupe [${ingredient.codeGroup}].`;
        priorityScore = 0;
      }
      const isSituationallyRecommended = modeRecommendation ? modeRecommendation.recommendedType.includes(ingredient.systemicType) : true;
      if (isAllowed) {
        priorityScore -= groupApplicationsCount * 25;
        if (isMultiSite) {
          priorityScore += 10;
        }
        if (isSituationallyRecommended) {
          priorityScore += 15;
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
        daysSinceLastApp
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }
  /**
   * Vérifie la faisabilité d'un mélange en cuve (Tank Mix) entre deux matières actives
   */
  static checkTankMixFeasibility(ingredientA, ingredientB) {
    const codesA = ingredientA.multiCodes || [ingredientA.codeGroup];
    const codesB = ingredientB.multiCodes || [ingredientB.codeGroup];
    for (const ca of codesA) {
      for (const cb of codesB) {
        const rule = TANK_MIX_COMPATIBILITY_RULES.find(
          (r) => r.groupA === ca && r.groupB === cb || r.groupB === ca && r.groupA === cb
        );
        if (rule && !rule.isCompatible) {
          return {
            safe: false,
            warning: rule.warningNotice || "Risque de blocage physico-chimique en cuve."
          };
        }
      }
    }
    return { safe: true };
  }
  /**
   * Calculateur de cuve et dosage précis
   */
  static calculateTankMixDosage(params) {
    const { tankVolumeL, dosePerHlNum, unit } = params;
    const numHlInTank = tankVolumeL / 100;
    const totalRequiredInTank = dosePerHlNum * numHlInTank;
    let displayStr = "";
    if (unit === "g" || unit === "kg") {
      if (totalRequiredInTank >= 1e3) {
        displayStr = `${(totalRequiredInTank / 1e3).toFixed(2)} kg`;
      } else {
        displayStr = `${totalRequiredInTank.toFixed(0)} g`;
      }
    } else {
      if (totalRequiredInTank >= 1e3) {
        displayStr = `${(totalRequiredInTank / 1e3).toFixed(2)} L`;
      } else {
        displayStr = `${totalRequiredInTank.toFixed(0)} cc (mL)`;
      }
    }
    return {
      totalAmount: totalRequiredInTank,
      displayStr,
      numHl: numHlInTank
    };
  }
  /**
   * Calcule la date minimale de récolte autorisée selon le DAR / PHI
   */
  static calculateHarvestSafetyDate(applicationDate, phiDays) {
    const app = new Date(applicationDate);
    const safeDate = new Date(app.getTime() + phiDays * 24 * 60 * 60 * 1e3);
    const now = /* @__PURE__ */ new Date();
    const diffMs = safeDate.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(diffMs / (1e3 * 60 * 60 * 24)));
    return {
      safeHarvestDate: safeDate.toISOString().slice(0, 10),
      isSafeNow: remainingDays === 0,
      remainingDays
    };
  }
};

// src/lib/phyto/database.ts
var ACTIVE_INGREDIENTS_DATABASE = [
  // --- FONGICIDES MULTI-SITES (IMMUNITÉ ANTI-RÉSISTANCE) ---
  {
    id: "ing_cuivre_bouillie",
    name: "Bouillie Bordelaise (Sulfate de cuivre)",
    commonNameFr: "Bouillie Bordelaise 20% Cu m\xE9tal (ex: Vall\xE9s, Cuprofix)",
    nameAr: "\u0627\u0644\u0645\u062D\u0644\u0648\u0644 \u0627\u0644\u0628\u0648\u0631\u062F\u0648\u0627\u0644\u064A (\u0643\u0628\u0631\u064A\u062A\u0627\u062A \u0627\u0644\u0646\u062D\u0627\u0633)",
    type: "FRAC",
    codeGroup: "FRAC M01",
    familyChemical: "Inorganique (Cuivre)",
    phiDays: 14,
    reiHours: 24,
    standardDose: "1 \xE0 1.5 kg/hL",
    standardDosePerHa: "10 \xE0 15 kg/ha",
    maxApplicationsPerSeason: 6,
    formulation: "WP",
    isMultiSite: true,
    systemicType: "contact"
  },
  {
    id: "ing_oxychlorure_cuivre",
    name: "Oxychlorure de cuivre",
    commonNameFr: "Oxychlorure de cuivre 50% (ex: Curenox 50, Cuprocol, Nucop 35 WG)",
    nameAr: "\u0623\u0648\u0643\u0633\u064A\u0643\u0644\u0648\u0631\u0648\u0631 \u0627\u0644\u0646\u062D\u0627\u0633",
    type: "FRAC",
    codeGroup: "FRAC M01",
    familyChemical: "Inorganique (Cuivre)",
    phiDays: 15,
    reiHours: 24,
    standardDose: "250-300 g/hL",
    standardDosePerHa: "2.5 \xE0 3 kg/ha",
    maxApplicationsPerSeason: 5,
    formulation: "WP",
    isMultiSite: true,
    systemicType: "contact"
  },
  {
    id: "ing_soufre_mouillable",
    name: "Soufre mouillable / micronis\xE9",
    commonNameFr: "Soufre 80% (ex: Solfo Li, Microthiol Special, Azumo)",
    nameAr: "\u0643\u0628\u0631\u064A\u062A \u0645\u064A\u0643\u0631\u0648\u0646\u064A \u0645\u0628\u0644\u0644",
    type: "FRAC",
    codeGroup: "FRAC M02",
    familyChemical: "Inorganique (Soufre)",
    phiDays: 3,
    reiHours: 12,
    standardDose: "400-600 g/hL",
    standardDosePerHa: "4 \xE0 6 kg/ha",
    maxApplicationsPerSeason: 8,
    formulation: "WG",
    isMultiSite: true,
    systemicType: "contact"
  },
  {
    id: "ing_captane",
    name: "Captane",
    commonNameFr: "Captane 50% - 80% (ex: Captan 50 Vall\xE9s, Criptan, Phytocap)",
    nameAr: "\u0643\u0627\u0628\u062A\u0627\u0646",
    type: "FRAC",
    codeGroup: "FRAC M04",
    familyChemical: "Phtalimide",
    phiDays: 14,
    reiHours: 48,
    standardDose: "150-200 g/hL",
    standardDosePerHa: "2 kg/ha",
    maxApplicationsPerSeason: 4,
    formulation: "WP",
    isMultiSite: true,
    systemicType: "contact"
  },
  {
    id: "ing_dithianon",
    name: "Dithianon",
    commonNameFr: "Dithianon 70% (ex: Delan 70 WG)",
    nameAr: "\u062F\u064A\u062B\u064A\u0627\u0646\u0648\u0646",
    type: "FRAC",
    codeGroup: "FRAC M09",
    familyChemical: "Quinone",
    phiDays: 21,
    reiHours: 24,
    standardDose: "50-70 g/hL",
    standardDosePerHa: "0.7 kg/ha",
    maxApplicationsPerSeason: 4,
    formulation: "WG",
    isMultiSite: true,
    systemicType: "contact"
  },
  // --- FONGICIDES MONO-SITES (SYSTÉMIQUES & TRANSLAMINAIRES) ---
  {
    id: "ing_tebuconazole",
    name: "T\xE9buconazole",
    commonNameFr: "T\xE9buconazole 25% (ex: Folicur 250 EW, Bocus Duo, Tebuzol)",
    nameAr: "\u062A\u064A\u0628\u0648\u0643\u0648\u0646\u0627\u0632\u0648\u0644",
    type: "FRAC",
    codeGroup: "FRAC 3",
    familyChemical: "Triazole (DMI)",
    phiDays: 14,
    reiHours: 48,
    standardDose: "40-50 cc/hL",
    standardDosePerHa: "0.4 \xE0 0.5 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "EC",
    systemicType: "systemique"
  },
  {
    id: "ing_difenoconazole",
    name: "Dif\xE9noconazole",
    commonNameFr: "Dif\xE9noconazole 250 g/L (ex: Score 250 EC, Difeno Pro)",
    nameAr: "\u062F\u064A\u0641\u064A\u0646\u0648\u0643\u0648\u0646\u0627\u0632\u0648\u0644",
    type: "FRAC",
    codeGroup: "FRAC 3",
    familyChemical: "Triazole (DMI)",
    phiDays: 14,
    reiHours: 24,
    standardDose: "20-30 cc/hL",
    standardDosePerHa: "0.2 \xE0 0.3 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "EC",
    systemicType: "systemique"
  },
  {
    id: "ing_penconazole",
    name: "Penconazole",
    commonNameFr: "Penconazole 100 g/L (ex: Topas 100 EC)",
    nameAr: "\u0628\u0646\u0643\u0648\u0646\u0627\u0632\u0648\u0644",
    type: "FRAC",
    codeGroup: "FRAC 3",
    familyChemical: "Triazole (DMI)",
    phiDays: 14,
    reiHours: 24,
    standardDose: "25-35 cc/hL",
    standardDosePerHa: "0.35 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "EC",
    systemicType: "systemique"
  },
  {
    id: "ing_boscalid_pyraclo",
    name: "Boscalide + Pyraclostrobine",
    commonNameFr: "Boscalide 26.7% + Pyraclostrobine 6.7% (ex: Bellis, Signum WG)",
    nameAr: "\u0628\u0648\u0633\u0643\u0627\u0644\u064A\u062F + \u0628\u064A\u0631\u0627\u0643\u0644\u0648\u0633\u062A\u0631\u0648\u0628\u064A\u0646",
    type: "FRAC",
    codeGroup: "FRAC 7 + FRAC 11",
    multiCodes: ["FRAC 7", "FRAC 11"],
    familyChemical: "Carboxamide (SDHI) + Strobilurine (QoI)",
    phiDays: 7,
    reiHours: 24,
    standardDose: "30-50 g/hL",
    standardDosePerHa: "0.5 kg/ha",
    maxApplicationsPerSeason: 2,
    formulation: "WG",
    systemicType: "systemique"
  },
  {
    id: "ing_fluopyram_tebu",
    name: "Fluopyram + T\xE9buconazole",
    commonNameFr: "Fluopyram 200 g/L + T\xE9buconazole 200 g/L (ex: Luna Experience)",
    nameAr: "\u0641\u0644\u0648\u0628\u064A\u0631\u0627\u0645 + \u062A\u064A\u0628\u0648\u0643\u0648\u0646\u0627\u0632\u0648\u0644",
    type: "FRAC",
    codeGroup: "FRAC 7 + FRAC 3",
    multiCodes: ["FRAC 7", "FRAC 3"],
    familyChemical: "SDHI + Triazole (DMI)",
    phiDays: 7,
    reiHours: 24,
    standardDose: "35-50 cc/hL",
    standardDosePerHa: "0.5 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "SC",
    systemicType: "systemique"
  },
  {
    id: "ing_tebu_trifloxy",
    name: "T\xE9buconazole + Trifloxystrobine",
    commonNameFr: "T\xE9buconazole 50% + Trifloxystrobine 25% (ex: Nativo 75 WG)",
    nameAr: "\u062A\u064A\u0628\u0648\u0643\u0648\u0646\u0627\u0632\u0648\u0644 + \u062A\u0631\u064A\u0641\u0644\u0648\u0643\u0633\u064A\u0633\u062A\u0631\u0648\u0628\u064A\u0646",
    type: "FRAC",
    codeGroup: "FRAC 3 + FRAC 11",
    multiCodes: ["FRAC 3", "FRAC 11"],
    familyChemical: "Triazole (DMI) + Strobilurine (QoI)",
    phiDays: 14,
    reiHours: 24,
    standardDose: "25-35 g/hL",
    standardDosePerHa: "0.35 kg/ha",
    maxApplicationsPerSeason: 2,
    formulation: "WG",
    systemicType: "systemique"
  },
  {
    id: "ing_kresoxim_methyl",
    name: "Kr\xE9soxim-m\xE9thyl",
    commonNameFr: "Kr\xE9soxim-m\xE9thyl 50% (ex: Candit, Stroby WG)",
    nameAr: "\u0643\u0631\u064A\u0632\u0648\u0643\u0633\u064A\u0645 \u0645\u064A\u062B\u064A\u0644",
    type: "FRAC",
    codeGroup: "FRAC 11",
    familyChemical: "Strobilurine (QoI)",
    phiDays: 14,
    reiHours: 24,
    standardDose: "20-30 g/hL",
    standardDosePerHa: "0.25 kg/ha",
    maxApplicationsPerSeason: 2,
    formulation: "WG",
    systemicType: "translaminaire"
  },
  {
    id: "ing_fenhexamid",
    name: "Fenhexamide",
    commonNameFr: "Fenhexamide 500 g/L (ex: Teldor 500 SC)",
    nameAr: "\u0641\u064A\u0646\u0647\u0643\u0633\u0627\u0645\u064A\u062F",
    type: "FRAC",
    codeGroup: "FRAC 17",
    familyChemical: "Hydroxyanilide",
    phiDays: 3,
    reiHours: 12,
    standardDose: "100-150 cc/hL",
    standardDosePerHa: "1.2 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "SC",
    systemicType: "translaminaire"
  },
  {
    id: "ing_fosetyl_al",
    name: "Fos\xE9tyl-Aluminium",
    commonNameFr: "Fos\xE9tyl-Aluminium 80% (ex: Aliette Flash)",
    nameAr: "\u0641\u0648\u0633\u064A\u062A\u064A\u0644 \u0627\u0644\u0623\u0644\u0645\u0646\u064A\u0648\u0645",
    type: "FRAC",
    codeGroup: "FRAC P07",
    familyChemical: "Phosphonate (Stimulateur de d\xE9fense)",
    phiDays: 14,
    reiHours: 24,
    standardDose: "250 g/hL",
    standardDosePerHa: "2.5 kg/ha",
    maxApplicationsPerSeason: 3,
    formulation: "WG",
    systemicType: "systemique"
  },
  // --- INSECTICIDES & ACARICIDES (IRAC) ---
  {
    id: "ing_acetamipride",
    name: "Ac\xE9tamipride",
    commonNameFr: "Ac\xE9tamipride 20% (ex: Mospilan 20 SP, Aceplan, Judoka)",
    nameAr: "\u0623\u0633\u064A\u062A\u0627\u0645\u0628\u0631\u064A\u062F",
    type: "IRAC",
    codeGroup: "IRAC 4A",
    familyChemical: "N\xE9onicotino\xEFde",
    phiDays: 14,
    reiHours: 24,
    standardDose: "25 g/hL",
    standardDosePerHa: "0.25 kg/ha",
    maxApplicationsPerSeason: 2,
    formulation: "SP",
    systemicType: "systemique"
  },
  {
    id: "ing_spirotetramat",
    name: "Spirot\xE9tramate",
    commonNameFr: "Spirot\xE9tramate 100 g/L (ex: Movento 100 SC)",
    nameAr: "\u0633\u0628\u064A\u0631\u0648\u062A\u062A\u0631\u0627\u0645\u0627\u0637",
    type: "IRAC",
    codeGroup: "IRAC 23",
    familyChemical: "D\xE9riv\xE9 d\u2019acide t\xE9tramique",
    phiDays: 14,
    reiHours: 24,
    standardDose: "75-100 cc/hL",
    standardDosePerHa: "0.75 \xE0 1 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "SC",
    systemicType: "systemique"
  },
  {
    id: "ing_deltamethrine",
    name: "Deltam\xE9thrine",
    commonNameFr: "Deltam\xE9thrine 25 g/L - 100 g/L (ex: Decis Expert, Deltacal)",
    nameAr: "\u062F\u0644\u062A\u0627\u0645\u062B\u0631\u064A\u0646",
    type: "IRAC",
    codeGroup: "IRAC 3A",
    familyChemical: "Pyr\xE9thrino\xEFde de synth\xE8se",
    phiDays: 7,
    reiHours: 24,
    standardDose: "10-15 cc/hL",
    standardDosePerHa: "0.15 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "EC",
    systemicType: "contact"
  },
  {
    id: "ing_cypermethrine",
    name: "Cyperm\xE9thrine",
    commonNameFr: "Cyperm\xE9thrine 250 g/L (ex: Sherpa 25 EC)",
    nameAr: "\u0633\u064A\u0628\u064A\u0631\u0645\u062B\u0631\u064A\u0646",
    type: "IRAC",
    codeGroup: "IRAC 3A",
    familyChemical: "Pyr\xE9thrino\xEFde de synth\xE8se",
    phiDays: 14,
    reiHours: 48,
    standardDose: "30-40 cc/hL",
    standardDosePerHa: "0.35 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "EC",
    systemicType: "contact"
  },
  {
    id: "ing_chlorantraniliprole",
    name: "Chlorantraniliprole",
    commonNameFr: "Chlorantraniliprole 200 g/L (ex: Coragen 20 SC)",
    nameAr: "\u0643\u0644\u0648\u0631\u0627\u0646\u062A\u0631\u0627\u0646\u064A\u0644\u064A\u0628\u0631\u0648\u0644",
    type: "IRAC",
    codeGroup: "IRAC 28",
    familyChemical: "Diamide anthranilique",
    phiDays: 14,
    reiHours: 12,
    standardDose: "18-20 cc/hL",
    standardDosePerHa: "0.18 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "SC",
    systemicType: "translaminaire"
  },
  {
    id: "ing_cyantraniliprole",
    name: "Cyantraniliprole",
    commonNameFr: "Cyantraniliprole 100 g/L (ex: Exirel)",
    nameAr: "\u0633\u064A\u0627\u0646\u062A\u0631\u0627\u0646\u064A\u0644\u064A\u0628\u0631\u0648\u0644",
    type: "IRAC",
    codeGroup: "IRAC 28",
    familyChemical: "Diamide anthranilique",
    phiDays: 14,
    reiHours: 12,
    standardDose: "75 cc/hL",
    standardDosePerHa: "0.75 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "SC",
    systemicType: "translaminaire"
  },
  {
    id: "ing_spinosad",
    name: "Spinosad",
    commonNameFr: "Spinosad 480 g/L (ex: Tracer 480 SC, Spintor)",
    nameAr: "\u0633\u0628\u064A\u0646\u0648\u0633\u0627\u062F",
    type: "IRAC",
    codeGroup: "IRAC 5",
    familyChemical: "Spinosyne (Biologique)",
    phiDays: 3,
    reiHours: 12,
    standardDose: "20-25 cc/hL",
    standardDosePerHa: "0.2 L/ha",
    maxApplicationsPerSeason: 3,
    formulation: "SC",
    systemicType: "translaminaire"
  },
  {
    id: "ing_emamectine",
    name: "Emamectine benzoate",
    commonNameFr: "Emamectine benzoate 5% (ex: Proclaim 05 SG, Emamex)",
    nameAr: "\u0625\u064A\u0645\u0627\u0645\u0643\u062A\u064A\u0646 \u0628\u0646\u0632\u0648\u0627\u062A",
    type: "IRAC",
    codeGroup: "IRAC 6",
    familyChemical: "Avermectine",
    phiDays: 7,
    reiHours: 24,
    standardDose: "30-40 g/hL",
    standardDosePerHa: "0.35 kg/ha",
    maxApplicationsPerSeason: 2,
    formulation: "WG",
    systemicType: "translaminaire"
  },
  {
    id: "ing_abamectine",
    name: "Abamectine",
    commonNameFr: "Abamectine 18 g/L (ex: Vertimec, Bactimec, Verlan, Zorro)",
    nameAr: "\u0623\u0628\u0627\u0645\u0643\u062A\u064A\u0646",
    type: "IRAC",
    codeGroup: "IRAC 6",
    familyChemical: "Avermectine (Acaricide/Insecticide)",
    phiDays: 14,
    reiHours: 24,
    standardDose: "50-75 cc/hL",
    standardDosePerHa: "0.6 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "EC",
    systemicType: "translaminaire"
  },
  {
    id: "ing_bacillus",
    name: "Bacillus thuringiensis kurstaki",
    commonNameFr: "Bacillus thuringiensis (ex: Delfin WG, Dipel DF, Bactospeine)",
    nameAr: "\u0628\u0627\u0633\u064A\u0644\u0648\u0633 \u062B\u0648\u0631\u064A\u0646\u062C\u064A\u0646\u0633\u064A\u0633 (\u0645\u0643\u0627\u0641\u062D\u0629 \u062D\u064A\u0648\u064A\u0629)",
    type: "IRAC",
    codeGroup: "IRAC 11A",
    familyChemical: "Bact\xE9rie entomopathog\xE8ne (Bio-insecticide)",
    phiDays: 1,
    reiHours: 6,
    standardDose: "100-150 g/hL",
    standardDosePerHa: "1 kg/ha",
    maxApplicationsPerSeason: 6,
    formulation: "WG",
    isMultiSite: true,
    systemicType: "contact"
  },
  {
    id: "ing_spiromesifene",
    name: "Spirom\xE9sif\xE8ne",
    commonNameFr: "Spirom\xE9sif\xE8ne 240 g/L (ex: Oberon 240 SC)",
    nameAr: "\u0633\u0628\u064A\u0631\u0648\u0645\u064A\u0633\u064A\u0641\u064A\u0646",
    type: "IRAC",
    codeGroup: "IRAC 23",
    familyChemical: "Acide t\xE9tronique (Acaricide ovi-larvicide)",
    phiDays: 14,
    reiHours: 24,
    standardDose: "40-50 cc/hL",
    standardDosePerHa: "0.5 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "SC",
    systemicType: "translaminaire"
  },
  {
    id: "ing_huile_minerale",
    name: "Huile min\xE9rale blanche / paraffine",
    commonNameFr: "Huile min\xE9rale d\u2019hiver (Traitement d\u2019hiver asphixiant)",
    nameAr: "\u0632\u064A\u062A \u0645\u0639\u062F\u0646\u064A \u0623\u0628\u064A\u0636 \u0634\u062A\u0648\u064A",
    type: "IRAC",
    codeGroup: "HUILE_MINERALE",
    familyChemical: "Hydrocarbures aliphatiques",
    phiDays: 21,
    reiHours: 24,
    standardDose: "1.5 \xE0 2 L/hL",
    standardDosePerHa: "15 \xE0 20 L/ha",
    maxApplicationsPerSeason: 2,
    formulation: "EC",
    isMultiSite: true,
    systemicType: "contact"
  }
];
var PEST_TARGETS_DATABASE = [
  // -------------------------------------------------------------
  // 1. NECTARINE & PÊCHE (Prunus persica)
  // -------------------------------------------------------------
  {
    id: "nec_cloque",
    nameScientific: "Taphrina deformans",
    nameFr: "Cloque du p\xEAcher / nectarinier",
    nameAr: "\u062A\u062C\u0639\u0651\u062F \u0623\u0648\u0631\u0627\u0642 \u0627\u0644\u062E\u0648\u062E (\u0627\u0644\u062A\u0627\u0641\u0631\u064A\u0646\u0627)",
    category: "champignon",
    applicableStages: ["dormance", "gonflement_bourgeons", "post_recolte", "chute_feuilles"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_cuivre_bouillie", "ing_oxychlorure_cuivre", "ing_captane", "ing_difenoconazole"],
    descriptionFr: "Feuilles cloqu\xE9es, \xE9paissies, d\xE9form\xE9es et rouge\xE2tres d\xE8s le d\xE9bourrement. Traitement fondamental en dormance et gonflement.",
    descriptionAr: "\u0627\u0646\u062A\u0641\u0627\u062E \u0648\u062A\u0634\u0648\u0647 \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u062A\u0644\u0648\u0646\u0647\u0627 \u0628\u0627\u0644\u0644\u0648\u0646 \u0627\u0644\u0623\u062D\u0645\u0631 \u0627\u0644\u0633\u0645\u064A\u0643 \u0645\u0639 \u0628\u062F\u0627\u064A\u0629 \u0627\u0646\u0637\u0644\u0627\u0642 \u0627\u0644\u0639\u0635\u0627\u0631\u0629 \u0641\u064A \u0627\u0644\u0631\u0628\u064A\u0639.",
    primarySampleUrl: "assets/phyto/cloque.svg",
    symptomOrgans: [
      {
        organ: "feuille",
        organFr: "Feuillage",
        organAr: "\u0627\u0644\u0623\u0648\u0631\u0627\u0642",
        imageUrl: "assets/phyto/cloque.svg",
        descriptionFr: "Boursouflures spectaculaires, \xE9paississement charnu et d\xE9coloration rose \xE0 rouge-vif d\xE8s le d\xE9bourrement.",
        descriptionAr: "\u0627\u0646\u062A\u0641\u0627\u062E \u0648\u062A\u062C\u0639\u062F \u0634\u062F\u064A\u062F \u0645\u0639 \u0633\u0645\u0627\u0643\u0629 \u0645\u0644\u0645\u0633 \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u062A\u0644\u0648\u0646\u0647\u0627 \u0628\u0627\u0644\u0644\u0648\u0646 \u0627\u0644\u0623\u062D\u0645\u0631 \u0623\u0648 \u0627\u0644\u0648\u0631\u062F\u064A \u0627\u0644\u0641\u0627\u0642\u0639 \u062B\u0645 \u0633\u0642\u0648\u0637\u0647\u0627 \u0627\u0644\u0645\u0628\u0643\u0631."
      },
      {
        organ: "rameau",
        organFr: "Pousses & Rameaux",
        organAr: "\u0627\u0644\u0646\u0645\u0648\u0627\u062A \u0627\u0644\u0641\u062A\u064A\u0629 \u0648\u0627\u0644\u0623\u063A\u0635\u0627\u0646",
        descriptionFr: "Raccourcissement des entre-n\u0153uds, d\xE9formations des jeunes pousses et affaiblissement de la pousse.",
        descriptionAr: "\u0642\u0635\u0631 \u0627\u0644\u0645\u0633\u0627\u0641\u0627\u062A \u0628\u064A\u0646 \u0627\u0644\u0639\u0642\u062F \u0648\u062A\u0648\u0631\u0645 \u0627\u0644\u0646\u0645\u0648\u0627\u062A \u0627\u0644\u0631\u0628\u064A\u0639\u064A\u0629 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0648\u062A\u0648\u0642\u0641 \u0627\u0633\u062A\u0637\u0627\u0644\u062A\u0647\u0627."
      }
    ]
  },
  {
    id: "nec_chancre_bacterien",
    nameScientific: "Pseudomonas syringae pv. morsprunorum",
    nameFr: "Chancre bact\xE9rien du p\xEAcher",
    nameAr: "\u0627\u0644\u062A\u0642\u0631\u062D \u0627\u0644\u0628\u0643\u062A\u064A\u0631\u064A \u0644\u0623\u0634\u062C\u0627\u0631 \u0627\u0644\u062E\u0648\u062E",
    category: "bacterie",
    applicableStages: ["dormance", "post_recolte", "chute_feuilles"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_cuivre_bouillie", "ing_oxychlorure_cuivre"],
    descriptionFr: "\xC9coulement abondant de gomme le long des branches, chancres aplatis et mortalit\xE9 brutale des rameaux.",
    descriptionAr: "\u062E\u0631\u0648\u062C \u0635\u0645\u063A \u0643\u062B\u064A\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u063A\u0635\u0627\u0646 \u0645\u0639 \u062A\u0642\u0631\u062D\u0627\u062A \u0639\u0645\u064A\u0642\u0629 \u0648\u0645\u0648\u062A \u0645\u0641\u0627\u062C\u0626 \u0644\u0644\u0623\u0641\u0631\u0639 \u0641\u064A \u0627\u0644\u0634\u062A\u0627\u0621 \u0648\u0627\u0644\u0631\u0628\u064A\u0639.",
    primarySampleUrl: "assets/phyto/tuberculose.svg",
    symptomOrgans: [
      {
        organ: "rameau",
        organFr: "\xC9corce & Charpenti\xE8res",
        organAr: "\u0627\u0644\u0644\u062D\u0627\u0621 \u0648\u0627\u0644\u0623\u063A\u0635\u0627\u0646 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
        imageUrl: "assets/phyto/tuberculose.svg",
        descriptionFr: "Chancres allong\xE9s et d\xE9prim\xE9s avec suintement abondant de gomme ambr\xE9e.",
        descriptionAr: "\u062A\u0642\u0631\u062D\u0627\u062A \u0637\u0648\u0644\u064A\u0629 \u063A\u0627\u0626\u0631\u0629 \u0641\u064A \u0627\u0644\u0644\u062D\u0627\u0621 \u0645\u0639 \u0625\u0641\u0631\u0627\u0632\u0627\u062A \u0635\u0645\u063A\u064A\u0629 \u0643\u062B\u064A\u0641\u0629 \u0639\u0644\u0649 \u0627\u0644\u0641\u0631\u0648\u0639 \u0648\u0627\u0644\u062C\u0630\u0639."
      },
      {
        organ: "feuille",
        organFr: "Feuilles printani\xE8res",
        organAr: "\u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0627\u0644\u0631\u0628\u064A\u0639\u064A\u0629",
        descriptionFr: "Taches translucides huileuses puis n\xE9croses circulaires perfor\xE9es.",
        descriptionAr: "\u0628\u0642\u0639 \u0632\u064A\u062A\u064A\u0629 \u0645\u0627\u0626\u064A\u0629 \u062A\u062A\u062D\u0648\u0644 \u0625\u0644\u0649 \u0646\u062E\u0631 \u062C\u0627\u0641 \u064A\u0633\u0642\u0637 \u0644\u064A\u062A\u0631\u0643 \u062B\u0642\u0648\u0628\u0627\u064B \u0641\u064A \u0627\u0644\u0623\u0648\u0631\u0627\u0642."
      }
    ]
  },
  {
    id: "nec_cochenille_blanche",
    nameScientific: "Pseudaulacaspis pentagona",
    nameFr: "Cochenille blanche du m\xFBrier / p\xEAcher",
    nameAr: "\u0627\u0644\u062D\u0634\u0631\u0629 \u0627\u0644\u0642\u0634\u0631\u064A\u0629 \u0627\u0644\u0628\u064A\u0636\u0627\u0621",
    category: "insecte",
    applicableStages: ["dormance", "chute_petales_nouaison"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_huile_minerale", "ing_spirotetramat", "ing_acetamipride"],
    descriptionFr: "Manchons blancs feutr\xE9s recouvrant le tronc et les charpenti\xE8res, dess\xE8chement des branches sous forte attaque.",
    descriptionAr: "\u062A\u0631\u0627\u0643\u0645 \u0642\u0634\u0648\u0631 \u0628\u064A\u0636\u0627\u0621 \u0642\u0637\u0646\u064A\u0629 \u062A\u063A\u0637\u064A \u0627\u0644\u062C\u0630\u0639 \u0648\u0627\u0644\u0623\u063A\u0635\u0627\u0646 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u062A\u0633\u0628\u0628 \u062C\u0641\u0627\u0641 \u0648\u0636\u0639\u0641 \u0627\u0644\u0634\u062C\u0631\u0629.",
    primarySampleUrl: "assets/phyto/cochenille.svg"
  },
  {
    id: "nec_coryneum",
    nameScientific: "Wilsonomyces carpophilus (Stigmina)",
    nameFr: "Coryneum / Criblure des feuilles",
    nameAr: "\u0627\u0644\u062A\u064E\u0628\u064E\u0642\u0651\u0639 \u0627\u0644\u062B\u0642\u0628\u064A (\u0627\u0644\u0643\u0648\u0631\u064A\u0646\u064A\u0648\u0645)",
    category: "champignon",
    applicableStages: ["gonflement_bourgeons", "chute_petales_nouaison", "post_recolte", "chute_feuilles"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_cuivre_bouillie", "ing_captane", "ing_boscalid_pyraclo", "ing_difenoconazole"],
    descriptionFr: "Petites taches circulaires brunes se d\xE9tachant du limbe en laissant des perforations (criblure). Taches en relief sur fruits.",
    descriptionAr: "\u0628\u0642\u0639 \u0628\u0646\u064A\u0629 \u062F\u0627\u0626\u0631\u064A\u0629 \u062A\u0633\u0642\u0637 \u062A\u0627\u0631\u0643\u0629 \u062B\u0642\u0648\u0628\u0627\u064B \u062A\u0634\u0628\u0647 \u0637\u0644\u0642\u0627\u062A \u0627\u0644\u0631\u0635\u0627\u0635 \u0641\u064A \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u0628\u0642\u0639 \u0628\u0627\u0631\u0632\u0629 \u0639\u0644\u0649 \u0627\u0644\u062B\u0645\u0627\u0631.",
    primarySampleUrl: "assets/phyto/coryneum.svg",
    symptomOrgans: [
      {
        organ: "feuille",
        organFr: "Feuillage (Criblure)",
        organAr: "\u0627\u0644\u0623\u0648\u0631\u0627\u0642 (\u0627\u0644\u062A\u062B\u0642\u0628)",
        imageUrl: "assets/phyto/coryneum.svg",
        descriptionFr: "Petites ponctuations rouges virant au brun dont le centre se d\xE9tache (aspect de coup de fusil).",
        descriptionAr: "\u0628\u0642\u0639 \u0628\u0646\u064A\u0629 \u062F\u0627\u0626\u0631\u064A\u0629 \u064A\u062A\u0633\u0627\u0642\u0637 \u0645\u0631\u0643\u0632\u0647\u0627 \u0645\u062E\u0644\u0641\u0629 \u062B\u0642\u0648\u0628\u0627\u064B \u062A\u0634\u0628\u0647 \u0637\u0644\u0642\u0627\u062A \u0627\u0644\u0631\u0635\u0627\u0635 \u0641\u064A \u0627\u0644\u0623\u0648\u0631\u0627\u0642."
      },
      {
        organ: "fruit",
        organFr: "Fruits",
        organAr: "\u0627\u0644\u062B\u0645\u0627\u0631",
        descriptionFr: "Cro\xFBtes en relief li\xE9geuses avec gouttelettes de gomme collante.",
        descriptionAr: "\u0628\u0642\u0639 \u0641\u0644\u064A\u0646\u064A\u0629 \u0646\u0627\u062A\u0626\u0629 \u0645\u062A\u0635\u0644\u0628\u0629 \u0645\u0639 \u0642\u0637\u0631\u0627\u062A \u0635\u0645\u063A \u062A\u0634\u0648\u0647 \u0633\u0637\u062D \u062D\u0628\u0627\u062A \u0627\u0644\u062E\u0648\u062E \u0648\u0627\u0644\u0646\u0643\u062A\u0627\u0631\u064A\u0646."
      }
    ]
  },
  {
    id: "nec_tetranyque_tisserand",
    nameScientific: "Tetranychus urticae",
    nameFr: "T\xE9tranyque tisserand (Araign\xE9e rouge)",
    nameAr: "\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062A \u0627\u0644\u0623\u062D\u0645\u0631 \u0627\u0644\u0646\u0633\u0627\u062C",
    category: "acarien",
    applicableStages: ["gonflement_bourgeons", "grossissement_fruit", "maturation"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_abamectine", "ing_spiromesifene", "ing_huile_minerale"],
    descriptionFr: "D\xE9coloration gris\xE2tre/plomb\xE9e des feuilles, fines toiles soyeuses sous la face inf\xE9rieure par temps chaud et sec.",
    descriptionAr: "\u062A\u0628\u0631\u0642\u0634 \u0648\u0627\u0635\u0641\u0631\u0627\u0631 \u0631\u0645\u0627\u062F\u064A \u0644\u0644\u0623\u0648\u0631\u0627\u0642 \u0645\u0639 \u062E\u064A\u0648\u0637 \u0639\u0646\u0643\u0628\u0648\u062A\u064A\u0629 \u062F\u0642\u064A\u0642\u0629 \u0641\u064A \u0627\u0644\u062C\u0648 \u0627\u0644\u062D\u0627\u0631 \u0627\u0644\u062C\u0627\u0641.",
    primarySampleUrl: "assets/phyto/acarien.svg"
  },
  {
    id: "nec_monilia_fleur",
    nameScientific: "Monilinia laxa / fructigena",
    nameFr: "Moniliose des fleurs (Pourriture brune)",
    nameAr: "\u0627\u0644\u0639\u0641\u0646 \u0627\u0644\u0628\u0646\u064A \u0644\u0644\u0623\u0632\u0647\u0627\u0631 (\u0627\u0644\u0645\u0648\u0646\u064A\u0644\u064A\u0627)",
    category: "champignon",
    applicableStages: ["floraison", "chute_petales_nouaison"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_boscalid_pyraclo", "ing_tebuconazole", "ing_fluopyram_tebu", "ing_fenhexamid", "ing_captane"],
    descriptionFr: "Fl\xE9trissement brutal et dess\xE8chement des bouquets floraux restant coll\xE9s aux rameaux avec exsudats gommeux.",
    descriptionAr: "\u0630\u0628\u0648\u0644 \u0648\u062C\u0641\u0627\u0641 \u0633\u0631\u064A\u0639 \u0644\u0644\u0623\u0632\u0647\u0627\u0631 \u062A\u0638\u0644 \u0645\u0639\u0644\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u063A\u0635\u0627\u0646 \u0645\u0639 \u0625\u0641\u0631\u0627\u0632\u0627\u062A \u0635\u0645\u063A\u064A\u0629 \u0648\u0627\u0636\u062D\u0629.",
    primarySampleUrl: "assets/phyto/moniliose.svg",
    symptomOrgans: [
      {
        organ: "fleur",
        organFr: "Bouquets floraux",
        organAr: "\u0627\u0644\u0623\u0632\u0647\u0627\u0631 \u0648\u0627\u0644\u0628\u062A\u0644\u0627\u062A",
        imageUrl: "assets/phyto/moniliose.svg",
        descriptionFr: "Brunissement et dess\xE8chement soudain des p\xE9tales qui restent fix\xE9s au bois.",
        descriptionAr: "\u0630\u0628\u0648\u0644 \u0648\u062A\u064A\u0628\u0633 \u0645\u0641\u0627\u062C\u0626 \u0644\u0644\u0623\u0632\u0647\u0627\u0631 \u0645\u0639 \u0627\u0633\u0648\u062F\u0627\u062F\u0647\u0627 \u0648\u0628\u0642\u0627\u0626\u0647\u0627 \u0645\u0644\u062A\u0635\u0642\u0629 \u0628\u0627\u0644\u063A\u0635\u0646 \u0645\u0639 \u0633\u064A\u0644\u0627\u0646 \u0635\u0645\u063A\u064A."
      },
      {
        organ: "rameau",
        organFr: "Rameaux (Chancres)",
        organAr: "\u0627\u0644\u0623\u063A\u0635\u0627\u0646 (\u0627\u0644\u062A\u0642\u0631\u062D\u0627\u062A)",
        descriptionFr: "Chancre entourant la pousse florale avec dess\xE8chement de l'extr\xE9mit\xE9.",
        descriptionAr: "\u062A\u0642\u0631\u062D \u064A\u0637\u0648\u0642 \u0627\u0644\u063A\u0635\u0646 \u0627\u0646\u0637\u0644\u0627\u0642\u0627\u064B \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0632\u0647\u0631\u0629 \u0627\u0644\u0645\u0635\u0627\u0628\u0629 \u0645\u0633\u0628\u0628\u0627\u064B \u0645\u0648\u062A \u0637\u0631\u0641 \u0627\u0644\u063A\u0635\u0646."
      }
    ]
  },
  {
    id: "nec_thrips",
    nameScientific: "Thrips meridionalis / Frankliniella",
    nameFr: "Thrips des fleurs et petits fruits",
    nameAr: "\u0627\u0644\u062A\u0631\u0628\u0633 \u0639\u0644\u0649 \u0627\u0644\u0623\u0632\u0647\u0627\u0631 \u0648\u0627\u0644\u062B\u0645\u0627\u0631 \u0627\u0644\u062D\u062F\u064A\u062B\u0629",
    category: "insecte",
    applicableStages: ["floraison", "chute_petales_nouaison"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_spinosad", "ing_acetamipride", "ing_deltamethrine"],
    descriptionFr: "Piq\xFBres sur ovaires et jeunes fruits provoquant des marbrures li\xE9geuses, d\xE9formations et argentures ind\xE9l\xE9biles.",
    descriptionAr: "\u0644\u0633\u0639 \u062D\u0628\u0627\u062A \u0627\u0644\u062B\u0645\u0627\u0631 \u0627\u0644\u0635\u063A\u064A\u0631\u0629 \u0645\u0633\u0628\u0628\u0627\u064B \u062A\u0634\u0648\u0647\u0627\u062A \u0648\u062A\u0634\u0637\u064A\u0628\u0627\u062A \u0641\u0644\u064A\u0646\u064A\u0629 \u0641\u0636\u064A\u0629 \u062A\u0641\u0642\u062F \u0627\u0644\u062B\u0645\u0631\u0629 \u0642\u064A\u0645\u062A\u0647\u0627 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629."
  },
  {
    id: "nec_oidium",
    nameScientific: "Podosphaera pannosa",
    nameFr: "O\xEFdium du p\xEAcher / nectarinier (Blanc)",
    nameAr: "\u0627\u0644\u0628\u064A\u0627\u0636 \u0627\u0644\u062F\u0642\u064A\u0642\u064A (\u0627\u0644\u0631\u0645\u0627\u062F)",
    category: "champignon",
    applicableStages: ["chute_petales_nouaison", "grossissement_fruit"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_soufre_mouillable", "ing_penconazole", "ing_tebuconazole", "ing_tebu_trifloxy", "ing_boscalid_pyraclo"],
    descriptionFr: "Feutrage blanc farineux sur jeunes pousses, gaufrage des feuilles et taches blanches cireuses sur nectarines.",
    descriptionAr: "\u063A\u0628\u0627\u0631 \u0623\u0628\u064A\u0636 \u062F\u0642\u064A\u0642\u064A \u064A\u0643\u0633\u0648 \u0627\u0644\u0646\u0645\u0648\u0627\u062A \u0627\u0644\u062D\u062F\u064A\u062B\u0629 \u0648\u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0645\u0639 \u0628\u0642\u0639 \u0645\u0628\u064A\u0636\u0629 \u0639\u0644\u0649 \u0642\u0634\u0631\u0629 \u0627\u0644\u062B\u0645\u0627\u0631.",
    primarySampleUrl: "assets/phyto/oidium.svg",
    symptomOrgans: [
      {
        organ: "feuille",
        organFr: "Feuilles & Pousses",
        organAr: "\u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u0627\u0644\u0642\u0645\u0645 \u0627\u0644\u0646\u0627\u0645\u064A\u0629",
        imageUrl: "assets/phyto/oidium.svg",
        descriptionFr: "Poussi\xE8re blanche farineuse recouvrant la face sup\xE9rieure avec recroquevillement du limbe.",
        descriptionAr: "\u0645\u0633\u062D\u0648\u0642 \u0623\u0628\u064A\u0636 \u0637\u062D\u064A\u0646\u064A \u064A\u063A\u0637\u064A \u0627\u0644\u0646\u0645\u0648\u0627\u062A \u0627\u0644\u0641\u062A\u064A\u0629 \u0645\u0639 \u0627\u0644\u062A\u0641\u0627\u0641 \u062D\u0648\u0627\u0641 \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u062A\u0648\u0642\u0641 \u0646\u0645\u0648\u0647\u0627."
      },
      {
        organ: "fruit",
        organFr: "Fruits / Nectarines",
        organAr: "\u0627\u0644\u062B\u0645\u0627\u0631 \u0648\u0627\u0644\u0646\u0643\u062A\u0627\u0631\u064A\u0646",
        descriptionFr: "Taches blanches feutr\xE9es qui deviennent li\xE9geuses et crevass\xE9es \xE0 maturit\xE9.",
        descriptionAr: "\u0628\u0642\u0639 \u062F\u0627\u0626\u0631\u064A\u0629 \u0628\u064A\u0636\u0627\u0621 \u062A\u062A\u062D\u0648\u0644 \u0625\u0644\u0649 \u0637\u0628\u0642\u0629 \u0641\u0644\u064A\u0646\u064A\u0629 \u0645\u062A\u0635\u0644\u0628\u0629 \u062A\u0624\u062F\u064A \u0644\u062A\u0634\u0642\u0642 \u0627\u0644\u062B\u0645\u0627\u0631."
      }
    ]
  },
  {
    id: "nec_puceron_vert",
    nameScientific: "Myzus persicae",
    nameFr: "Puceron vert du p\xEAcher",
    nameAr: "\u0645\u0646\u0651 \u0627\u0644\u062E\u0648\u062E \u0627\u0644\u0623\u062E\u0636\u0631",
    category: "insecte",
    applicableStages: ["chute_petales_nouaison", "grossissement_fruit"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_acetamipride", "ing_spirotetramat", "ing_deltamethrine"],
    descriptionFr: "Forte crispation des feuilles, miellat abondant provoquant la fumagine noire, vecteur de virus (Sharka).",
    descriptionAr: "\u0627\u0644\u062A\u0641\u0627\u0641 \u0634\u062F\u064A\u062F \u0644\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u0625\u0641\u0631\u0627\u0632 \u0646\u062F\u0648\u0629 \u0639\u0633\u0644\u064A\u0629 \u063A\u0632\u064A\u0631\u0629 \u062A\u0633\u0628\u0628 \u0627\u0644\u0639\u0641\u0646 \u0627\u0644\u0623\u0633\u0648\u062F \u0648\u0646\u0642\u0644 \u0627\u0644\u0641\u064A\u0631\u0648\u0633\u0627\u062A."
  },
  {
    id: "nec_tordeuse_orientale",
    nameScientific: "Grapholita molesta",
    nameFr: "Tordeuse orientale du p\xEAcher",
    nameAr: "\u062F\u0648\u062F\u0629 \u0627\u0644\u062E\u0648\u062E \u0627\u0644\u0634\u0631\u0642\u064A\u0629 (\u0627\u0644\u063A\u0631\u0627\u0641\u0648\u0644\u064A\u062A\u0627)",
    category: "insecte",
    applicableStages: ["chute_petales_nouaison", "grossissement_fruit", "maturation"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_chlorantraniliprole", "ing_emamectine", "ing_spinosad", "ing_bacillus"],
    descriptionFr: "Fl\xE9trissement des jeunes pousses terminales (forage de galeries) puis p\xE9n\xE9tration des chenilles dans les fruits.",
    descriptionAr: "\u0630\u0628\u0648\u0644 \u0627\u0644\u0642\u0645\u0645 \u0627\u0644\u0646\u0627\u0645\u064A\u0629 \u0628\u0633\u0628\u0628 \u062D\u0641\u0631 \u0627\u0644\u064A\u0631\u0642\u0627\u062A \u0628\u062F\u0627\u062E\u0644\u0647\u0627 \u062B\u0645 \u0627\u062E\u062A\u0631\u0627\u0642 \u0627\u0644\u062B\u0645\u0627\u0631 \u0639\u0646\u062F \u0627\u0644\u0646\u0636\u062C \u0645\u0639 \u0633\u064A\u0644\u0627\u0646 \u0627\u0644\u0635\u0645\u063A."
  },
  {
    id: "nec_rouille",
    nameScientific: "Tranzschelia pruni-spinosae",
    nameFr: "Rouille du p\xEAcher",
    nameAr: "\u0635\u062F\u0623 \u0627\u0644\u062E\u0648\u062E",
    category: "champignon",
    applicableStages: ["grossissement_fruit", "maturation"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_tebuconazole", "ing_difenoconazole", "ing_soufre_mouillable"],
    descriptionFr: "Pustules brun-rouille sur la face inf\xE9rieure des feuilles provoquant une d\xE9foliation pr\xE9matur\xE9e en \xE9t\xE9.",
    descriptionAr: "\u0628\u062B\u0631\u0627\u062A \u0635\u062F\u0626\u064A\u0629 \u0628\u0646\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u0633\u0637\u062D \u0627\u0644\u0633\u0641\u0644\u064A \u0644\u0644\u0623\u0648\u0631\u0627\u0642 \u062A\u0633\u0628\u0628 \u0633\u0642\u0648\u0637\u0627\u064B \u0645\u0628\u0643\u0631\u0627\u064B \u0644\u0644\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u062E\u0636\u0631\u064A \u0641\u064A \u0627\u0644\u0635\u064A\u0641."
  },
  {
    id: "nec_petite_mineuse",
    nameScientific: "Anarsia lineatella",
    nameFr: "Petite mineuse du p\xEAcher (Anarsia)",
    nameAr: "\u062D\u0641\u0627\u0631 \u0623\u063A\u0635\u0627\u0646 \u0648\u062B\u0645\u0627\u0631 \u0627\u0644\u062E\u0648\u062E (\u0627\u0644\u0623\u0646\u0627\u0631\u0633\u064A\u0627)",
    category: "insecte",
    applicableStages: ["grossissement_fruit", "maturation"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_chlorantraniliprole", "ing_emamectine", "ing_spinosad"],
    descriptionFr: "Pousses min\xE9es et dess\xE9ch\xE9es, attaques directes sur fruits en pr\xE9-r\xE9colte avec coul\xE9es de r\xE9sine.",
    descriptionAr: "\u062C\u0641\u0627\u0641 \u0627\u0644\u0646\u0645\u0648\u0627\u062A \u0627\u0644\u0641\u062A\u064A\u0629 \u0648\u062F\u062E\u0648\u0644 \u0627\u0644\u064A\u0631\u0642\u0627\u062A \u0625\u0644\u0649 \u0627\u0644\u062B\u0645\u0627\u0631 \u0642\u0631\u0628 \u0627\u0644\u0646\u0636\u062C \u0645\u0633\u0628\u0628\u0629 \u062A\u0633\u0627\u0642\u0637 \u0627\u0644\u062B\u0645\u0627\u0631."
  },
  {
    id: "nec_ceratite",
    nameScientific: "Ceratitis capitata",
    nameFr: "Mouche m\xE9diterran\xE9enne des fruits (C\xE9ratite)",
    nameAr: "\u0630\u0628\u0627\u0628\u0629 \u0641\u0627\u0643\u0647\u0629 \u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0645\u062A\u0648\u0633\u0637 (\u0627\u0644\u0633\u064A\u0631\u0627\u062A\u064A\u062A)",
    category: "insecte",
    applicableStages: ["maturation"],
    crops: ["nectarine", "peche", "pomme"],
    compatibleActiveIngredients: ["ing_spinosad", "ing_deltamethrine", "ing_cypermethrine", "ing_acetamipride"],
    descriptionFr: "Piq\xFBres de ponte sur fruits m\xFBrissants, asticots dans la pulpe entra\xEEnant une d\xE9composition rapide.",
    descriptionAr: "\u0648\u062E\u0632 \u0627\u0644\u062B\u0645\u0627\u0631 \u0644\u0648\u0636\u0639 \u0627\u0644\u0628\u064A\u0636 \u0648\u062F\u062E\u0648\u0644 \u0627\u0644\u064A\u0631\u0642\u0627\u062A \u0627\u0644\u062F\u0648\u062F\u064A\u0629 \u0625\u0644\u0649 \u0627\u0644\u0644\u0628 \u0645\u0633\u0628\u0628\u0629 \u0641\u0633\u0627\u062F\u0647\u0627 \u0648\u0633\u0642\u0648\u0637\u0647\u0627 \u0627\u0644\u0633\u0631\u064A\u0639.",
    primarySampleUrl: "assets/phyto/ceratite.svg",
    symptomOrgans: [
      {
        organ: "fruit",
        organFr: "Fruits m\xFBrs",
        organAr: "\u0627\u0644\u062B\u0645\u0627\u0631 \u0627\u0644\u0646\u0627\u0636\u062C\u0629",
        imageUrl: "assets/phyto/ceratite.svg",
        descriptionFr: "Point noir de piq\xFBre de ponte entour\xE9 d'un halo ramolli translucide. Pulpe liqu\xE9fi\xE9e par les asticots.",
        descriptionAr: "\u0648\u062E\u0632\u0629 \u062F\u0642\u064A\u0642\u0629 \u0645\u0643\u0627\u0646 \u0648\u0636\u0639 \u0627\u0644\u0628\u064A\u0636 \u0645\u062D\u0627\u0637\u0629 \u0628\u0647\u0627\u0644\u0629 \u0637\u0631\u064A\u0629 \u0631\u062E\u0648\u0629\u060C \u0648\u0627\u0646\u0647\u064A\u0627\u0631 \u0627\u0644\u0644\u0628 \u0627\u0644\u062F\u0627\u062E\u0644\u064A \u0645\u0639 \u0648\u062C\u0648\u062F \u0627\u0644\u064A\u0631\u0642\u0627\u062A \u0627\u0644\u062F\u0648\u062F\u064A\u0629 \u0627\u0644\u0628\u064A\u0636\u0627\u0621."
      }
    ]
  },
  {
    id: "nec_monilia_fruit",
    nameScientific: "Monilinia fructicola / laxa",
    nameFr: "Moniliose des fruits (Pourriture brune)",
    nameAr: "\u0627\u0644\u0639\u0641\u0646 \u0627\u0644\u0628\u0646\u064A \u0644\u0644\u062B\u0645\u0627\u0631 \u0642\u0628\u0644 \u0627\u0644\u062C\u0646\u064A",
    category: "champignon",
    applicableStages: ["grossissement_fruit", "maturation"],
    crops: ["nectarine", "peche"],
    compatibleActiveIngredients: ["ing_fenhexamid", "ing_boscalid_pyraclo", "ing_tebuconazole", "ing_fluopyram_tebu"],
    descriptionFr: "Taches rondes brunes s\u2019\xE9tendant rapidement avec coussinets de spores en cercles concentriques. Momification.",
    descriptionAr: "\u062A\u0639\u0641\u0646 \u062F\u0627\u0626\u0631\u064A \u0628\u0646\u064A \u0633\u0631\u064A\u0639 \u0627\u0644\u0627\u0646\u062A\u0634\u0627\u0631 \u0645\u0639 \u062D\u0644\u0642\u0627\u062A \u0628\u0648\u063A\u064A\u0629 \u0628\u064A\u0636\u0627\u0621 \u0648\u062A\u062D\u0646\u0637 \u0627\u0644\u062B\u0645\u0627\u0631 \u0639\u0644\u0649 \u0627\u0644\u0634\u062C\u0631\u0629.",
    primarySampleUrl: "assets/phyto/moniliose.svg",
    symptomOrgans: [
      {
        organ: "fruit",
        organFr: "Fruits en maturation",
        organAr: "\u0627\u0644\u062B\u0645\u0627\u0631 \u0641\u064A \u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0646\u0636\u062C",
        imageUrl: "assets/phyto/moniliose.svg",
        descriptionFr: "Pourriture brune circulaire avec coussinets concentriques de spores beiges, momification des fruits rest\xE9s sur l'arbre.",
        descriptionAr: "\u0639\u0641\u0646 \u0628\u0646\u064A \u062F\u0627\u0626\u0631\u064A \u0633\u0631\u064A\u0639 \u0627\u0644\u062A\u0648\u0633\u0639 \u0645\u0639 \u062A\u0634\u0643\u0644 \u062F\u0648\u0627\u0626\u0631 \u0645\u062A\u062D\u062F\u0629 \u0627\u0644\u0645\u0631\u0643\u0632 \u0645\u0646 \u0627\u0644\u062D\u0628\u064A\u0628\u0627\u062A \u0627\u0644\u0641\u0637\u0631\u064A\u0629 \u0627\u0644\u0628\u064A\u0636\u0627\u0621/\u0627\u0644\u0631\u0645\u0627\u062F\u064A\u0629 \u0648\u062A\u062D\u0646\u0637 \u0627\u0644\u062D\u0628\u0629."
      }
    ]
  },
  // -------------------------------------------------------------
  // 2. POMMIER (Malus domestica)
  // -------------------------------------------------------------
  {
    id: "pom_tavelure",
    nameScientific: "Venturia inaequalis",
    nameFr: "Tavelure du pommier",
    nameAr: "\u062C\u0631\u0628 \u0627\u0644\u062A\u0641\u0627\u062D",
    category: "champignon",
    applicableStages: ["dormance", "gonflement_bourgeons", "floraison", "chute_petales_nouaison", "grossissement_fruit", "post_recolte", "chute_feuilles"],
    crops: ["pomme"],
    compatibleActiveIngredients: ["ing_dithianon", "ing_difenoconazole", "ing_kresoxim_methyl", "ing_captane", "ing_cuivre_bouillie", "ing_boscalid_pyraclo"],
    descriptionFr: "Taches vert-olive velout\xE9es sur feuilles puis crevasses, d\xE9formations et gale noire sur pommes.",
    descriptionAr: "\u0628\u0642\u0639 \u0632\u064A\u062A\u0648\u0646\u064A\u0629 \u062F\u0627\u0643\u0646\u0629 \u0645\u062E\u0645\u0644\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u062A\u0634\u0642\u0642 \u0648\u062A\u0635\u0644\u0628 \u0642\u0634\u0631\u0629 \u0627\u0644\u062B\u0645\u0627\u0631 \u0645\u0633\u0628\u0628\u0629 \u062A\u0634\u0648\u0647\u0627\u062A \u063A\u064A\u0631 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0633\u0648\u064A\u0642.",
    primarySampleUrl: "assets/phyto/tavelure.svg",
    symptomOrgans: [
      {
        organ: "feuille",
        organFr: "Feuilles",
        organAr: "\u0627\u0644\u0623\u0648\u0631\u0627\u0642",
        imageUrl: "assets/phyto/tavelure.svg",
        descriptionFr: "Taches velout\xE9es oliv\xE2tres puis brun fonc\xE9 avec d\xE9formation et chute pr\xE9matur\xE9e.",
        descriptionAr: "\u0628\u0642\u0639 \u0632\u064A\u062A\u0648\u0646\u064A\u0629 \u0645\u062E\u0645\u0644\u064A\u0629 \u0627\u0644\u0645\u0644\u0645\u0633 \u062A\u062A\u062D\u0648\u0644 \u0644\u0644\u0648\u0646 \u0627\u0644\u0628\u0646\u064A \u0627\u0644\u0645\u0633\u0648\u062F \u0639\u0644\u0649 \u0646\u0635\u0644\u064A \u0627\u0644\u0648\u0631\u0642\u0629 \u0645\u0639 \u062A\u0633\u0627\u0642\u0637 \u0645\u0628\u0643\u0631."
      },
      {
        organ: "fruit",
        organFr: "Pommes",
        organAr: "\u0627\u0644\u062B\u0645\u0627\u0631",
        imageUrl: "assets/phyto/tavelure.svg",
        descriptionFr: "Cro\xFBtes noires li\xE9geuses, crevasses profondes et d\xE9formations rendant les pommes invendables.",
        descriptionAr: "\u0642\u0634\u0648\u0631 \u0641\u0644\u064A\u0646\u064A\u0629 \u0633\u0648\u062F\u0627\u0621 \u0648\u0634\u0642\u0648\u0642 \u063A\u0627\u0626\u0631\u0629 \u0648\u062A\u0634\u0648\u0647\u0627\u062A \u062D\u0627\u062F\u0629 \u0641\u064A \u0627\u0644\u062B\u0645\u0627\u0631 \u062A\u0641\u0642\u062F\u0647\u0627 \u0642\u064A\u0645\u062A\u0647\u0627 \u0627\u0644\u062A\u0633\u0648\u064A\u0642\u064A\u0629."
      }
    ]
  },
  {
    id: "pom_feu_bacterien",
    nameScientific: "Erwinia amylovora",
    nameFr: "Feu bact\xE9rien du pommier",
    nameAr: "\u0627\u0644\u0644\u0641\u062D\u0629 \u0627\u0644\u0628\u0643\u062A\u064A\u0631\u064A\u0629 (\u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0642 \u0627\u0644\u0628\u0643\u062A\u064A\u0631\u064A)",
    category: "bacterie",
    applicableStages: ["floraison", "chute_petales_nouaison", "grossissement_fruit"],
    crops: ["pomme"],
    compatibleActiveIngredients: ["ing_fosetyl_al", "ing_cuivre_bouillie"],
    descriptionFr: "Inflorescences et pousses noircies prenant l\u2019aspect de br\xFBlures de feu, crosse caract\xE9ristique en canne d\u2019\xE9v\xEAque.",
    descriptionAr: "\u0627\u0633\u0648\u062F\u0627\u062F \u0645\u0641\u0627\u062C\u0626 \u0644\u0644\u0623\u0632\u0647\u0627\u0631 \u0648\u0627\u0644\u0623\u0641\u0631\u0639 \u0627\u0644\u0646\u0627\u0645\u064A\u0629 \u0643\u0623\u0646\u0647\u0627 \u0645\u062D\u062A\u0631\u0642\u0629 \u0628\u0627\u0644\u0646\u0627\u0631 \u0645\u0639 \u0627\u0646\u062D\u0646\u0627\u0621 \u0627\u0644\u0642\u0645\u0645 \u0627\u0644\u0646\u0627\u0645\u064A\u0629 \u0643\u0627\u0644\u0639\u0635\u0627.",
    primarySampleUrl: "assets/phyto/feu_bacterien.svg",
    symptomOrgans: [
      {
        organ: "fleur",
        organFr: "Fleurs & Bouquets",
        organAr: "\u0627\u0644\u0623\u0632\u0647\u0627\u0631 \u0648\u0627\u0644\u0646\u0648\u0631\u0627\u062A",
        imageUrl: "assets/phyto/feu_bacterien.svg",
        descriptionFr: "Fl\xE9trissement brusque et noircissement comme br\xFBl\xE9 par un coup de feu avec gouttelettes d'exsudat bact\xE9rien.",
        descriptionAr: "\u0630\u0628\u0648\u0644 \u0645\u0641\u0627\u062C\u0626 \u0648\u0627\u0633\u0648\u062F\u0627\u062F \u0627\u0644\u0623\u0632\u0647\u0627\u0631 \u0643\u0623\u0646\u0647\u0627 \u0645\u062D\u062A\u0631\u0642\u0629 \u0628\u0646\u0627\u0631 \u0645\u0639 \u0642\u0637\u0631\u0627\u062A \u0625\u0641\u0631\u0627\u0632 \u0628\u0643\u062A\u064A\u0631\u064A \u0645\u0627\u0626\u064A \u062D\u0644\u064A\u0628\u064A."
      },
      {
        organ: "rameau",
        organFr: "Pousses (Crosse)",
        organAr: "\u0627\u0644\u0642\u0645\u0645 \u0627\u0644\u0646\u0627\u0645\u064A\u0629 (\u0627\u0646\u062D\u0646\u0627\u0621 \u0627\u0644\u0639\u0635\u0627)",
        imageUrl: "assets/phyto/feu_bacterien.svg",
        descriptionFr: "Courbure typique en canne d'\xE9v\xEAque de la pousse terminale noircie.",
        descriptionAr: "\u0627\u0646\u062D\u0646\u0627\u0621 \u0631\u0623\u0633 \u0627\u0644\u063A\u0635\u0646 \u0627\u0644\u0623\u0633\u0648\u062F \u0627\u0644\u0645\u062D\u062A\u0631\u0642 \u0639\u0644\u0649 \u0634\u0643\u0644 \u0639\u0643\u0627\u0632 \u0623\u0648 \u0639\u0635\u0627 \u0645\u0645\u064A\u0632\u0629."
      }
    ]
  },
  {
    id: "pom_carpocapse",
    nameScientific: "Cydia pomonella",
    nameFr: "Carpocapse des pommes (Ver de la pomme)",
    nameAr: "\u062F\u0648\u062F \u062B\u0645\u0627\u0631 \u0627\u0644\u062A\u0641\u0627\u062D (\u0627\u0644\u0643\u0627\u0631\u0628\u0648\u0643\u0627\u0628\u0633)",
    category: "insecte",
    applicableStages: ["chute_petales_nouaison", "grossissement_fruit", "maturation"],
    crops: ["pomme"],
    compatibleActiveIngredients: ["ing_chlorantraniliprole", "ing_emamectine", "ing_acetamipride", "ing_bacillus"],
    descriptionFr: "Galerie creus\xE9e jusqu\u2019aux p\xE9pins avec d\xE9jections brunes rejet\xE9es par l\u2019orifice d\u2019entr\xE9e. Chute des fruits.",
    descriptionAr: "\u062D\u0641\u0631 \u0623\u0646\u0641\u0627\u0642 \u062F\u0627\u062E\u0644 \u0627\u0644\u062B\u0645\u0631\u0629 \u062D\u062A\u0649 \u0627\u0644\u0628\u0630\u0648\u0631 \u0645\u0639 \u062E\u0631\u0648\u062C \u0641\u0636\u0644\u0627\u062A \u0628\u0646\u064A\u0629 \u0645\u0646 \u0641\u062A\u062D\u0629 \u0627\u0644\u062F\u062E\u0648\u0644 \u0648\u0633\u0642\u0648\u0637 \u0627\u0644\u062B\u0645\u0627\u0631 \u0642\u0628\u0644 \u0646\u0636\u062C\u0647\u0627.",
    primarySampleUrl: "assets/phyto/carpocapse.svg",
    symptomOrgans: [
      {
        organ: "fruit",
        organFr: "Pommes perfor\xE9es",
        organAr: "\u0627\u0644\u062B\u0645\u0627\u0631 \u0627\u0644\u0645\u0635\u0627\u0628\u0629",
        imageUrl: "assets/phyto/carpocapse.svg",
        descriptionFr: "Orifice d'entr\xE9e de la chenille entour\xE9 d'une ar\xE9ole rouge\xE2tre avec d\xE9jections granuleuses brunes rejet\xE9es vers l'ext\xE9rieur.",
        descriptionAr: "\u062B\u0642\u0628 \u062F\u062E\u0648\u0644 \u0645\u062D\u0627\u0637 \u0628\u0647\u0627\u0644\u0629 \u0645\u062D\u0645\u0631\u0629 \u0645\u0639 \u062A\u0631\u0627\u0643\u0645 \u0641\u0636\u0644\u0627\u062A \u0628\u0646\u064A\u0629 \u062D\u0628\u064A\u0628\u064A\u0629 \u062E\u0627\u0631\u062C \u0627\u0644\u062B\u0642\u0628 \u0648\u062A\u0648\u062C\u0647 \u0627\u0644\u062F\u0648\u062F\u0629 \u0644\u063A\u0631\u0641\u0629 \u0627\u0644\u0628\u0630\u0648\u0631."
      }
    ]
  },
  {
    id: "pom_puceron_cendre",
    nameScientific: "Dysaphis plantaginea",
    nameFr: "Puceron cendr\xE9 du pommier",
    nameAr: "\u0645\u0646 \u0627\u0644\u062A\u0641\u0627\u062D \u0627\u0644\u0648\u0631\u062F\u064A / \u0627\u0644\u0631\u0645\u0627\u062F\u064A",
    category: "insecte",
    applicableStages: ["gonflement_bourgeons", "floraison", "chute_petales_nouaison"],
    crops: ["pomme"],
    compatibleActiveIngredients: ["ing_acetamipride", "ing_spirotetramat", "ing_deltamethrine"],
    descriptionFr: "Enroulement tr\xE8s s\xE9v\xE8re des feuilles, arr\xEAt de v\xE9g\xE9tation et atrophie compl\xE8te des fruits qui restent petits et bossel\xE9s.",
    descriptionAr: "\u0627\u0644\u062A\u0641\u0627\u0641 \u0634\u062F\u064A\u062F \u0644\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u062A\u0634\u0648\u0647 \u0643\u0627\u0645\u0644 \u0644\u0644\u062B\u0645\u0627\u0631 \u0627\u0644\u0635\u063A\u064A\u0631\u0629 \u0627\u0644\u062A\u064A \u062A\u0628\u0642\u0649 \u0635\u063A\u064A\u0631\u0629 \u0648\u0636\u0627\u0645\u0631\u0629 \u0639\u0644\u0649 \u0634\u0643\u0644 \u0639\u0646\u0627\u0642\u064A\u062F \u0645\u0634\u0648\u0647\u0629."
  },
  {
    id: "pom_puceron_lanigere",
    nameScientific: "Eriosoma lanigerum",
    nameFr: "Puceron lanig\xE8re du pommier",
    nameAr: "\u0627\u0644\u0645\u0646 \u0627\u0644\u0642\u0637\u0646\u064A \u0644\u0644\u062A\u0641\u0627\u062D",
    category: "insecte",
    applicableStages: ["dormance", "chute_petales_nouaison", "grossissement_fruit"],
    crops: ["pomme"],
    compatibleActiveIngredients: ["ing_spirotetramat", "ing_huile_minerale", "ing_acetamipride"],
    descriptionFr: "Masses cotonneuses blanch\xE2tres sur les plaies, chancres noduleux sur rameaux et racines.",
    descriptionAr: "\u0643\u062A\u0644 \u0642\u0637\u0646\u064A\u0629 \u0628\u064A\u0636\u0627\u0621 \u0633\u0645\u064A\u0643\u0629 \u0639\u0644\u0649 \u0627\u0644\u062C\u0631\u0648\u062D \u0648\u0627\u0644\u0623\u063A\u0635\u0627\u0646 \u062A\u0641\u0631\u0632 \u0623\u0648\u0631\u0627\u0645\u0627\u064B \u0633\u0631\u0637\u0627\u0646\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u062E\u0634\u0628 \u0648\u0627\u0644\u062C\u0630\u0648\u0631."
  },
  {
    id: "pom_oidium",
    nameScientific: "Podosphaera leucotricha",
    nameFr: "O\xEFdium du pommier (Blanc)",
    nameAr: "\u0627\u0644\u0628\u064A\u0627\u0636 \u0627\u0644\u062F\u0642\u064A\u0642\u064A \u0644\u0644\u062A\u0641\u0627\u062D",
    category: "champignon",
    applicableStages: ["gonflement_bourgeons", "chute_petales_nouaison", "grossissement_fruit"],
    crops: ["pomme"],
    compatibleActiveIngredients: ["ing_soufre_mouillable", "ing_penconazole", "ing_difenoconazole", "ing_kresoxim_methyl"],
    descriptionFr: "Pousses blanchies, feuilles \xE9troites et crisp\xE9es, r\xE9seau li\xE9geux (russeting) sur les pommes.",
    descriptionAr: "\u0637\u063A\u064A\u0627\u0646 \u0645\u0633\u062D\u0648\u0642 \u0623\u0628\u064A\u0636 \u0639\u0644\u0649 \u0627\u0644\u0646\u0645\u0648\u0627\u062A \u0648\u062A\u0634\u0648\u0647 \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0645\u0639 \u0634\u0628\u0643\u0629 \u0641\u0644\u064A\u0646\u064A\u0629 \u0628\u0646\u064A\u0629 \u062A\u063A\u0637\u064A \u0642\u0634\u0631\u0629 \u0627\u0644\u062A\u0641\u0627\u062D."
  },
  {
    id: "pom_acarien_rouge",
    nameScientific: "Panonychus ulmi",
    nameFr: "T\xE9tranyque rouge du pommier (Acarien rouge)",
    nameAr: "\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062A \u0627\u0644\u0623\u062D\u0645\u0631 \u0627\u0644\u0623\u0648\u0631\u0648\u0628\u064A",
    category: "acarien",
    applicableStages: ["chute_petales_nouaison", "grossissement_fruit"],
    crops: ["pomme"],
    compatibleActiveIngredients: ["ing_abamectine", "ing_spiromesifene", "ing_huile_minerale"],
    descriptionFr: "Feuilles couleur plomb ou bronze, baisse de photosynth\xE8se et perte de coloration des fruits.",
    descriptionAr: "\u062A\u0644\u0648\u0646 \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0628\u0644\u0648\u0646 \u0628\u0631\u0648\u0646\u0632\u064A \u0643\u0626\u064A\u0628 \u0648\u0636\u0639\u0641 \u0642\u062F\u0631\u0629 \u0627\u0644\u0634\u062C\u0631\u0629 \u0639\u0644\u0649 \u062A\u063A\u0630\u064A\u0629 \u0627\u0644\u062B\u0645\u0627\u0631 \u0641\u064A \u0627\u0644\u0635\u064A\u0641."
  },
  // -------------------------------------------------------------
  // 3. OLIVIER (Olea europaea)
  // -------------------------------------------------------------
  {
    id: "oli_oeil_paon",
    nameScientific: "Venturia oleaginea (Spilocaea oleagina)",
    nameFr: "\u0152il de paon de l\u2019olivier",
    nameAr: "\u0639\u064A\u0646 \u0627\u0644\u0637\u0627\u0648\u0648\u0633 \u0641\u064A \u0627\u0644\u0632\u064A\u062A\u0648\u0646 (\u062A\u0628\u0642\u0639 \u0627\u0644\u0623\u0648\u0631\u0627\u0642)",
    category: "champignon",
    applicableStages: ["dormance", "gonflement_bourgeons", "post_recolte", "chute_feuilles"],
    crops: ["olive"],
    compatibleActiveIngredients: ["ing_oxychlorure_cuivre", "ing_cuivre_bouillie", "ing_tebu_trifloxy", "ing_kresoxim_methyl", "ing_difenoconazole"],
    descriptionFr: "Taches circulaires caract\xE9ristiques bord\xE9es d\u2019un halo jaune sur la face sup\xE9rieure des feuilles. Forte d\xE9foliation.",
    descriptionAr: "\u0628\u0642\u0639 \u062F\u0627\u0626\u0631\u064A\u0629 \u0645\u0645\u064A\u0632\u0629 \u062A\u0634\u0628\u0647 \u0631\u064A\u0634 \u0627\u0644\u0637\u0627\u0648\u0648\u0633 \u062A\u0633\u0628\u0628 \u062A\u0633\u0627\u0642\u0637\u0627\u064B \u0643\u062B\u064A\u0641\u0627\u064B \u0644\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u0636\u0639\u0641 \u0627\u0644\u0623\u0634\u062C\u0627\u0631 \u0648\u0625\u0646\u062A\u0627\u062C\u0647\u0627.",
    primarySampleUrl: "assets/phyto/oeil_paon.svg",
    symptomOrgans: [
      {
        organ: "feuille",
        organFr: "Feuillage d'olivier",
        organAr: "\u0623\u0648\u0631\u0627\u0642 \u0627\u0644\u0632\u064A\u062A\u0648\u0646",
        imageUrl: "assets/phyto/oeil_paon.svg",
        descriptionFr: "Taches circulaires fonc\xE9es bord\xE9es d'une aur\xE9ole jaune tr\xE8s caract\xE9ristique (\u0153il de paon). D\xE9foliation s\xE9v\xE8re de l'arbre.",
        descriptionAr: "\u0628\u0642\u0639 \u062F\u0627\u0626\u0631\u064A\u0629 \u062F\u0627\u0643\u0646\u0629 \u0645\u062D\u0627\u0637\u0629 \u0628\u0647\u0627\u0644\u0629 \u0635\u0641\u0631\u0627\u0621 \u062A\u0634\u0628\u0647 \u0639\u064A\u0648\u0646 \u0631\u064A\u0634 \u0627\u0644\u0637\u0627\u0648\u0648\u0633\u060C \u062A\u0624\u062F\u064A \u0644\u062A\u0633\u0627\u0642\u0637 \u062C\u0645\u0627\u0639\u064A \u0644\u0644\u0623\u0648\u0631\u0627\u0642 \u0648\u062A\u0639\u0631\u064A \u0627\u0644\u0623\u063A\u0635\u0627\u0646."
      },
      {
        organ: "fruit",
        organFr: "Olives",
        organAr: "\u062B\u0645\u0627\u0631 \u0627\u0644\u0632\u064A\u062A\u0648\u0646",
        imageUrl: "assets/phyto/oeil_paon.svg",
        descriptionFr: "Petites taches n\xE9crotiques circulaires sur les fruits en cas de forte humidit\xE9 automnale.",
        descriptionAr: "\u0628\u0642\u0639 \u063A\u0627\u0626\u0631\u0629 \u0628\u0646\u064A\u0629 \u0639\u0644\u0649 \u062D\u0628\u0627\u062A \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0641\u064A \u0627\u0644\u062E\u0631\u064A\u0641 \u0627\u0644\u0631\u0637\u0628 \u062A\u0624\u062F\u064A \u0644\u062A\u0644\u0641 \u0627\u0644\u062D\u0628\u0627\u062A."
      }
    ]
  },
  {
    id: "oli_tuberculose",
    nameScientific: "Pseudomonas savastanoi pv. savastanoi",
    nameFr: "Tuberculose de l\u2019olivier (Gale)",
    nameAr: "\u0633\u0644 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 (\u0627\u0644\u062F\u0631\u0646 \u0627\u0644\u0628\u0643\u062A\u064A\u0631\u064A)",
    category: "bacterie",
    applicableStages: ["dormance", "post_recolte", "chute_feuilles"],
    crops: ["olive"],
    compatibleActiveIngredients: ["ing_cuivre_bouillie", "ing_oxychlorure_cuivre"],
    descriptionFr: "Tumeurs rugueuses et excroissances ligneuses sur rameaux cons\xE9cutives aux blessures de taille, gel ou r\xE9colte m\xE9canique.",
    descriptionAr: "\u0623\u0648\u0631\u0627\u0645 \u0648\u0639\u0642\u062F \u062E\u0634\u0628\u064A\u0629 \u0628\u0627\u0631\u0632\u0629 \u062A\u062A\u0643\u0648\u0646 \u0641\u064A \u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062C\u0631\u0648\u062D \u0628\u0639\u062F \u0627\u0644\u062A\u0642\u0644\u064A\u0645 \u0623\u0648 \u0627\u0644\u062C\u0646\u064A \u0628\u0627\u0644\u0639\u0635\u064A \u0623\u0648 \u0623\u0636\u0631\u0627\u0631 \u0627\u0644\u0635\u0642\u064A\u0639 \u0648\u0627\u0644\u0628\u0631\u062F.",
    primarySampleUrl: "assets/phyto/tuberculose.svg",
    symptomOrgans: [
      {
        organ: "rameau",
        organFr: "Rameaux & Branches (Galles)",
        organAr: "\u0627\u0644\u0623\u063A\u0635\u0627\u0646 \u0648\u0627\u0644\u062C\u0630\u0639 (\u0623\u0648\u0631\u0627\u0645 \u0648\u062B\u0622\u0644\u064A\u0644)",
        imageUrl: "assets/phyto/tuberculose.svg",
        descriptionFr: "Excroissances ligneuses rugueuses (tubercules/verrues) sur les n\u0153uds et cicatrices de r\xE9colte bloquant la s\xE8ve.",
        descriptionAr: "\u0623\u0648\u0631\u0627\u0645 \u0648\u062B\u0622\u0644\u064A\u0644 \u062E\u0634\u0628\u064A\u0629 \u062E\u0634\u0646\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u063A\u0635\u0627\u0646 \u0648\u0627\u0644\u0628\u0631\u0627\u0639\u0645 \u0648\u0646\u062F\u0628\u0627\u062A \u0627\u0644\u062C\u0646\u064A \u0648\u0627\u0644\u062A\u0642\u0644\u064A\u0645 \u062A\u0645\u0646\u0639 \u0633\u0631\u064A\u0627\u0646 \u0627\u0644\u0639\u0635\u0627\u0631\u0629 \u0648\u062A\u062C\u0641\u0641 \u0627\u0644\u063A\u0635\u0646."
      }
    ]
  },
  {
    id: "oli_psylle",
    nameScientific: "Euphyllura olivina",
    nameFr: "Psylle de l\u2019olivier (Coton blanc)",
    nameAr: "\u0628\u0633\u064A\u0644\u0627 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 (\u0635\u0648\u0641 / \u0642\u0637\u0646 \u0627\u0644\u0632\u064A\u062A\u0648\u0646)",
    category: "insecte",
    applicableStages: ["gonflement_bourgeons", "floraison"],
    crops: ["olive"],
    compatibleActiveIngredients: ["ing_deltamethrine", "ing_cypermethrine", "ing_acetamipride"],
    descriptionFr: "S\xE9cr\xE9tions abondantes de filaments cotonneux blancs enveloppant les grappes florales, avortement des fleurs.",
    descriptionAr: "\u0625\u0641\u0631\u0627\u0632 \u062E\u064A\u0648\u0637 \u0634\u0645\u0639\u064A\u0629 \u0628\u064A\u0636\u0627\u0621 \u062A\u0634\u0628\u0647 \u0643\u062A\u0644 \u0627\u0644\u0642\u0637\u0646 \u062A\u063A\u0644\u0641 \u0627\u0644\u0646\u0648\u0631\u0627\u062A \u0627\u0644\u0632\u0647\u0631\u064A\u0629 \u0648\u062A\u0645\u0646\u0639 \u0639\u0642\u062F \u0627\u0644\u062B\u0645\u0627\u0631.",
    primarySampleUrl: "assets/phyto/psylle.svg"
  },
  {
    id: "oli_teigne",
    nameScientific: "Prays oleae",
    nameFr: "Teigne de l\u2019olivier",
    nameAr: "\u0639\u062B\u0629 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 (\u062D\u0634\u0631\u0629 \u0627\u0644\u0635\u064A\u0641 \u0648\u0627\u0644\u062E\u0631\u064A\u0641)",
    category: "insecte",
    applicableStages: ["gonflement_bourgeons", "floraison", "chute_petales_nouaison", "grossissement_fruit"],
    crops: ["olive"],
    compatibleActiveIngredients: ["ing_bacillus", "ing_deltamethrine", "ing_cyantraniliprole", "ing_acetamipride"],
    descriptionFr: "3 g\xE9n\xE9rations cl\xE9s : d\xE9g\xE2ts sur feuilles (anthophage), sur fleurs (fils soyeux) et foration du p\xE9doncule entra\xEEnant la chute d\u2019olives.",
    descriptionAr: "\u062A\u0647\u0627\u062C\u0645 \u0627\u0644\u0623\u0632\u0647\u0627\u0631 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u062A\u062B\u0642\u0628 \u0639\u0646\u0642 \u0627\u0644\u062B\u0645\u0627\u0631 \u0641\u064A \u0627\u0644\u0635\u064A\u0641 \u0645\u0633\u0628\u0628\u0629 \u0633\u0642\u0648\u0637\u0627\u064B \u0643\u0628\u064A\u0631\u0627\u064B \u0644\u062D\u0628\u0627\u062A \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0642\u0628\u0644 \u0627\u0644\u0646\u0636\u062C.",
    primarySampleUrl: "assets/phyto/thrips.svg"
  },
  {
    id: "oli_mouche",
    nameScientific: "Bactrocera oleae",
    nameFr: "Mouche de l\u2019olive (Dacus)",
    nameAr: "\u0630\u0628\u0627\u0628\u0629 \u062B\u0645\u0627\u0631 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 (\u0627\u0644\u062F\u0627\u0643\u0648\u0633)",
    category: "insecte",
    applicableStages: ["grossissement_fruit", "maturation"],
    crops: ["olive"],
    compatibleActiveIngredients: ["ing_cyantraniliprole", "ing_deltamethrine", "ing_cypermethrine", "ing_spinosad"],
    descriptionFr: "Piq\xFBre triangulaire sur l\u2019olive, d\xE9veloppement de l\u2019asticot dans la pulpe entra\xEEnant pourriture et forte d\xE9gradation de l\u2019acidit\xE9 de l\u2019huile.",
    descriptionAr: "\u0648\u062E\u0632 \u0627\u0644\u062B\u0645\u0627\u0631 \u0627\u0644\u062E\u0636\u0631\u0627\u0621 \u0648\u0627\u0644\u0646\u0627\u0636\u062C\u0629 \u0648\u062A\u0644\u0641 \u0644\u0628 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0645\u0633\u0628\u0628\u0629 \u0627\u0631\u062A\u0641\u0627\u0639 \u062D\u0645\u0648\u0636\u0629 \u0627\u0644\u0632\u064A\u062A \u0648\u062A\u0644\u0641 \u0627\u0644\u0645\u062D\u0635\u0648\u0644.",
    primarySampleUrl: "assets/phyto/mouche_olive.svg",
    symptomOrgans: [
      {
        organ: "fruit",
        organFr: "Olives piqu\xE9es",
        organAr: "\u062D\u0628\u0627\u062A \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0627\u0644\u0645\u0644\u0633\u0648\u0639\u0629",
        imageUrl: "assets/phyto/mouche_olive.svg",
        descriptionFr: "Petite piq\xFBre triangulaire caract\xE9ristique. Galeries sous-cutan\xE9es for\xE9es par la larve avec chute pr\xE9matur\xE9e.",
        descriptionAr: "\u0648\u062E\u0632\u0629 \u0645\u062B\u0644\u062B\u0629 \u0635\u063A\u064A\u0631\u0629 \u0645\u0643\u0627\u0646 \u0648\u0636\u0639 \u0627\u0644\u0628\u064A\u0636\u060C \u0623\u0646\u0641\u0627\u0642 \u062F\u0627\u062E\u0644\u064A\u0629 \u0644\u0644\u064A\u0631\u0642\u0629 \u0648\u062A\u0639\u0641\u0646 \u0627\u0644\u062D\u0628\u0627\u062A \u0648\u062A\u0633\u0627\u0642\u0637\u0647\u0627 \u0627\u0644\u0645\u0628\u0643\u0631."
      }
    ]
  },
  {
    id: "oli_anthracnose",
    nameScientific: "Colletotrichum godetioides / gloeosporioides",
    nameFr: "Anthracnose de l\u2019olivier (Savon de l\u2019olive)",
    nameAr: "\u0623\u0646\u062B\u0631\u0627\u0643\u0646\u0648\u0632 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 (\u0627\u0644\u0639\u0641\u0646 \u0627\u0644\u0645\u0631 / \u0635\u0627\u0628\u0648\u0646 \u0627\u0644\u0632\u064A\u062A\u0648\u0646)",
    category: "champignon",
    applicableStages: ["floraison", "maturation"],
    crops: ["olive"],
    compatibleActiveIngredients: ["ing_oxychlorure_cuivre", "ing_cuivre_bouillie", "ing_tebu_trifloxy"],
    descriptionFr: "Taches circulaires d\xE9prim\xE9es brun-chocolat sur fruits m\xFBrs avec \xE9coulement gluant g\xE9latineux (aspect de savon).",
    descriptionAr: "\u062A\u0639\u0641\u0646 \u063A\u0627\u0626\u0631 \u062F\u0627\u0626\u0631\u064A \u0628\u0646\u064A \u063A\u0627\u0645\u0642 \u0639\u0644\u0649 \u062B\u0645\u0627\u0631 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0627\u0644\u0646\u0627\u0636\u062C\u0629 \u0645\u0639 \u062E\u0631\u0648\u062C \u0633\u0627\u0626\u0644 \u0644\u0632\u062C \u064A\u0634\u0628\u0647 \u0627\u0644\u0635\u0627\u0628\u0648\u0646 \u064A\u0641\u0633\u062F \u062C\u0648\u062F\u0629 \u0627\u0644\u0632\u064A\u062A \u062A\u0645\u0627\u0645\u0627\u064B.",
    primarySampleUrl: "assets/phyto/anthracnose.svg",
    symptomOrgans: [
      {
        organ: "fruit",
        organFr: "Fruits m\xFBrs (Savonnage)",
        organAr: "\u0627\u0644\u062B\u0645\u0627\u0631 \u0627\u0644\u0646\u0627\u0636\u062C\u0629 (\u062A\u0635\u0628\u0646 \u0627\u0644\u0632\u064A\u062A\u0648\u0646)",
        imageUrl: "assets/phyto/anthracnose.svg",
        descriptionFr: "Pourriture molle d\xE9prim\xE9e couleur chocolat sur olives avec suintement g\xE9latineux orang\xE9 riche en toxines.",
        descriptionAr: "\u0628\u0642\u0639 \u062F\u0627\u0626\u0631\u064A\u0629 \u063A\u0627\u0626\u0631\u0629 \u0628\u0646\u064A\u0629 \u0645\u0639 \u0625\u0641\u0631\u0627\u0632 \u0633\u0627\u0626\u0644 \u0647\u0644\u0627\u0645\u064A \u0628\u0631\u062A\u0642\u0627\u0644\u064A \u0644\u0632\u062C \u064A\u0624\u062F\u064A \u0644\u062D\u0645\u0648\u0636\u0629 \u0648\u062A\u0644\u0641 \u0632\u064A\u062A \u0627\u0644\u0632\u064A\u062A\u0648\u0646."
      }
    ]
  },
  {
    id: "oli_cochenille_noire",
    nameScientific: "Saissetia oleae",
    nameFr: "Cochenille noire de l\u2019olivier (H)",
    nameAr: "\u062D\u0634\u0631\u0629 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0627\u0644\u0642\u0634\u0631\u064A\u0629 \u0627\u0644\u0633\u0648\u062F\u0627\u0621 (\u062D\u0631\u0641 H)",
    category: "insecte",
    applicableStages: ["dormance", "grossissement_fruit"],
    crops: ["olive"],
    compatibleActiveIngredients: ["ing_huile_minerale", "ing_spirotetramat", "ing_acetamipride"],
    descriptionFr: "Boucliers noirs h\xE9misph\xE9riques portant un relief en forme de H, abondant miellat provoquant une intense fumagine.",
    descriptionAr: "\u062D\u0634\u0631\u0627\u062A \u0642\u0634\u0631\u064A\u0629 \u0633\u0648\u062F\u0627\u0621 \u0645\u062A\u0635\u0644\u0628\u0629 \u062A\u062D\u0645\u0644 \u0646\u0642\u0634 \u062D\u0631\u0641 H \u0639\u0644\u0649 \u0638\u0647\u0631\u0647\u0627\u060C \u062A\u0641\u0631\u0632 \u0646\u062F\u0648\u0629 \u0639\u0633\u0644\u064A\u0629 \u062A\u0633\u0628\u0628 \u0633\u0648\u0627\u062F \u0627\u0644\u0641\u062D\u0645 \u0639\u0644\u0649 \u0627\u0644\u0623\u063A\u0635\u0627\u0646.",
    primarySampleUrl: "assets/phyto/cochenille.svg"
  }
];
var COMMERCIAL_PRODUCTS_DZ = [
  // --- NECTARINIER & PÊCHER ---
  {
    tradeName: "Score 250 EC",
    activeIngredient: "Dif\xE9noconazole 250 g/L",
    category: "fongicide",
    groupCode: "FRAC 3",
    crops: ["peche", "nectarine", "pomme"],
    targetPests: ["Tavelure", "Cloque du p\xEAcher", "O\xEFdium"],
    standardDose: "20 cc/hL",
    phiDays: 14,
    formulation: "EC",
    remarksFr: "Curatif l\xE9ger (action stop 48h). Alternance obligatoire avec d\u2019autres groupes.",
    remarksAr: "\u0639\u0644\u0627\u062C\u064A \u062E\u0641\u064A\u0641 \u064A\u0648\u0642\u0641 \u0627\u0644\u0625\u0646\u0628\u0627\u062A \u062E\u0644\u0627\u0644 48 \u0633\u0627\u0639\u0629. \u0627\u0644\u062A\u0646\u0627\u0648\u0628 \u0625\u062C\u0628\u0627\u0631\u064A."
  },
  {
    tradeName: "Folicur 250 EW",
    activeIngredient: "T\xE9buconazole 250 g/L",
    category: "fongicide",
    groupCode: "FRAC 3",
    crops: ["peche", "nectarine", "olive"],
    targetPests: ["Moniliose", "O\xEFdium", "Rouille"],
    standardDose: "40 cc/hL",
    phiDays: 14,
    formulation: "EC",
    remarksFr: "Syst\xE9mique r\xE9f\xE9rence pour fleurs et pr\xE9-r\xE9colte. Max 2 passages par an.",
    remarksAr: "\u062C\u0647\u0627\u0632\u064A \u0645\u062A\u0645\u064A\u0632 \u0644\u0644\u0623\u0632\u0647\u0627\u0631 \u0648\u0642\u0628\u0644 \u0627\u0644\u062C\u0646\u064A. \u062D\u062F \u0623\u0642\u0635\u0649 \u0645\u0631\u062A\u0627\u0646 \u0641\u064A \u0627\u0644\u0645\u0648\u0633\u0645."
  },
  {
    tradeName: "Signum WG / Bellis",
    activeIngredient: "Boscalide 26.7% + Pyraclostrobine 6.7%",
    category: "fongicide",
    groupCode: "FRAC 7 + FRAC 11",
    multiCodes: ["FRAC 7", "FRAC 11"],
    crops: ["peche", "nectarine"],
    targetPests: ["Moniliose des fleurs & fruits", "Coryneum"],
    standardDose: "40 g/hL",
    phiDays: 7,
    formulation: "WG",
    remarksFr: "Tr\xE8s haute efficacit\xE9 combin\xE9e SDHI + Strobilurine. DAR court de 7 jours.",
    remarksAr: "\u0641\u0639\u0627\u0644\u064A\u0629 \u0641\u0627\u0626\u0642\u0629 \u0645\u0632\u062F\u0648\u062C\u0629 \u062A\u062C\u0645\u0639 \u0628\u064A\u0646 \u062C\u0647\u0627\u0632\u064A\u064A\u0646 \u0645\u0639 \u0641\u062A\u0631\u0629 \u0623\u0645\u0627\u0646 \u0642\u0635\u064A\u0631\u0629 (7 \u0623\u064A\u0627\u0645)."
  },
  {
    tradeName: "Teldor 500 SC",
    activeIngredient: "Fenhexamide 500 g/L",
    category: "fongicide",
    groupCode: "FRAC 17",
    crops: ["peche", "nectarine"],
    targetPests: ["Moniliose des fruits", "Pourriture grise"],
    standardDose: "100 cc/hL",
    phiDays: 3,
    formulation: "SC",
    remarksFr: "Sp\xE9cialiste moniliose de pr\xE9-r\xE9colte sans r\xE9sistance crois\xE9e. DAR remarquable de 3 jours.",
    remarksAr: "\u062A\u062E\u0635\u0635\u064A \u0644\u0639\u0641\u0646 \u0627\u0644\u062B\u0645\u0627\u0631 \u0642\u0628\u0644 \u0627\u0644\u062C\u0646\u064A \u0628\u062F\u0648\u0646 \u0645\u0642\u0627\u0648\u0645\u0629 \u0645\u062A\u0635\u0627\u0644\u0628\u0629 \u0645\u0639 \u0641\u062A\u0631\u0629 \u0623\u0645\u0627\u0646 \u0642\u064A\u0627\u0633\u064A\u0629 (3 \u0623\u064A\u0627\u0645)."
  },
  {
    tradeName: "Topas 100 EC",
    activeIngredient: "Penconazole 100 g/L",
    category: "fongicide",
    groupCode: "FRAC 3",
    crops: ["peche", "nectarine", "pomme"],
    targetPests: ["O\xEFdium du p\xEAcher et pommier"],
    standardDose: "30 cc/hL",
    phiDays: 14,
    formulation: "EC",
    remarksFr: "Syst\xE9mique sp\xE9cifique o\xEFdium, action pr\xE9ventive et curative.",
    remarksAr: "\u062C\u0647\u0627\u0632\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u0627\u0644\u0642\u0636\u0627\u0621 \u0639\u0644\u0649 \u0627\u0644\u0628\u064A\u0627\u0636 \u0627\u0644\u062F\u0642\u064A\u0642\u064A \u0648\u0642\u0627\u0626\u064A\u0627\u064B \u0648\u0639\u0644\u0627\u062C\u064A\u0627\u064B."
  },
  {
    tradeName: "Mospilan 20 SP / Aceplan",
    activeIngredient: "Ac\xE9tamipride 20%",
    category: "insecticide",
    groupCode: "IRAC 4A",
    crops: ["peche", "nectarine", "pomme", "olive"],
    targetPests: ["Pucerons", "Psylle", "Mineuse", "C\xE9ratite"],
    standardDose: "25 g/hL",
    phiDays: 14,
    formulation: "SP",
    remarksFr: "Syst\xE9mique polyvalent agissant par contact et ingestion avec bonne r\xE9manence.",
    remarksAr: "\u062C\u0647\u0627\u0632\u064A \u0648\u0627\u0633\u0639 \u0627\u0644\u0645\u062F\u0649 \u064A\u0639\u0645\u0644 \u0628\u0627\u0644\u0645\u0644\u0627\u0645\u0633\u0629 \u0648\u0627\u0644\u0645\u0639\u062F\u0629 \u0645\u0639 \u0623\u0645\u0627\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0634\u062C\u0627\u0631."
  },
  {
    tradeName: "Movento 100 SC",
    activeIngredient: "Spirot\xE9tramate 100 g/L",
    category: "insecticide",
    groupCode: "IRAC 23",
    crops: ["peche", "nectarine", "pomme", "olive"],
    targetPests: ["Pucerons", "Cochenilles", "Psylle"],
    standardDose: "75 cc/hL",
    phiDays: 14,
    formulation: "SC",
    remarksFr: "Syst\xE9mie bidirectionnelle unique (monte vers les pousses et descend vers les racines).",
    remarksAr: "\u062C\u0647\u0627\u0632\u064A\u0629 \u0641\u0631\u064A\u062F\u0629 \u0635\u0627\u0639\u062F\u0629 \u0648\u0647\u0627\u0628\u0637\u0629 \u062A\u0635\u0644 \u0644\u0644\u0622\u0641\u0627\u062A \u0627\u0644\u0645\u062E\u062A\u0628\u0626\u0629 \u0641\u064A \u0627\u0644\u062C\u0630\u0648\u0631 \u0648\u0627\u0644\u0642\u0645\u0645."
  },
  {
    tradeName: "Decis Expert / Deltacal",
    activeIngredient: "Deltam\xE9thrine 100 g/L",
    category: "insecticide",
    groupCode: "IRAC 3A",
    crops: ["peche", "nectarine", "pomme", "olive"],
    targetPests: ["Mouche des fruits", "C\xE9ratite", "Teigne", "Noctuelles"],
    standardDose: "12.5 cc/hL",
    phiDays: 7,
    formulation: "EC",
    remarksFr: "Effet choc foudroyant de contact. \xC9viter d\u2019appliquer en pleine floraison.",
    remarksAr: "\u0645\u0628\u064A\u062F \u0635\u062F\u0645\u0629 \u0641\u0648\u0631\u064A \u0628\u0627\u0644\u0645\u0644\u0627\u0645\u0633\u0629. \u064A\u064F\u0645\u0646\u0639 \u0631\u0634\u0647 \u0648\u0642\u062A \u0627\u0644\u0625\u0632\u0647\u0627\u0631 \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0646\u062D\u0644."
  },
  {
    tradeName: "Tracer 480 SC / Spintor",
    activeIngredient: "Spinosad 480 g/L",
    category: "insecticide",
    groupCode: "IRAC 5",
    crops: ["peche", "nectarine", "pomme", "olive"],
    targetPests: ["C\xE9ratite", "Thrips", "Mouche de l\u2019olive"],
    standardDose: "20 cc/hL",
    phiDays: 3,
    formulation: "SC",
    remarksFr: "Origine biologique naturelle, s\xE9lectif des auxiliaires, DAR tr\xE8s court (3j).",
    remarksAr: "\u0645\u0628\u064A\u062F \u062D\u064A\u0648\u064A \u0637\u0628\u064A\u0639\u064A \u0645\u062A\u0645\u064A\u0632 \u0639\u0644\u0649 \u0630\u0628\u0627\u0628\u0629 \u0627\u0644\u0641\u0627\u0643\u0647\u0629 \u0648\u0627\u0644\u062A\u0631\u0628\u0633 \u0645\u0639 \u0641\u062A\u0631\u0629 \u0623\u0645\u0627\u0646 3 \u0623\u064A\u0627\u0645."
  },
  // --- POMMIER ---
  {
    tradeName: "Coragen 20 SC",
    activeIngredient: "Chlorantraniliprole 200 g/L",
    category: "insecticide",
    groupCode: "IRAC 28",
    crops: ["pomme", "peche", "nectarine"],
    targetPests: ["Carpocapse des pommes", "Tordeuse orientale", "Mineuse"],
    standardDose: "18 cc/hL",
    phiDays: 14,
    formulation: "SC",
    remarksFr: "Efficacit\xE9 ovicide-larvicide exceptionnelle sur vers des fruits, tr\xE8s haute persistance.",
    remarksAr: "\u0645\u0628\u064A\u062F \u062B\u0648\u0631\u064A \u064A\u0642\u062A\u0644 \u0627\u0644\u0628\u064A\u0636 \u0648\u0627\u0644\u064A\u0631\u0642\u0627\u062A \u0644\u062F\u064A\u062F\u0627\u0646 \u0627\u0644\u062B\u0645\u0627\u0631 \u0645\u0639 \u062D\u0645\u0627\u064A\u0629 \u062A\u062F\u0648\u0645 \u0637\u0648\u064A\u0644\u0627\u064B."
  },
  {
    tradeName: "Delan 70 WG",
    activeIngredient: "Dithianon 70%",
    category: "fongicide",
    groupCode: "FRAC M09",
    crops: ["pomme"],
    targetPests: ["Tavelure du pommier"],
    standardDose: "50 g/hL",
    phiDays: 21,
    formulation: "WG",
    remarksFr: "Mati\xE8re active multi-site de contact, r\xE9sistance exceptionnelle au lessivage.",
    remarksAr: "\u0645\u0628\u064A\u062F \u0645\u062A\u0639\u062F\u062F \u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u0623\u062B\u064A\u0631 \u0645\u0642\u0627\u0648\u0645 \u062C\u062F\u0627\u064B \u0644\u0644\u063A\u0633\u064A\u0644 \u0628\u0627\u0644\u0623\u0645\u0637\u0627\u0631 \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u062A\u0641\u0627\u062D \u0645\u0646 \u0627\u0644\u062C\u0631\u0628."
  },
  {
    tradeName: "Aliette Flash",
    activeIngredient: "Fos\xE9tyl-Aluminium 80%",
    category: "fongicide",
    groupCode: "FRAC P07",
    crops: ["pomme"],
    targetPests: ["Feu bact\xE9rien (Erwinia)", "Phytophthora"],
    standardDose: "250 g/hL",
    phiDays: 14,
    formulation: "WG",
    remarksFr: "Stimulateur naturel des d\xE9fenses et syst\xE9mie compl\xE8te ascendante/descendante.",
    remarksAr: "\u0645\u0646\u0634\u0637 \u0644\u0644\u0645\u0646\u0627\u0639\u0629 \u0627\u0644\u0637\u0628\u064A\u0639\u064A\u0629 \u0644\u0644\u0634\u062C\u0631\u0629 \u0648\u062C\u0647\u0627\u0632\u064A \u0641\u064A \u0627\u0644\u0639\u0635\u0627\u0631\u0629 \u0627\u0644\u0635\u0627\u0639\u062F\u0629 \u0648\u0627\u0644\u0646\u0627\u0632\u0644\u0629."
  },
  {
    tradeName: "Vertimec 018 EC / Bactimec",
    activeIngredient: "Abamectine 18 g/L",
    category: "acaricide",
    groupCode: "IRAC 6",
    crops: ["pomme", "peche", "nectarine"],
    targetPests: ["Araign\xE9e rouge", "Acariens des fruits"],
    standardDose: "60 cc/hL",
    phiDays: 14,
    formulation: "EC",
    remarksFr: "Action translaminaire en profondeur. Toujours associer \xE0 une huile ou un mouillant.",
    remarksAr: "\u0627\u062E\u062A\u0631\u0627\u0642 \u0639\u0628\u0631 \u0646\u0633\u064A\u062C \u0627\u0644\u0648\u0631\u0642\u0629 \u0644\u0644\u0642\u0636\u0627\u0621 \u0639\u0644\u0649 \u0627\u0644\u0639\u0646\u0627\u0643\u0628 \u0639\u0644\u0649 \u0627\u0644\u0633\u0637\u062D\u064A\u0646 \u0627\u0644\u0633\u0641\u0644\u064A \u0648\u0627\u0644\u0639\u0644\u0648\u064A."
  },
  // --- OLIVIER ---
  {
    tradeName: "Nucop 35 WG / Curenox 50",
    activeIngredient: "Oxychlorure de cuivre",
    category: "fongicide",
    groupCode: "FRAC M01",
    crops: ["olive", "pomme", "nectarine"],
    targetPests: ["\u0152il de paon", "Tuberculose de l\u2019olivier"],
    standardDose: "250 g/hL",
    phiDays: 15,
    formulation: "WG",
    remarksFr: "Traitement de r\xE9f\xE9rence en automne et sortie d\u2019hiver. Sans risque de r\xE9sistance.",
    remarksAr: "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0641\u064A \u0627\u0644\u062E\u0631\u064A\u0641 \u0648\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0634\u062A\u0627\u0621. \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0642\u0627\u0648\u0645\u0629 \u0644\u0644\u0641\u0637\u0631\u064A\u0627\u062A \u0636\u062F\u0647."
  },
  {
    tradeName: "Nativo 75 WG",
    activeIngredient: "T\xE9buconazole 50% + Trifloxystrobine 25%",
    category: "fongicide",
    groupCode: "FRAC 3 + FRAC 11",
    multiCodes: ["FRAC 3", "FRAC 11"],
    crops: ["olive"],
    targetPests: ["\u0152il de paon (forte pression)", "Anthracnose"],
    standardDose: "30 g/hL",
    phiDays: 14,
    formulation: "WG",
    remarksFr: "Endoth\xE9rapique puissant lors d\u2019attaques s\xE9v\xE8res d\u2019\u0153il de paon sur oliviers.",
    remarksAr: "\u0639\u0644\u0627\u062C\u064A \u0628\u0627\u0637\u0646\u064A \u0642\u0648\u064A \u0639\u0646\u062F \u062A\u0641\u0634\u064A \u0639\u064A\u0646 \u0627\u0644\u0637\u0627\u0648\u0648\u0633 \u0641\u064A \u0645\u0632\u0627\u0631\u0639 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0643\u062B\u064A\u0641\u0629 \u0627\u0644\u0623\u0634\u062C\u0627\u0631."
  },
  {
    tradeName: "Exirel",
    activeIngredient: "Cyantraniliprole 100 g/L",
    category: "insecticide",
    groupCode: "IRAC 28",
    crops: ["olive"],
    targetPests: ["Mouche de l\u2019olive (Bactrocera)", "Teigne"],
    standardDose: "75 cc/hL",
    phiDays: 14,
    formulation: "SC",
    remarksFr: "Nouvelle g\xE9n\xE9ration sur mouche de l\u2019olive, utilisable en couverture ou app\xE2t.",
    remarksAr: "\u062C\u064A\u0644 \u0645\u062A\u0637\u0648\u0631 \u0644\u0645\u0643\u0627\u0641\u062D\u0629 \u0630\u0628\u0627\u0628\u0629 \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0628\u0643\u0641\u0627\u0621\u0629 \u0639\u0627\u0644\u064A\u0629 \u0648\u0628\u062F\u0648\u0646 \u0623\u0636\u0631\u0627\u0631 \u0644\u0644\u0623\u0634\u062C\u0627\u0631."
  }
];

// scratch/simulate_phyto_scenario.ts
var currentDate = /* @__PURE__ */ new Date("2026-05-15T10:00:00Z");
var tenDaysAgo = new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1e3);
var targetPest = PEST_TARGETS_DATABASE.find((p) => p.id === "nec_monilia_fruit") || PEST_TARGETS_DATABASE.find((p) => p.nameScientific.includes("Monilinia"));
var conditions = {
  hasVisibleSymptoms: true,
  // "Des symptômes sont déjà visibles sur quelques fruits"
  isRainExpectedSoon: true,
  // "Une forte pluie est annoncée sous 48h"
  isRapidShootsGrowth: true,
  // Stade grossissement actif
  daysBeforeHarvest: 35
  // Grossissement (environ 35 jours avant récolte)
};
var parcelHistory = [
  {
    id: "reco-hist-001",
    parcelId: "parcelle-nectarine-01",
    crop: "nectarine",
    date: tenDaysAgo.toISOString(),
    targetPestId: targetPest.id,
    activeIngredientId: "ing_tebuconazole",
    codeGroup: "3",
    multiCodes: ["3"]
  }
];
var modeDecision = PhytosanitaryEngine.recommendModeOfAction(conditions);
var evaluatedResults = PhytosanitaryEngine.evaluateTreatmentOptions({
  targetPest,
  parcelHistory,
  allIngredients: ACTIVE_INGREDIENTS_DATABASE,
  currentSeasonYear: 2026,
  currentDate,
  conditions
});
var commercialProducts = COMMERCIAL_PRODUCTS_DZ.filter(
  (cp) => cp.crops.includes("nectarine") && cp.targetPests.some((t) => t.toLowerCase().includes("monili"))
);
var simulationReport = {
  scenario: {
    verger: "Nectariniers (Prunus persica)",
    stade: "Grossissement des fruits",
    bioagresseur: {
      nomFr: targetPest.nameFr,
      nomAr: targetPest.nameAr,
      nomScientifique: targetPest.nameScientific
    },
    conditionsTerrain: {
      symptomesVisibles: conditions.hasVisibleSymptoms,
      pluieImminenteSous48h: conditions.isRainExpectedSoon,
      delaiAvantRecolteJours: conditions.daysBeforeHarvest
    },
    historiqueParcelle: {
      traitementPrecedent: "T\xE9buconazole (Score / Folicur - FRAC 3)",
      dateTraitementPrecedent: tenDaysAgo.toISOString().split("T")[0],
      joursEcoules: 10
    }
  },
  arbreDecisionContactVsSystemique: {
    modeRecommande: modeDecision.recommendedType,
    raisonDominante: modeDecision.dominantReason,
    avisTechniqueFr: modeDecision.adviceNoticeFr,
    avisTechniqueAr: modeDecision.adviceNoticeAr,
    strategieCuveTankMixFr: modeDecision.idealMixStrategyFr,
    strategieCuveTankMixAr: modeDecision.idealMixStrategyAr
  },
  matieresActivesEvaluees: evaluatedResults.map((res) => {
    const phiDays = res.ingredient.phiDays;
    const dateSecurite = new Date(currentDate.getTime() + phiDays * 24 * 60 * 60 * 1e3);
    return {
      matiereActive: res.ingredient.name,
      familleChimique: res.ingredient.familyChemical,
      groupeFRAC: res.ingredient.codeGroup,
      modePhysique: res.systemicType,
      statutAutorisation: res.isAllowed ? "AUTORIS\xC9 (Recommand\xE9)" : "BLOQU\xC9 / INTERDIT (Anti-R\xE9sistance)",
      estAdapteSituationActuelle: res.isSituationallyRecommended,
      scorePriorite: res.priorityScore,
      motifBlocageOuAlerte: res.blockReason || "Aucun blocage - Conforme aux r\xE8gles FRAC",
      delaiAvantRecolte_DAR: `${phiDays} jours`,
      dateRecolteSecurisee: dateSecurite.toISOString().split("T")[0]
    };
  })
};
console.log(JSON.stringify(simulationReport, null, 2));
