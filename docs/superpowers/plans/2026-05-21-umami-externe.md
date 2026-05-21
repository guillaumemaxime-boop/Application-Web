# Umami sur une adresse externe — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'upstream Umami du Nginx frontend paramétrable (`UMAMI_HOST` / `UMAMI_PORT`) pour pouvoir déployer Umami comme service séparé, sans changer le proxy same-origin ni la CSP.

**Architecture:** Les six `proxy_pass` vers `umami:3000` codés en dur dans `nginx.conf` deviennent `${UMAMI_HOST}:${UMAMI_PORT}`, substitués au démarrage du conteneur par `envsubst` (mécanisme déjà utilisé pour `BACKEND_HOST`/`BACKEND_PORT`). Défauts `umami` / `3000` → comportement local strictement inchangé.

**Tech Stack:** Nginx (templates + `envsubst` via le docker-entrypoint officiel), Docker, docker-compose.

**Spec source:** [docs/superpowers/specs/2026-05-21-umami-externe-design.md](../specs/2026-05-21-umami-externe-design.md)

---

## File Structure

| Fichier | Statut | Responsabilité |
| ------- | ------ | -------------- |
| `frontend/nginx.conf` | Modification | 6 `proxy_pass` Umami passent à `${UMAMI_HOST}:${UMAMI_PORT}` |
| `frontend/Dockerfile` | Modification | Défauts `ENV` `UMAMI_HOST`/`UMAMI_PORT` + ajout au `NGINX_ENVSUBST_FILTER` |
| `docker-compose.yml` | Modification | Service `frontend` : env `UMAMI_HOST`/`UMAMI_PORT` |
| `deploy/base/docker-compose.yml` | Modification | Service `frontend` : env `UMAMI_HOST`/`UMAMI_PORT` |
| `deploy/README.md` | Modification | Nouvelle section « Umami comme service séparé » |
| `docs/adr/0012-mesure-audience-umami.md` | Modification | Une ligne dans « Conséquences › Neutres » |

Pas de test automatisé : la configuration Nginx n'est pas couverte par une suite de tests. La vérification est manuelle (`docker compose up --build` + `curl`), décrite en Task 3.

Toutes les modifications sont **infra/docs uniquement** — aucun changement du code Angular ni du backend.

---

## Task 1 : Paramétrer l'upstream Umami

