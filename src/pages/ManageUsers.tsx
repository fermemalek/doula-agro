import { useNavigate } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Shield,
  HardHat,
  FlaskConical,
  ArrowLeft,
  UserPlus,
  Edit2,
  Loader2,
  CheckCircle,
  Trash2,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/lib/role";
import { buildAuthAlias } from "@/pages/Login";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Client temporaire dédié à la création d'utilisateurs sans affecter la session actuelle de l'administrateur.
const tempClient = createClient(SUPABASE_URL || "", SUPABASE_PUBLISHABLE_KEY || "", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

interface UserItem {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  role: "admin" | "executant" | "ingenieur";
  createdAt: string;
}

export default function ManageUsers() {
  const navigate = useNavigate();
  const { session, loading, isAdmin } = useRole();

  // Formulaire d'ajout
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "executant" | "ingenieur">("executant");
  const [creating, setCreating] = useState(false);

  // Liste des utilisateurs
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Dialogue d'édition
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [editRole, setEditRole] = useState<"admin" | "executant" | "ingenieur">("executant");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!session || !isAdmin) {
        toast.error("Accès refusé. Vous devez être administrateur.");
        navigate({ to: "/" });
      } else {
        fetchUsers();
      }
    }
  }, [session, loading, isAdmin, navigate]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // 1. Récupérer tous les profils publics
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      // 2. Récupérer tous les rôles associés
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("*");
      if (rErr) throw rErr;

      // Nettoyer automatiquement les rôles orphelins (ex: "Sans nom (ingenieur)" sans profil)
      const validProfileIds = new Set((profiles ?? []).map((p) => p.id));
      const orphanUserIds = (roles ?? [])
        .map((r) => r.user_id)
        .filter((uid) => !validProfileIds.has(uid));
      if (orphanUserIds.length > 0) {
        await supabase.from("user_roles").delete().in("user_id", orphanUserIds);
      }

      // Organiser les rôles par ID utilisateur
      const roleMap: Record<string, "admin" | "executant" | "ingenieur"> = {};
      roles?.forEach((r) => {
        if (validProfileIds.has(r.user_id)) {
          roleMap[r.user_id] = r.role as any;
        }
      });

      // Fusionner les données
      const combined: UserItem[] = (profiles ?? []).map((p) => {
        const phoneRaw = p.phone || "";
        const parts = phoneRaw.split("|");
        return {
          id: p.id,
          fullName: p.full_name || "Utilisateur sans nom",
          username: parts[0] || "Non spécifié",
          phone: parts[1] || "",
          role: roleMap[p.id] || "executant",
          createdAt: p.created_at,
        };
      });

      setUsersList(combined);
    } catch (err: any) {
      console.error("[ManageUsers] fetchUsers error:", err);
      toast.error("Impossible de récupérer la liste des utilisateurs: " + err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    if (!username.trim() || !fullName.trim() || !password.trim()) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    
    // Vérifier les doublons de nom d'utilisateur en local
    const exists = usersList.some(u => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      toast.error("Ce nom d'utilisateur est déjà pris.");
      return;
    }

    setCreating(true);
    try {
      // Si l'identifiant contient déjà un '@', on l'utilise tel quel comme email.
      const mappedEmail = cleanUsername.includes("@") 
        ? cleanUsername 
        : `${cleanUsername}@doulaagro.local`;

      // 1. Inscrire l'utilisateur via le client temporaire
      const { data: authData, error: authErr } = await tempClient.auth.signUp({
        email: mappedEmail,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authErr) throw authErr;
      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error("Erreur lors de la récupération de l'ID utilisateur.");

      // Petite pause pour laisser les triggers de base de données s'exécuter
      await new Promise(resolve => setTimeout(resolve, 800));

      // 2. Mettre à jour ou insérer le rôle choisi
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", newUserId);

      if (existingRoles && existingRoles.length > 0) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .update({ role: selectedRole })
          .eq("user_id", newUserId);
        if (roleErr) throw roleErr;
      } else {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: newUserId, role: selectedRole });
        if (roleErr) throw roleErr;
      }

      // 3. Mettre à jour le profil pour enregistrer le nom d'utilisateur (dans phone) et le nom complet
      const combinedPhoneVal = phone.trim() ? `${cleanUsername}|${phone.trim()}` : cleanUsername;
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: combinedPhoneVal,
        })
        .eq("id", newUserId);
      if (profileErr) throw profileErr;

      toast.success(`L'utilisateur "${fullName}" a été créé avec succès.`);
      
      // Réinitialiser les champs
      setUsername("");
      setFullName("");
      setPhone("");
      setPassword("");
      setSelectedRole("executant");
      
      // Recharger la liste
      fetchUsers();
    } catch (err: any) {
      toast.error("Erreur de création: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditUsername(user.username);
    setEditPhone(user.phone);
    setEditPassword("");
    setShowEditPwd(false);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editFullName.trim()) {
      toast.error("Le nom complet ne peut pas être vide.");
      return;
    }
    if (!editUsername.trim()) {
      toast.error("Le nom d'utilisateur ne peut pas être vide.");
      return;
    }
    if (editPassword.trim() && editPassword.trim().length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setSavingEdit(true);
    try {
      const cleanEditUser = editUsername.trim().toLowerCase();
      const combinedPhoneVal = editPhone.trim()
        ? `${cleanEditUser}|${editPhone.trim()}`
        : cleanEditUser;

      let targetUserId = editingUser.id;
      const newPwd = editPassword.trim();

      // Si un nouveau mot de passe est saisi :
      if (newPwd) {
        // Cas 1 : l'administrateur modifie son propre mot de passe
        if (editingUser.id === session?.user?.id) {
          const { error: selfPwdErr } = await supabase.auth.updateUser({
            password: newPwd,
          });
          if (selfPwdErr) {
            console.warn("[ManageUsers] updateUser self password:", selfPwdErr.message);
          }
        }

        // Cas 2 : synchroniser un alias d'authentification déterministe pour permettre
        // à ce membre (Exécutant, Ingénieur ou Admin) de se connecter avec ce nouveau mot de passe
        const aliasEmail = buildAuthAlias(cleanEditUser, newPwd);
        let syncedId: string | null = null;

        const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
          email: aliasEmail,
          password: newPwd,
          options: {
            data: { full_name: editFullName.trim() },
          },
        });

        if (!signUpErr && signUpData?.user?.id) {
          syncedId = signUpData.user.id;
        } else {
          // Si l'alias existe déjà avec ce mot de passe, récupérer son ID
          const { data: signInData } = await tempClient.auth.signInWithPassword({
            email: aliasEmail,
            password: newPwd,
          });
          if (signInData?.user?.id) {
            syncedId = signInData.user.id;
          }
        }

        // Si un nouvel ID a été créé pour un autre utilisateur, transférer ses tâches/rôles/profil
        if (syncedId && syncedId !== editingUser.id && editingUser.id !== session?.user?.id) {
          await new Promise((r) => setTimeout(r, 700));
          targetUserId = syncedId;

          // Transférer les tâches, programmes et alertes assignés à l'ancien ID
          await supabase.from("tasks").update({ assigned_to: targetUserId }).eq("assigned_to", editingUser.id);
          await supabase.from("module_records").update({ assigned_to: targetUserId }).eq("assigned_to", editingUser.id);
          await supabase.from("alerts").update({ assigned_to: targetUserId }).eq("assigned_to", editingUser.id);

          // Supprimer l'ancien rôle et l'ancien profil pour éviter tout doublon dans la liste
          await supabase.from("user_roles").delete().eq("user_id", editingUser.id);
          await supabase.from("profiles").delete().eq("id", editingUser.id);
        }
      }

      // 1. Mettre à jour le rôle sur targetUserId
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", targetUserId);

      if (existingRoles && existingRoles.length > 0) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .update({ role: editRole })
          .eq("user_id", targetUserId);
        if (roleErr) throw roleErr;
      } else {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: targetUserId, role: editRole });
        if (roleErr) throw roleErr;
      }

      // 2. Mettre à jour le nom complet, le nom d'utilisateur et le téléphone
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          phone: combinedPhoneVal,
        })
        .eq("id", targetUserId);
      if (profileErr) throw profileErr;

      toast.success(
        newPwd
          ? `Profil et nouveau mot de passe enregistrés pour "${editFullName.trim()}" !`
          : "Modifications enregistrées.",
      );
      setEditingUser(null);
      setEditPassword("");
      fetchUsers();
    } catch (err: any) {
      toast.error("Erreur de modification: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === session?.user?.id) {
      toast.error("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }
    
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible et supprimera le rôle et le profil de l'utilisateur.")) {
      return;
    }

    try {
      // 1. Supprimer le rôle
      const { error: roleErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (roleErr) throw roleErr;

      // 2. Supprimer le profil
      const { error: profileErr } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (profileErr) throw profileErr;

      toast.success("Utilisateur supprimé avec succès.");
      fetchUsers();
    } catch (err: any) {
      console.error("[ManageUsers] handleDeleteUser error:", err);
      toast.error("Erreur lors de la suppression: " + err.message);
    }
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950 px-2 py-0.5 text-xs font-semibold text-red-800 dark:text-red-300">
            <Shield className="h-3 w-3" /> Admin
          </span>
        );
      case "ingenieur":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950 px-2 py-0.5 text-xs font-semibold text-purple-800 dark:text-purple-300">
            <FlaskConical className="h-3 w-3" /> Ingénieur
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <HardHat className="h-3 w-3" /> Exécutant
          </span>
        );
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/profil" })} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-xs text-muted-foreground">Créez et configurez les rôles d'accès pour votre ferme.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Colonne gauche : Formulaire de création */}
        <div className="md:col-span-2 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <UserPlus className="h-5 w-5" />
              <h2>Ajouter un utilisateur</h2>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="username">Nom d'utilisateur (Username)</Label>
                <Input
                  id="username"
                  placeholder="Ex: jean"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
                  required
                  disabled={creating}
                />
                <p className="text-[10px] text-muted-foreground">Servira d'identifiant unique à la connexion.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="fullName">Nom Complet</Label>
                <Input
                  id="fullName"
                  placeholder="Ex: Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={creating}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">Numéro de Téléphone (WhatsApp)</Label>
                <Input
                  id="phone"
                  placeholder="Ex: +213 555 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showCreatePwd ? "text" : "password"}
                    placeholder="Min. 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={creating}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showCreatePwd ? "Masquer" : "Afficher"}
                  >
                    {showCreatePwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Rôle attribué</Label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {(
                    [
                      { v: "executant" as const, label: "Exécutant", icon: HardHat },
                      { v: "ingenieur" as const, label: "Ingénieur", icon: FlaskConical },
                      { v: "admin" as const, label: "Administrateur", icon: Shield },
                    ]
                  ).map(({ v, label, icon: Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedRole(v)}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors text-left text-sm ${
                        selectedRole === v
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-border hover:bg-muted"
                      }`}
                      disabled={creating}
                    >
                      <Icon className={`h-4 w-4 ${selectedRole === v ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="flex-1">{label}</span>
                      {selectedRole === v && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours…
                  </>
                ) : (
                  "Ajouter l'utilisateur"
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Colonne droite : Liste des utilisateurs existants */}
        <div className="md:col-span-3">
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Membres de la ferme ({usersList.length})</h2>

            {loadingUsers ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs">Chargement des comptes…</p>
              </div>
            ) : usersList.length === 0 ? (
              <p className="text-sm text-center py-8 text-muted-foreground">Aucun utilisateur enregistré.</p>
            ) : (
              <div className="divide-y space-y-1.5">
                {usersList.map((user) => (
                  <div key={user.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{user.fullName}</span>
                        {renderRoleBadge(user.role)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        Username: <span className="font-medium text-foreground mr-2">{user.username}</span>
                        {user.phone && (
                          <> · Tél: <span className="font-medium text-foreground">{user.phone}</span></>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Modifier
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Boîte de dialogue d'édition */}
      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez le rôle ou le nom de l'utilisateur.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="editUsername">Nom d'utilisateur (Identifiant)</Label>
                <Input
                  id="editUsername"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, ""))}
                  required
                />
                <p className="text-[10px] text-muted-foreground">Nom d'utilisateur unique utilisé pour la connexion.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPhone">Numéro de Téléphone (WhatsApp)</Label>
                <Input
                  id="editPhone"
                  placeholder="Ex: +213 555 123 456"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editFullName">Nom Complet</Label>
                <Input
                  id="editFullName"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPassword" className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Nouveau mot de passe (optionnel)
                </Label>
                <div className="relative">
                  <Input
                    id="editPassword"
                    type={showEditPwd ? "text" : "password"}
                    placeholder="Laisser vide pour garder le mot de passe actuel"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showEditPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showEditPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Si vous saisissez un nouveau mot de passe (min. 6 caractères), il remplacera l'ancien pour ce compte.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(
                    [
                      { v: "executant" as const, label: "Exécutant" },
                      { v: "ingenieur" as const, label: "Ingénieur" },
                      { v: "admin" as const, label: "Admin" },
                    ]
                  ).map(({ v, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditRole(v)}
                      className={`rounded-lg border p-2 text-center text-xs transition-colors ${
                        editRole === v
                          ? "border-primary bg-primary/5 font-semibold text-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={savingEdit}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement…
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
