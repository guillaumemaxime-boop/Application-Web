# Socle factorisé des previews WYSIWYG admin — Spec

**Date** : 2026-06-10
**Statut** : Validé — prêt pour writing-plans
**Sous-projet** : 1/6 du chantier « Améliorations WYSIWYG v2 ». Fait suite au chantier WYSIWYG v1 (4 sous-projets, clos au merge de `feat/wysiwyg-home-preview`).

## Contexte : chantier « Améliorations WYSIWYG v2 »

Découpage validé du chantier, dans l'ordre d'exécution :

1. **Socle factorisé** (cette spec) — extraire le pattern dupliqué des 3 pages admin.
2. **UX socle + a11y** — dirty state visible + garde-fou de sortie, raccourcis clavier (Ctrl+S, Échap), fluidité drag & resize, roving tabindex sur les tablists, annonces screen reader.
3. **Undo/redo** — historique de commandes dans le preview.
4. **Tags mobilier in-preview** — édition des tags depuis le preview de la fiche.
5. **Sliders home in-preview** — édition du contenu des sliders depuis le preview accueil.
6. **Stories depuis les fiches** — édition/réordonnancement des slides depuis le preview mobilier/expo.

Chaque sous-projet suit son propre cycle spec → plan → implémentation → merge. L'ordre « factorisation d'abord » évite d'implémenter les sous-projets 2-6 trois fois (une par page admin).

## Objectif

`AccueilComponent`, `MobilierComponent` et `ExpositionsComponent` dupliquent l'intégralité du squelette WYSIWYG : mode-bar tablist (✏ Modifier / 👁 Aperçu), panneau form maintenu hors-écran (`is-hidden` + `inert`), aside preview (toolbar, plein écran, swap `role` tabpanel↔dialog, `cdkTrapFocus`), ~40 lignes de CSS identiques, et côté TS les signals `viewMode`/`previewFullscreen`, le pattern `_formTick` et 5-7 handlers preview quasi identiques.

Ce sous-projet extrait ce squelette vers un composant shell partagé + des fonctions composables, **sans aucun changement visuel ni comportemental**.

## Décisions architecturales

### Approche retenue : shell + composables

Approches écartées :

- **Classe de base abstraite** — ne factorise ni template ni CSS (le plus gros volume dupliqué) ; héritage de composant Angular fragile (DI, decorators).
- **Composables + CSS partagé seulement** — duplication de template conservée, chaque sous-projet suivant devrait toucher 3 templates.

### Composant `<app-admin-preview-shell>`

Chemin : `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts` (à côté des éditeurs partagés existants : `slides-editor`, `gallery-editor`, `image-field`…).

Possède tout le squelette dupliqué :

- **Mode-bar** `role="tablist"` avec les 2 onglets (✏ Modifier la …/ 👁 Aperçu), affichée si l'input `active` est vrai (toujours vrai pour l'accueil, conditionnel pour mobilier/expo : item en cours d'édition ou création).
- **Panneau form** : le shell rend `<section class="admin-form" id="panel-form" role="tabpanel" aria-labelledby="tab-form">` avec `is-hidden` + `inert` selon le mode, et y projette le formulaire de la page via `<ng-content>`. La projection garde le contenu dans la vue du composant parent → les `ViewChild` (`coverField`, `galleryEditor`) et les modales `position: fixed` (photo picker, crop picker) continuent de fonctionner tels quels.
- **Panneau preview** : la page fournit un `<ng-template shellPreview>` (directive de marquage requise par `contentChild`) ; le shell le rend via `ngTemplateOutlet` dans l'aside **uniquement en mode preview** — préserve le comportement actuel de destruction/recréation du composant preview au toggle.
- **Toolbar** : label « Aperçu », bouton 💾 Enregistrer (si `showSave`, avec `saveDisabled`/`saving`, output `save`), bouton ⤢ Plein écran / ⤡ Réduire.
- **Plein écran** : signal interne ; swap `role="tabpanel"` ↔ `role="dialog"` + `aria-label` + `aria-modal="true"` + `cdkTrapFocus`/`cdkTrapFocusAutoCapture` ; `position: fixed; inset: 0; z-index: 1200`.
- **CSS partagé** : `.admin-split`, `.admin-mode-bar`, `.admin-mode-tab`, `.admin-form.is-hidden` (avec son commentaire explicatif sur le choix `left: -100vw` vs `display:none`/`visibility:hidden`), `.admin-preview*`, `.btn-preview-save`, `.btn-preview-toggle`, media queries (1280px split → colonne, 768px preview masqué).

**API** :

