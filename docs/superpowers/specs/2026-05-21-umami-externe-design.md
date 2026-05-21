# Umami sur une adresse externe à l'application

**Date** : 2026-05-21
**Statut** : Spec validée, en attente du plan d'implémentation
**Périmètre** : infra frontend (Nginx, Dockerfile, docker-compose, docs)

## Contexte et problème

Aujourd'hui le serveur d'analytics Umami tourne comme un conteneur Docker (`umami:3000`) co-localisé dans la stack de l'application. Le Nginx du frontend proxifie six chemins same-origin vers ce conteneur via le nom de service Docker `umami`, codé en dur dans `frontend/nginx.conf`.

On veut pouvoir déployer Umami comme **service séparé** (un service Railway dédié, distinct du frontend et du backend), tout en gardant le frontend capable de le joindre.

Le choix same-origin d'ADR-0012 (le navigateur ne voit que des URLs `/umami*` de l'application, le Nginx relaie) est conservé : la CSP stricte `script-src 'self'` n'est pas touchée, aucun domaine tiers n'est introduit. Seul l'**upstream Nginx** doit devenir paramétrable.

## Décisions de conception validées

| Décision | Choix |
| -------- | ----- |
| Cible | Umami devient un service séparé (service Railway dédié / autre conteneur) |
| Routage navigateur | Le Nginx du frontend continue de proxifier (same-origin, CSP stricte conservée) |
| Canal réseau frontend → Umami | Réseau privé Railway (`<service>.railway.internal`), HTTP, pas de TLS upstream |
| Paramétrage | Deux variables `UMAMI_HOST` + `UMAMI_PORT`, miroir exact du pattern `BACKEND_HOST` / `BACKEND_PORT` existant |
| Code Angular | Inchangé — `main.ts`, `index.html`, `admin.component.ts` utilisent des chemins same-origin `/umami*` qui ne bougent pas |
| ADR | Pas de nouvel ADR ; une ligne ajoutée à la section « Conséquences › Neutres » d'ADR-0012 pointant vers ce spec |

## Architecture

Le navigateur continue de ne voir que des URLs `/umami*` servies par le frontend. Le seul changement : le Nginx du frontend résout son upstream Umami via deux variables d'environnement substituées au démarrage du conteneur (`envsubst`), au lieu du nom de service Docker codé en dur.

```text
Navigateur ──/umami.js, /umami/api/send, /umami/share/…──▶ Nginx (frontend)
                                                              │
                                          proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/…
                                                              │
                                                              ▼
                              local : conteneur «umami» (réseau atelier-net)
                              Railway : service Umami séparé (umami-xxx.railway.internal)
```

## Modifications

### 1. `frontend/nginx.conf`

Les six `proxy_pass` vers Umami passent de l'hôte codé en dur `umami:3000` à `${UMAMI_HOST}:${UMAMI_PORT}` :

| Location | Avant | Après |
| -------- | ----- | ----- |
| `location = /umami.js` | `proxy_pass http://umami:3000/script.js;` | `proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/script.js;` |
| `location = /umami/api/send` | `proxy_pass http://umami:3000/api/send;` | `proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/api/send;` |
| `location /umami/share/` | `proxy_pass http://umami:3000/share/;` | `proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/share/;` |
| `location ^~ /_next/` | `proxy_pass http://umami:3000/_next/;` | `proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/_next/;` |
| `location ^~ /api/share/` | `proxy_pass http://umami:3000/api/share/;` | `proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/api/share/;` |
| `location ^~ /api/websites/` | `proxy_pass http://umami:3000/api/websites/;` | `proxy_pass http://${UMAMI_HOST}:${UMAMI_PORT}/api/websites/;` |

Restent **inchangés** : le bloc `location /umami/ { return 404; }`, la directive `resolver`, tous les `proxy_set_header` (`Host $host`, `X-Real-IP`, `X-Forwarded-*`).

### 2. `frontend/Dockerfile`

Ajout de `UMAMI_HOST` / `UMAMI_PORT` au bloc `ENV` (avec défauts qui préservent le comportement local) et au filtre `NGINX_ENVSUBST_FILTER` :

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

Le filtre est requis : il limite `envsubst` aux variables listées pour ne pas détruire les `$variables` propres à Nginx (`$host`, `$remote_addr`, etc.).

### 3. `docker-compose.yml` (racine) et `deploy/base/docker-compose.yml`

