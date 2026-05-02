# ADR-0001 : Utiliser des ADR pour documenter les décisions d'architecture

- **Statut** : Accepted
- **Date** : 2026-05-02
- **Décideurs** : Équipe Atelier Lumen
- **Tags** : process, documentation

## Contexte

Le projet Atelier Lumen Portfolio démarre avec un stack volontairement simple (Spring Boot + Angular, données en mémoire) mais des choix structurants ont déjà été faits : séparation back/front, conteneurisation Docker, CI GitHub Actions, etc. Ces décisions ne sont nulle part formalisées : seul le code et les commits en gardent la trace.

Quand un nouvel arrivant rejoint le projet — ou quand on revient sur une décision plusieurs mois plus tard — il est difficile de reconstituer **pourquoi** un choix a été fait, **quelles alternatives** avaient été envisagées, et **dans quel contexte** la décision restait valide.

## Décision

Adopter le format **ADR (Architecture Decision Records)** pour documenter, dans le dépôt, chaque décision d'architecture significative.

- Les ADR sont stockés dans `docs/adr/`
- Un fichier Markdown par décision, nommé `NNNN-titre-en-kebab-case.md`
- Numérotation incrémentale, jamais réutilisée
- Format inspiré de **MADR** : Contexte / Décision / Conséquences / Alternatives
- Un index dans `docs/adr/README.md` recense tous les ADR avec leur statut
- Une décision rétractée n'est **pas** supprimée : on crée un nouvel ADR qui la *supersede*

## Conséquences

### Positives
- L'historique des décisions est versionné avec le code, donc toujours synchronisé
- Les revues de PR peuvent porter sur la décision elle-même, pas seulement le code
- Onboarding facilité : un nouveau contributeur lit `docs/adr/` pour comprendre le projet
- Les compromis assumés (ex : pas de BDD au démarrage) deviennent explicites

### Négatives / compromis
- Légère friction : il faut prendre le temps d'écrire l'ADR avant ou en parallèle de la PR
- Risque de dérive si les ADR ne sont pas tenus à jour (statut obsolète non marqué)

### Neutres
- Le format reste léger (Markdown) et n'impose aucun outil tiers

## Alternatives envisagées

### Option A — Tout documenter dans le `README.md`
Écartée : le README mélange déjà setup, endpoints, et caractéristiques techniques. Y empiler l'historique des décisions le rendrait illisible et perdrait la traçabilité par décision.

### Option B — Wiki externe (Confluence, Notion, GitHub Wiki)
Écartée : la documentation se désynchronise du code, n'est pas review-able en PR, et impose un outil tiers à tous les contributeurs.

### Option C — Pas de documentation explicite, s'appuyer sur git log
Écartée : les messages de commit décrivent *quoi*, pas *pourquoi*. Reconstituer un raisonnement à partir du log est coûteux.

## Références

- [adr.github.io](https://adr.github.io/) — index des formats ADR
- [MADR](https://adr.github.io/madr/) — Markdown Architecture Decision Records
- Michael Nygard, *Documenting Architecture Decisions*, 2011
