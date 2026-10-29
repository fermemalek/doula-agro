import { Link } from "@/lib/router-compat";
import { ChevronRight } from "lucide-react";
import { useParcels } from "@/lib/parcel-store";

const STATUS_DOT: Record<string, string> = {
  sain: "bg-emerald-500",
  alerte: "bg-orange-500",
  intervention: "bg-destructive",
};

function ParcellesPage() {
  const parcels = useParcels();
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <h1 className="mb-3 text-xl font-bold">Parcelles</h1>
      <ul className="grid grid-cols-2 gap-3">
        {parcels.map((p) => (
          <li key={p.id}>
            <Link
              to="/parcelle/$id"
              params={{ id: p.id }}
              className="flex h-full flex-col gap-1 rounded-2xl border bg-card p-4 shadow-sm active:scale-95"
            >
              <div className="flex items-center justify-between">
                <span className={`h-3 w-3 rounded-full ${STATUS_DOT[p.status] ?? "bg-muted"}`} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold leading-tight">{p.name}</p>
              <p className="text-xs uppercase text-muted-foreground">{p.type}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default ParcellesPage;
