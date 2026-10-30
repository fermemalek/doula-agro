import { useNavigate, Link } from "@/lib/router-compat";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sprout, AlertCircle, Eye, EyeOff } from "lucide-react";

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
  const hex = (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(8, "0");
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
          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
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
            <Label htmlFor="password">Mot de passe</Label>
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
