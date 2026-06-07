# ADR-0016 : Tags partagés mobilier/exposition et page publique /creations

- **Statut** : Accepted
- **Date** : 2026-06-07
- **Décideurs** : Maxime Guillaume
- **Tags** : backend, frontend, catalogue, accessibilité

## Contexte

L'entité `exhibition` disposait déjà d'un champ `tags` implémenté via `@ElementCollection` sur une table `exhibition_tag`. Le mobilier (`furniture`) n'avait aucun équivalent, rendant la recherche multi-facettes asymétrique.

Par ailleurs, aucune page publique ne croisait les deux catalogues. Un visiteur souhaitant explorer toutes les "créations" de l'atelier devait naviguer séparément entre `/mobilier` et `/expositions` sans filtre commun.

Les besoins identifiés :
1. Taguer librement chaque pièce de mobilier avec des mots-clés thématiques.
2. Disposer d'une page unique listant l'ensemble des créations (mobilier + expositions), filtrable par type, année et tags.
3. Partager un composant de saisie de tags réutilisable dans les formulaires admin.

## Décision

**Symétrie backend** : ajout d'un `@ElementCollection` sur `FurnitureEntity` → table `furniture_tag` (colonnes `furniture_id` FK CASCADE, `position`, `entry_value`) via le changeset 026. Même pattern que `exhibition_tag`, même type de colonne (`varchar(255)`).

**Endpoint public agrégé** `GET /api/tags` (`TagController`) : retourne l'union dédupliquée et triée (locale FR) des tags des deux entités (mobilier + expositions). Chaque tag est borné à 255 caractères ; chaque entité accepte au maximum 30 tags (Bean Validation + `@Size`).

**Composant partagé `<app-tag-input>`** (`TagInputComponent`, `frontend/src/app/pages/admin/shared/`) : implémente `ControlValueAccessor` (intégration `ReactiveFormsModule`), WAI-ARIA combobox/listbox avec navigation clavier complète (flèches haut/bas, Entrée, Échap, virgule comme séparateur, Backspace pour retirer le dernier tag). Réutilisable dans les formulaires admin mobilier et expositions.

**Page publique `/creations`** (`CreationsComponent`) : charge mobilier et expositions en parallèle via `forkJoin`, construit les facettes (années, tags) en `signal`/`computed`, filtre en **union OR** (un élément matche s'il possède au moins un des tags sélectionnés *et* au moins une des années sélectionnées). L'état des filtres est synchronisé dans les **query params** (`?tags=&years=&kind=`) pour le deep-linking et le partage d'URL. Pas de nouvel endpoint backend consolidé — réutilisation des endpoints existants `/api/furniture` et `/api/exhibitions`.

## Conséquences

### Positives

- Symétrie complète du modèle : mobilier et expositions partagent le même mécanisme de tags.
- Factorisation UI admin : `TagInputComponent` est réutilisable dans tous les formulaires de l'admin.
- Page filtrable performante : calculs des facettes côté client (signals/computed), pas de round-trip réseau par interaction filtre.
- Deep-links partageables : `?tags=bois,sculpture&years=2024&kind=furniture`.
- Découverte élargie : filtre OR (logique d'union) — sélectionner plusieurs tags élargit les résultats au lieu de les restreindre.

### Négatives / compromis

- Deux requêtes HTTP au chargement de `/creations` au lieu d'une seule consolidée.
- La table `furniture_tag` a comme colonne de valeur `entry_value` (convention `@ElementCollection` Spring) et non `tag` comme `exhibition_tag` — légère asymétrie de nommage en base.

### Neutres

- La convention tags est bornée à 30 éléments par entité et 255 caractères par tag, cohérente avec la contrainte `exhibition_tag` existante.
- Les facettes sont calculées sur le résultat complet (avant filtre de kind) pour que les compteurs par facette reflètent l'ensemble disponible.

## Alternatives envisagées

### Option A — Endpoint serveur `GET /api/creations` consolidé

Un seul endpoint backend agrégeant mobilier et expositions avec support des filtres.

Rejeté : duplique la logique de filtrage côté backend, casse les caches HTTP existants sur `/api/furniture` et `/api/exhibitions`, ajoute un endpoint à maintenir pour chaque nouvelle facette.

### Option B — Table `tag` partagée avec FK

Extraire les tags dans une table dédiée avec FK vers furniture / exhibition.

Rejeté : incompatible avec le pattern `@ElementCollection` déjà établi sur `exhibition_tag` ; surconception pour des listes de mots-clés sans relation entre eux.

### Option C — Filtrage en intersection (AND)

Sélectionner plusieurs tags restreint les résultats (logique ET).

Rejeté : contre-intuitif pour la **découverte** de catalogue — l'utilisateur qui sélectionne "bois" puis "sculpture" s'attend à voir plus de résultats, pas moins.

### Option D — Composant ng-select ou autre librairie externe pour les tags

Utiliser une librairie tierce (ng-select, ngx-chips…) pour la saisie de tags.

Rejeté : introduce une dépendance externe pour un besoin couvert en ~200 lignes de TypeScript, et les librairies tierces imposent souvent leur style propre difficilement harmonisable avec le design system existant.

## Références

- Changeset Liquibase : `026-add-tags-to-furniture.yaml`
- Endpoint : `TagController` (`/api/tags`), `TagService`
- Entité JPA : `FurnitureEntity` (`@ElementCollection furniture_tag`)
- Frontend : `TagInputComponent` (`frontend/src/app/pages/admin/shared/tag-input.component.ts`)
- Frontend : `CreationsComponent` (`frontend/src/app/pages/creations/creations.component.ts`), modèle `CreationItem` (`creation.model.ts`)
- Fix a11y associé : B-01 RGAA — navigation clavier combobox/listbox (flèches, aria-activedescendant)
