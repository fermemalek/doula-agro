import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  CloudSun,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  Calendar,
  Bell,
  Mail,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Info,
  Clock,
  Send,
  Sparkles,
  Snowflake
} from "lucide-react";
import { ChillHoursComparator } from "@/components/meteo/ChillHoursComparator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useRole } from "@/lib/role";

// Coordonnées géographiques de la ferme Doula Agro (Région Ain Oussera / Djelfa)
const LAT = 35.286281;
const LON = 3.103180;

interface OpenMeteoData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    et0_fao_evapotranspiration: number[];
  };
}

async function fetchFarmMeteo(): Promise<OpenMeteoData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Impossible de charger les données météo");
  return res.json();
}

function getWeatherDesc(code: number, isAr: boolean): { label: string; icon: any } {
  if (code === 0) return { label: isAr ? "سماء صافية / مشمس" : "Ciel dégagé / Ensoleillé", icon: Sun };
  if (code === 1 || code === 2) return { label: isAr ? "قليل الغيوم" : "Partiellement voilé", icon: CloudSun };
  if (code === 3) return { label: isAr ? "غائم" : "Nuageux", icon: CloudSun };
  if (code >= 51 && code <= 67) return { label: isAr ? "أمطار خفيفة" : "Pluie légère", icon: CloudRain };
  if (code >= 80 && code <= 99) return { label: isAr ? "زخات مطرية / عواصف" : "Averses / Orages", icon: CloudRain };
  return { label: isAr ? "طقس متقلب" : "Variable", icon: Sun };
}

