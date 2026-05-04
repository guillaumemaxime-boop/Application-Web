# Architecture Decision Records (ADR)

Ce dossier regroupe les **Architecture Decision Records** du projet **Atelier Lumen Portfolio**.

## Qu'est-ce qu'un ADR ?

Un ADR documente une **décision d'architecture significative**, son **contexte**, ses **conséquences** et les **alternatives** envisagées. Il rend la conception explicite, traçable et discutable.

Référence : [adr.github.io](https://adr.github.io/) — format inspiré de [MADR](https://adr.github.io/madr/).

## Convention

- Un fichier par décision : `NNNN-titre-en-kebab-case.md`
- Numérotation incrémentale, jamais réutilisée même si l'ADR est marqué *Superseded*
- Statut possible : `Proposed` · `Accepted` · `Deprecated` · `Superseded by ADR-XXXX`
- Une décision = un ADR. Si la décision change, on crée un **nouveau** ADR qui remplace l'ancien (on ne réécrit pas l'historique)
- Format de date : `YYYY-MM-DD`

## Index

| ADR  | Titre                                                                  | Statut    | Date       |
|------|------------------------------------------------------------------------|-----------|------------|
| 0001 | [Utiliser des ADR pour documenter les décisions](0001-utiliser-des-adr.md) | Accepted  | 2026-05-02 |
| 0002 | [Architecture full-stack séparée backend / frontend](0002-architecture-full-stack-separee.md) | Accepted  | 2026-05-02 |
| 0003 | [Java + Spring Boot pour l'API backend](0003-backend-spring-boot.md)   | Accepted  | 2026-05-02 |
| 0004 | [Angular standalone + signaux pour le frontend](0004-frontend-angular-standalone-signaux.md) | Accepted  | 2026-05-02 |
| 0005 | [Données en mémoire en phase initiale (pas de BDD)](0005-donnees-en-memoire.md) | Accepted  | 2026-05-02 |
| 0006 | [Conteneurisation Docker + déploiement Rancher Desktop](0006-conteneurisation-docker-rancher.md) | Accepted  | 2026-05-02 |
| 0007 | [CI GitHub Actions avec workflows réutilisables](0007-ci-github-actions-workflows-reutilisables.md) | Accepted  | 2026-05-02 |
| 0008 | [Stratégie de tests : JUnit + Karma/Jasmine](0008-strategie-de-tests.md) | Accepted  | 2026-05-02 |
| 0009 | [CORS restreint aux origines de développement local](0009-cors-developpement-local.md) | Accepted  | 2026-05-02 |
| 0010 | [Supervision et monitoring — Actuator + healthchecks natifs + Railway](0010-supervision-et-monitoring.md) | Accepted  | 2026-05-04 |

## Créer un nouvel ADR

1. Copier [`template.md`](template.md)
2. Le renommer en `NNNN-titre.md` (numéro suivant disponible)
3. Renseigner les sections, ouvrir une PR
4. Ajouter une ligne dans l'index ci-dessus
