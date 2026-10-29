import { useEffect, useState } from "react";
import { offlineDB, type OutboxEntry, type PhotoOutboxEntry, type ConflictLogEntry } from "@/lib/offline/db";
import { scheduleSync, runSync } from "@/lib/offline/sync-engine";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";

export default function DonneesEnAttente() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [photos, setPhotos] = useState<PhotoOutboxEntry[]>([]);
  const [conflicts, setConflicts] = useState<ConflictLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const [e, p, c] = await Promise.all([
      offlineDB.outbox.orderBy("created_at").reverse().toArray(),
      offlineDB.photos_outbox.orderBy("created_at").reverse().toArray(),
      offlineDB.conflict_log.orderBy("created_at").reverse().limit(50).toArray(),
    ]);
    setEntries(e);
    setPhotos(p);
    setConflicts(c);
  };

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, []);

  const retryAll = async () => {
    setLoading(true);
    const now = Date.now();
    await offlineDB.outbox
      .where("status")
      .anyOf(["pending", "error"])
      .modify({ next_retry_at: now, attempts: 0, last_error: null });
    await offlineDB.photos_outbox
      .where("status")
      .anyOf(["pending", "error"])
      .modify({ next_retry_at: now, attempts: 0, last_error: null });
    scheduleSync(0);
    await runSync();
    await refresh();
    setLoading(false);
    toast.success("Synchronisation lancée");
  };

  const deleteEntry = async (clientId: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette action de la file d'attente ? Cette modification sera perdue.")) {
      await offlineDB.outbox.delete(clientId);
      await refresh();
      toast.success("Action supprimée de la file d'attente");
    }
  };

  const deletePhoto = async (clientId: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette photo de la file d'attente ?")) {
      await offlineDB.photos_outbox.delete(clientId);
      await refresh();
      toast.success("Photo supprimée de la file d'attente");
    }
  };

  const clearAllQueue = async () => {
    if (
      confirm(
        "Voulez-vous vraiment vider TOUTES les actions et photos en attente ? Ces modifications locales non synchronisées seront définitivement perdues."
      )
    ) {
      await offlineDB.outbox.clear();
      await offlineDB.photos_outbox.clear();
      await refresh();
      toast.success("File d'attente de synchronisation vidée");
    }
  };

  const totalPhotosBytes = photos.reduce((sum, p) => sum + (p.blob?.size ?? 0), 0);

  return (
    <div className="container mx-auto max-w-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/profil" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Données en attente</h1>
      </div>

      <div className="rounded-lg border p-3 bg-card space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <div><strong>{entries.length}</strong> action{entries.length > 1 ? "s" : ""} en attente</div>
            <div><strong>{photos.length}</strong> photo{photos.length > 1 ? "s" : ""} • {(totalPhotosBytes / 1024 / 1024).toFixed(1)} Mo</div>
            <div><strong>{conflicts.length}</strong> conflit{conflicts.length > 1 ? "s" : ""} récents</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {(entries.length > 0 || photos.length > 0) && (
              <Button onClick={clearAllQueue} variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
                <Trash2 className="h-4 w-4 mr-1" />
                Vider la file
              </Button>
            )}
            <Button onClick={retryAll} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Tout retenter
            </Button>
          </div>
        </div>
        {totalPhotosBytes > 200 * 1024 * 1024 && (
          <p className="mt-2 text-xs text-orange-600">
            ⚠️ Plus de 200 Mo de photos en attente. Connectez-vous au réseau dès que possible.
          </p>
        )}
      </div>

      {entries.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2">Actions ({entries.length})</h2>
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.client_id} className="rounded-md border p-2 text-xs bg-card">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-medium">{e.op}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        e.status === "error" ? "bg-red-500/15 text-red-700" :
                        e.status === "processing" ? "bg-blue-500/15 text-blue-700" :
                        "bg-orange-500/15 text-orange-700"
                      }`}>{e.status}</span>
                    </div>
                    <div className="text-muted-foreground mt-1 text-[11px]">
                      Table : {e.table} {e.record_id && `• ID : ${e.record_id}`}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px]">
                      Tentatives : {e.attempts} • {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                    onClick={() => deleteEntry(e.client_id)}
                    title="Supprimer cette action"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {e.last_error && (
                  <div className="text-red-600 mt-1 bg-red-500/5 p-1 rounded font-mono text-[10px] overflow-x-auto whitespace-pre-wrap max-h-24">
                    {e.last_error}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {photos.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2">Photos ({photos.length})</h2>
          <ul className="space-y-2">
            {photos.map((p) => (
              <li key={p.client_id} className="rounded-md border p-2 text-xs bg-card">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold truncate">{p.filename}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        p.status === "error" ? "bg-red-500/15 text-red-700" :
                        p.status === "processing" ? "bg-blue-500/15 text-blue-700" :
                        "bg-orange-500/15 text-orange-700"
                      }`}>{p.status}</span>
                    </div>
                    <div className="text-muted-foreground mt-1 text-[11px]">
                      Bucket : {p.bucket} • Chemin : {p.path}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px]">
                      Taille : {(p.blob?.size / 1024).toFixed(1)} Ko • Tentatives : {p.attempts}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                    onClick={() => deletePhoto(p.client_id)}
                    title="Supprimer cette photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {p.last_error && (
                  <div className="text-red-600 mt-1 bg-red-500/5 p-1 rounded font-mono text-[10px] overflow-x-auto whitespace-pre-wrap max-h-24">
                    {p.last_error}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {conflicts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2">Conflits récents ({conflicts.length})</h2>
          <ul className="space-y-2">
            {conflicts.map((c) => (
              <li key={c.id} className="rounded-md border p-2 text-xs bg-card">
                <div className="flex justify-between">
                  <span className="font-medium">{c.table}</span>
                  <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <div className="text-muted-foreground mt-1 truncate">
                  Enregistrement : {c.record_id}
                </div>
                <div className="text-orange-700 mt-1">
                  Une version plus récente du serveur a été remplacée.
                </div>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={async () => {
              await offlineDB.conflict_log.clear();
              await refresh();
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Vider le journal local
          </Button>
        </section>
      )}

      {entries.length === 0 && photos.length === 0 && conflicts.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          ✓ Tout est synchronisé.
        </p>
      )}
    </div>
  );
}
