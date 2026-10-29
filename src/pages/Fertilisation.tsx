import { Link } from "@/lib/router-compat";
import { Sprout, ArrowRight, Plus, Trash2, Save, Clock, Droplets, AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useAllModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcels } from "@/lib/parcel-store";
import {
  ListPageShell,
  ProgramFiltersBar,
  matchesFilters,
  useFilters,
  useYearsFromDates,
} from "@/components/programs/ProgramFiltersBar";
import { IngenieurRecoBanner } from "@/components/programs/IngenieurRecoBanner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FERTILIZER_DATABASE, FertilizerProduct } from "@/data/fertilizers";
import { toast } from "sonner";

interface Rec {
  id: string;
  parcelId: string;
  createdAt: number;
  date: string;
  entries?: { bac: string; items: { name: string; qty: string; price: string; unit: string }[] }[];
  total: number;
}

type Bac = "A" | "B" | "C" | "D";

interface Item {
  name: string;
  unit: "kg" | "litres";
  qty: string;
  price: string;
  solubility: number;
  time: number;
  note: string;
}

interface BacEntry {
  bac: Bac;
  items: Item[];
}

const BACS: Bac[] = ["A", "B", "C", "D"];

const CLEANED_BAC_PRODUCTS: Record<Bac, string[]> = {
  A: ["Nitrate de Calcium / نترات كالسـيوم"],
  B: [
    "Sulfate de Potassium / سلفات البوتاسيوم SOP",
    "Nitrate de Potassium / نترات البوتاسيوم",
    "Sulfate de Magnésium / سلفات maغنسيوم",
    "Sulfate de Magnésium / سلفات ماغنسيوم",
    "Nitrate de Magnésium / نترات ماغنسiوم",
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

function parseNumber(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function FertilisationListPage() {
  const records = useAllModuleRecords<Rec>("fertilisation");
  const parcels = useParcels();
  const [filters, setFilters] = useFilters();
  const years = useYearsFromDates(records.map((r) => r.date));
  const { add } = useModuleActions();

  // Dialog States
  const [addOpen, setAddOpen] = useState(false);
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [fertDialogOpen, setFertDialogOpen] = useState(false);

  // V9 Form States
  const [date, setDate] = useState("");
  const [hectares, setHectares] = useState<string>("1");
  const [frequency, setFrequency] = useState<string>("1");
  const [currentBac, setCurrentBac] = useState<Bac>("A");
  const [entries, setEntries] = useState<BacEntry[]>([
    { bac: "A", items: [] },
    { bac: "B", items: [] },
    { bac: "C", items: [] },
    { bac: "D", items: [] },
  ]);

  const filtered = useMemo(
    () =>
      records
        .filter((r) => matchesFilters(r.date, r.parcelId, filters))
        .sort((a, b) => b.createdAt - a.createdAt),
    [records, filters],
  );

  // Group by parcel
  const grouped = useMemo(() => {
    const map = new Map<string, { total: number; items: Rec[] }>();
    for (const r of filtered) {
      if (!map.has(r.parcelId)) map.set(r.parcelId, { total: 0, items: [] });
      const g = map.get(r.parcelId)!;
      g.items.push(r);
      g.total += r.total || 0;
    }
    return [...map.entries()];
  }, [filtered]);

  const grandTotal = filtered.reduce((s, r) => s + (r.total || 0), 0);

  function openNewDialog() {
    setSelectedParcels([]);
    setAddOpen(true);
  }

  function confirmAddParcels() {
    if (selectedParcels.length === 0) return;
    setAddOpen(false);

    // Sum surface of selected parcels
    const totalSelectedHectares = selectedParcels.reduce((sum, pid) => {
      const p = parcels.find(x => x.id === pid);
      const surf = parseFloat(p?.info?.surface?.replace(",", ".") || "0");
      return sum + (isNaN(surf) ? 0 : surf);
    }, 0);

    setDate("");
    setHectares(totalSelectedHectares > 0 ? totalSelectedHectares.toFixed(2) : "1");
    setFrequency("1");
    setCurrentBac("A");
    setEntries([
      { bac: "A", items: [] },
      { bac: "B", items: [] },
      { bac: "C", items: [] },
      { bac: "D", items: [] },
    ]);
    setFertDialogOpen(true);
  }

  const parsedHectares = parseNumber(hectares) || 1;
  const parsedFrequency = parseNumber(frequency) || 1;
  const current = entries.find((e) => e.bac === currentBac) ?? { bac: currentBac, items: [] };

  function rowCalculations(it: Item) {
    const doseHa = parseNumber(it.qty);
    const doseTotale = doseHa * parsedHectares;
    const priceUnit = parseNumber(it.price);
    const montant = doseTotale * priceUnit;

    let eauMin = 0;
    if (it.solubility > 0) {
      if (it.solubility > 4000) {
        eauMin = 0;
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

  const bacStats = BACS.map(getBacStats);
  const costPerPassage = bacStats.reduce((s, st) => s + st.cost, 0);
  const costWeekly = costPerPassage * parsedFrequency;

  function addRow() {
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

  function removeRow(rowIndex: number) {
    setEntries((arr) =>
      arr.map((e) =>
        e.bac === currentBac ? { ...e, items: e.items.filter((_, idx) => idx !== rowIndex) } : e
      )
    );
  }

  function saveFertilisation() {
    if (!date) {
      toast.error("Veuillez choisir une date d'application.");
      return;
    }
    const valid = entries.filter((e) => e.items.length > 0);
    if (valid.length === 0) {
      toast.error("Veuillez renseigner au moins un engrais.");
      return;
    }

    selectedParcels.forEach((pid) => {
      const p = parcels.find(x => x.id === pid);
      const pSurface = parseFloat(p?.info?.surface?.replace(",", ".") || "1") || 1;

      // Scale calculations for this parcel
      let pCostPerPassage = 0;
      const pEntries = valid.map((entry) => {
        return {
          bac: entry.bac,
          items: entry.items.map((it) => {
            const doseHa = parseFloat(it.qty.replace(",", ".")) || 0;
            const doseTotale = doseHa * pSurface;
            const priceUnit = parseFloat(it.price.replace(",", ".")) || 0;
            pCostPerPassage += doseTotale * priceUnit;
            return it;
          })
        };
      });
      const pCostWeekly = pCostPerPassage * (parseInt(frequency, 10) || 1);

      const pPayload = {
        date,
        hectares: pSurface,
        frequency: parseInt(frequency, 10) || 1,
        entries: pEntries,
        total: pCostWeekly,
      };

      add(pid, "fertilisation", pPayload);
    });

    setFertDialogOpen(false);
    toast.success(`Programme de fertilisation enregistré avec succès pour ${selectedParcels.length} parcelle(s).`);
  }

  return (
    <ListPageShell title="Programmes de fertilisation">
      <IngenieurRecoBanner kind="fertilisation" />
      
      <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
        <div className="flex-1">
          <ProgramFiltersBar value={filters} onChange={setFilters} years={years} />
        </div>
        <Button
          onClick={openNewDialog}
          className="h-11 sm:h-12 w-full sm:w-auto rounded-xl font-bold bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nouveau
        </Button>
      </div>

      {grouped.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Aucun programme.</Card>
      ) : (
        <>
          <Card className="p-3 flex items-center justify-between bg-primary/5">
            <span className="text-sm font-semibold text-foreground">Total global</span>
            <span className="text-base font-bold text-primary">{grandTotal.toFixed(2)} DA</span>
          </Card>

          <div className="space-y-4">
            {grouped.map(([pid, g]) => {
              const parcel = parcels.find((p) => p.id === pid);
              return (
                <section key={pid} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold text-foreground">
                      {parcel?.name ?? pid}
                    </h2>
                    <span className="text-xs font-bold text-primary">
                      Total parcelle : {g.total.toFixed(2)} DA
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {g.items.map((r) => {
                      const nbItems =
                        r.entries?.reduce(
                          (s, e) => s + e.items.filter((it) => it.qty || it.price).length,
                          0,
                        ) ?? 0;
                      const bacs = r.entries?.map((e) => e.bac).join(", ") ?? "—";
                      return (
                        <li key={r.id}>
                          <Link to="/parcelle/$id" params={{ id: pid }} className="block">
                            <Card className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                              <div className="rounded-full bg-primary/10 p-2">
                                <Sprout className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium">{r.date}</span>
                                  <span className="text-xs font-bold">
                                    {(r.total ?? 0).toFixed(2)} DA
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                  Bac(s) {bacs} • {nbItems} nutriments
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Card>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* Dialog Select Parcel */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Sélectionner les parcelles</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Parcelles</Label>
                <div className="flex gap-2 text-[10px] font-bold text-primary">
                  <button type="button" onClick={() => setSelectedParcels(parcels.map(p => p.id))} className="hover:underline">
                    Tout cocher
                  </button>
                  <span className="text-muted-foreground/30 font-normal">|</span>
                  <button type="button" onClick={() => setSelectedParcels([])} className="text-muted-foreground hover:underline">
                    Tout décocher
                  </button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-xl bg-muted/10 p-2 space-y-1.5">
                {parcels.map((p) => {
                  const isChecked = selectedParcels.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        isChecked
                          ? "bg-primary/5 border-primary text-foreground"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParcels([...selectedParcels, p.id]);
                          } else {
                            setSelectedParcels(selectedParcels.filter((id) => id !== p.id));
                          }
                        }}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4 shrink-0"
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button onClick={confirmAddParcels} disabled={selectedParcels.length === 0} className="rounded-xl font-bold bg-primary text-primary-foreground">
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Fertilisation configuration */}
      <Dialog open={fertDialogOpen} onOpenChange={setFertDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Calculateur Fertilisation Multi-Parcelle (V9)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-xl bg-muted/30 p-2.5 border text-muted-foreground font-semibold">
              <span className="font-bold text-foreground">Parcelles :</span> {selectedParcels.map(pid => parcels.find(p => p.id === pid)?.name).join(", ")}
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-3 gap-3">
              <label className="text-xs font-semibold text-muted-foreground">
                Date d'application
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                Nombre d'hectares total
                <input
                  type="text"
                  inputMode="decimal"
                  value={hectares}
                  onChange={(e) => setHectares(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                Passages / semaine
                <input
                  type="number"
                  min="1"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>
            </div>

            {/* Bacs Selector */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Sélection du Bac à renseigner</p>
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
                      className={`relative rounded-lg border py-2 text-xs font-bold transition-all ${
                        currentBac === b
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : filled
                          ? isOverflow
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-primary/20 bg-primary/10 text-primary hover:bg-primary/25"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Bac {b}
                      {filled && (
                        <span
                          className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
                            isOverflow ? "bg-destructive animate-pulse" : "bg-primary"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Bac config */}
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {BAC_LABELS[currentBac]}
                </h4>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/25 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Choisir un engrais
                </button>
              </div>

              {current.items.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Aucun produit sélectionné pour ce Bac. Cliquez sur "Choisir un engrais".
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {current.items.map((it, idx) => {
                    const calcs = rowCalculations(it);
                    return (
                      <div key={idx} className="space-y-2 rounded-lg border bg-card p-3 shadow-xs">
                        <div className="grid grid-cols-12 gap-2 items-center">
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

                          <div className="col-span-4 sm:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Dose Totale</label>
                            <div className="mt-1 text-sm font-bold text-foreground text-right font-mono">
                              {calcs.doseTotale.toFixed(1)} {it.unit}
                            </div>
                          </div>

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

                          <div className="col-span-12 sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="rounded border border-input p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
                          <div className="flex flex-wrap items-center gap-x-3 text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-semibold text-primary">
                              <Droplets className="h-3.5 w-3.5 shrink-0" />
                              Eau Min : <b>{calcs.eauMin > 0 ? `${calcs.eauMin} L` : "0 L (Liquide)"}</b>
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              Agitation : <b>{calcs.eauMin > 0 ? `${it.time} min` : "1 min"}</b>
                            </span>
                          </div>
                          <div className="font-bold text-primary font-mono">
                            Montant : {calcs.montant.toFixed(2)} DA
                          </div>
                        </div>

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

            {/* Recapitulation */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide border-b pb-1.5">
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
                          <td className="p-2 border text-center font-bold text-blue-600 font-mono">
                            {st.eauInitiale > 0 ? `${st.eauInitiale} L` : "—"}
                          </td>
                          <td className="p-2 border text-center font-mono">
                            {st.volSolution > 0 ? `${st.volSolution.toFixed(1)} L` : "—"}
                          </td>
                          <td className="p-2 border text-center">
                            {st.volSolution > 0 ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  isOverflow
                                    ? "bg-destructive text-destructive-foreground animate-pulse"
                                    : "bg-primary text-primary-foreground"
                                }`}
                              >
                                {st.alert}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-2 border text-center font-bold text-muted-foreground font-mono">
                            {st.maxTime > 0 ? `${st.maxTime} min` : "—"}
                          </td>
                          <td className="p-2 border text-right font-bold text-primary font-mono">
                            {st.cost > 0 ? `${st.cost.toFixed(2)} DA` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total summary */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full sm:w-auto font-mono">
                <div className="text-xs text-muted-foreground">Coût total / passage :</div>
                <div className="text-xs font-bold text-foreground text-right">{costPerPassage.toFixed(2)} DA</div>
                
                <div className="text-sm font-semibold text-primary">Coût total hebdomadaire (estimé) :</div>
                <div className="text-sm font-black text-primary text-right">{costWeekly.toFixed(2)} DA</div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setFertDialogOpen(false)} className="rounded-xl">
                  Annuler
                </Button>
                <Button
                  onClick={saveFertilisation}
                  disabled={!date || costPerPassage === 0}
                  className="rounded-xl font-bold bg-primary text-primary-foreground"
                >
                  Valider & Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ListPageShell>
  );
}

export default FertilisationListPage;
