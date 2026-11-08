import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Snowflake,
  Settings,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  X,
  TrendingDown,
  TrendingUp,
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Scissors,
  Flower2,
  Clock,
  ShieldAlert,
  Sprout,
  Save,
  Pencil,
  Trash2,
  CalendarCheck
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

interface GeneralSettings {
  latitude: number;
  longitude: number;
  startDate: string; // Ex: "2026-11-01"
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
      // S'assurer de conserver les nouvelles propriétés de VARIETIES_CATALOG
      return VARIETIES_CATALOG.map((v) => {
        const found = parsed.find((p) => p.id === v.id);
        if (!found) return v;
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
          campaignHistory: Array.isArray(found.campaignHistory) && found.campaignHistory.length > 0
            ? found.campaignHistory.map((ch: PhenologyRecord) => {
                const def = v.campaignHistory.find((dh) => dh.year === ch.year);
                return {
                  ...def,
                  ...ch,
                  harvestStartDate: ch.harvestStartDate || def?.harvestStartDate,
                };
              })
            : v.campaignHistory,
        };
      });
    }
    return VARIETIES_CATALOG;
  } catch {
    return VARIETIES_CATALOG;
  }
}

export function ChillHoursComparator() {
  const { t, lang } = useTranslation();
  const isAr = lang === "ar";

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(loadSavedGeneralSettings);
  const [catalog, setCatalog] = useState<VarietyProfile[]>(loadSavedCatalog);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);

  // Vue accordéon pour les détails phénologiques de chaque variété
  const [expandedVarietyId, setExpandedVarietyId] = useState<string | null>("nec_nablara");

  // Modal d'ajout ou de modification d'observation phénologique
  const [editingVariety, setEditingVariety] = useState<VarietyProfile | null>(null);
  const [editingRecord, setEditingRecord] = useState<PhenologyRecord | null>(null);
  const [newRecordYear, setNewRecordYear] = useState<number>(new Date().getFullYear());
  const [newPruningDate, setNewPruningDate] = useState<string>("");
  const [newBloomStartDate, setNewBloomStartDate] = useState<string>("");
  const [newHarvestDate, setNewHarvestDate] = useState<string>("");
  const [newRecordNotes, setNewRecordNotes] = useState<string>("");

  // Valeurs calculées simultanément
  const [weinbergerHours, setWeinbergerHours] = useState<number>(0);
  const [utahUnits, setUtahUnits] = useState<number>(0);
  const [warmHoursCount, setWarmHoursCount] = useState<number>(0); // Heures > 16°C
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

  // ========================================================
  // MOTEUR DE CALCUL CONCURRENT DES 2 MODÈLES
  // ========================================================
  const computeBothModels = useCallback((temperatures: number[]) => {
    let weinberger = 0;
    let utah = 0;
    let warmHours = 0;
    let count = 0;

    for (const t of temperatures) {
      if (t === null || t === undefined || isNaN(t)) continue;
      count++;

      // --- Modèle Weinberger (< 7.2°C) ---
      if (t > 0 && t <= 7.2) {
        weinberger += 1;
      }

      // --- Modèle Utah (Unités CU avec pénalités thermiques) ---
      if (t < 1.4) {
        utah += 0;
      } else if (t >= 1.4 && t <= 2.4) {
        utah += 0.5;
      } else if (t > 2.4 && t <= 9.1) {
        utah += 1.0;
      } else if (t > 9.1 && t <= 12.4) {
        utah += 0.5;
      } else if (t > 12.4 && t <= 15.9) {
        utah += 0;
      } else if (t >= 16.0 && t <= 18.0) {
        utah -= 0.5; // Début d'annulation par la chaleur
        warmHours += 1;
      } else if (t > 18.0) {
        utah -= 1.0; // Forte annulation de l'accumulation
        warmHours += 1;
      }
    }

    setWeinbergerHours(weinberger);
    setUtahUnits(Math.max(0, Math.round(utah))); // Le cumul Utah ne peut être négatif
    setWarmHoursCount(warmHours);
    setTotalHoursAnalyzed(count);
  }, []);

  // ========================================================
  // RÉCUPÉRATION MÉTÉO EN LIGNE (OPEN-METEO)
  // ========================================================
  const fetchHourlyWeatherData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const start = generalSettings.startDate;

      // 1. Essai sur l'archive historique horaire
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
        console.warn("Archive fetch skipped or failed, falling back to forecast:", err);
      }

      // 2. Si l'archive récente est vide, fallback sur le forecast avec past_days
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
        computeBothModels(temps);
        setLastUpdated(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      } else {
        toast.error(isAr ? "تعذر جلب درجات الحرارة الساعية" : "Impossible de récupérer la série temporelle horaire.");
      }
    } catch (err) {
      toast.error(isAr ? "خطأ في الاتصال بالإنترنت" : "Erreur réseau : vérifiez la connexion Internet.");
    } finally {
      setLoading(false);
    }
  }, [generalSettings.latitude, generalSettings.longitude, generalSettings.startDate, computeBothModels, isAr]);

  useEffect(() => {
    fetchHourlyWeatherData();
  }, [fetchHourlyWeatherData]);

  // Différence et ratio entre les deux modèles
  const difference = weinbergerHours - utahUnits;

  // Soumission du formulaire d'observation annuelle
  const handleSavePhenologyObservation = () => {
    if (!editingVariety) return;
    if (!newBloomStartDate && !newPruningDate) {
      return toast.error("Veuillez renseigner au moins une date de taille ou de début de floraison.");
    }

    const yr = Number(newRecordYear) || new Date().getFullYear();

    const record: PhenologyRecord = {
      year: yr,
      pruningDate: newPruningDate,
      bloomStartDate: newBloomStartDate,
      harvestStartDate: newHarvestDate || undefined,
      accumulatedHoursAtBloom: editingRecord?.accumulatedHoursAtBloom || (weinbergerHours > 0 ? weinbergerHours : undefined),
      accumulatedUtahAtBloom: editingRecord?.accumulatedUtahAtBloom || (utahUnits > 0 ? utahUnits : undefined),
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
        ? "تم حفظ تسجيل الملاحظة الفينولوجية بنجاح"
        : editingRecord
        ? "Observation phénologique mise à jour avec succès !"
        : "Observation phénologique enregistrée avec succès !"
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
          label: isAr ? "حساسية شديدة للجليد" : "Sensibilité gel très forte",
          tone: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        };
      case "forte":
        return {
          label: isAr ? "حساسية مرتفعة للجليد" : "Sensibilité gel forte",
          tone: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        };
      case "moyenne":
        return {
          label: isAr ? "حساسية متوسطة" : "Sensibilité gel moyenne",
          tone: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        };
      default:
        return {
          label: isAr ? "مقاوم للبرد" : "Résistant au froid",
          tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        };
    }
  };

  return (
    <div className="space-y-4 text-foreground" dir={isAr ? "rtl" : "ltr"}>
      {/* Entête */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Snowflake className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <span>{isAr ? "المرجع الصنفي وتتبع ساعات البرودة" : "Référentiel Variétal & Heures de Froid"}</span>
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black px-2 py-0.5">
                  Weinberger vs Utah
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>
                  GPS : {generalSettings.latitude.toFixed(4)}°N, {generalSettings.longitude.toFixed(4)}°E (Alt. ~762 m) · Ferme Doula Agro
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHourlyWeatherData}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-background px-3 text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition"
            title="Rafraîchir"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">{isAr ? "تحديث" : "Actualiser"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition active:scale-95 ${showConfig
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{showConfig ? (isAr ? "إغلاق ✕" : "Fermer ✕") : (isAr ? "الإعدادات ⚙️" : "Paramètres ⚙️")}</span>
          </button>
        </div>
      </div>

      {/* Panneau de configuration modifiable */}
      {showConfig && (
        <div className="rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-sm space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-primary" />
              <span>{isAr ? "تعديل معايير الحساب وبداية التراكم" : "Ajustement des Paramètres & Besoins Variétaux"}</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                saveGeneralSettings(DEFAULT_GENERAL_SETTINGS);
                saveCatalog(VARIETIES_CATALOG);
                toast.success(isAr ? "تمت استعادة القيم الافتراضية" : "Paramètres par défaut réinitialisés !");
              }}
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline"
            >
              {isAr ? "القيم الافتراضية" : "Réinitialiser"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                {isAr ? "تاريخ بداية التراكم الشتوي :" : "Date de début du cumul hivernal :"}
              </label>
              <input
                type="date"
                value={generalSettings.startDate}
                onChange={(e) => saveGeneralSettings({ ...generalSettings, startDate: e.target.value })}
                className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                {isAr ? "ساعات تم تحليلها من محطة الأرصاد :" : "Heures horaires analysées :"}
              </label>
              <div className="rounded-xl border bg-muted/40 px-3 py-2 text-xs font-bold text-muted-foreground flex items-center justify-between">
                <span>{totalHoursAnalyzed} heures</span>
                <span className="text-[10px] opacity-75">~{Math.round(totalHoursAnalyzed / 24)} jours</span>
              </div>
            </div>
          </div>

          {/* Calibrage des 4 variétés */}
          <div className="space-y-2 pt-2 border-t text-xs">
            <p className="text-[11px] font-bold text-muted-foreground uppercase">
              {isAr ? "احتياجات الأصناف الأربعة (Weinberger h / Utah CU) :" : "Calibrage des besoins en froid (Weinberger h / Utah CU) :"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {catalog.map((v, idx) => (
                <div key={v.id} className="rounded-xl border bg-muted/30 p-2.5 space-y-1.5">
                  <p className="font-bold text-xs flex items-center gap-1">
                    <span>{v.icon}</span>
                    <span className="truncate">{isAr ? v.nameAr : v.nameFr}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Weinb. (h)</span>
                      <input
                        type="number"
                        value={v.chillRequirements.weinbergerHours}
                        onChange={(e) => {
                          const updated = [...catalog];
                          updated[idx].chillRequirements.weinbergerHours = Number(e.target.value) || 0;
                          saveCatalog(updated);
                        }}
                        className="w-full rounded-lg border bg-background px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Utah (CU)</span>
                      <input
                        type="number"
                        value={v.chillRequirements.utahUnits}
                        onChange={(e) => {
                          const updated = [...catalog];
                          updated[idx].chillRequirements.utahUnits = Number(e.target.value) || 0;
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

      {/* Cartes des deux compteurs côte à côte */}
      {loading ? (
        <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs font-bold text-muted-foreground">
            {isAr ? "جارٍ جلب السلسلة الزمنية من القمر الصناعي للأرصاد..." : "Interrogation du satellite météo en cours..."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Carte Weinberger */}
            <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 relative overflow-hidden flex flex-col justify-between shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5">
                    {isAr ? "النموذج الكلاسيكي البسيط" : "Modèle Simple"}
                  </span>
                  <h3 className="text-base font-black text-foreground mt-1">Weinberger</h3>
                  <p className="text-xs text-muted-foreground">T° &le; 7.2°C (0°C &agrave; 7.2°C)</p>
                </div>
                <span className="text-2xl">⏱️</span>
              </div>
              <div className="my-3">
                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {weinbergerHours}
                </span>
                <span className="text-xs font-bold text-muted-foreground ml-2 mr-2">
                  {isAr ? "ساعة فعلية" : "Heures Réelles"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground border-t border-emerald-500/20 pt-2">
                {isAr
                  ? "يحسب فقط الساعات أقل من 7.2°م دون مراعاة التأثير السلبي لارتفاع حرارة النهار."
                  : "Comptabilise uniquement les heures < 7.2°C sans déduire l'impact des coups de chaud."}
              </p>
            </div>

            {/* Carte Utah */}
            <div className="rounded-2xl border-2 border-sky-500/30 bg-sky-500/5 p-4 relative overflow-hidden flex flex-col justify-between shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-[10px] font-black uppercase px-2 py-0.5">
                    {isAr ? "النموذج الفسيولوجي الدقيق" : "Modèle Physiologique"}
                  </span>
                  <h3 className="text-base font-black text-foreground mt-1">Utah</h3>
                  <p className="text-xs text-muted-foreground">{isAr ? "خصم عقوبات الحرارة > 16°م" : "Pénalités thermiques > 16°C"}</p>
                </div>
                <span className="text-2xl">❄️</span>
              </div>
              <div className="my-3">
                <span className="text-4xl font-black text-sky-600 dark:text-sky-400 tracking-tight">
                  {utahUnits}
                </span>
                <span className="text-xs font-bold text-muted-foreground ml-2 mr-2">
                  {isAr ? "وحدة برودة (CU)" : "Unités de Froid (CU)"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground border-t border-sky-500/20 pt-2">
                {isAr
                  ? "يطرح وحدات البرودة عند ارتفاع درجات الحرارة نهاراً فوق 16°م و18°م (انعكاس كسر السكون)."
                  : "Applique des coefficients physiologiques et déduit le froid annulé par la chaleur de midi."}
              </p>
            </div>
          </div>

          {/* Analyse comparative et diagnostic d'impact thermique */}
          <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>{isAr ? "التحليل المقارن والتشخيص الفسيولوجي للحرارة" : "📊 Analyse Comparative de l'Écart"}</span>
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {lastUpdated ? `${isAr ? "آخر تحديث :" : "Dernière mise à jour :"} ${lastUpdated}` : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border bg-muted/30 p-2.5 flex items-center justify-between">
                <span className="text-muted-foreground">
                  {isAr ? "الفارق بين النموذجين :" : "Écart constaté (Weinberger - Utah) :"}
                </span>
                <span className="font-black text-foreground text-sm">
                  {difference > 0 ? `+${difference}` : difference} {isAr ? "وحدة" : "unités"}
                </span>
              </div>
              <div className="rounded-xl border bg-muted/30 p-2.5 flex items-center justify-between">
                <span className="text-muted-foreground">
                  {isAr ? "ساعات الحرارة المفرطة (> 16°م) :" : "Heures chaudes détectées (> 16°C) :"}
                </span>
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                  {warmHoursCount} {isAr ? "ساعة" : "heures"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{isAr ? "تشخيص ورأي المهندس الفلاحي :" : "💡 Avis Agronome :"}</span>
              </p>
              <p className="leading-relaxed">
                {difference > 20
                  ? isAr
                    ? "تؤدي ساعات النهار المشمسة والدافئة إلى إضعاف فعالية البرودة المتراكمة ليلاً. نموذج يوتا يعكس بشكل أصدق مرحلة السكون الفسيولوجي للأشجار في ضيعتنا مقارنة بالعد الخام البسيط."
                    : "Les journées chaudes actuelles réduisent l'efficacité du froid accumulé la nuit. Le modèle Utah reflète plus fidèlement la dormance physiologique que le simple décompte brut."
                  : isAr
                    ? "توافق ممتاز بين النموذجين : تبقى درجات الحرارة النهارية معتدلة وباردة مما يمنع إتلاف وتدمير وحدات البرودة المتراكمة."
                    : "Bonne concordance entre les modèles : les températures diurnes restent suffisamment fraîches pour éviter la destruction des unités de froid."}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Progression & Référentiel des 4 variétés */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span>{isAr ? "الأصناف الأربعة والتاريخ الفينولوجي للضيعة :" : "Progression & Référentiel Phénologique (4 Variétés)"}</span>
          </h3>
          <span className="text-[10px] text-muted-foreground font-semibold">
            {catalog.length} variétés suivies
          </span>
        </div>

        <div className="space-y-3">
          {catalog.map((variety) => {
            const reqW = variety.chillRequirements.weinbergerHours;
            const reqU = variety.chillRequirements.utahUnits;
            const pctW = Math.min(100, Math.round((weinbergerHours / (reqW || 1)) * 100));
            const pctU = Math.min(100, Math.round((utahUnits / (reqU || 1)) * 100));
            const isExpanded = expandedVarietyId === variety.id;
            const frostBadge = getFrostBadge(variety.phenologyReference.frostSensitivity);

            return (
              <div
                key={variety.id}
                className="rounded-2xl border bg-card shadow-xs overflow-hidden transition-all hover:border-primary/40"
              >
                {/* En-tête de la variété */}
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{variety.icon}</span>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {isAr ? variety.nameAr : variety.nameFr}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            {variety.pedigree}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border text-[10px] font-bold px-2 py-0.5 ${frostBadge.tone}`}>
                        {frostBadge.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedVarietyId(isExpanded ? null : variety.id)}
                        className="inline-flex items-center gap-1 rounded-xl border bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground transition active:scale-95"
                      >
                        <span>{isExpanded ? "Masquer détails" : "Historique & Fiche"}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Ligne Weinberger */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1">
                        <span>Weinberger (&le; 7.2°C) :</span>
                      </span>
                      <span className="font-black text-foreground">
                        {weinbergerHours} / {reqW} h ({pctW}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pctW >= 100 ? "bg-emerald-600" : "bg-emerald-500"
                          }`}
                        style={{ width: `${pctW}%` }}
                      />
                    </div>
                  </div>

                  {/* Ligne Utah */}
                  <div className="space-y-1 text-xs pt-0.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1">
                        <span>Utah (Unités CU) :</span>
                      </span>
                      <span className="font-black text-sky-600 dark:text-sky-400">
                        {utahUnits} / {reqU} CU ({pctU}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pctU >= 100 ? "bg-sky-600" : "bg-sky-500"
                          }`}
                        style={{ width: `${pctU}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section détaillée : Fiche phénologique & Campagnes réelles */}
                {isExpanded && (
                  <div className="bg-muted/20 border-t p-4 space-y-4 animate-in fade-in-50 duration-200 text-xs">
                    {/* Caractéristiques de référence */}
                    <div className="rounded-xl border bg-card p-3 space-y-2">
                      <p className="font-black uppercase tracking-wider text-[10px] text-muted-foreground flex items-center gap-1">
                        <Flower2 className="h-3.5 w-3.5 text-primary" />
                        <span>{isAr ? "الخصائص المرجعية للصنف" : "Caractéristiques Phénologiques de Référence"}</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="rounded-lg border bg-muted/30 p-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            {isAr ? "فترة الإزهار :" : "Période Floraison :"}
                          </span>
                          <span className="font-bold text-foreground">
                            {isAr ? variety.phenologyReference.bloomPeriodAr : variety.phenologyReference.bloomPeriodFr}
                          </span>
                        </div>
                        <div className="rounded-lg border bg-muted/30 p-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            {isAr ? "فترة النضج والجني :" : "Époque Maturité :"}
                          </span>
                          <span className="font-bold text-foreground">
                            {variety.phenologyReference.maturityPeriodFr}
                          </span>
                        </div>
                        <div className="rounded-lg border bg-muted/30 p-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            {isAr ? "قوة النمو :" : "Vigueur & Port :"}
                          </span>
                          <span className="font-bold text-foreground">
                            {variety.phenologyReference.vigor}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Historique réel des campagnes de la ferme */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-black uppercase tracking-wider text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-sky-500" />
                          <span>{isAr ? "السجل التاريخي لسنوات الضيعة (Taille & Floraison) :" : "Historique Réel des Campagnes (Constats Terrain)"}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVariety(variety);
                            setNewRecordYear(new Date().getFullYear());
                            setNewPruningDate("");
                            setNewBloomStartDate("");
                            setNewHarvestDate("");
                            setNewRecordNotes("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold active:scale-95 transition"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{isAr ? "إضافة ملاحظة سنة" : "Ajouter observation"}</span>
                        </button>
                      </div>

                      {variety.campaignHistory.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">
                          Aucun constat enregistré pour cette variété.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {variety.campaignHistory.map((h, hIdx) => {
                            const intervalDays = computePruningToBloomDays(h.pruningDate, h.bloomStartDate);

                            return (
                              <div
                                key={hIdx}
                                className="rounded-xl border bg-card p-3 space-y-2 shadow-2xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-primary text-primary-foreground font-black text-[10px] px-2 py-0.5">
                                      {h.year}
                                    </span>
                                    {intervalDays !== null && (
                                      <span className="rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] px-2 py-0.5 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>Délai taille &rarr; floraison : {intervalDays} jours</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                    {h.accumulatedHoursAtBloom && (
                                      <span>Cumul réveil : <strong>{h.accumulatedHoursAtBloom} h</strong></span>
                                    )}

                                    {/* Actions Modifier & Supprimer */}
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        title={isAr ? "تعديل الملاحظة" : "Modifier l'observation"}
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
                                        title={isAr ? "حذف الملاحظة" : "Supprimer l'observation"}
                                        onClick={() => {
                                          if (
                                            window.confirm(
                                              isAr
                                                ? `هل أنت متأكد من حذف ملاحظة سنة ${h.year}؟`
                                                : `Voulez-vous vraiment supprimer l'observation de la campagne ${h.year} ?`
                                            )
                                          ) {
                                            const updated = deleteSeasonPhenology(catalog, variety.id, h.year);
                                            saveCatalog(updated);
                                            toast.success(
                                              isAr
                                                ? "تم حذف الملاحظة بنجاح"
                                                : "Observation de la campagne supprimée avec succès !"
                                            );
                                          }
                                        }}
                                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Scissors className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span>{isAr ? "تاريخ التقليم :" : "Date de taille :"}</span>
                                    <strong className="text-foreground">{h.pruningDate || "—"}</strong>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Flower2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    <span>{isAr ? "بداية التزهير :" : "Début floraison :"}</span>
                                    <strong className="text-foreground">{h.bloomStartDate || "—"}</strong>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <span>{isAr ? "تاريخ الجني :" : "Date de récolte :"}</span>
                                    <strong className="text-foreground">{h.harvestStartDate || "—"}</strong>
                                  </div>
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
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal d'ajout d'observation phénologique de campagne */}
      {editingVariety && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{editingVariety.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {editingRecord
                      ? (isAr ? `تعديل الملاحظة : ${editingVariety.nameAr || editingVariety.nameFr} (${newRecordYear})` : `Modifier l'observation : ${editingVariety.nameFr} (${newRecordYear})`)
                      : (isAr ? `تسجيل ملاحظة جديدة : ${editingVariety.nameAr || editingVariety.nameFr}` : `Nouvelle observation : ${editingVariety.nameFr}`)}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {isAr ? "السجل التاريخي لسنوات الضيعة ومتابعة الأطوار الفينولوجية" : "Enrichissement de l'historique phénologique de la ferme"}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                    Année de campagne :
                  </label>
                  <input
                    type="number"
                    value={newRecordYear}
                    onChange={(e) => setNewRecordYear(Number(e.target.value) || new Date().getFullYear())}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                    Date de récolte (optionnel) :
                  </label>
                  <input
                    type="date"
                    value={newHarvestDate}
                    onChange={(e) => setNewHarvestDate(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                    Date de taille :
                  </label>
                  <input
                    type="date"
                    value={newPruningDate}
                    onChange={(e) => setNewPruningDate(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                    Début floraison :
                  </label>
                  <input
                    type="date"
                    value={newBloomStartDate}
                    onChange={(e) => setNewBloomStartDate(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Aperçu du délai automatique si les 2 dates sont saisies */}
              {newPruningDate && newBloomStartDate && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">Délai taille &rarr; floraison calculé :</span>
                  <span className="font-black text-primary">
                    {computePruningToBloomDays(newPruningDate, newBloomStartDate)} jours
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  Observations de terrain / vigueur / nouaison :
                </label>
                <textarea
                  rows={2}
                  value={newRecordNotes}
                  onChange={(e) => setNewRecordNotes(e.target.value)}
                  placeholder="Ex : Réveil régulier, 17 jours après la taille, pas de dégât de gel."
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
                    ? (isAr ? "تحديث الملاحظة 💾" : "Mettre à jour l'observation")
                    : (isAr ? "حفظ الملاحظة 💾" : "Enregistrer observation")}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