| Membre | Type | Description |
|---|---|---|
| `active` | input `boolean` | Affiche la mode-bar et le panneau preview (item en édition) |
| `entityLabel` | input `string` | Libellés ARIA : `aria-label` de la tablist (« Mode d'édition de la pièce »…) et du dialog plein écran |
| `formTabLabel` | input `string` | Texte de l'onglet form (« ✏ Modifier la pièce »…) |
| `showSave` | input `boolean` | Bouton 💾 dans la toolbar (mobilier/expo : oui ; accueil : non, auto-save) |
| `saveDisabled` | input `boolean` | Désactive 💾 (form invalide) |
| `saving` | input `boolean` | Libellé « Enregistrement… » + désactive 💾 |
| `viewMode` | `model<'form' \| 'preview'>` | Two-way — les pages le pilotent aussi (ex. `onSliderEditRequested` bascule en mode form, `loadFurniture` revient en mode form) |
| `save` | output `void` | Clic 💾 |

Les pages gardent : leur liste latérale (aside `.list`), le contenu du form, le composant preview avec ses bindings spécifiques, leurs handlers métier.

IDs `tab-form`/`tab-preview`/`panel-form`/`panel-preview` conservés tels quels (un seul shell par page).

### Composables `preview-page-helpers.ts`

Chemin : `frontend/src/app/pages/admin/shared/preview-page-helpers.ts`. Fonctions utilisables en initialiseur de champ (contexte d'injection, pattern `inject()`) :

- **`formTickSignal(form: FormGroup): Signal<number>`** — encapsule le pattern `_formTick` : souscription `valueChanges` → incrément, désabonnement via `DestroyRef`. Remplace les paires `ngOnInit`/`ngOnDestroy` manuelles de `MobilierComponent`/`ExpositionsComponent` et le même pattern dupliqué dans `FurniturePreviewComponent`/`ExhibitionPreviewComponent`.
- **`createGalleryPreviewHandlers({ gallery, galleryEditor, coverField })`** — retourne les 5 handlers identiques mobilier/expo : `onCoverEdit('crop'|'replace')`, `onGalleryItemEdit({index, action})`, `onGalleryAdd()`, `onGalleryReorder(order)`, `onGalleryItemResize({index, colSpan, rowSpan})`. `galleryEditor`/`coverField` passés en getters (`() => this.galleryEditor`) car les `ViewChild` ne sont pas disponibles à la construction.
- **`createFieldFocus(allowedFields: ReadonlySet<string>)`** — retourne `focusField(name)` avec guard whitelist `.has(name)` avant `getElementById` + `scrollIntoView` + `focus`. **Normalisation** : `MobilierComponent.focusField` n'a pas la whitelist que l'audit sécurité avait fait ajouter à `ExpositionsComponent` (`FOCUSABLE_FIELDS`) — la factorisation l'applique partout.
- **`createTextFieldEditHandler(form, allowedFields)`** — `patchValue` + `markAsDirty` derrière le même guard whitelist.

L'accueil n'utilise pas ces composables form (pas de FormGroup central) : il garde ses handlers spécifiques (feed reorder, toggle include, auto-save `updateContent`, crop card) qui n'existent qu'en un exemplaire. On ne factorise que ce qui existe en ≥ 2 exemplaires.

`FurniturePreviewComponent` et `ExhibitionPreviewComponent` restent inchangés hormis l'adoption de `formTickSignal`.

## Migration

Page par page, **un commit par page**, suite de tests verte (`npm test`) à chaque étape :

1. Création du shell + composables + leurs specs.
2. Migration `MobilierComponent`.
3. Migration `ExpositionsComponent`.
4. Migration `AccueilComponent`.

## Tests

- **Nouvelles specs** : `admin-preview-shell.component.spec.ts` (rendu des tabs + attrs ARIA, `inert`/`is-hidden` sur le panel form, template preview instancié seulement en mode preview, plein écran : `role=dialog` + `aria-modal` + trap focus, events `save`/`viewMode`) ; `preview-page-helpers.spec.ts` (whitelist focus/textFieldEdit, handlers galerie, formTick).
- **Specs existantes** des 3 pages : continuent de passer ; si elles ciblent des sélecteurs du template migré (`.admin-mode-tab`…), ajustement des sélecteurs sans affaiblir les assertions.
- **Baselines Playwright** : **non régénérées**. Le rendu DOM final doit être équivalent (mêmes classes, mêmes attrs ARIA) ; un test visuel qui casse = bug de migration, pas une baseline à mettre à jour.
- Seuil de couverture karma (80 % global, 75 % branches) inchangé.

## Hors portée

- Tout nouveau comportement : dirty state, raccourcis clavier, undo/redo, fluidité drag/resize, annonces SR → sous-projets 2-3.
- Couverture éditoriale (tags, sliders, stories) → sous-projets 4-6.
- Refonte des composants view/preview existants, changement backend, changement visuel quelconque.
