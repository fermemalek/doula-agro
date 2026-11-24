import { describe, it, expect } from "vitest";
import { PHYTO_DATABASE, checkTankMixCompatibility } from "@/data/phytosanitaires";
import {
  evaluatePhytoTemporalConflicts,
  checkProductBlockedForGrowthStage,
  type GrowthStage,
} from "@/lib/phyto/engine";
import { PHENOLOGICAL_STAGES } from "@/lib/phyto/database";

// Générateur pseudo-aléatoire déterministe (reproductible à 100 % en CI)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MULTISITE_RE = /\b(FRAC\s*M0?[1-9]|IRAC\s*UN|ADJUVANT|ATTRACTIF|DIVERS)\b/i;
const BEE_RE = /\bIRAC\s*(3A|4A|4C|4D|5|6|28)\b/i;
const ALL_STAGES: GrowthStage[] = PHENOLOGICAL_STAGES.map((s) => s.id);

function extractSiteCodes(codeGroup: string | undefined): string[] {
  if (!codeGroup) return [];
  return Array.from(
    new Set(
      codeGroup
        .split(/[+/,]/)
        .map((c) => c.trim().replace(/\s+/g, " ").toUpperCase())
        .filter((c) => /^(FRAC|IRAC|HRAC)\s+[A-Z0-9]+$/i.test(c) && !MULTISITE_RE.test(c)),
    ),
  );
}

function addDaysISO(baseIso: string, deltaDays: number): string {
  const d = new Date(`${baseIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

describe("Couche 1 — Fuzzing & Invariants Phytosanitaires (2 500+ cas générés)", () => {
  it("Invariant 1 (1 500 mélanges aléatoires de 2 ou 3 produits) : aucun mélange partageant un code FRAC/IRAC site-spécifique ne passe", () => {
    const rand = mulberry32(20261124);
    const violations: string[] = [];

    for (let i = 0; i < 1500; i++) {
      const a = PHYTO_DATABASE[Math.floor(rand() * PHYTO_DATABASE.length)];
      const b = PHYTO_DATABASE[Math.floor(rand() * PHYTO_DATABASE.length)];
      const c = i % 3 === 0 ? PHYTO_DATABASE[Math.floor(rand() * PHYTO_DATABASE.length)] : null;
      const mix = c ? [a, b, c] : [a, b];

      // Vérifier toutes les paires du mélange (exactement comme RecommendationForm.tsx)
      for (let x = 0; x < mix.length; x++) {
        for (let y = x + 1; y < mix.length; y++) {
          const p1 = mix[x];
          const p2 = mix[y];
          const codes1 = extractSiteCodes(p1.codeGroup);
          const codes2 = extractSiteCodes(p2.codeGroup);
          const shared = codes1.filter((code) => codes2.includes(code));

          if (shared.length > 0 || p1.name.toLowerCase() === p2.name.toLowerCase()) {
            const res = checkTankMixCompatibility(p1.name, p2.name, i % 2 === 0 ? "fr" : "ar");
            if (!res || !res.isBlocking || res.status !== "incompatible") {
              violations.push(
                `[${i}] ${p1.name} (${p1.codeGroup}) + ${p2.name} (${p2.codeGroup}) → non bloqué (shared: ${shared.join(",")})`,
              );
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("Invariant 2 (500 séquences temporelles aléatoires) : toute répétition <= 14 j (y compris pending) est strictement bloquée", () => {
    const rand = mulberry32(987654321);
    const cropGroupsList = ["pommiers", "oliviers", "nablara", "redix25"];
    const statuses = ["envoyee", "acceptee", "executed"];
    const violations: string[] = [];

    for (let i = 0; i < 500; i++) {
      const prod = PHYTO_DATABASE[Math.floor(rand() * PHYTO_DATABASE.length)];
      const crop = cropGroupsList[Math.floor(rand() * cropGroupsList.length)];
      const status = statuses[Math.floor(rand() * statuses.length)];
      const baseDay = 1 + Math.floor(rand() * 25);
      const baseMonth = 1 + Math.floor(rand() * 11);
      const date1 = `2026-${String(baseMonth).padStart(2, "0")}-${String(baseDay).padStart(2, "0")}`;
      const delta = Math.floor(rand() * 15); // 0 à 14 jours
      const date2 = addDaysISO(date1, delta);

      const conflicts = evaluatePhytoTemporalConflicts({
        proposedProducts: [{ product: prod.name, date: date2 }],
        targetCropGroups: [crop],
        allRecommendations: [
          {
            id: `fuzz-reco-${i}`,
            kind: "phytosanitaire",
            status,
            parcel_ids: [],
            payload: {
              crop_group: [crop],
              program: { date: date1, products: [{ product: prod.name }] },
            },
          },
        ],
        lang: i % 2 === 0 ? "fr" : "ar",
      });

      const blocked = conflicts.some((c) => c.isBlocking && c.rule === "interval_14d");
      if (!blocked) {
        violations.push(`[${i}] ${prod.name} (${crop}, ${status}) J0=${date1} J+${delta}=${date2} non bloqué`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("Invariant 3 (500 tirages aléatoires stades × produits) : tout insecticide abeilles en floraison ou herbicide foliaire est bloqué", () => {
    const rand = mulberry32(424242);
    const violations: string[] = [];

    for (let i = 0; i < 500; i++) {
      const prod = PHYTO_DATABASE[Math.floor(rand() * PHYTO_DATABASE.length)];
      const stage = ALL_STAGES[Math.floor(rand() * ALL_STAGES.length)];
      const res = checkProductBlockedForGrowthStage(prod, stage);

      if (stage === "floraison" && BEE_RE.test(prod.codeGroup || "") && !res.blocked) {
        violations.push(`${prod.name} (${prod.codeGroup}) autorisé en floraison`);
      }
      if (prod.blockedStages?.includes("foliaire_interdit") && !res.blocked) {
        violations.push(`${prod.name} (foliaire_interdit) autorisé au stade ${stage}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
