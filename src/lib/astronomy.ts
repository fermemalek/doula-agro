/**
 * Calculateur Astronomique Solaire pour Benhar (Djelfa, Algérie)
 * Coordonnées GPS : Latitude 35.286281° N, Longitude 3.103180° E
 * Fuseau horaire : UTC+1 (Pas d'heure d'été en Algérie)
 * Algorithme NOAA / Jean Meeus
 */

export const BENHAR_COORDINATES = {
  lat: 35.286281,
  lon: 3.103180,
  timezoneOffsetHours: 1, // UTC+1
  locality: "Benhar, Djelfa",
};

export interface SolarTimes {
  date: string; // YYYY-MM-DD
  sunriseMinutes: number; // Minutes depuis minuit (ex: 415 = 06:55)
  sunriseHour: number;
  sunriseMinute: number;
  sunriseStr: string; // "06:55"
  sunsetMinutes: number;
  sunsetHour: number;
  sunsetMinute: number;
  sunsetStr: string; // "18:45"
  duskMinutes: number; // Crépuscule civil
  duskStr: string; // "19:12"
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${pad2(h)}h${pad2(m)}`;
}

export function formatMinutesToTimeInput(totalMinutes: number): string {
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

/**
 * Calcule l'heure exacte du lever, du coucher du soleil et du crépuscule civil
 * pour une date donnée à Benhar (Djelfa).
 */
export function getSolarTimesForDate(dateInput: string | Date): SolarTimes {
  const d = typeof dateInput === "string" ? new Date(`${dateInput.slice(0, 10)}T12:00:00Z`) : dateInput;
  const dateStr = d.toISOString().slice(0, 10);

  // Jour de l'année (1 à 366)
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000) + 1;

  // Angle fractionnaire de l'année gamma en radians
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

  // Équation du temps (en minutes)
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Déclinaison solaire (en radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = degToRad(BENHAR_COORDINATES.lat);

  // 1. Lever et Coucher officiel (zénith = 90.833°)
  const cosZenithOfficial = Math.cos(degToRad(90.833));
  const cosHourAngleOfficial =
    (cosZenithOfficial - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));

  // 2. Crépuscule civil (zénith = 96.0°)
  const cosZenithCivil = Math.cos(degToRad(96.0));
  const cosHourAngleCivil =
    (cosZenithCivil - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));

  const clampedOfficial = Math.min(1, Math.max(-1, cosHourAngleOfficial));
  const haOfficialDeg = radToDeg(Math.acos(clampedOfficial));

  const clampedCivil = Math.min(1, Math.max(-1, cosHourAngleCivil));
  const haCivilDeg = radToDeg(Math.acos(clampedCivil));

  // Heure solaire en minutes depuis minuit (heure locale UTC+1)
  const lon = BENHAR_COORDINATES.lon;
  const tzMinutes = BENHAR_COORDINATES.timezoneOffsetHours * 60;

  // Sunrise = 720 - 4*(lon + ha) - eqtime + tz
  const sunriseMinRaw = 720 - 4 * (lon + haOfficialDeg) - eqtime + tzMinutes;
  // Sunset = 720 - 4*(lon - ha) - eqtime + tz
  const sunsetMinRaw = 720 - 4 * (lon - haOfficialDeg) - eqtime + tzMinutes;
  // Dusk = 720 - 4*(lon - haCivil) - eqtime + tz
  const duskMinRaw = 720 - 4 * (lon - haCivilDeg) - eqtime + tzMinutes;

  const sunriseMin = Math.round(sunriseMinRaw);
  const sunsetMin = Math.round(sunsetMinRaw);
  const duskMin = Math.round(duskMinRaw);

  const sHour = Math.floor(sunriseMin / 60);
  const sMin = sunriseMin % 60;

  const eHour = Math.floor(sunsetMin / 60);
  const eMin = sunsetMin % 60;

  return {
    date: dateStr,
    sunriseMinutes: sunriseMin,
    sunriseHour: sHour,
    sunriseMinute: sMin,
    sunriseStr: `${pad2(sHour)}h${pad2(sMin)}`,
    sunsetMinutes: sunsetMin,
    sunsetHour: eHour,
    sunsetMinute: eMin,
    sunsetStr: `${pad2(eHour)}h${pad2(eMin)}`,
    duskMinutes: duskMin,
    duskStr: formatMinutesToHHMM(duskMin),
  };
}

