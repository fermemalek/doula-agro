import { useNavigate } from "@/lib/router-compat";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Sprout,
  FlaskConical,
  AlertTriangle,
  SprayCan,
  Droplet,
  Trash2,
  CheckCircle2,
  Copy,
  Calendar,
  CalendarDays,
  Search,
  RotateCcw,
  Filter,
} from "lucide-react";
import { useRecommendations, useRecommendationActions, type Recommendation } from "@/lib/cloud/recommendations";
import { useRole } from "@/lib/role";
import { useDisplayRole } from "@/lib/display-role";
import { useProfilesMap } from "@/lib/cloud/alerts";
import { RecommendationForm } from "@/components/ingenieur/RecommendationForm";
import { RecommendationDetailDialog } from "@/components/RecommendationDetailDialog";
import seededRecos from "@/data/seeded_recommendations.json";
import { toast } from "sonner";
import { useAllModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useSuppliers, useSupplierActions } from "@/lib/suppliers-store";
import { useParcels, useParcelActions } from "@/lib/parcel-store";
import { checkRecoStock, getTargetParcelsForReco } from "@/lib/stock-alerts";
import { validateRecommendationAndPurchases, resetAllAppliedRecoHistory } from "@/lib/reco-validation";

type PrescriptionType = "all" | "fert_irrigation" | "fert_foliaire" | "phytosanitaire";

function getPrescriptionType(r: Recommendation): "fert_irrigation" | "fert_foliaire" | "phytosanitaire" {
  if (r.kind === "phytosanitaire") return "phytosanitaire";
  const payload = (r.payload || {}) as any;
  if (payload.method === "pulverisation" || payload.program?.kind === "pulverisation") {
    return "fert_foliaire";
  }
  return "fert_irrigation";
}

function getRecoDate(r: Recommendation): string {
  const payload = (r.payload || {}) as any;
  if (payload.program?.date) return String(payload.program.date).slice(0, 10);
  if (payload.date) return String(payload.date).slice(0, 10);
  const match = (r.title || "").match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  if (r.created_at) return r.created_at.slice(0, 10);
  return "2026-03-09";
}

const PRESCRIPTION_CONFIG = {
  fert_irrigation: {
    label: "Fert. Irrigation",
    labelFull: "Fertilisation par Irrigation (Goutte-à-goutte)",
    colorName: "Vert",
    cardTone: "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-950/20",
    badgeTone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    iconTone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    activePill: "bg-emerald-600 text-white shadow-xs",
    inactivePill: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30",
    icon: Droplet,
  },
  fert_foliaire: {
    label: "Fert. Foliaire",
    labelFull: "Fertilisation Foliaire (Pulvérisation)",
    colorName: "Bleu",
    cardTone: "border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10 dark:bg-sky-950/20",
    badgeTone: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    iconTone: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    activePill: "bg-sky-600 text-white shadow-xs",
    inactivePill: "bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300 border border-sky-500/30",
    icon: SprayCan,
  },
  phytosanitaire: {
    label: "Phytosanitaire",
    labelFull: "Traitement Phytosanitaire",
    colorName: "Orange",
    cardTone: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/20",
    badgeTone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    iconTone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    activePill: "bg-amber-600 text-white shadow-xs",
    inactivePill: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30",
    icon: FlaskConical,
  },
};

const MONTHS_LIST = [
  { value: "all", label: "Tous les mois" },
  { value: "01", label: "01 - Janvier" },
  { value: "02", label: "02 - Février" },
  { value: "03", label: "03 - Mars" },
  { value: "04", label: "04 - Avril" },
  { value: "05", label: "05 - Mai" },
  { value: "06", label: "06 - Juin" },
  { value: "07", label: "07 - Juillet" },
  { value: "08", label: "08 - Août" },
  { value: "09", label: "09 - Septembre" },
  { value: "10", label: "10 - Octobre" },
  { value: "11", label: "11 - Novembre" },
  { value: "12", label: "12 - Décembre" },
];

