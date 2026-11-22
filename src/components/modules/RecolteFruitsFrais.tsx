import { useMemo, useState } from "react";
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
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useTranslation } from "@/lib/i18n";
import { type Parcel } from "@/data/parcels";

export type FruitDestination = "mandataire" | "frigo" | "direct" | "mixte";
export type PaymentStatus = "paye" | "en_attente" | "partiel";

export interface FrigoExitEntry {
  id: string;
  date: string;
  mode: "mandataire" | "direct";
  buyerName: string;
  qty: number;
  unitPrice: number;
  commissionType?: "percent" | "fixed";
  commissionValue?: number;
  commissionAmount: number;
  grossAmount: number;
  netAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount?: number;
}

export interface FreshFruitHarvestRecord {
  id: string;
  createdAt: number;
  recordMode?: "fruits_frais";
  date: string;
  unit: "Kg" | "Caisses" | string;
  avgCrateWeightKg?: string;
  qty: string;
  totalKg?: number;
  price: string;
  // Tri & Calibres
  choix1Qty?: string;
  choix1Price?: string;
  choix2Qty?: string;
  choix2Price?: string;
  choix3Qty?: string;
  choix3Price?: string;
  choix4Qty?: string; // Industrie / Jus (rétrocompatible avec ancien Choix 4)
  choix4Price?: string;
  rebutQty?: string;
  rebutPercent?: number;
  // Destination
  destination?: FruitDestination;
  mandataireName?: string;
  mandataireQty?: string;
  mandatairePrice?: string;
  commissionType?: "percent" | "fixed";
  commissionValue?: string;
  commissionAmount?: number;
  paymentStatus?: PaymentStatus;
  paidAmount?: string;
  // Chambre froide (Frigo)
  frigoName?: string;
  frigoEntryDate?: string;
  frigoQty?: string;
  frigoRateType?: "per_crate" | "fixed";
  frigoRateValue?: string;
  frigoCost?: number;
  frigoExits?: FrigoExitEntry[];
  // Vente directe ferme
  directQty?: string;
  directPrice?: string;
  // Charges opérationnelles
  mainOeuvre: string;
  emballages?: string;
  transport: string;
  autres: string;
  // Totaux normalisés (pour Archive & Statistiques / Coûts par Espèce)
  totalVente?: number;
  totalCharges?: number;
  total?: number; // total_cost Supabase
  net?: number;
  notes: string;
  photo?: string;
}

