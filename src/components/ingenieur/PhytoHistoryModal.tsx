import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecommendations, type Recommendation, type CropGroup } from "@/lib/cloud/recommendations";
import { useAllModuleRecords } from "@/lib/modules-store";
import { useTranslation } from "@/lib/i18n";
import { History, ShieldAlert, AlertTriangle, CheckCircle2, Filter, Search, Calendar, Sparkles } from "lucide-react";

export const PHYTO_ACTIVE_SUBSTANCES: Record<string, string> = {
  calypso: "Thiaclopride / ثياكلوبريد",
  sivento: "Flupyradifurone / فلوبيراديفورون",
  verlan: "Abamectine / أبامكتين",
  bellis: "Pyraclostrobine + Boscalid / بيراكلوستروبين + بوسكاليد",
  erlan: "Acétamipride / أسيتامبريد",
  "sherpa 25 ec": "Cyperméthrine / سيبيرمثرين",
  "decis expert": "Deltaméthrine / دلتامثرين",
  decis: "Deltaméthrine / دلتامثرين",
  acetaplan: "Acétamipride / أسيتامبريد",
  amistar: "Azoxystrobine / أزوكسيستروبين",
  "azostar 325sc": "Azoxystrobine + Difénoconazole / أزوكسيستروبين + ديفينوكونازول",
  azostar: "Azoxystrobine + Difénoconazole / أزوكسيستروبين + ديفينوكونازول",
  zorro: "Abamectine / أبامكتين",
  "fosetyl aluminium": "Fosétyl-Aluminium / فوسيتيل الألومنيوم",
  fosetyl: "Fosétyl-Aluminium / فوسيتيل الألومنيوم",
  luna: "Fluopyram + Tébuconazole / فلوبيرام + تيبوكونازول",
  criptan: "Captane / كابتان",
  extrachim: "Matières diverses / مواد متنوعة",
  rustilan: "Acétamipride / أسيتامبريد",
  tachigazol: "Hymexazol / هيمكسازول",
  phytocap: "Captane / كابتان",
  captane: "Captane / كابتان",
  cuivre: "Sulfate de cuivre / كبريتات النحاس",
  bouillie: "Sulfate de cuivre / كبريتات النحاس",
  soufre: "Soufre micronisé / كبريت ميكروني",
  thiamethoxam: "Thiaméthoxame / ثياميثوكسام",
};

export function resolveActiveSubstance(prodName: string): string {
  if (!prodName) return "—";
  const clean = prodName.trim().toLowerCase();
  for (const [key, val] of Object.entries(PHYTO_ACTIVE_SUBSTANCES)) {
    if (clean.includes(key)) return val;
  }
  return prodName;
}

