import { useNavigate } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, HardHat, FlaskConical, Settings as SettingsIcon, Image as ImageIcon, RotateCcw } from "lucide-react";
import { useRole } from "@/lib/role";
import { saveConfig, getConfig, type ConfigRole } from "@/lib/config-store";
import { resetFarmData } from "@/lib/cloud/admin-reset";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRESET_COLORS = [
  { name: "Vert nature", value: "#dcfce7" },
  { name: "Bleu ciel", value: "#dbeafe" },
  { name: "Sable", value: "#fef3c7" },
  { name: "Lavande", value: "#ede9fe" },
  { name: "Rose pâle", value: "#fce7f3" },
  { name: "Aucun", value: "" },
];

function ConfigPage() {
  const navigate = useNavigate();
  const { session, loading, isAdmin } = useRole();
  const cfg = getConfig();
  const [role, setRole] = useState<ConfigRole>(cfg.role);
  const [bgColor, setBgColor] = useState(cfg.bgColor);
  const [bgImage, setBgImage] = useState(cfg.bgImage);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const doReset = async () => {
    setResetting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        toast.error("Session expirée. Reconnectez-vous.");
        setResetting(false);
        return;
      }
      const res = await resetFarmData();
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
      const msg = e instanceof Response ? `Erreur serveur (${e.status})` : e?.message;
      toast.error(msg || "Échec de la réinitialisation");
      setResetting(false);
    }
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 2 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBgImage(reader.result as string);
      setBgColor("");
    };
    reader.readAsDataURL(f);
  }

  function onValidate() {
    saveConfig({ role, bgColor, bgImage, configured: true });
    toast.success("Configuration enregistrée");
    navigate({ to: "/" });
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="text-center space-y-1">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Configuration</h1>
          <p className="text-sm text-muted-foreground">Choisissez votre profil et l'arrière-plan de l'application.</p>
        </header>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Type d'utilisateur</h2>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { v: "admin" as const, label: "Administrateur", icon: Shield },
                { v: "executant" as const, label: "Exécutant", icon: HardHat },
                { v: "ingenieur" as const, label: "Ingénieur", icon: FlaskConical },
              ]
            ).map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setRole(v)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  role === v
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Icon className={`h-7 w-7 ${role === v ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Arrière-plan</h2>
          <div>
            <Label className="text-sm">Couleur</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value || "none"}
                  type="button"
                  onClick={() => {
                    setBgColor(c.value);
                    setBgImage("");
                  }}
                  className={`h-9 min-w-9 rounded-full border-2 px-3 text-xs font-medium ${
                    bgColor === c.value && !bgImage ? "border-primary" : "border-border"
                  }`}
                  style={{ background: c.value || "transparent" }}
                  title={c.name}
                >
                  {!c.value && "Aucun"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bgImage" className="text-sm flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" /> Photo (optionnel)
            </Label>
            <Input id="bgImage" type="file" accept="image/*" onChange={onPickImage} />
            {bgImage && (
              <div className="mt-2 h-24 w-full rounded-md border bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }} />
            )}
          </div>
        </Card>

        <Button className="w-full" size="lg" onClick={onValidate}>
          Valider et continuer
        </Button>

        {isAdmin && (
          <Card className="p-5 space-y-3 border-destructive/40">
            <h2 className="font-semibold text-destructive">Zone admin</h2>
            <p className="text-xs text-muted-foreground">
              Réinitialise toute l'application : programmes (plan, pulvérisation, phytosanitaire, irrigation), anomalies et recommandations envoyées par l'ingénieur et les exécutants.
            </p>
            <button
              type="button"
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
          </Card>
        )}
      </div>

      <Dialog open={resetOpen} onOpenChange={(o) => !resetting && setResetOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser l'application</DialogTitle>
            <DialogDescription>
              Cette action supprime définitivement tous les programmes, anomalies et recommandations. Tapez <strong>OK</strong> pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="OK"
            disabled={resetting}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText.trim().toUpperCase() !== "OK" || resetting}
              onClick={doReset}
            >
              {resetting ? "Réinitialisation…" : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default ConfigPage;
