import { useState, useEffect } from "react";
import { Plus, Trash2, Save, History, Check, Pencil, X, AlertTriangle, AlertCircle, Droplets, Clock, DollarSign } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcel } from "@/lib/parcel-store";
import { FERTILIZER_DATABASE, FertilizerProduct } from "@/data/fertilizers";

type Bac = "A" | "B" | "C" | "D";

interface Item {
  name: string;
  unit: "kg" | "litres";
  qty: string; // Dose per Ha in the UI
  price: string;
  solubility: number;
  time: number;
  note: string;
}

interface BacEntry {
  bac: Bac;
  items: Item[];
}

interface FertilisationRecord {
  id: string;
  createdAt: number;
  date: string;
  hectares: number;
  frequency: number;
  entries: BacEntry[];
  total: number;
}

const BACS: Bac[] = ["A", "B", "C", "D"];

const BAC_PRODUCTS: Record<Bac, string[]> = {
  A: ["Nitrate de Calcium / نترات كالسـيوم"],
  B: [
    "Urée / يوريا",
    "Nitrate de Potassium / نترات البوتاسيوم",
    "Sulfate de Potassium / سلفat البوتاسيوم SOP",
    "Sulfate de Potassium / سلفات البوتاسيوم SOP",
    "Nitrate de Magnésium / نترات ماغنسiوم",
    "Nitrate de Magnésium / نترات ماغنسيوم",
    "Sulfate de Magnésium / سلفat ماغنسيوم",
    "Sulfate de Magnésium / سلفات ماغنسيوم"
  ],
  C: [
    "Acide Humique / أسمدة عضوية",
    "Fer 6% / حديد 6%",
    "Oligo-éléments / عناصر صغري",
    "GZB Stimulateur de racines / منشط جذور"
  ],
  D: [
    "Acide Nitrique / حامض نيتريك",
    "Acide Nitrique / حامض nيتريك",
    "Acide Phosphorique / حامض فوسفوريك",
    "Acide Citrique / حامض سيتريك",
    "Acide Ascorbique / اسكوربيك اسيد"
  ]
};

// Normalize names to avoid duplicates in the array and handle typos
const CLEANED_BAC_PRODUCTS: Record<Bac, string[]> = {
  A: ["Nitrate de Calcium / نترات كالسـيوم"],
  B: [
    "Sulfate de Potassium / سلفات البوتاسيوم SOP",
    "Nitrate de Potassium / نترات البوتاسيوم",
    "Sulfate de Magnésium / سلفات ماغنسيوم",
    "Nitrate de Magnésium / نترات ماغنسيوم",
    "Urée / يوريا"
  ],
  C: [
    "Acide Humique / أسمدة عضوية",
    "Fer 6% / حديد 6%",
    "Oligo-éléments / عناصر صغري",
    "GZB Stimulateur de racines / منشط جذور"
  ],
  D: [
    "Acide Nitrique / حامض nيتريك",
    "Acide Nitrique / حامض نيتريك",
    "Acide Phosphorique / حامض فوسفوريك",
    "Acide Citrique / حامض سيتريك",
    "Acide Ascorbique / اسكوربيك اسيد"
  ]
};

const BAC_LABELS: Record<Bac, string> = {
  A: "BAC A — Source exclusive de Calcium",
  B: "BAC B — Macro-Éléments (Sauf Calcium & Phosphore)",
  C: "BAC C — Oligo-Éléments, Acide Humique, Fer & GZB",
  D: "BAC D — Acides (Nitrique, Phosphorique, Citrique, Ascorbique)",
};

function getProductsForBac(bac: Bac): FertilizerProduct[] {
  const allowed = CLEANED_BAC_PRODUCTS[bac];
  const list: FertilizerProduct[] = [];
  for (const name of allowed) {
    const found = FERTILIZER_DATABASE.find((p) => p.name === name);
    if (found && !list.some((p) => p.name === found.name)) {
      list.push(found);
    }
  }
  return list;
}

