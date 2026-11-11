import { useNavigate } from "@/lib/router-compat";
import { useDisplayRole } from "@/lib/display-role";
import { useRole, type Role } from "@/lib/role";
import { Shield, HardHat, FlaskConical, Settings, LogOut, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function RoleSwitcher() {
  const role = useDisplayRole();
  const { signOut, switchRole } = useRole();
  const navigate = useNavigate();

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
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Changer de rôle actif"
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
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1 text-xs">
          <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase px-2 py-1">
            Changer de profil actif
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleSelectRole("admin")}
            className="flex items-center justify-between cursor-pointer py-1.5 px-2"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-800 dark:text-slate-200" />
              <div className="text-left">
                <span className="font-bold block">Administrateur</span>
                <span className="text-[10px] text-muted-foreground block">Accès complet, gestion & validation</span>
              </div>
            </div>
            {role === "admin" && <Check className="h-4 w-4 text-primary shrink-0" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSelectRole("ingenieur")}
            className="flex items-center justify-between cursor-pointer py-1.5 px-2"
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-purple-600" />
              <div className="text-left">
                <span className="font-bold block">Ingénieur Agronome</span>
                <span className="text-[10px] text-muted-foreground block">Prescriptions & recommandations</span>
              </div>
            </div>
            {role === "ingenieur" && <Check className="h-4 w-4 text-primary shrink-0" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSelectRole("executant")}
            className="flex items-center justify-between cursor-pointer py-1.5 px-2"
          >
            <div className="flex items-center gap-2">
              <HardHat className="h-4 w-4 text-amber-600" />
              <div className="text-left">
                <span className="font-bold block">Exécutant Terrain</span>
                <span className="text-[10px] text-muted-foreground block">Exécution des tâches & irrigation</span>
              </div>
            </div>
            {role === "executant" && <Check className="h-4 w-4 text-primary shrink-0" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate({ to: "/configuration" })}
            className="cursor-pointer text-[11px] text-muted-foreground py-1.5 px-2"
          >
            <Settings className="h-3.5 w-3.5 mr-2" />
            <span>Paramètres de l'application</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={() => navigate({ to: "/configuration" })}
        title="Configuration"
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Settings className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleLogout}
        title="Se déconnecter"
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}