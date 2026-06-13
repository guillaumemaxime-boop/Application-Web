# Sliders d'actualités éditables dans le preview accueil — Spec

**Date** : 2026-06-13
**Statut** : Validé — prêt pour writing-plans
**Sous-projet** : 5/6 du chantier « Améliorations WYSIWYG v2 » (découpage : voir spec `2026-06-10-wysiwyg-socle-factorise-design.md`, section Contexte). S'appuie sur les sous-projets 1-4, mergés sur main.

## Objectif

Éditer les sliders d'actualités de la page d'accueil directement depuis son preview WYSIWYG : renommer, composer (ajouter/retirer/réordonner les stories), créer, supprimer, changer de zone — sans repasser par l'éditeur form-side. Aujourd'hui le preview affiche les sliders en lecture seule avec une cartouche `[i]` qui renvoie vers la section « Sliders » du mode Modifier.

## Périmètre validé

| Choix | Retenu | Écarté |
| --- | --- | --- |
| Édition | Composition (stories) + titre + CRUD (créer/supprimer/zone), tout depuis le preview | « Juste ouvrir l'éditeur en overlay » |
| Sauvegarde | Auto-save immédiat (chaque action = appel API + toast), pas d'undo | Annulation par toast ; bouton Enregistrer groupé |
| Form-side | Conservé (double accès) ; logique de composition extraite et partagée | Remplacé par le preview ; preview minimal |
| Réordonnancement stories | Via l'éditeur de composition extrait (liste + ↑↓) | Drag sur le carrousel `<app-news-slider>` (carrousel ≠ grille de drag) |

## Décisions architecturales

### 1. Flux de données (vue pure → page)

`home-view` est pur (ADR-0018) et reçoit `sliders: NewsSliderView[]` (forme publique : `id`, `zoneKey`, `stories: SliderStoryRef[]` avec `id` de story). Il a de quoi **identifier** ce qu'il édite mais ne fetche rien : il émet des events, `AccueilComponent` (qui détient `PortfolioService`) exécute les appels API en auto-save + toast + re-fetch `getPublicSliders()` pour rafraîchir le preview. `<app-home-preview>` relaie les nouveaux outputs entre le view et la page.

### 2. `<app-slider-composition-editor>` extrait (admin partagé)

Chemin : `frontend/src/app/pages/admin/shared/slider-composition-editor.component.ts`. La modale de composition (liste « disponibles » + filtre + sélection, liste « composition courante » + ↑↓ + retrait) est extraite de `SlidersComponent` vers un composant réutilisable.

- **Inputs** : `title: string`, `storyIds: string[]`, `allStories: Story[]`.
- **Outputs** : `save: string[]` (nouvelle liste ordonnée d'ids), `cancel: void`.
- État interne en signaux (`pendingStoryIds`, `selectedToAdd`, `storyFilter`). Modale `role="dialog"` + `aria-modal` + `cdkTrapFocus` + Échap (repris de l'existant).
- `SlidersComponent` se refactore pour l'utiliser (son spec existant reste le filet de sécurité du refactor).
- `AccueilComponent` le rend en overlay quand `editingSliderId` est défini ; les `storyIds` courants sont dérivés de `NewsSliderView.stories.map(s => s.id)` (pas de re-fetch admin), `allStories` vient de `getAllAdminStories()` (chargé en lazy une seule fois).

### 3. Affordances inline dans `home-view` (mode editable)

Pour chaque zone de `SLIDER_ZONES` (`home-top`/`home-middle`/`home-bottom`) :

- **Zone occupée** → slider rendu avec :
  - **titre éditable inline** : double-clic → `contenteditable` → blur émet `sliderTitleEdit({ id, title })` (pattern inline du chantier) ;
  - **composition** : le badge `[i]` existant déclenche `sliderCompositionRequested(id)` (ouvre l'éditeur §2) ;
  - **suppression** : bouton `×` → `sliderDelete(id)` ;
  - **changement de zone** : sélecteur → `sliderZoneChange({ id, zoneKey })`.
- **Zone vide** → placeholder « + Créer un slider ici » → `sliderCreate(zoneKey)`.
- L'ancien output `sliderEditRequested` est **supprimé** (remplacé par `sliderCompositionRequested` + les nouveaux).
- **Mode public (non-editable)** : rendu inchangé (carrousels `<app-news-slider>`, pas d'affordance).

### 4. Handlers auto-save dans `AccueilComponent`

Chaque handler : appel API → toast (succès/erreur) → re-fetch `getPublicSliders()` (rafraîchit le signal `sliders` du preview).

- `onSliderTitleEdit({ id, title })` → `updateSlider(id, { title, zoneKey })` (zoneKey courant lu dans le `NewsSliderView`).
- `onSliderCompositionRequested(id)` → charge `getAllAdminStories()` (lazy, mémoïsé) + `editingSliderId.set(id)` ; au `save(storyIds)` de l'éditeur → `replaceSliderStories(id, storyIds)` ; `cancel` → ferme.
- `onSliderDelete(id)` → `confirm(...)` → `deleteSlider(id)`.
- `onSliderZoneChange({ id, zoneKey })` → **garde** : si la zone cible est déjà occupée par un autre slider, toast d'erreur sans appel (une zone = un slider) ; sinon `updateSlider(id, { title, zoneKey })`.
- `onSliderCreate(zoneKey)` → `prompt()` titre (annule si vide) → `createSlider({ title, zoneKey })`.

Pas d'undo (accueil auto-save, cohérent SP1) ; pas de garde-fou dirty (pas de FormGroup côté accueil).

## Tests

- **`slider-composition-editor.component.spec.ts`** (nouveau) : reprend les assertions composition de l'actuel `SlidersComponent` spec (ajout depuis disponibles, filtre, retrait, ↑↓, `save` émet l'ordre courant, `cancel`), pilotées par inputs/outputs.
- **`sliders.component.spec.ts`** : conservé ; le refactor (form-side délègue à l'éditeur extrait) garde le comportement observable.
- **`home-view`** : mode editable rend titre éditable + badge composition + `×` + sélecteur zone ; zone vide rend le placeholder create ; chaque interaction émet le bon output ; mode public inchangé (carrousels, pas d'affordance).
- **`accueil.component.spec.ts`** : chaque handler déclenche le bon appel API + re-fetch ; garde zone occupée (pas d'appel + toast erreur) ; `confirm` refusé sur delete = pas d'appel ; composition `save` → `replaceSliderStories`.
- **Baselines Playwright** : rendu public des sliders inchangé → intactes.

## Hors portée

- Undo/redo des opérations sliders (accueil auto-save).
- Drag-reorder des stories sur le carrousel.
- Gestion des stories elles-mêmes (créées/éditées via les fiches mobilier/exposition).
- Réordonnancement des zones entre elles.
- Sliders hors accueil.
- Restitution de focus fine après fermeture de l'éditeur de composition (dette a11y existante du chantier ; l'éditeur garde `cdkTrapFocus` + Échap, mais la restitution au déclencheur depuis le preview est tracée pour une passe a11y ultérieure).
