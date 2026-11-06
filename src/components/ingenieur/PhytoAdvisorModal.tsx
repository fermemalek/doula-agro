import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  ArrowRight
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  CropType,
  GrowthStage,
  ActiveIngredient,
  PestTarget,
  PhytosanitaryEngine,
  SprayApplicationRecord,
} from '@/lib/phyto/engine';
import {
  PHENOLOGICAL_STAGES,
  ACTIVE_INGREDIENTS_DATABASE,
  PEST_TARGETS_DATABASE,
} from '@/lib/phyto/database';
import { useAllModuleRecords } from '@/lib/modules-store';
import { useRecommendations } from '@/lib/cloud/recommendations';

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

  // Mapper le groupe de culture de Doula vers CropType
  const currentCrop: CropType = useMemo(() => {
    const c = (cropGroup || '').toLowerCase();
    if (c.includes('oliv')) return 'olive';
    if (c.includes('pomm')) return 'pomme';
    if (c.includes('nectar')) return 'nectarine';
    if (c.includes('pech')) return 'peche';
    return 'nectarine';
  }, [cropGroup]);

  // Étapes de l'assistant
  const [selectedStage, setSelectedStage] = useState<GrowthStage>('floraison');
  const [selectedPestId, setSelectedPestId] = useState<string | null>(null);
  const [pressureLevel, setPressureLevel] = useState<'legere' | 'moyenne' | 'forte'>('moyenne');

  // Traitements historiques passés pour détecter les résistances
  const { data: recos = [] } = useRecommendations();
  const modulePhytoRecords = useAllModuleRecords('phytosanitaire');

  const historyLogs: SprayApplicationRecord[] = useMemo(() => {
    const logs: SprayApplicationRecord[] = [];

    // 1. Extraire depuis les recommandations acceptées
    for (const r of recos) {
      if (r.kind === 'phytosanitaire') {
        const payload = (r.payload || {}) as any;
        const prog = payload.program || {};
        const products = prog.products || [];
        for (const p of products) {
          const pName = (p.product || '').toLowerCase();
          // Trouver l'ingrédient correspondant
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
            });
          }
        }
      }
    }

    // 2. Extraire depuis les exécutions réelles de module_records
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
        });
      }
    }

    return logs;
  }, [recos, modulePhytoRecords, currentCrop, selectedPestId]);

  // Bioagresseurs éligibles au stade phénologique sélectionné
  const eligiblePests = useMemo(() => {
    return PhytosanitaryEngine.getEligiblePests(PEST_TARGETS_DATABASE, currentCrop, selectedStage);
  }, [currentCrop, selectedStage]);

  // Si aucun bioagresseur sélectionné, sélectionner le premier par défaut
  const activePest = useMemo(() => {
    if (!selectedPestId && eligiblePests.length > 0) {
      return eligiblePests[0];
    }
    return eligiblePests.find(p => p.id === selectedPestId) || eligiblePests[0] || null;
  }, [selectedPestId, eligiblePests]);

  // Évaluation scientifique des matières actives (IRAC / FRAC)
  const evaluatedOptions = useMemo(() => {
    if (!activePest) return [];
    return PhytosanitaryEngine.evaluateTreatmentOptions({
      targetPest: activePest,
      parcelHistory: historyLogs,
      allIngredients: ACTIVE_INGREDIENTS_DATABASE,
      currentSeasonYear: new Date().getFullYear(),
    });
  }, [activePest, historyLogs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl bg-card text-card-foreground p-0 rounded-3xl shadow-2xl border">
        {/* En-tête avec bannière scientifique */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-sky-700 text-white p-5 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
                <Sparkles className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-wide flex items-center gap-2">
                  <span>{isAr ? "دليل الحماية النباتية وإدارة المقاومة (IRAC / FRAC)" : "Moteur Phytosanitaire & Gestion de la Résistance"}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 border border-white/30">
                    FRAC • IRAC
                  </span>
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  {isAr
                    ? "اختيار علمي ذكي للمواد الفعالة حسب المرحلة الفينولوجية مع كسر المقاومة وتناوب مجاميع الأثر"
                    : "Filtrage par stade phénologique, règles d'alternance obligatoire et blocage des résistances croisées"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 text-xs">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
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
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-black shadow-xs ring-2 ring-primary/20 scale-102"
                        : "border-input bg-background hover:bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    <span className="text-lg">{st.icon}</span>
                    <span className="text-[10px] font-bold line-clamp-2 mt-1 leading-tight">
                      {isAr ? st.labelAr.split(" ")[0] : st.labelFr.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ÉTAPE 2 : CHOIX DU BIOAGRESSEUR ÉLIGIBLE */}
          <div className="border rounded-2xl p-4 bg-muted/20 space-y-3">
            <label className="font-black text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>2️⃣</span> {isAr ? "الآفة أو المرض الملاحظ في هذا الطور" : "Bioagresseur / Maladie détecté(e)"}
              <span className="text-[10px] font-normal lowercase text-muted-foreground">
                ({eligiblePests.length} {isAr ? "محتمل" : "observable(s)"})
              </span>
            </label>

            {eligiblePests.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground italic">
                {isAr
                  ? "لا توجد آفات وبائية رئيسية مسجلة في هذا الطور الفينولوجي."
                  : "Aucun bioagresseur majeur recensé pour ce stade végétatif."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {eligiblePests.map((pest) => {
                  const isSelected = activePest?.id === pest.id;
                  const catColor =
                    pest.category === 'champignon'
                      ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                      : pest.category === 'insecte'
                      ? 'bg-rose-500/10 text-rose-700 border-rose-500/30'
                      : 'bg-violet-500/10 text-violet-700 border-violet-500/30';

                  return (
                    <div
                      key={pest.id}
                      onClick={() => setSelectedPestId(pest.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                          : "border-input bg-background hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${catColor}`}>
                          {pest.category}
                        </span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <p className="font-black text-xs mt-1.5 leading-snug">
                        {isAr ? pest.nameAr : pest.nameFr}
                      </p>
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">
                        {pest.nameScientific}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Fiche descriptive du bioagresseur sélectionné */}
            {activePest && (
              <div className="p-3 rounded-xl bg-background border flex items-start gap-2.5 text-muted-foreground">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-foreground">{isAr ? "الأعراض والتشخيص : " : "Symptômes & Diagnostic : "}</strong>
                  {isAr ? activePest.descriptionAr : activePest.descriptionFr}
                </p>
              </div>
            )}
          </div>

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
                {evaluatedOptions.map(({ ingredient, isAllowed, blockReason, priorityScore, currentSeasonUsageCount }) => {
                  const isFrac = ingredient.type === 'FRAC';
                  const badgeColor = isFrac
                    ? 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30'
                    : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';

                  return (
                    <div
                      key={ingredient.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isAllowed
                          ? "bg-card border-input hover:border-primary/50 shadow-xs"
                          : "bg-destructive/[0.04] border-destructive/30 opacity-75"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-foreground">
                              {ingredient.name}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                              {ingredient.codeGroup}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              ({ingredient.familyChemical})
                            </span>
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
                              <span>{isAr ? "ممنوع لتفادي المقاومة" : "Exclu Anti-Résistance"}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Indicateurs techniques : DAR, DRE, Dose, Quota saison */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t text-[11px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span><strong>DAR (PHI) :</strong> {ingredient.phiDays} {isAr ? "يوم" : "jours"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                          <span><strong>DRE (REI) :</strong> {ingredient.reiHours}h</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Beaker className="h-3.5 w-3.5 text-emerald-600" />
                          <span><strong>Dose :</strong> {ingredient.standardDose}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Layers className="h-3.5 w-3.5 text-violet-600" />
                          <span><strong>Passages saison :</strong> {currentSeasonUsageCount}/{ingredient.maxApplicationsPerSeason}</span>
                        </div>
                      </div>

                      {/* Message de blocage scientifique en rouge si interdit */}
                      {!isAllowed && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2 text-[11px] font-medium leading-relaxed">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                          <span>{blockReason}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RÈGLE D'OR SCIENTIFIQUE */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 to-emerald-500/10 border border-sky-500/20 flex items-start gap-3 text-muted-foreground">
            <HelpCircle className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-foreground text-xs">
                {isAr
                  ? "القاعدة الذهبية لتفادي السلالات المقاومة (IRAC / FRAC) :"
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
      </DialogContent>
    </Dialog>
  );
}
