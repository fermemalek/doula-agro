import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PestTarget, SymptomOrganSample, getPestVisualAsset, resolvePhytoImageUrl } from '@/lib/phyto/engine';
import { 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  Image as ImageIcon, 
  AlertCircle, 
  Sparkles,
  Leaf,
  Apple,
  Flower2,
  TreePine,
  ShieldCheck,
  X
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface PestVisualGalleryDialogProps {
  pest: PestTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSelection?: (pestId: string) => void;
}

export const PestVisualGalleryDialog: React.FC<PestVisualGalleryDialogProps> = ({
  pest,
  open,
  onOpenChange,
  onConfirmSelection,
}) => {
  const { currentLang } = useTranslation();
  const isAr = currentLang === 'ar';

  const [selectedOrganIndex, setSelectedOrganIndex] = useState<number>(0);
  const [imgError, setImgError] = useState<boolean>(false);

  if (!pest) return null;

  // Organes de symptômes disponibles
  const organs: SymptomOrganSample[] = pest.symptomOrgans && pest.symptomOrgans.length > 0
    ? pest.symptomOrgans
    : [
        {
          organ: 'general',
          organFr: 'Symptômes généraux',
          organAr: 'الأعراض العامة',
          imageUrl: pest.primarySampleUrl,
          descriptionFr: pest.descriptionFr,
          descriptionAr: pest.descriptionAr,
        },
      ];

  const localDefaultAsset = getPestVisualAsset(pest);
  const activeOrgan = organs[selectedOrganIndex] || organs[0];

  // URL de l'image actuelle à afficher (priorité à l'organe, puis échantillon principal ou asset local)
  // Priorité au visuel local Data URL ou image d'organe si disponible et non en erreur
  const currentImageUrl = !imgError && activeOrgan.imageUrl && !activeOrgan.imageUrl.startsWith('http')
    ? (activeOrgan.imageUrl.startsWith('data:') ? activeOrgan.imageUrl : localDefaultAsset)
    : (!imgError && activeOrgan.imageUrl ? resolvePhytoImageUrl(activeOrgan.imageUrl) : localDefaultAsset) || localDefaultAsset;

  // Niveau 3 : Recherche Web Google Images ciblée sur le nom scientifique universel
  const openWebSearch = () => {
    const query = encodeURIComponent(`${pest.nameScientific} symptoms agricultural damage plant pathology`);
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${query}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  // Helper pour l'icône de l'organe
  const getOrganIcon = (organType: string) => {
    switch (organType) {
      case 'feuille':
        return <Leaf className="h-4 w-4" />;
      case 'fruit':
        return <Apple className="h-4 w-4" />;
      case 'fleur':
        return <Flower2 className="h-4 w-4" />;
      case 'rameau':
      case 'racine':
        return <TreePine className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'champignon':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'insecte':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
      case 'bacterie':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
      default:
        return 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl bg-card text-card-foreground p-0 rounded-3xl shadow-2xl border">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white p-5 rounded-t-3xl relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-white/10 backdrop-blur-md text-white border-white/20`}>
                  {pest.category}
                </span>
                <span className="text-[11px] font-mono italic text-emerald-200">
                  {pest.nameScientific}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight">
                {isAr ? pest.nameAr : pest.nameFr}
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                {isAr ? pest.nameFr : pest.nameAr}
              </p>
            </div>
            
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* NIVEAU 2 : Sélecteur d'organes touchés */}
          {organs.length > 1 && (
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                {isAr ? "اختر العضو المصاب للمعاينة :" : "Organe touché / Symptôme :"}
              </span>
              <div className="flex flex-wrap gap-2">
                {organs.map((org, idx) => {
                  const isSelected = selectedOrganIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedOrganIndex(idx);
                        setImgError(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20 scale-102"
                          : "border-input bg-background hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {getOrganIcon(org.organ)}
                      <span>{isAr ? org.organAr : org.organFr}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* NIVEAU 1 : Zone d'affichage visuel (Image ou Illustration représentative) */}
          <div className="rounded-2xl border bg-muted/20 overflow-hidden relative shadow-inner">
            {currentImageUrl ? (
              <div className="relative group">
                <img
                  src={currentImageUrl}
                  alt={isAr ? pest.nameAr : pest.nameFr}
                  onError={() => {
                    if (currentImageUrl !== localDefaultAsset) {
                      setImgError(true);
                    }
                  }}
                  className="w-full h-64 object-cover object-center transition-transform duration-300 group-hover:scale-102"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                  <div className="text-white text-xs font-medium backdrop-blur-xs bg-black/30 p-2 rounded-xl">
                    <p className="font-bold">{isAr ? activeOrgan.organAr : activeOrgan.organFr}</p>
                    <p className="text-[11px] text-white/90 italic">{pest.nameScientific}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-muted/30 to-muted/80">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
                  <ImageIcon className="h-8 w-8 text-primary/70" />
                </div>
                <p className="text-xs font-bold text-foreground">
                  {isAr ? "صورة مرجعية محفوظة أوفلاين غير متوفرة" : "Image locale de référence non disponible en cache"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                  {isAr
                    ? "يمكنك الاعتماد على الوصف الفني أسفله أو فتح البحث المباشر في Google الصور بالاسم العلمي."
                    : "Consultez la fiche descriptive ci-dessous ou lancez la recherche web ciblée par nom scientifique."}
                </p>
              </div>
            )}
          </div>

          {/* Description clinique des dégâts */}
          <div className="rounded-2xl border p-4 bg-background shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wide">
              <Sparkles className="h-4 w-4" />
              <span>{isAr ? "الوصف التشخيصي الميداني" : "Diagnostic & Symptômes caractéristiques"}</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed font-medium">
              {isAr
                ? activeOrgan.descriptionAr || pest.descriptionAr
                : activeOrgan.descriptionFr || pest.descriptionFr}
            </p>
          </div>

          {/* NIVEAU 3 : Bouton de secours - Recherche Web directe sans saisie */}
          <div className="pt-1">
            <button
              type="button"
              onClick={openWebSearch}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition-all shadow-xs"
            >
              <Search className="h-4 w-4" />
              <span>
                {isAr
                  ? `🔍 بحث مباشر بالاسم العلمي في Google الصور (${pest.nameScientific})`
                  : `🔍 Voir plus de photos sur le Web (${pest.nameScientific})`}
              </span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </button>
            <p className="text-[10px] text-center text-muted-foreground mt-1">
              {isAr
                ? "يفتح المتصفح مباشرة بالاسم اللاتيني العلمي المعتمد دولياً في قواعد البيانات الزراعية (INRAE, EPPO)."
                : "Recherche ciblée automatique en latin évitant les erreurs de traduction (INRAE / EPPO / UC IPM)."}
            </p>
          </div>

          {/* Actions : Validation ou Fermeture */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {onConfirmSelection && (
              <button
                type="button"
                onClick={() => {
                  onConfirmSelection(pest.id);
                  onOpenChange(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isAr ? "تأكيد التشخيص واختيار هذه الآفة" : "Confirmer le diagnostic & Sélectionner"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="py-3 px-4 rounded-xl border border-input bg-background hover:bg-muted text-muted-foreground font-bold text-xs transition-all"
            >
              {isAr ? "إغلاق" : "Fermer"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

