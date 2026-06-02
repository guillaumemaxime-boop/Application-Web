---
name: user-profile
description: Profil du développeur — rôle, stack technique, préférences
metadata:
  type: user
---

## Rôle et contexte

- Développeur full-stack solo sur un portfolio d'art/meubles (Atelier Lumen)
- Email : guillaume.maxime@gmail.com
- Maîtrise Spring Boot 4 / Java 25 et Angular 21 (standalone, signals, new control flow)
- Déploiement sur Railway + Rancher Desktop en local
- Connaissance avancée de l'architecture du projet (ADRs rédigés, conventions respectées)

## Conventions du projet à respecter

- Java : records pour les DTOs, entités JPA mutables
- Angular : signals pour le state, `@if`/`@for` (pas `*ngIf`/`*ngFor`), pas de NgModules, pas de RxJS pour state
- Commits : conventional-commits en français (`feat(admin): ...`)
- Migrations DB : uniquement via Liquibase, jamais Hibernate ddl-auto=update
- CORS : uniquement dans SecurityConfig, WebConfig.java reste vide

## Préférences de collaboration

- Rapports en français
- Correctifs concrets avec diff et tests
- Ne pas ré-auditer WebConfig.java (intentionnellement vide)
- Vérifier la chaîne Spring Security avant de signaler une faille d'autorisation

**Why:** Déduit du CLAUDE.md et du contexte du projet lors de l'audit initial juin 2026
**How to apply:** Adapter le niveau de détail et le vocabulaire technique aux compétences du développeur
