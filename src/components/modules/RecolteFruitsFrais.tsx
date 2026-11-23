import { useEffect, useMemo, useState } from "react";
import {
  Save,
  Trash2,
  History,
  Image as ImageIcon,
  Snowflake,
  Store,
  Handshake,
  Plus,
  X,
  TrendingUp,
  Package,
  Pencil,
  Printer,
  Shuffle,
  ArrowDownToLine,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcels } from "@/lib/parcel-store";
import { useTranslation } from "@/lib/i18n";
import { type Parcel } from "@/data/parcels";
import { formatDateFR, formatDA, formatNumber } from "@/lib/format";
import {
  BordereauPrintModal,
  computeBordereauTotals,
  type BordereauPrintData,
  type BordereauPrintLine,
} from "./BordereauPrintModal";
import {
  BordereauEditorCard,
  APPLE_VARIETY_OPTIONS,
  CALIBRE_OPTIONS,
  createEmptyBordereau,
  createEmptySaleLine,
  type MandataireBordereau,
} from "./BordereauEditorCard";
import { seedBordereau36387IfNeeded } from "@/lib/recolte-seed";

export type FruitDestination = "mandataire" | "frigo" | "direct" | "mixte";
export type PaymentStatus = "paye" | "en_attente" | "partiel";
export type HarvestUnit = "Kg" | "Quintal" | "Caisse/Colis";

export interface HarvestAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface HarvestLotLine {
  id: string;
  nature: string;
  colis: string;
  poidsNetKg: string;
}

export interface FrigoBlock {
  id: string;
  frigoName: string;
  chambreNo: string;
  entryDate: string;
  tarifType: "per_kg_month" | "fixed";
  tarifValue: string;
  lots: HarvestLotLine[];
}

export interface DirectSaleBlock {
  id: string;
  clientName: string;
  paymentStatus: "paye" | "credit";
  lines: BordereauPrintLine[];
}

export interface FrigoExitEntry {
  id: string;
  date: string;
  mode: "mandataire" | "direct";
  buyerName: string;
  qty: number; // kg sortis (ou unité historique)
  colis?: number;
  unitPrice: number;
  commissionType?: "percent" | "fixed";
  commissionValue?: number;
  commissionAmount: number;
  droitsMarcheAmount?: number;
  grossAmount: number;
  netAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount?: number;
  // Nouveau format complet
  bordereau?: MandataireBordereau;
  directLines?: BordereauPrintLine[];
}

export interface FreshFruitHarvestRecord {
  id: string;
  createdAt: number;
  recordMode?: "fruits_frais";
  schemaVersion?: 2;
  date: string;
  selectedParcelIds?: string[];
  unit: HarvestUnit | "Caisses" | string;
  avgCrateWeightKg?: string;
  qty: string;
  totalKg?: number;
  totalColis?: number;
  price: string;
  // Nouveau workflow Étape 1 (Lots dynamiques)
  harvestLots?: HarvestLotLine[];
  rebutKg?: string;
  rebutPercent?: number;
  // Rétrocompatibilité ancien Tri & Calibres
  choix1Qty?: string;
  choix1Price?: string;
  choix2Qty?: string;
  choix2Price?: string;
  choix3Qty?: string;
  choix3Price?: string;
  choix4Qty?: string;
  choix4Price?: string;
  rebutQty?: string;
  // Destination Étape 2
  destination?: FruitDestination;
  bordereaux?: MandataireBordereau[];
  frigoBlocks?: FrigoBlock[];
  directBlocks?: DirectSaleBlock[];
  // Rétrocompatibilité anciens champs destination
  mandataireName?: string;
  mandataireQty?: string;
  mandatairePrice?: string;
  commissionType?: "percent" | "fixed";
  commissionValue?: string;
  commissionAmount?: number;
  paymentStatus?: PaymentStatus;
  paidAmount?: string;
  frigoName?: string;
  frigoEntryDate?: string;
  frigoQty?: string;
  frigoRateType?: "per_crate" | "fixed";
  frigoRateValue?: string;
  frigoCost?: number;
  frigoExits?: FrigoExitEntry[];
  directQty?: string;
  directPrice?: string;
  // Charges opérationnelles ferme (DA)
  mainOeuvre: string;
  emballages?: string;
  transport: string;
  autres: string;
  // Totaux normalisés
  totalVente?: number;
  totalDeductionsMandataire?: number;
  netBordereauVentes?: number;
  chargesFerme?: number;
  totalCharges?: number;
  total?: number;
  net?: number;
  notes: string;
  photo?: string;
  attachments?: HarvestAttachment[];
}

