import { useMemo, useState } from "react";
import { Plus, Trash2, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMaintenance, useOpsActions } from "@/lib/ops-store";
import { useParcels } from "@/lib/parcel-store";
import {
  ListPageShell,
  ProgramFiltersBar,
  matchesFilters,
  useFilters,
  useYearsFromDates,
} from "@/components/programs/ProgramFiltersBar";

function MaintenancePage() {
  const items = useMaintenance();
  const parcels = useParcels();
  const { addMaint, removeMaint } = useOpsActions();
  const [filters, setFilters] = useFilters();
  const years = useYearsFromDates(items.map((m) => m.date));
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [equipment, setEquipment] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Préventif");
  const [cost, setCost] = useState("");
  const [parcelId, setParcelId] = useState("");

  function save() {
    if (!equipment.trim()) return;
    addMaint({
      date,
      equipment: equipment.trim(),
      description: description.trim(),
      type,
      cost: parseFloat(cost) || 0,
      parcelId: parcelId || undefined,
    });
    setEquipment("");
    setDescription("");
    setCost("");
    setParcelId("");
    setOpen(false);
  }

  const filtered = items
    .filter((m) => matchesFilters(m.date, m.parcelId ?? "", filters))
    .sort((a, b) => b.createdAt - a.createdAt);

  // Yearly cost totals
  const yearlyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of items) {
      const y = m.date.slice(0, 4);
      map[y] = (map[y] ?? 0) + m.cost;
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  return (
    <ListPageShell title="Maintenance">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> {open ? "Annuler" : "Nouvel entretien"}
        </Button>
      </div>

      {open && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Nouvel entretien</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option>Préventif</option>
                <option>Curatif</option>
                <option>Inspection</option>
                <option>Remplacement</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Équipement</Label>
              <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Coût (DA)</Label>
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Parcelle (optionnel)</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={parcelId}
                onChange={(e) => setParcelId(e.target.value)}
              >
                <option value="">—</option>
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={save} className="w-full">Enregistrer</Button>
        </Card>
      )}

      <ProgramFiltersBar value={filters} onChange={setFilters} years={years} />

      {yearlyTotals.length > 0 && (
        <Card className="p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">Coût global par année</div>
          <div className="flex flex-wrap gap-2">
            {yearlyTotals.map(([y, total]) => (
              <span key={y} className="rounded-md bg-primary/10 text-primary text-xs font-semibold px-2 py-1">
                {y}: {total.toFixed(2)} DA
              </span>
            ))}
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Aucun entretien.</Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m) => {
            const parcel = parcels.find((p) => p.id === m.parcelId);
            return (
              <li key={m.id}>
                <Card className="p-3 flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                    <Wrench className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{m.equipment}</span>
                      <span className="text-[10px] uppercase rounded px-1.5 py-0.5 bg-muted text-muted-foreground">{m.type}</span>
                    </div>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{m.date}</span>
                      <span>Coût: {m.cost.toFixed(2)} DA</span>
                      {parcel && <span>{parcel.name}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeMaint(m.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </ListPageShell>
  );
}

export default MaintenancePage;