Le service `frontend` gagne `UMAMI_HOST` / `UMAMI_PORT` en littéral, exactement comme `BACKEND_HOST: backend` (la stack locale garde toujours le conteneur `umami` co-localisé) :

```yaml
  frontend:
    environment:
      PORT: "80"
      BACKEND_HOST: backend
      BACKEND_PORT: "8080"
      UMAMI_HOST: umami
      UMAMI_PORT: "3000"
      UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}"
      UMAMI_SHARE_TOKEN: "${UMAMI_SHARE_TOKEN:-}"
```

Le service `umami` et le `depends_on: umami` du frontend restent **inchangés** dans les deux fichiers : en local (Docker / Rancher Desktop) Umami est toujours co-localisé.

`deploy/envs/local/.env` : **aucun changement** — `UMAMI_HOST` est figé dans le compose, ce n'est pas une variable d'interpolation.

### 4. `deploy/README.md`

Nouvelle sous-section « Umami comme service séparé » documentant la procédure Railway (voir ci-dessous).

### 5. `docs/adr/0012-mesure-audience-umami.md`

Une ligne ajoutée à la section « Conséquences › Neutres » : Umami peut être déployé comme service séparé en pointant `UMAMI_HOST` sur son adresse, cf. ce spec. La décision de fond (auto-hébergement, proxy same-origin, CSP stricte) reste valable.

## Procédure Railway (ops, hors code)

À documenter dans `deploy/README.md` :

1. Créer un service Umami séparé sur Railway depuis l'image `ghcr.io/umami-software/umami:postgresql-vX.Y.Z` (tag pinné, identique à celui des compose).
2. Ce service Umami conserve son `DATABASE_URL` vers la Postgres Railway, schéma `umami` — configuration inchangée par rapport à aujourd'hui.
3. Sur le service **frontend** Railway, définir les variables `UMAMI_HOST=<service-umami>.railway.internal` et `UMAMI_PORT=3000`.
4. Le service Umami n'a **pas besoin d'un domaine public** : le frontend le joint via le réseau privé Railway.

## Comportement attendu

- **Local (Docker / Rancher Desktop)** : strictement identique à aujourd'hui. Les défauts `UMAMI_HOST=umami` / `UMAMI_PORT=3000` reproduisent le comportement actuel sans aucune variable à fournir.
- **Railway** : le frontend proxifie vers le service Umami séparé via le réseau privé. Le navigateur ne voit toujours que des URLs `/umami*` same-origin.

## Risques et limitations connues

1. **Résolution DNS au démarrage.** `envsubst` produit un `nginx.conf` à valeurs littérales ; Nginx résout l'upstream Umami une seule fois au boot du conteneur. Si le service Umami Railway redémarre et change d'IP interne, le Nginx du frontend garde l'ancienne IP jusqu'à son propre redémarrage. C'est le **compromis déjà accepté pour `BACKEND_HOST`** — on reste cohérent, aucune résolution runtime n'est introduite.
2. **Disponibilité Umami découplée.** Si le service Umami est arrêté, les requêtes `/umami*` renverront une erreur 502 du Nginx. Le tracker côté `main.ts` est `defer` et tolère l'échec ; l'onglet Analytics admin affichera une iframe en erreur. Acceptable — l'analytics est non-critique.

## Hors-périmètre

- La création effective du service Umami Railway et sa base de données — c'est une opération manuelle d'infra, documentée mais non scriptée.
- Le HTTPS upstream et un domaine Umami public — explicitement écartés (réseau privé Railway, HTTP).
- Tout changement du code Angular — aucun n'est nécessaire, les chemins `/umami*` restent same-origin.
- La CSP — inchangée, c'est précisément l'intérêt de garder le proxy Nginx.

## Critères d'acceptation

- En local, après `docker compose up --build`, `GET /umami.js` renvoie le script tracker (HTTP 200), `GET /umami/share/<token>/<id>` charge le dashboard, l'onglet Analytics de `/admin` affiche l'iframe — comportement inchangé.
- `frontend/nginx.conf` ne contient plus aucune occurrence codée en dur de `umami:3000` ; les six `proxy_pass` Umami utilisent `${UMAMI_HOST}:${UMAMI_PORT}`.
- `UMAMI_HOST` et `UMAMI_PORT` figurent dans le `ENV` du Dockerfile et dans `NGINX_ENVSUBST_FILTER`.
- `deploy/README.md` documente la procédure de bascule vers un service Umami Railway séparé.
