import { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Droplets,
  Sprout,
  Filter,
  Printer,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  Eye,
  Info,
  CalendarDays,
  Table as TableIcon,
  Check,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Recommendation } from "@/lib/cloud/recommendations";
import { type Parcel } from "@/data/parcels";
import { useTranslation } from "@/lib/i18n";

export interface AgronomicPlanningCalendarProps {
  recos: Recommendation[];
  parcels: Parcel[];
  onSelectReco?: (reco: Recommendation) => void;
}

// Configuration des espèces suivies de la ferme Doula
interface CropSpeciesConfig {
  id: string;
  name: string;
  labelAr: string;
  icon: string;
  groups: string[];
  parcelIds: string[];
  fallbackSurface: number;
  surfaceHa?: number;
  variety: string;
  rootstock: string;
  colorVar: string;
  badgeBg: string;
  borderColor: string;
}

const CROPS_CONFIG: CropSpeciesConfig[] = [
  {
    id: "pommiers",
    name: "Pommier Gala One",
    labelAr: "تفاح جالا وان (Gala One)",
    icon: "🍎",
    groups: ["pommiers"],
    parcelIds: ["pommier1", "pommier2"],
    fallbackSurface: 2.0, // 1 ha (Pommier 1) + 1 ha (Pommier 2) = 2 ha réels
    variety: "Gala One",
    rootstock: "M9 (Super-intensif)",
    colorVar: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    borderColor: "border-emerald-500/40",
  },
  {
    id: "nablara",
    name: "Nectarine Nablara",
    labelAr: "نكتارين نابلارا (Nablara)",
    icon: "🍑",
    groups: ["nablara", "nectarinier"],
    parcelIds: ["nablara"],
    fallbackSurface: 2.0, // 2 ha réels
    variety: "Nablara",
    rootstock: "GF677",
    colorVar: "text-orange-700 dark:text-orange-300",
    badgeBg: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
    borderColor: "border-orange-500/40",
  },
  {
    id: "redix25",
    name: "Nectarine Redix® 25",
    labelAr: "نكتارين ريديكس 25 (Redix® 25)",
    icon: "🍑",
    groups: ["redix25", "nectarinier"],
    parcelIds: ["redix25"],
    fallbackSurface: 2.0, // 2 ha réels
    variety: "Redix 25",
    rootstock: "GF677",
    colorVar: "text-rose-700 dark:text-rose-300",
    badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    borderColor: "border-rose-500/40",
  },
  {
    id: "oliviers",
    name: "Oliviers (P1 à P4)",
    labelAr: "أشجار الزيتون (P1 - P4)",
    icon: "🫒",
    groups: ["oliviers"],
    parcelIds: ["p1", "p2", "p3", "p4"],
    fallbackSurface: 8.0, // 2 ha * 4 = 8 ha réels
    variety: "Chamlal & Ferkani",
    rootstock: "Zabouge",
    colorVar: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    borderColor: "border-amber-500/40",
  },
];

export type PrescriptionFilterType = "all" | "fert_irrigation" | "fert_foliaire" | "phytosanitaire";

export interface PlannedPeriod {
  speciesId: string;
  speciesName: string;
  recoId: string;
  recoTitle: string;
  reco: Recommendation;
  type?: "fertigation" | "pulverisation" | "phyto";
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  frequency: number;
  pureIrrigationFrequency: number;
  pureIrrigationTime: string;
  irrigationTime: string;
  durationMinutes: number;
  injectionTime: number;
  rinsingTime: number;
  wettingTime: number;
  surfaceHa: number;
  entries: Array<{
    bac: string;
    items: Array<{ name: string; qty: string; unit: string; price?: string }>;
  }>;
  products?: Array<{
    name: string;
    doseHa: number;
    unit: string;
    totalParcel: number;
    cible?: string;
    dar?: string;
    note?: string;
  }>;
  totalPassages: number;
  durationDays: number;
}

export interface ScheduledDayEvent {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  dayName: string;
  speciesId: string;
  speciesName: string;
  cropConfig: CropSpeciesConfig;
  type: "fertigation" | "pure_irrigation" | "pulverisation" | "phyto";
  periodInfo?: PlannedPeriod;
  recoTitle: string;
  recoObj?: Recommendation;
  startHourMinutes: number;
  endHourMinutes: number;
  hours: string; // ex: "05h00 - 06h30"
  irrigationDuration: string; // ex: "1h30"
  durationMinutes: number;
  wettingTime: number;
  injectionTime: number;
  rinsingTime: number;
  bacs: Array<{
    bac: string;
    items: Array<{
      name: string;
      doseHa: number;
      unit: string;
      totalParcel: number;
    }>;
  }>;
  products?: Array<{
    name: string;
    doseHa: number;
    unit: string;
    totalParcel: number;
    cible?: string;
    dar?: string;
    note?: string;
  }>;
}

export interface ConsolidatedProduct {
  name: string;
  category: "fertigation" | "foliaire" | "phytosanitaire";
  unit: string;
  bySpecies: Record<string, number>;
  byMonth?: Record<string, number>;
  totalQty: number;
  cible?: string;
  dar?: string;
}

const MONTH_NAMES_FR: Record<string, string> = {
  "01": "Janvier",
  "02": "Février",
  "03": "Mars",
  "04": "Avril",
  "05": "Mai",
  "06": "Juin",
  "07": "Juillet",
  "08": "Août",
  "09": "Septembre",
  "10": "Octobre",
  "11": "Novembre",
  "12": "Décembre",
};

function sortProducts<T extends { name: string; totalQty: number; category: string }>(
  list: T[],
  sortBy: "qty_desc" | "name_asc" | "category"
): T[] {
  return [...list].sort((a, b) => {
    if (sortBy === "qty_desc") return b.totalQty - a.totalQty;
    if (sortBy === "name_asc") return a.name.localeCompare(b.name);
    if (sortBy === "category") {
      const order: Record<string, number> = { fertigation: 1, foliaire: 2, phytosanitaire: 3 };
      const catDiff = (order[a.category] || 9) - (order[b.category] || 9);
      if (catDiff !== 0) return catDiff;
      return b.totalQty - a.totalQty;
    }
    return 0;
  });
}

function parseDurationMinutes(timeStr: string | undefined): number {
  if (!timeStr) return 90;
  if (timeStr === "1h") return 60;
  if (timeStr === "1h30") return 90;
  if (timeStr === "2h") return 120;
  if (timeStr === "2h30") return 150;
  if (timeStr === "3h") return 180;
  const num = parseFloat(timeStr);
  if (!isNaN(num)) return Math.round(num * 60);
  return 90;
}

function formatMinutesToHourString(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}h${m.toString().padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

function getPassDatesForPeriod(startDate: string, endDate: string): string[] {
  // Tranche de référence du 09/10 Mars 2026 :
  // Mardi 10 Mars (Passage 1), Jeudi 12 Mars (Passage 2), Dimanche 15 Mars (Passage 3)
  if (startDate === "2026-03-09" || startDate === "2026-03-10") {
    return ["2026-03-10", "2026-03-12", "2026-03-15"];
  }

  const dates: string[] = [];
  let d = new Date(startDate);
  const end = new Date(endDate);
  let step = 0;

  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    // Cadence agronomique : alternance 2 jours / 3 jours (ex: Mardi + 2j = Jeudi ; Jeudi + 3j = Dimanche)
    const jump = step % 2 === 0 ? 2 : 3;
    d.setDate(d.getDate() + jump);
    step++;
  }
  return dates;
}

