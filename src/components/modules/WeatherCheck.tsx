import { useState } from "react";
import { CloudSun, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { diagnoseWindForDate, type WindDiag } from "@/lib/weather-forecast";

export function WeatherCheck({
  date,
  onValidated,
}: {
  date: string;
  onValidated: (diag: WindDiag | { manual: true }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [diag, setDiag] = useState<WindDiag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validatedManual, setValidatedManual] = useState(false);

  async function check() {
    if (!date) {
      setError("Choisissez une date d'abord.");
      return;
    }
    setLoading(true);
    setError(null);
    setValidatedManual(false);
    const d = await diagnoseWindForDate(date);
    setLoading(false);
    if (!d) {
      setError("Impossible de récupérer la prévision météo.");
      return;
    }
    setDiag(d);
    if (d.ok) onValidated(d);
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CloudSun className="h-4 w-4" /> Diagnostic météo
        </div>
        <button
          type="button"
          onClick={check}
          disabled={loading || !date}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Vérifier"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {diag && (
        <div
          className={`mt-2 flex items-start gap-2 rounded-md p-2 text-xs ${
            diag.ok
              ? "bg-olive-mid/10 text-olive-dark"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {diag.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div className="flex-1">
            <div className="font-semibold">{diag.label}</div>
            <div>
              Vent : {diag.windKmh} km/h ({diag.windMs.toFixed(1)} m/s) — prévision pour {diag.forecastDate}
            </div>
            {!diag.ok && !validatedManual && (
              <button
                type="button"
                onClick={() => {
                  setValidatedManual(true);
                  onValidated({ manual: true });
                }}
                className="mt-2 rounded-md border border-destructive bg-card px-2 py-1 font-medium text-destructive hover:bg-destructive/10"
              >
                Valider quand même
              </button>
            )}
            {!diag.ok && validatedManual && <div className="mt-1 italic">Validation manuelle enregistrée.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
