# Preview WYSIWYG Fiche Exposition — Spec

**Date** : 2026-06-09
**Statut** : Validé — prêt pour writing-plans
**Sous-projet** : 3/4 d'un chantier « Console admin de configuration d'affichage des images ». S'appuie sur les sous-projets 1 (crop tool) et 2 (preview WYSIWYG mobilier), tous deux mergés sur main. Sous-projet 4 (preview Accueil) reprendra le même pattern.

## Objectif

Donner à l'admin un aperçu live (WYSIWYG) de la Fiche Exposition pendant l'édition, identique au rendu public. Édition d'images depuis le preview (hover Cadrer/Remplacer/Retirer/Ajouter), click-to-focus sur les textes, édition inline texte au double-clic, édition inline dates via swap `<input type="date">`, drag-reorder + resize galerie. Pattern page/view (ADR-0018) appliqué à exhibition-detail.

## Portée

| Élément | Comportement preview |
|---|---|
| Cover hero | Rendu canvas. Hover → **Cadrer** / **Remplacer**. |
| Eyebrow `venue · city, country` | Décomposé en 3 spans cliquables individuellement (séparateurs ARIA-hidden). Click → focus form. Dblclick → édition inline. |
| Titre | Click → focus. Dblclick → édition inline. |
| Dates start/end | Click → focus. Dblclick → swap `<input type="date">` (validation browser native). |
| Eyebrow intro `Commissariat — curator` | Préfixe statique. `curator` cliquable individuellement (click + dblclick). |
| Lead (shortDescription) | Click + dblclick. |
| Body (description) | Click + dblclick. |
| Tags | Rendu (chips). **Pas d'édition inline** (gérée dans le form). |
| Galerie | Items canvas. Hover → **Cadrer** / **Remplacer** / **Retirer**. Drag-reorder, resize WYSIWYG. Tuile `+ Ajouter`. |
| Bouton « Voir la story » | Rendu conditionnel à `displaySlides.length > 0 && item.showStoryButton`. |
| Story-viewer (modale) | Rendu toplevel par la page (pas le view). |

**Hors portée — reporté**

- Sélecteur de story dans le preview (toujours `currentStories()[0]`).
- Édition inline des tags.
- Validation cross-field dates côté frontend (start ≤ end). Backend reste responsable.
- Fallback clavier pour drag/resize (limitation acceptée, identique sous-projet 2).
- Application au sous-projet 4 (Accueil).
- `contentEditable` pur sur les dates — remplacé par swap `<input type="date">` pour validation/format natif.

## Décisions architecturales

### Pattern page/view (ADR-0018)

Appliqué à exhibition-detail. `<app-exhibition-detail-view>` est extrait comme composant standalone pur, partagé entre la page publique et le wrapper admin. Aucune dépendance HttpClient/Router/PortfolioService dans le view.

### Layout admin : toggle Modifier/Aperçu

Pas de split. Toggle plein-largeur entre les deux modes (signal `expoViewMode = 'form' | 'preview'`). Le form reste rendu en DOM (`position: absolute; left: -100vw; pointer-events: none`) en mode preview pour préserver les `@ViewChild('coverField')` et `@ViewChild('galleryEditor')`.

### Toolbar preview

Bouton **💾 Enregistrer** (désactivé si `form.invalid || saving()`), bouton **⤢ Plein écran** / **⤡ Réduire**.

### Eyebrow composite décomposé

`venue · city, country` est rendu publiquement en un seul `<span>`. En mode editable, décomposé en 3 spans contigus + 2 séparateurs ARIA-hidden, pour que chaque champ soit éditable individuellement. Visuellement strictement identique au public (séparateurs sont du texte invisible aux SR).

### Édition inline des dates : swap d'input natif

`contentEditable` sur du texte de date est ambigu (format localisé, parsing). À la place : au double-clic, swap visible du `<span>` vers un `<input type="date">` avec `[value]="item.startDate"` (format ISO `YYYY-MM-DD`). Le browser gère le datepicker + la validation. Blur → `dateFieldEdit.emit({ field: 'startDate', value: input.value })` qui patche le form. Échap → cancel.

### Story unique dans preview

Le preview rend `currentStories()[0]` (la première dans l'ordre admin). Le réordonnement des stories reste géré dans le form (`moveStoryDown`), il change naturellement la story affichée dans le preview.

### Galerie publique migrée au canvas

L'exhibition-detail public utilise encore `<img + style.transform>` pour la galerie (sous-projet 1 n'avait migré que le hero). Le refactor passe la galerie publique au `<app-cropped-image-canvas>` via le view, par cohérence. Playwright re-pass attendu (rendu identique pixel ou très proche, à valider).

### Réactivité

Pattern `_formTick` signal + subscription `form.valueChanges` dans `ExhibitionPreviewComponent` et `ExpositionsComponent`. Pas de debounce. Cleanup en `ngOnDestroy`.

