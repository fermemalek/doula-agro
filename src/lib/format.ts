/**
 * Utilitaires globaux de formatage pour l'application Doula Agro :
 * - Dates au format JJ/MM/AAAA (et JJ/MM/AAAA HH:mm)
 * - Nombres et montants avec séparateur de milliers (fr-FR)
 */

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Formate une date (ISO YYYY-MM-DD, ISO datetime, Date ou timestamp) en JJ/MM/AAAA.
 * Évite tout décalage de fuseau horaire pour les chaînes YYYY-MM-DD.
 */
export function formatDateFR(
  input: string | Date | number | null | undefined,
  fallback = "—",
): string {
  if (input === null || input === undefined || input === "") return fallback;

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return fallback;

    // Déjà au format JJ/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;

    // Format ISO YYYY-MM-DD (éventuellement suivi de T... ou espace)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d}/${m}/${y}`;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
    }
    return trimmed;
  }

  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Formate une date avec heure en JJ/MM/AAAA HH:mm.
 */
export function formatDateTimeFR(
  input: string | Date | number | null | undefined,
  fallback = "—",
): string {
  if (input === null || input === undefined || input === "") return fallback;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) {
    return typeof input === "string" ? formatDateFR(input, fallback) : fallback;
  }
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Formate un nombre avec séparateur de milliers (fr-FR).
 * - Si `decimals` est défini, fixe exactement ce nombre de décimales.
 * - Sinon, affiche jusqu'à 2 décimales sans zéros inutiles.
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals?: number,
): string {
  const num = typeof value === "number" ? value : Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  const safe = Number.isFinite(num) ? num : 0;

  if (typeof decimals === "number") {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safe);
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(safe);
}

/**
 * Formate un montant en Dinars Algériens avec séparateur de milliers (ex: "1 145 000 DA").
 */
export function formatDA(
  value: number | string | null | undefined,
  decimals = 0,
): string {
  return `${formatNumber(value, decimals)} DA`;
}
