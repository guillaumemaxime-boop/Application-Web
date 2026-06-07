# ADR-0015 : Stories multiples par owner + sliders d'actualités

- **Statut** : Accepted
- **Date** : 2026-06-07
- **Décideurs** : Maxime Guillaume
- **Tags** : backend, frontend, editorial, home

## Contexte

Avant cette décision, chaque pièce de mobilier ou exposition pouvait avoir au plus un ensemble de slides éditoriaux, via une relation implicite `(owner_kind, owner_id)` directement sur `story_slide`. Ce modèle imposait plusieurs limitations :

- Impossible de varier les angles éditoriaux d'une même pièce (ex. une story "atelier" vs une story "finitions").
- Aucun mécanisme pour composer un **carrousel d'actualités** sur la home à partir de stories appartenant à des owners différents.
- Le contenu éditorial était figé à la structure 1 owner = 1 collection de slides.

Par ailleurs la home ne disposait d'aucun widget "sliders d'actualités" configurable par l'admin — toute mise en avant éditoriale passait par le marquage `featured` sur les entités.

## Décision

Passage à une relation **1:N entre owner et stories** via une nouvelle entité `story` (table `story`) portant les champs `owner_kind`, `owner_id`, `title`, `cover_image`, `slug`, `position`, `created_at`. Les `story_slide` référencent désormais `story_id` (FK CASCADE) au lieu de `(owner_kind, owner_id)`.

Création d'une entité **`news_slider`** (table `news_slider`) qui composite N stories (de N owners potentiels) dans une liste ordonnée (`slider_story` avec `position`), assignée à une **zone nommée** (`zone_key` : `news.primary`, `news.secondary`, `news.tertiary`) sur la home.

La migration est découpée en **4 changesets Liquibase atomiques** (022→025) suivant la séquence sûre en présence de données de production :
1. `022` : création de la table `story`
2. `023` : backfill — génération d'une story par owner existant
3. `024` : ajout de `story_id` sur `story_slide` (nullable → backfill → NOT NULL → FK → drop anciennes colonnes + index)
4. `025` : création de `news_slider` + table de jointure `slider_story`

Côté frontend, un `StoryViewerComponent` (modale plein écran, focus trap, navigation tactile et clavier, fermeture Échap + restore focus) sert de viewer réutilisable ; un `NewsSliderComponent` consomme l'endpoint public `/api/sliders` pour afficher les carrousels de la home.

## Conséquences

### Positives

- Flexibilité éditoriale : N stories par pièce ou exposition, angles variés indépendamment.
- Composition manuelle des sliders d'actualités depuis l'admin (drag & drop) dans la page Accueil consolidée.
- Viewer plein écran réutilisable pour mobilier, expositions et sliders.
- Découplage fort : un slider peut référencer des stories d'owners hétérogènes.

### Négatives / compromis

- 4 changesets Liquibase à maintenir pour une migration safe ; rollback impossible sans perte de données.
- Complexité accrue de la requête `findSlidesForOwner` (agrégation cross-stories via join story).
- 4 nouveaux endpoints REST publics + CRUD admin complet (`/api/admin/sliders/**`, `/api/admin/stories/**`).

### Neutres

- La table `slider_story` se nomme `slider_story` en base (pas `news_slider_story` comme initialement envisagé) — nommage plus court, sans impact sur le comportement.
- La zone est nullable : un slider sans zone est valide (non assigné à la home mais visible en admin).

## Alternatives envisagées

### Option A — Garder la relation 1:1 et typer les slides en "chapitres"

Stocker plusieurs "chapitres" éditoriaux comme des slides typées sur l'unique story existante.

Rejeté : ne résout pas le problème de composition cross-owners pour les actualités ; la sémantique des slides (visuels d'une story) est mélangée avec la navigation éditoriale de haut niveau.

### Option B — Playlists éditoriales en pur frontend

Stocker la composition des sliders en localStorage ou en state frontend sans persistance.

Rejeté : non persistant côté admin, impossible à partager entre sessions ou à déployer via l'interface CMS.

### Option C — Table `playlist` générique avec items polymorphes

Une table `playlist` avec items pouvant référencer indifféremment furniture, exhibition ou story.

Rejeté : surconception par rapport au besoin réel (composer des stories) ; moins explicite qu'une entité `news_slider` dédiée.

## Références

- Changesets Liquibase : `022-create-story.yaml`, `023-seed-default-stories.yaml`, `024-refactor-story-slide.yaml`, `025-create-news-slider.yaml`
- Entités JPA : `StoryEntity`, `NewsSliderEntity`, `NewsSliderStoryEntity`
- Endpoints publics : `StoryController` (`/api/stories`), `SliderController` (`/api/sliders`)
- Endpoints admin : `AdminStoriesController` (`/api/admin/stories/**`), `AdminSlidersController` (`/api/admin/sliders/**`)
- Frontend : `StoryViewerComponent`, page admin Accueil (`AccueilComponent`) intégrant la composition slider en drag & drop
