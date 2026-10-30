import { useState } from "react";
import { CalendarClock, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePrograms, useProgramActions } from "@/lib/cloud/programs";
import { useParcels } from "@/lib/parcel-store";

/** Programmes planifiés non exécutés — l'administrateur peut les supprimer (droit d'écriture admin). */
export function PendingPrograms() {
  const { data: programs = [] } = usePrograms();
  const { remove } = useProgramActions();
  const parcels = useParcels();
  const [open, setOpen] = useState(false);

  const pending = programs
    .filter((p) => p.status !== "execute" && p.status !== "annule")
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  if (pending.length === 0) return null;

  const parcelName = (id: string) => parcels.find((p) => p.id === id)?.name || id;
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

  const delOne = (id: string) => {
    if (!window.confirm("Supprimer ce programme planifié ?")) return;
    remove.mutate(id, { onSuccess: () => toast.success("Programme supprimé") });
  };
  const delAll = () => {
    if (!window.confirm(`Supprimer définitivement les ${pending.length} programme(s) planifié(s) ?`)) return;
    pending.forEach((p) => remove.mutate(p.id));
    toast.success(`${pending.length} programme(s) supprimé(s)`);
  };

  return (
    <section className="mb-4 rounded-2xl border bg-card shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 p-3.5 text-left">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-foreground">Programmes planifiés ({pending.length})</h2>
            <p className="text-[11px] text-muted-foreground">Visibles par les exécutants — suppression réservée à l'admin</p>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t p-3">
          <div className="flex justify-end">
            <button
              onClick={delAll}
              className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Tout effacer ({pending.length})
            </button>
          </div>
          {pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border bg-background p-2.5 text-xs">
              <div className="min-w-0">
                <p className="font-semibold capitalize text-foreground">{p.kind}</p>
                <p className="truncate text-muted-foreground">
                  {fmt(p.scheduled_at)} · {parcelName(p.parcel_id)}
                </p>
              </div>
              <button
                onClick={() => delOne(p.id)}
                title="Supprimer"
                className="shrink-0 rounded-lg border border-destructive/40 p-2 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

