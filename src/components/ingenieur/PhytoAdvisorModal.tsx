import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  FlaskConical,
  Beaker,
  Clock,
  ArrowRight,
  Calculator,
  ListFilter,
  Check,
  Search,
  Droplet,
  Camera,
  CloudRain,
  GitFork,
  Activity,
  Shield,
  X,
} from 'lucide-react';
import { PestVisualGalleryDialog } from './PestVisualGalleryDialog';
import { useTranslation } from '@/lib/i18n';
import {
  CropType,
  GrowthStage,
  ActiveIngredient,
  PestTarget,
  PhytosanitaryEngine,
  SprayApplicationRecord,
  CommercialProductDZ,
  TANK_MIX_ORDER_STEPS,
  TANK_MIX_COMPATIBILITY_RULES,
  getPestVisualAsset,
  checkProductBlockedForGrowthStage,
  TreatmentActionRule,
  SystemicType,
  ModeOfActionRecommendation,
} from '@/lib/phyto/engine';
import {
  PHENOLOGICAL_STAGES,
  ACTIVE_INGREDIENTS_DATABASE,
  PEST_TARGETS_DATABASE,
} from '@/lib/phyto/database';
import {
  PHYTO_DATABASE,
  type PhytoCultureKey,
} from '@/data/phytosanitaires';
import { useAllModuleRecords } from '@/lib/modules-store';
import { useRecommendations } from '@/lib/cloud/recommendations';
import { getRainForecast48h, RainForecast48h } from '@/lib/weather-forecast';

interface PhytoAdvisorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cropGroup?: string; // ex: "oliviers", "pommiers", "nectarinier"
  onSelectIngredient?: (ingredient: ActiveIngredient, pest: PestTarget) => void;
}

