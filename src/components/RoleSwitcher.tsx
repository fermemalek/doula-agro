import { useNavigate } from "@/lib/router-compat";
import { useState } from "react";
import { useDisplayRole } from "@/lib/display-role";
import { useRole, type Role } from "@/lib/role";
import { Shield, HardHat, FlaskConical, Settings, LogOut, ChevronDown, Check, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function RoleSwitcher() {
  const role = useDisplayRole();
  const { signOut, switchRole } = useRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const handleSelectRole = (newRole: Role) => {
    switchRole(newRole);
    const roleLabels: Record<Role, string> = {
      admin: "Administrateur (Accès complet)",
      ingenieur: "Ingénieur Agronome",
      executant: "Exécutant Terrain",
    };
    toast.success(`Mode actif : ${roleLabels[newRole]}`);
    setOpen(false);
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Changer de profil actif"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all shadow-2xs border cursor-pointer ${
            role === "admin"
              ? "bg-slate-900 text-white border-slate-700 dark:bg-slate-100 dark:text-slate-900"
              : role === "ingenieur"
              ? "bg-purple-600 text-white border-purple-500"
              : "bg-muted text-foreground border-border hover:bg-muted/80"
          }`}
        >
          {role === "admin" ? (
            <>
              <Shield className="h-3.5 w-3.5" />
              <span>Admin</span>
            </>
          ) : role === "ingenieur" ? (
            <>
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Ingénieur</span>
            </>
          ) : (
            <>
              <HardHat className="h-3.5 w-3.5" />
              <span>Exécutant</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-70 ml-0.5" />
        </button>

        <button
          type="button"
          onClick={() => navigate({ to: "/configuration" })}
          title="Configuration"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <Settings className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          title="Se déconnecter"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold">Changer de profil actif</DialogTitle>
            <DialogDescription className="text-xs">
              Sélectionnez le mode de travail souhaité. Vous pouvez basculer à tout moment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleSelectRole("admin")}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all active:scale-95 cursor-pointer ${
                role === "admin"
                  ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-lg ${role === "admin" ? "bg-slate-900 text-white" : "bg-muted text-muted-foreground"}`}>
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-xs">Administrateur</p>
                  <p className="text-[11px] text-muted-foreground">Accès complet, gestion & validation</p>
                </div>
              </div>
              {role === "admin" && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole("ingenieur")}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all active:scale-95 cursor-pointer ${
                role === "ingenieur"
                  ? "border-purple-600 bg-purple-500/10 shadow-xs ring-2 ring-purple-600/20"
                  : "border-border hover:border-purple-400 bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-lg ${role === "ingenieur" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}`}>
                  <FlaskConical className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-xs">Ingénieur Agronome</p>
                  <p className="text-[11px] text-muted-foreground">Prescriptions agronomiques & météo</p>
                </div>
              </div>
              {role === "ingenieur" && <Check className="h-4 w-4 text-purple-600 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole("executant")}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all active:scale-95 cursor-pointer ${
                role === "executant"
                  ? "border-amber-600 bg-amber-500/10 shadow-xs ring-2 ring-amber-600/20"
                  : "border-border hover:border-amber-400 bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-lg ${role === "executant" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}>
                  <HardHat className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-xs">Exécutant Terrain</p>
                  <p className="text-[11px] text-muted-foreground">Exécution des tâches & arrosage</p>
                </div>
              </div>
              {role === "executant" && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
            </button>
          </div>

          <div className="pt-2 border-t mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate({ to: "/utilisateurs" });
              }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Gérer les comptes utilisateurs</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate({ to: "/configuration" });
              }}
              className="text-xs text-muted-foreground hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Paramètres</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}