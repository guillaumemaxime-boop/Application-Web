# ADR-0002 : Architecture full-stack séparée backend / frontend

- **Statut** : Accepted
- **Date** : 2026-05-02
- **Décideurs** : Équipe Atelier Lumen
- **Tags** : architecture, backend, frontend

## Contexte

Le portfolio doit présenter du contenu (mobilier, expositions, profil) avec une UI soignée et permettre une évolution future vers un espace admin, de la persistance et du SSR. Plusieurs paradigmes étaient possibles :

- Application monolithique servant les pages côté serveur (ex : Spring MVC + Thymeleaf)
- Site statique généré (Hugo, Astro)
- Architecture découplée : API REST côté serveur + SPA côté client

L'équipe maîtrise à la fois Java/Spring et l'écosystème Angular et souhaite pouvoir faire évoluer indépendamment l'UI et l'API (ex : ajouter un client mobile plus tard, brancher un CMS).

## Décision

Adopter une **architecture full-stack séparée** :

- **Backend** : API REST stateless, exposée sur `:8080`, fournit uniquement du JSON
- **Frontend** : SPA Angular indépendante, servie sur `:4200` en développement, et derrière un serveur web statique en production
- Communication via HTTP/JSON, contrats définis par les endpoints `/api/**`
- Deux dossiers distincts à la racine (`backend/`, `frontend/`) avec leurs propres outillages, dépendances et cycle de build

## Conséquences

### Positives
- Découplage fort : le front et le back peuvent évoluer à des rythmes différents
- Possibilité de brancher d'autres clients (mobile, intégrations tierces) sur la même API
- Spécialisation des outillages : Maven/JUnit côté Java, npm/Karma côté TS
- Déploiement indépendant possible (deux images Docker, deux pipelines)

### Négatives / compromis
- CORS à gérer en développement (résolu par [ADR-0009](0009-cors-developpement-local.md))
- Deux processus à lancer en local (atténué par `docker-compose`)
- Duplication potentielle des modèles métier (TypeScript ↔ Java) — risque de dérive si non monitoré

### Neutres
- Le monorepo (un seul dépôt git) reste, ce qui simplifie la coordination des PR cross-cutting

## Alternatives envisagées

### Option A — Spring Boot + Thymeleaf (rendu serveur)
Écartée : ne permet pas l'expérience interactive recherchée (galeries, animations, transitions). Coût fort si on veut migrer vers une SPA plus tard.

### Option B — Site statique généré (SSG)
Écartée : pas adaptée à un futur espace admin avec édition dynamique du catalogue, et complique la branche "API pour clients tiers" évoquée comme évolution.

### Option C — Next.js / fullstack TypeScript
Écartée : l'équipe possède une expertise Java/Spring qu'on souhaite valoriser, et le besoin métier ne justifie pas l'unification linguistique côté serveur.

## Références

- [README.md](../../README.md) — structure du projet et endpoints
- [ADR-0003](0003-backend-spring-boot.md) — choix du backend
- [ADR-0004](0004-frontend-angular-standalone-signaux.md) — choix du frontend
