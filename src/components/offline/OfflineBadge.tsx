import { useEffect, useState } from "react";
import { Wifi, WifiOff, CloudOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/lib/offline/network";
import { getStats, subscribeStats, scheduleSync, type OutboxStats } from "@/lib/offline/sync-engine";
import { cn } from "@/lib/utils";

export function OfflineBadge({ className }: { className?: string }) {
  const status = useNetworkStatus();
  const [stats, setStats] = useState<OutboxStats>({
    pending: 0,
    processing: 0,
    error: 0,
    photos_pending: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const s = await getStats();
      if (!cancelled) setStats(s);
    };
    void refresh();
    const unsub = subscribeStats(refresh);
    const t = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      unsub();
      clearInterval(t);
    };
  }, []);

  const totalPending = stats.pending + stats.processing + stats.photos_pending;
  const hasErrors = stats.error > 0;

  if (status === "online" && totalPending === 0 && !hasErrors) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400",
          className,
        )}
        title="En ligne — toutes les données sont synchronisées"
      >
        <Wifi className="h-3 w-3" />
        En ligne
      </span>
    );
  }

  if (status === "offline") {
    return (
      <button
        type="button"
        onClick={() => scheduleSync(0)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:text-orange-400",
          className,
        )}
        title="Hors ligne — vos actions seront envoyées au retour du réseau"
      >
        <WifiOff className="h-3 w-3" />
        Hors ligne{totalPending > 0 ? ` (${totalPending})` : ""}
      </button>
    );
  }

  // Online with pending or errors
  return (
    <button
      type="button"
      onClick={() => scheduleSync(0)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400",
        hasErrors && "bg-red-500/15 text-red-700 dark:text-red-400",
        className,
      )}
      title={hasErrors ? "Erreurs de synchronisation — touchez pour réessayer" : "Synchronisation en cours…"}
    >
      {hasErrors ? <CloudOff className="h-3 w-3" /> : <RefreshCw className="h-3 w-3 animate-spin" />}
      {hasErrors ? `${stats.error} erreur${stats.error > 1 ? "s" : ""}` : `Synchro… (${totalPending})`}
    </button>
  );
}
