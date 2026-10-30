import { useEffect } from "react";
import { WeatherBlock } from "@/components/home/WeatherBlock";
import { NextIrrigationBlock } from "@/components/home/NextIrrigationBlock";
import { ParcelWheel } from "@/components/home/ParcelWheel";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { TodayView } from "@/components/executant/TodayView";
import { IngenieurHome } from "@/components/ingenieur/IngenieurHome";
import { useDisplayRole } from "@/lib/display-role";
import { saveConfig } from "@/lib/config-store";
import { useNavigate } from "@/lib/router-compat";
import { Droplet, Sprout, TrendingUp, BellRing, ListTodo, Check, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  useTasks,
  useTaskActions,
  useExecutants,
  useMyAssignedTasks,
} from "@/lib/cloud/tasks";
import { useParcels } from "@/lib/parcel-store";
import { toast } from "sonner";

function playAdminAlertChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.45);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.45);
  } catch {}
}

function HomePage() {
  const role = useDisplayRole();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: allTasks = [] } = useTasks();
  const { data: executants = [] } = useExecutants();
  const { myTasks, matchedMemberName } = useMyAssignedTasks();
  const { markDone } = useTaskActions();
  const parcels = useParcels();

  // Arabe uniquement pour l'Ingénieur, Français automatique pour Admin et Exécutant
  useEffect(() => {
    saveConfig({ lang: role === "ingenieur" ? "ar" : "fr" });
  }, [role]);

  // Tâches assignées à l'admin connecté (ou aux administrateurs si session par défaut)
  const adminIds = new Set(
    executants.filter((e) => e.role === "admin").map((e) => e.id),
  );
  const adminAssignedTasks = allTasks.filter(
    (task) =>
      (task.status === "a_faire" || task.status === "en_cours") &&
      Boolean(task.assigned_to && adminIds.has(task.assigned_to)),
  );
  const tasksToDisplay = myTasks.length > 0 ? myTasks : adminAssignedTasks;

  // Notification sonore + bandeau toast à l'ouverture si l'admin a des tâches à réaliser
  useEffect(() => {
    if (role !== "admin" || tasksToDisplay.length === 0) return;
    const sig = tasksToDisplay.map((x) => x.id).sort().join(",");
    const key = `doula-admin-task-notif:${sig}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;
    if (typeof window !== "undefined") sessionStorage.setItem(key, "1");
    playAdminAlertChime();
    toast.info(
      matchedMemberName
        ? `🔔 ${matchedMemberName}, vous avez ${tasksToDisplay.length} tâche(s) à réaliser !`
        : `🔔 Vous avez ${tasksToDisplay.length} tâche(s) administrateur à réaliser !`,
      {
        description: tasksToDisplay.map((x) => x.title).slice(0, 2).join(" · "),
        duration: 6000,
      },
    );
  }, [role, tasksToDisplay, matchedMemberName]);

  if (role === "executant") return <TodayView />;
  if (role === "ingenieur") return <IngenieurHome />;

  const exName = (id: string | null) =>
    executants.find((e) => e.id === id)?.name ?? "Administrateur";
  const parcelName = (id: string | null) =>
    parcels.find((p) => p.id === id)?.name;

  // Admin homepage dashboard to view parcels and manage programs!
  return (
    <main className="mx-auto max-w-3xl px-4 pt-4">
      <h1 className="sr-only">Doula Agro — Accueil</h1>
      <div className="mb-3 flex items-center justify-between">
        {matchedMemberName ? (
          <p className="text-xs font-semibold text-muted-foreground">
            Connecté : <span className="text-foreground font-bold">{matchedMemberName}</span> (Admin)
          </p>
        ) : (
          <span />
        )}
        <RoleSwitcher />
      </div>

      {/* Bloc de notification des tâches à réaliser pour l'Administrateur */}
      {tasksToDisplay.length > 0 && (
        <section className="mb-4 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-3.5 shadow-sm">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <BellRing className="h-4 w-4 animate-bounce" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-foreground">
                  {matchedMemberName
                    ? `Tâches à réaliser — ${matchedMemberName} (${tasksToDisplay.length})`
                    : `Tâches assignées à l'Administrateur (${tasksToDisplay.length})`}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Vous avez des tâches en attente d'exécution
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate({ to: "/tache" })}
              className="inline-flex items-center gap-1 rounded-xl bg-background px-2.5 py-1.5 text-xs font-bold text-primary shadow-xs hover:bg-muted"
            >
              Ouvrir Tâches <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <ul className="space-y-2">
            {tasksToDisplay.map((task) => {
              const pName = parcelName(task.parcel_id);
              const isOverdue =
                task.due_date && new Date(task.due_date).getTime() < Date.now();
              return (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ListTodo className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-bold text-foreground truncate">
                          {task.title}
                        </p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            task.priority === "urgente" || task.priority === "haute"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {task.priority}
                        </span>
                        {isOverdue && (
                          <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                            ⚠️ En retard
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {task.due_date && (
                          <span>
                            📅 {new Date(task.due_date).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                        {pName && <span>🌳 {pName}</span>}
                        <span>👤 {exName(task.assigned_to)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      markDone.mutate(task.id, {
                        onSuccess: () => toast.success("Tâche marquée comme réalisée !"),
                      })
                    }
                    disabled={markDone.isPending}
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Fait
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WeatherBlock />
        <NextIrrigationBlock />
      </div>

      {/* Quick Agronomic Navigation Shortcuts */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          onClick={() => navigate({ to: "/irrigation" })}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3 hover:shadow-md active:scale-95 transition-all text-left w-full outline-none"
        >
          <div className="rounded-xl bg-sky-500/10 p-2 shrink-0 text-sky-600 dark:text-sky-400">
            <Droplet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block font-bold text-xs text-foreground uppercase tracking-wide">
              {t("home.irrAndFert", "Irrigation & Fertilisation")}
            </span>
            <span className="text-[9px] text-muted-foreground mt-0.5 block truncate">
              {t("home.irrAndFertSub", "Programmes & Suivi")}
            </span>
          </div>
        </button>

        <button
          onClick={() => navigate({ to: "/programmes?tab=database" })}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3 hover:shadow-md active:scale-95 transition-all text-left w-full outline-none"
        >
          <div className="rounded-xl bg-emerald-500/10 p-2 shrink-0 text-emerald-600 dark:text-emerald-400">
            <Sprout className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block font-bold text-xs text-foreground uppercase tracking-wide">
              {t("home.baseAndCosts", "Base & Coûts")}
            </span>
            <span className="text-[9px] text-muted-foreground mt-0.5 block truncate">
              {t("home.baseAndCostsSub", "Produits & Budgets")}
            </span>
          </div>
        </button>

        <button
          onClick={() => navigate({ to: "/programmes?tab=stats" })}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3 hover:shadow-md active:scale-95 transition-all text-left w-full outline-none"
        >
          <div className="rounded-xl bg-purple-500/10 p-2 shrink-0 text-purple-600 dark:text-purple-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block font-bold text-xs text-foreground uppercase tracking-wide">
              Statistiques & Graphes
            </span>
            <span className="text-[9px] text-muted-foreground mt-0.5 block truncate">
              Analyses & Dépenses
            </span>
          </div>
        </button>
      </div>

      <section className="mt-6">
        <ParcelWheel />
      </section>
    </main>
  );
}

export default HomePage;