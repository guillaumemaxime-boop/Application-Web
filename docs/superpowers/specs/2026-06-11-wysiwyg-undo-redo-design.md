# Undo/redo dans les previews WYSIWYG — Spec

**Date** : 2026-06-11
**Statut** : Implémenté — feat/wysiwyg-undo-redo
**Sous-projet** : 3/6 du chantier « Améliorations WYSIWYG v2 » (découpage : voir spec `2026-06-10-wysiwyg-socle-factorise-design.md`, section Contexte). S'appuie sur les sous-projets 1 (socle shell + composables) et 2 (UX socle + a11y), mergés sur main.

## Objectif

Permettre d'annuler et rétablir les opérations WYSIWYG faites dans les previews admin de **mobilier** et **expositions** : Ctrl+Z / Ctrl+Y (ou Ctrl+Shift+Z) et boutons ↶/↷ dans la toolbar du preview. L'éditeur peut expérimenter dans le preview sans craindre de casser sa fiche.

## Périmètre validé

| Choix | Retenu | Écarté (choix utilisateur) |
| --- | --- | --- |
| Pages | Mobilier + expositions | Accueil (auto-save serveur → compensations réseau ; mini-sous-projet optionnel ultérieur) |
| Granularité | Opérations discrètes (reorder/resize/retrait/ajout galerie, crop validé, éditions inline texte et dates) | Frappe dans les champs du form (couverte par l'undo natif du navigateur, champ focusé) |
| Mécanisme | Snapshots (memento) de l'état complet form + galerie | Pattern commande (inverses manuels par type d'opération — risque de corruption pour un gain marginal) |

## Décisions architecturales

### 1. Composable `createUndoHistory` (`preview-page-helpers.ts`)

```typescript
createUndoHistory<S>(opts: {
  capture: () => S;          // état courant
  restore: (s: S) => void;   // restauration
  limit?: number;            // profondeur max, défaut 50 (FIFO au-delà)
  announcer?: AnnouncerLike; // « Action annulée » / « Action rétablie » (polite)
}): UndoHistory<S>
```

Contrat `UndoHistory<S>` :
- `record()` — capture l'état courant et l'empile sur la pile undo **avant** une mutation ; vide la pile redo ; applique la limite.
- `undo(): boolean` — si pile undo non vide : capture l'état courant vers la pile redo, restaure le sommet de la pile undo, annonce « Action annulée ». Retourne false sinon (no-op).
- `redo(): boolean` — symétrique, annonce « Action rétablie ».
- `clear()` — vide les deux piles.
- `canUndo` / `canRedo` — `Signal<boolean>` (pilotent les boutons de la toolbar).

Sans `inject()` interne (signature explicite, comme les autres composables du fichier). Pas de déduplication des snapshots identiques (les `record()` ne sont déclenchés que par de vraies actions).

### 2. Snapshot des pages mobilier/expo

- `capture` : `{ form: this.xxxForm.getRawValue(), gallery: [...this.xxxGallery()] }`.
- `restore` : `this.xxxForm.patchValue(s.form)` + `this.xxxGallery.set(s.gallery)` + `this.xxxForm.markAsDirty()`.
- **Limitation assumée** : un undo ramenant exactement à l'état initial laisse le form `dirty` — le garde-fou (`confirmIfDirty`, SP2) demandera une confirmation superflue dans ce cas. Acceptée (rare, sans perte de données).

### 3. Points d'enregistrement (`record()` avant chaque opération discrète)

