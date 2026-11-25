import { useMemo, useState } from "react";
import {
  X,
  Thermometer,
  Droplets,
  Plus,
  ArrowUpRight,
  LayoutGrid,
  Package,
  RotateCcw,
  Check,
  PaintBucket,
} from "lucide-react";
import { toast } from "sonner";
import { formatDA, formatNumber } from "@/lib/format";
import {
  buildDefaultRoomGrid,
  FRIGO_ROOM_SPECS,
  getDefaultStackColor,
  getRowMaxStackHeight,
  type FrigoRoomCode,
  type FrigoRoomGridOverrides,
  type FrigoRoomMeta,
  type FrigoStackCell,
  type FrigoStackColor,
} from "@/lib/frigo-negoce-store";
import type { RoomSummary } from "./FrigoBuildingPlan";

const KNOWN_FARMERS = ["Khaled", "Abdellah", "Youcef", "Adnane", "Aziz"];

interface Props {
  room: RoomSummary;
  gridOverrides: FrigoRoomGridOverrides;
  onClose: () => void;
  onUpdateMeta: (code: FrigoRoomCode, patch: Partial<FrigoRoomMeta>) => void;
  onUpdateStackCells: (code: FrigoRoomCode, patch: Record<string, FrigoStackCell>) => void;
  onResetGrid: (code: FrigoRoomCode) => void;
  onAddEntryForRoom: (code: FrigoRoomCode) => void;
  onAddExitForRoom: (code: FrigoRoomCode) => void;
  isAr: boolean;
}

