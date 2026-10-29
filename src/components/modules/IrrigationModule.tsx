import { useState } from "react";
import { Save, History, Trash2, Calendar as CalendarIcon, CalendarDays, Pencil, X } from "lucide-react";
import { useModuleRecords, useModuleActions } from "@/lib/modules-store";

type Mode = "date" | "mensuel";
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

type Record = {
  id: string;
  createdAt: number;
  mode: Mode;
  date?: string;
  duration?: string;
  dateStartHour?: string;
  month?: string;
  year?: string;
  days?: string[];
  startHour?: string;
  durationPerSession?: string;
};

export function IrrigationModule({ parcelId, canEdit }: { parcelId: string; canEdit: boolean }) {
  const records = useModuleRecords<Record>(parcelId, "irrigation");
  const { add, remove, update } = useModuleActions();
  const [mode, setMode] = useState<Mode>("date");

  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [dateStartHour, setDateStartHour] = useState("06:00");

  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [days, setDays] = useState<string[]>([]);
  const [startHour, setStartHour] = useState("06:00");
  const [durationPerSession, setDurationPerSession] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const monthIndex = MONTHS.indexOf(month);
  const safeMonthIdx = monthIndex >= 0 ? monthIndex : new Date().getMonth();
  const yearNum = parseInt(year, 10) || new Date().getFullYear();
  const daysCount = new Date(yearNum, safeMonthIdx + 1, 0).getDate();
  const firstDayOfWeek = new Date(yearNum, safeMonthIdx, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const [startDay, setStartDay] = useState<number>(() => {
    const todayDate = new Date();
    const isCurrentMonth = safeMonthIdx === todayDate.getMonth() && yearNum === todayDate.getFullYear();
    return isCurrentMonth ? todayDate.getDate() : 1;
  });
  const safeStartDay = Math.min(startDay, daysCount);

  function toggleDay(d: string) {
    setDays((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d]));
    setStartDay(Number(d));
  }

  function resetForm() {
    setEditingId(null);
    setDate("");
    setDuration("");
    setDays([]);
    setDurationPerSession("");
  }

  function startEdit(r: Record) {
    setEditingId(r.id);
    setMode(r.mode);
    if (r.mode === "date") {
      setDate(r.date ?? "");
      setDuration(r.duration ?? "");
      setDateStartHour(r.dateStartHour ?? "06:00");
    } else {
      setMonth(r.month ?? MONTHS[now.getMonth()]);
      setYear(r.year ?? String(now.getFullYear()));
      setDays(r.days ?? []);
      setStartHour(r.startHour ?? "06:00");
      setDurationPerSession(r.durationPerSession ?? "");
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function save() {
    const payload =
      mode === "date"
        ? { mode, date, duration, dateStartHour }
        : { mode, month, year, days, startHour, durationPerSession };
    if (mode === "date" && !date) return;
    if (mode === "mensuel" && days.length === 0) return;
    if (editingId) {
      update(parcelId, "irrigation", editingId, payload);
    } else {
      add(parcelId, "irrigation", payload);
    }
    resetForm();
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? "Modifier le programme" : "Nouveau programme d'irrigation"}
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
          <div className="flex gap-2">
            <button
              onClick={() => setMode("date")}
              className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium ${
                mode === "date" ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Par date
            </button>
            <button
              onClick={() => setMode("mensuel")}
              className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium ${
                mode === "mensuel" ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Mensuel
            </button>
          </div>

          {mode === "date" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Heure de démarrage
                <input
                  type="time"
                  value={dateStartHour}
                  onChange={(e) => setDateStartHour(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
              <label className="col-span-2 text-xs text-muted-foreground">
                Durée (h)
                <input
                  inputMode="decimal"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value.replace(/[^0-9.,]/g, ""))}
                  placeholder="ex: 2"
                  className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  Mois
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                  >
                    {MONTHS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">
                  Année
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Jours du mois</p>
                <div className="rounded-xl border bg-muted/20 p-3 max-w-xs">
                  {/* Start day selector and Vider */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-dashed">
                    <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 shrink-0">
                      <span>Démarrer le :</span>
                      <select
                        value={safeStartDay}
                        onChange={(e) => setStartDay(Number(e.target.value))}
                        className="rounded border border-input bg-background px-1 py-0.5 text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {Array.from({ length: daysCount }).map((_, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {idx + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => setDays([])}
                      className="rounded bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 text-[9px] font-bold text-destructive hover:bg-destructive/20 transition-all"
                    >
                      Vider
                    </button>
                  </div>
                  {/* Presets */}
                  <div className="flex flex-wrap gap-1.5 mb-3 border-b border-dashed pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const arr = [];
                        for (let d = safeStartDay; d <= daysCount; d++) {
                          if (d % 2 === 0) arr.push(String(d));
                        }
                        setDays(arr);
                      }}
                      className="rounded bg-background border border-input px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                      title="Jours pairs à partir du jour sélectionné"
                    >
                      Pairs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const arr = [];
                        for (let d = safeStartDay; d <= daysCount; d++) {
                          if (d % 2 !== 0) arr.push(String(d));
                        }
                        setDays(arr);
                      }}
                      className="rounded bg-background border border-input px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                      title="Jours impairs à partir du jour sélectionné"
                    >
                      Impairs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const arr = [];
                        for (let d = safeStartDay; d <= daysCount; d++) {
                          arr.push(String(d));
                        }
                        setDays(arr);
                      }}
                      className="rounded bg-background border border-input px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                      title="Chaque jour à partir du jour sélectionné"
                    >
                      Chaque jour
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const arr = [];
                        for (let d = safeStartDay; d <= daysCount; d += 3) {
                          arr.push(String(d));
                        }
                        setDays(arr);
                      }}
                      className="rounded bg-background border border-input px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                      title="1 jour sur 3 à partir du jour sélectionné"
                    >
                      1j / 3
                    </button>
                  </div>
                  {/* Grid headers */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground mb-2">
                    <div>Lu</div>
                    <div>Ma</div>
                    <div>Me</div>
                    <div>Je</div>
                    <div>Ve</div>
                    <div>Sa</div>
                    <div>Di</div>
                  </div>
                  {/* Grid days */}
                  <div className="grid grid-cols-7 gap-1 justify-items-center">
                    {/* Empty offsets */}
                    {Array.from({ length: startOffset }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-7 w-7" />
                    ))}
                    {/* Month days with isToday and isFriday highlights */}
                    {Array.from({ length: daysCount }).map((_, i) => {
                      const dayNum = i + 1;
                      const dayNumStr = String(dayNum);
                      const isSelected = days.includes(dayNumStr);
                      const dateObj = new Date(yearNum, safeMonthIdx, dayNum);
                      const isFriday = dateObj.getDay() === 5;
                      const isToday =
                        now.getDate() === dayNum &&
                        now.getMonth() === safeMonthIdx &&
                        now.getFullYear() === yearNum;

                      let btnClass = "h-7 w-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center relative ";
                      if (isSelected) {
                        if (isFriday) {
                          btnClass += "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90";
                        } else {
                          btnClass += "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90";
                        }
                        if (isToday) {
                          btnClass += " ring-2 ring-primary ring-offset-1 dark:ring-offset-background";
                        }
                      } else {
                        if (isToday) {
                          btnClass += "bg-primary/10 border-2 border-primary text-primary font-black";
                        } else if (isFriday) {
                          btnClass += "bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20";
                        } else {
                          btnClass += "bg-background border border-input text-foreground hover:bg-muted";
                        }
                      }

                      return (
                        <button
                          key={dayNumStr}
                          type="button"
                          onClick={() => toggleDay(dayNumStr)}
                          className={btnClass}
                          title={isToday ? "Aujourd'hui" : isFriday ? "Vendredi (Repos)" : ""}
                        >
                          {dayNumStr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  Heure début
                  <input
                    type="time"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Durée / session (h)
                  <input
                    value={durationPerSession}
                    onChange={(e) => setDurationPerSession(e.target.value)}
                    placeholder="ex: 1.5"
                    className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t pt-3">
            <button
              onClick={save}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
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
                  <span className="font-medium text-foreground">
                    {r.mode === "date"
                      ? `Date · ${r.date}`
                      : `Mensuel · ${r.month} ${r.year}`}
                  </span>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(r)}
                        className="text-muted-foreground hover:text-primary"
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(parcelId, "irrigation", r.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.mode === "date"
                    ? `Démarrage : ${r.dateStartHour || "—"} · Durée : ${r.duration || "—"} h`
                    : `Jours : ${r.days?.join(", ")} · ${r.startHour} · ${r.durationPerSession || "—"} h/session`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
