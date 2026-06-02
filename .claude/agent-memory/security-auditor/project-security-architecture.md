---
name: project-security-architecture
description: Configuration de sécurité centrale du projet — JWT, CORS, CSP, BCrypt, endpoints, secrets, déploiement Railway
metadata:
  type: project
---

## Authentification & JWT

- Classe centrale : `backend/src/main/java/com/atelier/portfolio/config/JwtUtil.java`
- Filtre : `JwtAuthenticationFilter.java` — placé before `UsernamePasswordAuthenticationFilter`
- Algorithme : HMAC (HS256/384/512 selon la taille de la clé) via JJWT 0.12.6
- Secret : variable d'env `JWT_SECRET` — obligatoire en prod, pas de fallback
- TTL par défaut : `JWT_EXPIRATION_MS=86400000` (24h) — considéré trop long, recommandation de réduire à 1-4h
- Admin single-tenant : credentials depuis `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (BCrypt), pas de table users
- Timing attack neutralisé dans `AuthController.java:37` — passwordEncoder.matches() s'exécute toujours

## Chaîne d'autorisation Spring Security

```
/api/auth/**         → permitAll
/actuator/health     → permitAll
/error               → permitAll
POST /api/contact    → permitAll
/api/admin/**        → authenticated (JWT requis)
GET /api/**          → permitAll (catalogue public en lecture)
anyRequest           → authenticated (protège POST/PUT/DELETE hors /api/admin/**)
```

**Points d'attention :**
- `PUT /api/content` et `POST/DELETE /api/photos` ne sont PAS sous `/api/admin/**` mais sont protégés par `anyRequest().authenticated()` — risque de régression si une règle permissive est ajoutée
- Recommandation non encore appliquée : déplacer ces endpoints sous `/api/admin/`

## CORS

- Configuré uniquement dans `SecurityConfig.corsConfigurationSource()` — `WebConfig.java` est intentionnellement vide (ne pas y toucher)
- Valeur par défaut autorisée : `http://localhost:4200`, `http://localhost`, `http://127.0.0.1`, `https://*.up.railway.app`
- Variable prod : `APP_CORS_ALLOWED_ORIGINS` (comma-separated, supports patterns)
- Méthodes autorisées : GET, POST, PUT, DELETE, OPTIONS
- Headers autorisés : Content-Type, Authorization, Accept
- `allowCredentials` non activé (inutile, pas de cookies)

## CSP (Content Security Policy)

- Définie dans `SecurityConfig.java` sur les réponses backend `/api/**`
- **ATTENTION** : Nginx ne positionne PAS la CSP sur `index.html` — la CSP n'est donc pas appliquée au frontend Angular par le navigateur
- Directives backend : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-src 'self' https://www.youtube.com https://player.vimeo.com; frame-ancestors 'none'`
- Recommandation non appliquée : ajouter les mêmes headers dans nginx.conf pour le SPA

## Upload de fichiers

- Endpoint : `POST /api/photos` (pas sous /api/admin/)
- Service : `PhotoService.store()` — UUID comme nom de fichier (sécurisé)
- Répertoire : `app.upload.dir` (env `UPLOAD_DIR:/data/uploads`)
- Path traversal : protégé par `.resolve().normalize()` dans `loadAsResource()`
- **Faille non corrigée** : pas de validation MIME réelle, seule l'extension client est vérifiée
- Taille max : 50MB (Spring) + 50MB (nginx client_max_body_size)

## Secrets critiques et localisation

- `JWT_SECRET` : variable d'env obligatoire (pas de valeur par défaut en prod)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` : variables d'env, hash BCrypt
- `RESEND_API_KEY` : variable d'env, vide = mode dégradé sans erreur
- `RAILWAY_TOKEN_STAGING` / `RAILWAY_TOKEN_PRODUCTION` : secrets GitHub Actions
- `UMAMI_APP_SECRET` : dans `docker-compose.yml` avec fallback faible (à ne pas utiliser en prod)
- `deploy/envs/local/.env` : **TRACÉ EN GIT** — contient le hash admin et des secrets locaux

## Dépendances notables

- Spring Boot 4.0.0, Java 25
- JJWT 0.12.6 (dernière version au moment de l'audit juin 2026)
- Angular 21, TypeScript ~5.9.0
- PostgreSQL 16 en prod, H2 en mode PostgreSQL pour les tests
- Liquibase pour les migrations (ddl-auto=validate)
- Caffeine cache (présent, utilisable pour rate-limiting)
- Resend SDK 4.0.0 pour les emails transactionnels

## Pipeline CI/CD

- Build déclenché sur push main → backend-tests + frontend-tests → build images → bump staging
- Images taguées par SHA commit court (12 chars)
- Production protégée par GitHub Environment "production" (reviewers requis)
- `sync-production.yml` installe `crane` depuis `/releases/latest/` — risque supply chain (staging utilise v0.20.3 épinglé)
- GitHub Actions non épinglées par SHA digest

## Patterns Nginx (frontend)

- Proxy `/api/` → backend:8080
- Proxy `/umami/api/send`, `/share/`, `/_next/`, `/api/share/`, `/api/websites/` → umami
- `/umami/` autres routes → 404 (Umami admin UI non exposée)
- `client_max_body_size 50M` sur `/api/`
- Aucun header de sécurité (CSP, HSTS, X-Content-Type-Options, X-Frame-Options) dans nginx — à corriger

**Why:** Audit global initial du projet, juin 2026
**How to apply:** Référence rapide pour les audits futurs — ne pas re-signaler les points positifs comme des failles
