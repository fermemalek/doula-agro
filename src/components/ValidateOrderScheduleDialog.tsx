import { useEffect, useState } from "react";
import { Clock, Droplets, Droplet, CheckCircle2, Calendar, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface OrderScheduleConfirmation {
  customStartHour: string;          // HH:MM (ex: "06:30", "07:00", "15:00")
  customFertIrrigationTime: string; // ex: "1h30", "1h00", "2h00"
  customPureIrrigationTime: string; // ex: "0h", "1h30", "2h30"
}

interface ValidateOrderScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  operationLabel?: string;
  mode: "execute" | "plan";
  defaultStartHour: string;
  defaultFertIrrigationTime: string;
  defaultPureIrrigationTime: string;
  loading?: boolean;
  onConfirm: (values: OrderScheduleConfirmation) => void | Promise<void>;
}

const FERT_PRESETS = ["1h00", "1h30", "2h00", "2h30", "3h00"];
const PURE_PRESETS = ["0h", "1h00", "1h30", "2h00", "2h30", "3h00"];

export function ValidateOrderScheduleDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  operationLabel,
  mode,
  defaultStartHour,
  defaultFertIrrigationTime,
  defaultPureIrrigationTime,
  loading = false,
  onConfirm,
}: ValidateOrderScheduleDialogProps) {
  const [startHour, setStartHour] = useState(defaultStartHour || "06:30");
  const [fertTime, setFertTime] = useState(defaultFertIrrigationTime || "1h30");
  const [pureTime, setPureTime] = useState(defaultPureIrrigationTime || "0h");

  useEffect(() => {
    if (open) {
      setStartHour(defaultStartHour || "06:30");
      setFertTime(defaultFertIrrigationTime || "1h30");
      setPureTime(defaultPureIrrigationTime || "0h");
    }
  }, [open, defaultStartHour, defaultFertIrrigationTime, defaultPureIrrigationTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      customStartHour: startHour.trim() || defaultStartHour || "06:30",
      customFertIrrigationTime: fertTime.trim() || defaultFertIrrigationTime || "1h30",
      customPureIrrigationTime: pureTime.trim() || "0h",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <Clock className="h-5 w-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
          {subtitle && (
            <DialogDescription className="text-xs text-muted-foreground">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {operationLabel && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 text-xs font-bold text-primary">
              Opération : {operationLabel}
            </div>
          )}

          {/* 1. Heure de commencement du planning */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Heure de commencement du planning</span>
            </label>
            <input
              type="time"
              required
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Applicable à cette ordonnance (Fertigation, Pulvérisation foliaire ou Traitement phytosanitaire).
            </p>
          </div>

          {/* 2. Temps d'irrigation AVEC fertilisation */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-emerald-600" />
              <span>Temps d&apos;irrigation AVEC fertilisation</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FERT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFertTime(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    fertTime === preset
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-muted/50 text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={fertTime}
              onChange={(e) => setFertTime(e.target.value)}
              placeholder="ex: 1h30, 1h00, 2h00"
              className="w-full rounded-xl border bg-background px-3 py-1.5 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 3. Temps d'irrigation SANS fertilisation (eau claire) */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Droplet className="h-3.5 w-3.5 text-blue-600" />
              <span>Temps d&apos;irrigation SANS fertilisation (eau claire)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PURE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPureTime(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    pureTime === preset
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-muted/50 text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {preset === "0h" ? "0h (Aucune)" : preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={pureTime}
              onChange={(e) => setPureTime(e.target.value)}
              placeholder="ex: 0h, 1h30, 2h30"
              className="w-full rounded-xl border bg-background px-3 py-1.5 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`rounded-xl text-xs font-black text-white ${
                mode === "execute"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {mode === "execute" ? (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Calendar className="h-3.5 w-3.5 mr-1" />
              )}
              {loading
                ? "Validation en cours..."
                : mode === "execute"
                  ? "Confirmer & Exécuter"
                  : "Confirmer & Planifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
