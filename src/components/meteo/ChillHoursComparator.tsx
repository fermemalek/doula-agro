import React, { useState, useEffect, useCallback } from "react";
import {
  Snowflake,
  Settings,
  RefreshCw,
  Info,
  Calendar,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Scissors,
  Flower2,
  Clock,
  Save,
  Pencil,
  Trash2,
  CalendarCheck,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import {
  VARIETIES_CATALOG,
  recordSeasonPhenology,
  deleteSeasonPhenology,
  computePruningToBloomDays,
  type VarietyProfile,
  type PhenologyRecord,
} from "@/lib/chilling/varietiesConfig";

const STORAGE_CATALOG_KEY = "doula_varieties_catalog";
const STORAGE_SETTINGS_KEY = "doula_chill_hours_settings";

/**
 * Modèle Dynamique officiel de Fishman et al. (1987) — Chill Portions (CP)
 * Référence scientifique pour climats méditerranéens et Hauts-Plateaux.
 */
export function computeDynamicChillPortions(hourlyTempsC: number[]): number {
  const e0 = 4153.5, e1 = 12888.8, a0 = 139500.0, a1 = 2.567e18, slp = 1.6, tetmlt = 277.0;
  const aa = a0 / a1, ee = e1 - e0;
  let x = 0, cp = 0;
  for (const t of hourlyTempsC) {
    if (t == null || Number.isNaN(t)) continue;
    const tk = t + 273.0;
    const sr = Math.exp((slp * tetmlt * (tk - tetmlt)) / tk);
    const xi = sr / (1 + sr);
    const xs = aa * Math.exp(ee / tk);
    const ak1 = a1 * Math.exp(-e1 / tk);
    const interS = x >= 1 ? x * (1 - xi) : x;
    x = xs - (xs - interS) * Math.exp(-ak1);
    if (x >= 1) cp += xi * x;
  }
  return Math.round(cp * 10) / 10;
}

interface GeneralSettings {
  latitude: number;
  longitude: number;
  startDate: string;
}

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  latitude: 35.286281,
  longitude: 3.103180,
  startDate: "2026-11-01",
};

function loadSavedGeneralSettings(): GeneralSettings {
  if (typeof window === "undefined") return DEFAULT_GENERAL_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_GENERAL_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_GENERAL_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_GENERAL_SETTINGS;
  }
}

function loadSavedCatalog(): VarietyProfile[] {
  if (typeof window === "undefined") return VARIETIES_CATALOG;
  try {
    const raw = localStorage.getItem(STORAGE_CATALOG_KEY);
    if (!raw) return VARIETIES_CATALOG;
    const parsed: VarietyProfile[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return VARIETIES_CATALOG.map((v) => {
        const found = parsed.find((p) => p.id === v.id);
        if (!found) return v;
        const deletedYears = new Set<number>(Array.isArray(found.deletedYears) ? found.deletedYears : []);
        return {
          ...v,
          ...found,
          chillRequirements: {
            ...v.chillRequirements,
            ...(found.chillRequirements || {}),
          },
          phenologyReference: {
            ...v.phenologyReference,
            ...(found.phenologyReference || {}),
          },
          campaignHistory: (() => {
            const savedHistory: PhenologyRecord[] = Array.isArray(found.campaignHistory) ? found.campaignHistory : [];
            const savedYears = new Set(savedHistory.map((h) => h.year));
            const merged: PhenologyRecord[] = savedHistory
              .filter((ch) => !deletedYears.has(ch.year))
              .map((ch: PhenologyRecord) => {
                const def = v.campaignHistory.find((dh) => dh.year === ch.year);
                return {
                  ...def,
                  ...ch,
                  harvestStartDate: ch.harvestStartDate || def?.harvestStartDate,
                };
              });
            v.campaignHistory.forEach((dh) => {
              if (!savedYears.has(dh.year) && !deletedYears.has(dh.year)) {
                merged.push(dh);
              }
            });
            return merged.sort((a, b) => b.year - a.year);
          })(),
        };
      });
    }
    return VARIETIES_CATALOG;
  } catch {
    return VARIETIES_CATALOG;
  }
}

export interface ChillHoursComparatorProps {
  viewMode?: "counters" | "catalog" | "all";
  /** Déclencheur externe de rafraîchissement (depuis l'en-tête compact de Meteo.tsx) */
  externalRefreshTick?: number;
  /** Contrôle externe du panneau Paramètres (depuis l'en-tête compact de Meteo.tsx) */
  externalConfigOpen?: boolean;
  onExternalConfigChange?: (open: boolean) => void;
  /** Masque l'en-tête redondant lorsque le composant est intégré dans Meteo.tsx */
  embeddedInMeteo?: boolean;
}