export function PhytoAdvisorModal({
  open,
  onOpenChange,
  cropGroup = 'nectarinier',
  onSelectIngredient,
}: PhytoAdvisorModalProps) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  // Navigation par onglets
  const [activeTab, setActiveTab] = useState<'advisor' | 'calculator' | 'catalog'>('advisor');

  // Mapper le groupe de culture de Doula vers CropType + permettre le basculement direct dans l'onglet 1
  const initialCrop: CropType = useMemo(() => {
    const c = (cropGroup || '').toLowerCase();
    if (c.includes('oliv')) return 'olive';
    if (c.includes('pomm')) return 'pomme';
    if (c.includes('nectar') || c.includes('pech') || c.includes('redix')) return 'nectarine';
    return 'nectarine';
  }, [cropGroup]);

  const [currentCrop, setCurrentCrop] = useState<CropType>(initialCrop);
  useEffect(() => {
    setCurrentCrop(initialCrop);
  }, [initialCrop, open]);

  // Suivi des images en erreur pour basculer proprement sur un visuel de secours
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Étapes de l'assistant
  const [selectedStage, setSelectedStage] = useState<GrowthStage>('floraison');
  const [selectedPestId, setSelectedPestId] = useState<string | null>(null);
  const [pressureLevel, setPressureLevel] = useState<'legere' | 'moyenne' | 'forte'>('moyenne');
  const [galleryPest, setGalleryPest] = useState<PestTarget | null>(null);

  // Arbre de décision agronomique : Contact vs Systémique vs Translaminaire
  const [isRainExpectedSoon, setIsRainExpectedSoon] = useState<boolean>(false);
  const [rainForecast, setRainForecast] = useState<RainForecast48h | null>(null);
  const [isLoadingRain, setIsLoadingRain] = useState<boolean>(false);

  // Synchronisation automatique via météo en direct (ferme Doula Agro) :
  // Si les prévisions météo annoncent >= 20 mm sous 48h, l'option est activée automatiquement.
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setIsLoadingRain(true);
    getRainForecast48h()
      .then((data) => {
        if (!isMounted || !data) return;
        setRainForecast(data);
        // Activation automatique selon les données réelles de la station météo
        setIsRainExpectedSoon(data.isContaminatingRain);
      })
      .catch((err) => console.warn('Erreur détection météo 48h:', err))
      .finally(() => {
        if (isMounted) setIsLoadingRain(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);
  const [hasVisibleSymptoms, setHasVisibleSymptoms] = useState<boolean>(false);
  const [isRapidShootsGrowth, setIsRapidShootsGrowth] = useState<boolean>(
    selectedStage === 'gonflement_bourgeons' || selectedStage === 'floraison' || selectedStage === 'chute_petales_nouaison' || selectedStage === 'grossissement_fruit'
  );
  const [daysBeforeHarvest, setDaysBeforeHarvest] = useState<number>(
    selectedStage === 'maturation' ? 10 : 45
  );

  // État du calculateur de cuve
  const [tankVolume, setTankVolume] = useState<number>(1000);
  const [calcDose100L, setCalcDose100L] = useState<number>(40);
  const [calcUnit, setCalcUnit] = useState<'g' | 'cc'>('cc');

  // Recherche, filtre espèce (pommier / nectarinier / olivier) et masquage des produits bloqués (Onglet 3)
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCropFilter, setCatalogCropFilter] = useState<'all' | PhytoCultureKey>('all');
  const [hideBlockedInCatalog, setHideBlockedInCatalog] = useState<boolean>(false);

  // Traitements historiques passés pour détecter les résistances
  const { data: recos = [] } = useRecommendations();
  const modulePhytoRecords = useAllModuleRecords('phytosanitaire');

  const historyLogs: SprayApplicationRecord[] = useMemo(() => {
    const logs: SprayApplicationRecord[] = [];

    // 1. Extraire depuis les recommandations
    for (const r of recos) {
      if (r.kind === 'phytosanitaire') {
        // Ignorer les recommandations rejetées ou supprimées
        if (r.status === 'rejetee') continue;

        const payload = (r.payload || {}) as any;
        const cropList = Array.isArray(payload.crop_group)
          ? payload.crop_group
          : payload.crop_group
          ? [payload.crop_group]
          : [];

        // Ne compter que les traitements de la même culture
        const matchesCrop = cropList.length === 0 || cropList.some((c: string) => {
          const cl = c.toLowerCase();
          if (currentCrop === 'olive') return cl.includes('oliv');
          if (currentCrop === 'pomme') return cl.includes('pomm');
          if (currentCrop === 'nectarine') return cl.includes('pech') || cl.includes('nectar');
          return true;
        });
        if (!matchesCrop) continue;

        // Ignorer les recommandations supprimées localement ou marquées comme effacées
        try {
          const rawDismissed = localStorage.getItem("doula_dismissed_phyto_history");
          if (rawDismissed && (rawDismissed.includes(r.id) || (payload.program?.products && JSON.stringify(payload.program.products).toLowerCase().includes('luna')))) {
            continue;
          }
        } catch {}

        const prog = payload.program || {};
        const products = prog.products || [];
        for (const p of products) {
          const pName = (p.product || '').toLowerCase();
          const matchIng = ACTIVE_INGREDIENTS_DATABASE.find(
            ing => pName.includes(ing.name.toLowerCase()) || ing.commonNameFr.toLowerCase().includes(pName)
          );
          if (matchIng) {
            logs.push({
              id: r.id,
              parcelId: (r.parcel_ids && r.parcel_ids[0]) || 'all',
              crop: currentCrop,
              date: r.created_at,
              targetPestId: selectedPestId || 'unknown',
              activeIngredientId: matchIng.id,
              codeGroup: matchIng.codeGroup,
              multiCodes: matchIng.multiCodes,
            });
          }
        }
      }
    }

    // 2. Extraire depuis les exécutions réelles
    for (const rec of modulePhytoRecords) {
      const pName = ((rec.product_name || rec.payload?.product_name || '') as string).toLowerCase();
      const matchIng = ACTIVE_INGREDIENTS_DATABASE.find(
        ing => pName.includes(ing.name.toLowerCase()) || ing.commonNameFr.toLowerCase().includes(pName)
      );
      if (matchIng) {
        logs.push({
          id: rec.id,
          parcelId: rec.parcel_id || 'all',
          crop: currentCrop,
          date: rec.date || new Date().toISOString(),
          targetPestId: selectedPestId || 'unknown',
          activeIngredientId: matchIng.id,
          codeGroup: matchIng.codeGroup,
          multiCodes: matchIng.multiCodes,
        });
      }
    }

    return logs;
  }, [recos, modulePhytoRecords, currentCrop, selectedPestId]);

  // Bioagresseurs éligibles au stade phénologique sélectionné
  const [pestCategoryFilter, setPestCategoryFilter] = useState<'all' | 'insectes' | 'maladies'>('all');

  const eligiblePests = useMemo(() => {
    return PhytosanitaryEngine.getEligiblePests(PEST_TARGETS_DATABASE, currentCrop, selectedStage);
  }, [currentCrop, selectedStage]);

  const countInsectes = useMemo(() => {
    return eligiblePests.filter(p => p.category === 'insecte' || p.category === 'acarien').length;
  }, [eligiblePests]);

  const countMaladies = useMemo(() => {
    return eligiblePests.filter(p => p.category === 'champignon' || p.category === 'bacterie').length;
  }, [eligiblePests]);

  const displayedPests = useMemo(() => {
    if (pestCategoryFilter === 'insectes') {
      return eligiblePests.filter(p => p.category === 'insecte' || p.category === 'acarien');
    }
    if (pestCategoryFilter === 'maladies') {
      return eligiblePests.filter(p => p.category === 'champignon' || p.category === 'bacterie');
    }
    return eligiblePests;
  }, [eligiblePests, pestCategoryFilter]);

  // Si aucun bioagresseur sélectionné, sélectionner le premier par défaut
  const activePest = useMemo(() => {
    if (!selectedPestId && eligiblePests.length > 0) {
      return eligiblePests[0];
    }
    return eligiblePests.find(p => p.id === selectedPestId) || eligiblePests[0] || null;
  }, [selectedPestId, eligiblePests]);

  // Conditions terrain pour l'arbre de décision Contact vs Systémique
  const actionConditions: TreatmentActionRule = useMemo(() => ({
    isRainExpectedSoon,
    hasVisibleSymptoms,
    isRapidShootsGrowth,
    daysBeforeHarvest,
  }), [isRainExpectedSoon, hasVisibleSymptoms, isRapidShootsGrowth, daysBeforeHarvest]);

  const modeRecommendation: ModeOfActionRecommendation = useMemo(() => {
    return PhytosanitaryEngine.recommendModeOfAction(actionConditions);
  }, [actionConditions]);

  // Évaluation scientifique des matières actives (IRAC / FRAC) avec recommandation situationnelle & sécurité abeilles
  const evaluatedOptions = useMemo(() => {
    if (!activePest) return [];
    return PhytosanitaryEngine.evaluateTreatmentOptions({
      targetPest: activePest,
      parcelHistory: historyLogs,
      allIngredients: ACTIVE_INGREDIENTS_DATABASE,
      currentSeasonYear: new Date().getFullYear(),
      currentDate: new Date(),
      conditions: actionConditions,
      growthStage: selectedStage,
    });
  }, [activePest, historyLogs, actionConditions, selectedStage]);

  // Calcul du dosage pour la cuve
  const tankCalculation = useMemo(() => {
    return PhytosanitaryEngine.calculateTankMixDosage({
      tankVolumeL: tankVolume,
      dosePerHlNum: calcDose100L,
      unit: calcUnit,
    });
  }, [tankVolume, calcDose100L, calcUnit]);

  // Filtrage du catalogue officiel (165 spécialités PHYTO_DATABASE) par espèce, recherche & blocage stade phénologique
  const filteredCatalog = useMemo(() => {
    return PHYTO_DATABASE
      .map((prod) => ({
        prod,
        stageCheck: checkProductBlockedForGrowthStage(prod, selectedStage),
      }))
      .filter(({ prod, stageCheck }) => {
        if (hideBlockedInCatalog && stageCheck.blocked) return false;
        const matchCrop =
          catalogCropFilter === 'all'
            ? true
            : !prod.cultures || prod.cultures.length === 0 || prod.cultures.includes(catalogCropFilter);
        if (!matchCrop) return false;
        if (!catalogSearch.trim()) return true;
        const q = catalogSearch.toLowerCase();
        return (
          prod.name.toLowerCase().includes(q) ||
          (prod.matiereActive || '').toLowerCase().includes(q) ||
          (prod.matiereActiveAr || '').toLowerCase().includes(q) ||
          (prod.codeGroup || '').toLowerCase().includes(q) ||
          (prod.homologation || '').toLowerCase().includes(q) ||
          prod.cible.toLowerCase().includes(q)
        );
      });
  }, [catalogCropFilter, catalogSearch, selectedStage, hideBlockedInCatalog]);

  // Fermer avec la touche Échap lorsque la modale est ouverte
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !galleryPest) {
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, galleryPest, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <>
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in-0 duration-150"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[94vh] overflow-y-auto bg-card text-card-foreground p-0 rounded-3xl shadow-2xl border"
        >
          {/* En-tête avec bannière scientifique */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-sky-700 text-white p-5 rounded-t-3xl relative">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={isAr ? "إغلاق" : "Fermer"}
              className="absolute top-3.5 right-3.5 rtl:right-auto rtl:left-3.5 h-8 w-8 rounded-full bg-black/25 hover:bg-black/45 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-9 rtl:pr-0 rtl:pl-9">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
                <Sparkles className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-wide flex flex-wrap items-center gap-2">
                  <span>
                    {isAr ? "دليل الحماية النباتية وإدارة المقاومة" : "Moteur Phytosanitaire & Gestion de la Résistance"}{" "}
                    <span dir="ltr" className="inline-block whitespace-nowrap">(IRAC / FRAC)</span>
                  </span>
                  <span dir="ltr" className="inline-block whitespace-nowrap text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 border border-white/30">
                    FRAC • IRAC
                  </span>
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  {isAr
                    ? "نظام علمي ذكي لكسر المقاومة، تناوب مجاميع الأثر، والتحكم في خلطات الصهريج (Tank Mix)"
                    : "Filtrage phénologique, alternance obligatoire, statut multi-site et calcul de bouillie"}
                </p>
              </div>
            </div>

            {/* Sélecteur d'onglets */}
            <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-md border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('advisor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'advisor' ? 'bg-white text-emerald-900 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isAr ? "دليل المقاومة" : "Assistant Phyto"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'calculator' ? 'bg-white text-emerald-900 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                <Calculator className="h-3.5 w-3.5" />
                <span>{isAr ? "حاسبة الصهريج" : "Cuve & Mélange"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'catalog' ? 'bg-white text-emerald-900 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                <ListFilter className="h-3.5 w-3.5" />
                <span>{isAr ? "الأدوية في الجزائر" : "Produits DZ"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 text-xs">
          {/* ========================================================= */}
          {/* ONGLET 1 : ASSISTANT PHYTOSANITAIRE IRAC / FRAC           */}
          {/* ========================================================= */}
          {activeTab === 'advisor' && (
            <div className="space-y-5">
              {/* SÉLECTEUR D'ESPÈCE ACTIVE (Olivier / Pommier / Nectarinier) */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl border bg-muted/25">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    {isAr ? "🌳 المحصول النشط :" : "🌳 Espèce active :"}
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {currentCrop === 'olive'
                      ? isAr ? "الزيتون (Olivier)" : "Olivier"
                      : currentCrop === 'pomme'
                        ? isAr ? "التفاح (Pommier)" : "Pommier"
                        : isAr ? "النكتارين / الخوخ (Nectarinier)" : "Nectarinier / Pêcher"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {([
                    { id: 'olive' as const, icon: '🫒', fr: 'Olivier', ar: 'زيتون' },
                    { id: 'pomme' as const, icon: '🍎', fr: 'Pommier', ar: 'تفاح' },
                    { id: 'nectarine' as const, icon: '🍑', fr: 'Nectarinier', ar: 'نكتارين' },
                  ]).map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        setCurrentCrop(sp.id);
                        setSelectedPestId(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                        currentCrop === sp.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-background text-muted-foreground border-input hover:bg-muted'
                      }`}
                    >
                      <span>{sp.icon}</span>
                      <span>{isAr ? sp.ar : sp.fr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ÉTAPE 1 : CHOIX DU STADE PHÉNOLOGIQUE */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-black text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span>1️⃣</span> {isAr ? "المرحلة الفينولوجية الحالية للشجرة" : "Stade Phénologique de l'arbre"}
                  </label>
                  <span className="text-[11px] font-bold text-primary">
                    {PHENOLOGICAL_STAGES.find(s => s.id === selectedStage)?.icon}{" "}
                    {isAr
                      ? PHENOLOGICAL_STAGES.find(s => s.id === selectedStage)?.labelAr
                      : PHENOLOGICAL_STAGES.find(s => s.id === selectedStage)?.labelFr}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
                  {PHENOLOGICAL_STAGES.map((st) => {
                    const isSelected = selectedStage === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStage(st.id);
                          setSelectedPestId(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[72px] ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-black shadow-xs ring-2 ring-primary/20 scale-102"
                            : "border-input bg-background hover:bg-muted/60 text-muted-foreground"
                        }`}
                      >
                        <span className="text-xl">{st.icon}</span>
                        <span className="text-[10px] font-bold mt-1 leading-tight text-center line-clamp-2">
                          {isAr ? st.labelAr : st.labelFr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ÉTAPE 2 : CHOIX DU BIOAGRESSEUR ÉLIGIBLE (AVEC VRAIES PHOTOS DE TERRAIN & ONGLETS INSECTES / MALADIES) */}
              <div className="border rounded-2xl p-4 bg-muted/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b">
                  <label className="font-black text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span>2️⃣</span> {isAr ? "الآفة أو المرض الملاحظ في هذا الطور" : "Bioagresseur / Maladie détecté(e)"}
                    <span className="text-[10px] font-normal lowercase text-muted-foreground">
                      ({eligiblePests.length} {isAr ? "محتمل" : "observable(s)"})
                    </span>
                  </label>

                  {/* Onglets de filtrage : Tout / Insectes / Maladies */}
                  <div className="flex items-center gap-1.5 bg-background/80 p-1 rounded-xl border">
                    <button
                      type="button"
                      onClick={() => setPestCategoryFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        pestCategoryFilter === 'all'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {isAr ? `الكل ${eligiblePests.length}` : `Tout ${eligiblePests.length}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPestCategoryFilter('insectes')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        pestCategoryFilter === 'insectes'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {isAr ? `حشرات ${countInsectes}` : `Insectes ${countInsectes}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPestCategoryFilter('maladies')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        pestCategoryFilter === 'maladies'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {isAr ? `أمراض ${countMaladies}` : `Maladies ${countMaladies}`}
                    </button>
                  </div>
                </div>

                {displayedPests.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground italic text-xs">
                    {isAr
                      ? "لا توجد آفات مطابقة لهذا التصنيف في هذا الطور الفينولوجي."
                      : "Aucun bioagresseur dans cette catégorie pour ce stade végétatif."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {displayedPests.map((pest) => {
                      const isSelected = activePest?.id === pest.id;
                      const isInsect = pest.category === 'insecte' || pest.category === 'acarien';

                      return (
                        <div
                          key={pest.id}
                          onClick={() => setSelectedPestId(pest.id)}
                          className={`group cursor-pointer rounded-2xl border overflow-hidden transition-all duration-200 bg-card hover:shadow-md flex flex-col justify-between ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/40 shadow-md scale-101 bg-primary/5"
                              : "border-input hover:border-primary/50 hover:bg-muted/30"
                          }`}
                        >
                          {/* Image réelle de terrain (avec repli propre sans icône cassée) */}
                          <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-emerald-900/15 via-slate-900/10 to-amber-900/15 overflow-hidden flex items-center justify-center">
                            {!failedImages[pest.id] ? (
                              <img
                                src={getPestVisualAsset(pest)}
                                alt={pest.nameScientific}
                                onError={() => setFailedImages((prev) => ({ ...prev, [pest.id]: true }))}
                                className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-3 text-center gap-1">
                                <span className="text-2xl">{isInsect ? '🐛' : '🍄'}</span>
                                <span dir="ltr" className="text-[10px] font-semibold italic text-muted-foreground truncate max-w-full">
                                  {pest.nameScientific}
                                </span>
                              </div>
                            )}

                            {/* Badge catégorie (Insecte en rouge, Maladie en orange) */}
                            <span className={`absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm backdrop-blur-xs text-white ${
                              isInsect ? 'bg-rose-600/90' : 'bg-amber-600/90'
                            }`}>
                              {isInsect ? (isAr ? "حشرة" : "Insecte") : (isAr ? "مرض" : "Maladie")}
                            </span>

                            {/* Actions / Sélection en haut à droite */}
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                              <button
                                type="button"
                                title={isAr ? "معاينة الفحص الميداني الكامل" : "Agrandir & diagnostic complet"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGalleryPest(pest);
                                }}
                                className="p-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-xs transition-colors shadow-xs"
                              >
                                <Camera className="h-3 w-3" />
                              </button>
                              {isSelected && (
                                <div className="p-1 rounded-full bg-primary text-primary-foreground shadow-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Libellé de la fiche */}
                          <div className="p-2.5 flex-1 flex flex-col justify-between">
                            <div>
                              <p className="font-bold text-xs sm:text-sm leading-snug line-clamp-2 text-foreground">
                                {isAr ? pest.nameAr : pest.nameFr}
                              </p>
                              <p className="text-[10px] text-muted-foreground italic font-serif truncate mt-0.5">
                                {pest.nameScientific}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fiche descriptive du bioagresseur sélectionné avec bouton galerie visuelle */}
                {activePest && (
                  <div className="p-3.5 rounded-xl bg-background border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-muted-foreground shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] leading-relaxed">
                          <strong className="text-foreground">{isAr ? "الأعراض والتشخيص : " : "Symptômes & Diagnostic : "}</strong>
                          {isAr ? activePest.descriptionAr : activePest.descriptionFr}
                        </p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                          {activePest.nameScientific}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGalleryPest(activePest)}
                      className="shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-all shadow-xs"
                    >
                      <Camera className="h-4 w-4" />
                      <span>{isAr ? "معاينة الأعراض (3 مستويات)" : "Galerie visuelle & Diagnostic"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ARBRE DE DÉCISION AGRONOMIQUE : CONTACT VS SYSTÉMIQUE */}
              {activePest && (
                <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <GitFork className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-foreground flex items-center gap-1.5">
                          <span>{isAr ? "شجرة القرار الحقلي : مبيد ملامسة أم جهازي ؟" : "Arbre de Décision : Contact vs Systémique"}</span>
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black">
                            {modeRecommendation.dominantReason.toUpperCase()}
                          </span>
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          {isAr ? "تحديد النمط الفيزيولوجي الأنسب وفق معطيات الطقس، حالة الشجرة وطور الإصابة" : "Orientation automatique selon météo, croissance foliaire et statut infectieux"}
                        </p>
                      </div>
                    </div>

                    {/* Badge du mode recommandé */}
                    <div className="flex items-center gap-1.5">
                      {modeRecommendation.recommendedType.map(t => (
                        <span
                          key={t}
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl shadow-xs border ${
                            t === 'contact'
                              ? 'bg-sky-500 text-white border-sky-600'
                              : t === 'systemique'
                              ? 'bg-purple-600 text-white border-purple-700'
                              : 'bg-teal-600 text-white border-teal-700'
                          }`}
                        >
                          {t === 'contact' ? (isAr ? '🛡️ ملامسة' : '🛡️ Contact') : t === 'systemique' ? (isAr ? '🔄 جهازي' : '🔄 Systémique') : (isAr ? '🍃 عابر للصفائح' : '🍃 Translaminaire')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Les 4 bascules de terrain */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {/* Bascule 1 : Pluie imminente (Synchronisée automatiquement avec la météo de la ferme) */}
                    <button
                      type="button"
                      onClick={() => setIsRainExpectedSoon(!isRainExpectedSoon)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 relative group ${
                        isRainExpectedSoon
                          ? 'bg-sky-500/15 border-sky-500 text-sky-900 dark:text-sky-200 ring-1 ring-sky-500'
                          : 'bg-background border-input hover:bg-muted/50 text-muted-foreground'
                      }`}
                      title={isAr ? "انقر للتبديل يدوياً إذا رغبت في تجربة سيناريو آخر" : "Cliquer pour forcer ou modifier manuellement"}
                    >
                      <CloudRain className={`h-4 w-4 shrink-0 mt-0.5 ${isRainExpectedSoon ? 'text-sky-600 animate-bounce' : 'text-muted-foreground'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[11px] font-bold leading-tight">
                            {isAr ? "أمطار مرتقبة (> 20 ملم)" : "Pluie contaminatrice"}
                          </p>
                          {/* Badge de précipitation 48h */}
                          {rainForecast !== null && (
                            <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold leading-none ${
                              rainForecast.isContaminatingRain
                                ? 'bg-sky-500 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {rainForecast.totalMm} mm
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] opacity-80 mt-0.5">
                          {isAr ? "خطر غسيل المبيد السطحي" : "> 20 mm sous 48h (délavage)"}
                        </p>
                        {/* Indicateur d'automatisation météo */}
                        <div className="mt-1 flex items-center gap-1 text-[8px]">
                          {isLoadingRain ? (
                            <span className="text-muted-foreground italic flex items-center gap-1">
                              <span className="animate-spin inline-block">⏳</span> {isAr ? "فحص الطقس..." : "Lecture météo..."}
                            </span>
                          ) : rainForecast ? (
                            <span className={rainForecast.isContaminatingRain ? "text-sky-700 dark:text-sky-300 font-semibold" : "text-muted-foreground"}>
                              ⚡ {isAr ? "مكتشف آلياً" : "Détection auto"} : {rainForecast.totalMm} mm / 48h
                            </span>
                          ) : (
                            <span className="text-muted-foreground opacity-60">
                              {isAr ? "تحديد يدوي" : "Mode manuel"}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Bascule 2 : Symptômes visibles */}
                    <button
                      type="button"
                      onClick={() => setHasVisibleSymptoms(!hasVisibleSymptoms)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        hasVisibleSymptoms
                          ? 'bg-rose-500/15 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500'
                          : 'bg-background border-input hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <Activity className={`h-4 w-4 shrink-0 mt-0.5 ${hasVisibleSymptoms ? 'text-rose-600' : 'text-muted-foreground'}`} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold leading-tight">
                          {isAr ? "أعراض إصابة مرئية" : "Infection déjà visible"}
                        </p>
                        <p className="text-[9px] opacity-80 mt-0.5">
                          {isAr ? "مطلوب مفعول علاجي توقيفي" : "Action curative (stop 24-72h)"}
                        </p>
                      </div>
                    </button>

                    {/* Bascule 3 : Croissance foliaire active */}
                    <button
                      type="button"
                      onClick={() => setIsRapidShootsGrowth(!isRapidShootsGrowth)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        isRapidShootsGrowth
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                          : 'bg-background border-input hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <Layers className={`h-4 w-4 shrink-0 mt-0.5 ${isRapidShootsGrowth ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold leading-tight">
                          {isAr ? "نمو خضري سريع" : "Pousse foliaire rapide"}
                        </p>
                        <p className="text-[9px] opacity-80 mt-0.5">
                          {isAr ? "حماية النموات الجديدة" : "Couvrir les organes néoformés"}
                        </p>
                      </div>
                    </button>

                    {/* Bascule 4 : Cueillette imminente */}
                    <button
                      type="button"
                      onClick={() => setDaysBeforeHarvest(daysBeforeHarvest < 15 ? 40 : 10)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        daysBeforeHarvest < 15
                          ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
                          : 'bg-background border-input hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <Clock className={`h-4 w-4 shrink-0 mt-0.5 ${daysBeforeHarvest < 15 ? 'text-amber-600' : 'text-muted-foreground'}`} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold leading-tight">
                          {isAr ? "اقتراب الجني (< 15 يوم)" : "Récolte proche (< 15 j)"}
                        </p>
                        <p className="text-[9px] opacity-80 mt-0.5">
                          {isAr ? "احترام فترة الأمان DAR" : "Sécurité résidus & DAR court"}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Synthèse agronomique & Stratégie Tank Mix */}
                  <div className="p-3 rounded-xl bg-background border border-emerald-500/30 space-y-2">
                    <p className="text-[11px] font-medium leading-relaxed text-foreground">
                      💡 <strong>{isAr ? "التوجيه الفني :" : "Avis Agronomique :"} </strong>
                      {isAr ? modeRecommendation.adviceNoticeAr : modeRecommendation.adviceNoticeFr}
                    </p>
                    <div className="p-2.5 rounded-lg bg-muted/40 border text-[10px] flex items-start gap-2">
                      <Shield className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {isAr ? "الاستراتيجية المثلى لخلطة الصهريج (Tank Mix) : " : "Stratégie Cuve & Synergie Recommandée : "}
                        </strong>
                        <span className="text-muted-foreground">
                          {isAr ? modeRecommendation.idealMixStrategyAr : modeRecommendation.idealMixStrategyFr}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : MATIÈRES ACTIVES CLASSÉES & BLOCAGE ANTI-RÉSISTANCE */}
              {activePest && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <label className="font-black text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span>3️⃣</span> {isAr ? "المواد الفعالة المصنفة وإدارة المقاومة (IRAC / FRAC)" : "Matières Actives & Contrôle Anti-Résistance"}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {isAr ? "شدة الإصابة :" : "Intensité :"}
                      </span>
                      <div className="flex rounded-lg border bg-muted/60 p-0.5 text-[10px] font-bold">
                        {(['legere', 'moyenne', 'forte'] as const).map(lvl => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setPressureLevel(lvl)}
                            className={`px-2 py-0.5 rounded-md transition ${pressureLevel === lvl ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}`}
                          >
                            {lvl === 'legere' ? (isAr ? 'خفيفة' : 'Légère') : lvl === 'moyenne' ? (isAr ? 'متوسطة' : 'Moyenne') : (isAr ? 'مرتفعة' : 'Forte')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {evaluatedOptions.map(({ ingredient, isAllowed, isMultiSite, blockReason, beeBlock, beeWarning, stageBlocked, currentSeasonUsageCount, isSituationallyRecommended }) => {
                      const isFrac = ingredient.type === 'FRAC';
                      const badgeColor = isFrac
                        ? 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30'
                        : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';

                      // Date de récolte sécurisée
                      const harvestSafety = PhytosanitaryEngine.calculateHarvestSafetyDate(new Date(), ingredient.phiDays);

                      return (
                        <div
                          key={ingredient.id}
                          className={`rounded-2xl border p-4 transition-all ${
                            isAllowed
                              ? "bg-card border-input hover:border-primary/50 shadow-xs"
                              : "bg-destructive/[0.04] border-destructive/30 opacity-85"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-foreground">
                                  {ingredient.name}
                                </span>
                                <span dir="ltr" className={`inline-block whitespace-nowrap text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                  {ingredient.codeGroup}
                                </span>
                                {isMultiSite && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
                                    🛡️ {isAr ? "متعدد مواقع التأثير (بدون مقاومة)" : "Multi-site (Immunité anti-résistance)"}
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  ({ingredient.familyChemical})
                                </span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  ingredient.systemicType === 'contact'
                                    ? 'bg-sky-500/10 text-sky-700 border-sky-500/30'
                                    : ingredient.systemicType === 'systemique'
                                    ? 'bg-purple-500/10 text-purple-700 border-purple-500/30'
                                    : 'bg-teal-500/10 text-teal-700 border-teal-500/30'
                                }`}>
                                  {ingredient.systemicType === 'contact' ? '🛡️ Contact' : ingredient.systemicType === 'systemique' ? '🔄 Systémique' : '🍃 Translaminaire'}
                                </span>
                                {isSituationallyRecommended && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-amber-500" />
                                    {isAr ? 'مناسب للظروف الحالية' : 'Idéal situation actuelle'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {ingredient.commonNameFr}
                              </p>
                            </div>

                            {/* Bouton d'action ou Avertissement de blocage */}
                            <div className="shrink-0 flex items-center gap-2">
                              {isAllowed ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onSelectIngredient) {
                                      onSelectIngredient(ingredient, activePest);
                                    }
                                    onOpenChange(false);
                                  }}
                                  className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                                >
                                  <span>{isAr ? "اختيار المادة في التوصية" : "Insérer ce produit"}</span>
                                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold">
                                  <XCircle className="h-4 w-4 shrink-0" />
                                  <span>
                                    {beeBlock
                                      ? isAr
                                        ? "ممنوع وقت التزهير — خطر على النحل"
                                        : "Interdit en floraison — Danger Abeilles"
                                      : stageBlocked
                                        ? isAr
                                          ? "ممنوع في هذا الطور الفينولوجي"
                                          : "Bloqué à ce stade phénologique"
                                        : isAr
                                          ? "ممنوع لتفادي المقاومة"
                                          : "Exclu Anti-Résistance"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Indicateurs techniques : DAR, DRE, Dose, Quota saison */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t text-[11px]">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span>
                                <strong>DAR (PHI) :</strong>{" "}
                                <span dir="ltr" className="inline-block font-mono">{ingredient.phiDays}</span> {isAr ? "يوم" : "jours"}{" "}
                                (<span dir="ltr" className="inline-block font-mono">{harvestSafety.safeHarvestDate}</span>)
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <ShieldAlert className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>
                                <strong>DRE (REI) :</strong>{" "}
                                <span dir="ltr" className="inline-block font-mono">{ingredient.reiHours}h</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Beaker className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>
                                <strong>{isAr ? "الجرعة :" : "Dose :"}</strong>{" "}
                                <span dir="ltr" className="inline-block font-mono">{ingredient.standardDose}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Layers className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                              <span>
                                <strong>{isAr ? "مرات الرش :" : "Passages saison :"}</strong>{" "}
                                <span dir="ltr" className="inline-block font-mono">{currentSeasonUsageCount}/{ingredient.maxApplicationsPerSeason}</span>
                              </span>
                            </div>
                          </div>

                          {/* Message de blocage scientifique en rouge si interdit */}
                          {!isAllowed && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2 text-[11px] font-medium leading-relaxed">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                              <span>{blockReason}</span>
                            </div>
                          )}

                          {/* Avertissement abeilles en orange (ex: IRAC 4A en floraison) */}
                          {isAllowed && beeWarning && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 flex items-start gap-2 text-[11px] font-bold leading-relaxed">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                              <span>🐝 {beeWarning}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ONGLET 2 : CALCULATEUR DE CUVE & ORDRE D'INCORPORATION     */}
          {/* ========================================================= */}
          {activeTab === 'calculator' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/20 p-4 rounded-2xl border">
                <label className="block">
                  <span className="font-bold text-xs text-muted-foreground block mb-1">
                    {isAr ? "سعة صهريج الرش (باللتر)" : "Volume de la cuve (Litres)"}
                  </span>
                  <div className="flex gap-1.5">
                    {[600, 800, 1000, 1500].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setTankVolume(v)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition ${tankVolume === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                      >
                        {v} L
                      </button>
                    ))}
                  </div>
                </label>

                <label className="block">
                  <span className="font-bold text-xs text-muted-foreground block mb-1">
                    {isAr ? "الجرعة لـ 100 لتر (Dose / hL)" : "Dose homologuée pour 100 L (hL)"}
                  </span>
                  <input
                    type="number"
                    value={calcDose100L}
                    onChange={(e) => setCalcDose100L(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold"
                  />
                </label>

                <label className="block">
                  <span className="font-bold text-xs text-muted-foreground block mb-1">
                    {isAr ? "الوحدة" : "Unité"}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCalcUnit('cc')}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition ${calcUnit === 'cc' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                    >
                      cc / mL (Liquide)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcUnit('g')}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition ${calcUnit === 'g' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                    >
                      g (Poudre / Granulés)
                    </button>
                  </div>
                </label>
              </div>

              {/* Résultat du calcul */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {isAr ? "الكمية الإجمالية الواجب وزنها / قياسها للصهريج بالكامل :" : "Quantité totale exacte à incorporer dans la cuve :"}
                  </p>
                  <p dir="ltr" className="inline-block text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {tankCalculation.displayStr}
                  </p>
                </div>
                <div dir="ltr" className="text-right text-[11px] font-mono text-muted-foreground">
                  <p>{tankVolume} L = {tankCalculation.numHl} hL</p>
                  <p>{calcDose100L} {calcUnit}/hL × {tankCalculation.numHl} hL</p>
                </div>
              </div>

              {/* RÈGLE D'OR : ORDRE D'INCORPORATION EN CUVE */}
              <div className="border rounded-2xl p-4 bg-card space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Droplet className="h-4 w-4 text-sky-600" />
                  <h4 className="font-black text-xs uppercase text-primary">
                    {isAr ? "الترتيب الإجباري لإضافة المواد في صهريج الرش (لتفادي التكتل)" : "Ordre d'incorporation officiel en cuve (Règle d'or de solubilité)"}
                  </h4>
                </div>

                <div className="space-y-1.5">
                  {TANK_MIX_ORDER_STEPS.map((st) => (
                    <div key={st.step} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 border text-xs">
                      <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shrink-0">
                        {st.step}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-foreground">
                          {isAr ? st.labelAr : st.labelFr}
                        </p>
                      </div>
                      <span dir="ltr" className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-background border text-muted-foreground">
                        {st.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RÈGLES D'INCOMPATIBILITÉ TANK MIX (engine.ts) */}
              <div className="border-2 border-rose-500/30 rounded-2xl p-4 bg-rose-500/5 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-rose-500/20 pb-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <h4 className="font-black text-xs uppercase text-rose-700 dark:text-rose-400">
                    {isAr
                      ? "ممنوعات وتعارضات الخلط في الصهريج (Tank Mix)"
                      : "Règles d'Incompatibilité en Cuve (Mélanges Interdits)"}
                  </h4>
                </div>
                <div className="space-y-2">
                  {TANK_MIX_COMPATIBILITY_RULES.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-background/90 border border-rose-500/20 space-y-1 text-[11px]"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span dir="ltr" className="inline-block font-mono text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          {rule.groupA}
                        </span>
                        <span className="font-black text-rose-600">+</span>
                        <span dir="ltr" className="inline-block font-mono text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          {rule.groupB}
                        </span>
                        <span className="text-[10px] font-black text-rose-600 uppercase">
                          ⛔ {isAr ? "خلط ممنوع" : "Interdit"}
                        </span>
                      </div>
                      {rule.warningNotice && (
                        <p className="text-muted-foreground leading-relaxed">{rule.warningNotice}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ONGLET 3 : RÉPERTOIRE DES SPÉCIALITÉS COMMERCIALES EN ALGÉRIE (165 FITO INPV) */}
          {/* ========================================================= */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              {/* Filtre par espèce (الكل / زيتون / تفاح / نكتارين) + contrôle du stade sélectionné */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl border bg-muted/20">
                <div className="flex flex-wrap items-center gap-1.5">
                  {([
                    { id: 'all' as const, icon: '🌿', fr: 'Toutes', ar: 'الكل' },
                    { id: 'olivier' as const, icon: '🫒', fr: 'Olivier', ar: 'زيتون' },
                    { id: 'pommier' as const, icon: '🍎', fr: 'Pommier', ar: 'تفاح' },
                    { id: 'nectarinier' as const, icon: '🍑', fr: 'Nectarinier', ar: 'نكتارين' },
                  ]).map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setCatalogCropFilter(sp.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                        catalogCropFilter === sp.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-background text-muted-foreground border-input hover:bg-muted'
                      }`}
                    >
                      <span>{sp.icon}</span>
                      <span>{isAr ? sp.ar : sp.fr}</span>
                    </button>
                  ))}
                </div>

                {/* Bascule masquer/afficher les produits bloqués au stade phénologique de l'étape 1 */}
                <button
                  type="button"
                  onClick={() => setHideBlockedInCatalog((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    hideBlockedInCatalog
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-background text-muted-foreground border-input hover:bg-muted'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>
                    {hideBlockedInCatalog
                      ? isAr
                        ? `الممنوعة مخفية (${PHENOLOGICAL_STAGES.find((s) => s.id === selectedStage)?.labelAr || selectedStage})`
                        : `Bloqués masqués (${PHENOLOGICAL_STAGES.find((s) => s.id === selectedStage)?.labelFr || selectedStage})`
                      : isAr
                        ? `إخفاء الممنوعة في طور: ${PHENOLOGICAL_STAGES.find((s) => s.id === selectedStage)?.labelAr || selectedStage}`
                        : `Masquer les bloqués (${PHENOLOGICAL_STAGES.find((s) => s.id === selectedStage)?.labelFr || selectedStage})`}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder={isAr ? "ابحث باسم الدواء التجاري، المادة الفعالة، رقم التسجيل أو الآفة..." : "Rechercher une spécialité, matière active, n° homologation, cible..."}
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs font-bold"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground font-bold shrink-0">
                  <span dir="ltr" className="inline-block font-mono">{filteredCatalog.length}</span> / <span dir="ltr" className="inline-block font-mono">{PHYTO_DATABASE.length}</span> {isAr ? "دواء" : "spécialité(s)"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCatalog.map(({ prod, stageCheck }, idx) => {
                  const isValidated = prod.validationStatus === 'validated';
                  return (
                    <div
                      key={`${prod.name}-${idx}`}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2 shadow-xs ${
                        stageCheck.blocked
                          ? 'bg-destructive/[0.04] border-destructive/40 opacity-90'
                          : 'bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-black text-xs text-foreground">{prod.name}</h4>
                            {prod.formulation && (
                              <span dir="ltr" className="inline-block font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                                {prod.formulation}
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                isValidated
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                                  : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30'
                              }`}
                            >
                              {isValidated
                                ? isAr ? '✓ معتمد FITO' : '✓ Validé FITO'
                                : isAr ? 'إرشادي' : 'Indicatif'}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                            {isAr && prod.matiereActiveAr
                              ? `${prod.matiereActiveAr} (${prod.matiereActive || ''})`
                              : prod.matiereActive || '—'}
                          </p>
                        </div>
                        {prod.codeGroup && (
                          <span dir="ltr" className="inline-block whitespace-nowrap text-[9px] font-black px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 shrink-0">
                            {prod.codeGroup}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px] pt-1.5 border-t text-muted-foreground">
                        <div>
                          <strong>{isAr ? "الجرعة :" : "Dose :"}</strong>{" "}
                          <span dir="ltr" className="inline-block font-mono">{prod.dosage}</span>
                        </div>
                        <div>
                          <strong>DAR :</strong>{" "}
                          <span dir="ltr" className="inline-block font-mono">{prod.dar}</span>
                        </div>
                        {prod.homologation && (
                          <div>
                            <strong>INPV :</strong>{" "}
                            <span dir="ltr" className="inline-block font-mono">{prod.homologation}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        <strong className="text-foreground/80">{isAr ? "الهدف :" : "Cible :"}</strong> {prod.cible}
                      </p>

                      {stageCheck.blocked && (
                        <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-1.5 text-[10px] font-bold leading-snug">
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>
                            {isAr ? "ممنوع في هذا الطور : " : "Bloqué à ce stade : "}
                            {stageCheck.reason || prod.blockedReason || (isAr ? "غير مسموح في المرحلة الحالية" : "Non autorisé au stade sélectionné")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PIED DE PAGE : RÈGLE D'OR SCIENTIFIQUE */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 to-emerald-500/10 border border-sky-500/20 flex items-start gap-3 text-muted-foreground">
            <HelpCircle className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-foreground text-xs">
                {isAr
                  ? "القاعدة الذهبية لإدارة المقاومة (IRAC / FRAC) :"
                  : "Règle d'or de prévention de la résistance (IRAC / FRAC) :"}
              </p>
              <p className="text-[11px] leading-relaxed">
                {isAr
                  ? "لا تقم أبداً بمعاملة متتالية لنفس المحصول بنفس مجموعة الأثر الكيميائي (نفس رقم المجموعة)، بل يجب حتماً التناوب بين مجاميع مختلفة لمنع تكاثر الطفرات المقاومة للمبيدات."
                  : "Ne réalisez jamais deux traitements successifs avec le même code de groupe chimique (même numéro). L'alternance stricte des modes d'action est indispensable pour préserver l'efficacité des matières actives."}
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale de la galerie visuelle hybride en 3 niveaux */}
      <PestVisualGalleryDialog
        pest={galleryPest}
        crop={currentCrop}
        open={!!galleryPest}
        onOpenChange={(op) => !op && setGalleryPest(null)}
        onConfirmSelection={(id) => {
          setSelectedPestId(id);
          setGalleryPest(null);
        }}
      />
    </>,
    document.body
  );
}
