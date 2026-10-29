import { useState } from "react";
import { Plus, Trash2, Save, History, Image as ImageIcon } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcelActions } from "@/lib/parcel-store";
import { WeatherCheck } from "./WeatherCheck";
import { PHYTO_DATABASE } from "@/data/phytosanitaires";

type Product = {
  product: string;
  cible: string;
  price: string;
  dosage: string;
  volume: string;
  dar: string;
  photo?: string; // dataURL
};
type Record = {
  id: string;
  createdAt: number;
  date: string;
  products: Product[];
  total: number;
  weatherOk: boolean;
  weatherNote: string;
};

const empty = (): Product => ({
  product: "",
  cible: "",
  price: "",
  dosage: "",
  volume: "",
  dar: "",
});

export function PhytosanitaireModule({
  parcelId,
  canEdit,
}: {
  parcelId: string;
  canEdit: boolean;
}) {
  const records = useModuleRecords<Record>(parcelId, "phytosanitaire");
  const { add, remove } = useModuleActions();
  const { setStatus } = useParcelActions();
  const [date, setDate] = useState("");
  const [products, setProducts] = useState<Product[]>([empty()]);
  const [validated, setValidated] = useState<{ ok: boolean; note: string } | null>(null);

  const total = products.reduce(
    (s, p) => s + (parseFloat((p.price || "").replace(",", ".")) || 0),
    0,
  );

  function up(i: number, patch: Partial<Product>) {
    setProducts((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function onPhoto(i: number, file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => up(i, { photo: reader.result as string });
    reader.readAsDataURL(file);
  }
  function save() {
    if (!date) return;
    add(parcelId, "phytosanitaire", {
      date,
      products,
      total,
      weatherOk: validated?.ok ?? false,
      weatherNote: validated?.note ?? "Non vérifié",
    });
    setStatus(parcelId, "alerte"); // triangle orange
    setDate("");
    setValidated(null);
    setProducts([empty()]);
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Nouveau programme phytosanitaire</h3>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setValidated(null);
              }}
              className="rounded border border-input bg-background px-2 py-1 text-sm"
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

          <div className="space-y-3">
            {products.map((p, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    list={`phytoproducts-${i}`}
                    value={p.product}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = PHYTO_DATABASE.find((db) => db.name.toLowerCase() === val.toLowerCase());
                      if (match) {
                        up(i, {
                          product: match.name,
                          cible: match.cible,
                          dosage: match.dosage,
                          volume: match.volume,
                          price: match.price,
                          dar: match.dar,
                        });
                      } else {
                        up(i, { product: val });
                      }
                    }}
                    placeholder="Produit (ex: Calypso, Sivento...)"
                    className="rounded border border-input bg-background px-2 py-1 text-sm font-medium text-foreground"
                  />
                  <datalist id={`phytoproducts-${i}`}>
                    {PHYTO_DATABASE.map((db) => (
                      <option key={db.name} value={db.name} />
                    ))}
                  </datalist>
                  <input value={p.cible} onChange={(e) => up(i, { cible: e.target.value })}
                    placeholder="Cible (Coryneum, Psylle...)" className="rounded border border-input bg-background px-2 py-1 text-sm" />
                  <input value={p.dosage} onChange={(e) => up(i, { dosage: e.target.value })}
                    placeholder="Dosage" className="rounded border border-input bg-background px-2 py-1 text-sm" />
                  <input value={p.volume} onChange={(e) => up(i, { volume: e.target.value })}
                    placeholder="Volume (L)" className="rounded border border-input bg-background px-2 py-1 text-sm" />
                  <input value={p.price} onChange={(e) => up(i, { price: e.target.value })}
                    placeholder="Prix unitaire" className="rounded border border-input bg-background px-2 py-1 text-sm" />
                  <input value={p.dar} onChange={(e) => up(i, { dar: e.target.value })}
                    placeholder="DAR (jours)" className="rounded border border-input bg-background px-2 py-1 text-sm" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <ImageIcon className="h-3.5 w-3.5" /> {p.photo ? "Changer photo" : "Ajouter photo"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => onPhoto(i, e.target.files?.[0])} />
                  </label>
                  {p.photo && <img src={p.photo} alt="" className="h-12 w-12 rounded object-cover" />}
                  <button onClick={() => setProducts((arr) => arr.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setProducts((arr) => [...arr, empty()])}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              <Plus className="h-3.5 w-3.5" /> Ajouter un produit
            </button>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Prix global :</span>{" "}
              <span className="font-bold text-foreground">{total.toFixed(2)} DA</span>
            </div>
            <button onClick={save} disabled={!date}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </div>
          <p className="text-[11px] italic text-muted-foreground">
            L'enregistrement passe le secteur en orange (Alerte).
          </p>
        </div>
      )}

      {records.length > 0 && (() => {
        const byYear = new Map<string, number>();
        for (const r of records) {
          const y = (r.date || "").slice(0, 4) || "—";
          byYear.set(y, (byYear.get(y) || 0) + (r.total || 0));
        }
        const years = [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));
        const grand = records.reduce((s, r) => s + (r.total || 0), 0);
        return (
          <div className="rounded-xl border bg-primary/5 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Total global</span>
              <span className="text-primary">{grand.toFixed(2)} DA</span>
            </div>
            <ul className="space-y-0.5 text-xs">
              {years.map(([y, t]) => (
                <li key={y} className="flex justify-between text-muted-foreground">
                  <span>Année {y}</span>
                  <span className="font-semibold text-foreground">{t.toFixed(2)} DA</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

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
                      <button onClick={() => remove(parcelId, "phytosanitaire", r.id)}
                        className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Météo : {r.weatherOk ? "Favorable" : "Défavorable (validé)"} · {r.weatherNote}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-foreground">
                  {r.products.filter((p) => p.product).map((p, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {p.photo && <img src={p.photo} alt="" className="h-8 w-8 rounded object-cover" />}
                      <div className="flex-1">
                        <div className="font-medium">{p.product} → {p.cible}</div>
                        <div className="text-muted-foreground">
                          Dosage {p.dosage} · Vol {p.volume} L · DAR {p.dar} j
                        </div>
                      </div>
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
