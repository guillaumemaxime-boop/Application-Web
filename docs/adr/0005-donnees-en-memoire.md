# ADR-0005 : Données en mémoire en phase initiale (pas de base de données)

- **Statut** : Accepted
- **Date** : 2026-05-02
- **Décideurs** : Équipe Atelier Lumen
- **Tags** : backend, persistance, mvp

## Contexte

Le catalogue actuel contient un volume très restreint de données :

- 6 pièces de mobilier
- 5 expositions
- 1 profil studio

Ces données sont **rarement modifiées** (quelques mises à jour par trimestre lors d'une nouvelle exposition ou d'une nouvelle pièce) et il n'existe **aucun acteur tiers** qui les écrive (pas d'espace admin, pas d'API publique en écriture). Mettre en place une base de données dès le départ ajouterait :

- Un service supplémentaire à orchestrer (Postgres, migrations, sauvegardes)
- Une couche JPA / Hibernate à configurer et maintenir
- Un schéma à versionner alors que le modèle métier n'est pas encore stabilisé

## Décision

**Charger les données en mémoire** dans les services Spring (`FurnitureService`, `ExhibitionService`, `ProfileController`) sous forme de listes initialisées au démarrage.

- Les `record` Java 25 servent à la fois de modèle métier et de DTO de sortie
- Toutes les opérations sont en lecture seule
- Aucune dépendance `spring-boot-starter-data-jpa` n'est ajoutée tant que le besoin n'est pas confirmé
- Les fichiers Spring exposent quand même `/actuator/health` pour la conformité avec le déploiement

Cette décision est explicitement **temporaire** : le README documente déjà la procédure de migration vers JPA dans la section *Données*.

## Conséquences

### Positives
- Démarrage instantané, aucune dépendance externe à provisionner
- Modèle métier concentré dans le code Java, facile à faire évoluer rapidement
- Tests d'intégration triviaux (pas de fixture SQL, pas de Testcontainers)
- Conteneur Docker backend léger, sans driver JDBC

### Négatives / compromis
- Toute mise à jour du catalogue **nécessite un redéploiement** (modification de code + push)
- Pas d'historique de modification, pas de rollback granulaire
- Ne tient pas la charge si plusieurs instances sont déployées (état non partagé) — mais le projet est mono-instance pour l'instant
- À terme inadapté pour un espace admin

### Neutres
- Les contrôleurs et leurs contrats REST restent inchangés lors du passage à une vraie BDD : seule l'implémentation des services évoluera

## Alternatives envisagées

### Option A — PostgreSQL + Flyway dès le départ
Écartée pour le démarrage : trop d'overhead pour un volume de données aussi faible et un cycle de modification aussi lent. **Reste l'évolution cible** dès qu'un espace admin sera ajouté.

### Option B — Fichier JSON externe lu au démarrage
Écartée : avantage marginal vs. listes en dur, mais ajoute un point de défaillance (chemin de fichier, parsing, gestion d'erreur).

### Option C — CMS headless (Strapi, Sanity)
Écartée : sur-dimensionné, dépendance externe à maintenir, et l'éditorialisation peut très bien rester côté code tant que l'artisan ne réclame pas un back-office.

## Références

- [README.md — section Données](../../README.md)
- [`backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java`](../../backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java)
- [`backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java`](../../backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java)
