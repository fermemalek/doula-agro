
## Objectifs

1. Permettre à un utilisateur, après une 1ère connexion en ligne, de continuer à utiliser l'app sans internet pendant longtemps (la session ne doit plus expirer / déconnecter).
2. Retirer les onglets **Irrigation** et **Fertilisation** de la fiche parcelle, et les remplacer par un seul onglet **Programmes** dans la barre du bas, qui regroupe les programmes d'irrigation et fertilisation de toutes les parcelles, avec filtres parcelle + date, consultable par tous et modifiable par admin + ingénieur.

---

## Partie 1 — Session offline persistante

### Comportement attendu
- L'utilisateur se connecte une fois avec internet → sa session est enregistrée localement.
- Tant que l'app n'est pas désinstallée et que l'utilisateur ne se déconnecte pas manuellement, il reste connecté **sans avoir besoin d'internet**.
- Son rôle (admin / ingénieur / exécutant) est aussi mis en cache pour que l'UI affiche les bonnes pages hors ligne.

### Ce qui change techniquement
- Activer la persistance Supabase (`persistSession: true`, `autoRefreshToken: true`, storage = `localStorage`) — déjà partiellement le cas, à vérifier et durcir.
- Mettre en cache le rôle dans `localStorage` dès qu'il est récupéré la 1ère fois en ligne, et le réutiliser hors ligne dans `useRole` / `useDisplayRole`.
- Ne plus rediriger vers `/login` quand on est hors ligne et qu'une session existe localement (même si le refresh token échoue temporairement).
- Bouton "Se déconnecter" inchangé : il purge bien le cache local.

### Limites à communiquer (mentionnées dans le plan, pas dans l'UI)
- Si la session locale est très ancienne (> ~30 jours sans aucune reconnexion) Supabase peut refuser le refresh à la prochaine reconnexion : l'utilisateur devra se reconnecter une fois en ligne.
- Pas de création de compte hors ligne (l'admin crée les utilisateurs en ligne, ils se connectent ensuite une fois pour activer le mode offline).

---

## Partie 2 — Onglet "Programmes" centralisé

### Retraits dans la fiche parcelle (`src/pages/Parcelle.tsx`)
- Supprimer les onglets / liens internes vers **Irrigation** et **Fertilisation** de la fiche parcelle.
- Les pages `/irrigation/:id` et `/fertilisation/:id` restent accessibles depuis le nouvel onglet Programmes (édition / création), donc on garde les routes et les modules existants.

### Nouvel onglet "Programmes" dans la barre du bas
Ajouté pour **admin** et **ingénieur** (les exécutants n'ont pas cet onglet — ils voient déjà leurs tâches du jour).

```text
ADMIN: Accueil | Programmes | Tâche | Maintenance | (Irrigation/Fertilisation retirés)
INGENIEUR: Accueil | Parcelles | Programmes | Recos | Profil
```

### Page `/programmes`
Une seule page qui liste **tous** les programmes (irrigation + fertilisation) archivés.

- En-tête avec filtres :
  - Filtre par **parcelle** (multi-sélection ou "Toutes")
  - Filtre par **type** : Tous / Irrigation / Fertilisation
  - Filtre par **plage de dates** (date début → date fin)
  - Tri : plus récents d'abord par défaut
- Liste / cartes : chaque ligne montre type, parcelle, date programmée, statut, coût total, créé par.
- Actions :
  - **Consulter** : ouvre la fiche du programme (lecture seule pour exécutant).
  - **Modifier** : ouverte uniquement aux rôles admin et ingénieur (réutilise les pages `Irrigation.tsx` / `Fertilisation.tsx` existantes en mode édition).
  - **Ajouter** : bouton "+ Nouveau programme" → choix Irrigation ou Fertilisation → ouvre la page de création existante.
- Compatible **hors ligne** : utilise le cache local des `module_records` déjà en place.

### Données
- Source : table `module_records` (déjà existante) filtrée sur `kind in ('irrigation', 'fertilisation')`.
- Aucune modification de schéma BDD nécessaire pour cette partie.
- Les RLS actuelles couvrent déjà la lecture pour tous les rôles, et l'écriture admin. Pour autoriser l'ingénieur à créer/modifier les programmes, on ajoutera 2 policies sur `module_records` :
  - INSERT autorisé si `has_role(auth.uid(), 'ingenieur')` et `created_by = auth.uid()`.
  - UPDATE autorisé si `has_role(auth.uid(), 'ingenieur')`.

---

## Fichiers impactés (estimation)

- `src/integrations/supabase/client.ts` — vérifier options de persistance (auto-généré, on ne le modifie pas — sinon ajustement via un wrapper).
- `src/lib/role.ts` + `src/lib/display-role.ts` — cache local du rôle, tolérance offline.
- `src/pages/TabsLayout.tsx` — ne pas rediriger vers `/login` si une session existe et qu'on est offline.
- `src/components/home/BottomTabs.tsx` — ajout de l'onglet Programmes (admin + ingénieur), retrait des onglets Irrigation / Fertilisation côté admin.
- `src/pages/Parcelle.tsx` — retrait des sections / onglets Irrigation et Fertilisation.
- `src/pages/Programmes.tsx` *(nouveau)* — liste + filtres + actions.
- `src/App.tsx` — route `/programmes`.
- Migration SQL — 2 policies RLS supplémentaires sur `module_records` pour l'ingénieur.

---

## Hors périmètre
- Création de compte 100% offline (non demandée).
- Code PIN local (non demandé).
- Refonte visuelle des pages Irrigation / Fertilisation (réutilisées telles quelles).
