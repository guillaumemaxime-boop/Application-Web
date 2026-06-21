# UX fenêtre de composition d'un slider — drag & drop 2 colonnes — Spec

**Date** : 2026-06-19
**Statut** : ✅ Implémenté — mergé sur main
**Type** : Amélioration UX (backlog, demandée le 13/06/2026).

## Objectif

Rendre la composition d'un slider d'actualités (admin) plus ergonomique : ajout / retrait / réordonnancement des stories par **drag & drop** entre deux colonnes (« Disponibles » / « Composition »), avec équivalents clavier. Supprime la friction actuelle (case à cocher + bouton « Ajouter » groupé ; réordonnancement par clics ↑/↓ répétés).

## Contexte (existant)

- Composant unique partagé : `frontend/src/app/pages/admin/shared/slider-composition-editor.component.ts` (modale `role="dialog"`, `cdkTrapFocus`). Consommé **form-side** par `SlidersComponent` ET depuis le **preview accueil** (`AccueilComponent`/`home-preview`). Piloté par inputs, émet `save: string[]` (ids ordonnés) ou `cancel` ; la persistance (`replaceSliderStories`) est faite par le consommateur.
- Mécanisme actuel : colonne gauche « Disponibles » (filtre texte + **cases à cocher** + bouton **« → Ajouter »** groupé) ; colonne droite « Composition courante » (boutons **↑/↓** par item + **« ← Retirer »**).
- `@angular/cdk` **~21.0.0 déjà installé** (utilisé pour `cdkTrapFocus`). `@angular/cdk/drag-drop` est donc disponible **sans nouvelle dépendance npm**, mais c'est un **nouveau pattern de drag** dans le projet (jusqu'ici seul `appReorderable`, directive maison drag natif HTML5, est utilisé — galeries, feed, slides).
- Le drag CDK est **pointeur/souris uniquement** (pas de drag clavier natif) — connu et compensé ici par des boutons (voir Accessibilité).

## Décisions de cadrage (validées)

| Sujet | Choix retenu |
| --- | --- |
| Interaction | **Drag & drop complet entre 2 colonnes** (CDK connected drop lists) |
| Lib | `@angular/cdk/drag-drop` (déjà dans le projet via `@angular/cdk`) |
| Clavier / RGAA | **Boutons équivalents conservés** en parallèle du drag (Ajouter / Retirer / ↑ / ↓) |
| API du composant | **Inchangée** (inputs/outputs identiques) |

## Architecture

### 1. Interaction drag & drop (CDK connected lists)

- Deux `cdkDropList` reliés (via `cdkDropListGroup` ou `[cdkDropListConnectedTo]`) : `available` (gauche) et `composition` (droite). Chaque ligne est `cdkDrag`.
- Handler `(cdkDropListDropped)` :
  - **même liste** (Composition → Composition) : `moveItemInArray` → réordonne.
  - **available → composition** : `transferArrayItem` à l'index de drop → ajoute la story à la position visée.
  - **composition → available** : `transferArrayItem` → retire la story de la composition.
- Le **filtre de recherche** sur « Disponibles » est conservé. Le mapping index→id se fait sur la **liste affichée** (`filteredAvailable()` pour la source available ; `pendingStoryIds()` pour la composition).
- Le conteneur « Composition » a une **`min-height`** pour rester une cible de drop valide quand il est vide.
- Feedback visuel : placeholder/preview CDK natifs + `cursor: grab` sur les lignes ; styles cohérents avec la modale existante. `prefers-reduced-motion` : s'appuyer sur le comportement CDK (animations minimales).

### 2. Accessibilité (RGAA — condition de merge)

Le drag CDK n'étant pas opérable au clavier, **chaque ligne conserve un équivalent clavier** :
- Ligne « Disponibles » : bouton **« Ajouter → »** (1 clic / Entrée / Espace) — remplace la case à cocher + bouton groupé. La ligne reste `cdkDrag` pour la souris.
- Ligne « Composition » : bouton **× Retirer** + boutons **↑ / ↓** (repli clavier du réordonnancement).
- Tous les contrôles sont des `<button>` focusables (focus visible global). Les listes ont des intitulés (`<h4>`), la modale garde `role="dialog"`/`aria-modal`/`cdkTrapFocus`.
- Un statut `aria-live` (poli) annonce les ajouts/retraits/déplacements (« Story X ajoutée à la composition », « déplacée en position N »).

### 3. État & flux de données (API inchangée)

- **Inputs** : `title`, `storyIds`, `allStories`, `sliderId` — inchangés. **Outputs** : `save: string[]`, `cancel` — inchangés. Les consommateurs (`SlidersComponent`, `home-preview`/`AccueilComponent`) ne changent pas.
- `pendingStoryIds = signal<string[]>` reste la **source de vérité** de la composition. Les handlers de drop ET les boutons recalculent un nouveau tableau d'ids puis `pendingStoryIds.set(...)`.
- L'`effect` qui réinitialise `pendingStoryIds` uniquement au changement de `sliderId` (lecture `untracked` de `storyIds`) est **conservé** (évite d'écraser une édition en cours si le parent rafraîchit ses données).
- `filteredAvailable()` = `allStories − pending`, filtré par la recherche — conservé.
- `save.emit(pendingStoryIds())` au clic « Enregistrer » — conservé.
- Suppression de l'état `selectedToAdd` (multi-sélection par cases) devenu inutile.

### 4. Périmètre des fichiers

- **Modifié** : `frontend/src/app/pages/admin/shared/slider-composition-editor.component.ts` (template 2 colonnes → CDK drop lists + boutons clavier ; logique drop ; suppression `selectedToAdd`) et son `.spec.ts`.
- Aucun changement backend, ni des consommateurs, ni du modèle.

## Tests

- `slider-composition-editor.component.spec.ts` :
  - **Drop cross-list** : `onDrop` simulé (event CDK mocké) déplaçant une story available → composition à un index donné → `pendingStoryIds` contient l'id à la bonne position.
  - **Drop retrait** : composition → available → l'id quitte `pendingStoryIds`.
  - **Réordonnancement** : drop intra-composition → ordre mis à jour.
  - **Boutons clavier** : « Ajouter → » ajoute ; « × Retirer » retire ; ↑/↓ réordonnent (réutilise/adapte les tests existants `moveUp`/`moveDown`).
  - **Filtre** : `filteredAvailable` exclut les stories déjà dans la composition + applique la recherche.
  - **save** émet l'ordre courant ; **reset** sur changement `sliderId` (pas sur nouvelle référence de `storyIds`).
- **Régression** : suite frontend verte. Baselines Playwright intactes (modale admin, hors captures publiques).

## Hors portée

- Drag tactile mobile avancé (le CDK gère le touch de base).
- Changement de la persistance / de l'API du composant ou des endpoints sliders.
- Migration des autres réordonnancements (`appReorderable`) vers CDK — hors sujet ; on n'introduit le CDK drag-drop QUE dans cet éditeur.
