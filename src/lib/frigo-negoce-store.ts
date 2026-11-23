import { useCallback, useEffect, useState } from "react";

export type FrigoChambreId = "grande" | "petite";

export interface FrigoPurchaseEntry {
  id: string;
  campaign: string;
  date: string;
  fermierFournisseur: string;
  chambre: FrigoChambreId;
  nbCajous: number;
  poidsNetKg: number;
  poidsNetArrondiKg: number;
  prixAchatKg: number;
  totalPayementDA: number;
  notes?: string;
}

export interface FrigoInstallationCharges {
  cajousDA: number;
  mainOeuvreTracteurEmballageDA: number;
  transportFermeDA: number;
  autresDA: number;
  fraisFrigoElectriciteGardiennageDA: number;
}

export interface FrigoSaleExit {
  id: string;
  campaign: string;
  date: string;
  chambre: FrigoChambreId;
  destination: "mandataire" | "direct";
  clientOuMandataire: string;
  numeroBordereau?: string;
  nbCajousSortis: number;
  poidsSortiKg: number;
  prixVenteKg: number;
  montantBrutDA: number;
  deductionsDA: number;
  montantNetDA: number;
  paymentStatus: "paye" | "en_attente";
  notes?: string;
}

export interface FrigoNegoceState {
  entries: FrigoPurchaseEntry[];
  chargesByCampaign: Record<string, FrigoInstallationCharges>;
  exits: FrigoSaleExit[];
}

export const SEED_FLAG_FRIGO_ACHATS_2026 = "doula_seed_frigo_achats_2026";
const STORAGE_KEY = "doula_frigo_negoce_state_v1";

export const DEFAULT_CHARGES_2026: FrigoInstallationCharges = {
  cajousDA: 959000,
  mainOeuvreTracteurEmballageDA: 122500,
  transportFermeDA: 301000,
  autresDA: 34000,
  fraisFrigoElectriciteGardiennageDA: 0,
};

export const EMPTY_CHARGES: FrigoInstallationCharges = {
  cajousDA: 0,
  mainOeuvreTracteurEmballageDA: 0,
  transportFermeDA: 0,
  autresDA: 0,
  fraisFrigoElectriciteGardiennageDA: 0,
};

export const SEED_ENTRIES_2026: FrigoPurchaseEntry[] = [
  // Chambre froide Grande (1 607 cajous · 25 407 kg · 8 229 000,00 DA)
  {
    id: "seed_frigo_2026_khaled",
    campaign: "2026",
    date: "2026-10-01",
    fermierFournisseur: "Khaled",
    chambre: "grande",
    nbCajous: 249,
    poidsNetKg: 4009,
    poidsNetArrondiKg: 4000,
    prixAchatKg: 345,
    totalPayementDA: 1374000,
  },
  {
    id: "seed_frigo_2026_abdellah",
    campaign: "2026",
    date: "2026-10-01",
    fermierFournisseur: "Abdellah",
    chambre: "grande",
    nbCajous: 151,
    poidsNetKg: 2365,
    poidsNetArrondiKg: 2360,
    prixAchatKg: 330,
    totalPayementDA: 775000,
  },
  {
    id: "seed_frigo_2026_youcef",
    campaign: "2026",
    date: "2026-10-01",
    fermierFournisseur: "Youcef",
    chambre: "grande",
    nbCajous: 1207,
    poidsNetKg: 19033,
    poidsNetArrondiKg: 19000,
    prixAchatKg: 320,
    totalPayementDA: 6080000,
  },
  // Chambre froide Petite (1 133 cajous · 18 309 kg · 6 261 600,00 DA)
  {
    id: "seed_frigo_2026_adnane",
    campaign: "2026",
    date: "2026-10-01",
    fermierFournisseur: "Adnane",
    chambre: "petite",
    nbCajous: 483,
    poidsNetKg: 7789,
    poidsNetArrondiKg: 7789,
    prixAchatKg: 360,
    totalPayementDA: 2790000,
  },
  {
    id: "seed_frigo_2026_aziz",
    campaign: "2026",
    date: "2026-10-01",
    fermierFournisseur: "Aziz",
    chambre: "petite",
    nbCajous: 650,
    poidsNetKg: 10520,
    poidsNetArrondiKg: 10520,
    prixAchatKg: 330,
    totalPayementDA: 3471600,
  },
];

let state: FrigoNegoceState = {
  entries: [],
  chargesByCampaign: {},
  exits: [],
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
  notify();
}

