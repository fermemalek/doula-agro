import { Link, useNavigate } from "@/lib/router-compat";
import { Droplets, ArrowRight, Plus, Pencil, Trash2, Clock, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAllModuleRecords, useModuleActions } from "@/lib/modules-store";
import { useParcels } from "@/lib/parcel-store";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import {
  ListPageShell,
  ProgramFiltersBar,
  matchesFilters,
  useFilters,
  useYearsFromDates,
  MONTHS_FR,
} from "@/components/programs/ProgramFiltersBar";
import { IngenieurRecoBanner } from "@/components/programs/IngenieurRecoBanner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useDisplayRole } from "@/lib/display-role";
import { Navigate } from "react-router-dom";
import { useSequentialSchedules, type DBSequentialSchedule } from "@/lib/sequential-store";

interface Rec {
  id: string;
  parcelId: string;
  createdAt: number;
  mode: "date" | "mensuel";
  date?: string;
  duration?: string;
  dateStartHour?: string;
  month?: string;
  year?: string;
  days?: string[];
  startHour?: string;
  durationPerSession?: string;
}

function recDate(r: Rec): string | undefined {
  if (r.date) return r.date;
  if (r.year && r.month) {
    const idx = MONTHS_FR.indexOf(r.month);
    if (idx >= 0) return `${r.year}-${String(idx + 1).padStart(2, "0")}-01`;
  }
  return undefined;
}

function addMinutes(timeStr: string, mins: number): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() + mins);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseMinutes(str?: string): number {
  if (!str) return 0;
  const m = str.match(/\((\d+)\s*min\)/);
  if (m) return parseInt(m[1], 10);
  const m2 = str.match(/\((\d+)h(\d+)\)/);
  if (m2) return parseInt(m2[1], 10) * 60 + parseInt(m2[2], 10);
  const m3 = str.match(/\((\d+)\s*h\)/);
  if (m3) return parseInt(m3[1], 10) * 60;
  return 0;
}

function computeComputedFields(entry: {
  parcel: string;
  startHour: string;
  preWettingMins?: number;
  injectionMins?: number;
  rinsingMins?: number;
}) {
  const preWettingMins = entry.preWettingMins ?? 30;
  const injectionMins = entry.injectionMins ?? 45;
  const rinsingMins = entry.rinsingMins ?? 15;
  
  const start = entry.startHour || "05:00";
  const preEnd = addMinutes(start, preWettingMins);
  const injEnd = addMinutes(preEnd, injectionMins);
  const rinsEnd = addMinutes(injEnd, rinsingMins);
  
  return {
    preWetting: `${start.replace(":", "h")} - ${preEnd.replace(":", "h")} (${preWettingMins} min)`,
    injection: `${preEnd.replace(":", "h")} - ${injEnd.replace(":", "h")} (${injectionMins} min)`,
    rinsing: `${injEnd.replace(":", "h")} - ${rinsEnd.replace(":", "h")} (${rinsingMins} min)`,
    endHour: `${rinsEnd}:00`,
    duration: preWettingMins + injectionMins + rinsingMins
  };
}

function parseEntriesForEdit(entries: any[]) {
  return entries.map((e) => {
    const isPause = e.parcel.includes("Pause") || e.parcel.includes("Basculement") || e.parcel.startsWith("⏳");
    if (isPause) {
      return {
        isPause: true,
        parcel: "⏳ Pause Technique / Basculement Vannes",
        duration: e.duration || parseMinutes(e.parcel) || 10,
      };
    } else {
      return {
        isPause: false,
        parcel: e.parcel,
        startHour: (e.startHour || "05:00").slice(0, 5),
        preWettingMins: parseMinutes(e.preWetting) || 30,
        injectionMins: parseMinutes(e.injection) || 45,
        rinsingMins: parseMinutes(e.rinsing) || 15,
      };
    }
  });
}

function parseDaysForEdit(days: any[]) {
  return days.map((d) => ({
    title: d.title,
    entries: parseEntriesForEdit(d.entries),
  }));
}

