import { useEffect, useState, useMemo } from "react";
import { Link } from "@/lib/router-compat";
import {
  BellRing,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ListTodo,
  CalendarClock,
  ClipboardList,
  Sprout,
  Droplet,
  FlaskConical,
  SprayCan,
  Bug,
  Wrench,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModuleActions } from "@/lib/modules-store";
import { toast } from "sonner";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { WeatherBlock } from "@/components/home/WeatherBlock";
import {
  useReminders,
  useRemindersActions,
  isDueToday,
  todayKey,
  type Reminder,
} from "@/lib/reminders-store";
import { useTasks, useTaskActions, unpackTaskDescription, type CloudTask, type TaskPriority } from "@/lib/cloud/tasks";
import { usePrograms, useProgramActions, type ProgramKind } from "@/lib/cloud/programs";
import { useAlerts, useAlertActions, type CloudAlert } from "@/lib/cloud/alerts";
import { useParcels } from "@/lib/parcel-store";
import { useRole } from "@/lib/role";
import { TaskExecutionModal, type ExecutionTarget } from "./TaskExecutionModal";
import { AlertDetailDialog } from "@/components/AlertDetailDialog";
import { FertilisationExecutionAssistant } from "./FertilisationExecutionAssistant";
import { useAllModuleRecords } from "@/lib/modules-store";

const PROGRAM_META: Record<
  ProgramKind,
  { label: string; icon: typeof Droplet; tone: string }
