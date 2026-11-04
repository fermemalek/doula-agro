# MEMOIRE_PROJET — Doula Agro (Farm Friendy)

Document récapitulatif complet de l'architecture, de l'historique du travail, des fonctionnalités implémentées, des règles agronomiques et des derniers correctifs.

---

## 1. Contexte & Acteurs
L'application **Doula Agro** (anciennement nommée Farm Friendy) est une plateforme de gestion agricole intelligente et connectée (Web, PWA, Electron Desktop et Android Capacitor) ciblant 3 acteurs clés :
1. **L'Ingénieur Agronome** : Prescription agronomique par espèce et parcelles, diagnostic, rotation des matières actives.
2. **L'Administrateur** : Supervision globale, validation des recommandations, suivi des achats/stocks et de la planification.
3. **L'Exécutant (Opérateur de terrain)** : Exécution étape par étape assistée vocalement, rapports de fin de tâche, remontée d'anomalies.

---

## 2. Fonctionnalités Implémentées

### 2.1. Prescriptions & Recommandations Agronomiques
- **Types de recommandations** : Fertilisation, Phytosanitaire, Irrigation.
- **Sélection des parcelles** : Multi-sélection intelligente par groupe d'espèces (Oliviers, Pommiers, Nectariniers, Casuarina) ou sélection individuelle.
- **Date & Période** : Date d'application ciblée avec choix de la période optimale (**Matin** ou **Soir**) pour les traitements phytosanitaires et la fertigation.
- **Validation & Clônage à l'échelle** : Validation instantanée par l'administrateur, calcul automatique d'échelle selon la surface réelle (hectares) de chaque parcelle, et injection dans la table `module_records` (feuille de route exécutant et onglet Programmes).

### 2.2. Calculateur de Fertilisation & Irrigation (Modèle Excel V9)
- **Répartition stricte par cuve (anti-précipités)** :
  - **Bac A** : Calcium & Acide (Nitrate de Calcium, Acide Nitrique).
  - **Bac B** : Macro-éléments & Phosphore (Urée, Nitrate/Sulfate de Potassium, Magnésium, MAP, MKP, DAP, Acide Phosphorique).
  - **Bac C** : Organique & Fer (Acide Humique, Fer chélaté 6%).
  - **Bac D** : Nettoyage & Oligo-éléments (Acide Citrique, Ascorbique, Oligos).
- **Règles physico-chimiques** : Solubilité max avec marge de sécurité 1.5x, volume déplacé (`volume_eau + somme_doses * 0.6`), alerte visuelle de trop-plein (> 1000 L).
- **Irrigation seule sans fertilisation** : Possibilité de planifier des apports hydriques purs les jours sans engrais sur un cycle hebdomadaire.
- **Répétition des programmes** : Planification automatique sur plusieurs semaines (1x ou 2x par semaine, ex: Mardi et Samedi).
- **Unification Fertigation** : Génération d'enregistrements unifiés (16 programmes consolidés au lieu de 32) pour éviter les doublons par parcelle.

### 2.3. Historique Phyto & Gestion des Résistances
- **Modal Historique Phyto (`PhytoHistoryModal.tsx`)** : Consultable directement depuis le formulaire de recommandation de l'ingénieur.
- **Rotation des matières actives** : Traçabilité des matières actives appliquées par parcelle pour éviter l'accoutumance et optimiser les DAR (Délais Avant Récolte).

### 2.4. Alertes Stocks & Achats Nécessaires
- **Détection automatique du stock manquant (`checkRecoStock`)** : Analyse en direct des besoins de chaque recommandation vis-à-vis des stocks réels des fournisseurs/magasin.
- **Badges dynamiques** : Badge rouge clignotant *"Achat requis"* dans la liste des recommandations quand le stock est insuffisant.
- **Masquage après validation** : Le badge d'achat se masque ou bascule dès que le programme est validé et pris en compte.

### 2.5. Météo Agricole & Alertes
- **Météo en temps réel** : Température, hygrométrie, vitesse du vent, conditions propices à la pulvérisation.
- **Guide cultural mensuel** : Recommandations saisonnières automatiques.
- **Alertes météo / température par email** : Détection des gels ou canicules pour protéger les cultures.

### 2.6. Bilinguisme Complet Français / Arabe (FR / AR)
- Internationalisation native (`useTranslation`).
- Traductions exhaustives en arabe de tous les composants : fiches produits, bacs de dissolution, consignes d'application, états des parcelles et rapports d'intervention.

---

## 3. Derniers Correctifs & Stabilisation

1. **Désimbrication des Dialogs Radix UI** :
   - Sortie des dialogues secondaires (`newProductDialogOpen` et `PhytoHistoryModal`) hors du dialogue principal dans `RecommendationForm.tsx` pour éliminer les bugs de blocage de clic et de focus trap.
2. **Global Error Boundary (`ErrorBoundary.tsx`)** :
   - Mise en place d'un composant de rattrapage d'erreur avec bouton de rechargement élégant au niveau de `main.tsx` pour empêcher tout plantage ou écran blanc en cas d'erreur de rendu.
3. **Sécurisation des données de parcelles** :
   - Gestion stricte des cas où `parcel_ids` est `null` ou `undefined` dans les fiches de recommandation.
4. **Correction du Hook de langue** :
   - Extraction fiable de `lang` depuis `useTranslation` pour éviter tout crash au chargement du formulaire ingénieur.

---

## 4. Déploiement & Accès
- **GitHub Pages** : [https://fermemalek.github.io/doula-agro/#/login](https://fermemalek.github.io/doula-agro/#/login)
- **Routage** : HashRouter (`/#/...`) assurant la compatibilité totale avec GitHub Pages et Electron.
- **Mobile** : Fichier APK disponible `DoulaAgro_debug.apk` pour installation Android.