function parseNum(v: string | number | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function parseTreeCount(parcel?: Parcel): number {
  if (!parcel?.info) return 0;
  const raw = parcel.info.nbArbres || parcel.info.nbArbresParcelle || "";
  const cleaned = raw.replace(/\s+/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function createEmptyHarvestLot(nature = ""): HarvestLotLine {
  return {
    id: `lot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nature,
    colis: "",
    poidsNetKg: "",
  };
}

function createEmptyFrigoBlock(date: string, lots?: HarvestLotLine[]): FrigoBlock {
  return {
    id: `fg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    frigoName: "",
    chambreNo: "",
    entryDate: date || new Date().toISOString().slice(0, 10),
    tarifType: "per_kg_month",
    tarifValue: "",
    lots: lots && lots.length > 0 ? lots.map((l) => ({ ...l, id: createEmptyHarvestLot().id })) : [createEmptyHarvestLot()],
  };
}

function createEmptyDirectBlock(lines?: BordereauPrintLine[]): DirectSaleBlock {
  return {
    id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    clientName: "",
    paymentStatus: "paye",
    lines: lines && lines.length > 0 ? lines.map((l) => ({ ...l, id: createEmptySaleLine().id })) : [createEmptySaleLine()],
  };
}

function lotsToSaleLines(lots: HarvestLotLine[]): BordereauPrintLine[] {
  const valid = lots.filter((l) => l.nature.trim() || parseNum(l.colis) > 0 || parseNum(l.poidsNetKg) > 0);
  if (valid.length === 0) return [createEmptySaleLine()];
  return valid.map((l) => ({
    id: createEmptySaleLine().id,
    nature: l.nature,
    colis: l.colis,
    poidsNetKg: l.poidsNetKg,
    prixUnitaire: "",
  }));
}

function getRecordFrigoStoredKg(r: FreshFruitHarvestRecord): number {
  if (Array.isArray(r.frigoBlocks) && r.frigoBlocks.length > 0) {
    return r.frigoBlocks.reduce(
      (sum, fb) => sum + fb.lots.reduce((ls, l) => ls + parseNum(l.poidsNetKg), 0),
      0,
    );
  }
  const initFrigo = parseNum(r.frigoQty);
  if (initFrigo <= 0) return 0;
  const crateWeight = r.unit === "Caisses" ? Math.max(0.1, parseNum(r.avgCrateWeightKg) || 15) : 1;
  return initFrigo * crateWeight;
}

function getRecordFrigoStoredColis(r: FreshFruitHarvestRecord): number {
  if (Array.isArray(r.frigoBlocks) && r.frigoBlocks.length > 0) {
    return r.frigoBlocks.reduce(
      (sum, fb) => sum + fb.lots.reduce((ls, l) => ls + parseNum(l.colis), 0),
      0,
    );
  }
  return r.unit === "Caisses" ? parseNum(r.frigoQty) : 0;
}

function getRecordFinancialSummary(r: FreshFruitHarvestRecord) {
  const exits = r.frigoExits || [];
  const exitedKg = exits.reduce((s, e) => s + (e.qty || 0), 0);
  const exitedColis = exits.reduce((s, e) => s + (e.colis || 0), 0);
  const storedKg = getRecordFrigoStoredKg(r);
  const storedColis = getRecordFrigoStoredColis(r);
  const remainingFrigoKg = Math.max(0, storedKg - exitedKg);
  const remainingFrigoColis = Math.max(0, storedColis - exitedColis);

  // V2 schema
  if (r.schemaVersion === 2 || Array.isArray(r.bordereaux) || Array.isArray(r.directBlocks)) {
    const bds = r.bordereaux || [];
    const dbs = r.directBlocks || [];
    const fbs = r.frigoBlocks || [];

    let grossSales = 0;
    let deductionsMandataire = 0;
    let avances = 0;

    for (const bd of bds) {
      const t = computeBordereauTotals(bd);
      grossSales += t.totalVenteBrute;
      deductionsMandataire += t.comDA + t.droitsMarche;
      avances += t.avanceProducteur;
    }

    for (const db of dbs) {
      for (const l of db.lines) {
        grossSales += parseNum(l.poidsNetKg) * parseNum(l.prixUnitaire);
      }
    }

    // Ajouter les sorties de frigo
    for (const ex of exits) {
      if (ex.bordereau) {
        const t = computeBordereauTotals(ex.bordereau);
        grossSales += t.totalVenteBrute;
        deductionsMandataire += t.comDA + t.droitsMarche;
        avances += t.avanceProducteur;
      } else {
        grossSales += ex.grossAmount || 0;
        deductionsMandataire += (ex.commissionAmount || 0) + (ex.droitsMarcheAmount || 0);
      }
    }

    // Coût stockage frigo estimé
    let frigoStorageCost = 0;
    for (const fb of fbs) {
      const val = parseNum(fb.tarifValue);
      if (val <= 0) continue;
      if (fb.tarifType === "fixed") {
        frigoStorageCost += val;
      } else {
        const fbKg = fb.lots.reduce((s, l) => s + parseNum(l.poidsNetKg), 0);
        frigoStorageCost += fbKg * val;
      }
    }

    const chargesFerme =
      parseNum(r.mainOeuvre) +
      parseNum(r.transport) +
      parseNum(r.emballages) +
      parseNum(r.autres) +
      frigoStorageCost;

    const netVentes = grossSales - deductionsMandataire;
    const netAPayerBordereaux = netVentes - avances;
    const beneficeNetFerme = netVentes - chargesFerme;

    const totalKg =
      typeof r.totalKg === "number"
        ? r.totalKg
        : (r.harvestLots || []).reduce((s, l) => s + parseNum(l.poidsNetKg), 0);
    const totalColis =
      typeof r.totalColis === "number"
        ? r.totalColis
        : (r.harvestLots || []).reduce((s, l) => s + parseNum(l.colis), 0);

    return {
      totalKg,
      totalColis,
      grossSales,
      deductionsMandataire,
      netVentes,
      netAPayerBordereaux,
      chargesFerme,
      beneficeNetFerme,
      storedKg,
      remainingFrigoKg,
      remainingFrigoColis,
    };
  }

  // Legacy V1 fallback
  const rQty = parseNum(r.qty);
  const rUnitWeight = r.unit === "Caisses" ? Math.max(0.1, parseNum(r.avgCrateWeightKg) || 15) : 1;
  const totalKg = typeof r.totalKg === "number" ? r.totalKg : rQty * rUnitWeight;
  const totalColis = r.unit === "Caisses" ? rQty : 0;
  const exitsGross = exits.reduce((s, e) => s + (e.grossAmount || 0), 0);
  const exitsComm = exits.reduce((s, e) => s + (e.commissionAmount || 0), 0);

  const baseVente =
    typeof r.totalVente === "number"
      ? r.totalVente
      : parseNum(r.choix1Qty) * parseNum(r.choix1Price) +
          parseNum(r.choix2Qty) * parseNum(r.choix2Price) +
          parseNum(r.choix3Qty) * parseNum(r.choix3Price) +
          parseNum(r.choix4Qty) * parseNum(r.choix4Price) ||
        rQty * parseNum(r.price);

  const baseCharges =
    typeof r.totalCharges === "number"
      ? r.totalCharges
      : parseNum(r.mainOeuvre) +
        parseNum(r.emballages) +
        parseNum(r.transport) +
        parseNum(r.autres) +
        (r.frigoCost || 0) +
        (r.commissionAmount || 0);

  const grossSales = baseVente + exitsGross;
  const deductionsMandataire = (r.commissionAmount || 0) + exitsComm;
  const chargesFerme = Math.max(0, baseCharges - (r.commissionAmount || 0));
  const netVentes = grossSales - deductionsMandataire;
  const beneficeNetFerme = netVentes - chargesFerme;

  return {
    totalKg,
    totalColis,
    grossSales,
    deductionsMandataire,
    netVentes,
    netAPayerBordereaux: netVentes,
    chargesFerme,
    beneficeNetFerme,
    storedKg,
    remainingFrigoKg,
    remainingFrigoColis,
  };
}

export function RecolteFruitsFrais({
  parcelId,
  parcel,
  canEdit,
  showForm = false,
  onOpenForm,
  onCloseForm,
  prefillDate,
  prefillNotes,
}: {
  parcelId: string;
  parcel?: Parcel;
  canEdit: boolean;
  showForm?: boolean;
  onOpenForm?: () => void;
  onCloseForm?: () => void;
  prefillDate?: string;
  prefillNotes?: string;
}) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const allParcels = useParcels();
  const ownRecords = useModuleRecords<FreshFruitHarvestRecord>(parcelId, "recolte");
  const pommier1Records = useModuleRecords<FreshFruitHarvestRecord>("pommier1", "recolte");
  const { add, update, remove } = useModuleActions();
  const [editingHarvestId, setEditingHarvestId] = useState<string | null>(null);
  const [editingOwnerParcelId, setEditingOwnerParcelId] = useState<string>(parcelId);

  // Seed idempotent du bordereau réel N° 36387 (Pommier 1 & 2) — exécuté une seule fois
  useEffect(() => {
    if (parcelId === "pommier1" || parcelId === "pommier2") {
      seedBordereau36387IfNeeded(pommier1Records, add);
    }
  }, [parcelId, pommier1Records, add]);

  // Sur Pommier 2, afficher aussi les récoltes partagées Pommier 1 & 2 sans doublon
  const records = useMemo(() => {
    if (parcelId !== "pommier2") return ownRecords;
    const ownIds = new Set(ownRecords.map((r) => r.id));
    const shared = pommier1Records.filter(
      (r) => !ownIds.has(r.id) && Array.isArray(r.selectedParcelIds) && r.selectedParcelIds.includes("pommier2"),
    );
    return [...ownRecords, ...shared].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [parcelId, ownRecords, pommier1Records]);

  const getRecordOwnerParcelId = (r: FreshFruitHarvestRecord): string => {
    if (parcelId === "pommier2" && !ownRecords.some((own) => own.id === r.id)) {
      return "pommier1";
    }
    return parcelId;
  };

  const CUSTOM_SPECIES_KEY = "doula_recolte_custom_species_v1";
  const [customSpeciesList, setCustomSpeciesList] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_SPECIES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : [];
    } catch {
      return [];
    }
  });
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");
  const [selectedCalibre, setSelectedCalibre] = useState<string>("22");
  const [addingCustomSpecies, setAddingCustomSpecies] = useState<boolean>(false);
  const [newSpeciesName, setNewSpeciesName] = useState<string>("");

  const speciesOptions = useMemo(() => {
    return Array.from(new Set([...APPLE_VARIETY_OPTIONS, ...customSpeciesList]));
  }, [customSpeciesList]);

  function handleAddCustomSpecies() {
    const cleaned = newSpeciesName.trim();
    if (!cleaned) return;
    if (!speciesOptions.includes(cleaned)) {
      const next = [...customSpeciesList, cleaned];
      setCustomSpeciesList(next);
      try {
        localStorage.setItem(CUSTOM_SPECIES_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
    }
    setSelectedSpecies(cleaned);
    setNewSpeciesName("");
    setAddingCustomSpecies(false);
    toast.success(isAr ? `تمت إضافة الصنف "${cleaned}"` : `Espèce « ${cleaned} » ajoutée !`);
  }

  function handleAddLotFromPicker() {
    const calLabel = /^\d+$/.test(selectedCalibre) ? `Cal. ${selectedCalibre}` : selectedCalibre;
    const composed = selectedSpecies ? `${selectedSpecies} — ${calLabel}` : calLabel;
    const emptyIdx = harvestLots.findIndex((l) => !l.nature.trim() && !l.poidsNetKg && !l.colis);
    if (emptyIdx >= 0) {
      setHarvestLots((prev) => prev.map((l, i) => (i === emptyIdx ? { ...l, nature: composed } : l)));
    } else {
      setHarvestLots((prev) => [...prev, createEmptyHarvestLot(composed)]);
    }
  }

  // Liste des mandataires déjà saisis pour l'autocomplétion
  const knownMandataires = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.mandataireName?.trim()) set.add(r.mandataireName.trim());
      for (const b of r.bordereaux || []) {
        if (b.mandataireName?.trim()) set.add(b.mandataireName.trim());
      }
      for (const ex of r.frigoExits || []) {
        if (ex.mode === "mandataire" && ex.buyerName?.trim()) set.add(ex.buyerName.trim());
        if (ex.bordereau?.mandataireName?.trim()) set.add(ex.bordereau.mandataireName.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const currentYear = String(new Date().getFullYear());
  const availableYears = useMemo(() => {
    const yrs = new Set<string>([currentYear]);
    for (const r of records) {
      const y = (r.date || "").slice(0, 4);
      if (/^\d{4}$/.test(y)) yrs.add(y);
    }
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [records, currentYear]);

  const [selectedYear, setSelectedYear] = useState<string>(currentYear);

  const filteredRecords = useMemo(() => {
    if (selectedYear === "all") return records;
    return records.filter((r) => (r.date || "").startsWith(selectedYear));
  }, [records, selectedYear]);

  const treeCount = useMemo(() => parseTreeCount(parcel), [parcel]);

  // ========== ÉTATS DU FORMULAIRE EN 2 ÉTAPES ==========
  const todayIso = new Date().toISOString().slice(0, 10);

  // ÉTAPE 1 — Cueillette & Lots
  const [date, setDate] = useState(prefillDate || todayIso);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([parcelId]);
  const [unit, setUnit] = useState<HarvestUnit>("Kg");
  const [harvestLots, setHarvestLots] = useState<HarvestLotLine[]>([createEmptyHarvestLot("")]);
  const [rebutKg, setRebutKg] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [attachments, setAttachments] = useState<HarvestAttachment[]>([]);
  const [notes, setNotes] = useState(prefillNotes || "");

  // ÉTAPE 2 — Destination (4 modes)
  const [destination, setDestination] = useState<FruitDestination>("mandataire");
  const [bordereaux, setBordereaux] = useState<MandataireBordereau[]>([createEmptyBordereau(todayIso)]);
  const [frigoBlocks, setFrigoBlocks] = useState<FrigoBlock[]>([createEmptyFrigoBlock(todayIso)]);
  const [directBlocks, setDirectBlocks] = useState<DirectSaleBlock[]>([createEmptyDirectBlock()]);

  // Charges opérationnelles ferme (DA)
  const [mainOeuvre, setMainOeuvre] = useState("");
  const [transport, setTransport] = useState("");
  const [emballages, setEmballages] = useState("");
  const [autres, setAutres] = useState("");

  // Impression PDF A4
  const [printData, setPrintData] = useState<BordereauPrintData | null>(null);

  // Modale de sortie Chambre Froide (Mandataire avec Bordereau complet OU Vente directe)
  const [exitRecord, setExitRecord] = useState<FreshFruitHarvestRecord | null>(null);
  const [exitMode, setExitMode] = useState<"mandataire" | "direct">("mandataire");
  const [exitBordereau, setExitBordereau] = useState<MandataireBordereau>(() => createEmptyBordereau(todayIso));
  const [exitDirectBlock, setExitDirectBlock] = useState<DirectSaleBlock>(() => createEmptyDirectBlock());
  const [exitDirectDate, setExitDirectDate] = useState(todayIso);

  // Synchronisation prefillDate / prefillNotes
  useEffect(() => {
    if (prefillDate && !editingHarvestId) {
      setDate(prefillDate);
      setBordereaux((prev) => prev.map((b, i) => (i === 0 ? { ...b, dateFolio: prefillDate } : b)));
      setFrigoBlocks((prev) => prev.map((fb, i) => (i === 0 ? { ...fb, entryDate: prefillDate } : fb)));
    }
    if (prefillNotes && !editingHarvestId) {
      setNotes(prefillNotes);
    }
  }, [prefillDate, prefillNotes, editingHarvestId]);

  // Libellé "Le Compte de" pour le bordereau imprimable
  const buildAccountLabel = (parcelIds?: string[]) => {
    const ids = parcelIds && parcelIds.length > 0 ? parcelIds : [parcelId];
    const names = ids
      .map((id) => allParcels.find((p) => p.id === id)?.name || id)
      .join(", ");
    const species = parcel?.type ? `${parcel.type} — ` : "";
    return `Ferme Doula / Mouaas (${species}${names})`;
  };

  // ========== CALCULS ÉTAPE 1 ==========
  const step1Totals = useMemo(() => {
    let totalColis = 0;
    let totalPoidsNetKg = 0;
    for (const l of harvestLots) {
      totalColis += parseNum(l.colis);
      totalPoidsNetKg += parseNum(l.poidsNetKg);
    }
    const rebut = parseNum(rebutKg);
    const totalBrutAvecRebut = totalPoidsNetKg + rebut;
    const rebutPercent = totalBrutAvecRebut > 0 ? (rebut / totalBrutAvecRebut) * 100 : 0;
    return { totalColis, totalPoidsNetKg, rebut, rebutPercent };
  }, [harvestLots, rebutKg]);

  // ========== CALCULS ÉTAPE 2 & RÉCAPITULATIF FINANCIER ==========
  const activeBordereaux = destination === "mandataire" ? bordereaux.slice(0, 1) : destination === "mixte" ? bordereaux : [];
  const activeFrigoBlocks = destination === "frigo" ? frigoBlocks.slice(0, 1) : destination === "mixte" ? frigoBlocks : [];
  const activeDirectBlocks = destination === "direct" ? directBlocks.slice(0, 1) : destination === "mixte" ? directBlocks : [];

  const formFinancials = useMemo(() => {
    let assignedKg = 0;
    let totalVenteBrute = 0;
    let deductionsMandataire = 0;
    let totalAvances = 0;
    let frigoStoredKg = 0;
    let frigoStorageCost = 0;

    for (const bd of activeBordereaux) {
      const t = computeBordereauTotals(bd);
      assignedKg += t.totalPoidsNet;
      totalVenteBrute += t.totalVenteBrute;
      deductionsMandataire += t.comDA + t.droitsMarche;
      totalAvances += t.avanceProducteur;
    }

    for (const fb of activeFrigoBlocks) {
      const kg = fb.lots.reduce((s, l) => s + parseNum(l.poidsNetKg), 0);
      assignedKg += kg;
      frigoStoredKg += kg;
      const val = parseNum(fb.tarifValue);
      if (val > 0) {
        frigoStorageCost += fb.tarifType === "fixed" ? val : kg * val;
      }
    }

    for (const db of activeDirectBlocks) {
      for (const l of db.lines) {
        const kg = parseNum(l.poidsNetKg);
        assignedKg += kg;
        totalVenteBrute += kg * parseNum(l.prixUnitaire);
      }
    }

    const netVentes = totalVenteBrute - deductionsMandataire;
    const netAPayerBordereaux = netVentes - totalAvances;
    const chargesFerme =
      parseNum(mainOeuvre) +
      parseNum(transport) +
      parseNum(emballages) +
      parseNum(autres) +
      frigoStorageCost;
    const beneficeNetFerme = netVentes - chargesFerme;
    const remainingToAssignKg = step1Totals.totalPoidsNetKg - assignedKg;

    return {
      assignedKg,
      remainingToAssignKg,
      totalVenteBrute,
      deductionsMandataire,
      totalAvances,
      netVentes,
      netAPayerBordereaux,
      frigoStoredKg,
      frigoStorageCost,
      chargesFerme,
      beneficeNetFerme,
    };
  }, [
    activeBordereaux,
    activeFrigoBlocks,
    activeDirectBlocks,
    mainOeuvre,
    transport,
    emballages,
    autres,
    step1Totals.totalPoidsNetKg,
  ]);

  // ========== KPI CUMULÉS DE L'ANNÉE SÉLECTIONNÉE ==========
  const campaignKpis = useMemo(() => {
    let sumKg = 0;
    let sumColis = 0;
    let sumGrossSales = 0;
    let sumNetVentes = 0;
    let sumChargesFerme = 0;
    let sumBeneficeNet = 0;
    let sumFrigoRemKg = 0;
    let sumFrigoRemColis = 0;

    for (const r of filteredRecords) {
      const s = getRecordFinancialSummary(r);
      sumKg += s.totalKg;
      sumColis += s.totalColis;
      sumGrossSales += s.grossSales;
      sumNetVentes += s.netVentes;
      sumChargesFerme += s.chargesFerme;
      sumBeneficeNet += s.beneficeNetFerme;
      sumFrigoRemKg += s.remainingFrigoKg;
      sumFrigoRemColis += s.remainingFrigoColis;
    }

    const yieldPerTree = treeCount > 0 ? sumKg / treeCount : 0;
    return {
      sumKg,
      sumColis,
      sumGrossSales,
      sumNetVentes,
      sumChargesFerme,
      sumBeneficeNet,
      sumFrigoRemKg,
      sumFrigoRemColis,
      yieldPerTree,
    };
  }, [filteredRecords, treeCount]);

  // ========== HELPERS FORMULAIRE ==========
  function resetForm() {
    setEditingHarvestId(null);
    setDate(prefillDate || todayIso);
    setSelectedParcelIds([parcelId]);
    setUnit("Kg");
    setHarvestLots([createEmptyHarvestLot("")]);
    setRebutKg("");
    setPhoto(undefined);
    setAttachments([]);
    setNotes(prefillNotes || "");
    setDestination("mandataire");
    setBordereaux([createEmptyBordereau(prefillDate || todayIso)]);
    setFrigoBlocks([createEmptyFrigoBlock(prefillDate || todayIso)]);
    setDirectBlocks([createEmptyDirectBlock()]);
    setMainOeuvre("");
    setTransport("");
    setEmballages("");
    setAutres("");
  }

  function switchDestination(nextDest: FruitDestination) {
    setDestination(nextDest);
    // Pré-remplir intelligemment si le bloc cible est encore vide
    if (nextDest === "mandataire") {
      if (bordereaux.length === 0) {
        setBordereaux([createEmptyBordereau(date, lotsToSaleLines(harvestLots))]);
      } else if (
        bordereaux[0].lines.length === 1 &&
        !bordereaux[0].lines[0].poidsNetKg &&
        step1Totals.totalPoidsNetKg > 0
      ) {
        setBordereaux((prev) =>
          prev.map((b, i) => (i === 0 ? { ...b, dateFolio: date, lines: lotsToSaleLines(harvestLots) } : b)),
        );
      }
    } else if (nextDest === "frigo") {
      if (frigoBlocks.length === 0) {
        setFrigoBlocks([createEmptyFrigoBlock(date, harvestLots)]);
      } else if (
        frigoBlocks[0].lots.length === 1 &&
        !frigoBlocks[0].lots[0].poidsNetKg &&
        step1Totals.totalPoidsNetKg > 0
      ) {
        setFrigoBlocks((prev) =>
          prev.map((fb, i) =>
            i === 0
              ? { ...fb, entryDate: date, lots: harvestLots.map((l) => ({ ...l, id: createEmptyHarvestLot().id })) }
              : fb,
          ),
        );
      }
    } else if (nextDest === "direct") {
      if (directBlocks.length === 0) {
        setDirectBlocks([createEmptyDirectBlock(lotsToSaleLines(harvestLots))]);
      } else if (
        directBlocks[0].lines.length === 1 &&
        !directBlocks[0].lines[0].poidsNetKg &&
        step1Totals.totalPoidsNetKg > 0
      ) {
        setDirectBlocks((prev) =>
          prev.map((db, i) => (i === 0 ? { ...db, lines: lotsToSaleLines(harvestLots) } : db)),
        );
      }
    }
  }

  function onAddAttachments(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl) return;
        const item: HarvestAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          dataUrl,
        };
        setAttachments((prev) => [...prev, item]);
        if (item.mimeType.startsWith("image/")) {
          setPhoto((prev) => prev || dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSaveHarvest() {
    if (!date) return;
    if (step1Totals.totalPoidsNetKg <= 0 && step1Totals.totalColis <= 0) {
      toast.error(isAr ? "يرجى إدخال كمية محصودة واحدة على الأقل" : "Veuillez saisir au moins un lot récolté.");
      return;
    }

    const firstBd = activeBordereaux[0];
    const firstFg = activeFrigoBlocks[0];

    const payload: Omit<FreshFruitHarvestRecord, "id" | "createdAt"> = {
      recordMode: "fruits_frais",
      schemaVersion: 2,
      date,
      selectedParcelIds: selectedParcelIds.length > 0 ? selectedParcelIds : [parcelId],
      unit,
      qty: String(step1Totals.totalPoidsNetKg),
      totalKg: Number(step1Totals.totalPoidsNetKg.toFixed(2)),
      totalColis: Math.round(step1Totals.totalColis),
      price: "",
      harvestLots: harvestLots.filter((l) => l.nature.trim() || parseNum(l.colis) > 0 || parseNum(l.poidsNetKg) > 0),
      rebutKg,
      rebutPercent: Number(step1Totals.rebutPercent.toFixed(1)),
      destination,
      bordereaux: activeBordereaux,
      frigoBlocks: activeFrigoBlocks,
      directBlocks: activeDirectBlocks,
      // Champs résumés rétrocompatibles
      mandataireName: firstBd?.mandataireName || "",
      paymentStatus: firstBd?.paymentStatus || (activeDirectBlocks[0]?.paymentStatus === "credit" ? "en_attente" : "paye"),
      frigoName: firstFg ? [firstFg.frigoName, firstFg.chambreNo].filter(Boolean).join(" - ") : "",
      frigoEntryDate: firstFg?.entryDate || date,
      frigoQty: formFinancials.frigoStoredKg > 0 ? String(formFinancials.frigoStoredKg) : "",
      frigoCost: Number(formFinancials.frigoStorageCost.toFixed(2)),
      commissionAmount: Number(formFinancials.deductionsMandataire.toFixed(2)),
      mainOeuvre,
      transport,
      emballages,
      autres,
      totalVente: Number(formFinancials.totalVenteBrute.toFixed(2)),
      totalDeductionsMandataire: Number(formFinancials.deductionsMandataire.toFixed(2)),
      netBordereauVentes: Number(formFinancials.netAPayerBordereaux.toFixed(2)),
      chargesFerme: Number(formFinancials.chargesFerme.toFixed(2)),
      totalCharges: Number((formFinancials.chargesFerme + formFinancials.deductionsMandataire).toFixed(2)),
      total: Number((formFinancials.chargesFerme + formFinancials.deductionsMandataire).toFixed(2)),
      net: Number(formFinancials.beneficeNetFerme.toFixed(2)),
      notes,
      photo: attachments.find((a) => a.mimeType.startsWith("image/"))?.dataUrl || photo,
      attachments,
    };

    if (editingHarvestId) {
      update(editingOwnerParcelId || parcelId, "recolte", editingHarvestId, payload);
      toast.success(isAr ? "تم تحديث الجني والكشف بنجاح!" : "Récolte et bordereau mis à jour !");
    } else {
      add(parcelId, "recolte", {
        ...payload,
        frigoExits: [],
      });
      toast.success(isAr ? "تم تسجيل الجني بنجاح!" : "Récolte enregistrée avec succès !");
    }

    const savedYear = date.slice(0, 4);
    if (/^\d{4}$/.test(savedYear)) setSelectedYear(savedYear);
    resetForm();
    onCloseForm?.();
  }

  function handleEditRecord(r: FreshFruitHarvestRecord) {
    setEditingHarvestId(r.id);
    setEditingOwnerParcelId(getRecordOwnerParcelId(r));
    setDate(r.date || todayIso);
    setSelectedParcelIds(r.selectedParcelIds && r.selectedParcelIds.length > 0 ? r.selectedParcelIds : [parcelId]);
    setUnit((r.unit === "Quintal" || r.unit === "Caisse/Colis" ? r.unit : "Kg") as HarvestUnit);

    if (Array.isArray(r.harvestLots) && r.harvestLots.length > 0) {
      setHarvestLots(r.harvestLots.map((l) => ({ ...l })));
    } else {
      // Migration douce depuis un ancien record Choix 1..4
      const legacyLots: HarvestLotLine[] = [];
      const cw = r.unit === "Caisses" ? Math.max(0.1, parseNum(r.avgCrateWeightKg) || 15) : 1;
      const pushIf = (label: string, q?: string) => {
        const n = parseNum(q);
        if (n > 0) {
          legacyLots.push({
            id: createEmptyHarvestLot().id,
            nature: label,
            colis: r.unit === "Caisses" ? String(n) : "",
            poidsNetKg: String(Number((n * cw).toFixed(2))),
          });
        }
      };
      pushIf("Choix 1", r.choix1Qty);
      pushIf("Choix 2", r.choix2Qty);
      pushIf("Choix 3", r.choix3Qty);
      pushIf("Choix 4", r.choix4Qty);
      if (legacyLots.length === 0) {
        legacyLots.push({
          id: createEmptyHarvestLot().id,
          nature: "Choix 1",
          colis: r.unit === "Caisses" ? r.qty || "" : "",
          poidsNetKg: String(r.totalKg || parseNum(r.qty) * cw || ""),
        });
      }
      setHarvestLots(legacyLots);
    }

    setRebutKg(r.rebutKg || r.rebutQty || "");
    setPhoto(r.photo);
    if (Array.isArray(r.attachments) && r.attachments.length > 0) {
      setAttachments(r.attachments.map((a) => ({ ...a })));
    } else if (r.photo) {
      setAttachments([
        {
          id: `legacy_photo_${r.id}`,
          name: "Photo bordereau",
          mimeType: "image/jpeg",
          dataUrl: r.photo,
        },
      ]);
    } else {
      setAttachments([]);
    }
    setNotes(r.notes || "");
    setDestination(r.destination || "mandataire");

    if (Array.isArray(r.bordereaux) && r.bordereaux.length > 0) {
      setBordereaux(r.bordereaux.map((b) => ({ ...b, lines: b.lines.map((l) => ({ ...l })) })));
    } else {
      const bd = createEmptyBordereau(r.date || todayIso);
      bd.mandataireName = r.mandataireName || "";
      bd.paymentStatus = r.paymentStatus || "paye";
      bd.commissionPercent = r.commissionType === "percent" && r.commissionValue ? r.commissionValue : "8";
      setBordereaux([bd]);
    }

    if (Array.isArray(r.frigoBlocks) && r.frigoBlocks.length > 0) {
      setFrigoBlocks(r.frigoBlocks.map((fb) => ({ ...fb, lots: fb.lots.map((l) => ({ ...l })) })));
    } else {
      const fb = createEmptyFrigoBlock(r.frigoEntryDate || r.date || todayIso);
      fb.frigoName = r.frigoName || "";
      setFrigoBlocks([fb]);
    }

    if (Array.isArray(r.directBlocks) && r.directBlocks.length > 0) {
      setDirectBlocks(r.directBlocks.map((db) => ({ ...db, lines: db.lines.map((l) => ({ ...l })) })));
    } else {
      setDirectBlocks([createEmptyDirectBlock()]);
    }

    setMainOeuvre(r.mainOeuvre || "");
    setTransport(r.transport || "");
    setEmballages(r.emballages || "");
    setAutres(r.autres || "");
    onOpenForm?.();
  }

  // ========== SORTIE CHAMBRE FROIDE ==========
  function openFrigoExitModal(r: FreshFruitHarvestRecord) {
    const summary = getRecordFinancialSummary(r);
    setExitRecord(r);
    setExitMode("mandataire");
    setExitDirectDate(todayIso);

    // Pré-remplir avec le stock restant (par nature si disponible)
    const frigoLots =
      r.frigoBlocks && r.frigoBlocks.length > 0
        ? r.frigoBlocks.flatMap((fb) => fb.lots)
        : [
            {
              id: createEmptyHarvestLot().id,
              nature: "Stock frigo",
              colis: summary.remainingFrigoColis > 0 ? String(summary.remainingFrigoColis) : "",
              poidsNetKg: String(Number(summary.remainingFrigoKg.toFixed(2))),
            },
          ];

    const preLines = lotsToSaleLines(frigoLots);
    setExitBordereau(createEmptyBordereau(todayIso, preLines));
    setExitDirectBlock(createEmptyDirectBlock(preLines));
  }

  function handleSaveFrigoExit() {
    if (!exitRecord) return;
    const summary = getRecordFinancialSummary(exitRecord);

    let newExit: FrigoExitEntry;
    if (exitMode === "mandataire") {
      const t = computeBordereauTotals(exitBordereau);
      if (t.totalPoidsNet <= 0) {
        toast.error(isAr ? "يرجى إدخال الوزن الخارج من التبريد" : "Veuillez saisir le poids net sorti du frigo.");
        return;
      }
      if (t.totalPoidsNet > summary.remainingFrigoKg + 0.5) {
        toast.error(
          isAr
            ? `الوزن (${formatNumber(t.totalPoidsNet)} كغ) يتجاوز المخزون المتبقي (${formatNumber(summary.remainingFrigoKg)} كغ)`
            : `Le poids (${formatNumber(t.totalPoidsNet)} kg) dépasse le stock frigo restant (${formatNumber(summary.remainingFrigoKg)} kg).`,
        );
        return;
      }
      newExit = {
        id: `exit_${Date.now()}`,
        date: exitBordereau.dateFolio || todayIso,
        mode: "mandataire",
        buyerName: exitBordereau.mandataireName.trim() || (isAr ? "وكيل السوق" : "Mandataire"),
        qty: Number(t.totalPoidsNet.toFixed(2)),
        colis: Math.round(t.totalColis),
        unitPrice: t.totalPoidsNet > 0 ? Number((t.totalVenteBrute / t.totalPoidsNet).toFixed(2)) : 0,
        commissionType: "percent",
        commissionValue: t.comPct,
        commissionAmount: Number(t.comDA.toFixed(2)),
        droitsMarcheAmount: Number(t.droitsMarche.toFixed(2)),
        grossAmount: Number(t.totalVenteBrute.toFixed(2)),
        netAmount: Number(t.netAPayer.toFixed(2)),
        paymentStatus: exitBordereau.paymentStatus,
        paidAmount: exitBordereau.paymentStatus === "partiel" ? parseNum(exitBordereau.paidAmount) : undefined,
        bordereau: exitBordereau,
      };
    } else {
      const totalKg = exitDirectBlock.lines.reduce((s, l) => s + parseNum(l.poidsNetKg), 0);
      const totalColis = exitDirectBlock.lines.reduce((s, l) => s + parseNum(l.colis), 0);
      const gross = exitDirectBlock.lines.reduce((s, l) => s + parseNum(l.poidsNetKg) * parseNum(l.prixUnitaire), 0);
      if (totalKg <= 0) {
        toast.error(isAr ? "يرجى إدخال الوزن الخارج من التبريد" : "Veuillez saisir le poids net sorti du frigo.");
        return;
      }
      if (totalKg > summary.remainingFrigoKg + 0.5) {
        toast.error(
          isAr
            ? `الوزن (${formatNumber(totalKg)} كغ) يتجاوز المخزون المتبقي (${formatNumber(summary.remainingFrigoKg)} كغ)`
            : `Le poids (${formatNumber(totalKg)} kg) dépasse le stock frigo restant (${formatNumber(summary.remainingFrigoKg)} kg).`,
        );
        return;
      }
      newExit = {
        id: `exit_${Date.now()}`,
        date: exitDirectDate || todayIso,
        mode: "direct",
        buyerName: exitDirectBlock.clientName.trim() || (isAr ? "بيع مباشر" : "Vente directe"),
        qty: Number(totalKg.toFixed(2)),
        colis: Math.round(totalColis),
        unitPrice: totalKg > 0 ? Number((gross / totalKg).toFixed(2)) : 0,
        commissionAmount: 0,
        grossAmount: Number(gross.toFixed(2)),
        netAmount: Number(gross.toFixed(2)),
        paymentStatus: exitDirectBlock.paymentStatus === "credit" ? "en_attente" : "paye",
        directLines: exitDirectBlock.lines,
      };
    }

    const nextExits = [...(exitRecord.frigoExits || []), newExit];
    const updatedRecord: FreshFruitHarvestRecord = { ...exitRecord, frigoExits: nextExits };
    const nextFin = getRecordFinancialSummary(updatedRecord);

    update(parcelId, "recolte", exitRecord.id, {
      frigoExits: nextExits,
      totalVente: Number(nextFin.grossSales.toFixed(2)),
      totalDeductionsMandataire: Number(nextFin.deductionsMandataire.toFixed(2)),
      totalCharges: Number((nextFin.chargesFerme + nextFin.deductionsMandataire).toFixed(2)),
      total: Number((nextFin.chargesFerme + nextFin.deductionsMandataire).toFixed(2)),
      net: Number(nextFin.beneficeNetFerme.toFixed(2)),
    });

    toast.success(isAr ? "تم تسجيل خروج/بيع من غرفة التبريد!" : "Sortie / vente depuis la chambre froide enregistrée !");
    setExitRecord(null);
  }

  function openPrintBordereau(bd: MandataireBordereau, parcelIds?: string[]) {
    setPrintData({
      ...bd,
      accountLabel: bd.accountLabel || buildAccountLabel(parcelIds),
    });
  }

  const cls =
    "w-full min-w-0 max-w-full box-border rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs sm:text-sm";

  return (
    <div className="space-y-4 w-full min-w-0" dir={isAr ? "rtl" : "ltr"}>
      {/* SÉLECTEUR D'ANNÉE */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2">
        <span className="text-xs font-black text-muted-foreground">
          📅 {isAr ? "نتائج الجني لسنة :" : "Résultats par année :"}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedYear(yr)}
              className={`rounded-lg px-3 py-1 text-xs font-black transition cursor-pointer ${
                selectedYear === yr
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card border text-foreground hover:bg-muted"
              }`}
            >
              <span dir="ltr">{yr}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedYear("all")}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
              selectedYear === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card border text-muted-foreground hover:bg-muted"
            }`}
          >
            {isAr ? "الكل" : "Toutes"}
          </button>
        </div>
      </div>

      {/* KPI CUMULÉS CAMPAGNE FRUITS FRAIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="rounded-xl border bg-card p-3">
          <span className="text-[10px] font-bold text-muted-foreground block">
            {isAr ? "الكمية الإجمالية المحصودة" : "Quantité totale récoltée"}
          </span>
          <p dir="ltr" className="text-base sm:text-lg font-black text-foreground">
            {formatNumber(campaignKpis.sumKg, 1)} Kg
          </p>
          <div className="flex flex-wrap gap-x-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            {campaignKpis.sumColis > 0 && <span dir="ltr">{formatNumber(campaignKpis.sumColis, 0)} {isAr ? "صندوق" : "colis"}</span>}
            {treeCount > 0 && (
              <span dir="ltr">
                {formatNumber(campaignKpis.yieldPerTree, 1)} Kg/{isAr ? "شجرة" : "arbre"}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
          <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
            <Snowflake className="h-3 w-3 shrink-0" />
            <span>{isAr ? "مخزون غرفة التبريد" : "Stock chambre froide"}</span>
          </span>
          <p dir="ltr" className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-300">
            {formatNumber(campaignKpis.sumFrigoRemKg, 1)} Kg
          </p>
          {campaignKpis.sumFrigoRemColis > 0 && (
            <span dir="ltr" className="text-[10px] text-muted-foreground font-semibold">
              {formatNumber(campaignKpis.sumFrigoRemColis, 0)} {isAr ? "صندوق متبقي" : "colis en stock"}
            </span>
          )}
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 shrink-0" />
            <span>{isAr ? "الربح الصافي الحقيقي للمزرعة" : "Bénéfice Net Réel Ferme"}</span>
          </span>
          <p
            dir="ltr"
            className={`text-base sm:text-lg font-black ${
              campaignKpis.sumBeneficeNet >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
            }`}
          >
            {formatDA(campaignKpis.sumBeneficeNet)}
          </p>
          <span dir="ltr" className="text-[10px] text-muted-foreground font-semibold block">
            {isAr ? "صافي المبيعات" : "Ventes nettes"}: {formatNumber(campaignKpis.sumNetVentes, 0)} ·{" "}
            {isAr ? "تكاليف المزرعة" : "Charges ferme"}: {formatNumber(campaignKpis.sumChargesFerme, 0)}
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* FORMULAIRE EN 2 ÉTAPES — CUEILLETTE & BORDEREAU MARCHÉ DE GROS   */}
      {/* ================================================================= */}
      {canEdit && showForm && (
        <div className="space-y-5 rounded-2xl border-2 border-emerald-600/35 bg-card p-3.5 sm:p-4 shadow-sm animate-in fade-in-50 duration-150 min-w-0">
          {/* En-tête Formulaire */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary shrink-0" />
              <span>
                {editingHarvestId
                  ? isAr
                    ? "تعديل الجني وكشف المبيعات"
                    : "Modifier la récolte & bordereau"
                  : isAr
                    ? "جني جديد — المرحلة 1 (القطف) والمرحلة 2 (الوجهة / الكشف)"
                    : "Nouvelle récolte — Étape 1 (Lots) & Étape 2 (Destination / Bordereau)"}
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {treeCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  🌳 <span dir="ltr">{formatNumber(treeCount, 0)}</span> {isAr ? "شجرة" : "arbres"}
                </span>
              )}
              {onCloseForm && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onCloseForm();
                  }}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label={isAr ? "إغلاق" : "Fermer"}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* ================= ÉTAPE 1 — SAISIE DE LA RÉCOLTE ================= */}
          <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
              <h4 className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {isAr ? "المرحلة 1 — تسجيل الجني والدفعات (Cueillette & Lots)" : "ÉTAPE 1 — Saisie de la Récolte (Cueillette & Lots)"}
              </h4>
              <span className="text-[11px] font-black text-foreground" dir="ltr">
                {formatNumber(step1Totals.totalColis, 0)} {isAr ? "صندوق" : "colis"} ·{" "}
                {formatNumber(step1Totals.totalPoidsNetKg, 2)} kg
              </span>
            </div>

            {/* Date, Unité, Parcelles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  {isAr ? "تاريخ الجني" : "Date de récolte"}
                </label>
                <input
                  type="date"
                  dir="ltr"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  {isAr ? "وحدة القياس" : "Unité"}
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as HarvestUnit)}
                  className={cls}
                >
                  <option value="Kg">Kg ({isAr ? "كيلوغرام — افتراضي" : "par défaut"})</option>
                  <option value="Quintal">{isAr ? "قنطار (Quintal)" : "Quintal (100 kg)"}</option>
                  <option value="Caisse/Colis">{isAr ? "صندوق / طرد (Caisse/Colis)" : "Caisse / Colis"}</option>
                </select>
              </div>
            </div>

            {/* Sélecteur Espèce / Variété + Calibre (pairs 16 à 30, Frag, Piqué, Rebut) */}
            <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-2.5 space-y-2">
              <span className="text-[10px] font-black uppercase text-primary block">
                {isAr
                  ? "اختيار الصنف والعيار (16 إلى 30 زوجي / Frag / مثقوب / فضلات) :"
                  : "Choix de l'espèce & du calibre (16 à 30 pairs / Frag / Piqué / Rebut) :"}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                {/* Choix espèce / variété */}
                <div className="sm:col-span-5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                    {isAr ? "الصنف / نوع التفاح" : "Espèce / Variété"}
                  </label>
                  <select
                    value={addingCustomSpecies ? "__add__" : selectedSpecies}
                    onChange={(e) => {
                      if (e.target.value === "__add__") {
                        setAddingCustomSpecies(true);
                      } else {
                        setAddingCustomSpecies(false);
                        setSelectedSpecies(e.target.value);
                      }
                    }}
                    className={cls}
                  >
                    <option value="">—</option>
                    {speciesOptions.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                    <option value="__add__">
                      {isAr ? "+ إضافة صنف آخر..." : "+ Autre espèce (ajouter)..."}
                    </option>
                  </select>
                </div>

                {/* Choix calibre impairs 17 à 29 + Frag + Piqué + Rebut */}
                <div className="sm:col-span-4">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                    {isAr ? "العيار / الفئة" : "Calibre / Rubrique"}
                  </label>
                  <select
                    dir="ltr"
                    value={selectedCalibre}
                    onChange={(e) => setSelectedCalibre(e.target.value)}
                    className={cls}
                  >
                    {CALIBRE_OPTIONS.map((cal) => (
                      <option key={cal} value={cal}>
                        {cal === "Frag"
                          ? isAr ? "Frag / فراك" : "Frag"
                          : cal === "Piqué"
                            ? isAr ? "Piqué / مثقوب" : "Piqué"
                            : cal === "Rebut"
                              ? isAr ? "Rebut / فضلات" : "Rebut"
                              : `Calibre ${cal}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bouton ajouter le lot */}
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddLotFromPicker}
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-black transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isAr ? "إضافة الدفعة" : "Ajouter"}</span>
                  </button>
                </div>
              </div>

              {/* Champ inline pour ajouter une nouvelle espèce personnalisée */}
              {addingCustomSpecies && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-primary/15">
                  <input
                    value={newSpeciesName}
                    onChange={(e) => setNewSpeciesName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSpecies();
                      }
                    }}
                    placeholder={isAr ? "اسم الصنف الجديد (مثال: Red Chief, Starking...)" : "Nom de la nouvelle espèce (ex: Red Chief, Starking...)"}
                    className="flex-1 min-w-[160px] rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSpecies}
                    disabled={!newSpeciesName.trim()}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-black disabled:opacity-50 cursor-pointer"
                  >
                    {isAr ? "حفظ الصنف" : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCustomSpecies(false);
                      setNewSpeciesName("");
                    }}
                    className="rounded-lg border px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    {isAr ? "إلغاء" : "Annuler"}
                  </button>
                </div>
              )}
            </div>

            {/* Tableau dynamique multi-lignes « Lots récoltés » */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-foreground">
                  {isAr ? "الدفعات المحصودة (Lots récoltés)" : "Lots récoltés"}
                </span>
                <button
                  type="button"
                  onClick={() => setHarvestLots((prev) => [...prev, createEmptyHarvestLot("")])}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-black transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isAr ? "إضافة سطر" : "Ajouter une ligne"}</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full min-w-[480px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/70 text-[10px] font-black uppercase text-muted-foreground border-b">
                      <th className="p-2 text-left">{isAr ? "الطبيعة / العيار" : "Nature / Calibre"}</th>
                      <th className="p-2 text-center w-24">{isAr ? "عدد الصناديق" : "Nb de colis"}</th>
                      <th className="p-2 text-right w-28">{isAr ? "الوزن الصافي (كغ)" : "Poids net (kg)"}</th>
                      <th className="p-2 text-center w-28">{isAr ? "متوسط الوزن/صندوق" : "Poids moy. / colis"}</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {harvestLots.map((lot) => {
                      const c = parseNum(lot.colis);
                      const kg = parseNum(lot.poidsNetKg);
                      const avg = c > 0 ? kg / c : 0;
                      return (
                        <tr key={lot.id}>
                          <td className="p-1.5">
                            <input
                              value={lot.nature}
                              onChange={(e) =>
                                setHarvestLots((prev) =>
                                  prev.map((l) => (l.id === lot.id ? { ...l, nature: e.target.value } : l)),
                                )
                              }
                              placeholder="ت/22, ت/26, Choix 1..."
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              dir="ltr"
                              inputMode="numeric"
                              value={lot.colis}
                              onChange={(e) =>
                                setHarvestLots((prev) =>
                                  prev.map((l) => (l.id === lot.id ? { ...l, colis: e.target.value } : l)),
                                )
                              }
                              placeholder="0"
                              className="w-full rounded border border-input bg-background px-2 py-1 text-center text-xs font-semibold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              dir="ltr"
                              inputMode="decimal"
                              value={lot.poidsNetKg}
                              onChange={(e) =>
                                setHarvestLots((prev) =>
                                  prev.map((l) => (l.id === lot.id ? { ...l, poidsNetKg: e.target.value } : l)),
                                )
                              }
                              placeholder="0.0"
                              className="w-full rounded border border-input bg-background px-2 py-1 text-right text-xs font-semibold"
                            />
                          </td>
                          <td dir="ltr" className="p-1.5 text-center font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            {avg > 0 ? `${formatNumber(avg, 2)} kg` : "—"}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setHarvestLots((prev) => {
                                  const next = prev.filter((l) => l.id !== lot.id);
                                  return next.length > 0 ? next : [createEmptyHarvestLot("")];
                                })
                              }
                              className="p-1 rounded text-muted-foreground hover:text-destructive transition cursor-pointer"
                              title={isAr ? "حذف السطر" : "Supprimer"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 font-black text-xs border-t">
                      <td className="p-2 uppercase text-[10px]">{isAr ? "المجموع (Total Lots)" : "TOTAL LOTS"}</td>
                      <td dir="ltr" className="p-2 text-center font-mono">
                        {formatNumber(step1Totals.totalColis, 0)} {isAr ? "صندوق" : "colis"}
                      </td>
                      <td dir="ltr" className="p-2 text-right font-mono text-emerald-700 dark:text-emerald-300">
                        {formatNumber(step1Totals.totalPoidsNetKg, 2)} kg
                      </td>
                      <td dir="ltr" className="p-2 text-center font-mono text-[11px] text-muted-foreground">
                        {step1Totals.totalColis > 0
                          ? `${formatNumber(step1Totals.totalPoidsNetKg / step1Totals.totalColis, 2)} kg/c`
                          : "—"}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Ligne séparée Rebut / Déchets (kg) + Photo & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
              <div>
                <label className="text-[10px] uppercase font-bold text-destructive flex items-center justify-between mb-1">
                  <span>{isAr ? "الفضلات / التالف (كغ)" : "Rebut / Déchets (kg)"}</span>
                  {step1Totals.rebut > 0 && (
                    <span dir="ltr" className="font-black">
                      ({formatNumber(step1Totals.rebutPercent, 1)} %)
                    </span>
                  )}
                </label>
                <input
                  dir="ltr"
                  inputMode="decimal"
                  value={rebutKg}
                  onChange={(e) => setRebutKg(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-destructive/35 bg-background px-2.5 py-1.5 text-xs text-destructive font-bold"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-background px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>
                    {attachments.length > 0
                      ? isAr
                        ? `إضافة صور أو PDF (${attachments.length} مرفق)`
                        : `Ajouter photos / PDF (${attachments.length} fichier${attachments.length > 1 ? "s" : ""})`
                      : isAr
                        ? "إرفاق صور أو ملف PDF (متعدد)"
                        : "Attacher photos ou fichier PDF (multiple)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      onAddAttachments(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Aperçu des pièces jointes (photos & PDF) */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((att) => {
                  const isPdf = att.mimeType === "application/pdf" || att.name.toLowerCase().endsWith(".pdf");
                  return (
                    <div
                      key={att.id}
                      className="relative group rounded-lg border bg-background p-1.5 flex items-center gap-2 max-w-[200px]"
                    >
                      {isPdf ? (
                        <a
                          href={att.dataUrl}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 truncate pr-4"
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </a>
                      ) : (
                        <a href={att.dataUrl} target="_blank" rel="noreferrer" className="block">
                          <img src={att.dataUrl} alt={att.name} className="h-14 w-14 rounded object-cover" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-xs cursor-pointer"
                        title={isAr ? "حذف المرفق" : "Retirer ce fichier"}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? "ملاحظات حول القطف أو الجودة..." : "Notes (qualité, transport, observations...)"}
              className={`${cls} min-h-12 resize-y`}
            />
          </div>

          {/* ================= ÉTAPE 2 — CHOIX DE DESTINATION (4 MODES) ================= */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wide text-primary">
              {isAr ? "المرحلة 2 — اختيار الوجهة (4 خيارات)" : "ÉTAPE 2 — Choix de Destination (4 modes)"}
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "mandataire", fr: "Mandataire (Marché de gros)", ar: "وكيل سوق الجملة", icon: Handshake },
                  { id: "frigo", fr: "Chambre froide (Stockage)", ar: "غرفة التبريد (تخزين)", icon: Snowflake },
                  { id: "direct", fr: "Vente directe", ar: "بيع مباشر", icon: Store },
                  { id: "mixte", fr: "Mixte (Répartition)", ar: "مختلط (توزيع)", icon: Shuffle },
                ] as const
              ).map(({ id, fr, ar, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchDestination(id)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-[11px] font-black transition cursor-pointer ${
                    destination === id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/30 text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="leading-tight">{isAr ? ar : fr}</span>
                </button>
              ))}
            </div>

            {/* BARRE DE CONTRÔLE EN MODE MIXTE */}
            {destination === "mixte" && (
              <div
                className={`rounded-xl border p-3 space-y-2 ${
                  Math.abs(formFinancials.remainingToAssignKg) < 0.1
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                    : formFinancials.remainingToAssignKg < 0
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black">
                  <span className="flex items-center gap-1.5">
                    {Math.abs(formFinancials.remainingToAssignKg) < 0.1 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    )}
                    <span>
                      {isAr ? "مراقبة التوزيع :" : "Contrôle répartition :"}
                    </span>
                  </span>
                  <div dir="ltr" className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <span>
                      {isAr ? "المحصود" : "Récolté"} : <strong>{formatNumber(step1Totals.totalPoidsNetKg, 2)} kg</strong>
                    </span>
                    <span>|</span>
                    <span>
                      {isAr ? "الموزّع" : "Affecté"} : <strong>{formatNumber(formFinancials.assignedKg, 2)} kg</strong>
                    </span>
                    <span>|</span>
                    <span>
                      {isAr ? "المتبقي" : "Restant"} :{" "}
                      <strong>{formatNumber(formFinancials.remainingToAssignKg, 2)} kg</strong>
                    </span>
                  </div>
                </div>

                {/* Boutons d'ajout multi-blocs en mode Mixte */}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-current/15">
                  <button
                    type="button"
                    onClick={() => setBordereaux((prev) => [...prev, createEmptyBordereau(date)])}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-[10px] font-black cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{isAr ? "+ كشف وكيل سوق" : "+ Bordereau Mandataire"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrigoBlocks((prev) => [...prev, createEmptyFrigoBlock(date)])}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 text-[10px] font-black cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{isAr ? "+ غرفة تبريد" : "+ Chambre froide"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectBlocks((prev) => [...prev, createEmptyDirectBlock()])}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-black cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{isAr ? "+ بيع مباشر" : "+ Vente directe"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* BLOCS MANDATAIRE (BORDEREAUX) */}
            {activeBordereaux.map((bd, idx) => (
              <BordereauEditorCard
                key={bd.id}
                bordereau={bd}
                title={
                  destination === "mixte"
                    ? `${isAr ? "كشف الوكيل" : "Bordereau Mandataire"} #${idx + 1}`
                    : undefined
                }
                knownMandataires={knownMandataires}
                isAr={isAr}
                onChange={(next) =>
                  setBordereaux((prev) => prev.map((item) => (item.id === bd.id ? next : item)))
                }
                onRemove={
                  destination === "mixte"
                    ? () => setBordereaux((prev) => prev.filter((item) => item.id !== bd.id))
                    : undefined
                }
                onPrefillFromStep1={() =>
                  setBordereaux((prev) =>
                    prev.map((item) =>
                      item.id === bd.id
                        ? { ...item, dateFolio: date, lines: lotsToSaleLines(harvestLots) }
                        : item,
                    ),
                  )
                }
                onPrint={() => openPrintBordereau(bd, selectedParcelIds)}
              />
            ))}

            {/* BLOCS CHAMBRE FROIDE */}
            {activeFrigoBlocks.map((fb, idx) => {
              const fbTotalColis = fb.lots.reduce((s, l) => s + parseNum(l.colis), 0);
              const fbTotalKg = fb.lots.reduce((s, l) => s + parseNum(l.poidsNetKg), 0);
              return (
                <div key={fb.id} className="rounded-xl border-2 border-sky-500/35 bg-sky-500/[0.04] p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/20 pb-2">
                    <span className="text-xs font-black text-sky-800 dark:text-sky-200 flex items-center gap-1.5">
                      <Snowflake className="h-4 w-4 shrink-0" />
                      <span>
                        {isAr ? "تخزين في غرفة التبريد" : "Stockage Chambre froide"}
                        {destination === "mixte" ? ` #${idx + 1}` : ""}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setFrigoBlocks((prev) =>
                            prev.map((item) =>
                              item.id === fb.id
                                ? {
                                    ...item,
                                    entryDate: date,
                                    lots: harvestLots.map((l) => ({ ...l, id: createEmptyHarvestLot().id })),
                                  }
                                : item,
                            ),
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-background px-2 py-1 text-[10px] font-bold text-sky-800 dark:text-sky-200 cursor-pointer"
                      >
                        <ArrowDownToLine className="h-3 w-3" />
                        <span>{isAr ? "تعبئة من المرحلة 1" : "Importer Étape 1"}</span>
                      </button>
                      {destination === "mixte" && (
                        <button
                          type="button"
                          onClick={() => setFrigoBlocks((prev) => prev.filter((item) => item.id !== fb.id))}
                          className="p-1 rounded text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                        {isAr ? "اسم غرفة التبريد" : "Nom du frigo"}
                      </label>
                      <input
                        value={fb.frigoName}
                        onChange={(e) =>
                          setFrigoBlocks((prev) =>
                            prev.map((item) => (item.id === fb.id ? { ...item, frigoName: e.target.value } : item)),
                          )
                        }
                        placeholder={isAr ? "مثال: تبريد بوفاريك..." : "Ex: Frigo Boufarik..."}
                        className={cls}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                        {isAr ? "رقم الغرفة (Chambre N°)" : "Chambre N°"}
                      </label>
                      <input
                        value={fb.chambreNo}
                        onChange={(e) =>
                          setFrigoBlocks((prev) =>
                            prev.map((item) => (item.id === fb.id ? { ...item, chambreNo: e.target.value } : item)),
                          )
                        }
                        placeholder="Ex: Ch. 04"
                        className={cls}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                        {isAr ? "تاريخ الدخول" : "Date d'entrée"}
                      </label>
                      <input
                        type="date"
                        dir="ltr"
                        value={fb.entryDate}
                        onChange={(e) =>
                          setFrigoBlocks((prev) =>
                            prev.map((item) => (item.id === fb.id ? { ...item, entryDate: e.target.value } : item)),
                          )
                        }
                        className={cls}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                        {isAr ? "تعريفة التخزين" : "Tarif stockage"}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <select
                          value={fb.tarifType}
                          onChange={(e) =>
                            setFrigoBlocks((prev) =>
                              prev.map((item) =>
                                item.id === fb.id
                                  ? { ...item, tarifType: e.target.value as "per_kg_month" | "fixed" }
                                  : item,
                              ),
                            )
                          }
                          className="rounded-lg border border-input bg-background px-1.5 py-1.5 text-[11px] font-semibold"
                        >
                          <option value="per_kg_month">DA/kg/mois</option>
                          <option value="fixed">{isAr ? "جزافي دج" : "Forfait DA"}</option>
                        </select>
                        <input
                          dir="ltr"
                          inputMode="decimal"
                          value={fb.tarifValue}
                          onChange={(e) =>
                            setFrigoBlocks((prev) =>
                              prev.map((item) => (item.id === fb.id ? { ...item, tarifValue: e.target.value } : item)),
                            )
                          }
                          placeholder="0"
                          className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lots stockés au frigo */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-200">
                        {isAr ? "الدفعات المخزنة حسب العيار" : "Lots stockés (par nature / calibre)"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFrigoBlocks((prev) =>
                            prev.map((item) =>
                              item.id === fb.id ? { ...item, lots: [...item.lots, createEmptyHarvestLot("")] } : item,
                            ),
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-2 py-1 text-[10px] font-black cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> {isAr ? "إضافة سطر" : "Ajouter"}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {fb.lots.map((lot) => (
                        <div key={lot.id} className="grid grid-cols-12 gap-1.5 items-center">
                          <input
                            value={lot.nature}
                            onChange={(e) =>
                              setFrigoBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === fb.id
                                    ? {
                                        ...item,
                                        lots: item.lots.map((l) => (l.id === lot.id ? { ...l, nature: e.target.value } : l)),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder={isAr ? "العيار / الطبيعة" : "Nature / Calibre"}
                            className="col-span-5 rounded border border-input bg-background px-2 py-1 text-xs font-bold"
                          />
                          <input
                            dir="ltr"
                            inputMode="numeric"
                            value={lot.colis}
                            onChange={(e) =>
                              setFrigoBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === fb.id
                                    ? {
                                        ...item,
                                        lots: item.lots.map((l) => (l.id === lot.id ? { ...l, colis: e.target.value } : l)),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder={isAr ? "صناديق" : "Colis"}
                            className="col-span-3 rounded border border-input bg-background px-2 py-1 text-center text-xs"
                          />
                          <input
                            dir="ltr"
                            inputMode="decimal"
                            value={lot.poidsNetKg}
                            onChange={(e) =>
                              setFrigoBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === fb.id
                                    ? {
                                        ...item,
                                        lots: item.lots.map((l) => (l.id === lot.id ? { ...l, poidsNetKg: e.target.value } : l)),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Kg"
                            className="col-span-3 rounded border border-input bg-background px-2 py-1 text-right text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFrigoBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === fb.id
                                    ? {
                                        ...item,
                                        lots:
                                          item.lots.length > 1
                                            ? item.lots.filter((l) => l.id !== lot.id)
                                            : [createEmptyHarvestLot("")],
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="col-span-1 flex justify-center text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] font-black text-sky-800 dark:text-sky-200 flex justify-end gap-3 pt-1 border-t border-sky-500/20">
                      <span dir="ltr">
                        {isAr ? "المخزن :" : "Stocké :"} {formatNumber(fbTotalColis, 0)} {isAr ? "صندوق" : "colis"} ·{" "}
                        {formatNumber(fbTotalKg, 2)} kg
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* BLOCS VENTE DIRECTE */}
            {activeDirectBlocks.map((db, idx) => {
              const dbTotalKg = db.lines.reduce((s, l) => s + parseNum(l.poidsNetKg), 0);
              const dbTotalDA = db.lines.reduce((s, l) => s + parseNum(l.poidsNetKg) * parseNum(l.prixUnitaire), 0);
              return (
                <div key={db.id} className="rounded-xl border-2 border-emerald-500/35 bg-emerald-500/[0.04] p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                      <Store className="h-4 w-4 shrink-0" />
                      <span>
                        {isAr ? "بيع مباشر (بدون عمولة وكيل)" : "Vente directe (sans commission mandataire)"}
                        {destination === "mixte" ? ` #${idx + 1}` : ""}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setDirectBlocks((prev) =>
                            prev.map((item) =>
                              item.id === db.id ? { ...item, lines: lotsToSaleLines(harvestLots) } : item,
                            ),
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-background px-2 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 cursor-pointer"
                      >
                        <ArrowDownToLine className="h-3 w-3" />
                        <span>{isAr ? "تعبئة من المرحلة 1" : "Importer Étape 1"}</span>
                      </button>
                      {destination === "mixte" && (
                        <button
                          type="button"
                          onClick={() => setDirectBlocks((prev) => prev.filter((item) => item.id !== db.id))}
                          className="p-1 rounded text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                        {isAr ? "اسم الزبون (اختياري)" : "Nom du client (optionnel)"}
                      </label>
                      <input
                        value={db.clientName}
                        onChange={(e) =>
                          setDirectBlocks((prev) =>
                            prev.map((item) => (item.id === db.id ? { ...item, clientName: e.target.value } : item)),
                          )
                        }
                        placeholder={isAr ? "اسم المشتري..." : "Client particulier / grossiste..."}
                        className={cls}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                        {isAr ? "حالة الدفع" : "Statut"}
                      </label>
                      <select
                        value={db.paymentStatus}
                        onChange={(e) =>
                          setDirectBlocks((prev) =>
                            prev.map((item) =>
                              item.id === db.id
                                ? { ...item, paymentStatus: e.target.value as "paye" | "credit" }
                                : item,
                            ),
                          )
                        }
                        className={cls}
                      >
                        <option value="paye">{isAr ? "✅ مدفوع (Payé)" : "✅ Payé"}</option>
                        <option value="credit">{isAr ? "⏳ بالدين (Crédit)" : "⏳ Crédit"}</option>
                      </select>
                    </div>
                  </div>

                  {/* Lignes vendues en direct */}
                  <div className="space-y-1.5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setDirectBlocks((prev) =>
                            prev.map((item) =>
                              item.id === db.id ? { ...item, lines: [...item.lines, createEmptySaleLine()] } : item,
                            ),
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[10px] font-black cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> {isAr ? "إضافة سطر" : "Ajouter"}
                      </button>
                    </div>
                    {db.lines.map((line) => {
                      const amt = parseNum(line.poidsNetKg) * parseNum(line.prixUnitaire);
                      return (
                        <div key={line.id} className="grid grid-cols-12 gap-1.5 items-center">
                          <input
                            value={line.nature}
                            onChange={(e) =>
                              setDirectBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === db.id
                                    ? {
                                        ...item,
                                        lines: item.lines.map((l) => (l.id === line.id ? { ...l, nature: e.target.value } : l)),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder={isAr ? "العيار" : "Nature"}
                            className="col-span-3 rounded border border-input bg-background px-1.5 py-1 text-xs font-bold"
                          />
                          <input
                            dir="ltr"
                            inputMode="numeric"
                            value={line.colis}
                            onChange={(e) =>
                              setDirectBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === db.id
                                    ? {
                                        ...item,
                                        lines: item.lines.map((l) => (l.id === line.id ? { ...l, colis: e.target.value } : l)),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder={isAr ? "صناديق" : "Colis"}
                            className="col-span-2 rounded border border-input bg-background px-1.5 py-1 text-center text-xs"
                          />
                          <input
                            dir="ltr"
                            inputMode="decimal"
                            value={line.poidsNetKg}
                            onChange={(e) =>
                              setDirectBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === db.id
                                    ? {
                                        ...item,
                                        lines: item.lines.map((l) =>
                                          l.id === line.id ? { ...l, poidsNetKg: e.target.value } : l,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Kg"
                            className="col-span-2 rounded border border-input bg-background px-1.5 py-1 text-right text-xs"
                          />
                          <input
                            dir="ltr"
                            inputMode="decimal"
                            value={line.prixUnitaire}
                            onChange={(e) =>
                              setDirectBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === db.id
                                    ? {
                                        ...item,
                                        lines: item.lines.map((l) =>
                                          l.id === line.id ? { ...l, prixUnitaire: e.target.value } : l,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="DA/kg"
                            className="col-span-2 rounded border border-input bg-background px-1.5 py-1 text-right text-xs"
                          />
                          <span dir="ltr" className="col-span-2 text-right font-mono font-bold text-[11px] truncate">
                            {formatNumber(amt, 0)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setDirectBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === db.id
                                    ? {
                                        ...item,
                                        lines:
                                          item.lines.length > 1
                                            ? item.lines.filter((l) => l.id !== line.id)
                                            : [createEmptySaleLine()],
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="col-span-1 flex justify-center text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    <div className="flex justify-between text-xs font-black text-emerald-800 dark:text-emerald-200 pt-1 border-t border-emerald-500/20">
                      <span dir="ltr">{formatNumber(dbTotalKg, 2)} kg</span>
                      <span dir="ltr">{formatDA(dbTotalDA, 2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= CHARGES OPÉRATIONNELLES FERME (DA) ================= */}
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-primary">
              {isAr ? "التكاليف التشغيلية للمزرعة (دج)" : "Charges opérationnelles ferme (DA)"}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                  {isAr ? "اليد العاملة" : "Main-d'œuvre (DA)"}
                </label>
                <input dir="ltr" inputMode="decimal" value={mainOeuvre} onChange={(e) => setMainOeuvre(e.target.value)} placeholder="0" className={cls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                  {isAr ? "النقل" : "Transport (DA)"}
                </label>
                <input dir="ltr" inputMode="decimal" value={transport} onChange={(e) => setTransport(e.target.value)} placeholder="0" className={cls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                  {isAr ? "الصناديق / الألفيول (دج)" : "Caisses / Alvéole (DA)"}
                </label>
                <input dir="ltr" inputMode="decimal" value={emballages} onChange={(e) => setEmballages(e.target.value)} placeholder="0" className={cls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                  {isAr ? "مصاريف أخرى" : "Autres (DA)"}
                </label>
                <input dir="ltr" inputMode="decimal" value={autres} onChange={(e) => setAutres(e.target.value)} placeholder="0" className={cls} />
              </div>
            </div>
          </div>

          {/* ================= CARTE RÉCAPITULATIVE FINALE ================= */}
          <div className="space-y-1.5 rounded-xl bg-muted/40 border p-3.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">
                {isAr ? "الكمية الإجمالية المحصودة" : "Quantité Totale récoltée"}
              </span>
              <strong dir="ltr">
                {formatNumber(step1Totals.totalPoidsNetKg, 2)} kg · {formatNumber(step1Totals.totalColis, 0)}{" "}
                {isAr ? "صندوق" : "colis"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">
                {isAr ? "إجمالي البيع الخام" : "Total Vente brute"}
              </span>
              <strong dir="ltr">{formatDA(formFinancials.totalVenteBrute, 2)}</strong>
            </div>
            <div className="flex justify-between text-rose-700 dark:text-rose-400">
              <span>{isAr ? "اقتطاعات الوكيل (العمولة + حقوق الدخول)" : "Déductions Mandataire (COM + Droit d'entrée)"}</span>
              <span dir="ltr">− {formatDA(formFinancials.deductionsMandataire, 2)}</span>
            </div>
            <div className="flex justify-between font-bold text-foreground">
              <span>{isAr ? "الصافي للدفع (الكشف / المبيعات)" : "Net à Payer Bordereau / Ventes"}</span>
              <span dir="ltr">{formatDA(formFinancials.netAPayerBordereaux, 2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{isAr ? "تكاليف المزرعة" : "Charges ferme"}</span>
              <span dir="ltr">− {formatDA(formFinancials.chargesFerme, 2)}</span>
            </div>
            {formFinancials.frigoStoredKg > 0 && (
              <div className="flex justify-between text-sky-700 dark:text-sky-300 font-bold">
                <span>❄️ {isAr ? "المخزون المودع في غرفة التبريد" : "Stock encore en chambre froide"}</span>
                <span dir="ltr">{formatNumber(formFinancials.frigoStoredKg, 2)} kg</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-sm sm:text-base font-black">
              <span>{isAr ? "الربح الصافي الحقيقي للمزرعة" : "Bénéfice Net Réel Ferme"}</span>
              <span
                dir="ltr"
                className={
                  formFinancials.beneficeNetFerme >= 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-destructive"
                }
              >
                {formatDA(formFinancials.beneficeNetFerme, 2)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {onCloseForm && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onCloseForm();
                }}
                className="rounded-xl border px-3.5 py-2 text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                {isAr ? "إلغاء" : "Annuler"}
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveHarvest}
              disabled={!date || (step1Totals.totalPoidsNetKg <= 0 && step1Totals.totalColis <= 0)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>
                {editingHarvestId
                  ? isAr
                    ? "تحديث الجني"
                    : "Mettre à jour"
                  : isAr
                    ? "حفظ الجني"
                    : "Enregistrer la récolte"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* HISTORIQUE DES RÉCOLTES + BORDEREAUX + SORTIES CHAMBRE FROIDE     */}
      {/* ================================================================= */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5 text-sm font-black">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <span>{isAr ? `سجل الجني والكشوف (${filteredRecords.length})` : `Historique des récoltes (${filteredRecords.length})`}</span>
          </span>
          {selectedYear !== "all" && (
            <span dir="ltr" className="rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-[11px] font-black">
              {selectedYear}
            </span>
          )}
        </div>

        {filteredRecords.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {isAr ? "لا توجد عمليات جني مسجلة لهذه السنة." : "Aucune récolte enregistrée pour cette année."}
          </p>
        ) : (
          <ul className="divide-y">
            {filteredRecords.map((r) => {
              const fin = getRecordFinancialSummary(r);
              const firstBd = r.bordereaux?.[0];
              const dest = r.destination || "mandataire";

              // Badge destination détaillé
              const destBadge =
                dest === "mandataire"
                  ? [
                      isAr ? "🤝 وكيل" : "🤝 Mandataire",
                      firstBd?.marcheCarreau || r.mandataireName,
                      firstBd?.numeroBordereau ? `N° ${firstBd.numeroBordereau}` : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  : dest === "frigo"
                    ? `❄️ ${isAr ? "غرفة تبريد" : "Chambre froide"}${r.frigoName ? ` • ${r.frigoName}` : ""}`
                    : dest === "direct"
                      ? `🏪 ${isAr ? "بيع مباشر" : "Vente directe"}`
                      : `🔀 ${isAr ? "مختلط" : "Mixte"}`;

              const statusBadge =
                fin.remainingFrigoKg > 0.1 && dest === "frigo"
                  ? { label: isAr ? "في المخزون" : "En stock", cls: "bg-sky-500/15 text-sky-800 dark:text-sky-200" }
                  : (firstBd?.paymentStatus || r.paymentStatus) === "en_attente"
                    ? { label: isAr ? "قيد الانتظار" : "En attente", cls: "bg-amber-500/15 text-amber-800 dark:text-amber-200" }
                    : (firstBd?.paymentStatus || r.paymentStatus) === "partiel"
                      ? { label: isAr ? "دفع جزئي" : "Partiel", cls: "bg-violet-500/15 text-violet-800 dark:text-violet-200" }
                      : { label: isAr ? "مدفوع" : "Payé", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" };

              return (
                <li key={r.id} className="p-3.5 text-xs space-y-2">
                  {/* Ligne supérieure : Date + Quantité + Badges + Net + Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span dir="ltr" className="font-black text-foreground">
                        {formatDateFR(r.date)}
                      </span>
                      <span className="text-muted-foreground">—</span>
                      <span dir="ltr" className="font-black text-primary">
                        {formatNumber(fin.totalKg, 1)} kg
                        {fin.totalColis > 0 ? ` (${formatNumber(fin.totalColis, 0)} ${isAr ? "صندوق" : "colis"})` : ""}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
                        {destBadge}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        dir="ltr"
                        className={`font-black ${
                          fin.beneficeNetFerme >= 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-destructive"
                        }`}
                      >
                        Net {formatDA(fin.beneficeNetFerme)}
                      </span>

                      {/* Bouton Imprimer / PDF pour chaque bordereau Mandataire */}
                      {(r.bordereaux || []).map((bd, bIdx) => (
                        <button
                          key={bd.id}
                          type="button"
                          onClick={() => openPrintBordereau(bd, r.selectedParcelIds)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-2 py-1 text-[10px] font-bold transition cursor-pointer"
                          title={isAr ? "طباعة / PDF كشف المبيعات" : "Imprimer / PDF le bordereau"}
                        >
                          <Printer className="h-3 w-3" />
                          <span>
                            {isAr ? "طباعة / PDF" : "Imprimer / PDF"}
                            {(r.bordereaux?.length || 0) > 1 ? ` #${bIdx + 1}` : ""}
                          </span>
                        </button>
                      ))}

                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditRecord(r)}
                            className="p-1 rounded-md text-muted-foreground hover:text-emerald-700 hover:bg-emerald-500/10 transition cursor-pointer"
                            title={isAr ? "تعديل" : "Modifier"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(getRecordOwnerParcelId(r), "recolte", r.id)}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                            title={isAr ? "حذف" : "Supprimer"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Détail financier compact */}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span dir="ltr">
                      {isAr ? "مبيعات خام" : "Vente brute"} : <strong>{formatDA(fin.grossSales)}</strong>
                    </span>
                    {fin.deductionsMandataire > 0 && (
                      <span dir="ltr">
                        {isAr ? "اقتطاعات الوكيل" : "COM + Droit d'entrée"} : −{formatDA(fin.deductionsMandataire)}
                      </span>
                    )}
                    {fin.chargesFerme > 0 && (
                      <span dir="ltr">
                        {isAr ? "تكاليف المزرعة" : "Charges ferme"} : −{formatDA(fin.chargesFerme)}
                      </span>
                    )}
                  </div>

                  {/* Suivi Stock Chambre Froide + Sorties */}
                  {fin.storedKg > 0 && (
                    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-2.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-sky-800 dark:text-sky-200 flex items-center gap-1.5">
                          <Snowflake className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {r.frigoName || (isAr ? "غرفة التبريد" : "Chambre froide")} :{" "}
                            <strong dir="ltr">
                              {formatNumber(fin.remainingFrigoKg, 1)} / {formatNumber(fin.storedKg, 1)} kg
                            </strong>{" "}
                            {isAr ? "متبقي" : "restants"}
                          </span>
                        </span>
                        {canEdit && fin.remainingFrigoKg > 0.1 && (
                          <button
                            type="button"
                            onClick={() => openFrigoExitModal(r)}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 text-[10px] font-black cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>
                              {isAr ? "تسجيل خروج من غرفة التبريد" : "Enregistrer une sortie du frigo"}
                            </span>
                          </button>
                        )}
                      </div>

                      {(r.frigoExits || []).length > 0 && (
                        <div className="space-y-1.5 border-t border-sky-500/20 pt-1.5">
                          {(r.frigoExits || []).map((ex) => (
                            <div
                              key={ex.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground"
                            >
                              <span>
                                <strong dir="ltr" className="text-foreground">
                                  {formatDateFR(ex.date)}
                                </strong>{" "}
                                · {ex.mode === "mandataire" ? "🤝" : "🏪"} {ex.buyerName} (
                                <span dir="ltr">{formatNumber(ex.qty, 1)} kg</span>)
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span dir="ltr" className="font-bold text-emerald-700 dark:text-emerald-300">
                                  +{formatDA(ex.netAmount)}
                                </span>
                                {ex.bordereau && (
                                  <button
                                    type="button"
                                    onClick={() => openPrintBordereau(ex.bordereau!, r.selectedParcelIds)}
                                    className="inline-flex items-center gap-1 rounded bg-slate-900 hover:bg-slate-800 text-white px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
                                  >
                                    <Printer className="h-2.5 w-2.5" />
                                    <span>PDF</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {r.notes && <p className="text-[11px] italic text-muted-foreground">{r.notes}</p>}
                  {(() => {
                    const listAtt: HarvestAttachment[] =
                      Array.isArray(r.attachments) && r.attachments.length > 0
                        ? r.attachments
                        : r.photo
                          ? [{ id: `p_${r.id}`, name: "Photo", mimeType: "image/jpeg", dataUrl: r.photo }]
                          : [];
                    if (listAtt.length === 0) return null;
                    return (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {listAtt.map((att) => {
                          const isPdf = att.mimeType === "application/pdf" || att.name.toLowerCase().endsWith(".pdf");
                          return isPdf ? (
                            <a
                              key={att.id}
                              href={att.dataUrl}
                              download={att.name}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 transition"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="max-w-[160px] truncate">{att.name}</span>
                            </a>
                          ) : (
                            <a key={att.id} href={att.dataUrl} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="h-16 w-16 rounded-lg border object-cover hover:opacity-90 transition"
                              />
                            </a>
                          );
                        })}
                      </div>
                    );
                  })()}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODALE SORTIE DE CHAMBRE FROIDE (Mandataire Bordereau / Direct)   */}
      {/* ================================================================= */}
      {exitRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl border bg-card p-3.5 sm:p-5 shadow-2xl space-y-4 text-xs my-auto">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h4 className="text-sm font-black text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Snowflake className="h-4 w-4 shrink-0" />
                <span>
                  {isAr ? "تسجيل خروج / بيع من غرفة التبريد" : "Enregistrer une sortie de la Chambre froide"}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setExitRecord(null)}
                className="p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExitMode("mandataire")}
                className={`rounded-xl border px-3 py-2 font-black flex items-center justify-center gap-1.5 cursor-pointer ${
                  exitMode === "mandataire"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-muted/30 text-foreground"
                }`}
              >
                <Handshake className="h-4 w-4" />
                <span>{isAr ? "نحو وكيل سوق (كشف مبيعات)" : "Vers Mandataire (Bordereau)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setExitMode("direct")}
                className={`rounded-xl border px-3 py-2 font-black flex items-center justify-center gap-1.5 cursor-pointer ${
                  exitMode === "direct"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-muted/30 text-foreground"
                }`}
              >
                <Store className="h-4 w-4" />
                <span>{isAr ? "بيع مباشر" : "Vente directe"}</span>
              </button>
            </div>

            {exitMode === "mandataire" ? (
              <BordereauEditorCard
                bordereau={exitBordereau}
                onChange={setExitBordereau}
                onPrint={() => openPrintBordereau(exitBordereau, exitRecord.selectedParcelIds)}
                knownMandataires={knownMandataires}
                isAr={isAr}
              />
            ) : (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/[0.04] p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "تاريخ الخروج" : "Date de sortie"}
                    </label>
                    <input
                      type="date"
                      dir="ltr"
                      value={exitDirectDate}
                      onChange={(e) => setExitDirectDate(e.target.value)}
                      className={cls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "اسم الزبون" : "Client (optionnel)"}
                    </label>
                    <input
                      value={exitDirectBlock.clientName}
                      onChange={(e) => setExitDirectBlock({ ...exitDirectBlock, clientName: e.target.value })}
                      placeholder={isAr ? "اسم المشتري..." : "Nom client..."}
                      className={cls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "حالة الدفع" : "Statut"}
                    </label>
                    <select
                      value={exitDirectBlock.paymentStatus}
                      onChange={(e) =>
                        setExitDirectBlock({
                          ...exitDirectBlock,
                          paymentStatus: e.target.value as "paye" | "credit",
                        })
                      }
                      className={cls}
                    >
                      <option value="paye">{isAr ? "مدفوع (Payé)" : "Payé"}</option>
                      <option value="credit">{isAr ? "بالدين (Crédit)" : "Crédit"}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {exitDirectBlock.lines.map((line) => (
                    <div key={line.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <input
                        value={line.nature}
                        onChange={(e) =>
                          setExitDirectBlock({
                            ...exitDirectBlock,
                            lines: exitDirectBlock.lines.map((l) =>
                              l.id === line.id ? { ...l, nature: e.target.value } : l,
                            ),
                          })
                        }
                        placeholder="Nature"
                        className="col-span-4 rounded border bg-background px-2 py-1 text-xs font-bold"
                      />
                      <input
                        dir="ltr"
                        inputMode="numeric"
                        value={line.colis}
                        onChange={(e) =>
                          setExitDirectBlock({
                            ...exitDirectBlock,
                            lines: exitDirectBlock.lines.map((l) =>
                              l.id === line.id ? { ...l, colis: e.target.value } : l,
                            ),
                          })
                        }
                        placeholder="Colis"
                        className="col-span-2 rounded border bg-background px-1.5 py-1 text-center text-xs"
                      />
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        value={line.poidsNetKg}
                        onChange={(e) =>
                          setExitDirectBlock({
                            ...exitDirectBlock,
                            lines: exitDirectBlock.lines.map((l) =>
                              l.id === line.id ? { ...l, poidsNetKg: e.target.value } : l,
                            ),
                          })
                        }
                        placeholder="Kg"
                        className="col-span-3 rounded border bg-background px-1.5 py-1 text-right text-xs"
                      />
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        value={line.prixUnitaire}
                        onChange={(e) =>
                          setExitDirectBlock({
                            ...exitDirectBlock,
                            lines: exitDirectBlock.lines.map((l) =>
                              l.id === line.id ? { ...l, prixUnitaire: e.target.value } : l,
                            ),
                          })
                        }
                        placeholder="DA/kg"
                        className="col-span-3 rounded border bg-background px-1.5 py-1 text-right text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={() => setExitRecord(null)}
                className="rounded-xl border px-3.5 py-2 font-bold text-muted-foreground cursor-pointer"
              >
                {isAr ? "إلغاء" : "Annuler"}
              </button>
              <button
                type="button"
                onClick={handleSaveFrigoExit}
                className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 font-black cursor-pointer"
              >
                {isAr ? "تأكيد الخروج" : "Valider la sortie"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE IMPRESSION / EXPORT PDF A4 DU BORDEREAU */}
      <BordereauPrintModal
        open={Boolean(printData)}
        onClose={() => setPrintData(null)}
        data={printData}
        isAr={isAr}
      />
    </div>
  );
}
