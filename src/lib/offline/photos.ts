import imageCompression from "browser-image-compression";
import { enqueuePhoto } from "./sync-engine";

/** Compress an image File for upload (max 1024px, ~quality 0.8, size < 0.3MB). */
export async function compressPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
      initialQuality: 0.8,
    });
    return new File([compressed], file.name, { type: compressed.type || file.type });
  } catch {
    return file;
  }
}

/**
 * Compress + queue a list of photos. Returns the planned remote paths.
 * Photos upload in background; once uploaded, the path is appended to the
 * linked outbox entry's `linked_field` array.
 */
export async function queuePhotosForUpload(params: {
  files: File[];
  userId: string;
  folder: "alerts" | "executions" | "recommendations";
  bucket?: string;
  linked_outbox_id?: string;
  linked_field?: string;
}): Promise<string[]> {
  const bucket = params.bucket ?? "parcel-photos";
  const paths: string[] = [];
  
  for (const raw of params.files) {
    const ext = (raw.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${params.userId}/${params.folder}/${crypto.randomUUID()}.${ext}`;
    paths.push(path);
    
    // Process compression and queueing asynchronously in background
    (async () => {
      try {
        const file = await compressPhoto(raw);
        await enqueuePhoto({
          blob: file,
          filename: file.name,
          content_type: file.type || "image/jpeg",
          bucket,
          path,
          linked_outbox_id: params.linked_outbox_id ?? null,
          linked_field: params.linked_field ?? null,
        });
      } catch (err) {
        console.error("Failed to queue photo in background:", err);
      }
    })();
  }
  
  return paths;
}