// Helper: safe float parsing
function parseNumber(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function FertilisationModule({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const parcel = useParcel(parcelId);
  const records = useModuleRecords<FertilisationRecord>(parcelId, "fertilisation");
  const { add, remove, update } = useModuleActions();

  // Parsing default hectares from parcel surface
  const initialHectares = parcel?.info?.surface ? parseNumber(parcel.info.surface) : 1;

  const [date, setDate] = useState("");
  const [hectares, setHectares] = useState<string>(initialHectares.toString());
  const [frequency, setFrequency] = useState<string>("1");
  const [currentBac, setCurrentBac] = useState<Bac>("A");
  const [entries, setEntries] = useState<BacEntry[]>([
    { bac: "A", items: [] },
    { bac: "B", items: [] },
    { bac: "C", items: [] },
    { bac: "D", items: [] },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Prefill surface if parcel changes
  useEffect(() => {
    if (parcel?.info?.surface) {
      setHectares(parseNumber(parcel.info.surface).toString());
    }
  }, [parcel]);

  const parsedHectares = parseNumber(hectares) || 1;
  const parsedFrequency = parseNumber(frequency) || 1;

  const current = entries.find((e) => e.bac === currentBac) ?? { bac: currentBac, items: [] };

  // Calculate detailed parameters for a row item
  function rowCalculations(it: Item) {
    const doseHa = parseNumber(it.qty);
    const doseTotale = doseHa * parsedHectares;
    const priceUnit = parseNumber(it.price);
    const montant = doseTotale * priceUnit;

    let eauMin = 0;
    if (it.solubility > 0) {
      if (it.solubility > 4000) {
        eauMin = 0; // Liquid acid, no dissolution water needed
      } else {
        eauMin = Math.ceil((doseTotale * 100 / it.solubility) * 1.5);
      }
    }

    return {
      doseTotale,
      eauMin,
      montant,
    };
  }

  // Calculate stats for a single Bac
  function getBacStats(bac: Bac) {
    const entry = entries.find((e) => e.bac === bac);
    if (!entry || entry.items.length === 0) {
      return { eauInitiale: 0, volSolution: 0, maxTime: 0, cost: 0, alert: "OK" };
    }

    let sumEauMin = 0;
    let sumDoseTotale = 0;
    let maxTime = 0;
    let cost = 0;

    for (const it of entry.items) {
      const calcs = rowCalculations(it);
      sumEauMin += calcs.eauMin;
      sumDoseTotale += calcs.doseTotale;
      cost += calcs.montant;
      if (calcs.eauMin > 0) {
        maxTime = Math.max(maxTime, it.time);
      }
    }

    // Displacement volume formula: Initial Water + 0.6L per kg/L of solids
    const volSolution = sumEauMin + sumDoseTotale * 0.6;
    const alert = volSolution > 1000 ? "TROP PLEIN !" : "OK";

    return {
      eauInitiale: sumEauMin,
      volSolution,
      maxTime,
      cost,
      alert,
    };
  }

  // Grand totals across all Bacs
  const bacStats = BACS.map(getBacStats);
  const costPerPassage = bacStats.reduce((s, st) => s + st.cost, 0);
  const costWeekly = costPerPassage * parsedFrequency;

  // Add a product row
  function addRow() {
    // Select first bac-specific product as placeholder
    const allowedProds = getProductsForBac(currentBac);
    const defProd = allowedProds[0] || FERTILIZER_DATABASE[0];
    const newItem: Item = {
      name: defProd.name,
      unit: defProd.unit,
      qty: "",
      price: defProd.price.toString(),
      solubility: defProd.solubility,
      time: defProd.time,
      note: defProd.note,
    };

    setEntries((arr) =>
      arr.map((e) => (e.bac === currentBac ? { ...e, items: [...e.items, newItem] } : e))
    );
  }

  // Update row product
  function handleProductChange(rowIndex: number, productName: string) {
    const prod = FERTILIZER_DATABASE.find((p) => p.name === productName);
    if (!prod) return;

    setEntries((arr) =>
      arr.map((e) =>
        e.bac === currentBac
          ? {
              ...e,
              items: e.items.map((it, idx) =>
                idx === rowIndex
                  ? {
                      ...it,
                      name: prod.name,
                      unit: prod.unit,
                      price: prod.price.toString(),
                      solubility: prod.solubility,
                      time: prod.time,
                      note: prod.note,
                    }
                  : it
              ),
            }
          : e
      )
    );
  }

  // Update a field on a row
  function updateItem(rowIndex: number, patch: Partial<Item>) {
    setEntries((arr) =>
      arr.map((e) =>
        e.bac === currentBac
          ? {
              ...e,
              items: e.items.map((it, idx) => (idx === rowIndex ? { ...it, ...patch } : it)),
            }
          : e
      )
    );
  }

  // Remove a row
  function removeRow(rowIndex: number) {
    setEntries((arr) =>
      arr.map((e) =>
        e.bac === currentBac ? { ...e, items: e.items.filter((_, idx) => idx !== rowIndex) } : e
      )
    );
  }

  function resetForm() {
    setEditingId(null);
    setDate("");
    setFrequency("1");
    setHectares(initialHectares.toString());
    setCurrentBac("A");
    setEntries([
      { bac: "A", items: [] },
      { bac: "B", items: [] },
      { bac: "C", items: [] },
      { bac: "D", items: [] },
    ]);
  }

  function startEdit(r: FertilisationRecord) {
    setEditingId(r.id);
    setDate(r.date);
    setHectares(r.hectares.toString());
    setFrequency((r.frequency || 1).toString());

    // Map saved entries with standard empty structure for all bacs
    const rebuilt: BacEntry[] = BACS.map((b) => {
      const found = r.entries.find((e) => e.bac === b);
      if (!found) return { bac: b, items: [] };

      // Map items and ensure they have all necessary properties from database if custom
      const mappedItems: Item[] = found.items.map((it) => {
        const dbProd = FERTILIZER_DATABASE.find((p) => p.name === it.name);
        return {
          name: it.name,
          unit: it.unit,
          qty: it.qty,
          price: it.price || dbProd?.price.toString() || "0",
          solubility: it.solubility ?? dbProd?.solubility ?? 100,
          time: it.time ?? dbProd?.time ?? 15,
          note: it.note ?? dbProd?.note ?? "",
        };
      });
      return { bac: b, items: mappedItems };
    });

    setEntries(rebuilt);
    // Switch to first bac that has products
    const firstFilled = rebuilt.find((e) => e.items.length > 0);
    setCurrentBac(firstFilled?.bac ?? "A");

    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function save() {
    if (!date) return;
    const valid = entries.filter((e) => e.items.length > 0);
    if (valid.length === 0) return;

    const payload = {
      date,
      hectares: parsedHectares,
      frequency: parsedFrequency,
      entries: valid,
      total: costWeekly, // Store weekly cost as grand total
    };

    if (editingId) {
      update(parcelId, "fertilisation", editingId, payload);
    } else {
      add(parcelId, "fertilisation", payload);
    }
    resetForm();
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">
              {editingId ? "Modifier le Programme (Calculateur V9)" : "Nouveau Programme (Calculateur V9)"}
            </h3>
            {editingId && (
              <button
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Annuler
              </button>
            )}
          </div>

          {/* Form Parameters */}
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-semibold text-muted-foreground">
              Date d'application
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Nombre d'hectares
              <input
                type="text"
                inputMode="decimal"
                value={hectares}
                onChange={(e) => setHectares(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Passages / semaine
              <input
                type="number"
                min="1"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          {/* Bac Selector Buttons */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Sélection du Bac à renseigner</p>
            <div className="grid grid-cols-4 gap-1.5">
              {BACS.map((b) => {
                const filled = entries.find((e) => e.bac === b && e.items.length > 0);
                const stats = getBacStats(b);
                const isOverflow = stats.alert === "TROP PLEIN !";
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setCurrentBac(b)}
                    className={`relative rounded-lg border py-2.5 text-xs font-bold transition-all ${
                      currentBac === b
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : filled
                        ? isOverflow
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-olive-mid bg-olive-mid/10 text-olive-dark hover:bg-olive-mid/20"
                        : "border-input bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Bac {b}
                    {filled && (
                      <span
                        className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
                          isOverflow ? "bg-destructive animate-pulse" : "bg-olive-mid"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Bac Table Container */}
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                {BAC_LABELS[currentBac]}
              </h4>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 rounded-md bg-olive-mid/15 px-2 py-1 text-xs font-bold text-olive-dark hover:bg-olive-mid/25 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Choisir un engrais
              </button>
            </div>

            {current.items.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Aucun produit sélectionné pour ce Bac. Cliquez sur "Choisir un engrais" pour commencer.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {current.items.map((it, idx) => {
                  const calcs = rowCalculations(it);
                  return (
                    <div key={idx} className="space-y-2 rounded-lg border bg-card p-3 shadow-xs">
                      {/* Product Selector and Inputs */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        {/* Dropdown Menu */}
                        <div className="col-span-12 sm:col-span-5">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">Produit</label>
                          <select
                            value={it.name}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none"
                          >
                            {getProductsForBac(currentBac).map((p) => (
                              <option key={p.name} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Dose / Ha */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            Dose / Ha ({it.unit})
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Dose"
                            value={it.qty}
                            onChange={(e) => updateItem(idx, { qty: e.target.value })}
                            className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1 text-sm text-right focus:outline-none"
                          />
                        </div>

                        {/* Dose Totale (Auto) */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">Dose Totale</label>
                          <div className="mt-1 text-sm font-bold text-foreground text-right">
                            {calcs.doseTotale.toFixed(1)} {it.unit}
                          </div>
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">Prix (DA)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Prix"
                            value={it.price}
                            onChange={(e) => updateItem(idx, { price: e.target.value })}
                            className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1 text-sm text-right focus:outline-none"
                          />
                        </div>

                        {/* Trash Button */}
                        <div className="col-span-12 sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="rounded border border-input p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Agronomical and Financial indicators (Calculated) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
                        <div className="flex flex-wrap items-center gap-x-3 text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-semibold text-olive-dark">
                            <Droplets className="h-3.5 w-3.5 shrink-0" />
                            Eau Min : <b>{calcs.eauMin > 0 ? `${calcs.eauMin} L` : "0 L (Liquide)"}</b>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            Agitation : <b>{calcs.eauMin > 0 ? `${it.time} min` : "1 min"}</b>
                          </span>
                        </div>
                        <div className="font-bold text-primary">
                          Montant : {calcs.montant.toFixed(2)} DA
                        </div>
                      </div>

                      {/* Safety & Note Banner */}
                      {it.note && (
                        <div className="rounded bg-primary/5 px-2.5 py-1 text-[11px] text-primary flex items-start gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{it.note}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* V9 Logistical Summary Table Card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-1.5">
              Récapitulatif Logistique & Sécurité par Bac
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted text-muted-foreground border-b uppercase font-bold text-[10px]">
                    <th className="p-2 border">Identifiant Bac</th>
                    <th className="p-2 border text-center">Eau Initiale (L)</th>
                    <th className="p-2 border text-center">Vol. Estimé (L)</th>
                    <th className="p-2 border text-center">Statut Cuve 1000L</th>
                    <th className="p-2 border text-center">Agitation (min)</th>
                    <th className="p-2 border text-right">Coût Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium text-foreground">
                  {BACS.map((b, i) => {
                    const st = bacStats[i];
                    const isOverflow = st.alert === "TROP PLEIN !";
                    return (
                      <tr key={b} className={currentBac === b ? "bg-primary/5" : ""}>
                        <td className="p-2 border font-bold">BAC {b}</td>
                        <td className="p-2 border text-center font-bold text-blue-600">
                          {st.eauInitiale > 0 ? `${st.eauInitiale} L` : "—"}
                        </td>
                        <td className="p-2 border text-center">
                          {st.volSolution > 0 ? `${st.volSolution.toFixed(1)} L` : "—"}
                        </td>
                        <td className="p-2 border text-center">
                          {st.volSolution > 0 ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isOverflow
                                  ? "bg-destructive text-destructive-foreground animate-pulse"
                                  : "bg-olive-mid text-white"
                              }`}
                            >
                              {st.alert}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-2 border text-center font-bold text-muted-foreground">
                          {st.maxTime > 0 ? `${st.maxTime} min` : "—"}
                        </td>
                        <td className="p-2 border text-right font-bold text-primary">
                          {st.cost > 0 ? `${st.cost.toFixed(2)} DA` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand totals and saving */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full sm:w-auto">
              <div className="text-xs text-muted-foreground">Coût total / passage :</div>
              <div className="text-xs font-bold text-foreground text-right">{costPerPassage.toFixed(2)} DA</div>
              
              <div className="text-sm font-semibold text-primary">Coût total hebdomadaire :</div>
              <div className="text-sm font-black text-primary text-right">{costWeekly.toFixed(2)} DA</div>
            </div>

            <button
              onClick={save}
              disabled={!date || costPerPassage === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Save className="h-4 w-4" /> {editingId ? "Mettre à jour le calculateur" : "Valider & Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* Historical Archives */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-bold text-foreground">
          <History className="h-4 w-4 text-primary" /> Historique des applications ({records.length})
        </div>
        {records.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">Aucun programme enregistré.</p>
        ) : (
          <ul className="divide-y">
            {records.map((r) => (
              <li key={r.id} className="p-4 space-y-3">
                {/* Header info */}
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground">{r.date}</span>
                    <p className="text-[10px] text-muted-foreground">
                      Parcelle : {r.hectares || "—"} ha • Fréquence : {r.frequency || 1}/semaine
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-primary text-sm">
                      {r.total.toFixed(2)} DA / sem
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(r)}
                          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(parcelId, "fertilisation", r.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bacs entries detail grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {r.entries.map((e, ei) => {
                    // Compute stats for saved items
                    let sumEauMin = 0;
                    let sumDoseTotale = 0;
                    let maxTime = 0;
                    let cost = 0;

                    for (const it of e.items) {
                      const doseHa = parseNumber(it.qty);
                      const doseTotale = doseHa * (r.hectares || 1);
                      sumDoseTotale += doseTotale;
                      cost += doseTotale * parseNumber(it.price);

                      const dbProd = FERTILIZER_DATABASE.find((p) => p.name === it.name);
                      const solubility = it.solubility ?? dbProd?.solubility ?? 100;
                      if (solubility > 0) {
                        const itEauMin = solubility > 4000 ? 0 : Math.ceil((doseTotale * 1000 / solubility) * 1.5);
                        sumEauMin += itEauMin;
                        if (itEauMin > 0) {
                          maxTime = Math.max(maxTime, it.time ?? dbProd?.time ?? 15);
                        }
                      }
                    }

                    const volSolution = sumEauMin + sumDoseTotale * 0.6;
                    const isOverflow = volSolution > 1000;

                    return (
                      <div key={ei} className="rounded-lg border bg-muted/20 p-2.5 text-xs">
                        <div className="flex items-center justify-between border-b pb-1.5 mb-1.5 font-bold">
                          <span className="text-primary uppercase tracking-wide">BAC {e.bac}</span>
                          <span className="text-foreground">{cost.toFixed(2)} DA</span>
                        </div>
                        <ul className="space-y-1 text-muted-foreground">
                          {e.items.map((it, i) => (
                            <li key={i} className="flex justify-between text-[11px]">
                              <span className="truncate max-w-[70%]">
                                • {it.name.split("/")[0]}
                              </span>
                              <span className="font-semibold text-foreground">
                                {it.qty} {it.unit}/ha ({(parseNumber(it.qty) * (r.hectares || 1)).toFixed(1)} {it.unit})
                              </span>
                            </li>
                          ))}
                        </ul>

                        {/* Preparational checklist specs */}
                        <div className="mt-2 pt-1.5 border-t border-dashed flex flex-wrap gap-2 text-[10px]">
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                            Eau Init : {sumEauMin} L
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-semibold ${isOverflow ? "bg-red-50 text-red-700 animate-pulse" : "bg-green-50 text-green-700"}`}>
                            Vol Solution : {volSolution.toFixed(0)} L {isOverflow ? "(⚠ TROP PLEIN)" : ""}
                          </span>
                          {maxTime > 0 && (
                            <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded font-semibold">
                              Agit : {maxTime} min
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
