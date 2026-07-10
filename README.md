# MonHub

Dashboard personnel centralisant finances, agenda, tâches, habitudes, voiture, documents, objectifs et voyages — installable comme une PWA sur mobile et desktop.

## Stack

- **Frontend** : React + Vite + Tailwind CSS
- **Hébergement** : Vercel (déploiement continu depuis GitHub)
- **Backend / DB** : à venir (Turso ou Supabase, tier gratuit)

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## État d'avancement

- [x] Squelette Vite + React + Tailwind
- [x] Manifest PWA minimal (icône + `manifest.webmanifest`)
- [ ] Service worker / mode hors-ligne
- [ ] Base de données + API CRUD
- [ ] Module Finances
- [ ] Modules suivants (Agenda, Tâches, Habitudes, Voiture, Documents, Objectifs, Voyages)
- [ ] Authentification (PIN/token)
