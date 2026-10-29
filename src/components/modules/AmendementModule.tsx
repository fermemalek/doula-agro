import { useState } from "react";
import { Save, Trash2, History, Image as ImageIcon, Leaf, Plus } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";

interface CompostItem {
  typeCompost: string;
  qty: string;
  price: string;
}

type Record = {
  id: string;
  createdAt: number;
  date: string;
  compostItems?: CompostItem[];
  typeCompost: string; // fallback
  qty: string; // fallback or total
  unit: string;
  price: string; // fallback
  totalCost: string;
  notes: string;
  photo?: string;
};

const TYPES_COMPOST = [
  "Mouton / أغنام",
  "Vache / أبقار",
  "Poulet / دواجن",
  "Mélange / مختلط",
  "Autre / آخر"
];

export function AmendementModule({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const records = useModuleRecords<Record>(parcelId, "amendement");
  const { add, remove } = useModuleActions();
  
  const [date, setDate] = useState("");
  const [unit, setUnit] = useState("Tonnes");
  const [compostItems, setCompostItems] = useState<CompostItem[]>([
    { typeCompost: TYPES_COMPOST[0], qty: "", price: "" }
  ]);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);

  const totalQty = compostItems.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
  const computedTotal = compostItems.reduce((sum, item) => {
    const q = parseFloat(item.qty) || 0;
    const p = parseFloat(item.price) || 0;
    return sum + (q * p);
  }, 0);

  function onPhoto(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(file);
  }

  function addCompostLine() {
    setCompostItems((prev) => [
      ...prev,
      { typeCompost: TYPES_COMPOST[0], qty: "", price: "" }
    ]);
  }

  function removeCompostLine(idx: number) {
    if (compostItems.length <= 1) return;
    setCompostItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCompostLine(idx: number, patch: Partial<CompostItem>) {
    setCompostItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  }

  function save() {
    if (!date || totalQty === 0) return;
    const payload = {
      date,
      unit,
      compostItems,
      typeCompost: compostItems[0]?.typeCompost || "", // fallback
      qty: totalQty.toString(),
      price: (compostItems[0]?.price || "0").toString(), // fallback
      totalCost: computedTotal.toString(),
      notes,
      photo
    };
    add(parcelId, "amendement", payload);
    setDate("");
    setUnit("Tonnes");
    setCompostItems([{ typeCompost: TYPES_COMPOST[0], qty: "", price: "" }]);
    setNotes("");
    setPhoto(undefined);
  }

  const cls = "rounded border border-input bg-background px-2 py-1 text-sm w-full";

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Leaf className="h-4 w-4 text-emerald-600" /> Nouvel amendement organique (Compost)
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Date d'apport</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Unité de quantité</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={cls}>
                <option>Tonnes</option>
                <option>Kg</option>
                <option>Camion / شاحنة</option>
              </select>
            </div>
          </div>

          {/* compost list inputs */}
          <div className="border-t pt-2 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Composition du compost</h4>
              <button
                type="button"
                onClick={addCompostLine}
                className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un compost
              </button>
            </div>

            <div className="space-y-2.5 bg-muted/20 p-2 rounded-lg">
              {compostItems.map((item, idx) => {
                const itemQ = parseFloat(item.qty) || 0;
                const itemP = parseFloat(item.price) || 0;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b border-dashed border-muted pb-2 last:border-b-0 last:pb-0">
                    <div className="col-span-4">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground">Type compost</label>
                      <select
                        value={item.typeCompost}
                        onChange={(e) => updateCompostLine(idx, { typeCompost: e.target.value })}
                        className="rounded border border-input bg-background px-2 py-1 text-xs w-full"
                      >
                        {TYPES_COMPOST.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground">Quantité</label>
                      <input
                        value={item.qty}
                        inputMode="decimal"
                        onChange={(e) => updateCompostLine(idx, { qty: e.target.value })}
                        placeholder="Ex: 5"
                        className="rounded border border-input bg-background px-2 py-1 text-xs w-full text-right"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground">Prix unit (DA)</label>
                      <input
                        value={item.price}
                        inputMode="decimal"
                        onChange={(e) => updateCompostLine(idx, { price: e.target.value })}
                        placeholder="Ex: 8000"
                        className="rounded border border-input bg-background px-2 py-1 text-xs w-full text-right"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between pl-1">
                      {itemQ * itemP > 0 ? (
                        <span className="text-[9px] font-bold text-olive-dark">{(itemQ * itemP).toFixed(0)} DA</span>
                      ) : (
                        <span />
                      )}
                      {compostItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCompostLine(idx)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> {photo ? "Photo ajoutée" : "Photo de l'amendement"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
          </div>
          
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (fournisseur, détails du mélange...)" className={`${cls} min-h-16 resize-y`} />

          <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span>Quantité totale</span>
              <b>{totalQty.toFixed(1)} {unit}</b>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-1 text-primary">
              <span>Coût total de l'amendement</span>
              <span>{computedTotal.toFixed(2)} DA</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={save} disabled={!date || totalQty === 0}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-2 text-sm font-semibold">
          <History className="h-4 w-4" /> Archive des amendements ({records.length})
        </div>
        {records.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucun amendement enregistré.</p>
        ) : (
          <ul className="divide-y">
            {records.map((r) => {
              const total = parseFloat(r.totalCost) || (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0);
              const hasItems = Array.isArray(r.compostItems) && r.compostItems.length > 0;
              return (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{r.date} — {r.qty} {r.unit} d'amendements</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">
                        {total.toFixed(2)} DA
                      </span>
                      {canEdit && (
                        <button onClick={() => remove(parcelId, "amendement", r.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Composition display */}
                  {hasItems ? (
                    <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs bg-muted/40 p-2 rounded-lg text-muted-foreground font-medium">
                      {r.compostItems!.map((item, i) => {
                        const itemQ = parseFloat(item.qty) || 0;
                        const itemP = parseFloat(item.price) || 0;
                        return (
                          <div key={i}>
                            • <b>{item.typeCompost.split("/")[0]}</b> : {item.qty} {r.unit} @ {item.price} DA = <b>{(itemQ * itemP).toFixed(0)} DA</b>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Type compost : {r.typeCompost.split("/")[0]} · Quantité : {r.qty} {r.unit} · Prix unit. : {(parseFloat(r.price) || 0).toFixed(0)} DA
                    </div>
                  )}

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
