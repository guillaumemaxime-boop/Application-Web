# ADR-0003 : Java + Spring Boot pour l'API backend

- **Statut** : Accepted
- **Date** : 2026-05-02
- **Décideurs** : Équipe Atelier Lumen
- **Tags** : backend, langage, framework

## Contexte

Suite à la décision d'une architecture découplée ([ADR-0002](0002-architecture-full-stack-separee.md)), le backend doit exposer une API REST :

- Stateless, JSON
- Stable et facile à faire évoluer (ajout d'endpoints, validation, sécurité, persistance)
- Pris en main rapidement par l'équipe (compétences Java déjà présentes)
- Compatible avec un déploiement conteneurisé

L'écosystème Java reste l'un des plus matures pour le web d'entreprise. Spring Boot fournit un cadre éprouvé avec une vaste bibliothèque de starters (web, validation, security, data-jpa, actuator).

## Décision

Implémenter le backend en **Java 25** (LTS) avec **Spring Boot 4.0** :

- `spring-boot-starter-web` pour l'API REST
- `spring-boot-starter-validation` pour les contraintes Jakarta Bean Validation
- `spring-boot-starter-actuator` pour `/actuator/health` et observabilité ultérieure
- `spring-boot-starter-test` (JUnit 5 + Spring Test) pour les tests
- Build Maven (`pom.xml`)
- Architecture en couches classique : `controller` / `service` / `model`
- Modèles immuables via les `record` Java (Java 25)
- Sérialisation JSON par Jackson, dates au format ISO `yyyy-MM-dd`

## Conséquences

### Positives
- Productivité élevée grâce aux starters Spring Boot et à l'auto-configuration
- Validation, monitoring, sécurité, persistance disponibles sans changer d'écosystème
- `record` Java 25 → modèles concis et immuables, parfait pour les DTOs
- Communauté massive, documentation abondante, vivier de recrutement

### Négatives / compromis
- Empreinte mémoire et démarrage plus lourds qu'un runtime Node ou Go
- Build Maven plus lent qu'un `npm install` typique (atténué par cache Maven dans la CI)
- JDK 25 doit être installé localement (prérequis explicite documenté dans le README)

### Neutres
- Pas de Spring Security activé pour l'instant — l'API est en lecture seule et publique

## Alternatives envisagées

### Option A — Node.js + Express / NestJS
Écartée : moins de maturité pour la validation forte, le monitoring et la future couche persistance/sécurité. L'équipe a moins d'expérience opérationnelle Node en production.

### Option B — Quarkus / Micronaut
Écartées : démarrage et empreinte mémoire meilleurs, mais écosystème de starters moins riche que Spring Boot et courbe d'apprentissage supplémentaire pour l'équipe.

### Option C — Go (Gin / Echo)
Écartée : excellent pour les microservices, mais pas d'expertise Go dans l'équipe et nécessite de réécrire à la main ce que les starters Spring fournissent prêt à l'emploi.

## Références

- [README.md](../../README.md) — endpoints et caractéristiques techniques
- [`backend/pom.xml`](../../backend/pom.xml)
- [Spring Boot reference](https://docs.spring.io/spring-boot/index.html)