### Sauvegarde reload

`saveExhibition()` est modifié comme `saveFurniture()` du sous-projet 2 : après `next: (saved)`, appelle `loadExhibition(saved)` au lieu de `newExhibition()` pour rester sur la fiche en cours.

## Modèle de composants

```
frontend/src/app/
├── components/
│   └── exhibition-detail-view/                       ← NOUVEAU
│       ├── exhibition-detail-view.component.ts
│       └── exhibition-detail-view.component.spec.ts
│
├── pages/
│   ├── exhibition-detail/
│   │   └── exhibition-detail.component.ts             ← refactor : délègue au view
│   │
│   └── admin/
│       └── expositions/
│           ├── expositions.component.ts                ← toggle Modifier/Aperçu
│           ├── expositions.component.spec.ts
│           └── preview/
│               ├── exhibition-preview.component.ts    ← NOUVEAU
│               └── exhibition-preview.component.spec.ts
```

### `<app-exhibition-detail-view>` — interface

```ts
export type EditableExhibitionField =
  | 'title' | 'venue' | 'city' | 'country'
  | 'curator' | 'shortDescription' | 'description';

@Input({ required: true }) item: Exhibition | null;
@Input() story: Story | null = null;
@Input() displaySlides: DisplaySlide[] = [];
@Input() content: SiteContent = {};
@Input() editable = false;

@Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
@Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
@Output() galleryReorder = new EventEmitter<number[]>();
@Output() galleryAdd = new EventEmitter<void>();
@Output() galleryItemResize = new EventEmitter<{ index: number; colSpan: number; rowSpan: number }>();
@Output() textFieldClick = new EventEmitter<EditableExhibitionField | 'startDate' | 'endDate'>();
@Output() textFieldEdit = new EventEmitter<{ field: EditableExhibitionField; value: string }>();
@Output() dateFieldEdit = new EventEmitter<{ field: 'startDate' | 'endDate'; value: string }>();
@Output() viewerOpen = new EventEmitter<StoryItem[]>();
```

### `<app-exhibition-preview>` — interface

```ts
@Input({ required: true }) form: FormGroup;
@Input({ required: true }) gallery: Signal<GalleryItem[]>;
@Input() story: Story | null = null;
@Input() displaySlides: DisplaySlide[] = [];
@Input() content: SiteContent = {};

// Re-emit identique au view (tous les Outputs sauf viewerOpen qui peut être omis si pas utilisé en admin)
```

Le parent (`ExpositionsComponent`) reste seul à muter signaux et form via les handlers d'Output.

## Refactor du public

`exhibition-detail.component.ts` :
- Template réduit : `<app-exhibition-detail-view [item]="item()" [story]="story()" [displaySlides]="displaySlides()" [content]="content()" (viewerOpen)="onViewerOpen($event)">` au top niveau de la condition `@else if (item(); as e)`.
- Garde : `PortfolioService.getExhibitionBySlug`, `getStoryFor`, `loadingService`, `setTitle`, viewerQueue + closeViewer, contentService.
- Perd : tout le template hero/intro/galerie inline, méthodes `coverCropStyle()`, `galleryItemStyle()`, `hasSlides()`, `openViewer()`, `formatRange()` (passe dans le view), `eyebrowStyle()`, `titleStyle()` (passent dans le view via Input `content`).
- `formatRange` migre dans le view (utilisé dans le hero dates).

## Comportements d'interaction

### Overlays hover sur images

Mode `editable=true` :
- Cover hero : `cursor: pointer`, outline dashed subtil. Hover → overlay sombre centré, boutons **✂ Cadrer** / **🖼 Remplacer**.
- Items galerie : hover → overlay avec **✂** / **🖼** / **×** + poignée drag **⋮⋮** (top-left) + poignée resize **⤡** (bottom-right) avec badge live `N×M`.

### Click-to-focus

Click sur titre / venue / city / country / curator / lead / body / startDate / endDate → `textFieldClick.emit(name)` → MobilierComponent appelle `focusField(name)` qui scroll+focus l'input correspondant (`id="field-<name>"`).

### Édition inline texte

Double-clic sur titre / venue / city / country / curator / lead / body → `[attr.contenteditable]="true"` + outline accent → Entrée valide / Échap annule / Blur valide → `textFieldEdit.emit({ field, value })` → patch form.

### Édition inline dates

Double-clic sur span date → swap visible vers `<input type="date">`. Blur → `dateFieldEdit.emit({ field, value })` → patch form. Échap → cancel.

### Drag-reorder galerie

Pastille `⋮⋮` (top-left) → HTML5 drag&drop via `ReorderableDirective`. `data-no-drag` sur tuile « + Ajouter ». `NgZone.run()` autour de l'emit.

