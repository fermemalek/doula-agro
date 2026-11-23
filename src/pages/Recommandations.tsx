import { useNavigate, useLocation } from "@/lib/router-compat";
import { useEffect, useMemo, useState } from "react";
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
  CheckSquare,
  Copy,
  Calendar,
  CalendarDays,
  Search,
  RotateCcw,
  RefreshCw,
  Filter,
  Lock,
  PackageCheck,
} from "lucide-react";
import { useRecommendations, useRecommendationActions, type Recommendation } from "@/lib/cloud/recommendations";
import { useRole } from "@/lib/role";
import { useDisplayRole } from "@/lib/display-role";
import { useProfilesMap } from "@/lib/cloud/alerts";
import { RecommendationForm } from "@/components/ingenieur/RecommendationForm";
import { RecommendationDetailDialog } from "@/components/RecommendationDetailDialog";
import seededRecos from "@/data/seeded_recommendations.json";
import { toast } from "sonner";
import { useAllModuleRecords, useModuleActions, removeModuleRecordsByRecoId, fetchCloudModules } from "@/lib/modules-store";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSuppliers, useSupplierActions } from "@/lib/suppliers-store";
import { useParcels, useParcelActions } from "@/lib/parcel-store";
import { checkRecoStock, getTargetParcelsForReco } from "@/lib/stock-alerts";
import {
  validateRecommendationAndPurchases,
  resetAllAppliedRecoHistory,
  syncPurchasesForAcceptedRecos,
  getHydraulicPhaseForDate,
  checkTankRinseRequirement,
  type TankRinseAlert,
} from "@/lib/reco-validation";
import { ValidateOrderScheduleDialog, type OrderScheduleConfirmation, type OrderStockSummary, type OrderBacDetail } from "@/components/ValidateOrderScheduleDialog";
import { getSolarTimesForDate, formatMinutesToTimeInput } from "@/lib/astronomy";
import { formatDateFR, formatDateTimeFR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";

type PrescriptionType = "all" | "fert_irrigation" | "fert_foliaire" | "phytosanitaire";

function getPrescriptionType(r: Recommendation): "fert_irrigation" | "fert_foliaire" | "phytosanitaire" {
  if (r.kind === "phytosanitaire") return "phytosanitaire";
  const payload = (r.payload || {}) as any;
  if (payload.method === "pulverisation" || payload.program?.kind === "pulverisation") {
    return "fert_foliaire";
  }
  return "fert_irrigation";
}

function getFertigationBacs(r: Recommendation): OrderBacDetail[] {
  if (getPrescriptionType(r) !== "fert_irrigation") return [];
  const entries = (r.payload as any)?.program?.entries;
  if (!Array.isArray(entries)) return [];
  const bacMap = new Map<string, Set<string>>();
  for (const entry of entries) {
    const bac = String(entry?.bac || "").trim().toUpperCase();
    const items = Array.isArray(entry?.items) ? entry.items : [];
    if (!bac || items.length === 0) continue;
    if (!bacMap.has(bac)) bacMap.set(bac, new Set());
    for (const it of items) {
      const cleanName = String(it?.name || "").split("/")[0].trim();
      if (cleanName) bacMap.get(bac)!.add(cleanName);
    }
  }
  const order = ["A", "B", "C", "D"];
  return Array.from(bacMap.entries())
    .sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a[0].localeCompare(b[0]);
    })
    .map(([bac, set]) => ({ bac, products: Array.from(set) }));
}

function getBacBadgeTone(bac: string): string {
  if (bac === "A") return "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (bac === "B") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (bac === "C") return "border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300";
  return "border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300";
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
    labelAr: "تسميد عبر الري",
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
    labelAr: "تسميد ورقي",
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
    labelAr: "صحة نباتية",
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
  { value: "all", label: "Tous les mois", labelAr: "كل الأشهر" },
  { value: "01", label: "01 - Janvier", labelAr: "01 - جانفي" },
  { value: "02", label: "02 - Février", labelAr: "02 - فيفري" },
  { value: "03", label: "03 - Mars", labelAr: "03 - مارس" },
  { value: "04", label: "04 - Avril", labelAr: "04 - أفريل" },
  { value: "05", label: "05 - Mai", labelAr: "05 - ماي" },
  { value: "06", label: "06 - Juin", labelAr: "06 - جوان" },
  { value: "07", label: "07 - Juillet", labelAr: "07 - جويلية" },
  { value: "08", label: "08 - Août", labelAr: "08 - أوت" },
  { value: "09", label: "09 - Septembre", labelAr: "09 - سبتمبر" },
  { value: "10", label: "10 - Octobre", labelAr: "10 - أكتوبر" },
  { value: "11", label: "11 - Novembre", labelAr: "11 - نوفمبر" },
  { value: "12", label: "12 - Décembre", labelAr: "12 - ديسمبر" },
];

