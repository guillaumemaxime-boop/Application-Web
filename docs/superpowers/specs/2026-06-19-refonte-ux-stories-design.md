# Refonte UX des stories (admin) — Spec

**Date** : 2026-06-19
**Statut** : ✅ Implémenté — mergé sur main (ADR-0020)
**Type** : Refonte UX + correctif (backlog, demandé le 19/06/2026). Chantier unique (l'utilisateur a choisi de ne pas décomposer).

## Objectif

Repenser l'expérience de création et d'édition des stories en admin autour d'une **page dédiée « Stories »**, remplaçant la gestion éclatée actuelle (prompt natif + bloc en fiche + édition de slides coincée dans l'aperçu fullscreen). Couvre les 4 points du backlog :
1. Création de story user-friendly (modale au lieu du `prompt()`).
2. **Correctif** du cover de story (cadrage qui « ne fonctionne pas »).
3. Édition des slides confortable (éditeur deux panneaux en page pleine).
4. Ajout d'une story à un slider directement à la création.

## Contexte (existant)

- Une story appartient **toujours** à un owner : `StoryInput` exige `ownerKind` (`furniture`/`exhibition`) + `ownerId` (backend `StoryService`).
- Aujourd'hui la gestion vit dans `MobilierComponent`/`ExpositionsComponent` : `newStory()` = `prompt()` natif ; bouton « Cover » → `<app-image-field cropEnabled>` inline ; `renameStory()` = `prompt()` ; suppression/réordre ; édition des slides via `<app-story-inline>` dans l'aperçu fullscreen (`<app-story-manager-bar>` pilote la story active).
- **Bug latent identifié** : `renameStory()` (et autres updates partielles) appellent `updateStory` **sans** `coverCrop` → côté backend `coverCrop` nul = reset → le cadrage cover est perdu au renommage.
- Endpoints : `GET /api/admin/stories?ownerKind&ownerId`, `GET /api/admin/stories/all` (désormais **filtré aux stories avec slides**, pour la composition slider), `POST/PUT/DELETE /api/admin/stories`, `PUT /api/admin/stories/{id}/position`, `GET/PUT /api/admin/stories/{id}/slides`. Sliders : `PUT /api/admin/sliders/{id}/stories`.
- 4 types de slides : `image` (avec cadrage), `video`, `spec`, `quote`.
- Validation visuelle des maquettes faite via le compagnon visuel (création = modale ; page dédiée = remplace la fiche ; éditeur slides = deux panneaux).

## Décisions validées

