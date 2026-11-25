import { useCallback, useEffect, useState } from "react";

export type FrigoChambreId = "grande" | "petite";
export type FrigoRoomCode = "G1" | "G2" | "G3" | "G4" | "G5" | "CH-01";
export type FrigoStackColor = "rouge" | "jaune";

export interface FrigoRoomSpec {
  code: FrigoRoomCode;
  chambre: FrigoChambreId;
  labelFr: string;
  labelAr: string;
  dimensions: string;
  capacityCajous: number;
  islands: [number, number, number]; // [leftCols, centerCols, rightCols]
  totalCols: number;
  totalRows: number;
}

export const FRIGO_ROOM_SPECS: Record<FrigoRoomCode, FrigoRoomSpec> = {
  G1: {
    code: "G1",
    chambre: "grande",
    labelFr: "Chambre G1 (Grande Active)",
    labelAr: "غرفة G1 (الكبيرة النشطة)",
    dimensions: "5,25 m × 9 m",
    capacityCajous: 1890,
    islands: [3, 4, 3],
    totalCols: 10,
    totalRows: 15,
  },
  G2: {
    code: "G2",
    chambre: "grande",
    labelFr: "Chambre G2 (Grande)",
    labelAr: "غرفة G2 (كبيرة)",
    dimensions: "5,25 m × 9 m",
    capacityCajous: 1890,
    islands: [3, 4, 3],
    totalCols: 10,
    totalRows: 15,
  },
  G3: {
    code: "G3",
    chambre: "grande",
    labelFr: "Chambre G3 (Grande)",
    labelAr: "غرفة G3 (كبيرة)",
    dimensions: "5,25 m × 9 m",
    capacityCajous: 1890,
    islands: [3, 4, 3],
    totalCols: 10,
    totalRows: 15,
  },
  G4: {
    code: "G4",
    chambre: "grande",
    labelFr: "Chambre G4 (Grande)",
    labelAr: "غرفة G4 (كبيرة)",
    dimensions: "5,25 m × 9 m",
    capacityCajous: 1890,
    islands: [3, 4, 3],
    totalCols: 10,
    totalRows: 15,
  },
  G5: {
    code: "G5",
    chambre: "grande",
    labelFr: "Chambre G5 (Grande)",
    labelAr: "غرفة G5 (كبيرة)",
    dimensions: "5,25 m × 9 m",
    capacityCajous: 1890,
    islands: [3, 4, 3],
    totalCols: 10,
    totalRows: 15,
  },
  "CH-01": {
    code: "CH-01",
    chambre: "petite",
    labelFr: "Chambre CH-01 (Petite Active)",
    labelAr: "غرفة CH-01 (الصغيرة النشطة)",
    dimensions: "Petite Chambre + SAS",
    capacityCajous: 1323,
    islands: [2, 3, 2],
    totalCols: 7,
    totalRows: 15,
  },
};

export const FRIGO_ROOM_ORDER: FrigoRoomCode[] = ["G1", "G2", "G3", "G4", "G5", "CH-01"];

/** Hauteur maximale de gerbage par rangée (0-indexée, du fond vers la porte) selon DISPOSITION CAJOUS3 */
export function getRowMaxStackHeight(rowIndex: number): number {
  if (rowIndex < 4) return 14; // Rangées 1–4 (fond)
  if (rowIndex < 8) return 13; // Rangées 5–8
  if (rowIndex < 12) return 12; // Rangées 9–12
  return 11; // Rangées 13–15 (entrée)
}

/** Couleur par défaut selon l'îlot : ROUGE sur les îlots latéraux, JAUNE sur l'îlot central */
export function getDefaultStackColor(roomCode: FrigoRoomCode, colIndex: number): FrigoStackColor {
  const [left, center] = FRIGO_ROOM_SPECS[roomCode].islands;
  if (colIndex >= left && colIndex < left + center) return "jaune";
  return "rouge";
}

export function resolveRoomCode(item: { chambre: FrigoChambreId; roomCode?: FrigoRoomCode }): FrigoRoomCode {
  if (item.roomCode && FRIGO_ROOM_SPECS[item.roomCode]) return item.roomCode;
  return item.chambre === "petite" ? "CH-01" : "G1";
}

export function roomCodeToChambre(code: FrigoRoomCode): FrigoChambreId {
  return code === "CH-01" ? "petite" : "grande";
}

export interface FrigoRoomMeta {
  temperatureC: number;
  humidityPct: number;
}

export interface FrigoStackCell {
  height: number;
  color: FrigoStackColor;
  farmer?: string;
}

export type FrigoRoomGridOverrides = Record<string, FrigoStackCell>; // key: `${row}_${col}`

