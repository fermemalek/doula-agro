import { useNavigate } from "@/lib/router-compat";
import { useMemo, useState } from "react";
import { ArrowLeft, Bug, AlertTriangle, Droplet, Wrench, Check } from "lucide-react";
import { toast } from "sonner";
import { useAlerts, useAlertActions, useAdminIds, useProfilesMap, type CloudAlert } from "@/lib/cloud/alerts";
import { useParcels } from "@/lib/parcel-store";
import { useRole } from "@/lib/role";
import { useConfig } from "@/lib/config-store";
import { AlertDetailDialog } from "@/components/AlertDetailDialog";

const ICONS = { fuite: Droplet, tuyau: Wrench, maladie: Bug, casse: Wrench, autre: AlertTriangle } as const;
const LABELS = { fuite: "Fuite", tuyau: "Tuyau", maladie: "Maladie", casse: "Casse", autre: "Autre" } as const;

function AdminAnomaliesPage() {
  const navigate = useNavigate();
  const { data: alerts = [] } = useAlerts();
  const { data: adminIds } = useAdminIds();
  const { data: profiles = {} } = useProfilesMap();
  const { resolve } = useAlertActions();
  const parcels = useParcels();
  const { userId } = useRole();
  const cfg = useConfig();
  const [detail, setDetail] = useState<CloudAlert | null>(null);
  const uiExecutant = cfg.configured && cfg.role === "executant";
  const parcelName = (id: string | null) => parcels.find((p) => p.id === id)?.name ?? id ?? "";

  const groups = useMemo(() => {
    const open = alerts.filter((a) => {
      if (a.status === "resolu" || a.status === "validee") return false;
      if (!a.created_by) return false;
      // Show alerts explicitly tagged as coming from the executant UI…
      if (a.source_role === "executant") return true;
      // …or, for legacy alerts without that tag, infer from the creator's role.
      if (a.source_role == null) {
        const isAdminCreator = adminIds?.has(a.created_by) ?? false;
        if (!isAdminCreator) return true;
        // Allow admin's own alerts only when the admin is currently testing in executant UI.
        return uiExecutant && a.created_by === userId;
      }
      return false;
    });
    const by: Record<string, typeof open> = {};
    for (const a of open) {
      const k = a.created_by ?? "inconnu";
      (by[k] ??= []).push(a);
    }
    return Object.entries(by)
      .map(([uid, list]) => ({
        uid,
        name: profiles[uid] || "Exécutant",
        list: list.sort((x, y) => y.created_at.localeCompare(x.created_at)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [alerts, adminIds, profiles, uiExecutant, userId]);

  const total = groups.reduce((n, g) => n + g.list.length, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <button
        onClick={() => navigate({ to: "/" })}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <h1 className="text-xl font-bold">Anomalies déclarées</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {total} anomalie{total > 1 ? "s" : ""} ouverte{total > 1 ? "s" : ""} · triées par exécutant
      </p>

      {total === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucune anomalie déclarée par les exécutants.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.uid}>
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                  {g.list.length}
                </span>
                Reporté par <span className="text-foreground">{g.name}</span>
              </h2>
              <ul className="space-y-2">
                {g.list.map((a) => {
                  const key = (a.type ?? a.kind) as keyof typeof ICONS;
                  const Icon = ICONS[key] ?? AlertTriangle;
                  return (
                    <li
                      key={a.id}
                      onClick={() => setDetail(a)}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 shadow-sm transition hover:bg-destructive/10"
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold leading-tight">{LABELS[key] ?? "Anomalie"}</p>
                        <p className="text-xs text-muted-foreground">
                          {parcelName(a.parcel_id)}
                          {a.comment && ` · ${a.comment}`}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {new Date(a.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolve.mutate(a.id, {
                            onSuccess: () => toast.success("Anomalie résolue"),
                            onError: (e) => toast.error(e.message),
                          });
                        }}
                        disabled={resolve.isPending}
                        className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-bold uppercase text-primary-foreground active:scale-95 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" /> Résolu
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AlertDetailDialog alert={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </main>
  );
}

export default AdminAnomaliesPage;
