# ADR-0009 : CORS restreint aux origines de développement local

- **Statut** : Accepted
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

Configurer CORS dans `WebConfig.java` avec une **liste blanche d'origines** correspondant aux contextes attendus :

- `http://localhost:4200` — `ng serve` en développement
- `http://localhost` — frontend conteneurisé servi sur le port 80
- `http://127.0.0.1*` — variantes loopback pour la machine de démo
- Méthodes autorisées : `GET, POST, PUT, DELETE, OPTIONS`
- En-têtes : `*` (acceptables pour une API publique en lecture)
- `maxAge: 3600` — cache du preflight pendant 1h
- **`allowCredentials` n'est PAS activé** : aucune donnée de session ne traverse l'origine, donc le risque CSRF lié aux credentials cross-origin est neutralisé même si les patterns d'origine étaient permissifs

La configuration est appliquée uniquement au préfixe `/api/**`.

## Conséquences

### Positives
- L'API reste utilisable depuis le frontend conteneurisé et depuis `ng serve` sans configuration côté client
- Pas de wildcard `*` global qui exposerait l'API à n'importe quelle origine
- Pas de cookies cross-origin → pas de surface CSRF même en cas de mauvaise configuration future

### Négatives / compromis
- Le pattern `http://127.0.0.1*` est large : il matche par exemple `http://127.0.0.1.evil.com`. Tant que `allowCredentials` reste désactivé et que l'API reste en lecture seule, ce n'est pas exploitable. **À durcir lors de l'ouverture de toute route mutative ou de l'ajout de sessions** (cf. ADR à venir sur l'authentification).
- Toute nouvelle origine de production devra être ajoutée explicitement (ce qui est intentionnel)

### Neutres
- L'absence d'authentification ne nécessite pas, à ce stade, de complexifier la politique CORS

## Alternatives envisagées

### Option A — `allowedOrigins("*")` permissif
Écartée : ouvre l'API à toute origine, sans bénéfice par rapport à une liste explicite.

### Option B — Proxy de développement Angular CLI uniquement
Écartée : règle le problème en dev mais laisse la prod sans politique CORS, ce qui casserait le frontend conteneurisé.

### Option C — Désactiver CORS et servir le frontend depuis le même backend
Écartée : remettrait en question [ADR-0002](0002-architecture-full-stack-separee.md) (architecture découplée) pour un gain marginal.

## Références

- [`backend/src/main/java/com/atelier/portfolio/config/WebConfig.java`](../../backend/src/main/java/com/atelier/portfolio/config/WebConfig.java)
- [Spring Framework — CORS](https://docs.spring.io/spring-framework/reference/web/webmvc-cors.html)
- [OWASP — CORS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