function compileDays(daysState: any[]) {
  return daysState.map((day) => {
    let currentTime = "05:00";
    const compiledEntries = day.entries.map((e: any) => {
      if (e.isPause) {
        const start = currentTime;
        const duration = parseInt(e.duration) || 10;
        const end = addMinutes(start, duration);
        currentTime = end;
        return {
          parcel: `⏳ Pause Technique / Basculement Vannes : ${start.replace(":", "h")} - ${end.replace(":", "h")} (${duration} min)`,
          startHour: "",
          preWetting: "",
          injection: "",
          rinsing: "",
          endHour: "",
          duration,
        };
      } else {
        const start = e.startHour || currentTime;
        const preWettingMins = parseInt(e.preWettingMins) || 30;
        const injectionMins = parseInt(e.injectionMins) || 45;
        const rinsingMins = parseInt(e.rinsingMins) || 15;
        
        const computed = computeComputedFields({
          parcel: e.parcel,
          startHour: start,
          preWettingMins,
          injectionMins,
          rinsingMins,
        });
        
        currentTime = computed.endHour.slice(0, 5);
        return {
          parcel: e.parcel,
          startHour: start,
          preWetting: computed.preWetting,
          injection: computed.injection,
          rinsing: computed.rinsing,
          endHour: computed.endHour,
          duration: computed.duration,
        };
      }
    });
    return {
      title: day.title,
      entries: compiledEntries,
    };
  });
}

