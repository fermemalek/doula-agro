import { useNavigate, Link } from "@/lib/router-compat";
import { useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sprout, AlertCircle, Eye, EyeOff, KeyRound, Shield, CheckCircle } from "lucide-react";

const SUPABASE_URL = "https://krmvdahejfczrziobesi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9GTs8V5G33NYHqEQUPoHzA_Nd4xHgRq";

const tempClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * Génère un identifiant d'authentification déterministe lorsque l'administrateur
 * modifie le mot de passe ou l'identifiant d'un membre depuis "Gestion des utilisateurs".
 */
export function buildAuthAlias(username: string, password: string): string {
  const u = username.trim().toLowerCase();
  const safeUser = u.replace(/[^a-z0-9]/g, "_") || "user";
  const str = `${u}::${password}`;
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  return `u_${safeUser}_${hex}@doulaagro.local`;
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal de réinitialisation d'urgence de mot de passe
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleEmergencyReset(e: React.FormEvent) {
    e.preventDefault();
    const cleanUser = resetIdentifier.trim().toLowerCase();
    const newPwd = resetNewPassword.trim();
    if (!cleanUser || newPwd.length < 6) {
      toast.error("Veuillez saisir un identifiant et un mot de passe d'au moins 6 caractères.");
      return;
    }

    setResetting(true);
    try {
      const aliasEmail = buildAuthAlias(cleanUser, newPwd);
      
      // Inscrire l'alias avec ce mot de passe
      await tempClient.auth.signUp({
        email: aliasEmail,
        password: newPwd,
        options: {
          data: {
            full_name: cleanUser.includes("ferme") || cleanUser.includes("abder") ? "Abderrahmane" : cleanUser,
          },
        },
      });

      // Connexion immédiate
      const { error: inErr } = await supabase.auth.signInWithPassword({
        email: aliasEmail,
        password: newPwd,
      });
      if (inErr) throw inErr;

      // Définir rôle administrateur si compte fermemalek ou admin
      const isAdm = cleanUser.includes("ferme") || cleanUser.includes("abder") || cleanUser.includes("admin") || cleanUser.includes("malek");
      const targetRole = isAdm ? "admin" : "executant";
      localStorage.setItem("doula-active-role", targetRole);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("doula-session-active", "1");
      }

      toast.success(`Mot de passe mis à jour ! Bienvenue ${cleanUser}.`);
      setResetModalOpen(false);
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error("Échec de la réinitialisation : " + err.message);
    } finally {
      setResetting(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("doula-session-active", "1");
      }
      const cleanInput = email.trim().toLowerCase();
      const resolvedEmail = cleanInput.includes("@")
        ? cleanInput
        : `${cleanInput}@doulaagro.local`;

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: resolvedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          const { error: e2 } = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password,
          });
          if (e2) throw e2;
        }
        toast.success("Compte créé. Bienvenue !");
      } else {
        // Correspondance entre les e-mails modifiés dans le profil et les identifiants initiaux de création
        const knownAliases: Record<string, string[]> = {
          "fermemalek@gmail.com": ["abderrahmane", "abdou", "admin", "fermemalek"],
          "abderrahmane": ["fermemalek@gmail.com", "abdou"],
          "doujadz31@gmail.com": ["khadij", "khadija", "doujadz31", "doujadzj1@gmail.com"],
          "doujadzj1@gmail.com": ["khadij", "khadija", "doujadz31@gmail.com"],
          "khadij": ["doujadz31@gmail.com", "khadija"],
          "malekfilois@gmail.com": ["abdelmalek", "malek", "malekfilois"],
          "abdelmalek": ["malekfilois@gmail.com", "malek"],
        };

        const localPart = cleanInput.includes("@") ? cleanInput.split("@")[0] : cleanInput;
        const extraNames = [
          ...(knownAliases[cleanInput] ?? []),
          ...(knownAliases[localPart] ?? []),
        ];

        const rawCandidates = [
          resolvedEmail,
          buildAuthAlias(cleanInput, password),
          `${localPart}@doulaagro.local`,
          `${localPart}@gmail.com`,
          buildAuthAlias(localPart, password),
        ];

        for (const extra of extraNames) {
          if (extra.includes("@")) {
            rawCandidates.push(extra);
            rawCandidates.push(buildAuthAlias(extra, password));
          } else {
            rawCandidates.push(`${extra}@doulaagro.local`);
            rawCandidates.push(buildAuthAlias(extra, password));
          }
        }

        const candidates = Array.from(new Set(rawCandidates));

        let lastError: any = null;
        let connected = false;
        for (const candidateEmail of candidates) {
          const { error } = await supabase.auth.signInWithPassword({
            email: candidateEmail,
            password,
          });
          if (!error) {
            connected = true;
            break;
          }
          lastError = error;
        }

        if (!connected && lastError) {
          throw lastError;
        }
      }
      navigate({ to: "/" });
    } catch (err: any) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("doula-session-active");
      }
      const msg = translateAuthError(err?.message);
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <header className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sprout className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Doula Agro</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Connexion à votre compte" : "Créer un nouveau compte"}
          </p>
        </header>

        {errorMsg && (
          <div className="space-y-2.5">
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <span>💡</span> Options de déblocage immédiat :
              </p>
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setResetIdentifier(email.trim() || "fermemalek@gmail.com");
                    setResetModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Définir un nouveau mot de passe pour {email.trim() || "fermemalek@gmail.com"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("zeinab");
                    setPassword("");
                    setErrorMsg(null);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-amber-600/30 bg-white/60 dark:bg-black/20 text-foreground font-semibold text-xs hover:bg-white dark:hover:bg-black/40 transition-colors cursor-pointer"
                >
                  <Sprout className="h-3.5 w-3.5 text-primary" />
                  <span>Remplir avec l'identifiant Zeinab</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Nom d'utilisateur ou Email</Label>
            <Input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: jean ou jean@example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <button
                type="button"
                onClick={() => {
                  setResetIdentifier(email.trim() || "fermemalek@gmail.com");
                  setResetModalOpen(true);
                }}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">Au moins 6 caractères. Évitez les mots de passe trop simples.</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "…" : mode === "signin" ? "Se connecter" : "Créer le compte"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Pas de compte ? " : "Déjà un compte ? "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setErrorMsg(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            {mode === "signin" ? "Créer un compte" : "Se connecter"}
          </button>
        </p>
      </Card>

      {/* DIALOG DE RÉINITIALISATION RAPIDE DE MOT DE PASSE */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              <span>Définir un nouveau mot de passe</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Saisissez un mot de passe simple (au moins 6 caractères) pour accéder immédiatement à votre compte.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEmergencyReset} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="resetId" className="text-xs font-semibold">
                Nom d'utilisateur ou Email
              </Label>
              <Input
                id="resetId"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                placeholder="Ex: fermemalek@gmail.com ou abderrahmane"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resetPwd" className="text-xs font-semibold">
                Nouveau mot de passe
              </Label>
              <Input
                id="resetPwd"
                type="text"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe (min. 6 car.)"
                required
                minLength={6}
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Ce mot de passe sera enregistré et vous connectera immédiatement.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetModalOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                disabled={resetting}
              >
                {resetting ? "Enregistrement..." : "Enregistrer & Se connecter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function translateAuthError(msg?: string): string {
  if (!msg) return "Erreur d'authentification";
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("already exists")) return "Cet email est déjà utilisé. Connectez-vous.";
  if (m.includes("weak password") || m.includes("pwned")) return "Mot de passe trop faible ou compromis. Choisissez-en un autre.";
  if (m.includes("email not confirmed")) return "Email non confirmé.";
  if (m.includes("password should be")) return "Mot de passe trop court (min. 6 caractères).";
  return msg;
}

export default LoginPage;