export const DEFAULT_ROOM_META: Record<FrigoRoomCode, FrigoRoomMeta> = {
  G1: { temperatureC: 1.5, humidityPct: 90 },
  G2: { temperatureC: 4.0, humidityPct: 85 },
  G3: { temperatureC: 4.0, humidityPct: 85 },
  G4: { temperatureC: 4.0, humidityPct: 85 },
  G5: { temperatureC: 4.0, humidityPct: 85 },
  "CH-01": { temperatureC: 1.5, humidityPct: 90 },
};

/** Génère la disposition initiale des piles dans une chambre à partir des lots actifs */
export function buildDefaultRoomGrid(
  roomCode: FrigoRoomCode,
  entries: FrigoPurchaseEntry[],
  cajousRestants: number,
): Record<string, FrigoStackCell> {
  const spec = FRIGO_ROOM_SPECS[roomCode];
  const grid: Record<string, FrigoStackCell> = {};
  const totalEntres = entries.reduce((s, e) => s + e.nbCajous, 0);
  const ratio = totalEntres > 0 ? Math.min(1, Math.max(0, cajousRestants / totalEntres)) : 0;

  // Construire la file des fermiers avec leur quota de cajous restants
  const farmerQueue = entries
    .map((e) => ({
      farmer: e.fermierFournisseur,
      remaining: Math.round(e.nbCajous * ratio),
    }))
    .filter((f) => f.remaining > 0);

  // Ajuster le léger écart d'arrondi sur le dernier fermier
  const sumQueued = farmerQueue.reduce((s, f) => s + f.remaining, 0);
  if (farmerQueue.length > 0 && sumQueued !== Math.round(cajousRestants)) {
    const diff = Math.round(cajousRestants) - sumQueued;
    farmerQueue[farmerQueue.length - 1].remaining = Math.max(0, farmerQueue[farmerQueue.length - 1].remaining + diff);
  }

  let qIdx = 0;

  for (let r = 0; r < spec.totalRows; r++) {
    const maxH = getRowMaxStackHeight(r);
    for (let c = 0; c < spec.totalCols; c++) {
      const color = getDefaultStackColor(roomCode, c);
      let height = 0;
      let farmer: string | undefined = undefined;

      while (qIdx < farmerQueue.length && farmerQueue[qIdx].remaining <= 0) {
        qIdx++;
      }

      if (qIdx < farmerQueue.length) {
        const cur = farmerQueue[qIdx];
        const take = Math.min(maxH, cur.remaining);
        height = take;
        farmer = cur.farmer;
        cur.remaining -= take;
      }

      grid[`${r}_${c}`] = { height, color, farmer };
    }
  }

  return grid;
}

export interface FrigoPurchaseEntry {
  id: string;
  campaign: string;
  date: string;
  fermierFournisseur: string;
  chambre: FrigoChambreId;
  roomCode?: FrigoRoomCode;
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
  roomCode?: FrigoRoomCode;
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
  roomMeta?: Partial<Record<FrigoRoomCode, FrigoRoomMeta>>;
  roomGrids?: Partial<Record<FrigoRoomCode, FrigoRoomGridOverrides>>;
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
  roomMeta: {},
  roomGrids: {},
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
        roomMeta: parsed?.roomMeta && typeof parsed.roomMeta === "object" ? parsed.roomMeta : {},
        roomGrids: parsed?.roomGrids && typeof parsed.roomGrids === "object" ? parsed.roomGrids : {},
      };
    }
  } catch {
    state = { entries: [], chargesByCampaign: {}, exits: [], roomMeta: {}, roomGrids: {} };
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

  const updateRoomMeta = useCallback((roomCode: FrigoRoomCode, patch: Partial<FrigoRoomMeta>) => {
    const current = state.roomMeta?.[roomCode] || DEFAULT_ROOM_META[roomCode];
    state = {
      ...state,
      roomMeta: {
        ...(state.roomMeta || {}),
        [roomCode]: { ...current, ...patch },
      },
    };
    persist();
  }, []);

  const updateRoomStackCells = useCallback(
    (roomCode: FrigoRoomCode, cellsPatch: Record<string, FrigoStackCell>) => {
      const current = state.roomGrids?.[roomCode] || {};
      state = {
        ...state,
        roomGrids: {
          ...(state.roomGrids || {}),
          [roomCode]: { ...current, ...cellsPatch },
        },
      };
      persist();
    },
    [],
  );

  const resetRoomGrid = useCallback((roomCode: FrigoRoomCode) => {
    const nextGrids = { ...(state.roomGrids || {}) };
    delete nextGrids[roomCode];
    state = {
      ...state,
      roomGrids: nextGrids,
    };
    persist();
  }, []);

  return {
    entries: state.entries,
    chargesByCampaign: state.chargesByCampaign,
    exits: state.exits,
    roomMeta: state.roomMeta || {},
    roomGrids: state.roomGrids || {},
    addEntry,
    updateEntry,
    removeEntry,
    updateCharges,
    addExit,
    removeExit,
    updateRoomMeta,
    updateRoomStackCells,
    resetRoomGrid,
  };
}
