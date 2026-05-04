# ADR-0010 : Supervision et monitoring — Actuator + healthchecks natifs + Railway

- **Statut** : Accepted
- **Date** : 2026-05-04
- **Décideurs** : Maxime Guillaume
- **Tags** : infra, backend, monitoring, déploiement

## Contexte

L'application tourne en production sur Railway (backend + base de données) et en local sur Rancher Desktop. Plusieurs couches ont chacune besoin d'un signal de santé :

- **Docker Compose** doit savoir si un conteneur est prêt avant de démarrer celui qui en dépend (`depends_on: condition: service_healthy`).
- **Railway** doit détecter un conteneur défaillant pour le redémarrer ou bloquer un rollout.
- **Le pipeline CI/CD** (`sync-rancher.yml`) doit vérifier que le backend répond après un `docker compose up`.
- **L'équipe** doit être alertée si l'application est hors service en production.

À ce stade, l'application est un portfolio à faible trafic, géré par une seule personne. Le coût opérationnel d'une stack de monitoring dédiée (Prometheus, Grafana, ELK…) n'est pas justifié.

Spring Boot Actuator est déjà inclus via `spring-boot-starter-actuator` et expose des endpoints de supervision sans code supplémentaire. Docker Compose et Railway offrent des mécanismes de healthcheck natifs qui s'y branchent directement.

## Décision

Adopter une **stratégie de supervision légère en trois couches**, sans outillage dédié externe :

### Couche 1 — Spring Boot Actuator (backend)

Exposer uniquement les endpoints `health` et `info` :

```properties
# application.properties
management.endpoints.web.exposure.include=health,info
```

- `GET /actuator/health` → `{"status":"UP"}` / `{"status":"DOWN"}` — point d'entrée unique pour tous les healthchecks
- Endpoint `info` disponible pour les métadonnées applicatives

### Couche 2 — Healthchecks Docker Compose

Chaque service déclare son propre healthcheck dans `docker-compose.yml` et `deploy/base/docker-compose.yml` :

| Service | Commande | Intervalle | Délai de grâce |
|---------|----------|------------|----------------|
| `postgres` | `pg_isready -U portfolio -d portfolio` | 10 s | 10 s |
| `backend` | `wget -q -O- http://localhost:8080/actuator/health \| grep -q UP` | 20 s | 30 s |
| `frontend` | `wget -q -O- http://localhost:${PORT}/` | 20 s | — |

La chaîne de dépendances (`postgres → backend → frontend`) ne démarre l'étape suivante qu'après `service_healthy`, ce qui évite les crashloops au démarrage.

### Couche 3 — Vérification post-déploiement dans le pipeline CI

Le workflow `sync-rancher.yml` effectue une vérification active après chaque `docker compose up` :

```bash
for i in {1..12}; do
  curl -fsS http://localhost:8080/actuator/health | grep -q UP && exit 0
  sleep 10
done
# Si non healthy après 2 minutes → dump des logs + exit 1
```

Cela transforme chaque déploiement Rancher en un test de fumée automatique. Un déploiement ne se marque pas comme réussi tant que le backend ne répond pas `UP`.

### Alerting production (Railway)

Railway remonte les métriques et logs des conteneurs nativement dans son dashboard. En cas de crash ou de dépassement de mémoire, une notification e-mail est envoyée automatiquement. Pas de configuration supplémentaire requise pour ce niveau de service.

## Conséquences

### Positives

- Zéro dépendance externe : `wget` est disponible dans toutes les images Alpine utilisées
- Le signal de santé unifié (`/actuator/health`) est consommé de la même façon par Docker Compose, le CI et Railway
- Le délai de grâce (`start_period: 30s` pour le backend) absorbe le temps de démarrage JVM + Liquibase sans fausses alarmes
- La vérification CI détecte les régressions de démarrage avant que l'utilisateur ne les remarque
- Coût opérationnel quasi nul pour un projet solo

### Négatives / compromis

- Pas de métriques temporelles (latence, taux d'erreur, saturation mémoire) exploitables en dehors du dashboard Railway
- Pas d'alerting proactif par seuil (ex. « alerte si latence P95 > 500 ms »)
- Pas de corrélation de logs distribuée (traces, spans)
- Si Railway change sa politique d'alerting, le monitoring production devient un angle mort

### Neutres

- Le choix de n'exposer que `health` et `info` (pas `metrics`, `env`, `beans`) est une décision de sécurité : les endpoints Actuator verbeux peuvent exposer des informations sensibles sur l'environnement d'exécution
- L'endpoint `info` est disponible mais non peuplé pour l'instant — il peut être enrichi avec la version et le SHA de build via le plugin `spring-boot-maven-plugin` si besoin

## Alternatives envisagées

### Option A — Stack Prometheus + Grafana

Exposer `/actuator/prometheus` et connecter un Grafana Cloud ou auto-hébergé.

Écartée : coût de mise en place et de maintenance disproportionné pour un portfolio à faible trafic sans SLA strict. À reconsidérer si le volume de trafic ou la criticité métier augmente significativement.

### Option B — Service externe type UptimeRobot / Better Uptime

Ping HTTP externe toutes les 5 minutes sur l'URL de production, alerting par e-mail/SMS.

Écartée pour l'instant : pertinent en production mais introduit une dépendance externe supplémentaire. Facile à ajouter ultérieurement sans impact architectural.

### Option C — Logging centralisé (Datadog, Loki/Grafana, ELK)

Agrégation des logs applicatifs dans une plateforme d'observabilité.

Écartée : Railway agrège déjà les logs des conteneurs et les rend consultables dans son interface. Suffisant pour le volume actuel. À reconsidérer si les logs doivent être corrélés avec des événements externes ou conservés sur le long terme.

### Option D — Pas de healthcheck

Laisser Docker Compose et Railway détecter les panics par absence de processus uniquement.

Écartée : les crashloops au démarrage (connexion BDD non disponible, migration Liquibase en cours) ne sont pas détectables par un simple `pid check`. Les healthchecks permettent de distinguer « le processus tourne » de « l'application est réellement opérationnelle ».

## Références

- [`backend/src/main/resources/application.properties`](../../backend/src/main/resources/application.properties) — configuration Actuator
- [`docker-compose.yml`](../../docker-compose.yml) — healthchecks locaux
- [`deploy/base/docker-compose.yml`](../../deploy/base/docker-compose.yml) — healthchecks Rancher/Railway
- [`.github/workflows/sync-rancher.yml`](../../.github/workflows/sync-rancher.yml) — vérification post-déploiement
- [Spring Boot Actuator — documentation officielle](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