### Resize galerie

Pastille `⤡` (bottom-right) → pointer drag. Snap grid (1-3 cols × 1-4 rows). Style `[style.grid-column]` + `[style.grid-row]` appliqué sur le `<li>` (item de grille). `NgZone.run()` autour de l'emit. Badge live `N × M` rendu top-left pendant le drag.

### Bouton Voir la story

Rendu conditionnel `@if (displaySlides.length > 0 && item.showStoryButton)`. Émet `viewerOpen` que la page publique gère (set viewerQueue) ou ignore en admin.

## Edge cases

| Cas | Comportement |
|---|---|
| Mode création expo | Form vide, preview suit. Eyebrows vides, canvas hero gris. |
| Form invalide | Preview rend. Bouton Enregistrer désactivé. |
| Image URL 404 | Canvas vide (composant gère). |
| Galerie vide en public | Section gallery disparaît. |
| Galerie vide en editable | Section gallery rendue avec tuile « + Ajouter » seule. |
| Aucune story | Pas de bouton « Voir la story », `displaySlides` vide. |
| Multiple stories | Preview = première. Réordonnement form change la story affichée. |
| Date invalide saisie | `<input type="date">` bloque nativement. |
| StartDate > endDate | Pas de validation cliente. Backend reste responsable. |
| Resize handle drag continu | NgZone.run dans handler (déjà éprouvé sous-projet 2). |
| Modale crop ouverte en preview fullscreen | Z-index modales 1300/1400 > preview 1200. `.crop-backdrop` global `pointer-events: auto` (déjà éprouvé). |

## Tests

### Unitaires (Karma + Jasmine)

- `exhibition-detail-view.component.spec.ts` (~18 tests) : rend hero (3 spans editable, dates), section intro (eyebrow + lead + body + tags), galerie ; émet tous les Outputs ; clavier (Entrée/Espace/Échap) ; null state ; mode editable vs lecture seule ; date swap input.
- `exhibition-preview.component.spec.ts` (~7 tests) : `previewItem` agrège, réactif au patchValue, re-emit Outputs, null state quand form absent.
- `expositions.component.spec.ts` (~6 tests nouveaux) : `focusField`, `onPreviewCoverEdit`, `onPreviewGalleryItemEdit/Reorder/Add/Resize`, `onPreviewTextFieldEdit`, `onPreviewDateFieldEdit`, `togglePreviewFullscreen`, `expoViewMode`.
- `exhibition-detail.component.spec.ts` : adapter (suppression `coverCropStyle`/`galleryItemStyle`, ajout "passe item au view"). Conserver tests loading/notFound/viewer.

### Régression visuelle (Playwright)

- `exhibition-detail` (public) : doit rester PIXEL-IDENTIQUE après refactor. Aucun `--update`. Si galerie passe au canvas, valider visuellement avant de régen baselines.
- Pas de baseline admin.

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| Régression visuelle public | Playwright sans `--update`. Itération sur CSS du view si écart. |
| Galerie publique passe d'`<img + transform>` à canvas | Validation visuelle manuelle préalable, puis régen baselines uniquement si validation OK (règle projet). |
| Live update silencieusement cassé | Test unitaire dédié : `form.patchValue({ title: 'X' })` → `previewItem().title === 'X'`. |
| Édition inline date — swap input fragile | Test : dblclick → input rendu, change value, blur → emit avec valeur correcte. |
| Eyebrow composite décomposé casse layout | Spans display: inline + séparateurs ` · ` / `, ` textuels (pas de margin). Tests visuels. |
| Reorder stories impacte previewDisplaySlides | Test : `moveStoryDown(s)` → `previewDisplaySlides()` reflète nouvelle ordre. |
| SaveExhibition reload mal câblé | Test : `saveExhibition` POST → flush response → `editingExhibitionSlug === saved.slug`. |
| A11y limitations identiques sous-projet 2 (drag/resize sans clavier) | Documenté, acceptable scope. |

## Documentation

- **ADR-0018** (existant) : référencé. Pas de nouvel ADR.
- `docs/SPECIFICATION_TECHNIQUE.md` : composant exhibition-detail-view + exhibition-preview, refactor exhibition-detail public, signal exhibitionForm + handler chain.
- `docs/SPECIFICATION_FONCTIONNELLE.md` : section preview WYSIWYG admin Expositions parallèle au mobilier.

## Référence

- Sous-projet 2 (preview WYSIWYG mobilier) : `docs/superpowers/specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md`
- Sous-projet 1 (crop tool) : `docs/superpowers/specs/2026-06-07-image-crop-tool-design.md`
- ADR-0018 (pattern page/view) : `docs/adr/0018-page-vs-view-pattern.md`
- ADR-0017 (Cropper.js) : `docs/adr/0017-cropperjs-image-crop-tool.md`
