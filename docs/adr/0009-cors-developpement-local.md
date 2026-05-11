# ADR-0009 : CORS restreint aux origines de développement local

- **Statut** : Accepted (mis à jour 2026-05-11)
- **Date** : 2026-05-02
- **Décideurs** : Équipe Atelier Lumen
- **Tags** : backend, sécurité, cors

## Contexte

L'architecture découplée ([ADR-0002](0002-architecture-full-stack-separee.md)) impose au navigateur d'effectuer des requêtes cross-origin du frontend (`http://localhost:4200`) vers le backend (`http://localhost:8080`) en développement. Sans politique CORS côté serveur, ces requêtes sont bloquées.

En production, le frontend et le backend sont conteneurisés ([ADR-0006](0006-conteneurisation-docker-rancher.md)) et accessibles via `http://localhost` (machine de démo) — l'origine est différente du développement Angular CLI.

Les options classiques :
- Autoriser tout (`*`) — simple mais ouvre l'API à n'importe quel site
- Autoriser une liste blanche stricte — plus contraignant mais plus sûr
- Utiliser un proxy de développement Angular CLI — déplace le problème en dev mais ne règle pas la prod

## Décision

Configurer CORS dans `SecurityConfig.java` (via `SecurityFilterChain`) avec une **liste blanche d'origines** correspondant aux contextes attendus :

- `http://localhost:4200` — `ng serve` en développement
- `http://localhost` — frontend conteneurisé servi sur le port 80
- `http://127.0.0.1` — loopback sans port (accès direct)
- `http://127.0.0.1:4200` — frontend Docker Compose accessible via IP loopback *(ajouté le 2026-05-11 — origine manquante qui causait des 403 depuis le navigateur)*
- Méthodes autorisées : `GET, POST, PUT, DELETE, OPTIONS`
- En-têtes autorisés : `Content-Type, Authorization, Accept`
- `maxAge: 3600` — cache du preflight pendant 1h
- **`allowCredentials` n'est PAS activé** : les tokens JWT transitent via l'en-tête `Authorization`, pas via des cookies — le risque CSRF lié aux credentials cross-origin est neutralisé

La configuration est appliquée uniquement au préfixe `/api/**`.

## Conséquences

### Positives
- L'API reste utilisable depuis le frontend conteneurisé et depuis `ng serve` sans configuration côté client
- Pas de wildcard `*` global qui exposerait l'API à n'importe quelle origine
- Pas de cookies cross-origin → pas de surface CSRF
- Les quatre origines locales couvrent l'ensemble des contextes de développement réels

### Négatives / compromis
- Toute nouvelle origine de production devra être ajoutée explicitement (ce qui est intentionnel)
- La liste est injectable via la variable `app.cors.allowed-origins` — une mauvaise valeur en production bloquerait le frontend

### Neutres
- La CORS config est désormais intégrée dans `SecurityConfig` (Spring Security) plutôt que dans un `WebMvcConfigurer` séparé, ce qui centralise toute la configuration de sécurité

## Correction appliquée (2026-05-11)

L'origine `http://127.0.0.1:4200` était absente de la liste initiale. Les navigateurs accédant au frontend via `127.0.0.1` (plutôt que `localhost`) recevaient un 403 sur `POST /api/auth/login`. Corrigé en ajoutant l'origine manquante dans la valeur par défaut de `@Value("${app.cors.allowed-origins:...}")`.

## Alternatives envisagées

### Option A — `allowedOrigins("*")` permissif
Écartée : ouvre l'API à toute origine, sans bénéfice par rapport à une liste explicite.

### Option B — Proxy de développement Angular CLI uniquement
Écartée : règle le problème en dev mais laisse la prod sans politique CORS, ce qui casserait le frontend conteneurisé.

### Option C — Désactiver CORS et servir le frontend depuis le même backend
Écartée : remettrait en question [ADR-0002](0002-architecture-full-stack-separee.md) (architecture découplée) pour un gain marginal.

## Références

- [`backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java`](../../backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java)
- [Spring Framework — CORS](https://docs.spring.io/spring-framework/reference/web/webmvc-cors.html)
- [OWASP — CORS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
