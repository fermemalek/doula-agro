import { useMemo, useState } from "react";
import { Bug, Check, Droplet, Wrench, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAlerts, useAlertActions, type AlertKind } from "@/lib/cloud/alerts";

const ICONS: Record<AlertKind, React.ReactNode> = {
  fuite: <Droplet className="h-4 w-4 text-orange-500" />,
  tuyau: <Wrench className="h-4 w-4 text-orange-500" />,
  maladie: <Bug className="h-4 w-4 text-destructive" />,
  casse: <Wrench className="h-4 w-4 text-orange-500" />,
  autre: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
};

const LABELS: Record<AlertKind, string> = {
  fuite: "Fuite",
  tuyau: "Tuyau / Conduite",
  maladie: "Maladie",
  casse: "Casse",
  autre: "Autre",
};

const ASSIGNEE: Record<AlertKind, string> = {
  fuite: "exécutants",
  tuyau: "exécutants",
  maladie: "ingénieur",
  casse: "exécutants",
  autre: "équipe",
};

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

export function AnomaliesModule({
  parcelId,
  canEdit,
}: {
  parcelId: string;
  canEdit: boolean;
}) {
  const { data: all = [] } = useAlerts();
  const { resolve } = useAlertActions();
  const list = useMemo(() => all.filter((a) => a.parcel_id === parcelId), [all, parcelId]);

  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [type, setType] = useState<AlertKind | "">("");

  const years = useMemo(() => {
    const s = new Set<string>();
    list.forEach((a) => s.add(new Date(a.created_at).getFullYear().toString()));
    return [...s].sort().reverse();
  }, [list]);

  const filtered = list.filter((a) => {
    const d = new Date(a.created_at);
    if (year && d.getFullYear().toString() !== year) return false;
    if (month && (d.getMonth() + 1).toString().padStart(2, "0") !== month) return false;
    const k = (a.type ?? a.kind) as AlertKind;
    if (type && k !== type) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 rounded-xl border bg-card p-3">
        <label className="text-xs text-muted-foreground">
          Année
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">Toutes</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Mois
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">Tous</option>
            {MONTHS_FR.map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AlertKind | "")}
            className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">Tous</option>
            <option value="fuite">Fuite</option>
            <option value="tuyau">Tuyau</option>
            <option value="maladie">Maladie</option>
            <option value="casse">Casse</option>
            <option value="autre">Autre</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune anomalie.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const k = (a.type ?? a.kind) as AlertKind;
            const isResolved = a.status === "resolu" || a.status === "validee";
            const loc = a.l != null && a.p != null ? `L${a.l} • P${a.p}` : "";
            return (
              <div
                key={a.id}
                className={`flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 ${
                  isResolved ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {ICONS[k] ?? ICONS.autre}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {LABELS[k] ?? "Anomalie"}{loc && ` · ${loc}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("fr-FR")}
                      {isResolved
                        ? " · résolu (archivé)"
                        : ` · à traiter par ${ASSIGNEE[k] ?? "équipe"}`}
                      {a.comment ? ` · ${a.comment}` : ""}
                    </p>
                  </div>
                </div>
                {canEdit && !isResolved && (
                  <button
                    onClick={() =>
                      resolve.mutate(a.id, {
                        onSuccess: () => toast.success("Anomalie résolue"),
                        onError: (e) => toast.error(e.message),
                      })
                    }
                    disabled={resolve.isPending}
                    className="inline-flex items-center gap-1 rounded-md border border-olive-mid bg-olive-mid/10 px-2 py-1 text-xs font-medium text-olive-dark hover:bg-olive-mid/20 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Résoudre
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