const SPECIES_OPTIONS = [
  { value: "all", label: "Toutes les espèces", icon: "🌱" },
  { value: "pommiers", label: "Pommier Gala One", icon: "🍎" },
  { value: "nectarines", label: "Nectarine (Nablara & Redix)", icon: "🍑" },
  { value: "oliviers", label: "Oliviers (P1 à P4)", icon: "🫒" },
  { value: "casuarina", label: "Casuarina (Brise-vent)", icon: "🌲" },
];

function matchesSpecies(r: Recommendation, speciesValue: string, parcels: any[]): boolean {
  if (speciesValue === "all") return true;
  const payload = (r.payload || {}) as any;
  const cropGroups: string[] = Array.isArray(payload.crop_group)
    ? payload.crop_group
    : payload.crop_group
      ? [payload.crop_group]
      : [];
  const titleLower = (r.title || "").toLowerCase();

  if (speciesValue === "pommiers") {
    if (cropGroups.some((g) => g.toLowerCase().includes("pomm"))) return true;
    if (titleLower.includes("pomm") || titleLower.includes("تفاح")) return true;
    if (r.parcel_ids?.some((id) => id.includes("pommier"))) return true;
  }

  if (speciesValue === "nectarines") {
    if (
      cropGroups.some(
        (g) =>
          g.toLowerCase().includes("nectar") ||
          g.toLowerCase().includes("redix") ||
          g.toLowerCase().includes("nablara")
      )
    )
      return true;
    if (titleLower.includes("nablara") || titleLower.includes("redix") || titleLower.includes("nectar")) return true;
    if (r.parcel_ids?.some((id) => id.includes("redix") || id.includes("nablara"))) return true;
  }

  if (speciesValue === "oliviers") {
    if (cropGroups.some((g) => g.toLowerCase().includes("oliv"))) return true;
    if (titleLower.includes("oliv") || titleLower.includes("زيتون")) return true;
    if (r.parcel_ids?.some((id) => id.startsWith("p") && !id.includes("pommier"))) return true;
  }

  if (speciesValue === "casuarina") {
    if (cropGroups.some((g) => g.toLowerCase().includes("casuarina") || g.toLowerCase().includes("brise"))) return true;
    if (titleLower.includes("casuarina") || titleLower.includes("brise")) return true;
    if (r.parcel_ids?.some((id) => id.includes("brise"))) return true;
  }

  return false;
}

const STATUS_TONE: Record<Recommendation["status"], string> = {
  envoyee: "border-blue-500/30 bg-blue-500/5 text-blue-700",
  acceptee: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
  rejetee: "border-destructive/30 bg-destructive/5 text-destructive",
  transferee: "border-violet-500/30 bg-violet-500/5 text-violet-700",
};
const STATUS_LABEL: Record<Recommendation["status"], string> = {
  envoyee: "Envoyée",
  acceptee: "Acceptée",
  rejetee: "Rejetée",
  transferee: "Transférée",
};

import { ErrorBoundary } from "@/components/ErrorBoundary";

