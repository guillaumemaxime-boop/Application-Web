# Deployment — pragmatic GitOps

```
push to main
  │
  ▼
build-and-deploy.yml
  ├─ run tests (backend + frontend)
  ├─ build & push images to GHCR (tag :<sha> + :latest)
  ├─ commit deploy/envs/staging/versions.yaml with the new SHA  [skip ci]
  └─ call sync-staging.yml directly (workflow_call)
        │
        ▼
sync-staging.yml
  ├─ retag GHCR image :<sha> → :staging
  ├─ railway redeploy (staging service)
  └─ verify deployment status

humain ─► PR copying the SHA from staging → production/versions.yaml
        │
        ▼
sync-production.yml  (gated by GitHub Environment "production")
  ├─ retag GHCR image :<sha> → :production
  └─ railway redeploy (production service)

push to main (any change to deploy/envs/local/**)
  │
  ▼
sync-rancher.yml  (self-hosted runner on Rancher Desktop)
  └─ docker compose -f deploy/base/docker-compose.yml --env-file ... up -d --pull always
```

## Layout

| File | Role |
|------|------|
| `base/docker-compose.yml` | Image-based compose. Same definition for local Rancher Desktop and any other compose host. No `build:` blocks. |
| `envs/<env>/versions.yaml` | **Source of truth**: which image SHA each environment runs. |
| `envs/local/.env` | docker-compose env file consumed by the Rancher runner. Mirrors `versions.yaml`. |

## Promoting a build

1. **Local** is bumped automatically alongside staging on every main push (you can pin a specific SHA by editing `versions.yaml` if needed; the auto-bump always overwrites with the latest).
2. **Staging** is bumped automatically.
3. **Production**: open a PR that copies `staging/versions.yaml` → `production/versions.yaml`, get it reviewed, merge. The production sync workflow is gated by the GitHub Environment `production` (required reviewers).

## Required secrets

| Secret | Where | Used by |
|--------|-------|---------|
| `GITHUB_TOKEN` | auto-provided | push to GHCR + git push the bump commit |
| `RAILWAY_TOKEN_STAGING` | repo secrets | sync-staging.yml |
| `RAILWAY_TOKEN_PRODUCTION` | environment `production` | sync-production.yml |
| `RAILWAY_SERVICE_BACKEND_STAGING` | repo vars | service id of the staging backend |
| `RAILWAY_SERVICE_FRONTEND_STAGING` | repo vars | service id of the staging frontend |
| `RAILWAY_SERVICE_BACKEND_PRODUCTION` | environment `production` vars | id of the prod backend |
| `RAILWAY_SERVICE_FRONTEND_PRODUCTION` | environment `production` vars | id of the prod frontend |

> **Note :** `sync-staging.yml` est appelé directement via `workflow_call` depuis `build-and-deploy.yml`.
> Il reste aussi déclenché par tout push manuel sur `deploy/envs/staging/versions.yaml` (rollback, hotfix).

## Railway service one-time setup

For each Railway service (backend × {staging, prod}, frontend × {staging, prod}), set the **image source** to the floating tag corresponding to its environment:

- staging backend → `ghcr.io/<owner>/portfolio-backend:staging`
- staging frontend → `ghcr.io/<owner>/portfolio-frontend:staging`
- production backend → `ghcr.io/<owner>/portfolio-backend:production`
- production frontend → `ghcr.io/<owner>/portfolio-frontend:production`

The sync workflows move those floating tags to point at the SHA recorded in `versions.yaml`, then tell Railway to redeploy.

## Umami comme service séparé

Par défaut, Umami est co-localisé : un conteneur `umami` dans la même stack que le frontend (`docker-compose.yml`, `deploy/base/docker-compose.yml`). Le Nginx du frontend le joint via `UMAMI_HOST=umami` / `UMAMI_PORT=3000` (défauts de l'image).

Pour déployer Umami comme service séparé sur Railway :

1. Créer un service Umami dédié depuis l'image `ghcr.io/umami-software/umami:postgresql-vX.Y.Z` (même tag pinné que dans les fichiers compose).
2. Conserver son `DATABASE_URL` vers la Postgres Railway, schéma `umami` — configuration inchangée.
3. Sur le service **frontend** Railway, définir les variables d'environnement `UMAMI_HOST=<service-umami>.railway.internal` et `UMAMI_PORT=3000`.
4. Le service Umami n'a pas besoin d'un domaine public : le frontend le proxifie via le réseau privé Railway, le navigateur ne voit que des URLs `/umami*` same-origin.

Le proxy Nginx résout l'upstream Umami au démarrage du conteneur ; si le service Umami redémarre et change d'IP interne, redéployer le frontend pour reprendre la résolution.

## Rollback

Revert the commit that bumped `versions.yaml`. The corresponding sync workflow will re-run with the previous SHA and Railway will pull the (still-immutable) older image.
