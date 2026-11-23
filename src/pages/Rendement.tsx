import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Printer,
  Package,
  Coins,
  Wallet,
  Snowflake,
  Plus,
  Trash2,
  ShoppingBag,
  Sprout,
  Droplets,
  SprayCan,
  FlaskConical,
  Scissors,
  X,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useAllModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcels } from "@/lib/parcel-store";
import { useSuppliers } from "@/lib/suppliers-store";
import { useProducts } from "@/lib/products-store";
import {
  computeFertilisationRecordTotal,
  computePhytosanitaireRecordTotal,
  computePulverisationRecordTotal,
} from "@/lib/parcel-costs";
import { useTranslation } from "@/lib/i18n";
import { formatDA, formatDateFR, formatNumber } from "@/lib/format";
import { computeBordereauTotals } from "@/components/modules/BordereauPrintModal";
import type { FreshFruitHarvestRecord } from "@/components/modules/RecolteFruitsFrais";
import {
  seedBordereau36387IfNeeded,
  seedBordereau001_2026IfNeeded,
  seedBordereau002_2026IfNeeded,
  seedBordereau2026_03IfNeeded,
} from "@/lib/recolte-seed";
import { ChambreFroideNegoceSection } from "@/components/rendement/ChambreFroideNegoceSection";

type SpeciesBlockId = "pommier" | "nectarine" | "olivier";
type BlockFilter = "all" | SpeciesBlockId;

interface NegoceLot {
  id: string;
  date: string;
  supplier: string;
  species: string;
  weightKg: number;
  colis: number;
  purchasePriceDA: number;
  frigoCostDA: number;
  destination: "frigo" | "mandataire" | "direct";
  saleNetDA: number;
  status: "en_stock" | "vendu_paye" | "vendu_attente";
  notes: string;
}

const OTHER_FEES_KEY = "doula_rendement_autres_frais_v1";
const NEGOCE_KEY = "doula_negoce_lots_v1";

function parseNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  // Pour les chaînes comme "692/766", prendre la somme ou la première valeur numérique
  if (s.includes("/")) {
    const parts = s.split("/").map((p) => parseFloat(p)).filter((n) => Number.isFinite(n));
    return parts.length > 0 ? parts[0] : 0;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function getBlockForParcelId(parcelId: string): SpeciesBlockId | null {
  const id = (parcelId || "").toLowerCase();
  if (id === "pommier1" || id === "pommier2" || id === "p7" || id === "p8" || id.includes("pomm")) {
    return "pommier";
  }
  if (id === "nablara" || id === "redix25" || id === "p5" || id === "p6" || id.includes("nectar")) {
    return "nectarine";
  }
  if (["p1", "p2", "p3", "p4"].includes(id) || id.includes("oliv")) {
    return "olivier";
  }
  return null;
}

/**
 * Vérifie si une date ISO YYYY-MM-DD appartient à la campagne agricole `campaignYear` :
 * - Pommier / Nectarine : 1er nov (Y-1) → 31 oct (Y)
 * - Olivier : 1er déc (Y-1) → 30 nov (Y)
 */
function isDateInCampaign(dateStr: string | undefined, campaignYear: string, block: SpeciesBlockId): boolean {
  if (campaignYear === "all") return true;
  if (!dateStr || dateStr.length < 10) return false;
  const d = dateStr.slice(0, 10);
  const y = parseInt(campaignYear, 10);
  if (!Number.isFinite(y)) return true;
  if (block === "olivier") {
    return d >= `${y - 1}-12-01` && d <= `${y}-11-30`;
  }
  return d >= `${y - 1}-11-01` && d <= `${y}-10-31`;
}

function getFreshHarvestMetrics(r: FreshFruitHarvestRecord) {
  const exits = r.frigoExits || [];
  let storedKg = 0;
  if (Array.isArray(r.frigoBlocks) && r.frigoBlocks.length > 0) {
    storedKg = r.frigoBlocks.reduce(
      (s, fb) => s + fb.lots.reduce((ls, l) => ls + parseNum(l.poidsNetKg), 0),
      0,
    );
  } else if (parseNum(r.frigoQty) > 0) {
    const cw = r.unit === "Caisses" ? Math.max(0.1, parseNum(r.avgCrateWeightKg) || 15) : 1;
    storedKg = parseNum(r.frigoQty) * cw;
  }
  const exitedKg = exits.reduce((s, e) => s + (e.qty || 0), 0);
  const remainingFrigoKg = Math.max(0, storedKg - exitedKg);

  if (r.schemaVersion === 2 || Array.isArray(r.bordereaux) || Array.isArray(r.directBlocks)) {
    let grossSales = 0;
    let deductions = 0;
    for (const bd of r.bordereaux || []) {
      const t = computeBordereauTotals(bd);
      grossSales += t.totalVenteBrute;
      deductions += t.comDA + t.droitsMarche + t.fraisTransport;
    }
    for (const db of r.directBlocks || []) {
      for (const l of db.lines) {
        grossSales += parseNum(l.poidsNetKg) * parseNum(l.prixUnitaire);
      }
    }
    for (const ex of exits) {
      if (ex.bordereau) {
        const t = computeBordereauTotals(ex.bordereau);
        grossSales += t.totalVenteBrute;
        deductions += t.comDA + t.droitsMarche + t.fraisTransport;
      } else {
        grossSales += ex.grossAmount || 0;
        deductions += (ex.commissionAmount || 0) + (ex.droitsMarcheAmount || 0);
      }
    }
    let frigoCost = 0;
    for (const fb of r.frigoBlocks || []) {
      const val = parseNum(fb.tarifValue);
      if (val <= 0) continue;
      const kg = fb.lots.reduce((s, l) => s + parseNum(l.poidsNetKg), 0);
      frigoCost += fb.tarifType === "fixed" ? val : kg * val;
    }
    const harvestCharges =
      parseNum(r.mainOeuvre) +
      parseNum(r.transport) +
      parseNum(r.emballages) +
      parseNum(r.autres) +
      frigoCost;
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
      deductions,
      netSales: grossSales - deductions,
      harvestCharges,
      remainingFrigoKg,
    };
  }

  // Legacy V1
  const rQty = parseNum(r.qty);
  const cw = r.unit === "Caisses" ? Math.max(0.1, parseNum(r.avgCrateWeightKg) || 15) : 1;
  const totalKg = typeof r.totalKg === "number" ? r.totalKg : rQty * cw;
  const grossSales = (r.totalVente || 0) + exits.reduce((s, e) => s + (e.grossAmount || 0), 0);
  const deductions = (r.commissionAmount || 0) + exits.reduce((s, e) => s + (e.commissionAmount || 0), 0);
  const harvestCharges = Math.max(0, (r.totalCharges || 0) - (r.commissionAmount || 0));
  return {
    totalKg,
    totalColis: r.unit === "Caisses" ? rQty : 0,
    grossSales,
    deductions,
    netSales: grossSales - deductions,
    harvestCharges,
    remainingFrigoKg,
  };
}

