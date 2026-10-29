import { useState, useMemo } from "react";
import { useAllModuleRecords } from "@/lib/modules-store";
import { useParcels } from "@/lib/parcel-store";
import { SPECIES_SUMMARIES } from "@/data/extra_farm_data";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DollarSign, Sprout, ShieldAlert, Leaf, CheckSquare, Square, Info } from "lucide-react";

const COLORS = ["#0284c7", "#10b981", "#ef4444", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6"];
const INTRANT_COLORS: Record<string, string> = {
  Fertilisation: "#0284c7", // Sky blue
  "Pulvérisation / Foliaire": "#10b981", // Emerald green
  Phytosanitaire: "#ef4444", // Red
  Amendement: "#f59e0b", // Amber
};

const MONTH_MAP: Record<string, string> = {
  "janvier": "01",
  "février": "02",
  "mars": "03",
  "avril": "04",
  "mai": "05",
  "juin": "06",
  "juillet": "07",
  "août": "08",
  "septembre": "09",
  "octobre": "10",
  "novembre": "11",
  "décembre": "12",
};

function parseDateFromProgram(progName: string): string {
  const parts = progName.toLowerCase().split(" ");
  const day = parts[0]?.padStart(2, "0") || "01";
  const monthWord = parts[1] || "";
  const month = MONTH_MAP[monthWord] || "03"; // Mars par défaut
  return `2026-${month}-${day}`;
}

export function StatsModule() {
  const parcels = useParcels();

  // Load all module records
  const fertRecords = useAllModuleRecords("fertilisation");
  const pulvRecords = useAllModuleRecords("pulverisation");
  const phytoRecords = useAllModuleRecords("phytosanitaire");
  const amendRecords = useAllModuleRecords("amendement");

  // State filters
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
    Fertilisation: true,
    "Pulvérisation / Foliaire": true,
    Phytosanitaire: true,
    Amendement: true,
  });
  const [groupBy, setGroupBy] = useState<"month" | "parcel" | "species">("month");

  // Aggregate static program summary records (from Excel)
  const staticRecords = useMemo(() => {
    const records: any[] = [];
    SPECIES_SUMMARIES.forEach((spec) => {
      const speciesName = spec.species; // NECTARINE, POMMIER, OLIVIER
      const defaultParcelId = speciesName === "NECTARINE" ? "nablara" : speciesName === "POMMIER" ? "pommier1" : "p1";
      
      spec.entries.forEach((entry) => {
        const date = parseDateFromProgram(entry.program);
        
        // Add simulated fertigation
        if (entry.fertigation > 0) {
          records.push({
            type: "Fertilisation",
            date,
            parcelId: defaultParcelId,
            productName: "Engrais (Excel)",
            cost: entry.fertigation,
          });
        }
        
        // Add simulated foliar
        if (entry.foliar > 0) {
          records.push({
            type: "Pulvérisation / Foliaire",
            date,
            parcelId: defaultParcelId,
            productName: "Foliaires (Excel)",
            cost: entry.foliar,
          });
        }
        
        // Add simulated phyto
        if (entry.phyto > 0) {
          records.push({
            type: "Phytosanitaire",
            date,
            parcelId: defaultParcelId,
            productName: "Phyto (Excel)",
            cost: entry.phyto,
          });
        }
      });
    });
    return records;
  }, []);
  
  // Extract all available products to let user filter them (including Excel ones)
  const allProducts = useMemo(() => {
    const productsSet = new Set<string>();

    // Add static products
    staticRecords.forEach((r) => {
      productsSet.add(r.productName);
    });
    
    fertRecords.forEach((r) => {
      (r.entries ?? []).forEach((e: any) => {
        (e.items ?? []).forEach((it: any) => {
          if (it.name) productsSet.add(it.name.split("/")[0].trim());
        });
      });
    });

    pulvRecords.forEach((r) => {
      (r.products ?? []).forEach((p: any) => {
        if (p.product) productsSet.add(p.product.split("/")[0].trim());
      });
    });

    phytoRecords.forEach((r) => {
      (r.products ?? []).forEach((p: any) => {
        if (p.product) productsSet.add(p.product.split("/")[0].trim());
      });
    });

    amendRecords.forEach((r) => {
      if (r.typeCompost) productsSet.add(r.typeCompost.split("/")[0].trim());
    });

    return Array.from(productsSet).sort();
  }, [staticRecords, fertRecords, pulvRecords, phytoRecords, amendRecords]);

  // Selected products filter state (defaults to all active)
  const [selectedProducts, setSelectedProducts] = useState<Record<string, boolean>>({});

  // Initialize selected products on first load if state is empty
  const activeProductsFilter = useMemo(() => {
    const hasAnyFilter = Object.values(selectedProducts).some((v) => !v);
    if (!hasAnyFilter) {
      const init: Record<string, boolean> = {};
      allProducts.forEach((p) => {
        init[p] = true;
      });
      return init;
    }
    return selectedProducts;
  }, [allProducts, selectedProducts]);

  // Compute KPI values (combining database and Excel static data)
  const stats = useMemo(() => {
    let fertTotal = 0;
    let pulvTotal = 0;
    let phytoTotal = 0;
    let amendTotal = 0;

    // Add static records
    staticRecords.forEach((r) => {
      if (r.type === "Fertilisation") fertTotal += r.cost;
      else if (r.type === "Pulvérisation / Foliaire") pulvTotal += r.cost;
      else if (r.type === "Phytosanitaire") phytoTotal += r.cost;
    });

    // Add database records
    fertRecords.forEach((r) => {
      fertTotal += r.total || 0;
    });
    pulvRecords.forEach((r) => {
      pulvTotal += r.total || 0;
    });
    phytoRecords.forEach((r) => {
      phytoTotal += r.total || 0;
    });
    amendRecords.forEach((r) => {
      amendTotal += parseFloat(r.totalCost) || (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0);
    });

    const grandTotal = fertTotal + pulvTotal + phytoTotal + amendTotal;

    return {
      fertTotal,
      pulvTotal,
      phytoTotal,
      amendTotal,
      grandTotal,
    };
  }, [staticRecords, fertRecords, pulvRecords, phytoRecords, amendRecords]);

  // Map parcel IDs to species/crop type
  const parcelMap = useMemo(() => {
    const map: Record<string, { name: string; type: string }> = {};
    parcels.forEach((p) => {
      map[p.id] = { name: p.name, type: p.type };
    });
    return map;
  }, [parcels]);

  // Aggregate cost data based on selected filters and grouping
  const chartData = useMemo(() => {
    const aggregation: Record<string, Record<string, number>> = {};

    function addCost(key: string, type: string, productName: string, amount: number) {
      if (!selectedTypes[type]) return;
      const cleanProd = productName.split("/")[0].trim();
      if (activeProductsFilter[cleanProd] === false) return;

      if (!aggregation[key]) aggregation[key] = { Fertilisation: 0, "Pulvérisation / Foliaire": 0, Phytosanitaire: 0, Amendement: 0, total: 0 };
      aggregation[key][type] = (aggregation[key][type] || 0) + amount;
      aggregation[key].total = (aggregation[key].total || 0) + amount;
    }

    function getKey(dateStr: string, parcelId: string) {
      if (groupBy === "month") {
        return dateStr ? dateStr.slice(0, 7) : "Indéfini"; // YYYY-MM
      }
      const pInfo = parcelMap[parcelId];
      if (groupBy === "parcel") {
        return pInfo ? pInfo.name : `Parcelle: ${parcelId}`;
      }
      // Group by species
      if (pInfo) {
        if (pInfo.type === "olivier") return "Oliviers / زيتون";
        if (pInfo.type === "pommier") return "Pommiers / تفاح";
        if (pInfo.type === "nectarine") return "Nectarines / خوخ";
        return "Autre / Crop";
      }
      return "Indéfini";
    }

    // 1. Process Static Excel Records
    staticRecords.forEach((r) => {
      const key = getKey(r.date, r.parcelId);
      addCost(key, r.type, r.productName, r.cost);
    });

    // 2. Process Fertigation (DB)
    fertRecords.forEach((r) => {
      const key = getKey(r.date, r.parcelId);
      (r.entries ?? []).forEach((e: any) => {
        (e.items ?? []).forEach((it: any) => {
          const qty = parseFloat(it.qty) || 0;
          const price = parseFloat(it.price) || 0;
          const hectares = r.hectares || 1;
          const cost = qty * hectares * price;
          addCost(key, "Fertilisation", it.name, cost);
        });
      });
    });

    // 3. Process Pulverisation (DB)
    pulvRecords.forEach((r) => {
      const key = getKey(r.date, r.parcelId);
      (r.products ?? []).forEach((p: any) => {
        const cost = parseFloat((p.price || "").replace(",", ".")) || 0;
        addCost(key, "Pulvérisation / Foliaire", p.product, cost);
      });
    });

    // 4. Process Phytosanitaire (DB)
    phytoRecords.forEach((r) => {
      const key = getKey(r.date, r.parcelId);
      (r.products ?? []).forEach((p: any) => {
        const cost = parseFloat((p.price || "").replace(",", ".")) || 0;
        addCost(key, "Phytosanitaire", p.product, cost);
      });
    });

    // 5. Process Amendement (DB)
    amendRecords.forEach((r) => {
      const key = getKey(r.date, r.parcelId);
      const cost = parseFloat(r.totalCost) || (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0);
      addCost(key, "Amendement", r.typeCompost, cost);
    });

    // Format for Recharts
    const list = Object.entries(aggregation).map(([name, vals]) => ({
      name,
      ...vals,
    }));

    // Sort by name if monthly
    if (groupBy === "month") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => (b.total || 0) - (a.total || 0));
    }

    return list;
  }, [staticRecords, fertRecords, pulvRecords, phytoRecords, amendRecords, groupBy, selectedTypes, activeProductsFilter, parcelMap]);

  // Pie chart data for overall distribution
  const pieData = useMemo(() => {
    return [
      { name: "Fertilisation", value: stats.fertTotal },
      { name: "Pulvérisation / Foliaire", value: stats.pulvTotal },
      { name: "Phytosanitaire", value: stats.phytoTotal },
      { name: "Amendement", value: stats.amendTotal },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const toggleProduct = (prod: string) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [prod]: prev[prod] === false ? true : false,
    }));
  };

  const selectAllProducts = (val: boolean) => {
    const patch: Record<string, boolean> = {};
    allProducts.forEach((p) => {
      patch[p] = val;
    });
    setSelectedProducts(patch);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-2xl border bg-card p-3 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-sky-600" /> Budget Intrants
          </span>
          <p className="font-mono font-bold text-base text-foreground mt-1">
            {stats.grandTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DA
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-3 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Sprout className="h-3 w-3 text-sky-500" /> Fertilisation
          </span>
          <p className="font-mono font-bold text-sm text-foreground mt-1">
            {stats.fertTotal.toLocaleString("fr-FR")} DA
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-3 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Leaf className="h-3 w-3 text-emerald-500" /> Pulv / Foliaire
          </span>
          <p className="font-mono font-bold text-sm text-foreground mt-1">
            {stats.pulvTotal.toLocaleString("fr-FR")} DA
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-3 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-destructive" /> Phytosanitaire
          </span>
          <p className="font-mono font-bold text-sm text-foreground mt-1">
            {stats.phytoTotal.toLocaleString("fr-FR")} DA
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-3 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Leaf className="h-3 w-3 text-amber-500" /> Amendements
          </span>
          <p className="font-mono font-bold text-sm text-foreground mt-1">
            {stats.amendTotal.toLocaleString("fr-FR")} DA
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Filters Controls Panel */}
        <div className="md:col-span-1 space-y-4 rounded-xl border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1.5 flex items-center gap-1.5">
            Filtres Interactifs
          </h3>

          {/* Group By Option */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Regroupement</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none"
            >
              <option value="month">Par Mois / Période</option>
              <option value="parcel">Par Parcelle</option>
              <option value="species">Par Espèce / Culture</option>
            </select>
          </div>

          {/* Type Checkboxes */}
          <div className="space-y-1.5 pt-2 border-t">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Type d'intrant</span>
            <div className="space-y-1 text-xs">
              {Object.keys(selectedTypes).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
                  className="flex items-center gap-1.5 py-0.5 text-foreground hover:text-primary text-left w-full"
                >
                  {selectedTypes[t] ? (
                    <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Filter List */}
          <div className="space-y-1.5 pt-2 border-t max-h-56 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Tracer les intrants ({allProducts.length})</span>
            </div>
            <div className="flex gap-2 text-[10px] pb-1">
              <button onClick={() => selectAllProducts(true)} className="text-sky-600 font-bold hover:underline">Tout cocher</button>
              <span>|</span>
              <button onClick={() => selectAllProducts(false)} className="text-muted-foreground hover:underline">Tout décocher</button>
            </div>
            <div className="space-y-1 text-xs">
              {allProducts.map((p) => {
                const isActive = activeProductsFilter[p] !== false;
                return (
                  <button
                    key={p}
                    onClick={() => toggleProduct(p)}
                    className="flex items-center gap-1.5 py-0.5 text-foreground hover:text-primary text-left w-full truncate"
                  >
                    {isActive ? (
                      <CheckSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate" title={p}>{p}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Graph Display Area */}
        <div className="md:col-span-3 space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Évolution et répartition des coûts
            </h3>
            {chartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                <Info className="h-4 w-4 mr-1" /> Aucune donnée disponible pour les filtres sélectionnés.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} className="text-[10px]" />
                    <YAxis
                      tickLine={false}
                      className="text-[10px]"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k DA`}
                    />
                    <Tooltip
                      formatter={(value: any) => [`${parseFloat(value).toFixed(2)} DA`]}
                      contentStyle={{ background: "#fff", border: "1px solid #ccc", borderRadius: "8px" }}
                    />
                    <Legend iconType="circle" className="text-xs" />
                    {selectedTypes["Fertilisation"] && (
                      <Line type="monotone" dataKey="Fertilisation" stroke={INTRANT_COLORS["Fertilisation"]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Fertilisation" />
                    )}
                    {selectedTypes["Pulvérisation / Foliaire"] && (
                      <Line type="monotone" dataKey="Pulvérisation / Foliaire" stroke={INTRANT_COLORS["Pulvérisation / Foliaire"]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Pulvérisation / Foliaire" />
                    )}
                    {selectedTypes["Phytosanitaire"] && (
                      <Line type="monotone" dataKey="Phytosanitaire" stroke={INTRANT_COLORS["Phytosanitaire"]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Phytosanitaire" />
                    )}
                    {selectedTypes["Amendement"] && (
                      <Line type="monotone" dataKey="Amendement" stroke={INTRANT_COLORS["Amendement"]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Amendement" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart of Dépenses */}
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Répartition Globale par Type d'Intrant
              </h3>
              {pieData.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted-foreground">Aucune donnée disponible.</p>
              ) : (
                <div className="flex items-center justify-between gap-2 h-44">
                  <div className="relative h-40 w-40 shrink-0">
                    {/* Centered Total Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Total</span>
                      <span className="text-[11px] font-bold text-foreground font-mono leading-none">
                        {Math.round(stats.grandTotal).toLocaleString("fr-FR")}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-bold">DA</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={66}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={INTRANT_COLORS[entry.name]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${(v).toLocaleString("fr-FR")} DA`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-[10px] flex-1 pl-3 border-l">
                    {pieData.map((d) => {
                      const pct = ((d.value / stats.grandTotal) * 100).toFixed(1);
                      return (
                        <div key={d.name} className="flex flex-col border-l-2 pl-2" style={{ borderColor: INTRANT_COLORS[d.name] }}>
                          <span className="font-bold text-foreground text-[11px] truncate leading-tight">{d.name}</span>
                          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                            <span className="text-foreground">{pct}%</span>
                            <span>·</span>
                            <span>{Math.round(d.value).toLocaleString("fr-FR")} DA</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Advice and summary info */}
            <div className="rounded-xl border bg-card p-4 shadow-xs space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Conseils & Analyse Agronomique
              </h3>
              <ul className="text-xs space-y-2 text-foreground">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 shrink-0 mt-0.5">🌱</span>
                  <span>
                    <b>Optimisation de la fertilisation</b> : La fertilisation au sol représente le poste principal de dépenses. Un fractionnement plus précis basé sur des analyses d'eau mensuelles pourrait réduire les pertes de calcium et potassium de 10%.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 shrink-0 mt-0.5">🍂</span>
                  <span>
                    <b>Amendement organique</b> : Privilégier les apports de compost (Mouton / Vache) en début d'hiver pour enrichir durablement l'humus et augmenter la capacité de rétention d'eau lors de la transition estivale.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-destructive shrink-0 mt-0.5">⚠️</span>
                  <span>
                    <b>Traitements phytosanitaires</b> : Vérifiez systématiquement la météo locale (vitesse de vent inférieur à 19 km/h) via notre indicateur météo intégré avant de planifier un traitement pour maximiser l'adhérence du produit.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
