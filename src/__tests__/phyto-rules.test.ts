import { describe, it, expect } from "vitest";
import { checkTankMixCompatibility } from "@/data/phytosanitaires";
import {
  PhytosanitaryEngine,
  evaluatePhytoTemporalConflicts,
  getAgriculturalSeason,
  isExecutedOrAcceptedStatus,
  isFruitBearingStage,
} from "@/lib/phyto/engine";
import { ACTIVE_INGREDIENTS_DATABASE, PEST_TARGETS_DATABASE } from "@/lib/phyto/database";
import { getEstimatedHarvestDateISO } from "@/lib/safety-checks";

describe("1. Validation Tank-Mix & Double Emploi", () => {
  it("bloque strictement le double emploi exact (Sivento + Sivento)", () => {
    const res = checkTankMixCompatibility("Sivento", "Sivento", "fr");
    expect(res).not.toBeNull();
    expect(res?.isBlocking).toBe(true);
    expect(res?.isDoubleEmploi).toBe(true);
    expect(res?.status).toBe("incompatible");
  });

  it("bloque strictement le double emploi par matière active sous deux marques différentes (Score 250 EC + GAMMA = Difénoconazole)", () => {
    const res = checkTankMixCompatibility("Score 250 EC", "GAMMA", "fr");
    expect(res).not.toBeNull();
    expect(res?.isBlocking).toBe(true);
    expect(res?.isDoubleEmploi).toBe(true);
    expect(res?.status).toBe("incompatible");
  });

  it("bloque strictement l'intersection de codes FRAC/IRAC composés (Luna [FRAC 7+3] + Bellis [FRAC 7+11] → FRAC 7 commun)", () => {
    const resFr = checkTankMixCompatibility("Luna", "Bellis", "fr");
    expect(resFr).not.toBeNull();
    expect(resFr?.isBlocking).toBe(true);
    expect(resFr?.status).toBe("incompatible");
    expect(resFr?.message).toContain("FRAC 7");

    const resAr = checkTankMixCompatibility("Luna", "Bellis", "ar");
    expect(resAr?.isBlocking).toBe(true);
    expect(resAr?.title).toContain("FRAC 7");
  });

  it("bloque strictement les incompatibilités chimiques majeures (Cuivre + Bt, Huile + Soufre, Huile + Captane)", () => {
    const cuivreBt = checkTankMixCompatibility("BOUILLIE BORDELAISE WG", "Dipel DF", "fr");
    expect(cuivreBt?.isBlocking).toBe(true);
    expect(cuivreBt?.status).toBe("incompatible");

    const huileSoufre = checkTankMixCompatibility("AGROIL BLUE", "Kumulus WG", "fr");
    expect(huileSoufre?.isBlocking).toBe(true);
    expect(huileSoufre?.status).toBe("incompatible");

    const huileCaptane = checkTankMixCompatibility("AGROIL BLUE", "Captan 50", "fr");
    expect(huileCaptane?.isBlocking).toBe(true);
    expect(huileCaptane?.status).toBe("incompatible");
  });

  it("autorise un mélange synergique valide (Score 250 EC [FRAC 3] + Calypso [IRAC 4A] ou Vertimec 018 EC [IRAC 6])", () => {
    const scoreCalypso = checkTankMixCompatibility("Score 250 EC", "Calypso", "fr");
    expect(scoreCalypso?.status).toBe("compatible");
    expect(Boolean(scoreCalypso?.isBlocking)).toBe(false);

    const scoreAbamectine = checkTankMixCompatibility("Score 250 EC", "Vertimec 018 EC", "fr");
    expect(scoreAbamectine?.status).toBe("compatible");
    expect(Boolean(scoreAbamectine?.isBlocking)).toBe(false);
  });
});

