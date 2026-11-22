import { useMemo, useState } from "react";
import {
  Save,
  Trash2,
  History,
  Droplets,
  Factory,
  Package,
  ShoppingCart,
  ArrowRightLeft,
  Plus,
  X,
  TrendingUp,
  Gauge,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useModuleRecords, useAllModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useTranslation } from "@/lib/i18n";
import { type Parcel } from "@/data/parcels";

const CUVE_INOX_CAPACITY_L = 5000;
const OLIVE_PARCEL_IDS = new Set(["p1", "p2", "p3", "p4"]);

export type OliveDestination = "trituration" | "vente_brut" | "mixte";
export type OlivePaymentStatus = "paye" | "en_attente" | "partiel";
export type OilFormat = "vrac" | "bidon_5l" | "bouteille_1l";

export interface OliveHarvestRecord {
  id: string;
  createdAt: number;
  recordMode?: "olivier";
  recordType: "olive_harvest" | "olive_packaging" | "olive_sale";
  date: string;
  // Normalisation pour compatibilité Archive & Finances
  qty: string;
  unit: string;
  price: string;
  totalVente?: number;
  totalCharges?: number;
  total?: number;
  net?: number;
  notes?: string;

  // 1. Cueillette & Trituration (recordType === "olive_harvest")
  weightKg?: number;
  inputUnit?: "Kg" | "Quintaux";
  destination?: OliveDestination;
  rawOliveSoldKg?: number;
  rawOlivePricePerKg?: number;
  rawOliveRevenue?: number;
  mainOeuvre?: string;
  transport?: string;
  sacsCaisses?: string;
  autres?: string;
  // Huilerie (المعصرة)
  millName?: string;
  triturationDate?: string;
  olivesTrituredKg?: number;
  oilObtainedL?: number;
  yieldLPerQuintal?: number;
  millFeeType?: "da_forfait" | "da_quintal" | "nature_percent" | "nature_liters";
  millFeeValue?: number;
  millFeeDA?: number;
  millFeeLiters?: number;
  netOilRecoveredL?: number;
  acidityPercent?: number;
  oilQuality?: "extra_vierge" | "vierge" | "courante";
  // Conditionnement initial
  cuveInoxL?: number;
  bidons5LCount?: number;
  bouteilles1LCount?: number;
  packagingCostDA?: number;

  // 2. Soutirage / Conditionnement ultérieur (recordType === "olive_packaging")
  transferFromCuveL?: number;
  addedBidons5L?: number;
  addedBouteilles1L?: number;

  // 3. Vente d'huile échelonnée (recordType === "olive_sale")
  clientName?: string;
  oilFormat?: OilFormat;
  saleQty?: number; // L si vrac, nb bidons si 5L, nb bouteilles si 1L
  saleLiters?: number;
  unitPriceDA?: number;
  paymentStatus?: OlivePaymentStatus;
  paidAmountDA?: number;
}

function getOilQualityFromAcidity(acidity?: number): "extra_vierge" | "vierge" | "courante" {
  if (acidity === undefined || Number.isNaN(acidity) || acidity <= 0.8) return "extra_vierge";
  if (acidity <= 2.0) return "vierge";
  return "courante";
}