const SPECIES_OPTIONS = [
  { value: "all", label: "Toutes les espèces", labelAr: "كل الأصناف", icon: "🌱" },
  { value: "pommiers", label: "Pommier Gala One", labelAr: "التفاح (Gala One)", icon: "🍎" },
  { value: "nectarines", label: "Nectarine (Nablara & Redix)", labelAr: "النكتارين (نابلارا وريديكس)", icon: "🍑" },
  { value: "oliviers", label: "Oliviers (P1 à P4)", labelAr: "الزيتون (P1 إلى P4)", icon: "🫒" },
  { value: "casuarina", label: "Casuarina (Brise-vent)", labelAr: "كازوارينا (مصدات الرياح)", icon: "🌲" },
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
  const location = useLocation();
  const { lang } = useTranslation();
  const isAr = lang === "ar";
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
  const { create, update, remove, accept } = useRecommendationActions();
  const { addPurchase } = useSupplierActions();
  const { add: addModuleRecord } = useModuleActions();
  const { setStatus: setParcelStatus } = useParcelActions();
  const [seeding, setSeeding] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [resettingHistory, setResettingHistory] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteLinkedParcelPhyto, setDeleteLinkedParcelPhyto] = useState(true);
  const queryClient = useQueryClient();
  const [isBatchValidating, setIsBatchValidating] = useState(false);

  // Fenêtre systématique de confirmation de l'heure de début + temps d'irrigation (avec et sans fertilisation)
  const [scheduleConfirmState, setScheduleConfirmState] = useState<{
    open: boolean;
    recosToRun: Recommendation[];
    mode: "execute" | "plan";
    title: string;
    subtitle: string;
    operationLabel: string;
    defaultStartHour: string;
    defaultFertIrrigationTime: string;
    defaultPureIrrigationTime: string;
    sunriseStr: string;
    sunsetStr: string;
    solarDateLabel: string;
    stockSummary: OrderStockSummary;
    bacDetails: OrderBacDetail[];
    tankRinseAlert: TankRinseAlert | null;
  } | null>(null);

  const openScheduleConfirm = (
    recosToRun: Recommendation[],
    mode: "execute" | "plan",
    title: string,
    subtitle: string
  ) => {
    const first = recosToRun[0];
    const firstDate = first ? getRecoDate(first) : "2026-03-09";
    // Démarrage à J+1 pour le calcul exact du lever/coucher du soleil à Benhar
    const startSolarDate = (() => {
      const [y, m, d] = firstDate.split("-").map(Number);
      const dt = new Date(y, (m || 1) - 1, (d || 1) + 1);
      if (isNaN(dt.getTime())) return firstDate;
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    })();
    const solar = getSolarTimesForDate(startSolarDate);
    const phase = getHydraulicPhaseForDate(firstDate);
    const pType = first ? getPrescriptionType(first) : "fert_irrigation";
    const prog = (first?.payload as any)?.program || {};

    // Par défaut :
    // - Fertigation & Pulvérisation foliaire => Heure du lever du soleil (Benhar)
    // - Traitement phytosanitaire => Heure du coucher du soleil - 2 heures (Benhar)
    let defaultStartHour = solar.sunriseStr.replace("h", ":");
    if (pType === "phytosanitaire") {
      defaultStartHour = formatMinutesToTimeInput(solar.sunsetMinutes - 120);
    }

    const defaultFertIrrigationTime =
      prog.irrigationTime || (phase.phase >= 2 ? "1h00" : "1h30");
    const defaultPureIrrigationTime =
      prog.pureIrrigationTime ||
      (phase.phase === 2 ? "1h30" : phase.phase === 3 ? "2h30" : "0h");

    const opTypes = Array.from(
      new Set(
        recosToRun.map((r) => {
          const t = getPrescriptionType(r);
          return t === "fert_irrigation"
            ? "Fertilisation (Irrigation)"
            : t === "fert_foliaire"
              ? "Pulvérisation Foliaire"
              : "Traitement Phytosanitaire";
        })
      )
    ).join(" · ");

    const missingSet = new Set<string>();
    const lowSet = new Set<string>();
    const equivSet = new Set<string>();
    let tankRinseAlert: TankRinseAlert | null = null;
    for (const r of recosToRun) {
      const report = checkRecoStock(r, suppliers, parcels);
      report.missingItems.forEach((it) => {
        missingSet.add(`${it.name} (manque ${Math.round(it.missing * 100) / 100} ${it.unit})`);
      });
      report.lowStockItems.forEach((it) => {
        const rem = Math.max(0, Math.round((it.available - it.needed) * 100) / 100);
        lowSet.add(`${it.name} (reste ${rem} ${it.unit})`);
      });
      report.equivalentItems.forEach((it) => {
        if (it.equivalentInStock) {
          equivSet.add(`🔄 Équivalent en stock pour ${it.name} : ${it.equivalentInStock.productName} (${it.equivalentInStock.available} ${it.equivalentInStock.unit} — vérifier concentration)`);
        }
      });
      const rinse = checkTankRinseRequirement(r);
      if (rinse && (!tankRinseAlert || rinse.level === "herbicide")) {
        tankRinseAlert = rinse;
      }
    }
    const missingLabels = Array.from(missingSet);
    const lowLabels = Array.from(lowSet);
    const equivalentLabels = Array.from(equivSet);
    const stockSummary: OrderStockSummary = {
      status:
        missingLabels.length > 0
          ? "missing"
          : equivalentLabels.length > 0
            ? "equivalent"
            : lowLabels.length > 0
              ? "low"
              : "available",
      missingLabels,
      lowLabels,
      equivalentLabels,
    };

    const bacAggMap = new Map<string, Set<string>>();
    for (const r of recosToRun) {
      for (const b of getFertigationBacs(r)) {
        if (!bacAggMap.has(b.bac)) bacAggMap.set(b.bac, new Set());
        b.products.forEach((p) => bacAggMap.get(b.bac)!.add(p));
      }
    }
    const bacOrder = ["A", "B", "C", "D"];
    const bacDetails: OrderBacDetail[] = Array.from(bacAggMap.entries())
      .sort((a, b) => {
        const ia = bacOrder.indexOf(a[0]);
        const ib = bacOrder.indexOf(b[0]);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a[0].localeCompare(b[0]);
      })
      .map(([bac, set]) => ({ bac, products: Array.from(set) }));

    setScheduleConfirmState({
      open: true,
      recosToRun,
      mode,
      title,
      subtitle,
      operationLabel: opTypes || "Ordonnance",
      defaultStartHour,
      defaultFertIrrigationTime,
      defaultPureIrrigationTime,
      sunriseStr: solar.sunriseStr,
      sunsetStr: solar.sunsetStr,
      solarDateLabel: startSolarDate,
      stockSummary,
      bacDetails,
      tankRinseAlert,
    });
  };

  const executeConfirmedValidation = async (values: OrderScheduleConfirmation) => {
    if (!scheduleConfirmState) return;
    const { recosToRun, mode } = scheduleConfirmState;
    setIsBatchValidating(true);
    let successCount = 0;
    let totalTasks = 0;
    let totalPurchases = 0;
    const errors: string[] = [];

    try {
      for (const r of recosToRun) {
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
              markAsExecutedIfPast: mode === "execute",
              customStartHour: values.customStartHour,
              customFertIrrigationTime: values.customFertIrrigationTime,
              customPureIrrigationTime: values.customPureIrrigationTime,
            },
          });
          successCount++;
          totalTasks += res.clonedCount;
          totalPurchases += res.createdPurchasesCount;
        } catch (err: any) {
          errors.push(`${r.title}: ${err?.message || "Erreur"}`);
        }
      }

      if (successCount > 0) {
        toast.success(
          `${successCount} recommandation(s) ${mode === "execute" ? "validée(s) & exécutée(s)" : "planifiée(s)"} (début ${values.customStartHour} · fert. ${values.customFertIrrigationTime} · eau claire ${values.customPureIrrigationTime}) — ${totalTasks} tâche(s)${totalPurchases > 0 ? `, ${totalPurchases} achat(s) complémentaire(s)` : ", stock Agrimax suffisant"}.`
        );
        setSelectedRecoIds(new Set());
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} erreur(s) :\n${errors.join("\n")}`);
      }
      setScheduleConfirmState(null);
    } finally {
      setIsBatchValidating(false);
    }
  };

  // Filtres de recherche demandés par l'utilisateur
  const parseStatusFromSearch = (search: string): "all" | "pending" | "accepted" => {
    const raw = new URLSearchParams(search).get("status");
    if (raw === "pending") return "pending";
    if (raw === "accepted") return "accepted";
    return "all";
  };

  const [selectedStatus, setSelectedStatus] = useState<"all" | "pending" | "accepted">(() =>
    parseStatusFromSearch(location.search)
  );
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("all");
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const next = parseStatusFromSearch(location.search);
    setSelectedStatus(next);
  }, [location.search]);

  const handleStatusChange = (status: "all" | "pending" | "accepted") => {
    setSelectedStatus(status);
    navigate({
      to: status === "all" ? "/recommandations" : `/recommandations?status=${status}`,
      replace: true,
    });
  };

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
          return {
            label: isAr ? "منفّذة" : "Exécuté",
            tone: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold",
          };
        }
        return {
          label: isAr ? "مقبولة (مخططة)" : "Accepté (Planifié)",
          tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold",
        };
      }
      return {
        label: isAr ? "مقبولة" : "Accepté",
        tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold",
      };
    }

    if (r.status === "rejetee") {
      if (displayRole === "admin") {
        return {
          label: isAr ? "قيد التموين" : "Approvisionnement",
          tone: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200 font-bold",
        };
      }
      return {
        label: isAr ? "قيد الانتظار" : "En attente",
        tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold",
      };
    }

    return {
      label: isAr ? "قيد الانتظار" : "En attente",
      tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold",
    };
  };

  function handleDeleteAll() {
    setDeleteLinkedParcelPhyto(true);
    setDeleteAllDialogOpen(true);
  }

  async function confirmDeleteAll() {
    setDeleteAllDialogOpen(false);
    setDeletingAll(true);
    try {
      toast.info(isAr ? "جارٍ الحذف..." : "Suppression en cours...");
      const itemsToDelete = [...list];
      const deletedIds = new Set<string>();

      // 1. Suppression séquentielle des recommandations
      for (const r of itemsToDelete) {
        await remove.mutateAsync(r.id);
        deletedIds.add(r.id);
      }

      // 2. Si la case est cochée : supprimer aussi les traitements exécutés liés dans l'historique des parcelles
      if (deleteLinkedParcelPhyto) {
        for (const r of itemsToDelete) {
          removeModuleRecordsByRecoId(r.id);
        }

        // Nettoyage complémentaire dans doula-modules localStorage + Supabase module_records (phytosanitaire liés)
        const phytoItems = itemsToDelete.filter((r) => r.kind === "phytosanitaire");
        try {
          const rawMod = localStorage.getItem("doula-modules");
          if (rawMod) {
            const parsed = JSON.parse(rawMod);
            let changed = false;
            for (const pid of Object.keys(parsed)) {
              const arr = parsed[pid]?.phytosanitaire;
              if (Array.isArray(arr)) {
                const filtered = arr.filter((rec: any) => {
                  if (rec.reco_id && deletedIds.has(rec.reco_id)) return false;
                  if (rec.payload?.reco_id && deletedIds.has(rec.payload.reco_id)) return false;
                  if (phytoItems.length > 0 && rec.reco_id) return false;
                  return true;
                });
                if (filtered.length !== arr.length) {
                  parsed[pid].phytosanitaire = filtered;
                  changed = true;
                }
              }
            }
            if (changed) {
              localStorage.setItem("doula-modules", JSON.stringify(parsed));
            }
          }
        } catch {}

        // Supprimer aussi dans Supabase module_records les lignes phytosanitaires créées via recommandations
        if (phytoItems.length > 0) {
          try {
            const { data: cloudPhyto } = await supabase
              .from("module_records")
              .select("id, payload")
              .eq("kind", "phytosanitaire");
            if (Array.isArray(cloudPhyto)) {
              const cloudIdsToDelete = cloudPhyto
                .filter((row: any) => {
                  const rid = row?.payload?.reco_id;
                  return rid && deletedIds.has(rid);
                })
                .map((row: any) => row.id);
              if (cloudIdsToDelete.length > 0) {
                await supabase.from("module_records").delete().in("id", cloudIdsToDelete);
              }
            }
          } catch {}
        }

        await fetchCloudModules();
      }

      // 3. Invalider tous les caches de calcul IRAC/FRAC & historique
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["phyto-executions"] }),
        queryClient.invalidateQueries({ queryKey: ["executions"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      window.dispatchEvent(new Event("doula:farm-reset"));

      toast.success(
        deleteLinkedParcelPhyto
          ? isAr
            ? "تم حذف جميع التوصيات والمعاملات المرتبطة في أرشيف القطع وإعادة حساب الحصص!"
            : "Toutes les recommandations et les traitements liés dans l'historique des parcelles ont été supprimés !"
          : isAr
            ? "تم حذف جميع التوصيات بنجاح!"
            : "Toutes les recommandations ont été supprimées avec succès !",
      );
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

  // Recommandations du 09 Mars 2026 en attente
  const pendingMarchRecos = useMemo(() => {
    return list.filter((r) => {
      const isPending = r.status === "envoyee" || r.status === "rejetee";
      if (!isPending) return false;
      const d = getRecoDate(r);
      return d === "2026-03-09" || (r.title && r.title.includes("2026-03-09"));
    });
  }, [list]);

  // Compteurs par statut
  const countsByStatus = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    list.forEach((r) => {
      if (r.status === "acceptee" || r.status === "transferee") accepted++;
      else pending++;
    });
    return { all: list.length, pending, accepted };
  }, [list]);

  // Filtrage combiné : Statut, Année, Mois, Espèce, Type de prescription, Recherche textuelle
  const filteredList = useMemo(() => {
    return list.filter((r) => {
      // 0. Statut
      if (selectedStatus === "pending") {
        if (r.status === "acceptee" || r.status === "transferee") return false;
      } else if (selectedStatus === "accepted") {
        if (r.status !== "acceptee" && r.status !== "transferee") return false;
      }

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
  }, [list, selectedStatus, selectedPrescription, selectedYear, selectedMonth, selectedSpecies, searchQuery, parcels]);

  const isFiltered =
    selectedStatus !== "all" ||
    selectedYear !== "all" ||
    selectedMonth !== "all" ||
    selectedSpecies !== "all" ||
    selectedPrescription !== "all" ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    handleStatusChange("all");
    setSelectedYear("all");
    setSelectedMonth("all");
    setSelectedSpecies("all");
    setSelectedPrescription("all");
    setSearchQuery("");
  };

  const pendingCount = list.filter((r) => r.status === "envoyee" || r.status === "rejetee").length;

  // Sélection multiple pour validation groupée
  const [selectedRecoIds, setSelectedRecoIds] = useState<Set<string>>(new Set());
  const [isValidatingBatch, setIsValidatingBatch] = useState(false);

  const toggleSelectReco = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRecoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingInFiltered = useMemo(() => {
    return filteredList.filter((r) => r.status === "envoyee" || r.status === "rejetee");
  }, [filteredList]);

  const allPendingSelected =
    pendingInFiltered.length > 0 &&
    pendingInFiltered.every((r) => selectedRecoIds.has(r.id));

  const handleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedRecoIds(new Set());
    } else {
      const next = new Set(selectedRecoIds);
      pendingInFiltered.forEach((r) => next.add(r.id));
      setSelectedRecoIds(next);
    }
  };

  const handleBatchValidate = async () => {
    const toValidate = list.filter((r) => selectedRecoIds.has(r.id));
    if (toValidate.length === 0) {
      return toast.info("Aucune recommandation sélectionnée.");
    }

    const count = toValidate.length;
    openScheduleConfirm(
      toValidate,
      "plan",
      `Valider la sélection (${count} reco${count > 1 ? "s" : ""})`,
      "Confirmez l'heure de commencement du planning et les temps d'irrigation (avec et sans fertilisation)."
    );
  };

  return (
    <main className="mx-auto w-full max-w-4xl overflow-x-hidden px-3 sm:px-4 pb-24 pt-4" dir={isAr ? "rtl" : "ltr"}>
      <button
        onClick={() => navigate({ to: "/" })}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {isAr ? "رجوع" : "Retour"}
      </button>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 w-full min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl font-bold break-words">
            {isAr ? "توصيات المهندس" : "Recommandations ingénieur"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? `${pendingCount} قيد الانتظار · ${list.length} إجمالاً`
              : `${pendingCount} en attente · ${list.length} au total`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">
          {(displayRole === "ingenieur" || displayRole === "admin") && (
            <>
              {list.length === 0 && (
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="inline-flex h-9 sm:h-10 items-center gap-1 rounded-xl bg-primary/10 hover:bg-primary/20 px-3 text-xs sm:text-sm font-bold text-primary active:scale-95 transition-all"
                >
                  {seeding
                    ? isAr ? "جارٍ الاستيراد..." : "Importation..."
                    : isAr ? "استيراد Excel" : "Importer Excel"}
                </button>
              )}
              {list.length > 0 && (
                <>
                  <button
                    onClick={handleResetHistory}
                    disabled={resettingHistory}
                    className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 px-2.5 sm:px-3 text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30 active:scale-95 transition-all"
                    title={
                      isAr
                        ? "مسح التنفيذات وإعادة جميع التوصيات إلى حالتها الأولية"
                        : "Effacer les exécutions et remettre toutes les recommandations à l'état initial pour recommencer"
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span>
                      {resettingHistory
                        ? isAr ? "جارٍ إعادة التعيين..." : "Réinitialisation..."
                        : isAr ? "إعادة تعيين التطبيقات" : "Réinitialiser applications"}
                    </span>
                  </button>

                  <button
                    onClick={handleDeleteAll}
                    disabled={deletingAll}
                    className="inline-flex h-9 sm:h-10 items-center gap-1 rounded-xl bg-destructive/10 hover:bg-destructive/20 px-2.5 sm:px-3 text-xs sm:text-sm font-bold text-destructive active:scale-95 transition-all"
                  >
                    {deletingAll
                      ? isAr ? "جارٍ الحذف..." : "Suppression..."
                      : isAr ? "حذف الكل" : "Supprimer tout"}
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
              className="inline-flex h-9 sm:h-10 items-center gap-1 rounded-xl bg-primary hover:bg-primary/90 px-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-xs active:scale-95 transition"
            >
              <Plus className="h-4 w-4 shrink-0" /> {isAr ? "جديدة" : "Nouvelle"}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* BARRE DE FILTRES : STATUT, ANNÉE, MOIS, ESPÈCE, TYPE      */}
      {/* ========================================================= */}
      <div className="mb-4 rounded-2xl border bg-card/60 backdrop-blur-xs p-3 shadow-xs space-y-3">
        {/* Ligne 0 : Filtre rapide par Statut (Toutes / En attente / Acceptées) */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border/50">
          <span className="text-[10px] font-black uppercase text-muted-foreground mr-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            <span>{isAr ? "الحالة :" : "Statut :"}</span>
          </span>

          <button
            type="button"
            onClick={() => handleStatusChange("all")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${
              selectedStatus === "all"
                ? "bg-foreground text-background shadow-xs font-black"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span>{isAr ? "الكل" : "Toutes"}</span>
            <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-black">
              {countsByStatus.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange("pending")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all active:scale-95 border ${
              selectedStatus === "pending"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs font-black"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
            }`}
          >
            <span>{isAr ? "قيد الانتظار" : "En attente"}</span>
            <span className="rounded-full bg-black/10 dark:bg-white/15 px-1.5 py-0.2 text-[10px] font-black">
              {countsByStatus.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange("accepted")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all active:scale-95 border ${
              selectedStatus === "accepted"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-black"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
          >
            <span>{isAr ? "مقبولة" : "Acceptées"}</span>
            <span className="rounded-full bg-black/10 dark:bg-white/15 px-1.5 py-0.2 text-[10px] font-black">
              {countsByStatus.accepted}
            </span>
          </button>
        </div>

        {/* Ligne 1 : Boutons/Pills de sélection rapide par Type de Prescription */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3 text-primary" />
            <span>{isAr ? "نوع الوصفة :" : "Prescription :"}</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedPrescription("all")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${selectedPrescription === "all"
              ? "bg-foreground text-background shadow-xs font-black"
              : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            <span>{isAr ? "الكل" : "Toutes"}</span>
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
            <span>{isAr ? PRESCRIPTION_CONFIG.fert_irrigation.labelAr : PRESCRIPTION_CONFIG.fert_irrigation.label}</span>
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
            <span>{isAr ? PRESCRIPTION_CONFIG.fert_foliaire.labelAr : PRESCRIPTION_CONFIG.fert_foliaire.label}</span>
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
            <span>{isAr ? PRESCRIPTION_CONFIG.phytosanitaire.labelAr : PRESCRIPTION_CONFIG.phytosanitaire.label}</span>
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
              <span>{isAr ? "السنة" : "Année"}</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              <option value="all">{isAr ? "كل السنوات" : "Toutes les années"}</option>
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
              <span>{isAr ? "الشهر" : "Mois"}</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {isAr ? m.labelAr : m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Espèce */}
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Sprout className="h-3 w-3 text-primary" />
              <span>{isAr ? "الصنف / النوع" : "Espèce"}</span>
            </label>
            <select
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              {SPECIES_OPTIONS.map((sp) => (
                <option key={sp.value} value={sp.value}>
                  {sp.icon} {isAr ? sp.labelAr : sp.label}
                </option>
              ))}
            </select>
          </div>

          {/* Recherche textuelle */}
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Search className="h-3 w-3 text-primary" />
              <span>{isAr ? "بحث" : "Recherche"}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "العنوان، المنتج..." : "Titre, produit..."}
                className="w-full rounded-xl border border-input bg-background ps-7 pe-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
              <Search className="absolute start-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Ligne 3 : Compteur filtré & Bouton Réinitialiser */}
        {isFiltered && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 text-muted-foreground">
            <span>
              {isAr ? (
                <>
                  النتائج : <strong className="text-foreground">{filteredList.length}</strong> معروضة من أصل {list.length}
                </>
              ) : (
                <>
                  Résultats : <strong className="text-foreground">{filteredList.length}</strong> affichée{filteredList.length > 1 ? "s" : ""} sur {list.length} au total
                </>
              )}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:underline transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{isAr ? "إعادة تعيين الفلاتر" : "Réinitialiser les filtres"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* BARRE D'ACTIONS GROUPÉES / SÉLECTION MULTIPLE            */}
      {/* ========================================================= */}
      {pendingInFiltered.length > 0 && (displayRole === "ingenieur" || displayRole === "admin") && (
        <div
          className={`mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border p-3 transition-all ${selectedRecoIds.size > 0
              ? "bg-primary/10 border-primary/40 shadow-sm"
              : "bg-muted/30 border-dashed"
            }`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllPending}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition active:scale-95 cursor-pointer ${allPendingSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-black"
                  : "bg-background hover:bg-muted text-foreground border-input"
                }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>
                {allPendingSelected
                  ? isAr ? "إلغاء تحديد الكل" : "Tout désélectionner"
                  : isAr
                    ? `تحديد الكل (${pendingInFiltered.length} قيد الانتظار)`
                    : `Tout cocher (${pendingInFiltered.length} en attente)`}
              </span>
            </button>

            {selectedRecoIds.size > 0 && (
              <span className="text-xs font-black text-primary bg-primary/15 px-2.5 py-1 rounded-xl border border-primary/20">
                {isAr
                  ? `${selectedRecoIds.size} محددة`
                  : `${selectedRecoIds.size} sélectionnée${selectedRecoIds.size > 1 ? "s" : ""}`}
              </span>
            )}
          </div>

          {selectedRecoIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRecoIds(new Set())}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1"
              >
                {isAr ? "إلغاء" : "Annuler"}
              </button>
              <button
                type="button"
                disabled={isValidatingBatch}
                onClick={handleBatchValidate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-black shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {isValidatingBatch
                    ? isAr ? "جارٍ الاعتماد..." : "Validation en cours..."
                    : isAr
                      ? `اعتماد المحددة (${selectedRecoIds.size})`
                      : `Valider la sélection (${selectedRecoIds.size})`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* BANNIÈRE D'EXÉCUTION RAPIDE DU LOT DU 09 MARS 2026 */}
      {/* ========================================================= */}
      {pendingMarchRecos.length > 0 && (displayRole === "ingenieur" || displayRole === "admin") && (
        <div className="mb-4 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 p-3.5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <span>Lot du 09 Mars 2026</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                  {pendingMarchRecos.length} recommandations en attente
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Valider et exécuter l'ensemble des 6 recommandations (Programmes A1/A2, Pulvérisations 1/2 et Traitement Azostar) avec alignement parfait des achats.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isBatchValidating}
              onClick={() => {
                openScheduleConfirm(
                  pendingMarchRecos,
                  "execute",
                  `Valider & Exécuter le Lot du 09 Mars (${pendingMarchRecos.length})`,
                  "Confirmez l'heure de commencement du planning et les temps d'irrigation (avec et sans fertilisation)."
                );
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-black shadow-sm active:scale-95 transition cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isBatchValidating ? "Exécution en cours..." : `⚡ Valider & Exécuter (${pendingMarchRecos.length})`}</span>
            </button>

            <button
              type="button"
              disabled={isBatchValidating}
              onClick={() => {
                openScheduleConfirm(
                  pendingMarchRecos,
                  "plan",
                  `Planifier le Lot du 09 Mars (${pendingMarchRecos.length})`,
                  "Confirmez l'heure de commencement du planning et les temps d'irrigation (avec et sans fertilisation)."
                );
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 px-3 py-2 text-xs font-bold transition cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              <span>Planifier seulement</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LISTE DES RECOMMANDATIONS AVEC COULEURS DE PRESCRIPTION */}
      {/* ========================================================= */}
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {displayRole === "ingenieur"
            ? isAr
              ? "لا توجد أي توصية مرسلة. انقر على «جديدة» للبدء."
              : "Aucune recommandation envoyée. Cliquez sur « Nouvelle » pour commencer."
            : isAr
              ? "لا توجد أي توصية مستلمة."
              : "Aucune recommandation reçue."}
        </p>
      ) : filteredList.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">
            {isAr
              ? "لا توجد أي توصية تطابق الفلاتر المختارة."
              : "Aucune recommandation ne correspond aux filtres sélectionnés."}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-bold transition active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isAr ? "مسح الفلاتر" : "Effacer les filtres"}</span>
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
            const stockReport = isPending ? checkRecoStock(r, suppliers, parcels) : null;
            const fertBacs = getFertigationBacs(r);
            const targetParcels = getTargetParcelsForReco(r, parcels);
            const rDate = getRecoDate(r);
            const todayStr = new Date().toISOString().slice(0, 10);
            const isPast = rDate < todayStr;

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
                className={`w-full max-w-full min-w-0 overflow-hidden flex flex-col gap-2.5 cursor-pointer rounded-2xl border p-3.5 shadow-xs transition active:scale-[0.99] hover:shadow-md ${config.cardTone} ${selectedRecoIds.has(r.id) ? "ring-2 ring-primary border-primary bg-primary/10" : ""
                  }`}
              >
                {/* HAUT DE CARTE : Case à cocher + Icône + Badge Statut + Badge Type + Badges Bacs & Stock */}
                <div className="flex flex-wrap items-center gap-1.5 w-full">
                  {(displayRole === "ingenieur" || displayRole === "admin") && (
                    <div
                      onClick={(e) => toggleSelectReco(r.id, e)}
                      className="shrink-0 flex items-center justify-center cursor-pointer mr-0.5"
                      title={selectedRecoIds.has(r.id) ? "Désélectionner" : "Cocher pour valider en groupe"}
                    >
                      <div
                        className={`h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedRecoIds.has(r.id)
                            ? "bg-primary border-primary text-primary-foreground shadow-xs"
                            : "border-muted-foreground/40 hover:border-primary bg-background"
                          }`}
                      >
                        {selectedRecoIds.has(r.id) && <CheckSquare className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  )}

                  {/* Icône Prescription compacte */}
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.iconTone}`}>
                    <Icon className="h-4 w-4" />
                  </span>

                  {/* Badge Statut (EN ATTENTE / ACCEPTÉ) */}
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${statusInfo.tone}`}>
                    {statusInfo.label}
                  </span>

                  {/* Badge de Type de Prescription coloré */}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${config.badgeTone}`}>
                    <Icon className="h-2.5 w-2.5" />
                    <span>{isAr ? config.labelAr : config.label}</span>
                  </span>

                  {/* Badges des Bacs concernés pour les programmes de fertilisation */}
                  {fertBacs.map((b) => (
                    <span
                      key={b.bac}
                      title={`${isAr ? "الحوض" : "Bac"} ${b.bac} : ${b.products.join(", ")}`}
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${getBacBadgeTone(b.bac)}`}
                    >
                      {isAr ? `الحوض ${b.bac}` : `Bac ${b.bac}`}
                    </span>
                  ))}

                  {stockReport && stockReport.stockStatus === "missing" && (
                    <span
                      title={`${isAr ? "المنتجات الناقصة :" : "Produits manquants :"} ${stockReport.missingItems.map((i) => `${i.name} (-${Math.round(i.missing * 100) / 100} ${i.unit})`).join(", ")}`}
                      className="shrink-0 rounded-full border border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 text-[9px] font-black flex items-center gap-1"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" /> {isAr ? "شراء مطلوب" : "Achat requis"}
                    </span>
                  )}
                  {stockReport && stockReport.stockStatus === "low" && (
                    <span
                      title={`${isAr ? "المخزون عند الحد الأدنى :" : "Stock au minimum après application :"} ${stockReport.lowStockItems.map((i) => `${i.name} (reste ${Math.max(0, Math.round((i.available - i.needed) * 100) / 100)} ${i.unit})`).join(", ")}`}
                      className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[9px] font-black flex items-center gap-1"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" /> {isAr ? "متوفر (مخزون منخفض)" : "Dispo (Stock min.)"}
                    </span>
                  )}
                  {stockReport && stockReport.stockStatus === "equivalent" && (
                    <span
                      title={`${isAr ? "بديل بنفس المادة الفعالة :" : "Équivalent même matière active en stock :"} ${stockReport.equivalentItems.map((i) => `${i.name} → ${i.equivalentInStock?.productName}`).join(", ")}`}
                      className="shrink-0 rounded-full border border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[9px] font-black flex items-center gap-1"
                    >
                      {isAr ? "🔄 بديل في المخزون" : "🔄 Équivalent en stock"}
                    </span>
                  )}
                  {stockReport && stockReport.stockStatus === "available" && (
                    <span
                      title={isAr ? "جميع المنتجات متوفرة في المخزون" : "Tous les produits sont disponibles en stock"}
                      className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[9px] font-black flex items-center gap-1"
                    >
                      <PackageCheck className="h-2.5 w-2.5" /> {isAr ? "المخزون متوفر" : "Stock dispo"}
                    </span>
                  )}
                </div>

                {/* MILIEU DE CARTE (pleine largeur w-full) : Titre, parcelles, dates, produits & alerte stock */}
                <div className="w-full min-w-0 space-y-1">
                  <p className="font-bold text-foreground leading-snug text-sm break-words">{r.title}</p>

                  <p className="text-xs text-muted-foreground break-words">
                    <span className="font-semibold text-foreground/80">
                      {isAr ? config.labelAr : config.label}
                    </span>
                    {" · "}
                    {isAr
                      ? `${targetParcels.length} ${targetParcels.length === 1 ? "قطعة" : targetParcels.length === 2 ? "قطعتان" : "قطع"}`
                      : `${targetParcels.length} parcelle${targetParcels.length > 1 ? "s" : ""}`}
                    {displayRole !== "ingenieur" && (isAr ? ` · بواسطة ${author}` : ` · par ${author}`)}
                  </p>

                  <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span>
                        {isAr ? "التاريخ :" : "Date :"}{" "}
                        <strong dir="ltr" className="text-foreground/90">{formatDateFR(rDate)}</strong>
                      </span>
                    </span>
                    {r.created_at && (
                      <span className="opacity-70 text-[10px]">
                        ({isAr ? "تاريخ الإدخال :" : "Saisie :"} <span dir="ltr">{formatDateTimeFR(r.created_at)}</span>)
                      </span>
                    )}
                  </p>

                  {fertBacs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-foreground/80">
                      {fertBacs.map((b) => (
                        <span key={b.bac} className="inline-flex flex-wrap items-center gap-1">
                          <strong className="font-black">{isAr ? `الحوض ${b.bac}` : `Bac ${b.bac}`}</strong>
                          <span className="text-muted-foreground">({b.products.join(", ")})</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {stockReport && stockReport.equivalentItems.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      {stockReport.equivalentItems.map((eqItem) => {
                        const eq = eqItem.equivalentInStock!;
                        return (
                          <div key={eqItem.name} className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300 leading-snug">
                            <span>
                              {isAr ? "🔄 بديل متوفر في المخزون :" : "🔄 Équivalent en stock :"}{" "}
                              <strong>{eq.productName}</strong> ({eq.available} {eq.unit} · {eq.activeIngredient} —{" "}
                              {isAr ? "يرجى التحقق من التركيز" : "vérifier concentration"})
                            </span>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!window.confirm(`Substituer "${eqItem.name}" par l'équivalent en stock "${eq.productName}" (vérifier la concentration) ?`)) return;
                                try {
                                  const nextPayload = JSON.parse(JSON.stringify(r.payload || {}));
                                  const prog = nextPayload.program || {};
                                  if (Array.isArray(prog.products)) {
                                    prog.products = prog.products.map((p: any) =>
                                      (p.product || p.name)?.trim() === eqItem.name
                                        ? { ...p, product: eq.productName, name: eq.productName }
                                        : p
                                    );
                                  }
                                  if (Array.isArray(prog.items)) {
                                    prog.items = prog.items.map((it: any) =>
                                      (it.name || it.product)?.trim() === eqItem.name
                                        ? { ...it, name: eq.productName }
                                        : it
                                    );
                                  }
                                  nextPayload.program = prog;
                                  await update.mutateAsync({ id: r.id, patch: { payload: nextPayload } });
                                  toast.success(`Produit substitué par "${eq.productName}" (pensez à vérifier la concentration).`);
                                } catch {
                                  toast.error("Erreur lors de la substitution du produit.");
                                }
                              }}
                              className="rounded-md border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 px-1.5 py-0.5 text-[10px] font-black text-sky-800 dark:text-sky-200 cursor-pointer"
                            >
                              {isAr ? "استبدال" : "Substituer"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {stockReport && stockReport.stockStatus === "missing" && stockReport.missingItems.length > 0 && (
                    <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 leading-snug break-words">
                      {isAr ? "النقص :" : "Manque :"}{" "}
                      {stockReport.missingItems
                        .map((i) => `${i.name.split("/")[0].trim()} (-${Math.round(i.missing * 100) / 100} ${i.unit})`)
                        .join(" · ")}
                    </p>
                  )}

                  {stockReport && stockReport.stockStatus === "low" && stockReport.lowStockItems.length > 0 && (
                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 leading-snug break-words">
                      {isAr ? "مخزون منخفض :" : "Stock min. :"}{" "}
                      {stockReport.lowStockItems
                        .map((i) => `${i.name.split("/")[0].trim()} (${isAr ? "المتبقي" : "reste"} ${Math.max(0, Math.round((i.available - i.needed) * 100) / 100)} ${i.unit})`)
                        .join(" · ")}
                    </p>
                  )}
                </div>

                {/* BAS DE CARTE : Barre d'actions en flex-wrap */}
                {(displayRole === "ingenieur" || displayRole === "admin") && (
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 w-full pt-2 border-t border-border/50">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isPending && (
                        <>
                          {/* 1. Bouton vert Valider & Exécuter : Actif UNIQUEMENT sur ordonnance passée (date < Aujourd'hui) */}
                          {isPast ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openScheduleConfirm(
                                  [r],
                                  "execute",
                                  `${isAr ? "اعتماد وتنفيذ :" : "Valider & Exécuter :"} ${r.title}`,
                                  isAr
                                    ? "يرجى تأكيد ساعة البدء وأوقات الري قبل الاعتماد."
                                    : "Confirmez l'heure de commencement et les temps d'irrigation avant validation."
                                );
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-[11px] font-bold shadow-xs active:scale-95 transition cursor-pointer"
                              title={isAr ? "اعتماد التوصية وتنفيذها" : "Valider la recommandation et solder l'exécution historique (date passée)"}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>{isAr ? "اعتماد وتنفيذ" : "Valider & Exécuter"}</span>
                            </button>
                          ) : (
                            /* Ordonnance future (date >= Aujourd'hui) : Désactivé avec cadenas pour empêcher l'exécution prématurée */
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-1 rounded-lg bg-muted text-muted-foreground/50 border border-border/40 px-2.5 py-1.5 text-[11px] font-semibold cursor-not-allowed opacity-50 select-none"
                              title={
                                isAr
                                  ? "معاملة مستقبلية: يُسمح بالتخطيط فقط قبل التنفيذ الميداني"
                                  : "Action désactivée : Traitement futur (date >= Aujourd'hui). Seule la planification est permise avant l'intervention sur le terrain."
                              }
                            >
                              <Lock className="h-3.5 w-3.5" />
                              <span>{isAr ? "اعتماد وتنفيذ" : "Valider & Exécuter"}</span>
                            </button>
                          )}

                          {/* 2. Bouton bleu Planifier : Toujours actif (passée pour calendrier, future pour planifier) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openScheduleConfirm(
                                [r],
                                "plan",
                                `${isAr ? "تخطيط :" : "Planifier :"} ${r.title}`,
                                isAr
                                  ? "يرجى تأكيد ساعة البدء وأوقات الري قبل التخطيط."
                                  : "Confirmez l'heure de commencement et les temps d'irrigation avant planification."
                              );
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 text-[11px] font-bold shadow-xs active:scale-95 transition cursor-pointer"
                            title={isAr ? "تخطيط دون تسجيلها كمنفّذة" : "Planifier sans marquer comme exécuté"}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{isAr ? "تخطيط" : "Planifier"}</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingReco(r);
                          setIsDuplicate(true);
                          setFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-bold shadow-xs active:scale-95 transition"
                        title={isAr ? "نسخ هذه التوصية لتاريخ جديد" : "Dupliquer cette recommandation pour une nouvelle date"}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>{isAr ? "نسخ" : "Dupliquer"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (
                            !window.confirm(
                              isAr
                                ? `هل تريد حذف التوصية "${r.title}" نهائياً؟`
                                : `Supprimer définitivement la recommandation "${r.title}" ?`
                            )
                          )
                            return;
                          try {
                            await remove.mutateAsync(r.id);
                            toast.success(isAr ? "تم حذف التوصية بنجاح!" : "Recommandation supprimée avec succès !");
                          } catch {
                            toast.error(isAr ? "حدث خطأ أثناء الحذف" : "Erreur lors de la suppression");
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/25 bg-destructive/5 px-2.5 py-1.5 text-[11px] font-bold text-destructive hover:bg-destructive/15 active:scale-95 transition"
                        title={isAr ? "حذف هذه التوصية" : "Supprimer cette recommandation"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sm:hidden">{isAr ? "حذف" : "Supprimer"}</span>
                      </button>
                    </div>
                  </div>
                )}
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
      {scheduleConfirmState && (
        <ValidateOrderScheduleDialog
          open={scheduleConfirmState.open}
          onOpenChange={(o) => !o && setScheduleConfirmState(null)}
          title={scheduleConfirmState.title}
          subtitle={scheduleConfirmState.subtitle}
          operationLabel={scheduleConfirmState.operationLabel}
          mode={scheduleConfirmState.mode}
          defaultStartHour={scheduleConfirmState.defaultStartHour}
          defaultFertIrrigationTime={scheduleConfirmState.defaultFertIrrigationTime}
          defaultPureIrrigationTime={scheduleConfirmState.defaultPureIrrigationTime}
          sunriseStr={scheduleConfirmState.sunriseStr}
          sunsetStr={scheduleConfirmState.sunsetStr}
          solarDateLabel={scheduleConfirmState.solarDateLabel}
          stockSummary={scheduleConfirmState.stockSummary}
          bacDetails={scheduleConfirmState.bacDetails}
          tankRinseAlert={scheduleConfirmState.tankRinseAlert}
          loading={isBatchValidating}
          onConfirm={executeConfirmedValidation}
        />
      )}
      {/* Dialogue de confirmation « Supprimer tout / حذف الكل » avec synchronisation historique parcelles */}
      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-black text-base">
              <Trash2 className="h-5 w-5 shrink-0" />
              <span>{isAr ? "حذف جميع التوصيات" : "Supprimer toutes les recommandations"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {isAr
                ? `هل أنت متأكد من حذف (${list.length}) توصية نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Voulez-vous vraiment supprimer définitivement les ${list.length} recommandation(s) affichée(s) ? Cette action est irréversible.`}
            </DialogDescription>
          </DialogHeader>

          <label className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deleteLinkedParcelPhyto}
              onChange={(e) => setDeleteLinkedParcelPhyto(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-destructive cursor-pointer shrink-0"
            />
            <span className="leading-relaxed">
              {isAr
                ? "حذف المعاملات المنفذة المرتبطة من أرشيف القطع أيضاً (وإعادة ضبط حصص IRAC/FRAC)"
                : "Supprimer aussi les traitements exécutés liés dans l'historique des parcelles (et recalculer les quotas IRAC/FRAC)"}
            </span>
          </label>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteAllDialogOpen(false)}
              className="rounded-xl font-bold"
            >
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDeleteAll}
              className="rounded-xl font-black"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
              {isAr ? "تأكيد الحذف الكلي" : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
