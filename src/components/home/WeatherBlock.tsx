import { useQuery } from "@tanstack/react-query";
import { Cloud, Droplets, Wind, Thermometer, ExternalLink } from "lucide-react";

const API_KEY = "bf25aea04e7472340b83660d13931cd5";
const LAT = 35.286281;
const LON = 3.103180;
const WEATHER_URL = `https://www.windy.com/?${LAT},${LON},10`;

function degToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

interface CurrentResp {
  main: { temp: number; humidity: number; temp_min: number; temp_max: number };
  wind: { speed: number; deg: number };
  weather: { description: string; icon: string }[];
}

interface ForecastResp {
  list: { dt: number; main: { temp_min: number; temp_max: number } }[];
}

async function fetchWeather() {
  const [curRes, fcRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=fr&appid=${API_KEY}`),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=metric&lang=fr&appid=${API_KEY}`),
  ]);
  if (!curRes.ok) throw new Error("Météo indisponible");
  const current: CurrentResp = await curRes.json();
  let tmin = current.main.temp_min;
  let tmax = current.main.temp_max;
  if (fcRes.ok) {
    const fc: ForecastResp = await fcRes.json();
    const today = new Date().toISOString().slice(0, 10);
    const todays = fc.list.filter((e) => new Date(e.dt * 1000).toISOString().slice(0, 10) === today);
    if (todays.length) {
      tmin = Math.min(...todays.map((e) => e.main.temp_min));
      tmax = Math.max(...todays.map((e) => e.main.temp_max));
    }
  }
  return {
    temp: current.main.temp,
    tempMin: tmin,
    tempMax: tmax,
    humidity: current.main.humidity,
    windSpeed: current.wind.speed * 3.6,
    windDir: degToCardinal(current.wind.deg),
    description: current.weather[0]?.description ?? "",
  };
}

export function WeatherBlock() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["weather"],
    queryFn: fetchWeather,
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <a
      href={WEATHER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      title="Ouvrir la météo détaillée (Windy)"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Cloud className="h-4 w-4" />
          Météo — Doula
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {isLoading && <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>}
      {error && <p className="mt-3 text-sm text-muted-foreground">Données météo indisponibles</p>}
      {data && (
        <div className="mt-3 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-foreground">{Math.round(data.temp)}°</span>
            <span className="text-sm capitalize text-muted-foreground">{data.description}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-foreground">
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              Max {Math.round(data.tempMax)}° / Min {Math.round(data.tempMin)}°
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
              Humidité {data.humidity}%
            </div>
            <div className="col-span-2 flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              Vent {Math.round(data.windSpeed)} km/h — {data.windDir}
            </div>
          </div>
        </div>
      )}
    </a>
  );
}
