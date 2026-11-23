import { useMemo, useState } from "react";
import {
  Snowflake,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Printer,
  ArrowUpRight,
  Package,
  Coins,
  TrendingUp,
  Warehouse,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { formatDA, formatDateFR, formatNumber } from "@/lib/format";
import {
  useFrigoNegoceStore,
  getChargesForCampaign,
  sumInstallationCharges,
  type FrigoChambreId,
  type FrigoPurchaseEntry,
} from "@/lib/frigo-negoce-store";

function parseNum(v: string | number | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

interface Props {
  selectedCampaign: string;
  isAr: boolean;
}

export function ChambreFroideNegoceSection({ selectedCampaign, isAr }: Props) {
  const {
    entries,
    chargesByCampaign,
    exits,
    addEntry,
    updateEntry,
    removeEntry,
    updateCharges,
    addExit,
    removeExit,
  } = useFrigoNegoceStore();

  const effectiveCampaign = selectedCampaign === "all" ? "2026" : selectedCampaign;

  // Filtrage par campagne
  const campaignEntries = useMemo(
    () => (selectedCampaign === "all" ? entries : entries.filter((e) => e.campaign === selectedCampaign)),
    [entries, selectedCampaign],
  );
  const campaignExits = useMemo(
    () => (selectedCampaign === "all" ? exits : exits.filter((x) => x.campaign === selectedCampaign)),
    [exits, selectedCampaign],
  );
  const charges = useMemo(
    () => getChargesForCampaign(chargesByCampaign, selectedCampaign),
    [chargesByCampaign, selectedCampaign],
  );

  // Calculs consolidés par chambre & globaux
  const stats = useMemo(() => {
    const byRoom = (chambre: FrigoChambreId) => {
      const list = campaignEntries.filter((e) => e.chambre === chambre);
      const roomExits = campaignExits.filter((x) => x.chambre === chambre);
      const cajousEntres = list.reduce((s, e) => s + e.nbCajous, 0);
      const poidsNetEntreKg = list.reduce((s, e) => s + e.poidsNetKg, 0);
      const poidsArrondiKg = list.reduce((s, e) => s + e.poidsNetArrondiKg, 0);
      const totalPayementDA = list.reduce((s, e) => s + e.totalPayementDA, 0);
      const cajousSortis = roomExits.reduce((s, x) => s + x.nbCajousSortis, 0);
      const poidsSortiKg = roomExits.reduce((s, x) => s + x.poidsSortiKg, 0);
      return {
        list,
        cajousEntres,
        poidsNetEntreKg,
        poidsArrondiKg,
        totalPayementDA,
        cajousSortis,
        poidsSortiKg,
        cajousRestants: Math.max(0, cajousEntres - cajousSortis),
        poidsRestantKg: Math.max(0, poidsNetEntreKg - poidsSortiKg),
        prixMoyenKg: poidsNetEntreKg > 0 ? totalPayementDA / poidsNetEntreKg : 0,
      };
    };

    const grande = byRoom("grande");
    const petite = byRoom("petite");

    const totalCajous = grande.cajousEntres + petite.cajousEntres;
    const totalPoidsNetKg = grande.poidsNetEntreKg + petite.poidsNetEntreKg;
    const totalCajousSortis = grande.cajousSortis + petite.cajousSortis;
    const totalPoidsSortiKg = grande.poidsSortiKg + petite.poidsSortiKg;
    const stockRestantCajous = Math.max(0, totalCajous - totalCajousSortis);
    const stockRestantKg = Math.max(0, totalPoidsNetKg - totalPoidsSortiKg);

    const coutAchatSansChargesDA = grande.totalPayementDA + petite.totalPayementDA;
    const prixMoyenSansChargesKg = totalPoidsNetKg > 0 ? coutAchatSansChargesDA / totalPoidsNetKg : 0;

    const totalChargesDA = sumInstallationCharges(charges);
    const coutRevientTotalDA = coutAchatSansChargesDA + totalChargesDA;
    const seuilRentabiliteKg = totalPoidsNetKg > 0 ? coutRevientTotalDA / totalPoidsNetKg : 0;
    const chargesParKg = totalPoidsNetKg > 0 ? totalChargesDA / totalPoidsNetKg : 0;

    const totalVentesNettesDA = campaignExits.reduce((s, x) => s + x.montantNetDA, 0);
    const coutRevientSortisDA = totalPoidsSortiKg * seuilRentabiliteKg;
    const margeNetteReelleDA = totalVentesNettesDA - coutRevientSortisDA;
    const margeParKgSorti = totalPoidsSortiKg > 0 ? margeNetteReelleDA / totalPoidsSortiKg : 0;

    return {
      grande,
      petite,
      totalCajous,
      totalPoidsNetKg,
      totalCajousSortis,
      totalPoidsSortiKg,
      stockRestantCajous,
      stockRestantKg,
      coutAchatSansChargesDA,
      prixMoyenSansChargesKg,
      totalChargesDA,
      coutRevientTotalDA,
      seuilRentabiliteKg,
      chargesParKg,
      totalVentesNettesDA,
      coutRevientSortisDA,
      margeNetteReelleDA,
      margeParKgSorti,
    };
  }, [campaignEntries, campaignExits, charges]);

  // Formulaire Ajout / Modification Achat Fournisseur
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [ef, setEf] = useState({
    date: new Date().toISOString().slice(0, 10),
    fermierFournisseur: "",
    chambre: "grande" as FrigoChambreId,
    nbCajous: "",
    poidsNetKg: "",
    poidsNetArrondiKg: "",
    prixAchatKg: "",
    totalPayementDA: "",
    manualTotalOverride: false,
    notes: "",
  });

  function openNewEntry(chambre: FrigoChambreId = "grande") {
    setEditingEntryId(null);
    setEf({
      date: new Date().toISOString().slice(0, 10),
      fermierFournisseur: "",
      chambre,
      nbCajous: "",
      poidsNetKg: "",
      poidsNetArrondiKg: "",
      prixAchatKg: "",
      totalPayementDA: "",
      manualTotalOverride: false,
      notes: "",
    });
    setEntryFormOpen(true);
  }

  function openEditEntry(e: FrigoPurchaseEntry) {
    setEditingEntryId(e.id);
    setEf({
      date: e.date,
      fermierFournisseur: e.fermierFournisseur,
      chambre: e.chambre,
      nbCajous: String(e.nbCajous),
      poidsNetKg: String(e.poidsNetKg),
      poidsNetArrondiKg: String(e.poidsNetArrondiKg),
      prixAchatKg: String(e.prixAchatKg),
      totalPayementDA: String(e.totalPayementDA),
      manualTotalOverride: true,
      notes: e.notes || "",
    });
    setEntryFormOpen(true);
  }

  function updateEntryField(patch: Partial<typeof ef>) {
    setEf((prev) => {
      const next = { ...prev, ...patch };
      if (!next.manualTotalOverride) {
        const arrondi = parseNum(next.poidsNetArrondiKg) || parseNum(next.poidsNetKg);
        const prix = parseNum(next.prixAchatKg);
        if (arrondi > 0 && prix > 0) {
          next.totalPayementDA = String(Number((arrondi * prix).toFixed(2)));
        }
      }
      return next;
    });
  }

  function handleSaveEntry() {
    const fermier = ef.fermierFournisseur.trim();
    const poidsNet = parseNum(ef.poidsNetKg);
    const poidsArrondi = parseNum(ef.poidsNetArrondiKg) || poidsNet;
    const prix = parseNum(ef.prixAchatKg);
    const totalPay = parseNum(ef.totalPayementDA) || Number((poidsArrondi * prix).toFixed(2));
    if (!fermier || poidsNet <= 0) {
      toast.error(isAr ? "يرجى إدخال اسم المزارع والوزن الصافي" : "Veuillez saisir le nom du fermier et le poids net.");
      return;
    }
    const payload: Omit<FrigoPurchaseEntry, "id"> = {
      campaign: effectiveCampaign,
      date: ef.date || new Date().toISOString().slice(0, 10),
      fermierFournisseur: fermier,
      chambre: ef.chambre,
      nbCajous: parseNum(ef.nbCajous),
      poidsNetKg: poidsNet,
      poidsNetArrondiKg: poidsArrondi,
      prixAchatKg: prix,
      totalPayementDA: totalPay,
      notes: ef.notes.trim() || undefined,
    };
    if (editingEntryId) {
      updateEntry(editingEntryId, payload);
      toast.success(isAr ? "تم تحديث الدفعة بنجاح" : "Lot chambre froide mis à jour.");
    } else {
      addEntry(payload);
      toast.success(isAr ? "تمت إضافة الدفعة إلى غرفة التبريد" : "Achat ajouté à la chambre froide.");
    }
    setEntryFormOpen(false);
    setEditingEntryId(null);
  }

  // Formulaire Sortie / Vente depuis Chambre Froide
  const [exitFormOpen, setExitFormOpen] = useState(false);
  const [xf, setXf] = useState({
    date: new Date().toISOString().slice(0, 10),
    chambre: "grande" as FrigoChambreId,
    destination: "mandataire" as "mandataire" | "direct",
    clientOuMandataire: "",
    numeroBordereau: "",
    nbCajousSortis: "",
    poidsSortiKg: "",
    prixVenteKg: "",
    deductionsDA: "",
    paymentStatus: "paye" as "paye" | "en_attente",
    notes: "",
  });

  const previewExitBrut = parseNum(xf.poidsSortiKg) * parseNum(xf.prixVenteKg);
  const previewExitNet = Math.max(0, previewExitBrut - parseNum(xf.deductionsDA));
  const previewExitMargin = previewExitNet - parseNum(xf.poidsSortiKg) * stats.seuilRentabiliteKg;

  function handleSaveExit() {
    const kg = parseNum(xf.poidsSortiKg);
    const cajous = parseNum(xf.nbCajousSortis);
    if (kg <= 0 && cajous <= 0) {
      toast.error(isAr ? "يرجى إدخال الوزن أو عدد الصناديق المخرجة" : "Veuillez saisir le poids ou le nombre de cajous sortis.");
      return;
    }
    const prix = parseNum(xf.prixVenteKg);
    const brut = Number((kg * prix).toFixed(2));
    const ded = parseNum(xf.deductionsDA);
    const net = Number(Math.max(0, brut - ded).toFixed(2));
    addExit({
      campaign: effectiveCampaign,
      date: xf.date || new Date().toISOString().slice(0, 10),
      chambre: xf.chambre,
      destination: xf.destination,
      clientOuMandataire:
        xf.clientOuMandataire.trim() ||
        (xf.destination === "mandataire" ? (isAr ? "وكيل السوق" : "Mandataire") : isAr ? "بيع مباشر" : "Client direct"),
      numeroBordereau: xf.numeroBordereau.trim() || undefined,
      nbCajousSortis: cajous,
      poidsSortiKg: kg,
      prixVenteKg: prix,
      montantBrutDA: brut,
      deductionsDA: ded,
      montantNetDA: net,
      paymentStatus: xf.paymentStatus,
      notes: xf.notes.trim() || undefined,
    });
    setExitFormOpen(false);
    setXf({
      date: new Date().toISOString().slice(0, 10),
      chambre: "grande",
      destination: "mandataire",
      clientOuMandataire: "",
      numeroBordereau: "",
      nbCajousSortis: "",
      poidsSortiKg: "",
      prixVenteKg: "",
      deductionsDA: "",
      paymentStatus: "paye",
      notes: "",
    });
    toast.success(isAr ? "تم تسجيل الخروج والبيع وتحديث المخزون" : "Sortie / vente enregistrée et stock décrémenté !");
  }

  const inputCls =
    "w-full min-w-0 max-w-full box-border rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium";

  const renderRoomTable = (
    chambre: FrigoChambreId,
    titleFr: string,
    titleAr: string,
    room: typeof stats.grande,
    accentClasses: string,
  ) => (
    <div className={`rounded-2xl border bg-card p-3.5 sm:p-4 shadow-xs space-y-3 ${accentClasses}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
        <div>
          <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
            <Warehouse className="h-4 w-4 text-sky-600 shrink-0" />
            <span>{isAr ? titleAr : titleFr}</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            <span dir="ltr" className="font-bold text-foreground">
              {formatNumber(room.cajousEntres, 0)} {isAr ? "صندوق" : "cajous"}
            </span>{" "}
            ·{" "}
            <span dir="ltr" className="font-bold text-foreground">
              {formatNumber(room.poidsNetEntreKg, 0)} kg
            </span>{" "}
            ·{" "}
            <span dir="ltr" className="font-bold text-blue-700 dark:text-blue-300">
              {formatDA(room.totalPayementDA, 2)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span dir="ltr" className="rounded-xl bg-sky-500/10 text-sky-800 dark:text-sky-200 px-2.5 py-1 text-[11px] font-black">
            {isAr ? "المتبقي :" : "Restant :"} {formatNumber(room.cajousRestants, 0)} c. ·{" "}
            {formatNumber(room.poidsRestantKg, 0)} kg
          </span>
          <button
            type="button"
            onClick={() => openNewEntry(chambre)}
            className="no-print inline-flex items-center gap-1 rounded-xl border bg-background hover:bg-muted px-2.5 py-1 text-[11px] font-bold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isAr ? "إضافة مزارع" : "Ajouter"}</span>
          </button>
        </div>
      </div>

      {room.list.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-3">
          {isAr ? "لا توجد دفعات مسجلة في هذه الغرفة." : "Aucun lot enregistré dans cette chambre."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b text-[10px] uppercase text-muted-foreground">
                <th className="py-1.5 text-start font-black">{isAr ? "المزارع / المورد" : "Fermier / Fournisseur"}</th>
                <th className="py-1.5 text-end font-black">{isAr ? "الصناديق" : "Cajous"}</th>
                <th className="py-1.5 text-end font-black">{isAr ? "الوزن الصافي" : "Poids net"}</th>
                <th className="py-1.5 text-end font-black">{isAr ? "الوزن المدوّر" : "Poids arrondi"}</th>
                <th className="py-1.5 text-end font-black">{isAr ? "السعر/كغ" : "Prix/kg"}</th>
                <th className="py-1.5 text-end font-black">{isAr ? "المبلغ المدفوع" : "Total payement"}</th>
                <th className="no-print py-1.5 text-end font-black w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {room.list.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="py-2 font-bold text-foreground">{e.fermierFournisseur}</td>
                  <td dir="ltr" className="py-2 text-end font-medium">
                    {formatNumber(e.nbCajous, 0)}
                  </td>
                  <td dir="ltr" className="py-2 text-end font-medium">
                    {formatNumber(e.poidsNetKg, 0)} kg
                  </td>
                  <td dir="ltr" className="py-2 text-end text-muted-foreground">
                    {formatNumber(e.poidsNetArrondiKg, 0)} kg
                  </td>
                  <td dir="ltr" className="py-2 text-end font-medium">
                    {formatDA(e.prixAchatKg, 0)}
                  </td>
                  <td dir="ltr" className="py-2 text-end font-black text-foreground">
                    {formatDA(e.totalPayementDA, 2)}
                  </td>
                  <td className="no-print py-2 text-end">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditEntry(e)}
                        className="p-1 rounded text-muted-foreground hover:text-primary cursor-pointer"
                        title={isAr ? "تعديل" : "Modifier"}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEntry(e.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive cursor-pointer"
                        title={isAr ? "حذف" : "Supprimer"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-black bg-muted/20">
                <td className="py-2">{isAr ? "المجموع" : "Sous-total"}</td>
                <td dir="ltr" className="py-2 text-end">
                  {formatNumber(room.cajousEntres, 0)}
                </td>
                <td dir="ltr" className="py-2 text-end">
                  {formatNumber(room.poidsNetEntreKg, 0)} kg
                </td>
                <td dir="ltr" className="py-2 text-end text-muted-foreground">
                  {formatNumber(room.poidsArrondiKg, 0)} kg
                </td>
                <td dir="ltr" className="py-2 text-end text-muted-foreground">
                  {formatDA(room.prixMoyenKg, 2)}
                </td>
                <td dir="ltr" className="py-2 text-end text-blue-700 dark:text-blue-300">
                  {formatDA(room.totalPayementDA, 2)}
                </td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <section className="space-y-4">
      {/* En-tête Chambre Froide & Actions */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border-2 border-sky-500/30 bg-sky-500/[0.04] p-4">
        <div>
          <h2 className="text-base font-black text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-sky-600 shrink-0" />
            <span>
              {isAr
                ? "غرف التبريد (الكبيرة والصغيرة) والتجارة الخارجية"
                : "Chambres Froides (Grande & Petite) & Négoce"}
            </span>
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isAr
              ? "مخزون مستقل تماماً عن المردودية الفلاحية لأشجار التفاح (كغ/شجرة و طن/هكتار)"
              : "Stock négoce strictement séparé du rendement agronomique des arbres (kg/arbre, t/ha)"}
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openNewEntry("grande")}
            className="inline-flex items-center gap-1 rounded-xl border border-sky-600/30 bg-card hover:bg-muted px-3 py-1.5 text-xs font-black text-sky-800 dark:text-sky-200 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isAr ? "+ شراء لمخزون التبريد" : "+ Nouvel achat frigo"}</span>
          </button>
          <button
            type="button"
            onClick={() => setExitFormOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-black shadow-xs cursor-pointer"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>{isAr ? "خروج / بيع من غرفة التبريد" : "Sortie / Vente depuis Chambre Froide"}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-black shadow-xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{isAr ? "طباعة / PDF حالة غرفة التبريد" : "Imprimer / PDF État Chambre Froide"}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Chambre Froide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-card p-3.5 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
            <Package className="h-3.5 w-3.5 text-sky-600" />
            <span>{isAr ? "إجمالي المخزون / المتبقي" : "Total Entré & Stock Restant"}</span>
          </span>
          <p dir="ltr" className="text-lg font-black text-foreground">
            {formatNumber(stats.totalPoidsNetKg, 0)} kg{" "}
            <span className="text-xs font-bold text-muted-foreground">
              ({formatNumber(stats.totalCajous, 0)} {isAr ? "صندوق" : "cajous"})
            </span>
          </p>
          <p dir="ltr" className="text-[11px] font-bold text-sky-700 dark:text-sky-300">
            ❄️ {isAr ? "المتبقي :" : "Restant :"} {formatNumber(stats.stockRestantKg, 0)} kg ·{" "}
            {formatNumber(stats.stockRestantCajous, 0)} c.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3.5 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <Coins className="h-3.5 w-3.5" />
            <span>{isAr ? "تكلفة الشراء بدون مصاريف" : "Coût achat sans charges"}</span>
          </span>
          <p dir="ltr" className="text-lg font-black text-blue-700 dark:text-blue-300">
            {formatDA(stats.coutAchatSansChargesDA, 0)}
          </p>
          <p dir="ltr" className="text-[11px] font-bold text-muted-foreground">
            {formatDA(stats.prixMoyenSansChargesKg, 2)}/kg
          </p>
        </div>

        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-3.5 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5" />
            <span>{isAr ? "التكلفة الإجمالية (عتبة الربحية)" : "Coût de revient total (seuil)"}</span>
          </span>
          <p dir="ltr" className="text-lg font-black text-amber-800 dark:text-amber-300">
            {formatDA(stats.coutRevientTotalDA, 0)}
          </p>
          <p dir="ltr" className="text-[11px] font-black text-amber-900 dark:text-amber-200">
            {isAr ? "الحد الأدنى للبيع :" : "Seuil min :"} {formatDA(stats.seuilRentabiliteKg, 2)}/kg
          </p>
        </div>

        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-3.5 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{isAr ? "الهامش الصافي للمبيعات المخرجة" : "Marge nette réelle (sorties)"}</span>
          </span>
          <p
            dir="ltr"
            className={`text-lg font-black ${
              stats.margeNetteReelleDA >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
            }`}
          >
            {stats.margeNetteReelleDA >= 0 ? "+" : ""}
            {formatDA(stats.margeNetteReelleDA, 0)}
          </p>
          <p dir="ltr" className="text-[11px] font-bold text-emerald-800/80 dark:text-emerald-200/80">
            {formatNumber(stats.totalPoidsSortiKg, 0)} kg {isAr ? "مباعة" : "vendus"} ·{" "}
            {stats.totalPoidsSortiKg > 0 ? `${formatDA(stats.margeParKgSorti, 2)}/kg` : "0 DA/kg"}
          </p>
        </div>
      </div>

      {/* Formulaire Ajout / Modification Achat Fournisseur */}
      {entryFormOpen && (
        <div className="no-print rounded-2xl border-2 border-sky-500/40 bg-card p-4 space-y-3 text-xs shadow-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-black text-sm text-foreground">
              {editingEntryId
                ? isAr ? "تعديل دفعة غرفة التبريد" : "Modifier le lot chambre froide"
                : isAr ? "إضافة دفعة شراء جديدة" : "Nouvel achat fournisseur (Chambre Froide)"}
            </h3>
            <button
              type="button"
              onClick={() => setEntryFormOpen(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "الغرفة" : "Chambre froide"}
              </label>
              <select
                value={ef.chambre}
                onChange={(e) => updateEntryField({ chambre: e.target.value as FrigoChambreId })}
                className={inputCls}
              >
                <option value="grande">{isAr ? "غرفة التبريد الكبيرة" : "Chambre froide Grande"}</option>
                <option value="petite">{isAr ? "غرفة التبريد الصغيرة" : "Chambre froide Petite"}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "اسم المزارع / المورد" : "Fermier / Fournisseur"}
              </label>
              <input
                value={ef.fermierFournisseur}
                onChange={(e) => updateEntryField({ fermierFournisseur: e.target.value })}
                placeholder="Ex: Khaled, Youcef..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "عدد الصناديق" : "Nb Cajous (caisses)"}
              </label>
              <input
                dir="ltr"
                inputMode="numeric"
                value={ef.nbCajous}
                onChange={(e) => updateEntryField({ nbCajous: e.target.value })}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "الوزن الصافي (كغ)" : "Poids Net pesé (kg)"}
              </label>
              <input
                dir="ltr"
                inputMode="decimal"
                value={ef.poidsNetKg}
                onChange={(e) => updateEntryField({ poidsNetKg: e.target.value })}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "الوزن المدوّر للحساب (كغ)" : "Poids Net Arrondi (kg)"}
              </label>
              <input
                dir="ltr"
                inputMode="decimal"
                value={ef.poidsNetArrondiKg}
                onChange={(e) => updateEntryField({ poidsNetArrondiKg: e.target.value })}
                placeholder={ef.poidsNetKg || "0"}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "سعر الشراء (دج/كغ)" : "Prix d'achat (DA/kg)"}
              </label>
              <input
                dir="ltr"
                inputMode="decimal"
                value={ef.prixAchatKg}
                onChange={(e) => updateEntryField({ prixAchatKg: e.target.value })}
                placeholder="330"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr
                  ? "المبلغ المدفوع الفعلي (دج — قابل للتعديل اليدوي)"
                  : "Total Payement réel (DA — éditable manuellement)"}
              </label>
              <input
                dir="ltr"
                inputMode="decimal"
                value={ef.totalPayementDA}
                onChange={(e) =>
                  setEf((prev) => ({ ...prev, totalPayementDA: e.target.value, manualTotalOverride: true }))
                }
                placeholder="0"
                className={`${inputCls} font-black`}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "التاريخ" : "Date"}
              </label>
              <input
                type="date"
                dir="ltr"
                value={ef.date}
                onChange={(e) => updateEntryField({ date: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEntryFormOpen(false)}
              className="rounded-lg border px-3 py-1.5 font-bold text-muted-foreground cursor-pointer"
            >
              {isAr ? "إلغاء" : "Annuler"}
            </button>
            <button
              type="button"
              onClick={handleSaveEntry}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 font-black cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isAr ? "حفظ" : "Enregistrer"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Formulaire Sortie / Vente depuis Chambre Froide */}
      {exitFormOpen && (
        <div className="no-print rounded-2xl border-2 border-emerald-500/40 bg-card p-4 space-y-3 text-xs shadow-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-black text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4" />
              <span>{isAr ? "تسجيل خروج / بيع من غرفة التبريد" : "Sortie / Vente depuis Chambre Froide"}</span>
            </h3>
            <button
              type="button"
              onClick={() => setExitFormOpen(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "الغرفة المصدر" : "Chambre source"}
              </label>
              <select
                value={xf.chambre}
                onChange={(e) => setXf({ ...xf, chambre: e.target.value as FrigoChambreId })}
                className={inputCls}
              >
                <option value="grande">
                  {isAr ? "غرفة التبريد الكبيرة" : "Chambre froide Grande"} ({formatNumber(stats.grande.poidsRestantKg, 0)} kg)
                </option>
                <option value="petite">
                  {isAr ? "غرفة التبريد الصغيرة" : "Chambre froide Petite"} ({formatNumber(stats.petite.poidsRestantKg, 0)} kg)
                </option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "التاريخ" : "Date de sortie"}
              </label>
              <input
                type="date"
                dir="ltr"
                value={xf.date}
                onChange={(e) => setXf({ ...xf, date: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "نوع البيع" : "Destination"}
              </label>
              <select
                value={xf.destination}
                onChange={(e) => setXf({ ...xf, destination: e.target.value as any })}
                className={inputCls}
              >
                <option value="mandataire">{isAr ? "🤝 وكيل السوق (بوردرون)" : "🤝 Mandataire (Bordereau)"}</option>
                <option value="direct">{isAr ? "🏪 بيع مباشر" : "🏪 Vente directe"}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "الوكيل / الزبون" : "Mandataire / Client"}
              </label>
              <input
                value={xf.clientOuMandataire}
                onChange={(e) => setXf({ ...xf, clientOuMandataire: e.target.value })}
                placeholder="Ex: Bencherifa / Client..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "رقم الوصل / البوردرون (اختياري)" : "N° Bordereau (optionnel)"}
              </label>
              <input
                value={xf.numeroBordereau}
                onChange={(e) => setXf({ ...xf, numeroBordereau: e.target.value })}
                placeholder="Ex: 36410"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "عدد الصناديق المخرجة" : "Nb Cajous sortis"}
              </label>
              <input
                dir="ltr"
                inputMode="numeric"
                value={xf.nbCajousSortis}
                onChange={(e) => setXf({ ...xf, nbCajousSortis: e.target.value })}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "الوزن المخرج (كغ)" : "Poids sorti (kg)"}
              </label>
              <input
                dir="ltr"
                inputMode="decimal"
                value={xf.poidsSortiKg}
                onChange={(e) => setXf({ ...xf, poidsSortiKg: e.target.value })}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "سعر البيع (دج/كغ)" : "Prix de vente (DA/kg)"}
              </label>
              <input
                dir="ltr"
                inputMode="decimal"
                value={xf.prixVenteKg}
                onChange={(e) => setXf({ ...xf, prixVenteKg: e.target.value })}
                placeholder="450"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                {isAr ? "عمولة ومصاريف السوق (دج)" : "Commission / Frais (DA)"}
              </label>
              <input
                dir="ltr"
                inputMode="decimal"
                value={xf.deductionsDA}
                onChange={(e) => setXf({ ...xf, deductionsDA: e.target.value })}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>

          {/* Aperçu en direct de la marge au-dessus du seuil */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 border px-3 py-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <span>
                {isAr ? "الصافي :" : "Net encaissé :"}{" "}
                <strong dir="ltr">{formatDA(previewExitNet, 0)}</strong>
              </span>
              <span>
                {isAr ? "عتبة التكلفة :" : "Seuil :"}{" "}
                <strong dir="ltr">{formatDA(stats.seuilRentabiliteKg, 2)}/kg</strong>
              </span>
              <span
                className={`font-black ${previewExitMargin >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}
              >
                {isAr ? "الهامش المتوقع :" : "Marge nette estimée :"}{" "}
                <span dir="ltr">
                  {previewExitMargin >= 0 ? "+" : ""}
                  {formatDA(previewExitMargin, 0)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExitFormOpen(false)}
                className="rounded-lg border px-3 py-1 font-bold text-muted-foreground cursor-pointer"
              >
                {isAr ? "إلغاء" : "Annuler"}
              </button>
              <button
                type="button"
                onClick={handleSaveExit}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 font-black cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isAr ? "تأكيد الخروج" : "Valider la sortie"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Les 2 Chambres Froides : Grande & Petite */}
      <div className="grid grid-cols-1 gap-3">
        {renderRoomTable(
          "grande",
          "Chambre froide Grande",
          "غرفة التبريد الكبيرة",
          stats.grande,
          "border-sky-500/30",
        )}
        {renderRoomTable(
          "petite",
          "Chambre froide Petite",
          "غرفة التبريد الصغيرة",
          stats.petite,
          "border-indigo-500/30",
        )}
      </div>

      {/* Bloc Charges d'installation & emballage */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
          <h3 className="text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-amber-600" />
            <span>
              {isAr ? "مصاريف التجهيز والتغليف والنقل" : "Charges d'installation & emballage"}
            </span>
          </h3>
          <span dir="ltr" className="text-xs font-black text-amber-800 dark:text-amber-300">
            {formatDA(stats.totalChargesDA, 2)} (+{formatDA(stats.chargesParKg, 2)}/kg)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          {(
            [
              {
                key: "cajousDA" as const,
                fr: "Cajous (caisses) (DA)",
                ar: "الصناديق (دج)",
              },
              {
                key: "mainOeuvreTracteurEmballageDA" as const,
                fr: "Main d'œuvre, tracteur & transport emballage (DA)",
                ar: "اليد العاملة، الجرار ونقل التغليف (دج)",
              },
              {
                key: "transportFermeDA" as const,
                fr: "Transport vers notre ferme (DA)",
                ar: "النقل إلى مزرعتنا (دج)",
              },
              {
                key: "autresDA" as const,
                fr: "Autres (DA)",
                ar: "مصاريف أخرى (دج)",
              },
              {
                key: "fraisFrigoElectriciteGardiennageDA" as const,
                fr: "Frais frigo / Électricité / Gardiennage (optionnel)",
                ar: "مصاريف التبريد / الكهرباء / الحراسة (اختياري)",
              },
            ] as const
          ).map((field) => (
            <div key={field.key} className="rounded-xl border bg-card p-2.5 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground block">
                {isAr ? field.ar : field.fr}
              </label>
              <input
                type="number"
                dir="ltr"
                inputMode="decimal"
                disabled={selectedCampaign === "all"}
                value={charges[field.key] || 0}
                onChange={(e) => updateCharges(effectiveCampaign, { [field.key]: parseNum(e.target.value) })}
                className="w-full rounded-lg border border-input bg-background px-2 py-1 text-right text-xs font-black disabled:opacity-70"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Historique des sorties / ventes depuis Chambre Froide */}
      <div className="rounded-2xl border bg-card p-4 space-y-2.5">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            <span>
              {isAr
                ? `سجل المبيعات والمخارج من غرف التبريد (${campaignExits.length})`
                : `Sorties / Ventes depuis Chambres Froides (${campaignExits.length})`}
            </span>
          </h3>
          {campaignExits.length > 0 && (
            <span dir="ltr" className="text-xs font-black text-emerald-700 dark:text-emerald-300">
              {isAr ? "صافي المبيعات :" : "Ventes nettes :"} {formatDA(stats.totalVentesNettesDA, 0)}
            </span>
          )}
        </div>

        {campaignExits.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-3">
            {isAr
              ? "لم يتم تسجيل أي خروج أو بيع من غرف التبريد بعد. استخدم زر «خروج / بيع» أعلاه."
              : "Aucune sortie / vente enregistrée pour le moment. Cliquez sur « Sortie / Vente depuis Chambre Froide »."}
          </p>
        ) : (
          <ul className="divide-y">
            {campaignExits.map((x) => {
              const margin = x.montantNetDA - x.poidsSortiKg * stats.seuilRentabiliteKg;
              return (
                <li key={x.id} className="py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 font-bold">
                      <span dir="ltr">{formatDateFR(x.date)}</span>
                      <span className="rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[10px]">
                        {x.chambre === "grande"
                          ? isAr ? "الغرفة الكبيرة" : "Grande"
                          : isAr ? "الغرفة الصغيرة" : "Petite"}
                      </span>
                      <span>{x.clientOuMandataire}</span>
                      {x.numeroBordereau && (
                        <span dir="ltr" className="text-muted-foreground">
                          #{x.numeroBordereau}
                        </span>
                      )}
                    </div>
                    <p dir="ltr" className="text-[11px] text-muted-foreground">
                      {formatNumber(x.nbCajousSortis, 0)} c. · {formatNumber(x.poidsSortiKg, 1)} kg ×{" "}
                      {formatDA(x.prixVenteKg, 0)} = Net {formatDA(x.montantNetDA, 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      dir="ltr"
                      className={`font-black ${
                        margin >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
                      }`}
                    >
                      {margin >= 0 ? "+" : ""}
                      {formatDA(margin, 0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExit(x.id)}
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
      </div>
    </section>
  );
}