export default function RendementPage() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const parcels = useParcels();
  const { add } = useModuleActions();
  const suppliers = useSuppliers();
  const catalogProducts = useProducts();

  // Tous les enregistrements par module
  const allRecoltes = useAllModuleRecords<any>("recolte");
  const allFert = useAllModuleRecords<any>("fertilisation");
  const allPulv = useAllModuleRecords<any>("pulverisation");
  const allPhyto = useAllModuleRecords<any>("phytosanitaire");
  const allTaille = useAllModuleRecords<any>("taille");
  const allAmend = useAllModuleRecords<any>("amendement");

  // S'assurer que les 4 bordereaux réels Pommier sont initialisés (idempotent, une seule fois)
  useEffect(() => {
    const pommier1Recs = allRecoltes.filter((r) => r.parcelId === "pommier1") as FreshFruitHarvestRecord[];
    seedBordereau36387IfNeeded(pommier1Recs, add);
    seedBordereau001_2026IfNeeded(pommier1Recs, add);
    seedBordereau002_2026IfNeeded(pommier1Recs, add);
    seedBordereau2026_03IfNeeded(pommier1Recs, add);
  }, [allRecoltes, add]);

  // Onglet actif (Bilan Verger vs Chambre Froide & Négoce)
  const [activeTab, setActiveTab] = useState<"verger" | "frigo">("verger");

  // Filtres
  const [selectedCampaign, setSelectedCampaign] = useState<string>("2026");
  const [selectedBlock, setSelectedBlock] = useState<BlockFilter>("all");

  // Autres frais campagne (persistés par clé `${campaign}_${block}`)
  const [otherFees, setOtherFees] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(OTHER_FEES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const updateOtherFee = (block: SpeciesBlockId, val: string) => {
    const key = `${selectedCampaign}_${block}`;
    setOtherFees((prev) => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem(OTHER_FEES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Lots Négoce (Achat externe / Chambre froide / Revente)
  const [negoceLots, setNegoceLots] = useState<NegoceLot[]>(() => {
    try {
      const raw = localStorage.getItem(NEGOCE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const saveNegoceList = (next: NegoceLot[]) => {
    setNegoceLots(next);
    try {
      localStorage.setItem(NEGOCE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const [negoceFormOpen, setNegoceFormOpen] = useState(false);
  const [nf, setNf] = useState({
    date: new Date().toISOString().slice(0, 10),
    supplier: "",
    species: "Pommier (Gala / Golden)",
    weightKg: "",
    colis: "",
    purchasePriceDA: "",
    frigoCostDA: "",
    destination: "frigo" as "frigo" | "mandataire" | "direct",
    saleNetDA: "",
    status: "en_stock" as "en_stock" | "vendu_paye" | "vendu_attente",
    notes: "",
  });

  function handleAddNegoce() {
    const w = parseNum(nf.weightKg);
    const p = parseNum(nf.purchasePriceDA);
    if (w <= 0 && p <= 0) {
      toast.error(isAr ? "يرجى إدخال الوزن أو سعر الشراء" : "Veuillez saisir un poids ou un prix d'achat.");
      return;
    }
    const item: NegoceLot = {
      id: `neg_${Date.now()}`,
      date: nf.date || new Date().toISOString().slice(0, 10),
      supplier: nf.supplier.trim() || (isAr ? "مورد خارجي" : "Fournisseur externe"),
      species: nf.species.trim() || "Pommier",
      weightKg: w,
      colis: parseNum(nf.colis),
      purchasePriceDA: p,
      frigoCostDA: parseNum(nf.frigoCostDA),
      destination: nf.destination,
      saleNetDA: parseNum(nf.saleNetDA),
      status: nf.status,
      notes: nf.notes.trim(),
    };
    saveNegoceList([item, ...negoceLots]);
    setNegoceFormOpen(false);
    setNf({
      date: new Date().toISOString().slice(0, 10),
      supplier: "",
      species: "Pommier (Gala / Golden)",
      weightKg: "",
      colis: "",
      purchasePriceDA: "",
      frigoCostDA: "",
      destination: "frigo",
      saleNetDA: "",
      status: "en_stock",
      notes: "",
    });
    toast.success(isAr ? "تم تسجيل عملية الشراء الخارجي (Négoce)" : "Achat externe (Négoce) enregistré !");
  }

  // Années de campagne disponibles
  const availableCampaigns = useMemo(() => {
    const set = new Set<string>(["2026"]);
    for (const r of allRecoltes) {
      const y = String(r.date || "").slice(0, 4);
      if (/^\d{4}$/.test(y)) set.add(y);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allRecoltes]);

  // ========== DÉDOUBLONNAGE STRICT DES RÉCOLTES PAR ID UNIQUE ==========
  const uniqueRecoltes = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of allRecoltes) {
      if (!r?.id) continue;
      if (!map.has(r.id)) {
        map.set(r.id, r);
      }
    }
    return Array.from(map.values());
  }, [allRecoltes]);

  // ========== DIAGNOSTIC CONSOLIDÉ PAR BLOC D'ESPÈCE ==========
  const blockDiagnostics = useMemo(() => {
    const defs: Array<{
      id: SpeciesBlockId;
      icon: string;
      labelFr: string;
      labelAr: string;
      campaignHintFr: string;
      campaignHintAr: string;
      defaultSurfaceHa: number;
      defaultTrees: number;
      isOlive?: boolean;
    }> = [
        {
          id: "pommier",
          icon: "🍎",
          labelFr: "Pommiers (Pommier 1 & 2 · P7+P8)",
          labelAr: "التفاح (تفاح 1 و 2)",
          campaignHintFr: "1 nov → 31 oct",
          campaignHintAr: "1 نوفمبر → 31 أكتوبر",
          defaultSurfaceHa: 2,
          defaultTrees: 2915,
        },
        {
          id: "nectarine",
          icon: "🍑",
          labelFr: "Nectarines (Nablara & Redix 25 · P5+P6)",
          labelAr: "النكتارين (نابلارا وريديكس 25)",
          campaignHintFr: "1 nov → 31 oct",
          campaignHintAr: "1 نوفمبر → 31 أكتوبر",
          defaultSurfaceHa: 2,
          defaultTrees: 3744,
        },
        {
          id: "olivier",
          icon: "🫒",
          labelFr: "Oliviers (P1 à P4)",
          labelAr: "الزيتون (P1 إلى P4)",
          campaignHintFr: "1 déc → 30 nov",
          campaignHintAr: "1 ديسمبر → 30 نوفمبر",
          defaultSurfaceHa: 8,
          defaultTrees: 2600,
          isOlive: true,
        },
      ];

    return defs.map((def) => {
      // Surface & Arbres depuis les parcelles du bloc
      const blockParcels = parcels.filter((p) => getBlockForParcelId(p.id) === def.id);
      const parsedSurface = blockParcels.reduce((s, p) => s + parseNum(p.info?.surface), 0);
      const parsedTrees = blockParcels.reduce(
        (s, p) => s + parseNum(p.info?.nbArbres || p.info?.nbArbresParcelle),
        0,
      );
      const surfaceHa = def.id === "pommier" ? 2 : parsedSurface > 0 ? parsedSurface : def.defaultSurfaceHa;
      const treeCount = parsedTrees > 0 ? parsedTrees : def.defaultTrees;

      // 1. Récoltes propres du bloc (dédoublonnées par id unique!)
      const blockHarvests = uniqueRecoltes.filter((r) => {
        const pIds: string[] = Array.isArray(r.parcelIds) && r.parcelIds.length > 0
          ? r.parcelIds
          : Array.isArray(r.selectedParcelIds) && r.selectedParcelIds.length > 0
            ? r.selectedParcelIds
            : [r.parcelId];
        const belongs = pIds.some((pid) => getBlockForParcelId(pid) === def.id);
        if (!belongs) return false;
        return isDateInCampaign(r.date, selectedCampaign, def.id);
      });

      let productionKg = 0;
      let productionColis = 0;
      let oilProducedL = 0;
      let oilRemainingCuveL = 0;
      let frigoRemainingKg = 0;
      let grossSalesDA = 0;
      let deductionsMandataireDA = 0;
      let netSalesDA = 0;
      let harvestChargesDA = 0;

      if (def.isOlive) {
        let soldOilL = 0;
        for (const r of blockHarvests) {
          const rType = r.recordType || "olive_harvest";
          if (rType === "olive_sale") {
            const saleAmt = parseNum(r.totalVente);
            grossSalesDA += saleAmt;
            netSalesDA += saleAmt;
            const qty = parseNum(r.saleQty);
            soldOilL += r.oilFormat === "bidon_5l" ? qty * 5 : qty;
          } else if (rType === "olive_harvest") {
            productionKg += parseNum(r.weightKg || r.qty);
            oilProducedL += parseNum(r.netOilRecoveredL);
            harvestChargesDA += parseNum(r.totalCharges);
          }
        }
        oilRemainingCuveL = Math.max(0, oilProducedL - soldOilL);
      } else {
        for (const r of blockHarvests) {
          const m = getFreshHarvestMetrics(r as FreshFruitHarvestRecord);
          productionKg += m.totalKg;
          productionColis += m.totalColis;
          grossSalesDA += m.grossSales;
          deductionsMandataireDA += m.deductions;
          netSalesDA += m.netSales;
          harvestChargesDA += m.harvestCharges;
          frigoRemainingKg += m.remainingFrigoKg;
        }
      }

      // 2. Coûts d'intrants exécutés / enregistrés sur les parcelles du bloc pendant la campagne
      const inBlockCampaign = (r: any) =>
        getBlockForParcelId(r.parcelId) === def.id && isDateInCampaign(r.date, selectedCampaign, def.id);

      // Règle Taille : uniquement l'année civile de la campagne en question (ex: 2026)
      const inBlockTailleYear = (r: any) => {
        if (getBlockForParcelId(r.parcelId) !== def.id) return false;
        if (selectedCampaign === "all") return true;
        return String(r.date || "").slice(0, 4) === selectedCampaign;
      };

      // Règle Amendement : toujours l'année précédente (N-1, ex: 2025 pour la campagne 2026)
      const prevYear = selectedCampaign === "all" ? null : String(parseInt(selectedCampaign, 10) - 1);
      const inBlockAmendPrevYear = (r: any) => {
        if (getBlockForParcelId(r.parcelId) !== def.id) return false;
        if (!prevYear) return true;
        return String(r.date || "").slice(0, 4) === prevYear;
      };

      const fertCostDA = allFert
        .filter(inBlockCampaign)
        .reduce((s, r) => s + computeFertilisationRecordTotal(r, suppliers, catalogProducts).total, 0);
      const pulvCostDA = allPulv
        .filter(inBlockCampaign)
        .reduce((s, r) => s + computePulverisationRecordTotal(r, suppliers, catalogProducts).total, 0);
      const phytoCostDA = allPhyto
        .filter(inBlockCampaign)
        .reduce((s, r) => s + computePhytosanitaireRecordTotal(r, suppliers, catalogProducts).total, 0);
      const tailleCostDA = allTaille
        .filter(inBlockTailleYear)
        .reduce((s, r) => s + parseNum(r.mainOeuvre) + parseNum(r.equipements), 0);
      const amendCostDA = allAmend
        .filter(inBlockAmendPrevYear)
        .reduce((s, r) => s + parseNum(r.total ?? r.totalCost), 0);

      const otherFeeKey = `${selectedCampaign}_${def.id}`;
      const manualOtherFeesDA = parseNum(otherFees[otherFeeKey]);

      const totalBlockCostDA =
        harvestChargesDA + fertCostDA + pulvCostDA + phytoCostDA + tailleCostDA + amendCostDA + manualOtherFeesDA;
      const netBlockResultDA = netSalesDA - totalBlockCostDA;

      // Rendement agronomique (UNIQUEMENT sur production propre)
      const tonsPerHa = surfaceHa > 0 ? productionKg / 1000 / surfaceHa : 0;
      const kgPerTree = treeCount > 0 ? productionKg / treeCount : 0;
      const costPerUnitDA = def.isOlive
        ? oilProducedL > 0
          ? totalBlockCostDA / oilProducedL
          : 0
        : productionKg > 0
          ? totalBlockCostDA / productionKg
          : 0;

      return {
        ...def,
        surfaceHa,
        treeCount,
        harvestCount: blockHarvests.length,
        productionKg,
        productionColis,
        oilProducedL,
        oilRemainingCuveL,
        frigoRemainingKg,
        grossSalesDA,
        deductionsMandataireDA,
        netSalesDA,
        harvestChargesDA,
        fertCostDA,
        pulvCostDA,
        phytoCostDA,
        tailleCostDA,
        amendCostDA,
        tailleAmendCostDA: tailleCostDA + amendCostDA,
        manualOtherFeesDA,
        totalBlockCostDA,
        netBlockResultDA,
        tonsPerHa,
        kgPerTree,
        costPerUnitDA,
      };
    });
  }, [
    parcels,
    uniqueRecoltes,
    allFert,
    allPulv,
    allPhyto,
    allTaille,
    allAmend,
    suppliers,
    catalogProducts,
    selectedCampaign,
    otherFees,
  ]);

  const visibleBlocks = useMemo(() => {
    if (selectedBlock === "all") return blockDiagnostics;
    return blockDiagnostics.filter((b) => b.id === selectedBlock);
  }, [blockDiagnostics, selectedBlock]);

  // ========== TOTAUX NÉGOCE (HORS RENDEMENT AGRONOMIQUE) ==========
  const filteredNegoce = useMemo(() => {
    if (selectedCampaign === "all") return negoceLots;
    return negoceLots.filter((n) => isDateInCampaign(n.date, selectedCampaign, "pommier"));
  }, [negoceLots, selectedCampaign]);

  const negoceTotals = useMemo(() => {
    let totalBoughtKg = 0;
    let inStockFrigoKg = 0;
    let totalPurchaseDA = 0;
    let totalFrigoCostDA = 0;
    let totalSaleNetDA = 0;

    for (const n of filteredNegoce) {
      totalBoughtKg += n.weightKg;
      if (n.status === "en_stock") inStockFrigoKg += n.weightKg;
      totalPurchaseDA += n.purchasePriceDA;
      totalFrigoCostDA += n.frigoCostDA;
      totalSaleNetDA += n.saleNetDA;
    }

    const netMarginDA = totalSaleNetDA - totalPurchaseDA - totalFrigoCostDA;
    return { totalBoughtKg, inStockFrigoKg, totalPurchaseDA, totalFrigoCostDA, totalSaleNetDA, netMarginDA };
  }, [filteredNegoce]);

  // ========== 4 KPI GLOBAUX FERME ==========
  const globalKpis = useMemo(() => {
    let totalFruitKg = 0;
    let totalOilL = 0;
    let totalFrigoKg = negoceTotals.inStockFrigoKg;
    let totalCuveL = 0;
    let totalNetSalesDA = selectedBlock === "all" ? negoceTotals.totalSaleNetDA : 0;
    let totalFarmCostDA =
      selectedBlock === "all" ? negoceTotals.totalPurchaseDA + negoceTotals.totalFrigoCostDA : 0;
    let totalSurfaceHa = 0;

    for (const b of visibleBlocks) {
      if (b.isOlive) {
        totalOilL += b.oilProducedL;
        totalCuveL += b.oilRemainingCuveL;
      } else {
        totalFruitKg += b.productionKg;
        totalFrigoKg += b.frigoRemainingKg;
      }
      totalNetSalesDA += b.netSalesDA;
      totalFarmCostDA += b.totalBlockCostDA;
      totalSurfaceHa += b.surfaceHa;
    }

    const totalNetProfitDA = totalNetSalesDA - totalFarmCostDA;
    const marginPerKg = totalFruitKg > 0 ? totalNetProfitDA / totalFruitKg : 0;
    const marginPerHa = totalSurfaceHa > 0 ? totalNetProfitDA / totalSurfaceHa : 0;

    return {
      totalFruitKg,
      totalOilL,
      totalFrigoKg,
      totalCuveL,
      totalNetSalesDA,
      totalFarmCostDA,
      totalNetProfitDA,
      marginPerKg,
      marginPerHa,
    };
  }, [visibleBlocks, negoceTotals, selectedBlock]);

  const inputCls =
    "w-full min-w-0 max-w-full box-border rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium";

  return (
    <main
      className="mx-auto w-full max-w-5xl overflow-x-hidden px-3 sm:px-4 pb-24 pt-3 space-y-5"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* En-tête + Bouton Imprimer / PDF Bilan Campagne */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{isAr ? "مردودية وربحية المزرعة" : "Rendement Ferme"}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr
              ? "التقرير المالي والفلاحي الموحّد حسب الموسم (بدون احتساب مزدوج للدفعات المشتركة)"
              : "Rentabilité réelle consolidée par campagne agricole (anti-doublon multi-parcelles)"}
          </p>
        </div>

        {activeTab === "verger" && (
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>{isAr ? "طباعة / PDF حصيلة الموسم" : "Imprimer / PDF Bilan Campagne"}</span>
          </button>
        )}
      </div>

      {/* Onglets principaux : Bilan Verger vs Chambre Froide & Négoce */}
      <div className="no-print flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("verger")}
          className={`inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-xs font-black transition cursor-pointer ${activeTab === "verger"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-card text-foreground hover:bg-muted"
            }`}
        >
          <Sprout className="h-4 w-4" />
          <span>{isAr ? "حصيلة البستان والمزرعة" : "Bilan Verger & Ferme"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("frigo")}
          className={`inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-xs font-black transition cursor-pointer ${activeTab === "frigo"
              ? "bg-sky-600 text-white border-sky-600 shadow-xs"
              : "bg-card text-foreground hover:bg-muted"
            }`}
        >
          <Snowflake className="h-4 w-4" />
          <span>{isAr ? "غرف التبريد والتجارة (الكبيرة والصغيرة)" : "Chambre Froide & Négoce (Grande & Petite)"}</span>
        </button>
      </div>

      {/* Filtres Campagne & Espèce / Bloc */}
      <div className="no-print rounded-2xl border bg-card/70 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-muted-foreground mr-1">
            📅 {isAr ? "الموسم :" : "Campagne :"}
          </span>
          {availableCampaigns.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedCampaign(yr)}
              className={`rounded-xl px-3 py-1 text-xs font-black transition cursor-pointer ${selectedCampaign === yr
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
            >
              <span dir="ltr">{yr}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedCampaign("all")}
            className={`rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${selectedCampaign === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
          >
            {isAr ? "الكل" : "Toutes"}
          </button>
        </div>

        {activeTab === "verger" && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", fr: "🌱 Toutes", ar: "🌱 الكل" },
                { id: "pommier", fr: "🍎 Pommiers (P7+P8)", ar: "🍎 التفاح (P7+P8)" },
                { id: "nectarine", fr: "🍑 Nectarines (P5+P6)", ar: "🍑 النكتارين (P5+P6)" },
                { id: "olivier", fr: "🫒 Oliviers (P1–P4)", ar: "🫒 الزيتون (P1–P4)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedBlock(opt.id)}
                className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${selectedBlock === opt.id
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-black"
                    : "bg-background text-foreground hover:bg-muted"
                  }`}
              >
                {isAr ? opt.ar : opt.fr}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === "frigo" ? (
        <ChambreFroideNegoceSection selectedCampaign={selectedCampaign} isAr={isAr} />
      ) : (
        <>

          {/* 4 KPI GLOBAUX FERME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border bg-card p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                <Package className="h-3.5 w-3.5 text-primary" />
                <span>{isAr ? "الإنتاج الإجمالي" : "Production Totale"}</span>
              </span>
              <p dir="ltr" className="text-lg font-black text-foreground">
                {formatNumber(globalKpis.totalFruitKg, 1)} kg{" "}
                <span className="text-xs font-bold text-muted-foreground">
                  ({formatNumber(globalKpis.totalFruitKg / 1000, 2)} t)
                </span>
              </p>
              <div className="text-[10px] text-muted-foreground font-semibold flex flex-wrap gap-x-2">
                {globalKpis.totalOilL > 0 && <span dir="ltr">🫒 {formatNumber(globalKpis.totalOilL, 0)} L huile</span>}
                {globalKpis.totalFrigoKg > 0 && <span dir="ltr">❄️ Frigo: {formatNumber(globalKpis.totalFrigoKg, 0)} kg</span>}
                {globalKpis.totalCuveL > 0 && <span dir="ltr">🛢️ Cuve: {formatNumber(globalKpis.totalCuveL, 0)} L</span>}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                <span>{isAr ? "صافي المبيعات (الوكلاء / مباشر)" : "Ventes Nettes (DA)"}</span>
              </span>
              <p dir="ltr" className="text-lg font-black text-blue-700 dark:text-blue-300">
                {formatDA(globalKpis.totalNetSalesDA, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isAr ? "الخام − العمولات − حقوق الدخول" : "Brut − Commissions − Droits d'entrée"}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" />
                <span>{isAr ? "التكلفة الإجمالية للمزرعة" : "Coût Total Ferme (DA)"}</span>
              </span>
              <p dir="ltr" className="text-lg font-black text-amber-800 dark:text-amber-300">
                {formatDA(globalKpis.totalFarmCostDA, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isAr ? "الجني + التسميد + الرش + المبيدات + أخرى" : "Récolte + Fert. + Foliaire + Phyto + Autres"}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{isAr ? "الربح الصافي الحقيقي للمزرعة" : "Bénéfice Net Réel Ferme"}</span>
              </span>
              <p
                dir="ltr"
                className={`text-lg font-black ${globalKpis.totalNetProfitDA >= 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-destructive"
                  }`}
              >
                {formatDA(globalKpis.totalNetProfitDA, 0)}
              </p>
              <p dir="ltr" className="text-[10px] font-bold text-emerald-800/80 dark:text-emerald-200/80">
                {formatDA(globalKpis.marginPerKg, 1)}/kg · {formatDA(globalKpis.marginPerHa, 0)}/ha
              </p>
            </div>
          </div>

          {/* TABLEAU DE DIAGNOSTIC PAR ESPÈCE / BLOC */}
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-foreground flex items-center gap-2">
              <Sprout className="h-4 w-4 text-emerald-600" />
              <span>{isAr ? "التشخيص المالي والفلاحي حسب الصنف / الكتلة" : "Diagnostic par Espèce / Bloc"}</span>
            </h2>

            <div className="space-y-3">
              {visibleBlocks.map((b) => (
                <div key={b.id} className="rounded-2xl border bg-card p-4 shadow-xs space-y-3">
                  {/* En-tête du bloc */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                    <div>
                      <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                        <span>{b.icon}</span>
                        <span>{isAr ? b.labelAr : b.labelFr}</span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        <span dir="ltr" className="font-bold text-foreground">
                          {formatNumber(b.surfaceHa, 1)} ha
                        </span>{" "}
                        ·{" "}
                        <span dir="ltr" className="font-bold text-foreground">
                          {formatNumber(b.treeCount, 0)}
                        </span>{" "}
                        {isAr ? "شجرة" : "arbres"} ·{" "}
                        <span>
                          {isAr ? `الموسم (${b.campaignHintAr})` : `Campagne (${b.campaignHintFr})`}
                        </span>{" "}
                        · {b.harvestCount} {isAr ? "عملية جني/بيع" : `vente${b.harvestCount > 1 ? "s" : ""}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        dir="ltr"
                        className="rounded-xl bg-primary/10 text-primary px-2.5 py-1 text-xs font-black"
                      >
                        {b.isOlive
                          ? `${formatNumber(b.oilProducedL, 0)} L huile`
                          : `${formatNumber(b.tonsPerHa, 2)} t/ha · ${formatNumber(b.kgPerTree, 2)} kg/arbre`}
                      </span>
                      <span
                        dir="ltr"
                        className={`rounded-xl px-3 py-1 text-xs font-black ${b.netBlockResultDA >= 0
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                            : "bg-destructive/15 text-destructive"
                          }`}
                      >
                        {isAr ? "الصافي :" : "Net :"} {formatDA(b.netBlockResultDA, 0)}
                      </span>
                    </div>
                  </div>

                  {/* Grille 2 colonnes : Production/Revenus vs Détail Coûts d'Intrants */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Colonne 1 : Production & Ventes */}
                    <div className="rounded-xl bg-muted/30 border p-3 space-y-1.5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">
                        {isAr ? "الإنتاج والمداخيل (الإنتاج الخاص بالمزرعة)" : "Production propre & Ventes"}
                      </p>
                      <div className="flex justify-between">
                        <span>{isAr ? "الإنتاج الصافي" : "Production nette"}</span>
                        <strong dir="ltr">
                          {b.isOlive
                            ? `${formatNumber(b.productionKg, 0)} kg olives → ${formatNumber(b.oilProducedL, 0)} L`
                            : `${formatNumber(b.productionKg, 1)} kg (${formatNumber(b.productionColis, 0)} colis)`}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>{isAr ? "المبيعات الخام" : "Ventes brutes"}</span>
                        <strong dir="ltr">{formatDA(b.grossSalesDA, 0)}</strong>
                      </div>
                      {b.deductionsMandataireDA > 0 && (
                        <div className="flex justify-between text-rose-700 dark:text-rose-400">
                          <span>{isAr ? "عمولات وحقوق الدخول" : "Commissions + Droits d'entrée"}</span>
                          <span dir="ltr">− {formatDA(b.deductionsMandataireDA, 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>{isAr ? "صافي المبيعات" : "Ventes nettes"}</span>
                        <span dir="ltr" className="text-blue-700 dark:text-blue-300">
                          {formatDA(b.netSalesDA, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>{isAr ? "تكلفة الإنتاج الحقيقية" : "Coût de revient réel"}</span>
                        <span dir="ltr">
                          {formatDA(b.costPerUnitDA, 1)}/{b.isOlive ? "L" : "kg"}
                        </span>
                      </div>
                    </div>

                    {/* Colonne 2 : Coûts d'Intrants + Saisie Autres Frais */}
                    <div className="rounded-xl bg-muted/30 border p-3 space-y-1.5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">
                        {isAr ? "تكاليف المدخلات والمصاريف (المنفّذة)" : "Coûts d'intrants & charges campagne"}
                      </p>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <Droplets className="h-3 w-3 text-emerald-600" />
                          {isAr ? "التسميد عبر الري" : "Engrais Irrigation (Fertigation)"}
                        </span>
                        <strong dir="ltr">{formatDA(b.fertCostDA, 0)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <SprayCan className="h-3 w-3 text-sky-600" />
                          {isAr ? "التسميد الورقي" : "Pulvérisation Foliaire"}
                        </span>
                        <strong dir="ltr">{formatDA(b.pulvCostDA, 0)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <FlaskConical className="h-3 w-3 text-amber-600" />
                          {isAr ? "المعاملات الوقائية (مبيدات)" : "Traitements Phytosanitaires"}
                        </span>
                        <strong dir="ltr">{formatDA(b.phytoCostDA, 0)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <Scissors className="h-3 w-3 text-muted-foreground" />
                          {isAr ? "التقليم" : "Taille"}
                          {selectedCampaign !== "all" && (
                            <span className="text-[10px] text-muted-foreground font-semibold">({selectedCampaign})</span>
                          )}
                        </span>
                        <strong dir="ltr">{formatDA(b.tailleCostDA, 0)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <Sprout className="h-3 w-3 text-emerald-700" />
                          {isAr ? "التسميد العضوي (Amendement)" : "Amendement"}
                          {selectedCampaign !== "all" && (
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              ({parseInt(selectedCampaign, 10) - 1})
                            </span>
                          )}
                        </span>
                        <strong dir="ltr">{formatDA(b.amendCostDA, 0)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-amber-700" />
                          {isAr ? "مصاريف الجني والنقل والتغليف" : "Charges de récolte"}
                        </span>
                        <strong dir="ltr">{formatDA(b.harvestChargesDA, 0)}</strong>
                      </div>

                      {/* Saisie libre Autres frais campagne */}
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t">
                        <label className="text-[11px] font-bold text-foreground">
                          {isAr ? "مصاريف أخرى (ماء، كهرباء، تقليم، عمالة) :" : "Autres frais campagne (DA) :"}
                        </label>
                        <input
                          type="number"
                          dir="ltr"
                          inputMode="decimal"
                          value={otherFees[`${selectedCampaign}_${b.id}`] ?? ""}
                          onChange={(e) => updateOtherFee(b.id, e.target.value)}
                          placeholder="0"
                          className="w-28 rounded-lg border border-input bg-background px-2 py-1 text-right text-xs font-bold"
                        />
                      </div>

                      <div className="flex justify-between font-black border-t pt-1 text-amber-800 dark:text-amber-300">
                        <span>{isAr ? "إجمالي تكاليف الكتلة" : "Total coûts du bloc"}</span>
                        <span dir="ltr">{formatDA(b.totalBlockCostDA, 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ================================================================= */}
          {/* BLOC SÉPARÉ : NÉGOCE / ACHAT-REVENTE & CHAMBRE FROIDE             */}
          {/* ================================================================= */}
          <section className="rounded-2xl border-2 border-indigo-500/30 bg-indigo-500/[0.03] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-2.5">
              <div>
                <h2 className="text-sm font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                  <span>
                    {isAr
                      ? "التجارة الخارجية (شراء وإعادة بيع) وغرفة التبريد"
                      : "Négoce / Achat-Revente & Chambre froide"}
                  </span>
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isAr
                    ? "مستبعد تلقائياً من المردودية الفلاحية (كغ/شجرة و طن/هكتار)، لكن هامشه الصافي يُضاف للربح الإجمالي للمزرعة"
                    : "Exclu du rendement agronomique (kg/arbre, t/ha) — marge nette ajoutée au bénéfice global"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNegoceFormOpen((v) => !v)}
                className="no-print inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-black transition cursor-pointer"
              >
                {negoceFormOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>
                  {negoceFormOpen
                    ? isAr ? "إغلاق" : "Fermer"
                    : isAr ? "+ شراء خارجي (Négoce)" : "+ Achat externe (Négoce)"}
                </span>
              </button>
            </div>

            {/* Résumé KPI Négoce */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-xl bg-card border p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground block">
                  {isAr ? "الكمية المشتراة" : "Volume acheté"}
                </span>
                <strong dir="ltr" className="text-sm font-black">
                  {formatNumber(negoceTotals.totalBoughtKg, 1)} kg
                </strong>
              </div>
              <div className="rounded-xl bg-card border p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground block">
                  {isAr ? "مخزون التبريد (تجارة)" : "En stock frigo"}
                </span>
                <strong dir="ltr" className="text-sm font-black text-sky-700 dark:text-sky-300">
                  {formatNumber(negoceTotals.inStockFrigoKg, 1)} kg
                </strong>
              </div>
              <div className="rounded-xl bg-card border p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground block">
                  {isAr ? "الشراء + التبريد" : "Achat + Frigo"}
                </span>
                <strong dir="ltr" className="text-sm font-black text-amber-800 dark:text-amber-300">
                  {formatDA(negoceTotals.totalPurchaseDA + negoceTotals.totalFrigoCostDA, 0)}
                </strong>
              </div>
              <div className="rounded-xl bg-card border border-indigo-500/30 p-2.5">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block">
                  {isAr ? "الهامش الصافي للتجارة" : "Marge nette Négoce"}
                </span>
                <strong
                  dir="ltr"
                  className={`text-sm font-black ${negoceTotals.netMarginDA >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
                    }`}
                >
                  {formatDA(negoceTotals.netMarginDA, 0)}
                </strong>
              </div>
            </div>

            {/* Formulaire Achat Externe (Négoce) */}
            {negoceFormOpen && (
              <div className="no-print rounded-xl border bg-card p-3.5 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "التاريخ" : "Date"}
                    </label>
                    <input
                      type="date"
                      dir="ltr"
                      value={nf.date}
                      onChange={(e) => setNf({ ...nf, date: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "المورد / المصدر" : "Fournisseur / Origine"}
                    </label>
                    <input
                      value={nf.supplier}
                      onChange={(e) => setNf({ ...nf, supplier: e.target.value })}
                      placeholder={isAr ? "مثال: مزرعة سطيف..." : "Ex: Producteur Sétif / Batna..."}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "الصنف" : "Espèce / Variété"}
                    </label>
                    <input
                      value={nf.species}
                      onChange={(e) => setNf({ ...nf, species: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "الوزن (كغ)" : "Poids acheté (kg)"}
                    </label>
                    <input
                      dir="ltr"
                      inputMode="decimal"
                      value={nf.weightKg}
                      onChange={(e) => setNf({ ...nf, weightKg: e.target.value })}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "سعر الشراء الإجمالي (دج)" : "Prix d'achat total (DA)"}
                    </label>
                    <input
                      dir="ltr"
                      inputMode="decimal"
                      value={nf.purchasePriceDA}
                      onChange={(e) => setNf({ ...nf, purchasePriceDA: e.target.value })}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "مصاريف التبريد / النقل (دج)" : "Frais frigo / transport (DA)"}
                    </label>
                    <input
                      dir="ltr"
                      inputMode="decimal"
                      value={nf.frigoCostDA}
                      onChange={(e) => setNf({ ...nf, frigoCostDA: e.target.value })}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "الوجهة" : "Destination"}
                    </label>
                    <select
                      value={nf.destination}
                      onChange={(e) => setNf({ ...nf, destination: e.target.value as any })}
                      className={inputCls}
                    >
                      <option value="frigo">{isAr ? "❄️ غرفة التبريد" : "❄️ Chambre froide"}</option>
                      <option value="mandataire">{isAr ? "🤝 وكيل السوق" : "🤝 Revente Mandataire"}</option>
                      <option value="direct">{isAr ? "🏪 بيع مباشر" : "🏪 Revente Directe"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "مبلغ البيع الصافي (دج)" : "Montant vente nette (DA)"}
                    </label>
                    <input
                      dir="ltr"
                      inputMode="decimal"
                      value={nf.saleNetDA}
                      onChange={(e) => setNf({ ...nf, saleNetDA: e.target.value })}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                      {isAr ? "الحالة" : "Statut"}
                    </label>
                    <select
                      value={nf.status}
                      onChange={(e) => setNf({ ...nf, status: e.target.value as any })}
                      className={inputCls}
                    >
                      <option value="en_stock">{isAr ? "في غرفة التبريد" : "En stock frigo"}</option>
                      <option value="vendu_paye">{isAr ? "مباع (مدفوع)" : "Vendu (Payé)"}</option>
                      <option value="vendu_attente">{isAr ? "مباع (قيد الانتظار)" : "Vendu (En attente)"}</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNegoceFormOpen(false)}
                    className="rounded-lg border px-3 py-1.5 font-bold text-muted-foreground cursor-pointer"
                  >
                    {isAr ? "إلغاء" : "Annuler"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNegoce}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 font-black cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isAr ? "حفظ" : "Enregistrer"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Liste des lots Négoce */}
            {filteredNegoce.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-3">
                {isAr
                  ? "لا توجد مشتريات خارجية مسجلة لهذا الموسم."
                  : "Aucun achat externe (Négoce) enregistré pour cette campagne."}
              </p>
            ) : (
              <ul className="divide-y rounded-xl border bg-card overflow-hidden">
                {filteredNegoce.map((n) => {
                  const margin = n.saleNetDA - n.purchasePriceDA - n.frigoCostDA;
                  return (
                    <li key={n.id} className="p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5 font-bold">
                          <span dir="ltr">{formatDateFR(n.date)}</span>
                          <span>·</span>
                          <span>{n.species}</span>
                          <span className="text-muted-foreground">({n.supplier})</span>
                          <span className="rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[10px]">
                            <Snowflake className="h-2.5 w-2.5 inline mr-0.5" />
                            {n.status === "en_stock"
                              ? isAr ? "في المخزون" : "En stock"
                              : n.status === "vendu_paye"
                                ? isAr ? "مباع - مدفوع" : "Vendu · Payé"
                                : isAr ? "مباع - قيد الانتظار" : "Vendu · En attente"}
                          </span>
                        </div>
                        <p dir="ltr" className="text-[11px] text-muted-foreground">
                          {formatNumber(n.weightKg, 1)} kg · Achat: {formatDA(n.purchasePriceDA)} · Frigo:{" "}
                          {formatDA(n.frigoCostDA)} · Vente: {formatDA(n.saleNetDA)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          dir="ltr"
                          className={`font-black ${margin >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
                            }`}
                        >
                          {margin >= 0 ? "+" : ""}
                          {formatDA(margin)}
                        </span>
                        <button
                          type="button"
                          onClick={() => saveNegoceList(negoceLots.filter((x) => x.id !== n.id))}
                          className="no-print p-1 rounded text-muted-foreground hover:text-destructive cursor-pointer"
                          title={isAr ? "حذف" : "Supprimer"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
