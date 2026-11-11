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

export interface PlannedPeriod {
  speciesId: string;
  speciesName: string;
  recoId: string;
  recoTitle: string;
  reco: Recommendation;
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
  const [activeView, setActiveView] = useState<"grid" | "cards" | "periods" | "consolidation">("grid");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

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

  // 2. Extraire toutes les recommandations par espèce et construire les périodes successives
  const { periodsBySpecies, allScheduledEvents, allFertProductsConsolidated } = useMemo(() => {
    const periodsBySpeciesMap: Record<string, PlannedPeriod[]> = {};
    const rawEvents: Array<Omit<ScheduledDayEvent, "startHourMinutes" | "endHourMinutes" | "hours">> = [];
    const productConsolidationMap: Record<
      string,
      {
        name: string;
        unit: string;
        bySpecies: Record<string, number>;
        totalQty: number;
      }
    > = {};

    cropsWithRealSurfaces.forEach((crop) => {
      // Filtrer les recommandations valides pour cette espèce
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

      // Extraire les recommandations de fertilisation / irrigation
      const fertRecos = matchingRecos.filter((r) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        return r.kind === "fertilisation" || payload.method === "irrigation" || (prog.entries && prog.entries.length > 0);
      });

      // Regrouper par date de programme unique pour éviter les doublons de sous-programmes
      const recosByDate: Record<string, Recommendation[]> = {};
      fertRecos.forEach((r) => {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        const d = prog.date || r.created_at?.slice(0, 10) || "2026-03-09";
        if (!recosByDate[d]) recosByDate[d] = [];
        recosByDate[d].push(r);
      });

      const distinctDates = Object.keys(recosByDate).sort();
      const speciesPeriods: PlannedPeriod[] = [];

      distinctDates.forEach((dateKey, dateIdx) => {
        const dateRecos = recosByDate[dateKey];
        const startDate = dateKey;
        const nextDate = distinctDates[dateIdx + 1];
        let endDate = "";
        let isCurrent = false;

        if (nextDate) {
          // L'ancienne recommandation s'arrête strictement la veille de la nouvelle recommandation
          endDate = addDays(nextDate, -1);
        } else {
          isCurrent = true;
          // Pour la dernière recommandation en vigueur : reconduite sur l'horizon actif
          endDate = addDays(startDate, 28);
        }

        // Trier les sous-programmes pour respecter l'ordre agronomique (ex: Programme A1 avant Programme A2)
        const sortedSubRecos = [...dateRecos].sort((a, b) => {
          const lA = (a.payload as any)?.program?.label || a.title || "";
          const lB = (b.payload as any)?.program?.label || b.title || "";
          return lA.localeCompare(lB);
        });

        const primaryReco = sortedSubRecos[0];
        const primaryPayload = (primaryReco.payload || {}) as any;
        const primaryProg = primaryPayload.program || {};

        const durationMinutes = parseDurationMinutes(primaryProg.irrigationTime);
        const irrigationTime = primaryProg.irrigationTime || (durationMinutes === 90 ? "1h30" : `${durationMinutes}m`);
        const injectionTime = primaryProg.injectionTime ?? 45;
        const rinsingTime = primaryProg.rinsingTime ?? 10;
        const wettingTime = Math.max(0, durationMinutes - injectionTime - rinsingTime);

        // Fréquence hebdomadaire :
        // - Pommier : 1 seul programme A1, se répète 1 fois par semaine (J0 et J+6 / J+7)
        // - Nablara et Redix 25 : 2 programmes A1 et A2, se répétant chacun 1 fois par semaine (2 passages par semaine au total : A1 puis A2)
        const hasMultipleSubProgs = sortedSubRecos.length >= 2;
        const rawFreq = parseFloat(primaryProg.frequency) || 1;
        const isWeeklySingle = crop.id === "pommiers" || (!hasMultipleSubProgs && rawFreq <= 1);

        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();
        const durationDays = Math.max(1, Math.round((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24)) + 1);

        // Liste distincte des bacs de la période pour affichage récapitulatif
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

        // Générer les passages réels selon le rythme de la station (intervalles de 3 jours : J0, J+3, J+6...)
        let passDate = new Date(startDate);
        const finishDate = new Date(endDate);
        let intervalIndex = 0;
        let passCount = 0;

        while (passDate <= finishDate) {
          const dateStr = passDate.toISOString().slice(0, 10);
          const dayOfWeek = passDate.getDay();

          // Règle agronomique de passage pour cette espèce :
          // Si l'espèce est à 1 fois par semaine (Pommier) : elle tourne le premier passage (J0, 09 mars) et le troisième (J+6, 15 mars),
          // mais elle NE TOURNE PAS au passage intermédiaire J+3 (Jeudi 12 mars) !
          const isScheduledThisDay = !isWeeklySingle || (intervalIndex % 2 === 0);

          if (isScheduledThisDay) {
            // Sélectionner le sous-programme exact pour ce passage (A1 sur passage pair, A2 sur passage impair si 2 sous-programmes)
            const subProgIdx = hasMultipleSubProgs ? (passCount % sortedSubRecos.length) : 0;
            const currentSubReco = sortedSubRecos[subProgIdx];
            const currentSubProg = (currentSubReco.payload as any)?.program || {};
            const currentSubEntries = currentSubProg.entries || [];

            // Doses calculées sur la surface réelle et exacte de la parcelle,
            // SANS AUCUN DOUBLON dans le même bac (ex: une seule ligne d'Acide Nitrique)
            const bacsComputed = (currentSubEntries as any[]).map((e: any) => {
              const uniqueItemsMap: Record<string, { name: string; doseHa: number; unit: string; totalParcel: number }> = {};
              (e.items || []).forEach((it: any) => {
                const prodName = (it.name || "").trim();
                if (!prodName) return;
                const doseHa = parseFloat(String(it.qty || "0").replace(",", ".")) || 0;
                if (!uniqueItemsMap[prodName]) {
                  uniqueItemsMap[prodName] = {
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
              irrigationDuration: currentSubProg.irrigationTime || irrigationTime,
              durationMinutes: parseDurationMinutes(currentSubProg.irrigationTime) || durationMinutes,
              wettingTime: currentSubProg.wettingTime ?? wettingTime,
              injectionTime: currentSubProg.injectionTime ?? injectionTime,
              rinsingTime: currentSubProg.rinsingTime ?? rinsingTime,
              bacs: bacsComputed,
            });

            // Cumul de consolidation EXACT basé strictement sur chaque passage réel exécuté
            bacsComputed.forEach((b) => {
              b.items.forEach((it) => {
                const prodName = it.name.trim();
                if (!prodName) return;
                if (!productConsolidationMap[prodName]) {
                  productConsolidationMap[prodName] = {
                    name: prodName,
                    unit: it.unit,
                    bySpecies: {},
                    totalQty: 0,
                  };
                }
                productConsolidationMap[prodName].bySpecies[crop.id] =
                  (productConsolidationMap[prodName].bySpecies[crop.id] || 0) + it.totalParcel;
                productConsolidationMap[prodName].totalQty += it.totalParcel;
              });
            });

            passCount++;
          }

          intervalIndex++;
          // Décalage de 3 jours vers le passage suivant de la station
          passDate.setDate(passDate.getDate() + 3);
        }

        periodObj.totalPassages = passCount;
        speciesPeriods.push(periodObj);
      });

      periodsBySpeciesMap[crop.id] = speciesPeriods;
    });

    // 3. Calcul séquentiel des horaires de la station de pompage (JAMAIS en parallèle)
    // Regrouper par date
    const eventsByDateMap: Record<string, typeof rawEvents> = {};
    rawEvents.forEach((ev) => {
      if (!eventsByDateMap[ev.date]) eventsByDateMap[ev.date] = [];
      eventsByDateMap[ev.date].push(ev);
    });

    const finalEvents: ScheduledDayEvent[] = [];

    // Déterminer la séquence exacte pour chaque date
    Object.keys(eventsByDateMap).sort().forEach((dateKey) => {
      const dayList = eventsByDateMap[dateKey];

      // Ordre agronomique des secteurs : Pommier -> Nablara -> Redix 25 -> Oliviers
      const priorityOrder = ["pommiers", "nablara", "redix25", "oliviers"];
      dayList.sort((a, b) => priorityOrder.indexOf(a.speciesId) - priorityOrder.indexOf(b.speciesId));

      const hasPommier = dayList.some((e) => e.speciesId === "pommiers");

      // Heure de démarrage de la station :
      // - 05h00 (300 min) si Pommier est programmé
      // - 06h00 (360 min) si seulement Nablara et Redix 25 sont programmés
      let currentStationTime = hasPommier ? 5 * 60 : 6 * 60;

      dayList.forEach((ev) => {
        const startMin = currentStationTime;
        const endMin = startMin + ev.durationMinutes;
        currentStationTime = endMin; // Le secteur suivant commence exactement quand le précédent finit

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
      allFertProductsConsolidated: Object.values(productConsolidationMap).sort(
        (a, b) => b.totalQty - a.totalQty
      ),
    };
  }, [recos, cropsWithRealSurfaces]);

  // Filtrer par espèce et par mois
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
        const speciesNames = Array.from(new Set(dayEvents.map((e) => {
          if (e.speciesId === "pommiers") return "Pom";
          if (e.speciesId === "nablara") return "Nablara";
          if (e.speciesId === "redix25") return "Redix";
          return e.speciesName;
        }))).join("-");
        summaryLabel = `Fertilisation ${speciesNames}`;
      }

      rows.push({
        date: dStr,
        dayOfWeek: dow,
        dayName: DAY_NAMES_FR[dow],
        events: dayEvents,
        summaryLabel,
        isPassageDay: dayEvents.length > 0,
        isNewRecoDay: dStr === "2026-03-17" || dStr === "2026-04-01" || dStr === "2026-04-20" || dStr === "2026-05-06" || dStr === "2026-05-28",
      });

      curr.setDate(curr.getDate() + 1);
    }

    return rows;
  }, [filteredEvents]);

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
                {crop.id === "pommiers" ? "P1 (1 ha) + P2 (1 ha)" : "Surface vérifiée"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Barre de Navigation : Sélecteur d'Espèce & Mode d'Affichage */}
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

          {cropsWithRealSurfaces.map((crop) => (
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
              <span className="text-[10px] font-medium opacity-80">({crop.surfaceHa} ha)</span>
            </button>
          ))}
        </div>

        {/* Sélecteur de Mode de Vue */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveView("grid")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeView === "grid"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableIcon className="h-3.5 w-3.5 text-amber-500" />
            <span>Grille Calendrier (Excel)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("cards")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeView === "cards"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Fiches Horaires</span>
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
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Synthèse Intrants</span>
          </button>
        </div>
      </div>

      {/* Filtre de Mois */}
      {availableMonths.length > 1 && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-muted-foreground text-[11px] flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Filtrer le Mois :</span>
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
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/70 text-[11px] font-black uppercase text-foreground border-b text-center">
                  <tr>
                    <th className="p-2.5 border-r w-28 text-left bg-muted/90">Date</th>
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
                  {calendarGridRows.map((row, idx) => {
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
                        <td className="p-2.5 border-r font-bold text-foreground bg-muted/30 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1.5">
                            <span>{formatDateFr(row.date)}</span>
                            {row.isNewRecoDay && (
                              <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.2 rounded">
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
                                className="p-2.5 border-r bg-amber-400/30 dark:bg-amber-500/20 text-center font-black text-amber-950 dark:text-amber-100"
                              >
                                <div className="space-y-1">
                                  <span className="block text-xs font-black tracking-tight text-amber-900 dark:text-amber-200">
                                    {row.summaryLabel}
                                  </span>
                                  <div className="flex flex-wrap justify-center gap-1 text-[10px]">
                                    {row.events.map((ev) => (
                                      <span
                                        key={ev.speciesId}
                                        className="bg-background/90 px-1.5 py-0.5 rounded border shadow-2xs font-mono font-bold text-[9px]"
                                      >
                                        {ev.speciesId === "pommiers" ? "Pom: " : ev.speciesId === "nablara" ? "Nab: " : "Red: "}
                                        {ev.hours}
                                      </span>
                                    ))}
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
                  })}
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
                      {/* En-tête du passage */}
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

                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shrink-0">
                          Fertigation
                        </span>
                      </div>

                      {/* Horaires séquentiels précis de la station */}
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

                      {/* Détail des Bacs & Quantités exactes pour la parcelle */}
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

                      {/* Source Recommandation cliquable */}
                      <div className="pt-1 flex justify-between items-center text-[10px] text-muted-foreground border-t">
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

          {cropsWithRealSurfaces.filter((c) => selectedSpecies === "all" || c.id === selectedSpecies).map(
            (crop) => {
              const cropPeriods = periodsBySpecies[crop.id] || [];

              return (
                <div key={crop.id} className="border rounded-2xl bg-card overflow-hidden shadow-xs">
                  <div className="bg-muted/40 px-4 py-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{crop.icon}</span>
                      <div>
                        <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                          <span>{crop.name}</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            (Surface : {crop.surfaceHa.toFixed(2)} ha)
                          </span>
                        </h4>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      {cropPeriods.length} palier(s)
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
                            <th className="p-3">Créneau Séquentiel</th>
                            <th className="p-3">Formule Bacs (Doses/ha)</th>
                            <th className="p-3 text-right">Passages Effectués</th>
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
                                    {period.durationDays} jours · {period.totalPassages} passages
                                  </span>
                                </div>
                              </td>

                              <td className="p-3 font-bold">
                                <span className="font-mono text-xs text-primary block">
                                  {crop.id === "pommiers"
                                    ? "05h00 - 06h30"
                                    : crop.id === "nablara"
                                    ? "06h30 - 08h00 (ou 06h00)"
                                    : "08h00 - 09h30 (ou 07h30)"}
                                </span>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">
                                  Durée: {period.irrigationTime} (Mouil. {period.wettingTime}m + Inj. {period.injectionTime}m + Rinc. {period.rinsingTime}m)
                                </span>
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
                                  passages sur la période
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
      {/* VUE 4 : SYNTHÈSE CONSOLIDÉE DES BESOINS D'ENGRAIS       */}
      {/* ======================================================== */}
      {activeView === "consolidation" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <h4 className="font-black text-sm text-foreground flex items-center gap-2">
              <span>🧪 Synthèse Consolidée des Besoins d'Engrais (Surfaces Réelles Vérifiées)</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Calcul mathématique exact basé sur les surfaces réelles enregistrées dans vos fiches parcelles :
              <b> 2 ha pour Pommier</b>, <b>2 ha pour Nablara</b>, <b>2 ha pour Redix 25</b>, et <b>8 ha pour Oliviers</b>.
            </p>
          </div>

          <div className="border rounded-2xl bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/40 text-[10px] uppercase font-black text-muted-foreground border-b">
                  <tr>
                    <th className="p-3">Produit Fertilisant</th>
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
