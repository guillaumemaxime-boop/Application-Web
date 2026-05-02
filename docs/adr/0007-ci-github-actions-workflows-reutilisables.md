# ADR-0007 : CI GitHub Actions avec workflows réutilisables

- **Statut** : Accepted
- **Date** : 2026-05-02
- **Décideurs** : Équipe Atelier Lumen
- **Tags** : ci, infra, qualité

## Contexte

Le projet a deux pipelines de tests bien distincts :

- **Backend** : `mvn clean test` (Java 25, Maven, JUnit 5)
- **Frontend** : `ng test` (Angular, Karma, ChromeHeadless)

Et une chaîne de **build + déploiement** qui doit consommer ces tests comme prérequis avant de construire les images Docker et redéployer sur la machine Rancher Desktop ([ADR-0006](0006-conteneurisation-docker-rancher.md)).

Initialement, les workflows `backend-tests.yml` et `frontend-tests.yml` étaient des workflows indépendants, déclenchés uniquement par `push` / `pull_request`. Le workflow `build-and-deploy.yml` les référençait via `uses: ./.github/workflows/...` — ce qui exigeait que les workflows cibles déclarent le trigger `workflow_call`. Sans ce trigger, GitHub remontait l'erreur "Unable to find reusable workflow".

## Décision

**Structurer la CI en workflows réutilisables** via `workflow_call` :

- `backend-tests.yml` et `frontend-tests.yml` déclarent les triggers `push`, `pull_request`, `workflow_call`, `workflow_dispatch`
- `build-and-deploy.yml` orchestre la chaîne complète :
  1. `backend-test` → `uses: ./.github/workflows/backend-tests.yml`
  2. `frontend-test` → `uses: ./.github/workflows/frontend-tests.yml`
  3. `build` (Docker images) — `needs: [backend-test, frontend-test]`
  4. `deploy` / `redeploy-rancher` — `needs: build`, gardé par `if: github.ref == 'refs/heads/main'`
- `workflow_dispatch` est ajouté pour permettre un déclenchement manuel depuis l'UI GitHub
- Concurrency configurée sur `build-and-deploy` pour éviter les déploiements concurrents

## Conséquences

### Positives
- Une seule définition pour chaque suite de tests, consommable depuis n'importe quel pipeline (PR, build, déploiement, déclenchement manuel)
- Les changements de la logique de test n'ont à être faits qu'à un seul endroit
- `build-and-deploy` reste lisible : il orchestre, il ne réimplémente pas
- Possibilité de déclencher chaque workflow indépendamment via `workflow_dispatch`

### Négatives / compromis
- Couplage fort entre `build-and-deploy` et les noms/chemins des workflows enfants (renommer un fichier casse la chaîne)
- L'extension VSCode YAML peut faire des faux positifs sur les workflows réutilisables locaux jusqu'à ce que `workflow_call` soit déclaré

### Neutres
- Les artefacts (rapports JUnit, coverage) restent uploadés par chaque workflow enfant, indépendamment de leur appelant

## Alternatives envisagées

### Option A — Tout inliner dans `build-and-deploy.yml`
Écartée : duplique la logique de test si on veut aussi des runs sur PR. Et un fichier monolithique devient vite illisible.

### Option B — Composite Actions (`action.yml`) au lieu de workflows réutilisables
Écartée : les composite actions ne peuvent pas définir leurs propres `jobs` ni leurs propres runners — moins flexible que `workflow_call` pour ce cas d'usage.

### Option C — CI externe (CircleCI, GitLab CI)
Écartée : le projet est sur GitHub, pas de raison d'introduire une plateforme tierce.

## Références

- [`.github/workflows/backend-tests.yml`](../../.github/workflows/backend-tests.yml)
- [`.github/workflows/frontend-tests.yml`](../../.github/workflows/frontend-tests.yml)
- [`.github/workflows/build-and-deploy.yml`](../../.github/workflows/build-and-deploy.yml)
- [GitHub Docs — Reusing workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
