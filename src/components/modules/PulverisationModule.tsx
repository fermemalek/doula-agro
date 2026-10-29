import { useState } from "react";
import { Plus, Trash2, Save, History, Pencil, X } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";
import { WeatherCheck } from "./WeatherCheck";

type Item = { name: string; qty: string; unit: string; price: string };
type Record = {
  id: string;
  createdAt: number;
  date: string;
  items: Item[];
  total: number;
  weatherOk: boolean;
  weatherNote: string;
};

const DEFAULT_ELEMENTS = ["Bore", "Zinc", "Algues", "Oligo", "Calcium"];

export function PulverisationModule({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const records = useModuleRecords<Record>(parcelId, "pulverisation");
  const { add, remove, update } = useModuleActions();
  const [date, setDate] = useState("");
  const [items, setItems] = useState<Item[]>(
    DEFAULT_ELEMENTS.map((name) => ({ name, qty: "", unit: "kg", price: "" })),
  );
  const [validated, setValidated] = useState<{ ok: boolean; note: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const total = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0);

  function updateItem(i: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((arr) => [...arr, { name: "", qty: "", unit: "kg", price: "" }]);
  }
  function removeItem(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
  }
  function resetForm() {
    setEditingId(null);
    setDate("");
    setValidated(null);
    setItems(DEFAULT_ELEMENTS.map((name) => ({ name, qty: "", unit: "kg", price: "" })));
  }
  function startEdit(r: Record) {
    setEditingId(r.id);
    setDate(r.date);
    setItems(r.items.length ? r.items : DEFAULT_ELEMENTS.map((name) => ({ name, qty: "", unit: "kg", price: "" })));
    setValidated({ ok: r.weatherOk, note: r.weatherNote });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function save() {
    if (!date || !validated) return;
    const payload = {
      date,
      items,
      total,
      weatherOk: validated.ok,
      weatherNote: validated.note,
    };
    if (editingId) {
      update(parcelId, "pulverisation", editingId, payload);
    } else {
      add(parcelId, "pulverisation", payload);
    }
    resetForm();
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? "Modifier le programme" : "Nouveau programme de pulvérisation"}
            </h3>
            {editingId && (
              <button
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Annuler
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setValidated(null);
              }}
              className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
          {date && (
            <WeatherCheck
              date={date}
              onValidated={(d) =>
                setValidated({
                  ok: "ok" in d ? d.ok : false,
                  note: "manual" in d ? "Validé manuellement" : `${(d as any).windKmh} km/h`,
                })
              }
            />
          )}

          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  value={it.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  placeholder="Élément"
                  className="col-span-4 rounded border border-input bg-background px-2 py-1 text-sm"
                />
                <input
                  value={it.qty}
                  onChange={(e) => updateItem(i, { qty: e.target.value })}
                  placeholder="Qté"
                  className="col-span-2 rounded border border-input bg-background px-2 py-1 text-sm"
                />
                <input
                  value={it.unit}
                  onChange={(e) => updateItem(i, { unit: e.target.value })}
                  placeholder="Unité"
                  className="col-span-2 rounded border border-input bg-background px-2 py-1 text-sm"
                />
                <input
                  value={it.price}
                  onChange={(e) => updateItem(i, { price: e.target.value })}
                  placeholder="Prix"
                  className="col-span-3 rounded border border-input bg-background px-2 py-1 text-sm"
                />
                <button
                  onClick={() => removeItem(i)}
                  className="col-span-1 inline-flex items-center justify-center rounded border border-input text-muted-foreground hover:text-destructive"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={addItem}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter un élément
            </button>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Prix global :</span>{" "}
              <span className="font-bold text-foreground">{total.toFixed(2)} DA</span>
            </div>
            <button
              onClick={save}
              disabled={!date || !validated}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {editingId ? "Mettre à jour" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4" /> Archive ({records.length})
        </div>
        {records.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucun programme enregistré.</p>
        ) : (
          <ul className="divide-y">
            {records.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{r.date}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{r.total.toFixed(2)} DA</span>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => startEdit(r)}
                          className="text-muted-foreground hover:text-primary"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(parcelId, "pulverisation", r.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Météo : {r.weatherOk ? "Favorable" : "Défavorable (validé)"} · {r.weatherNote}
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-foreground">
                  {r.items.filter((it) => it.name).map((it, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {it.name} — {it.qty} {it.unit}
                      </span>
                      <span>
                        {((parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0)).toFixed(2)} DA
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