describe("2. Rotation, Intervalles (pending + accepted + executed) & Quotas", () => {
  it("bloque le même produit à J+1 (≤ 14 jours) sur les mêmes parcelles même si la 1ère reco est pending (envoyee)", () => {
    const existingRecos = [
      {
        id: "reco-pending-1",
        kind: "phytosanitaire",
        status: "envoyee", // قيد الانتظار (pending)
        parcel_ids: ["pommier1", "pommier2"],
        payload: {
          crop_group: ["pommiers"],
          program: {
            date: "2026-11-01",
            products: [{ product: "BELLIS® WG" }],
          },
        },
      },
    ];

    const conflicts = evaluatePhytoTemporalConflicts({
      proposedProducts: [{ product: "BELLIS® WG", date: "2026-11-02" }],
      targetCropGroups: ["pommiers"],
      allRecommendations: existingRecos,
      lang: "ar",
    });

    const intervalBlock = conflicts.find((c) => c.rule === "interval_14d");
    expect(intervalBlock).toBeDefined();
    expect(intervalBlock?.isBlocking).toBe(true);
    expect(intervalBlock?.conflictDate).toBe("2026-11-01");
  });

  it("bloque le même groupe FRAC/IRAC consécutif ou à < 45 jours sur la même parcelle", () => {
    const existingRecos = [
      {
        id: "reco-accepted-1",
        kind: "phytosanitaire",
        status: "acceptee",
        parcel_ids: ["pommier1"],
        payload: {
          crop_group: ["pommiers"],
          program: {
            date: "2026-04-01",
            products: [{ product: "Luna" }], // FRAC 7 + FRAC 3
          },
        },
      },
    ];

    const conflicts = evaluatePhytoTemporalConflicts({
      proposedProducts: [{ product: "Bellis", date: "2026-04-20" }], // FRAC 7 + FRAC 11 → 19 jours d'écart
      targetCropGroups: ["pommiers"],
      allRecommendations: existingRecos,
      lang: "fr",
    });

    const rotationBlock = conflicts.find((c) => c.rule === "rotation_group");
    expect(rotationBlock).toBeDefined();
    expect(rotationBlock?.isBlocking).toBe(true);
    expect(rotationBlock?.sharedCode).toContain("FRAC 7");
  });

  it("calcule correctement les campagnes agricoles (Pommier/Nectarine 1 nov → 31 oct ; Olivier 1 déc → 30 nov)", () => {
    const pomSpring = getAgriculturalSeason("pommier", "2026-04-15");
    expect(pomSpring.startDate).toBe("2025-11-01");
    expect(pomSpring.endDate).toBe("2026-10-31");

    const pomNov = getAgriculturalSeason("pommier", "2026-11-05");
    expect(pomNov.startDate).toBe("2026-11-01");
    expect(pomNov.endDate).toBe("2027-10-31");

    const oliNov = getAgriculturalSeason("olivier", "2026-11-20");
    expect(oliNov.startDate).toBe("2025-12-01");
    expect(oliNov.endDate).toBe("2026-11-30");

    const oliDec = getAgriculturalSeason("olivier", "2026-12-05");
    expect(oliDec.startDate).toBe("2026-12-01");
    expect(oliDec.endDate).toBe("2027-11-30");
  });

  it("exclut les recommandations pending/envoyee du compteur de quota annuel et inclut uniquement accepted/executed", () => {
    expect(isExecutedOrAcceptedStatus("envoyee")).toBe(false);
    expect(isExecutedOrAcceptedStatus("pending")).toBe(false);
    expect(isExecutedOrAcceptedStatus("en_attente")).toBe(false);
    expect(isExecutedOrAcceptedStatus("acceptee")).toBe(true);
    expect(isExecutedOrAcceptedStatus("accepted")).toBe(true);
    expect(isExecutedOrAcceptedStatus("executed")).toBe(true);
    expect(isExecutedOrAcceptedStatus("fait")).toBe(true);
  });
});

describe("3. Stades Phénologiques, Abeilles & DAR", () => {
  it("ne bloque jamais le DAR sur les stades sans fruit (dormance, floraison, post_recolte, chute_feuilles)", () => {
    expect(isFruitBearingStage("dormance")).toBe(false);
    expect(isFruitBearingStage("floraison")).toBe(false);
    expect(isFruitBearingStage("post_recolte")).toBe(false);
    expect(isFruitBearingStage("chute_feuilles")).toBe(false);

    const tavelure = PEST_TARGETS_DATABASE.find((p) => p.id === "pom_tavelure")!;
    const options = PhytosanitaryEngine.evaluateTreatmentOptions({
      targetPest: tavelure,
      parcelHistory: [],
      allIngredients: ACTIVE_INGREDIENTS_DATABASE,
      currentSeasonYear: 2026,
      growthStage: "dormance",
      crop: "pomme",
      conditions: {
        isRainExpectedSoon: false,
        hasVisibleSymptoms: false,
        isRapidShootsGrowth: false,
        daysBeforeHarvest: 2, // même si < DAR, hors stade fruitier donc DAR inactif
        growthStage: "dormance",
      },
    });
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => !o.darBlocked)).toBe(true);
  });

  it("bloque strictement les pyréthrinoïdes / insecticides toxiques abeilles pendant la Floraison", () => {
    const pucerons = PEST_TARGETS_DATABASE.find((p) => p.id === "pom_puceron_cendre") || PEST_TARGETS_DATABASE[0];
    const options = PhytosanitaryEngine.evaluateTreatmentOptions({
      targetPest: pucerons,
      parcelHistory: [],
      allIngredients: ACTIVE_INGREDIENTS_DATABASE,
      currentSeasonYear: 2026,
      growthStage: "floraison",
      crop: "pomme",
    });

    const pyrethroidOption = options.find((o) => o.ingredient.codeGroup.includes("3A"));
    if (pyrethroidOption) {
      expect(pyrethroidOption.isAllowed).toBe(false);
      expect(pyrethroidOption.beeBlock).toBe(true);
    }
  });

  it("bascule automatiquement la date de récolte estimée sur l'année suivante quand la date de l'année en cours est passée", () => {
    const nov23 = new Date("2026-11-23T12:00:00");
    // Pommier : 1er août 2026 est passé le 23 nov 2026 → doit basculer sur 2027-08-01
    expect(getEstimatedHarvestDateISO("pommier", "", nov23, undefined, true)).toBe("2027-08-01");
    // Olivier : 15 nov 2026 est passé le 23 nov 2026 → doit basculer sur 2027-11-15
    expect(getEstimatedHarvestDateISO("olivier", "", nov23, undefined, true)).toBe("2027-11-15");
    // Nectarinier : 25 juin 2026 est passé le 23 nov 2026 → doit basculer sur 2027-06-25
    expect(getEstimatedHarvestDateISO("nectarinier", "", nov23, undefined, true)).toBe("2027-06-25");
  });
});