| Sujet | Choix |
| --- | --- |
| Point d'entrée | **Entrée menu admin « Stories »** (route `/admin/stories`, `authGuard`) |
| Gestion en fiche | **Retirée** des éditeurs mobilier/expo → remplacée par un lien « Gérer les stories » |
| Création | **Modale** : owner (obligatoire) + titre + cover (+ cadrage) + ajout slider (optionnel) |
| Édition slides | **Deux panneaux** : rail vignettes (drag + ↑/↓ + ajouter/supprimer) + éditeur du slide sélectionné + bouton Aperçu (`story-viewer`) |
| Cover | Correctif du bug + `coverCrop` préservé sur toute update partielle |
| Sliders | Gérés sur la page Accueil ; page Stories **affiche** l'appartenance + ajout **à la création** uniquement |
| Réordre stories | **Par owner** (pas d'ordre global) |

## Architecture

### 1. Route & navigation
- Nouvelle route lazy `admin/stories` → `StoriesAdminComponent` (`authGuard`, titre « Stories — Admin »).
- Entrée « Stories » ajoutée à la navigation latérale admin (entre Expositions et Navigation).
- Fiches mobilier/expo : suppression du bloc Stories (form-side et in-preview story management) ; ajout d'un lien/bouton **« Gérer les stories »** → `/admin/stories` (avec contexte owner, ex. query param `?ownerKind=furniture&ownerId=...` pour pré-filtrer/pré-remplir).

### 2. `StoriesAdminComponent` (page liste)
- Charge la **liste enrichie** de toutes les stories (voir Backend) : par story → cover (+crop), titre, owner (kind + titre owner), `slideCount`, sliders d'appartenance (titres), flag « vide ».
- Filtres : type d'owner (Tous/Mobilier/Expo) + recherche texte (titre/owner) — signaux + `computed`.
- Bouton **« + Nouvelle story »** → ouvre `StoryCreateModalComponent`.
- Ligne : vignette (`<app-cropped-image-canvas>`), titre, badges, `slideCount`, sliders, alerte vide ; actions **Éditer** (→ éditeur slides), **Cover** (édition cover inline/modale), **⋯** (Renommer, Supprimer, Monter/Descendre dans l'owner).
- Réordre : `PUT /position` au sein du même owner.

### 3. `StoryCreateModalComponent` (création)
- Modale `role="dialog"` + `aria-modal` + `cdkTrapFocus` + Échap + restitution focus.
- Champs : **owner** (select listant `Mobilier: <titre>` / `Expo: <titre>` — chargé via `getFurniture()`/`getExhibitions()`), **titre** (input), **cover** (`<app-image-field cropEnabled>` + crop), **ajouter à un slider** (select optionnel des sliders).
- Action « Créer » : `createStory({ownerKind, ownerId, title, coverImage, coverCrop})` → si slider choisi, append via `replaceSliderStories(sliderId, [...storyIds, newId])` → ouvre l'éditeur de slides de la nouvelle story. Erreurs via `ToastService`.
- Pré-remplissage : si ouverte avec un contexte owner (depuis une fiche), owner pré-sélectionné.

### 4. Cover de story — correctif
- **Diagnostic à mener** (root-cause du « ne fonctionne pas » : cadrage non appliqué au rendu ? crop picker mal initialisé ? persistance ?), puis correctif ciblé (systematic-debugging).
- **Garde-fou** : centraliser les updates de story pour **toujours** transmettre `coverCrop` (et le titre, la cover) — `renameStory`/`saveCover`/réordre ne doivent jamais nuller `coverCrop` par omission. Cadrage cohérent en liste, `story-viewer`, cards `news-slider`.

### 5. `StorySlideEditorComponent` (deux panneaux)
- **Rail gauche** : vignettes numérotées des slides, réordre **drag** via la directive maison **`appReorderable`** (cohérence projet), repli clavier ↑/↓, bouton **+ ajouter** (menu de type : image/vidéo/specs/citation), suppression par slide.
- **Panneau droit** : éditeur du slide sélectionné, champs selon le type (image : src + cadrage via crop picker ; vidéo : src + poster ; specs : liste label/valeur ; citation : texte + auteur). **Auto-save** des slides via `replaceStorySlides` (cohérent avec l'éditeur in-place existant `story-inline`).
- **Bouton « Aperçu »** → ouvre `<app-story-viewer>` (rendu public réel, plein écran).
- En **page pleine** via une **sous-route `admin/stories/:id`** (lazy, `authGuard`) — permet le deep-link et un vrai plein écran. a11y : navigation clavier complète, `aria-live` pour ajout/réordre/suppression, focus visible, intitulés contextualisés.
- Réutilise au maximum la logique de `story-inline` (rendu/édition des 4 types, crop image) en la sortant de l'aperçu fiche.

### 6. Backend
- `/api/admin/stories/all` **inchangé** (filtré aux stories avec slides — consommé par la composition slider).
- **Nouvel endpoint de gestion** : `GET /api/admin/stories/manage` → `List<StoryAdminView>` où `StoryAdminView` = story + `slideCount` (int) + `sliders` (liste `{id, title}` des sliders contenant la story) + `ownerTitle` (titre du meuble/expo). Toutes les stories (vides incluses). Service : agrège via `StorySlideRepository` (compte par story) + `NewsSliderRepository` (appartenance). Test dédié.
- Aucun changement de schéma (owner, cover, coverCrop, slides existent).

### 7. Suppression / migration
- Retirer de `MobilierComponent`/`ExpositionsComponent` : `newStory`/`renameStory`/`deleteStory`/cover editor/réordre/`story-inline` in-preview liés aux stories, et le bloc form-side Stories. Conserver l'aperçu fiche **sans** la gestion des stories (la story n'est de toute façon plus rendue sur la fiche publique depuis SP6a). Ajouter le lien « Gérer les stories ».
- Nettoyer les specs associés.

## Tests

- **Backend** : `StoryService`/contrôleur — l'endpoint `manage` renvoie toutes les stories enrichies (slideCount, sliders, ownerTitle), y compris vides ; `coverCrop` préservé sur update (titre seul ne reset pas le crop) — test de régression du bug latent.
- **Frontend** :
  - `StoriesAdminComponent` : liste, filtres, recherche, actions (ouvre modale/éditeur), réordre.
  - `StoryCreateModalComponent` : owner picker peuplé, création appelle `createStory` avec les bons champs, ajout slider optionnel (`replaceSliderStories`), ouverture de l'éditeur, a11y modale.
  - `StorySlideEditorComponent` : rail + sélection, ajout par type, réordre (drag + clavier), suppression, aperçu (`story-viewer`), édition des 4 types, cadrage image.
  - Fiches : bloc Stories retiré, lien « Gérer les stories » présent ; specs mobilier/expo mis à jour.
- **Régression** : suites back + front vertes ; baselines Playwright publiques intactes (page admin hors captures).

## Hors portée

- Gestion complète des sliders depuis la page Stories (reste sur Accueil ; ici : affichage + ajout à la création).
- Ordre global des stories (réordre reste par owner).
- Changement du rendu public des stories / du `story-viewer` (réutilisé tel quel).
- Création d'un owner (meuble/expo) depuis la modale story (l'owner doit préexister).
