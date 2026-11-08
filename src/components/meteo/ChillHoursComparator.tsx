import React, { useState, useEffect, useCallback } from "react";
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
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

// ========================================================
// 1. CONFIGURATION & STRUCTURES DE DONNÉES
// ========================================================
export interface VarietyRequirements {
  cropKey: "nectarine" | "pomme" | "olive";
  nameFr: string;
  nameAr: string;
  icon: string;
  weinbergerReq: number; // Heures < 7.2°C
  utahReq: number;       // Unités Utah (CU)
}

export interface ChillSettings {
  latitude: number;
  longitude: number;
  startDate: string; // Ex: "2026-11-01"
  crops: VarietyRequirements[];
}

const DEFAULT_SETTINGS: ChillSettings = {
  latitude: 35.286281,
  longitude: 3.103180,
  startDate: "2026-11-01",
  crops: [
    {
      cropKey: "nectarine",
      nameFr: "Nectarine (Nablara / Redix 25)",
      nameAr: "نكتارين (نبلارة / ريديكس 25)",
      icon: "🍑",
      weinbergerReq: 650,
      utahReq: 700,
    },
    {
      cropKey: "pomme",
      nameFr: "Pommier (Gala One)",
      nameAr: "تفاح (غالا ون)",
      icon: "🍎",
      weinbergerReq: 750,
      utahReq: 850,
    },
    {
      cropKey: "olive",
      nameFr: "Olivier (Chemlal)",
      nameAr: "زيتون (شملال)",
      icon: "🫒",
      weinbergerReq: 300,
      utahReq: 350,
    },
  ],
};

const STORAGE_KEY = "doula_chill_hours_settings";

function loadSavedSettings(): ChillSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      crops: Array.isArray(parsed.crops) && parsed.crops.length === 3 ? parsed.crops : DEFAULT_SETTINGS.crops,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function ChillHoursComparator() {
  const { t, lang } = useTranslation();
  const isAr = lang === "ar";

  const [settings, setSettings] = useState<ChillSettings>(loadSavedSettings);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);

  // Valeurs calculées simultanément
  const [weinbergerHours, setWeinbergerHours] = useState<number>(0);
  const [utahUnits, setUtahUnits] = useState<number>(0);
  const [warmHoursCount, setWarmHoursCount] = useState<number>(0); // Heures > 16°C
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [totalHoursAnalyzed, setTotalHoursAnalyzed] = useState<number>(0);

  const saveSettings = (newSettings: ChillSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch {}
  };

  // ========================================================
  // 2. MOTEUR DE CALCUL CONCURRENT DES 2 MODÈLES
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
      // 1 heure comptabilisée pour chaque heure passée entre 0°C et 7.2°C
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
  // 3. RÉCUPÉRATION MÉTÉO EN LIGNE (OPEN-METEO)
  // ========================================================
  const fetchHourlyWeatherData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const start = settings.startDate;

      // 1. Essai sur l'archive historique horaire
      const urlArchive = `https://archive-api.open-meteo.com/v1/archive?latitude=${settings.latitude}&longitude=${settings.longitude}&start_date=${start}&end_date=${today}&hourly=temperature_2m&timezone=auto`;

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

      // 2. Si l'archive récente est vide (délai de consolidation J-1), fallback sur le forecast avec past_days
      if (!success || temps.length === 0) {
        const urlForecast = `https://api.open-meteo.com/v1/forecast?latitude=${settings.latitude}&longitude=${settings.longitude}&hourly=temperature_2m&past_days=14&timezone=auto`;
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
  }, [settings.latitude, settings.longitude, settings.startDate, computeBothModels, isAr]);

  useEffect(() => {
    fetchHourlyWeatherData();
  }, [fetchHourlyWeatherData]);

  // Différence et ratio entre les deux modèles
  const difference = weinbergerHours - utahUnits;

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
                <span>{isAr ? "مقارن ساعات البرودة (وينبرجر مقابل يوتا)" : "Comparateur d'Heures de Froid"}</span>
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black px-2 py-0.5">
                  Weinberger vs Utah
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>
                  GPS : {settings.latitude.toFixed(4)}°N, {settings.longitude.toFixed(4)}°E (Alt. ~762 m) · Ferme Doula Agro
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
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition active:scale-95 ${
              showConfig
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
                saveSettings(DEFAULT_SETTINGS);
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
              <div className="relative">
                <input
                  type="date"
                  value={settings.startDate}
                  onChange={(e) => saveSettings({ ...settings, startDate: e.target.value })}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
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

          {/* Besoins par culture */}
          <div className="space-y-2 pt-2 border-t text-xs">
            <p className="text-[11px] font-bold text-muted-foreground uppercase">
              {isAr ? "احتياجات الأصناف (Weinberger h / Utah CU) :" : "Besoins par culture (Weinberger h / Utah CU) :"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {settings.crops.map((crop, idx) => (
                <div key={crop.cropKey} className="rounded-xl border bg-muted/30 p-2.5 space-y-1.5">
                  <p className="font-bold text-xs flex items-center gap-1">
                    <span>{crop.icon}</span>
                    <span className="truncate">{isAr ? crop.nameAr : crop.nameFr}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Weinb. (h)</span>
                      <input
                        type="number"
                        value={crop.weinbergerReq}
                        onChange={(e) => {
                          const updated = [...settings.crops];
                          updated[idx].weinbergerReq = Number(e.target.value) || 0;
                          saveSettings({ ...settings, crops: updated });
                        }}
                        className="w-full rounded-lg border bg-background px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Utah (CU)</span>
                      <input
                        type="number"
                        value={crop.utahReq}
                        onChange={(e) => {
                          const updated = [...settings.crops];
                          updated[idx].utahReq = Number(e.target.value) || 0;
                          saveSettings({ ...settings, crops: updated });
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

      {/* Progression comparée par culture */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          {isAr ? "مستوى تقدم تلبية احتياجات كل محصول :" : "Progression Comparée par Culture"}
        </h3>

        <div className="space-y-2.5">
          {settings.crops.map((crop) => {
            const pctW = Math.min(100, Math.round((weinbergerHours / crop.weinbergerReq) * 100));
            const pctU = Math.min(100, Math.round((utahUnits / crop.utahReq) * 100));

            return (
              <div
                key={crop.cropKey}
                className="rounded-2xl border bg-card p-4 shadow-xs space-y-3 hover:border-primary/40 transition"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{crop.icon}</span>
                    <span className="font-bold text-sm text-foreground">
                      {isAr ? crop.nameAr : crop.nameFr}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-muted-foreground">
                    {pctU >= 100 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isAr ? "مكتمل" : "Besoins comblés"}
                      </span>
                    ) : (
                      `${pctU}% Utah`
                    )}
                  </span>
                </div>

                {/* Ligne Weinberger */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-muted-foreground">
                      Weinberger (&le; 7.2°C) :
                    </span>
                    <span className="font-black text-foreground">
                      {weinbergerHours} / {crop.weinbergerReq} h ({pctW}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pctW >= 100 ? "bg-emerald-600" : "bg-emerald-500"
                      }`}
                      style={{ width: `${pctW}%` }}
                    />
                  </div>
                </div>

                {/* Ligne Utah */}
                <div className="space-y-1 text-xs pt-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-muted-foreground">
                      Utah (Unités CU) :
                    </span>
                    <span className="font-black text-sky-600 dark:text-sky-400">
                      {utahUnits} / {crop.utahReq} CU ({pctU}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pctU >= 100 ? "bg-sky-600" : "bg-sky-500"
                      }`}
                      style={{ width: `${pctU}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
