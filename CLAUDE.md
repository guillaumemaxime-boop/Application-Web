# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Full-stack portfolio for an art/furniture studio. Backend is Spring Boot 4 (Java 25) serving a REST API; frontend is Angular 21 (standalone components, signals, new control flow). Public read-only catalog + JWT-protected admin/CMS at `/admin`.

Codebase language is **French** (UI copy, ADRs, commit messages). Keep new copy and docs in French unless asked otherwise.

## Commands

### Backend ([backend/](backend/))
```powershell
cd backend
mvn spring-boot:run    # dev server on :8080 (needs Postgres reachable — see "Local stack" below)
mvn test               # full unit + integration tests (uses H2 in PostgreSQL mode, runs full Liquibase changelog)
mvn -Dtest=FurnitureServiceTest test                   # single test class
mvn -Dtest=FurnitureServiceTest#findBySlug test        # single test method
mvn clean package      # build JAR (skip tests with -DskipTests)
```
Note: README mentions `./mvnw` but there is no Maven wrapper checked in — use system `mvn`.

JaCoCo report after `mvn test` → [backend/target/site/jacoco/index.html](backend/target/site/jacoco/index.html).

### Frontend ([frontend/](frontend/))
```powershell
cd frontend
npm install
npm start                                              # dev server on :4200 with /api → :8080 proxy
npm test                                               # Karma + Jasmine; FirefoxHeadless locally, ChromeHeadless in CI
npx ng test --watch=false --include='**/auth.service.spec.ts'   # single spec
npx ng test --watch=false --code-coverage              # coverage (80% threshold enforced by karma.conf.js)
npm run build                                          # prod build → frontend/dist/portfolio-frontend/browser
```

### Local stack (Postgres + backend + frontend in Docker)
```powershell
docker compose up --build         # full stack on :4200 (web) + :8080 (api) + :5432 (db)
docker compose -f docker-compose.test.yml run --rm backend-test    # backend tests in container
docker compose -f docker-compose.test.yml run --rm frontend-test   # frontend tests in container
```

## Architecture

### Backend layout (`com.atelier.portfolio.*`)
Standard Spring Boot layered structure: `controller` → `service` → `repository` (JPA) → `entity`. `model/` holds DTOs/records used at the HTTP boundary; entities never leak into controllers.

Two parallel controller families:
- **Public read**: `FurnitureController`, `ExhibitionController`, `ProfileController`, `HomeController`, `PhotoController`, `SiteContentController` — all GET `/api/**` is permitAll.
- **Admin write**: `AdminCategoriesController`, `AdminExhibitionsMetaController`, `AdminHomeController`, `AdminStoriesController` — POST/PUT/DELETE require a Bearer JWT from `/api/auth/login`.

CMS-shaped domain: beyond `furniture` and `exhibitions`, there are layered editorial entities — `site_content` (free-form text blocks), `photos` (uploaded media on disk under `app.upload.dir`), `story_slides` (slideshows attached to a furniture or exhibition), `home_feed_entries` + `*_meta` (homepage ordering/visibility/hero text). Touch these together; the home page (`HomeService`) joins them.

### Database
- **PostgreSQL 16** in prod/dev, **H2 in PostgreSQL mode** for tests.
- **Liquibase** owns the schema. Migrations in [backend/src/main/resources/db/changelog/changes/](backend/src/main/resources/db/changelog/changes/), registered in `db.changelog-master.yaml`. Hibernate runs in `ddl-auto=validate` — never let Hibernate create tables; add a numbered changelog file instead.
- Tests run the **real changelog** against H2, so a broken migration breaks the test suite. This is deliberate.

### Security
- [SecurityConfig.java](backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java) is the source of truth: stateless JWT, CSRF off, CORS via `app.cors.allowed-origins` (env `APP_CORS_ALLOWED_ORIGINS`, comma-separated, supports `*` patterns).
- [JwtAuthenticationFilter.java](backend/src/main/java/com/atelier/portfolio/config/JwtAuthenticationFilter.java) runs before `UsernamePasswordAuthenticationFilter`. Admin user is single-tenant — credentials from `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (BCrypt) env vars, not a DB table.
- [WebConfig.java](backend/src/main/java/com/atelier/portfolio/config/WebConfig.java) is intentionally empty (CORS lives in SecurityConfig); don't reintroduce CORS handlers there.
- Strict CSP is set on responses — `script-src 'self'` only, no inline JS. Don't add inline `<script>` to served HTML.

### `DATABASE_URL` translation (Railway/Heroku)
Spring expects `jdbc:postgresql://...` but Railway provides `postgres://user:pass@host:port/db`. Two layers convert it:
1. [entrypoint.sh](backend/entrypoint.sh) — runs first in the container, exports `SPRING_DATASOURCE_URL` / username / password.
2. [DatabaseUrlEnvironmentPostProcessor.java](backend/src/main/java/com/atelier/portfolio/config/DatabaseUrlEnvironmentPostProcessor.java) — same logic inside the JVM, registered via `META-INF/spring.factories`, covers the case where the JVM is started without the entrypoint script.

