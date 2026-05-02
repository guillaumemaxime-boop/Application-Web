# ADR-0006 : Conteneurisation Docker + déploiement local Rancher Desktop

- **Statut** : Accepted
- **Date** : 2026-05-02
- **Décideurs** : Équipe Atelier Lumen
- **Tags** : infra, déploiement, docker

## Contexte

Le projet doit pouvoir tourner :

- En **développement local** sur les postes de l'équipe (Windows)
- En **environnement de démonstration** sur une machine locale dédiée chez l'artisan
- Potentiellement en **production cloud** plus tard

Les deux composants (backend Spring Boot, frontend Angular servi statiquement) ont des runtimes différents (JVM, navigateur). On souhaite une procédure de lancement reproductible, sans demander à l'utilisateur d'installer JDK + Node + serveur web.

Rancher Desktop est l'option Docker-compatible préférée sur Windows par l'équipe (licence gratuite, pas de Docker Desktop).

## Décision

**Conteneuriser** le backend et le frontend dans des images Docker indépendantes, **orchestrées par `docker-compose.yml`** à la racine du dépôt.

- `backend/Dockerfile` : build Maven multi-stage, image runtime JRE 25
- `frontend/Dockerfile` : build npm puis image servant les artefacts statiques (nginx ou équivalent)
- `docker-compose.yml` : orchestre les deux services et leur réseau
- Déploiement local : **self-hosted runner GitHub Actions** sur la machine cible avec Rancher Desktop, déclenché par le job `redeploy-rancher` de `build-and-deploy.yml`
- Les images publiables sont poussées sur Docker Hub depuis la branche `main`

## Conséquences

### Positives
- Procédure de lancement uniforme : `docker compose up -d --build`
- Les contributeurs n'ont pas à installer JDK 25 + Node 20 pour faire tourner l'app
- Les images sont identiques en local et en démo → moins de "ça marche chez moi"
- Le job CI `redeploy-rancher` reconstruit et redémarre la stack automatiquement

### Négatives / compromis
- Deux Dockerfiles à maintenir
- Le self-hosted runner doit rester provisionné et à jour sur la machine cible (cf. [`scripts/setup-rancher-runner.ps1`](../../scripts/setup-rancher-runner.ps1))
- Les secrets Docker Hub doivent être provisionnés dans le repo GitHub
- Premier `docker compose up --build` peut être long (téléchargement des images de base + dépendances Maven/npm)

### Neutres
- Le passage à un cloud managé (Cloud Run, Fly.io, Render) restera trivial une fois les images Docker fonctionnelles

## Alternatives envisagées

### Option A — Déploiement direct (JAR + dist statique)
Écartée : oblige à installer JDK et un serveur web sur la machine cible, et ne capture pas l'environnement de manière reproductible.

### Option B — Kubernetes en local (k3d, kind)
Écartée : sur-dimensionné pour 2 services, courbe d'apprentissage importante pour un gain opérationnel nul à cette échelle.

### Option C — Plateforme PaaS dès le départ (Heroku, Railway)
Écartée : coût récurrent et dépendance à un fournisseur tiers alors qu'une machine locale chez l'artisan suffit pour la démo.

## Références

- [`docker-compose.yml`](../../docker-compose.yml)
- [`.github/workflows/build-and-deploy.yml`](../../.github/workflows/build-and-deploy.yml) — job `redeploy-rancher`
- [`scripts/setup-rancher-runner.ps1`](../../scripts/setup-rancher-runner.ps1) — provisioning du runner
