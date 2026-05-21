# ADR-0012 : Mesure d'audience par Umami auto-hébergé

- **Statut** : Accepted
- **Date** : 2026-05-17
- **Décideurs** : Maxime Guillaume
- **Tags** : frontend, infra, rgpd, observabilite

## Contexte

Le portfolio en production n'a aucune mesure d'audience. Le besoin est de connaître :

- les pages les plus consultées,
- l'origine géographique des visiteurs (pays, ville),
- la tendance temporelle du trafic.

Contraintes :

- RGPD : pas de cookie persistant, pas d'IP en clair en base.
- Cohérence avec l'ADR-0010 (supervision minimaliste, auto-hébergement par défaut).
- CSP stricte (`script-src 'self'`) à preserver : pas de script tiers chargé depuis un domaine externe.
- Projet solo, pas de SLA : pas de plateforme d'analytics dédiée coûteuse.

## Décision

Adopter **Umami auto-hébergé** dans la stack Docker existante.

- Conteneur unique `ghcr.io/umami-software/umami:postgresql-vX.Y.Z`, tag pinné, branché sur la Postgres existante via un schéma dédié `umami`.
- Snippet `/umami.js` servi en same-origin par le Nginx du frontend (proxy vers `umami:3000`) : aucun assouplissement de la CSP.
- Endpoint `/umami/api/send` exposé publiquement pour l'ingestion d'events ; toutes les autres routes Umami restent privées au réseau Docker.
- Dashboard intégré dans `/admin` via une `<iframe>` consommant un lien de partage public-opaque (`UMAMI_SHARE_TOKEN`).
- IDs injectés à runtime via `envsubst` Nginx (endpoint `/env.js`), même pattern que `BACKEND_HOST`.

## Conséquences

### Positives

- **RGPD conforme par défaut** : aucun cookie, identifiant visiteur = hash quotidien irréversible, IP jetée après dérivation pays/ville → pas de bannière de consentement requise (doctrine CNIL, mars 2021).
- **Aucune dépendance tierce** : pas de domaine externe à autoriser dans la CSP, pas de fournisseur SaaS, données chez nous.
- **Cohérent ADR-0006/0010** : Docker single-container, healthcheck `wget`, supervision uniforme.
- **Coût quasi nul** : 1 conteneur Railway de plus, partage la Postgres existante.
- **Découplage** : si Umami doit être migré ailleurs, `pg_dump --schema=umami` extrait toutes les données proprement.

### Négatives / compromis

- Trafic des visiteurs équipés d'adblockers (uBlock filtre `/api/send`) non mesuré, malgré le renommage `TRACKER_SCRIPT_NAME=umami`. Acceptable pour un portfolio.
- Mise à jour Umami manuelle (bump du tag d'image) : une release majeure peut casser les migrations Prisma. Toujours tester en local avant production.
- Pas de tracking d'événements custom (clics CTA, formulaire contact) au MVP — ajoutable plus tard via `umami.track('event', ...)` sans changement infra.

### Neutres

- L'exclusion de `/admin*` du tracking est configurée dans l'UI Umami (filtre dashboard), pas via le code — choix volontaire pour éviter de coupler le code et la config opérationnelle.
- La rétention 14 mois est gérée par Umami (purge automatique configurée dans l'UI) — pas de job CRON applicatif à maintenir.
- L'upstream Umami du Nginx frontend est paramétrable (`UMAMI_HOST` / `UMAMI_PORT`) : Umami peut être déployé comme service séparé sans changer le proxy same-origin ni la CSP. Voir [`docs/superpowers/specs/2026-05-21-umami-externe-design.md`](../superpowers/specs/2026-05-21-umami-externe-design.md).

## Alternatives envisagées

### Option A — In-house Spring + Postgres + tableau de bord Angular

Implémenter la collecte (`OncePerRequestFilter`), la dérivation GeoIP (lib MaxMind), le hashing, le schéma Liquibase, le service de queries, le dashboard Angular custom avec librairie de charts.

**Écartée** : effort disproportionné par rapport à un outil OSS mature et déjà conforme RGPD. Refait ce que Umami offre out-of-the-box (top pages, carte monde, tendance, sources, devices, OS, browsers).

### Option B — Plausible Cloud / Umami Cloud (SaaS)

Service hébergé par l'éditeur, snippet JS depuis leur domaine.

**Écartée** : impose un assouplissement de la CSP `script-src` pour autoriser le domaine externe, dépendance vendor, et pour Plausible un coût récurrent (~9€/mois). Le bénéfice (zéro infra) ne compense pas la perte de simplicité côté CSP/données.

### Option C — Plausible Community Edition (self-hosted)

Équivalent OSS de Plausible Cloud.

**Écartée** : nécessite un cluster Clickhouse en plus de Postgres → 2 conteneurs supplémentaires + un second moteur de base à apprendre et opérer. Surdimensionné pour le volume du portfolio.

### Option D — Google Analytics 4

**Écartée** : non conforme RGPD sans bannière complexe (et déclaration CNIL post-2022). Données chez Google. Hors-philosophie du projet.

## Références

- [`docs/superpowers/specs/2026-05-17-tracabilite-acces-umami-design.md`](../superpowers/specs/2026-05-17-tracabilite-acces-umami-design.md) — spec design complet
- [`docker-compose.yml`](../../docker-compose.yml), [`deploy/base/docker-compose.yml`](../../deploy/base/docker-compose.yml) — service Umami
- [`frontend/nginx.conf`](../../frontend/nginx.conf) — proxy et `/env.js`
- [Umami — documentation](https://umami.is/docs)
- [CNIL — cookies & traceurs : exemption pour la mesure d'audience](https://www.cnil.fr/fr/cookies-et-traceurs-que-dit-la-loi)
- ADR-0010 (Supervision et monitoring) — coexiste avec celui-ci, ne le supersède pas
