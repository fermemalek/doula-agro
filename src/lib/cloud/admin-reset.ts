import { supabase } from "@/integrations/supabase/client";

const FARM_ID = "00000000-0000-0000-0000-000000000001";

export type ResetResult = {
  ok: boolean;
  error?: string;
  results?: Record<string, { ok: boolean; error?: string }>;
};

/**
 * Réinitialise les données de la ferme. Doit être appelé par un admin.
 * Les RLS policies côté Supabase contrôlent l'accès — l'utilisateur doit avoir
 * le rôle "admin" dans la table user_roles pour que les DELETE aboutissent.
 */
export async function resetFarmData(): Promise<ResetResult> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) {
      return { ok: false, error: "Session invalide. Reconnectez-vous." };
    }

    const tables = [
      "task_executions",
      "tasks",
      "module_records",
      "alerts",
      "recommendations",
      "supplier_purchases",
    ] as const;

    const results: Record<string, { ok: boolean; error?: string }> = {};
    for (const t of tables) {
      const { error } = await supabase.from(t).delete().eq("farm_id", FARM_ID);
      results[t] = error ? { ok: false, error: error.message } : { ok: true };
      if (error) console.error(`[resetFarmData] ${t}:`, error.message);
    }

    const anyFail = Object.values(results).some((r) => !r.ok);
    return {
      ok: !anyFail,
      results,
      error: anyFail ? "Certaines tables n'ont pas pu être nettoyées (vérifiez vos droits admin)" : undefined,
    };
  } catch (e: any) {
    console.error("[resetFarmData] unexpected:", e);
    return { ok: false, error: e?.message || "Erreur inattendue" };
  }
}
