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
- [x] Module Finances — suivi de performance par compte (investi / plus-value € / % / apport, saisis ou estimés) et onglet Graphiques (évolution de la répartition, rendement par catégorie, portefeuille vs indice de référence, évolution du cashflow, répartition des dépenses dans le temps)

Module Finances désormais en parité complète avec le tracker patrimoine.html d'origine.

- [x] Module Agenda — événements locaux (ajout/modification/suppression, écriture directe dans `monhub-data`), lecture seule de Google Calendar en complément (voir configuration ci-dessous), et affichage des échéances des autres modules (tâches, échéances voiture, expirations de documents, rendez-vous et renouvellements santé, échéances d'objectifs) — clique dessus pour aller directement au module concerné. Une échéance dont la date est dépassée et qui n'est pas encore marquée faite n'est jamais masquée : elle apparaît dans une section « En retard » en haut de l'Agenda plutôt que de disparaître silencieusement.
- [x] Module Tâches — todo-list avec catégories, priorités, échéances (avec détection de retard), section "Terminées" repliable
- [x] Module Habitudes — suivi quotidien/hebdomadaire avec streaks et mini heatmap des 14 derniers jours
- [x] Module Voiture — véhicule(s), échéances (contrôle technique, vidange, assurance) avec alerte de retard et statut fait/à faire, journal d'entretien avec coût total (calculé sur les entretiens faits uniquement) et statut fait/prévu — les échéances et entretiens non faits apparaissent dans les rappels et sur l'Agenda ; une fois marqués faits, ils en disparaissent. Une échéance peut être fixée par **date**, par **kilométrage** (ex: vidange à 65 000 km), ou les deux à la fois — au moins l'un des deux est requis. Une échéance au kilométrage se compare au kilométrage actuel du véhicule et n'a pas de date propre, donc elle n'apparaît pas sur l'Agenda (qui reste un calendrier par date) mais reste visible dans le module Voiture et dans les rappels de l'Aperçu
- [x] Module Documents — références importantes par catégorie avec dates d'expiration (alerte expiré/bientôt expiré) et statut renouvelé/à renouveler — une fois marqué renouvelé, un document n'apparaît plus dans les rappels ni sur l'Agenda — pas de liens Drive (non souhaité)
- [x] Module Objectifs — goals long terme avec progression manuelle, échéance optionnelle, étiquette de module lié (ex: Finances, Habitudes), section "Atteints" repliable
- [x] Module Voyages — voyages (destination, dates, budget), dépenses par voyage avec suivi budget vs réalisé, voyages passés grisés
- [x] Module Santé — rendez-vous médicaux (praticien, date/heure) et traitements en cours avec date de renouvellement d'ordonnance, intégrés aux rappels et au tableau de bord Aperçu

Tous les modules de la feuille de route initiale sont en place.

- [x] Service worker (mode hors-ligne) + sauvegarde automatique toutes les 5 min et à la fermeture de l'app
- [x] Onglet "Aperçu" — tableau de bord résumant chaque module en un coup d'œil (patrimoine net, prochain événement, tâches critiques, objectifs en cours, habitudes du jour, prochaine échéance voiture/document, prochain voyage), + rappels agrégés (tâches, échéances voiture, documents qui expirent, objectifs en retard, événements du jour, habitudes à ne pas casser) et notifications navigateur/OS quand l'app est ouverte
- [x] Fonctionnalités intelligentes (IA Gemini, optionnel) — décomposition de tâches en étapes, aide pour démarrer une tâche bloquée, suggestions de sites/outils utiles (tâches, objectifs, voyages), génération de plan d'action pour les objectifs, suggestions de lieux à visiter pour les voyages, conseils pour tenir ses habitudes, analyse mensuelle des finances, plan de la journée priorisé et ajout rapide en langage naturel sur l'onglet Aperçu
- [x] Recherche globale — barre de recherche dans l'en-tête qui retrouve instantanément une tâche, un événement, une habitude, un véhicule/échéance/entretien, un document, un rendez-vous/traitement santé, un objectif ou un voyage, et navigue directement vers le bon module

## Fonctionnalités intelligentes (IA)

MonHub peut utiliser l'API gratuite **Google Gemini** pour des fonctionnalités d'assistance, en plus de tout ce qui précède :

- **Tâches** : « ✨ Décomposer en étapes » propose une liste de sous-étapes concrètes (ajoutables en un clic comme sous-tâches cochables), « ✨ Aide à démarrer » donne un conseil court pour débloquer une tâche, « ✨ Sites utiles » suggère des sites/outils réputés pertinents pour la tâche.
- **Objectifs** : « ✨ Générer un plan d'action » propose 4 à 7 étapes réalistes vers l'objectif, ajoutables comme checklist sur l'objectif, « ✨ Sites utiles » suggère des ressources en ligne pour progresser.
- **Voyages** : « ✨ Suggestions de visites » propose des lieux et activités incontournables pour la destination du voyage, ajoutables à une checklist du voyage, « ✨ Sites utiles » suggère des sites de réservation/transport/guides pour préparer le séjour.
- **Habitudes** : « ✨ Conseil » donne un conseil court adapté à la série en cours (ou à la difficulté de s'y tenir).
- **Finances** : « ✨ Analyse du mois » donne une analyse rapide de la situation financière du mois (patrimoine, répartition, cashflow).
- **Aperçu** : « ✨ Plan de la journée » résume ce qu'il faut prioriser en fonction des rappels en cours, et « ✨ Ajout rapide » permet de créer un élément en tapant une simple phrase (ex : *"Dentiste vendredi 15h"*, *"Renouveler le passeport avant mars"*) — l'IA identifie automatiquement le bon module (Tâches, Agenda, Santé, Objectifs ou Documents), en extrait les champs (titre, date, catégorie…), puis affiche un aperçu à confirmer avant tout ajout. Les dates extraites par l'IA sont validées avant d'être enregistrées (format strict `YYYY-MM-DD`) : un champ mal formé est simplement ignoré plutôt que stocké tel quel.

Les suggestions de sites/outils restent des recommandations en texte simple (jamais de lien cliquable auto-généré) : l'IA est incitée à ne citer que des ressources réputées et à s'abstenir si elle n'est pas sûre qu'elles existent, mais comme toute IA générative elle peut se tromper — vérifie toujours par toi-même avant de t'y fier.

C'est **entièrement optionnel** : sans clé configurée, ces boutons n'apparaissent simplement pas et le reste de l'app fonctionne normalement. Pour l'activer :

1. Clique sur **✨ Activer l'IA** en haut de l'écran
2. Récupère une clé API gratuite sur [Google AI Studio](https://aistudio.google.com/apikey) (compte Google, aucune carte bancaire requise)
3. Colle la clé et enregistre

La clé reste uniquement dans le navigateur (`localStorage`), comme le token GitHub. Les appels partent directement du navigateur vers l'API Gemini — aucun serveur intermédiaire. MonHub demande à ta clé la liste de ses modèles disponibles et choisit automatiquement un modèle "flash" (rapide et gratuit), pour rester robuste si Google renomme ou déprécie un modèle. Le quota gratuit de Gemini est large pour un usage personnel mais n'est pas illimité.

## Aperçu

L'onglet "Aperçu" (ancien "Aujourd'hui") sert de page d'accueil : une grille de tuiles résume chaque module (Finances, Agenda, Tâches, Objectifs, Habitudes, Voiture, Documents, Voyages) — clique sur une tuile pour aller directement au module concerné.

En dessous, les rappels regroupent tout ce qui est **en retard**, **du jour** ou **dans les 7 prochains jours** à travers tous les modules. Clique sur un rappel pour aller directement au module concerné.

Si tu actives les notifications (bouton dans l'onglet), MonHub déclenche une vraie notification navigateur/OS pour chaque élément en retard ou du jour, à l'ouverture de l'app puis toutes les 30 minutes tant qu'elle reste ouverte.

**Limite importante** : MonHub n'a pas de serveur, donc ces notifications ne fonctionnent que pendant que l'app est ouverte (ou en arrière-plan dans un onglet) — pas de réveil du téléphone app fermée. Un vrai push "app fermée" nécessiterait un serveur dédié (Web Push + VAPID), ce qui casserait le principe "zéro serveur, 100% gratuit" du projet.

## Mode hors-ligne et sauvegarde automatique

- **Hors-ligne** : un service worker (`vite-plugin-pwa`) met en cache l'app elle-même (JS/CSS/HTML), donc MonHub s'ouvre même sans réseau. Chaque module garde aussi une copie de ses dernières données dans le navigateur (`localStorage`), affichée instantanément à l'ouverture — avant même la réponse de l'API GitHub.
- **Sauvegarde automatique** : les modifications ne sont plus envoyées à `monhub-data` à chaque clic, mais mises en file d'attente localement puis synchronisées :
  - automatiquement toutes les **5 minutes**,
  - automatiquement à la **fermeture/mise en arrière-plan de l'app** (changement d'onglet, verrouillage du téléphone, fermeture) via les événements `visibilitychange`/`pagehide`,
  - ou manuellement en cliquant sur l'indicateur "● Non synchronisé" en haut de l'écran.

Le statut de synchronisation (`✓ Synchronisé` / `● Non synchronisé` / `Synchronisation…` / `⚠ Échec de synchro`) est visible en permanence dans l'en-tête. Comme avant, chaque écriture est protégée par le SHA du fichier : si un autre appareil a modifié la donnée entre-temps, l'écriture est refusée plutôt que d'écraser silencieusement — et la raison exacte d'un échec (conflit, token invalide, erreur réseau…) s'affiche clairement dans l'en-tête et sur l'onglet Aperçu.

**Résolution de conflit** : un simple "réessayer" ne suffit pas à résoudre un vrai conflit — la modification en attente garde le SHA périmé qui a causé le refus, donc retenter échouerait indéfiniment. Quand un conflit réel est détecté (`⚠ Conflit sur {module}` dans l'en-tête), l'onglet Aperçu affiche un choix explicite plutôt que de trancher automatiquement :
  - **Garder ma version** : reprend le SHA à jour du fichier distant et y écrase la modification locale en attente.
  - **Utiliser la version à jour** : abandonne la modification locale en attente et recharge la version enregistrée par l'autre appareil.

**Aucune modification n'est jamais seulement "en mémoire"** : chaque édition est écrite immédiatement dans `localStorage` (donnée + liste de ce qui reste à synchroniser), donc même une fermeture brutale (crash, coupure réseau, batterie) avant la prochaine synchronisation ne perd rien. À la réouverture de l'app, toute modification non encore synchronisée est visible normalement et une tentative de synchronisation est relancée automatiquement.

**Robustesse** : chaque onglet est isolé par un error boundary — si une donnée corrompue ou inattendue fait planter l'affichage d'un module, seul cet onglet affiche un message d'erreur récupérable (le reste de l'app, y compris la navigation, continue de fonctionner) plutôt que de laisser tout l'écran devenir noir. Les dates au format inattendu (`YYYY-MM-DD` attendu) sont aussi tolérées partout où elles sont affichées, sans jamais faire planter le rendu. Les notifications natives sont également protégées : sur une PWA installée sur iOS, Safari refuse `new Notification()` en dehors d'un Service Worker et lève une exception — celle-ci est maintenant rattrapée pour ne jamais faire planter l'onglet Aperçu.

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
