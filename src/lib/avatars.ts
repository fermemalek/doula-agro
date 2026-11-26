import { useEffect, useState } from "react";

export interface UserAvatarInput {
  id?: string | null;
  email?: string | null;
  username?: string | null;
  fullName?: string | null;
  name?: string | null;
  role?: string | null;
}

const BASE = import.meta.env.BASE_URL || "./";
const CUSTOM_AVATARS_KEY = "doula_custom_avatars_v1";

export const USER_AVATAR_URLS = {
  mohcherif: `${BASE}avatars/avatar_mohcherif.png`,
  zeinab: `${BASE}avatars/avatar_zeinab.png`,
  fermemalek: `${BASE}avatars/avatar_fermemalek.png`,
} as const;

export const QUICK_LOGIN_PROFILES = [
  {
    id: "fermemalek",
    label: "Abderrahmane",
    identifier: "fermemalek@gmail.com",
    roleLabelFr: "Admin",
    roleLabelAr: "مدير",
    avatar: USER_AVATAR_URLS.fermemalek,
  },
  {
    id: "zeinab",
    label: "Zeinab",
    identifier: "zeinab",
    roleLabelFr: "Ingénieur",
    roleLabelAr: "مهندس",
    avatar: USER_AVATAR_URLS.zeinab,
  },
  {
    id: "mohcherif",
    label: "Mohcherif",
    identifier: "mohcherif",
    roleLabelFr: "Exécutant",
    roleLabelAr: "منفذ",
    avatar: USER_AVATAR_URLS.mohcherif,
  },
] as const;

let customAvatarsCache: Record<string, string> = {};
const listeners = new Set<() => void>();

function normalizeKey(v?: string | null): string {
  return (v || "").trim().toLowerCase();
}

function loadCustomAvatars() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CUSTOM_AVATARS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        customAvatarsCache = parsed;
      }
    }
  } catch {
    customAvatarsCache = {};
  }
}

loadCustomAvatars();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function persistCustomAvatars() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_AVATARS_KEY, JSON.stringify(customAvatarsCache));
  } catch {
    // ignore quota errors
  }
  notifyListeners();
}

export function saveCustomUserAvatar(identifiers: (string | null | undefined)[], dataUrl: string) {
  const next = { ...customAvatarsCache };
  for (const raw of identifiers) {
    const k = normalizeKey(raw);
    if (k && k !== "non spécifié" && k !== "غير محدد") {
      next[k] = dataUrl;
    }
  }
  customAvatarsCache = next;
  persistCustomAvatars();
}

export function removeCustomUserAvatar(identifiers: (string | null | undefined)[]) {
  const next = { ...customAvatarsCache };
  for (const raw of identifiers) {
    const k = normalizeKey(raw);
    if (k) delete next[k];
  }
  customAvatarsCache = next;
  persistCustomAvatars();
}

export function hasCustomUserAvatar(userOrIdentifier?: string | UserAvatarInput | null): boolean {
  if (!userOrIdentifier) return false;
  const candidates = extractLookupKeys(userOrIdentifier);
  return candidates.some((k) => Boolean(customAvatarsCache[k]));
}

export function useAvatarVersion(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CUSTOM_AVATARS_KEY) {
        loadCustomAvatars();
        fn();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(fn);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return tick;
}

function extractLookupKeys(userOrIdentifier: string | UserAvatarInput): string[] {
  if (typeof userOrIdentifier === "string") {
    const k = normalizeKey(userOrIdentifier);
    return k ? [k] : [];
  }
  const rawList = [
    userOrIdentifier.id,
    userOrIdentifier.username,
    userOrIdentifier.email,
    userOrIdentifier.fullName,
    userOrIdentifier.name,
  ];
  return Array.from(new Set(rawList.map(normalizeKey).filter(Boolean)));
}

/**
 * Redimensionne et recadre au carré (192x192 JPEG) une image importée pour le profil.
 */
export function compressAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format d'image non pris en charge."));
      img.onload = () => {
        const size = 192;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponible."));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Retourne l'URL de l'avatar circulaire correspondant à un utilisateur ou identifiant
 * (priorité aux photos personnalisées enregistrées, puis aux avatars par défaut).
 */
export function getUserAvatar(userOrIdentifier?: string | UserAvatarInput | null): string | null {
  if (!userOrIdentifier) return null;

  // 1. Vérifier d'abord les avatars personnalisés enregistrés
  const keys = extractLookupKeys(userOrIdentifier);
  for (const k of keys) {
    if (customAvatarsCache[k]) return customAvatarsCache[k];
  }

  // 2. Sinon correspondance sur les 3 avatars par défaut intégrés
  let combined = "";
  let role = "";
  if (typeof userOrIdentifier === "string") {
    combined = userOrIdentifier.trim().toLowerCase();
  } else {
    combined = [
      userOrIdentifier.email,
      userOrIdentifier.username,
      userOrIdentifier.fullName,
      userOrIdentifier.name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase();
    role = (userOrIdentifier.role || "").trim().toLowerCase();
  }

  if (combined.includes("mohcherif") || combined.includes("moh cherif")) {
    return USER_AVATAR_URLS.mohcherif;
  }
  if (combined.includes("zeinab") || combined.includes("shawaly")) {
    return USER_AVATAR_URLS.zeinab;
  }
  if (
    combined.includes("fermemalek") ||
    combined.includes("abderrahmane") ||
    combined.includes("abder")
  ) {
    return USER_AVATAR_URLS.fermemalek;
  }

  if (!combined && role === "ingenieur") {
    return USER_AVATAR_URLS.zeinab;
  }
  return null;
}

export function getUserInitials(name?: string | null): string {
  const clean = (name || "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
