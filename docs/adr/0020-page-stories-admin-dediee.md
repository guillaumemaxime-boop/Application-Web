# 20. Page d'administration dédiée pour les stories

Date : 2026-06-19
Statut : Accepté

## Contexte

La gestion des stories était éclatée et peu ergonomique :
- création par un `prompt()` natif depuis les éditeurs de fiche mobilier/exposition ;
- renommage par `prompt()`, cover éditée inline, suppression/réordre dans un bloc Stories du formulaire ;
- édition des slides via `<app-story-inline editable>` **dans l'aperçu fullscreen** de la fiche (peu pratique).

Un bug rendait par ailleurs le cadrage du cover de story non fiable (un renommage envoyait `coverCrop=null` → reset). Et il n'existait aucun moyen, depuis une story, de gérer son appartenance aux sliders (seulement depuis la page Accueil). Depuis ADR-0018/SP6a, la story n'est plus rendue sur la fiche publique — sa gestion n'a donc plus de raison d'être couplée à l'éditeur de fiche.

## Décision

Centraliser toute la gestion des stories dans une **page d'administration dédiée** `/admin/stories` (entrée de menu « Stories »), et **retirer le bloc Stories des éditeurs de fiche** (qui conservent un simple lien « Gérer les stories » avec contexte owner en query params).

- **Backend** : nouvel endpoint `GET /api/admin/stories/manage` renvoyant une liste enrichie `StoryAdminView` (story + `slideCount` + `sliders` + `ownerTitle`) ; `/api/admin/stories/all` (filtré aux stories avec slides) reste dédié à la composition des sliders. `StoryService.update()` rendu **patch-safe** : un update sans cover/crop ne réinitialise plus le cadrage.
- **Frontend** :
  - `StoriesAdminComponent` (liste, filtres owner/recherche, actions Éditer/Cover/Sliders/Supprimer, gestion de l'appartenance aux sliders par cases à cocher).
  - `StoryCreateModalComponent` (modale : sélecteur d'owner — l'owner reste obligatoire, c'est l'id technique du meuble/expo — + titre + cover/cadrage + ajout optionnel à un slider).
  - `StorySlideEditorComponent` (sous-route `/admin/stories/:id`) : **éditeur deux panneaux** — rail de vignettes (réordre `appReorderable` + repli clavier ↑/↓ + ajout des 4 types + suppression) et éditeur du slide sélectionné, **auto-save** via `replaceStorySlides`, aperçu via `<app-story-viewer>`.
  - Suppression des composants `story-inline` et `story-manager-bar` (logique d'édition des 4 types migrée dans l'éditeur deux panneaux).

## Conséquences

- (+) Un seul endroit pour créer/éditer/supprimer une story, gérer son cover, ses slides et son appartenance aux sliders ; parcours plus clair.
- (+) Bug de cadrage cover corrigé (update patch-safe) ; édition des slides confortable (page pleine au lieu de l'aperçu).
- (+) Éditeurs de fiche allégés (cover/galerie/tags/vidéo uniquement) ; rendu public inchangé.
- (-) Une story doit toujours appartenir à un owner existant — la modale impose donc un sélecteur d'owner (pas de création de story « orpheline »).
- (-) `GET /manage` agrège stories+slides+sliders en mémoire à chaque appel (négligeable au volume d'un portfolio ; un `GET /api/admin/stories/{id}` ciblé serait plus économique si le volume croît).
- (-) Le réordonnancement global des stories n'a pas de sens dans une liste multi-owner : les flèches de réordre ont été retirées de la liste (la position reste par owner).

## Alternatives écartées

- **Garder la gestion dans les fiches** en corrigeant seulement le bug cover : ne résout ni l'ergonomie de création (prompt), ni l'édition des slides en aperçu, ni le lien story↔slider.
- **Coexistence page dédiée + gestion en fiche** : double point d'entrée à maintenir ; l'utilisateur a tranché pour le remplacement (la fiche garde un simple lien).
- **Éditeur de slides en colonne unique** (évolution de `story-inline`) : moins lisible que le deux-panneaux pour des slides riches à 4 types.
