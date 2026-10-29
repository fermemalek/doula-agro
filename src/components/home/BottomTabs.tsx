import { Link } from "@/lib/router-compat";
import { Home, Map, Plus, History, BellRing, User, ListTodo, Wrench, Lightbulb, CalendarRange } from "lucide-react";
import { useDisplayRole } from "@/lib/display-role";
import { useTranslation } from "@/lib/i18n";

export function BottomTabs() {
  const role = useDisplayRole();
  const { t } = useTranslation();

  const ADMIN_TABS = [
    { to: "/", label: t("tabs.home", "Accueil"), icon: Home },
    { to: "/programmes", label: t("tabs.programs", "Programmes"), icon: CalendarRange },
    { to: "/tache", label: t("tabs.tasks", "Tâche"), icon: ListTodo },
    { to: "/maintenance", label: t("tabs.maintenance", "Maintenance"), icon: Wrench },
    { to: "/profil", label: t("tabs.profile", "Profil"), icon: User },
  ] as const;

  const EXEC_TABS = [
    { to: "/", label: t("tabs.today", "Aujourd'hui"), icon: Home },
    { to: "/parcelles", label: t("tabs.parcels", "Parcelles"), icon: Map },
    { to: "/historique", label: t("tabs.history", "Historique"), icon: History },
    { to: "/rappels", label: t("tabs.reminders", "Rappels"), icon: BellRing },
    { to: "/profil", label: t("tabs.profile", "Profil"), icon: User },
  ] as const;

  const INGE_TABS = [
    { to: "/", label: t("tabs.home", "Accueil"), icon: Home },
    { to: "/recommandations", label: t("tabs.recos", "Recos"), icon: Lightbulb },
    { to: "/profil", label: t("tabs.profile", "Profil"), icon: User },
  ] as const;

  if (role === "admin") {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <ul className="mx-auto flex max-w-3xl">
          {ADMIN_TABS.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{
                  className:
                    "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-primary border-t-2 border-primary -mt-px",
                }}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  if (role === "ingenieur") {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <ul className="mx-auto flex max-w-3xl">
          {INGE_TABS.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{
                  className:
                    "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-primary border-t-2 border-primary -mt-px",
                }}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  // Executant: 5 normal tabs + central elevated red "+" Anomalie
  const left = EXEC_TABS.slice(0, 2);
  const right = EXEC_TABS.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <ul className="mx-auto flex max-w-3xl items-end">
        {left.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{
                className:
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-primary border-t-2 border-primary -mt-px",
              }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}
        <li className="flex flex-1 justify-center">
          <Link
            to="/anomalie"
            className="-mt-6 flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full bg-destructive text-destructive-foreground shadow-lg ring-4 ring-card transition-transform active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={3} />
            <span className="text-[10px] font-semibold leading-none">{t("home.anomalie", "Anomalie")}</span>
          </Link>
        </li>
        {right.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{
                className:
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-primary border-t-2 border-primary -mt-px",
              }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
