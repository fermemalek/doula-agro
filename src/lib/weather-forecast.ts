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
