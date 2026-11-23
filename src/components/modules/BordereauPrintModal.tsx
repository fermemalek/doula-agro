import { useEffect } from "react";
import ReactDOM from "react-dom";
import { Printer, X } from "lucide-react";
import { formatDateFR, formatNumber } from "@/lib/format";

export interface BordereauPrintLine {
  id: string;
  nature: string;
  colis: string;
  poidsNetKg: string;
  prixUnitaire: string;
}

export interface BordereauPrintData {
  mandataireName: string;
  marcheCarreau: string;
  numeroBordereau: string;
  dateFolio: string;
  paymentStatus: "paye" | "en_attente" | "partiel";
  paidAmount?: string;
  lines: BordereauPrintLine[];
  commissionPercent: string;
  commissionManualDA?: string;
  droitsMarcheDA: string;
  avanceProducteurDA: string;
  accountLabel: string; // ex: "Ferme Doula / Mouaas — Nectarine (NABLARA)"
}

function parseNum(v: string | number | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function computeBordereauTotals(b: {
  lines: BordereauPrintLine[];
  commissionPercent: string;
  commissionManualDA?: string;
  droitsMarcheDA: string;
  avanceProducteurDA: string;
}) {
  let totalColis = 0;
  let totalPoidsNet = 0;
  let totalVenteBrute = 0;

  for (const l of b.lines) {
    const c = parseNum(l.colis);
    const kg = parseNum(l.poidsNetKg);
    const pu = parseNum(l.prixUnitaire);
    totalColis += c;
    totalPoidsNet += kg;
    totalVenteBrute += kg * pu;
  }

  const comPct = parseNum(b.commissionPercent);
  const autoComDA = (totalVenteBrute * comPct) / 100;
  const hasManualCom =
    b.commissionManualDA !== undefined &&
    String(b.commissionManualDA).trim() !== "" &&
    Number.isFinite(parseFloat(String(b.commissionManualDA).replace(",", ".")));
  const comDA = hasManualCom ? parseNum(b.commissionManualDA) : autoComDA;
  const droitsMarche = parseNum(b.droitsMarcheDA);
  const avanceProducteur = parseNum(b.avanceProducteurDA);
  const netAPayer = totalVenteBrute - comDA - droitsMarche - avanceProducteur;

  return {
    totalColis,
    totalPoidsNet,
    totalVenteBrute,
    comPct,
    autoComDA,
    comDA,
    droitsMarche,
    avanceProducteur,
    netAPayer,
  };
}

export function BordereauPrintModal({
  open,
  onClose,
  data,
  isAr,
}: {
  open: boolean;
  onClose: () => void;
  data: BordereauPrintData | null;
  isAr: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-bordereau");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("printing-bordereau");
    };
  }, [open]);

  if (!open || !data) return null;

  const totals = computeBordereauTotals(data);
  const paidNum = parseNum(data.paidAmount);
  const resteDu = Math.max(0, totals.netAPayer - paidNum);

  function triggerPrint() {
    document.body.classList.add("printing-bordereau");
    setTimeout(() => {
      window.print();
    }, 60);
  }

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/75 flex items-start justify-center overflow-y-auto p-2 sm:p-6"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-4xl bg-white text-slate-950 rounded-2xl shadow-2xl overflow-hidden my-2">
        {/* Barre d'actions écran (masquée à l'impression) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white px-4 py-3">
          <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <Printer className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              {isAr
                ? "معاينة وطباعة كشف إجمالي المبيعات (A4 / PDF)"
                : "Aperçu & Impression — Bordereau Récapitulatif des Ventes (A4 / PDF)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerPrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-black transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isAr ? "طباعة / حفظ PDF" : "Imprimer / PDF"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>{isAr ? "إغلاق" : "Fermer"}</span>
            </button>
          </div>
        </div>

        {/* Feuille A4 Imprimable */}
        <div id="bordereau-print-root" className="bg-white text-slate-950 p-5 sm:p-8 space-y-5">
          {/* En-tête officiel 2 colonnes */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
            {/* En-tête gauche : Mandataire & Marché de gros */}
            <div className="space-y-1 max-w-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isAr ? "الوكيل الفلاحي / سوق الجملة" : "MANDATAIRE — MARCHÉ DE GROS"}
              </p>
              <h2 className="text-lg sm:text-xl font-black uppercase text-slate-950">
                {data.mandataireName || (isAr ? "وكيل السوق" : "Mandataire")}
              </h2>
              {data.marcheCarreau && (
                <p className="text-xs font-bold text-slate-700">
                  {data.marcheCarreau}
                </p>
              )}
            </div>

            {/* En-tête droite : Titre Bordereau, N°, Date / Folio, Compte */}
            <div className="sm:text-right space-y-1 border-2 border-slate-900 rounded-lg px-4 py-2.5 bg-slate-50 w-full sm:w-auto">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-950">
                {isAr ? "كشف إجمالي المبيعات" : "BORDEREAU RÉCAPITULATIF DES VENTES"}
              </h1>
              <div className="text-xs space-y-0.5 text-slate-800">
                <p>
                  <span className="font-bold">{isAr ? "رقم الكشف :" : "N° Bordereau :"}</span>{" "}
                  <span dir="ltr" className="font-mono font-black">
                    {data.numeroBordereau || "—"}
                  </span>
                </p>
                <p>
                  <span className="font-bold">{isAr ? "التاريخ / الفوليو :" : "Date / Folio :"}</span>{" "}
                  <span dir="ltr" className="font-mono font-bold">
                    {formatDateFR(data.dateFolio)}
                  </span>
                </p>
                <p className="pt-1 border-t border-slate-300">
                  <span className="font-bold">{isAr ? "لحساب :" : "Le Compte de :"}</span>{" "}
                  <span className="font-black text-slate-950">{data.accountLabel}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Tableau A4 à 6 colonnes bordées */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-900 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-black uppercase text-[10px]">
                  <th className="border border-slate-900 px-2 py-2 text-center">
                    {isAr ? "الوزن/صندوق" : "Poids/colis"}
                  </th>
                  <th className="border border-slate-900 px-2 py-2 text-center">
                    {isAr ? "عدد الصناديق" : "N° de colis"}
                  </th>
                  <th className="border border-slate-900 px-2.5 py-2 text-left">
                    {isAr ? "طبيعة البضاعة / العيار" : "Nature des marchandises"}
                  </th>
                  <th className="border border-slate-900 px-2 py-2 text-right">
                    {isAr ? "الوزن الصافي (كغ)" : "Poids net (kg)"}
                  </th>
                  <th className="border border-slate-900 px-2 py-2 text-right">
                    {isAr ? "سعر البيع (دج)" : "Prix de vente (DA)"}
                  </th>
                  <th className="border border-slate-900 px-2.5 py-2 text-right">
                    {isAr ? "مبلغ البيع (دج)" : "Montant de la vente (DA)"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => {
                  const colis = parseNum(line.colis);
                  const kg = parseNum(line.poidsNetKg);
                  const pu = parseNum(line.prixUnitaire);
                  const avgPerColis = colis > 0 ? kg / colis : 0;
                  const amount = kg * pu;
                  return (
                    <tr key={line.id} className="hover:bg-slate-50">
                      <td dir="ltr" className="border border-slate-800 px-2 py-1.5 text-center font-mono">
                        {avgPerColis > 0 ? `${formatNumber(avgPerColis, 2)} kg` : "—"}
                      </td>
                      <td dir="ltr" className="border border-slate-800 px-2 py-1.5 text-center font-mono font-bold">
                        {colis > 0 ? formatNumber(colis, 0) : "—"}
                      </td>
                      <td className="border border-slate-800 px-2.5 py-1.5 font-bold">
                        {line.nature || "—"}
                      </td>
                      <td dir="ltr" className="border border-slate-800 px-2 py-1.5 text-right font-mono font-semibold">
                        {formatNumber(kg, 2)}
                      </td>
                      <td dir="ltr" className="border border-slate-800 px-2 py-1.5 text-right font-mono">
                        {formatNumber(pu, 2)}
                      </td>
                      <td dir="ltr" className="border border-slate-800 px-2.5 py-1.5 text-right font-mono font-bold">
                        {formatNumber(amount, 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-950">
                  <td className="border border-slate-900 px-2 py-2 text-center uppercase text-[10px]">
                    {isAr ? "المجموع" : "TOTAUX"}
                  </td>
                  <td dir="ltr" className="border border-slate-900 px-2 py-2 text-center font-mono">
                    {formatNumber(totals.totalColis, 0)}
                  </td>
                  <td className="border border-slate-900 px-2.5 py-2 text-[10px] text-slate-600">
                    {data.lines.length} {isAr ? "سطور بيع" : `ligne${data.lines.length > 1 ? "s" : ""} de vente`}
                  </td>
                  <td dir="ltr" className="border border-slate-900 px-2 py-2 text-right font-mono">
                    {formatNumber(totals.totalPoidsNet, 2)} kg
                  </td>
                  <td className="border border-slate-900 px-2 py-2 text-right text-[10px] text-slate-500">
                    —
                  </td>
                  <td dir="ltr" className="border border-slate-900 px-2.5 py-2 text-right font-mono text-sm">
                    {formatNumber(totals.totalVenteBrute, 2)} DA
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pied de bordereau : Tampon visuel à gauche + Décompte financier encadré à droite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start pt-2">
            {/* Tampon visuel */}
            <div className="flex flex-col items-start justify-center pt-2">
              {data.paymentStatus === "paye" ? (
                <div className="inline-block border-4 border-rose-700 text-rose-700 rounded-xl px-6 py-3 -rotate-6 shadow-xs bg-rose-50/40">
                  <p className="text-2xl font-black tracking-widest uppercase text-center">
                    {isAr ? "مدفوع" : "PAYÉ"}
                  </p>
                  <p dir="ltr" className="text-xs font-mono font-bold text-center mt-0.5">
                    {formatDateFR(data.dateFolio)}
                  </p>
                </div>
              ) : data.paymentStatus === "en_attente" ? (
                <div className="inline-block border-4 border-amber-600 text-amber-700 rounded-xl px-5 py-3 -rotate-3 bg-amber-50/40">
                  <p className="text-xl font-black tracking-wider uppercase text-center">
                    {isAr ? "قيد الانتظار" : "EN ATTENTE"}
                  </p>
                  <p className="text-[11px] font-bold text-center mt-0.5">
                    {isAr ? "في انتظار التسوية" : "Règlement en attente"}
                  </p>
                </div>
              ) : (
                <div className="inline-block border-4 border-violet-700 text-violet-700 rounded-xl px-5 py-3 -rotate-3 bg-violet-50/40">
                  <p className="text-lg font-black tracking-wider uppercase text-center">
                    {isAr ? "دفع جزئي" : "PAIEMENT PARTIEL"}
                  </p>
                  <p dir="ltr" className="text-xs font-mono font-bold text-center mt-0.5">
                    {isAr ? "المتبقي :" : "Reste dû :"} {formatNumber(resteDu, 2)} DA
                  </p>
                </div>
              )}
            </div>

            {/* Décompte financier encadré à droite */}
            <div className="border-2 border-slate-900 rounded-xl overflow-hidden text-xs">
              <div className="divide-y divide-slate-300">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50">
                  <span className="font-bold uppercase">{isAr ? "المجموع الخام (TOTAL)" : "TOTAL (Vente brute)"}</span>
                  <span dir="ltr" className="font-mono font-black">{formatNumber(totals.totalVenteBrute, 2)} DA</span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2">
                  <span className="font-semibold text-slate-700">
                    {isAr ? `العمولة (${totals.comPct} %)` : `COM (${totals.comPct} %)`}
                  </span>
                  <span dir="ltr" className="font-mono font-bold text-rose-700">
                    − {formatNumber(totals.comDA, 2)} DA
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2">
                  <span className="font-semibold text-slate-700">
                    {isAr ? "حقوق السوق (D. de marché)" : "D. de marché"}
                  </span>
                  <span dir="ltr" className="font-mono font-bold text-rose-700">
                    − {formatNumber(totals.droitsMarche, 2)} DA
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2">
                  <span className="font-semibold text-slate-700">
                    {isAr ? "تسبيق المنتج (Av. Producteur)" : "Av. Producteur"}
                  </span>
                  <span dir="ltr" className="font-mono font-bold text-rose-700">
                    − {formatNumber(totals.avanceProducteur, 2)} DA
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 text-white text-sm">
                  <span className="font-black uppercase">
                    {isAr ? "الصافي للدفع (NET À PAYER)" : "NET À PAYER"}
                  </span>
                  <span dir="ltr" className="font-mono font-black">
                    {formatNumber(totals.netAPayer, 2)} DA
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
