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
import { Droplet, Sprout, TrendingUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

function HomePage() {
  const role = useDisplayRole();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Arabe uniquement pour l'Ingénieur, Français automatique pour Admin et Exécutant
  useEffect(() => {
    saveConfig({ lang: role === "ingenieur" ? "ar" : "fr" });
  }, [role]);

  if (role === "executant") return <TodayView />;
  if (role === "ingenieur") return <IngenieurHome />;

  // Admin homepage dashboard to view parcels and manage programs!
  return (
    <main className="mx-auto max-w-3xl px-4 pt-4">
      <h1 className="sr-only">Doula Agro — Accueil</h1>
      <div className="mb-3 flex justify-end">
        <RoleSwitcher />
      </div>
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