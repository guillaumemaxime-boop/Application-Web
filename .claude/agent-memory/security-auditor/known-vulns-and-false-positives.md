---
name: known-vulns-and-false-positives
description: Vulnérabilités confirmées, faux positifs récurrents et décisions de sécurité documentées pour ce projet
metadata:
  type: project
---

## Faux positifs récurrents — NE PAS RE-SIGNALER

### WebConfig.java est intentionnellement vide
`backend/src/main/java/com/atelier/portfolio/config/WebConfig.java` ne contient que le package et un commentaire. C'est voulu — le CORS est géré dans SecurityConfig. Ne pas signaler l'absence de configuration CORS dans WebConfig.

### path traversal sur loadAsResource() — PROTÉGÉ
`PhotoService.loadAsResource()` utilise `.resolve(filename).normalize()` sur un filename issu de la base de données (UUID généré par le service, pas le nom client). Pas de path traversal possible dans ce flux.

### bypassSecurityTrustResourceUrl dans story-viewer et story-inline — SÉCURISÉ
`parseVideoUrl()` filtre strictement via regex avant que `bypassSecurityTrustResourceUrl` ne soit appelé. Seules les URLs YouTube et Vimeo avec des IDs alphanumériques passent. La CSP `frame-src` est cohérente. Ne pas signaler comme critique.

### CSRF désactivé — INTENTIONNEL ET CORRECT
L'API est 100% stateless (JWT Bearer header, pas de cookies de session). La désactivation CSRF est justifiée et correcte pour ce pattern. Signaler uniquement si des cookies de session sont introduits.

### anyRequest().authenticated() protège les endpoints hors /api/admin/**
`POST /api/photos`, `DELETE /api/photos/{id}`, `PUT /api/photos/{id}/tags`, `PUT /api/content` sont protégés par `anyRequest().authenticated()`. Ils ne sont pas accessibles sans JWT. La faille est architecturale (convention brisée), pas fonctionnelle.

## Vulnérabilités confirmées (audit juin 2026) — EN ATTENTE DE CORRECTION

### [XSS stocké] [innerHTML] dans home.component.ts:21
- Vecteur : `home.hero.title` depuis SiteContent → `[innerHTML]` avec `replace(/\n/g, '<br/>')`
- Contexte : accessible aux admins authentifiés uniquement, mais JWT dans localStorage = exposé si XSS
- Statut : non corrigé à la date de l'audit
- Correction recommandée : remplacer `[innerHTML]` par interpolation + `white-space:pre-line`

### [Absence MIME validation] Upload photos sans magic bytes check
- Fichier : `PhotoService.store()` — seule l'extension fournie par le client est utilisée
- Risk : upload de HTML/SVG servi inline potentiellement exploitable en XSS
- Statut : non corrigé
- Correction recommandée : whitelist extensions + validation magic bytes + `Content-Disposition: attachment`

### [Pas de rate-limiting] POST /api/auth/login
- Brute-force possible sur le seul compte admin
- Statut : non corrigé
- Correction recommandée : Bucket4j ou rate-limiting Railway

### [Secret exposé en git] deploy/envs/local/.env tracé
- Contient ADMIN_PASSWORD_HASH et JWT_SECRET (valeurs locales)
- Statut : non corrigé
- Correction : ajouter deploy/envs/local/.env au .gitignore

### [Supply chain] crane installé depuis /releases/latest/ dans sync-production.yml
- sync-staging.yml utilise v0.20.3 épinglé, sync-production.yml utilise latest
- Statut : non corrigé

### [CSP absente sur SPA] Nginx ne positionne pas les headers de sécurité
- CSP définie dans SecurityConfig ne couvre que /api/**, pas index.html
- X-Content-Type-Options manquant sur Nginx
- Statut : non corrigé

## Décisions de sécurité documentées

- Admin single-tenant par design : un seul utilisateur, credentials en env vars (pas de table users)
- JWT stateless par design : pas de révocation, TTL 24h (recommandation : réduire à 1-4h)
- `secrets: inherit` dans build-and-deploy.yml : tous les jobs héritent des secrets — acceptable pour les workflows internes, attention si des actions tierces non épinglées sont ajoutées

**Why:** Audit global initial, juin 2026
**How to apply:** Vérifier ce fichier avant de signaler un finding pour éviter les doublons avec des faux positifs déjà analysés
