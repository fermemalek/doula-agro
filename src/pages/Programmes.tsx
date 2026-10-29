import { useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { useSearchParams, Navigate } from "react-router-dom";
import { 
  Droplets, 
  Sprout, 
  ArrowRight, 
  Plus, 
  Pencil,
  Trash2,
  SprayCan, 
  Bug, 
  Search, 
  Database, 
  CircleDollarSign, 
  Coins, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Sparkles,
  Layers,
  ShoppingCart,
  Check
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAllModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcels, useParcelActions } from "@/lib/parcel-store";
import {
  ListPageShell,
  ProgramFiltersBar,
  matchesFilters,
  useFilters,
  useYearsFromDates,
  MONTHS_FR,
} from "@/components/programs/ProgramFiltersBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDisplayRole } from "@/lib/display-role";
import { useProducts, useProductActions } from "@/lib/products-store";
import { useSuppliers, useSupplierActions, type SupplierPurchase, debitProductStock } from "@/lib/suppliers-store";
import { SPECIES_SUMMARIES } from "@/data/extra_farm_data";
import { type FertilizerProduct } from "@/data/fertilizers";
import { toast } from "sonner";
import { useRecommendations, useRecommendationActions, type Recommendation } from "@/lib/cloud/recommendations";
import { useProfilesMap } from "@/lib/cloud/alerts";
import { RecommendationDetailDialog } from "@/components/RecommendationDetailDialog";
import { StatsModule } from "@/components/stats/StatsModule";

interface IrrRec {
  id: string;
  parcelId: string;
  createdAt: number;
  mode: "date" | "mensuel";
  date?: string;
  duration?: string;
  month?: string;
  year?: string;
  days?: string[];
  startHour?: string;
}

interface FertRec {
  id: string;
  parcelId: string;
  createdAt: number;
  date: string;
  total: number;
}

function irrDate(r: IrrRec): string | undefined {
  if (r.date) return r.date;
  if (r.year && r.month) {
    const idx = MONTHS_FR.indexOf(r.month);
    if (idx >= 0) return `${r.year}-${String(idx + 1).padStart(2, "0")}-01`;
  }
  return undefined;
}

type TypeFilter = "all" | "irrigation" | "fertilisation" | "pulverisation" | "phytosanitaire";

function formatMoney(val: number) {
  return new Intl.NumberFormat("fr-DZ", { 
    style: "currency", 
    currency: "DZD", 
    maximumFractionDigits: 0 
  })
    .format(val)
    .replace("DZD", "DA");
}

const CROP_GROUP_LABELS: Record<string, string> = {
  oliviers: "Oliviers",
  pommiers: "Pommiers",
  nectarinier: "Nectarinier",
  redix25: "REDIX 25",
  nablara: "NABLARA",
  casuarina: "Casuarina",
  autres: "Autres",
};

function ProgrammesPage() {
  const irr = useAllModuleRecords<IrrRec>("irrigation");
  const fert = useAllModuleRecords<FertRec>("fertilisation");
  const pulv = useAllModuleRecords<any>("pulverisation");
  const phyto = useAllModuleRecords<any>("phytosanitaire");
  const parcels = useParcels();
  const navigate = useNavigate();
  const role = useDisplayRole();

  // Recommendations & Actions
  const { data: recos = [] } = useRecommendations();
  const { accept } = useRecommendationActions();
  const { add: addModuleRecord } = useModuleActions();
  const { setStatus } = useParcelActions();
  const { data: profiles = {} } = useProfilesMap();

  // Reactive Stores
  const products = useProducts();
  const { update: updateProduct, add: addProduct } = useProductActions();
  const purchases = useSuppliers();
  const { addPurchase, updatePurchase, deletePurchase, deleteAllPurchases } = useSupplierActions();

  if (role !== "admin") {
    if (role === "ingenieur") {
      return <Navigate to="/recommandations" replace />;
    }
    return <Navigate to="/" replace />;
  }
  const isAdmin = role === "admin";
  const canEdit = isAdmin || role === "ingenieur";

  // Dashboard Tabs
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const isValidTab = ["archive", "database", "suppliers", "species", "purchase", "stats"].includes(tabParam || "");
  const initialTab = isAdmin && isValidTab ? (tabParam as "archive" | "database" | "suppliers" | "species" | "purchase" | "stats") : "archive";

  const [activeTab, setActiveTab] = useState<"archive" | "database" | "suppliers" | "species" | "purchase" | "stats">(initialTab);
  const effectiveTab = isAdmin ? activeTab : "archive";

  // State for detail dialog & helper actions
  const [selectedReco, setSelectedReco] = useState<Recommendation | null>(null);

  const getTargetParcels = (reco: Recommendation) => {
    const payload = (reco.payload ?? {}) as any;
    const groups = Array.isArray(payload.crop_group)
      ? payload.crop_group
      : payload.crop_group
      ? [payload.crop_group]
      : [];
    
    if (groups.length === 0) {
      return parcels.filter(p => reco.parcel_ids.includes(p.id));
    }

    const target = parcels.filter((p) => {
      const parcelMatchesCropGroup = (parcelItem: typeof p, group: string) => {
        if (group === "oliviers") return parcelItem.type === "olivier";
        if (group === "pommiers") return parcelItem.type === "pommier";
        if (group === "nectarinier") return parcelItem.type === "nectarine";
        if (group === "redix25") return parcelItem.id === "redix25";
        if (group === "nablara") return parcelItem.id === "nablara";
        if (group === "casuarina") return parcelItem.name.toUpperCase().includes("CASUARINA") || parcelItem.id === "brisevent";
        return false;
      };
      return groups.some((group) => parcelMatchesCropGroup(p, group));
    });

    if (target.length === 0) {
      return parcels.filter(p => reco.parcel_ids.includes(p.id));
    }
    return target;
  };

  const handleValidatePurchase = async (reco: Recommendation) => {
    const payload = (reco.payload ?? {}) as any;
    const program = payload.program;
    
    try {
      // 1) Determine target parcelles based on crop group
      const targetParcels = getTargetParcels(reco);

      // 2) Mutate status to accepted in database
      await accept.mutateAsync(reco.id);

      const safeParseFloat = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === "number") return val;
        const str = String(val).trim().replace(",", ".");
        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
      };

      let clonedCount = 0;
      if (program) {
        for (const parcel of targetParcels) {
          const surface = safeParseFloat(parcel.info?.surface) || 1;
          clonedCount++;

          if (reco.kind === "fertilisation") {
            if (payload.method === "irrigation") {
              // 1. Débiter le stock en FIFO
              let totalCost = 0;
              if (Array.isArray(program.entries)) {
                for (const entry of program.entries) {
                  if (Array.isArray(entry.items)) {
                    for (const it of entry.items) {
                      const doseHa = safeParseFloat(it.qty);
                      const doseTotale = parseFloat((doseHa * surface).toFixed(2));
                      const priceUnit = safeParseFloat(it.price);
                      totalCost += doseTotale * priceUnit;
                      debitProductStock(it.name, doseTotale);
                    }
                  }
                }
              }

              // 2. Envoyer le programme de fertilisation à l'exécutant
              const frequency = safeParseFloat(program.frequency) || 1;
              const adjustedProgram = {
                ...program,
                hectares: surface,
                total: totalCost * frequency,
                reco_id: reco.id,
              };
              addModuleRecord(parcel.id, "fertilisation", adjustedProgram);

              // 3. Créer un plan d'irrigation automatique
              const totalMin =
                program.irrigationTime === "1h"
                  ? 60
                  : program.irrigationTime === "1h30"
                    ? 90
                    : program.irrigationTime === "2h"
                      ? 120
                      : program.irrigationTime === "2h30"
                        ? 150
                        : program.irrigationTime === "3h"
                          ? 180
                          : 90;
              const durationHours = (totalMin / 60).toString();
              const irrigationPayload = {
                mode: "date",
                date: program.date || new Date().toISOString().slice(0, 10),
                duration: durationHours,
                dateStartHour: "08:00",
                wettingTime: program.wettingTime,
                injectionTime: program.injectionTime,
                rinsingTime: program.rinsingTime,
                irrigationTime: program.irrigationTime,
                reco_id: reco.id,
              };
              addModuleRecord(parcel.id, "irrigation", irrigationPayload);
            } else {
              // Fertilisation par Pulvérisation (Foliaire)
              // 1. Débiter le stock en FIFO
              if (Array.isArray(program.items)) {
                for (const it of program.items) {
                  const qty = safeParseFloat(it.qty);
                  debitProductStock(it.name, qty);
                }
              }
              // 2. Envoyer le programme à l'exécutant
              addModuleRecord(parcel.id, "pulverisation", { ...program, reco_id: reco.id });
            }
          } else if (reco.kind === "phytosanitaire") {
            // 1. Débiter le stock en FIFO
            if (Array.isArray(program.products)) {
              for (const p of program.products) {
                const qty = safeParseFloat(p.volume) || safeParseFloat(p.dosage) || 0;
                debitProductStock(p.product, qty);
              }
            }
            // 2. Envoyer le programme à l'exécutant
            addModuleRecord(parcel.id, "phytosanitaire", { ...program, reco_id: reco.id });
            setStatus(parcel.id, "alerte");
          }
        }
      }

      if (clonedCount > 0) {
        toast.success(`Achat validé et stock débité ! Programme généré pour ${clonedCount} parcelle(s) et envoyé à l'exécutant.`);
      } else {
        toast.success("Achat validé et stock débité !");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la validation");
    }
  };

  const purchaseRecos = useMemo(() => {
    return recos
      .filter((r) => r.status === "rejetee")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [recos]);

  // Tab 1: Archive Filtering
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [filters, setFilters] = useFilters();

  // Tab 2: Database Search & Filtering
  const [dbSearch, setDbSearch] = useState("");
  const [dbType, setDbType] = useState<string>("all");
  const [editingProduct, setEditingProduct] = useState<FertilizerProduct | null>(null);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);

  // Tab 3: Suppliers States & Dialogs
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [addPurchaseOpen, setAddPurchaseOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<SupplierPurchase | null>(null);

  // Purchase Form Input States
  const [pSupplierName, setPSupplierName] = useState("");
  const [pProductName, setPProductName] = useState("");
  const [pPurchaseDate, setPPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [pQuantity, setPQuantity] = useState("");
  const [pUnit, setPUnit] = useState<"kg" | "litres">("kg");
  const [pPricePerUnit, setPPricePerUnit] = useState("");
  const [pPaidAmount, setPPaidAmount] = useState("");

  const handleProductSelect = (name: string) => {
    setPProductName(name);
    const prod = products.find(p => p.name === name);
    if (prod) {
      setPUnit(prod.unit);
      setPPricePerUnit(prod.price.toString());
    }
  };

  const years = useYearsFromDates([
    ...irr.map(irrDate),
    ...fert.map((r) => r.date),
    ...pulv.map((r) => r.date),
    ...phyto.map((r) => r.date),
  ]);

  type Unified = {
    id: string;
    kind: "irrigation" | "fertilisation" | "pulverisation" | "phytosanitaire";
    parcelId: string;
    createdAt: number;
    date?: string;
    label: string;
    total?: number;
  };

  const archiveItems: Unified[] = useMemo(() => {
    const list: Unified[] = [];
    if (typeFilter === "all" || typeFilter === "irrigation") {
      for (const r of irr) {
        list.push({
          id: r.id,
          kind: "irrigation",
          parcelId: r.parcelId,
          createdAt: r.createdAt,
          date: irrDate(r),
          label:
            r.mode === "date"
              ? `Durée: ${r.duration || "—"}`
              : `Jours: ${(r.days ?? []).join(", ") || "—"}${r.startHour ? ` • ${r.startHour}` : ""}`,
        });
      }
    }
    if (typeFilter === "all" || typeFilter === "fertilisation") {
      for (const r of fert) {
        list.push({
          id: r.id,
          kind: "fertilisation",
          parcelId: r.parcelId,
          createdAt: r.createdAt,
          date: r.date,
          label: `Total: ${formatMoney(r.total ?? 0)}`,
          total: r.total,
        });
      }
    }
    if (typeFilter === "all" || typeFilter === "pulverisation") {
      for (const r of pulv) {
        list.push({
          id: r.id,
          kind: "pulverisation",
          parcelId: r.parcelId,
          createdAt: r.createdAt,
          date: r.date,
          label: `Pulvérisation — ${(r.items ?? []).length} éléments`,
          total: r.total,
        });
      }
    }
    if (typeFilter === "all" || typeFilter === "phytosanitaire") {
      for (const r of phyto) {
        list.push({
          id: r.id,
          kind: "phytosanitaire",
          parcelId: r.parcelId,
          createdAt: r.createdAt,
          date: r.date,
          label: `Phytosanitaire — ${(r.products ?? []).length} produits`,
          total: r.total,
        });
      }
    }
    return list
      .filter((it) => matchesFilters(it.date, it.parcelId, filters))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [irr, fert, pulv, phyto, typeFilter, filters]);

  // Tab 2: Database computed items
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch = 
        prod.name.toLowerCase().includes(dbSearch.toLowerCase()) ||
        prod.type.toLowerCase().includes(dbSearch.toLowerCase()) ||
        (prod.note || "").toLowerCase().includes(dbSearch.toLowerCase());
      
      const matchesType = dbType === "all" 
        ? true 
        : prod.type.toLowerCase().includes(dbType.toLowerCase());

      return matchesSearch && matchesType;
    });
  }, [products, dbSearch, dbType]);

  const dbTypesList = useMemo(() => {
    const types = new Set<string>();
    products.forEach((p) => {
      if (p.type.includes("Bac A")) types.add("Bac A");
      else if (p.type.includes("Bac B")) types.add("Bac B");
      else if (p.type.includes("Bac C")) types.add("Bac C");
      else if (p.type.includes("Bac D")) types.add("Bac D");
      else types.add(p.type);
    });
    return Array.from(types);
  }, [products]);

  // Tab 3: Suppliers dynamic calculations
  const supplierSummaries = useMemo(() => {
    const map = new Map<string, { name: string; totalCost: number; paidAmount: number; debt: number }>();
    let grandTotal = 0;
    
    for (const p of purchases) {
      const normName = p.supplierName.trim().toLowerCase();
      const current = map.get(normName) || { name: p.supplierName.trim(), totalCost: 0, paidAmount: 0, debt: 0 };
      current.totalCost += p.totalCost;
      current.paidAmount += p.paidAmount;
      current.debt = current.totalCost - current.paidAmount;
      map.set(normName, current);
      grandTotal += p.totalCost;
    }
    
    return Array.from(map.values()).map(s => ({
      ...s,
      percentage: grandTotal > 0 ? s.totalCost / grandTotal : 0
    })).sort((a, b) => b.totalCost - a.totalCost);
  }, [purchases]);

  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<"irrigation" | "fertilisation">("irrigation");
  const [addParcel, setAddParcel] = useState<string>("");

  function openAdd() {
    setAddKind("irrigation");
    setAddParcel(parcels[0]?.id ?? "");
    setAddOpen(true);
  }

  function confirmAdd() {
    if (!addParcel) return;
    setAddOpen(false);
    navigate(`/parcelle/${addParcel}?tab=${addKind}`);
  }

  return (
    <ListPageShell title="Programmation & Agronomie">
      
      {/* Premium Segmented Controls Top Tabs */}
      {isAdmin && (
        <div className="mb-4 grid grid-cols-2 min-[400px]:grid-cols-3 gap-1 rounded-2xl bg-muted p-1 sm:flex sm:grid-cols-none">
          <button
            onClick={() => setActiveTab("archive")}
            className={`flex-1 sm:flex-initial px-3 py-2 text-center text-xs font-bold rounded-xl transition-all ${
              effectiveTab === "archive"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Programmes Archivés
          </button>
          <button
            onClick={() => setActiveTab("database")}
            className={`flex-1 sm:flex-initial px-3 py-2 text-center text-xs font-bold rounded-xl transition-all ${
              effectiveTab === "database"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Base Produits
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`flex-1 sm:flex-initial px-3 py-2 text-center text-xs font-bold rounded-xl transition-all ${
              effectiveTab === "suppliers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dépenses Fournisseurs
          </button>
          <button
            onClick={() => setActiveTab("species")}
            className={`flex-1 sm:flex-initial px-3 py-2 text-center text-xs font-bold rounded-xl transition-all ${
              effectiveTab === "species"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Coûts par Espèce
          </button>
          <button
            onClick={() => setActiveTab("purchase")}
            className={`flex-1 sm:flex-initial px-3 py-2 text-center text-xs font-bold rounded-xl transition-all ${
              effectiveTab === "purchase"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Achats
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 sm:flex-initial px-3 py-2 text-center text-xs font-bold rounded-xl transition-all ${
              effectiveTab === "stats"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Statistiques & Graphes
          </button>
        </div>
      )}

      {/* TAB 1: ARCHIVE */}
      {effectiveTab === "archive" && (
        <div className="space-y-3">
          <Card className="p-3 flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filtrer par Type</Label>
              <select
                className="mt-1 w-full rounded-xl border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                <option value="all">Tous les programmes</option>
                <option value="irrigation">Irrigation</option>
                <option value="fertilisation">Fertilisation au sol</option>
                <option value="pulverisation">Pulvérisation foliaire</option>
                <option value="phytosanitaire">Phytosanitaire</option>
              </select>
            </div>
            {canEdit && (
              <Button onClick={openAdd} className="mt-5 shrink-0 rounded-xl font-bold">
                <Plus className="h-4 w-4 mr-1" /> Nouveau
              </Button>
            )}
          </Card>

          <ProgramFiltersBar value={filters} onChange={setFilters} years={years} />

          {archiveItems.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Aucun programme archivé correspondant.
            </Card>
          ) : (
            <ul className="space-y-2">
              {archiveItems.map((it) => {
                const parcel = parcels.find((p) => p.id === it.parcelId);
                const Icon = 
                  it.kind === "irrigation" 
                    ? Droplets 
                    : it.kind === "fertilisation" 
                    ? Sprout 
                    : it.kind === "pulverisation" 
                    ? SprayCan 
                    : Bug;
                
                const kindLabel = 
                  it.kind === "irrigation"
                    ? "Irrigation"
                    : it.kind === "fertilisation"
                    ? "Fertilisation"
                    : it.kind === "pulverisation"
                    ? "Pulvérisation"
                    : "Phytosanitaire";

                return (
                  <li key={`${it.kind}-${it.id}`}>
                    <Link
                      to={`/parcelle/${it.parcelId}?tab=${it.kind}`}
                      className="block"
                    >
                      <Card className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                        <div className="rounded-xl bg-primary/10 p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm truncate">
                              {parcel?.name ?? it.parcelId}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {it.date ?? "—"}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            <span className="font-semibold text-primary/80">{kindLabel}</span> • {it.label}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* TAB 2: DATABASE */}
      {effectiveTab === "database" && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit ou matière active..."
                value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <select
              value={dbType}
              onChange={(e) => setDbType(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none shrink-0"
            >
              <option value="all">Toutes catégories</option>
              {dbTypesList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Button
              onClick={() => {
                setNewProductOpen(true);
              }}
              className="rounded-xl font-bold gap-1 shrink-0 bg-primary hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Nouveau Produit
            </Button>
          </div>

          <div className="text-xs text-muted-foreground font-semibold px-1">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""} trouvé{filteredProducts.length > 1 ? "s" : ""}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {filteredProducts.map((prod, idx) => {
              const isBac = prod.type.includes("Bac");
              const isPhyto = prod.type.toLowerCase().includes("phyto");
              const isFoliar = prod.type.toLowerCase().includes("foliar") || prod.type.toLowerCase().includes("pulv");

              const badgeColor = isBac 
                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" 
                : isPhyto 
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : isFoliar 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-purple-500/10 text-purple-600 dark:text-purple-400";

              return (
                <Card key={idx} className="p-3.5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm leading-snug">{prod.name}</span>
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setEditProductOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                        title="Modifier le produit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${badgeColor}`}>
                        {prod.type}
                      </span>
                      {isPhyto ? (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          DAR: {prod.solubility} Jours
                        </span>
                      ) : (
                        <>
                          {prod.solubility > 0 && prod.solubility < 5000 && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Solubilité: {prod.solubility} g/L
                            </span>
                          )}
                          {prod.solubility >= 5000 && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Liquide / Acide
                            </span>
                          )}
                        </>
                      )}
                      {prod.time > 0 && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> Agitation: {prod.time}m
                        </span>
                      )}
                    </div>

                    {prod.note && (
                      <div className="rounded-lg bg-yellow-500/10 p-2 flex items-start gap-1.5 text-[10px] text-amber-800 dark:text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{prod.note}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 border-t pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Prix indicatif</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatMoney(prod.price)} <span className="text-xs text-muted-foreground font-normal">/ {prod.unit}</span>
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS */}
      {effectiveTab === "suppliers" && (
        <div className="space-y-3">
          {/* Header Summary Dashboard */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border bg-card p-3 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Dépenses Totales</span>
              <p className="font-mono font-black text-sm text-foreground mt-0.5">
                {formatMoney(supplierSummaries.reduce((sum, s) => sum + s.totalCost, 0))}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-3 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Montants Versés</span>
              <p className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatMoney(supplierSummaries.reduce((sum, s) => sum + s.paidAmount, 0))}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-3 shadow-xs relative">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Dette Restante</span>
              <p className="font-mono font-black text-sm text-destructive mt-0.5">
                {formatMoney(supplierSummaries.reduce((sum, s) => sum + s.debt, 0))}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Liste des Fournisseurs ({supplierSummaries.length})
            </h3>
            <div className="flex gap-2">
              {supplierSummaries.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm("Voulez-vous vraiment supprimer TOUS les achats de fournisseurs ? Cette action est irréversible et effacera tous les enregistrements de cette catégorie.")) {
                      try {
                        deleteAllPurchases();
                        toast.success("Tous les achats ont été supprimés avec succès.");
                      } catch (err: any) {
                        toast.error("Erreur lors de la suppression : " + err.message);
                      }
                    }
                  }}
                  className="rounded-xl font-bold text-xs h-8 gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Tout Effacer
                </Button>
              )}
              <Button
                onClick={() => {
                  setPSupplierName("");
                  setAddPurchaseOpen(true);
                }}
                className="rounded-xl font-bold text-xs h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Enregistrer un Achat
              </Button>
            </div>
          </div>

          {supplierSummaries.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Aucun achat enregistré pour le moment.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {supplierSummaries.map((supp, idx) => {
                const percentage = supp.percentage * 100;
                const paidPercent = supp.totalCost > 0 ? (supp.paidAmount / supp.totalCost) * 100 : 0;
                const hue = (idx * 45) % 360;
                const colorStyle = {
                  backgroundColor: `hsla(${hue}, 70%, 50%, 0.1)`,
                  color: `hsl(${hue}, 70%, 40%)`
                };
                const barColor = `hsl(${hue}, 75%, 45%)`;

                return (
                  <Card
                    key={supp.name}
                    onClick={() => setSelectedSupplier(supp.name)}
                    className="p-4 space-y-3 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span 
                          style={colorStyle}
                          className="rounded-lg px-2.5 py-1 text-xs font-black uppercase"
                        >
                          {supp.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-foreground">
                          {formatMoney(supp.totalCost)}
                        </span>
                        {supp.debt > 0 && (
                          <div className="text-[10px] text-destructive font-semibold">
                            Dette : {formatMoney(supp.debt)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                        <span>Paiement : {paidPercent.toFixed(0)}% effectué</span>
                        <span>{percentage.toFixed(1)}% des dépenses</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          style={{ width: `${paidPercent}%`, backgroundColor: barColor }}
                          className="h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SPECIES */}
      {effectiveTab === "species" && (
        <div className="space-y-4">
          {SPECIES_SUMMARIES.map((spec) => {
            const specIcon = spec.species === "NECTARINE" ? "🍑" : spec.species === "POMMIER" ? "🍏" : "🫒";
            return (
              <div key={spec.species} className="space-y-2">
                {/* Header Species */}
                <div className="flex items-center gap-2 pl-1 mt-2">
                  <span className="text-xl">{specIcon}</span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    {spec.species} — Budget estimatif
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-2xl border bg-card p-3 shadow-sm">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Fertigation Sol</span>
                    <p className="font-mono font-bold text-xs text-foreground mt-0.5">
                      {formatMoney(spec.subtotal.fertigation)}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-card p-3 shadow-sm">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Foliaires / Pulv</span>
                    <p className="font-mono font-bold text-xs text-foreground mt-0.5">
                      {formatMoney(spec.subtotal.foliar)}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-card p-3 shadow-sm">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Traitement Phyto</span>
                    <p className="font-mono font-bold text-xs text-foreground mt-0.5">
                      {formatMoney(spec.subtotal.phyto)}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-primary/10 border-primary/20 p-3 shadow-sm">
                    <span className="text-[10px] font-extrabold text-primary uppercase flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Total Espèce
                    </span>
                    <p className="font-mono font-extrabold text-sm text-primary mt-0.5">
                      {formatMoney(spec.subtotal.total)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {spec.entries.map((entry, eIdx) => {
                    const hasCosts = entry.total > 0;
                    return (
                      <Card key={eIdx} className={`p-3 ${!hasCosts ? "opacity-60 bg-muted/20" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-foreground">{entry.program}</span>
                          <span className="font-mono font-bold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded-lg">
                            {formatMoney(entry.total)}
                          </span>
                        </div>
                        {hasCosts && (
                          <div className="mt-2 grid grid-cols-3 text-[9px] text-muted-foreground border-t border-dashed pt-1.5">
                            <div>
                              <span className="font-medium">Fertigation:</span> {formatMoney(entry.fertigation)}
                            </div>
                            <div className="text-center">
                              <span className="font-medium">Foliaires:</span> {formatMoney(entry.foliar)}
                            </div>
                            <div className="text-right">
                              <span className="font-medium">Phyto:</span> {formatMoney(entry.phyto)}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5: PURCHASE */}
      {effectiveTab === "purchase" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Achats en attente d'approvisionnement ({purchaseRecos.length})
            </h3>
          </div>

          {purchaseRecos.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Aucun achat en attente d'approvisionnement.
            </Card>
          ) : (
            <div className="space-y-4">
              {purchaseRecos.map((reco) => {
                const targetParcels = getTargetParcels(reco);
                const targetNames = targetParcels.map((p) => p.name).join(", ");
                const payload = (reco.payload ?? {}) as any;
                const cropGroups = Array.isArray(payload.crop_group)
                  ? payload.crop_group
                  : payload.crop_group
                  ? [payload.crop_group]
                  : [];

                const authorName = profiles[reco.created_by] || "Ingénieur";
                const recoDate = new Date(reco.created_at).toLocaleDateString("fr-FR");

                // Compute sums
                const productSums: Array<{ name: string; qty: number; unit: string; price: number; type: string }> = [];
                const sumsMap: Record<string, { name: string; qty: number; unit: string; price: number; type: string }> = {};
                const program = payload.program || {};

                if (reco.kind === "fertilisation") {
                  if (payload.method === "irrigation") {
                    const frequency = parseFloat(String(program.frequency || "1")) || 1;
                    if (Array.isArray(program.entries)) {
                      for (const entry of program.entries) {
                        if (Array.isArray(entry.items)) {
                          for (const it of entry.items) {
                            const name = it.name;
                            const doseHa = parseFloat(String(it.qty || "0")) || 0;
                            const price = parseFloat(String(it.price || "0")) || 0;
                            const unit = it.unit || "kg";
                            
                            for (const parcel of targetParcels) {
                              const surface = parseFloat(String(parcel.info?.surface || "1").trim().replace(",", ".")) || 1;
                              const totalQty = parseFloat((doseHa * surface * frequency).toFixed(2));
                              if (!sumsMap[name]) {
                                sumsMap[name] = { name, qty: 0, unit, price, type: `Bac ${entry.bac}` };
                              }
                              sumsMap[name].qty += totalQty;
                            }
                          }
                        }
                      }
                    }
                  } else {
                    if (Array.isArray(program.items)) {
                      for (const it of program.items) {
                        const name = it.name;
                        const qty = parseFloat(String(it.qty || "0")) || 0;
                        const price = parseFloat(String(it.price || "0")) || 0;
                        const unit = it.unit || "kg";
                        if (!sumsMap[name]) {
                          sumsMap[name] = { name, qty: 0, unit, price, type: "Foliaire" };
                        }
                        sumsMap[name].qty += qty;
                      }
                    }
                  }
                } else if (reco.kind === "phytosanitaire") {
                  if (Array.isArray(program.products)) {
                    for (const p of program.products) {
                      const name = p.product;
                      const dosage = parseFloat(String(p.dosage || "0")) || 0;
                      const volume = parseFloat(String(p.volume || "0")) || 0;
                      const qty = volume || dosage;
                      const price = parseFloat(String(p.price || "0")) || 0;
                      const unit = "litres";
                      if (!sumsMap[name]) {
                        sumsMap[name] = { name, qty: 0, unit, price, type: "Phyto" };
                      }
                      sumsMap[name].qty += qty;
                    }
                  }
                }

                for (const key in sumsMap) {
                  productSums.push({
                    ...sumsMap[key],
                    qty: parseFloat(sumsMap[key].qty.toFixed(2)),
                  });
                }

                const grandTotal = productSums.reduce((sum, item) => sum + item.qty * item.price, 0);

                const RecoIcon = reco.kind === "irrigation" ? Droplets : reco.kind === "phytosanitaire" ? Bug : Sprout;

                return (
                  <Card key={reco.id} className="p-4 space-y-4 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b pb-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
                          <RecoIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{reco.title}</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Par <span className="font-semibold">{authorName}</span> • le {recoDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                          Approvisionnement
                        </span>
                      </div>
                    </div>

                    {/* Metadata & comment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-muted/20 rounded-xl p-3">
                      <div>
                        <span className="font-semibold text-muted-foreground uppercase text-[9px] block">Parcelles Ciblées</span>
                        <span className="font-medium text-foreground">{targetNames || "Aucune"}</span>
                      </div>
                      {cropGroups.length > 0 && (
                        <div>
                          <span className="font-semibold text-muted-foreground uppercase text-[9px] block">Cultures</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cropGroups.map((g) => (
                              <span key={g} className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                {CROP_GROUP_LABELS[g] || g}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {reco.comment && (
                        <div className="md:col-span-2 border-t pt-2 mt-1">
                          <span className="font-semibold text-muted-foreground uppercase text-[9px] block">Commentaire ingénieur</span>
                          <p className="italic text-foreground mt-0.5">{reco.comment}</p>
                        </div>
                      )}
                    </div>

                    {/* Table of items to buy */}
                    {productSums.length > 0 && (
                      <div className="space-y-2">
                        <span className="font-bold text-xs text-foreground uppercase tracking-wider block">
                          Produits et Quantités Requis
                        </span>
                        <div className="overflow-x-auto rounded-xl border bg-muted/10">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-muted text-muted-foreground border-b uppercase font-bold text-[9px]">
                                <th className="p-2 border">Produit</th>
                                <th className="p-2 border text-center">Catégorie</th>
                                <th className="p-2 border text-center">Qté à acheter</th>
                                <th className="p-2 border text-right">Prix Unit.</th>
                                <th className="p-2 border text-right">Coût Estimé</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-medium text-foreground">
                              {productSums.map((item, idx) => (
                                <tr key={idx} className="hover:bg-muted/30">
                                  <td className="p-2 border font-semibold">{item.name}</td>
                                  <td className="p-2 border text-center">
                                    <span className="bg-muted px-2 py-0.5 rounded text-[10px]">
                                      {item.type}
                                    </span>
                                  </td>
                                  <td className="p-2 border text-center font-bold text-amber-700">
                                    {item.qty} {item.unit}
                                  </td>
                                  <td className="p-2 border text-right font-mono text-muted-foreground">
                                    {formatMoney(item.price)}
                                  </td>
                                  <td className="p-2 border text-right font-mono font-bold text-foreground">
                                    {formatMoney(item.qty * item.price)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {grandTotal > 0 && (
                              <tfoot>
                                <tr className="bg-primary/5 font-extrabold text-foreground border-t">
                                  <td colSpan={4} className="p-2 border text-right uppercase text-[10px]">
                                    Total Estimé de l'Achat :
                                  </td>
                                  <td className="p-2 border text-right font-mono font-black text-primary text-sm">
                                    {formatMoney(grandTotal)}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 justify-end pt-2 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedReco(reco)}
                        className="rounded-xl text-xs font-bold shrink-0 h-9"
                      >
                        Consulter Détails
                      </Button>
                      <Button
                        onClick={() => {
                          if (window.confirm("Valider l'achat de ces produits et transférer le programme à l'exécutant ?")) {
                            void handleValidatePurchase(reco);
                          }
                        }}
                        disabled={accept.isPending}
                        className="rounded-xl text-xs font-bold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 h-9"
                      >
                        <Check className="h-4 w-4" /> Valider l'achat et Accepter
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {effectiveTab === "stats" && (
        <StatsModule />
      )}

      {/* SUPPLIER DETAILS DIALOG */}
      <Dialog open={selectedSupplier !== null} onOpenChange={(open) => !open && setSelectedSupplier(null)}>
        {selectedSupplier && (() => {
          const supplierPurchases = purchases.filter(p => p.supplierName.trim().toLowerCase() === selectedSupplier.trim().toLowerCase());
          const totalCost = supplierPurchases.reduce((sum, p) => sum + p.totalCost, 0);
          const totalPaid = supplierPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
          const remainingDebt = totalCost - totalPaid;

          return (
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl rounded-2xl bg-card text-card-foreground">
              <DialogHeader className="border-b pb-2">
                <DialogTitle className="text-base font-black uppercase tracking-wide flex justify-between items-center">
                  <span>Détails Fournisseur — {selectedSupplier}</span>
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-xl">
                    Situation Financière
                  </span>
                </DialogTitle>
              </DialogHeader>

              {/* Financial situation summary cards */}
              <div className="grid grid-cols-3 gap-3 my-2 text-xs">
                <div className="rounded-xl border bg-muted/20 p-2.5">
                  <span className="font-semibold text-muted-foreground uppercase text-[9px]">Total Facturé</span>
                  <p className="font-mono font-bold text-sm text-foreground mt-0.5">
                    {formatMoney(totalCost)}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-2.5">
                  <span className="font-semibold text-muted-foreground uppercase text-[9px]">Total Payé</span>
                  <p className="font-mono font-bold text-sm text-emerald-600 mt-0.5">
                    {formatMoney(totalPaid)}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-2.5">
                  <span className="font-semibold text-muted-foreground uppercase text-[9px]">Reste à Payer</span>
                  <p className={`font-mono font-bold text-sm mt-0.5 ${remainingDebt > 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {formatMoney(remainingDebt)}
                  </p>
                </div>
              </div>

              {/* Table of purchased products */}
              <div className="overflow-x-auto rounded-xl border bg-muted/10">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted text-muted-foreground border-b uppercase font-bold text-[9px]">
                      <th className="p-2 border">Date</th>
                      <th className="p-2 border">Produit</th>
                      <th className="p-2 border text-center">Acheté</th>
                      <th className="p-2 border text-center">Consommé</th>
                      <th className="p-2 border text-center">Restant</th>
                      <th className="p-2 border text-right">Total (DA)</th>
                      <th className="p-2 border text-right">Payé / Avance</th>
                      <th className="p-2 border text-right">Reste</th>
                      <th className="p-2 border text-center">Action/Statut</th>
                      <th className="p-2 border text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium text-foreground">
                    {supplierPurchases.map((p) => {
                      const remainingQty = parseFloat((p.quantity - p.consumed).toFixed(2));
                      const remainingPay = parseFloat((p.totalCost - p.paidAmount).toFixed(2));
                      const isSolded = p.paidAmount >= p.totalCost;
                      const actionText = isSolded ? "Solder" : "Dette";

                      return (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="p-2 border whitespace-nowrap">{p.purchaseDate}</td>
                          <td className="p-2 border font-semibold truncate max-w-[150px]" title={p.productName}>
                            {p.productName.split("/")[0]}
                          </td>
                          <td className="p-2 border text-center whitespace-nowrap">
                            {p.quantity} {p.unit}
                          </td>
                          <td className="p-2 border text-center text-amber-700 whitespace-nowrap">
                            {p.consumed} {p.unit}
                          </td>
                          <td className={`p-2 border text-center whitespace-nowrap font-bold ${remainingQty > 0 ? "text-emerald-700" : "text-muted-foreground"}`}>
                            {remainingQty} {p.unit}
                          </td>
                          <td className="p-2 border text-right font-mono font-bold">
                            {formatMoney(p.totalCost)}
                          </td>
                          <td className="p-2 border text-right font-mono text-emerald-600 font-bold whitespace-nowrap">
                            {formatMoney(p.paidAmount)}
                          </td>
                          <td className={`p-2 border text-right font-mono font-bold whitespace-nowrap ${remainingPay > 0 ? "text-destructive" : "text-emerald-600"}`}>
                            {formatMoney(remainingPay)}
                          </td>
                          <td className="p-2 border text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isSolded ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                              {actionText}
                            </span>
                          </td>
                          <td className="p-2 border text-center whitespace-nowrap">
                            <button
                              onClick={() => setEditingPurchase(p)}
                              className="mr-1.5 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary inline-flex items-center"
                              title="Modifier la transaction"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Voulez-vous vraiment supprimer cet achat ?")) {
                                  deletePurchase(p.id);
                                  toast.success("Achat supprimé avec succès !");
                                }
                              }}
                              className="p-1 rounded hover:bg-destructive/10 text-destructive hover:text-destructive/80 inline-flex items-center"
                              title="Supprimer la transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="mt-4 gap-2">
                <Button variant="outline" onClick={() => setSelectedSupplier(null)} className="rounded-xl">
                  Fermer
                </Button>
                <Button
                  onClick={() => {
                    setPSupplierName(selectedSupplier || "");
                    setAddPurchaseOpen(true);
                  }}
                  className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  + Enregistrer un Achat
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>

      {/* EDIT PRODUCT DIALOG */}
      <Dialog open={editProductOpen} onOpenChange={setEditProductOpen}>
        <DialogContent className="rounded-2xl bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-wide flex items-center gap-1.5">
              <Pencil className="h-4 w-4 text-primary" /> Modifier les informations du produit
            </DialogTitle>
          </DialogHeader>
          {editingProduct && (() => {
            return (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const price = parseFloat((form.elements.namedItem("price") as HTMLInputElement).value) || 0;
                  const solubility = parseFloat((form.elements.namedItem("solubility") as HTMLInputElement).value) || 0;
                  const time = parseFloat((form.elements.namedItem("time") as HTMLInputElement).value) || 0;
                  const note = (form.elements.namedItem("note") as HTMLTextAreaElement).value || "";
                  const type = (form.elements.namedItem("type") as HTMLInputElement).value || "";
                  const unit = (form.elements.namedItem("unit") as HTMLSelectElement).value as "kg" | "litres";

                  updateProduct(editingProduct.name, { price, solubility, time, note, type, unit });
                  toast.success("Informations du produit modifiées avec succès !");
                  setEditProductOpen(false);
                  setEditingProduct(null);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <Label className="text-xs font-semibold">Nom du Produit (Non modifiable)</Label>
                  <Input value={editingProduct.name} disabled className="mt-1 rounded-xl bg-muted" />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Catégorie / Type</Label>
                    <Input name="type" defaultValue={editingProduct.type} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Unité</Label>
                    <select
                      name="unit"
                      defaultValue={editingProduct.unit}
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
                    >
                      <option value="kg">kg</option>
                      <option value="litres">litres</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Prix Indicatif (DA)</Label>
                    <Input name="price" type="number" defaultValue={editingProduct.price} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">
                      {editingProduct.type.toLowerCase().includes("phyto") ? "DAR (Jours)" : "Solubilité (g/L)"}
                    </Label>
                    <Input name="solubility" type="number" defaultValue={editingProduct.solubility} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Agitation (min)</Label>
                    <Input name="time" type="number" defaultValue={editingProduct.time} className="mt-1 rounded-xl" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Note / Consigne de sécurité</Label>
                  <textarea
                    name="note"
                    defaultValue={editingProduct.note}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <DialogFooter className="mt-4 gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditProductOpen(false)} className="rounded-xl">
                    Annuler
                  </Button>
                  <Button type="submit" className="rounded-xl font-bold bg-primary text-white">
                    Enregistrer les modifications
                  </Button>
                </DialogFooter>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ADD NEW PRODUCT DIALOG */}
      <Dialog open={newProductOpen} onOpenChange={setNewProductOpen}>
        <DialogContent className="rounded-2xl bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-wide flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Ajouter un produit à la base
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
              const type = (form.elements.namedItem("type") as HTMLInputElement).value.trim();
              const unit = (form.elements.namedItem("unit") as HTMLSelectElement).value as "kg" | "litres";
              const price = parseFloat((form.elements.namedItem("price") as HTMLInputElement).value) || 0;
              const solubility = parseFloat((form.elements.namedItem("solubility") as HTMLInputElement).value) || 0;
              const time = parseFloat((form.elements.namedItem("time") as HTMLInputElement).value) || 0;
              const note = (form.elements.namedItem("note") as HTMLTextAreaElement).value.trim();

              if (!name) return toast.error("Nom du produit requis");

              addProduct({ name, type, unit, price, solubility, time, note });
              toast.success("Produit ajouté à la base avec succès !");
              setNewProductOpen(false);
              form.reset();
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <Label className="text-xs font-semibold">Nom du Produit</Label>
              <Input name="name" placeholder="ex: Nitrate de Potasse" className="mt-1 rounded-xl" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Catégorie / Type</Label>
                <Input name="type" placeholder="ex: Fertigation - Bac B" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Unité</Label>
                <select
                  name="unit"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
                >
                  <option value="kg">kg</option>
                  <option value="litres">litres</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Prix Indicatif (DA)</Label>
                <Input name="price" type="number" placeholder="ex: 150" className="mt-1 rounded-xl" />
              </div>
                  <div>
                    <Label className="text-xs font-semibold">Solubilité (g/L) / DAR (Jours)</Label>
                    <Input name="solubility" type="number" placeholder="ex: 120" className="mt-1 rounded-xl" />
                  </div>
              <div>
                <Label className="text-xs font-semibold">Agitation (min)</Label>
                <Input name="time" type="number" placeholder="ex: 10" className="mt-1 rounded-xl" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Note / Consigne de sécurité</Label>
              <textarea
                name="note"
                placeholder="Consignes particulières..."
                rows={2}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setNewProductOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button type="submit" className="rounded-xl font-bold bg-primary text-white">
                Ajouter le produit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD NEW PURCHASE DIALOG */}
      <Dialog
        open={addPurchaseOpen}
        onOpenChange={(open) => {
          setAddPurchaseOpen(open);
          if (!open) {
            setPSupplierName("");
            setPProductName("");
            setPQuantity("");
            setPPricePerUnit("");
            setPPaidAmount("");
          }
        }}
      >
        <DialogContent className="rounded-2xl bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-wide flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-emerald-600" /> Enregistrer un Achat Fournisseur
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              
              if (!pSupplierName.trim()) return toast.error("Nom du fournisseur requis");
              if (!pProductName) return toast.error("Veuillez sélectionner ou saisir un produit");
              if (!pQuantity || parseFloat(pQuantity) <= 0) return toast.error("Quantité invalide");
              if (!pPricePerUnit || parseFloat(pPricePerUnit) <= 0) return toast.error("Prix unitaire invalide");
              if (!pPurchaseDate) return toast.error("Date requise");

              const quantity = parseFloat(pQuantity);
              const pricePerUnit = parseFloat(pPricePerUnit);
              const paidAmount = parseFloat(pPaidAmount) || 0;
              const totalCost = quantity * pricePerUnit;

              addPurchase({
                supplierName: pSupplierName.trim(),
                productName: pProductName,
                purchaseDate: pPurchaseDate,
                quantity,
                unit: pUnit,
                pricePerUnit,
                totalCost,
                paidAmount,
              });

              toast.success("Achat enregistré avec succès !");
              setAddPurchaseOpen(false);
              
              setPSupplierName("");
              setPProductName("");
              setPQuantity("");
              setPPricePerUnit("");
              setPPaidAmount("");
            }}
            className="space-y-3 text-xs"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Nom du Fournisseur</Label>
                <Input
                  value={pSupplierName}
                  onChange={(e) => setPSupplierName(e.target.value)}
                  placeholder="ex: Agrimax, BLIDA..."
                  className="mt-1 rounded-xl"
                  required
                  disabled={selectedSupplier !== null}
                  list="suppliers-list"
                />
                <datalist id="suppliers-list">
                  {supplierSummaries.map((s) => (
                    <option key={s.name} value={s.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label className="text-xs font-semibold">Date d'achat</Label>
                <Input
                  type="date"
                  value={pPurchaseDate}
                  onChange={(e) => setPPurchaseDate(e.target.value)}
                  className="mt-1 rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Sélectionner un produit existant</Label>
              <select
                value={pProductName}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
              >
                <option value="">-- Choisir un produit --</option>
                {products.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Ou saisir un nouveau produit</Label>
              <Input
                value={pProductName}
                onChange={(e) => setPProductName(e.target.value)}
                placeholder="Nom du produit"
                className="mt-1 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Quantité</Label>
                <Input
                  type="number"
                  step="any"
                  value={pQuantity}
                  onChange={(e) => setPQuantity(e.target.value)}
                  placeholder="ex: 1000"
                  className="mt-1 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Unité</Label>
                <select
                  value={pUnit}
                  onChange={(e) => setPUnit(e.target.value as "kg" | "litres")}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
                >
                  <option value="kg">kg</option>
                  <option value="litres">litres</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Prix Unitaire (DA)</Label>
                <Input
                  type="number"
                  step="any"
                  value={pPricePerUnit}
                  onChange={(e) => setPPricePerUnit(e.target.value)}
                  placeholder="ex: 160"
                  className="mt-1 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Paiement Effectué / Avance (DA)</Label>
                <Input
                  type="number"
                  step="any"
                  value={pPaidAmount}
                  onChange={(e) => setPPaidAmount(e.target.value)}
                  placeholder="ex: 100000"
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>

            {pQuantity && pPricePerUnit && (
              <div className="rounded-xl bg-primary/5 p-3 flex justify-between items-center text-sm font-bold text-primary">
                <span>Coût Total :</span>
                <span>{formatMoney(parseFloat(pQuantity) * parseFloat(pPricePerUnit))}</span>
              </div>
            )}

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setAddPurchaseOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button type="submit" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                Enregistrer l'achat
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* NEW PROGRAM DIALOG */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau programme</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Type</Label>
              <select
                className="mt-1 w-full rounded-xl border bg-background px-2 py-1.5 text-sm outline-none"
                value={addKind}
                onChange={(e) =>
                  setAddKind(e.target.value as "irrigation" | "fertilisation")
                }
              >
                <option value="irrigation">Irrigation</option>
                <option value="fertilisation">Fertilisation</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Parcelle</Label>
              <select
                className="mt-1 w-full rounded-xl border bg-background px-2 py-1.5 text-sm outline-none"
                value={addParcel}
                onChange={(e) => setAddParcel(e.target.value)}
              >
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button onClick={confirmAdd} disabled={!addParcel} className="rounded-xl">
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT PURCHASE DIALOG */}
      <Dialog open={editingPurchase !== null} onOpenChange={(open) => !open && setEditingPurchase(null)}>
        <DialogContent className="rounded-2xl bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-wide flex items-center gap-1.5 text-emerald-600">
              <Pencil className="h-4 w-4" /> Modifier l'Achat Fournisseur
            </DialogTitle>
          </DialogHeader>
          {editingPurchase && (() => {
            return (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const supplierName = (form.elements.namedItem("supplierName") as HTMLInputElement).value.trim();
                  const purchaseDate = (form.elements.namedItem("purchaseDate") as HTMLInputElement).value;
                  const productName = (form.elements.namedItem("productName") as HTMLInputElement).value.trim();
                  const quantity = parseFloat((form.elements.namedItem("quantity") as HTMLInputElement).value) || 0;
                  const consumed = parseFloat((form.elements.namedItem("consumed") as HTMLInputElement).value) || 0;
                  const pricePerUnit = parseFloat((form.elements.namedItem("pricePerUnit") as HTMLInputElement).value) || 0;
                  const paidAmount = parseFloat((form.elements.namedItem("paidAmount") as HTMLInputElement).value) || 0;
                  const unit = (form.elements.namedItem("unit") as HTMLSelectElement).value as "kg" | "litres";

                  if (!supplierName) return toast.error("Nom du fournisseur requis");
                  if (!productName) return toast.error("Nom du produit requis");
                  if (quantity <= 0) return toast.error("Quantité achetée invalide");
                  if (pricePerUnit <= 0) return toast.error("Prix unitaire invalide");

                  const totalCost = quantity * pricePerUnit;

                  updatePurchase(editingPurchase.id, {
                    supplierName,
                    purchaseDate,
                    productName,
                    quantity,
                    consumed,
                    pricePerUnit,
                    totalCost,
                    paidAmount,
                    unit,
                  });

                  toast.success("Achat modifié avec succès !");
                  setEditingPurchase(null);
                }}
                className="space-y-3 text-xs"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Nom du Fournisseur</Label>
                    <Input
                      name="supplierName"
                      defaultValue={editingPurchase.supplierName}
                      className="mt-1 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Date d'achat</Label>
                    <Input
                      type="date"
                      name="purchaseDate"
                      defaultValue={editingPurchase.purchaseDate}
                      className="mt-1 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Nom du Produit</Label>
                  <Input
                    name="productName"
                    defaultValue={editingPurchase.productName}
                    className="mt-1 rounded-xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Quantité Achetée</Label>
                    <Input
                      type="number"
                      step="any"
                      name="quantity"
                      defaultValue={editingPurchase.quantity}
                      className="mt-1 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Unité</Label>
                    <select
                      name="unit"
                      defaultValue={editingPurchase.unit}
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
                    >
                      <option value="kg">kg</option>
                      <option value="litres">litres</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Prix Unitaire (DA)</Label>
                    <Input
                      type="number"
                      step="any"
                      name="pricePerUnit"
                      defaultValue={editingPurchase.pricePerUnit}
                      className="mt-1 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Quantité Consommée</Label>
                    <Input
                      type="number"
                      step="any"
                      name="consumed"
                      defaultValue={editingPurchase.consumed}
                      className="mt-1 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Montant Payé / Avance (DA)</Label>
                    <Input
                      type="number"
                      step="any"
                      name="paidAmount"
                      defaultValue={editingPurchase.paidAmount}
                      className="mt-1 rounded-xl"
                    />
                  </div>
                </div>

                <DialogFooter className="mt-4 gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingPurchase(null)} className="rounded-xl">
                    Annuler
                  </Button>
                  <Button type="submit" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                    Enregistrer les modifications
                  </Button>
                </DialogFooter>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      <RecommendationDetailDialog
        reco={selectedReco}
        onOpenChange={(open) => !open && setSelectedReco(null)}
      />
    </ListPageShell>
  );
}

export default ProgrammesPage;
