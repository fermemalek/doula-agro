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
  Flame,
  Check,
  RefreshCw,
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
  surfaceHa: number;
  treeCount: number;
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
    surfaceHa: 4.32,
    treeCount: 5793,
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
    surfaceHa: 2.16,
    treeCount: 1872,
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
    surfaceHa: 2.16,
    treeCount: 1872,
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
    surfaceHa: 8.64,
    treeCount: 2150,
    variety: "Chamlal & Ferkani",
    rootstock: "Zabouge",
    colorVar: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    borderColor: "border-amber-500/40",
  },
];

export interface PlannedPeriod {
  speciesId: string;
  speciesName: string;
  recoId: string;
  recoTitle: string;
  reco: Recommendation;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  frequency: number; // e.g. 3, 2, 1
  pureIrrigationFrequency: number;
  pureIrrigationTime: string;
  irrigationTime: string;
  injectionTime: number;
  rinsingTime: number;
  wettingTime: number;
  surfaceHa: number;
  entries: Array<{
    bac: string;
    items: Array<{ name: string; qty: string; unit: string; price?: string }>;
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
  periodInfo: PlannedPeriod;
  recoTitle: string;
  hours: string;
  irrigationDuration: string;
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

const DAY_NAMES_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function AgronomicPlanningCalendar({
  recos,
  parcels,
  onSelectReco,
}: AgronomicPlanningCalendarProps) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  const [selectedSpecies, setSelectedSpecies] = useState<string>("all");
  const [activeView, setActiveView] = useState<"calendar" | "periods" | "consolidation">("calendar");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // 1. Extraire les recommandations par espèce et calculer les périodes successives
  const { periodsBySpecies, allScheduledEvents, allFertProductsConsolidated } = useMemo(() => {
    const periodsBySpeciesMap: Record<string, PlannedPeriod[]> = {};
    const events: ScheduledDayEvent[] = [];
    const productConsolidationMap: Record<
      string,
      {
        name: string;
        unit: string;
        bySpecies: Record<string, number>;
        totalQty: number;
      }
    > = {};

    CROPS_CONFIG.forEach((crop) => {
      // Filtrer les recommandations applicables à cette espèce
      const matchingRecos = recos.filter((r) => {
        if (!r || r.status === "rejetee") return false;
        const payload = (r.payload || {}) as any;
        const cropGroups = Array.isArray(payload.crop_group)
          ? payload.crop_group
          : payload.crop_group
          ? [payload.crop_group]
          : [];
        const matchesGroup = cropGroups.some((g: string) => crop.groups.includes(g));
        const matchesParcel = (r.parcel_ids || []).some((pId) => crop.parcelIds.includes(pId));
        return matchesGroup || matchesParcel;
      });

      // Extraire les programmes d'irrigation / fertilisation
      const fertRecos = matchingRecos.filter((r) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        return r.kind === "fertilisation" || payload.method === "irrigation" || prog.entries?.length > 0;
      });

      // Trier chronologiquement par date d'effet
      fertRecos.sort((a, b) => {
        const dateA = ((a.payload as any)?.program?.date) || a.created_at?.slice(0, 10) || "";
        const dateB = ((b.payload as any)?.program?.date) || b.created_at?.slice(0, 10) || "";
        return dateA.localeCompare(dateB);
      });

      // Construire la chaîne continue des périodes
      const speciesPeriods: PlannedPeriod[] = [];

      fertRecos.forEach((r, idx) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        const startDate = prog.date || r.created_at?.slice(0, 10) || "2026-03-01";

        // Déterminer la date de fin : si reco suivante, finit la veille ; sinon, projetée sur 28 jours (4 semaines)
        const nextReco = fertRecos[idx + 1];
        let endDate = "";
        let isCurrent = false;

        if (nextReco) {
          const nextStart = ((nextReco.payload as any)?.program?.date) || nextReco.created_at?.slice(0, 10);
          if (nextStart) {
            endDate = addDays(nextStart, -1);
          } else {
            endDate = addDays(startDate, 21);
          }
        } else {
          // Dernière recommandation en vigueur pour l'espèce : programmée sur l'horizon actif
          isCurrent = true;
          endDate = addDays(startDate, 28); // 4 semaines glissantes
        }

        // Fréquence hebdomadaire
        const frequency = parseFloat(prog.frequency) || 2;
        const pureIrrFreq = parseFloat(prog.pureIrrigationFrequency ?? "1") || 0;
        const pureIrrTime = prog.pureIrrigationTime || "1h30";

        // Paramètres hydrauliques
        const irrigationTime = prog.irrigationTime || "2h";
        const injectionTime = prog.injectionTime ?? 45;
        const rinsingTime = prog.rinsingTime ?? 45;
        const wettingTime = prog.wettingTime ?? 30;

        // Calcul durée en jours et nombre de passages
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();
        const durationDays = Math.max(1, Math.round((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24)) + 1);
        const weeksCount = Math.max(1, durationDays / 7);
        const totalPassages = Math.max(1, Math.round(weeksCount * frequency));

        const entries = (prog.entries || []).filter((e: any) => e.items && e.items.length > 0);

        const periodObj: PlannedPeriod = {
          speciesId: crop.id,
          speciesName: crop.name,
          recoId: r.id,
          recoTitle: r.title,
          reco: r,
          startDate,
          endDate,
          isCurrent,
          frequency,
          pureIrrigationFrequency: pureIrrFreq,
          pureIrrigationTime: pureIrrTime,
          irrigationTime,
          injectionTime,
          rinsingTime,
          wettingTime,
          surfaceHa: crop.surfaceHa,
          entries,
          totalPassages,
          durationDays,
        };

        speciesPeriods.push(periodObj);

        // Cumuler dans la matrice de consolidation des produits
        entries.forEach((entry: any) => {
          entry.items.forEach((it: any) => {
            const prodName = it.name?.trim();
            if (!prodName) return;
            const doseHa = parseFloat(it.qty) || 0;
            const qtyPerPassage = doseHa * crop.surfaceHa;
            const totalForPeriod = qtyPerPassage * totalPassages;

            if (!productConsolidationMap[prodName]) {
              productConsolidationMap[prodName] = {
                name: prodName,
                unit: it.unit || "kg",
                bySpecies: {},
                totalQty: 0,
              };
            }
            productConsolidationMap[prodName].bySpecies[crop.id] =
              (productConsolidationMap[prodName].bySpecies[crop.id] || 0) + totalForPeriod;
            productConsolidationMap[prodName].totalQty += totalForPeriod;
          });
        });

        // 3. Projeter chaque intervention journalière sur le calendrier
        // Décalages de jours selon la fréquence hebdomadaire :
        // 3x/semaine -> J0 (ex: Lundi / +0), J+2 (Mercredi / +2), J+4 (Vendredi / +4)
        // 2x/semaine -> J0 (Mardi / +1), J+3 (Vendredi / +4)
        // 1x/semaine -> J0 (Lundi / +0)
        let dayOffsets = [0, 2, 4];
        if (frequency === 2) dayOffsets = [1, 4];
        else if (frequency === 1) dayOffsets = [1];
        else if (frequency >= 4) dayOffsets = [0, 2, 4, 5];

        let currDate = new Date(startDate);
        const finishDate = new Date(endDate);

        while (currDate <= finishDate) {
          const currentWeekStart = new Date(currDate);

          dayOffsets.forEach((offset) => {
            const eventDate = new Date(currentWeekStart);
            eventDate.setDate(currentWeekStart.getDate() + offset);

            if (eventDate <= finishDate && eventDate >= new Date(startDate)) {
              const dateStr = eventDate.toISOString().slice(0, 10);
              const dayOfWeek = eventDate.getDay();

              // Bacs avec calcul des doses parcelle
              const bacsComputed = entries.map((e: any) => ({
                bac: e.bac,
                items: e.items.map((it: any) => {
                  const doseHa = parseFloat(it.qty) || 0;
                  return {
                    name: it.name,
                    doseHa,
                    unit: it.unit || "kg",
                    totalParcel: doseHa * crop.surfaceHa,
                  };
                }),
              }));

              events.push({
                date: dateStr,
                dayOfWeek,
                dayName: DAY_NAMES_FR[dayOfWeek],
                speciesId: crop.id,
                speciesName: crop.name,
                cropConfig: crop,
                type: "fertigation",
                periodInfo: periodObj,
                recoTitle: r.title,
                hours: "05h00 - 07h00",
                irrigationDuration: irrigationTime,
                wettingTime,
                injectionTime,
                rinsingTime,
                bacs: bacsComputed,
              });
            }
          });

          // Si irrigation pure demandée (1x/semaine, par ex le Dimanche)
          if (pureIrrFreq > 0) {
            const pureDate = new Date(currentWeekStart);
            pureDate.setDate(currentWeekStart.getDate() + 6); // Dimanche
            if (pureDate <= finishDate && pureDate >= new Date(startDate)) {
              const dateStr = pureDate.toISOString().slice(0, 10);
              const dayOfWeek = pureDate.getDay();
              events.push({
                date: dateStr,
                dayOfWeek,
                dayName: DAY_NAMES_FR[dayOfWeek],
                speciesId: crop.id,
                speciesName: crop.name,
                cropConfig: crop,
                type: "pure_irrigation",
                periodInfo: periodObj,
                recoTitle: `Irrigation pure (${crop.name})`,
                hours: "06h00 - 07h30",
                irrigationDuration: pureIrrTime,
                wettingTime: 0,
                injectionTime: 0,
                rinsingTime: 0,
                bacs: [],
              });
            }
          }

          // Passer à la semaine suivante
          currDate.setDate(currDate.getDate() + 7);
        }
      });

      periodsBySpeciesMap[crop.id] = speciesPeriods;
    });

    // Trier tous les événements calendrier par date
    events.sort((a, b) => a.date.localeCompare(b.date));

    return {
      periodsBySpecies: periodsBySpeciesMap,
      allScheduledEvents: events,
      allFertProductsConsolidated: Object.values(productConsolidationMap).sort(
        (a, b) => b.totalQty - a.totalQty
      ),
    };
  }, [recos, parcels]);

  // Filtrer les événements par espèce et par mois
  const filteredEvents = useMemo(() => {
    return allScheduledEvents.filter((ev) => {
      if (selectedSpecies !== "all" && ev.speciesId !== selectedSpecies) return false;
      if (selectedMonth !== "all") {
        const monthNum = ev.date.slice(5, 7);
        if (monthNum !== selectedMonth) return false;
      }
      return true;
    });
  }, [allScheduledEvents, selectedSpecies, selectedMonth]);

  // Regrouper les événements par semaine pour l'affichage calendrier
  const eventsByWeek = useMemo(() => {
    const weeksMap: Record<string, { weekLabel: string; events: ScheduledDayEvent[] }> = {};

    filteredEvents.forEach((ev) => {
      // Trouver le lundi de la semaine
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

  // Liste des mois disponibles dans le calendrier
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

  // Calcul KPI globaux
  const totalScheduledPassages = filteredEvents.filter((e) => e.type === "fertigation").length;
  const activePeriodsCount = Object.values(periodsBySpecies).reduce(
    (sum, list) => sum + list.length,
    0
  );

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* 1. Header Banner & Explication de la règle agronomique */}
      <div className="rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  <span>Planning & Calendrier de Distribution Agronomique</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                    Campagne Active
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reconduction continue des programmes par espèce : chaque recommandation reste active
                  et planifiée chaque semaine jusqu'à l'entrée en vigueur de la suivante.
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

        {/* Mini KPI Cards */}
        <div className="grid grid-cols-2 min-[480px]:grid-cols-4 gap-2.5 mt-4 pt-3 border-t">
          <div className="rounded-xl border bg-background/80 p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Sprout className="h-3 w-3 text-emerald-600" />
              <span>Espèces Suivies</span>
            </span>
            <p className="text-sm font-black text-foreground">
              {CROPS_CONFIG.length} espèces arboricoles
            </p>
            <span className="text-[10px] text-muted-foreground block">
              Pommier, Nablara, Redix 25, Oliviers
            </span>
          </div>

          <div className="rounded-xl border bg-background/80 p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3 text-primary" />
              <span>Périodes / Recommandations</span>
            </span>
            <p className="text-sm font-black text-foreground">
              {activePeriodsCount} Paliers d'évolution
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
              Enchaînement automatique
            </span>
          </div>

          <div className="rounded-xl border bg-background/80 p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Droplets className="h-3 w-3 text-blue-600" />
              <span>Passages Fertigation</span>
            </span>
            <p className="text-sm font-black text-foreground">
              {totalScheduledPassages} Apports programmés
            </p>
            <span className="text-[10px] text-muted-foreground block">
              Distribution hydraulique
            </span>
          </div>

          <div className="rounded-xl border bg-background/80 p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Engrais Référencés</span>
            </span>
            <p className="text-sm font-black text-foreground">
              {allFertProductsConsolidated.length} Formules d'intrants
            </p>
            <span className="text-[10px] text-muted-foreground block">
              Bacs A, B & C sécurisés
            </span>
          </div>
        </div>
      </div>

      {/* 2. Barre de Navigation : Sélecteur d'Espèce & Mode de Vue */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 border-b pb-2">
        {/* Sélecteur de l'Espèce */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSpecies("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 border ${
              selectedSpecies === "all"
                ? "bg-foreground text-background shadow-xs border-foreground"
                : "bg-background text-muted-foreground hover:bg-muted border-border"
            }`}
          >
            <span>🌳</span>
            <span>Toutes les espèces</span>
          </button>

          {CROPS_CONFIG.map((crop) => (
            <button
              key={crop.id}
              type="button"
              onClick={() => setSelectedSpecies(crop.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 border ${
                selectedSpecies === crop.id
                  ? `${crop.badgeBg} border-current shadow-xs`
                  : "bg-background text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              <span>{crop.icon}</span>
              <span>{crop.name}</span>
              <span className="text-[10px] font-medium opacity-75">({crop.surfaceHa} ha)</span>
            </button>
          ))}
        </div>

        {/* Sélecteur de Mode de Vue (Calendrier / Périodes / Synthèse) */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveView("calendar")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeView === "calendar"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Calendrier Semaine</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("periods")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeView === "periods"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Paliers & Périodes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("consolidation")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeView === "consolidation"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Synthèse Intrants</span>
          </button>
        </div>
      </div>

      {/* Filtre de Mois (si en vue calendrier) */}
      {activeView === "calendar" && availableMonths.length > 1 && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-muted-foreground text-[11px] flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Mois :</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedMonth("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              selectedMonth === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Tous les mois
          </button>
          {availableMonths.map((m) => (
            <button
              key={m.code}
              type="button"
              onClick={() => setSelectedMonth(m.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedMonth === m.code
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* VUE 1 : CALENDRIER HEBDOMADAIRE & JOURNALIER            */}
      {/* ======================================================== */}
      {activeView === "calendar" && (
        <div className="space-y-4">
          {eventsByWeek.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <span className="text-3xl block">📋</span>
              <h4 className="font-bold text-sm text-foreground">
                Aucune recommandation active trouvée pour cette sélection
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Dès que vous enregistrez une recommandation dans l'espace Ingénieur pour le Pommier Gala
                One, Nectarine Nablara ou Redix 25, elle sera automatiquement planifiée sur tout son cycle
                hebdomadaire ici.
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
                    {weekData.events.length} interventions programmées
                  </span>
                </div>

                {/* Grille des Jours de la Semaine */}
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {weekData.events.map((event, evIdx) => (
                    <div
                      key={evIdx}
                      className={`rounded-xl border p-3 space-y-2 transition-all hover:shadow-xs ${
                        event.type === "fertigation"
                          ? "bg-card border-border"
                          : "bg-blue-500/5 border-blue-500/20"
                      }`}
                    >
                      {/* En-tête du jour */}
                      <div className="flex items-start justify-between gap-1.5 border-b pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{event.cropConfig.icon}</span>
                          <div>
                            <span className="font-black text-xs block text-foreground">
                              {event.dayName} {formatDateFr(event.date)}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground block">
                              {event.cropConfig.name} ({event.cropConfig.surfaceHa} ha)
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                            event.type === "fertigation"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {event.type === "fertigation" ? "Fertigation" : "Irrigation pure"}
                        </span>
                      </div>

                      {/* Horaires et découpage hydraulique */}
                      <div className="rounded-lg bg-muted/40 p-2 text-[10px] space-y-1">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>Durée arrosage :</span>
                          </span>
                          <span className="text-foreground">{event.irrigationDuration} ({event.hours})</span>
                        </div>
                        {event.type === "fertigation" && (
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
                        )}
                      </div>

                      {/* Détail des Bacs & Engrais à injecter */}
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
                                      <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                                        {it.totalParcel.toFixed(1)} {it.unit}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground block">
                                        ({it.doseHa} {it.unit}/ha)
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Source Recommandation cliquable */}
                      <div className="pt-1 flex justify-between items-center text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[170px]" title={event.recoTitle}>
                          📋 {event.recoTitle}
                        </span>
                        {onSelectReco && (
                          <button
                            type="button"
                            onClick={() => onSelectReco(event.periodInfo.reco)}
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
      {/* VUE 2 : PALIERS & PÉRIODES DE RECOMMANDATION             */}
      {/* ======================================================== */}
      {activeView === "periods" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              Ce tableau retrace l'historique et l'enchaînement de chaque recommandation pour chaque
              espèce. Quand une recommandation $R_1$ arrive, elle reste en vigueur jusqu'à ce que la
              recommandation $R_2$ prenne le relais.
            </span>
          </div>

          {CROPS_CONFIG.filter((c) => selectedSpecies === "all" || c.id === selectedSpecies).map(
            (crop) => {
              const cropPeriods = periodsBySpecies[crop.id] || [];

              return (
                <div key={crop.id} className="border rounded-2xl bg-card overflow-hidden shadow-xs">
                  {/* En-tête espèce */}
                  <div className="bg-muted/40 px-4 py-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{crop.icon}</span>
                      <div>
                        <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                          <span>{crop.name}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            ({crop.surfaceHa} ha — {crop.variety} sur {crop.rootstock})
                          </span>
                        </h4>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      {cropPeriods.length} palier(s) enregistré(s)
                    </span>
                  </div>

                  {cropPeriods.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Aucune recommandation active pour {crop.name}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-muted/20 text-[10px] uppercase font-bold text-muted-foreground border-b">
                          <tr>
                            <th className="p-3">Statut & Période d'Effet</th>
                            <th className="p-3">Fréquence Hebdo</th>
                            <th className="p-3">Temps Irrigation</th>
                            <th className="p-3">Formule Bacs (Doses/ha)</th>
                            <th className="p-3 text-right">Passages Prévus</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {cropPeriods.map((period, pIdx) => (
                            <tr key={pIdx} className="hover:bg-muted/10 transition">
                              <td className="p-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    {period.isCurrent ? (
                                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Programme Actuel (En cours)</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                                        Palier {pIdx + 1}
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-extrabold text-foreground">
                                    Du {formatDateFr(period.startDate)} au {formatDateFr(period.endDate)}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground block">
                                    Durée : {period.durationDays} jours ({Math.round(period.durationDays / 7)} sem.)
                                  </span>
                                </div>
                              </td>

                              <td className="p-3 font-bold">
                                <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs">
                                  {period.frequency === 3
                                    ? "3 fois / semaine"
                                    : period.frequency === 2
                                    ? "2 fois / semaine"
                                    : `${period.frequency} fois / sem`}
                                </span>
                                {period.pureIrrigationFrequency > 0 && (
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-1">
                                    + {period.pureIrrigationFrequency}x irrigation pure ({period.pureIrrigationTime})
                                  </span>
                                )}
                              </td>

                              <td className="p-3">
                                <div className="text-[11px] space-y-0.5">
                                  <span className="font-bold text-foreground block">
                                    Total: {period.irrigationTime}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    Injection: {period.injectionTime} min
                                  </span>
                                </div>
                              </td>

                              <td className="p-3">
                                <div className="space-y-1.5 max-w-sm">
                                  {period.entries.map((e) => (
                                    <div key={e.bac} className="text-[11px]">
                                      <span className="font-extrabold text-primary uppercase text-[10px]">
                                        Bac {e.bac} :
                                      </span>{" "}
                                      <span className="text-foreground font-medium">
                                        {e.items
                                          .map((it) => `${it.name} (${it.qty} ${it.unit}/ha)`)
                                          .join(", ")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>

                              <td className="p-3 text-right">
                                <span className="font-black text-sm text-foreground">
                                  {period.totalPassages}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  passages sur la tranche
                                </span>
                              </td>

                              <td className="p-3 text-right">
                                {onSelectReco && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSelectReco(period.reco)}
                                    className="text-xs font-bold gap-1 text-primary"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Voir Reco</span>
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VUE 3 : SYNTHÈSE CONSOLIDÉE DES BESOINS D'ENGRAIS       */}
      {/* ======================================================== */}
      {activeView === "consolidation" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <h4 className="font-black text-sm text-foreground flex items-center gap-2">
              <span>🧪 Synthèse Consolidée des Besoins d'Engrais (Campagne Active)</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Total mathématique cumulé des apports programmés pour chaque engrais, décomposé par
              espèce arboricole (Pommier Gala One, Nectarine Nablara, Nectarine Redix 25, Oliviers).
            </p>
          </div>

          <div className="border rounded-2xl bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/40 text-[10px] uppercase font-black text-muted-foreground border-b">
                  <tr>
                    <th className="p-3">Produit Fertilisant</th>
                    <th className="p-3">Unité</th>
                    <th className="p-3 text-right">🍎 Pommiers (4,32 ha)</th>
                    <th className="p-3 text-right">🍑 Nablara (2,16 ha)</th>
                    <th className="p-3 text-right">🍑 Redix 25 (2,16 ha)</th>
                    <th className="p-3 text-right">🫒 Oliviers (8,64 ha)</th>
                    <th className="p-3 text-right bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 font-black">
                      Total Exploitation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allFertProductsConsolidated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs">
                        Aucun engrais prescrit dans les recommandations pour l'instant.
                      </td>
                    </tr>
                  ) : (
                    allFertProductsConsolidated.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-muted/10 transition">
                        <td className="p-3 font-extrabold text-foreground">{prod.name}</td>
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
        </div>
      )}
    </div>
  );
}
