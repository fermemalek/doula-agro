import { useMemo, useState } from "react";
import { Save, Trash2, History, Image as ImageIcon, Scissors, Calendar, Flower2, Clock, Copy } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcels } from "@/lib/parcel-store";
import { getVarietyProfileForParcel, computePruningToBloomDays } from "@/lib/chilling/varietiesConfig";

type Record = {
  id: string;
  createdAt: number;
  date: string;
  typeTaille: string;
  mainOeuvre: string;
  equipements: string;
  notes: string;
  photo?: string;
};

const TYPES_TAILLE = [
  "Taille de formation / تقليم التكوين",
  "Taille de fructification / تقليم الإثمار",
  "Taille de rajeunissement / تقليم التشبيب",
  "Taille de nettoyage / تقليم التنظيف",
  "Autre / آخر"
];

export function TailleModule({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const records = useModuleRecords<Record>(parcelId, "taille");
  const { add, remove } = useModuleActions();
  const parcels = useParcels();
  const parcel = useMemo(() => parcels.find((p) => p.id === parcelId), [parcels, parcelId]);
  const varietyProfile = useMemo(() => getVarietyProfileForParcel(parcel), [parcel]);
  const [f, setF] = useState({
    date: "",
    typeTaille: TYPES_TAILLE[0],
    mainOeuvre: "",
    equipements: "",
    notes: "",
    photo: undefined as string | undefined,
  });

  const charges = (parseFloat(f.mainOeuvre) || 0) + (parseFloat(f.equipements) || 0);

  function onPhoto(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setF((p) => ({ ...p, photo: r.result as string }));
    r.readAsDataURL(file);
  }

  function save() {
    if (!f.date || !f.typeTaille) return;
    add(parcelId, "taille", f);
    setF({
      date: "",
      typeTaille: TYPES_TAILLE[0],
      mainOeuvre: "",
      equipements: "",
      notes: "",
      photo: undefined,
    });
  }

  const cls = "rounded border border-input bg-background px-2 py-1 text-sm w-full";

  return (
    <div className="space-y-4">
      {/* Historique de taille issu du référentiel variétal de l'espèce */}
      {varietyProfile && varietyProfile.campaignHistory.length > 0 && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>
                {varietyProfile.icon} Historique des tailles — {varietyProfile.nameFr}
              </span>
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground">
              {varietyProfile.campaignHistory.length} campagne{varietyProfile.campaignHistory.length > 1 ? "s" : ""} enregistrée{varietyProfile.campaignHistory.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-2">
            {[...varietyProfile.campaignHistory]
              .sort((a, b) => b.year - a.year)
              .filter((h) => h.pruningDate)
              .map((h) => {
                const delay = computePruningToBloomDays(h.pruningDate, h.bloomStartDate);
                return (
                  <div key={h.year} className="rounded-xl border bg-card p-3 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-primary text-primary-foreground font-black text-[10px] px-2 py-0.5">
                          {h.year}
                        </span>
                        <span className="font-bold text-foreground flex items-center gap-1">
                          <Scissors className="h-3.5 w-3.5 text-primary" />
                          Taille : <span dir="ltr" className="font-mono">{h.pruningDate}</span>
                        </span>
                        {h.bloomStartDate && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Flower2 className="h-3.5 w-3.5 text-rose-500" />
                            Floraison : <span dir="ltr" className="font-mono font-semibold text-foreground">{h.bloomStartDate}</span>
                          </span>
                        )}
                        {delay !== null && (
                          <span className="rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-[10px] px-2 py-0.5 inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Délai taille → floraison : {delay} j
                          </span>
                        )}
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            setF((prev) => ({
                              ...prev,
                              date: h.pruningDate || prev.date,
                              notes: h.notes || prev.notes,
                            }))
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary transition cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          Pré-remplir
                        </button>
                      )}
                    </div>
                    {h.notes && (
                      <p className="text-[11px] text-muted-foreground italic bg-muted/40 rounded-lg px-2.5 py-1.5">
                        « {h.notes} »
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {canEdit && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Scissors className="h-4 w-4 text-primary" /> Nouvelle session de taille
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Date</label>
              <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Type de taille</label>
              <select value={f.typeTaille} onChange={(e) => setF({ ...f, typeTaille: e.target.value })} className={cls}>
                {TYPES_TAILLE.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Main d'œuvre (DA)</label>
              <input value={f.mainOeuvre} inputMode="decimal" onChange={(e) => setF({ ...f, mainOeuvre: e.target.value })} placeholder="Ex: 5000" className={cls} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Équipements / Autres (DA)</label>
              <input value={f.equipements} inputMode="decimal" onChange={(e) => setF({ ...f, equipements: e.target.value })} placeholder="Ex: 1500" className={cls} />
            </div>
          </div>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> {f.photo ? "Photo ajoutée" : "Photo de la taille"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
          </div>
          <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder="Notes (observations, état sanitaire des branches...)" className={`${cls} min-h-16 resize-y`} />

          <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-sm">
            <div className="flex justify-between font-bold">
              <span>Coût Total de l'opération</span>
              <span>{charges.toFixed(2)} DA</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={save} disabled={!f.date || !f.typeTaille}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-2 text-sm font-semibold">
          <History className="h-4 w-4" /> Archive des tailles ({records.length})
        </div>
        {records.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune session enregistrée.</p>
        ) : (
          <ul className="divide-y">
            {records.map((r) => {
              const ch = (parseFloat(r.mainOeuvre) || 0) + (parseFloat(r.equipements) || 0);
              return (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{r.date} — {r.typeTaille.split("/")[0]}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">
                        {ch.toFixed(2)} DA
                      </span>
                      {canEdit && (
                        <button onClick={() => remove(parcelId, "taille", r.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>Main d'œuvre : {(parseFloat(r.mainOeuvre) || 0).toFixed(0)} DA</span>
                    <span>Équipements : {(parseFloat(r.equipements) || 0).toFixed(0)} DA</span>
                  </div>
                  {r.notes && <p className="mt-1 text-xs italic text-muted-foreground">{r.notes}</p>}
                  {r.photo && <img src={r.photo} alt="" className="mt-2 h-20 rounded object-cover" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
