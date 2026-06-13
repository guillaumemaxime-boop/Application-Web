# Tags éditables dans les previews WYSIWYG — Spec

**Date** : 2026-06-13
**Statut** : Validé — prêt pour writing-plans
**Sous-projet** : 4/6 du chantier « Améliorations WYSIWYG v2 » (découpage : voir spec `2026-06-10-wysiwyg-socle-factorise-design.md`, section Contexte). S'appuie sur les sous-projets 1 (socle), 2 (UX/a11y) et 3 (undo/redo), mergés sur main.

## Objectif

Permettre d'ajouter et retirer les tags d'une fiche **mobilier** et **exposition** directement depuis le preview WYSIWYG, au lieu de devoir basculer en mode Modifier pour utiliser le `<app-tag-input>` form-side. Aujourd'hui les tags sont rendus dans la vue détail comme des `<a routerLink>` non éditables, identiques en mode public et en mode editable.

## Périmètre validé

| Choix | Retenu | Écarté |
| --- | --- | --- |
| Interaction | Édition inline dans la vue (chips + champ autocomplété) | Click-to-focus form-side ; réutilisation directe de `<app-tag-input>` dans la vue |
| Fonctionnalités | Éditeur complet : autocomplétion + suppression par chip + création libre + undo/redo | Ajout seul ; sans undo |
| Pages | Mobilier **et** expositions (les deux affichent des tags en fiche, même pattern) | Accueil (pas de tags) |
| Architecture | Extraction d'un `<app-tag-editor>` pur partagé ; `<app-tag-input>` devient un wrapper CVA | Réimplémentation dupliquée ; import du composant admin dans la vue pure |

## Décisions architecturales

### 1. Extraction `<app-tag-editor>` (composant présentation pur)

Chemin : `frontend/src/app/components/tag-editor/tag-editor.component.ts` (dans `components/`, partagé public+admin — **pas** dans `pages/admin/`). Aucune dépendance `Router`/`HttpClient`/`@angular/forms`. Respecte ADR-0018 (la vue détail reste pure).

Reçoit l'intégralité de la logique combobox a11y actuellement dans `<app-tag-input>` :
- `role="combobox"` + listbox (`role="listbox"`/`role="option"`), `aria-controls`, `aria-expanded`, `aria-activedescendant`, `aria-label` ;
- clavier : flèches ↑/↓ (navigation suggestions), Enter (ajoute la suggestion active ou la saisie libre), virgule (ajoute la saisie libre), Backspace sur champ vide (retire le dernier tag), Échap (ferme le dropdown) ;
- chips supprimables (`×`, `aria-label="Retirer ce tag"`) ;
- autocomplétion : filtre les suggestions sur la saisie + exclut les tags déjà présents ;
- mêmes styles (chips, dropdown, focus) que l'actuel.

**API** :

| Membre | Type | Description |
| --- | --- | --- |
| `tags` | input `string[]` (défaut `[]`) | Tags courants |
| `suggestions` | input `string[]` (défaut `[]`) | Catalogue de tags pour l'autocomplétion |
| `disabled` | input `boolean` (défaut `false`) | Désactive l'édition |
| `ariaLabel` | input `string` (défaut `'Ajouter un tag'`) | Label du champ de saisie |
| `tagsChange` | output `string[]` | Nouvelle liste après ajout/retrait (tableau **immutable** neuf — compatible snapshots undo SP3) |

État interne en signaux (`inputValue`, `dropdownOpen`, `activeIndex`). `tags`/`suggestions` deviennent des inputs (au lieu de l'état CVA interne).

### 2. `<app-tag-input>` devient un wrapper `ControlValueAccessor`

`pages/admin/shared/tag-input.component.ts` conserve son selector, son rôle form-side et son contrat CVA, mais délègue rendu + logique à `<app-tag-editor>` :
- template = `<app-tag-editor [tags]="value()" [suggestions]="suggestions" [disabled]="disabled()" (tagsChange)="onEditorChange($event)" />` ;
- `writeValue` alimente le signal `value` ; `onEditorChange` met à jour `value` + `onChangeFn` + `onTouchedFn`.
- Comportement observable inchangé → ses specs existantes restent le filet de sécurité du refactor.

### 3. Intégration dans les vues détail (mobilier + exposition)

`furniture-detail-view` et `exhibition-detail-view` (vues pures, ADR-0018) :
- **Nouveaux** : input `tagSuggestions: string[]` (défaut `[]`), output `tagsChange: string[]`.
- Bloc `tags-list` :
  - **mode non-editable (public)** : rendu inchangé (`<a class="tag-chip" routerLink>`).
  - **mode editable** : rend `<app-tag-editor [tags]="item.tags ?? []" [suggestions]="tagSuggestions" (tagsChange)="tagsChange.emit($event)" />` — les routerLinks (qui navigueraient) sont remplacés, comme les cards du preview accueil.
- Le bloc editable s'affiche même si `item.tags` est vide (pour permettre d'ajouter un premier tag), contrairement au public gardé par `@if (item.tags.length > 0)`.

### 4. Câblage preview → page

- `furniture-preview` / `exhibition-preview` (wrappers admin) : nouvel input `tagSuggestions` relayé à la vue ; output `tagsChange` relayé à la page.
- `MobilierComponent` / `ExpositionsComponent` :
  - passent `[tagSuggestions]="allTags()"` (signal déjà présent, alimenté par `getAllTags()`) ;
  - sur `(tagsChange)="onPreviewTagsChange($event)"` : `this.history.record()` (snapshot undo SP3) puis `patchValue({ tags })` + `markAsDirty()`. Même pattern que les autres handlers d'édition inline.
- `tags` étant déjà un contrôle du form, le `markAsDirty` alimente le garde-fou dirty (SP2) et le snapshot undo capture/restaure les tags (SP3) sans code supplémentaire.

## Tests

- **`tag-editor.component.spec.ts`** (nouveau) : combobox ARIA, navigation flèches + `aria-activedescendant`, Enter (suggestion active / saisie libre), virgule (création libre), Backspace (retrait dernier), Échap, chips supprimables, filtrage suggestions (saisie + exclusion des présents), `tagsChange` émet un tableau neuf immutable, `disabled`.
- **`tag-input.component.spec.ts`** : conservé ; le wrapper CVA garde le comportement observable (ajuster uniquement les sélecteurs si le DOM projeté diffère).
- **Vues détail** : tag-editor rendu en editable, routerLinks en public ; `tagsChange` propagé ; bloc editable visible même tags vides.
- **Pages (intégration)** : `onPreviewTagsChange` → `patchValue` + dirty + snapshot undo ; un test undo (ajout tag depuis preview → `history.undo()` retire le tag).
- **Baselines Playwright** : le rendu public des tags (routerLinks) est inchangé → baselines intactes. Les boutons/champ d'édition n'apparaissent qu'en mode editable admin.

## Hors portée

- Accueil (pas de tags).
- Renommage/fusion de tags, gestion globale du catalogue de tags.
- Tags sur d'autres entités (stories, slides).
- Réordonnancement des tags (l'ordre suit l'ajout ; pas de drag).
