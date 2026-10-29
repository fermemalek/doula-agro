import { useNavigate } from "@/lib/router-compat";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Sprout, FlaskConical } from "lucide-react";
import { useRecommendations, useRecommendationActions, type Recommendation } from "@/lib/cloud/recommendations";
import { useRole } from "@/lib/role";
import { useDisplayRole } from "@/lib/display-role";
import { useProfilesMap } from "@/lib/cloud/alerts";
import { RecommendationForm } from "@/components/ingenieur/RecommendationForm";
import { RecommendationDetailDialog } from "@/components/RecommendationDetailDialog";
import seededRecos from "@/data/seeded_recommendations.json";
import { toast } from "sonner";
import { useAllModuleRecords } from "@/lib/modules-store";

const STATUS_TONE: Record<Recommendation["status"], string> = {
  envoyee: "border-blue-500/30 bg-blue-500/5 text-blue-700",
  acceptee: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
  rejetee: "border-destructive/30 bg-destructive/5 text-destructive",
  transferee: "border-violet-500/30 bg-violet-500/5 text-violet-700",
};
const STATUS_LABEL: Record<Recommendation["status"], string> = {
  envoyee: "Envoyée",
  acceptee: "Acceptée",
  rejetee: "Rejetée",
  transferee: "Transférée",
};

function RecommandationsPage() {
  const navigate = useNavigate();
  const { userId } = useRole();
  const displayRole = useDisplayRole();
  const { data: recos = [] } = useRecommendations();
  const { data: profiles = {} } = useProfilesMap();
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Recommendation | null>(null);
  const [editingReco, setEditingReco] = useState<Recommendation | null>(null);
  const { create, remove } = useRecommendationActions();
  const [seeding, setSeeding] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const localIrr = useAllModuleRecords("irrigation");
  const localFert = useAllModuleRecords("fertilisation");
  const localPulv = useAllModuleRecords("pulverisation");
  const localPhy = useAllModuleRecords("phytosanitaire");

  const allPrograms = useMemo(() => {
    return [...localIrr, ...localFert, ...localPulv, ...localPhy];
  }, [localIrr, localFert, localPulv, localPhy]);

  const getRecoStatusInfo = (r: Recommendation) => {
    if (r.status === "rejetee") {
      if (displayRole === "admin") {
        return { label: "Approvisionnement", tone: "border-amber-500/30 bg-amber-500/5 text-amber-700" };
      }
      return { label: "En attente", tone: "border-blue-500/30 bg-blue-500/5 text-blue-700" };
    }
    const matchingProgs = allPrograms.filter(p => p.reco_id === r.id || p.payload?.reco_id === r.id);
    if (matchingProgs.length > 0) {
      const allExecuted = matchingProgs.every(p => p.status === "execute" || p.executedAt !== undefined || p.executed_at !== null);
      if (allExecuted) {
        return { label: "Accepté", tone: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700" };
      }
    }
    return { label: "En attente", tone: "border-blue-500/30 bg-blue-500/5 text-blue-700" };
  };

  async function handleDeleteAll() {
    if (!window.confirm("Voulez-vous vraiment supprimer TOUTES les recommandations ? Cette action est irréversible.")) return;
    setDeletingAll(true);
    try {
      toast.info("Suppression en cours...");
      for (const r of list) {
        await remove.mutateAsync(r.id);
      }
      toast.success("Toutes les recommandations ont été supprimées !");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression");
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    try {
      toast.info(`Importation des ${seededRecos.length} programmes en cours...`);
      for (const reco of seededRecos) {
        const progDate = reco.payload?.program?.date;
        const timePart = new Date().toTimeString().split(" ")[0];
        const createdAtIso = progDate 
          ? new Date(`${progDate}T${timePart}`).toISOString() 
          : new Date().toISOString();

        await create.mutateAsync({
          kind: reco.kind as any,
          title: reco.title,
          comment: reco.comment,
          parcel_ids: reco.parcel_ids,
          payload: reco.payload as any,
          photo_urls: reco.photo_urls,
          created_at: createdAtIso,
        });
      }
      toast.success(`Les ${seededRecos.length} programmes ont été importés avec succès !`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'importation");
    } finally {
      setSeeding(false);
    }
  }

  // Ingénieur ne voit que ses propres recos ; admin voit tout
  const list = useMemo(() => {
    if (displayRole === "ingenieur") {
      return recos.filter((r) => r.created_by === userId);
    }
    return recos;
  }, [recos, displayRole, userId]);

  const pendingCount = list.filter((r) => r.status === "envoyee" || r.status === "rejetee").length;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <button
        onClick={() => navigate({ to: "/" })}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Recommandations ingénieur</h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount} en attente · {list.length} au total
          </p>
        </div>
        <div className="flex gap-2">
          {(displayRole === "ingenieur" || displayRole === "admin") && (
            <>
              {list.length === 0 && (
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-primary/10 hover:bg-primary/20 px-3 text-sm font-bold text-primary active:scale-95 transition-all"
                >
                  {seeding ? "Importation..." : "Importer Excel"}
                </button>
              )}
              {list.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-destructive/10 hover:bg-destructive/20 px-3 text-sm font-bold text-destructive active:scale-95 transition-all"
                >
                  {deletingAll ? "Suppression..." : "Supprimer tout"}
                </button>
              )}
            </>
          )}
          {displayRole === "ingenieur" && (
            <button
              onClick={() => {
                setEditingReco(null);
                setFormOpen(true);
              }}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground active:scale-95"
            >
              <Plus className="h-4 w-4" /> Nouvelle
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {displayRole === "ingenieur"
            ? "Aucune recommandation envoyée. Cliquez sur « Nouvelle » pour commencer."
            : "Aucune recommandation reçue."}
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => {
            const Icon = r.kind === "fertilisation" ? Sprout : FlaskConical;
            const author = profiles[r.created_by] || "Ingénieur";
            const statusInfo = getRecoStatusInfo(r);
            return (
              <li
                key={r.id}
                onClick={() => {
                  if (displayRole === "ingenieur") {
                    setEditingReco(r);
                    setFormOpen(true);
                  } else {
                    setDetail(r);
                  }
                }}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 shadow-sm transition hover:opacity-90 ${statusInfo.tone}`}
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight">{r.title}</p>
                  <p className="truncate text-xs opacity-80">
                    {r.kind === "fertilisation" ? "Fertilisation" : "Phytosanitaire"}
                    {" · "}
                    {r.parcel_ids.length} parcelle{r.parcel_ids.length > 1 ? "s" : ""}
                    {displayRole !== "ingenieur" && ` · par ${author}`}
                  </p>
                  <p className="mt-0.5 text-[10px] opacity-70">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border bg-background/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase font-bold">
                  {statusInfo.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <RecommendationForm open={formOpen} onOpenChange={setFormOpen} recoToEdit={editingReco} />
      <RecommendationDetailDialog reco={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </main>
  );
}

export default RecommandationsPage;
