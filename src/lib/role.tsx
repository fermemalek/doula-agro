import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { saveConfig } from "@/lib/config-store";

export type Role = "admin" | "executant" | "ingenieur";

interface AuthCtx {
  session: Session | null;
  userId: string | null;
  role: Role | null;
  loading: boolean;
  isAdmin: boolean;
  isIngenieur: boolean;
  switchRole: (newRole: Role) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const ROLE_CACHE_PREFIX = "doula-role:";
const ACTIVE_ROLE_KEY = "doula-active-role";
const LAST_USER_KEY = "doula-last-uid";

export function getDefaultLangForRole(r: Role): "ar" | "fr" {
  return r === "ingenieur" ? "ar" : "fr";
}

export function applyDefaultLangForRole(r: Role) {
  const targetLang = getDefaultLangForRole(r);
  saveConfig({ lang: targetLang, role: r, configured: true });
  if (typeof document !== "undefined") {
    document.documentElement.dir = targetLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = targetLang;
  }
}

export function isZeinabAccount(user?: { email?: string | null; user_metadata?: Record<string, any> } | null): boolean {
  const email = (user?.email || "").trim().toLowerCase();
  const fullName = String(user?.user_metadata?.full_name || "").trim().toLowerCase();
  const combined = `${email} ${fullName}`;
  return combined.includes("zeinab");
}

export function resolveAccountRealRole(
  user?: { email?: string | null; user_metadata?: Record<string, any> } | null,
  dbRoles?: Role[],
): Role {
  // Le compte Zeinab est toujours Ingénieur par défaut à la connexion (langue AR),
  // même si un test RoleSwitcher précédent a écrit une ligne "admin" dans user_roles.
  if (isZeinabAccount(user)) {
    return "ingenieur";
  }
  const roles = dbRoles ?? [];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("ingenieur")) return "ingenieur";
  if (roles.includes("executant")) return "executant";
  return inferFallbackRoleFromUser(user);
}

export function inferFallbackRoleFromUser(user?: { email?: string | null; user_metadata?: Record<string, any> } | null): Role {
  const email = (user?.email || "").trim().toLowerCase();
  const fullName = String(user?.user_metadata?.full_name || "").trim().toLowerCase();
  const combined = `${email} ${fullName}`;
  if (
    combined.includes("fermemalek") ||
    combined.includes("abderrahmane") ||
    combined.includes("abdelmalek") ||
    combined.includes("malekfilois")
  ) {
    return "admin";
  }
  if (
    combined.includes("zeinab") ||
    combined.includes("khadij") ||
    combined.includes("doujadz") ||
    combined.includes("ingenieur")
  ) {
    return "ingenieur";
  }
  return "executant";
}

function readCachedRole(uid?: string | null): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const active = localStorage.getItem(ACTIVE_ROLE_KEY);
    if (active === "admin" || active === "executant" || active === "ingenieur") {
      return active;
    }
    if (uid) {
      const v = localStorage.getItem(ROLE_CACHE_PREFIX + uid);
      if (v === "admin" || v === "executant" || v === "ingenieur") return v;
    }
    const rawCfg = localStorage.getItem("doula-config");
    if (rawCfg) {
      const parsed = JSON.parse(rawCfg);
      if (parsed?.configured && (parsed.role === "admin" || parsed.role === "ingenieur" || parsed.role === "executant")) {
        return parsed.role;
      }
    }
  } catch { }
  return null;
}

function writeCachedRole(uid: string | null | undefined, role: Role) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
    if (uid) {
      localStorage.setItem(ROLE_CACHE_PREFIX + uid, role);
      localStorage.setItem(LAST_USER_KEY, uid);
    }
    saveConfig({ role, configured: true });
  } catch { }
}

export function clearCachedRoles() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    localStorage.removeItem(LAST_USER_KEY);
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(ROLE_CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    // Réinitialiser le flag configured afin que l'ancien rôle de doula-config ne persiste pas
    saveConfig({ configured: false });
  } catch { }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(() => readCachedRole(null) ?? "executant");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && s && typeof window !== "undefined") {
        sessionStorage.setItem("doula-session-active", "1");
      }

      if (!s) {
        setSession(null);
        setRole(null);
        setLoading(false);
      } else {
        const lastUid = typeof window !== "undefined" ? localStorage.getItem(LAST_USER_KEY) : null;
        const isFreshSignIn = event === "SIGNED_IN" && lastUid !== s.user.id;
        setSession(s);
        if (isFreshSignIn) {
          clearCachedRoles();
          const immediateRole = inferFallbackRoleFromUser(s.user);
          setRole(immediateRole);
          applyDefaultLangForRole(immediateRole);
          setLoading(false);
          setTimeout(() => fetchRole(s.user.id, { forceRefresh: true, applyDefaultLang: true, user: s.user }), 0);
        } else {
          const cached = readCachedRole(s.user.id);
          setRole(cached ?? inferFallbackRoleFromUser(s.user));
          setLoading(false);
          setTimeout(() => fetchRole(s.user.id, { forceRefresh: false, applyDefaultLang: false, user: s.user }), 0);
        }
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("doula-session-active", "1");
          }
          setSession(data.session);
          const cached = readCachedRole(data.session.user.id);
          setRole(cached ?? inferFallbackRoleFromUser(data.session.user));
          setLoading(false);
          fetchRole(data.session.user.id, { forceRefresh: false, applyDefaultLang: false, user: data.session.user });
        } else {
          setSession(null);
          setRole(null);
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function fetchRole(
    uid: string,
    opts?: { forceRefresh?: boolean; applyDefaultLang?: boolean; user?: Session["user"] },
  ) {
    try {
      // 1. Si même session déjà active (pas un nouveau login), respecter le rôle choisi via RoleSwitcher
      if (!opts?.forceRefresh) {
        const cached = readCachedRole(uid);
        if (cached) {
          setRole(cached);
          return;
        }
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (error) throw error;

      const roles = (data ?? []).map((d) => d.role as Role);
      const r = resolveAccountRealRole(opts?.user, roles);

      setRole(r);
      writeCachedRole(uid, r);
      if (opts?.applyDefaultLang) {
        applyDefaultLangForRole(r);
      }
    } catch (err: any) {
      console.error("[RoleProvider] fetchRole failed:", err);
      const fallback = opts?.forceRefresh
        ? inferFallbackRoleFromUser(opts?.user)
        : readCachedRole(uid) ?? inferFallbackRoleFromUser(opts?.user);
      setRole(fallback);
      if (opts?.applyDefaultLang) {
        applyDefaultLangForRole(fallback);
      }
    } finally {
      setLoading(false);
    }
  }

  const switchRole = (newRole: Role) => {
    setRole(newRole);
    writeCachedRole(session?.user?.id, newRole);
    // RoleSwitcher est un basculement temporaire de session : ne jamais écraser user_roles dans Supabase
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("doula-session-active");
    }
    try {
      await supabase.auth.signOut();
    } catch { }
    clearCachedRoles();
    setSession(null);
    setRole(null);
  };

  const isAdmin = role === "admin" || (session?.user?.email?.toLowerCase().includes("fermemalek") ?? false);
  const isIngenieur = role === "ingenieur";

  return (
    <Ctx.Provider
      value={{
        session,
        userId: session?.user.id ?? null,
        role,
        loading,
        isAdmin,
        isIngenieur,
        switchRole,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useRole() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRole must be used within RoleProvider");
  return c;
}