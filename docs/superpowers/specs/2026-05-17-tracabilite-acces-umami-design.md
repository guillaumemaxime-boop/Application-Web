# Traçabilité des accès et tendances d'audience (Umami auto-hébergé)

**Date** : 2026-05-17
**Statut** : ✅ Implémenté — mergé sur main (ADR-0012)
**Auteur** : Maxime Guillaume (avec Claude)

## 1. Contexte & motivation

Le portfolio est aujourd'hui en production sur Railway sans aucune mesure d'audience. L'objectif est de tracer les accès au site public et d'afficher les tendances dans l'admin existant, en décrivant :

- la **page consultée** (URL, titre, référent),
- l'**origine du visiteur** sous forme géographique (pays, région, ville).

Le projet est solo, à faible trafic, et l'ADR-0010 a déjà acté une philosophie minimaliste pour la supervision (Actuator + healthchecks natifs, pas de Prometheus/Datadog). Cette fonctionnalité applique la même logique au domaine audience : un seul conteneur supplémentaire, zéro dépendance tierce, intégration dans la stack Docker existante.

## 2. Décisions structurantes

### 2.1 Outil retenu : Umami auto-hébergé

| Critère | Choix | Justification |
|---|---|---|
| Outil | **Umami** | OSS, Docker single-container, schéma Postgres standard, dashboard intégrable en iframe via lien de partage |
| Hébergement | **Self-hosted** dans la stack Docker du projet | Aucun script tiers, pas de relax CSP, données restent chez nous |
| Base de données | **Schéma `umami` dans la base Postgres existante** | Pas de second moteur, isolation propre du schéma `public` géré par Liquibase |
| Données IP | **Jamais persistées** | Umami extrait pays/région/ville côté serveur via GeoLite2 puis jette l'IP |
| Cookies | **Aucun** | Identifiant visiteur = hash quotidien `sha256(IP + UA + salt + date)`, non réversible, non cross-day |
| Consentement | **Pas de bannière requise** | Conforme doctrine CNIL « cookies & traceurs » (mars 2021) pour outils de mesure exemptés |

Alternatives écartées :
- **In-house Spring + Postgres** : devrait reconstruire collecte, parsing UA, GeoIP, dashboard. Effort disproportionné face à un outil mature et conforme RGPD par défaut.
- **Plausible Cloud / Umami Cloud** : implique un domaine externe pour le snippet → relax CSP `script-src` + dépendance vendor + (pour Plausible) coût récurrent.
- **Plausible self-hosted** : nécessite un cluster Clickhouse en plus de Postgres, surdimensionné.

### 2.2 Intégration admin : iframe du dashboard Umami

L'onglet **Analytics** de `/admin` charge le dashboard natif d'Umami via un **lien de partage Umami** (URL `share/<token>/<website-id>`), intégré en `<iframe>` plein cadre.

- La route Angular `/admin/analytics` est protégée par `auth.guard.ts` (JWT existant).
- Le token de partage Umami est public mais opaque (≥ 22 chars) et passé via variable d'env de build (`UMAMI_SHARE_TOKEN`).
- Aucun login Umami visible côté admin : on ne se loggue qu'une fois dans Umami pour générer le token initial.

Alternatives écartées :
- **Dashboard Angular custom consommant l'API Umami** : refait ce qu'Umami offre déjà (top pages, carte monde, sources, courbe temporelle). Code à maintenir pour un gain cosmétique seul.
- **Sous-domaine `analytics.<domaine>`** : double login, UX déconnectée de l'admin.

### 2.3 Topologie réseau

Tout reste **same-origin** depuis le navigateur public :

```
Visiteur ──▶ Nginx (frontend container)
              ├── /              → SPA
              ├── /api/          → backend Spring Boot
              ├── /umami.js      → reverse-proxy vers umami:3000/script.js
              ├── /umami/api/    → reverse-proxy vers umami:3000/api/  (events seulement)
              └── /umami/share/  → reverse-proxy vers umami:3000/share/ (dashboard partagé)

Admin /admin/analytics → <iframe src="/umami/share/<token>/<website-id>">
```

Le service `umami` n'est jamais exposé directement à Internet ; il est routé uniquement par les préfixes ci-dessus. Le reste de l'UI Umami (admin Umami, settings) reste inaccessible publiquement.

### 2.4 Conformité RGPD

