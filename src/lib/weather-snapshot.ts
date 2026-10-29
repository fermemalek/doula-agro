// Capture météo instantanée pour la traçabilité des exécutions terrain.
// Utilise l'API OpenWeather déjà configurée dans le projet.

const API_KEY = "bf25aea04e7472340b83660d13931cd5";
const LAT = 35.286281;
const LON = 3.103180;

export type WeatherSnapshot = {
  temp_c: number | null;
  wind_ms: number | null;
  wind_kmh: number | null;
  humidity: number | null;
  description: string | null;
  captured_at: string;
  source: "openweather";
};

/** Récupère silencieusement la météo courante (timeout 4s). */
export async function captureWeatherSnapshot(): Promise<WeatherSnapshot> {
  const fallback: WeatherSnapshot = {
    temp_c: null,
    wind_ms: null,
    wind_kmh: null,
    humidity: null,
    description: null,
    captured_at: new Date().toISOString(),
    source: "openweather",
  };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=fr&appid=${API_KEY}`,
      { signal: ctrl.signal },
    );
    clearTimeout(t);
    if (!res.ok) return fallback;
    const j = await res.json();
    const wind = j.wind?.speed ?? null;
    return {
      temp_c: typeof j.main?.temp === "number" ? Math.round(j.main.temp * 10) / 10 : null,
      wind_ms: typeof wind === "number" ? wind : null,
      wind_kmh: typeof wind === "number" ? Math.round(wind * 3.6) : null,
      humidity: typeof j.main?.humidity === "number" ? j.main.humidity : null,
      description: j.weather?.[0]?.description ?? null,
      captured_at: new Date().toISOString(),
      source: "openweather",
    };
  } catch {
    return fallback;
  }
}
