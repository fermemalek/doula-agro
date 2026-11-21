import { useEffect, useState } from "react";
import { Clock, Droplets, Droplet, CheckCircle2, Calendar, X, AlertTriangle, PackageCheck, Sunrise, Sunset } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { RecoStockStatus } from "@/lib/stock-alerts";

export interface OrderScheduleConfirmation {
  customStartHour: string;          // HH:MM (ex: "06:30", "07:00", "15:00")
  customFertIrrigationTime: string; // ex: "1h30", "1h00", "2h00"
  customPureIrrigationTime: string; // ex: "0h", "1h30", "2h30"
}

export interface OrderStockSummary {
  status: RecoStockStatus;
  missingLabels: string[];
  lowLabels: string[];
}

export interface OrderBacDetail {
  bac: string;
  products: string[];
}

interface ValidateOrderScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  operationLabel?: string;
  stockSummary?: OrderStockSummary;
  bacDetails?: OrderBacDetail[];
  mode: "execute" | "plan";
  defaultStartHour: string;
  defaultFertIrrigationTime: string;
  defaultPureIrrigationTime: string;
  sunriseStr?: string;
  sunsetStr?: string;
  solarDateLabel?: string;
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
  stockSummary,
  bacDetails,
  mode,
  defaultStartHour,
  defaultFertIrrigationTime,
  defaultPureIrrigationTime,
  sunriseStr,
  sunsetStr,
  solarDateLabel,
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

          {/* Bacs concernés pour les programmes de fertilisation */}
          {bacDetails && bacDetails.length > 0 && (
            <div className="rounded-xl bg-muted/40 border border-border px-3 py-2 text-xs space-y-1.5">
              <div className="font-black text-foreground flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Bacs concernés ({bacDetails.map((b) => `Bac ${b.bac}`).join(" · ")})</span>
              </div>
              <div className="space-y-1">
                {bacDetails.map((b) => {
                  const tone =
                    b.bac === "A"
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300"
                      : b.bac === "B"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                        : b.bac === "C"
                          ? "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300"
                          : "bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300";
                  return (
                    <div key={b.bac} className="flex items-start gap-1.5 text-[11px]">
                      <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase ${tone}`}>
                        Bac {b.bac}
                      </span>
                      <span className="text-muted-foreground leading-snug pt-0.5">
                        {b.products.join(", ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Indicateur d'approvisionnement (Rouge = Achat requis | Orange = Stock min. | Vert = Dispo) */}
          {stockSummary && (
            <div
              className={`rounded-xl border px-3 py-2 text-xs space-y-1 ${
                stockSummary.status === "missing"
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300"
                  : stockSummary.status === "low"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-300"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <div className="font-black flex items-center gap-1.5">
                {stockSummary.status === "missing" ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Achat requis — Approvisionnement nécessaire</span>
                  </>
                ) : stockSummary.status === "low" ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Disponible — Stock au minimum</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>Stock disponible — Aucun achat requis</span>
                  </>
                )}
              </div>
              {stockSummary.missingLabels.length > 0 && (
                <p className="text-[11px] font-medium leading-snug">
                  Manquant : {stockSummary.missingLabels.join(", ")}
                </p>
              )}
              {stockSummary.missingLabels.length === 0 && stockSummary.lowLabels.length > 0 && (
                <p className="text-[11px] font-medium leading-snug">
                  Stock minimum : {stockSummary.lowLabels.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* 1. Heure de commencement du planning */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Heure de commencement du planning</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                required
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="flex-1 min-w-[120px] rounded-xl border bg-background px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {(sunriseStr || sunsetStr) && (
                <div
                  className="flex items-center gap-1.5"
                  title={solarDateLabel ? `Horaires solaires Benhar (${solarDateLabel})` : "Horaires solaires Benhar"}
                >
                  {sunriseStr && (
                    <button
                      type="button"
                      onClick={() => setStartHour(sunriseStr.replace("h", ":"))}
                      title="Cliquer pour démarrer au lever du soleil"
                      className="inline-flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-2 text-[11px] font-bold text-amber-800 dark:text-amber-300 transition cursor-pointer"
                    >
                      <Sunrise className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Lever {sunriseStr}</span>
                    </button>
                  )}
                  {sunsetStr && (
                    <button
                      type="button"
                      onClick={() => setStartHour(sunsetStr.replace("h", ":"))}
                      title="Heure du coucher du soleil à Benhar"
                      className="inline-flex items-center gap-1 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-2 text-[11px] font-bold text-orange-800 dark:text-orange-300 transition cursor-pointer"
                    >
                      <Sunset className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <span>Coucher {sunsetStr}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Applicable à cette ordonnance (Fertigation, Pulvérisation foliaire ou Traitement phytosanitaire){solarDateLabel ? ` · Soleil Benhar (${solarDateLabel})` : ""}.
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