Keep both in sync if you change the URL parsing.

### Frontend layout ([frontend/src/app/](frontend/src/app/))
- **No NgModules.** Bootstrap is `appConfig` in [app.config.ts](frontend/src/app/app.config.ts); routes use `loadComponent` for lazy loading.
- **State = signals**, not RxJS for component state. RxJS only for `HttpClient` observables.
- **Templates use `@if` / `@for` / `@empty` / `@else`**, not `*ngIf` / `*ngFor`. Match this style in new components.
- **Auth**: [auth.service.ts](frontend/src/app/services/auth.service.ts) stores JWT in `localStorage`, [auth.interceptor.ts](frontend/src/app/interceptors/auth.interceptor.ts) adds `Authorization: Bearer` and forces logout on 401/403, [auth.guard.ts](frontend/src/app/guards/auth.guard.ts) gates `/admin`.
- **HTTP proxy in dev**: `/api/*` is proxied to `localhost:8080` via [proxy.conf.json](frontend/proxy.conf.json). In prod, Nginx ([nginx.conf](frontend/nginx.conf)) proxies `/api/` to `BACKEND_HOST:BACKEND_PORT`.
- All API calls go through [portfolio.service.ts](frontend/src/app/services/portfolio.service.ts) — don't inject `HttpClient` in components.

### Deployment
See [deploy/README.md](deploy/README.md). Promotion model: GHCR holds immutable images tagged with the commit SHA; `deploy/envs/<env>/versions.yaml` records which SHA each environment runs; sync workflows retag `:<sha> → :<env>` and trigger Railway redeploys. Production promotion is a manual PR copying staging's `versions.yaml` to production's, gated by GitHub Environment `production`.

CI orchestration: [build-and-deploy.yml](.github/workflows/build-and-deploy.yml) calls `backend-tests.yml` + `frontend-tests.yml` as reusable workflows, then builds/pushes images, then calls `sync-staging.yml`. Local Rancher Desktop is updated by `sync-rancher.yml` on a self-hosted runner.

## Documentation

- **[docs/adr/](docs/adr/)** — Architecture Decision Records, numbered 0001+, status-tracked. The architectural source of truth. Adding/changing significant architecture → write a new ADR (don't rewrite an old one; supersede it).
- **[docs/SPECIFICATION_FONCTIONNELLE.md](docs/SPECIFICATION_FONCTIONNELLE.md)** and **[docs/SPECIFICATION_TECHNIQUE.md](docs/SPECIFICATION_TECHNIQUE.md)** — functional and technical specs.
- The README under [deploy/](deploy/README.md) is authoritative for the deploy flow; the root README is high-level and slightly behind on the DB (still mentions in-memory data — the project has since moved to Postgres + Liquibase, see ADR-0005's successor in practice).

## Conventions

- Commit messages: conventional-commits style in French (`feat(admin): …`, `fix(viewer): …`, `refactor(...)`). Recent history is a good reference.
- Java: prefer records for DTOs (project is on Java 25); entities are mutable classes with JPA annotations.
- Don't introduce frontend state-management libraries (NgRx etc.) — signals + services is the established pattern.
- Don't add `*ngIf`/`*ngFor` or NgModules to new components — codebase is fully on the new APIs.
- **Playwright (régression visuelle)** : ne JAMAIS créer ni régénérer des baselines Playwright avant validation visuelle manuelle de la page concernée par un humain. Le workflow est : (1) implémenter la page/feature, (2) la lancer en local (`npm start`) et valider visuellement le rendu, (3) seulement ensuite écrire ou mettre à jour le spec Playwright et régénérer les baselines. Les baselines générées avant validation gravent dans le marbre un look qui n'a pas été validé.
