import { Link, useNavigate } from "@/lib/router-compat";
import { useState } from "react";
import { LogOut, Settings, User as UserIcon, HardHat, Shield, Trash2, RotateCcw, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/lib/role";
import { useDisplayRole } from "@/lib/display-role";
import { resetFarmData } from "@/lib/cloud/admin-reset";
import { offlineDB } from "@/lib/offline/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function ProfilPage() {
  const { session, signOut } = useRole();
  const navigate = useNavigate();
  const role = useDisplayRole();
  const email = session?.user?.email ?? "";
  const name = (session?.user?.user_metadata?.full_name as string) || email;

  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const doReset = async () => {
    setResetting(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        toast.error("Session expirée. Reconnectez-vous.");
        setResetting(false);
        return;
      }
      const res: any = await resetFarmData();
      if (!res?.ok) {
        toast.error(res?.error || "Échec de la réinitialisation");
        setResetting(false);
        return;
      }
      try {
        localStorage.removeItem("doula-modules");
        localStorage.removeItem("doula-anomalies");
        localStorage.removeItem("doula-alerts");
        localStorage.removeItem("doula-ops");
        localStorage.removeItem("doula-reminders");
        
        const { resetAllConsumedQuantities } = await import("@/lib/suppliers-store");
        resetAllConsumedQuantities();
      } catch {}
      toast.success("Application réinitialisée");
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      toast.error(e?.message || "Échec de la réinitialisation");
      setResetting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <h1 className="mb-3 text-xl font-bold">Profil</h1>

      <section className="mb-4 flex items-center gap-3 rounded-2xl border bg-card p-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserIcon className="h-7 w-7" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
          {role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <HardHat className="h-3.5 w-3.5" />}
          {role === "admin" ? "Admin" : "Exécutant"}
        </span>
      </section>

      <ul className="space-y-2">
        <li>
          <Link
            to="/configuration"
            className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-4 active:scale-95"
          >
            <Settings className="h-5 w-5" />
            <span className="font-semibold">Configuration (apparence, langue)</span>
          </Link>
        </li>
        <li>
          <Link
            to="/donnees-en-attente"
            className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-4 active:scale-95"
          >
            <CloudOff className="h-5 w-5" />
            <span className="font-semibold">Données en attente & conflits</span>
          </Link>
        </li>
        {role === "admin" && (
          <li>
            <Link
              to="/utilisateurs"
              className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-4 active:scale-95"
            >
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">Gestion des utilisateurs</span>
            </Link>
          </li>
        )}
        <li>
          <button
            onClick={async () => {
              if (!confirm("Effacer tout l'historique local (pulvérisation, phytosanitaire, irrigation, fertilisation, récolte, anomalies) ? Cette action est irréversible.")) return;
              try {
                // Remove all local storage items starting with doula-
                Object.keys(localStorage).forEach((key) => {
                  if (key.startsWith("doula-")) {
                    localStorage.removeItem(key);
                  }
                });
                
                // Clear IndexedDB offline queue
                await offlineDB.outbox.clear();
                await offlineDB.photos_outbox.clear();
                await offlineDB.conflict_log.clear();

                toast.success("Historique local effacé");
                setTimeout(() => window.location.reload(), 600);
              } catch (err) {
                console.error(err);
                toast.error("Impossible d'effacer l'historique");
              }
            }}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive active:scale-95"
          >
            <Trash2 className="h-5 w-5" />
            <span className="font-semibold">Effacer tout l'historique (local)</span>
          </button>
        </li>
        {role === "admin" && (
          <li>
            <button
              onClick={() => {
                setConfirmText("");
                setResetOpen(true);
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-destructive/60 bg-destructive/15 p-4 text-destructive active:scale-95"
            >
              <RotateCcw className="h-5 w-5" />
              <span className="font-semibold text-left">
                Réinitialiser l'application
                <span className="block text-xs font-normal opacity-80">
                  Supprime programmes, anomalies et recommandations
                </span>
              </span>
            </button>
          </li>
        )}
        <li>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive active:scale-95"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-semibold">Se déconnecter</span>
          </button>
        </li>
      </ul>

      <Dialog open={resetOpen} onOpenChange={(o) => !resetting && setResetOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser l'application</DialogTitle>
            <DialogDescription>
              Cette action supprime <strong>définitivement</strong> tous les programmes
              (plan parcelle, pulvérisation, phytosanitaire, irrigation, fertilisation,
              récolte), toutes les anomalies, toutes les tâches exécutants et toutes
              les recommandations. Les parcelles, arbres et utilisateurs sont conservés.
              <br /><br />
              Pour confirmer, tapez <strong>RÉINITIALISER</strong> ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RÉINITIALISER"
            disabled={resetting}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={doReset}
              disabled={confirmText.trim() !== "RÉINITIALISER" || resetting}
            >
              {resetting ? "Réinitialisation…" : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default ProfilPage;