> = {
  irrigation: { label: "Irrigation", icon: Droplet, tone: "text-sky-600 bg-sky-500/10 border-sky-500/30" },
  fertilisation: { label: "Fertilisation", icon: FlaskConical, tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  pulverisation: { label: "Pulvérisation", icon: SprayCan, tone: "text-violet-600 bg-violet-500/10 border-violet-500/30" },
  phytosanitaire: { label: "Phytosanitaire", icon: SprayCan, tone: "text-violet-600 bg-violet-500/10 border-violet-500/30" },
  recolte: { label: "Récolte", icon: Sprout, tone: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
  analyse_sol: { label: "Analyse sol", icon: FlaskConical, tone: "text-stone-600 bg-stone-500/10 border-stone-500/30" },
  analyse_eau: { label: "Analyse eau", icon: Droplet, tone: "text-cyan-600 bg-cyan-500/10 border-cyan-500/30" },
};

const ALERT_ICONS = { fuite: Droplet, tuyau: Wrench, maladie: Bug, autre: AlertTriangle, casse: Wrench } as const;
const ALERT_LABELS = { fuite: "Fuite", tuyau: "Tuyau", maladie: "Maladie", autre: "Autre", casse: "Casse" } as const;

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgente: "bg-destructive/20 text-destructive border-destructive/40",
  haute: "bg-destructive/15 text-destructive border-destructive/30",
  normale: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  basse: "bg-muted text-muted-foreground border-input",
};

function dayLabel() {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
function dateOnly(iso: string | null): string {
  return (iso ?? "").slice(0, 10);
}
function daysLate(iso: string | null): number {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function TaskCard({
  t,
  parcelName,
  onComplete,
  tone = "default",
  loading,
  onOpen,
}: {
  t: CloudTask;
  parcelName?: string;
  onComplete: (id: string) => void;
  tone?: "default" | "danger" | "today";
  loading?: boolean;
  onOpen?: (t: CloudTask) => void;
}) {
  const unpacked = unpackTaskDescription(t.description);
  const ring =
    tone === "danger"
      ? "border-destructive/40 bg-destructive/5"
      : tone === "today"
        ? "border-primary/40 bg-primary/5"
        : "bg-card";
  return (
    <li
      onClick={() => onOpen?.(t)}
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 shadow-sm transition hover:border-primary/50 ${ring}`}
    >
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ListTodo className="h-5 w-5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold leading-tight">{t.title}</p>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLES[t.priority]}`}
          >
            {t.priority}
          </span>
        </div>
        {unpacked.cleanDescription && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{unpacked.cleanDescription}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {t.due_date && <span>{fmtDate(t.due_date)}</span>}
          {parcelName && <span>· {parcelName}</span>}
          {unpacked.externalWorkers.length > 0 && (
            <span className="font-semibold text-primary">
              · 👷 {unpacked.externalWorkers.join(", ")}
            </span>
          )}
        </div>
        {tone === "danger" && t.due_date && (
          <p className="mt-1 text-[11px] font-semibold text-destructive">
            En retard de {daysLate(t.due_date)} j
          </p>
        )}
        {t.reject_reason && (
          <p className="mt-1 text-[11px] text-destructive">Renvoyé : {t.reject_reason}</p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete(t.id);
        }}
        disabled={loading}
        className="h-10 shrink-0 rounded-xl bg-primary px-3 text-xs font-bold uppercase text-primary-foreground active:scale-95 disabled:opacity-50"
      >
        Fait
      </button>
    </li>
  );
}

type BadgeVariant = "danger" | "success" | "primary" | "muted";

function BigBadge3D({
  variant,
  icon: Icon,
  count,
  label,
  open,
  onToggle,
}: {
  variant: BadgeVariant;
  icon: typeof Bug;
  count: number;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  const styles: Record<BadgeVariant, string> = {
    danger:
      "bg-gradient-to-b from-destructive to-[color-mix(in_oklab,var(--destructive)_75%,black)] text-destructive-foreground shadow-[0_6px_0_0_color-mix(in_oklab,var(--destructive)_45%,transparent),0_10px_20px_-5px_color-mix(in_oklab,var(--destructive)_35%,transparent)] active:shadow-[0_2px_0_0_color-mix(in_oklab,var(--destructive)_45%,transparent)]",
    success:
      "bg-gradient-to-b from-[oklch(0.72_0.17_142)] to-[oklch(0.50_0.15_142)] text-white shadow-[0_6px_0_0_oklch(0.45_0.13_142_/_0.5),0_10px_20px_-5px_oklch(0.45_0.13_142_/_0.35)] active:shadow-[0_2px_0_0_oklch(0.45_0.13_142_/_0.5)]",
    primary:
      "bg-gradient-to-b from-primary to-[color-mix(in_oklab,var(--primary)_75%,black)] text-primary-foreground shadow-[0_6px_0_0_color-mix(in_oklab,var(--primary)_45%,transparent),0_10px_20px_-5px_color-mix(in_oklab,var(--primary)_35%,transparent)] active:shadow-[0_2px_0_0_color-mix(in_oklab,var(--primary)_45%,transparent)]",
    muted:
      "bg-gradient-to-b from-muted to-muted/70 text-muted-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--muted-foreground)_25%,transparent)] active:shadow-[0_1px_0_0_color-mix(in_oklab,var(--muted-foreground)_25%,transparent)]",
  };
  return (
    <button
      onClick={onToggle}
      className={`group relative flex items-center gap-3 rounded-2xl p-4 ring-1 ring-inset ring-white/20 transition-all duration-150 active:translate-y-[3px] ${styles[variant]}`}
    >
      <Icon className="h-7 w-7 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
      <div className="flex-1 text-left">
        <div
          className="text-3xl font-extrabold leading-none"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
        >
          {count}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider opacity-90">
          {label}
        </div>
      </div>
      <ChevronDown
        className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

export function TodayView() {
  const reminders = useReminders();
  const { markChecked, unmarkChecked } = useRemindersActions();
  const { data: tasks = [] } = useTasks();
  const { data: cloudPrograms = [] } = usePrograms();
  const localIrr = useAllModuleRecords("irrigation");
  const localFert = useAllModuleRecords("fertilisation");
  const localPulv = useAllModuleRecords("pulverisation");
  const localPhy = useAllModuleRecords("phytosanitaire");

  const programs = useMemo(() => {
    const list = [...cloudPrograms];

    const mergeLocal = (localArr: any[], kind: string) => {
      for (const item of localArr) {
        if (!list.some((p) => p.id === item.id)) {
          const date = item.date || new Date(item.createdAt || Date.now()).toISOString().slice(0, 10);
          const startHour = item.dateStartHour || item.startHour || "08:00";
          const scheduled_at = `${date}T${startHour}:00`;

          list.push({
            id: item.id,
            farm_id: "",
            parcel_id: item.parcelId || item.parcel_id || "",
            kind: kind as any,
            payload: item,
            total_cost: item.total || 0,
            scheduled_at,
            executed_at: item.executedAt || null,
            executed_by: item.executedBy || null,
            assigned_to: null,
            status: item.status || "planifie",
            created_by: null,
            created_at: new Date(item.createdAt || Date.now()).toISOString(),
          });
        }
      }
    };

    mergeLocal(localIrr, "irrigation");
    mergeLocal(localFert, "fertilisation");
    mergeLocal(localPulv, "pulverisation");
    mergeLocal(localPhy, "phytosanitaire");

    return list;
  }, [cloudPrograms, localIrr, localFert, localPulv, localPhy]);

  const { data: alerts = [] } = useAlerts();
  const { markDone } = useTaskActions();
  
  const { resolve, create: createCloudAlert } = useAlertActions();
  const parcels = useParcels();
  const { session, userId } = useRole();
  const today = todayKey();

  const activeReminders = reminders.filter(isDueToday);

  // Feuille de route : tâches assignées à l'utilisateur connecté
  const myTasks = tasks.filter(
    (t) => t.assigned_to === userId && t.status !== "fait" && t.status !== "annule",
  );
  const sortByPriorityThenDate = (a: CloudTask, b: CloudTask) => {
    const order: Record<TaskPriority, number> = { urgente: 0, haute: 1, normale: 2, basse: 3 };
    const p = order[a.priority] - order[b.priority];
    if (p !== 0) return p;
    return (a.due_date ?? "").localeCompare(b.due_date ?? "");
  };
  const overdue = myTasks
    .filter((t) => t.due_date && dateOnly(t.due_date) < today)
    .sort(sortByPriorityThenDate);
  const todayTasks = myTasks
    .filter((t) => t.due_date && dateOnly(t.due_date) === today)
    .sort(sortByPriorityThenDate);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const horizon = in7.toISOString().slice(0, 10);
  const upcoming = myTasks
    .filter(
      (t) => t.due_date && dateOnly(t.due_date) > today && dateOnly(t.due_date) <= horizon,
    )
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const noDate = myTasks.filter((t) => !t.due_date);

  const firstName = (session?.user?.user_metadata?.full_name || session?.user?.email || "")
    .toString()
    .split(/[ @]/)[0];

  const parcelName = (id: string | null) => parcels.find((p) => p.id === id)?.name;

  // Programmes assignés à moi (planifiés ou en cours), ou tous les programmes en attente si pas d'assignation
  const myPrograms = programs.filter(
    (p) =>
      p.status !== "execute" &&
      p.status !== "annule" &&
      (p.assigned_to === userId || p.assigned_to === null),
  );
  const upcomingPrograms = myPrograms
    .filter((p) => p.scheduled_at && dateOnly(p.scheduled_at) >= today && dateOnly(p.scheduled_at) <= horizon)
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  const overduePrograms = myPrograms
    .filter((p) => p.scheduled_at && dateOnly(p.scheduled_at) < today)
    .sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""));

  // Anomalies à traiter : non résolues, assignées à moi OU sans assignation (pool commun)
  const openAlerts = alerts.filter(
    (a) =>
      a.status !== "resolu" &&
      a.status !== "validee" &&
      (a.assigned_to === userId || a.assigned_to === null),
  );

  const [execTarget, setExecTarget] = useState<ExecutionTarget | null>(null);
  const [activeFertProg, setActiveFertProg] = useState<any | null>(null);
  const [openPanel, setOpenPanel] = useState<null | "alerts" | "programs">(null);
  const [alertDetail, setAlertDetail] = useState<CloudAlert | null>(null);
  const [taskDetail, setTaskDetail] = useState<CloudTask | null>(null);
  const { remove: removeCloudProgram } = useProgramActions();
  const { remove: removeLocalRecord } = useModuleActions();

  const deleteProgram = (p: any) => {
    removeLocalRecord(p.parcel_id || p.payload?.parcelId || "", p.kind, p.id);
    removeCloudProgram.mutate(p.id);
  };
  const deleteAllPrograms = () => {
    const all = [...overduePrograms, ...upcomingPrograms];
    if (all.length === 0) return;
    if (!window.confirm(`Supprimer définitivement les ${all.length} programme(s) planifié(s) ?`)) return;
    all.forEach(deleteProgram);
    toast.success(`${all.length} programme(s) supprimé(s)`);
  };

  // Notification automatique admin pour les tâches qui basculent en retard (1x par tâche)
  useEffect(() => {
    if (!userId) return;
    for (const t of overdue) {
      const key = `notified-late:${t.id}`;
      if (typeof window === "undefined") continue;
      if (localStorage.getItem(key)) continue;
      const n = daysLate(t.due_date);
      const parcel = t.parcel_id ?? "general";
      createCloudAlert.mutate(
        {
          parcel_id: parcel,
          type: "autre",
          comment: `Tâche en retard : ${t.title} (${n} j)`,
        },
        {
          onSuccess: () => {
            localStorage.setItem(key, "1");
            toast.message("Administrateur notifié du retard", { description: t.title });
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overdue.map((t) => t.id).join(","), userId]);

  const maxLate = overdue.reduce((m, t) => Math.max(m, daysLate(t.due_date)), 0);
  const programsCount = overduePrograms.length + upcomingPrograms.length;
  const alertsCount = openAlerts.length;

  const onComplete = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setExecTarget({
      type: "task",
      id: task.id,
      title: task.title,
      kind: task.kind,
      parcelName: parcelName(task.parcel_id) ?? undefined,
    });
  };

  const onExecuteProgram = (id: string) => {
    const p = programs.find((x) => x.id === id);
    if (!p) return;
    setExecTarget({
      type: "program",
      id: p.id,
      title: PROGRAM_META[p.kind]?.label ?? "Programme",
      kind: p.kind,
      parcelName: parcelName(p.parcel_id) ?? undefined,
    });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-4 pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold capitalize text-foreground">
            Bonjour {firstName} <span className="text-muted-foreground">— {dayLabel()}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Feuille de route programmée par l'administrateur
          </p>
        </div>
        <RoleSwitcher />
      </div>

      <WeatherBlock />

      <section className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-destructive/30 bg-gradient-to-b from-destructive/15 to-destructive/5 p-3 text-center ring-1 ring-inset ring-destructive/20 shadow-[0_3px_0_0_color-mix(in_oklab,var(--destructive)_25%,transparent)]">
          <p className="text-2xl font-bold text-destructive">{overdue.length + overduePrograms.length}</p>
          <p className="text-[11px] font-medium uppercase text-destructive/80">En retard</p>
          {maxLate > 0 && (
            <p className="mt-0.5 text-[10px] font-semibold text-destructive">max {maxLate} j</p>
          )}
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-center">
          <p className="text-2xl font-bold text-primary">{todayTasks.length}</p>
          <p className="text-[11px] font-medium uppercase text-primary/80">Aujourd'hui</p>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{upcoming.length + upcomingPrograms.length}</p>
          <p className="text-[11px] font-medium uppercase text-muted-foreground">À venir 7j</p>
        </div>
      </section>

      {/* Badges 3D : Anomalies & Programmes */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <BigBadge3D
          variant={alertsCount > 0 ? "danger" : "success"}
          icon={Bug}
          count={alertsCount}
          label="Anomalies à traiter"
          open={openPanel === "alerts"}
          onToggle={() => setOpenPanel((p) => (p === "alerts" ? null : "alerts"))}
        />
        <BigBadge3D
          variant={programsCount > 0 ? "primary" : "muted"}
          icon={CalendarClock}
          count={programsCount}
          label="Programmes planifiés"
          open={openPanel === "programs"}
          onToggle={() => setOpenPanel((p) => (p === "programs" ? null : "programs"))}
        />
      </section>

      {openPanel === "alerts" && (
        <section className="mt-3 animate-fade-in">
          {alertsCount === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Rien à traiter.
            </p>
          ) : (
            <ul className="space-y-2">
              {openAlerts.map((a) => {
                const key = (a.type ?? a.kind) as keyof typeof ALERT_ICONS;
                const Icon = ALERT_ICONS[key] ?? AlertTriangle;
                return (
                  <li
                    key={a.id}
                    onClick={() => setAlertDetail(a)}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 shadow-sm transition hover:bg-destructive/10"
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold leading-tight">{ALERT_LABELS[key] ?? "Anomalie"}</p>
                      <p className="text-xs text-muted-foreground">
                        {parcelName(a.parcel_id) || a.parcel_id}
                        {a.comment && ` · ${a.comment}`}
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
                      className="h-10 shrink-0 rounded-xl bg-primary px-3 text-xs font-bold uppercase text-primary-foreground active:scale-95 disabled:opacity-50"
                    >
                      Résolu
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {openPanel === "programs" && (
        <section className="mt-3 animate-fade-in">
          {programsCount === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Rien à traiter.
            </p>
          ) : (
            <ul className="space-y-2">
              <li className="flex justify-end">
                <button
                  onClick={deleteAllPrograms}
                  className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Tout effacer ({programsCount})
                </button>
              </li>
              {[...overduePrograms, ...upcomingPrograms].map((p) => {
                const meta = PROGRAM_META[p.kind] || {
                  label: p.kind || "Programme",
                  icon: Droplet,
                  tone: "text-slate-600 bg-slate-500/10 border-slate-500/30",
                };
                const Icon = meta.icon;
                const late = p.scheduled_at ? dateOnly(p.scheduled_at) < today : false;
                const lateN = late ? daysLate(p.scheduled_at) : 0;
                return (
                  <li
                    key={p.id}
                    className={`flex items-start gap-3 rounded-2xl border p-3 shadow-sm ${late ? "border-destructive/40 bg-destructive/5" : "bg-card"}`}
                  >
                    <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.tone}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold leading-tight">{meta.label}</p>
                        {late && (
                          <span className="rounded-full border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                            En retard de {lateN} j
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{fmtDate(p.scheduled_at)}</span>
                        <span>· {parcelName(p.parcel_id) || p.parcel_id}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm("Supprimer ce programme ?")) deleteProgram(p);
                      }}
                      title="Supprimer ce programme"
                      className="h-10 shrink-0 rounded-xl border border-destructive/40 px-2.5 text-destructive hover:bg-destructive/10 active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {p.kind === "fertilisation" ? (
                      <button
                        onClick={() => setActiveFertProg(p)}
                        className="h-10 shrink-0 rounded-xl bg-emerald-600 px-3 text-xs font-bold uppercase text-white hover:bg-emerald-700 active:scale-95 shadow-sm"
                      >
                        Préparer
                      </button>
                    ) : (
                      <button
                        onClick={() => onExecuteProgram(p.id)}
                        className="h-10 shrink-0 rounded-xl bg-primary px-3 text-xs font-bold uppercase text-primary-foreground active:scale-95"
                      >
                        Fait
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 dark:bg-amber-950/30">
        <header className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold">Rappels du matin</h2>
          </div>
          <Link to="/rappels" className="inline-flex items-center text-sm font-medium text-amber-700 hover:underline dark:text-amber-300">
            Tous <ChevronRight className="h-4 w-4" />
          </Link>
        </header>
        {activeReminders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun rappel prévu aujourd'hui.{" "}
            <Link to="/rappels" className="font-medium text-amber-700 underline dark:text-amber-300">
              Créer un rappel
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {activeReminders.map((r: Reminder) => {
              const done = r.lastCheckedAt === today;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => (done ? unmarkChecked(r.id) : markChecked(r.id))}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors min-h-14 ${
                      done
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-input bg-card hover:bg-accent"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                        done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground"
                      }`}
                    >
                      {done && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                    <div className="flex-1">
                      <p className={`font-semibold ${done ? "line-through text-muted-foreground" : ""}`}>{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.time}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {overdue.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-destructive">
            <AlertTriangle className="h-5 w-5" /> En retard ({overdue.length})
          </h2>
          <ul className="space-y-2">
            {overdue.map((t) => (
              <TaskCard
                key={t.id}
                t={t}
                parcelName={parcelName(t.parcel_id)}
                onComplete={onComplete}
                onOpen={setTaskDetail}
                tone="danger"
                loading={markDone.isPending}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
          <ClipboardList className="h-5 w-5 text-primary" /> Aujourd'hui
        </h2>
        {todayTasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucune tâche programmée pour aujourd'hui.
          </p>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map((t) => (
              <TaskCard
                key={t.id}
                t={t}
                parcelName={parcelName(t.parcel_id)}
                onComplete={onComplete}
                onOpen={setTaskDetail}
                tone="today"
                loading={markDone.isPending}
              />
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <CalendarClock className="h-5 w-5 text-muted-foreground" /> À venir (7 jours)
          </h2>
          <ul className="space-y-2">
            {upcoming.map((t) => (
              <TaskCard
                key={t.id}
                t={t}
                parcelName={parcelName(t.parcel_id)}
                onComplete={onComplete}
                onOpen={setTaskDetail}
                loading={markDone.isPending}
              />
            ))}
          </ul>
        </section>
      )}

      {noDate.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <ListTodo className="h-5 w-5 text-muted-foreground" /> Sans échéance
          </h2>
          <ul className="space-y-2">
            {noDate.map((t) => (
              <TaskCard
                key={t.id}
                t={t}
                parcelName={parcelName(t.parcel_id)}
                onComplete={onComplete}
                onOpen={setTaskDetail}
                loading={markDone.isPending}
              />
            ))}
          </ul>
        </section>
      )}


      <Dialog open={Boolean(taskDetail)} onOpenChange={(o) => !o && setTaskDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {taskDetail && (() => {
            const u = unpackTaskDescription(taskDetail.description);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-primary" /> {taskDetail.title}
                  </DialogTitle>
                  <DialogDescription>Détails de la tâche assignée</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold">Priorité :</span> {taskDetail.priority}</p>
                  <p><span className="font-semibold">Nature :</span> {taskDetail.kind}</p>
                  {taskDetail.due_date && (
                    <p><span className="font-semibold">Échéance :</span> {fmtDate(taskDetail.due_date)}</p>
                  )}
                  {parcelName(taskDetail.parcel_id) && (
                    <p><span className="font-semibold">Parcelle :</span> {parcelName(taskDetail.parcel_id)}</p>
                  )}
                  {u.reminderPrefix && <p className="text-muted-foreground">{u.reminderPrefix}</p>}
                  {u.cleanDescription && (
                    <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2">{u.cleanDescription}</p>
                  )}
                  {u.externalWorkers.length > 0 && (
                    <p><span className="font-semibold">Autres exécutants :</span> 👷 {u.externalWorkers.join(", ")}</p>
                  )}
                  {taskDetail.reject_reason && (
                    <p className="text-destructive">Renvoyé : {taskDetail.reject_reason}</p>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <button
                    onClick={() => setTaskDetail(null)}
                    className="h-10 rounded-xl border px-4 text-sm font-semibold"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => {
                      const id = taskDetail.id;
                      setTaskDetail(null);
                      onComplete(id);
                    }}
                    className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                  >
                    Fait
                  </button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <TaskExecutionModal target={execTarget} onOpenChange={(o) => !o && setExecTarget(null)} />
      <AlertDetailDialog alert={alertDetail} onOpenChange={(o) => !o && setAlertDetail(null)} />
      <FertilisationExecutionAssistant 
        program={activeFertProg} 
        onOpenChange={(o) => !o && setActiveFertProg(null)}
        parcelName={activeFertProg ? (parcelName(activeFertProg.parcel_id) ?? undefined) : undefined}
      />
    </main>
  );
}
