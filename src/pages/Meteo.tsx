import { useState } from "react";
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
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Clock,
  Send,
  Sparkles,
  RefreshCw,
  Settings,
  Sunrise,
  Sunset,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { ChillHoursComparator } from "@/components/meteo/ChillHoursComparator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useRole } from "@/lib/role";
import { WIND_LIMIT_KMH } from "@/lib/weather-forecast";
import { getSolarTimesForDate } from "@/lib/astronomy";

// Coordonnées géographiques de la ferme Doula Agro (Benhar / Aïn Oussera, Alt. 762 m)
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
    sunrise?: string[];
    sunset?: string[];
  };
}

async function fetchFarmMeteo(): Promise<OpenMeteoData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,sunrise,sunset&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Impossible de charger les données météo");
  return res.json();
}

function getWeatherDesc(code: number, isAr: boolean): { label: string; icon: typeof Sun } {
  if (code === 0) return { label: isAr ? "سماء صافية" : "Ciel dégagé", icon: Sun };
  if (code === 1 || code === 2) return { label: isAr ? "قليل الغيوم" : "Partiellement nuageux", icon: CloudSun };
  if (code === 3) return { label: isAr ? "غائم" : "Couvert", icon: CloudSun };
  if (code >= 51 && code <= 67) return { label: isAr ? "أمطار خفيفة" : "Pluie légère", icon: CloudRain };
  if (code >= 80 && code <= 99) return { label: isAr ? "زخات مطرية" : "Averses / Orages", icon: CloudRain };
  return { label: isAr ? "طقس متقلب" : "Variable", icon: Sun };
}

type RiskLevel =
  | "gel"
  | "gel_printemps"
  | "maladie"
  | "normal"
  | "chaleur"
  | "canicule"
  | "recolte"
  | "froid";

function getRiskDisplay(level: RiskLevel, isAr: boolean): { label: string; tone: string } {
  switch (level) {
    case "gel":
      return {
        label: isAr ? "خطر جليد شتوي" : "Risque gel hivernal",
        tone: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/30",
      };
    case "gel_printemps":
      return {
        label: isAr ? "جليد ربيعي حرج" : "Gel printanier critique",
        tone: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30",
      };
    case "maladie":
      return {
        label: isAr ? "خطر فطري (جرب/من)" : "Vigilance maladies",
        tone: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
      };
    case "chaleur":
      return {
        label: isAr ? "حرارة مرتفعة" : "Fortes chaleurs",
        tone: "text-orange-700 dark:text-orange-300 bg-orange-500/10 border-orange-500/30",
      };
    case "canicule":
      return {
        label: isAr ? "موجة حر / سيروكو" : "Canicule / Sirocco",
        tone: "text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/40",
      };
    case "recolte":
      return {
        label: isAr ? "فترة الجني" : "Période de récolte",
        tone: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
      };
    case "froid":
      return {
        label: isAr ? "بداية البرودة" : "Entrée en froid",
        tone: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
      };
    default:
      return {
        label: isAr ? "مناخ معتدل" : "Conditions modérées",
        tone: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
      };
  }
}

