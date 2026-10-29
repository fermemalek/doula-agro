import { useState } from "react";
import { Save, Trash2, History, Image as ImageIcon, Scissors } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";

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
