import { useMemo, useState } from "react";
import { Droplets, Sprout, AlertTriangle, Wrench } from "lucide-react";
import { useTasks } from "@/lib/ops-store";
import { useAnomalies, ANOMALY_LABELS } from "@/lib/anomalies-store";
import { useParcels } from "@/lib/parcel-store";

type Filter = "all" | "tasks" | "anomalies";

function fmt(ts: number) {
  return new Date(ts).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function HistoriquePage() {
  const tasks = useTasks();
  const anomalies = useAnomalies();
  const parcels = useParcels();
  const [filter, setFilter] = useState<Filter>("all");

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const items = useMemo(() => {
    const list: Array<{ ts: number; key: string; node: React.ReactNode }> = [];
    if (filter !== "anomalies") {
      tasks.filter((t) => t.done && (t.doneAt ?? t.createdAt) >= cutoff).forEach((t) => {
        const p = parcels.find((x) => x.id === t.parcelId);
        list.push({
          ts: t.doneAt ?? t.createdAt,
          key: "t-" + t.id,
          node: (
            <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <Wrench className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {p?.name ?? "—"} · {fmt(t.doneAt ?? t.createdAt)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Fait
              </span>
            </div>
          ),
        });
      });
    }
    if (filter !== "tasks") {
      anomalies.filter((a) => a.createdAt >= cutoff).forEach((a) => {
        const p = parcels.find((x) => x.id === a.parcelId);
        list.push({
          ts: a.createdAt,
          key: "a-" + a.id,
          node: (
            <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  Anomalie · {ANOMALY_LABELS[a.type]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p?.name ?? "—"} · {fmt(a.createdAt)}
                </p>
              </div>
              {a.resolved ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Résolu
                </span>
              ) : (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  Ouvert
                </span>
              )}
            </div>
          ),
        });
      });
    }
    return list.sort((a, b) => b.ts - a.ts);
  }, [tasks, anomalies, parcels, filter, cutoff]);

  const Chip = ({ id, label, icon: Icon }: { id: Filter; label: string; icon: typeof Droplets }) => (
    <button
      onClick={() => setFilter(id)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
        filter === id ? "border-primary bg-primary text-primary-foreground" : "bg-card"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <h1 className="mb-1 text-xl font-bold">Historique (7 jours)</h1>
      <div className="my-3 flex flex-wrap gap-2">
        <Chip id="all" label="Tout" icon={Sprout} />
        <Chip id="tasks" label="Tâches" icon={Wrench} />
        <Chip id="anomalies" label="Anomalies" icon={AlertTriangle} />
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Rien à afficher pour les 7 derniers jours.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.key}>{it.node}</li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default HistoriquePage;
