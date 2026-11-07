import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { 
  PestTarget, 
  SymptomOrganSample, 
  getPestVisualAsset, 
  resolvePhytoImageUrl,
  CropType 
} from '@/lib/phyto/engine';
import { 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  Image as ImageIcon, 
  Sparkles,
  Leaf,
  Apple,
  Flower2,
  TreePine,
  ShieldCheck,
  X,
  Camera,
  Layers
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface PestVisualGalleryDialogProps {
  pest: PestTarget | null;
  crop?: CropType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSelection?: (pestId: string) => void;
}

interface CropMetadata {
  cropKey: CropType;
  nameFr: string;
  nameAr: string;
  latinHost: string;
  searchFilter: string;
  organFilter: (organType: string) => string;
}

const getCropMetadata = (c?: CropType, fallbackCrops?: string[]): CropMetadata => {
  let effective: CropType = c || 'olive';
  if (!c && fallbackCrops && fallbackCrops.length > 0) {
    const f = fallbackCrops[0];
    if (f === 'pomme' || f === 'olive' || f === 'peche' || f === 'nectarine') {
      effective = f;
    }
  }

  switch (effective) {
    case 'olive':
      return {
        cropKey: 'olive',
        nameFr: "l'Olivier",
        nameAr: 'أشجار الزيتون',
        latinHost: 'Olea europaea',
        // Requête stricte pour filtrer exclusivement l'olivier et exclure mangues, papayes, agrumes, etc.
        searchFilter: '("olive" OR "olive tree" OR "olivier" OR "Olea europaea") -mango -papaya -citrus -coffee',
        organFilter: (organ: string) => {
          if (organ === 'fruit') return '("olive fruit" OR "olives")';
          if (organ === 'feuille') return '("olive leaf" OR "leaves")';
          if (organ === 'rameau') return '("olive branch" OR "twig")';
          return '';
        }
      };
    case 'pomme':
      return {
        cropKey: 'pomme',
        nameFr: 'le Pommier',
        nameAr: 'أشجار التفاح',
        latinHost: 'Malus domestica',
        searchFilter: '("apple" OR "apple tree" OR "pommier" OR "Malus domestica") -citrus -mango -papaya',
        organFilter: (organ: string) => {
          if (organ === 'fruit') return '("apple fruit" OR "pommes")';
          if (organ === 'feuille') return '("apple leaf" OR "leaves")';
          return '';
        }
      };
    case 'peche':
    case 'nectarine':
      return {
        cropKey: effective,
        nameFr: 'le Pêcher / Nectarine',
        nameAr: 'الخوخ والنكتارين',
        latinHost: 'Prunus persica',
        searchFilter: '("peach" OR "nectarine" OR "pêcher" OR "Prunus persica") -citrus -mango',
        organFilter: (organ: string) => {
          if (organ === 'fruit') return '("peach fruit" OR "nectarine fruit")';
          if (organ === 'feuille') return '("peach leaf" OR "leaves")';
          return '';
        }
      };
    default:
      return {
        cropKey: 'olive',
        nameFr: "l'Arbre fruitier",
        nameAr: 'الأشجار المثمرة',
        latinHost: 'Arboriculture',
        searchFilter: 'orchard fruit tree',
        organFilter: () => ''
      };
  }
};

export const PestVisualGalleryDialog: React.FC<PestVisualGalleryDialogProps> = ({
  pest,
  crop,
  open,
  onOpenChange,
  onConfirmSelection,
}) => {
  const { currentLang } = useTranslation();
  const isAr = currentLang === 'ar';

  const [selectedOrganIndex, setSelectedOrganIndex] = useState<number>(0);
  const [imgError, setImgError] = useState<boolean>(false);

  if (!pest) return null;

  const cropMeta = getCropMetadata(crop, pest.crops);

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

  // URL de l'image actuelle à afficher (priorité à la photo réelle de terrain)
  const candidateUrl = activeOrgan.imageUrl || pest.primarySampleUrl;
  const isSvgOrVector = candidateUrl && (candidateUrl.endsWith('.svg') || candidateUrl.startsWith('data:image/svg'));
  const currentImageUrl = (!imgError && candidateUrl && !isSvgOrVector)
    ? resolvePhytoImageUrl(candidateUrl)
    : localDefaultAsset;

  const isRealPhotoUrl = !imgError && candidateUrl && candidateUrl.startsWith('http');

  // Niveau 3 : Recherche Web Google Images ciblée STRICTEMENT sur l'hôte choisi
  const openWebSearch = () => {
    // 1. Nettoyer le nom scientifique pour éviter les erreurs d'interprétation Google (ex: "Colletotrichum godetioides / gloeosporioides")
    let sciTerms = '';
    if (pest.nameScientific.includes('/')) {
      const parts = pest.nameScientific.split('/').map(p => `"${p.trim()}"`);
      sciTerms = `(${parts.join(' OR ')})`;
    } else {
      const clean = pest.nameScientific.replace(/[()]/g, '').trim();
      sciTerms = `"${clean}"`;
    }

    // 2. Extraire le filtre d'organe sélectionné
    const organQuery = cropMeta.organFilter(activeOrgan.organ);

    // 3. Formuler la requête complète ciblée sur l'espèce fruitière
    const fullQuery = `${sciTerms} ${cropMeta.searchFilter} ${organQuery} symptoms damage plant pathology`
      .replace(/\s+/g, ' ')
      .trim();

    // 4. Ouvrir Google Images directement avec le paramètre &udm=2
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(fullQuery)}&udm=2`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  // Accès direct à la photothèque officielle EPPO (Organisation Européenne et Méditerranéenne pour la Protection des Plantes)
  const openEppoDatabase = () => {
    const mainScientificName = pest.nameScientific.split('/')[0].split('(')[0].trim();
    const eppoUrl = `https://gd.eppo.int/search?k=${encodeURIComponent(mainScientificName)}`;
    window.open(eppoUrl, '_blank', 'noopener,noreferrer');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl bg-card text-card-foreground p-0 rounded-3xl shadow-2xl border">
        {/* En-tête avec indicateur de culture hôte */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white p-5 rounded-t-3xl relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-white/10 backdrop-blur-md text-white border-white/20">
                  {pest.category}
                </span>
                <span className="text-[11px] font-mono italic text-emerald-200">
                  {pest.nameScientific}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  🌱 {isAr ? cropMeta.nameAr : cropMeta.nameFr}
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

          {/* NIVEAU 1 : Zone d'affichage visuel (Photo réelle de terrain sans recadrage abusif) */}
          <div className="rounded-2xl border bg-slate-950 overflow-hidden relative shadow-inner">
            {currentImageUrl ? (
              <div className="relative group flex items-center justify-center min-h-[260px] max-h-[380px] bg-slate-950">
                <img
                  src={currentImageUrl}
                  alt={isAr ? pest.nameAr : pest.nameFr}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => {
                    if (currentImageUrl !== localDefaultAsset) {
                      setImgError(true);
                    }
                  }}
                  className="max-h-[360px] w-auto max-w-full object-contain mx-auto transition-transform duration-300"
                  loading="lazy"
                />

                {/* Badge d'identification du type d'image (100% Photo réelle de terrain) */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md backdrop-blur-md flex items-center gap-1.5 bg-emerald-600/95 text-white border border-emerald-400/50">
                    <Camera className="h-3.5 w-3.5" />
                    <span>{isAr ? "صورة فوتوغرافية حقيقية" : "Photo réelle de terrain"}</span>
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-end p-4 z-10">
                  <div className="text-white text-xs font-medium backdrop-blur-xs bg-black/50 p-2.5 rounded-xl border border-white/10 w-full flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{isAr ? activeOrgan.organAr : activeOrgan.organFr}</p>
                      <p className="text-[11px] text-emerald-300 font-mono italic">{pest.nameScientific} sur {cropMeta.latinHost}</p>
                    </div>
                    <span className="text-[11px] text-white/90 bg-white/15 px-2 py-0.5 rounded-md">
                      {isAr ? cropMeta.nameAr : cropMeta.nameFr}
                    </span>
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

          {/* NIVEAU 3 : Liens ciblés STRICTEMENT sur l'hôte sélectionné */}
          <div className="pt-2 space-y-2">
            {/* Filtre actif clairement affiché */}
            <div className="flex items-center justify-between text-[11px] px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold">
              <span>{isAr ? "🎯 التصفية التلقائية المطبقة :" : "🎯 Recherche filtrée strictement sur :"}</span>
              <span className="font-bold underline">{isAr ? cropMeta.nameAr : cropMeta.nameFr} ({cropMeta.latinHost})</span>
            </div>

            {/* Bouton 1 : Google Images filtré strictement sur l'arbre sélectionné */}
            <button
              type="button"
              onClick={openWebSearch}
              className="w-full flex items-center justify-between gap-3 py-3 px-4 rounded-xl border border-emerald-600/40 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-950 dark:text-emerald-100 font-bold text-xs transition-all shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Search className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-black text-[13px]">
                    {isAr
                      ? `📸 معاينة صور ميدانية حقيقية على ${cropMeta.nameAr}`
                      : `📸 Voir de vraies photos sur ${cropMeta.nameFr} (${pest.nameFr})`}
                  </div>
                  <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                    {isAr
                      ? `استبعاد آلي لكافة المحاصيل الأخرى (مانجو، حمضيات، الخ) بالاسم العلمي اللاتيني`
                      : `Google Images ciblé uniquement sur ${cropMeta.latinHost} (élimine papayes, mangues, agrumes)`}
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-emerald-600" />
            </button>

            {/* Bouton 2 : Photothèque officielle EPPO Global Database */}
            <button
              type="button"
              onClick={openEppoDatabase}
              className="w-full flex items-center justify-between gap-3 py-2.5 px-4 rounded-xl border border-sky-600/30 bg-sky-600/10 hover:bg-sky-600/20 text-sky-950 dark:text-sky-100 font-bold text-xs transition-all shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-left">
                <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0" />
                <div>
                  <div className="font-bold text-xs">
                    {isAr
                      ? `🏛️ قاعدة البيانات الرسمية لوقاية النبات (EPPO Global Database)`
                      : `🏛️ Photothèque officielle EPPO (${pest.nameScientific.split('/')[0].trim()})`}
                  </div>
                  <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                    {isAr
                      ? `صور سريرية معتمدة من منظمة وقاية النبات الأوروبية والمتوسطية`
                      : `Photographies haute résolution certifiées par les pathologistes végétaux`}
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-sky-600" />
            </button>
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
