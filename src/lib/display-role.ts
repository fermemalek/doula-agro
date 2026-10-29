import { useRole } from "@/lib/role";
import { useConfig } from "@/lib/config-store";

export type DisplayRole = "admin" | "executant" | "ingenieur";

/** Visual role: pour tout utilisateur connecté, son rôle en base (dbRole) s'applique directement. */
export function useDisplayRole(): DisplayRole {
  const { role: dbRole, session } = useRole();
  const cfg = useConfig();

  const isRealUser =
    session && session.user.id !== "00000000-0000-0000-0000-000000000000";

  if (isRealUser && dbRole) {
    return dbRole;
  }

  const r = cfg.configured ? cfg.role : dbRole;
  if (r === "admin") return "admin";
  if (r === "ingenieur") return "ingenieur";
  return "executant";
}