- **Mention** dans une page « Politique de confidentialité » à créer : éditeur (auto-hébergé), finalité (mesure d'audience), données collectées, durée de conservation, droit d'opposition (le `Do Not Track` du navigateur est respecté nativement).
- **Pas de bannière cookies** : aucun cookie posé, identifiant rotatif quotidien.
- **Exclusion de `/admin`** du tracking via filtre Umami : on ne trace pas nos propres sessions.
- **Rétention 14 mois** maximum, configurée dans Umami (purge automatique).

## 3. Architecture des composants

### 3.1 Service `umami` (nouveau conteneur)

| Élément | Valeur |
|---|---|
| Image | `ghcr.io/umami-software/umami:postgresql-latest` — tag pinné dans le compose |
| Port interne | 3000 |
| Dépendance | `postgres` healthy |
| `DATABASE_URL` | `postgresql://portfolio:****@postgres:5432/portfolio?schema=umami` |
| `APP_SECRET` | aléatoire 32+ chars, env `UMAMI_APP_SECRET` |
| `TRACKER_SCRIPT_NAME` | `umami` (snippet servi sous `/umami.js` au lieu du défaut `script.js` pour réduire le filtrage adblock) |
| Healthcheck | `wget -q -O- http://localhost:3000/api/heartbeat` |
| `start_period` | 30 s (cohérent ADR-0010) |

Le schéma `umami` est créé et migré automatiquement par Umami (Prisma) au premier démarrage. **Pas de changelog Liquibase** : Liquibase ne gère que `public`, les deux systèmes coexistent sans conflit.

### 3.2 Frontend — instrumentation

Les IDs Umami sont injectés **au démarrage du conteneur Nginx** (pas à la build de l'image Angular) via le mécanisme `envsubst` natif de l'image Nginx, déjà utilisé pour `BACKEND_HOST` / `BACKEND_PORT`. Nginx expose un endpoint `/env.js` qui retourne un fragment JS littéral :

```nginx
location = /env.js {
    default_type application/javascript;
    return 200 'window.__UMAMI__={"websiteId":"${UMAMI_WEBSITE_ID}","shareToken":"${UMAMI_SHARE_TOKEN}"};';
}
```

`index.html` charge ce fichier en tête de page :

```html
<script src="/env.js"></script>
```

Puis `main.ts` injecte le snippet Umami au bootstrap si `websiteId` est présent :

```ts
const env = (window as any).__UMAMI__ ?? {};
if (env.websiteId) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = '/umami.js';
  s.dataset['websiteId'] = env.websiteId;
  document.head.appendChild(s);
}
```

Avantages : pas de rebuild d'image quand on change les IDs (seul restart du conteneur frontend suffit), même pattern que `BACKEND_HOST`. En dev (`ng serve`), `/env.js` n'existe pas → `window.__UMAMI__` est `undefined` → pas de tracking en dev (comportement souhaité).

### 3.3 Nginx — règles de proxy

[frontend/nginx.conf](frontend/nginx.conf) — quatre `location` ajoutés :
- `location = /env.js` → réponse `return 200` envsubst'd avec `UMAMI_WEBSITE_ID` et `UMAMI_SHARE_TOKEN`
- `location = /umami.js` → `proxy_pass http://umami:3000/script.js;`
- `location /umami/api/send` → `proxy_pass http://umami:3000/api/send;`
- `location /umami/share/` → `proxy_pass http://umami:3000/share/;`

Headers `X-Forwarded-For` et `X-Real-IP` passés pour que la géolocalisation côté Umami soit exacte. Aucune autre route Umami n'est exposée.

### 3.4 Frontend — onglet **Analytics** dans `AdminComponent`

L'admin existant utilise un système de tabs internes (`furniture | exhibitions | texts | photos`). On ajoute un cinquième tab `analytics`, dans le même composant :

- Nouveau type `Tab` enrichi : `'furniture' | 'exhibitions' | 'texts' | 'photos' | 'analytics'`.
- Nouveau bouton dans la barre de tabs : `Analytics`.
- Nouveau bloc `@if (tab() === 'analytics')` qui rend :
  - une `<iframe src="/umami/share/<token>/<website-id>">` plein cadre si `window.__UMAMI__.shareToken` et `websiteId` sont présents ;
  - sinon, un message « Configuration analytics manquante ».
- Pas d'appel HTTP. Lecture directe de `window.__UMAMI__` injecté par `/env.js`.
- Cohérent ADR-0004 (signaux, nouvelle control flow).

### 3.5 Variables d'environnement

| Variable | Consommateur | Rôle |
|---|---|---|
| `UMAMI_WEBSITE_ID` | frontend build | UUID du site Umami (injecté dans `index.html` et iframe) |
| `UMAMI_SHARE_TOKEN` | frontend build | jeton de partage du dashboard Umami (injecté dans iframe) |
| `UMAMI_APP_SECRET` | service umami | secret de session Umami |
| `UMAMI_DATABASE_URL` | service umami | DSN Postgres avec `?schema=umami` |

## 4. Flux de données

```
Visiteur                Nginx              Umami                Postgres (schéma umami)
   │                      │                  │                          │
   │ GET /page            │                  │                          │
   │─────────────────────▶│                  │                          │
   │◀─── HTML + snippet ──│                  │                          │
   │                      │                  │                          │
   │ GET /umami.js        │                  │                          │
   │─────────────────────▶│── proxy ────────▶│                          │
   │◀──── script + ID ────│◀─────────────────│                          │
   │                      │                  │                          │
   │ POST /umami/api/send │                  │                          │
   │ {url, ref, title…}   │                  │                          │
   │─────────────────────▶│── proxy ────────▶│ X-Forwarded-For          │
   │                      │                  │  → geoip → pays/ville    │
   │                      │                  │  → drop IP               │
   │                      │                  │  → hash visiteur         │
   │                      │                  │─── INSERT ──────────────▶│
   │◀─── 200 ─────────────────────────────────│                          │
```

L'IP brute ne franchit jamais la frontière vers Postgres : elle est extraite, transformée en géo et hashée pour l'identifiant visiteur, puis perdue à la fin de la requête HTTP côté Umami.

## 5. Déploiement

### 5.1 Local — [docker-compose.yml](docker-compose.yml)

Ajout d'un service `umami` à la suite des trois existants, avec dépendance `postgres` healthy. Le frontend dépend désormais de `postgres + backend + umami` healthy.

### 5.2 Railway — [deploy/base/docker-compose.yml](deploy/base/docker-compose.yml)

- Service `umami` ajouté au compose de base, image upstream pinnée à un tag précis (ex. `2.13.0`) pour éviter qu'une mise à jour cassante remonte automatiquement.
- Création manuelle une fois du service Railway `umami`, branché sur la Postgres existante via `DATABASE_URL`.
- Promotion via le mécanisme existant `deploy/envs/<env>/versions.yaml` : le tag Umami est versionné comme les autres composants.

### 5.3 CI — workflows existants

- `build-and-deploy.yml` : aucun changement structurel (image upstream, non rebuilt).
- `sync-rancher.yml` : ajout d'`umami` à la boucle de healthcheck post-déploiement (`wget /umami/api/heartbeat`), aligné avec la couche 3 de l'ADR-0010.
- `sync-staging.yml` : pousse le compose mis à jour.

### 5.4 Configuration initiale (one-shot manuel)

Après le premier déploiement Umami :
1. Login dans Umami (admin par défaut, mot de passe à changer immédiatement).
2. Créer le « website » correspondant au domaine du portfolio → récupérer `UMAMI_WEBSITE_ID`.
3. Activer le partage public du dashboard → récupérer `UMAMI_SHARE_TOKEN`.
4. Configurer la rétention (Settings → Data → 14 mois).
5. Renseigner les deux IDs comme variables Railway de l'image frontend.
6. Re-déployer le frontend pour que les IDs soient embarqués dans la build.

### 5.5 ADR à créer

**ADR-0012 — Mesure d'audience par Umami auto-hébergé**, statut `Accepted`, justifiant le choix et documentant le positionnement RGPD. Ne supersède pas l'ADR-0010 (supervision technique ≠ mesure d'audience, les deux coexistent).

## 6. Tests

### 6.1 Backend
Pas de changement code Java → pas de test backend à ajouter.

### 6.2 Frontend
`AdminAnalyticsComponent.spec.ts` :
- Rend une `<iframe>` avec le bon `src` quand les deux IDs sont fournis.
- Ne rend pas d'iframe et affiche le message d'erreur quand un ID est manquant.

### 6.3 Validation manuelle (checklist mise en service)
1. `docker compose up --build` local → les 4 conteneurs passent healthy.
2. Ouvrir le site public → onglet Network : `/umami.js` chargé en 200 same-origin ; `POST /umami/api/send` part au pageview.
3. Visiter 3-4 pages publiques.
4. Login admin → onglet **Analytics** → l'iframe affiche les visites, pays, top pages.
5. Console : aucune violation CSP.
6. `/admin/*` n'apparaît pas dans les pages Umami (filtre d'exclusion actif).
7. `DNT: 1` forcé dans le navigateur → aucun event envoyé.
8. Vérifier en base que le schéma `umami` existe et contient des rows dans `umami.website_event`.

## 7. Risques et points d'attention

- **Adblockers** : malgré `TRACKER_SCRIPT_NAME=umami`, certaines règles uBlock filtrent le path `/api/send`. Visiteurs équipés adblock invisibles. Acceptable pour un portfolio.
- **Trafic bot** : Umami filtre les UA bots connus mais pas exhaustif. Possible inflation modérée.
- **Schéma partagé** : `umami` cohabite avec `public` dans la même base. Si Umami devait migrer ailleurs, `pg_dump --schema=umami` permet une extraction propre.
- **Token de partage** : opaque mais public. En cas de fuite, l'audience devient publique. Régénérable depuis l'UI Umami.
- **Mise à jour Umami** : faite manuellement en bumpant le tag dans le compose, jamais automatique. Une release Umami majeure peut casser le schéma (migrations Prisma) — toujours tester en local d'abord.

## 8. Hors-périmètre (V1)

Volontairement non couvert au MVP :
- Export CSV custom — l'export natif d'Umami suffira.
- Alerting sur pic de trafic (cohérent ADR-0010).
- Tracking d'événements custom (clics CTA, soumissions du formulaire contact) — ajoutable plus tard via `umami.track('event', …)` sans changement infra.
- A/B testing.
- Page « Politique de confidentialité » : rédigée et publiée mais hors scope technique de cette spec — c'est une page de contenu éditorial.
