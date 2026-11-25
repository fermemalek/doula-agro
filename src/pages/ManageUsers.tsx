import { useNavigate } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  HardHat,
  FlaskConical,
  ArrowLeft,
  UserPlus,
  Edit2,
  Loader2,
  CheckCircle,
  Trash2,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/lib/role";
import { useTranslation } from "@/lib/i18n";
import { buildAuthAlias } from "@/pages/Login";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Client temporaire dédié à la création d'utilisateurs sans affecter la session actuelle de l'administrateur.
const tempClient = createClient(SUPABASE_URL || "", SUPABASE_PUBLISHABLE_KEY || "", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

interface UserItem {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  role: "admin" | "executant" | "ingenieur";
  createdAt: string;
}

export default function ManageUsers() {
  const navigate = useNavigate();
  const { session, loading } = useRole();
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  // Formulaire d'ajout
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "executant" | "ingenieur">("executant");
  const [creating, setCreating] = useState(false);

  // Liste des utilisateurs
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  // Dialogue d'édition
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [editRole, setEditRole] = useState<"admin" | "executant" | "ingenieur">("executant");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!session) {
        toast.error(
          isAr
            ? "يرجى تسجيل الدخول للوصول إلى إدارة المستخدمين."
            : "Veuillez vous connecter pour accéder à la gestion des utilisateurs.",
        );
        navigate({ to: "/login" });
      } else {
        fetchUsers();
      }
    }
  }, [session, loading, navigate]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setOfflineMode(false);
    const loadCachedUsers = () => {
      try {
        const raw = localStorage.getItem("doula-users-cache");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setUsersList(parsed);
        }
      } catch {}
    };

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setOfflineMode(true);
      loadCachedUsers();
      setLoadingUsers(false);
      return;
    }

    try {
      // 1. Récupérer tous les profils publics
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      // 2. Récupérer tous les rôles associés
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("*");
      if (rErr) throw rErr;

      // Nettoyer automatiquement les rôles orphelins
      const validProfileIds = new Set((profiles ?? []).map((p) => p.id));
      const orphanUserIds = (roles ?? [])
        .map((r) => r.user_id)
        .filter((uid) => !validProfileIds.has(uid));
      if (orphanUserIds.length > 0) {
        await supabase.from("user_roles").delete().in("user_id", orphanUserIds);
      }

      // Organiser les rôles par ID utilisateur
      const roleMap: Record<string, "admin" | "executant" | "ingenieur"> = {};
      roles?.forEach((r) => {
        if (validProfileIds.has(r.user_id)) {
          roleMap[r.user_id] = r.role as any;
        }
      });

      // Fusionner les données et garantir que le compte par défaut Zeinab a bien le rôle `ingenieur`
      const combined: UserItem[] = (profiles ?? []).map((p) => {
        const phoneRaw = p.phone || "";
        const parts = phoneRaw.split("|");
        const fullNameVal = p.full_name || (isAr ? "مستخدم بدون اسم" : "Utilisateur sans nom");
        const usernameVal = parts[0] || (isAr ? "غير محدد" : "Non spécifié");
        const combinedIdent = `${fullNameVal} ${usernameVal}`.toLowerCase();
        const isZeinab = combinedIdent.includes("zeinab");
        const resolvedRole: "admin" | "executant" | "ingenieur" = isZeinab
          ? "ingenieur"
          : roleMap[p.id] || "executant";
        return {
          id: p.id,
          fullName: fullNameVal,
          username: usernameVal,
          phone: parts[1] || "",
          role: resolvedRole,
          createdAt: p.created_at,
        };
      });

      setUsersList(combined);
      try {
        localStorage.setItem("doula-users-cache", JSON.stringify(combined));
      } catch {}
    } catch (err: any) {
      console.error("[ManageUsers] fetchUsers error:", err);
      const isNetErr =
        (typeof navigator !== "undefined" && navigator.onLine === false) ||
        /fetch|network|offline|timeout/i.test(String(err?.message || ""));
      if (isNetErr) {
        setOfflineMode(true);
        loadCachedUsers();
      } else {
        toast.error(
          (isAr ? "تعذر تحميل قائمة المستخدمين: " : "Impossible de récupérer la liste des utilisateurs: ") +
            err.message,
        );
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    if (!username.trim() || !fullName.trim() || !password.trim()) {
      toast.error(isAr ? "يرجى ملء جميع الحقول المطلوبة." : "Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 6) {
      toast.error(
        isAr
          ? "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل."
          : "Le mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    const exists = usersList.some((u) => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      toast.error(isAr ? "اسم المستخدم هذا مستخدم بالفعل." : "Ce nom d'utilisateur est déjà pris.");
      return;
    }

    setCreating(true);
    try {
      const mappedEmail = cleanUsername.includes("@")
        ? cleanUsername
        : `${cleanUsername}@doulaagro.local`;

      const { data: authData, error: authErr } = await tempClient.auth.signUp({
        email: mappedEmail,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authErr) throw authErr;
      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error(isAr ? "خطأ في استرجاع معرف المستخدم." : "Erreur lors de la récupération de l'ID utilisateur.");

      await new Promise((resolve) => setTimeout(resolve, 800));

      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", newUserId);

      if (existingRoles && existingRoles.length > 0) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .update({ role: selectedRole })
          .eq("user_id", newUserId);
        if (roleErr) throw roleErr;
      } else {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: newUserId, role: selectedRole });
        if (roleErr) throw roleErr;
      }

      const combinedPhoneVal = phone.trim() ? `${cleanUsername}|${phone.trim()}` : cleanUsername;
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: combinedPhoneVal,
        })
        .eq("id", newUserId);
      if (profileErr) throw profileErr;

      toast.success(
        isAr
          ? `تم إنشاء المستخدم "${fullName}" بنجاح.`
          : `L'utilisateur "${fullName}" a été créé avec succès.`,
      );

      setUsername("");
      setFullName("");
      setPhone("");
      setPassword("");
      setSelectedRole("executant");

      fetchUsers();
    } catch (err: any) {
      toast.error((isAr ? "خطأ في الإنشاء: " : "Erreur de création: ") + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditUsername(user.username);
    setEditPhone(user.phone);
    setEditPassword("");
    setShowEditPwd(false);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editFullName.trim()) {
      toast.error(isAr ? "الاسم الكامل مطلوب." : "Le nom complet ne peut pas être vide.");
      return;
    }
    if (!editUsername.trim()) {
      toast.error(isAr ? "اسم المستخدم مطلوب." : "Le nom d'utilisateur ne peut pas être vide.");
      return;
    }
    if (editPassword.trim() && editPassword.trim().length < 6) {
      toast.error(
        isAr
          ? "يجب أن تحتوي كلمة المرور الجديدة على 6 أحرف على الأقل."
          : "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    setSavingEdit(true);
    try {
      const cleanEditUser = editUsername.trim().toLowerCase();
      const combinedPhoneVal = editPhone.trim()
        ? `${cleanEditUser}|${editPhone.trim()}`
        : cleanEditUser;

      let targetUserId = editingUser.id;
      const newPwd = editPassword.trim();

      if (newPwd) {
        if (editingUser.id === session?.user?.id) {
          const { error: selfPwdErr } = await supabase.auth.updateUser({
            password: newPwd,
          });
          if (selfPwdErr) {
            console.warn("[ManageUsers] updateUser self password:", selfPwdErr.message);
          }
        }

        const aliasEmail = buildAuthAlias(cleanEditUser, newPwd);
        let syncedId: string | null = null;

        const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
          email: aliasEmail,
          password: newPwd,
          options: {
            data: { full_name: editFullName.trim() },
          },
        });

        if (!signUpErr && signUpData?.user?.id) {
          syncedId = signUpData.user.id;
        } else {
          const { data: signInData } = await tempClient.auth.signInWithPassword({
            email: aliasEmail,
            password: newPwd,
          });
          if (signInData?.user?.id) {
            syncedId = signInData.user.id;
          }
        }

        if (syncedId && syncedId !== editingUser.id && editingUser.id !== session?.user?.id) {
          await new Promise((r) => setTimeout(r, 700));
          targetUserId = syncedId;

          await supabase.from("tasks").update({ assigned_to: targetUserId }).eq("assigned_to", editingUser.id);
          await supabase.from("module_records").update({ assigned_to: targetUserId }).eq("assigned_to", editingUser.id);
          await supabase.from("alerts").update({ assigned_to: targetUserId }).eq("assigned_to", editingUser.id);

          await supabase.from("user_roles").delete().eq("user_id", editingUser.id);
          await supabase.from("profiles").delete().eq("id", editingUser.id);
        }
      }

      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", targetUserId);

      if (existingRoles && existingRoles.length > 0) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .update({ role: editRole })
          .eq("user_id", targetUserId);
        if (roleErr) throw roleErr;
      } else {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: targetUserId, role: editRole });
        if (roleErr) throw roleErr;
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          phone: combinedPhoneVal,
        })
        .eq("id", targetUserId);
      if (profileErr) throw profileErr;

      toast.success(
        newPwd
          ? isAr
            ? `تم حفظ الملف وكلمة المرور الجديدة لـ "${editFullName.trim()}"!`
            : `Profil et nouveau mot de passe enregistrés pour "${editFullName.trim()}" !`
          : isAr
            ? "تم حفظ التعديلات."
            : "Modifications enregistrées.",
      );
      setEditingUser(null);
      setEditPassword("");
      fetchUsers();
    } catch (err: any) {
      toast.error((isAr ? "خطأ في التعديل: " : "Erreur de modification: ") + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === session?.user?.id) {
      toast.error(isAr ? "لا يمكنك حذف حسابك الشخصي." : "Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    if (
      !window.confirm(
        isAr
          ? "هل أنت متأكد من حذف هذا المستخدم؟ هذا الإجراء لا يمكن التراجع عنه."
          : "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible et supprimera le rôle et le profil de l'utilisateur.",
      )
    ) {
      return;
    }

    try {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (roleErr) throw roleErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (profileErr) throw profileErr;

      toast.success(isAr ? "تم حذف المستخدم بنجاح." : "Utilisateur supprimé avec succès.");
      fetchUsers();
    } catch (err: any) {
      console.error("[ManageUsers] handleDeleteUser error:", err);
      toast.error((isAr ? "خطأ أثناء الحذف: " : "Erreur lors de la suppression: ") + err.message);
    }
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 dark:bg-red-950 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:text-red-300">
            <Shield className="h-3 w-3" /> {isAr ? "مدير" : "Admin"}
          </span>
        );
      case "ingenieur":
        return (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950 px-2 py-0.5 text-[11px] font-semibold text-purple-800 dark:text-purple-300">
            <FlaskConical className="h-3 w-3" /> {isAr ? "مهندس" : "Ingénieur"}
          </span>
        );
      default:
        return (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            <HardHat className="h-3 w-3" /> {isAr ? "منفذ" : "Exécutant"}
          </span>
        );
    }
  };

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-4xl overflow-x-hidden px-3 sm:px-4 pb-24 pt-4 space-y-5 box-border"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/profil" })}
          className="rounded-full shrink-0"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold truncate">
            {isAr ? "إدارة المستخدمين" : "Gestion des utilisateurs"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr
              ? "أنشئ وحدّد أدوار الوصول لفريق المزرعة."
              : "Créez et configurez les rôles d'accès pour votre ferme."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6 w-full max-w-full">
        {/* Colonne gauche : Formulaire de création */}
        <div className="md:col-span-2 space-y-4 min-w-0 w-full max-w-full">
          <Card className="p-4 space-y-4 w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <UserPlus className="h-5 w-5 shrink-0" />
              <h2>{isAr ? "إضافة مستخدم" : "Ajouter un utilisateur"}</h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="username">
                  {isAr ? "اسم المستخدم (Username)" : "Nom d'utilisateur (Username)"}
                </Label>
                <Input
                  id="username"
                  dir="ltr"
                  placeholder={isAr ? "مثال: karim" : "Ex: jean"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
                  required
                  disabled={creating}
                  className="w-full max-w-full"
                />
                <p className="text-[10px] text-muted-foreground">
                  {isAr
                    ? "يُستعمل كمعرّف فريد لتسجيل الدخول."
                    : "Servira d'identifiant unique à la connexion."}
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="fullName">{isAr ? "الاسم الكامل" : "Nom Complet"}</Label>
                <Input
                  id="fullName"
                  placeholder={isAr ? "مثال: كريم بن علي" : "Ex: Jean Dupont"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={creating}
                  className="w-full max-w-full"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">{isAr ? "الهاتف (واتساب)" : "Numéro de Téléphone (WhatsApp)"}</Label>
                <Input
                  id="phone"
                  dir="ltr"
                  placeholder="+213 555 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={creating}
                  className="w-full max-w-full"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">{isAr ? "كلمة المرور" : "Mot de passe"}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showCreatePwd ? "text" : "password"}
                    placeholder={isAr ? "6 أحرف على الأقل" : "Min. 6 caractères"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={creating}
                    className={`w-full max-w-full ${isAr ? "pl-10" : "pr-10"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePwd((v) => !v)}
                    className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${
                      isAr ? "left-2.5" : "right-2.5"
                    }`}
                    title={showCreatePwd ? (isAr ? "إخفاء" : "Masquer") : isAr ? "إظهار" : "Afficher"}
                  >
                    {showCreatePwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>{isAr ? "الدور المسند" : "Rôle attribué"}</Label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {(
                    [
                      { v: "executant" as const, labelFr: "Exécutant", labelAr: "منفذ", icon: HardHat },
                      { v: "ingenieur" as const, labelFr: "Ingénieur", labelAr: "مهندس", icon: FlaskConical },
                      { v: "admin" as const, labelFr: "Administrateur", labelAr: "مدير", icon: Shield },
                    ]
                  ).map(({ v, labelFr, labelAr, icon: Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedRole(v)}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors text-start text-sm cursor-pointer ${
                        selectedRole === v
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-border hover:bg-muted"
                      }`}
                      disabled={creating}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${selectedRole === v ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="flex-1">{isAr ? labelAr : labelFr}</span>
                      {selectedRole === v && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mx-2 h-4 w-4 animate-spin" />
                    {isAr ? "جاري الإنشاء…" : "Création en cours…"}
                  </>
                ) : isAr ? (
                  "إضافة المستخدم"
                ) : (
                  "Ajouter l'utilisateur"
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Colonne droite : Liste des utilisateurs existants */}
        <div className="md:col-span-3 min-w-0 w-full max-w-full">
          <Card className="p-4 space-y-3 w-full max-w-full overflow-hidden">
            <h2 className="font-semibold">
              {isAr ? `أعضاء المزرعة (${usersList.length})` : `Membres de la ferme (${usersList.length})`}
            </h2>

            {offlineMode && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300 font-medium flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 flex-1">
                  📡{" "}
                  {isAr
                    ? `إدارة الحسابات غير متاحة دون إنترنت${usersList.length > 0 ? " — عرض النسخة المخزنة محلياً" : ""}.`
                    : `Gestion des comptes indisponible hors ligne${usersList.length > 0 ? " — affichage du cache local" : ""}.`}
                </span>
                <Button variant="outline" size="sm" onClick={() => void fetchUsers()} className="h-7 text-[11px] shrink-0">
                  {isAr ? "إعادة المحاولة" : "Réessayer"}
                </Button>
              </div>
            )}

            {loadingUsers ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs">{isAr ? "جاري تحميل الحسابات…" : "Chargement des comptes…"}</p>
              </div>
            ) : usersList.length === 0 ? (
              <p className="text-sm text-center py-8 text-muted-foreground">
                {isAr ? "لا يوجد أي مستخدم مسجل." : "Aucun utilisateur enregistré."}
              </p>
            ) : (
              <div className="divide-y">
                {usersList.map((user) => (
                  <div
                    key={user.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-sm truncate max-w-full">{user.fullName}</span>
                        {renderRoleBadge(user.role)}
                      </div>
                      <p className="text-xs text-muted-foreground break-all leading-snug">
                        {isAr ? "اسم المستخدم:" : "Username:"}{" "}
                        <span dir="ltr" className="font-medium text-foreground break-all">
                          {user.username}
                        </span>
                        {user.phone && (
                          <>
                            {" "}
                            · {isAr ? "الهاتف:" : "Tél:"}{" "}
                            <span dir="ltr" className="font-medium text-foreground">
                              {user.phone}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(user)}
                        className="h-8 px-2.5 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{isAr ? "تعديل" : "Modifier"}</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="h-8 px-2.5 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{isAr ? "حذف" : "Supprimer"}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Boîte de dialogue d'édition */}
      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isAr ? "تعديل المستخدم" : "Modifier l'utilisateur"}</DialogTitle>
            <DialogDescription>
              {isAr
                ? "عدّل الدور أو الاسم أو بيانات الدخول لهذا العضو."
                : "Modifiez le rôle ou le nom de l'utilisateur."}
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="editUsername">
                  {isAr ? "اسم المستخدم (المعرّف)" : "Nom d'utilisateur (Identifiant)"}
                </Label>
                <Input
                  id="editUsername"
                  dir="ltr"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, ""))}
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? "اسم المستخدم الفريد لتسجيل الدخول." : "Nom d'utilisateur unique utilisé pour la connexion."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPhone">{isAr ? "الهاتف (واتساب)" : "Numéro de Téléphone (WhatsApp)"}</Label>
                <Input
                  id="editPhone"
                  dir="ltr"
                  placeholder="+213 555 123 456"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editFullName">{isAr ? "الاسم الكامل" : "Nom Complet"}</Label>
                <Input
                  id="editFullName"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPassword" className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  {isAr ? "كلمة مرور جديدة (اختياري)" : "Nouveau mot de passe (optionnel)"}
                </Label>
                <div className="relative">
                  <Input
                    id="editPassword"
                    type={showEditPwd ? "text" : "password"}
                    placeholder={
                      isAr
                        ? "اتركه فارغاً للاحتفاظ بكلمة المرور الحالية"
                        : "Laisser vide pour garder le mot de passe actuel"
                    }
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    minLength={6}
                    className={isAr ? "pl-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPwd((v) => !v)}
                    className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${
                      isAr ? "left-2.5" : "right-2.5"
                    }`}
                    title={showEditPwd ? (isAr ? "إخفاء" : "Masquer") : isAr ? "إظهار" : "Afficher"}
                  >
                    {showEditPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isAr
                    ? "إذا أدخلت كلمة مرور جديدة (6 أحرف على الأقل)، ستستبدل القديمة لهذا الحساب."
                    : "Si vous saisissez un nouveau mot de passe (min. 6 caractères), il remplacera l'ancien pour ce compte."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "الدور" : "Rôle"}</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(
                    [
                      { v: "executant" as const, labelFr: "Exécutant", labelAr: "منفذ" },
                      { v: "ingenieur" as const, labelFr: "Ingénieur", labelAr: "مهندس" },
                      { v: "admin" as const, labelFr: "Admin", labelAr: "مدير" },
                    ]
                  ).map(({ v, labelFr, labelAr }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditRole(v)}
                      className={`rounded-lg border p-2 text-center text-xs transition-colors cursor-pointer ${
                        editRole === v
                          ? "border-primary bg-primary/5 font-semibold text-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {isAr ? labelAr : labelFr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={savingEdit}>
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? (
                <>
                  <Loader2 className="mx-2 h-4 w-4 animate-spin" /> {isAr ? "جاري الحفظ…" : "Enregistrement…"}
                </>
              ) : isAr ? (
                "حفظ"
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