- **Nouvelle option `onBeforeMutate?: () => void`** sur :
  - `createGalleryPreviewHandlers` — invoquée AVANT les mutations remove/reorder/resize (contrairement à `onMutate` qui reste invoquée après, pour le marquage dirty) ;
  - `createTextFieldEditHandler` — invoquée avant le `patchValue` (couvre les éditions inline texte des deux pages ET les éditions de dates de l'expo, qui passent par le même composable avec la whitelist `DATE_FIELDS`). Garde anti-bruit : si la nouvelle valeur est identique à la valeur courante du contrôle, le handler ne fait rien (ni `record`, ni patch, ni dirty) — un blur sans modification ne crée pas d'entrée d'historique no-op.
- `record()` explicite dans `onCoverCropChange` (avant le patch) et en tête du binding template `(imagesChange)` (l'ancienne galerie est encore dans le signal à cet instant — ordre : `history.record(); gallery.set($event); form.markAsDirty()`). **Déviation d'implémentation** : `onCoverCropChange` intègre une garde no-op supplémentaire (`JSON.stringify` du crop courant vs nouveau) — un crop identique ne déclenche ni `record()`, ni patch, ni dirty. Cette garde n'était pas décrite explicitement dans la spec ; elle est cohérente avec la garde anti-bruit de `createTextFieldEditHandler`.
- `clear()` dans `loadFurniture`/`newFurniture` (et équivalents expo) : l'historique ne traverse jamais un changement d'item. Il est **conservé après save** (un undo au-delà du point de save re-marque simplement le form dirty).
- **Déviation d'implémentation** : `createTextFieldEditHandler` inclut une garde supplémentaire « contrôle absent » (`const ctrl = form.get(e.field); if (!ctrl || ...) return`) — si le champ existe dans la whitelist mais pas dans le FormGroup (whitelist ayant dérivé), aucun snapshot d'historique no-op n'est enregistré. Cette garde défensive complète la garde anti-bruit valeur identique.

### 4. Shell `<app-admin-preview-shell>`

- **Inputs** : `historyEnabled` (défaut `false` — l'accueil ne l'active pas), `canUndo` (défaut `false`), `canRedo` (défaut `false`).
- **Outputs** : `undoRequested`, `redoRequested` (`void`).
- **Toolbar** : si `historyEnabled`, deux boutons ↶/↷ avant le bouton 💾 — `aria-label` « Annuler la dernière action » / « Rétablir l'action annulée », `[disabled]` selon `canUndo`/`canRedo`.
- **Clavier** (extension du `onDocumentKeydown` existant) : Ctrl+Z (sans Shift/Alt) → `undoRequested` ; Ctrl+Y ou Ctrl+Shift+Z → `redoRequested`. Gardes :
  - `historyEnabled()` faux → non intercepté ;
  - `formModalOpen()` vrai → non intercepté (les modales gardent leurs propres interactions) ;
  - **focus dans un champ de saisie** (`document.activeElement` est `input`, `textarea` ou `[contenteditable]`) → non intercepté : l'undo natif du navigateur garde la main sur la frappe en cours ;
  - `preventDefault()` uniquement quand on intercepte.
- Cmd+Z/Cmd+Shift+Z (`metaKey`) traités comme Ctrl (cohérent avec le Ctrl+S du SP2).

### 5. Câblage pages (mobilier + expositions, symétrique)

- Champ `history = createUndoHistory({ capture, restore, announcer: this.announcer })` (après la déclaration du form et de la galerie).
- Options `onBeforeMutate: () => this.history.record()` ajoutées aux deux composables existants.
- Bindings shell : `[historyEnabled]="true"`, `[canUndo]="history.canUndo()"`, `[canRedo]="history.canRedo()"`, `(undoRequested)="history.undo()"`, `(redoRequested)="history.redo()"`.
- L'accueil n'est pas modifié.

## Tests

- **Composable** : record/undo/redo nominal, pile redo vidée par un nouveau record, limite (FIFO), clear, valeurs de retour false sur piles vides, annonces (spy), signaux canUndo/canRedo.
- **Shell** : boutons rendus seulement si `historyEnabled`, disabled selon canUndo/canRedo, clics → outputs ; Ctrl+Z hors champ → `undoRequested` + preventDefault ; Ctrl+Z avec focus dans un input → non intercepté (pas d'output, pas de preventDefault) ; Ctrl+Shift+Z et Ctrl+Y → `redoRequested` ; gardes `historyEnabled`/`formModalOpen`.
- **Pages (intégration)** : reorder galerie depuis le preview → `history.undo()` restaure l'ordre ET marque dirty ; édition inline (via `onPreviewTextFieldEdit`) → undo restaure la valeur ; historique vidé par `loadFurniture`/`newFurniture` ; redo restaure l'état annulé.
- **Baselines Playwright intactes** (les boutons ↶/↷ n'apparaissent qu'en mode preview admin, non couvert par les tests visuels publics).

## Hors portée

- Accueil (auto-save → compensations serveur) — mini-sous-projet optionnel ultérieur.
- Entrées d'historique nommées (« Annuler : déplacement d'image ») — pattern commande écarté.
- Persistance de l'historique (rechargement de page, changement d'item).
- Opérations stories/slides (form-side, hors preview) et opérations de la liste latérale (suppression d'item — déjà gardée par confirm).
- Détection « retour à l'état initial » pour re-marquer pristine (limitation assumée, voir §2).
