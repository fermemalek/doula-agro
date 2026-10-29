import { useState } from "react";
import { BellRing, Plus, Trash2, Check } from "lucide-react";
import { useReminders, useRemindersActions, todayKey, type ReminderFrequency } from "@/lib/reminders-store";
import { useParcels } from "@/lib/parcel-store";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const FREQ_LABEL: Record<ReminderFrequency, string> = {
  daily: "Tous les jours",
  weekdays: "Jours ouvrés",
  weekly: "Hebdomadaire (lundi)",
};

function RappelsPage() {
  const reminders = useReminders();
  const { add, remove, toggleActive, markChecked, unmarkChecked } = useRemindersActions();
  const parcels = useParcels();
  const today = todayKey();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("06:00");
  const [frequency, setFrequency] = useState<ReminderFrequency>("daily");
  const [parcelId, setParcelId] = useState<string>("");

  const create = () => {
    if (!title.trim()) {
      toast.error("Titre requis");
      return;
    }
    add({ title: title.trim(), time, frequency, parcelId: parcelId || undefined });
    setTitle("");
    setTime("06:00");
    setFrequency("daily");
    setParcelId("");
    setOpen(false);
    toast.success("Rappel créé");
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <h1 className="mb-1 text-xl font-bold">Rappels</h1>
      <p className="mb-3 text-sm text-muted-foreground">
        Alarmes à vérifier chaque matin (filtre, pression, etc.).
      </p>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button className="mb-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground active:scale-95">
            <Plus className="h-5 w-5" /> Nouveau rappel
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Nouveau rappel</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            <div>
              <label className="mb-1 block text-sm font-medium">Titre</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Vérifier le filtre principal"
                className="w-full rounded-xl border bg-card p-3 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Heure</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border bg-card p-3 text-base"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Fréquence</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
                  className="w-full rounded-xl border bg-card p-3 text-base"
                >
                  <option value="daily">Tous les jours</option>
                  <option value="weekdays">Jours ouvrés</option>
                  <option value="weekly">Hebdomadaire</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Parcelle (optionnel)</label>
              <select
                value={parcelId}
                onChange={(e) => setParcelId(e.target.value)}
                className="w-full rounded-xl border bg-card p-3 text-base"
              >
                <option value="">— Aucune —</option>
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={create}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground active:scale-95"
            >
              Créer le rappel
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {reminders.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun rappel. Créez-en un pour la vérification matinale.
        </p>
      ) : (
        <ul className="space-y-2">
          {reminders.map((r) => {
            const checked = r.lastCheckedAt === today;
            const parcel = parcels.find((p) => p.id === r.parcelId);
            return (
              <li
                key={r.id}
                className={`flex items-center gap-3 rounded-2xl border bg-card p-3 ${
                  !r.active ? "opacity-50" : ""
                }`}
              >
                <button
                  onClick={() => (checked ? unmarkChecked(r.id) : markChecked(r.id))}
                  disabled={!r.active}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                    checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground"
                  }`}
                  title="Marquer comme vérifié"
                >
                  {checked ? <Check className="h-5 w-5" strokeWidth={3} /> : <BellRing className="h-5 w-5 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {FREQ_LABEL[r.frequency]} · {r.time}
                    {parcel ? ` · ${parcel.name}` : ""}
                  </p>
                </div>
                <Switch checked={r.active} onCheckedChange={() => toggleActive(r.id)} />
                <button
                  onClick={() => remove(r.id)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default RappelsPage;
