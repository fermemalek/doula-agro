// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const removeMutateAsync = vi.fn();
const acceptMutateAsync = vi.fn();

vi.mock("@/lib/cloud/recommendations", () => ({
  useRecommendations: () => ({ data: [], isLoading: false }),
  useRecommendationActions: () => ({
    create: { mutateAsync: createMutateAsync },
    update: { mutateAsync: updateMutateAsync },
    remove: { mutateAsync: removeMutateAsync },
    accept: { mutateAsync: acceptMutateAsync },
  }),
  uploadRecommendationPhotos: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/products-store", () => ({
  useProducts: () => [],
  useProductActions: () => ({ add: vi.fn() }),
}));

vi.mock("@/lib/suppliers-store", () => ({
  useSuppliers: () => [],
  useSupplierActions: () => ({ addPurchase: vi.fn() }),
}));

vi.mock("@/lib/modules-store", () => ({
  useAllModuleRecords: () => [],
  useModuleActions: () => ({ add: vi.fn(), remove: vi.fn(), update: vi.fn() }),
}));

vi.mock("@/lib/parcel-store", () => ({
  useParcels: () => [
    { id: "pommier1", name: "Pommier 1", type: "pommier", info: { surface: "1", nbArbres: "1450" } },
    { id: "pommier2", name: "Pommier 2", type: "pommier", info: { surface: "1", nbArbres: "1465" } },
  ],
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    lang: "fr",
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock("@/components/ingenieur/PhytoAdvisorModal", () => ({
  PhytoAdvisorModal: () => null,
}));

vi.mock("@/components/ingenieur/PhytoHistoryModal", () => ({
  PhytoHistoryModal: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { RecommendationForm } from "@/components/ingenieur/RecommendationForm";

function setupPhytoTwoProductsForm() {
  // 1. Sélectionner le groupe de parcelles POMMIERS
  const pommierBtn = screen.getByRole("button", { name: /crop\.pommiers|POMMIERS/i });
  fireEvent.click(pommierBtn);

  // 2. Désélectionner Fert. Irrigation (actif par défaut) et activer Phytosanitaire
  const fertBtn = screen.getByRole("button", { name: /reco\.form\.shortFertIrrigation/i });
  fireEvent.click(fertBtn);
  const phytoBtn = screen.getByRole("button", { name: /reco\.form\.shortPhyto|Phytosanitaire/i });
  fireEvent.click(phytoBtn);

  // 3. Remplir la date d'application (le Dialog Radix est rendu en portail dans document.body)
  const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
  dateInputs.forEach((inp) => {
    fireEvent.change(inp, { target: { value: "2026-04-20" } });
  });

  // 4. Cliquer sur "+ 2ème Produit" pour passer en mélange de 2 produits
  const addSecondBtn = screen.getByRole("button", { name: /\+ 2ème Produit/i });
  fireEvent.click(addSecondBtn);

  // Récupérer les 2 <select> de produits phytosanitaires (ceux qui contiennent l'option "Sivento")
  const allSelects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  const phytoSelects = allSelects.filter((sel) =>
    Array.from(sel.options).some((opt) => opt.value === "Sivento"),
  );
  expect(phytoSelects.length).toBeGreaterThanOrEqual(2);
  return { select1: phytoSelects[0], select2: phytoSelects[1] };
}

describe("Tests d'intégration UI — RecommendationForm (Tank-Mix & Double Emploi)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMutateAsync.mockResolvedValue({ id: "created-reco-1" });
  });

  afterEach(() => {
    cleanup();
  });

  it("Cas A (Sivento + Sivento) : affiche l'erreur rouge bloquante, désactive les boutons et empêche toute sauvegarde", () => {
    const onOpenChange = vi.fn();
    render(<RecommendationForm open={true} onOpenChange={onOpenChange} />);

    const { select1, select2 } = setupPhytoTwoProductsForm();
    fireEvent.change(select1, { target: { value: "Sivento" } });
    fireEvent.change(select2, { target: { value: "Sivento" } });

    // Bannière rouge bloquante visible
    expect(screen.getByText(/Double emploi de la même matière active/i)).toBeInTheDocument();
    expect(screen.getByText(/⛔ Bloquant/i)).toBeInTheDocument();

    // Les deux boutons de soumission sont désactivés et affichent le motif de blocage
    const blockedBtns = screen.getAllByRole("button", { name: /Bloqué : Double emploi de matière active/i });
    expect(blockedBtns.length).toBe(2);
    for (const btn of blockedBtns) {
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
    }

    // Aucune sauvegarde déclenchée
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("Cas B (Luna + Bellis) : détecte FRAC 7 partagé, désactive les boutons et empêche toute sauvegarde", () => {
    const onOpenChange = vi.fn();
    render(<RecommendationForm open={true} onOpenChange={onOpenChange} />);

    const { select1, select2 } = setupPhytoTwoProductsForm();
    fireEvent.change(select1, { target: { value: "Luna" } });
    fireEvent.change(select2, { target: { value: "Bellis" } });

    // Bannière rouge FRAC 7 partagé visible
    expect(screen.getByText(/Conflit de groupe de résistance \(FRAC 7 commun\)/i)).toBeInTheDocument();
    expect(screen.getByText(/FRAC 7 - SDHI/i)).toBeInTheDocument();

    // Boutons désactivés
    const blockedBtns = screen.getAllByRole("button", { name: /Bloqué : Incompatibilité Tank-Mix/i });
    expect(blockedBtns.length).toBe(2);
    for (const btn of blockedBtns) {
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
    }

    // 0 appel de sauvegarde
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("Cas C (SCORE + Calypso) : mélange valide, bouton actif et soumission déclenchée", async () => {
    const onOpenChange = vi.fn();
    render(<RecommendationForm open={true} onOpenChange={onOpenChange} />);

    const { select1, select2 } = setupPhytoTwoProductsForm();
    fireEvent.change(select1, { target: { value: "SCORE" } });
    fireEvent.change(select2, { target: { value: "Calypso" } });

    // Bannière verte compatible visible
    expect(screen.getByText(/Mélange parfaitement compatible/i)).toBeInTheDocument();

    // Bouton d'envoi actif
    const submitBtn = screen.getByRole("button", { name: /En attente/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledTimes(1);
    });
  });
});