function RecommandationsPageContent() {
  const navigate = useNavigate();
  const { userId } = useRole();
  const displayRole = useDisplayRole();
  const { data: recos = [] } = useRecommendations();
  const { data: profiles = {} } = useProfilesMap();
  const suppliers = useSuppliers();
  const parcels = useParcels();
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Recommendation | null>(null);
  const [editingReco, setEditingReco] = useState<Recommendation | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const { create, remove, accept } = useRecommendationActions();
  const { addPurchase } = useSupplierActions();
  const { add: addModuleRecord } = useModuleActions();
  const { setStatus: setParcelStatus } = useParcelActions();
  const [seeding, setSeeding] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [resettingHistory, setResettingHistory] = useState(false);

  // Filtres de recherche demandés par l'utilisateur
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("all");
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const localIrr = useAllModuleRecords("irrigation");
  const localFert = useAllModuleRecords("fertilisation");
  const localPulv = useAllModuleRecords("pulverisation");
  const localPhy = useAllModuleRecords("phytosanitaire");

  const allPrograms = useMemo(() => {
    return [...localIrr, ...localFert, ...localPulv, ...localPhy];
  }, [localIrr, localFert, localPulv, localPhy]);

  const getRecoStatusInfo = (r: Recommendation) => {
    if (r.status === "acceptee") {
      const matchingProgs = allPrograms.filter(p => p.reco_id === r.id || p.payload?.reco_id === r.id);
      if (matchingProgs.length > 0) {
        const allExecuted = matchingProgs.every(p => p.status === "execute" || p.executedAt !== undefined || p.executed_at !== null);
        if (allExecuted) {
          return { label: "Exécuté", tone: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold" };
        }
        return { label: "Accepté (Planifié)", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold" };
      }
      return { label: "Accepté", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold" };
    }

    if (r.status === "rejetee") {
      if (displayRole === "admin") {
        return { label: "Approvisionnement", tone: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200 font-bold" };
      }
      return { label: "En attente", tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold" };
    }

    return { label: "En attente", tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold" };
  };

  async function handleDeleteAll() {
    if (!window.confirm("Voulez-vous vraiment supprimer TOUTES les recommandations ? Cette action est irréversible.")) return;
    setDeletingAll(true);
    try {
      toast.info("Suppression en cours...");
      const itemsToDelete = [...list];

      // Suppression séquentielle garantie
      for (const r of itemsToDelete) {
        await remove.mutateAsync(r.id);
      }

      toast.success("Toutes les recommandations ont été supprimées avec succès !");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression");
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleResetHistory() {
    if (!window.confirm("Voulez-vous réinitialiser TOUT l'historique d'application des recommandations ? Les programmes exécutés et achats automatiques seront effacés, et toutes les recommandations repasseront au statut 'Envoyée'.")) return;
    setResettingHistory(true);
    try {
      toast.info("Réinitialisation de l'historique d'application en cours...");
      await resetAllAppliedRecoHistory(recos);
      toast.success("Historique des applications réinitialisé avec succès !");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la réinitialisation");
    } finally {
      setResettingHistory(false);
    }
  }

  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    try {
      toast.info(`Importation des ${seededRecos.length} programmes en cours...`);
      for (const reco of seededRecos) {
        const progDate = reco.payload?.program?.date;
        const timePart = new Date().toTimeString().split(" ")[0];
        const createdAtIso = progDate
          ? new Date(`${progDate}T${timePart}`).toISOString()
          : new Date().toISOString();

        await create.mutateAsync({
          kind: reco.kind as any,
          title: reco.title,
          comment: reco.comment,
          parcel_ids: reco.parcel_ids,
          payload: reco.payload as any,
          photo_urls: reco.photo_urls,
          created_at: createdAtIso,
        });
      }
      toast.success(`Les ${seededRecos.length} programmes ont été importés avec succès !`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'importation");
    } finally {
      setSeeding(false);
    }
  }

  // Ingénieur ne voit que ses propres recos ; admin voit tout
  const list = useMemo(() => {
    if (displayRole === "ingenieur") {
      return recos.filter((r) => r.created_by === userId);
    }
    return recos;
  }, [recos, displayRole, userId]);

  // Extraire les années disponibles
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    list.forEach((r) => {
      const d = getRecoDate(r);
      if (d && d.length >= 4) {
        years.add(d.slice(0, 4));
      }
    });
    if (years.size === 0) years.add("2026");
    return Array.from(years).sort().reverse();
  }, [list]);

  // Compteurs par type de prescription
  const countsByPrescription = useMemo(() => {
    let fertIrr = 0;
    let fertFol = 0;
    let phyto = 0;

    list.forEach((r) => {
      const t = getPrescriptionType(r);
      if (t === "fert_irrigation") fertIrr++;
      else if (t === "fert_foliaire") fertFol++;
      else if (t === "phytosanitaire") phyto++;
    });

    return {
      all: list.length,
      fert_irrigation: fertIrr,
      fert_foliaire: fertFol,
      phytosanitaire: phyto,
    };
  }, [list]);

  // Filtrage combiné : Année, Mois, Espèce, Type de prescription, Recherche textuelle
  const filteredList = useMemo(() => {
    return list.filter((r) => {
      // 1. Prescription
      const presType = getPrescriptionType(r);
      if (selectedPrescription !== "all" && presType !== selectedPrescription) {
        return false;
      }

      // 2. Année & Mois
      const rDate = getRecoDate(r);
      const rYear = rDate.slice(0, 4);
      const rMonth = rDate.slice(5, 7);

      if (selectedYear !== "all" && rYear !== selectedYear) {
        return false;
      }
      if (selectedMonth !== "all" && rMonth !== selectedMonth) {
        return false;
      }

      // 3. Espèce
      if (selectedSpecies !== "all" && !matchesSpecies(r, selectedSpecies, parcels)) {
        return false;
      }

      // 4. Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (r.title || "").toLowerCase().includes(q);
        const commentMatch = (r.comment || "").toLowerCase().includes(q);
        const payloadStr = JSON.stringify(r.payload || {}).toLowerCase();
        const productMatch = payloadStr.includes(q);
        if (!titleMatch && !commentMatch && !productMatch) {
          return false;
        }
      }

      return true;
    });
  }, [list, selectedPrescription, selectedYear, selectedMonth, selectedSpecies, searchQuery, parcels]);

  const isFiltered =
    selectedYear !== "all" ||
    selectedMonth !== "all" ||
    selectedSpecies !== "all" ||
    selectedPrescription !== "all" ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedYear("all");
    setSelectedMonth("all");
    setSelectedSpecies("all");
    setSelectedPrescription("all");
    setSearchQuery("");
  };

  const pendingCount = list.filter((r) => r.status === "envoyee" || r.status === "rejetee").length;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-4">
      <button
        onClick={() => navigate({ to: "/" })}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Recommandations ingénieur</h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount} en attente · {list.length} au total
          </p>
        </div>
        <div className="flex gap-2">
          {(displayRole === "ingenieur" || displayRole === "admin") && (
            <>
              {list.length === 0 && (
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-primary/10 hover:bg-primary/20 px-3 text-sm font-bold text-primary active:scale-95 transition-all"
                >
                  {seeding ? "Importation..." : "Importer Excel"}
                </button>
              )}
              {list.length > 0 && (
                <>
                  <button
                    onClick={handleResetHistory}
                    disabled={resettingHistory}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 px-3 text-sm font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30 active:scale-95 transition-all"
                    title="Effacer les exécutions et remettre toutes les recommandations à l'état initial pour recommencer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {resettingHistory ? "Réinitialisation..." : "Réinitialiser applications"}
                  </button>

                  <button
                    onClick={handleDeleteAll}
                    disabled={deletingAll}
                    className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-destructive/10 hover:bg-destructive/20 px-3 text-sm font-bold text-destructive active:scale-95 transition-all"
                  >
                    {deletingAll ? "Suppression..." : "Supprimer tout"}
                  </button>
                </>
              )}
            </>
          )}
          {displayRole === "ingenieur" && (
            <button
              onClick={() => {
                setEditingReco(null);
                setIsDuplicate(false);
                setFormOpen(true);
              }}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-primary hover:bg-primary/90 px-3 text-sm font-bold text-primary-foreground shadow-xs active:scale-95 transition"
            >
              <Plus className="h-4 w-4" /> Nouvelle
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* BARRE DE FILTRES : ANNÉE, MOIS, ESPÈCE, TYPE PRESCRIPTION */}
      {/* ========================================================= */}
      <div className="mb-4 rounded-2xl border bg-card/60 backdrop-blur-xs p-3 shadow-xs space-y-3">
        {/* Ligne 1 : Boutons/Pills de sélection rapide par Type de Prescription */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3 text-primary" />
            <span>Prescription :</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedPrescription("all")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${selectedPrescription === "all"
                ? "bg-foreground text-background shadow-xs font-black"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            <span>Toutes</span>
            <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-black">
              {countsByPrescription.all}
            </span>
          </button>

          {/* Fert. Irrigation - COULEUR VERT */}
          <button
            type="button"
            onClick={() => setSelectedPrescription("fert_irrigation")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${selectedPrescription === "fert_irrigation"
                ? PRESCRIPTION_CONFIG.fert_irrigation.activePill
                : PRESCRIPTION_CONFIG.fert_irrigation.inactivePill
              }`}
          >
            <Droplet className="h-3.5 w-3.5" />
            <span>Fert. Irrigation</span>
            <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-black">
              {countsByPrescription.fert_irrigation}
            </span>
          </button>

          {/* Fert. Foliaire - COULEUR BLEU */}
          <button
            type="button"
            onClick={() => setSelectedPrescription("fert_foliaire")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${selectedPrescription === "fert_foliaire"
                ? PRESCRIPTION_CONFIG.fert_foliaire.activePill
                : PRESCRIPTION_CONFIG.fert_foliaire.inactivePill
              }`}
          >
            <SprayCan className="h-3.5 w-3.5" />
            <span>Fert. Foliaire</span>
            <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-black">
              {countsByPrescription.fert_foliaire}
            </span>
          </button>

          {/* Phytosanitaire - COULEUR ORANGE */}
          <button
            type="button"
            onClick={() => setSelectedPrescription("phytosanitaire")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${selectedPrescription === "phytosanitaire"
                ? PRESCRIPTION_CONFIG.phytosanitaire.activePill
                : PRESCRIPTION_CONFIG.phytosanitaire.inactivePill
              }`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Phytosanitaire</span>
            <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-black">
              {countsByPrescription.phytosanitaire}
            </span>
          </button>
        </div>

        {/* Ligne 2 : Sélecteurs Année, Mois, Espèce + Barre de Recherche */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
          {/* Année */}
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" />
              <span>Année</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              <option value="all">Toutes les années</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Mois */}
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-primary" />
              <span>Mois</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Espèce */}
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Sprout className="h-3 w-3 text-primary" />
              <span>Espèce</span>
            </label>
            <select
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              {SPECIES_OPTIONS.map((sp) => (
                <option key={sp.value} value={sp.value}>
                  {sp.icon} {sp.label}
                </option>
              ))}
            </select>
          </div>

          {/* Recherche textuelle */}
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Search className="h-3 w-3 text-primary" />
              <span>Recherche</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Titre, produit..."
                className="w-full rounded-xl border border-input bg-background pl-7 pr-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Ligne 3 : Compteur filtré & Bouton Réinitialiser */}
        {isFiltered && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 text-muted-foreground">
            <span>
              Résultats : <strong className="text-foreground">{filteredList.length}</strong> affichée{filteredList.length > 1 ? "s" : ""} sur {list.length} au total
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:underline transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Réinitialiser les filtres</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* LISTE DES RECOMMANDATIONS AVEC COULEURS DE PRESCRIPTION */}
      {/* ========================================================= */}
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {displayRole === "ingenieur"
            ? "Aucune recommandation envoyée. Cliquez sur « Nouvelle » pour commencer."
            : "Aucune recommandation reçue."}
        </p>
      ) : filteredList.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">
            Aucune recommandation ne correspond aux filtres sélectionnés.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-bold transition active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Effacer les filtres</span>
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filteredList.map((r) => {
            const presType = getPrescriptionType(r);
            const config = PRESCRIPTION_CONFIG[presType];
            const Icon = config.icon;
            const author = profiles[r.created_by] || "Ingénieur";
            const statusInfo = getRecoStatusInfo(r);
            const isPending = r.status === "envoyee" || r.status === "rejetee";
            const stockReport = isPending ? checkRecoStock(r, suppliers, parcels) : { hasMissingStock: false };
            const targetParcels = getTargetParcelsForReco(r, parcels);
            const rDate = getRecoDate(r);

            return (
              <li
                key={r.id}
                onClick={() => {
                  if (displayRole === "ingenieur") {
                    setEditingReco(r);
                    setIsDuplicate(false);
                    setFormOpen(true);
                  } else {
                    setDetail(r);
                  }
                }}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 shadow-xs transition active:scale-[0.99] hover:shadow-md ${config.cardTone}`}
              >
                {/* Icône Prescription avec la couleur attribuée (Vert, Bleu, Orange) */}
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconTone}`}>
                  <Icon className="h-5 w-5" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {/* Badge de Type de Prescription coloré */}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${config.badgeTone}`}>
                      <Icon className="h-2.5 w-2.5" />
                      <span>{config.label}</span>
                    </span>

                    {stockReport.hasMissingStock && (
                      <span className="shrink-0 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 text-[9px] font-black flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" /> Achat requis
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-foreground leading-snug text-sm">{r.title}</p>

                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    <span className="font-semibold text-foreground/80">{config.label}</span>
                    {" · "}
                    {targetParcels.length} parcelle{targetParcels.length > 1 ? "s" : ""}
                    {displayRole !== "ingenieur" && ` · par ${author}`}
                  </p>

                  <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground/70" />
                    <span>Date : <strong className="text-foreground/90">{rDate}</strong></span>
                    {r.created_at && (
                      <span className="opacity-70 ml-1">
                        (Saisie : {new Date(r.created_at).toLocaleString("fr-FR")})
                      </span>
                    )}
                  </p>
                </div>

                {/* Colonne latérale droite : Statut et Actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${statusInfo.tone}`}>
                    {statusInfo.label}
                  </span>

                  <div className="flex items-center gap-1">
                    {isPending && (displayRole === "ingenieur" || displayRole === "admin") && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (
                            !window.confirm(
                              `Valider la recommandation "${r.title}" et enregistrer automatiquement les achats pour les produits requis ?`
                            )
                          )
                            return;
                          try {
                            const res = await validateRecommendationAndPurchases({
                              reco: r,
                              parcels,
                              suppliers,
                              addPurchase,
                              acceptReco: async (id) => accept.mutateAsync(id),
                              addModuleRecord,
                              setParcelStatus,
                              options: {
                                supplierName: "Achat Validé (Historique Ingénieur)",
                                markAsExecutedIfPast: true,
                              },
                            });
                            toast.success(
                              `Recommandation et achats validés avec succès ! (${res.clonedCount} parcelles affectées${res.createdPurchasesCount > 0 ? `, ${res.createdPurchasesCount} achats créés` : ""
                              }).`
                            );
                          } catch (err: any) {
                            toast.error(err?.message || "Erreur lors de la validation");
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[10px] font-bold shadow-xs active:scale-95 transition"
                        title="Valider la recommandation et ses achats"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Valider Reco & Achats</span>
                      </button>
                    )}

                    {(displayRole === "ingenieur" || displayRole === "admin") && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingReco(r);
                          setIsDuplicate(true);
                          setFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-1 text-[10px] font-bold shadow-xs active:scale-95 transition"
                        title="Dupliquer cette recommandation pour une nouvelle date"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Dupliquer</span>
                      </button>
                    )}

                    {(displayRole === "ingenieur" || displayRole === "admin") && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`Supprimer définitivement la recommandation "${r.title}" ?`)) return;
                          try {
                            await remove.mutateAsync(r.id);
                            toast.success("Recommandation supprimée avec succès !");
                          } catch {
                            toast.error("Erreur lors de la suppression");
                          }
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-90 transition"
                        title="Supprimer cette recommandation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <RecommendationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        recoToEdit={editingReco}
        isDuplicate={isDuplicate}
      />
      <RecommendationDetailDialog
        reco={detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onDuplicate={(r) => {
          setEditingReco(r);
          setIsDuplicate(true);
          setFormOpen(true);
        }}
      />
    </main>
  );
}

export default function RecommandationsPage() {
  return (
    <ErrorBoundary fallbackTitle="Erreur dans le module Recommandations">
      <RecommandationsPageContent />
    </ErrorBoundary>
  );
}
