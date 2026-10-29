import { useState } from "react";
import { Save, Trash2, History, Image as ImageIcon } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";

type Record = {
  id: string;
  createdAt: number;
  date: string;
  qty: string; // total quantity (fallback)
  unit: string;
  price: string; // fallback price or weighted avg
  choix1Qty?: string;
  choix1Price?: string;
  choix2Qty?: string;
  choix2Price?: string;
  choix3Qty?: string;
  choix3Price?: string;
  choix4Qty?: string;
  choix4Price?: string;
  rebutQty?: string;
  mainOeuvre: string;
  transport: string;
  autres: string;
  notes: string;
  photo?: string;
};

export function RecolteModule({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const records = useModuleRecords<Record>(parcelId, "recolte");
  const { add, remove } = useModuleActions();
  const [f, setF] = useState({
    date: "",
    unit: "Kg",
    choix1Qty: "",
    choix1Price: "",
    choix2Qty: "",
    choix2Price: "",
    choix3Qty: "",
    choix3Price: "",
    choix4Qty: "",
    choix4Price: "",
    rebutQty: "",
    mainOeuvre: "",
    transport: "",
    autres: "",
    notes: "",
    photo: undefined as string | undefined,
  });

  const c1Q = parseFloat(f.choix1Qty) || 0;
  const c1P = parseFloat(f.choix1Price) || 0;
  const c2Q = parseFloat(f.choix2Qty) || 0;
  const c2P = parseFloat(f.choix2Price) || 0;
  const c3Q = parseFloat(f.choix3Qty) || 0;
  const c3P = parseFloat(f.choix3Price) || 0;
  const c4Q = parseFloat(f.choix4Qty) || 0;
  const c4P = parseFloat(f.choix4Price) || 0;
  const rebutQ = parseFloat(f.rebutQty) || 0;

  const totalVente = (c1Q * c1P) + (c2Q * c2P) + (c3Q * c3P) + (c4Q * c4P);
  const charges = (parseFloat(f.mainOeuvre) || 0) + (parseFloat(f.transport) || 0) + (parseFloat(f.autres) || 0);
  const net = totalVente - charges;
  const totalQty = c1Q + c2Q + c3Q + c4Q + rebutQ;

  function onPhoto(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setF((p) => ({ ...p, photo: r.result as string }));
    r.readAsDataURL(file);
  }

  function save() {
    if (!f.date || totalQty === 0) return;
    const weightedPrice = totalQty > rebutQ ? (totalVente / (totalQty - rebutQ)) : 0;
    const payload = {
      ...f,
      qty: totalQty.toString(),
      price: weightedPrice.toFixed(2),
    };
    add(parcelId, "recolte", payload);
    setF({
      date: "",
      unit: "Kg",
      choix1Qty: "",
      choix1Price: "",
      choix2Qty: "",
      choix2Price: "",
      choix3Qty: "",
      choix3Price: "",
      choix4Qty: "",
      choix4Price: "",
      rebutQty: "",
      mainOeuvre: "",
      transport: "",
      autres: "",
      notes: "",
      photo: undefined,
    });
  }

  const cls = "rounded border border-input bg-background px-2 py-1 text-sm w-full";

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Nouvelle récolte (Salle de tri)</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Date de récolte</label>
              <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Unité de mesure</label>
              <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className={cls}>
                <option>Kg</option>
                <option>Tonne</option>
                <option>Caisses</option>
                <option>Quintal</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-2 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Tri & Choix</h4>
            
            <div className="grid grid-cols-3 gap-x-2 gap-y-3 items-center bg-muted/20 p-2 rounded-lg">
              <span className="text-xs font-semibold">Choix 1</span>
              <input value={f.choix1Qty} inputMode="decimal" onChange={(e) => setF({ ...f, choix1Qty: e.target.value })} placeholder="Quantité" className={cls} />
              <div className="flex flex-col gap-0.5">
                <input value={f.choix1Price} inputMode="decimal" onChange={(e) => setF({ ...f, choix1Price: e.target.value })} placeholder="Prix / unité" className={cls} />
                {c1Q * c1P > 0 && <span className="text-[9px] font-bold text-olive-dark text-right">Total: {(c1Q * c1P).toFixed(0)} DA</span>}
              </div>

              <span className="text-xs font-semibold">Choix 2</span>
              <input value={f.choix2Qty} inputMode="decimal" onChange={(e) => setF({ ...f, choix2Qty: e.target.value })} placeholder="Quantité" className={cls} />
              <div className="flex flex-col gap-0.5">
                <input value={f.choix2Price} inputMode="decimal" onChange={(e) => setF({ ...f, choix2Price: e.target.value })} placeholder="Prix / unité" className={cls} />
                {c2Q * c2P > 0 && <span className="text-[9px] font-bold text-olive-dark text-right">Total: {(c2Q * c2P).toFixed(0)} DA</span>}
              </div>

              <span className="text-xs font-semibold">Choix 3</span>
              <input value={f.choix3Qty} inputMode="decimal" onChange={(e) => setF({ ...f, choix3Qty: e.target.value })} placeholder="Quantité" className={cls} />
              <div className="flex flex-col gap-0.5">
                <input value={f.choix3Price} inputMode="decimal" onChange={(e) => setF({ ...f, choix3Price: e.target.value })} placeholder="Prix / unité" className={cls} />
                {c3Q * c3P > 0 && <span className="text-[9px] font-bold text-olive-dark text-right">Total: {(c3Q * c3P).toFixed(0)} DA</span>}
              </div>

              <span className="text-xs font-semibold">Choix 4</span>
              <input value={f.choix4Qty} inputMode="decimal" onChange={(e) => setF({ ...f, choix4Qty: e.target.value })} placeholder="Quantité" className={cls} />
              <div className="flex flex-col gap-0.5">
                <input value={f.choix4Price} inputMode="decimal" onChange={(e) => setF({ ...f, choix4Price: e.target.value })} placeholder="Prix / unité" className={cls} />
                {c4Q * c4P > 0 && <span className="text-[9px] font-bold text-olive-dark text-right">Total: {(c4Q * c4P).toFixed(0)} DA</span>}
              </div>

              <span className="text-xs font-bold text-destructive">Rebut (déchets)</span>
              <input value={f.rebutQty} inputMode="decimal" onChange={(e) => setF({ ...f, rebutQty: e.target.value })} placeholder="Quantité jetée" className="col-span-2 rounded border border-destructive/30 bg-background px-2 py-1 text-sm w-full text-destructive placeholder:text-destructive/50" />
            </div>
          </div>

          <div className="border-t pt-2 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Charges opérationnelles (DA)</h4>
            <div className="grid grid-cols-3 gap-2">
              <input value={f.mainOeuvre} inputMode="decimal" onChange={(e) => setF({ ...f, mainOeuvre: e.target.value })} placeholder="Main d'œuvre" className={cls} />
              <input value={f.transport} inputMode="decimal" onChange={(e) => setF({ ...f, transport: e.target.value })} placeholder="Transport" className={cls} />
              <input value={f.autres} inputMode="decimal" onChange={(e) => setF({ ...f, autres: e.target.value })} placeholder="Autres" className={cls} />
            </div>
          </div>

          <div>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> {f.photo ? "Photo ajoutée" : "Photo de la récolte"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
          </div>

          <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder="Notes" className={`${cls} min-h-16 w-full resize-y`} />

          <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span>Quantité Totale récoltée</span><b>{totalQty.toFixed(1)} {f.unit}</b></div>
            <div className="flex justify-between"><span>Total Vente</span><b>{totalVente.toFixed(2)} DA</b></div>
            <div className="flex justify-between text-muted-foreground"><span>Charges</span><span>− {charges.toFixed(2)} DA</span></div>
            <div className="flex justify-between border-t pt-1 text-base"><b>Net</b><b className={net >= 0 ? "text-olive-dark" : "text-destructive"}>{net.toFixed(2)} DA</b></div>
          </div>

          <div className="flex justify-end">
            <button onClick={save} disabled={!f.date || totalQty === 0}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-2 text-sm font-semibold">
          <History className="h-4 w-4" /> Archive ({records.length})
        </div>
        {records.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune récolte.</p>
        ) : (
          <ul className="divide-y">
            {records.map((r) => {
              const r1Q = parseFloat(r.choix1Qty || "0");
              const r1P = parseFloat(r.choix1Price || "0");
              const r2Q = parseFloat(r.choix2Qty || "0");
              const r2P = parseFloat(r.choix2Price || "0");
              const r3Q = parseFloat(r.choix3Qty || "0");
              const r3P = parseFloat(r.choix3Price || "0");
              const r4Q = parseFloat(r.choix4Qty || "0");
              const r4P = parseFloat(r.choix4Price || "0");
              const rRebut = parseFloat(r.rebutQty || "0");

              const hasNewFields = !!(r.choix1Qty || r.choix2Qty || r.choix3Qty || r.choix4Qty || r.rebutQty);
              const tv = hasNewFields 
                ? (r1Q * r1P) + (r2Q * r2P) + (r3Q * r3P) + (r4Q * r4P)
                : (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0);

              const ch = (parseFloat(r.mainOeuvre) || 0) + (parseFloat(r.transport) || 0) + (parseFloat(r.autres) || 0);
              const netResult = tv - ch;

              return (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{r.date} — {r.qty} {r.unit} récoltés</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${netResult >= 0 ? "text-olive-dark" : "text-destructive"}`}>
                        Net {netResult.toFixed(2)} DA
                      </span>
                      {canEdit && (
                        <button onClick={() => remove(parcelId, "recolte", r.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {hasNewFields && (
                    <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs bg-muted/40 p-2 rounded-lg text-muted-foreground font-medium">
                      {r1Q > 0 && <div><b>Choix 1:</b> {r1Q} {r.unit} @ {r1P} DA = <b>{(r1Q * r1P).toFixed(0)} DA</b></div>}
                      {r2Q > 0 && <div><b>Choix 2:</b> {r2Q} {r.unit} @ {r2P} DA = <b>{(r2Q * r2P).toFixed(0)} DA</b></div>}
                      {r3Q > 0 && <div><b>Choix 3:</b> {r3Q} {r.unit} @ {r3P} DA = <b>{(r3Q * r3P).toFixed(0)} DA</b></div>}
                      {r4Q > 0 && <div><b>Choix 4:</b> {r4Q} {r.unit} @ {r4P} DA = <b>{(r4Q * r4P).toFixed(0)} DA</b></div>}
                      {rRebut > 0 && <div className="text-destructive font-semibold"><b>Rebut:</b> {rRebut} {r.unit}</div>}
                    </div>
                  )}

                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>Ventes : {tv.toFixed(2)} DA</span>
                    <span>Charges : {ch.toFixed(2)} DA</span>
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
