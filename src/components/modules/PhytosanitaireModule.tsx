import { useState } from "react";
import { Plus, Trash2, Save, History, Image as ImageIcon, Pencil, Check, X, Sparkles } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcelActions } from "@/lib/parcel-store";
import { useSuppliers } from "@/lib/suppliers-store";
import { useProducts } from "@/lib/products-store";
import { computePhytosanitaireRecordTotal, resolveProductUnitPrice } from "@/lib/parcel-costs";
import { parsePhytoProductQuantity } from "@/lib/stock-alerts";
import { WeatherCheck } from "./WeatherCheck";
import { PHYTO_DATABASE } from "@/data/phytosanitaires";
import { formatDateFR, formatDA } from "@/lib/format";

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
  const { add, remove, update } = useModuleActions();
  const { setStatus } = useParcelActions();
  const suppliers = useSuppliers();
  const catalogProducts = useProducts();
  const [date, setDate] = useState("");
  const [products, setProducts] = useState<Product[]>([empty()]);
  const [validated, setValidated] = useState<{ ok: boolean; note: string } | null>(null);
  const [editingTotalId, setEditingTotalId] = useState<string | null>(null);
  const [editingTotalVal, setEditingTotalVal] = useState<string>("");

  const total = products.reduce(
    (s, p) => s + (parseFloat((p.price || "").replace(",", ".")) || 0),
    0,
  );

  function applyStockPricesToRecord(r: Record) {
    const filledProducts = r.products.map((p) => {
      const existing = parseFloat((p.price || "").replace(",", ".")) || 0;
      if (existing > 0 || !p.product?.trim()) return p;
      const pu = resolveProductUnitPrice(p.product, suppliers, catalogProducts);
      if (pu <= 0) return p;
      const vol = parseFloat((p.volume || "").replace(",", ".")) || 1000;
      const qtyObj = parsePhytoProductQuantity({
        product: String(p.product || ""),
        dosage: String(p.dosage || ""),
        volume: vol,
      });
      const qty = qtyObj && qtyObj.quantity > 0 ? qtyObj.quantity : 1;
      return { ...p, price: String(Number((qty * pu).toFixed(2))) };
    });
    const newTotal = filledProducts.reduce(
      (s, p) => s + (parseFloat((p.price || "").replace(",", ".")) || 0),
      0,
    );
    update(parcelId, "phytosanitaire", r.id, {
      products: filledProducts,
      total: Number(newTotal.toFixed(2)),
    });
  }

  function saveInlineTotal(r: Record) {
    const parsed = parseFloat(editingTotalVal.replace(/\s/g, "").replace(",", ".")) || 0;
    const nextProducts =
      r.products.length === 1
        ? [{ ...r.products[0], price: String(parsed) }]
        : r.products;
    update(parcelId, "phytosanitaire", r.id, {
      products: nextProducts,
      total: Number(parsed.toFixed(2)),
    });
    setEditingTotalId(null);
    setEditingTotalVal("");
  }

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
              <span className="font-bold text-foreground">{formatDA(total, 2)}</span>
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
        let grand = 0;
        let hasEstimated = false;
        for (const r of records) {
          const y = (r.date || "").slice(0, 4) || "—";
          const computed = computePhytosanitaireRecordTotal(r, suppliers, catalogProducts);
          if (computed.estimatedFromStock) hasEstimated = true;
          byYear.set(y, (byYear.get(y) || 0) + computed.total);
          grand += computed.total;
        }
        const years = [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));
        return (
          <div className="rounded-xl border bg-primary/5 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Total global</span>
              <span className="text-primary">{formatDA(grand, 2)}</span>
            </div>
            <ul className="space-y-0.5 text-xs">
              {years.map(([y, t]) => (
                <li key={y} className="flex justify-between text-muted-foreground">
                  <span>Année {y}</span>
                  <span className="font-semibold text-foreground">{formatDA(t, 2)}</span>
                </li>
              ))}
            </ul>
            {hasEstimated && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Inclut des lignes valorisées automatiquement depuis le stock (Agrimax / Base Produits).
              </p>
            )}
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
            {records.map((r) => {
              const computed = computePhytosanitaireRecordTotal(r, suppliers, catalogProducts);
              const isEditingThis = editingTotalId === r.id;
              return (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">{formatDateFR(r.date)}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={editingTotalVal}
                            onChange={(e) => setEditingTotalVal(e.target.value)}
                            placeholder="Montant DA"
                            className="w-24 rounded border border-input bg-background px-2 py-0.5 text-xs font-semibold"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveInlineTotal(r)}
                            className="rounded bg-primary p-1 text-primary-foreground cursor-pointer"
                            title="Enregistrer le prix"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTotalId(null)}
                            className="rounded border p-1 text-muted-foreground cursor-pointer"
                            title="Annuler"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {computed.estimatedFromStock && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              ≈ stock
                            </span>
                          )}
                          <span className="font-bold text-foreground">{formatDA(computed.total, 2)}</span>
                          {canEdit && computed.estimatedFromStock && (
                            <button
                              type="button"
                              onClick={() => applyStockPricesToRecord(r)}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-500/20 dark:text-amber-300 cursor-pointer"
                              title="Enregistrer les prix du stock sur cette ligne"
                            >
                              <Sparkles className="h-3 w-3" /> Appliquer prix stock
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTotalId(r.id);
                                setEditingTotalVal(String(computed.total || ""));
                              }}
                              className="text-muted-foreground hover:text-primary cursor-pointer"
                              title="Modifier le prix"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                      {canEdit && (
                        <button onClick={() => remove(parcelId, "phytosanitaire", r.id)}
                          className="text-muted-foreground hover:text-destructive cursor-pointer">
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
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
