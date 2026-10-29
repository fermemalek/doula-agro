import { useEffect, useMemo, useState } from "react";
import { Plus, Droplet, FlaskConical, Sprout } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useRecommendations, type Recommendation } from "@/lib/cloud/recommendations";
import { useRole } from "@/lib/role";
import { RecommendationForm } from "@/components/ingenieur/RecommendationForm";
import { RecommendationDetailDialog } from "@/components/RecommendationDetailDialog";
import { useAllModuleRecords } from "@/lib/modules-store";
import { useConfig, saveConfig } from "@/lib/config-store";
import { useTranslation } from "@/lib/i18n";

export function IngenieurHome() {
  const navigate = useNavigate();
  const { userId } = useRole();
  const { data: recos = [] } = useRecommendations();
  const [formOpen, setFormOpen] = useState(false);
  const [editingReco, setEditingReco] = useState<Recommendation | null>(null);

  // Passer automatiquement l'interface en Arabe dès l'ouverture de l'espace Ingénieur
  useEffect(() => {
    saveConfig({ lang: "ar" });
  }, []);

  const localIrr = useAllModuleRecords("irrigation");
  const localFert = useAllModuleRecords("fertilisation");
  const localPulv = useAllModuleRecords("pulverisation");
  const localPhy = useAllModuleRecords("phytosanitaire");

  const allPrograms = useMemo(() => {
    return [...localIrr, ...localFert, ...localPulv, ...localPhy];
  }, [localIrr, localFert, localPulv, localPhy]);

  const mine = useMemo(
    () => recos.filter((r) => r.created_by === userId),
    [recos, userId],
  );

  const pendingCount = useMemo(() => {
    let count = 0;
    for (const r of mine) {
      if (r.status === "envoyee" || r.status === "rejetee") {
        count++;
      } else if (r.status === "acceptee" || r.status === "transferee") {
        const matchingProgs = allPrograms.filter(p => p.reco_id === r.id || p.payload?.reco_id === r.id);
        if (matchingProgs.length > 0) {
          const hasUnexecuted = matchingProgs.some(p => p.status !== "execute" && p.executedAt === undefined && p.executed_at === null);
          if (hasUnexecuted) {
            count++;
          }
        }
      }
    }
    return count;
  }, [mine, allPrograms]);

  const executedCount = useMemo(() => {
    let count = 0;
    for (const r of mine) {
      if (r.status === "acceptee" || r.status === "transferee") {
        const matchingProgs = allPrograms.filter(p => p.reco_id === r.id || p.payload?.reco_id === r.id);
        if (matchingProgs.length > 0) {
          const allExecuted = matchingProgs.every(p => p.status === "execute" || p.executedAt !== undefined || p.executed_at !== null);
          if (allExecuted) {
            count++;
          }
        } else {
          count++;
        }
      }
    }
    return count;
  }, [mine, allPrograms]);

  const cfg = useConfig();
  const currentLang = cfg.lang || "ar";
  const { t } = useTranslation();

  const toggleLanguage = (lang: "fr" | "ar") => {
    saveConfig({ lang });
  };

  const getRecoStatusInfo = (r: Recommendation) => {
    const matchingProgs = allPrograms.filter(p => p.reco_id === r.id || p.payload?.reco_id === r.id);
    if (matchingProgs.length > 0) {
      const allExecuted = matchingProgs.every(p => p.status === "execute" || p.executedAt !== undefined || p.executed_at !== null);
      if (allExecuted) {
        return { label: currentLang === "ar" ? "مقبول" : "Accepté", tone: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700" };
      }
    }
    return { label: currentLang === "ar" ? "قيد الانتظار" : "En attente", tone: "border-blue-500/30 bg-blue-500/5 text-blue-700" };
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("eng.title", "Espace ingénieur")}</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-muted p-0.5 text-xs">
            <button
              onClick={() => toggleLanguage("fr")}
              className={`px-2 py-1 rounded-md font-semibold ${currentLang === "fr" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
            >
              FR
            </button>
            <button
              onClick={() => toggleLanguage("ar")}
              className={`px-2 py-1 rounded-md font-semibold ${currentLang === "ar" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
            >
              AR
            </button>
          </div>
          <RoleSwitcher />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3.5 text-center shadow-xs">
          <p className="text-2xl font-black text-blue-700">{pendingCount}</p>
          <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wide mt-0.5">{t("eng.pending", "En attente")}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-center shadow-xs">
          <p className="text-2xl font-black text-emerald-700">{executedCount}</p>
          <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wide mt-0.5">{t("eng.accepted", "Acceptés (Exécutés)")}</p>
        </div>
      </div>

      <button
        onClick={() => {
          setEditingReco(null);
          setFormOpen(true);
        }}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold uppercase text-primary-foreground active:scale-95 shadow-sm hover:opacity-95 transition-all"
      >
        <Plus className="h-5 w-5" /> {t("eng.newReco", "Nouvelle recommandation")}
      </button>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("eng.myRecos", "Mes recommandations")}</h2>
          <button
            onClick={() => navigate({ to: "/recommandations" })}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("eng.seeAll", "Tout voir →")}
          </button>
        </div>
        {mine.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("eng.noReco", "Aucune recommandation envoyée pour l'instant.")}
          </p>
        ) : (
          <ul className="space-y-2">
            {mine.slice(0, 6).map((r) => {
              const Icon =
                r.kind === "irrigation"
                  ? Droplet
                  : r.kind === "phytosanitaire"
                    ? FlaskConical
                    : Sprout;
              const statusInfo = getRecoStatusInfo(r);
              return (
                <li
                  key={r.id}
                  onClick={() => {
                    setEditingReco(r);
                    setFormOpen(true);
                  }}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition hover:opacity-90 ${statusInfo.tone}`}
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">{r.title}</p>
                    <p className="text-xs opacity-80 text-left">
                      {r.kind === "irrigation"
                        ? t("eng.irrigation", "Irrigation")
                        : r.kind === "phytosanitaire"
                          ? t("eng.phytosanitaire", "Phytosanitaire")
                          : t("eng.fertilisation", "Fertilisation")}{" "}
                      ·{" "}
                      {r.parcel_ids.length} {currentLang === "ar" ? "قطعة" : `parcelle${r.parcel_ids.length > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <span className="rounded-full border bg-background/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                    {statusInfo.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RecommendationForm open={formOpen} onOpenChange={setFormOpen} recoToEdit={editingReco} />
    </main>
  );
}