# ADR-0008 : Stratégie de tests — JUnit côté backend, Karma/Jasmine côté frontend

- **Statut** : Accepted
- **Date** : 2026-05-02
- **Décideurs** : Équipe Atelier Lumen
- **Tags** : tests, qualité

## Contexte

Le projet doit garantir un niveau de qualité raisonnable malgré une équipe restreinte :

- Couvrir la logique métier (services, mapping JSON, contrats REST)
- Détecter les régressions UI (composants Angular, navigation, gestion d'erreur HTTP)
- Tourner en CI à chaque PR sans dépendance externe (BDD, navigateur graphique)

L'écosystème par défaut côté Spring Boot est **JUnit 5 + Spring Test** (déjà inclus via `spring-boot-starter-test`). Côté Angular, **Karma + Jasmine** restent l'outillage par défaut du CLI ; les alternatives (Jest, Vitest) demandent une configuration manuelle non négligeable.

## Décision

Adopter **deux stacks de test alignés sur les outillages par défaut** de chaque écosystème :

- **Backend** : JUnit 5, AssertJ, Spring Test (`@SpringBootTest`, `@WebMvcTest`)
  - Tests unitaires pour les services et les contrôleurs
  - Rapports Surefire publiés via `mikepenz/action-junit-report`
- **Frontend** : Karma + Jasmine en mode **ChromeHeadless**
  - `npx ng test --watch=false --browsers=ChromeHeadless --code-coverage`
  - Spec files colocalisés (`*.spec.ts`) à côté des composants/services
  - Couverture Istanbul générée dans `frontend/coverage/`, uploadée comme artefact CI
- Les pipelines de tests sont **réutilisables** ([ADR-0007](0007-ci-github-actions-workflows-reutilisables.md)) et bloquent le build Docker en cas d'échec
- Ajout de `frontend/coverage/` au `.gitignore` (artefact de build, pas du code source)

## Conséquences

### Positives
- Outillage standard, zéro configuration exotique → onboarding rapide
- ChromeHeadless permet d'exécuter les tests Angular en CI sans serveur graphique
- Les rapports JUnit XML alimentent l'UI GitHub avec un compte rendu détaillé par test
- Couverture frontend disponible localement et en CI

### Négatives / compromis
- Karma est officiellement en mode maintenance — une migration future vers Jest ou Vitest est probable et fera l'objet d'un nouvel ADR le moment venu
- Pas de tests end-to-end (Cypress, Playwright) à ce stade
- Pas d'intégration tests qui frappent une vraie BDD — non bloquant tant que [ADR-0005](0005-donnees-en-memoire.md) tient

### Neutres
- Les fichiers générés sous `frontend/coverage/**` ne sont pas pertinents pour les revues : ce sont des artefacts d'exécution

## Alternatives envisagées

### Option A — Jest pour le frontend
Écartée pour l'instant : nécessite un setup non trivial avec Angular (preset, transformers TypeScript). Reportée au moment où Karma sera réellement déprécié.

### Option B — Tests E2E Cypress dès le départ
Écartée : coût d'écriture et d'exécution non justifié sur un projet en lecture seule avec un volume de pages limité. À reconsidérer quand l'espace admin arrivera.

### Option C — Pas de couverture
Écartée : la couverture, même imparfaite, sert de signal sur les zones non testées et empêche la dérive silencieuse.

## Références

- [`.github/workflows/backend-tests.yml`](../../.github/workflows/backend-tests.yml)
- [`.github/workflows/frontend-tests.yml`](../../.github/workflows/frontend-tests.yml)
- [`frontend/src/app/services/portfolio.service.spec.ts`](../../frontend/src/app/services/portfolio.service.spec.ts) — exemple de test service
