import { Plus, Trash2, Printer, Copy, Handshake, ArrowDownToLine } from "lucide-react";
import { formatDA, formatNumber } from "@/lib/format";
import { computeBordereauTotals, getBordereauLineAmount, type BordereauPrintLine } from "./BordereauPrintModal";

export type BordereauPaymentStatus = "paye" | "en_attente" | "partiel";

export interface MandataireBordereau {
  id: string;
  mandataireName: string;
  marcheCarreau: string;
  numeroBordereau: string;
  dateFolio: string;
  accountLabel?: string;
  paymentStatus: BordereauPaymentStatus;
  paidAmount?: string;
  lines: BordereauPrintLine[];
  commissionPercent: string; // défaut "8"
  commissionManualDA?: string; // ajustement manuel optionnel
  droitsMarcheDA: string; // défaut "0"
  avanceProducteurDA: string; // défaut "0"
}

export const APPLE_VARIETY_OPTIONS = [
  "G · Golden",
  "S · Granny Smith",
  "Gala One",
];

export const CALIBRE_OPTIONS: string[] = [
  "16",
  "18",
  "20",
  "22",
  "24",
  "26",
  "28",
  "30",
  "Frag",
  "Piqué",
  "Rebut",
];

export const NATURE_SUGGESTIONS = [
  ...APPLE_VARIETY_OPTIONS,
  ...CALIBRE_OPTIONS.map((c) => (/^\d+$/.test(c) ? `Cal. ${c}` : c)),
];

