import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { enqueueOp } from "@/lib/offline/sync-engine";
import { queuePhotosForUpload } from "@/lib/offline/photos";

export interface ExecutionInput {
  task_id?: string | null;
  module_record_id?: string | null;
  duration_min?: number | null;
  actual_quantity?: number | null;
  actual_unit?: string | null;
  comment?: string | null;
  photo_urls?: string[];
  /** Photos brutes à compresser et uploader en arrière-plan. */
  photo_files?: File[];
  weather_snapshot?: Record<string, unknown> | null;
}

/**
 * Direct upload (legacy). Préférez `photo_files` dans ExecutionInput pour
 * bénéficier du tampon offline + compression automatique.
 */
export async function uploadExecutionPhotos(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const { data: { session: __s } } = await supabase.auth.getSession(); const u = { user: __s?.user ?? null };
  if (!u.user) throw new Error("Non authentifié");
  const uid = u.user.id;
  const urls: string[] = [];
  onProgress?.(0, files.length);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${uid}/executions/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("parcel-photos")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    urls.push(path);
    onProgress?.(i + 1, files.length);
  }
  return urls;
}

export function useCreateExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExecutionInput) => {
      const { data: { session: __s } } = await supabase.auth.getSession(); const u = { user: __s?.user ?? null };
      if (!u.user) throw new Error("Non authentifié");

      const client_id = crypto.randomUUID();
      const photo_urls = [...(input.photo_urls ?? [])];

      // Photos -> tampon (compression + upload différé). Path injecté dans payload à la sortie.
      if (input.photo_files && input.photo_files.length > 0) {
        const planned = await queuePhotosForUpload({
          files: input.photo_files,
          userId: u.user.id,
          folder: "executions",
          linked_outbox_id: client_id,
          linked_field: "photo_urls",
        });
        photo_urls.push(...planned);
      }

      await enqueueOp({
        client_id,
        op: "execution.create",
        table: "task_executions",
        payload: {
          task_id: input.task_id ?? null,
          module_record_id: input.module_record_id ?? null,
          executed_by: u.user.id,
          executed_at: new Date().toISOString(),
          duration_min: input.duration_min ?? null,
          actual_quantity: input.actual_quantity ?? null,
          actual_unit: input.actual_unit ?? null,
          comment: input.comment ?? null,
          photo_urls,
          weather_snapshot: input.weather_snapshot ?? null,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["programs"] });
      qc.invalidateQueries({ queryKey: ["executions"] });
    },
  });
}
