import { Link, useNavigate } from "@/lib/router-compat";
import { useState } from "react";
import { LogOut, Settings, User as UserIcon, HardHat, Shield, Trash2, RotateCcw, CloudOff, FlaskConical, Check, Users, Camera } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/lib/role";
import { useDisplayRole } from "@/lib/display-role";
import { useTranslation } from "@/lib/i18n";
import {
  compressAvatarFile,
  getUserAvatar,
  saveCustomUserAvatar,
  useAvatarVersion,
} from "@/lib/avatars";
import { resetFarmData } from "@/lib/cloud/admin-reset";
import { offlineDB } from "@/lib/offline/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CriticalNotificationsCard } from "@/components/notifications/CriticalNotificationsCard";

function ProfilPage() {
  const { session, signOut, switchRole } = useRole();
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  useAvatarVersion();
  const navigate = useNavigate();
  const role = useDisplayRole();
  const email = session?.user?.email ?? "";
  const name = (session?.user?.user_metadata?.full_name as string) || email;

  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const confirmKeyword = isAr ? "إعادة تعيين" : "RÉINITIALISER";

  const doReset = async () => {
    setResetting(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        toast.error(isAr ? "انتهت الجلسة. يرجى إعادة تسجيل الدخول." : "Session expirée. Reconnectez-vous.");
        setResetting(false);
        return;
      }
      const res: any = await resetFarmData();
      if (!res?.ok) {
        toast.error(res?.error || (isAr ? "فشل إعادة التعيين" : "Échec de la réinitialisation"));
        setResetting(false);
        return;
      }
      try {
        localStorage.removeItem("doula-modules");
        localStorage.removeItem("doula-anomalies");
        localStorage.removeItem("doula-alerts");
        localStorage.removeItem("doula-ops");
        localStorage.removeItem("doula-reminders");

        const { resetAllConsumedQuantities } = await import("@/lib/suppliers-store");
        resetAllConsumedQuantities();
      } catch {}
      toast.success(isAr ? "تمت إعادة تعيين التطبيق بنجاح" : "Application réinitialisée");
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      toast.error(e?.message || (isAr ? "فشل إعادة التعيين" : "Échec de la réinitialisation"));
      setResetting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4" dir={isAr ? "rtl" : "ltr"}>
      <h1 className="mb-3 text-xl font-bold">{isAr ? "الملف الشخصي" : "Profil"}</h1>

      <section className="mb-4 flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-2xs">
        {(() => {
          const profilAvatar = getUserAvatar({ id: session?.user?.id, name, email, role });
          return (
            <label
              className="relative group cursor-pointer shrink-0"
              title={isAr ? "تغيير صورة الملف الشخصي" : "Changer la photo de profil"}
            >
              {profilAvatar ? (
                <img
                  src={profilAvatar}
                  alt={name || email}
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/35 group-hover:opacity-85 transition"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition">
                  <UserIcon className="h-7 w-7" />
                </span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-card">
                <Camera className="h-3 w-3" />
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const dataUrl = await compressAvatarFile(file);
                    saveCustomUserAvatar([session?.user?.id, email, name], dataUrl);
                    toast.success(isAr ? "تم تحديث صورة الملف الشخصي" : "Photo de profil mise à jour !");
                  } catch (err: any) {
                    toast.error(err?.message || "Erreur image");
                  }
                  e.target.value = "";
                }}
              />
            </label>
          );
        })()}
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p dir="ltr" className="truncate text-xs text-muted-foreground text-start">{email}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
          role === "admin"
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : role === "ingenieur"
            ? "bg-purple-600 text-white"
            : "bg-secondary text-secondary-foreground"
        }`}>
          {role === "admin" ? <Shield className="h-3.5 w-3.5" /> : role === "ingenieur" ? <FlaskConical className="h-3.5 w-3.5" /> : <HardHat className="h-3.5 w-3.5" />}
          {role === "admin"
            ? isAr ? "مشرف" : "Admin"
            : role === "ingenieur"
              ? isAr ? "مهندس" : "Ingénieur"
              : isAr ? "منفذ" : "Exécutant"}
        </span>
      </section>

      {/* SÉLECTEUR DE RÔLE DIRECT & VISIBLE */}
      <section className="mb-4 rounded-2xl border bg-card p-4 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {isAr ? "تغيير الملف النشط" : "Changer de profil actif"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "بدّل فورياً بين الأدوار لتجربة التطبيق أو إدارة المزرعة"
                : "Basculez instantanément pour tester ou administrer la ferme"}
            </p>
          </div>
          <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {role === "admin"
              ? isAr ? "🛡️ وضع المشرف" : "🛡️ Mode Admin"
              : role === "ingenieur"
                ? isAr ? "🧪 وضع المهندس" : "🧪 Mode Ingénieur"
                : isAr ? "👷 وضع المنفذ" : "👷 Mode Exécutant"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              switchRole("admin");
              toast.success(isAr ? "تم تفعيل وضع المشرف" : "Mode Administrateur activé");
            }}
            className={`flex items-center justify-between sm:flex-col sm:items-start gap-2 p-3 rounded-xl border-2 text-start transition-all active:scale-95 cursor-pointer ${
              role === "admin"
                ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                : "border-border hover:border-primary/40 bg-background"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${role === "admin" ? "bg-slate-900 text-white" : "bg-muted text-muted-foreground"}`}>
                <Shield className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-xs">{isAr ? "المشرف / المدير" : "Administrateur"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? "صلاحيات كاملة وتسيير" : "Accès total & gestion"}
                </p>
              </div>
            </div>
            {role === "admin" && <Check className="h-4 w-4 text-primary shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => {
              switchRole("ingenieur");
              toast.success(isAr ? "تم تفعيل وضع المهندس" : "Mode Ingénieur activé");
            }}
            className={`flex items-center justify-between sm:flex-col sm:items-start gap-2 p-3 rounded-xl border-2 text-start transition-all active:scale-95 cursor-pointer ${
              role === "ingenieur"
                ? "border-purple-600 bg-purple-500/10 shadow-xs ring-2 ring-purple-600/20"
                : "border-border hover:border-purple-400 bg-background"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${role === "ingenieur" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}`}>
                <FlaskConical className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-xs">{isAr ? "مهندس فلاحي" : "Ingénieur"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? "التوصيات وأحوال الطقس" : "Recommandations & météo"}
                </p>
              </div>
            </div>
            {role === "ingenieur" && <Check className="h-4 w-4 text-purple-600 shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => {
              switchRole("executant");
              toast.success(isAr ? "تم تفعيل وضع المنفذ" : "Mode Exécutant activé");
            }}
            className={`flex items-center justify-between sm:flex-col sm:items-start gap-2 p-3 rounded-xl border-2 text-start transition-all active:scale-95 cursor-pointer ${
              role === "executant"
                ? "border-amber-600 bg-amber-500/10 shadow-xs ring-2 ring-amber-600/20"
                : "border-border hover:border-amber-400 bg-background"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${role === "executant" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}>
                <HardHat className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-xs">{isAr ? "منفذ" : "Exécutant"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? "المهام اليومية والري" : "Tâches quotidiennes & eau"}
                </p>
              </div>
            </div>
            {role === "executant" && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
          </button>
        </div>
      </section>

      <ul className="space-y-2">
        <li>
          <Link
            to="/utilisateurs"
            className="flex min-h-14 items-center justify-between rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 active:scale-95 hover:bg-primary/10 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-primary text-primary-foreground">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <span className="font-bold text-sm block">
                  {isAr ? "إدارة المستخدمين" : "Gestion des utilisateurs"}
                </span>
                <span className="text-xs text-muted-foreground block">
                  {isAr
                    ? "تعديل أسماء الدخول وكلمات المرور وأدوار فريق المزرعة"
                    : "Modifier les identifiants, mots de passe et rôles de la ferme"}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-primary shrink-0">
              {isAr ? "← فتح" : "Ouvrir →"}
            </span>
          </Link>
        </li>
        <li>
          <Link
            to="/configuration"
            className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-4 active:scale-95"
          >
            <Settings className="h-5 w-5" />
            <span className="font-semibold">
              {isAr ? "الإعدادات (المظهر، اللغة)" : "Configuration (apparence, langue)"}
            </span>
          </Link>
        </li>
        <li>
          <Link
            to="/donnees-en-attente"
            className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-4 active:scale-95"
          >
            <CloudOff className="h-5 w-5" />
            <span className="font-semibold">
              {isAr ? "البيانات قيد الانتظار والتعارضات" : "Données en attente & conflits"}
            </span>
          </Link>
        </li>
        {role !== "executant" && (
          <li>
            <button
              onClick={async () => {
                if (
                  !confirm(
                    isAr
                      ? "مسح كل السجل المحلي (الرش، المعالجات، الري، التسميد، الجني، الأعطال)؟ هذا الإجراء لا يمكن التراجع عنه."
                      : "Effacer tout l'historique local (pulvérisation, phytosanitaire, irrigation, fertilisation, récolte, anomalies) ? Cette action est irréversible.",
                  )
                )
                  return;
                try {
                  Object.keys(localStorage).forEach((key) => {
                    if (key.startsWith("doula-")) {
                      localStorage.removeItem(key);
                    }
                  });

                  await offlineDB.outbox.clear();
                  await offlineDB.photos_outbox.clear();
                  await offlineDB.conflict_log.clear();

                  toast.success(isAr ? "تم مسح السجل المحلي" : "Historique local effacé");
                  setTimeout(() => window.location.reload(), 600);
                } catch (err) {
                  console.error(err);
                  toast.error(isAr ? "تعذر مسح السجل المحلي" : "Impossible d'effacer l'historique");
                }
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive active:scale-95 cursor-pointer"
            >
              <Trash2 className="h-5 w-5" />
              <span className="font-semibold">
                {isAr ? "مسح كل السجل (المحلي)" : "Effacer tout l'historique (local)"}
              </span>
            </button>
          </li>
        )}
        {role === "admin" && (
          <li>
            <button
              onClick={() => {
                setConfirmText("");
                setResetOpen(true);
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-destructive/60 bg-destructive/15 p-4 text-destructive active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-5 w-5" />
              <span className="font-semibold text-start">
                {isAr ? "إعادة تعيين التطبيق" : "Réinitialiser l'application"}
                <span className="block text-xs font-normal opacity-80">
                  {isAr
                    ? "يحذف البرامج، الأعطال والتوصيات"
                    : "Supprime programmes, anomalies et recommandations"}
                </span>
              </span>
            </button>
          </li>
        )}
        <li>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive active:scale-95 cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-semibold">{isAr ? "تسجيل الخروج" : "Se déconnecter"}</span>
          </button>
        </li>
      </ul>

      <div className="mt-5">
        <CriticalNotificationsCard />
      </div>

      <Dialog open={resetOpen} onOpenChange={(o) => !resetting && setResetOpen(o)}>
        <DialogContent dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isAr ? "إعادة تعيين التطبيق" : "Réinitialiser l'application"}</DialogTitle>
            <DialogDescription>
              {isAr ? (
                <>
                  هذا الإجراء يحذف <strong>نهائياً</strong> جميع البرامج (مخطط القطعة، الرش،
                  الصحة النباتية، الري، التسميد، الجني)، وجميع الأعطال، ومهام المنفذين
                  والتوصيات. يتم الاحتفاظ بالقطع والأشجار والمستخدمين.
                  <br /><br />
                  للتأكيد، اكتب <strong>{confirmKeyword}</strong> أدناه.
                </>
              ) : (
                <>
                  Cette action supprime <strong>définitivement</strong> tous les programmes
                  (plan parcelle, pulvérisation, phytosanitaire, irrigation, fertilisation,
                  récolte), toutes les anomalies, toutes les tâches exécutants et toutes
                  les recommandations. Les parcelles, arbres et utilisateurs sont conservés.
                  <br /><br />
                  Pour confirmer, tapez <strong>{confirmKeyword}</strong> ci-dessous.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmKeyword}
            disabled={resetting}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              variant="destructive"
              onClick={doReset}
              disabled={confirmText.trim() !== confirmKeyword || resetting}
            >
              {resetting
                ? isAr ? "جاري إعادة التعيين…" : "Réinitialisation…"
                : isAr ? "إعادة تعيين" : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default ProfilPage;
