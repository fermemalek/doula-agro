import { useState, useMemo, useEffect } from "react";
import { useParcel } from "@/lib/parcel-store";
import { usePredictions, usePredictionActions, type ParcelPrediction } from "@/lib/predictions-store";
import { useSectionsConfig, useSectionsConfigActions, type SectionConfig } from "@/lib/sections-config-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, HelpCircle, Check, Trash2, Sliders, Scale, Calculator, Cpu, Camera } from "lucide-react";
import { toast } from "sonner";
import { FruitScannerModal } from "./FruitScannerModal";

interface PrevisionModuleProps {
  parcelId: string;
  canEdit: boolean;
}

export function PrevisionModule({ parcelId, canEdit }: PrevisionModuleProps) {
  const parcel = useParcel(parcelId);
  const predictions = usePredictions(parcelId);
  const { upsertPrediction, upsertPredictionsBatch } = usePredictionActions();

  // Load section configs for this parcel
  const allConfigs = useSectionsConfig(parcelId);
  const { updateSectionTreeCount } = useSectionsConfigActions();

  // Unit preference state: "kg" or "fruits" (local cache per parcel)
  const [unitPreference, setUnitPreference] = useState<"kg" | "fruits">(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(`prevision-unit-${parcelId}`);
      if (cached === "kg" || cached === "fruits") return cached;
    }
    return "kg";
  });

  const toggleUnitPreference = () => {
    const next = unitPreference === "kg" ? "fruits" : "kg";
    setUnitPreference(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(`prevision-unit-${parcelId}`, next);
    }
    toast.info(`Unité de prévision modifiée : ${next === "kg" ? "Kilogrammes (kg)" : "Nombre de fruits"}`);
  };

  // 22 Lines & 19 Sections layout configuration
  const totalLines = 22;
  const totalSections = 19;

  const [selectedLine, setSelectedLine] = useState<number>(1);
  const [editingTree, setEditingTree] = useState<{ lineNumber: number; treeNumber: number } | null>(null);
  const [batchOpen, setBatchOpen] = useState<{ sectionNumber: number } | null>(null);
  const [batchQty, setBatchQty] = useState("30");
  const [scannerOpen, setScannerOpen] = useState(false);

  // Form states for single tree editing
  const [formFruiting, setFormFruiting] = useState(false);
  const [formQty, setFormQty] = useState("0");
  const [formTreeType, setFormTreeType] = useState<string>("gala"); // 'gala' | 'golden' | 'granny'

  // Long press states for quick variety selection
  const [pressTimer, setPressTimer] = useState<any>(null);
  const [hasLongPressed, setHasLongPressed] = useState(false);
  const [varietySelectionTree, setVarietySelectionTree] = useState<{ lineNumber: number; treeNumber: number } | null>(null);

  // Index configuration configs map
  const configsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of allConfigs) {
      map.set(`${c.lineNumber}-${c.sectionNumber}`, c.treeCount);
    }
    return map;
  }, [allConfigs]);

  // Compute total trees in parcel by summing configured trees in all 22 lines and 19 sections
  const totalTrees = useMemo(() => {
    let total = 0;
    for (let l = 1; l <= totalLines; l++) {
      for (let s = 1; s <= totalSections; s++) {
        const count = configsMap.get(`${l}-${s}`) ?? 8; // defaults to 8
        total += count;
      }
    }
    return total;
  }, [configsMap]);

  // Compute start tree index for each of the 19 sections of the selected line
  const selectedLineSections = useMemo(() => {
    const list: Array<{
      sectionNumber: number;
      treeCount: number;
      startTreeIndex: number;
    }> = [];
    let currentIndex = 1;
    for (let s = 1; s <= totalSections; s++) {
      const count = configsMap.get(`${selectedLine}-${s}`) ?? 8; // defaults to 8
      list.push({
        sectionNumber: s,
        treeCount: count,
        startTreeIndex: currentIndex,
      });
      currentIndex += count;
    }
    return list;
  }, [selectedLine, configsMap]);

  // Map predictions for O(1) lookup
  const predictionMap = useMemo(() => {
    const map = new Map<string, ParcelPrediction>();
    for (const p of predictions) {
      map.set(`${p.lineNumber}-${p.treeNumber}`, p);
    }
    return map;
  }, [predictions]);

  // General Statistics
  const stats = useMemo(() => {
    let fruitingCount = 0;
    let totalQty = 0;

    for (const p of predictions) {
      if (p.isFruiting) {
        fruitingCount++;
        totalQty += p.estimatedQty;
      }
    }

    const pctFruiting = totalTrees > 0 ? (fruitingCount / totalTrees) * 100 : 0;
    const avgQty = fruitingCount > 0 ? totalQty / fruitingCount : 0;

    return {
      fruitingCount,
      totalQty,
      pctFruiting,
      avgQty,
    };
  }, [predictions, totalTrees]);

  // Helper to find the absolute tree index for a line, section, and local index in section (1-based)
  const getAbsoluteTreeIndex = (line: number, section: number, indexInSection: number) => {
    let currentIndex = 1;
    for (let s = 1; s < section; s++) {
      currentIndex += configsMap.get(`${line}-${s}`) ?? 8;
    }
    return currentIndex + indexInSection - 1;
  };

  // Variety Statistics Breakdown (Pommier only)
  const varietyStats = useMemo(() => {
    let galaTrees = 0;
    let galaFruiting = 0;
    let galaQty = 0;

    let goldenTrees = 0;
    let goldenFruiting = 0;
    let goldenQty = 0;

    let grannyTrees = 0;
    let grannyFruiting = 0;
    let grannyQty = 0;

    for (let l = 1; l <= totalLines; l++) {
      let currentIndex = 1;
      for (let s = 1; s <= totalSections; s++) {
        const count = configsMap.get(`${l}-${s}`) ?? 8;
        for (let t = currentIndex; t < currentIndex + count; t++) {
          const pred = predictionMap.get(`${l}-${t}`);
          const type = pred?.treeType || "gala";
          const isFruiting = pred?.isFruiting || false;
          const qty = isFruiting ? pred?.estimatedQty || 0 : 0;

          if (type === "gala") {
            galaTrees++;
            if (isFruiting) {
              galaFruiting++;
              galaQty += qty;
            }
          } else if (type === "golden") {
            goldenTrees++;
            if (isFruiting) {
              goldenFruiting++;
              goldenQty += qty;
            }
          } else if (type === "granny") {
            grannyTrees++;
            if (isFruiting) {
              grannyFruiting++;
              grannyQty += qty;
            }
          }
        }
        currentIndex += count;
      }
    }

    return {
      gala: { trees: galaTrees, fruiting: galaFruiting, qty: galaQty },
      golden: { trees: goldenTrees, fruiting: goldenFruiting, qty: goldenQty },
      granny: { trees: grannyTrees, fruiting: grannyFruiting, qty: grannyQty },
    };
  }, [configsMap, predictionMap]);

  // Fruit symbol based on parcel type
  const fruitIcon = parcel?.type === "pommier" ? "🍏" : parcel?.type === "nectarine" ? "🍑" : "🫒";
  const speciesLabel = parcel?.type === "pommier" ? "Pommes" : parcel?.type === "nectarine" ? "Nectarines" : "Olives";
  const unitLabel = unitPreference === "kg" ? "kg" : "fruits";

  // Open single tree edit
  const handleOpenEdit = (line: number, tree: number) => {
    if (!canEdit) return;
    const key = `${line}-${tree}`;
    const cur = predictionMap.get(key);
    setFormFruiting(cur ? cur.isFruiting : false);
    setFormQty(cur ? String(cur.estimatedQty) : "0");
    setFormTreeType(cur?.treeType ?? "gala");
    setEditingTree({ lineNumber: line, treeNumber: tree });
  };

  const handlePointerDown = (lineNumber: number, treeNumber: number) => {
    if (!canEdit || parcel?.type !== "pommier") return;
    setHasLongPressed(false);
    const timer = setTimeout(() => {
      setHasLongPressed(true);
      setVarietySelectionTree({ lineNumber, treeNumber });
      if (navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (e) {
          // ignore
        }
      }
    }, 600); // 600ms threshold for long press
    setPressTimer(timer);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>, lineNumber: number, treeNumber: number) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    
    if (hasLongPressed) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Regular click
    handleOpenEdit(lineNumber, treeNumber);
  };

  const handlePointerCancel = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleSelectVariety = (variety: string) => {
    if (!varietySelectionTree) return;
    const { lineNumber, treeNumber } = varietySelectionTree;
    const key = `${lineNumber}-${treeNumber}`;
    const cur = predictionMap.get(key);
    
    upsertPrediction({
      parcelId,
      lineNumber,
      treeNumber,
      isFruiting: cur ? cur.isFruiting : false,
      estimatedQty: cur ? cur.estimatedQty : 0,
      treeType: variety,
    });
    
    toast.success(`Variété modifiée pour L${lineNumber}-A${treeNumber} : ${
      variety === "gala" ? "Gala One®" : variety === "golden" ? "Golden Delicious" : "Granny Smith"
    }`);
    setVarietySelectionTree(null);
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Veuillez autoriser les fenêtres pop-up pour exporter le rapport.");
      return;
    }

    const title = `Rapport de Prévision - Parcelle ${parcel?.name || parcelId}`;
    const dateStr = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let varietyBreakdownHtml = "";
    if (parcel?.type === "pommier") {
      varietyBreakdownHtml = `
        <div class="card">
          <h3>Répartition par Variété</h3>
          <table>
            <thead>
              <tr>
                <th>Variété</th>
                <th>Arbres Totaux</th>
                <th>Arbres Fruités</th>
                <th>Estimation (${unitLabel})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>🍎 Gala One®</strong></td>
                <td>${varietyStats.gala.trees}</td>
                <td>${varietyStats.gala.fruiting}</td>
                <td>${varietyStats.gala.qty.toLocaleString("fr-FR")} ${unitLabel}</td>
              </tr>
              <tr>
                <td><strong>🍏 Golden Delicious</strong></td>
                <td>${varietyStats.golden.trees}</td>
                <td>${varietyStats.golden.fruiting}</td>
                <td>${varietyStats.golden.qty.toLocaleString("fr-FR")} ${unitLabel}</td>
              </tr>
              <tr>
                <td><strong>🍏 Granny Smith</strong></td>
                <td>${varietyStats.granny.trees}</td>
                <td>${varietyStats.granny.fruiting}</td>
                <td>${varietyStats.granny.qty.toLocaleString("fr-FR")} ${unitLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // Build list of lines with their stats
    let linesTableHtml = "";
    for (let l = 1; l <= totalLines; l++) {
      let lineTotal = 0;
      let lineFruiting = 0;
      let lineQty = 0;
      
      for (let s = 1; s <= totalSections; s++) {
        const count = configsMap.get(`${l}-${s}`) ?? 8;
        lineTotal += count;
        for (let t = 1; t <= count; t++) {
          const absoluteIndex = getAbsoluteTreeIndex(l, s, t);
          const pred = predictionMap.get(`${l}-${absoluteIndex}`);
          if (pred?.isFruiting) {
            lineFruiting++;
            lineQty += pred.estimatedQty;
          }
        }
      }

      linesTableHtml += `
        <tr>
          <td>Ligne ${l}</td>
          <td>${lineTotal}</td>
          <td>${lineFruiting} (${lineTotal > 0 ? Math.round((lineFruiting / lineTotal) * 100) : 0}%)</td>
          <td>${lineQty.toLocaleString("fr-FR")} ${unitLabel}</td>
        </tr>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1a202c;
              line-height: 1.5;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #10b981;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0 0 10px 0;
              color: #059669;
              font-size: 24px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header p {
              margin: 5px 0;
              color: #4a5568;
              font-size: 14px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              background-color: #f8fafc;
            }
            .card h3 {
              margin-top: 0;
              color: #2d3748;
              font-size: 16px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .stats-num {
              font-size: 28px;
              font-weight: 800;
              color: #10b981;
              margin: 10px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 10px;
              text-align: left;
              font-size: 13px;
            }
            th {
              background-color: #ecfdf5;
              color: #065f46;
              font-weight: 700;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .footer {
              text-align: center;
              margin-top: 50px;
              font-size: 12px;
              color: #a0aec0;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
            @media print {
              body { padding: 20px; }
              .card { background-color: #ffffff; border: 1px solid #cbd5e0; }
              th { background-color: #f7fafc !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rapport de Prévision de Récolte</h1>
            <p><strong>Parcelle :</strong> ${parcel?.name || "Sans nom"} (${parcel?.type || "Non spécifié"})</p>
            <p><strong>Généré le :</strong> ${dateStr}</p>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Statistiques Générales</h3>
              <p><strong>Arbres Totaux :</strong> ${totalTrees.toLocaleString("fr-FR")}</p>
              <p><strong>Arbres Fruités :</strong> ${stats.fruitingCount.toLocaleString("fr-FR")} (${stats.pctFruiting.toFixed(1)}%)</p>
              <p><strong>Rendement Moyen :</strong> ${stats.avgQty.toFixed(1)} ${unitLabel}/arbre</p>
              <div class="stats-num">${stats.totalQty.toLocaleString("fr-FR")} ${unitLabel}</div>
            </div>
            
            ${varietyBreakdownHtml || `
              <div class="card">
                <h3>Espèce de culture</h3>
                <p><strong>Type :</strong> ${speciesLabel}</p>
                <p><strong>Unité de mesure :</strong> ${unitPreference === "kg" ? "Kilogrammes (kg)" : "Nombre de fruits"}</p>
              </div>
            `}
          </div>

          <div class="card">
            <h3>Détails par Ligne de Culture</h3>
            <table>
              <thead>
                <tr>
                  <th>Ligne</th>
                  <th>Arbres Configurés</th>
                  <th>Arbres Fruités (%)</th>
                  <th>Estimation Récolte</th>
                </tr>
              </thead>
              <tbody>
                ${linesTableHtml}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Doula Agro - Système de Gestion Agricole Intelligent</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Save single tree prediction
  const handleSaveTree = () => {
    if (!editingTree) return;
    const isFruiting = formFruiting;
    const estimatedQty = isFruiting ? parseFloat(formQty) || 0 : 0;

    upsertPrediction({
      parcelId,
      lineNumber: editingTree.lineNumber,
      treeNumber: editingTree.treeNumber,
      isFruiting,
      estimatedQty,
      treeType: formTreeType,
    });

    toast.success(`Arbre L${editingTree.lineNumber}-A${editingTree.treeNumber} mis à jour.`);
    setEditingTree(null);
  };

  const handleScanComplete = (qty: number) => {
    setFormFruiting(true);
    setFormQty(String(qty));
  };

  // Batch actions at section level
  const applySectionBatchAction = (action: "mark-all" | "clear-all" | "set-qty") => {
    if (!batchOpen) return;
    const sectionNum = batchOpen.sectionNumber;
    const sec = selectedLineSections.find((s) => s.sectionNumber === sectionNum);
    if (!sec) return;

    const newBatch: Omit<ParcelPrediction, "id">[] = [];
    const qty = action === "mark-all" ? (unitPreference === "kg" ? 30 : 150) : action === "set-qty" ? parseFloat(batchQty) || 0 : 0;
    const isFruiting = action !== "clear-all";

    for (let t = sec.startTreeIndex; t < sec.startTreeIndex + sec.treeCount; t++) {
      const curTree = predictionMap.get(`${selectedLine}-${t}`);
      const curType = curTree?.treeType ?? "gala";

      newBatch.push({
        parcelId,
        lineNumber: selectedLine,
        treeNumber: t,
        isFruiting,
        estimatedQty: isFruiting ? qty : 0,
        treeType: curType,
      });
    }

    upsertPredictionsBatch(newBatch);
    toast.success(`Section ${String(sectionNum).padStart(2, "0")} mise à jour avec succès.`);
    setBatchOpen(null);
  };

  // Helper for styling trees in Apple orchards (Pommier)
  const getPommierTreeStyle = (isFruiting: boolean, type: string) => {
    if (type === "golden") {
      return {
        icon: isFruiting ? "🍏" : "🌳",
        bgClass: isFruiting
          ? "bg-amber-500/10 border-amber-500/70 text-amber-800 dark:text-amber-300"
          : "bg-amber-500/5 border-amber-500/20 text-amber-600/80 hover:bg-amber-500/10",
        label: "Golden"
      };
    }
    if (type === "granny") {
      return {
        icon: isFruiting ? "🍏" : "🌳",
        bgClass: isFruiting
          ? "bg-emerald-500/10 border-emerald-500/70 text-emerald-800 dark:text-emerald-300"
          : "bg-emerald-500/5 border-emerald-500/20 text-emerald-600/80 hover:bg-emerald-500/10",
        label: "Granny"
      };
    }
    // Gala (default)
    return {
      icon: isFruiting ? "🍎" : "🌳",
      bgClass: isFruiting
        ? "bg-red-500/10 border-red-500/70 text-red-800 dark:text-red-300"
        : "bg-red-500/5 border-red-500/20 text-red-600/80 hover:bg-red-500/10",
      label: "Gala"
    };
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Card className="p-3 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Arbres Totaux</span>
          <p className="font-mono font-black text-base text-foreground mt-0.5">
            {totalTrees.toLocaleString("fr-FR")}
          </p>
          <span className="text-[9px] text-muted-foreground">Configuration totale</span>
        </Card>
        <Card className="p-3 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Porteurs de Fruits</span>
          <p className="font-mono font-black text-base text-primary mt-0.5">
            {stats.fruitingCount.toLocaleString("fr-FR")} <span className="text-xs font-normal text-muted-foreground">({stats.pctFruiting.toFixed(0)}%)</span>
          </p>
          <span className="text-[9px] text-muted-foreground">Arbres identifiés</span>
        </Card>
        <Card className="p-3 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Estimé</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleUnitPreference}
              className="h-5 w-5 rounded-full hover:bg-muted p-0 shrink-0"
              title="Changer d'unité (Kg vs Nombre de fruits)"
            >
              <Sliders className="h-3 w-3 text-primary" />
            </Button>
          </div>
          <p className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
            {stats.totalQty.toLocaleString("fr-FR")} <span className="text-xs font-normal text-muted-foreground">{unitLabel}</span>
          </p>
          <span className="text-[9px] text-muted-foreground">Prévision ({unitPreference.toUpperCase()})</span>
        </Card>
        <Card className="p-3 shadow-xs relative">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Rendement Moyen</span>
          <p className="font-mono font-black text-base text-amber-600 mt-0.5 truncate">
            {stats.avgQty.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">{unitLabel}/arbre</span>
          </p>
          <span className="text-[9px] text-muted-foreground">Par arbre productif</span>
        </Card>
      </div>

      {/* Unit preference hint & PDF Export */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-xs bg-muted/20 rounded-xl p-2.5 border">
        <span className="font-medium text-foreground">
          Unité active : <strong className="text-primary">{unitPreference === "kg" ? "Kilogrammes (kg)" : "Nombre de fruits"}</strong>
        </span>
        <div className="flex gap-2">
          <Button
            onClick={toggleUnitPreference}
            size="sm"
            variant="outline"
            className="rounded-lg text-[10px] h-7 px-2 font-bold uppercase gap-1"
          >
            <Sliders className="h-3 w-3" /> Changer l'unité
          </Button>
          <Button
            onClick={handleExportPDF}
            size="sm"
            className="rounded-lg text-[10px] h-7 px-2 font-bold uppercase gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold"
          >
            <Calculator className="h-3.5 w-3.5" /> Exporter PDF
          </Button>
        </div>
      </div>

      {/* Variety Stats Card (Pommier only) */}
      {parcel?.type === "pommier" && (
        <Card className="p-3.5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Répartition par Variété (Pommier)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Gala */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍎</span>
                <div>
                  <p className="text-[11px] font-bold text-red-800 dark:text-red-300">Gala One®</p>
                  <p className="text-[9px] text-muted-foreground">
                    {varietyStats.gala.trees} arbres ({varietyStats.gala.fruiting} fruités)
                  </p>
                </div>
              </div>
              <p className="font-mono font-black text-xs text-red-700 dark:text-red-400">
                {varietyStats.gala.qty.toLocaleString("fr-FR")} {unitLabel}
              </p>
            </div>

            {/* Golden */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍏</span>
                <div>
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Golden Delicious</p>
                  <p className="text-[9px] text-muted-foreground">
                    {varietyStats.golden.trees} arbres ({varietyStats.golden.fruiting} fruités)
                  </p>
                </div>
              </div>
              <p className="font-mono font-black text-xs text-amber-700 dark:text-amber-400">
                {varietyStats.golden.qty.toLocaleString("fr-FR")} {unitLabel}
              </p>
            </div>

            {/* Granny */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍏</span>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Granny Smith</p>
                  <p className="text-[9px] text-muted-foreground">
                    {varietyStats.granny.trees} arbres ({varietyStats.granny.fruiting} fruités)
                  </p>
                </div>
              </div>
              <p className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400">
                {varietyStats.granny.qty.toLocaleString("fr-FR")} {unitLabel}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 2. Line Selector */}
      <Card className="p-3 space-y-3">
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sélectionner une Ligne de culture</Label>
          <h4 className="text-sm font-black text-foreground uppercase mt-0.5">Ligne {selectedLine} sur {totalLines}</h4>
        </div>

        {/* Scrollable list of lines */}
        <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin">
          {Array.from({ length: totalLines }, (_, i) => i + 1).map((line) => {
            // Count configured trees on this line
            let lineTotal = 0;
            for (let s = 1; s <= totalSections; s++) {
              const count = configsMap.get(`${line}-${s}`) ?? 8;
              lineTotal += count;
            }
            // Filter predictions for this line to find fruiting count
            const lineFruiting = predictions.filter(p => p.lineNumber === line && p.isFruiting).length;

            return (
              <button
                key={line}
                onClick={() => setSelectedLine(line)}
                className={`flex flex-col items-center justify-center shrink-0 w-16 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  selectedLine === line
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-muted/10 border-input text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <span>Ligne {line}</span>
                <span className={`text-[9px] font-normal mt-0.5 ${selectedLine === line ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {lineFruiting}/{lineTotal} {fruitIcon}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 3. Section Matrix View */}
      <div className="space-y-4">
        {selectedLineSections.map((sec) => {
          const sectionNumStr = String(sec.sectionNumber).padStart(2, "0");
          
          // Get predictions in this section to find fruiting count
          let sectionFruitingCount = 0;
          for (let t = sec.startTreeIndex; t < sec.startTreeIndex + sec.treeCount; t++) {
            if (predictionMap.get(`${selectedLine}-${t}`)?.isFruiting) {
              sectionFruitingCount++;
            }
          }

          return (
            <Card key={sec.sectionNumber} className="p-4 space-y-3">
              {/* Section Header Controls */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-xs font-black uppercase px-2 py-0.5 rounded-lg">
                    Section {sectionNumStr}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({sectionFruitingCount} / {sec.treeCount} {fruitIcon})
                  </span>
                </div>
                
                {/* Configuration of tree count and quick actions */}
                <div className="flex gap-2 items-center justify-end">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Arbres :</span>
                    <select
                      value={sec.treeCount}
                      disabled={!canEdit}
                      onChange={(e) => updateSectionTreeCount(parcelId, selectedLine, sec.sectionNumber, parseInt(e.target.value))}
                      className="rounded-lg border bg-background px-2 py-0.5 text-xs font-bold focus:outline-none"
                    >
                      <option value={6}>6</option>
                      <option value={7}>7</option>
                      <option value={8}>8</option>
                      <option value={9}>9</option>
                    </select>
                  </div>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBatchOpen({ sectionNumber: sec.sectionNumber });
                        setBatchQty(unitPreference === "kg" ? "30" : "150");
                      }}
                      className="rounded-lg text-[10px] h-7 px-2 font-bold gap-1 border-primary/20 text-primary hover:bg-primary/5"
                    >
                      <Sliders className="h-3 w-3" /> Actions rapides
                    </Button>
                  )}
                </div>
              </div>

              {/* Grid map for trees in this section */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2.5 py-1">
                {Array.from({ length: sec.treeCount }, (_, i) => sec.startTreeIndex + i).map((treeIdx) => {
                  const key = `${selectedLine}-${treeIdx}`;
                  const pred = predictionMap.get(key);
                  const isFruiting = pred ? pred.isFruiting : false;
                  const qty = pred ? pred.estimatedQty : 0;
                  const currentType = pred?.treeType || "gala";

                  // Styles depending on parcel species
                  let currentIcon = isFruiting ? fruitIcon : "🌳";
                  let bgClass = isFruiting
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-400"
                    : "bg-muted/10 border-input text-muted-foreground hover:bg-muted/20";
                  let varietyBadge = "";

                  if (parcel?.type === "pommier") {
                    const style = getPommierTreeStyle(isFruiting, currentType);
                    currentIcon = style.icon;
                    bgClass = style.bgClass;
                    varietyBadge = style.label;
                  }

                  return (
                    <button
                      key={treeIdx}
                      onPointerDown={() => handlePointerDown(selectedLine, treeIdx)}
                      onPointerUp={(e) => handlePointerUp(e, selectedLine, treeIdx)}
                      onPointerCancel={handlePointerCancel}
                      onPointerMove={handlePointerCancel}
                      onContextMenu={(e) => e.preventDefault()}
                      disabled={!canEdit}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all ${bgClass} ${
                        canEdit ? "cursor-pointer active:scale-95 touch-none" : "cursor-default"
                      }`}
                    >
                      <span className="text-[9px] font-bold">A-{treeIdx}</span>
                      <div className="my-1 text-sm">{currentIcon}</div>
                      
                      {/* Variety Indicator */}
                      {varietyBadge && (
                        <span className="text-[8px] uppercase tracking-tighter opacity-80 mb-0.5 block font-extrabold">
                          {varietyBadge}
                        </span>
                      )}

                      {isFruiting ? (
                        <span className="text-[9px] font-black font-mono">{qty} {unitLabel}</span>
                      ) : (
                        <span className="text-[9px] opacity-60">—</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 4. Tree Editing Dialog */}
      <Dialog open={editingTree !== null} onOpenChange={(open) => !open && setEditingTree(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wide">
              Arbre L{editingTree?.lineNumber} - A{editingTree?.treeNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Tree Variety Selection (For Apples/Pommier only) */}
            {parcel?.type === "pommier" && (
              <div className="space-y-1.5 border-b pb-3">
                <Label className="font-bold">Variété d'arbre (Pommier)</Label>
                <select
                  value={formTreeType}
                  onChange={(e) => setFormTreeType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
                >
                  <option value="gala">Gala One®</option>
                  <option value="golden">Golden Delicious</option>
                  <option value="granny">Granny Smith</option>
                </select>
              </div>
            )}

            {/* Fruiting Toggle */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <Label className="font-bold">Porteur de fruits ({speciesLabel})</Label>
                <p className="text-[10px] text-muted-foreground">Est-ce que cet arbre est actuellement fruité ?</p>
              </div>
              <input
                type="checkbox"
                checked={formFruiting}
                onChange={(e) => setFormFruiting(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>

            {parcel?.type === "pommier" && (
              <div className="border-b pb-3 pt-1">
                <Button
                  onClick={() => setScannerOpen(true)}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold gap-2 text-xs py-5 hover:from-emerald-700 hover:to-teal-700 shadow-md"
                >
                  <Cpu className="h-4 w-4" />
                  Compteur Intelligent (Photo/Vidéo IA)
                </Button>
              </div>
            )}

            {/* Qty Input */}
            {formFruiting && (
              <div className="space-y-1.5">
                <Label className="font-bold">Estimation de la récolte ({unitLabel})</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="rounded-xl font-mono font-bold"
                    placeholder={unitPreference === "kg" ? "ex: 45" : "ex: 200"}
                  />
                  <span className="font-bold text-muted-foreground text-sm">{unitLabel}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Saisissez l'estimation attendue pour cet arbre.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingTree(null)} className="rounded-xl">
              Annuler
            </Button>
            <Button onClick={handleSaveTree} className="rounded-xl bg-primary text-primary-foreground font-bold">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Batch Editing Dialog */}
      <Dialog open={batchOpen !== null} onOpenChange={(open) => !open && setBatchOpen(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wide">
              Actions rapides - Section {String(batchOpen?.sectionNumber).padStart(2, "0")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1 text-xs">
            <p className="text-muted-foreground">
              Appliquez une action groupée sur l'ensemble des arbres de la <strong>Section {String(batchOpen?.sectionNumber).padStart(2, "0")}</strong> pour la ligne sélectionnée.
            </p>

            <div className="space-y-1.5 pt-1">
              <Label className="font-bold">Quantité estimée par défaut ({unitLabel})</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={batchQty}
                  onChange={(e) => setBatchQty(e.target.value)}
                  className="rounded-xl font-mono font-bold"
                />
                <span className="font-bold text-muted-foreground text-sm">{unitLabel}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-1.5 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => applySectionBatchAction("clear-all")}
              className="rounded-xl font-bold border-destructive/20 text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Tout Décocher
            </Button>
            <Button
              variant="outline"
              onClick={() => applySectionBatchAction("mark-all")}
              className="rounded-xl font-bold"
            >
              <Check className="h-4 w-4 mr-1" /> Tout Fruité
            </Button>
            <Button
              onClick={() => applySectionBatchAction("set-qty")}
              className="rounded-xl bg-primary text-primary-foreground font-bold"
            >
              Appliquer Qté
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Variety Selection Dialog on Long Press (Apple Orchard only) */}
      <Dialog open={varietySelectionTree !== null} onOpenChange={(open) => !open && setVarietySelectionTree(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wide text-center">
              Variété de l'arbre L{varietySelectionTree?.lineNumber} - A{varietySelectionTree?.treeNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2.5 py-3">
            <button
              onClick={() => handleSelectVariety("gala")}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-left transition-all active:scale-[0.98]"
            >
              <span className="text-2xl">🍎</span>
              <div>
                <h4 className="font-black text-sm text-red-800 dark:text-red-300">Gala One®</h4>
                <p className="text-[10px] text-muted-foreground">Arbre de variété Gala One</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectVariety("golden")}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-left transition-all active:scale-[0.98]"
            >
              <span className="text-2xl">🍏</span>
              <div>
                <h4 className="font-black text-sm text-amber-800 dark:text-amber-300">Golden Delicious</h4>
                <p className="text-[10px] text-muted-foreground">Arbre de variété Golden</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectVariety("granny")}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all active:scale-[0.98]"
            >
              <span className="text-2xl">🍏</span>
              <div>
                <h4 className="font-black text-sm text-emerald-800 dark:text-emerald-300">Granny Smith</h4>
                <p className="text-[10px] text-muted-foreground">Arbre de variété Granny Smith</p>
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVarietySelectionTree(null)} className="w-full rounded-xl">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingTree && (
        <FruitScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          treeType={formTreeType}
          lineNumber={editingTree.lineNumber}
          treeNumber={editingTree.treeNumber}
          onScanComplete={handleScanComplete}
        />
      )}
    </div>
  );
}
