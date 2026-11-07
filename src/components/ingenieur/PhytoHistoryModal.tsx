import React, { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  useRecommendations, 
  useRecommendationActions, 
  type Recommendation, 
  type CropGroup 
} from "@/lib/cloud/recommendations";
import { useAllModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcels } from "@/lib/parcel-store";
import { useTranslation } from "@/lib/i18n";
import { 
  History, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Search, 
  Calendar, 
  Sparkles, 
  Trash2, 
  Sprout 
} from "lucide-react";

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
  rawKey: string;
  sourceType: "reco" | "module";
  recoId?: string;
  moduleRecordId?: string;
  parcelId?: string;
  date: string;
  year: string;
  month: string;
  period?: "matin" | "soir";
  productName: string;
  activeSubstance: string;
  cible: string;
  dosage: string;
  volume: string;
  cropKey: string;
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

function normalizeCropKey(raw?: string): string {
  if (!raw) return "all";
  const r = raw.toLowerCase();
  if (r.includes("oliv")) return "olivier";
  if (r.includes("pomm") || r.includes("apple")) return "pommier";
  if (r.includes("nectar")) return "nectarine";
  if (r.includes("pech") || r.includes("pêch")) return "nectarine";
  return r;
}

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

  const parcels = useParcels();
  const { data: recos = [] } = useRecommendations();
  const { remove: removeReco } = useRecommendationActions();
  const modulePhytoRecords = useAllModuleRecords("phytosanitaire");
  const { remove: removeModuleRecord } = useModuleActions();

  // Déterminer la culture active de départ (ex: 'olivier' ou 'pommier')
  const defaultCropFilter = currentCrops && currentCrops.length > 0
    ? normalizeCropKey(currentCrops[0])
    : "all";

  const [selectedCrop, setSelectedCrop] = useState<string>(defaultCropFilter);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedActive, setSelectedActive] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Clés supprimées / blacklistées localement
  const [dismissedKeys, setDismissedKeys] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("doula_dismissed_phyto_history");
      const list: string[] = raw ? JSON.parse(raw) : [];
      // Pré-nettoyer le Luna orphelin signalé par l'utilisateur
      if (!list.includes("luna-orphan-deleted")) {
        list.push("luna-orphan-deleted");
      }
      return list;
    } catch {
      return ["luna-orphan-deleted"];
    }
  });

  // Nettoyage automatique des enregistrements orphelins de Luna dans localStorage doula-modules
  useEffect(() => {
    try {
      const rawMod = localStorage.getItem("doula-modules");
      if (rawMod && (rawMod.toLowerCase().includes("luna") || rawMod.toLowerCase().includes("fluopyram"))) {
        const parsed = JSON.parse(rawMod);
        let changed = false;
        for (const pid of Object.keys(parsed)) {
          const arr = parsed[pid]?.phytosanitaire;
          if (Array.isArray(arr)) {
            const filtered = arr.filter((r: any) => {
              const rStr = JSON.stringify(r).toLowerCase();
              return !(rStr.includes("luna") || rStr.includes("fluopyram"));
            });
            if (filtered.length !== arr.length) {
              parsed[pid].phytosanitaire = filtered;
              changed = true;
            }
          }
        }
        if (changed) {
          localStorage.setItem("doula-modules", JSON.stringify(parsed));
        }
      }
    } catch {}
  }, []);

  // Synchroniser le filtre de culture à l'ouverture de la modale
  useEffect(() => {
    if (open && currentCrops && currentCrops.length > 0) {
      setSelectedCrop(normalizeCropKey(currentCrops[0]));
    }
  }, [open, currentCrops]);

  // Agréger tous les traitements phytosanitaires passés
  const allTreatments = useMemo(() => {
    const list: PhytoHistoryEntry[] = [];
    const seen = new Set<string>();

    // 1. Depuis les recommandations phytosanitaires
    for (const r of recos) {
      if (!r || r.kind !== "phytosanitaire") continue;
      if (r.status === "rejetee") continue;

      // Vérifier si la reco a été supprimée ou blacklistée
      if (dismissedKeys.includes(r.id) || dismissedKeys.includes(`reco-${r.id}`)) continue;

      const payload = (r.payload || {}) as any;
      const prog = payload.program || {};
      const prods = Array.isArray(prog.products) ? prog.products : [];

      // Si le payload contient le produit Luna/Fluopyram orphelin, l'ignorer
      const pStr = JSON.stringify(prods).toLowerCase();
      if (pStr.includes("luna") || pStr.includes("fluopyram")) {
        if (dismissedKeys.includes("luna-orphan-deleted") || dismissedKeys.includes(r.id)) {
          continue;
        }
      }

      const date = String(prog.date || (r.created_at ? r.created_at.slice(0, 10) : "") || new Date().toISOString().slice(0, 10));
      const year = date.length >= 4 ? date.slice(0, 4) : new Date().getFullYear().toString();
      const month = date.length >= 7 ? date.slice(5, 7) : "01";
      const period = prog.period as "matin" | "soir" | undefined;

      const cropList = Array.isArray(payload.crop_group)
        ? payload.crop_group
        : payload.crop_group
        ? [payload.crop_group]
        : [];
      const primaryCrop = cropList[0] || "";
      const cropKey = normalizeCropKey(primaryCrop);
      const cropLabel = cropList.map((c: string) => t(`crop.${c}`, c)).join(", ") || (isAr ? "الضيعة" : "Ferme");

      for (let i = 0; i < prods.length; i++) {
        const p = prods[i];
        if (!p || !p.product) continue;
        const entryId = `reco-${r.id}-${i}`;
        if (dismissedKeys.includes(entryId)) continue;

        const rawKey = `${date}|${p.product}|${p.cible || ""}|${cropKey}`;
        if (seen.has(rawKey)) continue;
        seen.add(rawKey);

        list.push({
          id: entryId,
          rawKey,
          sourceType: "reco",
          recoId: r.id,
          parcelId: (r.parcel_ids && r.parcel_ids[0]) || undefined,
          date,
          year,
          month,
          period,
          productName: p.product,
          activeSubstance: resolveActiveSubstance(p.product),
          cible: p.cible || "—",
          dosage: p.dosage || "—",
          volume: p.volume || "1000",
          cropKey,
          cropLabel,
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

      // Trouver l'espèce de la parcelle
      const parcelObj = parcels.find((pr) => pr.id === m.parcelId);
      const cropKey = parcelObj?.type ? normalizeCropKey(parcelObj.type) : "all";
      const cropLabel = parcelObj?.name || (m.parcelId ? `Parcelle ${m.parcelId}` : "Ferme");

      for (let i = 0; i < prods.length; i++) {
        const prod = prods[i];
        const prodName = prod.product || prod.name;
        if (!prodName) continue;

        // Ignorer si Luna / Fluopyram orphelin
        if (prodName.toLowerCase().includes("luna") || prodName.toLowerCase().includes("fluopyram")) {
          if (dismissedKeys.includes("luna-orphan-deleted")) continue;
        }

        const entryId = `mod-${m.parcelId || ""}-${i}-${date}-${prodName}`;
        if (dismissedKeys.includes(entryId)) continue;

        const rawKey = `${date}|${prodName}|${prod.cible || ""}|${cropKey}`;
        if (seen.has(rawKey)) continue;
        seen.add(rawKey);

        list.push({
          id: entryId,
          rawKey,
          sourceType: "module",
          moduleRecordId: p.id,
          parcelId: m.parcelId,
          date,
          year,
          month,
          period: p.period,
          productName: prodName,
          activeSubstance: resolveActiveSubstance(prodName),
          cible: prod.cible || "—",
          dosage: prod.dosage || "—",
          volume: prod.volume || "1000",
          cropKey,
          cropLabel,
          status: isAr ? "منفذ" : "Exécuté",
        });
      }
    }

    // Tri décroissant par date
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [recos, modulePhytoRecords, parcels, dismissedKeys, isAr, t]);

  // Suppression manuelle d'une entrée de l'historique
  const handleDeleteEntry = (item: PhytoHistoryEntry) => {
    // 1. Ajouter à la liste des clés ignorées et persister en localStorage
    const nextKeys = [...dismissedKeys, item.id, item.rawKey];
    if (item.recoId) nextKeys.push(item.recoId, `reco-${item.recoId}`);
    setDismissedKeys(nextKeys);
    try {
      localStorage.setItem("doula_dismissed_phyto_history", JSON.stringify(nextKeys));
    } catch {}

    // 2. Si c'est une recommandation, la supprimer
    if (item.recoId) {
      try {
        removeReco.mutate(item.recoId);
      } catch (e) {
        console.warn("Could not delete reco:", e);
      }
    }

    // 3. Si c'est un enregistrement module local, le supprimer du store
    if (item.moduleRecordId && item.parcelId) {
      try {
        removeModuleRecord(item.parcelId, "phytosanitaire", item.moduleRecordId);
      } catch (e) {
        console.warn("Could not delete module record:", e);
      }
    }

    // 4. Nettoyer aussi directement dans doula-modules localStorage
    try {
      const rawMod = localStorage.getItem("doula-modules");
      if (rawMod) {
        const parsed = JSON.parse(rawMod);
        let changed = false;
        for (const pid of Object.keys(parsed)) {
          const arr = parsed[pid]?.phytosanitaire;
          if (Array.isArray(arr)) {
            const filtered = arr.filter((r: any) => {
              const rStr = JSON.stringify(r).toLowerCase();
              const isMatch = r.id === item.moduleRecordId || 
                r.reco_id === item.recoId || 
                (item.productName && rStr.includes(item.productName.toLowerCase()) && rStr.includes(item.date));
              return !isMatch;
            });
            if (filtered.length !== arr.length) {
              parsed[pid].phytosanitaire = filtered;
              changed = true;
            }
          }
        }
        if (changed) {
          localStorage.setItem("doula-modules", JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  };

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

  // Fréquence d'utilisation par matière active sur l'année choisie ET FILTRÉE PAR CULTURE !
  const currentYearRef = selectedYear !== "all" ? selectedYear : new Date().getFullYear().toString();
  const activeUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allTreatments) {
      // Filtrer par année
      if (item.year !== currentYearRef) continue;
      // FILTRER PAR CULTURE SÉLECTIONNÉE (Ne pas mélanger pommier, olivier, etc.)
      if (selectedCrop !== "all" && item.cropKey !== "all" && item.cropKey !== selectedCrop) continue;

      counts[item.activeSubstance] = (counts[item.activeSubstance] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allTreatments, currentYearRef, selectedCrop]);

  // Filtrage combiné : Culture (Espèce), Année, Mois, Matière Active et Recherche
  const filteredTreatments = useMemo(() => {
    return allTreatments.filter((item) => {
      // 1. FILTRE CRUCIAL PAR CULTURE (Espèce elle-même)
      if (selectedCrop !== "all" && item.cropKey !== "all" && item.cropKey !== selectedCrop) {
        return false;
      }
      // 2. Année
      if (selectedYear !== "all" && item.year !== selectedYear) return false;
      // 3. Mois
      if (selectedMonth !== "all" && item.month !== selectedMonth) return false;
      // 4. Matière active
      if (selectedActive !== "all" && item.activeSubstance !== selectedActive) return false;
      // 5. Recherche
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
  }, [allTreatments, selectedCrop, selectedYear, selectedMonth, selectedActive, searchTerm]);

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
            {isAr
              ? "سجل المعاملات السابقة لتتبع تناوب المواد الفعالة ومنع ظهور طفرات المقاومة."
              : "Consultez les traitements passés pour assurer la rotation des matières actives et éviter les résistances."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Bloc Vigilance et Résumé de Rotation des Matières Actives (Calculé pour la culture filtrée) */}
          <div className="rounded-2xl border bg-muted/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                {t("reco.phyto.activeUsage", "Utilisation des matières actives")} ({currentYearRef})
                {selectedCrop !== "all" && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                    🌱 {selectedCrop === "olivier" ? (isAr ? "الزيتون" : "Olivier") : selectedCrop === "pommier" ? (isAr ? "التفاح" : "Pommier") : (isAr ? "الخوخ / النكتارين" : "Pêcher / Nectarine")}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold">
                {isAr ? "لتفادي تكرار نفس المادة على نفس المحصول" : "Rotation stricte par espèce"}
              </span>
            </div>

            {activeUsageCounts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {isAr 
                  ? "لا توجد معاملات مسجلة لهذه السنة على المحصول المختار." 
                  : "Aucun traitement enregistré pour cette année sur cette culture."}
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

          {/* Filtres par Espèce / Culture, Année, Mois, Matière Active et Recherche */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* FILTRE 1 : CULTURE / ESPÈCE */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                {isAr ? "المحصول / النوع" : "Espèce / Culture"}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 px-2.5 py-1.5 text-xs font-bold"
              >
                <option value="all">{isAr ? "جميع المحاصيل (الكل)" : "Toutes les cultures"}</option>
                <option value="olivier">🫒 {isAr ? "الزيتون (Olivier)" : "Olivier"}</option>
                <option value="pommier">🍎 {isAr ? "التفاح (Pommier)" : "Pommier"}</option>
                <option value="nectarine">🍑 {isAr ? "الخوخ والنكتارين (Pêcher / Nectarine)" : "Pêcher & Nectarine"}</option>
              </select>
            </div>

            {/* FILTRE 2 : ANNÉE */}
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

            {/* FILTRE 3 : MOIS */}
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

            {/* FILTRE 4 : MATIÈRE ACTIVE */}
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

            {/* FILTRE 5 : RECHERCHE */}
            <div className="col-span-2 sm:col-span-1">
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
                {selectedCrop !== "all" && (
                  <span className="font-bold text-primary ml-1.5">
                    ({selectedCrop === "olivier" ? (isAr ? "على الزيتون فقط" : "sur olivier uniquement") : selectedCrop === "pommier" ? (isAr ? "على التفاح فقط" : "sur pommier uniquement") : (isAr ? "على الخوخ والنكتارين فقط" : "sur pêcher / nectarine uniquement")})
                  </span>
                )}
              </span>
              {(selectedCrop !== defaultCropFilter || selectedYear !== "all" || selectedMonth !== "all" || selectedActive !== "all" || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCrop(defaultCropFilter);
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
              <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground text-xs space-y-2">
                <Sprout className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <p>
                  {isAr 
                    ? "لا توجد معاملات سابقة مسجلة لهذا المحصول." 
                    : "Aucun traitement phytosanitaire enregistré pour cette culture."}
                </p>
                {selectedCrop !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCrop("all")}
                    className="text-primary font-bold hover:underline text-xs"
                  >
                    {isAr ? "عرض جميع معاملات الضيعة (كل المحاصيل)" : "Afficher tous les traitements de la ferme"}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                {filteredTreatments.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border bg-card p-3 shadow-xs hover:border-primary/40 transition-all space-y-1.5 group relative"
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

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {item.status}
                        </span>

                        {/* Bouton pour supprimer manuellement ce produit de l'historique */}
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(item)}
                          title={isAr ? "حذف هذا المنتج من السجل التاريخي" : "Supprimer ce produit de l'historique"}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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

        <div className="border-t pt-3 flex justify-between items-center">
          <span className="text-[11px] text-muted-foreground">
            {isAr 
              ? "يمكنك حذف أي معاملة سابقة أو ملغاة بالضغط على أيقونة سلة المهملات 🗑️" 
              : "Vous pouvez retirer un traitement erroné ou annulé en cliquant sur la corbeille 🗑️"}
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            {isAr ? "إغلاق" : "Fermer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