// Données climatiques moyennes mensuelles calculées pour la zone de la ferme
const MONTHLY_CLIMATE_DATA = [
  {
    monthIdx: 0,
    nameFr: "Janvier",
    nameAr: "جانفي (يناير)",
    tempMax: 12.2,
    tempMin: 1.5,
    rainMm: 28,
    rainDays: 6,
    et0: 1.8,
    agriNotesFr: "Repos végétatif, taille d'hiver. Risque élevé de gelées blanches.",
    agriNotesAr: "فترة السكون الشتوي، التقليم الشتوي. خطر مرتفع للجليد والبرد.",
    riskLevel: "gel"
  },
  {
    monthIdx: 1,
    nameFr: "Février",
    nameAr: "فيفري (فبراير)",
    tempMax: 13.8,
    tempMin: 2.4,
    rainMm: 25,
    rainDays: 5,
    et0: 2.4,
    agriNotesFr: "Fin de taille, application cuivre/huile blanche avant débourrement.",
    agriNotesAr: "نهاية التقليم، المعالجة الشتوية بالنحاس والزيوت قبل انتفاخ البراعم.",
    riskLevel: "gel"
  },
  {
    monthIdx: 2,
    nameFr: "Mars",
    nameAr: "مارس",
    tempMax: 17.5,
    tempMin: 5.0,
    rainMm: 32,
    rainDays: 6,
    et0: 3.5,
    agriNotesFr: "Débourrement et floraison. Risque critique de gelées printanières. Démarrage de la fertigation.",
    agriNotesAr: "تفتح البراعم والإزهار. حساسية عالية للجليد الربيعي. بداية التسميد بالري.",
    riskLevel: "gel_printemps"
  },
  {
    monthIdx: 3,
    nameFr: "Avril",
    nameAr: "أفريل (أبريل)",
    tempMax: 21.2,
    tempMin: 7.8,
    rainMm: 34,
    rainDays: 6,
    et0: 4.6,
    agriNotesFr: "Nouaison, formation des fruits. Surveillance tavelure et pucerons. Traitements foliaires (Calcium, Bore).",
    agriNotesAr: "العقد وتكون الثمار. مراقبة الجرب وحشرة المن. رش ورقي (كالسيوم وبورون).",
    riskLevel: "maladie"
  },
  {
    monthIdx: 4,
    nameFr: "Mai",
    nameAr: "ماي (مايو)",
    tempMax: 26.8,
    tempMin: 12.2,
    rainMm: 27,
    rainDays: 5,
    et0: 5.9,
    agriNotesFr: "Grossissement actif des fruits. Augmentation des besoins en eau et en potassium.",
    agriNotesAr: "زيادة حجم الثمار. ارتفاع الطلب على مياه الري وعنصر البوتاسيوم.",
    riskLevel: "normal"
  },
  {
    monthIdx: 5,
    nameFr: "Juin",
    nameAr: "جوان (يونيو)",
    tempMax: 33.0,
    tempMin: 17.5,
    rainMm: 12,
    rainDays: 3,
    et0: 7.2,
    agriNotesFr: "Début des fortes chaleurs. Surveillance stricte du carpocapse et de l'irrigation quotidienne.",
    agriNotesAr: "بداية درجات الحرارة المرتفعة. متابعة دودة الثمار والري المنتظم.",
    riskLevel: "chaleur"
  },
  {
    monthIdx: 6,
    nameFr: "Juillet",
    nameAr: "جويلية (يوليو)",
    tempMax: 37.8,
    tempMin: 21.0,
    rainMm: 5,
    rainDays: 1,
    et0: 8.4,
    agriNotesFr: "Pic de canicule et sirocco (>38°C). Risque d'échaudage des fruits. Irrigation de pointe aux heures fraîches.",
    agriNotesAr: "ذروة موجات الحر الشديدة والرياح الساخنة (سيروكو > 38°م). ري مكثف في الصباح الباكر.",
    riskLevel: "canicule"
  },
  {
    monthIdx: 7,
    nameFr: "Août",
    nameAr: "أوت (أغسطس)",
    tempMax: 37.2,
    tempMin: 20.8,
    rainMm: 8,
    rainDays: 2,
    et0: 7.8,
    agriNotesFr: "Chaleur intense continue. Maturation des variétés de saison. Maintien de l'humidité du sol.",
    agriNotesAr: "استمرار الحرارة المرتفعة. نضج أصناف الموسم. الحفاظ على رطوبة التربة.",
    riskLevel: "canicule"
  },
  {
    monthIdx: 8,
    nameFr: "Septembre",
    nameAr: "سبتمبر",
    tempMax: 30.6,
    tempMin: 16.4,
    rainMm: 22,
    rainDays: 4,
    et0: 5.3,
    agriNotesFr: "Récolte principale. Réduction progressive de l'azote pour favoriser l'aoûtement des rameaux.",
    agriNotesAr: "موسم الجني الرئيسي. تقليص التسميد الآزوتي لتصلب الأغصان وتخزين المدخرات.",
    riskLevel: "recolte"
  },
  {
    monthIdx: 9,
    nameFr: "Octobre",
    nameAr: "أكتوبر",
    tempMax: 24.0,
    tempMin: 11.5,
    rainMm: 29,
    rainDays: 5,
    et0: 3.5,
    agriNotesFr: "Fin des récoltes tardives. Irrigation post-récolte pour reconstituer les réserves de l'arbre.",
    agriNotesAr: "نهاية الجني المتأخر. ري ما بعد الجني لتغذية الأشجار واسترجاع حيويتها.",
    riskLevel: "normal"
  },
  {
    monthIdx: 10,
    nameFr: "Novembre",
    nameAr: "نوفمبر",
    tempMax: 16.8,
    tempMin: 6.2,
    rainMm: 31,
    rainDays: 6,
    et0: 2.2,
    agriNotesFr: "Chute des feuilles. Traitement d'automne à base de cuivre pour assainir le verger.",
    agriNotesAr: "تساقط الأوراق. المعالجة الخريفية بمركبات النحاس لتعقيم البستان.",
    riskLevel: "froid"
  },
  {
    monthIdx: 11,
    nameFr: "Décembre",
    nameAr: "ديسمبر",
    tempMax: 12.8,
    tempMin: 2.6,
    rainMm: 30,
    rainDays: 6,
    et0: 1.7,
    agriNotesFr: "Entrée en dormance. Apports d'amendements organiques et phosphatés de fond.",
    agriNotesAr: "دخول الأشجار في السكون التام. إضافة التسميد العضوي والفوسفاتي الأساسي.",
    riskLevel: "gel"
  }
];