function parseTreeCount(parcel?: Parcel): number {
  if (!parcel?.info) return 0;
  const raw = parcel.info.nbArbres || parcel.info.nbArbresParcelle || "";
  const cleaned = raw.replace(/\s+/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function RecolteFruitsFrais({
  parcelId,
  parcel,
  canEdit,
  prefillDate,
  prefillNotes,
}: {
  parcelId: string;
  parcel?: Parcel;
  canEdit: boolean;
  prefillDate?: string;
  prefillNotes?: string;
}) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const records = useModuleRecords<FreshFruitHarvestRecord>(parcelId, "recolte");
  const { add, update, remove } = useModuleActions();

  const treeCount = useMemo(() => parseTreeCount(parcel), [parcel]);

  const [f, setF] = useState({
    date: prefillDate || new Date().toISOString().slice(0, 10),
    unit: "Kg" as "Kg" | "Caisses",
    avgCrateWeightKg: "15",
    choix1Qty: "",
    choix1Price: "",
    choix2Qty: "",
    choix2Price: "",
    choix3Qty: "",
    choix3Price: "",
    choix4Qty: "",
    choix4Price: "",
    rebutQty: "",
    destination: "mandataire" as FruitDestination,
    // Mandataire
    mandataireName: "",
    mandataireQty: "",
    mandatairePrice: "",
    commissionType: "percent" as "percent" | "fixed",
    commissionValue: "8",
    paymentStatus: "paye" as PaymentStatus,
    paidAmount: "",
    // Chambre froide
    frigoName: "",
    frigoEntryDate: new Date().toISOString().slice(0, 10),
    frigoQty: "",
    frigoRateType: "per_crate" as "per_crate" | "fixed",
    frigoRateValue: "",
    // Vente directe
    directQty: "",
    directPrice: "",
    // Charges
    mainOeuvre: "",
    emballages: "",
    transport: "",
    autres: "",
    notes: prefillNotes || "",
    photo: undefined as string | undefined,
  });

  // Synchroniser si l'utilisateur clique "Utiliser cette date" depuis l'historique variétal
  const [lastPrefillDate, setLastPrefillDate] = useState(prefillDate);
  if (prefillDate && prefillDate !== lastPrefillDate) {
    setLastPrefillDate(prefillDate);
    setF((prev) => ({
      ...prev,
      date: prefillDate,
      frigoEntryDate: prefillDate,
      notes: prefillNotes || prev.notes,
    }));
  }

  // Modale de sortie / vente depuis la chambre froide
  const [exitRecord, setExitRecord] = useState<FreshFruitHarvestRecord | null>(null);
  const [exitForm, setExitForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    mode: "mandataire" as "mandataire" | "direct",
    buyerName: "",
    qty: "",
    unitPrice: "",
    commissionType: "percent" as "percent" | "fixed",
    commissionValue: "8",
    paymentStatus: "paye" as PaymentStatus,
    paidAmount: "",
  });

  // Calculs temps réel du formulaire
  const c1Q = parseFloat(f.choix1Qty) || 0;
  const c1P = parseFloat(f.choix1Price) || 0;
  const c2Q = parseFloat(f.choix2Qty) || 0;
  const c2P = parseFloat(f.choix2Price) || 0;
  const c3Q = parseFloat(f.choix3Qty) || 0;
  const c3P = parseFloat(f.choix3Price) || 0;
  const c4Q = parseFloat(f.choix4Qty) || 0;
  const c4P = parseFloat(f.choix4Price) || 0;
  const rebutQ = parseFloat(f.rebutQty) || 0;

  const marketableQty = c1Q + c2Q + c3Q + c4Q;
  const totalQty = marketableQty + rebutQ;
  const rebutPercent = totalQty > 0 ? (rebutQ / totalQty) * 100 : 0;

  const crateWeight = f.unit === "Caisses" ? Math.max(0.1, parseFloat(f.avgCrateWeightKg) || 15) : 1;
  const totalKg = totalQty * crateWeight;
  const yieldKgPerTree = treeCount > 0 ? totalKg / treeCount : 0;

  // Ventes brutes selon le mode de destination
  const triGrossSale = c1Q * c1P + c2Q * c2P + c3Q * c3P + c4Q * c4P;

  const mandataireGross = useMemo(() => {
    if (f.destination === "mandataire") {
      if (triGrossSale > 0) return triGrossSale;
      const mq = parseFloat(f.mandataireQty) || marketableQty;
      const mp = parseFloat(f.mandatairePrice) || 0;
      return mq * mp;
    }
    if (f.destination === "mixte") {
      return (parseFloat(f.mandataireQty) || 0) * (parseFloat(f.mandatairePrice) || 0);
    }
    return 0;
  }, [f.destination, f.mandataireQty, f.mandatairePrice, marketableQty, triGrossSale]);

  const directGross = useMemo(() => {
    if (f.destination === "direct") {
      if (triGrossSale > 0) return triGrossSale;
      const dq = parseFloat(f.directQty) || marketableQty;
      const dp = parseFloat(f.directPrice) || 0;
      return dq * dp;
    }
    if (f.destination === "mixte") {
      return (parseFloat(f.directQty) || 0) * (parseFloat(f.directPrice) || 0);
    }
    return 0;
  }, [f.destination, f.directQty, f.directPrice, marketableQty, triGrossSale]);

  const frigoStoredQty = useMemo(() => {
    if (f.destination === "frigo") return parseFloat(f.frigoQty) || marketableQty;
    if (f.destination === "mixte") return parseFloat(f.frigoQty) || 0;
    return 0;
  }, [f.destination, f.frigoQty, marketableQty]);

  const commissionVal = parseFloat(f.commissionValue) || 0;
  const commissionAmount =
    mandataireGross > 0
      ? f.commissionType === "percent"
        ? (mandataireGross * commissionVal) / 100
        : commissionVal
      : 0;

  const frigoRateVal = parseFloat(f.frigoRateValue) || 0;
  const frigoCost =
    frigoStoredQty > 0
      ? f.frigoRateType === "per_crate"
        ? frigoStoredQty * frigoRateVal
        : frigoRateVal
      : 0;

  const totalVenteBrut = mandataireGross + directGross;
  const totalCharges =
    (parseFloat(f.mainOeuvre) || 0) +
    (parseFloat(f.emballages) || 0) +
    (parseFloat(f.transport) || 0) +
    (parseFloat(f.autres) || 0) +
    frigoCost +
    commissionAmount;
  const netResult = totalVenteBrut - totalCharges;

  const mandataireResteDu =
    f.paymentStatus === "en_attente"
      ? Math.max(0, mandataireGross - commissionAmount)
      : f.paymentStatus === "partiel"
        ? Math.max(0, mandataireGross - commissionAmount - (parseFloat(f.paidAmount) || 0))
        : 0;

  // KPI cumulés de la campagne sur la parcelle
  const campaignKpis = useMemo(() => {
    let sumKg = 0;
    let sumFrigoStockKg = 0;
    let sumFrigoStockUnits = 0;
    let sumVentes = 0;
    let sumCharges = 0;

    for (const r of records) {
      const rUnitWeight = r.unit === "Caisses" ? Math.max(0.1, parseFloat(r.avgCrateWeightKg || "15") || 15) : 1;
      const rQty = parseFloat(r.qty || "0") || 0;
      const rKg = typeof r.totalKg === "number" ? r.totalKg : rQty * rUnitWeight;
      sumKg += rKg;

      const initFrigo = parseFloat(r.frigoQty || "0") || 0;
      const exited = (r.frigoExits || []).reduce((s, ex) => s + (ex.qty || 0), 0);
      const remFrigo = Math.max(0, initFrigo - exited);
      sumFrigoStockUnits += remFrigo;
      sumFrigoStockKg += remFrigo * rUnitWeight;

      const exitsGross = (r.frigoExits || []).reduce((s, ex) => s + (ex.grossAmount || 0), 0);
      const exitsComm = (r.frigoExits || []).reduce((s, ex) => s + (ex.commissionAmount || 0), 0);

      const hasNew = typeof r.totalVente === "number";
      const baseVente = hasNew
        ? r.totalVente!
        : (parseFloat(r.choix1Qty || "0") * parseFloat(r.choix1Price || "0") +
            parseFloat(r.choix2Qty || "0") * parseFloat(r.choix2Price || "0") +
            parseFloat(r.choix3Qty || "0") * parseFloat(r.choix3Price || "0") +
            parseFloat(r.choix4Qty || "0") * parseFloat(r.choix4Price || "0")) ||
          rQty * (parseFloat(r.price || "0") || 0);

      const baseCharges =
        typeof r.totalCharges === "number"
          ? r.totalCharges
          : (parseFloat(r.mainOeuvre || "0") || 0) +
            (parseFloat(r.emballages || "0") || 0) +
            (parseFloat(r.transport || "0") || 0) +
            (parseFloat(r.autres || "0") || 0) +
            (r.frigoCost || 0) +
            (r.commissionAmount || 0);

      sumVentes += baseVente + exitsGross;
      sumCharges += baseCharges + exitsComm;
    }

    return {
      sumKg,
      yieldPerTree: treeCount > 0 ? sumKg / treeCount : 0,
      sumFrigoStockKg,
      sumFrigoStockUnits,
      sumVentes,
      sumCharges,
      sumNet: sumVentes - sumCharges,
    };
  }, [records, treeCount]);

  function onPhoto(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setF((p) => ({ ...p, photo: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function save() {
    if (!f.date || totalQty <= 0) {
      toast.error(isAr ? "يرجى تحديد التاريخ والكمية المحصودة" : "Veuillez renseigner la date et les quantités récoltées.");
      return;
    }

    const weightedPrice = marketableQty > 0 ? totalVenteBrut / marketableQty : 0;
    const payload: Omit<FreshFruitHarvestRecord, "id" | "createdAt"> = {
      recordMode: "fruits_frais",
      date: f.date,
      unit: f.unit,
      avgCrateWeightKg: f.unit === "Caisses" ? f.avgCrateWeightKg : undefined,
      qty: totalQty.toString(),
      totalKg,
      price: weightedPrice.toFixed(2),
      choix1Qty: f.choix1Qty,
      choix1Price: f.choix1Price,
      choix2Qty: f.choix2Qty,
      choix2Price: f.choix2Price,
      choix3Qty: f.choix3Qty,
      choix3Price: f.choix3Price,
      choix4Qty: f.choix4Qty,
      choix4Price: f.choix4Price,
      rebutQty: f.rebutQty,
      rebutPercent: Math.round(rebutPercent * 10) / 10,
      destination: f.destination,
      mandataireName: f.mandataireName.trim() || undefined,
      mandataireQty: f.destination === "mandataire" ? String(parseFloat(f.mandataireQty) || marketableQty) : f.mandataireQty,
      mandatairePrice: f.mandatairePrice,
      commissionType: f.commissionType,
      commissionValue: f.commissionValue,
      commissionAmount,
      paymentStatus: f.paymentStatus,
      paidAmount: f.paidAmount,
      frigoName: f.frigoName.trim() || undefined,
      frigoEntryDate: frigoStoredQty > 0 ? f.frigoEntryDate || f.date : undefined,
      frigoQty: frigoStoredQty > 0 ? String(frigoStoredQty) : "",
      frigoRateType: f.frigoRateType,
      frigoRateValue: f.frigoRateValue,
      frigoCost,
      frigoExits: [],
      directQty: f.destination === "direct" ? String(parseFloat(f.directQty) || marketableQty) : f.directQty,
      directPrice: f.directPrice,
      mainOeuvre: f.mainOeuvre,
      emballages: f.emballages,
      transport: f.transport,
      autres: f.autres,
      totalVente: totalVenteBrut,
      totalCharges,
      total: totalCharges,
      net: netResult,
      notes: f.notes,
      photo: f.photo,
    };

    add(parcelId, "recolte", payload);
    toast.success(isAr ? "تم تسجيل الجني بنجاح" : "Récolte enregistrée !");
    setF((prev) => ({
      ...prev,
      choix1Qty: "",
      choix1Price: "",
      choix2Qty: "",
      choix2Price: "",
      choix3Qty: "",
      choix3Price: "",
      choix4Qty: "",
      choix4Price: "",
      rebutQty: "",
      mandataireQty: "",
      mandatairePrice: "",
      frigoQty: "",
      directQty: "",
      directPrice: "",
      mainOeuvre: "",
      emballages: "",
      transport: "",
      autres: "",
      notes: "",
      photo: undefined,
    }));
  }

  function saveFrigoExit() {
    if (!exitRecord) return;
    const qtyNum = parseFloat(exitForm.qty) || 0;
    const unitP = parseFloat(exitForm.unitPrice) || 0;
    if (qtyNum <= 0 || unitP <= 0) {
      toast.error(isAr ? "أدخل الكمية وسعر البيع" : "Indiquez la quantité et le prix unitaire.");
      return;
    }

    const initFrigo = parseFloat(exitRecord.frigoQty || "0") || 0;
    const alreadyExited = (exitRecord.frigoExits || []).reduce((s, e) => s + e.qty, 0);
    const remaining = Math.max(0, initFrigo - alreadyExited);
    if (qtyNum > remaining + 0.001) {
      toast.error(
        isAr
          ? `الكمية تتجاوز المخزون المتبقي في التبريد (${remaining})`
          : `La quantité dépasse le stock restant en chambre froide (${remaining}).`
      );
      return;
    }

    const gross = qtyNum * unitP;
    const commVal = parseFloat(exitForm.commissionValue) || 0;
    const commAmt =
      exitForm.mode === "mandataire"
        ? exitForm.commissionType === "percent"
          ? (gross * commVal) / 100
          : commVal
        : 0;

    const newExit: FrigoExitEntry = {
      id: crypto.randomUUID(),
      date: exitForm.date,
      mode: exitForm.mode,
      buyerName: exitForm.buyerName.trim() || (exitForm.mode === "mandataire" ? "Mandataire" : "Direct"),
      qty: qtyNum,
      unitPrice: unitP,
      commissionType: exitForm.mode === "mandataire" ? exitForm.commissionType : undefined,
      commissionValue: exitForm.mode === "mandataire" ? commVal : undefined,
      commissionAmount: commAmt,
      grossAmount: gross,
      netAmount: gross - commAmt,
      paymentStatus: exitForm.paymentStatus,
      paidAmount: exitForm.paymentStatus === "partiel" ? parseFloat(exitForm.paidAmount) || 0 : undefined,
    };

    const nextExits = [...(exitRecord.frigoExits || []), newExit];
    const totalExitsGross = nextExits.reduce((s, e) => s + e.grossAmount, 0);
    const totalExitsComm = nextExits.reduce((s, e) => s + e.commissionAmount, 0);
    const nextTotalCharges = (exitRecord.totalCharges ?? 0) + commAmt;
    const nextNet = (exitRecord.totalVente ?? 0) + totalExitsGross - ((exitRecord.totalCharges ?? 0) + totalExitsComm);

    update(parcelId, "recolte", exitRecord.id, {
      frigoExits: nextExits,
      total: nextTotalCharges,
      net: nextNet,
    });

    toast.success(isAr ? "تم تسجيل خروج/بيع من غرفة التبريد" : "Sortie / vente depuis le frigo enregistrée !");
    setExitRecord(null);
    setExitForm({
      date: new Date().toISOString().slice(0, 10),
      mode: "mandataire",
      buyerName: "",
      qty: "",
      unitPrice: "",
      commissionType: "percent",
      commissionValue: "8",
      paymentStatus: "paye",
      paidAmount: "",
    });
  }

  const cls = "rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs sm:text-sm w-full";

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {/* KPI Cumulés Campagne Fruits Frais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="rounded-xl border bg-card p-3">
          <span className="text-[10px] font-bold text-muted-foreground block">
            {isAr ? "الكمية الإجمالية" : "Quantité totale"}
          </span>
          <p dir="ltr" className="text-base sm:text-lg font-black text-foreground">
            {campaignKpis.sumKg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Kg
          </p>
          {treeCount > 0 && (
            <span dir="ltr" className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              {campaignKpis.yieldPerTree.toFixed(1)} Kg/{isAr ? "شجرة" : "arbre"}
            </span>
          )}
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
          <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
            <Snowflake className="h-3 w-3" />
            <span>{isAr ? "مخزون غرفة التبريد" : "Stock chambre froide"}</span>
          </span>
          <p dir="ltr" className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-300">
            {campaignKpis.sumFrigoStockKg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Kg
          </p>
          {campaignKpis.sumFrigoStockUnits > 0 && (
            <span className="text-[10px] text-muted-foreground font-semibold">
              {isAr ? "متاح للبيع التدريجي" : "Disponible pour sorties"}
            </span>
          )}
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{isAr ? "صافي النتيجة" : "Résultat Net"}</span>
          </span>
          <p dir="ltr" className={`text-base sm:text-lg font-black ${campaignKpis.sumNet >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>
            {campaignKpis.sumNet.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DA
          </p>
          <span dir="ltr" className="text-[10px] text-muted-foreground font-semibold">
            {isAr ? "مبيعات" : "Ventes"}: {campaignKpis.sumVentes.toFixed(0)} · {isAr ? "تكاليف" : "Charges"}: {campaignKpis.sumCharges.toFixed(0)}
          </span>
        </div>
      </div>

      {/* FORMULAIRE SALLE DE TRI & DESTINATION */}
      {canEdit && (
        <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b pb-2.5">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span>{isAr ? "جني جديد (قاعة الفرز — فواكه طازجة)" : "Nouvelle récolte (Salle de tri — Fruits frais)"}</span>
            </h3>
            {treeCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                🌳 <span dir="ltr">{treeCount}</span> {isAr ? "شجرة" : "arbres"}
              </span>
            )}
          </div>

          {/* Date, Unité & Poids moyen par caisse */}
          <div className={`grid gap-2.5 ${f.unit === "Caisses" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                {isAr ? "تاريخ الجني" : "Date de récolte"}
              </label>
              <input type="date" dir="ltr" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                {isAr ? "وحدة القياس" : "Unité"}
              </label>
              <select
                value={f.unit}
                onChange={(e) => setF({ ...f, unit: e.target.value as "Kg" | "Caisses" })}
                className={cls}
              >
                <option value="Kg">Kg</option>
                <option value="Caisses">{isAr ? "صناديق (Caisses)" : "Caisses"}</option>
              </select>
            </div>
            {f.unit === "Caisses" && (
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  {isAr ? "متوسط وزن الصندوق (كغ)" : "Poids moyen / caisse (Kg)"}
                </label>
                <input
                  type="number"
                  dir="ltr"
                  inputMode="decimal"
                  value={f.avgCrateWeightKg}
                  onChange={(e) => setF({ ...f, avgCrateWeightKg: e.target.value })}
                  placeholder="15"
                  className={cls}
                />
              </div>
            )}
          </div>

          {/* Tri & Calibres */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wide text-primary">
                {isAr ? "الفرز والأحجام" : "Tri & Calibres"}
              </h4>
              {totalQty > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${rebutPercent > 15 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                  {isAr ? "نسبة الفضلات :" : "Rebut :"} <strong dir="ltr">{rebutPercent.toFixed(1)}%</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-center bg-muted/20 p-2.5 rounded-xl">
              <span className="text-xs font-bold">{isAr ? "النوع الأول (Choix 1)" : "Choix 1"}</span>
              <input value={f.choix1Qty} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, choix1Qty: e.target.value })} placeholder={isAr ? "الكمية" : "Quantité"} className={cls} />
              <input value={f.choix1Price} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, choix1Price: e.target.value })} placeholder={isAr ? "السعر (دج)" : "Prix (DA)"} className={cls} />

              <span className="text-xs font-bold">{isAr ? "النوع الثاني (Choix 2)" : "Choix 2"}</span>
              <input value={f.choix2Qty} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, choix2Qty: e.target.value })} placeholder={isAr ? "الكمية" : "Quantité"} className={cls} />
              <input value={f.choix2Price} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, choix2Price: e.target.value })} placeholder={isAr ? "السعر (دج)" : "Prix (DA)"} className={cls} />

              <span className="text-xs font-bold">{isAr ? "النوع الثالث (Choix 3)" : "Choix 3"}</span>
              <input value={f.choix3Qty} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, choix3Qty: e.target.value })} placeholder={isAr ? "الكمية" : "Quantité"} className={cls} />
              <input value={f.choix3Price} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, choix3Price: e.target.value })} placeholder={isAr ? "السعر (دج)" : "Prix (DA)"} className={cls} />

              <span className="text-xs font-bold">{isAr ? "صناعي / عصير" : "Industrie / Jus"}</span>
              <input value={f.choix4Qty} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, choix4Qty: e.target.value })} placeholder={isAr ? "الكمية" : "Quantité"} className={cls} />
              <input value={f.choix4Price} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, choix4Price: e.target.value })} placeholder={isAr ? "السعر (دج)" : "Prix (DA)"} className={cls} />

              <span className="text-xs font-bold text-destructive">{isAr ? "فضلات (Rebut)" : "Rebut (déchets)"}</span>
              <input
                value={f.rebutQty}
                dir="ltr"
                inputMode="decimal"
                onChange={(e) => setF({ ...f, rebutQty: e.target.value })}
                placeholder={isAr ? "الكمية التالفة" : "Quantité jetée"}
                className="col-span-2 rounded-lg border border-destructive/30 bg-background px-2.5 py-1.5 text-xs sm:text-sm w-full text-destructive"
              />
            </div>
          </div>

          {/* Destination du lot */}
          <div className="border-t pt-3 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wide text-primary">
              {isAr ? "وجهة المحصول (3 خيارات أو مختلط)" : "Destination du lot"}
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: "mandataire", fr: "🤝 Mandataire", ar: "🤝 وكيل سوق" },
                  { id: "frigo", fr: "❄️ Chambre Froide", ar: "❄️ غرفة تبريد" },
                  { id: "direct", fr: "🏪 Vente directe", ar: "🏪 بيع مباشر" },
                  { id: "mixte", fr: "🔀 Mixte", ar: "🔀 مختلط" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setF({ ...f, destination: opt.id })}
                  className={`rounded-xl border px-2.5 py-2 text-xs font-bold transition cursor-pointer ${
                    f.destination === opt.id
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/30 text-foreground hover:bg-muted"
                  }`}
                >
                  {isAr ? opt.ar : opt.fr}
                </button>
              ))}
            </div>

            {/* Bloc 1 : Vente Mandataire */}
            {(f.destination === "mandataire" || f.destination === "mixte") && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2.5">
                <p className="text-xs font-black text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                  <Handshake className="h-3.5 w-3.5" />
                  <span>{isAr ? "بيع عبر وكيل السوق (Mandataire)" : "Vente Mandataire"}</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={f.mandataireName}
                    onChange={(e) => setF({ ...f, mandataireName: e.target.value })}
                    placeholder={isAr ? "اسم الوكيل / سوق الجملة" : "Nom du mandataire"}
                    className={cls}
                  />
                  {f.destination === "mixte" && (
                    <>
                      <input
                        value={f.mandataireQty}
                        dir="ltr"
                        inputMode="decimal"
                        onChange={(e) => setF({ ...f, mandataireQty: e.target.value })}
                        placeholder={`${isAr ? "الكمية" : "Quantité"} (${f.unit})`}
                        className={cls}
                      />
                      <input
                        value={f.mandatairePrice}
                        dir="ltr"
                        inputMode="decimal"
                        onChange={(e) => setF({ ...f, mandatairePrice: e.target.value })}
                        placeholder={isAr ? "السعر / وحدة (دج)" : "Prix / unité (DA)"}
                        className={cls}
                      />
                    </>
                  )}
                  {f.destination === "mandataire" && triGrossSale === 0 && (
                    <input
                      value={f.mandatairePrice}
                      dir="ltr"
                      inputMode="decimal"
                      onChange={(e) => setF({ ...f, mandatairePrice: e.target.value })}
                      placeholder={isAr ? "سعر موحد / وحدة (دج)" : "Prix moyen / unité (DA)"}
                      className={cls}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <select
                    value={f.commissionType}
                    onChange={(e) => setF({ ...f, commissionType: e.target.value as "percent" | "fixed" })}
                    className={cls}
                  >
                    <option value="percent">{isAr ? "عمولة (%)" : "Commission (%)"}</option>
                    <option value="fixed">{isAr ? "عمولة ثابتة (دج)" : "Commission fixe (DA)"}</option>
                  </select>
                  <input
                    value={f.commissionValue}
                    dir="ltr"
                    inputMode="decimal"
                    onChange={(e) => setF({ ...f, commissionValue: e.target.value })}
                    placeholder={f.commissionType === "percent" ? "8 %" : "DA"}
                    className={cls}
                  />
                  <select
                    value={f.paymentStatus}
                    onChange={(e) => setF({ ...f, paymentStatus: e.target.value as PaymentStatus })}
                    className={cls}
                  >
                    <option value="paye">{isAr ? "مدفوع" : "Payé"}</option>
                    <option value="en_attente">{isAr ? "قيد الانتظار" : "En attente"}</option>
                    <option value="partiel">{isAr ? "دفع جزئي" : "Partiel"}</option>
                  </select>
                  {f.paymentStatus === "partiel" && (
                    <input
                      value={f.paidAmount}
                      dir="ltr"
                      inputMode="decimal"
                      onChange={(e) => setF({ ...f, paidAmount: e.target.value })}
                      placeholder={isAr ? "المبلغ المقبوض (دج)" : "Montant payé (DA)"}
                      className={cls}
                    />
                  )}
                </div>
                {mandataireResteDu > 0 && (
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{isAr ? "المبلغ المتبقي للدفع :" : "Reste dû :"}</span>
                    <strong dir="ltr">{mandataireResteDu.toFixed(0)} DA</strong>
                  </p>
                )}
              </div>
            )}

            {/* Bloc 2 : Chambre Froide (Frigo) */}
            {(f.destination === "frigo" || f.destination === "mixte") && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 space-y-2.5">
                <p className="text-xs font-black text-sky-800 dark:text-sky-200 flex items-center gap-1.5">
                  <Snowflake className="h-3.5 w-3.5" />
                  <span>{isAr ? "تخزين في غرفة التبريد (Frigo)" : "Chambre Froide (Frigo)"}</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    value={f.frigoName}
                    onChange={(e) => setF({ ...f, frigoName: e.target.value })}
                    placeholder={isAr ? "اسم غرفة التبريد" : "Nom du frigo"}
                    className={cls}
                  />
                  <input
                    type="date"
                    dir="ltr"
                    value={f.frigoEntryDate}
                    onChange={(e) => setF({ ...f, frigoEntryDate: e.target.value })}
                    className={cls}
                  />
                  <input
                    value={f.frigoQty}
                    dir="ltr"
                    inputMode="decimal"
                    onChange={(e) => setF({ ...f, frigoQty: e.target.value })}
                    placeholder={`${isAr ? "الكمية المخزنة" : "Qté stockée"} (${marketableQty || 0})`}
                    className={cls}
                  />
                  <div className="flex gap-1">
                    <select
                      value={f.frigoRateType}
                      onChange={(e) => setF({ ...f, frigoRateType: e.target.value as "per_crate" | "fixed" })}
                      className="rounded-lg border border-input bg-background px-1.5 py-1 text-[11px] font-bold"
                    >
                      <option value="per_crate">{isAr ? "دج/وحدة" : "DA/u"}</option>
                      <option value="fixed">{isAr ? "جزافي" : "Forfait"}</option>
                    </select>
                    <input
                      value={f.frigoRateValue}
                      dir="ltr"
                      inputMode="decimal"
                      onChange={(e) => setF({ ...f, frigoRateValue: e.target.value })}
                      placeholder="DA"
                      className={cls}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bloc 3 : Vente directe ferme */}
            {(f.destination === "direct" || f.destination === "mixte") && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                <p className="text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" />
                  <span>{isAr ? "بيع مباشر من الضيعة (بدون عمولة)" : "Vente directe ferme (sans commission)"}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={f.directQty}
                    dir="ltr"
                    inputMode="decimal"
                    onChange={(e) => setF({ ...f, directQty: e.target.value })}
                    placeholder={`${isAr ? "الكمية" : "Quantité"} (${f.unit})`}
                    className={cls}
                  />
                  <input
                    value={f.directPrice}
                    dir="ltr"
                    inputMode="decimal"
                    onChange={(e) => setF({ ...f, directPrice: e.target.value })}
                    placeholder={isAr ? "السعر / وحدة (دج)" : "Prix unitaire (DA)"}
                    className={cls}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Charges opérationnelles (DA) */}
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-primary">
              {isAr ? "التكاليف التشغيلية (دج)" : "Charges opérationnelles (DA)"}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input value={f.mainOeuvre} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, mainOeuvre: e.target.value })} placeholder={isAr ? "اليد العاملة للجني" : "Main-d'œuvre"} className={cls} />
              <input value={f.emballages} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, emballages: e.target.value })} placeholder={isAr ? "الصناديق / التغليف" : "Emballages / Caisses"} className={cls} />
              <input value={f.transport} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, transport: e.target.value })} placeholder={isAr ? "النقل" : "Transport"} className={cls} />
              <input value={f.autres} dir="ltr" inputMode="decimal" onChange={(e) => setF({ ...f, autres: e.target.value })} placeholder={isAr ? "مصاريف أخرى" : "Autres"} className={cls} />
            </div>
          </div>

          {/* Photo & Notes */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-input px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>{f.photo ? (isAr ? "تمت إضافة الصورة ✓" : "Photo ajoutée ✓") : isAr ? "صورة الجني" : "Photo de la récolte"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
          </div>

          <textarea
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder={isAr ? "ملاحظات..." : "Notes..."}
            className={`${cls} min-h-14 resize-y`}
          />

          {/* Résumé automatique */}
          <div className="space-y-1.5 rounded-xl bg-muted/35 border p-3.5 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span>{isAr ? "الكمية الإجمالية" : "Quantité totale"}</span>
              <b dir="ltr">
                {totalKg.toFixed(1)} Kg {f.unit === "Caisses" ? `(${totalQty} c.)` : ""}
              </b>
            </div>
            {treeCount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                <span>{isAr ? "المردودية" : "Rendement"}</span>
                <b dir="ltr">{yieldKgPerTree.toFixed(2)} Kg/{isAr ? "شجرة" : "arbre"}</b>
              </div>
            )}
            {frigoStoredQty > 0 && (
              <div className="flex justify-between text-sky-700 dark:text-sky-300">
                <span>{isAr ? "مخزون في غرفة التبريد" : "Stocké en chambre froide"}</span>
                <b dir="ltr">{frigoStoredQty} {f.unit} ({(frigoStoredQty * crateWeight).toFixed(0)} Kg)</b>
              </div>
            )}
            <div className="flex justify-between">
              <span>{isAr ? "إجمالي البيع الخام" : "Total Vente brut"}</span>
              <b dir="ltr">{totalVenteBrut.toFixed(0)} DA</b>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                {isAr ? "إجمالي التكاليف" : "Total Charges"}
                {commissionAmount > 0 ? ` (${isAr ? "عمولة" : "comm."} ${commissionAmount.toFixed(0)})` : ""}
                {frigoCost > 0 ? ` (${isAr ? "تبريد" : "frigo"} ${frigoCost.toFixed(0)})` : ""}
              </span>
              <span dir="ltr">− {totalCharges.toFixed(0)} DA</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 text-sm sm:text-base font-black">
              <span>{isAr ? "الصافي" : "Net"}</span>
              <span dir="ltr" className={netResult >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>
                {netResult.toFixed(0)} DA
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={!f.date || totalQty <= 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isAr ? "حفظ الجني" : "Enregistrer la récolte"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ARCHIVE DES LOTS + SORTIES FRIGO */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-black">
          <History className="h-4 w-4 text-primary" />
          <span>{isAr ? `الأرشيف (${records.length})` : `Archive (${records.length})`}</span>
        </div>

        {records.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {isAr ? "لا توجد عمليات جني مسجلة." : "Aucune récolte enregistrée."}
          </p>
        ) : (
          <ul className="divide-y">
            {records.map((r) => {
              const rQty = parseFloat(r.qty || "0") || 0;
              const rUnitWeight = r.unit === "Caisses" ? Math.max(0.1, parseFloat(r.avgCrateWeightKg || "15") || 15) : 1;
              const rKg = typeof r.totalKg === "number" ? r.totalKg : rQty * rUnitWeight;
              const initFrigo = parseFloat(r.frigoQty || "0") || 0;
              const exitedFrigo = (r.frigoExits || []).reduce((s, e) => s + e.qty, 0);
              const remFrigo = Math.max(0, initFrigo - exitedFrigo);
              const exitsGross = (r.frigoExits || []).reduce((s, e) => s + e.grossAmount, 0);
              const exitsComm = (r.frigoExits || []).reduce((s, e) => s + e.commissionAmount, 0);

              const baseVente =
                typeof r.totalVente === "number"
                  ? r.totalVente
                  : (parseFloat(r.choix1Qty || "0") * parseFloat(r.choix1Price || "0") +
                      parseFloat(r.choix2Qty || "0") * parseFloat(r.choix2Price || "0") +
                      parseFloat(r.choix3Qty || "0") * parseFloat(r.choix3Price || "0") +
                      parseFloat(r.choix4Qty || "0") * parseFloat(r.choix4Price || "0")) ||
                    rQty * (parseFloat(r.price || "0") || 0);

              const baseCharges =
                typeof r.totalCharges === "number"
                  ? r.totalCharges
                  : (parseFloat(r.mainOeuvre || "0") || 0) +
                    (parseFloat(r.emballages || "0") || 0) +
                    (parseFloat(r.transport || "0") || 0) +
                    (parseFloat(r.autres || "0") || 0) +
                    (r.frigoCost || 0) +
                    (r.commissionAmount || 0);

              const tv = baseVente + exitsGross;
              const ch = baseCharges + exitsComm;
              const netVal = tv - ch;

              return (
                <li key={r.id} className="p-3.5 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span dir="ltr" className="font-black text-foreground">{r.date}</span>
                      <span className="font-bold text-muted-foreground">—</span>
                      <span dir="ltr" className="font-black text-primary">
                        {rKg.toFixed(1)} Kg {r.unit === "Caisses" ? `(${r.qty} c.)` : ""}
                      </span>
                      {r.destination && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                          {r.destination === "frigo"
                            ? "❄️ Frigo"
                            : r.destination === "mandataire"
                              ? `🤝 ${r.mandataireName || "Mandataire"}`
                              : r.destination === "direct"
                                ? "🏪 Direct"
                                : "🔀 Mixte"}
                        </span>
                      )}
                      {r.paymentStatus && r.paymentStatus !== "paye" && (
                        <span className="rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                          {r.paymentStatus === "en_attente"
                            ? isAr ? "قيد الانتظار" : "En attente"
                            : isAr ? "دفع جزئي" : "Partiel"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span dir="ltr" className={`font-black ${netVal >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>
                        Net {netVal.toFixed(0)} DA
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => remove(parcelId, "recolte", r.id)}
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                          title={isAr ? "حذف" : "Supprimer"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stock Frigo & Sorties */}
                  {initFrigo > 0 && (
                    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-2.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-sky-800 dark:text-sky-200 flex items-center gap-1">
                          <Snowflake className="h-3.5 w-3.5" />
                          <span>
                            {r.frigoName || (isAr ? "غرفة التبريد" : "Chambre froide")} :{" "}
                            <strong dir="ltr">{remFrigo} / {initFrigo} {r.unit}</strong>{" "}
                            {isAr ? "متبقي" : "restants"}
                          </span>
                        </span>
                        {canEdit && remFrigo > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setExitRecord(r);
                              setExitForm((prev) => ({ ...prev, qty: String(remFrigo) }));
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 text-[10px] font-black cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{isAr ? "خروج / بيع من التبريد" : "Sortie / Vente frigo"}</span>
                          </button>
                        )}
                      </div>

                      {(r.frigoExits || []).length > 0 && (
                        <div className="space-y-1 border-t border-sky-500/20 pt-1.5">
                          {(r.frigoExits || []).map((ex) => (
                            <div key={ex.id} className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
                              <span>
                                <strong dir="ltr">{ex.date}</strong> · {ex.buyerName} (<span dir="ltr">{ex.qty} {r.unit} × {ex.unitPrice} DA</span>)
                              </span>
                              <span dir="ltr" className="font-bold text-emerald-700 dark:text-emerald-300">
                                +{ex.netAmount.toFixed(0)} DA
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span dir="ltr">{isAr ? "مبيعات" : "Ventes"}: {tv.toFixed(0)} DA</span>
                    <span dir="ltr">{isAr ? "تكاليف" : "Charges"}: {ch.toFixed(0)} DA</span>
                    {typeof r.rebutPercent === "number" && r.rebutPercent > 0 && (
                      <span dir="ltr" className="text-destructive font-semibold">
                        {isAr ? "فضلات" : "Rebut"}: {r.rebutPercent}%
                      </span>
                    )}
                  </div>
                  {r.notes && <p className="text-[11px] italic text-muted-foreground">{r.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modale Sortie / Vente depuis la Chambre Froide */}
      {exitRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-black text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Snowflake className="h-4 w-4" />
                <span>{isAr ? "تسجيل خروج / بيع من غرفة التبريد" : "Sortie / Vente depuis le Frigo"}</span>
              </h4>
              <button type="button" onClick={() => setExitRecord(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "التاريخ" : "Date"}</label>
                <input type="date" dir="ltr" value={exitForm.date} onChange={(e) => setExitForm({ ...exitForm, date: e.target.value })} className={cls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "نوع البيع" : "Mode"}</label>
                <select value={exitForm.mode} onChange={(e) => setExitForm({ ...exitForm, mode: e.target.value as "mandataire" | "direct" })} className={cls}>
                  <option value="mandataire">{isAr ? "وكيل سوق" : "Mandataire"}</option>
                  <option value="direct">{isAr ? "بيع مباشر" : "Vente directe"}</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "المشتري / الوكيل" : "Mandataire / Client"}</label>
                <input value={exitForm.buyerName} onChange={(e) => setExitForm({ ...exitForm, buyerName: e.target.value })} placeholder={isAr ? "الاسم..." : "Nom..."} className={cls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "الكمية" : "Quantité"} ({exitRecord.unit})</label>
                <input dir="ltr" inputMode="decimal" value={exitForm.qty} onChange={(e) => setExitForm({ ...exitForm, qty: e.target.value })} className={cls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "السعر / وحدة (دج)" : "Prix / unité (DA)"}</label>
                <input dir="ltr" inputMode="decimal" value={exitForm.unitPrice} onChange={(e) => setExitForm({ ...exitForm, unitPrice: e.target.value })} className={cls} />
              </div>
              {exitForm.mode === "mandataire" && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "العمولة" : "Commission"}</label>
                    <select value={exitForm.commissionType} onChange={(e) => setExitForm({ ...exitForm, commissionType: e.target.value as "percent" | "fixed" })} className={cls}>
                      <option value="percent">%</option>
                      <option value="fixed">DA</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">{isAr ? "قيمة العمولة" : "Valeur"}</label>
                    <input dir="ltr" inputMode="decimal" value={exitForm.commissionValue} onChange={(e) => setExitForm({ ...exitForm, commissionValue: e.target.value })} className={cls} />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-2.5">
              <button type="button" onClick={() => setExitRecord(null)} className="rounded-lg border px-3 py-1.5 font-bold text-muted-foreground">
                {isAr ? "إلغاء" : "Annuler"}
              </button>
              <button type="button" onClick={saveFrigoExit} className="rounded-lg bg-sky-600 text-white px-4 py-1.5 font-black cursor-pointer">
                {isAr ? "تسجيل الخروج" : "Valider la sortie"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
