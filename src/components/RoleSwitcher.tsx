import { useNavigate } from "@/lib/router-compat";
import { useDisplayRole } from "@/lib/display-role";
import { useRole } from "@/lib/role";
import { Shield, HardHat, FlaskConical, Settings, LogOut } from "lucide-react";

export function RoleSwitcher() {
  const role = useDisplayRole();
  const { signOut } = useRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => navigate({ to: "/configuration" })}
        title="Profil actif (configuration)"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${role === "admin"
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : role === "ingenieur"
              ? "bg-purple-600 text-white"
              : "bg-muted text-foreground border"
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
      </button>

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