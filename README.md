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
- [ ] Module Finances — édition (comptes, mise à jour mensuelle, dettes, graphiques détaillés, historique)
- [ ] Service worker / mode hors-ligne
- [ ] Modules suivants (Agenda, Tâches, Habitudes, Voiture, Documents, Objectifs, Voyages)