const MONTHLY_CLIMATE_DATA: Array<{
  monthIdx: number;
  nameFr: string;
  shortFr: string;
  nameAr: string;
  shortAr: string;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  rainDays: number;
  et0: number;
  agriNotesFr: string;
  agriNotesAr: string;
  riskLevel: RiskLevel;
}> = [
    {
      monthIdx: 0,
      nameFr: "Janvier",
      shortFr: "Jan",
      nameAr: "جانفي",
      shortAr: "جانفي",
      tempMax: 12.2,
      tempMin: 1.5,
      rainMm: 28,
      rainDays: 6,
      et0: 1.8,
      agriNotesFr: "Repos végétatif et taille d'hiver. Risque élevé de gelées blanches matinales.",
      agriNotesAr: "فترة السكون الشتوي والتقليم الشتوي. خطر مرتفع للجليد الصباحي.",
      riskLevel: "gel",
    },
    {
      monthIdx: 1,
      nameFr: "Février",
      shortFr: "Fév",
      nameAr: "فيفري",
      shortAr: "فيفري",
      tempMax: 13.8,
      tempMin: 2.4,
      rainMm: 25,
      rainDays: 5,
      et0: 2.4,
      agriNotesFr: "Fin de taille, traitement d'hiver (cuivre / huile blanche) avant débourrement.",
      agriNotesAr: "نهاية التقليم والمعالجة الشتوية بالنحاس والزيت الأبيض قبل انتفاخ البراعم.",
      riskLevel: "gel",
    },
    {
      monthIdx: 2,
      nameFr: "Mars",
      shortFr: "Mar",
      nameAr: "مارس",
      shortAr: "مارس",
      tempMax: 17.5,
      tempMin: 5.0,
      rainMm: 32,
      rainDays: 6,
      et0: 3.5,
      agriNotesFr: "Débourrement et floraison. Risque critique de gelées printanières. Démarrage de la fertigation.",
      agriNotesAr: "تفتح البراعم والإزهار. حساسية عالية للجليد الربيعي وبداية التسميد عبر الري.",
      riskLevel: "gel_printemps",
    },
    {
      monthIdx: 3,
      nameFr: "Avril",
      shortFr: "Avr",
      nameAr: "أفريل",
      shortAr: "أفريل",
      tempMax: 21.2,
      tempMin: 7.8,
      rainMm: 34,
      rainDays: 6,
      et0: 4.6,
      agriNotesFr: "Nouaison et formation des fruits. Surveillance tavelure et pucerons ; apports foliaires Calcium / Bore.",
      agriNotesAr: "العقد وتكوّن الثمار. مراقبة الجرب والمنّ مع رش ورقي بالكالسيوم والبورون.",
      riskLevel: "maladie",
    },
    {
      monthIdx: 4,
      nameFr: "Mai",
      shortFr: "Mai",
      nameAr: "ماي",
      shortAr: "ماي",
      tempMax: 26.8,
      tempMin: 12.2,
      rainMm: 27,
      rainDays: 5,
      et0: 5.9,
      agriNotesFr: "Grossissement actif des fruits. Hausse des besoins en eau et en potassium.",
      agriNotesAr: "نمو سريع للثمار. ارتفاع الاحتياج لمياه الري وعنصر البوتاسيوم.",
      riskLevel: "normal",
    },
    {
      monthIdx: 5,
      nameFr: "Juin",
      shortFr: "Juin",
      nameAr: "جوان",
      shortAr: "جوان",
      tempMax: 33.0,
      tempMin: 17.5,
      rainMm: 12,
      rainDays: 3,
      et0: 7.2,
      agriNotesFr: "Début des fortes chaleurs. Surveillance du carpocapse et irrigation quotidienne renforcée.",
      agriNotesAr: "بداية الحرارة المرتفعة. متابعة دودة الثمار وتعزيز الري اليومي المنتظم.",
      riskLevel: "chaleur",
    },
    {
      monthIdx: 6,
      nameFr: "Juillet",
      shortFr: "Juil",
      nameAr: "جويلية",
      shortAr: "جويلية",
      tempMax: 37.8,
      tempMin: 21.0,
      rainMm: 5,
      rainDays: 1,
      et0: 8.4,
      agriNotesFr: "Pic de canicule et sirocco (> 38 °C). Risque d'échaudage : irrigation aux heures fraîches.",
      agriNotesAr: "ذروة الحر ورياح السيروكو (> 38°م). خطر لفحة الشمس: تكثيف الري في الصباح الباكر والليل.",
      riskLevel: "canicule",
    },
    {
      monthIdx: 7,
      nameFr: "Août",
      shortFr: "Août",
      nameAr: "أوت",
      shortAr: "أوت",
      tempMax: 37.2,
      tempMin: 20.8,
      rainMm: 8,
      rainDays: 2,
      et0: 7.8,
      agriNotesFr: "Chaleur intense continue et maturation des variétés de saison. Maintien strict de l'humidité du sol.",
      agriNotesAr: "استمرار الحرارة الشديدة ونضج أصناف الموسم. الحفاظ المستمر على رطوبة التربة.",
      riskLevel: "canicule",
    },
    {
      monthIdx: 8,
      nameFr: "Septembre",
      shortFr: "Sep",
      nameAr: "سبتمبر",
      shortAr: "سبتمبر",
      tempMax: 30.6,
      tempMin: 16.4,
      rainMm: 22,
      rainDays: 4,
      et0: 5.3,
      agriNotesFr: "Récolte principale. Réduction progressive de l'azote pour favoriser l'aoûtement des rameaux.",
      agriNotesAr: "موسم الجني الرئيسي. تقليص الآزوت تدريجياً لتصلب الأغصان وتخزين المدخرات.",
      riskLevel: "recolte",
    },
    {
      monthIdx: 9,
      nameFr: "Octobre",
      shortFr: "Oct",
      nameAr: "أكتوبر",
      shortAr: "أكتوبر",
      tempMax: 24.0,
      tempMin: 11.5,
      rainMm: 29,
      rainDays: 5,
      et0: 3.5,
      agriNotesFr: "Fin des récoltes tardives. Irrigation post-récolte pour reconstituer les réserves de l'arbre.",
      agriNotesAr: "نهاية الجني المتأخر. ري ما بعد الحصاد لإعادة تكوين مخزون الشجرة.",
      riskLevel: "normal",
    },
    {
      monthIdx: 10,
      nameFr: "Novembre",
      shortFr: "Nov",
      nameAr: "نوفمبر",
      shortAr: "نوفمبر",
      tempMax: 16.8,
      tempMin: 6.2,
      rainMm: 31,
      rainDays: 6,
      et0: 2.2,
      agriNotesFr: "Chute des feuilles et récolte des olives. Traitement d'automne au cuivre pour assainir le verger.",
      agriNotesAr: "تساقط الأوراق وجني الزيتون. معالجة خريفية بالنحاس لتعقيم البستان.",
      riskLevel: "froid",
    },
    {
      monthIdx: 11,
      nameFr: "Décembre",
      shortFr: "Déc",
      nameAr: "ديسمبر",
      shortAr: "ديسمبر",
      tempMax: 12.8,
      tempMin: 2.6,
      rainMm: 30,
      rainDays: 6,
      et0: 1.7,
      agriNotesFr: "Entrée en dormance. Apports d'amendements organiques et phosphatés de fond.",
      agriNotesAr: "دخول الأشجار في السكون الشتوي. إضافة الأسمدة العضوية والفوسفاتية الأساسية.",
      riskLevel: "gel",
    },
  ];

