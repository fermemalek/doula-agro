import { useRole } from "@/lib/role";
import { useConfig } from "@/lib/config-store";

export type DisplayRole = "admin" | "executant" | "ingenieur";

/**
 * Visual role:
 * 1. Priorité absolue au rôle actif sélectionné par l'utilisateur via useRole().role
 * 2. Si non défini, rôle de la configuration locale
 * 3. Défaut: executant
 */
export function useDisplayRole(): DisplayRole {
  const { role } = useRole();
  const cfg = useConfig();

  if (role === "admin" || role === "ingenieur" || role === "executant") {
    return role;
  }

  if (cfg.configured && (cfg.role === "admin" || cfg.role === "ingenieur" || cfg.role === "executant")) {
    return cfg.role;
  }

  return "executant";
}