export function ChillHoursComparator({
  viewMode = "all",
  externalRefreshTick,
  externalConfigOpen,
  onExternalConfigChange,
  embeddedInMeteo = false,
}: ChillHoursComparatorProps = {}) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(loadSavedGeneralSettings);
  const [catalog, setCatalog] = useState<VarietyProfile[]>(loadSavedCatalog);
  const [internalConfigOpen, setInternalConfigOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const showConfig = externalConfigOpen !== undefined ? externalConfigOpen : internalConfigOpen;
  const setShowConfig = (next: boolean) => {
    setInternalConfigOpen(next);
    onExternalConfigChange?.(next);
  };

  // Bloc dépliable unique "Comprendre les 3 modèles"
  const [showModelsGuide, setShowModelsGuide] = useState(false);

  // Détails variétaux repliés par défaut en Mobile-First pour un affichage compact et lisible
  const [expandedVarietyIds, setExpandedVarietyIds] = useState<string[]>([]);

  const toggleVarietyExpanded = (id: string) => {
    setExpandedVarietyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Modal d'ajout ou de modification d'observation phénologique
  const [editingVariety, setEditingVariety] = useState<VarietyProfile | null>(null);
  const [editingRecord, setEditingRecord] = useState<PhenologyRecord | null>(null);
  const [newRecordYear, setNewRecordYear] = useState<number>(new Date().getFullYear());
  const [newPruningDate, setNewPruningDate] = useState<string>("");
  const [newBloomStartDate, setNewBloomStartDate] = useState<string>("");
  const [newHarvestDate, setNewHarvestDate] = useState<string>("");
  const [newRecordNotes, setNewRecordNotes] = useState<string>("");

  // Valeurs calculées simultanément (3 modèles : Dynamique CP, Utah CU, Weinberger h)
  const [weinbergerHours, setWeinbergerHours] = useState<number>(0);
  const [utahUnits, setUtahUnits] = useState<number>(0);
  const [dynamicCP, setDynamicCP] = useState<number>(0);
  const [warmHoursCount, setWarmHoursCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [totalHoursAnalyzed, setTotalHoursAnalyzed] = useState<number>(0);

  const saveGeneralSettings = (settings: GeneralSettings) => {
    setGeneralSettings(settings);
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch { }
  };

  const saveCatalog = (newCat: VarietyProfile[]) => {
    setCatalog(newCat);
    try {
      localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(newCat));
    } catch { }
  };

  const computeAllModels = useCallback((temperatures: number[]) => {
    let weinberger = 0;
    let utah = 0;
    let warmHours = 0;
    let count = 0;

    for (const t of temperatures) {
      if (t === null || t === undefined || isNaN(t)) continue;
      count++;

      if (t > 0 && t <= 7.2) {
        weinberger += 1;
      }

      let hourCU = 0;
      if (t < 1.4) {
        hourCU = 0;
      } else if (t >= 1.4 && t <= 2.4) {
        hourCU = 0.5;
      } else if (t > 2.4 && t <= 9.1) {
        hourCU = 1.0;
      } else if (t > 9.1 && t <= 12.4) {
        hourCU = 0.5;
      } else if (t > 12.4 && t <= 15.9) {
        hourCU = 0;
      } else if (t >= 16.0 && t <= 18.0) {
        hourCU = -0.5;
        warmHours += 1;
      } else if (t > 18.0) {
        hourCU = -1.0;
        warmHours += 1;
      }
      utah = Math.max(0, utah + hourCU);
    }

    setWeinbergerHours(weinberger);
    setUtahUnits(Math.round(utah));
    setDynamicCP(computeDynamicChillPortions(temperatures));
    setWarmHoursCount(warmHours);
    setTotalHoursAnalyzed(count);
  }, []);

  const fetchHourlyWeatherData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const start = generalSettings.startDate;
      const urlArchive = `https://archive-api.open-meteo.com/v1/archive?latitude=${generalSettings.latitude}&longitude=${generalSettings.longitude}&start_date=${start}&end_date=${today}&hourly=temperature_2m&timezone=auto`;

      let temps: number[] = [];
      let success = false;

      try {
        const resArchive = await fetch(urlArchive);
        if (resArchive.ok) {
          const dataArchive = await resArchive.json();
          if (Array.isArray(dataArchive.hourly?.temperature_2m) && dataArchive.hourly.temperature_2m.length > 0) {
            temps = dataArchive.hourly.temperature_2m;
            success = true;
          }
        }
      } catch (err) {
        console.warn("Archive fetch skipped, falling back to forecast:", err);
      }

      if (!success || temps.length === 0) {
        const urlForecast = `https://api.open-meteo.com/v1/forecast?latitude=${generalSettings.latitude}&longitude=${generalSettings.longitude}&hourly=temperature_2m&past_days=14&timezone=auto`;
        const resForecast = await fetch(urlForecast);
        if (resForecast.ok) {
          const dataForecast = await resForecast.json();
          if (Array.isArray(dataForecast.hourly?.temperature_2m)) {
            temps = dataForecast.hourly.temperature_2m;
            success = true;
          }
        }
      }

      if (success && temps.length > 0) {
        computeAllModels(temps);
        setLastUpdated(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      } else {
        toast.error(
          isAr
            ? "تعذر جلب درجات الحرارة الساعية"
            : "Impossible de récupérer la série horaire des températures."
        );
      }
    } catch {
      toast.error(isAr ? "خطأ في الاتصال بالإنترنت" : "Erreur réseau : vérifiez la connexion Internet.");
    } finally {
      setLoading(false);
    }
  }, [generalSettings.latitude, generalSettings.longitude, generalSettings.startDate, computeAllModels, isAr]);

  useEffect(() => {
    fetchHourlyWeatherData();
  }, [fetchHourlyWeatherData]);

  useEffect(() => {
    if (externalRefreshTick && externalRefreshTick > 0) {
      fetchHourlyWeatherData();
    }
  }, [externalRefreshTick, fetchHourlyWeatherData]);

  const difference = weinbergerHours - utahUnits;

  const handleSavePhenologyObservation = () => {
    if (!editingVariety) return;
    if (!newBloomStartDate && !newPruningDate && !newHarvestDate) {
      return toast.error(
        isAr
          ? "يرجى إدخال تاريخ التقليم أو التزهير أو الجني على الأقل."
          : "Veuillez renseigner au moins une date (taille, floraison ou récolte)."
      );
    }

    const yr = Number(newRecordYear) || new Date().getFullYear();

    const record: PhenologyRecord = {
      year: yr,
      pruningDate: newPruningDate,
      bloomStartDate: newBloomStartDate,
      harvestStartDate: newHarvestDate || undefined,
      accumulatedHoursAtBloom: editingRecord?.accumulatedHoursAtBloom || (weinbergerHours > 0 ? weinbergerHours : undefined),
      accumulatedUtahAtBloom: editingRecord?.accumulatedUtahAtBloom || (utahUnits > 0 ? utahUnits : undefined),
      accumulatedDynamicCPAtBloom: editingRecord?.accumulatedDynamicCPAtBloom || (dynamicCP > 0 ? dynamicCP : undefined),
      notes: newRecordNotes.trim() || undefined,
    };

    let baseCat = catalog;
    if (editingRecord && editingRecord.year !== yr) {
      baseCat = deleteSeasonPhenology(baseCat, editingVariety.id, editingRecord.year);
    }

    const updated = recordSeasonPhenology(baseCat, editingVariety.id, record);
    saveCatalog(updated);
    toast.success(
      isAr
        ? editingRecord
          ? "تم تحديث الملاحظة الفينولوجية بنجاح"
          : "تم حفظ الملاحظة الفينولوجية بنجاح"
        : editingRecord
          ? "Observation phénologique mise à jour !"
          : "Observation phénologique enregistrée !"
    );
    setEditingVariety(null);
    setEditingRecord(null);
    setNewPruningDate("");
    setNewBloomStartDate("");
    setNewHarvestDate("");
    setNewRecordNotes("");
  };

  const getFrostBadge = (level: VarietyProfile["phenologyReference"]["frostSensitivity"]) => {
    switch (level) {
      case "très forte":
        return {
          label: isAr ? "حساسية شديدة للجليد" : "Gel : très sensible",
          tone: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        };
      case "forte":
        return {
          label: isAr ? "حساسية مرتفعة للجليد" : "Gel : sensible",
          tone: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        };
      case "moyenne":
        return {
          label: isAr ? "حساسية متوسطة" : "Gel : modéré",
          tone: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        };
      default:
        return {
          label: isAr ? "مقاوم للبرد" : "Résistant au froid",
          tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        };
    }
  };

  return (
    <div className="space-y-3.5 text-foreground" dir={isAr ? "rtl" : "ltr"}>
      {/* En-tête autonome uniquement si le composant est utilisé hors de Meteo.tsx */}
      {!embeddedInMeteo && viewMode !== "catalog" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Snowflake className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black">
                {isAr ? "ساعات البرودة الشتوية" : "Heures de Froid & Variétés"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {isAr ? "بنهار / عين وسارة · 762 م" : "Benhar / Aïn Oussera · 762 m"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchHourlyWeatherData}
              disabled={loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-background hover:bg-muted transition"
              title={isAr ? "تحديث" : "Actualiser"}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                showConfig ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
              }`}
              title={isAr ? "الإعدادات" : "Paramètres"}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Panneau de configuration modifiable */}
      {showConfig && (
        <div className="rounded-2xl border-2 border-primary/30 bg-card p-3.5 shadow-sm space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-black text-foreground flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-primary" />
              <span>{isAr ? "إعدادات الحساب وبداية موسم البرودة" : "Paramètres de calcul & besoins variétaux"}</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  saveGeneralSettings(DEFAULT_GENERAL_SETTINGS);
                  saveCatalog(VARIETIES_CATALOG);
                  toast.success(isAr ? "تمت استعادة القيم الافتراضية" : "Valeurs par défaut réinitialisées !");
                }}
                className="text-[11px] font-bold text-muted-foreground hover:text-foreground underline"
              >
                {isAr ? "افتراضي" : "Réinitialiser"}
              </button>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
                aria-label={isAr ? "إغلاق" : "Fermer"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                {isAr ? "تاريخ بداية التراكم الشتوي :" : "Date de début du cumul hivernal :"}
              </label>
              <input
                type="date"
                dir="ltr"
                value={generalSettings.startDate}
                onChange={(e) => saveGeneralSettings({ ...generalSettings, startDate: e.target.value })}
                className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                {isAr ? "الساعات المحللة :" : "Heures analysées :"}
              </label>
              <div className="rounded-xl border bg-muted/40 px-3 py-2 text-xs font-bold text-muted-foreground flex items-center justify-between">
                <span dir="ltr">
                  {totalHoursAnalyzed} {isAr ? "ساعة" : "h"}
                </span>
                <span dir="ltr" className="text-[10px] opacity-80">
                  ~{Math.round(totalHoursAnalyzed / 24)} {isAr ? "يوم" : "j"}
                </span>
              </div>
            </div>
          </div>

          {/* Calibrage des 4 variétés */}
          <div className="space-y-2 pt-2 border-t text-xs">
            <p className="text-[11px] font-bold text-muted-foreground">
              {isAr
                ? "احتياجات الأصناف (الديناميكي CP · يوتا CU · فاينبرغر ساعة) :"
                : "Besoins en froid par variété (Dynamique CP · Utah CU · Weinberger h) :"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {catalog.map((v, idx) => (
                <div key={v.id} className="rounded-xl border bg-muted/30 p-2.5 space-y-1.5">
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <span>{v.icon}</span>
                    <span className="truncate">{isAr ? v.nameAr : v.nameFr}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 block">
                        {isAr ? "الديناميكي (CP)" : "Dyn. (CP)"}
                      </span>
                      <input
                        type="number"
                        dir="ltr"
                        value={v.chillRequirements.dynamicCP ?? 0}
                        onChange={(e) => {
                          const updated = [...catalog];
                          updated[idx].chillRequirements.dynamicCP = Number(e.target.value) || 0;
                          saveCatalog(updated);
                        }}
                        className="w-full rounded-lg border bg-background px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 block">
                        {isAr ? "يوتا (CU)" : "Utah (CU)"}
                      </span>
                      <input
                        type="number"
                        dir="ltr"
                        value={v.chillRequirements.utahUnits}
                        onChange={(e) => {
                          const updated = [...catalog];
                          updated[idx].chillRequirements.utahUnits = Number(e.target.value) || 0;
                          saveCatalog(updated);
                        }}
                        className="w-full rounded-lg border bg-background px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block">
                        {isAr ? "فاينبرغر (سا)" : "Weinb. (h)"}
                      </span>
                      <input
                        type="number"
                        dir="ltr"
                        value={v.chillRequirements.weinbergerHours}
                        onChange={(e) => {
                          const updated = [...catalog];
                          updated[idx].chillRequirements.weinbergerHours = Number(e.target.value) || 0;
                          saveCatalog(updated);
                        }}
                        className="w-full rounded-lg border bg-background px-2 py-1 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1 : 3 CARTES COMPACTES CÔTE À CÔTE + EXPLICATION DÉPLIABLE + DIAGNOSTIC */}
      {viewMode !== "catalog" && (
        <>
          {loading ? (
            <div className="rounded-2xl border bg-card p-10 text-center space-y-2.5">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-xs font-bold text-muted-foreground">
                {isAr ? "جارٍ حساب ساعات البرودة من محطة الأرصاد..." : "Calcul des heures de froid en cours..."}
              </p>
            </div>
          ) : (
            <>
              {/* 3 modèles côte à côte (zéro troncature sur mobile) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* 1. Dynamique (Chill Portions — CP, mis en avant en violet) */}
                <div className="rounded-2xl border-2 border-violet-500 bg-violet-500/10 p-2.5 sm:p-3.5 flex flex-col justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="inline-block rounded-full bg-violet-600 text-white text-[9px] font-black px-1.5 py-0.5 leading-tight">
                      ⭐ {isAr ? "الأدق" : "Réf."}
                    </span>
                    <h3 className="text-[11px] sm:text-sm font-black text-foreground leading-tight">
                      {isAr ? "الديناميكي" : "Dynamique"}
                    </h3>
                  </div>
                  <div className="mt-2">
                    <span dir="ltr" className="block text-2xl sm:text-3xl font-black text-violet-700 dark:text-violet-300 leading-none">
                      {dynamicCP}
                    </span>
                    <span className="block text-[10px] sm:text-xs font-bold text-violet-700/80 dark:text-violet-300/80 mt-1">
                      {isAr ? "حصة برودة (CP)" : "Chill Portions (CP)"}
                    </span>
                  </div>
                </div>

                {/* 2. Utah (CU, en bleu) */}
                <div className="rounded-2xl border border-sky-500/40 bg-sky-500/5 p-2.5 sm:p-3.5 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="inline-block rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[9px] font-black px-1.5 py-0.5 leading-tight">
                      {isAr ? "فسيولوجي" : "Physio."}
                    </span>
                    <h3 className="text-[11px] sm:text-sm font-black text-foreground leading-tight">
                      {isAr ? "يوتا (Utah)" : "Utah"}
                    </h3>
                  </div>
                  <div className="mt-2">
                    <span dir="ltr" className="block text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 leading-none">
                      {utahUnits}
                    </span>
                    <span className="block text-[10px] sm:text-xs font-bold text-muted-foreground mt-1">
                      {isAr ? "وحدة برودة (CU)" : "Unités (CU)"}
                    </span>
                  </div>
                </div>

                {/* 3. Weinberger (h <= 7,2 °C, en vert) */}
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-2.5 sm:p-3.5 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="inline-block rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-black px-1.5 py-0.5 leading-tight">
                      <span dir="ltr">&le; 7,2°C</span>
                    </span>
                    <h3 className="text-[11px] sm:text-sm font-black text-foreground leading-tight">
                      {isAr ? "فاينبرغر" : "Weinberger"}
                    </h3>
                  </div>
                  <div className="mt-2">
                    <span dir="ltr" className="block text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                      {weinbergerHours}
                    </span>
                    <span className="block text-[10px] sm:text-xs font-bold text-muted-foreground mt-1">
                      {isAr ? "ساعة برودة" : "Heures (h)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloc dépliable unique : Comprendre les 3 modèles (strictement dans la langue active) */}
              <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowModelsGuide(!showModelsGuide)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted/40 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                    <span>{isAr ? "ℹ️ شرح النماذج الثلاثة" : "ℹ️ Comprendre les 3 modèles"}</span>
                  </span>
                  {showModelsGuide ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {showModelsGuide && (
                  <div className="border-t bg-muted/20 p-3.5 space-y-2.5 text-xs leading-relaxed">
                    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-2.5">
                      <p className="font-black text-violet-700 dark:text-violet-300 mb-0.5">
                        ⭐ {isAr ? "النموذج الديناميكي (الحصص الباردة CP)" : "Modèle Dynamique (Chill Portions — CP)"}
                      </p>
                      <p className="text-foreground/90">
                        {isAr
                          ? "الأدق لمناخ الهضاب العليا والبحر المتوسط: يتكون البرود على مرحلتين، وبمجرد تثبيت «حصة برودة» (CP) داخل البرعم لا يمكن لدفء الأيام اللاحقة محوها."
                          : "Référence la plus précise pour les Hauts-Plateaux et le climat méditerranéen : le froid se fixe en 2 étapes ; une fois une Chill Portion (CP) fixée dans le bourgeon, un redoux ne l'efface plus."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-2.5">
                      <p className="font-black text-sky-700 dark:text-sky-300 mb-0.5">
                        ❄️ {isAr ? "نموذج يوتا (وحدات البرودة CU)" : "Modèle Utah (Unités de froid — CU)"}
                      </p>
                      <p className="text-foreground/90">
                        {isAr
                          ? "يعطي وزناً لكل ساعة حسب الحرارة (+0.5 أو +1 وحدة) ويخصم وحدات عند ارتفاع الحرارة فوق 16°م، مع سقف أدنى 0 ساعة بساعة."
                          : "Pondère chaque heure selon la température (+0,5 ou +1 CU) et applique une pénalité au-delà de 16 °C (annulation par la chaleur diurne), avec plancher à 0 heure par heure."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                      <p className="font-black text-emerald-700 dark:text-emerald-300 mb-0.5">
                        ⏱️ {isAr ? "نموذج فاينبرغر (ساعات ≤ 7.2°م)" : "Modèle Weinberger (heures ≤ 7,2 °C)"}
                      </p>
                      <p className="text-foreground/90">
                        {isAr
                          ? "يحسب فقط عدد الساعات بين 0°م و 7.2°م دون خصم حرارة النهار. بسيط وسريع لكنه قد يبالغ في التقدير في المناطق المشمسة."
                          : "Compte simplement chaque heure entre 0 °C et 7,2 °C sans retirer la chaleur diurne. Simple mais tend à surestimer le froid en climat ensoleillé."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bandeau diagnostic compact (heures chaudes > 16°C + état d'avancement) */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>{isAr ? "التشخيص الفسيولوجي السريع" : "Diagnostic physiologique"}</span>
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2 py-0.5">
                      <Flame className="h-3 w-3" />
                      <span>{isAr ? "حرارة > 16°م :" : "> 16 °C :"}</span>
                      <span dir="ltr">{warmHoursCount} {isAr ? "سا" : "h"}</span>
                    </span>
                    {lastUpdated && (
                      <span dir="ltr" className="text-[10px] text-muted-foreground">
                        {lastUpdated}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-amber-950/90 dark:text-amber-100 leading-relaxed font-medium">
                  {weinbergerHours < 20 || warmHoursCount > 100
                    ? isAr
                      ? "بداية موسم البرودة — ارتفاع الساعات الدافئة (> 16°م) يؤخر الدخول في السكون التام. يُعتمد النموذج الديناميكي (CP) كمرجع أدق."
                      : "Début de saison de froid — les heures chaudes (> 16 °C) retardent la dormance. Le modèle Dynamique (CP) reste la référence la plus fiable."
                    : difference > 20
                      ? isAr
                        ? "ساعات النهار الدافئة تقلل من فعالية البرودة الليلية. النموذجان الديناميكي (CP) ويوتا (CU) يعكسان السكون الحقيقي بشكل أدق."
                        : "Les journées chaudes réduisent l'efficacité du froid nocturne. Les modèles Dynamique (CP) et Utah (CU) reflètent mieux la dormance réelle."
                      : isAr
                        ? "توافق ممتاز بين النماذج الثلاثة — الأجواء باردة ومناسبة لتراكم ساعات وحصص البرودة."
                        : "Bonne concordance entre les 3 modèles — conditions fraîches favorables à l'accumulation du froid."}
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* SECTION 2 : CARTES DES 4 VARIÉTÉS (1 colonne mobile, 2 colonnes desktop) */}
      {viewMode !== "counters" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-black text-muted-foreground">
              {isAr ? "تقدم البرودة حسب الأصناف" : "Progression par variété"}
            </h3>
            <span className="text-[11px] font-bold text-muted-foreground">
              {catalog.length} {isAr ? "أصناف" : "variétés"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {catalog.map((variety) => {
              const reqW = variety.chillRequirements.weinbergerHours;
              const reqU = variety.chillRequirements.utahUnits;
              const reqCP = variety.chillRequirements.dynamicCP ?? 35;
              const pctW = Math.min(100, Math.round((weinbergerHours / (reqW || 1)) * 100));
              const pctU = Math.min(100, Math.round((utahUnits / (reqU || 1)) * 100));
              const pctCP = Math.min(100, Math.round((dynamicCP / (reqCP || 1)) * 100));
              const isExpanded = expandedVarietyIds.includes(variety.id);
              const frostBadge = getFrostBadge(variety.phenologyReference.frostSensitivity);

              // RÈGLE STRICTE : lire UNIQUEMENT les campagnes réellement enregistrées pour cette variété
              const recordedCampaigns = Array.isArray(variety.campaignHistory)
                ? [...variety.campaignHistory].sort((a, b) => b.year - a.year)
                : [];
              const hasRecordedData = recordedCampaigns.length > 0;

              return (
                <div
                  key={variety.id}
                  className="rounded-2xl border bg-card shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-3.5 space-y-3">
                    {/* En-tête variété */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{variety.icon}</span>
                        <h4 className="font-black text-sm text-foreground leading-snug">
                          {isAr ? variety.nameAr : variety.nameFr}
                        </h4>
                      </div>
                      <span className={`shrink-0 rounded-full border text-[10px] font-bold px-2 py-0.5 ${frostBadge.tone}`}>
                        {frostBadge.label}
                      </span>
                    </div>

                    {/* 3 barres de progression (CP, CU, Weinberger) */}
                    <div className="space-y-2">
                      {/* 1. Dynamique CP */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-violet-700 dark:text-violet-300">
                            {isAr ? "الديناميكي (CP)" : "Dynamique (CP)"}
                          </span>
                          <span dir="ltr" className="font-black text-violet-700 dark:text-violet-300">
                            {dynamicCP} / {reqCP} CP ({pctCP}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-600 transition-all duration-500"
                            style={{ width: `${pctCP}%` }}
                          />
                        </div>
                      </div>

                      {/* 2. Utah CU */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-muted-foreground">
                            {isAr ? "يوتا (CU)" : "Utah (CU)"}
                          </span>
                          <span dir="ltr" className="font-black text-sky-600 dark:text-sky-400">
                            {utahUnits} / {reqU} CU ({pctU}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-500"
                            style={{ width: `${pctU}%` }}
                          />
                        </div>
                      </div>

                      {/* 3. Weinberger h */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-muted-foreground">
                            {isAr ? "فاينبرغر (≤ 7.2°م)" : "Weinberger (≤ 7,2 °C)"}
                          </span>
                          <span dir="ltr" className="font-black text-emerald-700 dark:text-emerald-400">
                            {weinbergerHours} / {reqW} h ({pctW}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${pctW}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions bas de carte : bouton "Plus d'informations / تفاصيل أكثر" UNIQUEMENT si des données réelles existent */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      {hasRecordedData ? (
                        <button
                          type="button"
                          onClick={() => toggleVarietyExpanded(variety.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border bg-muted/40 hover:bg-muted px-2.5 py-1.5 text-xs font-bold text-foreground transition active:scale-95 cursor-pointer"
                        >
                          <span>
                            {isExpanded
                              ? isAr
                                ? "إخفاء التفاصيل"
                                : "Masquer"
                              : isAr
                                ? `تفاصيل أكثر (${recordedCampaigns.length})`
                                : `Plus d'informations (${recordedCampaigns.length})`}
                          </span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingVariety(variety);
                          setEditingRecord(null);
                          setNewRecordYear(new Date().getFullYear());
                          setNewPruningDate("");
                          setNewBloomStartDate("");
                          setNewHarvestDate("");
                          setNewRecordNotes("");
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 text-[11px] font-bold transition active:scale-95 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{isAr ? "تسجيل موسم" : "Ajouter"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Bloc déplié : UNIQUEMENT les données réelles enregistrées (campagnes taille / floraison / récolte / remarques) */}
                  {hasRecordedData && isExpanded && (
                    <div className="bg-muted/25 border-t p-3.5 space-y-2.5 text-xs animate-in fade-in-50 duration-150">
                      <p className="text-[11px] font-black text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{isAr ? "السجل الحقيقي للمواسم المسجلة" : "Historique réel des campagnes enregistrées"}</span>
                      </p>

                      <div className="space-y-2">
                        {recordedCampaigns.map((h) => {
                          const intervalDays = computePruningToBloomDays(h.pruningDate, h.bloomStartDate);
                          return (
                            <div
                              key={h.year}
                              className="rounded-xl border bg-card p-3 space-y-2 shadow-2xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span dir="ltr" className="rounded-md bg-primary text-primary-foreground font-black text-[11px] px-2 py-0.5">
                                    {h.year}
                                  </span>
                                  {intervalDays !== null && (
                                    <span className="rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-[10px] px-2 py-0.5 inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {isAr ? "التقليم ← التزهير :" : "Taille → Floraison :"}
                                      </span>
                                      <strong dir="ltr">{intervalDays} {isAr ? "يوم" : "j"}</strong>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    title={isAr ? "تعديل" : "Modifier"}
                                    onClick={() => {
                                      setEditingVariety(variety);
                                      setEditingRecord(h);
                                      setNewRecordYear(h.year);
                                      setNewPruningDate(h.pruningDate || "");
                                      setNewBloomStartDate(h.bloomStartDate || "");
                                      setNewHarvestDate(h.harvestStartDate || "");
                                      setNewRecordNotes(h.notes || "");
                                    }}
                                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title={isAr ? "حذف" : "Supprimer"}
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          isAr
                                            ? `هل أنت متأكد من حذف تسجيل موسم ${h.year}؟`
                                            : `Supprimer définitivement la campagne ${h.year} ?`
                                        )
                                      ) {
                                        const updated = deleteSeasonPhenology(catalog, variety.id, h.year);
                                        saveCatalog(updated);
                                        toast.success(isAr ? "تم حذف الموسم بنجاح" : "Campagne supprimée !");
                                      }
                                    }}
                                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                                {h.pruningDate && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Scissors className="h-3.5 w-3.5 shrink-0" />
                                    <span>{isAr ? "التقليم :" : "Taille :"}</span>
                                    <strong dir="ltr" className="text-foreground">{h.pruningDate}</strong>
                                  </div>
                                )}
                                {h.bloomStartDate && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Flower2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    <span>{isAr ? "التزهير :" : "Floraison :"}</span>
                                    <strong dir="ltr" className="text-foreground">{h.bloomStartDate}</strong>
                                  </div>
                                )}
                                {h.harvestStartDate && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <span>{isAr ? "الجني :" : "Récolte :"}</span>
                                    <strong dir="ltr" className="text-foreground">{h.harvestStartDate}</strong>
                                  </div>
                                )}
                              </div>

                              {h.notes && (
                                <p className="text-[11px] bg-muted/40 p-2 rounded-lg text-muted-foreground italic">
                                  &laquo; {h.notes} &raquo;
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal d'ajout / modification d'observation de campagne (100% bilingue FR/AR) */}
      {editingVariety && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">{editingVariety.icon}</span>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    {editingRecord
                      ? isAr
                        ? `تعديل موسم ${newRecordYear}`
                        : `Modifier campagne ${newRecordYear}`
                      : isAr
                        ? `تسجيل موسم جديد`
                        : `Nouvelle campagne`}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {isAr ? editingVariety.nameAr : editingVariety.nameFr}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingVariety(null);
                  setEditingRecord(null);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    {isAr ? "سنة الحملة :" : "Année de campagne :"}
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={newRecordYear}
                    onChange={(e) => setNewRecordYear(Number(e.target.value) || new Date().getFullYear())}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    {isAr ? "تاريخ الجني :" : "Date de récolte :"}
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={newHarvestDate}
                    onChange={(e) => setNewHarvestDate(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    {isAr ? "تاريخ التقليم :" : "Date de taille :"}
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={newPruningDate}
                    onChange={(e) => setNewPruningDate(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    {isAr ? "بداية التزهير :" : "Début floraison :"}
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={newBloomStartDate}
                    onChange={(e) => setNewBloomStartDate(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              {newPruningDate && newBloomStartDate && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">
                    {isAr ? "المدة بين التقليم والتزهير :" : "Délai taille → floraison :"}
                  </span>
                  <span dir="ltr" className="font-black text-primary">
                    {computePruningToBloomDays(newPruningDate, newBloomStartDate)} {isAr ? "يوم" : "jours"}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  {isAr ? "ملاحظات ميدانية :" : "Observations de terrain :"}
                </label>
                <textarea
                  rows={2}
                  value={newRecordNotes}
                  onChange={(e) => setNewRecordNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? "مثال: تفتح متجانس، لا أضرار من الجليد..."
                      : "Ex : Débourrement régulier, aucun dégât de gel..."
                  }
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={() => {
                  setEditingVariety(null);
                  setEditingRecord(null);
                }}
                className="rounded-xl border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                {isAr ? "إلغاء" : "Annuler"}
              </button>
              <button
                type="button"
                onClick={handleSavePhenologyObservation}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-1.5 text-xs font-bold active:scale-95 shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>
                  {editingRecord
                    ? isAr
                      ? "تحديث"
                      : "Mettre à jour"
                    : isAr
                      ? "حفظ"
                      : "Enregistrer"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
