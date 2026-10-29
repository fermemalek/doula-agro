import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { CloudOff, RefreshCw } from "lucide-react";
import { getStats, subscribeStats, type OutboxStats } from "@/lib/offline/sync-engine";
import { useNetworkStatus } from "@/lib/offline/network";

export function PendingBanner() {
  const status = useNetworkStatus();
  const [stats, setStats] = useState<OutboxStats>({
    pending: 0,
    processing: 0,
    error: 0,
    photos_pending: 0,
    failed_retrying: 0,
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

  const total = stats.pending + stats.processing + stats.photos_pending;
  const hasErrors = stats.error > 0 || stats.failed_retrying > 0;
  if (total === 0 && !hasErrors) return null;

  const offline = status === "offline";
  return (
    <Link
      to="/donnees-en-attente"
      className={`mx-auto mb-3 flex max-w-3xl items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
        hasErrors
          ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          : offline
            ? "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300"
            : "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
      }`}
    >
      {hasErrors ? (
        <CloudOff className="h-4 w-4 shrink-0" />
      ) : (
        <RefreshCw className={`h-4 w-4 shrink-0 ${!offline ? "animate-spin" : ""}`} />
      )}
      <span className="flex-1">
        {hasErrors
          ? `${stats.error + stats.failed_retrying} envoi${(stats.error + stats.failed_retrying) > 1 ? "s" : ""} temporairement en échec — touchez pour réessayer`
          : offline
            ? `${total} action${total > 1 ? "s" : ""} en attente — sera envoyé au retour du réseau`
            : `Synchronisation en cours… (${total})`}
      </span>
    </Link>
  );
}
