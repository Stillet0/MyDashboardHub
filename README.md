# MonHub

Dashboard personnel centralisant finances, agenda, tâches, habitudes, voiture, documents, objectifs et voyages — installable comme une PWA sur mobile et desktop.

## Stack

- **Frontend** : React + Vite + Tailwind CSS
- **Hébergement** : GitHub Pages (déploiement continu via GitHub Actions)
- **Données** : repo privé [monhub-data](https://github.com/Stillet0/monhub-data), lu/écrit directement depuis le navigateur via l'API GitHub (Contents API) — pas de backend ni de base de données séparée
- **Authentification** : token GitHub personnel (fine-grained, limité au repo `monhub-data`), saisi une fois et stocké dans le navigateur

Cette approche évite tout compte/service supplémentaire : seul ton compte GitHub existant est utilisé, à la fois pour le code, l'hébergement et le stockage des données.

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Déploiement

Le workflow `.github/workflows/deploy.yml` build et déploie automatiquement sur GitHub Pages à chaque push sur `main`.

Configuration à faire une fois, manuellement : **Settings → Pages → Source: GitHub Actions**.

## État d'avancement

- [x] Squelette Vite + React + Tailwind
- [x] Manifest PWA minimal (icône + `manifest.webmanifest`)
- [x] Hébergement GitHub Pages + workflow de déploiement
- [x] Stockage des données via repo GitHub (`monhub-data`) + client API + écran de connexion par token
- [x] Module Finances — onglet Aperçu (patrimoine net, évolution, répartition par catégorie, fonds d'urgence, objectif, cashflow du mois), inspiré du tracker patrimoine.html existant, données réelles importées
- [x] Module Finances — onglet Comptes (ajout/modification/suppression de comptes, écriture directe dans `monhub-data`)
- [x] Module Finances — onglet Mise à jour (relevé mensuel des comptes + cashflow revenus/dépenses par catégorie)
- [x] Module Finances — onglet Dettes (ajout/modification/suppression, solde restant dû intégré à la mise à jour mensuelle et au calcul du patrimoine net)
- [x] Module Finances — onglet Historique (tableau patrimoine net + cashflow, mois par mois avec variations)
- [x] Module Finances — onglet Objectifs & Budget (objectif de patrimoine net, budgets mensuels par catégorie avec suivi dans la Mise à jour, allocation cible vs réelle, indice de référence)

Module Finances considéré complet pour l'usage courant. Restent en option (non prioritaire) : graphiques avancés de performance/répartition dans le temps et comparaison à un indice — nécessiteraient de suivre en plus le détail des versements/plus-values par compte.

- [x] Module Agenda — événements locaux (ajout/modification/suppression, écriture directe dans `monhub-data`), lecture seule de Google Calendar en complément (voir configuration ci-dessous)
- [x] Module Tâches — todo-list avec catégories, priorités, échéances (avec détection de retard), section "Terminées" repliable
- [x] Module Habitudes — suivi quotidien/hebdomadaire avec streaks et mini heatmap des 14 derniers jours
- [x] Module Voiture — véhicule(s), échéances (contrôle technique, vidange, assurance) avec alerte de retard, journal d'entretien avec coût total
- [x] Module Documents — références importantes par catégorie avec dates d'expiration (alerte expiré/bientôt expiré) — pas de liens Drive (non souhaité)
- [x] Module Objectifs — goals long terme avec progression manuelle, échéance optionnelle, étiquette de module lié (ex: Finances, Habitudes), section "Atteints" repliable
- [x] Module Voyages — voyages (destination, dates, budget), dépenses par voyage avec suivi budget vs réalisé, voyages passés grisés

Tous les modules de la feuille de route initiale sont en place.

- [x] Service worker (mode hors-ligne) + sauvegarde automatique toutes les 5 min et à la fermeture de l'app

## Mode hors-ligne et sauvegarde automatique

- **Hors-ligne** : un service worker (`vite-plugin-pwa`) met en cache l'app elle-même (JS/CSS/HTML), donc MonHub s'ouvre même sans réseau. Chaque module garde aussi une copie de ses dernières données dans le navigateur (`localStorage`), affichée instantanément à l'ouverture — avant même la réponse de l'API GitHub.
- **Sauvegarde automatique** : les modifications ne sont plus envoyées à `monhub-data` à chaque clic, mais mises en file d'attente localement puis synchronisées :
  - automatiquement toutes les **5 minutes**,
  - automatiquement à la **fermeture/mise en arrière-plan de l'app** (changement d'onglet, verrouillage du téléphone, fermeture) via les événements `visibilitychange`/`pagehide`,
  - ou manuellement en cliquant sur l'indicateur "● Non synchronisé" en haut de l'écran.

Le statut de synchronisation (`✓ Synchronisé` / `● Non synchronisé` / `Synchronisation…`) est visible en permanence dans l'en-tête. Comme avant, chaque écriture est protégée par le SHA du fichier : si un autre appareil a modifié la donnée entre-temps, l'écriture est refusée plutôt que d'écraser silencieusement.

## Connecter Google Calendar (optionnel)

Le module Agenda peut afficher tes événements Google Calendar à venir, en lecture seule, en plus des événements créés dans MonHub. Configuration à faire une seule fois :

1. Va sur la [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crée un projet (ou utilise un projet existant)
3. Active l'**API Google Calendar** (menu "APIs & Services" → "Library")
4. Configure l'écran de consentement OAuth ("OAuth consent screen") : type **External**, statut **Testing**, et ajoute ton propre email comme "Test user"
5. Crée un identifiant : "Credentials" → "Create Credentials" → **OAuth client ID** → type **Web application**
   - "Authorized JavaScript origins" : `https://stillet0.github.io`
6. Copie le **Client ID** généré (il ressemble à `xxxxx.apps.googleusercontent.com`, ce n'est pas un secret)
7. Dans l'onglet Agenda de MonHub, colle ce Client ID et clique sur "Connecter"

Rien n'est jamais écrit dans ton Google Calendar (scope lecture seule uniquement).
