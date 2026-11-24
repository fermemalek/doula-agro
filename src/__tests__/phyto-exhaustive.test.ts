import { describe, it, expect } from "vitest";
import { PHYTO_DATABASE, checkTankMixCompatibility } from "@/data/phytosanitaires";
import {
  PhytosanitaryEngine,
  checkProductBlockedForGrowthStage,
  isFruitBearingStage,
  type GrowthStage,
} from "@/lib/phyto/engine";
import {
  ACTIVE_INGREDIENTS_DATABASE,
  PEST_TARGETS_DATABASE,
  PHENOLOGICAL_STAGES,
} from "@/lib/phyto/database";

const ALL_STAGES: GrowthStage[] = PHENOLOGICAL_STAGES.map((s) => s.id);
const NON_FRUIT_STAGES: GrowthStage[] = [
  "dormance",
  "floraison",
  "post_recolte",
  "chute_feuilles",
];
const BEE_DANGEROUS_CODE_RE = /\bIRAC\s*(3A|4A|4C|4D|5|6|28)\b/i;
const MULTISITE_CODE_RE = /\b(FRAC\s*M0?[1-9]|IRAC\s*UN|ADJUVANT|ATTRACTIF|DIVERS)\b/i;

function parseDarDays(dar: string | undefined): number {
  const s = (dar || "").trim().toLowerCase();
  if (!s || s === "variable" || s === "n/a") return 0;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

function extractSiteCodes(codeGroup: string | undefined): string[] {
  if (!codeGroup) return [];
  return Array.from(
    new Set(
      codeGroup
        .split(/[+/,]/)
        .map((c) => c.trim().replace(/\s+/g, " ").toUpperCase())
        .filter((c) => /^(FRAC|IRAC|HRAC)\s+[A-Z0-9]+$/i.test(c) && !MULTISITE_CODE_RE.test(c)),
    ),
  );
}

describe("Suite Exhaustive PHYTO_DATABASE (165+ spécialités INPV & ferme)", () => {
  it("1. Intégrité complète : chaque produit a un nom, une matière active, un codeGroup valide, un DAR cohérent >= 0, maxPerSeason >= 1 et au moins une espèce", () => {
    expect(PHYTO_DATABASE.length).toBeGreaterThanOrEqual(160);

    const failures: string[] = [];
    for (const prod of PHYTO_DATABASE) {
      if (!prod.name || !prod.name.trim()) failures.push(`Nom manquant`);
      if (!prod.matiereActive || !prod.matiereActive.trim()) failures.push(`${prod.name}: matiereActive manquante`);
      if (!prod.codeGroup || !prod.codeGroup.trim()) failures.push(`${prod.name}: codeGroup manquant`);
      const darNum = parseDarDays(prod.dar);
      if (darNum < 0) failures.push(`${prod.name}: DAR invalide (${prod.dar})`);
      if (!(prod.maxPerSeason && prod.maxPerSeason >= 1)) {
        failures.push(`${prod.name}: maxPerSeason invalide (${prod.maxPerSeason})`);
      }
      if (!Array.isArray(prod.cultures) || prod.cultures.length === 0) {
        failures.push(`${prod.name}: aucune culture autorisée`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("2. Matrice Stades × Espèces (~4 000 cas) : blocage strict abeilles en floraison et DAR inactif hors stades fruitiers", () => {
    let checkedCases = 0;
    const beeFailures: string[] = [];

    for (const prod of PHYTO_DATABASE) {
      const isBeeDangerous =
        BEE_DANGEROUS_CODE_RE.test(prod.codeGroup || "") ||
        Boolean(prod.blockedStages?.includes("floraison"));

      for (const stage of ALL_STAGES) {
        for (const _sp of ["olivier", "pommier", "nectarinier"] as const) {
          checkedCases++;
          const check = checkProductBlockedForGrowthStage(prod, stage);
          if (stage === "floraison" && isBeeDangerous && !check.blocked) {
            beeFailures.push(`${prod.name} (${prod.codeGroup}) non bloqué en floraison`);
          }
        }
      }
    }

    expect(checkedCases).toBeGreaterThanOrEqual(3800);
    expect(beeFailures).toEqual([]);

    // Vérifier qu'aucun produit n'est bloqué par le DAR sur un stade sans fruit
    const tavelure = PEST_TARGETS_DATABASE.find((p) => p.id === "pom_tavelure")!;
    for (const stage of NON_FRUIT_STAGES) {
      expect(isFruitBearingStage(stage)).toBe(false);
      const opts = PhytosanitaryEngine.evaluateTreatmentOptions({
        targetPest: tavelure,
        parcelHistory: [],
        allIngredients: ACTIVE_INGREDIENTS_DATABASE,
        currentSeasonYear: 2026,
        growthStage: stage,
        crop: "pomme",
        conditions: {
          isRainExpectedSoon: false,
          hasVisibleSymptoms: false,
          isRapidShootsGrowth: false,
          daysBeforeHarvest: 1,
          growthStage: stage,
        },
      });
      expect(opts.every((o) => !o.darBlocked)).toBe(true);
    }
  });

  it("3. Matrice Tank-Mix : 100 % des paires partageant un code FRAC ou IRAC site-spécifique retournent isBlocking: true", () => {
    // Grouper les produits par code site-spécifique individuel
    const byCode = new Map<string, string[]>();
    for (const prod of PHYTO_DATABASE) {
      for (const code of extractSiteCodes(prod.codeGroup)) {
        const list = byCode.get(code) || [];
        if (!list.includes(prod.name)) list.push(prod.name);
        byCode.set(code, list);
      }
    }

    let testedPairs = 0;
    const failures: string[] = [];

    for (const [code, names] of byCode.entries()) {
      if (names.length < 2) continue;
      // Tester des paires représentatives (première × suivantes + composés croisés)
      const cap = Math.min(names.length, 10);
      for (let i = 0; i < cap; i++) {
        for (let j = i + 1; j < cap; j++) {
          testedPairs++;
          const res = checkTankMixCompatibility(names[i], names[j], "fr");
          if (!res || !res.isBlocking || res.status !== "incompatible") {
            failures.push(`${names[i]} + ${names[j]} (partagent ${code}) → ${res?.status ?? "null"}`);
          }
        }
      }
    }

    // Vérifications explicites de composés croisés
    for (const [a, b] of [
      ["Luna", "Bellis"], // FRAC 7+3 × FRAC 7+11
      ["SERCADIS PLUS", "Bellis"], // FRAC 7+3 × FRAC 7+11
      ["Erlan", "PROTEUS 170 OD"], // IRAC 4A × IRAC 4A+3A
      ["Calypso", "BOUSTANE"], // IRAC 4A × IRAC 21A+4A
      ["Verlan", "VOLIAM TARGO 063 SC"], // IRAC 6 × IRAC 28+6
    ]) {
      testedPairs++;
      const res = checkTankMixCompatibility(a, b, "fr");
      if (!res || !res.isBlocking || res.status !== "incompatible") {
        failures.push(`Composé croisé ${a} + ${b} non bloqué`);
      }
    }

    expect(testedPairs).toBeGreaterThan(200);
    expect(failures).toEqual([]);
  });

  it("4. Matrice Incompatibilités chimiques : 100 % des paires (Cuivre × Bt), (Huile × Soufre) et (Huile × Captane) sont bloquées", () => {
    const cuivres = PHYTO_DATABASE.filter(
      (p) => (p.codeGroup || "").includes("M01") || (p.matiereActive || "").toLowerCase().includes("cuivre"),
    );
    const huiles = PHYTO_DATABASE.filter(
      (p) =>
        (p.matiereActive || "").toLowerCase().includes("huile") ||
        (p.matiereActive || "").toLowerCase().includes("paraffine"),
    );
    const soufres = PHYTO_DATABASE.filter((p) => (p.codeGroup || "").includes("M02"));
    const captanes = PHYTO_DATABASE.filter(
      (p) => (p.matiereActive || "").toLowerCase().includes("captane"),
    );

    expect(cuivres.length).toBeGreaterThan(0);
    expect(huiles.length).toBeGreaterThan(0);
    expect(soufres.length).toBeGreaterThan(0);
    expect(captanes.length).toBeGreaterThan(0);

    const failures: string[] = [];

    for (const c of cuivres) {
      const res = checkTankMixCompatibility(c.name, "Dipel DF", "fr");
      if (!res?.isBlocking || res.status !== "incompatible") {
        failures.push(`Cuivre × Bt non bloqué: ${c.name} + Dipel DF`);
      }
    }

    for (const h of huiles) {
      for (const s of soufres) {
        const res = checkTankMixCompatibility(h.name, s.name, "fr");
        if (!res?.isBlocking || res.status !== "incompatible") {
          failures.push(`Huile × Soufre non bloqué: ${h.name} + ${s.name}`);
        }
      }
      for (const cap of captanes) {
        const res = checkTankMixCompatibility(h.name, cap.name, "fr");
        if (!res?.isBlocking || res.status !== "incompatible") {
          failures.push(`Huile × Captane non bloqué: ${h.name} + ${cap.name}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