export function RecolteOlivier({
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
  const parcelRecords = useModuleRecords<OliveHarvestRecord>(parcelId, "recolte");
  const allRecolteRecords = useAllModuleRecords<OliveHarvestRecord>("recolte");
  const { add, update, remove } = useModuleActions();
  const [editingHarvestId, setEditingHarvestId] = useState<string | null>(null);
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  // Agrégation sur toute la campagne Oliviers (P1–P4) pour la Cuve Inox 5 000 L & stocks d'huile
  const oliveCampaignRecords = useMemo(() => {
    return allRecolteRecords.filter(
      (r) =>
        OLIVE_PARCEL_IDS.has(String(r.parcelId || "").toLowerCase()) ||
        r.parcelId === parcelId ||
        r.recordMode === "olivier"
    );
  }, [allRecolteRecords, parcelId]);

  // Stock global campagne oliviers (Cuve Inox 5 000 L + Bidons 5 L + Bouteilles 1 L) & KPIs
  const oliveStats = useMemo(() => {
    let totalOlivesTrituredKg = 0;
    let totalOilGrossL = 0;
    let totalNetOilL = 0;
    let cuveL = 0;
    let bidons5L = 0;
    let bouteilles1L = 0;
    let totalChargesDA = 0;
    let totalRevenueDA = 0;
    let totalCollectedDA = 0;
    let soldOilLiters = 0;
    let soldOilRevenueDA = 0;

    for (const r of oliveCampaignRecords) {
      const rType = r.recordType || "olive_harvest";
      if (rType === "olive_harvest") {
        totalOlivesTrituredKg += r.olivesTrituredKg || 0;
        totalOilGrossL += r.oilObtainedL || 0;
        totalNetOilL += r.netOilRecoveredL || 0;
        cuveL += r.cuveInoxL || 0;
        bidons5L += r.bidons5LCount || 0;
        bouteilles1L += r.bouteilles1LCount || 0;
        totalChargesDA += r.totalCharges ?? (parseFloat(r.mainOeuvre || "0") + parseFloat(r.transport || "0") + parseFloat(r.autres || "0"));
        const rawRev = r.rawOliveRevenue || 0;
        totalRevenueDA += rawRev;
        totalCollectedDA += rawRev;
      } else if (rType === "olive_packaging") {
        cuveL -= r.transferFromCuveL || 0;
        bidons5L += r.addedBidons5L || 0;
        bouteilles1L += r.addedBouteilles1L || 0;
        totalChargesDA += r.packagingCostDA || 0;
      } else if (rType === "olive_sale") {
        const fmt = r.oilFormat || "vrac";
        const q = r.saleQty || 0;
        const lit = r.saleLiters || (fmt === "bidon_5l" ? q * 5 : q);
        if (fmt === "vrac") cuveL -= lit;
        else if (fmt === "bidon_5l") bidons5L -= q;
        else if (fmt === "bouteille_1l") bouteilles1L -= q;

        const rev = r.totalVente || 0;
        totalRevenueDA += rev;
        soldOilLiters += lit;
        soldOilRevenueDA += rev;
        if (r.paymentStatus === "en_attente") {
          totalCollectedDA += 0;
        } else if (r.paymentStatus === "partiel") {
          totalCollectedDA += r.paidAmountDA || 0;
        } else {
          totalCollectedDA += rev;
        }
      }
    }

    const safeCuveL = Math.max(0, cuveL);
    const safeBidons5L = Math.max(0, bidons5L);
    const safeBouteilles1L = Math.max(0, bouteilles1L);
    const totalRemainingOilL = safeCuveL + safeBidons5L * 5 + safeBouteilles1L;
    const cuvePct = Math.min(100, Math.round((safeCuveL / CUVE_INOX_CAPACITY_L) * 100));
    const avgYieldLPerQ = totalOlivesTrituredKg > 0 ? (totalOilGrossL / totalOlivesTrituredKg) * 100 : 0;
    const costPerLiterDA = totalNetOilL > 0 ? totalChargesDA / totalNetOilL : 0;
    const avgSalePricePerL = soldOilLiters > 0 ? soldOilRevenueDA / soldOilLiters : 950;
    const estimatedStockValueDA = totalRemainingOilL * avgSalePricePerL;

    return {
      totalOlivesTrituredKg,
      totalNetOilL,
      safeCuveL,
      safeBidons5L,
      safeBouteilles1L,
      totalRemainingOilL,
      cuvePct,
      avgYieldLPerQ,
      costPerLiterDA,
      avgSalePricePerL,
      estimatedStockValueDA,
      totalChargesDA,
      totalRevenueDA,
      totalCollectedDA,
      netResultDA: totalCollectedDA - totalChargesDA,
    };
  }, [oliveCampaignRecords]);

  // Formulaire Bloc 1 + Bloc 2 + Bloc 3 initial (Cueillette + Trituration + Conditionnement)
  const [f, setF] = useState({
    date: prefillDate || new Date().toISOString().slice(0, 10),
    inputUnit: "Kg" as "Kg" | "Quintaux",
    weightVal: "",
    destination: "trituration" as OliveDestination,
    rawOliveSoldKg: "",
    rawOlivePricePerKg: "",
    mainOeuvre: "",
    transport: "",
    sacsCaisses: "",
    autres: "",
    // Bloc 2 : Trituration
    millName: "",
    triturationDate: prefillDate || new Date().toISOString().slice(0, 10),
    olivesTrituredKg: "",
    oilObtainedL: "",
    millFeeType: "da_quintal" as "da_forfait" | "da_quintal" | "nature_percent" | "nature_liters",
    millFeeValue: "",
    acidityPercent: "0.5",
    // Bloc 3 : Répartition initiale
    bidons5LCount: "",
    bouteilles1LCount: "",
    packagingCostDA: "",
    notes: prefillNotes || "",
  });

  const [lastPrefillDate, setLastPrefillDate] = useState(prefillDate);
  if (prefillDate && prefillDate !== lastPrefillDate) {
    setLastPrefillDate(prefillDate);
    setF((prev) => ({
      ...prev,
      date: prefillDate,
      triturationDate: prefillDate,
      notes: prefillNotes || prev.notes,
    }));
  }

  // Modales Actions : Soutirer/Conditionner & Nouvelle Vente d'huile
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [packForm, setPackForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    bidons5L: "",
    bouteilles1L: "",
    packagingCostDA: "",
    notes: "",
  });

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    clientName: "",
    format: "bidon_5l" as OilFormat,
    qty: "",
    unitPriceDA: "",
    paymentStatus: "paye" as OlivePaymentStatus,
    paidAmountDA: "",
    notes: "",
  });

  // Calculs temps réel du formulaire Cueillette + Trituration
  const rawWeightNum = parseFloat(f.weightVal) || 0;
  const harvestedKg = f.inputUnit === "Quintaux" ? rawWeightNum * 100 : rawWeightNum;
  const rawSoldKg = f.destination === "vente_brut" ? harvestedKg : f.destination === "mixte" ? parseFloat(f.rawOliveSoldKg) || 0 : 0;
  const rawSoldRev = rawSoldKg * (parseFloat(f.rawOlivePricePerKg) || 0);

  const trituredKg =
    f.destination === "vente_brut"
      ? 0
      : parseFloat(f.olivesTrituredKg) || Math.max(0, harvestedKg - rawSoldKg);
  const oilGrossL = f.destination === "vente_brut" ? 0 : parseFloat(f.oilObtainedL) || 0;
  const yieldLPerQuintal = trituredKg > 0 ? (oilGrossL / trituredKg) * 100 : 0;

  const millVal = parseFloat(f.millFeeValue) || 0;
  const millFeeDA =
    f.millFeeType === "da_forfait"
      ? millVal
      : f.millFeeType === "da_quintal"
        ? (trituredKg / 100) * millVal
        : 0;
  const millFeeLiters =
    f.millFeeType === "nature_percent"
      ? (oilGrossL * millVal) / 100
      : f.millFeeType === "nature_liters"
        ? millVal
        : 0;

  const netOilL = Math.max(0, oilGrossL - millFeeLiters);
  const acidityNum = parseFloat(f.acidityPercent);
  const oilQuality = getOilQualityFromAcidity(Number.isNaN(acidityNum) ? 0.5 : acidityNum);

  const bid5 = parseInt(f.bidons5LCount || "0", 10) || 0;
  const bout1 = parseInt(f.bouteilles1LCount || "0", 10) || 0;
  const packagedL = bid5 * 5 + bout1;
  const cuveInoxAddedL = Math.max(0, netOilL - packagedL);

  const formChargesDA =
    (parseFloat(f.mainOeuvre) || 0) +
    (parseFloat(f.transport) || 0) +
    (parseFloat(f.sacsCaisses) || 0) +
    (parseFloat(f.autres) || 0) +
    millFeeDA +
    (parseFloat(f.packagingCostDA) || 0);

  function saveOliveHarvest() {
    if (!f.date || harvestedKg <= 0) {
      toast.error(isAr ? "يرجى إدخال التاريخ ووزن الزيتون المحصود" : "Veuillez renseigner la date et le poids récolté.");
      return;
    }

    const payload: Omit<OliveHarvestRecord, "id" | "createdAt"> = {
      recordMode: "olivier",
      recordType: "olive_harvest",
      date: f.date,
      qty: harvestedKg.toString(),
      unit: "Kg",
      price: rawSoldKg > 0 ? (rawSoldRev / rawSoldKg).toFixed(2) : "0",
      weightKg: harvestedKg,
      inputUnit: f.inputUnit,
      destination: f.destination,
      rawOliveSoldKg: rawSoldKg,
      rawOlivePricePerKg: parseFloat(f.rawOlivePricePerKg) || 0,
      rawOliveRevenue: rawSoldRev,
      mainOeuvre: f.mainOeuvre,
      transport: f.transport,
      sacsCaisses: f.sacsCaisses,
      autres: f.autres,
      millName: f.millName.trim() || undefined,
      triturationDate: f.destination !== "vente_brut" ? f.triturationDate || f.date : undefined,
      olivesTrituredKg: trituredKg,
      oilObtainedL: oilGrossL,
      yieldLPerQuintal: Math.round(yieldLPerQuintal * 10) / 10,
      millFeeType: f.millFeeType,
      millFeeValue: millVal,
      millFeeDA,
      millFeeLiters,
      netOilRecoveredL: Math.round(netOilL * 10) / 10,
      acidityPercent: Number.isNaN(acidityNum) ? undefined : acidityNum,
      oilQuality,
      cuveInoxL: Math.round(cuveInoxAddedL * 10) / 10,
      bidons5LCount: bid5,
      bouteilles1LCount: bout1,
      packagingCostDA: parseFloat(f.packagingCostDA) || 0,
      totalVente: rawSoldRev,
      totalCharges: formChargesDA,
      total: formChargesDA,
      net: rawSoldRev - formChargesDA,
      notes: f.notes,
    };

    if (editingHarvestId) {
      update(parcelId, "recolte", editingHarvestId, payload);
      toast.success(isAr ? "تم تحديث الدفعة بنجاح" : "Cueillette & trituration mises à jour !");
      setEditingHarvestId(null);
    } else {
      add(parcelId, "recolte", payload);
      toast.success(isAr ? "تم تسجيل جني وعصر الزيتون بنجاح" : "Cueillette & trituration enregistrées !");
    }
    onCloseForm?.();
    setF((prev) => ({
      ...prev,
      weightVal: "",
      rawOliveSoldKg: "",
      rawOlivePricePerKg: "",
      mainOeuvre: "",
      transport: "",
      sacsCaisses: "",
      autres: "",
      olivesTrituredKg: "",
      oilObtainedL: "",
      millFeeValue: "",
      bidons5LCount: "",
      bouteilles1LCount: "",
      packagingCostDA: "",
      notes: "",
    }));
  }

  function savePackagingTransfer() {
    const b5 = parseInt(packForm.bidons5L || "0", 10) || 0;
    const b1 = parseInt(packForm.bouteilles1L || "0", 10) || 0;
    const litersNeeded = b5 * 5 + b1;
    if (litersNeeded <= 0) {
      toast.error(isAr ? "أدخل عدد الصفائح أو القارورات" : "Indiquez le nombre de bidons ou bouteilles.");
      return;
    }
    if (litersNeeded > oliveStats.safeCuveL + 0.01) {
      toast.error(
        isAr
          ? `الكمية المطلوبة (${litersNeeded} لتر) تتجاوز المتاح في الخزان (${oliveStats.safeCuveL.toFixed(1)} لتر)`
          : `Volume demandé (${litersNeeded} L) supérieur au stock en Cuve Inox (${oliveStats.safeCuveL.toFixed(1)} L).`
      );
      return;
    }

    const costDA = parseFloat(packForm.packagingCostDA) || 0;
    const payload: Omit<OliveHarvestRecord, "id" | "createdAt"> = {
      recordMode: "olivier",
      recordType: "olive_packaging",
      date: packForm.date,
      qty: litersNeeded.toString(),
      unit: "L",
      price: "0",
      transferFromCuveL: litersNeeded,
      addedBidons5L: b5,
      addedBouteilles1L: b1,
      packagingCostDA: costDA,
      totalVente: 0,
      totalCharges: costDA,
      total: costDA,
      net: -costDA,
      notes: packForm.notes,
    };

    if (editingPackId) {
      update(parcelId, "recolte", editingPackId, payload);
      toast.success(isAr ? "تم تحديث عملية التعبئة" : "Soutirage mis à jour !");
      setEditingPackId(null);
    } else {
      add(parcelId, "recolte", payload);
      toast.success(isAr ? "تم التعبئة من خزان الإينوكس بنجاح" : "Soutirage & conditionnement enregistrés !");
    }
    setPackModalOpen(false);
    setPackForm({ date: new Date().toISOString().slice(0, 10), bidons5L: "", bouteilles1L: "", packagingCostDA: "", notes: "" });
  }

  function saveOilSale() {
    const q = parseFloat(saleForm.qty) || 0;
    const unitP = parseFloat(saleForm.unitPriceDA) || 0;
    if (q <= 0 || unitP <= 0) {
      toast.error(isAr ? "أدخل الكمية وسعر البيع" : "Indiquez la quantité et le prix unitaire.");
      return;
    }

    const liters = saleForm.format === "bidon_5l" ? q * 5 : q;
    if (saleForm.format === "vrac" && liters > oliveStats.safeCuveL + 0.01) {
      toast.error(isAr ? "المخزون غير كافٍ في الخزان" : "Stock insuffisant dans la Cuve Inox.");
      return;
    }
    if (saleForm.format === "bidon_5l" && q > oliveStats.safeBidons5L) {
      toast.error(isAr ? "عدد صفائح 5 لتر غير كافٍ" : "Stock de bidons 5 L insuffisant.");
      return;
    }
    if (saleForm.format === "bouteille_1l" && q > oliveStats.safeBouteilles1L) {
      toast.error(isAr ? "عدد قارورات 1 لتر غير كافٍ" : "Stock de bouteilles 1 L insuffisant.");
      return;
    }

    const gross = q * unitP;
    const payload: Omit<OliveHarvestRecord, "id" | "createdAt"> = {
      recordMode: "olivier",
      recordType: "olive_sale",
      date: saleForm.date,
      qty: liters.toString(),
      unit: "L",
      price: (gross / liters).toFixed(2),
      clientName: saleForm.clientName.trim() || (isAr ? "زبون" : "Client"),
      oilFormat: saleForm.format,
      saleQty: q,
      saleLiters: liters,
      unitPriceDA: unitP,
      paymentStatus: saleForm.paymentStatus,
      paidAmountDA: saleForm.paymentStatus === "partiel" ? parseFloat(saleForm.paidAmountDA) || 0 : undefined,
      totalVente: gross,
      totalCharges: 0,
      total: 0,
      net: gross,
      notes: saleForm.notes,
    };

    if (editingSaleId) {
      update(parcelId, "recolte", editingSaleId, payload);
      toast.success(isAr ? "تم تحديث عملية البيع" : "Vente d'huile mise à jour !");
      setEditingSaleId(null);
    } else {
      add(parcelId, "recolte", payload);
      toast.success(isAr ? "تم تسجيل بيع زيت الزيتون بنجاح" : "Vente d'huile enregistrée !");
    }
    setSaleModalOpen(false);
    setSaleForm({
      date: new Date().toISOString().slice(0, 10),
      clientName: "",
      format: "bidon_5l",
      qty: "",
      unitPriceDA: "",
      paymentStatus: "paye",
      paidAmountDA: "",
      notes: "",
    });
  }

  function handleEditRecord(r: OliveHarvestRecord) {
    const rType = r.recordType || "olive_harvest";
    if (rType === "olive_packaging") {
      setEditingPackId(r.id);
      setPackForm({
        date: r.date || new Date().toISOString().slice(0, 10),
        bidons5L: r.addedBidons5L ? String(r.addedBidons5L) : "",
        bouteilles1L: r.addedBouteilles1L ? String(r.addedBouteilles1L) : "",
        packagingCostDA: r.packagingCostDA ? String(r.packagingCostDA) : "",
        notes: r.notes || "",
      });
      setPackModalOpen(true);
      return;
    }
    if (rType === "olive_sale") {
      setEditingSaleId(r.id);
      setSaleForm({
        date: r.date || new Date().toISOString().slice(0, 10),
        clientName: r.clientName || "",
        format: r.oilFormat || "bidon_5l",
        qty: r.saleQty ? String(r.saleQty) : "",
        unitPriceDA: r.unitPriceDA ? String(r.unitPriceDA) : "",
        paymentStatus: r.paymentStatus || "paye",
        paidAmountDA: r.paidAmountDA ? String(r.paidAmountDA) : "",
        notes: r.notes || "",
      });
      setSaleModalOpen(true);
      return;
    }
    // olive_harvest
    const wKg = r.weightKg ?? (parseFloat(r.qty || "0") || 0);
    const unit = r.inputUnit || "Kg";
    const displayedWeight = unit === "Quintaux" ? String(wKg / 100) : String(wKg);
    setEditingHarvestId(r.id);
    setF({
      date: r.date || new Date().toISOString().slice(0, 10),
      inputUnit: unit,
      weightVal: displayedWeight,
      destination: r.destination || "trituration",
      rawOliveSoldKg: r.rawOliveSoldKg ? String(r.rawOliveSoldKg) : "",
      rawOlivePricePerKg: r.rawOlivePricePerKg ? String(r.rawOlivePricePerKg) : "",
      mainOeuvre: r.mainOeuvre || "",
      transport: r.transport || "",
      sacsCaisses: r.sacsCaisses || "",
      autres: r.autres || "",
      millName: r.millName || "",
      triturationDate: r.triturationDate || r.date || "",
      olivesTrituredKg: r.olivesTrituredKg ? String(r.olivesTrituredKg) : "",
      oilObtainedL: r.oilObtainedL ? String(r.oilObtainedL) : "",
      millFeeType: r.millFeeType || "da_quintal",
      millFeeValue: r.millFeeValue ? String(r.millFeeValue) : "",
      acidityPercent: r.acidityPercent !== undefined ? String(r.acidityPercent) : "0.5",
      bidons5LCount: r.bidons5LCount ? String(r.bidons5LCount) : "",
      bouteilles1LCount: r.bouteilles1LCount ? String(r.bouteilles1LCount) : "",
      packagingCostDA: r.packagingCostDA ? String(r.packagingCostDA) : "",
      notes: r.notes || "",
    });
    onOpenForm?.();
  }

  const cls = "rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs sm:text-sm w-full";
  const qualityBadge = (q?: string) => {
    if (q === "extra_vierge") return { label: isAr ? "بكر ممتاز (≤ 0.8%)" : "Extra Vierge (≤ 0,8 %)", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" };
    if (q === "vierge") return { label: isAr ? "بكر (≤ 2%)" : "Vierge (≤ 2 %)", cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30" };
    return { label: isAr ? "عادي (> 2%)" : "Courante (> 2 %)", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" };
  };

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {/* BLOC 3 : JAUGE CUVE INOX 5 000 L + CONDITIONNEMENT + VENTES RAPIDES */}
      <div className="rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-br from-emerald-500/5 to-amber-500/5 p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>{isAr ? "خزان الإينوكس 5000 لتر ومخزون الزيت (P1–P4)" : "Cuve Inox 5 000 L & Stock d'Huile (P1–P4)"}</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isAr ? "تجميع تلقائي لحملة الزيتون على جميع القطع P1–P4" : "Agrégation temps réel sur la campagne oliviers P1–P4"}
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPackModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-600/40 bg-card hover:bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-black text-emerald-800 dark:text-emerald-200 cursor-pointer"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>{isAr ? "تعبئة من الخزان" : "Soutirer / Conditionner"}</span>
              </button>
              <button
                type="button"
                onClick={() => setSaleModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-[11px] font-black shadow-xs cursor-pointer"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>{isAr ? "+ بيع زيت جديد" : "+ Nouvelle vente d'huile"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Barre visuelle Cuve Inox 5 000 L */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-emerald-900 dark:text-emerald-200">
              🛢️ {isAr ? "خزان الإينوكس (سائب)" : "Cuve Inox (vrac)"}
            </span>
            <span dir="ltr" className="text-emerald-700 dark:text-emerald-300">
              {oliveStats.safeCuveL.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} L / 5 000 L ({oliveStats.cuvePct}%)
            </span>
          </div>
          <div className="h-3.5 w-full rounded-full bg-muted overflow-hidden border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-amber-500 transition-all duration-500"
              style={{ width: `${oliveStats.cuvePct}%` }}
            />
          </div>
        </div>

        {/* 3 formats de stock */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border bg-card p-2.5">
            <span className="text-[10px] font-bold text-muted-foreground block">{isAr ? "سائب (الخزان)" : "Vrac Cuve"}</span>
            <p dir="ltr" className="text-sm font-black text-foreground">{oliveStats.safeCuveL.toFixed(0)} L</p>
          </div>
          <div className="rounded-xl border bg-card p-2.5">
            <span className="text-[10px] font-bold text-muted-foreground block">{isAr ? "صفائح 5 لتر" : "Bidons 5 L"}</span>
            <p dir="ltr" className="text-sm font-black text-foreground">
              {oliveStats.safeBidons5L} <span className="text-[10px] font-semibold text-muted-foreground">({oliveStats.safeBidons5L * 5} L)</span>
            </p>
          </div>
          <div className="rounded-xl border bg-card p-2.5">
            <span className="text-[10px] font-bold text-muted-foreground block">{isAr ? "قارورات 1 لتر" : "Bouteilles 1 L"}</span>
            <p dir="ltr" className="text-sm font-black text-foreground">
              {oliveStats.safeBouteilles1L} <span className="text-[10px] font-semibold text-muted-foreground">({oliveStats.safeBouteilles1L} L)</span>
            </p>
          </div>
        </div>
      </div>

      {/* FORMULAIRE BLOC 1 (CUEILLETTE) + BLOC 2 (TRITURATION) + CONDITIONNEMENT INITIAL */}
      {canEdit && showForm && (
        <div className="space-y-4 rounded-2xl border-2 border-emerald-600/30 bg-card p-4 shadow-sm animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between gap-2 border-b pb-2">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <span>🫒</span>
              <span>{isAr ? "جني الزيتون والعصر في المعصرة" : "Cueillette & Trituration (Oléiculture)"}</span>
              {parcel?.name && <span className="text-xs font-bold text-muted-foreground">· {parcel.name}</span>}
            </h3>
            {onCloseForm && (
              <button
                type="button"
                onClick={onCloseForm}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
                aria-label={isAr ? "إغلاق" : "Fermer"}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* BLOC 1 — Cueillette (Olives brutes) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {isAr ? "1. الجني (الزيتون الخام)" : "1. Cueillette (Olives brutes)"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "تاريخ الجني" : "Date de cueillette"}</label>
                <input type="date" dir="ltr" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={cls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "الوزن المحصود" : "Poids récolté"}</label>
                <div className="flex gap-1">
                  <input dir="ltr" inputMode="decimal" value={f.weightVal} onChange={(e) => setF({ ...f, weightVal: e.target.value })} placeholder="0" className={cls} />
                  <select value={f.inputUnit} onChange={(e) => setF({ ...f, inputUnit: e.target.value as "Kg" | "Quintaux" })} className="rounded-lg border border-input bg-background px-2 text-xs font-bold">
                    <option value="Kg">Kg</option>
                    <option value="Quintaux">{isAr ? "قنطار" : "Qx"}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "الوجهة" : "Destination"}</label>
                <select value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value as OliveDestination })} className={cls}>
                  <option value="trituration">{isAr ? "العصر (زيت الزيتون)" : "Trituration (Huile d'olive)"}</option>
                  <option value="vente_brut">{isAr ? "بيع زيتون خام" : "Vente olives brutes"}</option>
                  <option value="mixte">{isAr ? "مختلط (عصر + بيع خام)" : "Mixte"}</option>
                </select>
              </div>
            </div>

            {(f.destination === "vente_brut" || f.destination === "mixte") && (
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
                {f.destination === "mixte" && (
                  <input dir="ltr" inputMode="decimal" value={f.rawOliveSoldKg} onChange={(e) => setF({ ...f, rawOliveSoldKg: e.target.value })} placeholder={isAr ? "وزن الزيتون المباع خام (كغ)" : "Olives vendues brutes (Kg)"} className={cls} />
                )}
                <input dir="ltr" inputMode="decimal" value={f.rawOlivePricePerKg} onChange={(e) => setF({ ...f, rawOlivePricePerKg: e.target.value })} placeholder={isAr ? "سعر الكيلوغرام خام (دج)" : "Prix olives brutes (DA/Kg)"} className={cls} />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input dir="ltr" inputMode="decimal" value={f.mainOeuvre} onChange={(e) => setF({ ...f, mainOeuvre: e.target.value })} placeholder={isAr ? "اليد العاملة (دج)" : "Main-d'œuvre (DA)"} className={cls} />
              <input dir="ltr" inputMode="decimal" value={f.transport} onChange={(e) => setF({ ...f, transport: e.target.value })} placeholder={isAr ? "النقل للمعصرة (دج)" : "Transport huilerie (DA)"} className={cls} />
              <input dir="ltr" inputMode="decimal" value={f.sacsCaisses} onChange={(e) => setF({ ...f, sacsCaisses: e.target.value })} placeholder={isAr ? "أكياس / صناديق (دج)" : "Sacs / Caisses (DA)"} className={cls} />
              <input dir="ltr" inputMode="decimal" value={f.autres} onChange={(e) => setF({ ...f, autres: e.target.value })} placeholder={isAr ? "مصاريف أخرى (دج)" : "Autres (DA)"} className={cls} />
            </div>
          </div>

          {/* BLOC 2 — Trituration (Huilerie / المعصرة) */}
          {f.destination !== "vente_brut" && (
            <div className="border-t pt-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Factory className="h-3.5 w-3.5" />
                  <span>{isAr ? "2. العصر في المعصرة (Trituration)" : "2. Trituration (Huilerie)"}</span>
                </h4>
                {yieldLPerQuintal > 0 && (
                  <span dir="ltr" className="rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 text-[11px] font-black">
                    {yieldLPerQuintal.toFixed(1)} L / Q (100 kg)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input value={f.millName} onChange={(e) => setF({ ...f, millName: e.target.value })} placeholder={isAr ? "اسم المعصرة" : "Nom de l'huilerie"} className={cls} />
                <input type="date" dir="ltr" value={f.triturationDate} onChange={(e) => setF({ ...f, triturationDate: e.target.value })} className={cls} />
                <input
                  dir="ltr"
                  inputMode="decimal"
                  value={f.olivesTrituredKg}
                  onChange={(e) => setF({ ...f, olivesTrituredKg: e.target.value })}
                  placeholder={`${isAr ? "وزن معصور (كغ)" : "Olives triturées (Kg)"} (${Math.max(0, harvestedKg - rawSoldKg) || 0})`}
                  className={cls}
                />
                <input
                  dir="ltr"
                  inputMode="decimal"
                  value={f.oilObtainedL}
                  onChange={(e) => setF({ ...f, oilObtainedL: e.target.value })}
                  placeholder={isAr ? "الزيت المستخرج (لتر)" : "Huile obtenue (Litres)"}
                  className={cls}
                />
              </div>

              {/* Frais de trituration & Acidité */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select value={f.millFeeType} onChange={(e) => setF({ ...f, millFeeType: e.target.value as any })} className={cls}>
                  <option value="da_quintal">{isAr ? "تكلفة العصر (دج / قنطار)" : "Frais DA / Quintal"}</option>
                  <option value="da_forfait">{isAr ? "تكلفة العصر (مبلغ جزافي دج)" : "Forfait en DA"}</option>
                  <option value="nature_percent">{isAr ? "اقتطاع عيني (% من الزيت)" : "Prélèvement nature (%)"}</option>
                  <option value="nature_liters">{isAr ? "اقتطاع عيني (لتر للمعصرة)" : "Prélèvement nature (Litres)"}</option>
                </select>
                <input
                  dir="ltr"
                  inputMode="decimal"
                  value={f.millFeeValue}
                  onChange={(e) => setF({ ...f, millFeeValue: e.target.value })}
                  placeholder={f.millFeeType.startsWith("da") ? "DA" : f.millFeeType === "nature_percent" ? "%" : "L"}
                  className={cls}
                />
                <div className="flex items-center gap-1.5">
                  <input
                    dir="ltr"
                    inputMode="decimal"
                    value={f.acidityPercent}
                    onChange={(e) => setF({ ...f, acidityPercent: e.target.value })}
                    placeholder={isAr ? "الحموضة %" : "Acidité %"}
                    className={cls}
                  />
                  <span className={`shrink-0 rounded-lg border px-2 py-1.5 text-[10px] font-black whitespace-nowrap ${qualityBadge(oilQuality).cls}`}>
                    {qualityBadge(oilQuality).label}
                  </span>
                </div>
              </div>

              {/* Répartition initiale de l'huile nette */}
              {netOilL > 0 && (
                <div className="rounded-xl border bg-muted/25 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-emerald-700" />
                      <span>{isAr ? "توزيع الزيت الصافي المسترجع :" : "Répartition de l'huile nette :"}</span>
                      <strong dir="ltr" className="text-emerald-700 dark:text-emerald-300">{netOilL.toFixed(1)} L</strong>
                    </span>
                    <span dir="ltr" className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                      {isAr ? "في الخزان :" : "Cuve Inox :"} {cuveInoxAddedL.toFixed(1)} L
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input dir="ltr" inputMode="numeric" value={f.bidons5LCount} onChange={(e) => setF({ ...f, bidons5LCount: e.target.value })} placeholder={isAr ? "صفائح 5 لتر" : "Bidons 5 L"} className={cls} />
                    <input dir="ltr" inputMode="numeric" value={f.bouteilles1LCount} onChange={(e) => setF({ ...f, bouteilles1LCount: e.target.value })} placeholder={isAr ? "قارورات 1 لتر" : "Bouteilles 1 L"} className={cls} />
                    <input dir="ltr" inputMode="decimal" value={f.packagingCostDA} onChange={(e) => setF({ ...f, packagingCostDA: e.target.value })} placeholder={isAr ? "تكلفة التعبئة (دج)" : "Coût emballage (DA)"} className={cls} />
                  </div>
                </div>
              )}
            </div>
          )}

          <textarea
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder={isAr ? "ملاحظات..." : "Notes..."}
            className={`${cls} min-h-12 resize-y`}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-xs">
            <span className="font-bold text-muted-foreground">
              {isAr ? "تكاليف الدفعة :" : "Charges lot :"} <strong dir="ltr" className="text-foreground">{formChargesDA.toFixed(0)} DA</strong>
            </span>
            <button
              type="button"
              onClick={saveOliveHarvest}
              disabled={!f.date || harvestedKg <= 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-black disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>
                {editingHarvestId
                  ? isAr
                    ? "تحديث الدفعة"
                    : "Mettre à jour"
                  : isAr
                    ? "تسجيل الدفعة"
                    : "Enregistrer la cueillette"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* BLOC 4 : KPI AUTOMATIQUES DE RENTABILITÉ OLÉICOLE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border bg-card p-3">
          <span className="text-[10px] font-bold text-muted-foreground block">{isAr ? "المردود المتوسط" : "Rendement moyen"}</span>
          <p dir="ltr" className="text-base font-black text-emerald-700 dark:text-emerald-300">
            {oliveStats.avgYieldLPerQ.toFixed(1)} L/Q
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <span className="text-[10px] font-bold text-muted-foreground block">{isAr ? "تكلفة اللتر" : "Coût de revient / L"}</span>
          <p dir="ltr" className="text-base font-black text-foreground">
            {oliveStats.costPerLiterDA.toFixed(0)} DA/L
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <span className="text-[10px] font-bold text-muted-foreground block">{isAr ? "المخزون المتبقي" : "Stock restant"}</span>
          <p dir="ltr" className="text-base font-black text-amber-700 dark:text-amber-300">
            {oliveStats.totalRemainingOilL.toFixed(0)} L
          </p>
          <span dir="ltr" className="text-[10px] text-muted-foreground font-semibold">
            ≈ {oliveStats.estimatedStockValueDA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DA
          </span>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{isAr ? "النتيجة الصافية" : "Résultat Net"}</span>
          </span>
          <p dir="ltr" className={`text-base font-black ${oliveStats.netResultDA >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>
            {oliveStats.netResultDA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DA
          </p>
          <span dir="ltr" className="text-[10px] text-muted-foreground font-semibold">
            +{oliveStats.totalCollectedDA.toFixed(0)} / −{oliveStats.totalChargesDA.toFixed(0)}
          </span>
        </div>
      </div>

      {/* ARCHIVE DE LA PARCELLE (Cueillettes, Soutirages, Ventes d'huile) */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-black">
          <History className="h-4 w-4 text-primary" />
          <span>{isAr ? `سجل العمليات (${parcelRecords.length})` : `Journal & Archive (${parcelRecords.length})`}</span>
        </div>
        {parcelRecords.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {isAr ? "لا توجد عمليات مسجلة لهذه القطعة." : "Aucune opération enregistrée pour cette parcelle."}
          </p>
        ) : (
          <ul className="divide-y">
            {parcelRecords.map((r) => {
              const rType = r.recordType || "olive_harvest";
              return (
                <li key={r.id} className="p-3.5 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span dir="ltr" className="font-black text-foreground">{r.date}</span>
                      {rType === "olive_sale" ? (
                        <span className="rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 text-[10px] font-black">
                          💰 {isAr ? "بيع زيت" : "Vente huile"} · {r.clientName}
                        </span>
                      ) : rType === "olive_packaging" ? (
                        <span className="rounded-full bg-sky-500/15 text-sky-800 dark:text-sky-200 px-2 py-0.5 text-[10px] font-black">
                          📦 {isAr ? "تعبئة من الخزان" : "Soutirage"} (<span dir="ltr">{r.transferFromCuveL} L</span>)
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 px-2 py-0.5 text-[10px] font-black">
                          🫒 {isAr ? "جني / عصر" : "Cueillette"} (<span dir="ltr">{r.weightKg || r.qty} Kg</span>)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {rType === "olive_sale" && (
                        <span dir="ltr" className="font-black text-emerald-700 dark:text-emerald-300">
                          +{(r.totalVente || 0).toFixed(0)} DA
                        </span>
                      )}
                      {rType === "olive_harvest" && (r.netOilRecoveredL || 0) > 0 && (
                        <span dir="ltr" className="font-black text-emerald-700 dark:text-emerald-300">
                          {r.netOilRecoveredL} L ({r.yieldLPerQuintal} L/Q)
                        </span>
                      )}
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditRecord(r)}
                            title={isAr ? "تعديل" : "Modifier"}
                            className="p-1 rounded-md text-muted-foreground hover:text-emerald-700 hover:bg-emerald-500/10 transition cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(parcelId, "recolte", r.id)}
                            title={isAr ? "حذف" : "Supprimer"}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    {rType === "olive_harvest" && r.millName && <span>🏭 {r.millName}</span>}
                    {rType === "olive_sale" && (
                      <span dir="ltr">
                        {r.saleQty}{" "}
                        {r.oilFormat === "bidon_5l" ? "× Bidon 5L" : r.oilFormat === "bouteille_1l" ? "× Bout. 1L" : "L vrac"} @ {r.unitPriceDA} DA
                      </span>
                    )}
                    {(r.totalCharges || 0) > 0 && <span dir="ltr">{isAr ? "تكاليف" : "Charges"}: {r.totalCharges?.toFixed(0)} DA</span>}
                  </div>
                  {r.notes && <p className="text-[11px] italic text-muted-foreground">{r.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modale Soutirer / Conditionner */}
      {packModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-black flex items-center gap-1.5">
                <ArrowRightLeft className="h-4 w-4 text-emerald-700" />
                <span>{isAr ? "تعبئة من خزان الإينوكس" : "Soutirer / Conditionner depuis la Cuve"}</span>
              </h4>
              <button type="button" onClick={() => setPackModalOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isAr ? "المتوفر في الخزان :" : "Disponible en Cuve Inox :"}{" "}
              <strong dir="ltr" className="text-foreground">{oliveStats.safeCuveL.toFixed(1)} L</strong>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" dir="ltr" value={packForm.date} onChange={(e) => setPackForm({ ...packForm, date: e.target.value })} className={cls} />
              <input dir="ltr" inputMode="decimal" value={packForm.packagingCostDA} onChange={(e) => setPackForm({ ...packForm, packagingCostDA: e.target.value })} placeholder={isAr ? "تكلفة العبوات (دج)" : "Coût emballages (DA)"} className={cls} />
              <input dir="ltr" inputMode="numeric" value={packForm.bidons5L} onChange={(e) => setPackForm({ ...packForm, bidons5L: e.target.value })} placeholder={isAr ? "عدد صفائح 5 لتر" : "Nb Bidons 5 L"} className={cls} />
              <input dir="ltr" inputMode="numeric" value={packForm.bouteilles1L} onChange={(e) => setPackForm({ ...packForm, bouteilles1L: e.target.value })} placeholder={isAr ? "عدد قارورات 1 لتر" : "Nb Bouteilles 1 L"} className={cls} />
            </div>
            <div className="flex justify-end gap-2 border-t pt-2.5">
              <button type="button" onClick={() => setPackModalOpen(false)} className="rounded-lg border px-3 py-1.5 font-bold text-muted-foreground">
                {isAr ? "إلغاء" : "Annuler"}
              </button>
              <button type="button" onClick={savePackagingTransfer} className="rounded-lg bg-emerald-700 text-white px-4 py-1.5 font-black cursor-pointer">
                {isAr ? "تأكيد التعبئة" : "Valider le soutirage"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale + Nouvelle vente d'huile */}
      {saleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Droplets className="h-4 w-4" />
                <span>{isAr ? "تسجيل بيع زيت الزيتون" : "Nouvelle vente d'huile d'olive"}</span>
              </h4>
              <button type="button" onClick={() => setSaleModalOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" dir="ltr" value={saleForm.date} onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })} className={cls} />
              <input value={saleForm.clientName} onChange={(e) => setSaleForm({ ...saleForm, clientName: e.target.value })} placeholder={isAr ? "اسم الزبون / المشتري" : "Client / Acheteur"} className={cls} />
              <select value={saleForm.format} onChange={(e) => setSaleForm({ ...saleForm, format: e.target.value as OilFormat })} className={cls}>
                <option value="bidon_5l">{isAr ? `صفائح 5 لتر (${oliveStats.safeBidons5L})` : `Bidons 5 L (${oliveStats.safeBidons5L})`}</option>
                <option value="bouteille_1l">{isAr ? `قارورات 1 لتر (${oliveStats.safeBouteilles1L})` : `Bouteilles 1 L (${oliveStats.safeBouteilles1L})`}</option>
                <option value="vrac">{isAr ? `سائب من الخزان (${oliveStats.safeCuveL.toFixed(0)} لتر)` : `Vrac Cuve (${oliveStats.safeCuveL.toFixed(0)} L)`}</option>
              </select>
              <input dir="ltr" inputMode="decimal" value={saleForm.qty} onChange={(e) => setSaleForm({ ...saleForm, qty: e.target.value })} placeholder={isAr ? "الكمية" : "Quantité"} className={cls} />
              <input dir="ltr" inputMode="decimal" value={saleForm.unitPriceDA} onChange={(e) => setSaleForm({ ...saleForm, unitPriceDA: e.target.value })} placeholder={saleForm.format === "bidon_5l" ? (isAr ? "سعر الصفيحة 5ل (دج)" : "Prix / bidon 5L (DA)") : (isAr ? "سعر اللتر (دج)" : "Prix / L (DA)")} className={cls} />
              <select value={saleForm.paymentStatus} onChange={(e) => setSaleForm({ ...saleForm, paymentStatus: e.target.value as OlivePaymentStatus })} className={cls}>
                <option value="paye">{isAr ? "مدفوع" : "Payé"}</option>
                <option value="en_attente">{isAr ? "قيد الانتظار" : "En attente"}</option>
                <option value="partiel">{isAr ? "دفع جزئي" : "Partiel"}</option>
              </select>
              {saleForm.paymentStatus === "partiel" && (
                <input dir="ltr" inputMode="decimal" value={saleForm.paidAmountDA} onChange={(e) => setSaleForm({ ...saleForm, paidAmountDA: e.target.value })} placeholder={isAr ? "المبلغ المقبوض (دج)" : "Montant encaissé (DA)"} className={`${cls} col-span-2`} />
              )}
            </div>
            <div className="flex justify-end gap-2 border-t pt-2.5">
              <button type="button" onClick={() => setSaleModalOpen(false)} className="rounded-lg border px-3 py-1.5 font-bold text-muted-foreground">
                {isAr ? "إلغاء" : "Annuler"}
              </button>
              <button type="button" onClick={saveOilSale} className="rounded-lg bg-emerald-700 text-white px-4 py-1.5 font-black cursor-pointer">
                <Plus className="h-3.5 w-3.5 inline mr-1" />
                <span>{isAr ? "تسجيل البيع" : "Enregistrer la vente"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
