# Édition des slides EN PLACE dans le preview (sous-projet 6b) — Spec

**Date** : 2026-06-13
**Statut** : Validé — à planifier
**Sous-projet** : 6b du chantier « Améliorations WYSIWYG v2 » — **dernier sous-projet du chantier**. Suite directe du 6a (`docs/superpowers/specs/2026-06-13-wysiwyg-stories-fiches-6a-design.md`, mergé). S'appuie sur SP1-5 + 6a.

## Objectif

Éditer les slides d'une story **en place** (pur WYSIWYG, auto-save) directement sur le rendu de la story dans le bloc d'auteur admin du preview des fiches mobilier/exposition, en **remplacement de la modale `<app-slides-editor>`** mise en place au 6a. Les 4 types de slides deviennent éditables sur leur rendu réel : image, vidéo, caractéristiques (spec), citation ; avec ajout, suppression et réordonnancement.

## Contexte

Au 6a : le bloc d'auteur admin rend la story active via `<app-story-inline [slides]="previewDisplaySlides()">` (enrichi cover/link, **lecture seule**) ; l'édition du contenu passe par une **modale** réutilisant `<app-slides-editor>` (éditeur orienté formulaire). 6b supprime cette modale au profit de l'édition directe sur le rendu.

Faits établis :
- `<app-story-inline>` (`components/story-inline/`) n'est **plus rendu qu'en mode editable** dans le bloc d'auteur (le 6a l'a retiré du rendu public). Il filtre déjà aux 4 types narratifs (`sections()` exclut cover/link).
- Modèle `Slide` = `ImageSlide { src; caption }` | `VideoSlide { src; caption }` | `SpecSlide { specs: {label;value}[] }` | `QuoteSlide { body; cite }` (tous `id`, `position`). **`ImageSlide` n'a pas de champ crop.**
- Les vrais slides de la story active sont déjà chargés au 6a (`activeStorySlides: signal<Slide[]>`, via `getStorySlides(id)`), et persistés par `replaceStorySlides(storyId, slides)` (remplace toute la liste).
- `enrichSlides(...)` ajoute les slides synthétiques `cover`/`link` (non éditables) — utilisé pour la lecture seule, pas pour l'édition.

## Périmètre validé

| Choix | Retenu | Écarté |
| --- | --- | --- |
| Où vit l'édition | **Mode `editable` ajouté à `<app-story-inline>`** (édition sur le rendu exact) | Nouveau composant dédié ; faire évoluer la modale |
| Ajout de slide | **Barre de fin** (4 types) **+ points d'insertion** entre slides | Un seul des deux |
| Réordonnancement | **Drag** via `ReorderableDirective` (comme la galerie) | Boutons ↑↓ |
| Persistance | **Auto-save** : blur (texte) + immédiat (structurel) → `replaceStorySlides` | Bouton Enregistrer groupé |
| Retour save | **Indicateur discret « Enregistrement… / Enregistré ✓ »** ; toast en erreur seulement | Toast à chaque action |
| Image | Remplacer (médiathèque) + légende inline | Crop (le modèle ne le porte pas) |
| Form-side | `slides-editor` form-side d'origine **conservé** (hors preview) | Supprimé |

## Décisions architecturales

### 1. `<app-story-inline>` — mode éditable

- **Inputs** : `slides: DisplaySlide[]` (existant) + nouveau `editable: boolean = false`.
  - En **lecture seule** (`editable=false`) : rendu actuel inchangé (sur `displaySlides`).
  - En **éditable** (`editable=true`) : la page passe les **vrais slides** `activeStorySlides` (type `Slide[]`, sous-ensemble de `DisplaySlide[]` — les 4 types narratifs). `sections()` les conserve tels quels.
- **Output** : `slidesChange = new EventEmitter<Slide[]>()` — émet la **liste complète mise à jour** à chaque mutation committée (ajout, suppression, réordonnancement, blur d'un champ texte). Aucune autre sortie.
- **Pureté / état** : le composant maintient une **working-copy** interne en signal, **réinitialisée quand la référence de l'input `slides` change** (couvre le changement de story active ET l'écho post-save où la page repasse la liste émise). Comme les éditions ne sont émises qu'au **commit** (blur d'un champ, ou action structurelle), il n'y a pas d'édition non committée à perdre lors d'une réinitialisation. Il n'altère jamais l'input ; il émet `slidesChange`. Le rendu éditable lit la working-copy.
- Style décorateur conservé (`@Input()`/`@Output()`), `@if`/`@for`, signals internes.

### 2. Affordances d'édition par type (mode editable)

Chaque slide rendu reçoit, en plus de son rendu visuel normal :
- une **poignée de drag ⋮⋮** (réordonnancement via `appReorderable`/`ReorderableDirective`, comme la galerie),
- un bouton **× Supprimer** le slide.

