const API_KEY = "bf25aea04e7472340b83660d13931cd5";
const LAT = 35.286281;
const LON = 3.103180;

export type WindDiag = {
  windMs: number;
  windKmh: number;
  ok: boolean;
  label: string;
  forecastDate: string;
};

const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
export function windDir(deg: number): string {
  return dirs[Math.round(deg / 45) % 8];
}

// Threshold: > 5 m/s = mauvais (≈ 18 km/h)
export const WIND_LIMIT_MS = 5;

export async function diagnoseWindForDate(isoDate: string): Promise<WindDiag | null> {
  const target = new Date(isoDate).getTime();
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric&lang=fr`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const list: any[] = json.list || [];
    if (!list.length) return null;
    let best = list[0];
    let diff = Math.abs(new Date(best.dt * 1000).getTime() - target);
    for (const slot of list) {
      const d = Math.abs(new Date(slot.dt * 1000).getTime() - target);
      if (d < diff) {
        diff = d;
        best = slot;
      }
    }
    const wind = best.wind?.speed ?? 0;
    return {
      windMs: wind,
      windKmh: Math.round(wind * 3.6),
      ok: wind <= WIND_LIMIT_MS,
      label: wind <= WIND_LIMIT_MS ? "Vent faible — favorable" : "Vent fort — défavorable",
      forecastDate: new Date(best.dt * 1000).toLocaleString("fr-FR"),
    };
  } catch {
    return null;
  }
}

export type RainForecast48h = {
  totalMm: number;
  isContaminatingRain: boolean; // >= 20 mm (seuil de délavage/lessivage des produits de contact)
  hasRain: boolean;             // > 0 mm
  maxProbability: number;       // %
  summary: string;
  source: 'open-meteo' | 'openweather';
};

/**
 * Récupère le cumul des précipitations prévues sur les prochaines 48 heures pour la ferme Doula Agro (Ain Oussera / Djelfa)
 * Interroge Open-Meteo en premier (direct, sans quota de clé), puis OpenWeather en secours.
 */
export async function getRainForecast48h(): Promise<RainForecast48h | null> {
  // 1. Essai Open-Meteo (même source que Meteo.tsx)
  try {
    const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=3`;
    const res = await fetch(omUrl);
    if (res.ok) {
      const data = await res.json();
      const dailySum = data.daily?.precipitation_sum || [];
      const dailyProb = data.daily?.precipitation_probability_max || [];
      // Cumul 48h = Aujourd'hui (J0) + Demain (J1)
      const day0 = Number(dailySum[0] || 0);
      const day1 = Number(dailySum[1] || 0);
      const totalMm = Math.round((day0 + day1) * 10) / 10;
      const maxProb = Math.max(Number(dailyProb[0] || 0), Number(dailyProb[1] || 0));

      return {
        totalMm,
        isContaminatingRain: totalMm >= 20,
        hasRain: totalMm > 0,
        maxProbability: maxProb,
        summary: totalMm >= 20
          ? `Alerte délavage : ${totalMm} mm prévus sous 48h`
          : totalMm > 0
          ? `Pluie faible/modérée (${totalMm} mm sous 48h)`
          : `Temps sec (< 1 mm sous 48h)`,
        source: 'open-meteo',
      };
    }
  } catch (err) {
    console.warn("Échec Open-Meteo pour getRainForecast48h, essai OpenWeather:", err);
  }

  // 2. Repli OpenWeather
  try {
    const owUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric&lang=fr`;
    const res = await fetch(owUrl);
    if (res.ok) {
      const json = await res.json();
      const list: any[] = json.list || [];
      const next48h = list.slice(0, 16); // 16 créneaux de 3h = 48h
      let totalMm = 0;
      let maxPop = 0;
      for (const slot of next48h) {
        if (slot.rain && typeof slot.rain["3h"] === "number") {
          totalMm += slot.rain["3h"];
        }
        if (typeof slot.pop === "number") {
          maxPop = Math.max(maxPop, slot.pop * 100);
        }
      }
      totalMm = Math.round(totalMm * 10) / 10;
      return {
        totalMm,
        isContaminatingRain: totalMm >= 20,
        hasRain: totalMm > 0,
        maxProbability: Math.round(maxPop),
        summary: totalMm >= 20
          ? `Alerte délavage : ${totalMm} mm prévus sous 48h`
          : totalMm > 0
          ? `Pluie faible/modérée (${totalMm} mm sous 48h)`
          : `Temps sec (< 1 mm sous 48h)`,
        source: 'openweather',
      };
    }
  } catch (err) {
    console.warn("Échec OpenWeather pour getRainForecast48h:", err);
  }

  return null;
}