function formatDateFr(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    const months = [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
      "Juil", "Août", "Sept", "Oct", "Nov", "Déc"
    ];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * Filtrage agronomique robuste et multicritères d'une recommandation pour une culture
 * (Insensible à la casse, tolérant aux libellés composés "REDIX 25, NABLARA",
 * inspection du titre, du commentaire, des groupes et des parcelles ciblées).
 */
function matchesCropForCalendar(
  r: Recommendation,
  crop: CropSpeciesConfig,
  allParcels: any[] = [],
  onlyValidated = true
): boolean {
  if (!r || r.status === "rejetee") return false;
  if (onlyValidated && r.status !== "acceptee" && r.status !== "transferee") return false;
  const payload = (r.payload || {}) as any;

  // 1. Normalisation et aplatissement des groupes de cultures
  const rawGroups: string[] = Array.isArray(payload.crop_group)
    ? payload.crop_group
    : payload.crop_group
    ? [payload.crop_group]
    : [];
  const flatGroups = rawGroups
    .flatMap((g) => String(g).split(/[;,/]+/).map((s) => s.trim().toLowerCase()))
    .filter(Boolean);

  const titleLower = (r.title || "").toLowerCase();
  const commentLower = (r.comment || "").toLowerCase();

  // 2. Vérification par identifiant direct de parcelle
  const rParcels = (r.parcel_ids || []).map((id) => String(id).toLowerCase());
  const matchesDirectParcel = rParcels.some((pId) =>
    crop.parcelIds.some((cId) => pId.includes(cId.toLowerCase()) || cId.toLowerCase().includes(pId))
  );
  if (matchesDirectParcel) return true;

  // 3. Vérification par les objets parcelles réels de l'exploitation
  if (allParcels.length > 0 && rParcels.length > 0) {
    const targetedParcels = allParcels.filter((p) => rParcels.includes(String(p.id).toLowerCase()));
    const matchesTargetedParcel = targetedParcels.some((p) => {
      const pName = (p.name || "").toLowerCase();
      const pSpec = (p.species || p.culture || p.type || "").toLowerCase();
      if (crop.id === "pommiers") return pName.includes("pomm") || pSpec.includes("pomm") || pSpec.includes("apple");
      if (crop.id === "nablara") return pName.includes("nablara") || (pSpec.includes("nectar") && !pName.includes("redix"));
      if (crop.id === "redix25") return pName.includes("redix") || (pSpec.includes("nectar") && !pName.includes("nablara"));
      if (crop.id === "oliviers") return pName.includes("oliv") || pSpec.includes("oliv");
      return false;
    });
    if (matchesTargetedParcel) return true;
  }

  // 4. Vérification par crop_group normalisé
  const matchesGroup = flatGroups.some((g) => {
    const gClean = g.replace(/[\s\-_®]/g, "");
    return crop.groups.some((cg) => {
      const cgClean = cg.toLowerCase().replace(/[\s\-_®]/g, "");
      return gClean.includes(cgClean) || cgClean.includes(gClean);
    });
  });
  if (matchesGroup) return true;

  // 5. Vérification sémantique par titre et commentaire
  if (crop.id === "pommiers") {
    if (flatGroups.some((g) => g.includes("pomm") || g.includes("apple") || g.includes("تفاح"))) return true;
    if (titleLower.includes("pomm") || titleLower.includes("تفاح") || commentLower.includes("pomm")) return true;
  } else if (crop.id === "nablara") {
    if (
      flatGroups.some(
        (g) =>
          g.includes("nablara") ||
          (g.includes("nectar") && !flatGroups.some((x) => x.includes("redix") && !x.includes("nablara")))
      )
    )
      return true;
    if (titleLower.includes("nablara") || (titleLower.includes("nectar") && !titleLower.includes("redix seul"))) return true;
    if (commentLower.includes("nablara")) return true;
  } else if (crop.id === "redix25") {
    if (
      flatGroups.some(
        (g) =>
          g.includes("redix") ||
          (g.includes("nectar") && !flatGroups.some((x) => x.includes("nablara") && !x.includes("redix")))
      )
    )
      return true;
    if (titleLower.includes("redix") || (titleLower.includes("nectar") && !titleLower.includes("nablara seul"))) return true;
    if (commentLower.includes("redix")) return true;
  } else if (crop.id === "oliviers") {
    if (flatGroups.some((g) => g.includes("oliv") || g.includes("زيتون"))) return true;
    if (titleLower.includes("oliv") || titleLower.includes("زيتون") || commentLower.includes("oliv")) return true;
  }

  return false;
}

const DAY_NAMES_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function getEventBadgeInfo(ev: ScheduledDayEvent): { text: string; tone: string } {
  const title = (ev.recoTitle || "").trim();

  // 1. Programme A1 / A2 / etc.
  const progMatch = title.match(/Programme\s*([A-Za-z0-9]+)/i);
  if (progMatch) {
    const pName = progMatch[1].toUpperCase();
    return {
      text: pName === "A1" || pName === "A2" ? `Prog. ${pName}` : `Programme ${pName}`,
      tone: pName === "A1"
        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
        : "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/30",
    };
  }

  // 2. Pulvérisation 1 / 2 (ou Passage 1 / 2)
  const pulvMatch = title.match(/(?:Pulv[ée]risation|Passage)\s*([0-9]+)/i);
  if (pulvMatch) {
    return {
      text: `Pulvérisation ${pulvMatch[1]}`,
      tone: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30",
    };
  }

  // 3. Traitement 1 / 2
  const traitMatch = title.match(/Traitement\s*([0-9]+)/i);
  if (traitMatch) {
    return {
      text: `Traitement ${traitMatch[1]}`,
      tone: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
    };
  }

  // 4. Fallbacks intelligents selon le type
  if (ev.type === "fertigation" || ev.type === "pure_irrigation") {
    return { text: "Prog. A1", tone: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30" };
  }
  if (ev.type === "pulverisation") {
    return { text: "Pulvérisation 1", tone: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30" };
  }
  return { text: "Traitement 1", tone: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30" };
}

export function AgronomicPlanningCalendar({
  recos,
  parcels,
  onSelectReco,
}: AgronomicPlanningCalendarProps) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  const [selectedSpecies, setSelectedSpecies] = useState<string>("all");
  const [activeView, setActiveView] = useState<"grid" | "cards" | "periods" | "consolidation">("grid");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedPrescriptionType, setSelectedPrescriptionType] = useState<PrescriptionFilterType>("all");
  const [onlyValidated, setOnlyValidated] = useState<boolean>(true);
  const [consolidationGrouping, setConsolidationGrouping] = useState<"by_species" | "by_month" | "matrix">("by_species");
  const [consolidationSort, setConsolidationSort] = useState<"qty_desc" | "name_asc" | "category">("qty_desc");

  // 1. Calcul dynamique et exact des surfaces depuis la base de données (parcels)
  const cropsWithRealSurfaces = useMemo(() => {
    return CROPS_CONFIG.map((crop) => {
      const realSurface = crop.parcelIds.reduce((sum, pId) => {
        const p = parcels.find((x) => x.id === pId);
        if (!p) return sum;
        const s = parseFloat(String(p.info?.surface || "").replace(",", "."));
        return sum + (isNaN(s) || s <= 0 ? 0 : s);
      }, 0);

      const surfaceHa = realSurface > 0 ? realSurface : crop.fallbackSurface;
      return {
        ...crop,
        surfaceHa,
      };
    });
  }, [parcels]);

  // 2. Extraire toutes les recommandations par espèce (Fertigation, Foliaire, Phytosanitaire)
  const { periodsBySpecies, allScheduledEvents, allProductsConsolidated } = useMemo(() => {
    const periodsBySpeciesMap: Record<string, PlannedPeriod[]> = {};
    const rawEvents: Array<Omit<ScheduledDayEvent, "startHourMinutes" | "endHourMinutes" | "hours">> = [];
    const productConsolidationMap: Record<string, ConsolidatedProduct> = {};

    cropsWithRealSurfaces.forEach((crop) => {
      // Filtrer les recommandations valides pour cette espèce avec matching multicritères complet
      const matchingRecos = recos.filter((r) => matchesCropForCalendar(r, crop, parcels, onlyValidated));

      // A. Recommandations de Fertigation (au sol)
      const fertRecos = matchingRecos.filter((r) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        const titleLower = (r.title || "").toLowerCase();
        const isFoliar =
          payload.method === "pulverisation" ||
          payload.method === "foliaire" ||
          prog.kind === "pulverisation" ||
          titleLower.includes("pulv") ||
          titleLower.includes("foliaire");
        const isPhyto =
          r.kind === "phytosanitaire" ||
          prog.kind === "phytosanitaire" ||
          payload.method === "phytosanitaire" ||
          titleLower.includes("phyto");
        if (isFoliar || isPhyto) return false;
        return (
          r.kind === "fertilisation" ||
          payload.method === "irrigation" ||
          (prog.entries && prog.entries.length > 0)
        );
      });

      // B. Recommandations de Pulvérisation Foliaire
      const foliarRecos = matchingRecos.filter((r) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        const titleLower = (r.title || "").toLowerCase();
        const isPhyto =
          r.kind === "phytosanitaire" ||
          prog.kind === "phytosanitaire" ||
          payload.method === "phytosanitaire" ||
          titleLower.includes("phyto");
        if (isPhyto) return false;
        return (
          payload.method === "pulverisation" ||
          payload.method === "foliaire" ||
          prog.kind === "pulverisation" ||
          titleLower.includes("pulv") ||
          titleLower.includes("foliaire")
        );
      });

      // C. Recommandations Phytosanitaires
      const phytoRecos = matchingRecos.filter((r) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        const titleLower = (r.title || "").toLowerCase();
        return (
          r.kind === "phytosanitaire" ||
          prog.kind === "phytosanitaire" ||
          payload.method === "phytosanitaire" ||
          titleLower.includes("phyto")
        );
      });

      const speciesPeriods: PlannedPeriod[] = [];

      // ==========================================
      // TRAITEMENT 1 : FERTIGATION (SOL & BACS)
      // ==========================================
      const recosByDate: Record<string, Recommendation[]> = {};
      fertRecos.forEach((r) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        const titleMatch = (r.title || "").match(/(\d{4}-\d{2}-\d{2})/);
        const d =
          prog.date ||
          payload.date ||
          titleMatch?.[1] ||
          r.created_at?.slice(0, 10) ||
          "2026-03-09";
        if (!recosByDate[d]) recosByDate[d] = [];
        recosByDate[d].push(r);
      });

      const distinctDates = Object.keys(recosByDate).sort();

      distinctDates.forEach((dateKey, dateIdx) => {
        const dateRecos = recosByDate[dateKey];
        const startDate = dateKey;
        const nextDate = distinctDates[dateIdx + 1];
        let endDate = "";
        const todayStr = new Date().toISOString().slice(0, 10);
        if (nextDate) {
          endDate = addDays(nextDate, -1);
        } else {
          endDate = addDays(startDate, 28);
        }
        const isCurrent = startDate <= todayStr && todayStr <= endDate;

        const sortedSubRecos = [...dateRecos].sort((a, b) => {
          const lA = (a.payload as any)?.program?.label || a.title || "";
          const lB = (b.payload as any)?.program?.label || b.title || "";
          return lA.localeCompare(lB);
        });

        const primaryReco = sortedSubRecos[0];
        const primaryPayload = (primaryReco.payload || {}) as any;
        const primaryProg = primaryPayload.program || {};

        const durationMinutes = parseDurationMinutes(primaryProg.irrigationTime);
        const irrigationTime =
          primaryProg.irrigationTime || (durationMinutes === 90 ? "1h30" : `${durationMinutes}m`);
        const injectionTime = primaryProg.injectionTime ?? 45;
        const rinsingTime = primaryProg.rinsingTime ?? 10;
        const wettingTime = Math.max(0, durationMinutes - injectionTime - rinsingTime);

        const hasMultipleSubProgs = sortedSubRecos.length >= 2;
        const rawFreq = parseFloat(primaryProg.frequency) || 1;
        const isWeeklySingle = crop.id === "pommiers" || (!hasMultipleSubProgs && rawFreq <= 1);

        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();
        const durationDays = Math.max(
          1,
          Math.round((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24)) + 1
        );

        const periodEntries: any[] = [];
        sortedSubRecos.forEach((r) => {
          const rProg = (r.payload as any)?.program || {};
          (rProg.entries || []).forEach((e: any) => {
            let existingBac = periodEntries.find((pe) => pe.bac === e.bac);
            if (!existingBac) {
              existingBac = { bac: e.bac, items: [] };
              periodEntries.push(existingBac);
            }
            (e.items || []).forEach((it: any) => {
              const pName = (it.name || "").trim();
              if (pName && !existingBac.items.some((x: any) => x.name?.trim() === pName)) {
                existingBac.items.push(it);
              }
            });
          });
        });

        const periodObj: PlannedPeriod = {
          speciesId: crop.id,
          speciesName: crop.name,
          recoId: primaryReco.id,
          recoTitle: primaryReco.title,
          reco: primaryReco,
          type: "fertigation",
          startDate,
          endDate,
          isCurrent,
          frequency: isWeeklySingle ? 1 : 2,
          pureIrrigationFrequency: parseFloat(primaryProg.pureIrrigationFrequency ?? "0") || 0,
          pureIrrigationTime: primaryProg.pureIrrigationTime || "1h30",
          irrigationTime,
          durationMinutes,
          injectionTime,
          rinsingTime,
          wettingTime,
          surfaceHa: crop.surfaceHa,
          entries: periodEntries,
          totalPassages: 0,
          durationDays,
        };

        const passDates = getPassDatesForPeriod(startDate, endDate);
        let passCount = 0;

        passDates.forEach((dateStr, intervalIndex) => {
          const dObj = new Date(dateStr);
          const dayOfWeek = isNaN(dObj.getTime()) ? 1 : dObj.getDay();

          const isScheduledThisDay = !isWeeklySingle || intervalIndex % 2 === 0;

          if (isScheduledThisDay) {
            const subProgIdx = hasMultipleSubProgs ? passCount % sortedSubRecos.length : 0;
            const currentSubReco = sortedSubRecos[subProgIdx];
            const currentSubProg = (currentSubReco.payload as any)?.program || {};
            const currentSubEntries = currentSubProg.entries || [];

            const bacsComputed = (currentSubEntries as any[]).map((e: any) => {
              const uniqueItemsMap: Record<
                string,
                { name: string; doseHa: number; unit: string; totalParcel: number }
              > = {};
              (e.items || []).forEach((it: any) => {
                const prodName = (it.name || "").trim();
                if (!prodName) return;
                const normKey = prodName.toLowerCase().replace(/\s+/g, " ");
                const doseHa = parseFloat(String(it.qty || "0").replace(",", ".")) || 0;
                if (!uniqueItemsMap[normKey]) {
                  uniqueItemsMap[normKey] = {
                    name: prodName,
                    doseHa,
                    unit: it.unit || "kg",
                    totalParcel: doseHa * crop.surfaceHa,
                  };
                }
              });
              return {
                bac: e.bac,
                items: Object.values(uniqueItemsMap),
              };
            });

            rawEvents.push({
              date: dateStr,
              dayOfWeek,
              dayName: DAY_NAMES_FR[dayOfWeek],
              speciesId: crop.id,
              speciesName: crop.name,
              cropConfig: crop,
              type: "fertigation",
              periodInfo: periodObj,
              recoTitle: currentSubReco.title || primaryReco.title,
              recoObj: currentSubReco,
              irrigationDuration: currentSubProg.irrigationTime || irrigationTime,
              durationMinutes:
                parseDurationMinutes(currentSubProg.irrigationTime) || durationMinutes,
              wettingTime: currentSubProg.wettingTime ?? wettingTime,
              injectionTime: currentSubProg.injectionTime ?? injectionTime,
              rinsingTime: currentSubProg.rinsingTime ?? rinsingTime,
              bacs: bacsComputed,
              products: [],
            });

            bacsComputed.forEach((b) => {
              b.items.forEach((it) => {
                const prodName = it.name.trim();
                if (!prodName) return;
                const normKey = `fert:${prodName.toLowerCase().replace(/\s+/g, " ")}`;
                if (!productConsolidationMap[normKey]) {
                  productConsolidationMap[normKey] = {
                    name: prodName,
                    category: "fertigation",
                    unit: it.unit,
                    bySpecies: {},
                    totalQty: 0,
                  };
                }
                productConsolidationMap[normKey].bySpecies[crop.id] =
                  (productConsolidationMap[normKey].bySpecies[crop.id] || 0) + it.totalParcel;
                productConsolidationMap[normKey].totalQty += it.totalParcel;
              });
            });

            passCount++;
          }
        });

        periodObj.totalPassages = passCount;
        speciesPeriods.push(periodObj);
      });

      // ==========================================
      // TRAITEMENT 2 : ENGRAIS FOLIAIRES (PULVÉRISATION)
      // ==========================================
      foliarRecos.forEach((r) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        const titleMatch = (r.title || "").match(/(\d{4}-\d{2}-\d{2})/);
        const baseDateStr =
          prog.date ||
          payload.date ||
          titleMatch?.[1] ||
          r.created_at?.slice(0, 10) ||
          "2026-03-09";

        // Étalement agronomique sur la semaine (matinée à la fraîche) :
        // Passage 1 / Pulvérisation 1 -> Jour +1 (ex: Mardi 10 Mars)
        // Passage 2 / Pulvérisation 2 -> Jour +4 (ex: Vendredi 13 Mars)
        let dateStr = baseDateStr;
        const titleLower = (r.title || "").toLowerCase();
        if (titleLower.includes("passage 2") || titleLower.includes("pulvérisation 2") || titleLower.includes("pulverisation 2")) {
          dateStr = addDays(baseDateStr, 4);
        } else if (titleLower.includes("passage 1") || titleLower.includes("pulvérisation 1") || titleLower.includes("pulverisation 1") || titleLower.includes("passage")) {
          dateStr = addDays(baseDateStr, 1);
        }
        const dObj = new Date(dateStr);
        const dayOfWeek = isNaN(dObj.getTime()) ? 1 : dObj.getDay();

        const rawItems = prog.items || payload.items || [];
        const prodsComputed: any[] = [];

        rawItems.forEach((it: any) => {
          const prodName = (it.name || it.product || "").trim();
          if (!prodName) return;
          const doseHa = parseFloat(String(it.qty || it.dosage || "0").replace(",", ".")) || 0;
          const unit = it.unit || "litres";
          const totalParcel = doseHa * crop.surfaceHa;
          prodsComputed.push({
            name: prodName,
            doseHa,
            unit,
            totalParcel,
            note: it.note,
          });

          const normKey = `foliaire:${prodName.toLowerCase().replace(/\s+/g, " ")}`;
          if (!productConsolidationMap[normKey]) {
            productConsolidationMap[normKey] = {
              name: prodName,
              category: "foliaire",
              unit,
              bySpecies: {},
              totalQty: 0,
            };
          }
          productConsolidationMap[normKey].bySpecies[crop.id] =
            (productConsolidationMap[normKey].bySpecies[crop.id] || 0) + totalParcel;
          productConsolidationMap[normKey].totalQty += totalParcel;
        });

        const periodObj: PlannedPeriod = {
          speciesId: crop.id,
          speciesName: crop.name,
          recoId: r.id,
          recoTitle: r.title,
          reco: r,
          type: "pulverisation",
          startDate: dateStr,
          endDate: addDays(dateStr, 7),
          isCurrent:
            dateStr <= new Date().toISOString().slice(0, 10) &&
            new Date().toISOString().slice(0, 10) <= addDays(dateStr, 7),
          frequency: 1,
          pureIrrigationFrequency: 0,
          pureIrrigationTime: "—",
          irrigationTime: "1h30",
          durationMinutes: 90,
          injectionTime: 90,
          rinsingTime: 0,
          wettingTime: 0,
          surfaceHa: crop.surfaceHa,
          entries: [],
          products: prodsComputed,
          totalPassages: 1,
          durationDays: 7,
        };

        speciesPeriods.push(periodObj);

        rawEvents.push({
          date: dateStr,
          dayOfWeek,
          dayName: DAY_NAMES_FR[dayOfWeek],
          speciesId: crop.id,
          speciesName: crop.name,
          cropConfig: crop,
          type: "pulverisation",
          periodInfo: periodObj,
          recoTitle: r.title,
          recoObj: r,
          irrigationDuration: "1h30 (Pulv.)",
          durationMinutes: 90,
          wettingTime: 0,
          injectionTime: 90,
          rinsingTime: 0,
          bacs: [],
          products: prodsComputed,
        });
      });

      // ==========================================
      // TRAITEMENT 3 : PHYTOSANITAIRE (PROTECTION)
      // ==========================================
      phytoRecos.forEach((r) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        const titleMatch = (r.title || "").match(/(\d{4}-\d{2}-\d{2})/);
        const baseDateStr =
          prog.date ||
          payload.date ||
          titleMatch?.[1] ||
          r.created_at?.slice(0, 10) ||
          "2026-03-09";

        // Étalement agronomique des traitements phytosanitaires par espèce (fin d'après-midi) :
        // Pommier Gala One (Traitement 1) -> Jour +2 (ex: Mercredi 11 Mars)
        // Nectarine Nablara & Redix 25 (Traitement 1) -> Jour +3 (ex: Jeudi 12 Mars)
        let dateStr = baseDateStr;
        if (crop.id === "pommiers") {
          dateStr = addDays(baseDateStr, 2);
        } else {
          dateStr = addDays(baseDateStr, 3);
        }
        const dObj = new Date(dateStr);
        const dayOfWeek = isNaN(dObj.getTime()) ? 1 : dObj.getDay();

        const rawProds = prog.products || payload.products || prog.items || [];
        const prodsComputed: any[] = [];

        rawProds.forEach((pItem: any) => {
          const prodName = (pItem.product || pItem.name || "").trim();
          if (!prodName) return;
          const doseMatch = String(pItem.dosage || pItem.qty || "0").match(/([0-9.,]+)/);
          const doseHa = parseFloat((doseMatch?.[1] || "0").replace(",", ".")) || 0;
          const unitMatch = String(pItem.dosage || pItem.unit || "").match(/(litres|l|kg|g)/i);
          const unit = unitMatch
            ? unitMatch[1].toLowerCase().startsWith("k")
              ? "kg"
              : unitMatch[1].toLowerCase().startsWith("g")
              ? "g"
              : "litres"
            : pItem.unit || "litres";
          const totalParcel = doseHa * crop.surfaceHa;

          prodsComputed.push({
            name: prodName,
            doseHa,
            unit,
            totalParcel,
            cible: pItem.cible,
            dar: pItem.dar,
          });

          const normKey = `phyto:${prodName.toLowerCase().replace(/\s+/g, " ")}`;
          if (!productConsolidationMap[normKey]) {
            productConsolidationMap[normKey] = {
              name: prodName,
              category: "phytosanitaire",
              unit,
              bySpecies: {},
              totalQty: 0,
              cible: pItem.cible,
              dar: pItem.dar,
            };
          }
          productConsolidationMap[normKey].bySpecies[crop.id] =
            (productConsolidationMap[normKey].bySpecies[crop.id] || 0) + totalParcel;
          productConsolidationMap[normKey].totalQty += totalParcel;
        });

        const periodObj: PlannedPeriod = {
          speciesId: crop.id,
          speciesName: crop.name,
          recoId: r.id,
          recoTitle: r.title,
          reco: r,
          type: "phyto",
          startDate: dateStr,
          endDate: addDays(dateStr, 7),
          isCurrent:
            dateStr <= new Date().toISOString().slice(0, 10) &&
            new Date().toISOString().slice(0, 10) <= addDays(dateStr, 7),
          frequency: 1,
          pureIrrigationFrequency: 0,
          pureIrrigationTime: "—",
          irrigationTime: "1h30 (Phyto)",
          durationMinutes: 90,
          injectionTime: 90,
          rinsingTime: 0,
          wettingTime: 0,
          surfaceHa: crop.surfaceHa,
          entries: [],
          products: prodsComputed,
          totalPassages: 1,
          durationDays: 7,
        };

        speciesPeriods.push(periodObj);

        rawEvents.push({
          date: dateStr,
          dayOfWeek,
          dayName: DAY_NAMES_FR[dayOfWeek],
          speciesId: crop.id,
          speciesName: crop.name,
          cropConfig: crop,
          type: "phyto",
          periodInfo: periodObj,
          recoTitle: r.title,
          recoObj: r,
          irrigationDuration: "1h30 (Phyto)",
          durationMinutes: 90,
          wettingTime: 0,
          injectionTime: 90,
          rinsingTime: 0,
          bacs: [],
          products: prodsComputed,
        });
      });

      periodsBySpeciesMap[crop.id] = speciesPeriods;
    });

    // 3. Calcul séquentiel des horaires (Station Fertigation, Pulvérisation Matin, Traitement Soir)
    const eventsByDateMap: Record<string, typeof rawEvents> = {};
    rawEvents.forEach((ev) => {
      if (!eventsByDateMap[ev.date]) eventsByDateMap[ev.date] = [];
      eventsByDateMap[ev.date].push(ev);
    });

    const finalEvents: ScheduledDayEvent[] = [];

    Object.keys(eventsByDateMap).sort().forEach((dateKey) => {
      const dayList = eventsByDateMap[dateKey];

      // A. Fertigation séquentielle station
      const fertEvents = dayList.filter((e) => e.type === "fertigation" || e.type === "pure_irrigation");
      const foliarEvents = dayList.filter((e) => e.type === "pulverisation");
      const phytoEvents = dayList.filter((e) => e.type === "phyto");

      const priorityOrder = ["pommiers", "nablara", "redix25", "oliviers"];
      fertEvents.sort(
        (a, b) => priorityOrder.indexOf(a.speciesId) - priorityOrder.indexOf(b.speciesId)
      );

      const hasPommier = fertEvents.some((e) => e.speciesId === "pommiers");
      let currentStationTime = hasPommier ? 5 * 60 : 6 * 60;

      fertEvents.forEach((ev) => {
        const startMin = currentStationTime;
        const endMin = startMin + ev.durationMinutes;
        currentStationTime = endMin;

        finalEvents.push({
          ...ev,
          startHourMinutes: startMin,
          endHourMinutes: endMin,
          hours: `${formatMinutesToHourString(startMin)} - ${formatMinutesToHourString(endMin)}`,
        });
      });

      // B. Pulvérisation foliaire (Matinée à la fraîche)
      let foliarTime = 6 * 60 + 30; // 06h30
      foliarEvents.forEach((ev) => {
        const startMin = foliarTime;
        const endMin = startMin + ev.durationMinutes;
        foliarTime = endMin;

        finalEvents.push({
          ...ev,
          startHourMinutes: startMin,
          endHourMinutes: endMin,
          hours: `${formatMinutesToHourString(startMin)} - ${formatMinutesToHourString(endMin)}`,
        });
      });

      // C. Traitement phytosanitaire (Fin d'après-midi / absence de vent)
      let phytoTime = 17 * 60 + 30; // 17h30
      phytoEvents.forEach((ev) => {
        const startMin = phytoTime;
        const endMin = startMin + ev.durationMinutes;
        phytoTime = endMin;

        finalEvents.push({
          ...ev,
          startHourMinutes: startMin,
          endHourMinutes: endMin,
          hours: `${formatMinutesToHourString(startMin)} - ${formatMinutesToHourString(endMin)}`,
        });
      });
    });

    finalEvents.sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return a.startHourMinutes - b.startHourMinutes;
    });

    return {
      periodsBySpecies: periodsBySpeciesMap,
      allScheduledEvents: finalEvents,
      allProductsConsolidated: Object.values(productConsolidationMap).sort(
        (a, b) => b.totalQty - a.totalQty
      ),
    };
  }, [recos, cropsWithRealSurfaces]);

  // Filtrer par espèce, mois et type de prescription
  const filteredEvents = useMemo(() => {
    return allScheduledEvents.filter((ev) => {
      // 1. Filtre Espèce
      if (selectedSpecies !== "all" && ev.speciesId !== selectedSpecies) return false;

      // 2. Filtre Mois
      if (selectedMonth !== "all") {
        const monthNum = ev.date.slice(5, 7);
        if (monthNum !== selectedMonth) return false;
      }

      // 3. Filtre Type de Prescription
      if (
        selectedPrescriptionType === "fert_irrigation" &&
        ev.type !== "fertigation" &&
        ev.type !== "pure_irrigation"
      ) {
        return false;
      }
      if (selectedPrescriptionType === "fert_foliaire" && ev.type !== "pulverisation") {
        return false;
      }
      if (selectedPrescriptionType === "phytosanitaire" && ev.type !== "phyto") {
        return false;
      }

      return true;
    });
  }, [allScheduledEvents, selectedSpecies, selectedMonth, selectedPrescriptionType]);

  // Synthèse consolidée des intrants calculée dynamiquement sur les événements filtrés
  const consolidatedProductsFiltered = useMemo(() => {
    const map: Record<string, ConsolidatedProduct> = {};

    filteredEvents.forEach((ev) => {
      const mCode = ev.date.slice(5, 7);

      // A. Fertigation (bacs)
      if (ev.type === "fertigation" || ev.type === "pure_irrigation") {
        ev.bacs.forEach((b) => {
          b.items.forEach((it) => {
            const prodName = it.name.trim();
            if (!prodName) return;
            const normKey = `fert:${prodName.toLowerCase().replace(/\s+/g, " ")}`;
            if (!map[normKey]) {
              map[normKey] = {
                name: prodName,
                category: "fertigation",
                unit: it.unit,
                bySpecies: {},
                byMonth: {},
                totalQty: 0,
              };
            }
            map[normKey].bySpecies[ev.speciesId] =
              (map[normKey].bySpecies[ev.speciesId] || 0) + it.totalParcel;
            map[normKey].byMonth = map[normKey].byMonth || {};
            map[normKey].byMonth[mCode] = (map[normKey].byMonth[mCode] || 0) + it.totalParcel;
            map[normKey].totalQty += it.totalParcel;
          });
        });
      }

      // B. Foliaire ou Phyto (products)
      if (ev.type === "pulverisation" || ev.type === "phyto") {
        const cat = ev.type === "pulverisation" ? "foliaire" : "phytosanitaire";
        (ev.products || []).forEach((it) => {
          const prodName = it.name.trim();
          if (!prodName) return;
          const normKey = `${cat}:${prodName.toLowerCase().replace(/\s+/g, " ")}`;
          if (!map[normKey]) {
            map[normKey] = {
              name: prodName,
              category: cat,
              unit: it.unit,
              bySpecies: {},
              byMonth: {},
              totalQty: 0,
              cible: it.cible,
              dar: it.dar,
            };
          }
          map[normKey].bySpecies[ev.speciesId] =
            (map[normKey].bySpecies[ev.speciesId] || 0) + it.totalParcel;
          map[normKey].byMonth = map[normKey].byMonth || {};
          map[normKey].byMonth[mCode] = (map[normKey].byMonth[mCode] || 0) + it.totalParcel;
          map[normKey].totalQty += it.totalParcel;
        });
      }
    });

    return sortProducts(Object.values(map), consolidationSort);
  }, [filteredEvents, consolidationSort]);

  // Synthèse groupée par Espèce avec ventilation mois par mois
  const speciesConsolidation = useMemo(() => {
    return cropsWithRealSurfaces
      .filter((c) => selectedSpecies === "all" || c.id === selectedSpecies)
      .map((crop) => {
        const cropEvents = filteredEvents.filter((e) => e.speciesId === crop.id);
        const map: Record<
          string,
          {
            name: string;
            category: "fertigation" | "foliaire" | "phytosanitaire";
            unit: string;
            totalQty: number;
            byMonth: Record<string, number>;
            cible?: string;
            dar?: string;
          }
        > = {};

        const monthsInCrop = new Set<string>();

        cropEvents.forEach((ev) => {
          const mCode = ev.date.slice(5, 7);
          monthsInCrop.add(mCode);

          if (ev.type === "fertigation" || ev.type === "pure_irrigation") {
            ev.bacs.forEach((b) => {
              b.items.forEach((it) => {
                const prodName = it.name.trim();
                if (!prodName) return;
                const k = `fert:${prodName.toLowerCase().replace(/\s+/g, " ")}`;
                if (!map[k]) {
                  map[k] = {
                    name: prodName,
                    category: "fertigation",
                    unit: it.unit,
                    totalQty: 0,
                    byMonth: {},
                  };
                }
                map[k].totalQty += it.totalParcel;
                map[k].byMonth[mCode] = (map[k].byMonth[mCode] || 0) + it.totalParcel;
              });
            });
          }

          if (ev.type === "pulverisation" || ev.type === "phyto") {
            const cat = ev.type === "pulverisation" ? "foliaire" : "phytosanitaire";
            (ev.products || []).forEach((it) => {
              const prodName = it.name.trim();
              if (!prodName) return;
              const k = `${cat}:${prodName.toLowerCase().replace(/\s+/g, " ")}`;
              if (!map[k]) {
                map[k] = {
                  name: prodName,
                  category: cat,
                  unit: it.unit,
                  totalQty: 0,
                  byMonth: {},
                  cible: it.cible,
                  dar: it.dar,
                };
              }
              map[k].totalQty += it.totalParcel;
              map[k].byMonth[mCode] = (map[k].byMonth[mCode] || 0) + it.totalParcel;
            });
          }
        });

        const sortedProducts = sortProducts(Object.values(map), consolidationSort);
        const sortedMonths = Array.from(monthsInCrop).sort();

        return {
          crop,
          products: sortedProducts,
          months: sortedMonths,
          eventsCount: cropEvents.length,
        };
      });
  }, [cropsWithRealSurfaces, filteredEvents, selectedSpecies, consolidationSort]);

  // Synthèse groupée par Mois avec ventilation espèce par espèce
  const monthConsolidation = useMemo(() => {
    const monthsSet = new Set<string>();
    filteredEvents.forEach((e) => {
      monthsSet.add(e.date.slice(5, 7));
    });

    const sortedMonthCodes = Array.from(monthsSet).sort();

    return sortedMonthCodes.map((mCode) => {
      const monthEvents = filteredEvents.filter((e) => e.date.slice(5, 7) === mCode);
      const map: Record<
        string,
        {
          name: string;
          category: "fertigation" | "foliaire" | "phytosanitaire";
          unit: string;
          totalQty: number;
          bySpecies: Record<string, number>;
          cible?: string;
          dar?: string;
        }
      > = {};

      monthEvents.forEach((ev) => {
        if (ev.type === "fertigation" || ev.type === "pure_irrigation") {
          ev.bacs.forEach((b) => {
            b.items.forEach((it) => {
              const prodName = it.name.trim();
              if (!prodName) return;
              const k = `fert:${prodName.toLowerCase().replace(/\s+/g, " ")}`;
              if (!map[k]) {
                map[k] = {
                  name: prodName,
                  category: "fertigation",
                  unit: it.unit,
                  totalQty: 0,
                  bySpecies: {},
                };
              }
              map[k].totalQty += it.totalParcel;
              map[k].bySpecies[ev.speciesId] =
                (map[k].bySpecies[ev.speciesId] || 0) + it.totalParcel;
            });
          });
        }

        if (ev.type === "pulverisation" || ev.type === "phyto") {
          const cat = ev.type === "pulverisation" ? "foliaire" : "phytosanitaire";
          (ev.products || []).forEach((it) => {
            const prodName = it.name.trim();
            if (!prodName) return;
            const k = `${cat}:${prodName.toLowerCase().replace(/\s+/g, " ")}`;
            if (!map[k]) {
              map[k] = {
                name: prodName,
                category: cat,
                unit: it.unit,
                totalQty: 0,
                bySpecies: {},
                cible: it.cible,
                dar: it.dar,
              };
            }
            map[k].totalQty += it.totalParcel;
            map[k].bySpecies[ev.speciesId] =
              (map[k].bySpecies[ev.speciesId] || 0) + it.totalParcel;
          });
        }
      });

      const sortedProducts = sortProducts(Object.values(map), consolidationSort);

      return {
        monthCode: mCode,
        monthLabel: MONTH_NAMES_FR[mCode] || `Mois ${mCode}`,
        eventsCount: monthEvents.length,
        products: sortedProducts,
      };
    });
  }, [filteredEvents, consolidationSort]);

  // Ensemble dynamique des dates d'introduction de nouvelles recommandations
  const allRecoStartDates = useMemo(() => {
    const dates = new Set<string>();
    Object.values(periodsBySpecies).forEach((ps) => {
      ps.forEach((p) => {
        if (p.startDate) dates.add(p.startDate);
      });
    });
    dates.add("2026-04-20");
    return dates;
  }, [periodsBySpecies]);

  // Construction de la grille type Tableur / Calendrier (Samedi à Vendredi)
  const calendarGridRows = useMemo(() => {
    // Trouver la date min et max
    if (filteredEvents.length === 0) return [];
    const minDate = filteredEvents[0].date;
    const maxDate = filteredEvents[filteredEvents.length - 1].date;

    const rows: Array<{
      date: string;
      dayOfWeek: number;
      dayName: string;
      events: ScheduledDayEvent[];
      summaryLabel: string;
      isPassageDay: boolean;
      isNewRecoDay: boolean;
    }> = [];

    let curr = new Date(minDate);
    const end = new Date(maxDate);

    while (curr <= end) {
      const dStr = curr.toISOString().slice(0, 10);
      const dow = curr.getDay();
      const dayEvents = filteredEvents.filter((e) => e.date === dStr);

      let summaryLabel = "";
      if (dayEvents.length > 0) {
        const typesSet = new Set(
          dayEvents.map((e) =>
            e.type === "fertigation" || e.type === "pure_irrigation"
              ? "Fert."
              : e.type === "pulverisation"
              ? "Foliaire"
              : "Phyto"
          )
        );
        summaryLabel = Array.from(typesSet).join(" + ");
      }

      rows.push({
        date: dStr,
        dayOfWeek: dow,
        dayName: DAY_NAMES_FR[dow],
        events: dayEvents,
        summaryLabel,
        isPassageDay: dayEvents.length > 0,
        isNewRecoDay: allRecoStartDates.has(dStr),
      });

      curr.setDate(curr.getDate() + 1);
    }

    return rows;
  }, [filteredEvents, allRecoStartDates]);

  // Regroupement par semaine pour la vue Cartes
  const eventsByWeek = useMemo(() => {
    const weeksMap: Record<string, { weekLabel: string; events: ScheduledDayEvent[] }> = {};

    filteredEvents.forEach((ev) => {
      const d = new Date(ev.date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().slice(0, 10);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      if (!weeksMap[weekKey]) {
        weeksMap[weekKey] = {
          weekLabel: `Semaine du ${formatDateFr(weekKey)} au ${formatDateFr(
            sunday.toISOString().slice(0, 10)
          )}`,
          events: [],
        };
      }
      weeksMap[weekKey].events.push(ev);
    });

    return Object.entries(weeksMap).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEvents]);

  // Liste des mois disponibles
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    allScheduledEvents.forEach((ev) => {
      monthsSet.add(ev.date.slice(5, 7));
    });
    const monthNames: Record<string, string> = {
      "01": "Janvier",
      "02": "Février",
      "03": "Mars",
      "04": "Avril",
      "05": "Mai",
      "06": "Juin",
      "07": "Juillet",
      "08": "Août",
      "09": "Septembre",
      "10": "Octobre",
      "11": "Novembre",
      "12": "Décembre",
    };
    return Array.from(monthsSet)
      .sort()
      .map((m) => ({
        code: m,
        label: monthNames[m] || `Mois ${m}`,
      }));
  }, [allScheduledEvents]);

  const totalScheduledPassages = filteredEvents.length;

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* 1. Header Banner & Surfaces Réelles de l'Exploitation */}
      <div className="rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  <span>Planning Séquentiel & Calendrier de Distribution Agronomique</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                    Station Hydraulique Séquentielle
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Surfaces réelles étalonnées · Arrosage séquentiel par secteur · Cadence régulière avec
                  intervalles de repos et transition automatique dès l'introduction d'une nouvelle recommandation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs font-bold gap-1.5 shadow-xs"
            >
              <Printer className="h-3.5 w-3.5 text-primary" />
              <span>Imprimer la feuille de route</span>
            </Button>
          </div>
        </div>

        {/* Surfaces réelles de chaque espèce */}
        <div className="grid grid-cols-2 min-[480px]:grid-cols-4 gap-2.5 mt-4 pt-3 border-t">
          {cropsWithRealSurfaces.map((crop) => (
            <div key={crop.id} className="rounded-xl border bg-background/80 p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <span>{crop.icon}</span>
                <span>{crop.name}</span>
              </span>
              <p className="text-sm font-black text-foreground">
                {crop.surfaceHa.toFixed(2)} ha
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                {crop.id === "pommiers"
                  ? "P1 (1 ha) + P2 (1 ha)"
                  : crop.id === "oliviers"
                  ? "Secteur 1 (P1+P2) · Secteur 2 (P3+P4)"
                  : "Surface vérifiée"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Barre de Navigation (Les 4 Vues Agronomiques) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b">
        <button
          type="button"
          onClick={() => setActiveView("grid")}
          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shrink-0 border ${
            activeView === "grid"
              ? "bg-foreground text-background shadow-xs border-foreground"
              : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
          }`}
        >
          <TableIcon className="h-3.5 w-3.5 text-amber-500" />
          <span>Grille Calendrier (Excel)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView("cards")}
          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shrink-0 border ${
            activeView === "cards"
              ? "bg-foreground text-background shadow-xs border-foreground"
              : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
          }`}
        >
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>Fiches Horaires</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView("periods")}
          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shrink-0 border ${
            activeView === "periods"
              ? "bg-foreground text-background shadow-xs border-foreground"
              : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-indigo-500" />
          <span>Paliers & Périodes</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView("consolidation")}
          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shrink-0 border ${
            activeView === "consolidation"
              ? "bg-foreground text-background shadow-xs border-foreground"
              : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>Synthèse Intrants</span>
        </button>
      </div>

      {/* 3. Pont de Filtres Unifié et Réactif : Chaque rubrique sur sa propre ligne dédiée */}
      <div className="rounded-2xl border bg-card/90 p-3.5 sm:p-4 space-y-3 shadow-xs">
        {/* Ligne 0 : Portée d'affichage (Validées uniquement par défaut) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Portée du Planning :</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setOnlyValidated(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shrink-0 ${
                onlyValidated
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-black ring-2 ring-emerald-500/20"
                  : "bg-background text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              <span>✅</span>
              <span>Recommandations Validées uniquement</span>
            </button>
            <button
              type="button"
              onClick={() => setOnlyValidated(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shrink-0 ${
                !onlyValidated
                  ? "bg-foreground text-background border-foreground shadow-xs font-black"
                  : "bg-background text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              <span>📋</span>
              <span>Toutes les prescriptions (inclus prévisions)</span>
            </button>
          </div>
        </div>

        {/* Ligne 1 : Type de Prescription */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground w-40 shrink-0">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>Type de Prescription :</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
            {/* Tous */}
            <button
              type="button"
              onClick={() => setSelectedPrescriptionType("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 border ${
                selectedPrescriptionType === "all"
                  ? "bg-foreground text-background border-foreground shadow-xs font-black"
                  : "bg-background text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              <span>Tous les types</span>
            </button>

            {/* Fert. Irrigation - VERT */}
            <button
              type="button"
              onClick={() => setSelectedPrescriptionType("fert_irrigation")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                selectedPrescriptionType === "fert_irrigation"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-black ring-2 ring-emerald-500/30"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
              }`}
            >
              <span>💧</span>
              <span>Fert. Irrigation</span>
            </button>

            {/* Fert. Foliaire - BLEU */}
            <button
              type="button"
              onClick={() => setSelectedPrescriptionType("fert_foliaire")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                selectedPrescriptionType === "fert_foliaire"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs font-black ring-2 ring-blue-500/30"
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
              }`}
            >
              <span>🌿</span>
              <span>Fert. Foliaire</span>
            </button>

            {/* Phytosanitaire - ORANGE */}
            <button
              type="button"
              onClick={() => setSelectedPrescriptionType("phytosanitaire")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                selectedPrescriptionType === "phytosanitaire"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs font-black ring-2 ring-amber-500/30"
                  : "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
              }`}
            >
              <span>🛡️</span>
              <span>Phytosanitaire</span>
            </button>
          </div>
        </div>

        {/* Ligne 2 : Espèce (Sa propre ligne dédiée sur toute la largeur) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2.5 border-t">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground w-40 shrink-0">
            <span>🌳</span>
            <span>Espèce :</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
            <button
              type="button"
              onClick={() => setSelectedSpecies("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 border ${
                selectedSpecies === "all"
                  ? "bg-foreground text-background border-foreground shadow-xs font-black"
                  : "bg-background text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              <span>🌳</span>
              <span>Toutes les espèces</span>
            </button>
            {cropsWithRealSurfaces.map((crop) => (
              <button
                key={crop.id}
                type="button"
                onClick={() => setSelectedSpecies(crop.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 border ${
                  selectedSpecies === crop.id
                    ? `${crop.badgeBg} border-current shadow-xs font-black`
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                <span>{crop.icon}</span>
                <span>{crop.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({crop.surfaceHa.toFixed(1)} ha)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ligne 3 : Mois (Sa propre ligne dédiée sur toute la largeur) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2.5 border-t">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground w-40 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Mois :</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
            <button
              type="button"
              onClick={() => setSelectedMonth("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 border ${
                selectedMonth === "all"
                  ? "bg-primary text-primary-foreground font-black border-primary shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              Tous les mois
            </button>
            {availableMonths.map((m) => (
              <button
                key={m.code}
                type="button"
                onClick={() => setSelectedMonth(m.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 border ${
                  selectedMonth === m.code
                    ? "bg-primary text-primary-foreground font-black border-primary shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VUE 1 : GRILLE CALENDRIER TYPE TABLEUR EXCEL (IMAGE 5)    */}
      {/* ======================================================== */}
      {activeView === "grid" && (
        <div className="space-y-3">
          <div className="rounded-xl border bg-card p-3 text-xs flex items-center justify-between">
            <span className="font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>Grille de Distribution Hebdomadaire (Cycle de Printemps)</span>
            </span>
            <span className="text-[11px] font-bold text-muted-foreground">
              Colonnes : Samedi ➔ Vendredi · Lignes : Dates chronologiques
            </span>
          </div>

          <div className="border rounded-2xl bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] table-fixed text-xs text-left border-collapse">
                <thead className="bg-muted/70 text-[11px] font-black uppercase text-foreground border-b text-center">
                  <tr>
                    <th className="p-2.5 border-r w-28 text-left bg-muted/90 shrink-0">Date</th>
                    <th className="p-2.5 border-r">Samedi</th>
                    <th className="p-2.5 border-r">Dimanche</th>
                    <th className="p-2.5 border-r">Lundi</th>
                    <th className="p-2.5 border-r">Mardi</th>
                    <th className="p-2.5 border-r">Mercredi</th>
                    <th className="p-2.5 border-r">Jeudi</th>
                    <th className="p-2.5">Vendredi</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {calendarGridRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        <div className="max-w-md mx-auto space-y-2">
                          <p className="font-bold text-sm text-foreground">🌱 Aucun programme validé à afficher</p>
                          <p className="text-xs">
                            Tous les programmes précédents et achats ont été réinitialisés. Rendez-vous dans l'onglet <strong>Recommandations</strong> pour valider la 1ère recommandation (09 Mars 2026).
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    calendarGridRows.map((row, idx) => {
                      const daysOfWeekCols = [6, 0, 1, 2, 3, 4, 5]; // samedi (6), Dimanche (0), lundi (1), mardi (2), mercredi (3), jeudi (4), vendredi (5)

                      return (
                        <tr
                          key={row.date}
                          className={`transition ${
                            row.isPassageDay
                              ? "bg-amber-400/15 dark:bg-amber-500/10 hover:bg-amber-400/25"
                              : row.isNewRecoDay
                              ? "bg-indigo-500/10 hover:bg-indigo-500/15 font-bold"
                              : idx % 2 === 0
                              ? "bg-background"
                              : "bg-muted/10"
                          }`}
                        >
                        <td className="p-2.5 border-r font-bold text-foreground bg-muted/30">
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs font-bold leading-tight whitespace-nowrap">
                              {formatDateFr(row.date)}
                            </span>
                            {row.isNewRecoDay && (
                              <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded leading-none">
                                New Reco
                              </span>
                            )}
                          </div>
                        </td>

                        {daysOfWeekCols.map((colDay) => {
                          const isCurrentDayCol = row.dayOfWeek === colDay;
                          if (!isCurrentDayCol) {
                            return <td key={colDay} className="p-2 border-r bg-muted/5 text-center text-muted-foreground/30">—</td>;
                          }

                          if (row.isPassageDay) {
                            return (
                              <td
                                key={colDay}
                                className="p-2 border-r bg-muted/20 text-center font-medium"
                              >
                                <div className="space-y-1.5">
                                  {/* Badges de types d'interventions aux couleurs requises */}
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {Array.from(new Set(row.events.map((e) => e.type))).map((t) => {
                                      if (t === "fertigation" || t === "pure_irrigation") {
                                        return (
                                          <span
                                            key={t}
                                            className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                          >
                                            💧 Fert
                                          </span>
                                        );
                                      }
                                      if (t === "pulverisation") {
                                        return (
                                          <span
                                            key={t}
                                            className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                                          >
                                            🌿 Foliaire
                                          </span>
                                        );
                                      }
                                      return (
                                        <span
                                          key={t}
                                          className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30"
                                        >
                                          🛡️ Phyto
                                        </span>
                                      );
                                    })}
                                  </div>

                                  {/* Détail par espèce, horaires séquentiels et mention exacte du programme */}
                                  <div className="space-y-1">
                                    {row.events.map((ev, evIdx) => {
                                      const badge = getEventBadgeInfo(ev);
                                      return (
                                        <div
                                          key={evIdx}
                                          className="bg-background/95 px-2 py-1 rounded border shadow-2xs font-mono font-bold text-[9px] flex flex-col gap-0.5 text-left"
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="flex items-center gap-0.5">
                                              <span>{ev.cropConfig.icon}</span>
                                              <span className="font-extrabold text-[9.5px]">
                                                {ev.speciesId === "pommiers"
                                                  ? "Pom"
                                                  : ev.speciesId === "nablara"
                                                  ? "Nab"
                                                  : ev.speciesId === "redix25"
                                                  ? "Red"
                                                  : "Oli"}
                                              </span>
                                            </span>
                                            <span className="text-muted-foreground text-[8.5px] whitespace-nowrap">{ev.hours}</span>
                                          </div>
                                          <div className="flex items-center justify-start mt-0.5">
                                            <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded border leading-none ${badge.tone}`}>
                                              {badge.text}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={colDay} className="p-2.5 border-r text-center text-muted-foreground/60 text-[11px]">
                              Repos
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VUE 2 : FICHES HORAIRES DÉTAILLÉES (AVEC BACS & DOSES)    */}
      {/* ======================================================== */}
      {activeView === "cards" && (
        <div className="space-y-4">
          {eventsByWeek.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <span className="text-3xl block">📋</span>
              <h4 className="font-bold text-sm text-foreground">
                Aucune intervention programmée pour cette sélection
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Toutes les recommandations de l'espace Ingénieur sont automatiquement planifiées ici.
              </p>
            </Card>
          ) : (
            eventsByWeek.map(([weekKey, weekData]) => (
              <div key={weekKey} className="border rounded-2xl bg-card overflow-hidden shadow-xs">
                {/* En-tête de la Semaine */}
                <div className="bg-muted/60 px-4 py-2.5 border-b flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-black text-xs sm:text-sm text-foreground">
                      {weekData.weekLabel}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-background border text-muted-foreground">
                    {weekData.events.length} passages séquentiels
                  </span>
                </div>

                {/* Grille des Jours de la Semaine */}
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {weekData.events.map((event, evIdx) => (
                    <div
                      key={evIdx}
                      className="rounded-xl border p-3 space-y-2 bg-card border-border hover:shadow-xs transition-all"
                    >
                      {/* En-tête du passage avec badge coloré selon le type */}
                      <div className="flex items-start justify-between gap-1.5 border-b pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl">{event.cropConfig.icon}</span>
                          <div>
                            <span className="font-black text-xs block text-foreground">
                              {event.dayName} {formatDateFr(event.date)}
                            </span>
                            <span className="text-[10px] font-extrabold text-primary block">
                              {event.cropConfig.name} ({(event.cropConfig.surfaceHa ?? event.cropConfig.fallbackSurface).toFixed(2)} ha)
                            </span>
                          </div>
                        </div>

                        {/* Badges de Prescription aux couleurs requises */}
                        {event.type === "fertigation" && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shrink-0">
                            💧 Fert. Irrigation
                          </span>
                        )}
                        {event.type === "pure_irrigation" && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
                            💧 Irrigation Seule
                          </span>
                        )}
                        {event.type === "pulverisation" && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 shrink-0">
                            🌿 Fert. Foliaire
                          </span>
                        )}
                        {event.type === "phyto" && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 shrink-0">
                            🛡️ Phytosanitaire
                          </span>
                        )}
                      </div>

                      {/* --- TYPE 1 : FERTIGATION (Bacs & Pompe) --- */}
                      {(event.type === "fertigation" || event.type === "pure_irrigation") && (
                        <>
                          <div className="rounded-lg bg-muted/40 p-2 text-[10px] space-y-1">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3 text-primary" />
                                <span>Créneau pompe :</span>
                              </span>
                              <span className="text-foreground font-black font-mono text-[11px]">
                                {event.hours} ({event.irrigationDuration})
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border/50 text-center font-semibold">
                              <span className="text-muted-foreground">
                                Mouillage: <b className="text-foreground">{event.wettingTime}m</b>
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                Injection: <b>{event.injectionTime}m</b>
                              </span>
                              <span className="text-muted-foreground">
                                Rinçage: <b className="text-foreground">{event.rinsingTime}m</b>
                              </span>
                            </div>
                          </div>

                          {event.bacs.length > 0 && (
                            <div className="space-y-1.5 pt-0.5">
                              {event.bacs.map((bacEntry) => (
                                <div
                                  key={bacEntry.bac}
                                  className="rounded-lg border p-2 bg-background space-y-1 text-xs"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-black text-[10px] uppercase text-primary flex items-center gap-1">
                                      <span>🧪</span>
                                      <span>Bac {bacEntry.bac}</span>
                                    </span>
                                    <span className="text-[9px] text-muted-foreground font-semibold">
                                      Quantité totale injectée
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    {bacEntry.items.map((it, itIdx) => (
                                      <div
                                        key={itIdx}
                                        className="flex items-center justify-between text-[11px] border-b border-border/40 pb-0.5 last:border-0 last:pb-0"
                                      >
                                        <span className="font-medium text-foreground">{it.name}</span>
                                        <div className="text-right">
                                          <span className="font-black text-emerald-700 dark:text-emerald-300">
                                            {it.totalParcel.toFixed(1)} {it.unit}
                                          </span>
                                          <span className="text-[9px] text-muted-foreground block">
                                            ({it.doseHa} {it.unit}/ha × {(event.cropConfig.surfaceHa ?? event.cropConfig.fallbackSurface).toFixed(2)} ha)
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* --- TYPE 2 : FERTILISATION FOLIAIRE --- */}
                      {event.type === "pulverisation" && (
                        <>
                          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-[10px] space-y-1">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-blue-900 dark:text-blue-200 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-blue-600" />
                                <span>Pulvérisation à la fraîche :</span>
                              </span>
                              <span className="text-blue-950 dark:text-blue-100 font-black font-mono text-[11px]">
                                {event.hours} (Matinée)
                              </span>
                            </div>
                            <p className="text-[10px] text-blue-800 dark:text-blue-300">
                              Application foliaire optimale avant la montée des températures.
                            </p>
                          </div>

                          <div className="rounded-lg border border-blue-500/20 bg-background p-2 space-y-1.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-black text-[10px] uppercase text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                <span>🌿</span>
                                <span>Bouillie & Produits Foliaires</span>
                              </span>
                              <span className="text-[9px] text-muted-foreground font-semibold">
                                Total pour {(event.cropConfig.surfaceHa ?? event.cropConfig.fallbackSurface).toFixed(2)} ha
                              </span>
                            </div>

                            <div className="space-y-1">
                              {(event.products || []).map((it, itIdx) => (
                                <div
                                  key={itIdx}
                                  className="flex items-center justify-between text-[11px] border-b border-border/40 pb-0.5 last:border-0 last:pb-0"
                                >
                                  <div>
                                    <span className="font-medium text-foreground block">{it.name}</span>
                                    {it.note && (
                                      <span className="text-[9px] text-muted-foreground block">{it.note}</span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-black text-blue-700 dark:text-blue-300">
                                      {it.totalParcel.toFixed(1)} {it.unit}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground block">
                                      ({it.doseHa} {it.unit}/ha × {(event.cropConfig.surfaceHa ?? event.cropConfig.fallbackSurface).toFixed(2)} ha)
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* --- TYPE 3 : PHYTOSANITAIRE --- */}
                      {event.type === "phyto" && (
                        <>
                          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[10px] space-y-1">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-amber-900 dark:text-amber-200 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>Traitement Crépusculaire :</span>
                              </span>
                              <span className="text-amber-950 dark:text-amber-100 font-black font-mono text-[11px]">
                                {event.hours} (Soirée)
                              </span>
                            </div>
                            <p className="text-[10px] text-amber-800 dark:text-amber-300">
                              Traitement en soirée / conditions de vent calme (&lt; 15 km/h).
                            </p>
                          </div>

                          <div className="rounded-lg border border-amber-500/20 bg-background p-2 space-y-1.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-black text-[10px] uppercase text-amber-800 dark:text-amber-200 flex items-center gap-1">
                                <span>🛡️</span>
                                <span>Produits de Protection</span>
                              </span>
                              <span className="text-[9px] text-muted-foreground font-semibold">
                                Total pour {(event.cropConfig.surfaceHa ?? event.cropConfig.fallbackSurface).toFixed(2)} ha
                              </span>
                            </div>

                            <div className="space-y-1">
                              {(event.products || []).map((it, itIdx) => (
                                <div
                                  key={itIdx}
                                  className="flex items-center justify-between text-[11px] border-b border-border/40 pb-0.5 last:border-0 last:pb-0"
                                >
                                  <div>
                                    <span className="font-medium text-foreground block">{it.name}</span>
                                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                      {it.cible && <span>Cible: <b>{it.cible}</b></span>}
                                      {it.dar && <span>DAR: <b>{it.dar}</b></span>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-black text-amber-800 dark:text-amber-200">
                                      {it.totalParcel.toFixed(1)} {it.unit}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground block">
                                      ({it.doseHa} {it.unit}/ha × {(event.cropConfig.surfaceHa ?? event.cropConfig.fallbackSurface).toFixed(2)} ha)
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Source Recommandation cliquable */}
                      <div className="pt-1 flex justify-between items-center text-[10px] text-muted-foreground border-t">
                        <span className="truncate max-w-[170px]" title={event.recoTitle}>
                          📋 {event.recoTitle}
                        </span>
                        {onSelectReco && (event.periodInfo?.reco || event.recoObj) && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetReco = event.periodInfo?.reco || event.recoObj;
                              if (targetReco) onSelectReco(targetReco);
                            }}
                            className="text-primary hover:underline font-bold flex items-center gap-0.5"
                          >
                            <span>Détails</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VUE 3 : PALIERS & PÉRIODES DE RECOMMANDATION             */}
      {/* ======================================================== */}
      {activeView === "periods" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              Chaque recommandation reste active jusqu'à la veille de l'entrée en vigueur de la suivante.
              Par exemple, la recommandation du 09 Mars s'applique sur 3 passages (9, 12, 15 mars), puis
              s'arrête net le 16 mars au soir pour céder la place à la nouvelle recommandation du 17 Mars.
            </span>
          </div>

          {/* Sélecteur direct d'espèce pour les Paliers & Périodes */}
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/40 rounded-2xl border shadow-2xs">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 pl-1">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span>Afficher les paliers pour :</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedSpecies("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                selectedSpecies === "all"
                  ? "bg-foreground text-background shadow-xs border-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              🌳 Toutes les espèces ({Object.values(periodsBySpecies).reduce((sum, p) => sum + p.length, 0)} paliers)
            </button>

            {cropsWithRealSurfaces.map((c) => {
              const pList = periodsBySpecies[c.id] || [];
              const has20Avr = pList.some((p) => p.startDate === "2026-04-20");
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedSpecies(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                    selectedSpecies === c.id
                      ? `${c.badgeBg} border-current shadow-xs`
                      : "bg-background text-muted-foreground hover:bg-muted border-border"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({pList.length} paliers)</span>
                  {has20Avr && (
                    <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-full font-black animate-pulse">
                      20 Avr ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {cropsWithRealSurfaces
            .filter((c) => selectedSpecies === "all" || c.id === selectedSpecies)
            .map((crop) => {
              const cropPeriodsRaw = periodsBySpecies[crop.id] || [];
              const cropPeriods = cropPeriodsRaw.filter((p) => {
                // 1. Filtre type de prescription
                if (
                  selectedPrescriptionType === "fert_irrigation" &&
                  p.type &&
                  p.type !== "fertigation"
                ) {
                  return false;
                }
                if (
                  selectedPrescriptionType === "fert_foliaire" &&
                  p.type !== "pulverisation"
                ) {
                  return false;
                }
                if (
                  selectedPrescriptionType === "phytosanitaire" &&
                  p.type !== "phyto"
                ) {
                  return false;
                }

                // 2. Filtre mois
                if (selectedMonth !== "all") {
                  const sMonth = p.startDate.slice(5, 7);
                  const eMonth = p.endDate.slice(5, 7);
                  if (sMonth > selectedMonth || eMonth < selectedMonth) return false;
                }

                return true;
              });

              const has20AvrInCrop = cropPeriods.some((p) => p.startDate === "2026-04-20");

              return (
                <div key={crop.id} className="border rounded-2xl bg-card overflow-hidden shadow-xs">
                  <div className="bg-muted/40 px-4 py-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{crop.icon}</span>
                      <div>
                        <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                          <span>{crop.name}</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            (Surface : {crop.surfaceHa.toFixed(2)} ha)
                          </span>
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Créneau pompe séquentiel :{" "}
                          <span className="font-mono font-bold text-foreground">
                            {crop.id === "pommiers"
                              ? "05h00 - 06h30"
                              : crop.id === "nablara"
                              ? "06h30 - 08h00 (ou 06h00 si pas de pommier)"
                              : "08h00 - 09h30 (ou 07h30)"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {has20AvrInCrop && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                          ✨ Palier 20 Avril Inclus
                        </span>
                      )}
                      <span className="text-xs font-bold text-muted-foreground">
                        {cropPeriods.length} palier(s)
                      </span>
                    </div>
                  </div>

                  {/* Note explicative spécifique pour Pommier Gala One */}
                  {crop.id === "pommiers" && !has20AvrInCrop && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <Info className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        <b>Note agronomique Pommier Gala One :</b> La recommandation du 1er Avril est restée en vigueur continue jusqu'au 5 Mai (35 jours · 7 passages).
                        La recommandation du <b>20 Avril</b> a été introduite spécifiquement pour les <b>Nectarines (Nablara & Redix® 25)</b>.
                      </span>
                    </div>
                  )}

                  {cropPeriods.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Aucune recommandation active pour {crop.name} avec les filtres sélectionnés.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border border-gray-300 dark:border-border border-collapse">
                        <thead className="bg-gray-200 dark:bg-muted text-[11px] font-bold uppercase tracking-wider text-black dark:text-foreground border-b border-gray-300 dark:border-border">
                          <tr>
                            <th className="p-3 border-r border-gray-300 dark:border-border font-bold">STATUT & PÉRIODE D'EFFET</th>
                            <th className="p-3 border-r border-gray-300 dark:border-border font-bold">CRÉNEAU & APPLICATION</th>
                            <th className="p-3 border-r border-gray-300 dark:border-border font-bold">FORMULE PRESCRITE (DOSES/HA)</th>
                            <th className="p-3 text-center border-r border-gray-300 dark:border-border font-bold">PASSAGES</th>
                            <th className="p-3 text-center font-bold">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-border">
                          {cropPeriods.map((period, pIdx) => {
                            return (
                              <tr
                                key={pIdx}
                                className="hover:bg-muted/10 transition border-b border-gray-200 dark:border-border"
                              >
                                <td className="p-3 border-r border-gray-200 dark:border-border align-top">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground flex items-center gap-1">
                                        <span>{crop.icon}</span>
                                        <span>{crop.name}</span>
                                      </span>

                                      {/* Badges de Prescription aux couleurs requises */}
                                      {(period.type === "fertigation" || !period.type) && (
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                          💧 FERT. IRRIGATION
                                        </span>
                                      )}
                                      {period.type === "pulverisation" && (
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                          🌿 FERT. FOLIAIRE
                                        </span>
                                      )}
                                      {period.type === "phyto" && (
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30">
                                          🛡️ PHYTOSANITAIRE
                                        </span>
                                      )}

                                      {period.isCurrent && (period.reco?.status === "acceptee" || period.reco?.status === "transferee") ? (
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                          <span>EN COURS</span>
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                                          PALIER {pIdx + 1}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-extrabold text-foreground">
                                      Du {formatDateFr(period.startDate)} au {formatDateFr(period.endDate)}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground block">
                                      {period.durationDays} jours · {period.totalPassages} passage(s)
                                    </span>
                                    {period.recoTitle && (
                                      <span className="text-[10px] text-muted-foreground/80 block truncate max-w-xs" title={period.recoTitle}>
                                        📋 {period.recoTitle}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="p-3 border-r border-gray-200 dark:border-border align-top font-bold">
                                  {period.type === "pulverisation" ? (
                                    <>
                                      <span className="font-mono text-xs text-blue-600 dark:text-blue-400 block">
                                        06h30 - 08h30 (Matinée)
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5 font-normal">
                                        Pulvérisation foliaire à la fraîche
                                      </span>
                                    </>
                                  ) : period.type === "phyto" ? (
                                    <>
                                      <span className="font-mono text-xs text-amber-600 dark:text-amber-400 block">
                                        17h30 - 19h30 (Soirée)
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5 font-normal">
                                        Traitement crépusculaire (vent faible)
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-mono text-xs text-primary block">
                                        {crop.id === "pommiers"
                                          ? "05h00 - 06h30"
                                          : crop.id === "nablara"
                                          ? "06h30 - 08h00 (ou 06h00)"
                                          : "08h00 - 09h30 (ou 07h30)"}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5 font-normal">
                                        Durée: {period.irrigationTime} (Mouil. {period.wettingTime}m + Inj. {period.injectionTime}m + Rinc. {period.rinsingTime}m)
                                      </span>
                                    </>
                                  )}
                                </td>

                                <td className="p-3 border-r border-gray-200 dark:border-border align-top">
                                  {period.entries && period.entries.length > 0 ? (
                                    <div className="space-y-1.5 max-w-md">
                                      {period.entries.map((e) => (
                                        <div key={e.bac} className="text-[11px] leading-relaxed">
                                          <span className="font-extrabold text-foreground uppercase text-[10px]">
                                            BAC {e.bac} :
                                          </span>{" "}
                                          <span className="text-foreground/90 font-medium">
                                            {e.items
                                              .map((it) => `${it.name} (${it.qty} ${it.unit}/ha)`)
                                              .join(", ")}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : period.products && period.products.length > 0 ? (
                                    <div className="space-y-1.5 max-w-md text-[11px]">
                                      {period.products.map((p, pidx) => (
                                        <div
                                          key={pidx}
                                          className="flex items-start justify-between gap-2 border-b border-border/30 pb-0.5 last:border-0 last:pb-0"
                                        >
                                          <div>
                                            <span className="font-bold text-foreground block">{p.name}</span>
                                            {(p.cible || p.dar) && (
                                              <span className="text-[9px] text-muted-foreground block">
                                                {p.cible ? `Cible: ${p.cible}` : ""} {p.dar ? `· DAR: ${p.dar}` : ""}
                                              </span>
                                            )}
                                          </div>
                                          <span className="font-bold text-muted-foreground shrink-0 text-right">
                                            {p.doseHa} {p.unit}/ha
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">
                                      Irrigation pure (sans fertilisation)
                                    </span>
                                  )}
                                </td>

                                <td className="p-3 border-r border-gray-200 dark:border-border align-middle text-center">
                                  <span className="font-black text-sm text-foreground">
                                    {period.totalPassages}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    passages sur la période
                                  </span>
                                </td>

                                <td className="p-3 align-middle text-center">
                                  {onSelectReco && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onSelectReco(period.reco)}
                                      className="text-xs font-bold gap-1 text-primary hover:bg-primary/10"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>Voir Reco</span>
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ======================================================== */}
      {/* VUE 4 : SYNTHÈSE CONSOLIDÉE DES BESOINS D'INTRANTS      */}
      {/* ======================================================== */}
      {activeView === "consolidation" && (
        <div className="space-y-4">
          {/* En-tête avec KPIs */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                  <span>🧪 Synthèse Consolidée des Intrants</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                    Surfaces Réelles Vérifiées
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calcul mathématique exact basé sur les surfaces réelles enregistrées dans vos fiches parcelles :
                  <b> 2 ha pour Pommier</b>, <b>2 ha pour Nablara</b>, <b>2 ha pour Redix 25</b>, et <b>8 ha pour Oliviers</b>.
                </p>
              </div>

              {(selectedSpecies !== "all" || selectedMonth !== "all" || selectedPrescriptionType !== "all") && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  Filtres actifs : {consolidatedProductsFiltered.length} produit(s)
                </span>
              )}
            </div>

            {/* Cartes KPI aux 3 couleurs imposées */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
                <span className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                  <span>💧</span>
                  <span>Fert. Irrigation (Sol)</span>
                </span>
                <p className="text-lg font-black text-emerald-950 dark:text-emerald-100">
                  {consolidatedProductsFiltered.filter((p) => p.category === "fertigation").length} produit(s)
                </p>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                  Bacs A, B, C, D séquentiels
                </span>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 space-y-1">
                <span className="text-[11px] font-black uppercase text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
                  <span>🌿</span>
                  <span>Fert. Foliaire</span>
                </span>
                <p className="text-lg font-black text-blue-950 dark:text-blue-100">
                  {consolidatedProductsFiltered.filter((p) => p.category === "foliaire").length} produit(s)
                </p>
                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold block">
                  Pulvérisations matinales à la fraîche
                </span>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                <span className="text-[11px] font-black uppercase text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Phytosanitaire</span>
                </span>
                <p className="text-lg font-black text-amber-950 dark:text-amber-100">
                  {consolidatedProductsFiltered.filter((p) => p.category === "phytosanitaire").length} produit(s)
                </p>
                <span className="text-[10px] text-amber-800 dark:text-amber-200 font-semibold block">
                  Traitements crépusculaires & DAR
                </span>
              </div>
            </div>
          </div>

          {/* Barre de Commande : Grouper par (Espèce / Mois / Matrice) & Trier par Ordre */}
          <div className="rounded-2xl border bg-card p-3 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 shadow-xs">
            {/* 1. Sélecteur de Regroupement */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-[11px] font-bold text-muted-foreground shrink-0 pr-1 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Grouper par :</span>
              </span>

              <button
                type="button"
                onClick={() => setConsolidationGrouping("by_species")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                  consolidationGrouping === "by_species"
                    ? "bg-foreground text-background border-foreground shadow-xs font-black"
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                <span>🌳</span>
                <span>Trier par Espèce</span>
              </button>

              <button
                type="button"
                onClick={() => setConsolidationGrouping("by_month")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                  consolidationGrouping === "by_month"
                    ? "bg-foreground text-background border-foreground shadow-xs font-black"
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                <span>📅</span>
                <span>Trier par Mois</span>
              </button>

              <button
                type="button"
                onClick={() => setConsolidationGrouping("matrix")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                  consolidationGrouping === "matrix"
                    ? "bg-foreground text-background border-foreground shadow-xs font-black"
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                <span>📊</span>
                <span>Matrice Globale</span>
              </button>
            </div>

            {/* 2. Ordre de Tri */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none self-start md:self-auto">
              <span className="text-[11px] font-bold text-muted-foreground shrink-0 pr-1 flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                <span>Ordre :</span>
              </span>

              <button
                type="button"
                onClick={() => setConsolidationSort("qty_desc")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 border ${
                  consolidationSort === "qty_desc"
                    ? "bg-primary text-primary-foreground font-black"
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                Quantité ⬇
              </button>
              <button
                type="button"
                onClick={() => setConsolidationSort("name_asc")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 border ${
                  consolidationSort === "name_asc"
                    ? "bg-primary text-primary-foreground font-black"
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                Nom A-Z
              </button>
              <button
                type="button"
                onClick={() => setConsolidationSort("category")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 border ${
                  consolidationSort === "category"
                    ? "bg-primary text-primary-foreground font-black"
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                Type
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MODE 1 : SYNTHÈSE GROUPÉE PAR ESPÈCE (AVEC DÉTAIL PAR MOIS) */}
          {/* ======================================================== */}
          {consolidationGrouping === "by_species" && (
            <div className="space-y-4">
              {speciesConsolidation.map((item) => (
                <div key={item.crop.id} className="border rounded-2xl bg-card overflow-hidden shadow-xs">
                  {/* En-tête de l'Espèce */}
                  <div className="bg-muted/40 px-4 py-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.crop.icon}</span>
                      <div>
                        <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                          <span>{item.crop.name}</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            (Surface réelle : {item.crop.surfaceHa.toFixed(2)} ha)
                          </span>
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          {item.eventsCount} passages programmés · {item.products.length} produit(s) prescrit(s)
                        </span>
                      </div>
                    </div>

                    {/* Mois concernés */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.months.map((m) => (
                        <span
                          key={m}
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-background border text-primary"
                        >
                          {MONTH_NAMES_FR[m] || m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tableau des produits de cette espèce ventilés par mois */}
                  {item.products.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Aucun intrant programmé pour {item.crop.name} avec les filtres sélectionnés.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-muted/30 text-[10px] uppercase font-black text-muted-foreground border-b">
                          <tr>
                            <th className="p-3">Produit & Spécifications</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Unité</th>
                            {item.months.map((m) => (
                              <th key={m} className="p-3 text-right">
                                {MONTH_NAMES_FR[m] || m}
                              </th>
                            ))}
                            <th className="p-3 text-right bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 font-black">
                              Total {item.crop.name}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {item.products.map((prod, pIdx) => (
                            <tr key={pIdx} className="hover:bg-muted/10 transition">
                              <td className="p-3 font-extrabold text-foreground">
                                <div>
                                  <span className="block font-black">{prod.name}</span>
                                  {(prod.cible || prod.dar) && (
                                    <span className="text-[10px] text-muted-foreground block font-normal">
                                      {prod.cible ? `Cible: ${prod.cible}` : ""} {prod.dar ? `· DAR: ${prod.dar}` : ""}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-3">
                                {prod.category === "fertigation" && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 whitespace-nowrap">
                                    💧 Fert. Irrigation
                                  </span>
                                )}
                                {prod.category === "foliaire" && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 whitespace-nowrap">
                                    🌿 Fert. Foliaire
                                  </span>
                                )}
                                {prod.category === "phytosanitaire" && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 whitespace-nowrap">
                                    🛡️ Phyto
                                  </span>
                                )}
                              </td>

                              <td className="p-3 text-muted-foreground font-semibold">{prod.unit}</td>

                              {item.months.map((m) => (
                                <td key={m} className="p-3 text-right font-medium">
                                  {prod.byMonth[m] ? `${prod.byMonth[m].toFixed(1)} ${prod.unit}` : "—"}
                                </td>
                              ))}

                              <td className="p-3 text-right font-black bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-sm">
                                {prod.totalQty.toFixed(1)} {prod.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 2 : SYNTHÈSE GROUPÉE PAR MOIS (AVEC DÉTAIL PAR ESPÈCE) */}
          {/* ======================================================== */}
          {consolidationGrouping === "by_month" && (
            <div className="space-y-4">
              {monthConsolidation.length === 0 ? (
                <div className="border rounded-2xl bg-card p-8 text-center text-xs text-muted-foreground">
                  Aucun intrant programmé pour les filtres sélectionnés.
                </div>
              ) : (
                monthConsolidation.map((mGroup) => (
                  <div key={mGroup.monthCode} className="border rounded-2xl bg-card overflow-hidden shadow-xs">
                    {/* En-tête du Mois */}
                    <div className="bg-muted/40 px-4 py-3 border-b flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-black text-sm text-foreground">
                            <span>Mois de {mGroup.monthLabel} 2026</span>
                          </h4>
                          <span className="text-[11px] text-muted-foreground">
                            {mGroup.eventsCount} passages programmés · {mGroup.products.length} produit(s)
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {mGroup.products.length} intrants au programme
                      </span>
                    </div>

                    {/* Tableau des produits du mois */}
                    {mGroup.products.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        Aucun intrant programmé en {mGroup.monthLabel}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-muted/30 text-[10px] uppercase font-black text-muted-foreground border-b">
                            <tr>
                              <th className="p-3">Produit & Spécifications</th>
                              <th className="p-3">Type</th>
                              <th className="p-3">Unité</th>
                              <th className="p-3 text-right">🍎 Pommiers (2 ha)</th>
                              <th className="p-3 text-right">🍑 Nablara (2 ha)</th>
                              <th className="p-3 text-right">🍑 Redix 25 (2 ha)</th>
                              <th className="p-3 text-right">🫒 Oliviers (8 ha)</th>
                              <th className="p-3 text-right bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 font-black">
                                Total {mGroup.monthLabel}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {mGroup.products.map((prod, pIdx) => (
                              <tr key={pIdx} className="hover:bg-muted/10 transition">
                                <td className="p-3 font-extrabold text-foreground">
                                  <div>
                                    <span className="block font-black">{prod.name}</span>
                                    {(prod.cible || prod.dar) && (
                                      <span className="text-[10px] text-muted-foreground block font-normal">
                                        {prod.cible ? `Cible: ${prod.cible}` : ""} {prod.dar ? `· DAR: ${prod.dar}` : ""}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="p-3">
                                  {prod.category === "fertigation" && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 whitespace-nowrap">
                                      💧 Fert. Irrigation
                                    </span>
                                  )}
                                  {prod.category === "foliaire" && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 whitespace-nowrap">
                                      🌿 Fert. Foliaire
                                    </span>
                                  )}
                                  {prod.category === "phytosanitaire" && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 whitespace-nowrap">
                                      🛡️ Phyto
                                    </span>
                                  )}
                                </td>

                                <td className="p-3 text-muted-foreground font-semibold">{prod.unit}</td>

                                <td className="p-3 text-right font-medium">
                                  {prod.bySpecies["pommiers"]
                                    ? `${prod.bySpecies["pommiers"].toFixed(1)} ${prod.unit}`
                                    : "—"}
                                </td>
                                <td className="p-3 text-right font-medium">
                                  {prod.bySpecies["nablara"]
                                    ? `${prod.bySpecies["nablara"].toFixed(1)} ${prod.unit}`
                                    : "—"}
                                </td>
                                <td className="p-3 text-right font-medium">
                                  {prod.bySpecies["redix25"]
                                    ? `${prod.bySpecies["redix25"].toFixed(1)} ${prod.unit}`
                                    : "—"}
                                </td>
                                <td className="p-3 text-right font-medium">
                                  {prod.bySpecies["oliviers"]
                                    ? `${prod.bySpecies["oliviers"].toFixed(1)} ${prod.unit}`
                                    : "—"}
                                </td>

                                <td className="p-3 text-right font-black bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-sm">
                                  {prod.totalQty.toFixed(1)} {prod.unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 3 : MATRICE GLOBALE CONSOLIDÉE                     */}
          {/* ======================================================== */}
          {consolidationGrouping === "matrix" && (
            <div className="border rounded-2xl bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/50 text-[10px] uppercase font-black text-muted-foreground border-b">
                    <tr>
                      <th className="p-3">Produit & Spécifications</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Unité</th>
                      <th className="p-3 text-right">🍎 Pommiers (2,00 ha)</th>
                      <th className="p-3 text-right">🍑 Nablara (2,00 ha)</th>
                      <th className="p-3 text-right">🍑 Redix 25 (2,00 ha)</th>
                      <th className="p-3 text-right">🫒 Oliviers (8,00 ha)</th>
                      <th className="p-3 text-right bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 font-black">
                        Total Exploitation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {consolidatedProductsFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                          Aucun produit correspondant aux critères de recherche actuels.
                        </td>
                      </tr>
                    ) : (
                      consolidatedProductsFiltered.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-muted/10 transition">
                          <td className="p-3 font-extrabold text-foreground">
                            <div>
                              <span className="block font-black">{prod.name}</span>
                              {(prod.cible || prod.dar) && (
                                <span className="text-[10px] text-muted-foreground block font-normal">
                                  {prod.cible ? `Cible: ${prod.cible}` : ""} {prod.dar ? `· DAR: ${prod.dar}` : ""}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {prod.category === "fertigation" && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 whitespace-nowrap">
                                💧 Fert. Irrigation
                              </span>
                            )}
                            {prod.category === "foliaire" && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 whitespace-nowrap">
                                🌿 Fert. Foliaire
                              </span>
                            )}
                            {prod.category === "phytosanitaire" && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 whitespace-nowrap">
                                🛡️ Phyto
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground font-semibold">{prod.unit}</td>
                          <td className="p-3 text-right font-medium">
                            {prod.bySpecies["pommiers"]
                              ? `${prod.bySpecies["pommiers"].toFixed(1)} ${prod.unit}`
                              : "—"}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {prod.bySpecies["nablara"]
                              ? `${prod.bySpecies["nablara"].toFixed(1)} ${prod.unit}`
                              : "—"}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {prod.bySpecies["redix25"]
                              ? `${prod.bySpecies["redix25"].toFixed(1)} ${prod.unit}`
                              : "—"}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {prod.bySpecies["oliviers"]
                              ? `${prod.bySpecies["oliviers"].toFixed(1)} ${prod.unit}`
                              : "—"}
                          </td>
                          <td className="p-3 text-right font-black bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-sm">
                            {prod.totalQty.toFixed(1)} {prod.unit}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
