import { useMemo, useState } from "react";
import { Trash2, CalendarCheck, Flower2, Copy, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useParcels } from "@/lib/parcel-store";
import { useTranslation } from "@/lib/i18n";
import {
  getVarietyProfileForParcel,
  deleteVarietyCampaignRecord,
} from "@/lib/chilling/varietiesConfig";
import { RecolteFruitsFrais } from "./RecolteFruitsFrais";
import { RecolteOlivier } from "./RecolteOlivier";
import { formatDateFR } from "@/lib/format";

export function RecolteModule({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const parcels = useParcels();
  const parcel = useMemo(() => parcels.find((p) => p.id === parcelId), [parcels, parcelId]);
  const [catalogTick, setCatalogTick] = useState(0);
  const varietyProfile = useMemo(() => {
    void catalogTick;
    return getVarietyProfileForParcel(parcel);
  }, [parcel, catalogTick]);

  // Détection automatique du mode selon l'espèce de la parcelle (P1-P4 -> Olivier ; P5-P8 -> Fruits frais)
  const isOliveParcel = useMemo(() => {
    const idLow = parcelId.toLowerCase();
    const typeLow = (parcel?.type || "").toLowerCase();
    const nameLow = (parcel?.name || "").toLowerCase();
    return (
      typeLow === "olivier" ||
      ["p1", "p2", "p3", "p4"].includes(idLow) ||
      nameLow.includes("oliv") ||
      nameLow.includes("زيتون")
    );
  }, [parcelId, parcel]);

  // Pré-remplissage depuis l'historique variétal ("Utiliser cette date")
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [prefillNotes, setPrefillNotes] = useState<string | undefined>(undefined);

  // Contrôle d'ouverture du formulaire de récolte complet (Cueillette & Trituration / Salle de tri)
  const [harvestFormOpen, setHarvestFormOpen] = useState(false);

  function openAddHarvestForm() {
    setHarvestFormOpen(true);
  }

  function handleDeleteCampaign(year: number) {
    if (!varietyProfile) return;
    if (
      !window.confirm(
        isAr
          ? `هل تريد حذف سجل الجني لحملة ${year}؟`
          : `Supprimer l'historique de récolte de la campagne ${year} ?`
      )
    )
      return;
    deleteVarietyCampaignRecord(varietyProfile.id, year);
    setCatalogTick((n) => n + 1);
    toast.success(isAr ? `تم حذف حملة ${year}.` : `Campagne ${year} supprimée.`);
  }

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {/* Historique & dates de récolte issus du référentiel variétal de l'espèce */}
      {varietyProfile && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/15 pb-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4" />
                <span>
                  {varietyProfile.icon}{" "}
                  {isAr
                    ? `سجل الجني — ${varietyProfile.nameAr}`
                    : `Historique des récoltes — ${varietyProfile.nameFr}`}
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground">
                {varietyProfile.campaignHistory.filter((h) => h.harvestStartDate).length}{" "}
                {isAr ? "مواسم" : "campagnes"}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setHarvestFormOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-bold hover:bg-emerald-700 transition cursor-pointer"
                >
                  {harvestFormOpen ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  <span>
                    {harvestFormOpen
                      ? isAr
                        ? "إغلاق"
                        : "Fermer"
                      : isAr
                        ? "إضافة"
                        : "Ajouter"}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {[...varietyProfile.campaignHistory]
              .sort((a, b) => b.year - a.year)
              .filter((h) => h.harvestStartDate)
              .map((h) => (
                <div key={h.year} className="rounded-xl border bg-card p-3 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span dir="ltr" className="rounded-md bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5">
                        {h.year}
                      </span>
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{isAr ? "بداية الجني :" : "Début récolte :"}</span>
                        <span dir="ltr" className="font-mono">{formatDateFR(h.harvestStartDate)}</span>
                      </span>
                      {h.bloomStartDate && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Flower2 className="h-3.5 w-3.5 text-rose-500" />
                          <span>{isAr ? "التزهير :" : "Floraison :"}</span>
                          <span dir="ltr" className="font-mono font-semibold text-foreground">{formatDateFR(h.bloomStartDate)}</span>
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPrefillDate(h.harvestStartDate);
                            setPrefillNotes(h.notes);
                            openAddHarvestForm();
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          <span>{isAr ? "استعمال التاريخ" : "Utiliser cette date"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(h.year)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {h.notes && (
                    <p className="text-[11px] text-muted-foreground italic bg-muted/40 rounded-lg px-2.5 py-1.5">
                      « {h.notes} »
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Adaptation automatique selon l'espèce : Mode Oléiculture (P1–P4) vs Mode Fruits Frais (P5–P8) */}
      {isOliveParcel ? (
        <RecolteOlivier
          parcelId={parcelId}
          parcel={parcel}
          canEdit={canEdit}
          showForm={harvestFormOpen}
          onOpenForm={() => setHarvestFormOpen(true)}
          onCloseForm={() => setHarvestFormOpen(false)}
          prefillDate={prefillDate}
          prefillNotes={prefillNotes}
        />
      ) : (
        <RecolteFruitsFrais
          parcelId={parcelId}
          parcel={parcel}
          canEdit={canEdit}
          showForm={harvestFormOpen}
          onOpenForm={() => setHarvestFormOpen(true)}
          onCloseForm={() => setHarvestFormOpen(false)}
          prefillDate={prefillDate}
          prefillNotes={prefillNotes}
        />
      )}
    </div>
  );
}
