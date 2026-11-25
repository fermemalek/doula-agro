import { useEffect } from "react";
import { WeatherBlock } from "@/components/home/WeatherBlock";
import { NextIrrigationBlock } from "@/components/home/NextIrrigationBlock";
import { ParcelWheel } from "@/components/home/ParcelWheel";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { TodayView } from "@/components/executant/TodayView";
import { IngenieurHome } from "@/components/ingenieur/IngenieurHome";
import { useDisplayRole } from "@/lib/display-role";
import { useRole } from "@/lib/role";
import { saveConfig, useConfig } from "@/lib/config-store";
import { useMyAssignedTasks } from "@/lib/cloud/tasks";
import { getUserAvatar, getUserInitials } from "@/lib/avatars";

function HomePage() {
  const role = useDisplayRole();
  const { session } = useRole();
  const cfg = useConfig();
  const currentLang = cfg.lang || "fr";
  const { matchedMemberName } = useMyAssignedTasks();
  const displayName =
    matchedMemberName ||
    (session?.user?.user_metadata?.full_name as string)?.trim() ||
    (session?.user?.email ? session.user.email.split("@")[0] : "");
  const adminAvatar = getUserAvatar({
    name: displayName,
    email: session?.user?.email,
    fullName: session?.user?.user_metadata?.full_name as string | undefined,
  });

  // Arabe par défaut pour l'Ingénieur, Français par défaut pour Exécutant (Admin libre de basculer FR/AR)
  useEffect(() => {
    if (role === "ingenieur") saveConfig({ lang: "ar" });
    else if (role === "executant") saveConfig({ lang: "fr" });
  }, [role]);

  if (role === "executant") return <TodayView />;
  if (role === "ingenieur") return <IngenieurHome />;

  // Admin homepage dashboard to view parcels and manage programs!
  return (
    <main className="mx-auto max-w-3xl px-4 pt-4">
      <h1 className="sr-only">Doula Agro — Accueil</h1>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {displayName ? (
          <div className="flex items-center gap-2">
            {adminAvatar ? (
              <img
                src={adminAvatar}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/30 shrink-0"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-black text-primary shrink-0">
                {getUserInitials(displayName)}
              </span>
            )}
            <p className="text-xs font-semibold text-muted-foreground">
              Connecté : <span className="text-foreground font-bold">{displayName}</span> (Admin)
            </p>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted p-0.5 text-xs">
            <button
              type="button"
              onClick={() => saveConfig({ lang: "fr" })}
              className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${currentLang === "fr" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => saveConfig({ lang: "ar" })}
              className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${currentLang === "ar" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
            >
              AR
            </button>
          </div>
          <RoleSwitcher />
        </div>
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
