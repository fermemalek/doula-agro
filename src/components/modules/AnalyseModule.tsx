import { useState, useMemo } from "react";
import { Save, Trash2, History, Plus, FlaskConical, Droplet } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";
import {
  SOL_PAR_PARCELLE,
  EAU_DEFAULT,
  SOL_LABELS,
  EAU_LABELS,
  type SolAnalyse,
  type EauAnalyse,
} from "@/data/analyses";

type Extra = { name: string; value: string };
type SolRecord = SolAnalyse & { id: string; createdAt: number; extras?: Extra[] };
type EauRecord = EauAnalyse & { id: string; createdAt: number; extras?: Extra[] };

export function AnalyseModule({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const [tab, setTab] = useState<"sol" | "eau">("sol");
  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border bg-muted p-0.5">
        <button onClick={() => setTab("sol")}
          className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${tab === "sol" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}>
          <FlaskConical className="h-3.5 w-3.5" /> Sol
        </button>
        <button onClick={() => setTab("eau")}
          className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${tab === "eau" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}>
          <Droplet className="h-3.5 w-3.5" /> Eau
        </button>
      </div>
      {tab === "sol" ? <SolPanel parcelId={parcelId} canEdit={canEdit} /> : <EauPanel parcelId={parcelId} canEdit={canEdit} />}
    </div>
  );
}

function SolPanel({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const records = useModuleRecords<SolRecord>(parcelId, "analyse-sol");
  const { add, remove } = useModuleActions();
  const initial = useMemo(() => SOL_PAR_PARCELLE[parcelId] ?? null, [parcelId]);
  const [form, setForm] = useState<SolAnalyse>(
    initial ?? ({ date: new Date().toLocaleDateString("fr-FR") } as SolAnalyse),
  );
  const [extras, setExtras] = useState<Extra[]>([]);

  const fields: (keyof SolAnalyse)[] = [
    "date", "argile", "limon", "sable", "ph", "ce", "tds",
    "calcaireTotal", "calcaireActif", "matiereOrg", "azote",
    "phosphore", "potassium", "calcium", "sodium", "cec",
    "fer", "cuivre", "zinc", "mgo", "notes",
  ];

  function save() {
    add(parcelId, "analyse-sol", { ...form, extras });
    setExtras([]);
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Analyse de sol</h3>
            {initial && <span className="text-[11px] text-muted-foreground">Pré-rempli depuis rapport Soil&amp;co</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((f) => (
              <label key={f} className="text-xs text-muted-foreground">
                {SOL_LABELS[f]}
                <input
                  value={(form[f] as string) ?? ""}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
            ))}
          </div>
          <div className="space-y-2">
            {extras.map((x, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input value={x.name} onChange={(e) => setExtras((a) => a.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))}
                  placeholder="Paramètre" className="col-span-6 rounded border border-input bg-background px-2 py-1 text-sm" />
                <input value={x.value} onChange={(e) => setExtras((a) => a.map((it, idx) => idx === i ? { ...it, value: e.target.value } : it))}
                  placeholder="Valeur" className="col-span-5 rounded border border-input bg-background px-2 py-1 text-sm" />
                <button onClick={() => setExtras((a) => a.filter((_, idx) => idx !== i))} className="col-span-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button onClick={() => setExtras((a) => [...a, { name: "", value: "" }])}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              <Plus className="h-3.5 w-3.5" /> Nouveau paramètre
            </button>
          </div>
          <div className="flex justify-end">
            <button onClick={save} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </div>
        </div>
      )}
      <ArchiveList records={records} onRemove={(id) => remove(parcelId, "analyse-sol", id)} canEdit={canEdit}
        labels={SOL_LABELS as any} />
    </div>
  );
}

function EauPanel({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const records = useModuleRecords<EauRecord>(parcelId, "analyse-eau");
  const { add, remove } = useModuleActions();
  const [form, setForm] = useState<EauAnalyse>(EAU_DEFAULT);
  const [extras, setExtras] = useState<Extra[]>([]);

  const fields: (keyof EauAnalyse)[] = [
    "date", "source", "ph", "ce", "tds", "chlorure", "bicarbonate",
    "sodium", "potassium", "calcium", "magnesium",
  ];

  function save() {
    add(parcelId, "analyse-eau", { ...form, extras });
    setExtras([]);
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold">Analyse d'eau</h3>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((f) => (
              <label key={f} className="text-xs text-muted-foreground">
                {EAU_LABELS[f]}
                <input
                  value={(form[f] as string) ?? ""}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
            ))}
          </div>
          <div className="space-y-2">
            {extras.map((x, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input value={x.name} onChange={(e) => setExtras((a) => a.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))}
                  placeholder="Paramètre" className="col-span-6 rounded border border-input bg-background px-2 py-1 text-sm" />
                <input value={x.value} onChange={(e) => setExtras((a) => a.map((it, idx) => idx === i ? { ...it, value: e.target.value } : it))}
                  placeholder="Valeur" className="col-span-5 rounded border border-input bg-background px-2 py-1 text-sm" />
                <button onClick={() => setExtras((a) => a.filter((_, idx) => idx !== i))} className="col-span-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button onClick={() => setExtras((a) => [...a, { name: "", value: "" }])}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              <Plus className="h-3.5 w-3.5" /> Nouveau paramètre
            </button>
          </div>
          <div className="flex justify-end">
            <button onClick={save} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </div>
        </div>
      )}
      <ArchiveList records={records} onRemove={(id) => remove(parcelId, "analyse-eau", id)} canEdit={canEdit}
        labels={EAU_LABELS as any} />
    </div>
  );
}

function ArchiveList({
  records,
  onRemove,
  canEdit,
  labels,
}: {
  records: any[];
  onRemove: (id: string) => void;
  canEdit: boolean;
  labels: Record<string, string>;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2 text-sm font-semibold">
        <History className="h-4 w-4" /> Archive ({records.length})
      </div>
      {records.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune analyse enregistrée.</p>
      ) : (
        <ul className="divide-y">
          {records.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.date}</span>
                {canEdit && (
                  <button onClick={() => onRemove(r.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                {Object.entries(r)
                  .filter(([k, v]) => labels[k] && v && k !== "id" && k !== "createdAt")
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{labels[k]}</dt>
                      <dd className="font-medium text-foreground">{String(v)}</dd>
                    </div>
                  ))}
                {(r.extras ?? []).filter((e: Extra) => e.name).map((e: Extra, i: number) => (
                  <div key={`x${i}`} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{e.name}</dt>
                    <dd className="font-medium text-foreground">{e.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