export function FrigoRoomDetailModal({
  room,
  gridOverrides,
  onClose,
  onUpdateMeta,
  onUpdateStackCells,
  onResetGrid,
  onAddEntryForRoom,
  onAddExitForRoom,
  isAr,
}: Props) {
  const spec = FRIGO_ROOM_SPECS[room.code];
  const [activeTab, setActiveTab] = useState<"content" | "plan">("plan");
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [brushFarmer, setBrushFarmer] = useState<string>(room.farmers[0] || KNOWN_FARMERS[0]);
  const [brushColor, setBrushColor] = useState<FrigoStackColor>("rouge");

  // Liste complète des fermiers disponibles (ceux de la chambre + les 5 connus)
  const farmerOptions = useMemo(() => {
    const set = new Set<string>([...room.farmers, ...KNOWN_FARMERS]);
    return Array.from(set);
  }, [room.farmers]);

  // Grille fusionnée : valeurs par défaut calculées depuis les lots + overrides utilisateur
  const mergedGrid = useMemo(() => {
    const base = buildDefaultRoomGrid(room.code, room.list, room.cajousRestants);
    return { ...base, ...gridOverrides };
  }, [room.code, room.list, room.cajousRestants, gridOverrides]);

  // Statistiques temps réel du plan intérieur
  const gridStats = useMemo(() => {
    let totalPlanCajous = 0;
    let fullPiles = 0;
    let partialPiles = 0;
    let emptyPiles = 0;
    let rougeCajous = 0;
    let jauneCajous = 0;
    const byFarmer: Record<string, number> = {};

    for (let r = 0; r < spec.totalRows; r++) {
      const maxH = getRowMaxStackHeight(r);
      for (let c = 0; c < spec.totalCols; c++) {
        const cell = mergedGrid[`${r}_${c}`] || {
          height: 0,
          color: getDefaultStackColor(room.code, c),
        };
        totalPlanCajous += cell.height;
        if (cell.height <= 0) emptyPiles++;
        else if (cell.height >= maxH) fullPiles++;
        else partialPiles++;

        if (cell.color === "jaune") jauneCajous += cell.height;
        else rougeCajous += cell.height;

        if (cell.height > 0 && cell.farmer) {
          byFarmer[cell.farmer] = (byFarmer[cell.farmer] || 0) + cell.height;
        }
      }
    }
    return { totalPlanCajous, fullPiles, partialPiles, emptyPiles, rougeCajous, jauneCajous, byFarmer };
  }, [mergedGrid, room.code, spec.totalCols, spec.totalRows]);

  // Affecter un îlot entier (0 = Gauche, 1 = Centre, 2 = Droit)
  function assignIsland(islandIdx: 0 | 1 | 2) {
    const [left, center] = spec.islands;
    const startCol = islandIdx === 0 ? 0 : islandIdx === 1 ? left : left + center;
    const endCol = islandIdx === 0 ? left : islandIdx === 1 ? left + center : spec.totalCols;

    const patch: Record<string, FrigoStackCell> = {};
    for (let r = 0; r < spec.totalRows; r++) {
      const maxH = getRowMaxStackHeight(r);
      for (let c = startCol; c < endCol; c++) {
        const key = `${r}_${c}`;
        const cur = mergedGrid[key];
        patch[key] = {
          height: cur && cur.height > 0 ? cur.height : maxH,
          color: brushColor,
          farmer: brushFarmer || undefined,
        };
      }
    }
    onUpdateStackCells(room.code, patch);
    toast.success(
      isAr
        ? `تم تخصيص الجزيرة للمزارع ${brushFarmer}`
        : `Îlot affecté à ${brushFarmer} (${brushColor === "rouge" ? "ROUGE" : "JAUNE"})`,
    );
  }

  // Cellule sélectionnée pour édition fine
  const selectedCellInfo = useMemo(() => {
    if (!selectedCellKey) return null;
    const [rStr, cStr] = selectedCellKey.split("_");
    const r = Number(rStr);
    const c = Number(cStr);
    if (!Number.isFinite(r) || !Number.isFinite(c)) return null;
    const maxH = getRowMaxStackHeight(r);
    const cell = mergedGrid[selectedCellKey] || {
      height: 0,
      color: getDefaultStackColor(room.code, c),
    };
    return { key: selectedCellKey, r, c, maxH, cell };
  }, [selectedCellKey, mergedGrid, room.code]);

  const updateSelectedCell = (patch: Partial<FrigoStackCell>) => {
    if (!selectedCellInfo) return;
    const nextHeight =
      patch.height !== undefined
        ? Math.max(0, Math.min(selectedCellInfo.maxH, Math.round(patch.height)))
        : selectedCellInfo.cell.height;
    onUpdateStackCells(room.code, {
      [selectedCellInfo.key]: {
        ...selectedCellInfo.cell,
        ...patch,
        height: nextHeight,
      },
    });
  };

  const [leftCols, centerCols] = spec.islands;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden"
        dir={isAr ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header modale */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-sky-500/[0.06] px-4 py-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`rounded-xl px-2.5 py-1 text-xs font-black text-white shrink-0 ${
                room.code === "CH-01"
                  ? "bg-indigo-600"
                  : room.cajousRestants > 0
                    ? "bg-emerald-600"
                    : "bg-slate-600"
              }`}
            >
              {room.code}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-foreground truncate">
                {isAr ? spec.labelAr : spec.labelFr}
              </h3>
              <p dir="ltr" className="text-[11px] text-muted-foreground font-semibold">
                {spec.dimensions} · {formatNumber(room.cajousRestants, 0)} / {formatNumber(spec.capacityCajous, 0)}{" "}
                cajous ({formatNumber(room.fillPct, 1)} %) · {formatNumber(room.poidsRestantKg, 0)} kg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Onglets Contenu / Plan intérieur */}
            <div className="inline-flex rounded-xl border bg-muted/40 p-0.5 text-xs font-black">
              <button
                type="button"
                onClick={() => setActiveTab("content")}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  activeTab === "content" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>{isAr ? "المحتوى والتسيير" : "Contenu & Gestion"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("plan")}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  activeTab === "plan" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>{isAr ? "مخطط الصناديق" : "Plan intérieur cajous"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label={isAr ? "إغلاق" : "Fermer"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {activeTab === "content" ? (
            /* ==================== ONGLET A : CONTENU & GESTION ==================== */
            <div className="space-y-4">
              {/* Température, Hygrométrie & Jauge de remplissage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-sky-600" />
                    <span>{isAr ? "درجة الحرارة (°C)" : "Température (°C)"}</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    dir="ltr"
                    value={room.meta.temperatureC}
                    onChange={(e) =>
                      onUpdateMeta(room.code, { temperatureC: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm font-black text-sky-700 dark:text-sky-300"
                  />
                </div>

                <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-blue-600" />
                    <span>{isAr ? "نسبة الرطوبة (%)" : "Hygrométrie (%)"}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    dir="ltr"
                    value={room.meta.humidityPct}
                    onChange={(e) =>
                      onUpdateMeta(room.code, {
                        humidityPct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                      })
                    }
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm font-black text-blue-700 dark:text-blue-300"
                  />
                </div>

                <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-muted-foreground block">
                    {isAr ? "نسبة الامتلاء" : "Taux de remplissage"}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span dir="ltr" className="text-sm font-black text-foreground">
                      {formatNumber(room.cajousRestants, 0)} / {formatNumber(spec.capacityCajous, 0)}
                    </span>
                    <span dir="ltr" className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                      {formatNumber(room.fillPct, 1)} %
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden border">
                    <div
                      className={`h-full rounded-full transition-all ${
                        room.code === "CH-01" ? "bg-indigo-600" : "bg-emerald-600"
                      }`}
                      style={{ width: `${Math.min(100, room.fillPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Boutons d'action rapides */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAddEntryForRoom(room.code)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 text-xs font-black shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isAr ? "+ إضافة دخلة (شراء)" : "+ Ajouter une entrée"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddExitForRoom(room.code)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-black shadow-xs cursor-pointer"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>{isAr ? "خروج / بيع من الغرفة" : "Sortie / Vente"}</span>
                </button>
              </div>

              {/* Liste des lots / fermiers stockés */}
              <div className="rounded-xl border overflow-hidden">
                <div className="bg-muted/30 border-b px-3 py-2 flex items-center justify-between text-xs font-black">
                  <span>
                    {isAr
                      ? `الدفعات والمزارعون المخزنون (${room.list.length})`
                      : `Lots / Fermiers stockés dans ${room.code} (${room.list.length})`}
                  </span>
                  <span dir="ltr" className="text-sky-700 dark:text-sky-300">
                    {formatNumber(room.poidsNetEntreKg, 0)} kg · {formatDA(room.totalPayementDA, 0)}
                  </span>
                </div>
                {room.list.length === 0 ? (
                  <p className="p-6 text-center text-xs text-muted-foreground">
                    {isAr
                      ? "هذه الغرفة فارغة ومتاحة حالياً. اضغط «+ إضافة دخلة» لتخزين دفعة جديدة."
                      : "Cette chambre est actuellement disponible (0 cajou). Cliquez sur « + Ajouter une entrée » pour stocker un lot."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/10 text-[10px] uppercase text-muted-foreground">
                          <th className="p-2.5 text-start font-black">{isAr ? "المزارع" : "Fermier / Lot"}</th>
                          <th className="p-2.5 text-end font-black">{isAr ? "الصناديق" : "Cajous"}</th>
                          <th className="p-2.5 text-end font-black">{isAr ? "الوزن الصافي" : "Poids Net"}</th>
                          <th className="p-2.5 text-end font-black">{isAr ? "سعر الشراء" : "Prix achat"}</th>
                          <th className="p-2.5 text-end font-black">{isAr ? "إجمالي الدفع" : "Total payement"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {room.list.map((lot) => (
                          <tr key={lot.id} className="hover:bg-muted/20">
                            <td className="p-2.5 font-black text-foreground">{lot.fermierFournisseur}</td>
                            <td dir="ltr" className="p-2.5 text-end font-bold">
                              {formatNumber(lot.nbCajous, 0)}
                            </td>
                            <td dir="ltr" className="p-2.5 text-end font-bold">
                              {formatNumber(lot.poidsNetKg, 0)} kg
                            </td>
                            <td dir="ltr" className="p-2.5 text-end text-muted-foreground">
                              {formatDA(lot.prixAchatKg, 0)}/kg
                            </td>
                            <td dir="ltr" className="p-2.5 text-end font-black text-blue-700 dark:text-blue-300">
                              {formatDA(lot.totalPayementDA, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ==================== ONGLET B : PLAN INTÉRIEUR DES CAJOUS (DISPOSITION CAJOUS3) ==================== */
            <div className="space-y-3">
              {/* Résumé rapide du plan intérieur + Outil d'affectation d'îlot */}
              <div className="rounded-xl border bg-muted/20 p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span dir="ltr" className="rounded-lg bg-card border px-2 py-1 font-black">
                      {isAr ? "مجموع المخطط :" : "Total plan :"} {formatNumber(gridStats.totalPlanCajous, 0)} /{" "}
                      {formatNumber(spec.capacityCajous, 0)} c.
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 border border-rose-500/30 px-2 py-1 font-bold text-rose-800 dark:text-rose-200">
                      <span className="h-2.5 w-2.5 rounded-xs bg-rose-600" />
                      {isAr ? "أحمر (جانبي) :" : "ROUGE :"} <strong dir="ltr">{formatNumber(gridStats.rougeCajous, 0)}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 border border-amber-500/40 px-2 py-1 font-bold text-amber-900 dark:text-amber-200">
                      <span className="h-2.5 w-2.5 rounded-xs bg-amber-400 border border-amber-600" />
                      {isAr ? "أصفر (وسط) :" : "JAUNE :"} <strong dir="ltr">{formatNumber(gridStats.jauneCajous, 0)}</strong>
                    </span>
                    <span dir="ltr" className="text-[11px] text-muted-foreground font-semibold">
                      {gridStats.fullPiles} {isAr ? "كاملة" : "pleines"} · {gridStats.partialPiles}{" "}
                      {isAr ? "جزئية" : "partielles"} · {gridStats.emptyPiles} {isAr ? "فارغة" : "vides"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onResetGrid(room.code);
                      setSelectedCellKey(null);
                      toast.success(isAr ? "تمت إعادة التوزيع حسب الدفعات" : "Plan réinitialisé selon les lots.");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border bg-card hover:bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{isAr ? "إعادة التوزيع التلقائي" : "Auto-remplir depuis lots"}</span>
                  </button>
                </div>

                {/* Barre d'affectation rapide par îlot */}
                <div className="flex flex-wrap items-center gap-2 border-t pt-2 text-xs">
                  <span className="text-[11px] font-black text-muted-foreground flex items-center gap-1">
                    <PaintBucket className="h-3.5 w-3.5 text-sky-600" />
                    <span>{isAr ? "تخصيص سريع لجزيرة :" : "Affecter un îlot entier :"}</span>
                  </span>
                  <select
                    value={brushFarmer}
                    onChange={(e) => setBrushFarmer(e.target.value)}
                    className="rounded-lg border bg-background px-2 py-1 text-xs font-bold"
                  >
                    {farmerOptions.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <div className="inline-flex rounded-lg border overflow-hidden text-[11px] font-black">
                    <button
                      type="button"
                      onClick={() => setBrushColor("rouge")}
                      className={`px-2 py-1 cursor-pointer ${
                        brushColor === "rouge" ? "bg-rose-600 text-white" : "bg-background text-rose-700"
                      }`}
                    >
                      ROUGE
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrushColor("jaune")}
                      className={`px-2 py-1 cursor-pointer ${
                        brushColor === "jaune" ? "bg-amber-400 text-amber-950" : "bg-background text-amber-800"
                      }`}
                    >
                      JAUNE
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => assignIsland(0)}
                      className="rounded-lg border bg-card hover:bg-muted px-2 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      {isAr ? `الجزيرة اليسرى (${spec.islands[0]} أعمدة)` : `Îlot Gauche (${spec.islands[0]} col.)`}
                    </button>
                    <button
                      type="button"
                      onClick={() => assignIsland(1)}
                      className="rounded-lg border bg-card hover:bg-muted px-2 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      {isAr ? `الجزيرة الوسطى (${spec.islands[1]} أعمدة)` : `Îlot Centre (${spec.islands[1]} col.)`}
                    </button>
                    <button
                      type="button"
                      onClick={() => assignIsland(2)}
                      className="rounded-lg border bg-card hover:bg-muted px-2 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      {isAr ? `الجزيرة اليمنى (${spec.islands[2]} أعمدة)` : `Îlot Droit (${spec.islands[2]} col.)`}
                    </button>
                  </div>
                </div>

                {/* Répartition par fermier sur le plan */}
                {Object.keys(gridStats.byFarmer).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold pt-0.5">
                    <span className="text-muted-foreground">{isAr ? "حسب المزارع :" : "Par fermier :"}</span>
                    {Object.entries(gridStats.byFarmer).map(([name, qty]) => (
                      <span
                        key={name}
                        className="rounded-full bg-card border px-2 py-0.5 text-foreground"
                      >
                        {name} : <strong dir="ltr">{formatNumber(qty, 0)} c.</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Éditeur de pile sélectionnée */}
              {selectedCellInfo && (
                <div className="rounded-xl border-2 border-sky-500/50 bg-sky-500/[0.06] p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-black text-foreground">
                      {isAr
                        ? `العمود ${selectedCellInfo.c + 1} · الصف ${selectedCellInfo.r + 1} (الحد الأقصى ×${selectedCellInfo.maxH})`
                        : `Pile Rangée ${selectedCellInfo.r + 1} · Colonne ${selectedCellInfo.c + 1} (max ×${selectedCellInfo.maxH})`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isAr ? "اضبط الارتفاع الفعلي أو خصص المزارع واللون." : "Ajustez la hauteur réelle, le fermier ou la couleur."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Hauteur */}
                    <div className="inline-flex items-center gap-1 rounded-lg border bg-background p-1">
                      <button
                        type="button"
                        onClick={() => updateSelectedCell({ height: 0 })}
                        className="rounded px-2 py-0.5 text-[10px] font-black bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 cursor-pointer"
                      >
                        0 ({isAr ? "فارغ" : "Vider"})
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedCell({ height: selectedCellInfo.cell.height - 1 })}
                        className="rounded px-2 py-0.5 font-black border hover:bg-muted cursor-pointer"
                      >
                        −
                      </button>
                      <span dir="ltr" className="w-8 text-center font-black text-sm">
                        ×{selectedCellInfo.cell.height}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateSelectedCell({ height: selectedCellInfo.cell.height + 1 })}
                        className="rounded px-2 py-0.5 font-black border hover:bg-muted cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedCell({ height: selectedCellInfo.maxH })}
                        className="rounded px-2 py-0.5 text-[10px] font-black bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        Max (×{selectedCellInfo.maxH})
                      </button>
                    </div>

                    {/* Couleur */}
                    <div className="inline-flex rounded-lg border overflow-hidden text-[11px] font-black">
                      <button
                        type="button"
                        onClick={() => updateSelectedCell({ color: "rouge" })}
                        className={`px-2 py-1 cursor-pointer ${
                          selectedCellInfo.cell.color === "rouge"
                            ? "bg-rose-600 text-white"
                            : "bg-background text-rose-700"
                        }`}
                      >
                        ROUGE
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedCell({ color: "jaune" })}
                        className={`px-2 py-1 cursor-pointer ${
                          selectedCellInfo.cell.color === "jaune"
                            ? "bg-amber-400 text-amber-950"
                            : "bg-background text-amber-800"
                        }`}
                      >
                        JAUNE
                      </button>
                    </div>

                    {/* Fermier */}
                    <select
                      value={selectedCellInfo.cell.farmer || ""}
                      onChange={(e) => updateSelectedCell({ farmer: e.target.value || undefined })}
                      className="rounded-lg border bg-background px-2 py-1 text-xs font-bold"
                    >
                      <option value="">{isAr ? "— بدون مزارع —" : "— Aucun fermier —"}</option>
                      {farmerOptions.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setSelectedCellKey(null)}
                      className="inline-flex items-center gap-1 rounded-lg bg-sky-600 text-white px-2.5 py-1 text-[11px] font-black cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>OK</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Grille exacte DISPOSITION CAJOUS3 (scroll horizontal propre sur mobile) */}
              <div className="overflow-x-auto rounded-xl border bg-slate-50/70 dark:bg-slate-900/40 p-3">
                <div className={spec.totalCols === 10 ? "min-w-[650px]" : "min-w-[500px]"} dir="ltr">
                  {/* Bandeau MUR DU FOND */}
                  <div className="mb-2 rounded-lg bg-slate-800 text-white text-center py-1 text-[10px] font-black tracking-widest uppercase">
                    {isAr ? "جدار خلف الغرفة (الأكثر ارتفاعاً ×14)" : "MUR DU FOND — ÉVAPORATEURS (Hauteurs max ×14 → ×11)"}
                  </div>

                  {/* En-tête des 3 îlots & allées */}
                  <div
                    className="grid gap-1 mb-1.5 items-center text-center text-[10px] font-black"
                    style={{
                      gridTemplateColumns:
                        spec.totalCols === 10
                          ? "76px repeat(3, minmax(0, 1fr)) 18px repeat(4, minmax(0, 1fr)) 18px repeat(3, minmax(0, 1fr))"
                          : "76px repeat(2, minmax(0, 1fr)) 20px repeat(3, minmax(0, 1fr)) 20px repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <div className="text-muted-foreground text-[9px] uppercase">
                      {isAr ? "الصف / الحد" : "Rangée / Max"}
                    </div>
                    <div
                      className="rounded bg-rose-600/15 text-rose-800 dark:text-rose-200 py-0.5"
                      style={{ gridColumn: `span ${spec.islands[0]} / span ${spec.islands[0]}` }}
                    >
                      ROUGE ({spec.islands[0]} col.)
                    </div>
                    <div className="text-[8px] text-muted-foreground rotate-0">Allée</div>
                    <div
                      className="rounded bg-amber-400/25 text-amber-900 dark:text-amber-200 py-0.5"
                      style={{ gridColumn: `span ${spec.islands[1]} / span ${spec.islands[1]}` }}
                    >
                      JAUNE ({spec.islands[1]} col.)
                    </div>
                    <div className="text-[8px] text-muted-foreground">Allée</div>
                    <div
                      className="rounded bg-rose-600/15 text-rose-800 dark:text-rose-200 py-0.5"
                      style={{ gridColumn: `span ${spec.islands[2]} / span ${spec.islands[2]}` }}
                    >
                      ROUGE ({spec.islands[2]} col.)
                    </div>
                  </div>

                  {/* 15 Rangées du fond (R1) vers l'entrée (R15) */}
                  <div className="space-y-1">
                    {Array.from({ length: spec.totalRows }, (_, r) => {
                      const maxH = getRowMaxStackHeight(r);
                      const isZoneStart = r === 0 || r === 4 || r === 8 || r === 12;

                      return (
                        <div
                          key={r}
                          className={`grid gap-1 items-center ${isZoneStart && r > 0 ? "pt-1.5 border-t border-dashed border-slate-300 dark:border-slate-700" : ""}`}
                          style={{
                            gridTemplateColumns:
                              spec.totalCols === 10
                                ? "76px repeat(3, minmax(0, 1fr)) 18px repeat(4, minmax(0, 1fr)) 18px repeat(3, minmax(0, 1fr))"
                                : "76px repeat(2, minmax(0, 1fr)) 20px repeat(3, minmax(0, 1fr)) 20px repeat(2, minmax(0, 1fr))",
                          }}
                        >
                          {/* Étiquette de rangée + hauteur max */}
                          <div className="flex items-center justify-between pr-1.5 text-[10px] font-bold text-muted-foreground">
                            <span>R{r + 1}</span>
                            <span className="rounded bg-slate-200/80 dark:bg-slate-800 px-1 py-0.5 text-[9px] font-black text-foreground">
                              ×{maxH}
                            </span>
                          </div>

                          {/* Colonnes avec les 2 allées */}
                          {Array.from({ length: spec.totalCols }, (_, c) => {
                            const key = `${r}_${c}`;
                            const cell = mergedGrid[key] || {
                              height: 0,
                              color: getDefaultStackColor(room.code, c),
                            };
                            const isSelected = selectedCellKey === key;
                            const isEmpty = cell.height <= 0;
                            const isPartial = cell.height > 0 && cell.height < maxH;
                            const shortFarmer = cell.farmer ? cell.farmer.slice(0, 4) : "";

                            const cellEl = (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedCellKey(key)}
                                title={`R${r + 1} C${c + 1} · ${cell.height}/${maxH} cajous${cell.farmer ? ` · ${cell.farmer}` : ""}`}
                                className={`h-8 rounded-md border text-[10px] leading-tight flex flex-col items-center justify-center transition cursor-pointer ${
                                  isSelected ? "ring-2 ring-sky-500 scale-[1.03] z-10" : ""
                                } ${
                                  isEmpty
                                    ? "border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 text-slate-400"
                                    : cell.color === "jaune"
                                      ? isPartial
                                        ? "border-amber-500 bg-amber-300/60 text-amber-950"
                                        : "border-amber-600 bg-amber-400 text-amber-950 shadow-2xs"
                                      : isPartial
                                        ? "border-rose-500 bg-rose-500/55 text-white"
                                        : "border-rose-700 bg-rose-600 text-white shadow-2xs"
                                }`}
                              >
                                <span className="font-black">
                                  {isEmpty ? "0" : `×${cell.height}`}
                                </span>
                                {!isEmpty && shortFarmer && (
                                  <span className="text-[8px] font-bold opacity-90 truncate max-w-full px-0.5">
                                    {shortFarmer}
                                  </span>
                                )}
                              </button>
                            );

                            // Insérer les allées entre les îlots
                            if (c === leftCols - 1 || c === leftCols + centerCols - 1) {
                              return (
                                <div key={`wrap_${key}`} className="contents">
                                  {cellEl}
                                  <div className="h-8 rounded bg-slate-200/70 dark:bg-slate-800/70 border border-dashed border-slate-300 dark:border-slate-700" />
                                </div>
                              );
                            }
                            return cellEl;
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bandeau PORTE D'ENTRÉE */}
                  <div className="mt-2.5 flex justify-center">
                    <div className="rounded-lg border-2 border-sky-600/50 bg-sky-500/10 px-6 py-1 text-[10px] font-black text-sky-900 dark:text-sky-200 uppercase tracking-wider">
                      🚪 {isAr ? "باب الدخول (الممر / قاعة الفرز)" : "PORTE D'ENTRÉE (Accès Couloir / SAS)"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
