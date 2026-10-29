import { useNavigate, Link } from "@/lib/router-compat";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sprout, AlertCircle } from "lucide-react";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const resolvedEmail = email.includes("@") ? email.trim() : `${email.trim()}@doulaagro.local`;
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
          // Try direct sign-in (auto-confirm enabled)
          const { error: e2 } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
          if (e2) throw e2;
        }
        toast.success("Compte créé. Bienvenue !");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
        if (error) throw error;
      }
      const cfgRaw = typeof window !== "undefined" ? localStorage.getItem("doula-config") : null;
      const configured = cfgRaw ? !!JSON.parse(cfgRaw)?.configured : false;
      navigate({ to: configured ? "/" : "/configuration" });
    } catch (err: any) {
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
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
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

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">Retour à l'accueil</Link>
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
