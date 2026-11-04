# MÉMOIRE COMPLÈTE & HISTORIQUE DU PROJET DOULA AGRO (Ferme Malek)

> Ce fichier sert de mémoire centrale et de passage de relais pour Antigravity entre les différents ordinateurs.
> Tout agent Antigravity travaillant sur ce projet DOIT lire ce fichier pour connaître l'historique complet, les choix techniques, les comptes et les fonctionnalités développées.

---

## 1. Contexte & Vue d'ensemble du Projet

- **Nom de l'application** : Doula Agro (Ferme Malek)
- **Objectif** : Application de gestion agricole complète pour la Ferme Malek (gestion des parcelles, suivi des cultures, fertilisation, irrigation, traitements phytosanitaires, prévisions météo, alertes stocks et achats, rôles et exécution des tâches sur le terrain).
- **Dépôt GitHub** : `https://github.com/fermemalek/doula-agro.git`
- **Déploiement en ligne (GitHub Pages)** : `https://fermemalek.github.io/doula-agro/`
- **Base de données Cloud** : Supabase (toutes les données utilisateurs, recommandations, modules, parcelles et stocks sont centralisées sur le Cloud).

---

## 2. Utilisateurs & Système de Rôles

L'application possède 3 rôles principaux et des comptes préconfigurés :
1. **Administrateur** :
   - Utilisateur : `Abderrahmane`
   - Permissions : Vue globale sur toutes les recommandations, validation/acceptation ou mise en approvisionnement des recommandations, gestion des stocks et bons d'achat, planification automatique des tâches d'irrigation et fertilisation, gestion des utilisateurs.
2. **Ingénieur Agronome** :
   - Utilisateur : `khadij`
   - Permissions : Création et modification des recommandations agronomiques (Fertilisation Irrigation, Pulvérisation Foliaire, Traitements Phytosanitaires), consultation de l'historique des matières actives pour éviter les résistances, consultation des prévisions météo en temps réel et mensuelles avec alertes de température.
3. **Exécutants / Ouvriers** :
   - Vue simplifiée sur mobile : liste des programmes du jour (TodayView), validation de l'exécution des tâches d'arrosage ou de traitement avec heure de début et fin.

---

## 3. Architecture Technique & Choix Structurants

- **Frontend** : React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + Radix UI / Shadcn.
- **Routage** : HashRouter (`/#/recommandations`, etc.) pour compatibilité parfaite avec GitHub Pages et Electron/Android.
- **Internationalisation (i18n)** : Bilingue complet **Français** et **Arabe** avec support RTL (`src/lib/i18n.ts`).
- **Synchronisation locale / Cloud** :
  - Supabase pour les données partagées (`src/lib/supabaseClient.ts`, `src/lib/cloud/`).
  - Stores locaux avec persistance `localStorage` pour le mode hors-ligne (`src/lib/modules-store.ts`, `src/lib/parcel-store.ts`, `src/lib/suppliers-store.ts`).

---

## 4. Modules Fonctionnels Récemment Développés & Règles Métier

### A. Module Recommandations & Planification Intelligente
- **Multi-parcelles** : L'ingénieur peut assigner une recommandation à un groupe d'espèces (ex: Oliviers P1, P2, P3, P4) et l'administrateur peut cocher/décocher individuellement les parcelles ciblées lors de l'acceptation.
- **Fertigation unifiée & Irrigation seule (eau claire)** :
  - Quand une fertilisation par irrigation est recommandée (ex: 2 fois par semaine), l'ingénieur peut spécifier le nombre d'irrigations seules (eau claire sans engrais, ex: 1 fois par semaine).
  - Lors de l'acceptation par l'administrateur, le système planifie les jours alternés automatiquement (`computePureIrrigationDates` dans `src/lib/stock-alerts.ts`).
  - L'irrigation avec fertilisation ne crée qu'**une seule tâche unifiée** par passage (pas de doublon irrigation + fertilisation).

### B. Contrôle des Stocks & Achats Automatiques
- Vérification automatique des stocks (`checkRecoStock` dans `src/lib/stock-alerts.ts`).
- Si des engrais ou produits phyto manquent, un badge **« Achat requis »** s'affiche.
- L'administrateur peut cliquer sur **« Valider l'achat et Accepter »** ou **« Approvisionnement »** pour générer automatiquement les lignes d'achat nécessaires dans la feuille Fournisseurs/Achats.

### C. Historique Phyto & Rotation des Matières Actives (Espace Ingénieur)
- Composant `PhytoHistoryModal.tsx` accessible depuis le bouton *"سجل المعاملات السابقة"* (Historique des traitements).
- Affiche l'historique chronologique trié par année, mois et matières actives (ex: Azoxystrobine, Thiaclopride, Deltaméthrine, etc.) pour alerter l'ingénieur en cas d'utilisation répétée et éviter les accoutumances/résistances de maladies ou ravageurs.

### D. Météo Ingénieur & Alertes Température
- Données météo en temps réel et prévisions mensuelles.
- Choix d'un seuil de température maximale avec notification/alerte par email.

---

## 5. Derniers Correctifs Appliqués (Important !)

1. **Correction Minified React Error #185 (Boucle infinie)** :
   - `useParcels()` dans `src/lib/parcel-store.ts` retournait une nouvelle référence de tableau à chaque render (`PARCELS.map(merge)`). Corrigé avec `useMemo(..., [tick])`.
   - Les dépendances des `useEffect` dans `RecommendationDetailDialog.tsx` ont été stabilisées (`reco?.id`).
   - `ErrorBoundary.tsx` a été ajouté pour capturer proprement les erreurs sans écran blanc.
2. **Désimbrication des Dialogs Radix UI** :
   - Dans `RecommendationForm.tsx`, les modales secondaires (`PhytoHistoryModal`, création de produit) ont été séparées pour éviter les conflits d'overlay et de focus trap.
3. **Sécurisation des champs optionnels** :
   - `r.parcel_ids?.length || 0` pour éviter les erreurs `Cannot read properties of undefined` sur les anciennes recommandations en base de données.

---

## 6. Instructions pour Antigravity sur n'importe quel PC

Quand l'utilisateur travaille sur ce projet :
- Toujours maintenir les libellés traduits en **Français** et en **Arabe**.
- Toujours tester le build avant de finaliser : `npm run build`.
- En cas de modification pour GitHub Pages : copier `dist/index.html` vers `dist/404.html` et déployer sur la branche `gh-pages`.
- Respecter les conventions de style et ne jamais supprimer de données ou de commentaires existants.
