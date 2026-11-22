import { supabase } from "@/integrations/supabase/client";
import { clearAllModuleRecordsLocal } from "@/lib/modules-store";

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
function triggerLocalBackupDownload(payload: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `backup_doula_agro_${today}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (err) {
    console.warn("[resetFarmData] Backup download warning:", err);
  }
}

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

    // Sauvegarde locale automatique (backup_doula_agro_YYYY-MM-DD.json) juste avant la réinitialisation
    const backupSnapshot: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      farmId: FARM_ID,
      cloudTables: {} as Record<string, unknown>,
      localStorage: {} as Record<string, unknown>,
    };
    const cloudTables: Record<string, unknown> = {};
    for (const t of tables) {
      try {
        const { data } = await (supabase as any).from(t).select("*").eq("farm_id", FARM_ID);
        cloudTables[t] = data ?? [];
      } catch {
        cloudTables[t] = [];
      }
    }
    backupSnapshot.cloudTables = cloudTables;
    try {
      const localDump: Record<string, unknown> = {};
      for (const k of ["doula-modules", "doula-anomalies", "doula-alerts", "doula-ops", "doula-reminders", "doula-suppliers", "doula-products"]) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try { localDump[k] = JSON.parse(raw); } catch { localDump[k] = raw; }
        }
      }
      backupSnapshot.localStorage = localDump;
    } catch {}
    triggerLocalBackupDownload(backupSnapshot);

    const results: Record<string, { ok: boolean; error?: string }> = {};
    for (const t of tables) {
      const { error } = await (supabase as any).from(t).delete().eq("farm_id", FARM_ID);
      results[t] = error ? { ok: false, error: error.message } : { ok: true };
      if (error) console.error(`[resetFarmData] ${t}:`, error.message);
    }

    const anyFail = Object.values(results).some((r) => !r.ok);

    // Purger immédiatement les caches locaux (modules, overrides, historique phyto) et notifier l'UI
    if (!anyFail && typeof window !== "undefined") {
      try {
        clearAllModuleRecordsLocal();
        localStorage.removeItem("doula-modules");
        localStorage.removeItem("doula_recos_status_overrides");
        localStorage.removeItem("doula_deleted_recos");
        localStorage.removeItem("doula_dismissed_phyto_history");
        window.dispatchEvent(new CustomEvent("doula:farm-reset"));
      } catch (err) {
        console.warn("[resetFarmData] local cache purge warning:", err);
      }
    }

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
