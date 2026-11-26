import { useEffect, useMemo, useState } from "react";
import { Droplet } from "lucide-react";
import { useAllModuleRecords } from "@/lib/modules-store";
import { useParcels } from "@/lib/parcel-store";
import { useTranslation } from "@/lib/i18n";

const DAY_KEYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

interface IrrigRec {
  parcelId: string;
  mode: "date" | "mensuel";
  date?: string;
  duration?: string;
  month?: string;
  year?: string;
  days?: string[];
  startHour?: string;
  durationPerSession?: string;
}

function formatCountdown(ms: number) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function findTodayProgram(records: IrrigRec[]): { startAt: Date; duration: string; parcelId: string } | null {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dayKey = DAY_KEYS[now.getDay()];
  const monthName = MONTHS[now.getMonth()];
  const yearStr = String(now.getFullYear());

  // Direct date match
  for (const r of records) {
    if (r.mode === "date" && r.date === today) {
      const startAt = new Date(today + "T06:00:00");
      return { startAt, duration: r.duration ?? "—", parcelId: r.parcelId };
    }
  }
  // Monthly
  for (const r of records) {
    if (
      r.mode === "mensuel" &&
      r.month === monthName &&
      r.year === yearStr &&
      r.days?.some((d) => {
        const todayDomNum = String(now.getDate());
        return d === dayKey || d === dayKey.slice(0, 3) || d === todayDomNum || d === todayDomNum.padStart(2, "0");
      })
    ) {
      const [hh, mm] = (r.startHour ?? "06:00").split(":").map(Number);
      const startAt = new Date();
      startAt.setHours(hh, mm, 0, 0);
      return { startAt, duration: r.durationPerSession ?? "—", parcelId: r.parcelId };
    }
  }
  return null;
}

export function NextIrrigationBlock() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const records = useAllModuleRecords<IrrigRec>("irrigation");
  const parcels = useParcels();
  const program = useMemo(() => findTodayProgram(records as IrrigRec[]), [records]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!program) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [program]);

  const parcelName = program ? parcels.find((p) => p.id === program.parcelId)?.name ?? "—" : "";

  if (!program) {
    return (
      <div
        dir={isAr ? "rtl" : "ltr"}
        className="rounded-2xl bg-irrigation-blue p-4 text-irrigation-blue-foreground shadow-sm"
      >
        <div className="flex items-center gap-2 text-sm font-medium opacity-90">
          <Droplet className="h-4 w-4" />
          <span>{isAr ? "برنامج الري اليومي" : "Arrosage du jour"}</span>
        </div>
        <p className="mt-3 text-sm opacity-95">
          {isAr ? "لا يوجد برنامج لهذا اليوم." : "Pas de programme pour cette journée."}
        </p>
      </div>
    );
  }

  const remaining = program.startAt.getTime() - now;
  const inProgress = remaining < 0;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="rounded-2xl bg-irrigation-blue p-4 text-irrigation-blue-foreground shadow-sm"
    >
      <div className="flex items-center gap-2 text-sm font-medium opacity-90">
        <Droplet className="h-4 w-4" />
        <span>
          {inProgress
            ? isAr ? "الري جارٍ حالياً" : "Arrosage en cours"
            : isAr ? "الري القادم" : "Prochain arrosage"}
        </span>
      </div>
      <div className="mt-3 space-y-1.5" suppressHydrationWarning>
        <div className="text-xs opacity-80">{isAr ? "القطعة" : "Parcelle"}</div>
        <div className="text-lg font-semibold leading-tight">{parcelName}</div>
        <div dir="ltr" className="font-mono text-2xl font-bold tabular-nums tracking-tight">
          {inProgress ? "00:00:00" : formatCountdown(remaining)}
        </div>
        <div className="flex justify-between text-xs opacity-90">
          <span>
            {isAr ? "البداية" : "Début"}{" "}
            <span dir="ltr">
              {program.startAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
          <span>
            {isAr ? "المدة" : "Durée"}{" "}
            <span dir="ltr">
              {program.duration}
              {program.duration && !/min|h/.test(program.duration) ? (isAr ? " د" : " min") : ""}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
