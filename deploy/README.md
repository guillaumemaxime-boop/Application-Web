# Deployment — pragmatic GitOps

```
push to main
  │
  ▼
build-and-deploy.yml
  ├─ run tests (backend + frontend)
  ├─ build & push images to GHCR (tag :<sha> + :latest)
  └─ commit deploy/envs/staging/versions.yaml with the new SHA  [skip ci]
        │
        ▼
sync-staging.yml  (triggered by the bump commit)
  ├─ retag GHCR image :<sha> → :staging
  └─ railway redeploy (staging service)

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

## Railway service one-time setup

For each Railway service (backend × {staging, prod}, frontend × {staging, prod}), set the **image source** to the floating tag corresponding to its environment:

- staging backend → `ghcr.io/<owner>/portfolio-backend:staging`
- staging frontend → `ghcr.io/<owner>/portfolio-frontend:staging`
- production backend → `ghcr.io/<owner>/portfolio-backend:production`
- production frontend → `ghcr.io/<owner>/portfolio-frontend:production`

The sync workflows move those floating tags to point at the SHA recorded in `versions.yaml`, then tell Railway to redeploy.

## Rollback

Revert the commit that bumped `versions.yaml`. The corresponding sync workflow will re-run with the previous SHA and Railway will pull the (still-immutable) older image.
