import { Link } from "@/lib/router-compat";
import { ArrowLeft, Droplets, Sprout, AlertTriangle, Plus } from "lucide-react";
import type { Parcel } from "@/data/parcels";
import { useAnomalies } from "@/lib/anomalies-store";
import { useState } from "react";
import { toast } from "sonner";
import { useModuleActions, useModuleRecords } from "@/lib/modules-store";
import { TaskExecutionModal, type ExecutionTarget } from "./TaskExecutionModal";
import { FertilisationExecutionAssistant } from "./FertilisationExecutionAssistant";

export function ParcelExecutantView({ parcel }: { parcel: Parcel }) {
  const anomalies = useAnomalies().filter((a) => a.parcelId === parcel.id && !a.resolved);
  const { add: addModuleRecord } = useModuleActions();
  const localIrr = useModuleRecords(parcel.id, "irrigation");
  const localFert = useModuleRecords(parcel.id, "fertilisation");

  const pendingIrr = localIrr.filter(r => r.status !== "execute");
  const pendingFert = localFert.filter(r => r.status !== "execute");

  const [execTarget, setExecTarget] = useState<ExecutionTarget | null>(null);
  const [activeFertProg, setActiveFertProg] = useState<any | null>(null);

  const handleStartIrrigation = () => {
    const pending = pendingIrr[0];
    if (pending) {
      setExecTarget({
        type: "program",
        id: pending.id,
        title: "Irrigation planifiée",
        kind: "irrigation",
        parcelName: parcel.name,
      });
    } else {
      toast.info("Aucune irrigation planifiée. Création d'un cycle manuel.");
      const id = crypto.randomUUID();
      addModuleRecord(parcel.id, "irrigation", {
        id,
        mode: "date",
        date: new Date().toISOString().slice(0, 10),
        duration: "1",
        dateStartHour: new Date().toTimeString().slice(0, 5),
        status: "planifie"
      });
      setExecTarget({
        type: "program",
        id,
        title: "Irrigation Manuelle (Ad-hoc)",
        kind: "irrigation",
        parcelName: parcel.name,
      });
    }
  };

  const handleStartFertilisation = () => {
    const pending = pendingFert[0];
    if (pending) {
      setActiveFertProg({
        id: pending.id,
        parcel_id: parcel.id,
        kind: "fertilisation",
        payload: pending,
        total_cost: pending.total || 0,
      });
    } else {
      toast.info("Aucune fertilisation planifiée. Création d'un apport manuel.");
      const id = crypto.randomUUID();
      const newRec = {
        id,
        date: new Date().toISOString().slice(0, 10),
        hectares: parseFloat((parcel.info?.surface ?? "1").replace(",", ".")) || 1,
        frequency: 1,
        total: 0,
        entries: [
          { bac: "A", items: [] },
          { bac: "B", items: [] },
          { bac: "C", items: [] },
          { bac: "D", items: [] }
        ],
        status: "planifie"
      };
      addModuleRecord(parcel.id, "fertilisation", newRec);
      setActiveFertProg({
        id,
        parcel_id: parcel.id,
        kind: "fertilisation",
        payload: newRec,
        total_cost: 0,
      });
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <Link to="/parcelles" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Parcelles
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{parcel.name}</h1>
      <p className="mb-4 text-sm uppercase text-muted-foreground">{parcel.type}</p>

      <section className="mb-3 rounded-2xl border bg-card p-4 shadow-sm">
        <header className="mb-2 flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Irrigation</h2>
        </header>
        <p className="text-sm text-muted-foreground">
          Fréquence : {parcel.info.frequency || "—"} · Pompe : {parcel.info.pumpBar || "—"}
        </p>
        <button 
          onClick={handleStartIrrigation}
          className="mt-3 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground active:scale-95 transition-all"
        >
          Démarrer l'irrigation
        </button>
      </section>

      <section className="mb-3 rounded-2xl border bg-card p-4 shadow-sm">
        <header className="mb-2 flex items-center gap-2">
          <Sprout className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold">Fertilisation</h2>
        </header>
        <p className="text-sm text-muted-foreground">
          Espèce : {parcel.info.espece || "—"} · {parcel.info.nbArbres || "—"} arbres
        </p>
        <button 
          onClick={handleStartFertilisation}
          className="mt-3 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-bold text-white active:scale-95 transition-all"
        >
          Saisir un apport
        </button>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <header className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-bold">Anomalies ouvertes</h2>
          </div>
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-sm font-bold text-destructive">
            {anomalies.length}
          </span>
        </header>
        {anomalies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune anomalie ouverte.</p>
        ) : (
          <ul className="space-y-2">
            {anomalies.slice(0, 3).map((a) => (
              <li key={a.id} className="rounded-xl border p-2 text-sm">
                <p className="font-semibold capitalize">{a.type}</p>
                {a.comment && <p className="text-xs text-muted-foreground">{a.comment}</p>}
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/anomalie"
          className="mt-3 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-destructive font-bold text-destructive-foreground active:scale-95"
        >
          <Plus className="h-5 w-5" /> Signaler une anomalie
        </Link>
      </section>

      <TaskExecutionModal target={execTarget} onOpenChange={(o) => !o && setExecTarget(null)} />
      <FertilisationExecutionAssistant 
        program={activeFertProg} 
        onOpenChange={(o) => !o && setActiveFertProg(null)}
        parcelName={parcel.name}
      />
    </main>
  );
}
