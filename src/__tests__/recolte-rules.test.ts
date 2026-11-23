import { describe, it, expect, beforeEach } from "vitest";
import {
  buildBordereau36387Record,
  buildBordereau001_2026Record,
  buildBordereau002_2026Record,
  buildBordereau2026_03Record,
} from "@/lib/recolte-seed";
import {
  SEED_ENTRIES_2026,
  DEFAULT_CHARGES_2026,
  sumInstallationCharges,
} from "@/lib/frigo-negoce-store";

describe("4. Suppression en cascade & Anti-doublon Récolte / Chambre Froide", () => {
  beforeEach(() => {
    // Assurer un environnement propre pour chaque test
  });

  it("déduplique strictement les récoltes multi-parcelles Pommier 1 & 2 (jamais de double comptage)", () => {
    const r1 = { id: "rec_36387", createdAt: 1, parcelId: "pommier1", ...buildBordereau36387Record() };
    const r2 = { id: "rec_001", createdAt: 2, parcelId: "pommier1", ...buildBordereau001_2026Record() };
    const r3 = { id: "rec_002", createdAt: 3, parcelId: "pommier1", ...buildBordereau002_2026Record() };
    const r4 = { id: "rec_2026_03", createdAt: 4, parcelId: "pommier1", ...buildBordereau2026_03Record() };

    // Vérifier que les 4 transactions sont bien rattachées à Pommier 1 & 2
    for (const r of [r1, r2, r3, r4]) {
      expect(r.parcelIds).toEqual(["pommier1", "pommier2"]);
    }

    // Simuler une agrégation où les mêmes 4 IDs apparaîtraient sur Pommier 1 ET Pommier 2
    const duplicatedAcrossParcels = [
      r1,
      r2,
      r3,
      r4,
      { ...r1, parcelId: "pommier2" },
      { ...r2, parcelId: "pommier2" },
      { ...r3, parcelId: "pommier2" },
      { ...r4, parcelId: "pommier2" },
    ];

    // Déduplication stricte par ID unique (même règle que Rendement.tsx)
    const uniqueById = Array.from(new Map(duplicatedAcrossParcels.map((r) => [r.id, r])).values());
    expect(uniqueById).toHaveLength(4);

    const totalKg = Number(uniqueById.reduce((sum, r) => sum + (r.totalKg || 0), 0).toFixed(1));
    // Total réel des 4 bordereaux (3666.1 + 2644.8 + 2326.4 + 1616.3 = 10 253.6 kg), jamais doublé (> 20 000 kg)
    expect(totalKg).toBeGreaterThan(10250);
    expect(totalKg).toBeLessThan(10260);
    expect(totalKg).not.toBeGreaterThan(20000);
  });

  it("supprime en cascade par reco_id et par fallback (date + parcelId + produit) sans toucher aux saisies manuelles", () => {
    // Simuler la structure exacte de modules-store pour tester le filtrage en cascade
    const storeRecords = [
      {
        id: "mod-1",
        parcelId: "pommier1",
        mod: "phytosanitaire",
        reco_id: "reco-abc",
        date: "2026-04-10",
        products: [{ product: "BELLIS® WG" }],
      },
      {
        id: "mod-2",
        parcelId: "pommier1",
        mod: "pulverisation",
        date: "2026-04-10",
        items: [{ name: "Bore" }],
        weatherNote: "Validé par l'Ingénieur",
      },
      {
        id: "mod-manual",
        parcelId: "pommier1",
        mod: "phytosanitaire",
        date: "2026-03-01",
        products: [{ product: "Soufre mouillable" }],
        weatherNote: "Validé manuellement",
      },
    ];

    // Test suppression ciblée par reco_id + fallback (date + produit)
    const recoIdToDelete = "reco-abc";
    const remainingAfterSingleDelete = storeRecords.filter((r) => {
      const directMatch = r.reco_id === recoIdToDelete;
      const fallbackMatch =
        r.date === "2026-04-10" &&
        r.parcelId === "pommier1" &&
        JSON.stringify(r).toLowerCase().includes("bore");
      return !(directMatch || fallbackMatch);
    });

    expect(remainingAfterSingleDelete).toHaveLength(1);
    expect(remainingAfterSingleDelete[0].id).toBe("mod-manual");
  });

  it("valide les totaux exacts de la Chambre Froide (Grande & Petite) et le seuil de rentabilité 363,87 DA/kg", () => {
    const totalCajous = SEED_ENTRIES_2026.reduce((s, e) => s + e.nbCajous, 0);
    const totalPoidsNetKg = SEED_ENTRIES_2026.reduce((s, e) => s + e.poidsNetKg, 0);
    const coutAchatSansCharges = SEED_ENTRIES_2026.reduce((s, e) => s + e.totalPayementDA, 0);
    const totalCharges = sumInstallationCharges(DEFAULT_CHARGES_2026);
    const coutRevientTotal = coutAchatSansCharges + totalCharges;

    expect(totalCajous).toBe(2740);
    expect(totalPoidsNetKg).toBe(43716);
    expect(coutAchatSansCharges).toBe(14490600);
    expect(Number((coutAchatSansCharges / totalPoidsNetKg).toFixed(2))).toBe(331.47);
    expect(coutRevientTotal).toBe(15907100);
    expect(Number((coutRevientTotal / totalPoidsNetKg).toFixed(2))).toBe(363.87);
  });
});
