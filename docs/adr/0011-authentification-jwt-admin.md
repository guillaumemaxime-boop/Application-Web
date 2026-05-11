# ADR-0011 : Authentification JWT pour l'interface d'administration

- **Statut** : Accepted
- **Date** : 2026-05-11
- **Décideurs** : Maxime Guillaume
- **Tags** : backend, frontend, sécurité, authentification, jwt

## Contexte

L'interface d'administration (`/admin`) permet de créer, modifier et supprimer des pièces et des expositions via l'API REST. Sans protection, n'importe quel visiteur connaissant l'URL peut altérer le catalogue.

Le projet a un unique administrateur (Milo Guillaume). Les contraintes sont :
- Pas de gestion multi-utilisateurs requise
- Pas de session serveur (architecture stateless, voir [ADR-0002](0002-architecture-full-stack-separee.md))
- Déploiement sur Railway — pas de cookie sécurisé cross-domain sans configuration SSL supplémentaire
- Identifiants stockés côté serveur uniquement (pas de base utilisateurs)

## Décision

Implémenter une **authentification par token JWT** (JSON Web Token) :

### Backend (Spring Boot)

- `AuthController` expose `POST /api/auth/login` (`permitAll`) — vérifie username + bcrypt hash, retourne un JWT signé HS384
- `JwtUtil` génère et valide les tokens (expiration configurable, défaut 24h)
- `JwtAuthenticationFilter` inspecte l'en-tête `Authorization: Bearer <token>` sur chaque requête et injecte le principal dans le `SecurityContext`
- `SecurityConfig` (`SecurityFilterChain`) protège toutes les routes mutatives (`POST/PUT/DELETE /api/**`) — les `GET` restent publics
- Identifiants configurés via variables d'environnement : `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (bcrypt `$2b$`), `JWT_SECRET`, `JWT_EXPIRATION_MS`

### Frontend (Angular)

- `AuthService` : appelle `/api/auth/login`, stocke le token JWT en `localStorage`, expose un signal `isLoggedIn` (vérifie l'expiration à l'initialisation)
- `authGuard` (`CanActivateFn`) : redirige vers `/login` si `isLoggedIn()` est faux
- `authInterceptor` (`HttpInterceptorFn`) : injecte `Authorization: Bearer <token>` sur toutes les requêtes sortantes ; sur 401/403, appelle `logout()` et redirige vers `/login`
- `LoginComponent` (`/login`) : formulaire réactif, affiche un message d'erreur sur 401
- Le lien "Admin" est retiré du menu de navigation principal — l'accès se fait uniquement par URL directe (`/admin`)

## Conséquences

### Positives
- L'API mutative est protégée contre les accès non authentifiés
- Architecture stateless conservée — aucune session serveur
- Le token JWT contient l'expiration : pas d'état à maintenir côté backend
- Les identifiants ne sont jamais exposés dans le code source (variables d'environnement)
- Le lien admin absent du menu réduit l'exposition de la surface d'administration

### Négatives / compromis
- Token stocké en `localStorage` — vulnérable au XSS (atténué par la CSP `script-src 'self'` en place)
- Pas de refresh token — l'administrateur doit se reconnecter après 24h
- Révocation impossible sans liste noire côté serveur (non implémentée — acceptable pour un usage mono-utilisateur)
- Hash bcrypt en variable d'environnement : rotation manuelle du mot de passe nécessite un redéploiement

### Neutres
- Un seul compte administrateur : pas de RBAC requis à ce stade
- La clé `JWT_SECRET` en local (docker-compose.yml) est une valeur de développement — à remplacer impérativement en production

## Alternatives envisagées

### Option A — Session HTTP côté serveur (Spring Session)
Écartée : nécessite un stockage partagé (Redis) incompatible avec l'architecture stateless et le déploiement Railway sans services additionnels.

### Option B — OAuth2 / OpenID Connect (ex. Auth0, Google)
Écartée : complexité disproportionnée pour un unique administrateur ; dépendance externe non justifiée.

### Option C — Basic Auth HTTP
Écartée : les identifiants transitent en base64 à chaque requête ; moins adapté à une SPA Angular où le token doit être stocké côté client.

### Option D — Cookie `HttpOnly` + CSRF token
Écartée : configuration CORS/cookie cross-domain plus complexe sur Railway ; le stockage `localStorage` avec CSP stricte offre un niveau de sécurité acceptable pour ce cas d'usage.

## Références

- [`backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java`](../../backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java)
- [`backend/src/main/java/com/atelier/portfolio/config/JwtUtil.java`](../../backend/src/main/java/com/atelier/portfolio/config/JwtUtil.java)
- [`backend/src/main/java/com/atelier/portfolio/controller/AuthController.java`](../../backend/src/main/java/com/atelier/portfolio/controller/AuthController.java)
- [`frontend/src/app/services/auth.service.ts`](../../frontend/src/app/services/auth.service.ts)
- [`frontend/src/app/guards/auth.guard.ts`](../../frontend/src/app/guards/auth.guard.ts)
- [`frontend/src/app/interceptors/auth.interceptor.ts`](../../frontend/src/app/interceptors/auth.interceptor.ts)
- [RFC 7519 — JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [OWASP — JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
