import { useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useParcels } from "@/lib/parcel-store";

export interface ProgramFilters {
  year: string;
  month: string;
  parcelId: string;
}

export const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

export function ProgramFiltersBar({
  value,
  onChange,
  years,
}: {
  value: ProgramFilters;
  onChange: (v: ProgramFilters) => void;
  years: string[];
}) {
  const parcels = useParcels();
  return (
    <Card className="p-3 flex flex-wrap gap-3">
      <div className="flex-1 min-w-[120px]">
        <Label className="text-xs">Année</Label>
        <select
          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
        >
          <option value="">Toutes</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[140px]">
        <Label className="text-xs">Mois</Label>
        <select
          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
        >
          <option value="">Tous</option>
          {MONTHS_FR.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <Label className="text-xs">Parcelle</Label>
        <select
          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={value.parcelId}
          onChange={(e) => onChange({ ...value, parcelId: e.target.value })}
        >
          <option value="">Toutes</option>
          {parcels.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
    </Card>
  );
}

export function useFilters(): [ProgramFilters, (v: ProgramFilters) => void] {
  const [v, setV] = useState<ProgramFilters>({ year: "", month: "", parcelId: "" });
  return [v, setV];
}

export function matchesFilters(date: string | undefined, parcelId: string, f: ProgramFilters): boolean {
  if (f.parcelId && f.parcelId !== parcelId) return false;
  if (!date) return !f.year && !f.month;
  const [y, m] = date.split("-");
  if (f.year && f.year !== y) return false;
  if (f.month && f.month !== m) return false;
  return true;
}

export function ListPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-4 space-y-3">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      {children}
    </main>
  );
}

export function useYearsFromDates(dates: Array<string | undefined>): string[] {
  return useMemo(() => {
    const set = new Set<string>();
    for (const d of dates) if (d) set.add(d.slice(0, 4));
    return [...set].sort().reverse();
  }, [dates]);
}
