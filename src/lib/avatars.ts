export interface UserAvatarInput {
  email?: string | null;
  username?: string | null;
  fullName?: string | null;
  name?: string | null;
  role?: string | null;
}

const BASE = import.meta.env.BASE_URL || "./";

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

/**
 * Retourne l'URL de l'avatar circulaire correspondant à un utilisateur ou identifiant
 * (insensible à la casse), compatible GitHub Pages et APK mobile via `import.meta.env.BASE_URL`.
 */
export function getUserAvatar(userOrIdentifier?: string | UserAvatarInput | null): string | null {
  if (!userOrIdentifier) return null;

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

  // Fallback par rôle uniquement si aucun nom n'était fourni
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
