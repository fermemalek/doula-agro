import { useMemo, useState } from "react";
import {
  ChevronDown,
  Users,
  ShieldCheck,
  HardHat,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTasks,
  useExecutants,
  unpackTaskDescription,
  type CloudTask,
} from "@/lib/cloud/tasks";
import {
  TEAM_ROLE_PRESETS,
  getTeamRoleLabel,
  getTeamRoleOrder,
  useTeamMembersStore,
  type TeamAvailabilityStatus,
  type TeamMember,
} from "@/lib/team-members-store";
import { useParcels } from "@/lib/parcel-store";
import { useNavigate } from "@/lib/router-compat";
import { useTranslation } from "@/lib/i18n";

type PersonWithTasks = TeamMember & {
  tasks: CloudTask[];
};

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function normalizeName(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getRoleBadgeStyle(role: string) {
  const norm = normalizeName(role);
  if (norm === "superviseur" || norm === "مشرف") {
    return {
      cls: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30",
      icon: ShieldCheck,
    };
  }
  if (norm === "executant" || norm === "منفذ") {
    return {
      cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
      icon: Users,
    };
  }
  if (norm === "manoeuvre" || norm === "عامل") {
    return {
      cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30",
      icon: HardHat,
    };
  }
  return {
    cls: "bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30",
    icon: UserCheck,
  };
}

function computeAvailability(
  manualStatus: TeamAvailabilityStatus,
  activeTasks: number,
  overdue: number,
  isAr: boolean,
) {
  if (manualStatus === "absent") {
    return {
      isFree: false,
      label: isAr ? "غائب" : "Absent",
      tone: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
      bar: "bg-slate-400",
    };
  }
  if (manualStatus === "occupe") {
    return {
      isFree: false,
      label: isAr ? "مشغول" : "Occupé",
      tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      bar: "bg-amber-500",
    };
  }
  if (activeTasks === 0) {
    return {
      isFree: true,
      label: isAr ? "متاح" : "Libre",
      tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      bar: "bg-emerald-500",
    };
  }
  if (overdue > 0 || activeTasks >= 5) {
    return {
      isFree: false,
      label: isAr ? "مضغوط" : "Surchargé",
      tone: "bg-destructive/15 text-destructive",
      bar: "bg-destructive",
    };
  }
  if (activeTasks >= 3) {
    return {
      isFree: false,
      label: isAr ? "مشغول" : "Chargé",
      tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      bar: "bg-amber-500",
    };
  }
  return {
    isFree: false,
    label: isAr ? "في مهمة" : "En tâche",
    tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
  };
}

const PRESET_VALUES = new Set<string>(TEAM_ROLE_PRESETS.map((r) => r.value));

export function ExecutantWorkload() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: tasks = [] } = useTasks();
  const { data: executants = [] } = useExecutants();
  const { members, addMember, updateMember, removeMember } = useTeamMembersStore();
  const parcels = useParcels();
  const navigate = useNavigate();

  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Formulaire Ajout d'une personne
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRoleSelect, setNewRoleSelect] = useState<string>("Exécutant");
  const [newCustomRole, setNewCustomRole] = useState("");
  const [newStatus, setNewStatus] = useState<TeamAvailabilityStatus>("libre");

  // Édition rapide d'un membre existant
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoleSelect, setEditRoleSelect] = useState<string>("Exécutant");
  const [editCustomRole, setEditCustomRole] = useState("");
  const [editStatus, setEditStatus] = useState<TeamAvailabilityStatus>("libre");

  const people = useMemo<PersonWithTasks[]>(() => {
    const active = tasks.filter((t) => t.status === "a_faire" || t.status === "en_cours");

    // Indexer les IDs Supabase par nom normalisé pour relier les tâches assignées aux 7+ membres réels
    const accountIdsByNormName = new Map<string, Set<string>>();
    for (const ex of executants) {
      const k = normalizeName(ex.name);
      if (!accountIdsByNormName.has(k)) accountIdsByNormName.set(k, new Set());
      accountIdsByNormName.get(k)!.add(ex.id);
    }

    const list: PersonWithTasks[] = members.map((m) => {
      const normM = normalizeName(m.name);
      const matchingAccountIds = accountIdsByNormName.get(normM);
      const seenTaskGroup = new Set<string>();
      const memberTasks: CloudTask[] = [];

      for (const t of active) {
        const groupKey = `${t.title.trim().toLowerCase()}|${(t.due_date || "").slice(0, 16)}|${t.parcel_id || ""}|${t.created_at.slice(0, 16)}`;
        const isAssignedByAccount = Boolean(t.assigned_to && matchingAccountIds?.has(t.assigned_to));
        const { externalWorkers } = unpackTaskDescription(t.description);
        const isAssignedAsWorker = externalWorkers.some((w) => normalizeName(w) === normM);

        if ((isAssignedByAccount || isAssignedAsWorker) && !seenTaskGroup.has(groupKey)) {
          seenTaskGroup.add(groupKey);
          memberTasks.push(t);
        }
      }

      return { ...m, tasks: memberTasks };
    });

    return list.sort(
      (a, b) =>
        getTeamRoleOrder(a.role) - getTeamRoleOrder(b.role) ||
        b.tasks.length - a.tasks.length ||
        a.name.localeCompare(b.name),
    );
  }, [tasks, executants, members]);

  const today = dayStart(new Date());
  const weekEnd = today + 7 * 86_400_000;
  const maxLoad = Math.max(5, ...people.map((p) => p.tasks.length));
  const freeCount = people.filter((p) => p.status === "libre" && p.tasks.length === 0).length;

  const parcelName = (id: string | null) => parcels.find((p) => p.id === id)?.name;

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error(isAr ? "يرجى إدخال اسم الشخص" : "Veuillez saisir le nom de la personne.");
      return;
    }
    const finalRole =
      newRoleSelect === "__custom__" ? newCustomRole.trim() || "Exécutant" : newRoleSelect;
    addMember({ name: trimmed, role: finalRole, status: newStatus });
    toast.success(isAr ? `تمت إضافة ${trimmed} إلى الفريق` : `${trimmed} ajouté(e) à l'équipe.`);
    setNewName("");
    setNewRoleSelect("Exécutant");
    setNewCustomRole("");
    setNewStatus("libre");
    setAddFormOpen(false);
  }

  function startEdit(m: TeamMember) {
    setEditingId(m.id);
    setEditName(m.name);
    if (PRESET_VALUES.has(m.role)) {
      setEditRoleSelect(m.role);
      setEditCustomRole("");
    } else {
      setEditRoleSelect("__custom__");
      setEditCustomRole(m.role);
    }
    setEditStatus(m.status);
  }

  function saveEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error(isAr ? "الاسم مطلوب" : "Le nom est requis.");
      return;
    }
    const finalRole =
      editRoleSelect === "__custom__" ? editCustomRole.trim() || "Exécutant" : editRoleSelect;
    updateMember(id, { name: trimmed, role: finalRole, status: editStatus });
    setEditingId(null);
    toast.success(isAr ? "تم تحديث بيانات العضو" : "Membre mis à jour.");
  }

  function handleDelete(m: TeamMember) {
    if (
      !window.confirm(
        isAr ? `هل تريد حذف ${m.name} من قائمة الفريق؟` : `Supprimer "${m.name}" de la liste de l'équipe ?`,
      )
    ) {
      return;
    }
    removeMember(m.id);
    toast.success(isAr ? `تم حذف ${m.name}` : `${m.name} supprimé(e).`);
  }

  return (
    <section className="mb-4 rounded-2xl border bg-card shadow-sm" dir={isAr ? "rtl" : "ltr"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-3.5 text-start cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Users className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-foreground">
              {isAr ? "توفر المنفذين والفريق" : "Disponibilité des exécutants"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {isAr
                ? `${people.length} شخص · ${freeCount} متاح · المهام الجارية لكل عضو`
                : `${people.length} personne(s) · ${freeCount} libre(s) · tâches en cours par exécutant`}
            </p>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-2.5 border-t p-3">
          {/* Barre d'action : + Ajouter une personne */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className="rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-2 py-0.5">
                {isAr ? "مشرف" : "Superviseur"} :{" "}
                {people.filter((p) => getTeamRoleOrder(p.role) === 0).length}
              </span>
              <span className="rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 px-2 py-0.5">
                {isAr ? "منفذ" : "Exécutant"} :{" "}
                {people.filter((p) => getTeamRoleOrder(p.role) === 1).length}
              </span>
              <span className="rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5">
                {isAr ? "عامل" : "Manœuvre"} :{" "}
                {people.filter((p) => getTeamRoleOrder(p.role) === 2).length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAddFormOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl bg-primary text-primary-foreground hover:opacity-90 px-3 py-1.5 text-xs font-black shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isAr ? "+ إضافة شخص" : "+ Ajouter une personne"}</span>
            </button>
          </div>

          {/* Formulaire d'ajout */}
          {addFormOpen && (
            <form
              onSubmit={handleAddSubmit}
              className="rounded-xl border-2 border-primary/30 bg-muted/25 p-3 space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-foreground">
                  {isAr ? "إضافة عضو جديد إلى الفريق" : "Ajouter une personne à l'équipe"}
                </h3>
                <button
                  type="button"
                  onClick={() => setAddFormOpen(false)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    {isAr ? "الاسم *" : "Nom *"}
                  </label>
                  <input
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={isAr ? "مثال: كريم..." : "Ex: Karim..."}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    {isAr ? "الدور المسند" : "Rôle à affecter"}
                  </label>
                  <select
                    value={newRoleSelect}
                    onChange={(e) => setNewRoleSelect(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-bold"
                  >
                    {TEAM_ROLE_PRESETS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {isAr ? r.labelAr : r.labelFr}
                      </option>
                    ))}
                    <option value="__custom__">{isAr ? "أخرى (تخصيص)..." : "Autre (personnalisé)..."}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    {isAr ? "الحالة / التوفر" : "Statut / Disponibilité"}
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TeamAvailabilityStatus)}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-bold"
                  >
                    <option value="libre">{isAr ? "متاح (Libre)" : "Libre"}</option>
                    <option value="occupe">{isAr ? "مشغول (Occupé)" : "Occupé"}</option>
                    <option value="absent">{isAr ? "غائب (Absent)" : "Absent"}</option>
                  </select>
                </div>
              </div>

              {newRoleSelect === "__custom__" && (
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    {isAr ? "تسمية الدور المخصص" : "Libellé du rôle personnalisé"}
                  </label>
                  <input
                    value={newCustomRole}
                    onChange={(e) => setNewCustomRole(e.target.value)}
                    placeholder={isAr ? "مثال: سائق جرار، حارس..." : "Ex: Tractoriste, Gardien..."}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddFormOpen(false)}
                  className="rounded-lg border px-3 py-1 font-bold text-muted-foreground cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Annuler"}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1 font-black cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isAr ? "حفظ" : "Ajouter"}</span>
                </button>
              </div>
            </form>
          )}

          {people.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {isAr ? "لا يوجد أعضاء في الفريق." : "Aucun membre dans l'équipe."}
            </p>
          )}

          {(
            [
              {
                order: 0,
                titleFr: "Niveau 1 · 🛡️ Superviseurs",
                titleAr: "المستوى 1 · 🛡️ المشرفون",
                cls: "bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 border-indigo-500/30",
              },
              {
                order: 1,
                titleFr: "Niveau 2 · 👥 Exécutants",
                titleAr: "المستوى 2 · 👥 المنفذون",
                cls: "bg-sky-500/10 text-sky-800 dark:text-sky-200 border-sky-500/30",
              },
              {
                order: 2,
                titleFr: "Niveau 3 · 👷 Manœuvres",
                titleAr: "المستوى 3 · 👷 العمال",
                cls: "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30",
              },
              {
                order: 3,
                titleFr: "Autres rôles",
                titleAr: "أدوار أخرى",
                cls: "bg-teal-500/10 text-teal-800 dark:text-teal-200 border-teal-500/30",
              },
            ] as const
          ).map((level) => {
            const groupPeople = people.filter((p) => getTeamRoleOrder(p.role) === level.order);
            if (groupPeople.length === 0) return null;
            const groupFree = groupPeople.filter((p) => p.status === "libre" && p.tasks.length === 0).length;
            return (
              <div key={level.order} className="space-y-2">
                <div
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-1 text-[11px] font-black ${level.cls}`}
                >
                  <span>{isAr ? level.titleAr : level.titleFr}</span>
                  <span>
                    {groupFree}/{groupPeople.length} {isAr ? "متاح" : "libre(s)"}
                  </span>
                </div>
                {groupPeople.map((p) => {
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
            const av = computeAvailability(p.status, p.tasks.length, overdue, isAr);
            const isOpen = expanded === p.id;
            const isEditing = editingId === p.id;
            const badge = getRoleBadgeStyle(p.role);
            const RoleIcon = badge.icon;

            return (
              <div key={p.id} className="rounded-xl border bg-background">
                {isEditing ? (
                  <div className="p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          {isAr ? "الاسم" : "Nom"}
                        </label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-input bg-card px-2 py-1 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          {isAr ? "الدور" : "Rôle"}
                        </label>
                        <select
                          value={editRoleSelect}
                          onChange={(e) => setEditRoleSelect(e.target.value)}
                          className="w-full rounded-lg border border-input bg-card px-2 py-1 text-xs font-bold"
                        >
                          {TEAM_ROLE_PRESETS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {isAr ? r.labelAr : r.labelFr}
                            </option>
                          ))}
                          <option value="__custom__">{isAr ? "أخرى..." : "Personnalisé..."}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          {isAr ? "الحالة" : "Statut"}
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as TeamAvailabilityStatus)}
                          className="w-full rounded-lg border border-input bg-card px-2 py-1 text-xs font-bold"
                        >
                          <option value="libre">{isAr ? "متاح" : "Libre"}</option>
                          <option value="occupe">{isAr ? "مشغول" : "Occupé"}</option>
                          <option value="absent">{isAr ? "غائب" : "Absent"}</option>
                        </select>
                      </div>
                    </div>
                    {editRoleSelect === "__custom__" && (
                      <input
                        value={editCustomRole}
                        onChange={(e) => setEditCustomRole(e.target.value)}
                        placeholder={isAr ? "الدور المخصص..." : "Rôle personnalisé..."}
                        className="w-full rounded-lg border border-input bg-card px-2 py-1 text-xs font-medium"
                      />
                    )}
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border px-2.5 py-1 text-[11px] font-bold text-muted-foreground cursor-pointer"
                      >
                        {isAr ? "إلغاء" : "Annuler"}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1 text-[11px] font-black cursor-pointer"
                      >
                        <Save className="h-3 w-3" />
                        <span>{isAr ? "حفظ" : "Enregistrer"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : p.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-start cursor-pointer"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <RoleIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-foreground">{p.name}</span>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${badge.cls}`}>
                            {getTeamRoleLabel(p.role, isAr)}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${av.tone}`}>
                            {av.label}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${av.bar}`}
                            style={{ width: `${Math.min(100, (p.tasks.length / maxLoad) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>
                            <b className="text-foreground">{p.tasks.length}</b> {isAr ? "جارية" : "en cours"}
                          </span>
                          {overdue > 0 && (
                            <span className="inline-flex items-center gap-0.5 font-semibold text-destructive">
                              <AlertTriangle className="h-3 w-3" /> {overdue} {isAr ? "متأخرة" : "en retard"}
                            </span>
                          )}
                          <span>
                            {todayN} {isAr ? "اليوم" : "aujourd'hui"}
                          </span>
                          <span>
                            {weekN} {isAr ? "خلال 7 أيام" : "sous 7 j"}
                          </span>
                          {next?.due_date && (
                            <span>
                              {isAr ? "القادمة :" : "prochaine :"}{" "}
                              {new Date(next.due_date).toLocaleDateString(isAr ? "ar-DZ" : "fr-FR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Boutons Modifier rôle / Supprimer */}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        title={isAr ? "تعديل الدور أو الحالة" : "Modifier rôle / statut"}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        title={isAr ? "حذف" : "Supprimer"}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {isOpen && !isEditing && (
                  <ul className="space-y-1 border-t px-2.5 py-2">
                    {p.tasks.length === 0 && (
                      <li className="text-xs text-muted-foreground">
                        {isAr ? "لا توجد مهام جارية — متاح حالياً." : "Aucune tâche en cours — disponible."}
                      </li>
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
                            {t.due_date
                              ? new Date(t.due_date).toLocaleDateString("fr-FR")
                              : isAr
                                ? "بدون أجل"
                                : "sans échéance"}
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
            );
          })}
        </div>
      )}
    </section>
  );
}
