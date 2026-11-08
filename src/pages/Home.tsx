import { useEffect } from "react";
import { WeatherBlock } from "@/components/home/WeatherBlock";
import { NextIrrigationBlock } from "@/components/home/NextIrrigationBlock";
import { ParcelWheel } from "@/components/home/ParcelWheel";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { TodayView } from "@/components/executant/TodayView";
import { IngenieurHome } from "@/components/ingenieur/IngenieurHome";
import { useDisplayRole } from "@/lib/display-role";
import { saveConfig } from "@/lib/config-store";
import { useMyAssignedTasks } from "@/lib/cloud/tasks";

function HomePage() {
  const role = useDisplayRole();
  const { matchedMemberName } = useMyAssignedTasks();

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
      <div className="mb-3 flex items-center justify-between">
        {matchedMemberName ? (
          <p className="text-xs font-semibold text-muted-foreground">
            Connecté : <span className="text-foreground font-bold">{matchedMemberName}</span> (Admin)
          </p>
        ) : (
          <span />
        )}
        <RoleSwitcher />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WeatherBlock />
        <NextIrrigationBlock />
      </div>

      <section className="mt-6">
        <ParcelWheel />
      </section>
    </main>
  );
}

export default HomePage;
