import { describe, it, expect } from "vitest";
import { PHYTO_DATABASE, checkTankMixCompatibility } from "@/data/phytosanitaires";
import {
  PhytosanitaryEngine,
  evaluatePhytoTemporalConflicts,
  checkProductBlockedForGrowthStage,
  checkMultiSpeciesProductStage,
  getAgriculturalSeason,
} from "@/lib/phyto/engine";
import { ACTIVE_INGREDIENTS_DATABASE, PEST_TARGETS_DATABASE } from "@/lib/phyto/database";

function findProd(name: string) {
  const p = PHYTO_DATABASE.find((x) => x.name.toLowerCase() === name.toLowerCase());
  expect(p, `Produit introuvable dans PHYTO_DATABASE: ${name}`).toBeDefined();
  return p!;
}

describe("Couche 2 — Simulation de Campagnes Agricoles Complètes (Novembre → Novembre)", () => {
  it("Campagne Pommier (P7+P8) : Hiver → Débourrement → Floraison → Grossissement → Maturation → Post-récolte", () => {
    const recos: any[] = [];
    const pushReco = (id: string, date: string, product: string, status = "executed") => {
      recos.push({
        id,
        kind: "phytosanitaire",
        status,
        parcel_ids: ["pommier1", "pommier2"],
        payload: { crop_group: ["pommiers"], program: { date, products: [{ product }] } },
      });
    };

    // 1. Repos hivernal (Janvier) : Huile minérale autorisée, pas de conflit DAR
    const agroil = findProd("AGROIL BLUE");
    expect(checkProductBlockedForGrowthStage(agroil, "dormance").blocked).toBe(false);
    pushReco("pom-1", "2026-01-15", "AGROIL BLUE");

    // 2. Gonflement bourgeons (Février) : Bouillie Bordelaise autorisée
    const bb = findProd("BOUILLIE BORDELAISE WG");
    expect(checkProductBlockedForGrowthStage(bb, "gonflement_bourgeons").blocked).toBe(false);
    pushReco("pom-2", "2026-02-20", "BOUILLIE BORDELAISE WG");

    // 3. Floraison (Avril) : Decis Expert (IRAC 3A) et Calypso (IRAC 4A) STRICTEMENT BLOQUÉS abeilles
    expect(checkProductBlockedForGrowthStage(findProd("Decis Expert"), "floraison").blocked).toBe(true);
    expect(checkProductBlockedForGrowthStage(findProd("Calypso"), "floraison").blocked).toBe(true);

    // 4. Chute pétales / Grossissement (Mai) : Rotation FRAC 3 (SCORE) → puis 10 jours plus tard FRAC 3 (TOPAZE) BLOQUÉ !
    pushReco("pom-3", "2026-05-01", "SCORE"); // FRAC 3
    const badRotation = evaluatePhytoTemporalConflicts({
      proposedProducts: [{ product: "TOPAZE", date: "2026-05-11" }], // FRAC 3 consécutif (< 45 j)
      targetCropGroups: ["pommiers"],
      allRecommendations: recos,
      lang: "fr",
    });
    expect(badRotation.some((c) => c.isBlocking && c.rule === "rotation_group")).toBe(true);

    // En revanche, alternance vers FRAC 7 + FRAC 11 (Bellis) le 15 mai est AUTORISÉE
    const goodRotation = evaluatePhytoTemporalConflicts({
      proposedProducts: [{ product: "Bellis", date: "2026-05-15" }],
      targetCropGroups: ["pommiers"],
      allRecommendations: recos,
      lang: "fr",
    });
    expect(goodRotation.some((c) => c.isBlocking)).toBe(false);
    pushReco("pom-4", "2026-05-15", "Bellis");

    // 5. Tentative d'ajouter Luna le 25 mai (FRAC 7 partagé avec Bellis du 15 mai) → BLOQUÉE (< 45 j)
    const lunaAfterBellis = evaluatePhytoTemporalConflicts({
      proposedProducts: [{ product: "Luna", date: "2026-05-25" }],
      targetCropGroups: ["pommiers"],
      allRecommendations: recos,
      lang: "fr",
    });
    expect(lunaAfterBellis.some((c) => c.isBlocking && c.sharedCode?.includes("FRAC 7"))).toBe(true);

    // 6. Vérification campagne 2025–2026 cohérente sur toute la saison
    expect(getAgriculturalSeason("pommier", "2026-05-15").label).toBe("2025–2026");
  });

  it("Campagne Nectarine (P5+P6) : Cloque cuivre hiver, interdiction cuivre sur fruit, mélange interdit Huile+Soufre", () => {
    const champFlo = findProd("CHAMP FLO");
    expect(checkProductBlockedForGrowthStage(champFlo, "dormance").blocked).toBe(false);
    expect(checkProductBlockedForGrowthStage(champFlo, "grossissement_fruit").blocked).toBe(true);

    // Soufre (THIOVIT JET) bloqué en floraison, autorisé au grossissement
    const soufre = findProd("THIOVIT JET");
    expect(checkProductBlockedForGrowthStage(soufre, "floraison").blocked).toBe(true);
    expect(checkProductBlockedForGrowthStage(soufre, "grossissement_fruit").blocked).toBe(false);

    // Mélange Huile + Soufre strictement bloqué
    const mixHuileSoufre = checkTankMixCompatibility("AGROIL BLUE", "THIOVIT JET", "fr");
    expect(mixHuileSoufre?.isBlocking).toBe(true);
  });

  it("Campagne Olivier (P1–P4) : DAR spécial Huile d'Olive 28 jours sur pyréthrinoïdes + campagne 1 déc → 30 nov", () => {
    const mouche = PEST_TARGETS_DATABASE.find((p) => p.id === "oli_mouche")!;
    expect(mouche).toBeDefined();

    // À 15 jours avant récolte pour huile d'olive, un pyréthrinoïde (IRAC 3A, DAR 28j huile) doit être bloqué par le DAR
    const opts = PhytosanitaryEngine.evaluateTreatmentOptions({
      targetPest: mouche,
      parcelHistory: [],
      allIngredients: ACTIVE_INGREDIENTS_DATABASE,
      currentSeasonYear: 2026,
      growthStage: "maturation",
      crop: "olive",
      conditions: {
        isRainExpectedSoon: false,
        hasVisibleSymptoms: true,
        isRapidShootsGrowth: false,
        daysBeforeHarvest: 15,
        oliveDestination: "huile",
        growthStage: "maturation",
      },
    });

    const pyreth = opts.find((o) => o.ingredient.codeGroup.includes("3A"));
    expect(pyreth).toBeDefined();
    expect(pyreth?.effectiveDar).toBeGreaterThanOrEqual(28);
    expect(pyreth?.darBlocked).toBe(true);
    expect(pyreth?.isAllowed).toBe(false);

    // Campagne Olivier
    expect(getAgriculturalSeason("olivier", "2026-11-15").label).toBe("2025–2026");
    expect(getAgriculturalSeason("olivier", "2026-12-01").label).toBe("2026–2027");
  });

  it("Traitement commun multi-espèces (Pommier en floraison + Olivier en débourrement) : applique la règle la plus stricte", () => {
    const decis = findProd("Decis Expert");
    const check = checkMultiSpeciesProductStage(decis, [
      { species: "pommier", stage: "floraison" },
      { species: "olivier", stage: "gonflement_bourgeons" },
    ]);
    expect(check.blocked).toBe(true);
    expect(check.blockingSpecies).toContain("pommier");
  });
});