function parseNum(v: string | number | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function createEmptySaleLine(nature = ""): BordereauPrintLine {
  return {
    id: `sl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nature,
    colis: "",
    poidsNetKg: "",
    prixUnitaire: "",
  };
}

export function createEmptyBordereau(date: string, initialLines?: BordereauPrintLine[]): MandataireBordereau {
  return {
    id: `bd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    mandataireName: "",
    marcheCarreau: "",
    numeroBordereau: "",
    dateFolio: date || new Date().toISOString().slice(0, 10),
    paymentStatus: "paye",
    paidAmount: "",
    lines: initialLines && initialLines.length > 0 ? initialLines : [createEmptySaleLine()],
    commissionPercent: "8",
    commissionManualDA: "",
    droitsMarcheDA: "0",
    avanceProducteurDA: "0",
  };
}

export function BordereauEditorCard({
  bordereau,
  onChange,
  onRemove,
  onPrefillFromStep1,
  onPrint,
  knownMandataires,
  isAr,
  title,
}: {
  bordereau: MandataireBordereau;
  onChange: (next: MandataireBordereau) => void;
  onRemove?: () => void;
  onPrefillFromStep1?: () => void;
  onPrint: () => void;
  knownMandataires: string[];
  isAr: boolean;
  title?: string;
}) {
  const totals = computeBordereauTotals(bordereau);
  const inputCls =
    "w-full min-w-0 max-w-full box-border rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium";

  const updateLine = (lineId: string, patch: Partial<BordereauPrintLine>) => {
    onChange({
      ...bordereau,
      lines: bordereau.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
    });
  };

  const addLine = (nature = "") => {
    onChange({
      ...bordereau,
      lines: [...bordereau.lines, createEmptySaleLine(nature)],
    });
  };

  const removeLine = (lineId: string) => {
    const remaining = bordereau.lines.filter((l) => l.id !== lineId);
    onChange({
      ...bordereau,
      lines: remaining.length > 0 ? remaining : [createEmptySaleLine()],
    });
  };

  const listId = `mandataires-list-${bordereau.id}`;
  const natureListId = `natures-list-${bordereau.id}`;

  return (
    <div className="rounded-xl border-2 border-amber-500/35 bg-amber-500/[0.04] p-3 sm:p-3.5 space-y-3 min-w-0">
      {/* En-tête de la carte Bordereau */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-200">
          <Handshake className="h-4 w-4 shrink-0" />
          <span>
            {title ||
              (isAr
                ? "كشف إجمالي المبيعات (وكيل سوق الجملة)"
                : "Bordereau Récapitulatif des Ventes (Mandataire)")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {onPrefillFromStep1 && (
            <button
              type="button"
              onClick={onPrefillFromStep1}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-background hover:bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 transition cursor-pointer"
              title={isAr ? "استيراد الكميات من المرحلة 1" : "Importer les lots depuis l'Étape 1"}
            >
              <ArrowDownToLine className="h-3 w-3" />
              <span>{isAr ? "تعبئة من المرحلة 1" : "Importer Étape 1"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 text-[10px] font-black transition cursor-pointer"
          >
            <Printer className="h-3 w-3" />
            <span>{isAr ? "طباعة / PDF" : "Imprimer / PDF"}</span>
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
              title={isAr ? "حذف هذا الكشف" : "Supprimer ce bordereau"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Champs d'en-tête du bordereau */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
            {isAr ? "اسم الوكيل (Mandataire)" : "Mandataire"}
          </label>
          <input
            list={listId}
            value={bordereau.mandataireName}
            onChange={(e) => onChange({ ...bordereau, mandataireName: e.target.value })}
            placeholder={isAr ? "مثال: الوكيل بن علي..." : "Ex: Ets Benali..."}
            className={inputCls}
          />
          <datalist id={listId}>
            {knownMandataires.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
            {isAr ? "سوق الجملة / المربع رقم" : "Marché de gros / Carreau N°"}
          </label>
          <input
            value={bordereau.marcheCarreau}
            onChange={(e) => onChange({ ...bordereau, marcheCarreau: e.target.value })}
            placeholder={isAr ? "مثال: الكاليتوس - المربع رقم 44" : "Ex: Eucalyptus - Carreau N° 44"}
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
            {isAr ? "رقم الكشف (N° Bordereau)" : "N° Bordereau"}
          </label>
          <input
            dir="ltr"
            value={bordereau.numeroBordereau}
            onChange={(e) => onChange({ ...bordereau, numeroBordereau: e.target.value })}
            placeholder="Ex: 36387"
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
            {isAr ? "التاريخ / الفوليو" : "Date / Folio"}
          </label>
          <input
            type="date"
            dir="ltr"
            value={bordereau.dateFolio}
            onChange={(e) => onChange({ ...bordereau, dateFolio: e.target.value })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
            {isAr ? "حالة الدفع" : "Statut de paiement"}
          </label>
          <select
            value={bordereau.paymentStatus}
            onChange={(e) =>
              onChange({ ...bordereau, paymentStatus: e.target.value as BordereauPaymentStatus })
            }
            className={inputCls}
          >
            <option value="paye">{isAr ? "✅ مدفوع (Payé)" : "✅ Payé"}</option>
            <option value="en_attente">{isAr ? "⏳ قيد الانتظار (En attente)" : "⏳ En attente"}</option>
            <option value="partiel">{isAr ? "💳 دفع جزئي (Partiel)" : "💳 Partiel"}</option>
          </select>
        </div>

        {bordereau.paymentStatus === "partiel" && (
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
              {isAr ? "المبلغ المقبوض (دج)" : "Montant déjà reçu (DA)"}
            </label>
            <input
              dir="ltr"
              inputMode="decimal"
              value={bordereau.paidAmount || ""}
              onChange={(e) => onChange({ ...bordereau, paidAmount: e.target.value })}
              placeholder="0"
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* Tableau des lignes de vente (fractionnables par prix) */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase text-muted-foreground">
            {isAr
              ? "سطور البيع (يمكن تقسيم نفس العيار حسب سعر البيع)"
              : "Lignes de vente (fractionnables par prix : ex. ت/22 à 300, 280, 260 DA)"}
          </span>
          <button
            type="button"
            onClick={() => addLine("")}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-[10px] font-black transition cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>{isAr ? "إضافة سطر بيع" : "Ajouter une ligne"}</span>
          </button>
        </div>

        <datalist id={natureListId}>
          {NATURE_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[600px] border-collapse text-xs">
            <thead>
              <tr className="bg-muted/70 text-[10px] font-black uppercase text-muted-foreground border-b">
                <th className="p-2 text-center">{isAr ? "وزن/صندوق" : "Poids/colis"}</th>
                <th className="p-2 text-center w-20">{isAr ? "عدد الصناديق" : "N° colis"}</th>
                <th className="p-2 text-left min-w-[120px]">{isAr ? "طبيعة البضاعة" : "Nature des marchandises"}</th>
                <th className="p-2 text-right w-24">{isAr ? "الوزن الصافي (كغ)" : "Poids net (kg)"}</th>
                <th className="p-2 text-right w-24">{isAr ? "السعر (دج/كغ)" : "Prix (DA/kg)"}</th>
                <th className="p-2 text-right w-28">{isAr ? "المبلغ (دج)" : "Montant (DA)"}</th>
                <th className="p-2 text-center w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bordereau.lines.map((line) => {
                const c = parseNum(line.colis);
                const kg = parseNum(line.poidsNetKg);
                const avg = c > 0 ? kg / c : 0;
                const amt = getBordereauLineAmount(line);
                return (
                  <tr key={line.id}>
                    <td dir="ltr" className="p-1.5 text-center font-mono text-[11px] text-muted-foreground">
                      {avg > 0 ? `${formatNumber(avg, 2)} kg` : "—"}
                    </td>
                    <td className="p-1.5">
                      <input
                        dir="ltr"
                        inputMode="numeric"
                        value={line.colis}
                        onChange={(e) => updateLine(line.id, { colis: e.target.value })}
                        placeholder="0"
                        className="w-full rounded border border-input bg-background px-1.5 py-1 text-center text-xs font-semibold"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        list={natureListId}
                        value={line.nature}
                        onChange={(e) => updateLine(line.id, { nature: e.target.value })}
                        placeholder="Cal. 22, Frag..."
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs font-bold"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        value={line.poidsNetKg}
                        onChange={(e) => updateLine(line.id, { poidsNetKg: e.target.value, montantManualDA: undefined })}
                        placeholder="0.0"
                        className="w-full rounded border border-input bg-background px-1.5 py-1 text-right text-xs font-semibold"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        value={line.prixUnitaire}
                        onChange={(e) => updateLine(line.id, { prixUnitaire: e.target.value, montantManualDA: undefined })}
                        placeholder="DA/kg"
                        className="w-full rounded border border-input bg-background px-1.5 py-1 text-right text-xs font-semibold"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        value={line.montantManualDA !== undefined ? line.montantManualDA : amt > 0 ? amt.toFixed(2) : ""}
                        onChange={(e) => updateLine(line.id, { montantManualDA: e.target.value })}
                        placeholder="0.00"
                        className="w-full rounded border border-input bg-background px-1.5 py-1 text-right font-mono text-xs font-bold text-foreground"
                      />
                    </td>
                    <td className="p-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => addLine(line.nature)}
                          title={
                            isAr
                              ? "تقسيم نفس العيار بسعر آخر"
                              : "Fractionner ce calibre à un autre prix"
                          }
                          className="p-1 rounded text-muted-foreground hover:text-amber-700 hover:bg-amber-500/10 transition cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          title={isAr ? "حذف السطر" : "Supprimer la ligne"}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-black text-xs border-t">
                <td className="p-2 text-center text-[10px] uppercase">{isAr ? "المجموع" : "TOTAUX"}</td>
                <td dir="ltr" className="p-2 text-center font-mono">
                  {formatNumber(totals.totalColis, 0)}
                </td>
                <td className="p-2 text-[10px] text-muted-foreground">
                  {bordereau.lines.length} {isAr ? "سطور" : `ligne${bordereau.lines.length > 1 ? "s" : ""}`}
                </td>
                <td dir="ltr" className="p-2 text-right font-mono">
                  {formatNumber(totals.totalPoidsNet, 2)} kg
                </td>
                <td className="p-2"></td>
                <td dir="ltr" className="p-2 text-right font-mono text-amber-800 dark:text-amber-300 whitespace-nowrap">
                  {formatDA(totals.totalVenteBrute, 2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Décompte financier exact en pied de bordereau */}
      <div className="rounded-xl border bg-card p-3 space-y-2 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
              {isAr ? "العمولة (%)" : "COM (Commission %)"}
            </label>
            <input
              dir="ltr"
              inputMode="decimal"
              value={bordereau.commissionPercent}
              onChange={(e) => onChange({ ...bordereau, commissionPercent: e.target.value })}
              placeholder="8"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
              {isAr ? "تعديل العمولة يدوياً (دج - اختياري)" : "Ajustement COM (DA, optionnel)"}
            </label>
            <input
              dir="ltr"
              inputMode="decimal"
              value={bordereau.commissionManualDA || ""}
              onChange={(e) => onChange({ ...bordereau, commissionManualDA: e.target.value })}
              placeholder={formatNumber(totals.autoComDA, 2)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
              {isAr ? "حقوق السوق (D. de marché)" : "D. de marché (DA)"}
            </label>
            <input
              dir="ltr"
              inputMode="decimal"
              value={bordereau.droitsMarcheDA}
              onChange={(e) => onChange({ ...bordereau, droitsMarcheDA: e.target.value })}
              placeholder="0"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
              {isAr ? "تسبيق المنتج (Av. Producteur)" : "Av. Producteur (DA)"}
            </label>
            <input
              dir="ltr"
              inputMode="decimal"
              value={bordereau.avanceProducteurDA}
              onChange={(e) => onChange({ ...bordereau, avanceProducteurDA: e.target.value })}
              placeholder="0"
              className={inputCls}
            />
          </div>
        </div>

        <div className="border-t pt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
          <div className="rounded-lg bg-muted/40 p-2">
            <span className="text-muted-foreground block text-[10px]">{isAr ? "المجموع الخام" : "TOTAL Brut"}</span>
            <strong dir="ltr" className="font-mono text-foreground">{formatDA(totals.totalVenteBrute, 2)}</strong>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <span className="text-muted-foreground block text-[10px]">COM ({totals.comPct}%)</span>
            <strong dir="ltr" className="font-mono text-rose-700 dark:text-rose-400">− {formatDA(totals.comDA, 2)}</strong>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <span className="text-muted-foreground block text-[10px]">{isAr ? "حقوق السوق" : "D. marché"}</span>
            <strong dir="ltr" className="font-mono text-rose-700 dark:text-rose-400">− {formatDA(totals.droitsMarche, 2)}</strong>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <span className="text-muted-foreground block text-[10px]">{isAr ? "التسبيق" : "Av. Prod."}</span>
            <strong dir="ltr" className="font-mono text-rose-700 dark:text-rose-400">− {formatDA(totals.avanceProducteur, 2)}</strong>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-lg bg-emerald-600/15 border border-emerald-600/35 p-2">
            <span className="text-emerald-800 dark:text-emerald-300 font-bold block text-[10px]">
              {isAr ? "الصافي للدفع" : "NET À PAYER"}
            </span>
            <strong dir="ltr" className="font-mono font-black text-emerald-800 dark:text-emerald-200 text-xs">
              {formatDA(totals.netAPayer, 2)}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
