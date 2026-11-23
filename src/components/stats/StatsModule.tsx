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

    // 3. Process Pulverisation (DB) — supporte aussi bien r.items (foliaires) que r.products
    pulvRecords.forEach((r) => {
      const key = getKey(r.date, r.parcelId);
      const list = Array.isArray(r.items) && r.items.length > 0 ? r.items : (r.products ?? []);
      if (list.length > 0) {
        list.forEach((p: any) => {
          const pName = p.name || p.product || "Foliaire";
          const qty = parseFloat(String(p.qty || "1").replace(",", ".")) || 1;
          const unitPrice = parseFloat(String(p.price || "0").replace(",", ".")) || 0;
          const cost = p.name ? qty * unitPrice : unitPrice;
          if (cost > 0) addCost(key, "Pulvérisation / Foliaire", pName, cost);
        });
      } else if ((r.total || 0) > 0) {
        addCost(key, "Pulvérisation / Foliaire", r.label || "Pulvérisation Foliaire", r.total);
      }
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
      list.sort((a: any, b: any) => (b.total || 0) - (a.total || 0));
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
                      width={64}
                      className="text-[10px]"
                      tickFormatter={(v: number) => {
                        if (!v || v === 0) return "0 DA";
                        if (Math.abs(v) >= 1000) {
                          const k = v / 1000;
                          return `${Number.isInteger(k) ? k : k.toFixed(1)}k DA`;
                        }
                        return `${Math.round(v)} DA`;
                      }}
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA`,
                      ]}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart of Dépenses */}
            <div className="rounded-xl border bg-card p-4 shadow-xs min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Répartition Globale par Type d&apos;Intrant
              </h3>
              {pieData.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted-foreground">Aucune donnée disponible.</p>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative h-44 w-44 shrink-0">
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
                          innerRadius={48}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={INTRANT_COLORS[entry.name]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${Math.round(Number(v) || 0).toLocaleString("fr-FR")} DA`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-[10px] w-full sm:flex-1 min-w-0 sm:pl-3 sm:border-l">
                    {pieData.map((d) => {
                      const pct = stats.grandTotal > 0 ? ((d.value / stats.grandTotal) * 100).toFixed(1) : "0.0";
                      return (
                        <div key={d.name} className="flex flex-col border-l-2 pl-2 min-w-0" style={{ borderColor: INTRANT_COLORS[d.name] }}>
                          <span className="font-bold text-foreground text-[11px] leading-tight break-words">{d.name}</span>
                          <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground font-semibold">
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

            {/* Advice and summary info — dynamique selon les vrais montants calculés */}
            <div className="rounded-xl border bg-card p-4 shadow-xs space-y-2.5 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Conseils &amp; Analyse Agronomique
              </h3>
              {(() => {
                const ranked = [
                  { name: "Fertilisation au sol", value: stats.fertTotal },
                  { name: "Pulvérisation / Foliaire", value: stats.pulvTotal },
                  { name: "Traitements phytosanitaires", value: stats.phytoTotal },
                  { name: "Amendements organiques", value: stats.amendTotal },
                ]
                  .filter((x) => x.value > 0)
                  .sort((a, b) => b.value - a.value);
                const top = ranked[0];
                const topPct = top && stats.grandTotal > 0 ? ((top.value / stats.grandTotal) * 100).toFixed(1) : "0";

                return (
                  <ul className="text-xs space-y-2 text-foreground">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 shrink-0 mt-0.5">🌱</span>
                      <span>
                        {top ? (
                          <>
                            <b>Poste principal ({top.name})</b> : représente <strong>{topPct}%</strong> du budget intrants (
                            {Math.round(top.value).toLocaleString("fr-FR")} DA).{" "}
                            {stats.fertTotal > 0
                              ? "Un fractionnement précis basé sur les analyses d'eau mensuelles permet de réduire les pertes en N-P-K et calcium."
                              : "Aucune dépense de fertigation enregistrée pour le moment."}
                          </>
                        ) : (
                          <>
                            <b>Aucune dépense intrant enregistrée</b> : validez vos premières recommandations pour générer l&apos;analyse budgétaire en temps réel.
                          </>
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500 shrink-0 mt-0.5">🍂</span>
                      <span>
                        <b>Amendement organique</b> :{" "}
                        {stats.amendTotal > 0
                          ? `${Math.round(stats.amendTotal).toLocaleString("fr-FR")} DA engagés en amendements. Poursuivre le suivi humus avant l'été.`
                          : "Aucun amendement saisi actuellement — privilégier un apport de compost en début d'hiver pour la rétention en eau."}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-destructive shrink-0 mt-0.5">⚠️</span>
                      <span>
                        <b>Traitements phytosanitaires</b> :{" "}
                        {stats.phytoTotal > 0
                          ? `${Math.round(stats.phytoTotal).toLocaleString("fr-FR")} DA consacrés à la protection phytosanitaire. Respectez la rotation FRAC/IRAC et le verrou vent (< 20 km/h).`
                          : "Vérifiez systématiquement la météo locale (vent < 20 km/h) et la rotation FRAC/IRAC avant chaque traitement."}
                      </span>
                    </li>
                  </ul>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
