import { useMemo, useState } from "react";
import { Save, Trash2, CalendarCheck, Flower2, Copy, Plus, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { useParcels } from "@/lib/parcel-store";
import { useTranslation } from "@/lib/i18n";
import {
  getVarietyProfileForParcel,
  saveVarietyCampaignRecord,
  deleteVarietyCampaignRecord,
  type PhenologyRecord,
} from "@/lib/chilling/varietiesConfig";
import { RecolteFruitsFrais } from "./RecolteFruitsFrais";
import { RecolteOlivier } from "./RecolteOlivier";

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

  // Ajout / Modification d'une campagne de récolte dans le référentiel variétal
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [cYear, setCYear] = useState<number>(new Date().getFullYear());
  const [cHarvestDate, setCHarvestDate] = useState("");
  const [cBloomDate, setCBloomDate] = useState("");
  const [cNotes, setCNotes] = useState("");

  function openAddCampaign() {
    setEditingYear(null);
    setCYear(new Date().getFullYear());
    setCHarvestDate("");
    setCBloomDate("");
    setCNotes("");
    setCampaignFormOpen(true);
  }

  function openEditCampaign(h: PhenologyRecord) {
    setEditingYear(h.year);
    setCYear(h.year);
    setCHarvestDate(h.harvestStartDate || "");
    setCBloomDate(h.bloomStartDate || "");
    setCNotes(h.notes || "");
    setCampaignFormOpen(true);
  }

  function handleSaveCampaign() {
    if (!varietyProfile) return;
    if (!cHarvestDate) {
      toast.error(isAr ? "يرجى إدخال تاريخ بداية الجني." : "Veuillez indiquer la date de début de récolte.");
      return;
    }
    const existing = varietyProfile.campaignHistory.find((h) => h.year === (editingYear ?? cYear));
    saveVarietyCampaignRecord(
      varietyProfile.id,
      {
        ...existing,
        year: Number(cYear) || new Date().getFullYear(),
        pruningDate: existing?.pruningDate || "",
        bloomStartDate: cBloomDate || existing?.bloomStartDate || "",
        harvestStartDate: cHarvestDate,
        notes: cNotes.trim() || undefined,
      },
      editingYear ?? undefined
    );
    setCatalogTick((n) => n + 1);
    setCampaignFormOpen(false);
    setEditingYear(null);
    toast.success(
      isAr
        ? editingYear
          ? "تم تعديل حملة الجني بنجاح!"
          : "تمت إضافة حملة الجني بنجاح!"
        : editingYear
          ? "Campagne de récolte modifiée !"
          : "Campagne de récolte ajoutée !"
    );
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

  const cls = "rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs sm:text-sm w-full";

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
                  onClick={openAddCampaign}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-bold hover:bg-emerald-700 transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isAr ? "إضافة" : "Ajouter"}</span>
                </button>
              )}
            </div>
          </div>

          {campaignFormOpen && canEdit && (
            <div className="rounded-xl border border-emerald-500/30 bg-card p-3 space-y-2.5 text-xs shadow-sm">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-bold text-foreground">
                  {editingYear
                    ? isAr
                      ? `تعديل حملة ${editingYear}`
                      : `Modifier la campagne ${editingYear}`
                    : isAr
                      ? "إضافة حملة جني"
                      : "Ajouter une campagne de récolte"}
                </span>
                <button
                  type="button"
                  onClick={() => setCampaignFormOpen(false)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                    {isAr ? "السنة" : "Année"}
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={cYear}
                    onChange={(e) => setCYear(Number(e.target.value) || new Date().getFullYear())}
                    className={cls}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                    {isAr ? "بداية الجني" : "Début récolte"}
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={cHarvestDate}
                    onChange={(e) => setCHarvestDate(e.target.value)}
                    className={cls}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                    {isAr ? "بداية التزهير" : "Début floraison"}
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={cBloomDate}
                    onChange={(e) => setCBloomDate(e.target.value)}
                    className={cls}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                  {isAr ? "ملاحظات" : "Observations"}
                </label>
                <input
                  type="text"
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  placeholder={isAr ? "مثال: حمولة جيدة..." : "Ex : Bonne charge de fruits..."}
                  className={cls}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCampaignFormOpen(false)}
                  className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Annuler"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCampaign}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  <Save className="h-3 w-3" />
                  <span>{editingYear ? (isAr ? "تحديث" : "Mettre à jour") : isAr ? "حفظ" : "Enregistrer"}</span>
                </button>
              </div>
            </div>
          )}

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
                        <span dir="ltr" className="font-mono">{h.harvestStartDate}</span>
                      </span>
                      {h.bloomStartDate && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Flower2 className="h-3.5 w-3.5 text-rose-500" />
                          <span>{isAr ? "التزهير :" : "Floraison :"}</span>
                          <span dir="ltr" className="font-mono font-semibold text-foreground">{h.bloomStartDate}</span>
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
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          <span>{isAr ? "استعمال التاريخ" : "Utiliser cette date"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditCampaign(h)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
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
          prefillDate={prefillDate}
          prefillNotes={prefillNotes}
        />
      ) : (
        <RecolteFruitsFrais
          parcelId={parcelId}
          parcel={parcel}
          canEdit={canEdit}
          prefillDate={prefillDate}
          prefillNotes={prefillNotes}
        />
      )}
    </div>
  );
}
