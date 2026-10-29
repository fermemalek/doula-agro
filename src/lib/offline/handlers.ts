import { supabase } from "@/integrations/supabase/client";
import { offlineDB, type ConflictLogEntry } from "./db";
import { registerOp } from "./sync-engine";
import { toast } from "sonner";

/**
 * Last-Write-Wins update with conflict logging.
 * - If base_updated_at is provided and the server has a newer version,
 *   we still apply our update (LWW) but record the overwrite in conflict_log.
 */
async function lwwUpdate(params: {
  table: string;
  id: string;
  patch: Record<string, unknown>;
  base_updated_at: string | null;
}) {
  const { table, id, patch, base_updated_at } = params;

  // Read current server version for conflict detection (best-effort).
  let serverSnapshot: Record<string, unknown> | null = null;
  let serverUpdatedAt: string | null = null;
  try {
    const { data } = await supabase
      .from(table as never)
      .select("*")
      .eq("id" as never, id as never)
      .maybeSingle();
    if (data) {
      serverSnapshot = data as Record<string, unknown>;
      serverUpdatedAt = (data as { updated_at?: string }).updated_at ?? null;
    }
  } catch {
    // ignore — proceed with update
  }

  const isConflict =
    base_updated_at != null &&
    serverUpdatedAt != null &&
    new Date(serverUpdatedAt).getTime() > new Date(base_updated_at).getTime();

  const { error } = await supabase
    .from(table as never)
    .update(patch as never)
    .eq("id" as never, id as never);
  if (error) throw error;

  if (isConflict) {
    const log: ConflictLogEntry = {
      table,
      record_id: id,
      base_updated_at,
      server_updated_at: serverUpdatedAt,
      my_payload: patch,
      server_snapshot: serverSnapshot,
      resolved_strategy: "last-write-wins",
      created_at: Date.now(),
      synced_to_server: false,
    };
    await offlineDB.conflict_log.add(log);
    // Sync to server (best-effort, requires conflict_log table to exist)
    try {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("conflict_log" as never).insert({
        table_name: table,
        record_id: id,
        base_updated_at,
        server_updated_at: serverUpdatedAt,
        new_value: patch,
        previous_value: serverSnapshot,
        overwritten_by: u.user?.id ?? null,
      } as never);
      // mark as synced — last entry inserted
      const last = await offlineDB.conflict_log
        .orderBy("id")
        .reverse()
        .first();
      if (last?.id) await offlineDB.conflict_log.update(last.id, { synced_to_server: true });
    } catch {
      // table might not exist yet — local log is enough
    }
    if (typeof window !== "undefined") {
      toast.warning("Modification appliquée — une version plus récente a été remplacée", {
        description: `Table ${table}`,
      });
    }
  }
}

// ============================================================
// Handlers
// ============================================================

registerOp("execution.create", async (e) => {
  const p = e.payload as {
    task_id: string | null;
    module_record_id: string | null;
    duration_min: number | null;
    actual_quantity: number | null;
    actual_unit: string | null;
    comment: string | null;
    photo_urls: string[];
    weather_snapshot: unknown;
    executed_by: string;
    executed_at: string;
  };

  const { error } = await supabase.from("task_executions").insert({
    task_id: p.task_id,
    module_record_id: p.module_record_id,
    executed_by: p.executed_by,
    executed_at: p.executed_at,
    duration_min: p.duration_min,
    actual_quantity: p.actual_quantity,
    actual_unit: p.actual_unit,
    comment: p.comment,
    photo_urls: p.photo_urls ?? [],
    weather_snapshot: (p.weather_snapshot ?? null) as never,
  });
  if (error) throw error;

  if (p.task_id) {
    const { error: e1 } = await supabase
      .from("tasks")
      .update({ status: "fait" })
      .eq("id", p.task_id);
    if (e1) throw e1;
  }
  if (p.module_record_id) {
    const { error: e2 } = await supabase
      .from("module_records")
      .update({
        status: "execute",
        executed_at: p.executed_at,
        executed_by: p.executed_by,
      })
      .eq("id", p.module_record_id);
    if (e2) throw e2;
  }
});

