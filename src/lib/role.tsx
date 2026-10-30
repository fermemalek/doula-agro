import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "executant" | "ingenieur";

interface AuthCtx {
  session: Session | null;
  userId: string | null;
  role: Role | null;
  loading: boolean;
  isAdmin: boolean;
  isIngenieur: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const ROLE_CACHE_PREFIX = "doula-role:";

function readCachedRole(uid: string): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(ROLE_CACHE_PREFIX + uid);
    if (v === "admin" || v === "executant" || v === "ingenieur") return v;
  } catch { }
  return null;
}

function writeCachedRole(uid: string, role: Role) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROLE_CACHE_PREFIX + uid, role);
    const raw = localStorage.getItem("doula-config");
    const parsed = raw ? JSON.parse(raw) : {};
    localStorage.setItem("doula-config", JSON.stringify({ ...parsed, configured: true, role }));
  } catch { }
}

function clearCachedRoles() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(ROLE_CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isTabActiveNow =
      typeof window !== "undefined" &&
      sessionStorage.getItem("doula-session-active") === "1";

    if (!isTabActiveNow) {
      // Nouvelle visite : afficher immédiatement la page de connexion (/login) sans attendre
      setSession(null);
      setRole(null);
      setLoading(false);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" && s && typeof window !== "undefined") {
        sessionStorage.setItem("doula-session-active", "1");
      }
      const isTabActive =
        typeof window !== "undefined" &&
        sessionStorage.getItem("doula-session-active") === "1";

      if (!s || !isTabActive) {
        setSession(null);
        setRole(null);
        setLoading(false);
      } else {
        setSession(s);
        const cached = readCachedRole(s.user.id);
        setRole(cached ?? "executant");
        setLoading(false);
        setTimeout(() => fetchRole(s.user.id), 0);
      }
    });

    if (isTabActiveNow) {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (data.session) {
            setSession(data.session);
            const cached = readCachedRole(data.session.user.id);
            setRole(cached ?? "executant");
            setLoading(false);
            fetchRole(data.session.user.id);
          } else {
            setSession(null);
            setRole(null);
            setLoading(false);
          }
        })
        .catch(() => {
          setLoading(false);
        });
    }

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function fetchRole(uid: string) {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (error) throw error;

      const roles = (data ?? []).map((d) => d.role as Role);
      let r: Role = readCachedRole(uid) ?? "executant";
      if (roles.includes("ingenieur")) r = "ingenieur";
      else if (roles.includes("admin")) r = "admin";
      else if (roles.includes("executant")) r = "executant";

      setRole(r);
      writeCachedRole(uid, r);
    } catch (err: any) {
      console.error("[RoleProvider] fetchRole failed:", err);
      const cached = readCachedRole(uid);
      setRole(cached ?? "executant");
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <Ctx.Provider
      value={{
        session,
        userId: session?.user.id ?? null,
        role,
        loading,
        isAdmin: role === "admin",
        isIngenieur: role === "ingenieur",
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