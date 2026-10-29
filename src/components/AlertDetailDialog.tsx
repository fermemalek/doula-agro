import { useEffect, useState } from "react";
import { AlertTriangle, Bug, Droplet, Wrench, Check, MapPin, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useAlertActions,
  useProfilesMap,
  signedPhotoUrl,
  type CloudAlert,
} from "@/lib/cloud/alerts";
import { useParcels } from "@/lib/parcel-store";

const ICONS = { fuite: Droplet, tuyau: Wrench, maladie: Bug, casse: Wrench, autre: AlertTriangle } as const;
const LABELS = { fuite: "Fuite", tuyau: "Tuyau", maladie: "Maladie", casse: "Casse", autre: "Autre" } as const;
const STATUS_LABELS: Record<string, string> = {
  ouvert: "Ouvert",
  vue: "Vue",
  assignee: "Assignée",
  en_cours: "En cours",
  resolu: "Résolu",
  validee: "Validée",
};

function SignedPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }
    signedPhotoUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path]);
  if (!url) {
    return <div className="aspect-square w-full animate-pulse rounded-xl bg-muted" />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border">
      <img src={url} alt="Photo anomalie" className="aspect-square w-full object-cover" />
    </a>
  );
}

export function AlertDetailDialog({
  alert,
  onOpenChange,
}: {
  alert: CloudAlert | null;
  onOpenChange: (open: boolean) => void;
}) {
  const parcels = useParcels();
  const { data: profiles = {} } = useProfilesMap();
  const { resolve } = useAlertActions();

  if (!alert) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const key = (alert.type ?? alert.kind) as keyof typeof ICONS;
  const Icon = ICONS[key] ?? AlertTriangle;
  const parcelName = parcels.find((p) => p.id === alert.parcel_id)?.name ?? alert.parcel_id;
  const reporter = alert.created_by ? profiles[alert.created_by] || "Exécutant" : "Inconnu";
  const resolver = alert.resolved_by ? profiles[alert.resolved_by] || "—" : null;
  const isOpen = alert.status !== "resolu" && alert.status !== "validee";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Icon className="h-5 w-5" />
            </span>
            <span>{LABELS[key] ?? "Anomalie"}</span>
            <span className="ml-auto rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
              {STATUS_LABELS[alert.status] ?? alert.status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">{parcelName}</p>
              {(alert.p != null || alert.l != null) && (
                <p className="text-xs text-muted-foreground">
                  Position : rang {alert.l ?? "—"} · arbre {alert.p ?? "—"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p>
              Déclaré par <span className="font-medium">{reporter}</span>
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {new Date(alert.created_at).toLocaleString("fr-FR")}
            </p>
          </div>

          {alert.comment && (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                Commentaire
              </p>
              <p className="whitespace-pre-wrap text-sm">{alert.comment}</p>
            </div>
          )}

          {alert.photo_urls?.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
                Photos ({alert.photo_urls.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {alert.photo_urls.map((p) => (
                  <SignedPhoto key={p} path={p} />
                ))}
              </div>
            </div>
          )}

          {resolver && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
              Résolu par <span className="font-medium">{resolver}</span>
              {alert.resolved_at && (
                <> · {new Date(alert.resolved_at).toLocaleString("fr-FR")}</>
              )}
            </div>
          )}

          {isOpen && (
            <button
              onClick={() =>
                resolve.mutate(alert.id, {
                  onSuccess: () => {
                    toast.success("Anomalie résolue");
                    onOpenChange(false);
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
              disabled={resolve.isPending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold uppercase text-primary-foreground active:scale-95 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Marquer résolu
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