registerOp("alert.create", async (e) => {
  const p = e.payload as Record<string, unknown>;
  const { error } = await supabase.from("alerts").insert(p as never);
  if (error) throw error;
});

registerOp("alert.update", async (e) => {
  const { id, patch, base_updated_at } = e.payload as {
    id: string;
    patch: Record<string, unknown>;
    base_updated_at: string | null;
  };
  await lwwUpdate({ table: "alerts", id, patch, base_updated_at });
});

registerOp("alert.delete", async (e) => {
  const { id } = e.payload as { id: string };
  const { error } = await supabase.from("alerts").delete().eq("id", id);
  if (error) throw error;
});

registerOp("task.create", async (e) => {
  const p = e.payload as Record<string, unknown>;
  const { error } = await supabase.from("tasks").insert(p as never);
  if (error) throw error;
});

registerOp("task.update", async (e) => {
  const { id, patch, base_updated_at } = e.payload as {
    id: string;
    patch: Record<string, unknown>;
    base_updated_at: string | null;
  };
  await lwwUpdate({ table: "tasks", id, patch, base_updated_at });
});

registerOp("task.delete", async (e) => {
  const { id } = e.payload as { id: string };
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
});

registerOp("program.create", async (e) => {
  const p = e.payload as Record<string, unknown>;
  const { error } = await supabase.from("module_records").insert(p as never);
  if (error) throw error;
});

registerOp("program.update", async (e) => {
  const { id, patch } = e.payload as { id: string; patch: Record<string, unknown> };
  const { error } = await supabase.from("module_records").update(patch as never).eq("id", id);
  if (error) throw error;
});

registerOp("program.delete", async (e) => {
  const { id } = e.payload as { id: string };
  const { error } = await supabase.from("module_records").delete().eq("id", id);
  if (error) throw error;
});

registerOp("recommendation.create", async (e) => {
  const p = e.payload as Record<string, unknown>;
  const { error } = await supabase.from("recommendations").insert(p as never);
  if (error) throw error;
});

registerOp("recommendation.update", async (e) => {
  const { id, patch, base_updated_at } = e.payload as {
    id: string;
    patch: Record<string, unknown>;
    base_updated_at: string | null;
  };
  await lwwUpdate({ table: "recommendations", id, patch, base_updated_at });
});

registerOp("recommendation.delete", async (e) => {
  const { id } = e.payload as { id: string };
  const { error } = await supabase.from("recommendations").delete().eq("id", id);
  if (error) throw error;
});

registerOp("profile.update", async (e) => {
  const { id, patch } = e.payload as { id: string; patch: Record<string, unknown> };
  const { error } = await supabase.from("profiles").update(patch as never).eq("id", id);
  if (error) throw error;
});

registerOp("purchase.create", async (e) => {
  const p = e.payload as Record<string, unknown>;
  const { error } = await supabase.from("supplier_purchases" as any).insert(p as never);
  if (error) throw error;
});

registerOp("purchase.update", async (e) => {
  const { id, patch, base_updated_at } = e.payload as {
    id: string;
    patch: Record<string, unknown>;
    base_updated_at: string | null;
  };
  await lwwUpdate({ table: "supplier_purchases", id, patch, base_updated_at });
});

registerOp("purchase.delete", async (e) => {
  const { id } = e.payload as { id: string };
  const { error } = await supabase.from("supplier_purchases" as any).delete().eq("id" as never, id as never);
  if (error) throw error;
});

registerOp("prediction.upsert", async (e) => {
  const p = e.payload as Record<string, unknown>;
  const { error } = await supabase.from("parcel_predictions" as any).upsert(p as never);
  if (error) throw error;
});

registerOp("section_config.upsert", async (e) => {
  const p = e.payload as Record<string, unknown>;
  const { error } = await supabase.from("parcel_sections_config" as any).upsert(p as never);
  if (error) throw error;
});