function IrrigationListPage() {
  const role = useDisplayRole();
  const today = new Date();
  const { t, lang } = useTranslation();
  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const records = useAllModuleRecords<Rec>("irrigation");
  const parcels = useParcels();
  const [filters, setFilters] = useFilters();
  const years = useYearsFromDates(records.map(recDate));
  const navigate = useNavigate();

  // Store integration
  const { schedules, addSchedule, updateSchedule, deleteSchedule } = useSequentialSchedules();
  const { add, update, remove } = useModuleActions();

  // Tabs
  const [activeTab, setActiveTab] = useState<string>("archive");

  // Creation/Selection Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [simpleProgramDialogOpen, setSimpleProgramDialogOpen] = useState(false);

  // Simple Program Form States
  const [pMode, setPMode] = useState<"date" | "mensuel">("date");
  const [pDate, setPDate] = useState("");
  const [pDuration, setPDuration] = useState("");
  const [pDateStartHour, setPDateStartHour] = useState("06:00");
  const [pMonth, setPMonth] = useState("Janvier");
  const [pYear, setPYear] = useState("2026");
  const [pDays, setPDays] = useState<string[]>([]);
  const [pStartHour, setPStartHour] = useState("06:00");
  const [pDurationPerSession, setPDurationPerSession] = useState("");

  const pMonthIndex = MONTHS_FR.indexOf(pMonth);
  const pSafeMonthIdx = pMonthIndex >= 0 ? pMonthIndex : new Date().getMonth();
  const pYearNum = parseInt(pYear, 10) || new Date().getFullYear();
  const pDaysCount = new Date(pYearNum, pSafeMonthIdx + 1, 0).getDate();
  const pFirstDayOfWeek = new Date(pYearNum, pSafeMonthIdx, 1).getDay();
  const pStartOffset = pFirstDayOfWeek === 0 ? 6 : pFirstDayOfWeek - 1;

  const [pStartDay, setPStartDay] = useState<number>(() => {
    const todayDate = new Date();
    const isCurrentMonth = pSafeMonthIdx === todayDate.getMonth() && pYearNum === todayDate.getFullYear();
    return isCurrentMonth ? todayDate.getDate() : 1;
  });
  const safePStartDay = Math.min(pStartDay, pDaysCount);

  // Editor Dialog
  const [sequentialDialogOpen, setSequentialDialogOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [sName, setSName] = useState("");
  const [sRule, setSRule] = useState("");
  const [sPeriod, setSPeriod] = useState("");
  const [sDays, setSDays] = useState<any[]>([]);

  // Deletion Confirmation Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  // Simple Program Deletion & Editing States
  const [simpleDeleteConfirmOpen, setSimpleDeleteConfirmOpen] = useState(false);
  const [simpleToDelete, setSimpleToDelete] = useState<{ parcelId: string; id: string } | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  function handleChoiceSimple() {
    setSelectedParcels([]);
    setAddOpen(true);
  }

  function confirmAddSimple() {
    if (selectedParcels.length === 0) return;
    setAddOpen(false);
    const now = new Date();
    setPMode("date");
    setPDate("");
    setPDuration("");
    setPDateStartHour("06:00");
    setPMonth(MONTHS_FR[now.getMonth()]);
    setPYear(String(now.getFullYear()));
    setPDays([]);
    setPStartDay(now.getDate());
    setPStartHour("06:00");
    setPDurationPerSession("");
    setSimpleProgramDialogOpen(true);
  }

  function handleSaveSimpleProgram() {
    if (selectedParcels.length === 0) return;
    const payload = pMode === "date"
      ? { mode: pMode, date: pDate, duration: pDuration, dateStartHour: pDateStartHour }
      : { mode: pMode, month: pMonth, year: pYear, days: pDays, startHour: pStartHour, durationPerSession: pDurationPerSession };

    if (pMode === "date" && !pDate) {
      toast.error("Veuillez renseigner la date.");
      return;
    }
    if (pMode === "mensuel" && pDays.length === 0) {
      toast.error("Veuillez sélectionner au moins un jour du mois.");
      return;
    }

    if (editingRecordId) {
      const parcelId = selectedParcels[0];
      update(parcelId, "irrigation", editingRecordId, payload);
      toast.success("Programme mis à jour avec succès.");
    } else {
      selectedParcels.forEach((parcelId) => {
        add(parcelId, "irrigation", payload);
      });
      toast.success(`Programme enregistré avec succès pour ${selectedParcels.length} parcelle(s).`);
    }

    setSimpleProgramDialogOpen(false);
    setEditingRecordId(null);
  }

  function handleStartEditSimple(r: Rec) {
    setEditingRecordId(r.id);
    setSelectedParcels([r.parcelId]);
    setPMode(r.mode);
    if (r.mode === "date") {
      setPDate(r.date ?? "");
      setPDuration(r.duration ?? "");
      setPDateStartHour(r.dateStartHour ?? "06:00");
    } else {
      setPMonth(r.month ?? "Janvier");
      setPYear(r.year ?? "2026");
      setPDays(r.days ?? []);
      setPStartHour(r.startHour ?? "06:00");
      setPDurationPerSession(r.durationPerSession ?? "");
      setPStartDay(r.days && r.days.length > 0 ? Math.min(...r.days.map(Number)) : 1);
    }
    setSimpleProgramDialogOpen(true);
  }

  function handleRemoveSimple(parcelId: string, id: string) {
    setSimpleToDelete({ parcelId, id });
    setSimpleDeleteConfirmOpen(true);
  }

  function confirmDeleteSimple() {
    if (simpleToDelete) {
      remove(simpleToDelete.parcelId, "irrigation", simpleToDelete.id);
      setSimpleToDelete(null);
      setSimpleDeleteConfirmOpen(false);
      toast.success("Programme supprimé avec succès.");
    }
  }

  function handleChoiceSequential() {
    setEditingScheduleId(null);
    setSName("Nouveau Cycle");
    setSRule("Règle du cycle en vigueur : Total 1h30...");
    setSPeriod("📅 PÉRIODE : MARS À MI-MAI");
    setSDays([
      {
        title: "JOUR 1",
        entries: [
          { isPause: false, parcel: "Nectarines : Nabara", startHour: "05:00", preWettingMins: 30, injectionMins: 45, rinsingMins: 15 }
        ]
      }
    ]);
    setSequentialDialogOpen(true);
  }

  function handleOpenEdit(s: DBSequentialSchedule) {
    setEditingScheduleId(s.id);
    setSName(s.title);
    setSRule(s.rule);
    setSPeriod(s.period);
    setSDays(parseDaysForEdit(s.days));
    setSequentialDialogOpen(true);
  }

  function handleDeleteSchedule(id: string) {
    setScheduleToDelete(id);
    setDeleteConfirmOpen(true);
  }

  function confirmDeleteSchedule() {
    if (scheduleToDelete) {
      deleteSchedule(scheduleToDelete);
      setScheduleToDelete(null);
      setDeleteConfirmOpen(false);
      setActiveTab("archive");
    }
  }

  function handleSaveSequential() {
    if (!sName.trim()) return;
    const compiled = compileDays(sDays);
    const payload = {
      title: sName.trim(),
      rule: sRule.trim(),
      period: sPeriod.trim(),
      days: compiled,
    };

    if (editingScheduleId) {
      updateSchedule(editingScheduleId, payload);
    } else {
      const newId = addSchedule(payload);
      setActiveTab(newId);
    }
    setSequentialDialogOpen(false);
  }

  // Days state helpers
  function addDay() {
    setSDays([...sDays, { title: `JOUR ${sDays.length + 1}`, entries: [] }]);
  }

  function removeDay(dayIdx: number) {
    setSDays(sDays.filter((_, idx) => idx !== dayIdx));
  }

  function updateDayTitle(dayIdx: number, title: string) {
    setSDays(sDays.map((d, idx) => idx === dayIdx ? { ...d, title } : d));
  }

  function addEntry(dayIdx: number, isPause: boolean) {
    const defaultEntry = isPause
      ? { isPause: true, parcel: "⏳ Pause Technique / Basculement Vannes", duration: 10 }
      : { isPause: false, parcel: "Parcelle", startHour: "05:00", preWettingMins: 30, injectionMins: 45, rinsingMins: 15 };

    setSDays(sDays.map((d, idx) => {
      if (idx === dayIdx) {
        return { ...d, entries: [...d.entries, defaultEntry] };
      }
      return d;
    }));
  }

  function removeEntry(dayIdx: number, entryIdx: number) {
    setSDays(sDays.map((d, idx) => {
      if (idx === dayIdx) {
        return { ...d, entries: d.entries.filter((_: any, eIdx: number) => eIdx !== entryIdx) };
      }
      return d;
    }));
  }

  function updateEntryField(dayIdx: number, entryIdx: number, field: string, value: any) {
    setSDays(sDays.map((d, idx) => {
      if (idx === dayIdx) {
        const newEntries = d.entries.map((e: any, eIdx: number) => {
          if (eIdx === entryIdx) {
            return { ...e, [field]: value };
          }
          return e;
        });
        return { ...d, entries: newEntries };
      }
      return d;
    }));
  }

  const filtered = records
    .filter((r) => matchesFilters(recDate(r), r.parcelId, filters))
    .sort((a, b) => b.createdAt - a.createdAt);

  const canEdit = role === "admin";
  const currentSchedule = schedules.find(s => s.id === activeTab);

  return (
    <ListPageShell title={t("irr.title", "Irrigation & Fertilisation")}>
      <IngenieurRecoBanner kind="irrigation" />

      {/* Sub tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        <button
          onClick={() => setActiveTab("archive")}
          className={`px-3 py-2 text-center text-xs font-semibold rounded-lg transition-all ${
            activeTab === "archive"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("irr.archived", "Programmes Archivés")}
        </button>
        {schedules.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={`px-3 py-2 text-center text-xs font-semibold rounded-lg transition-all ${
              activeTab === s.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>
      
      {activeTab === "archive" ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
            <div className="flex-1">
              <ProgramFiltersBar value={filters} onChange={setFilters} years={years} />
            </div>
            {canEdit && (
              <Button
                onClick={handleChoiceSimple}
                className="h-11 sm:h-12 w-full sm:w-auto rounded-xl font-bold bg-primary text-primary-foreground flex items-center justify-center shrink-0"
              >
                <Plus className="h-4 w-4 mr-1.5" /> {t("irr.new", "Nouveau")}
              </Button>
            )}
          </div>
          {filtered.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">{t("irr.noProg", "Aucun programme.")}</Card>
          ) : (
            <ul className="space-y-2">
              {filtered.map((r) => {
                const parcel = parcels.find((p) => p.id === r.parcelId);
                return (
                  <li key={r.id}>
                    <Card className="p-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
                      <Link
                        to="/parcelle/$id"
                        params={{ id: r.parcelId }}
                        className="flex flex-1 items-center gap-3 min-w-0"
                      >
                        <div className="rounded-full bg-primary/10 p-2">
                          <Droplets className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">{parcel?.name ?? r.parcelId}</span>
                            <span className="text-xs text-muted-foreground">
                              {r.mode === "date" ? r.date : `${r.month} ${r.year}`}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {r.mode === "date"
                              ? `Durée: ${r.duration || "—"}`
                              : `Jours: ${(r.days ?? []).join(", ") || "—"} • ${r.startHour ?? ""}`}
                          </div>
                        </div>
                      </Link>

                      {canEdit ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEditSimple(r)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSimple(r.parcelId, r.id)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        currentSchedule && (
          <div className="space-y-4">
            {/* Header Actions */}
            {canEdit && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(currentSchedule)} className="rounded-xl">
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier le cycle
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteSchedule(currentSchedule.id)} className="rounded-xl">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer le cycle
                </Button>
              </div>
            )}

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h3 className="font-bold text-sm text-foreground">{currentSchedule.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{currentSchedule.rule}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600">
                <Clock className="h-3 w-3" /> {currentSchedule.period}
              </div>
            </div>

            <div className="space-y-3">
              {currentSchedule.days.map((day, dIdx) => (
                <div key={dIdx} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1 mt-2">
                    {day.title}
                  </h4>
                  <div className="space-y-2">
                    {day.entries.map((entry, eIdx) => {
                      const isPause = entry.parcel.includes("Pause") || entry.parcel.includes("Basculement") || entry.parcel.startsWith("⏳");
                      if (isPause) {
                        return (
                          <div
                            key={eIdx}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed bg-muted/40 p-2.5 text-center text-xs text-muted-foreground"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>{entry.parcel}</span>
                          </div>
                        );
                      }

                      // Visual representation of progress bars
                      const preWettingMins = parseMinutes(entry.preWetting);
                      const injectionMins = parseMinutes(entry.injection);
                      const rinsingMins = parseMinutes(entry.rinsing);
                      const totalMins = preWettingMins + injectionMins + rinsingMins;

                      const preWettingPct = totalMins > 0 ? (preWettingMins / totalMins) * 100 : 0;
                      const injectionPct = totalMins > 0 ? (injectionMins / totalMins) * 100 : 0;
                      const rinsingPct = totalMins > 0 ? (rinsingMins / totalMins) * 100 : 0;

                      return (
                        <Card key={eIdx} className="p-3.5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-sm text-foreground">{entry.parcel}</span>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Cycle complet de {entry.duration} minutes ({totalMins} min effectifs)
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                                {entry.startHour.slice(0, 5)} - {entry.endHour.slice(0, 5)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                              <div
                                style={{ width: `${preWettingPct}%` }}
                                className="bg-sky-400"
                                title={`Pré-mouillage: ${preWettingMins} min`}
                              />
                              <div
                                style={{ width: `${injectionPct}%` }}
                                className="bg-purple-400"
                                title={`Injection: ${injectionMins} min`}
                              />
                              <div
                                style={{ width: `${rinsingPct}%` }}
                                className="bg-emerald-400"
                                title={`Rinçage: ${rinsingMins} min`}
                              />
                            </div>
                            <div className="grid grid-cols-3 text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />
                                <span>Mouillage ({preWettingMins}m)</span>
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-purple-400" />
                                <span>Injection ({injectionMins}m)</span>
                              </div>
                              <div className="flex items-center justify-end gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                <span>Rinçage ({rinsingMins}m)</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}


      {/* Dialog Select Parcel (for simple program) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Sélectionner les parcelles</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Parcelles</Label>
                <div className="flex gap-2 text-[10px] font-bold text-primary">
                  <button type="button" onClick={() => setSelectedParcels(parcels.map(p => p.id))} className="hover:underline">
                    Tout cocher
                  </button>
                  <span className="text-muted-foreground/30 font-normal">|</span>
                  <button type="button" onClick={() => setSelectedParcels([])} className="text-muted-foreground hover:underline">
                    Tout décocher
                  </button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-xl bg-muted/10 p-2 space-y-1.5">
                {parcels.map((p) => {
                  const isChecked = selectedParcels.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        isChecked
                          ? "bg-primary/5 border-primary text-foreground"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParcels([...selectedParcels, p.id]);
                          } else {
                            setSelectedParcels(selectedParcels.filter((id) => id !== p.id));
                          }
                        }}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4 shrink-0"
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button onClick={confirmAddSimple} disabled={selectedParcels.length === 0} className="rounded-xl font-bold bg-primary text-primary-foreground">
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Simple Program Configuration */}
      <Dialog
        open={simpleProgramDialogOpen}
        onOpenChange={(open) => {
          setSimpleProgramDialogOpen(open);
          if (!open) {
            setEditingRecordId(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingRecordId ? t("irr.editIrrigation", "Modifier le programme d'irrigation") : t("irr.configIrrigation", "Configurer l'irrigation")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-xl bg-muted/30 p-2.5 border text-muted-foreground font-semibold">
              <span className="font-bold text-foreground">Parcelles :</span> {selectedParcels.map(pid => parcels.find(p => p.id === pid)?.name).join(", ")}
            </div>

            {/* Mode Tab buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPMode("date")}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-bold transition-all ${
                  pMode === "date" ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-input bg-background text-foreground hover:bg-muted"
                }`}
              >
                Par date
              </button>
              <button
                type="button"
                onClick={() => setPMode("mensuel")}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-bold transition-all ${
                  pMode === "mensuel" ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-input bg-background text-foreground hover:bg-muted"
                }`}
              >
                Mensuel
              </button>
            </div>

            {pMode === "date" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-semibold text-muted-foreground">Date</Label>
                  <input
                    type="date"
                    value={pDate}
                    onChange={(e) => setPDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <Label className="font-semibold text-muted-foreground">Heure de démarrage</Label>
                  <input
                    type="time"
                    value={pDateStartHour}
                    onChange={(e) => setPDateStartHour(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="font-semibold text-muted-foreground">Durée (h)</Label>
                  <input
                    inputMode="decimal"
                    value={pDuration}
                    onChange={(e) => setPDuration(e.target.value.replace(/[^0-9.,]/g, ""))}
                    placeholder="ex: 2"
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-semibold text-muted-foreground">Mois</Label>
                    <select
                      value={pMonth}
                      onChange={(e) => setPMonth(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      {MONTHS_FR.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="font-semibold text-muted-foreground">Année</Label>
                    <input
                      value={pYear}
                      onChange={(e) => setPYear(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Calendar month grid */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Jours du mois</Label>
                  <div className="rounded-xl border bg-muted/20 p-3 mt-1.5 max-w-sm mx-auto sm:mx-0">
                    {/* Start day selector and Vider */}
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-dashed">
                      <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 shrink-0">
                        <span>Démarrer le :</span>
                        <select
                          value={safePStartDay}
                          onChange={(e) => setPStartDay(Number(e.target.value))}
                          className="rounded border border-input bg-background px-1 py-0.5 text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {Array.from({ length: pDaysCount }).map((_, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                              {idx + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => setPDays([])}
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
                          for (let d = safePStartDay; d <= pDaysCount; d++) {
                            if (d % 2 === 0) arr.push(String(d));
                          }
                          setPDays(arr);
                        }}
                        className="rounded bg-background border border-input px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                        title="Jours pairs à partir du jour de début"
                      >
                        Pairs
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const arr = [];
                          for (let d = safePStartDay; d <= pDaysCount; d++) {
                            if (d % 2 !== 0) arr.push(String(d));
                          }
                          setPDays(arr);
                        }}
                        className="rounded bg-background border border-input px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                        title="Jours impairs à partir du jour de début"
                      >
                        Impairs
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const arr = [];
                          for (let d = safePStartDay; d <= pDaysCount; d++) {
                            arr.push(String(d));
                          }
                          setPDays(arr);
                        }}
                        className="rounded bg-background border border-input px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                        title="Chaque jour à partir du jour de début"
                      >
                        Chaque jour
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const arr = [];
                          for (let d = safePStartDay; d <= pDaysCount; d += 3) {
                            arr.push(String(d));
                          }
                          setPDays(arr);
                        }}
                        className="rounded bg-background border border-input px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                        title="1 jour sur 3 à partir du jour de début"
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
                      {Array.from({ length: pStartOffset }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-7 w-7" />
                      ))}
                      {/* Month days */}
                      {Array.from({ length: pDaysCount }).map((_, i) => {
                        const dayNum = i + 1;
                        const dayNumStr = String(dayNum);
                        const isSelected = pDays.includes(dayNumStr);
                        const dateObj = new Date(pYearNum, pSafeMonthIdx, dayNum);
                        const isFriday = dateObj.getDay() === 5;
                        const isToday =
                          today.getDate() === dayNum &&
                          today.getMonth() === pSafeMonthIdx &&
                          today.getFullYear() === pYearNum;

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
                            onClick={() => {
                              setPDays(arr => arr.includes(dayNumStr) ? arr.filter(x => x !== dayNumStr) : [...arr, dayNumStr]);
                              setPStartDay(dayNum);
                            }}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-semibold text-muted-foreground">Heure début</Label>
                    <input
                      type="time"
                      value={pStartHour}
                      onChange={(e) => setPStartHour(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-muted-foreground">Durée / session (h)</Label>
                    <input
                      value={pDurationPerSession}
                      onChange={(e) => setPDurationPerSession(e.target.value)}
                      placeholder="ex: 1.5"
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-2 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSimpleProgramDialogOpen(false);
                setEditingRecordId(null);
              }}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button onClick={handleSaveSimpleProgram} className="rounded-xl font-bold bg-primary text-primary-foreground">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            Voulez-vous vraiment supprimer ce cycle d'irrigation ? Cette action est irréversible.
          </div>
          <DialogFooter className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSchedule} className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simple Program Deletion Confirmation Dialog */}
      <Dialog open={simpleDeleteConfirmOpen} onOpenChange={setSimpleDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">{t("irr.confirmDelete", "Confirmer la suppression")}</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            {t("irr.confirmDeleteMsg", "Voulez-vous vraiment supprimer ce programme d'irrigation ? Cette action est irréversible.")}
          </div>
          <DialogFooter className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => setSimpleDeleteConfirmOpen(false)} className="rounded-xl">
              {t("irr.cancel", "Annuler")}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSimple} className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("irr.delete", "Supprimer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Sequential Edit/Create */}
      <Dialog open={sequentialDialogOpen} onOpenChange={setSequentialDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-wide flex items-center gap-1.5">
              {editingScheduleId ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
              {editingScheduleId ? "Modifier le planning séquentiel" : "Créer un planning séquentiel"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="font-semibold">Nom du cycle</Label>
                <Input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Ex: Printemps" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="font-semibold">Règle de cycle</Label>
                <Input value={sRule} onChange={(e) => setSRule(e.target.value)} placeholder="Ex: Total 1h30 par bloc..." className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="font-semibold">Période d'activité</Label>
                <Input value={sPeriod} onChange={(e) => setSPeriod(e.target.value)} placeholder="Ex: Mars à mi-mai" className="mt-1 rounded-xl" />
              </div>
            </div>

            {/* Days editor */}
            <div className="space-y-4 border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm uppercase">Jours de rotation</span>
                <Button variant="outline" size="sm" onClick={addDay} className="rounded-xl text-xs font-semibold">
                  + Ajouter un Jour
                </Button>
              </div>

              {sDays.map((day, dayIdx) => (
                <Card key={dayIdx} className="p-3.5 space-y-3 bg-muted/10 border-muted">
                  <div className="flex items-center gap-3 justify-between border-b pb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Label className="font-bold text-xs uppercase shrink-0">Titre :</Label>
                      <Input value={day.title} onChange={(e) => updateDayTitle(dayIdx, e.target.value)} className="h-8 max-w-[240px] rounded-lg text-xs" />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeDay(dayIdx)} className="text-destructive hover:bg-destructive/10 h-8 rounded-lg">
                      Supprimer ce jour
                    </Button>
                  </div>

                  {/* Entries lists inside day */}
                  <div className="space-y-2">
                    {day.entries.map((e: any, eIdx: number) => (
                      <div key={eIdx} className={`p-2.5 rounded-xl border flex flex-col md:flex-row md:items-center gap-3 justify-between ${e.isPause ? "bg-muted/40 border-dashed border-muted" : "bg-card"}`}>
                        {e.isPause ? (
                          <div className="flex-1 flex items-center gap-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase shrink-0">
                              <Clock className="h-3 w-3" /> Pause Technique :
                            </span>
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                value={e.parcel}
                                onChange={(ev) => updateEntryField(dayIdx, eIdx, "parcel", ev.target.value)}
                                className="h-8 rounded-lg text-xs flex-1"
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                <Label className="text-[10px] text-muted-foreground font-semibold">Durée :</Label>
                                <Input
                                  type="number"
                                  value={e.duration}
                                  onChange={(ev) => updateEntryField(dayIdx, eIdx, "duration", ev.target.value)}
                                  className="h-8 w-16 rounded-lg text-xs text-center"
                                />
                                <span className="text-[10px] text-muted-foreground font-semibold">min</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2.5 items-end">
                            <div className="col-span-2 md:col-span-2">
                              <Label className="text-[10px] font-semibold text-muted-foreground">Parcelle / Description</Label>
                              <Input
                                value={e.parcel}
                                onChange={(ev) => updateEntryField(dayIdx, eIdx, "parcel", ev.target.value)}
                                className="h-8 rounded-lg text-xs mt-0.5"
                                placeholder="Nom ou bloc"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] font-semibold text-muted-foreground">Début</Label>
                              <Input
                                type="time"
                                value={e.startHour}
                                onChange={(ev) => updateEntryField(dayIdx, eIdx, "startHour", ev.target.value)}
                                className="h-8 rounded-lg text-xs mt-0.5 text-center"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] font-semibold text-muted-foreground">Mouillage / Inj. / Rinç. (min)</Label>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Input
                                  type="number"
                                  value={e.preWettingMins}
                                  onChange={(ev) => updateEntryField(dayIdx, eIdx, "preWettingMins", ev.target.value)}
                                  className="h-8 w-12 rounded-lg text-xs text-center p-1"
                                  title="Mouillage"
                                />
                                <span className="text-muted-foreground font-bold">/</span>
                                <Input
                                  type="number"
                                  value={e.injectionMins}
                                  onChange={(ev) => updateEntryField(dayIdx, eIdx, "injectionMins", ev.target.value)}
                                  className="h-8 w-12 rounded-lg text-xs text-center p-1"
                                  title="Injection"
                                />
                                <span className="text-muted-foreground font-bold">/</span>
                                <Input
                                  type="number"
                                  value={e.rinsingMins}
                                  onChange={(ev) => updateEntryField(dayIdx, eIdx, "rinsingMins", ev.target.value)}
                                  className="h-8 w-12 rounded-lg text-xs text-center p-1"
                                  title="Rinçage"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col items-center justify-center h-8 shrink-0 pb-1.5 font-bold font-mono text-muted-foreground text-[10px]">
                              <span>Durée : { (parseInt(e.preWettingMins) || 0) + (parseInt(e.injectionMins) || 0) + (parseInt(e.rinsingMins) || 0) }m</span>
                            </div>
                          </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => removeEntry(dayIdx, eIdx)} className="text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add entries tools */}
                  <div className="flex gap-2 justify-start pt-1.5 border-t border-dashed">
                    <Button variant="outline" size="sm" onClick={() => addEntry(dayIdx, false)} className="rounded-lg text-[10px] h-7 font-bold">
                      + Étape Parcelle
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addEntry(dayIdx, true)} className="rounded-lg text-[10px] h-7 font-bold">
                      + Pause Technique
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setSequentialDialogOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button onClick={handleSaveSequential} className="rounded-xl font-bold bg-primary text-primary-foreground">
              Enregistrer le planning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListPageShell>
  );
}

export default IrrigationListPage;
