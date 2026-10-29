import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Droplet, Sprout, FlaskConical, Lightbulb, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useRecommendations, type Recommendation, type RecoKind } from "@/lib/cloud/recommendations";
import { RecommendationDetailDialog } from "@/components/RecommendationDetailDialog";

/** Bandeau "Recommandations ingénieur" affiché en haut des onglets Fertilisation / Phytosanitaire. */
export function IngenieurRecoBanner({ kind }: { kind: RecoKind }) {
  const navigate = useNavigate();
  const { data: recos = [] } = useRecommendations();
  const [detail, setDetail] = useState<Recommendation | null>(null);

  const list = recos.filter(
    (r) => r.kind === kind && (r.status === "envoyee" || r.status === "acceptee"),
  );
  if (list.length === 0) return null;

  const Icon = kind === "fertilisation" ? Sprout : kind === "phytosanitaire" ? FlaskConical : Droplet;

  return (
    <Card className="border-blue-500/30 bg-blue-500/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-blue-700">
          <Lightbulb className="h-4 w-4" />
          Recommandations ingénieur ({list.length})
        </h3>
        <button
          onClick={() => navigate({ to: "/recommandations" })}
          className="text-xs font-medium text-blue-700 hover:underline"
        >
          Tout voir
        </button>
      </div>
      <ul className="space-y-1.5">
        {list.slice(0, 3).map((r) => (
          <li key={r.id}>
            <button
              onClick={() => setDetail(r)}
              className="flex w-full items-center gap-2 rounded-lg border border-blue-500/20 bg-background/60 p-2 text-left transition hover:bg-background"
            >
              <Icon className="h-4 w-4 shrink-0 text-blue-700" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {r.parcel_ids.length} parcelle{r.parcel_ids.length > 1 ? "s" : ""} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <span className="shrink-0 rounded-full border bg-background px-2 py-0.5 text-[9px] font-semibold uppercase">
                {r.status === "envoyee" ? "À traiter" : "Acceptée"}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>

      <RecommendationDetailDialog reco={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </Card>
  );
}
