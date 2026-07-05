# 22. Architecture logicielle : couches pragmatiques + ports/adapters sélectifs (vs hexagonal complet)

Date : 2026-07-05
Statut : Accepté

## Contexte

Un audit de l'architecture logicielle a été mené pour valider les choix en place et répondre à la question : *une architecture hexagonale (ports & adapters) aurait-elle été plus pertinente dans ce contexte ?*

**État constaté (backend Spring Boot 4)** — architecture **en couches** disciplinée :
- Flux `controller` (21) → `service` (18) → `repository` (13, Spring Data JPA) → `entity` (18, JPA anémiques).
- **Frontière DTO solide** : 30 records dans `model/` ; les entités JPA ne fuient jamais vers les contrôleurs.
- Logique métier dans les services ; **couplage assumé au framework** dans les services (`@Transactional`, `@Cacheable`/`@CacheEvict`, `@Async`, injection directe des `JpaRepository`).
- **Un seul port déjà présent** : interface `VideoTranscoder` + adapter `FfmpegVideoTranscoder` (process externe isolé). Voir [ADR-0021](0021-videos-transcodage-async.md).
- **Dépendances externes volatiles non abstraites** : mail (`ResendMailService` appelé en dur) et stockage fichier (`Files.*` / `uploadDir` disséminés dans `VideoService`, `PhotoService`).
- Répartition : **~70 % CRUD** répétitif ; **~30 % de flux riches** (pipeline vidéo ~600 L, composition `HomeService`, optimisation images, stories/sliders).

**État constaté (frontend Angular 21)** — déjà proche d'une frontière propre : `PortfolioService` est **l'unique porte** vers l'API (les composants ne touchent jamais `HttpClient`), l'auth est isolée (service + interceptor + guard), pattern page/vue ([ADR-0018](0018-page-vs-view-pattern.md)).

**Contraintes** : développeur solo, application mono-tenant (portfolio/CMS d'un atelier d'art), majoritairement CRUD + quelques flux riches, forte couverture de tests (intégration H2 rejouant le vrai changelog Liquibase, Karma, Playwright visuel), livraison rapide et idiomatique Spring recherchée.

**Signal historique décisif** : le projet a déjà changé deux fois d'« adapter » d'infrastructure — **in-memory → PostgreSQL/Liquibase** ([ADR-0005](0005-donnees-en-memoire.md) supersédé) et **SMTP → Resend** ([ADR-0013](0013-config-smtp-en-base-chiffree.md) → [ADR-0014](0014-bascule-vers-resend.md)). La première bascule a été absorbée sans douleur (les `JpaRepository` sont des interfaces = un port de persistance de facto) ; la seconde a touché directement le code métier faute de port mail.

## Décision

**Conserver l'architecture en couches + frontière DTO comme défaut, et appliquer le pattern ports & adapters de façon *sélective* (« hexagonal tactique »), là où il gagne sa place — pas comme dogme global.**

On **n'adopte pas** un hexagonal complet (modèle de domaine distinct des entités JPA + couches de mapping systématiques). On **étend** le pattern port/adapter déjà pratiqué avec `VideoTranscoder`, par ordre de priorité :

1. **À faire — port `MailSender`** (Resend = adapter). Dépendance déjà churné une fois ; abstraction bon marché qui dé-risque le prochain changement de fournisseur. Cible : `ContactRequestService` et `MailSettingsService` dépendent d'une interface, plus de `ResendMailService` concret.
2. **Refactor SRP — découper `VideoService`** (~600 L) : séparer l'orchestration/machine à états (domaine) de l'I/O fichier + process (derrière `VideoTranscoder` + un port de stockage). Objectif lisibilité/testabilité ; c'est du SRP, pas de l'idéologie.
3. **Différé (YAGNI) — port `MediaStorage`** (disque local = adapter). À introduire seulement si un stockage objet (S3…) devient un vrai besoin.
4. **Ne PAS hexagonaliser le CRUD** (mobilier, expositions, photos, méta, tags) : net négatif (boilerplate de mapping sans bénéfice).

## Conséquences

### Positives
- Architecture **proportionnée au scope** : simplicité idiomatique Spring, vitesse de livraison, faible cérémonie, comprise par un dev solo.
- La **frontière DTO** (déjà en place) offre l'essentiel du bénéfice d'isolation côté HTTP sans le coût d'un double modèle.
- Les ports ciblés (`VideoTranscoder`, futur `MailSender`) isolent précisément les dépendances **volatiles/externes** — là où le risque de changement est réel et avéré.
- Le découpage de `VideoService` réduit la principale dette de responsabilité unique.

### Négatives / compromis
- Les services **restent couplés à Spring/JPA** (`@Transactional`, `@Cacheable`, repositories directs) : le domaine n'est pas testable « hors framework ». Compromis assumé — compensé par une stratégie de tests d'intégration H2 rapides plutôt que d'isolation du domaine.
- Cohabitation de deux styles (couches pour le CRUD, ports/adapters pour les cœurs complexes) : demande du **discernement** sur quand introduire un port (risque de sur- ou sous-abstraction si appliqué mécaniquement).

### Neutres
- Les `JpaRepository` continuent de jouer un rôle de « port de persistance » de facto (interfaces Spring Data), ce qui a déjà rendu la migration in-memory → Postgres indolore.
- Aucune réécriture : décision incrémentale, applicable au fil de l'eau.

## Alternatives envisagées

### Option A — Hexagonal complet (ports & adapters partout, domaine isolé du framework)
Écartée : mauvais compromis coût/bénéfice pour ce contexte. Impose un modèle de domaine distinct des entités JPA + mapping systématique — pur boilerplate sur ~70 % de code CRUD. Ses gains (domaine testable sans Spring, multiples adapters par port, frontières d'équipe) supposent un domaine complexe/volatil et une équipe ; ici : dev solo, domaine modéré, un seul adapter par préoccupation, stratégie de test déjà orientée intégration. Ralentirait la livraison sans bénéfice proportionnel.

### Option B — Statu quo strict (aucune nouvelle abstraction)
Écartée : laisse non traités les deux points où le couplage a un coût réel et avéré (mail déjà churné ; `VideoService` monolithique). Le port `MailSender` et le découpage de `VideoService` ont un ratio valeur/coût clairement positif.

## Références

- [ADR-0002](0002-architecture-full-stack-separee.md), [ADR-0003](0003-backend-spring-boot.md) — choix full-stack séparé + Spring Boot.
- [ADR-0005](0005-donnees-en-memoire.md) (supersédé) — migration in-memory → Postgres/Liquibase.
- [ADR-0013](0013-config-smtp-en-base-chiffree.md) → [ADR-0014](0014-bascule-vers-resend.md) — bascule SMTP → Resend (dépendance mail déjà changée).
- [ADR-0018](0018-page-vs-view-pattern.md) — pattern page/vue (frontière propre côté front).
- [ADR-0021](0021-videos-transcodage-async.md) — `VideoTranscoder` : le port/adapter de référence déjà en place.
- Ports & adapters (Alistair Cockburn), *Clean Architecture* (R. C. Martin) — cadres de référence de l'évaluation.
