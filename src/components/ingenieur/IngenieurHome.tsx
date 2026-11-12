import { useEffect, useMemo, useState } from "react";
import { Plus, Droplet, FlaskConical, Sprout, CloudSun, ArrowRight, SprayCan, Copy, RotateCcw } from "lucide-react";
import { useParcels } from "@/lib/parcel-store";
import { getTargetParcelsForReco } from "@/lib/stock-alerts";
import { useNavigate } from "@/lib/router-compat";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useRecommendations, useRecommendationActions, type Recommendation } from "@/lib/cloud/recommendations";
import { useRole } from "@/lib/role";
import { RecommendationForm } from "@/components/ingenieur/RecommendationForm";
import { RecommendationDetailDialog } from "@/components/RecommendationDetailDialog";
import { useAllModuleRecords } from "@/lib/modules-store";
import { useConfig, saveConfig } from "@/lib/config-store";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

export function IngenieurHome() {
  const navigate = useNavigate();
  const { userId } = useRole();
  const { data: recos = [] } = useRecommendations();
  const parcels = useParcels();
  const [formOpen, setFormOpen] = useState(false);
  const [editingReco, setEditingReco] = useState<Recommendation | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { resetAllToPending } = useRecommendationActions();

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
    () => (recos.some((r) => r.created_by === userId) ? recos.filter((r) => r.created_by === userId) : recos),
    [recos, userId],
  );

  const pendingCount = useMemo(() => {
    return mine.filter((r) => r.status === "envoyee" || !r.status).length;
  }, [mine]);

  const executedCount = useMemo(() => {
    return mine.filter((r) => r.status === "acceptee" || r.status === "transferee").length;
  }, [mine]);

  const cfg = useConfig();
  const currentLang = cfg.lang || "ar";
  const { t } = useTranslation();

  const toggleLanguage = (lang: "fr" | "ar") => {
    saveConfig({ lang });
  };

  const handleResetAllToPending = async () => {
    if (!window.confirm(
      currentLang === "ar"
        ? "هل أنت متأكد من إعادة تعيين جميع التوصيات إلى «قيد الانتظار» للبدء من جديد والتأكيد واحدة تلو الأخرى؟"
        : "Voulez-vous vraiment remettre TOUTES les recommandations en attente pour recommencer la validation pas à pas ?"
    )) return;
    setResetting(true);
    try {
      await resetAllToPending.mutateAsync();
      toast.success(
        currentLang === "ar"
          ? "تمت إعادة تعيين جميع التوصيات إلى «قيد الانتظار» بنجاح!"
          : "Toutes les recommandations sont désormais en attente !"
      );
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la réinitialisation");
    } finally {
      setResetting(false);
    }
  };

  const getRecoStatusInfo = (r: Recommendation) => {
    if (r.status === "acceptee" || r.status === "transferee") {
      const matchingProgs = allPrograms.filter(p => p.reco_id === r.id || p.payload?.reco_id === r.id);
      if (matchingProgs.length > 0) {
        const allExecuted = matchingProgs.every(p => p.status === "execute" || p.executedAt !== undefined || p.executed_at !== null);
        if (allExecuted) {
          return { label: currentLang === "ar" ? "مقبول (منفذ)" : "Accepté (Exécuté)", tone: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 font-bold" };
        }
      }
      return { label: currentLang === "ar" ? "مقبول" : "Accepté", tone: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 font-bold" };
    }
    if (r.status === "rejetee") {
      return { label: currentLang === "ar" ? "مرفوض" : "Rejeté", tone: "border-destructive/30 bg-destructive/5 text-destructive font-bold" };
    }
    return { label: currentLang === "ar" ? "قيد الانتظار" : "En attente", tone: "border-blue-500/30 bg-blue-500/5 text-blue-700 font-bold" };
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
        type="button"
        onClick={handleResetAllToPending}
        disabled={resetting}
        className="mt-2.5 w-full py-2.5 px-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
      >
        <RotateCcw className={`h-4 w-4 text-amber-700 ${resetting ? "animate-spin" : ""}`} />
        <span>
          {currentLang === "ar"
            ? "🔄 إعادة تعيين جميع التوصيات إلى «قيد الانتظار» (68 قيد الانتظار · 0 مقبولة)"
            : "🔄 Remettre toutes les recommandations en attente (68 en attente · 0 acceptée)"}
        </span>
      </button>

      {/* Raccourci Météo & Climat */}
      <button
        type="button"
        onClick={() => navigate({ to: "/meteo" })}
        className="mt-3 w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-sky-500/10 via-amber-500/10 to-emerald-500/10 border border-sky-500/30 hover:border-sky-500/60 transition shadow-xs group text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0">
            <CloudSun className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-foreground">
                {currentLang === "ar" ? "أحوال الطقس والمناخ الفلاحي" : "Météo agricole & Climat"}
              </p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-700">
                {currentLang === "ar" ? "عين وسارة" : "Ain Oussera"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {currentLang === "ar"
                ? "توقعات حية، الدليل الشهري، وتنبيه درجات الحرارة القصوى"
                : "Prévisions directes, guide 12 mois & alerte température max"}
            </p>
          </div>
        </div>
        <div className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform rtl:rotate-180">
          <ArrowRight className="h-4 w-4" />
        </div>
      </button>

      <button
        onClick={() => {
          setEditingReco(null);
          setIsDuplicate(false);
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
              const isPulv = r.payload?.method === "pulverisation" || (r.payload?.program as any)?.kind === "pulverisation";
              const isPhyto = r.kind === "phytosanitaire";
              const Icon = isPhyto ? FlaskConical : isPulv ? SprayCan : Droplet;
              const statusInfo = getRecoStatusInfo(r);
              const targetParcels = getTargetParcelsForReco(r, parcels);
              const parcelCount = targetParcels.length;

              const typeLabel = isPhyto
                ? (currentLang === "ar" ? "الصحة النباتية (معالجة)" : "Phytosanitaire")
                : isPulv
                  ? (currentLang === "ar" ? "رش ورقي (تسميد)" : "Pulvérisation foliaire")
                  : (currentLang === "ar" ? "تسميد عبر الري" : "Fertilisation (Irrigation)");

              const parcelLabel = currentLang === "ar"
                ? `${parcelCount} ${parcelCount > 10 ? "قطعة" : parcelCount >= 3 ? "قطع" : parcelCount === 2 ? "قطعتان" : parcelCount === 1 ? "قطعة واحدة" : "0 قطعة"}`
                : `${parcelCount} parcelle${parcelCount > 1 ? "s" : ""}`;

              return (
                <li
                  key={r.id}
                  onClick={() => {
                    setEditingReco(r);
                    setIsDuplicate(false);
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
                      {typeLabel} · {parcelLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      title={currentLang === "ar" ? "نسخ هذه التوصية" : "Dupliquer cette recommandation"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingReco(r);
                        setIsDuplicate(true);
                        setFormOpen(true);
                      }}
                      className="inline-flex h-7 px-2 items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold active:scale-90 transition"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{currentLang === "ar" ? "نسخ" : "Dupliquer"}</span>
                    </button>
                    <span className="rounded-full border bg-background/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                      {statusInfo.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RecommendationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        recoToEdit={editingReco}
        isDuplicate={isDuplicate}
      />
    </main>
  );
}