function loadAndSeed() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = {
        entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        chargesByCampaign:
          parsed?.chargesByCampaign && typeof parsed.chargesByCampaign === "object"
            ? parsed.chargesByCampaign
            : {},
        exits: Array.isArray(parsed?.exits) ? parsed.exits : [],
      };
    }
  } catch {
    state = { entries: [], chargesByCampaign: {}, exits: [] };
  }

  // Seed idempotent identifié par `doula_seed_frigo_achats_2026`
  let alreadySeeded = false;
  try {
    alreadySeeded = localStorage.getItem(SEED_FLAG_FRIGO_ACHATS_2026) === "1";
  } catch {
    alreadySeeded = false;
  }

  if (!alreadySeeded) {
    const existingIds = new Set(state.entries.map((e) => e.id));
    for (const item of SEED_ENTRIES_2026) {
      if (!existingIds.has(item.id)) {
        state.entries.push(item);
      }
    }
    if (!state.chargesByCampaign["2026"]) {
      state.chargesByCampaign["2026"] = { ...DEFAULT_CHARGES_2026 };
    }
    try {
      localStorage.setItem(SEED_FLAG_FRIGO_ACHATS_2026, "1");
    } catch {
      // ignore
    }
    persist();
  }
}

loadAndSeed();

export function getChargesForCampaign(
  chargesByCampaign: Record<string, FrigoInstallationCharges>,
  campaign: string,
): FrigoInstallationCharges {
  if (campaign === "all") {
    const sum: FrigoInstallationCharges = { ...EMPTY_CHARGES };
    for (const c of Object.values(chargesByCampaign)) {
      sum.cajousDA += c.cajousDA || 0;
      sum.mainOeuvreTracteurEmballageDA += c.mainOeuvreTracteurEmballageDA || 0;
      sum.transportFermeDA += c.transportFermeDA || 0;
      sum.autresDA += c.autresDA || 0;
      sum.fraisFrigoElectriciteGardiennageDA += c.fraisFrigoElectriciteGardiennageDA || 0;
    }
    return sum;
  }
  return chargesByCampaign[campaign] || (campaign === "2026" ? { ...DEFAULT_CHARGES_2026 } : { ...EMPTY_CHARGES });
}

export function sumInstallationCharges(c: FrigoInstallationCharges): number {
  return (
    (c.cajousDA || 0) +
    (c.mainOeuvreTracteurEmballageDA || 0) +
    (c.transportFermeDA || 0) +
    (c.autresDA || 0) +
    (c.fraisFrigoElectriciteGardiennageDA || 0)
  );
}

export function useFrigoNegoceStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const addEntry = useCallback((entry: Omit<FrigoPurchaseEntry, "id">) => {
    const item: FrigoPurchaseEntry = {
      ...entry,
      id: `frigo_entry_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    state = { ...state, entries: [...state.entries, item] };
    persist();
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<FrigoPurchaseEntry>) => {
    state = {
      ...state,
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch, id } : e)),
    };
    persist();
  }, []);

  const removeEntry = useCallback((id: string) => {
    state = {
      ...state,
      entries: state.entries.filter((e) => e.id !== id),
    };
    persist();
  }, []);

  const updateCharges = useCallback((campaign: string, patch: Partial<FrigoInstallationCharges>) => {
    const key = campaign === "all" ? "2026" : campaign;
    const current = state.chargesByCampaign[key] || (key === "2026" ? { ...DEFAULT_CHARGES_2026 } : { ...EMPTY_CHARGES });
    state = {
      ...state,
      chargesByCampaign: {
        ...state.chargesByCampaign,
        [key]: { ...current, ...patch },
      },
    };
    persist();
  }, []);

  const addExit = useCallback((exit: Omit<FrigoSaleExit, "id">) => {
    const item: FrigoSaleExit = {
      ...exit,
      id: `frigo_exit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    state = { ...state, exits: [item, ...state.exits] };
    persist();
  }, []);

  const removeExit = useCallback((id: string) => {
    state = {
      ...state,
      exits: state.exits.filter((x) => x.id !== id),
    };
    persist();
  }, []);

  return {
    entries: state.entries,
    chargesByCampaign: state.chargesByCampaign,
    exits: state.exits,
    addEntry,
    updateEntry,
    removeEntry,
    updateCharges,
    addExit,
    removeExit,
  };
}