Les fichiers de cette tâche sont interdépendants et doivent être commités ensemble : `nginx.conf` seul (avec `${UMAMI_HOST}` mais sans l'entrée dans `NGINX_ENVSUBST_FILTER`) produirait une image cassée (Nginx tenterait de résoudre un hôte littéralement nommé `${UMAMI_HOST}`).

**Files:**
- Modify: `frontend/nginx.conf`
- Modify: `frontend/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `deploy/base/docker-compose.yml`

- [ ] **Step 1.1 : Remplacer l'hôte Umami dans `nginx.conf`**

Dans `frontend/nginx.conf`, remplacer **les 6 occurrences** de la chaîne `http://umami:3000` par `http://${UMAMI_HOST}:${UMAMI_PORT}`. Les chemins après l'hôte ne changent pas. Les 6 lignes concernées :

```
proxy_pass http://umami:3000/script.js;       → proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/script.js;
proxy_pass http://umami:3000/api/send;        → proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/api/send;
proxy_pass http://umami:3000/share/;          → proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/share/;
proxy_pass http://umami:3000/_next/;          → proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/_next/;
proxy_pass http://umami:3000/api/share/;      → proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/api/share/;
proxy_pass http://umami:3000/api/websites/;   → proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/api/websites/;
```

Comme `http://umami:3000` est identique dans les 6 cas, un remplacement global de cette sous-chaîne suffit. Ne PAS toucher : le `resolver`, le bloc `location /umami/ { return 404; }`, les `proxy_set_header`, ni les `proxy_pass` vers le backend (`${BACKEND_HOST}`).

Vérifier après édition : `frontend/nginx.conf` ne contient plus aucune occurrence de `umami:3000`.

- [ ] **Step 1.2 : Étendre le bloc `ENV` du Dockerfile**

Dans `frontend/Dockerfile`, remplacer le bloc `ENV` existant :

```dockerfile
ENV PORT=80 \
    BACKEND_HOST=overflowing-stillness.railway.internal \
    BACKEND_PORT=8080 \
    UMAMI_WEBSITE_ID='' \
    UMAMI_SHARE_TOKEN='' \
    NGINX_ENVSUBST_FILTER='^(PORT|BACKEND_HOST|BACKEND_PORT|UMAMI_WEBSITE_ID|UMAMI_SHARE_TOKEN)$'
```

par :

```dockerfile
ENV PORT=80 \
    BACKEND_HOST=overflowing-stillness.railway.internal \
    BACKEND_PORT=8080 \
    UMAMI_HOST=umami \
    UMAMI_PORT=3000 \
    UMAMI_WEBSITE_ID='' \
    UMAMI_SHARE_TOKEN='' \
    NGINX_ENVSUBST_FILTER='^(PORT|BACKEND_HOST|BACKEND_PORT|UMAMI_HOST|UMAMI_PORT|UMAMI_WEBSITE_ID|UMAMI_SHARE_TOKEN)$'
```

Les défauts `UMAMI_HOST=umami` / `UMAMI_PORT=3000` reproduisent le comportement actuel. L'ajout au `NGINX_ENVSUBST_FILTER` est obligatoire : sans lui, `envsubst` ne substituerait pas `${UMAMI_HOST}` dans le template.

- [ ] **Step 1.3 : Ajouter les variables au service `frontend` du `docker-compose.yml` racine**

Dans `docker-compose.yml` (à la racine du repo), dans le bloc `environment:` du service `frontend`, insérer `UMAMI_HOST` et `UMAMI_PORT` entre `BACKEND_PORT` et `UMAMI_WEBSITE_ID`. Le bloc passe de :

```yaml
    environment:
      PORT: "80"
      BACKEND_HOST: backend
      BACKEND_PORT: "8080"
      UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}"
      UMAMI_SHARE_TOKEN: "${UMAMI_SHARE_TOKEN:-}"
```

à :

```yaml
    environment:
      PORT: "80"
      BACKEND_HOST: backend
      BACKEND_PORT: "8080"
      UMAMI_HOST: umami
      UMAMI_PORT: "3000"
      UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}"
      UMAMI_SHARE_TOKEN: "${UMAMI_SHARE_TOKEN:-}"
```

`UMAMI_HOST` est en littéral (`umami`, le nom du service Docker co-localisé), exactement comme `BACKEND_HOST: backend`. `UMAMI_PORT` est entre guillemets car YAML interpréterait `3000` comme un entier.

- [ ] **Step 1.4 : Ajouter les variables au service `frontend` du `deploy/base/docker-compose.yml`**

Dans `deploy/base/docker-compose.yml`, faire la **même modification** que Step 1.3. Le bloc `environment:` du service `frontend` passe de :

```yaml
    environment:
      PORT: "80"
      BACKEND_HOST: backend
      BACKEND_PORT: "8080"
      UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}"
      UMAMI_SHARE_TOKEN: "${UMAMI_SHARE_TOKEN:-}"
```

à :

```yaml
    environment:
      PORT: "80"
      BACKEND_HOST: backend
      BACKEND_PORT: "8080"
      UMAMI_HOST: umami
      UMAMI_PORT: "3000"
      UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}"
      UMAMI_SHARE_TOKEN: "${UMAMI_SHARE_TOKEN:-}"
```

- [ ] **Step 1.5 : Valider la syntaxe des fichiers compose**

Run depuis la racine du repo :

```powershell
docker compose -f docker-compose.yml config --quiet
docker compose -f deploy/base/docker-compose.yml config --quiet
```

Expected : aucune sortie, exit code 0 pour les deux (la commande `config` parse et valide le YAML ; `--quiet` supprime le dump). Si l'un échoue, lire le message — c'est une faute d'indentation YAML à corriger.

Note : `deploy/base/docker-compose.yml` référence des variables (`${BACKEND_IMAGE}`, etc.) ; `config` peut émettre un warning sur des variables non définies — c'est sans gravité, seul l'exit code et les erreurs de **syntaxe** comptent.

- [ ] **Step 1.6 : Commit**

```powershell
git add frontend/nginx.conf frontend/Dockerfile docker-compose.yml deploy/base/docker-compose.yml
git commit -m "feat(infra): rendre l'upstream Umami du Nginx parametrable (UMAMI_HOST/PORT)"
```

---

## Task 2 : Documentation

**Files:**
- Modify: `deploy/README.md`
- Modify: `docs/adr/0012-mesure-audience-umami.md`

- [ ] **Step 2.1 : Ajouter la section « Umami comme service séparé » dans `deploy/README.md`**

Dans `deploy/README.md`, juste **avant** la section `## Rollback`, insérer cette nouvelle section :

```markdown
## Umami comme service séparé

Par défaut, Umami est co-localisé : un conteneur `umami` dans la même stack que le frontend (`docker-compose.yml`, `deploy/base/docker-compose.yml`). Le Nginx du frontend le joint via `UMAMI_HOST=umami` / `UMAMI_PORT=3000` (défauts de l'image).

Pour déployer Umami comme service séparé sur Railway :

1. Créer un service Umami dédié depuis l'image `ghcr.io/umami-software/umami:postgresql-vX.Y.Z` (même tag pinné que dans les fichiers compose).
2. Conserver son `DATABASE_URL` vers la Postgres Railway, schéma `umami` — configuration inchangée.
3. Sur le service **frontend** Railway, définir les variables d'environnement `UMAMI_HOST=<service-umami>.railway.internal` et `UMAMI_PORT=3000`.
4. Le service Umami n'a pas besoin d'un domaine public : le frontend le proxifie via le réseau privé Railway, le navigateur ne voit que des URLs `/umami*` same-origin.

Le proxy Nginx résout l'upstream Umami au démarrage du conteneur ; si le service Umami redémarre et change d'IP interne, redéployer le frontend pour reprendre la résolution.
```

- [ ] **Step 2.2 : Ajouter une ligne à ADR-0012**

Dans `docs/adr/0012-mesure-audience-umami.md`, section `### Neutres`, après le dernier bullet existant (`- La rétention 14 mois ...`), ajouter :

```markdown
- L'upstream Umami du Nginx frontend est paramétrable (`UMAMI_HOST` / `UMAMI_PORT`) : Umami peut être déployé comme service séparé sans changer le proxy same-origin ni la CSP. Voir [`docs/superpowers/specs/2026-05-21-umami-externe-design.md`](../superpowers/specs/2026-05-21-umami-externe-design.md).
```

- [ ] **Step 2.3 : Commit**

```powershell
git add deploy/README.md docs/adr/0012-mesure-audience-umami.md
git commit -m "docs(infra): documenter le deploiement d'Umami comme service separe"
```

---

## Task 3 : Vérification locale

**Files:** aucun (vérification uniquement).

L'objectif : confirmer que la stack locale fonctionne **à l'identique** avec les défauts `UMAMI_HOST=umami` / `UMAMI_PORT=3000`.

- [ ] **Step 3.1 : Rebuild et redémarrer le frontend**

Run depuis la racine du repo :

```powershell
docker compose up -d --build frontend
```

Expected : le build de l'image frontend réussit, le conteneur `atelier-frontend` est recréé et démarre.

- [ ] **Step 3.2 : Vérifier que le tracker Umami est servi**

Run :

```powershell
curl.exe -s -o NUL -w "%{http_code} %{content_type}`n" http://localhost:4200/umami.js
```

Expected : `200` suivi d'un content-type JavaScript (`application/javascript` ou `text/javascript`). Cela prouve que le proxy `/umami.js → ${UMAMI_HOST}:${UMAMI_PORT}/script.js` fonctionne avec les défauts.

- [ ] **Step 3.3 : Vérifier que l'app et l'ingestion répondent**

Run :

```powershell
curl.exe -s -o NUL -w "app / -> %{http_code}`n" http://localhost:4200/
curl.exe -s -o NUL -w "env.js -> %{http_code}`n" http://localhost:4200/env.js
```

Expected : `200` pour les deux. `/env.js` doit renvoyer le littéral `window.__UMAMI__={...}` (les IDs peuvent être vides en local, c'est attendu).

- [ ] **Step 3.4 : Vérifier l'absence de régression dans les logs Nginx**

Run :

```powershell
docker logs atelier-frontend --tail 30
```

Expected : aucune erreur de type `could not be resolved` ou `invalid URL prefix` concernant `umami`. Si Nginx démarre proprement et le healthcheck passe (`docker ps` montre `healthy`), l'upstream est correctement résolu.

Aucun commit pour cette tâche — vérification uniquement.

---

## Self-review checklist (déjà exécutée par l'auteur du plan)

- Spec § « frontend/nginx.conf » → Task 1 Step 1.1 ✓
- Spec § « frontend/Dockerfile » → Task 1 Step 1.2 ✓
- Spec § « docker-compose.yml + deploy/base » → Task 1 Steps 1.3-1.4 ✓
- Spec § « deploy/README.md » → Task 2 Step 2.1 ✓
- Spec § « ADR-0012 » → Task 2 Step 2.2 ✓
- Spec § « Tests / vérification » → Task 3 ✓
- Spec § « deploy/envs/local/.env : aucun changement » → respecté, aucune tâche ne le touche ✓

## Critères d'acceptation finaux

- `frontend/nginx.conf` ne contient plus aucune occurrence de `umami:3000` ; les 6 `proxy_pass` Umami utilisent `${UMAMI_HOST}:${UMAMI_PORT}`.
- `frontend/Dockerfile` définit les défauts `UMAMI_HOST=umami` / `UMAMI_PORT=3000` et les inclut dans `NGINX_ENVSUBST_FILTER`.
- Les deux fichiers compose passent `docker compose config --quiet` sans erreur de syntaxe.
- En local, après `docker compose up -d --build frontend`, `GET /umami.js` renvoie le script tracker (HTTP 200) — comportement inchangé.
- `deploy/README.md` documente la bascule vers un service Umami Railway séparé.
- `docs/adr/0012-mesure-audience-umami.md` mentionne le paramétrage `UMAMI_HOST`/`UMAMI_PORT`.
