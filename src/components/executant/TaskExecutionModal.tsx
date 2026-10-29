import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { captureWeatherSnapshot } from "@/lib/weather-snapshot";
import { uploadExecutionPhotos, useCreateExecution } from "@/lib/cloud/executions";
import { useModuleActions, useAllModuleRecords } from "@/lib/modules-store";

export type ExecutionTarget =
  | { type: "task"; id: string; title: string; kind: string; parcelName?: string }
  | { type: "program"; id: string; title: string; kind: string; parcelName?: string };

const UNITS = ["L", "m³", "kg", "g", "unité", "h", "ha"] as const;

function defaultUnit(kind: string): string {
  if (kind === "irrigation") return "L";
  if (kind === "fertilisation") return "kg";
  if (kind === "pulverisation" || kind === "phytosanitaire") return "L";
  if (kind === "recolte") return "kg";
  return "unité";
}

interface Props {
  target: ExecutionTarget | null;
  onOpenChange: (open: boolean) => void;
}

export function TaskExecutionModal({ target, onOpenChange }: Props) {
  const [duration, setDuration] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>("unité");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const create = useCreateExecution();
  const { update: updateLocalModuleRecord } = useModuleActions();
  const localIrr = useAllModuleRecords("irrigation");
  const localFert = useAllModuleRecords("fertilisation");
  const localPulv = useAllModuleRecords("pulverisation");
  const localPhy = useAllModuleRecords("phytosanitaire");

  const findLocalProgram = (id: string) => {
    let p = localIrr.find((x) => x.id === id);
    if (p) return { record: p, mod: "irrigation" as const };
    p = localFert.find((x) => x.id === id);
    if (p) return { record: p, mod: "fertilisation" as const };
    p = localPulv.find((x) => x.id === id);
    if (p) return { record: p, mod: "pulverisation" as const };
    p = localPhy.find((x) => x.id === id);
    if (p) return { record: p, mod: "phytosanitaire" as const };
    return null;
  };

  useEffect(() => {
    if (target) {
      setUnit(defaultUnit(target.kind));
      setDuration("");
      setQuantity("");
      setComment("");
      setFiles([]);
      setProgress({ done: 0, total: 0 });
    }
  }, [target]);

  const open = target !== null;

  const submit = async () => {
    if (!target) return;
    try {
      setUploading(true);
      // 1) Upload photos (avec progression)
      let photo_urls: string[] = [];
      if (files.length > 0) {
        photo_urls = await uploadExecutionPhotos(files, (done, total) =>
          setProgress({ done, total }),
        );
      }
      // 2) Capture météo en arrière-plan
      const weather = await captureWeatherSnapshot();

      // 3) Insertion + mise à jour statut
      await create.mutateAsync({
        task_id: target.type === "task" ? target.id : null,
        module_record_id: target.type === "program" ? target.id : null,
        duration_min: duration ? Math.round(parseFloat(duration)) : null,
        actual_quantity: quantity ? parseFloat(quantity.replace(",", ".")) : null,
        actual_unit: quantity ? unit : null,
        comment: comment.trim() || null,
        photo_urls,
        weather_snapshot: weather as unknown as Record<string, unknown>,
      });

      if (target.type === "program") {
        const localProg = findLocalProgram(target.id);
        if (localProg) {
          updateLocalModuleRecord(
            localProg.record.parcelId || localProg.record.parcel_id,
            localProg.mod,
            target.id,
            { status: "execute" }
          );
        }
      }

      toast.success("Tâche validée et enregistrée", {
        description: target.title,
      });
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la validation";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles((prev) => [...prev, ...list].slice(0, 6));
    e.target.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !uploading && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Valider l'exécution</DialogTitle>
          {target && (
            <p className="text-sm text-muted-foreground">
              {target.title}
              {target.parcelName ? ` · ${target.parcelName}` : ""}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="duration">Durée (min)</Label>
              <Input
                id="duration"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="ex. 45"
                value={duration}
                onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <Label htmlFor="qty">Quantité réelle</Label>
              <Input
                id="qty"
                inputMode="decimal"
                pattern="[0-9.,]*"
                placeholder="ex. 120"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.,]/g, ""))}
              />
            </div>
          </div>

          <div>
            <Label>Unité</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="comment">Commentaire</Label>
            <Textarea
              id="comment"
              rows={2}
              placeholder="Notes terrain (optionnel)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div>
            <Label>Photos ({files.length}/6)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={onPick}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || files.length >= 6}
            >
              <Camera className="mr-2 h-4 w-4" /> Ajouter une photo
            </Button>
            {files.length > 0 && (
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {files.map((f, i) => (
                  <li key={i} className="relative">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="h-20 w-full rounded-md object-cover"
                    />
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        aria-label="Supprimer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {uploading && progress.total > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Envoi des photos…</span>
                <span>
                  {progress.done}/{progress.total} · {pct}%
                </span>
              </div>
              <Progress value={pct} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> En cours…
              </>
            ) : (
              "Valider"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