export default function MeteoPage() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { session } = useRole();

  type MeteoTab = "realtime" | "chill" | "monthly";
  const [activeTab, setActiveTab] = useState<MeteoTab>("realtime");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(new Date().getMonth());

  // Panneaux repliables contrôlables depuis l'en-tête (⚙️)
  const [heatAlertOpen, setHeatAlertOpen] = useState<boolean>(false);
  const [chillConfigOpen, setChillConfigOpen] = useState<boolean>(false);
  const [chillRefreshTick, setChillRefreshTick] = useState<number>(0);

  // Configuration de l'alerte canicule par email
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

  const saveAlertConfig = (temp: number, email: string, enabled: boolean) => {
    setMaxTempThreshold(temp);
    setAlertEmail(email);
    setAlertEnabled(enabled);
    localStorage.setItem("doula-meteo-max-temp", temp.toString());
    localStorage.setItem("doula-meteo-alert-email", email);
    localStorage.setItem("doula-meteo-alert-enabled", enabled ? "1" : "0");
    toast.success(isAr ? "تم حفظ إعدادات تنبيه الحرارة بنجاح" : "Configuration d'alerte enregistrée !");
  };

  const { data: meteo, isFetching, refetch } = useQuery({
    queryKey: ["farm-meteo-live"],
    queryFn: fetchFarmMeteo,
    refetchInterval: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const hasLiveTemp = typeof meteo?.current?.temperature_2m === "number";
  const currentTemp = hasLiveTemp ? meteo!.current.temperature_2m : null;
  const formattedCurrentTemp = currentTemp !== null ? `${currentTemp.toFixed(1)}°C` : "—";
  const todayMaxTemp = meteo?.daily?.temperature_2m_max?.[0] ?? currentTemp ?? 0;
  const todayMinTemp = meteo?.daily?.temperature_2m_min?.[0] ?? 0;
  const isThresholdExceeded =
    alertEnabled &&
    ((currentTemp !== null && currentTemp >= maxTempThreshold) ||
      (todayMaxTemp > 0 && todayMaxTemp >= maxTempThreshold));

  const benharSolar = getSolarTimesForDate(new Date().toISOString().slice(0, 10));
  const sunriseStr = meteo?.daily?.sunrise?.[0]?.slice(11, 16) || benharSolar.sunriseStr.replace("h", ":");
  const sunsetStr = meteo?.daily?.sunset?.[0]?.slice(11, 16) || benharSolar.sunsetStr.replace("h", ":");
  const rain48hMm =
    (meteo?.daily?.precipitation_sum?.[0] ?? 0) + (meteo?.daily?.precipitation_sum?.[1] ?? 0);
  const todayEt0 = meteo?.daily?.et0_fao_evapotranspiration?.[0] ?? 0;

  // Indicateur d'aptitude à la pulvérisation (Vent < 15 km/h et pluie = 0)
  const windKmh = (meteo?.current?.wind_speed_10m ?? 0) * 3.6;
  const currentPrecip = meteo?.current?.precipitation ?? 0;
  const isSprayConditionOk = windKmh < WIND_LIMIT_KMH && currentPrecip === 0;

  const weatherMeta = getWeatherDesc(meteo?.current?.weather_code ?? 0, isAr);
  const WeatherIcon = weatherMeta.icon;

  const handleHeaderRefresh = () => {
    if (activeTab === "chill") {
      setChillRefreshTick((n) => n + 1);
    } else {
      void refetch();
    }
    toast.success(isAr ? "جارٍ تحديث بيانات المحطة..." : "Actualisation des données météo...");
  };

  const handleHeaderSettings = () => {
    if (activeTab === "chill") {
      setChillConfigOpen((v) => !v);
    } else {
      setActiveTab("realtime");
      setHeatAlertOpen((v) => !v);
    }
  };

  const handleTriggerEmailAlert = () => {
    if (!alertEmail.trim()) {
      return toast.error(isAr ? "يرجى كتابة البريد الإلكتروني" : "Veuillez indiquer une adresse e-mail valide.");
    }
    setSendingTestEmail(true);

    const subject = encodeURIComponent(
      isAr
        ? `⚠️ تنبيه حرارة قصوى DOULA AGRO (${todayMaxTemp.toFixed(1)}°C)`
        : `⚠️ ALERTE MÉTÉO DOULA AGRO — Température Max (${todayMaxTemp.toFixed(1)}°C)`
    );

    const bodyText = isAr
      ? `تنبيه من محطة الأرصاد DOULA AGRO:\nدرجة الحرارة القصوى اليوم: ${todayMaxTemp.toFixed(1)}°C (الحد المحدد: ${maxTempThreshold}°C).\nالحرارة الحالية: ${formattedCurrentTemp}\nالرطوبة: ${meteo?.current?.relative_humidity_2m ?? 0}%\nالرياح: ${Math.round(windKmh)} كم/سا.`
      : `Bonjour,\n\nTempérature maximale prévue : ${todayMaxTemp.toFixed(1)}°C (seuil configuré : ${maxTempThreshold}°C).\n- Actuelle : ${formattedCurrentTemp}\n- Humidité : ${meteo?.current?.relative_humidity_2m ?? 0}%\n- Vent : ${Math.round(windKmh)} km/h\n\nRecommandation : éviter la pulvérisation aux heures chaudes et renforcer l'irrigation.\nDoula Agro 🌱`;

    const body = encodeURIComponent(bodyText);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `mailto:${alertEmail}?subject=${subject}&body=${body}`;
    } else {
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(alertEmail)}&su=${subject}&body=${body}`,
        "_blank",
        "noopener,noreferrer"
      );
    }

    setTimeout(() => {
      setSendingTestEmail(false);
      toast.success(
        isAr
          ? "تم تجهيز رسالة التنبيه بالبريد الإلكتروني"
          : `Alerte e-mail préparée vers ${alertEmail} !`
      );
    }, 500);
  };

  return (
    <main className="mx-auto max-w-3xl px-3 sm:px-4 pb-24 pt-3 space-y-3.5" dir={isAr ? "rtl" : "ltr"}>
      {/* 1. EN-TÊTE COMPACT VERT FORÊT */}
      <header className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white px-4 py-3.5 shadow-md flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-black tracking-tight truncate flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-300 shrink-0" />
            <span>{isAr ? "محطة الأرصاد الزراعية" : "Météo Agricole"}</span>
          </h1>
          <p className="text-[11px] text-emerald-100/90 font-semibold flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="h-3 w-3 text-emerald-300 shrink-0" />
            <span>{isAr ? "بنهار / عين وسارة · 762 م" : "Benhar / Aïn Oussera · 762 m"}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleHeaderRefresh}
            className="h-9 w-9 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center justify-center cursor-pointer"
            title={isAr ? "تحديث" : "Actualiser"}
            aria-label={isAr ? "تحديث" : "Actualiser"}
          >
            <RefreshCw className={`h-4 w-4 text-white ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleHeaderSettings}
            className={`h-9 w-9 rounded-2xl active:scale-95 transition flex items-center justify-center cursor-pointer ${(activeTab === "chill" && chillConfigOpen) || (activeTab !== "chill" && heatAlertOpen)
                ? "bg-amber-400 text-emerald-950"
                : "bg-white/15 hover:bg-white/25 text-white"
              }`}
            title={isAr ? "الإعدادات" : "Paramètres"}
            aria-label={isAr ? "الإعدادات" : "Paramètres"}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* BARRE D'ONGLETS SEGMENTÉE SUR 1 SEULE LIGNE (3 BOUTONS TACTILES, ZÉRO DÉBORDEMENT) */}
      <nav
        aria-label={isAr ? "أقسام الطقس" : "Sections météo"}
        className="grid grid-cols-3 gap-1 rounded-2xl bg-muted/80 p-1 border shadow-2xs"
      >
        <button
          type="button"
          onClick={() => setActiveTab("realtime")}
          className={`py-2.5 px-1.5 rounded-xl text-[11px] sm:text-xs font-black whitespace-nowrap transition-all cursor-pointer ${activeTab === "realtime"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}
        >
          {isAr ? "☀️ اليوم" : "☀️ Aujourd'hui"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("chill")}
          className={`py-2.5 px-1.5 rounded-xl text-[11px] sm:text-xs font-black whitespace-nowrap transition-all cursor-pointer ${activeTab === "chill"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}
        >
          {isAr ? "❄️ ساعات البرودة" : "❄️ Heures de froid"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("monthly")}
          className={`py-2.5 px-1.5 rounded-xl text-[11px] sm:text-xs font-black whitespace-nowrap transition-all cursor-pointer ${activeTab === "monthly"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}
        >
          {isAr ? "📅 الشهري" : "📅 Mensuel"}
        </button>
      </nav>

      {/* Bannière d'alerte canicule active si seuil dépassé */}
      {isThresholdExceeded && (
        <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-500/10 p-3 shadow-xs flex items-center justify-between gap-2.5">
          <div className="flex items-start gap-2 min-w-0">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs font-extrabold text-rose-800 dark:text-rose-200 leading-snug">
              {isAr
                ? `تنبيه حرارة قصوى: ${todayMaxTemp.toFixed(1)}°م (الحد ${maxTempThreshold}°م)`
                : `Alerte chaleur : ${todayMaxTemp.toFixed(1)}°C (seuil ${maxTempThreshold}°C)`}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleTriggerEmailAlert}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 rounded-xl h-8 px-2.5"
          >
            <Mail className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* ONGLET 1 : اليوم / AUJOURD'HUI                           */}
      {/* ======================================================== */}
      {activeTab === "realtime" && (
        <div className="space-y-3.5">
          {/* Carte principale (Hero) à fort contraste lisible au soleil */}
          <Card className="rounded-3xl border-2 border-emerald-900/15 bg-card overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <WeatherIcon className="h-8 w-8 text-amber-500 shrink-0" />
                    <span dir="ltr" className="text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-none">
                      {formattedCurrentTemp}
                    </span>
                  </div>
                  <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                    {weatherMeta.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    {isAr ? "المحسوسة :" : "Ressenti :"}{" "}
                    <strong dir="ltr" className="text-foreground">
                      {typeof meteo?.current?.apparent_temperature === "number"
                        ? `${meteo.current.apparent_temperature.toFixed(1)}°C`
                        : formattedCurrentTemp}
                    </strong>
                  </p>
                </div>

                {/* Min / Max + Lever / Coucher du soleil (Benhar) */}
                <div className="space-y-2 shrink-0">
                  <div className="flex items-center justify-center gap-3 rounded-2xl bg-muted/60 border px-3 py-2">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-0.5">
                        <ArrowDown className="h-3 w-3 text-sky-600" />
                        <span>{isAr ? "الدنيا" : "Min"}</span>
                      </span>
                      <span dir="ltr" className="text-sm font-black text-foreground">
                        {todayMinTemp.toFixed(1)}°
                      </span>
                    </div>
                    <div className="h-7 w-px bg-border" />
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-0.5">
                        <ArrowUp className="h-3 w-3 text-rose-600" />
                        <span>{isAr ? "القصوى" : "Max"}</span>
                      </span>
                      <span dir="ltr" className="text-sm font-black text-rose-600 dark:text-rose-400">
                        {todayMaxTemp.toFixed(1)}°
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-[11px] font-bold text-amber-950 dark:text-amber-200">
                    <span className="inline-flex items-center gap-1">
                      <Sunrise className="h-3.5 w-3.5 text-amber-600" />
                      <span dir="ltr">{sunriseStr}</span>
                    </span>
                    <span className="opacity-40">|</span>
                    <span className="inline-flex items-center gap-1">
                      <Sunset className="h-3.5 w-3.5 text-orange-600" />
                      <span dir="ltr">{sunsetStr}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bandeau bien visible d'état de pulvérisation */}
            <div
              className={`px-4 py-3 flex items-center justify-between gap-2 text-xs font-black ${isSprayConditionOk
                  ? "bg-emerald-600 text-white"
                  : "bg-orange-600 text-white"
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isSprayConditionOk ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">
                  {isSprayConditionOk
                    ? isAr
                      ? "الرش ملائم — رياح هادئة ولا أمطار"
                      : "Pulvérisation favorable — vent calme, sans pluie"
                    : currentPrecip > 0
                      ? isAr
                        ? "الرش غير ملائم — أمطار حالية"
                        : "Pulvérisation déconseillée — pluie en cours"
                      : isAr
                        ? "الرش غير ملائم — رياح قوية (خطر تطاير)"
                        : "Pulvérisation déconseillée — vent fort"}
                </span>
              </div>
              <span dir="ltr" className="shrink-0 rounded-full bg-black/20 px-2.5 py-0.5 text-[11px] font-black">
                {Math.round(windKmh)} {isAr ? "كم/سا" : "km/h"}
              </span>
            </div>
          </Card>

          {/* Grille 2×2 compacte : Humidité, ETo FAO, Pluie 48 h, Seuil alerte chaleur */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Humidité */}
            <div className="rounded-2xl border bg-card p-3.5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-bold">{isAr ? "الرطوبة" : "Humidité"}</span>
                <Droplets className="h-4 w-4 text-sky-500" />
              </div>
              <p dir="ltr" className="text-xl font-black text-foreground">
                {meteo?.current?.relative_humidity_2m ?? 0}%
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {isAr ? "الرطوبة النسبية للهواء" : "Air ambiant"}
              </p>
            </div>

            {/* 2. ETo FAO */}
            <div className="rounded-2xl border bg-card p-3.5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-bold">{isAr ? "التبخر (ETo FAO)" : "ETo (FAO)"}</span>
                <Thermometer className="h-4 w-4 text-orange-500" />
              </div>
              <p dir="ltr" className="text-xl font-black text-foreground">
                {todayEt0.toFixed(1)}{" "}
                <span className="text-xs font-bold text-muted-foreground">{isAr ? "ملم/يوم" : "mm/j"}</span>
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {isAr ? "مرجع احتياج الري" : "Base irrigation"}
              </p>
            </div>

            {/* 3. Pluie 48 h */}
            <div className="rounded-2xl border bg-card p-3.5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-bold">{isAr ? "أمطار 48 ساعة" : "Pluie 48 h"}</span>
                <CloudRain className="h-4 w-4 text-indigo-500" />
              </div>
              <p dir="ltr" className="text-xl font-black text-foreground">
                {rain48hMm.toFixed(1)}{" "}
                <span className="text-xs font-bold text-muted-foreground">{isAr ? "ملم" : "mm"}</span>
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {rain48hMm >= 20
                  ? isAr
                    ? "خطر غسيل المبيد"
                    : "Risque de lessivage"
                  : isAr
                    ? "تراكم اليوم والغد"
                    : "Cumul prévu"}
              </p>
            </div>

            {/* 4. Seuil alerte chaleur */}
            <button
              type="button"
              onClick={() => setHeatAlertOpen((v) => !v)}
              className="text-start rounded-2xl border bg-card hover:border-amber-500/50 p-3.5 shadow-2xs space-y-1 transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-bold">{isAr ? "حد تنبيه الحرارة" : "Seuil chaleur"}</span>
                <Bell className={`h-4 w-4 ${alertEnabled ? "text-amber-500" : "text-muted-foreground"}`} />
              </div>
              <p dir="ltr" className="text-xl font-black text-foreground">
                {maxTempThreshold}°C
              </p>
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                {alertEnabled
                  ? isAr
                    ? "مفعّل · انقر للتعديل"
                    : "Actif · modifier"
                  : isAr
                    ? "معطّل · انقر للتفعيل"
                    : "Inactif · configurer"}
              </p>
            </button>
          </div>

          {/* Frise horaire 24 h en défilement horizontal tactile */}
          <div className="space-y-2">
            <h2 className="text-xs font-black text-muted-foreground flex items-center gap-1.5 px-0.5">
              <Clock className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>{isAr ? "التوقعات بالساعة (24 ساعة)" : "Prévisions heure par heure (24 h)"}</span>
            </h2>

            <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
              {(meteo?.hourly?.time?.slice(0, 24) || []).map((tIso, idx) => {
                const hour = tIso.slice(11, 16);
                const temp = meteo?.hourly?.temperature_2m?.[idx] ?? 0;
                const rainProb = meteo?.hourly?.precipitation_probability?.[idx] ?? 0;
                const wind = Math.round((meteo?.hourly?.wind_speed_10m?.[idx] ?? 0) * 3.6);
                const isHot = temp >= maxTempThreshold;

                return (
                  <div
                    key={tIso}
                    className={`snap-start shrink-0 w-[72px] rounded-2xl border p-2 text-center shadow-2xs ${isHot
                        ? "bg-rose-500/10 border-rose-500/40"
                        : "bg-card border-border"
                      }`}
                  >
                    <p dir="ltr" className="text-[11px] font-bold text-muted-foreground">
                      {hour}
                    </p>
                    <p dir="ltr" className={`text-sm font-black my-1 ${isHot ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                      {temp.toFixed(0)}°
                    </p>
                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      <p dir="ltr" className="flex items-center justify-center gap-0.5">
                        <Droplets className="h-2.5 w-2.5 text-sky-500" />
                        <span>{rainProb}%</span>
                      </p>
                      <p dir="ltr" className="flex items-center justify-center gap-0.5">
                        <Wind className="h-2.5 w-2.5 text-teal-500" />
                        <span>{wind}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liste compacte 7 jours */}
          <div className="space-y-2">
            <h2 className="text-xs font-black text-muted-foreground flex items-center gap-1.5 px-0.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>{isAr ? "توقعات 7 أيام" : "Prévisions sur 7 jours"}</span>
            </h2>

            <div className="rounded-2xl border bg-card divide-y overflow-hidden shadow-2xs">
              {(meteo?.daily?.time || []).map((dayIso, idx) => {
                const dateObj = new Date(`${dayIso}T12:00:00`);
                const dayName = dateObj.toLocaleDateString(isAr ? "ar-DZ" : "fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                const min = meteo?.daily?.temperature_2m_min?.[idx] ?? 0;
                const max = meteo?.daily?.temperature_2m_max?.[idx] ?? 0;
                const rainSum = meteo?.daily?.precipitation_sum?.[idx] ?? 0;
                const rainProb = meteo?.daily?.precipitation_probability_max?.[idx] ?? 0;
                const et0 = meteo?.daily?.et0_fao_evapotranspiration?.[idx] ?? 0;
                const isOverThreshold = alertEnabled && max >= maxTempThreshold;

                return (
                  <div
                    key={dayIso}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs ${isOverThreshold ? "bg-rose-500/5" : ""
                      }`}
                  >
                    <div className="w-28 font-bold capitalize text-foreground flex items-center gap-1.5 truncate">
                      {isOverThreshold && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                      <span className="truncate">{dayName}</span>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground font-semibold shrink-0">
                      <Droplets className="h-3.5 w-3.5 text-sky-500" />
                      <span dir="ltr">
                        {rainSum > 0 ? `${rainSum.toFixed(1)} ${isAr ? "ملم" : "mm"}` : `${rainProb}%`}
                      </span>
                    </div>

                    <div className="hidden sm:block text-[11px] text-muted-foreground shrink-0">
                      <span>{isAr ? "تبخر" : "ETo"}: </span>
                      <strong dir="ltr" className="text-foreground">
                        {et0.toFixed(1)} {isAr ? "ملم" : "mm"}
                      </strong>
                    </div>

                    <div dir="ltr" className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground font-semibold w-7 text-right">{min.toFixed(0)}°</span>
                      <div className="h-1.5 w-14 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isOverThreshold ? "bg-rose-500" : "bg-emerald-600"}`}
                          style={{ width: `${Math.min(100, Math.max(10, (max / 45) * 100))}%` }}
                        />
                      </div>
                      <span className={`font-black w-7 ${isOverThreshold ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                        {max.toFixed(0)}°
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloc Alerte Canicule repliable */}
          <div className="rounded-2xl border border-amber-500/30 bg-card overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setHeatAlertOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-xs font-black text-foreground hover:bg-muted/40 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{isAr ? "إعدادات تنبيه موجة الحر عبر البريد" : "Alerte Canicule par E-mail"}</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${alertEnabled
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                    }`}
                >
                  {alertEnabled ? (isAr ? "مفعّل" : "Actif") : isAr ? "معطّل" : "Inactif"}
                </span>
                {heatAlertOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </span>
            </button>

            {heatAlertOpen && (
              <div className="border-t border-amber-500/20 bg-amber-500/[0.03] p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    {isAr ? "تفعيل التنبيه التلقائي" : "Activer l'alerte canicule"}
                  </span>
                  <input
                    type="checkbox"
                    checked={alertEnabled}
                    onChange={(e) => saveAlertConfig(maxTempThreshold, alertEmail, e.target.checked)}
                    className="h-5 w-5 rounded border-input accent-emerald-700 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "حد الحرارة القصوى (°م)" : "Seuil maximal (°C)"}
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Input
                        type="number"
                        dir="ltr"
                        min={25}
                        max={50}
                        step={1}
                        value={maxTempThreshold}
                        onChange={(e) => setMaxTempThreshold(parseFloat(e.target.value) || 35)}
                        className="h-9 font-black text-sm w-20 rounded-xl"
                      />
                      {[32, 35, 38, 40].map((tVal) => (
                        <button
                          key={tVal}
                          type="button"
                          onClick={() => saveAlertConfig(tVal, alertEmail, alertEnabled)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${maxTempThreshold === tVal
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-background text-foreground hover:bg-muted"
                            }`}
                        >
                          <span dir="ltr">{tVal}°</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "البريد الإلكتروني" : "Adresse e-mail"}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        dir="ltr"
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                        placeholder="ingenieur@ferme.com"
                        className="h-9 text-xs font-semibold rounded-xl flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveAlertConfig(maxTempThreshold, alertEmail, alertEnabled)}
                        className="rounded-xl font-bold text-xs h-9 px-3 shrink-0"
                      >
                        {isAr ? "حفظ" : "Sauver"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleTriggerEmailAlert}
                    disabled={sendingTestEmail}
                    className="rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isAr ? "تجربة إرسال تنبيه" : "Tester l'envoi"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ONGLET 2 : ساعات البرودة / HEURES DE FROID               */}
      {/* ======================================================== */}
      {activeTab === "chill" && (
        <ChillHoursComparator
          viewMode="all"
          embeddedInMeteo
          externalRefreshTick={chillRefreshTick}
          externalConfigOpen={chillConfigOpen}
          onExternalConfigChange={setChillConfigOpen}
        />
      )}

      {/* ======================================================== */}
      {/* ONGLET 3 : الشهري / MENSUEL                              */}
      {/* ======================================================== */}
      {activeTab === "monthly" && (
        <div className="space-y-3.5">
          {/* Barre de 12 pastilles de mois en défilement horizontal sur 1 ligne */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 snap-x">
            {MONTHLY_CLIMATE_DATA.map((m) => {
              const isSelected = m.monthIdx === selectedMonthIdx;
              const isCurrent = m.monthIdx === new Date().getMonth();

              return (
                <button
                  key={m.monthIdx}
                  type="button"
                  onClick={() => setSelectedMonthIdx(m.monthIdx)}
                  className={`snap-start shrink-0 rounded-full border px-3.5 py-2 text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${isSelected
                      ? "border-emerald-800 bg-emerald-800 text-white shadow-sm"
                      : "border-border bg-card text-foreground hover:bg-muted/60"
                    }`}
                >
                  <span>{isAr ? m.shortAr : m.shortFr}</span>
                  {isCurrent && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-amber-300" : "bg-emerald-500"
                        }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Détails du mois sélectionné : Grille 2×2 + Carte Conseils agronomiques */}
          {(() => {
            const m = MONTHLY_CLIMATE_DATA[selectedMonthIdx];
            const risk = getRiskDisplay(m.riskLevel, isAr);

            return (
              <div className="space-y-3">
                {/* En-tête du mois */}
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-base font-black text-foreground">
                    {isAr ? m.nameAr : m.nameFr}
                  </h2>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {isAr ? "المعدلات المرجعية — عين وسارة" : "Moyennes de référence — Aïn Oussera"}
                  </span>
                </div>

                {/* Grille 2×2 : Max/Min, Pluie, ETo/j & ETo/mois, Risque gel/chaleur */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* 1. Max / Min */}
                  <div className="rounded-2xl border bg-card p-3.5 shadow-2xs space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "القصوى / الدنيا" : "Max / Min"}
                    </span>
                    <div dir="ltr" className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                        {m.tempMax}°
                      </span>
                      <span className="text-muted-foreground font-bold">/</span>
                      <span className="text-lg font-black text-sky-600 dark:text-sky-400">
                        {m.tempMin}°C
                      </span>
                    </div>
                  </div>

                  {/* 2. Pluie */}
                  <div className="rounded-2xl border bg-card p-3.5 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "الأمطار المقدرة" : "Précipitations"}
                    </span>
                    <p dir="ltr" className="text-xl font-black text-foreground">
                      {m.rainMm}{" "}
                      <span className="text-xs font-bold text-muted-foreground">{isAr ? "ملم" : "mm"}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      ~{m.rainDays} {isAr ? "أيام ممطرة" : "jours de pluie"}
                    </p>
                  </div>

                  {/* 3. ETo/j & ETo/mois */}
                  <div className="rounded-2xl border bg-card p-3.5 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "التبخر (ETo)" : "ETo Moyen"}
                    </span>
                    <p dir="ltr" className="text-xl font-black text-orange-600 dark:text-orange-400">
                      {m.et0}{" "}
                      <span className="text-xs font-bold text-muted-foreground">{isAr ? "ملم/يوم" : "mm/j"}</span>
                    </p>
                    <p dir="ltr" className="text-[10px] text-muted-foreground font-semibold">
                      ~{Math.round(m.et0 * 30)} {isAr ? "ملم / شهر" : "mm / mois"}
                    </p>
                  </div>

                  {/* 4. Risque gel / chaleur */}
                  <div className="rounded-2xl border bg-card p-3.5 shadow-2xs flex flex-col justify-between space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      {isAr ? "المخاطر المناخية" : "Risque climatique"}
                    </span>
                    <span className={`inline-flex items-center justify-center rounded-xl border px-2 py-1.5 text-[11px] font-black text-center leading-tight ${risk.tone}`}>
                      {risk.label}
                    </span>
                  </div>
                </div>

                {/* Carte Conseils agronomiques du mois */}
                <Card className="rounded-2xl border border-emerald-600/25 bg-emerald-500/[0.06] p-4 space-y-2 shadow-2xs">
                  <h3 className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{isAr ? "التوصيات الزراعية لهذا الشهر" : "Conseils agronomiques du mois"}</span>
                  </h3>
                  <p className="text-xs text-foreground font-semibold leading-relaxed">
                    {isAr ? m.agriNotesAr : m.agriNotesFr}
                  </p>
                </Card>
              </div>
            );
          })()}
        </div>
      )}
    </main>
  );
}
