import { useMemo, useState } from "react";
import { ChevronDown, Users, ShieldCheck, HardHat, AlertTriangle } from "lucide-react";
import {
  useTasks,
  useExecutants,
  unpackTaskDescription,
  type CloudTask,
} from "@/lib/cloud/tasks";
import { useParcels } from "@/lib/parcel-store";
import { useNavigate } from "@/lib/router-compat";

type Person = {
  key: string;
  name: string;
  kind: "admin" | "executant" | "externe";
  tasks: CloudTask[];
};

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function availability(active: number, overdue: number) {
  if (active === 0)
    return { label: "Libre", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" };
  if (overdue > 0 || active >= 5)
    return { label: "Surchargé", tone: "bg-destructive/15 text-destructive", bar: "bg-destructive" };
  if (active >= 3)
    return { label: "Chargé", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", bar: "bg-amber-500" };
  return { label: "Disponible", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300", bar: "bg-sky-500" };
}

export function ExecutantWorkload() {
  const { data: tasks = [] } = useTasks();
  const { data: executants = [] } = useExecutants();
  const parcels = useParcels();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const people = useMemo<Person[]>(() => {
    const active = tasks.filter((t) => t.status === "a_faire" || t.status === "en_cours");
    const map = new Map<string, Person>();
    for (const e of executants) {
      map.set(`acc:${e.id}`, {
        key: `acc:${e.id}`,
        name: e.name,
        kind: e.role === "admin" ? "admin" : "executant",
        tasks: [],
      });
    }
    const seenExternal = new Set<string>();
    for (const t of active) {
      if (t.assigned_to) map.get(`acc:${t.assigned_to}`)?.tasks.push(t);
      const { externalWorkers } = unpackTaskDescription(t.description);
      // une même tâche est dupliquée sur chaque compte assigné : ne compter qu'une fois par ouvrier
      const groupKey = `${t.title.trim().toLowerCase()}|${(t.due_date || "").slice(0, 16)}|${t.parcel_id || ""}|${t.created_at.slice(0, 16)}`;
      for (const w of externalWorkers) {
        const dedupe = `${w.toLowerCase()}|${groupKey}`;
        if (seenExternal.has(dedupe)) continue;
        seenExternal.add(dedupe);
        const key = `ext:${w.toLowerCase()}`;
        const p = map.get(key) ?? { key, name: w, kind: "externe" as const, tasks: [] };
        p.tasks.push(t);
        map.set(key, p);
      }
    }
    const order = { admin: 0, executant: 1, externe: 2 } as const;
    return [...map.values()].sort(
      (a, b) => order[a.kind] - order[b.kind] || b.tasks.length - a.tasks.length || a.name.localeCompare(b.name),
    );
  }, [tasks, executants]);

  const today = dayStart(new Date());
  const weekEnd = today + 7 * 86_400_000;
  const maxLoad = Math.max(5, ...people.map((p) => p.tasks.length));
  const freeCount = people.filter((p) => p.tasks.length === 0).length;

  const parcelName = (id: string | null) => parcels.find((p) => p.id === id)?.name;

  return (
    <section className="mb-4 rounded-2xl border bg-card shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-foreground">Disponibilité des exécutants</h2>
            <p className="text-[11px] text-muted-foreground">
              {people.length} personne(s) · {freeCount} libre(s) · tâches en cours par exécutant
            </p>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-2 border-t p-3">
          {people.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">Aucun exécutant.</p>
          )}
          {people.map((p) => {
            const overdue = p.tasks.filter((t) => t.due_date && new Date(t.due_date).getTime() < Date.now()).length;
            const todayN = p.tasks.filter((t) => t.due_date && dayStart(new Date(t.due_date)) === today).length;
            const weekN = p.tasks.filter((t) => {
              if (!t.due_date) return false;
              const d = dayStart(new Date(t.due_date));
              return d > today && d <= weekEnd;
            }).length;
            const next = p.tasks
              .filter((t) => t.due_date)
              .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0];
            const av = availability(p.tasks.length, overdue);
            const isOpen = expanded === p.key;
            const KindIcon = p.kind === "admin" ? ShieldCheck : p.kind === "externe" ? HardHat : Users;
            return (
              <div key={p.key} className="rounded-xl border bg-background">
                <button
                  onClick={() => setExpanded(isOpen ? null : p.key)}
                  className="flex w-full items-center gap-3 p-2.5 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <KindIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-foreground">{p.name}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                        {p.kind === "externe" ? "Sans compte" : p.kind === "admin" ? "Admin" : "Exécutant"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${av.tone}`}>{av.label}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${av.bar}`}
                        style={{ width: `${Math.min(100, (p.tasks.length / maxLoad) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span><b className="text-foreground">{p.tasks.length}</b> en cours</span>
                      {overdue > 0 && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {overdue} en retard
                        </span>
                      )}
                      <span>{todayN} aujourd'hui</span>
                      <span>{weekN} sous 7 j</span>
                      {next?.due_date && (
                        <span>
                          prochaine : {new Date(next.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <ul className="space-y-1 border-t px-2.5 py-2">
                    {p.tasks.length === 0 && (
                      <li className="text-xs text-muted-foreground">Aucune tâche en cours — disponible.</li>
                    )}
                    {p.tasks.map((t) => {
                      const late = t.due_date && new Date(t.due_date).getTime() < Date.now();
                      return (
                        <li
                          key={t.id}
                          onClick={() => navigate({ to: `/tache?taskId=${t.id}` })}
                          className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted"
                        >
                          <span className="min-w-0 truncate font-semibold text-foreground">{t.title}</span>
                          <span className={`shrink-0 ${late ? "font-bold text-destructive" : "text-muted-foreground"}`}>
                            {parcelName(t.parcel_id) ? `🌳 ${parcelName(t.parcel_id)} · ` : ""}
                            {t.due_date ? new Date(t.due_date).toLocaleDateString("fr-FR") : "sans échéance"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