Édition du contenu selon le type :
- **Image** (`ImageSlide`) : bouton overlay **🖼 Remplacer** ouvrant la médiathèque (réutilise le pattern galerie / `<app-image-field>` selon le plus simple) → met à jour `src` ; **légende** éditable inline (`contenteditable`, blur → commit). Pas de crop.
- **Vidéo** (`VideoSlide`) : champ **URL** éditable (input révélé par une affordance, avec détection plateforme **YouTube/Vimeo** affichée comme dans `slides-editor` via `parseVideoUrl`) → met à jour `src` ; **légende** inline.
- **Spec** (`SpecSlide`) : chaque entrée `label`/`value` éditable inline (`contenteditable`) ; **＋ Entrée** (ajoute une ligne `{label:'',value:''}`) ; **× retirer** une ligne. Au moins une ligne conservée.
- **Citation** (`QuoteSlide`) : **corps** (`body`) et **source** (`cite`) éditables inline.

Garde-fou de validité avant émission (cohérent avec `canSave()` actuel) : un slide image/vidéo sans `src`, une citation sans `body`, une spec sans ligne — l'émission peut se faire mais la page n'enverra pas un état invalide (ou émission différée jusqu'à validité ; détail tranché au plan, en reprenant la logique `canSave` existante).

### 3. Ajout de slide

- **Barre de fin** : sous la liste, 4 boutons `+ Image / + Vidéo / + Spec / + Citation` → ajoute un slide neuf du type en fin de liste (valeurs par défaut : image/vidéo `src:''`, spec `[{label:'',value:''}]`, citation `body:''`).
- **Points d'insertion** : une zone `+` discrète au survol **entre** chaque slide et **au début/fin** → ouvre un petit menu des 4 types → insère le slide neuf à cette position.
- Dans les deux cas, la working-copy est mise à jour et `slidesChange` émis.

### 4. Persistance & indicateur (pages)

- Les pages `mobilier.component` / `expositions.component` écoutent `slidesChange` (relayé par les previews) : `activeStorySlides.set(slides)` puis `replaceStorySlides(activeStoryId, slides)`.
- **Indicateur d'état** près du bloc story : signal `slidesSaveState: 'idle' | 'saving' | 'saved' | 'error'`. `saving` au départ de la requête, `saved` (« Enregistré ✓ », s'efface après un court délai) au succès, `error` → **toast d'erreur** + état error. Pas de toast en succès.
- Les opérations restent par remplacement de liste complète (`replaceStorySlides`) — cohérent avec l'existant.

### 5. Suppression de la modale 6a

- Retrait du preview : la modale `@if (previewSlidesStoryId(); as sid) { <app-slides-editor> }` et l'état `previewSlidesStoryId` associé.
- Retrait du bouton **« ⚙ Éditer slides »** de `<app-story-manager-bar>` (output `slidesEdit` supprimé) et de son câblage (vues détail, previews, handlers `onPreviewStorySlidesEdit`). L'édition est désormais permanente en place.
- Le composant `slides-editor.component` **reste** utilisé form-side (CRUD hors preview) — inchangé.

### 6. Flux de données

Pattern ADR-0018 : `story-inline` (vue, éditable) émet `slidesChange` → `furniture-detail-view`/`exhibition-detail-view` relaient → `furniture-preview`/`exhibition-preview` relaient → pages auto-sauvent. La story active et ses slides sont déjà gérés (6a). Mobilier **et** exposition.

## Tests

- **`story-inline.component.spec.ts`** : mode lecture seule inchangé ; mode éditable : rend les 4 types éditables ; édition d'une légende/cellule spec/corps de citation émet `slidesChange` avec la valeur ; URL vidéo éditable ; ajout via barre de fin (chaque type) ; ajout via point d'insertion à une position donnée ; suppression ; réordonnancement (drag → `slidesChange` ordonné) ; working-copy non écrasée par un refresh d'input sans changement de story.
- **`furniture-detail-view` / `exhibition-detail-view`** : relais de `slidesChange` ; suppression de l'output `slidesEdit` (et du bouton dans la barre) ; lecture seule publique toujours sans story.
- **`furniture-preview` / `exhibition-preview`** : relais `slidesChange` ; suppression du relais `storySlidesEdit`.
- **`mobilier.component` / `expositions.component`** : `onSlidesChange` appelle `replaceStorySlides` + pilote `slidesSaveState` (saving→saved, erreur→toast) ; suppression de la modale et de `previewSlidesStoryId`/`onPreviewStorySlidesEdit`.
- **`story-manager-bar.component.spec.ts`** : suppression du bouton/​output `slidesEdit`.
- **Baselines Playwright** : le rendu **public** est inchangé (story toujours absente en public) → baselines intactes. Le rendu admin n'est pas couvert par Playwright.

## Hors portée

- **Crop des images de slide** (le modèle `ImageSlide` ne porte pas de crop ; ajout de champ + migration = hors scope).
- **Undo/redo dédié** aux slides (auto-save sans historique ; cohérent SP1/SP5).
- Édition des slides synthétiques `cover`/`link` (la cover reste gérée par la barre du 6a ; le link est auto-généré).
- Restitution fine de focus après actions (dette a11y du chantier ; les affordances restent focusables/clavier).
- Réordonnancement des slides par **clavier** (drag souris uniquement, comme la galerie — limitation connue du chantier).