export interface PhytoHistoryEntry {
  id: string;
  date: string;
  year: string;
  month: string;
  period?: "matin" | "soir";
  productName: string;
  activeSubstance: string;
  cible: string;
  dosage: string;
  volume: string;
  cropLabel: string;
  status: string;
}

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MONTH_NAMES_AR = [
  "جانفي (يناير)", "فيفري (فبراير)", "مارس", "أفريل (أبريل)", "ماي (مايو)", "جوان (يونيو)",
  "جويلية (يوليو)", "أوت (أغسطس)", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export function PhytoHistoryModal({
  open,
  onOpenChange,
  currentCrops = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCrops?: CropGroup[];
}) {
  const { t, lang } = useTranslation();
  const isAr = lang === "ar";

  const { data: recos = [] } = useRecommendations();
  const modulePhytoRecords = useAllModuleRecords("phytosanitaire");

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedActive, setSelectedActive] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Agréger tous les traitements phytosanitaires passés
  const allTreatments = useMemo(() => {
    const list: PhytoHistoryEntry[] = [];
    const seen = new Set<string>();

    // 1. Depuis les recommandations phytosanitaires
    for (const r of recos) {
      if (r.kind !== "phytosanitaire") continue;
      const payload = (r.payload || {}) as any;
      const prog = payload.program || {};
      const date = prog.date || r.created_at.slice(0, 10);
      const year = date.slice(0, 4);
      const month = date.slice(5, 7);
      const period = prog.period as "matin" | "soir" | undefined;
      const cropList = Array.isArray(payload.crop_group)
        ? payload.crop_group
        : payload.crop_group
        ? [payload.crop_group]
        : [];
      const cropLabel = cropList.map((c: string) => t(`crop.${c}`, c)).join(", ");

      const prods = Array.isArray(prog.products) ? prog.products : [];
      for (let i = 0; i < prods.length; i++) {
        const p = prods[i];
        if (!p || !p.product) continue;
        const key = `${date}|${p.product}|${p.cible || ""}|${cropLabel}`;
        if (seen.has(key)) continue;
        seen.add(key);

        list.push({
          id: `reco-${r.id}-${i}`,
          date,
          year,
          month,
          period,
          productName: p.product,
          activeSubstance: resolveActiveSubstance(p.product),
          cible: p.cible || "—",
          dosage: p.dosage || "—",
          volume: p.volume || "1000",
          cropLabel: cropLabel || "Ferme",
          status: r.status === "acceptee" ? (isAr ? "منفذ / مقبول" : "Exécuté") : (isAr ? "موصى به" : "Recommandé"),
        });
      }
    }

    // 2. Depuis les enregistrements modules locaux/cloud
    for (const m of modulePhytoRecords) {
      const p = m as any;
      const date = p.date || p.scheduled_at?.slice(0, 10) || "";
      if (!date) continue;
      const year = date.slice(0, 4);
      const month = date.slice(5, 7);
      const prods = Array.isArray(p.products) ? p.products : p.product ? [p] : [];

      for (let i = 0; i < prods.length; i++) {
        const prod = prods[i];
        const prodName = prod.product || prod.name;
        if (!prodName) continue;
        const key = `${date}|${prodName}|${prod.cible || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);

        list.push({
          id: `mod-${m.parcelId || ""}-${i}-${date}`,
          date,
          year,
          month,
          period: p.period,
          productName: prodName,
          activeSubstance: resolveActiveSubstance(prodName),
          cible: prod.cible || "—",
          dosage: prod.dosage || "—",
          volume: prod.volume || "1000",
          cropLabel: p.parcelId ? `Parcelle ${p.parcelId}` : "Ferme",
          status: isAr ? "منفذ" : "Exécuté",
        });
      }
    }

    // Tri décroissant par date
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [recos, modulePhytoRecords, isAr, t]);

  // Années et matières actives uniques
  const availableYears = useMemo(() => {
    const s = new Set<string>();
    allTreatments.forEach((t) => s.add(t.year));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [allTreatments]);

  const availableActives = useMemo(() => {
    const s = new Set<string>();
    allTreatments.forEach((t) => s.add(t.activeSubstance));
    return Array.from(s).sort();
  }, [allTreatments]);

  // Fréquence d'utilisation par matière active sur l'année choisie (ou l'année en cours)
  const currentYearRef = selectedYear !== "all" ? selectedYear : new Date().getFullYear().toString();
  const activeUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allTreatments) {
      if (item.year === currentYearRef) {
        counts[item.activeSubstance] = (counts[item.activeSubstance] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allTreatments, currentYearRef]);

  // Filtrage
  const filteredTreatments = useMemo(() => {
    return allTreatments.filter((item) => {
      if (selectedYear !== "all" && item.year !== selectedYear) return false;
      if (selectedMonth !== "all" && item.month !== selectedMonth) return false;
      if (selectedActive !== "all" && item.activeSubstance !== selectedActive) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          item.productName.toLowerCase().includes(q) ||
          item.activeSubstance.toLowerCase().includes(q) ||
          item.cible.toLowerCase().includes(q) ||
          item.cropLabel.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allTreatments, selectedYear, selectedMonth, selectedActive, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-card text-card-foreground">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-black text-primary">
              <History className="h-5 w-5 text-primary" />
              {t("reco.phyto.historyTitle", "Historique Phyto & Rotation des Matières Actives")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t(
              "reco.phyto.historyDesc",
              "Consultez les traitements passés pour assurer la rotation des matières actives et éviter les résistances."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Bloc Vigilance et Résumé de Rotation des Matières Actives */}
          <div className="rounded-2xl border bg-muted/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                {t("reco.phyto.activeUsage", "Utilisation des matières actives")} ({currentYearRef})
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold">
                {isAr ? "لتفادي تكرار نفس المادة" : "Prévention des résistances"}
              </span>
            </div>

            {activeUsageCounts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {isAr ? "لا توجد معاملات مسجلة لهذه السنة." : "Aucun traitement enregistré pour cette année."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeUsageCounts.map(([activeName, count]) => {
                  const isHigh = count >= 3;
                  const isMedium = count === 2;
                  return (
                    <div
                      key={activeName}
                      onClick={() => setSelectedActive(selectedActive === activeName ? "all" : activeName)}
                      className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                        selectedActive === activeName
                          ? "ring-2 ring-primary border-primary bg-primary/10"
                          : isHigh
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                          : isMedium
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {isHigh ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 animate-pulse" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span>{activeName}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                          isHigh
                            ? "bg-rose-600 text-white"
                            : isMedium
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}×
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filtres par Année, Mois, Matière Active et Recherche */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                {t("reco.phyto.filterYear", "Année")}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="all">{t("reco.phyto.allYears", "Toutes les années")}</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                {t("reco.phyto.filterMonth", "Mois")}
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="all">{t("reco.phyto.allMonths", "Tous les mois")}</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const mStr = (i + 1).toString().padStart(2, "0");
                  const label = isAr ? MONTH_NAMES_AR[i] : MONTH_NAMES_FR[i];
                  return (
                    <option key={mStr} value={mStr}>
                      {mStr} - {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                {t("reco.phyto.filterActive", "Matière active")}
              </label>
              <select
                value={selectedActive}
                onChange={(e) => setSelectedActive(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold truncate"
              >
                <option value="all">{t("reco.phyto.allActives", "Toutes les matières actives")}</option>
                {availableActives.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                {isAr ? "بحث سريع" : "Recherche"}
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={isAr ? "منتج أو آفة..." : "Produit, cible..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs font-medium rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Liste des traitements triée */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
              <span>
                {filteredTreatments.length} {isAr ? "معاملة مطابقة" : "traitement(s) trouvé(s)"}
              </span>
              {(selectedYear !== "all" || selectedMonth !== "all" || selectedActive !== "all" || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear("all");
                    setSelectedMonth("all");
                    setSelectedActive("all");
                    setSearchTerm("");
                  }}
                  className="text-primary hover:underline font-bold text-[11px]"
                >
                  {isAr ? "إعادة تعيين الفلاتر" : "Réinitialiser les filtres"}
                </button>
              )}
            </div>

            {filteredTreatments.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground text-xs">
                {t("reco.phyto.noHistory", "Aucun traitement phytosanitaire enregistré.")}
              </div>
            ) : (
              <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                {filteredTreatments.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border bg-card p-3 shadow-xs hover:border-primary/40 transition-all space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-bold text-xs text-foreground bg-muted px-2 py-0.5 rounded-lg">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {item.date}
                        </span>
                        {item.period && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                            {item.period === "soir" ? "🌙 Soir / مساءً" : "🌅 Matin / صباحاً"}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          {item.cropLabel}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="font-bold text-primary flex items-center gap-1.5">
                          <span>{item.productName}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-semibold">{isAr ? "المادة الفعالة : " : "Matière active : "}</span>
                          <span className="text-foreground font-bold">{item.activeSubstance}</span>
                        </div>
                      </div>

                      <div className="text-[11px] space-y-0.5 sm:text-right">
                        <div>
                          <span className="text-muted-foreground">{isAr ? "الهدف : " : "Cible : "}</span>
                          <span className="font-semibold text-foreground">{item.cible}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isAr ? "الجرعة : " : "Dosage : "}</span>
                          <span className="font-semibold text-foreground">
                            {item.dosage} ({item.volume} L)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            {isAr ? "إغلاق" : "Fermer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