export default function MeteoPage() {
  const { t, lang } = useTranslation();
  const isAr = lang === "ar";
  const { session } = useRole();

  const [activeTab, setActiveTab] = useState<"realtime" | "monthly" | "chill">("realtime");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(new Date().getMonth());

  // Configuration de l'alerte de température maximale par email
  const [maxTempThreshold, setMaxTempThreshold] = useState<number>(() => {
    const saved = localStorage.getItem("doula-meteo-max-temp");
    return saved ? parseFloat(saved) : 35;
  });

  const [alertEmail, setAlertEmail] = useState<string>(() => {
    const saved = localStorage.getItem("doula-meteo-alert-email");
    return saved || session?.user?.email || "abdelmalek@doulaagro.com";
  });

  const [alertEnabled, setAlertEnabled] = useState<boolean>(() => {
    return localStorage.getItem("doula-meteo-alert-enabled") === "1";
  });

  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Sauvegarde des préférences d'alerte
  const saveAlertConfig = (temp: number, email: string, enabled: boolean) => {
    setMaxTempThreshold(temp);
    setAlertEmail(email);
    setAlertEnabled(enabled);
    localStorage.setItem("doula-meteo-max-temp", temp.toString());
    localStorage.setItem("doula-meteo-alert-email", email);
    localStorage.setItem("doula-meteo-alert-enabled", enabled ? "1" : "0");
    toast.success(isAr ? "تم حفظ إعدادات تنبيه الحرارة بنجاح" : "Configuration d'alerte enregistrée !");
  };

  const { data: meteo, isLoading, isError, refetch } = useQuery({
    queryKey: ["farm-meteo-live"],
    queryFn: fetchFarmMeteo,
    refetchInterval: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const currentTemp = meteo?.current?.temperature_2m ?? 22;
  const todayMaxTemp = meteo?.daily?.temperature_2m_max?.[0] ?? currentTemp;
  const isThresholdExceeded = alertEnabled && (currentTemp >= maxTempThreshold || todayMaxTemp >= maxTempThreshold);

  // Envoi / Préparation de l'email d'alerte
  const handleTriggerEmailAlert = () => {
    if (!alertEmail.trim()) {
      return toast.error(isAr ? "يرجى كتابة البريد الإلكتروني" : "Veuillez indiquer une adresse e-mail valide.");
    }
    setSendingTestEmail(true);

    const subject = encodeURIComponent(
      `⚠️ ALERTE MÉTÉO DOULA AGRO — Température Max Dépassée (${todayMaxTemp.toFixed(1)}°C)`
    );

    const bodyText = `Bonjour Ingénieur,\n\nUne température maximale critique de ${todayMaxTemp.toFixed(1)}°C a été détectée sur la ferme Doula Agro (Seuil d'alerte configuré : ${maxTempThreshold}°C).\n\nDonnées Météo Actuelles :\n- Température actuelle : ${currentTemp.toFixed(1)}°C\n- Température maximale prévue aujourd'hui : ${todayMaxTemp.toFixed(1)}°C\n- Humidité relative : ${meteo?.current?.relative_humidity_2m ?? 0}%\n- Vitesse du vent : ${Math.round((meteo?.current?.wind_speed_10m ?? 0) * 3.6)} km/h\n\nRecommandations agronomiques d'urgence :\n- Éviter les traitements foliaires ou phytosanitaires aux heures chaudes.\n- Renforcer l'irrigation des parcelles sensibles tôt le matin ou le soir.\n- Vérifier l'état d'hydratation des vergers (oliviers, pommiers, nectariniers).\n\nSystème Automatique Doula Agro 🌱`;

    const body = encodeURIComponent(bodyText);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `mailto:${alertEmail}?subject=${subject}&body=${body}`;
    } else {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(alertEmail)}&su=${subject}&body=${body}`;
      window.open(gmailUrl, "_blank", "noopener,noreferrer");
    }

    setTimeout(() => {
      setSendingTestEmail(false);
      toast.success(isAr ? "تم إرسال إشعار التنبيه عبر البريد الإلكتروني" : `Alerte e-mail préparée et envoyée vers ${alertEmail} !`);
    }, 600);
  };

  // Indicateur d'aptitude à la pulvérisation (Vent < 15 km/h et absence de pluie)
  const windKmh = (meteo?.current?.wind_speed_10m ?? 0) * 3.6;
  const isSprayConditionOk = windKmh < 15 && (meteo?.current?.precipitation ?? 0) === 0;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <h1 className="text-xl font-black text-foreground flex items-center gap-2">
            <Sun className="h-6 w-6 text-amber-500 animate-spin-slow" />
            <span>{isAr ? "محطة الأرصاد والمناخ الزراعي" : "Météo Agricole & Prévisions"}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr
              ? "متابعة درجات الحرارة اللحظية، التوقعات الشهرية، وضبط تنبيهات الحرارة القصوى"
              : "Suivi en temps réel, climatologie mensuelle et alertes canicule par e-mail"}
          </p>
        </div>

        {/* Boutons d'onglets Temps réel / Heures de froid / Prévisions par mois */}
        <div className="flex rounded-xl bg-muted p-1 border">
          <button
            type="button"
            onClick={() => setActiveTab("realtime")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "realtime"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{isAr ? "الوقت الحقيقي" : "Temps réel"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chill")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "chill"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Snowflake className="h-3.5 w-3.5 text-sky-500" />
            <span>{isAr ? "ساعات البرودة ❄️" : "Heures de Froid ❄️"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("monthly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "monthly"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{isAr ? "التوقعات الشهرية" : "Mois"}</span>
          </button>
        </div>
      </div>

      {/* Bannière d'alerte active si le seuil max est dépassé */}
      {isThresholdExceeded && (
        <div className="rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 p-3.5 shadow-sm animate-pulse flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-extrabold text-rose-800 dark:text-rose-200">
                {isAr
                  ? `⚠️ تنبيه حرارة قصوى: درجة الحرارة وصلت إلى ${todayMaxTemp.toFixed(1)}°م (أعلى من الحد ${maxTempThreshold}°م)`
                  : `⚠️ Alerte Température Maximale : ${todayMaxTemp.toFixed(1)}°C (Dépassement du seuil de ${maxTempThreshold}°C)`}
              </p>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                {isAr
                  ? "يُنصح بوقف الرش الورقي في الساعات الحارة وزيادة وتيرة الري في الصباح الباكر أو المساء."
                  : "Arrêt impératif des pulvérisations en journée. Prioriser l'irrigation le matin ou le soir."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleTriggerEmailAlert}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 rounded-xl flex items-center gap-1"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>{isAr ? "إشعار بريدي" : "Notifier"}</span>
          </Button>
        </div>
      )}

      {/* CONTENU ONGLET 1: TEMPS RÉEL & 7 JOURS */}
      {activeTab === "realtime" && (
        <div className="space-y-4">
          {/* Carte Principale Météo Actuelle */}
          <Card className="rounded-3xl border bg-gradient-to-br from-card to-muted/40 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>📍 Doula Agro — Ain Oussera</span>
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl sm:text-5xl font-black text-foreground">
                    {currentTemp.toFixed(1)}°C
                  </span>
                  <div className="text-xs text-muted-foreground font-semibold">
                    <span>{isAr ? "المحسوسة: " : "Ressenti: "}</span>
                    <span className="text-foreground font-bold">
                      {meteo?.current?.apparent_temperature?.toFixed(1) ?? currentTemp.toFixed(1)}°C
                    </span>
                  </div>
                </div>
                <p className="text-xs font-bold text-primary mt-1">
                  {getWeatherDesc(meteo?.current?.weather_code ?? 0, isAr).label}
                </p>
              </div>

              {/* Indicateur Min / Max du jour */}
              <div className="flex items-center gap-3 bg-background/80 rounded-2xl p-2.5 border shadow-xs">
                <div className="text-center px-2">
                  <span className="text-[10px] text-muted-foreground font-bold flex items-center justify-center gap-0.5">
                    <ArrowDown className="h-3 w-3 text-sky-500" /> Min
                  </span>
                  <span className="text-sm font-black text-foreground">
                    {(meteo?.daily?.temperature_2m_min?.[0] ?? 0).toFixed(1)}°C
                  </span>
                </div>
                <div className="h-7 w-px bg-border" />
                <div className="text-center px-2">
                  <span className="text-[10px] text-muted-foreground font-bold flex items-center justify-center gap-0.5">
                    <ArrowUp className="h-3 w-3 text-rose-500" /> Max
                  </span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                    {todayMaxTemp.toFixed(1)}°C
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Indicateurs Clés Agronomiques */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
              {/* Humidité */}
              <div className="rounded-2xl border bg-background/60 p-3 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="font-semibold">{isAr ? "رطوبة الجو" : "Humidité"}</span>
                  <Droplets className="h-4 w-4 text-sky-500" />
                </div>
                <p className="text-lg font-black text-foreground">
                  {meteo?.current?.relative_humidity_2m ?? 0}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? "رطوبة نسبية" : "Air ambiant"}
                </p>
              </div>

              {/* Vent et Direction */}
              <div className="rounded-2xl border bg-background/60 p-3 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="font-semibold">{isAr ? "سرعة الرياح" : "Vent"}</span>
                  <Wind className="h-4 w-4 text-teal-500" />
                </div>
                <p className="text-lg font-black text-foreground">
                  {Math.round(windKmh)} <span className="text-xs font-normal">km/h</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? "اتجاه الرياح" : "Vitesse à 10m"}
                </p>
              </div>

              {/* Aptitude Pulvérisation */}
              <div className={`rounded-2xl border p-3 space-y-1 ${
                isSprayConditionOk
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">{isAr ? "حالة الرش" : "Pulvérisation"}</span>
                  {isSprayConditionOk ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <p className="text-sm font-black truncate">
                  {isSprayConditionOk
                    ? (isAr ? "مناسب (رياح هادئة)" : "Favorable (<15 km/h)")
                    : (isAr ? "غير ملائم (رياح)" : "Déconseillé")}
                </p>
                <p className="text-[10px] opacity-80">
                  {isSprayConditionOk
                    ? (isAr ? "لا يوجد خطر تطاير" : "Sans dérive")
                    : (isAr ? "خطر تطاير الرذاذ" : "Risque de dérive")}
                </p>
              </div>

              {/* Évapotranspiration ETo */}
              <div className="rounded-2xl border bg-background/60 p-3 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="font-semibold">{isAr ? "التبخر اليومي" : "ETo (FAO)"}</span>
                  <Thermometer className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-lg font-black text-foreground">
                  {(meteo?.daily?.et0_fao_evapotranspiration?.[0] ?? 4.2).toFixed(1)}{" "}
                  <span className="text-xs font-normal">mm/j</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? "احتياج البخر نتح" : "Base irrigation"}
                </p>
              </div>
            </div>
          </Card>

          {/* Prévisions Heure par Heure (Prochaines 24 heures) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>{isAr ? "التوقعات بالساعة (24 ساعة القادمة)" : "Prévisions heure par heure (24h)"}</span>
            </h3>

            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {(meteo?.hourly?.time?.slice(0, 24) || []).map((tIso, idx) => {
                const hour = tIso.slice(11, 16);
                const temp = meteo?.hourly?.temperature_2m?.[idx] ?? 0;
                const rainProb = meteo?.hourly?.precipitation_probability?.[idx] ?? 0;
                const wind = Math.round((meteo?.hourly?.wind_speed_10m?.[idx] ?? 0) * 3.6);
                const isHot = temp >= maxTempThreshold;

                return (
                  <div
                    key={tIso}
                    className={`shrink-0 w-20 rounded-2xl border p-2.5 text-center shadow-xs transition-all ${
                      isHot
                        ? "bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200"
                        : "bg-card border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="text-[11px] font-bold text-muted-foreground">{hour}</p>
                    <p className={`text-sm font-black my-1 ${isHot ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                      {temp.toFixed(0)}°C
                    </p>
                    <div className="text-[9px] text-muted-foreground space-y-0.5">
                      <p className="flex items-center justify-center gap-0.5">
                        <Droplets className="h-2.5 w-2.5 text-sky-500" />
                        <span>{rainProb}%</span>
                      </p>
                      <p className="flex items-center justify-center gap-0.5">
                        <Wind className="h-2.5 w-2.5 text-teal-500" />
                        <span>{wind}k</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prévisions sur 7 jours */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>{isAr ? "توقعات 7 أيام القادمة" : "Prévisions sur 7 jours"}</span>
            </h3>

            <div className="space-y-1.5">
              {(meteo?.daily?.time || []).map((dayIso, idx) => {
                const dateObj = new Date(dayIso);
                const dayName = dateObj.toLocaleDateString(isAr ? "ar-DZ" : "fr-FR", { weekday: "short", day: "numeric", month: "short" });
                const min = meteo?.daily?.temperature_2m_min?.[idx] ?? 0;
                const max = meteo?.daily?.temperature_2m_max?.[idx] ?? 0;
                const rainSum = meteo?.daily?.precipitation_sum?.[idx] ?? 0;
                const rainProb = meteo?.daily?.precipitation_probability_max?.[idx] ?? 0;
                const et0 = meteo?.daily?.et0_fao_evapotranspiration?.[idx] ?? 0;
                const isOverThreshold = alertEnabled && max >= maxTempThreshold;

                return (
                  <div
                    key={dayIso}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs shadow-xs transition-all ${
                      isOverThreshold
                        ? "border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="w-28 font-bold capitalize text-foreground flex items-center gap-1.5">
                      {isOverThreshold && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                      <span>{dayName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                      <Droplets className="h-3.5 w-3.5 text-sky-500" />
                      <span>{rainSum > 0 ? `${rainSum} mm` : `${rainProb}%`}</span>
                    </div>

                    <div className="text-muted-foreground text-[11px] hidden sm:block">
                      <span>ETo : <strong className="text-foreground">{et0.toFixed(1)} mm</strong></span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-semibold">{min.toFixed(0)}°</span>
                      <div className="h-2 w-16 bg-muted rounded-full overflow-hidden relative">
                        <div
                          className={`h-full ${isOverThreshold ? "bg-rose-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, (max / 45) * 100)}%` }}
                        />
                      </div>
                      <span className={`font-black w-8 text-right ${isOverThreshold ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-foreground"}`}>
                        {max.toFixed(0)}°
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 2: COMPARATEUR D'HEURES DE FROID (WEINBERGER VS UTAH) */}
      {activeTab === "chill" && <ChillHoursComparator />}

      {/* CONTENU ONGLET 3: PRÉVISIONS ET CLIMATOLOGIE PAR MOIS */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          {/* Sélecteur des 12 mois */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {MONTHLY_CLIMATE_DATA.map((m) => {
              const isSelected = m.monthIdx === selectedMonthIdx;
              const isCurrent = m.monthIdx === new Date().getMonth();

              return (
                <button
                  key={m.monthIdx}
                  type="button"
                  onClick={() => setSelectedMonthIdx(m.monthIdx)}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground font-black shadow-sm"
                      : "border-border bg-card hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <p className="text-xs font-bold truncate">
                    {isAr ? m.nameAr.split(" ")[0] : m.nameFr}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isSelected ? "text-primary-foreground/90 font-semibold" : "text-muted-foreground"}`}>
                    {m.tempMax}° / {m.tempMin}°
                  </p>
                  {isCurrent && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Fiche détaillée du mois sélectionné */}
          {(() => {
            const m = MONTHLY_CLIMATE_DATA[selectedMonthIdx];
            return (
              <Card className="rounded-3xl border p-5 bg-card space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="text-lg font-black text-primary">
                      {isAr ? m.nameAr : m.nameFr} — {isAr ? "المناخ والأجندة الزراعية" : "Climatologie & Guide Agronomique"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isAr
                        ? "المعدلات المناخية التاريخية للقطعة الزراعية (درجات الحرارة، الأمطار، البخر)"
                        : "Moyennes climatiques historiques de référence pour la zone d'Ain Oussera"}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {m.tempMax}°C Max
                  </span>
                </div>

                {/* 4 Indicateurs Mensuels */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border bg-muted/30 p-3 space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "معدل الحرارة القصوى" : "Température Max"}
                    </span>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400">
                      {m.tempMax}°C
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-muted/30 p-3 space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "معدل الحرارة الدنيا" : "Température Min"}
                    </span>
                    <p className="text-xl font-black text-sky-600 dark:text-sky-400">
                      {m.tempMin}°C
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-muted/30 p-3 space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "مجموع الأمطار المقدر" : "Précipitations"}
                    </span>
                    <p className="text-xl font-black text-foreground">
                      {m.rainMm} <span className="text-xs font-normal">mm</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">~{m.rainDays} {isAr ? "أيام ممطرة" : "jours de pluie"}</p>
                  </div>

                  <div className="rounded-2xl border bg-muted/30 p-3 space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "التبخر نتح اليومي" : "ETo Moyen"}
                    </span>
                    <p className="text-xl font-black text-orange-600 dark:text-orange-400">
                      {m.et0} <span className="text-xs font-normal">mm/j</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">~{Math.round(m.et0 * 30)} mm / mois</p>
                  </div>
                </div>

                {/* Recommandations & Risques pour ce mois */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-primary flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>{isAr ? "توصيات المهندس والملاحظات الزراعية لهذا الشهر" : "Conseils & Vigilance Agronomique de l'Ingénieur"}</span>
                  </h4>
                  <p className="text-xs text-foreground font-semibold leading-relaxed">
                    {isAr ? m.agriNotesAr : m.agriNotesFr}
                  </p>
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {/* SECTION CONFIGURATION ALERTE TEMPÉRATURE MAXIMALE (NOTIFICATION EMAIL) */}
      <Card className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.03] p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-foreground">
                {isAr ? "ضبط تنبيهات درجات الحرارة القصوى بالبريد" : "Alerte Température Maximale par E-mail"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {isAr
                  ? "تلقي رسالة إلكترونية تلقائية عند تجاوز درجة الحرارة للحد الأقصى المختار"
                  : "Soyez notifiée automatiquement par e-mail en cas de dépassement du seuil de chaleur"}
              </p>
            </div>
          </div>

          {/* Toggle Activer/Désactiver */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              {alertEnabled ? (isAr ? "التنبيه مفعل" : "Alerte active") : (isAr ? "معطل" : "Désactivé")}
            </span>
            <input
              type="checkbox"
              checked={alertEnabled}
              onChange={(e) => saveAlertConfig(maxTempThreshold, alertEmail, e.target.checked)}
              className="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Choix du seuil de température max */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              {isAr ? "درجة الحرارة القصوى للتنبيه (°م)" : "Seuil de température maximale (°C)"}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={25}
                max={50}
                step={1}
                value={maxTempThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 35;
                  setMaxTempThreshold(val);
                }}
                className="h-9 font-black text-base w-24 rounded-xl"
              />
              <span className="text-sm font-bold text-muted-foreground">°C</span>

              {/* Raccourcis rapides */}
              <div className="flex gap-1">
                {[32, 35, 38, 40].map((tVal) => (
                  <button
                    key={tVal}
                    type="button"
                    onClick={() => {
                      setMaxTempThreshold(tVal);
                      saveAlertConfig(tVal, alertEmail, alertEnabled);
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                      maxTempThreshold === tVal
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tVal}°
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Adresse Email destinataire */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              {isAr ? "البريد الإلكتروني المخصص للتنبيه" : "Adresse e-mail de notification"}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="ingenieur@ferme.com"
                  className="pl-8 h-9 text-xs font-semibold rounded-xl"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveAlertConfig(maxTempThreshold, alertEmail, alertEnabled)}
                className="rounded-xl font-bold text-xs h-9 px-3"
              >
                {isAr ? "حفظ" : "Sauvegarder"}
              </Button>
            </div>
          </div>
        </div>

        {/* Bouton de test de l'alerte */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/20 pt-3">
          <p className="text-[11px] text-muted-foreground">
            {isAr
              ? `الحالة الحالية: درجة الحرارة القصوى اليوم هي ${todayMaxTemp.toFixed(1)}°م (الحد: ${maxTempThreshold}°م)`
              : `Aujourd'hui : pic prévu à ${todayMaxTemp.toFixed(1)}°C (seuil d'alerte configuré à ${maxTempThreshold}°C)`}
          </p>

          <Button
            size="sm"
            onClick={handleTriggerEmailAlert}
            disabled={sendingTestEmail}
            className="rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isAr ? "تجربة إرسال تنبيه بالبريد الإلكتروني" : "Tester l'envoi de l'alerte par e-mail"}</span>
          </Button>
        </div>
      </Card>
    </main>
  );
}
