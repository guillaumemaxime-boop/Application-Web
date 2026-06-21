# Preview WYSIWYG Fiche Mobilier — Spec

**Date** : 2026-06-08
**Statut** : ✅ Implémenté — mergé sur main (ADR-0018)
**Sous-projet** : 2/4 d'un chantier « Console admin de configuration d'affichage des images ». S'appuie sur le sous-projet 1 (crop tool, mergé sur main). Sous-projets 3 (preview WYSIWYG Fiche Exposition) et 4 (preview WYSIWYG Accueil) restent séparés et reprendront le pattern défini ici.

## Objectif

Donner à l'admin un aperçu live (WYSIWYG) de la Fiche Mobilier pendant l'édition, identique au rendu public. Les images (cover hero + galerie) sont éditables directement depuis le preview via hover. Les textes (titre, description, dimensions) sont accessibles via click-to-focus du champ form correspondant. La galerie peut être réordonnée depuis le preview.

## Portée

| Élément | Comportement preview |
|---|---|
| Cover hero | Rendu identique au public. Hover → boutons **Cadrer** / **Remplacer**. |
| Titre / eyebrow / matériau | Rendu. Click → focus du champ form. |
| Description | Rendu. Click → focus du textarea form. |
| Dimensions, prix, tags | Rendu. Click → focus des inputs correspondants. |
| Story-inline | Rendu (lecture seule, données DB). Pas d'édition de slides depuis le preview. |
| Galerie items | Rendu. Hover sur item → boutons **Cadrer** / **Remplacer** / **Retirer**. Drag-reorder activé. |
| CTA contact form | Rendu visuel uniquement (pas de soumission depuis preview). |

**Hors portée — reportés à plus tard**

- `contentEditable` (édition inline réelle des textes) — remplacé par click-to-focus.
- Édition slides individuels d'une story depuis le preview.
- Application du pattern à `exhibition-detail` (sous-projet 3) et `home` (sous-projet 4).
- Preview offline / snapshot historique.
- Multi-utilisateurs / collaboration temps réel.
- Refactor du contact form ou du story viewer (logique reste dans la page publique).

## Décisions architecturales

### Layout : split 50/50

Le `MobilierComponent` adopte un layout split inline : form à gauche (scrollable), preview à droite (sticky). Sous 1280px, layout empilé. Sous 768px, preview masqué (admin pas conçu pour mobile).

### Composant view extrait

`<app-furniture-detail-view>` est un composant standalone purement présentation, partagé entre la page publique et l'admin. Il prend une `Furniture` en input. Aucune dépendance HttpClient / Router / PortfolioService. Émet des Outputs en mode `editable=true` pour signaler les actions admin.

Bénéfice : rendu identique pixel-perfect, zéro duplication, refactor public sans changement visuel (validé par Playwright sans `--update`).

### Composant preview admin

`<app-furniture-preview>` wrap le view, agrège les signaux du `MobilierComponent` (FormGroup + signal galerie) dans un `Furniture` virtuel via `computed`, et le passe au view en mode `editable=true`. Branche les Outputs du view aux modales existantes (`<app-image-crop-picker>`, `<app-photo-picker>`) et au focus des champs form.

### Click-to-focus pour les textes

Pour éviter la dette de `contentEditable`, l'édition des textes passe par un pattern WYSIWYG light : click sur un texte du preview → scroll-into-view + focus du champ form correspondant. Implémentation via IDs déterministes (`field-title`, `field-description`, `field-material`, etc.) sur les inputs/textareas et `document.getElementById(...).focus()` au clic preview.

### Réactivité par signaux Angular

`toSignal(form.valueChanges, { initialValue: form.getRawValue() })` côté `<app-furniture-preview>`. `previewItem = computed(() => buildFurnitureFrom(formSignal(), gallerySignal()))`. Le view reçoit `[item]="previewItem()"`. Toute modification du form ou de la galerie déclenche un re-render. Pas de debounce — le ressenti WYSIWYG exige instantanéité.

### Image canvas + image cache (réutilisé du sous-projet 1)

Le composant `<app-cropped-image-canvas>` du sous-projet 1 gère déjà le cache d'image et le redessin sur changement de crop. Pas de surcoût pour les modifications text-only.

## Modèle de composants

```
frontend/src/app/
├── components/
│   └── furniture-detail-view/                       ← NOUVEAU
│       ├── furniture-detail-view.component.ts
│       └── furniture-detail-view.component.spec.ts
│
├── pages/
│   ├── furniture-detail/
│   │   └── furniture-detail.component.ts             ← refactor : utilise le view
│   │
│   └── admin/
│       └── mobilier/
│           ├── mobilier.component.ts                 ← split layout
│           ├── mobilier.component.spec.ts
│           └── preview/
│               ├── furniture-preview.component.ts    ← NOUVEAU
│               └── furniture-preview.component.spec.ts
```

### `<app-furniture-detail-view>` — interface

```ts
@Input({ required: true }) item: Furniture | null;
@Input() story: Story | null;                                  // première story attachée à la fiche (le projet n'en lie qu'une, en pratique)
@Input() viewerQueue: StoryItem[] = [];
@Input() displaySlides: DisplaySlide[] = [];
@Input() editable = false;
@Input() content: SiteContent = {};

@Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
@Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
@Output() galleryReorder = new EventEmitter<number[]>();
@Output() textFieldClick = new EventEmitter<string>();   // 'title' | 'description' | ...
@Output() viewerOpen = new EventEmitter<StoryItem[]>();
```

### `<app-furniture-preview>` — interface

```ts
@Input({ required: true }) form: FormGroup;
@Input({ required: true }) gallery: Signal<GalleryItem[]>;   // read-only, mutations via Outputs
@Input() story: Story | null = null;
@Input() displaySlides: DisplaySlide[] = [];
@Input() content: SiteContent = {};

@Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
@Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
@Output() galleryReorder = new EventEmitter<number[]>();
@Output() textFieldClick = new EventEmitter<string>();
```

Le parent (`MobilierComponent`) reste seul à muter le signal galerie via ses méthodes existantes appelées dans les handlers d'Output.

## Comportements d'interaction

### Overlays hover sur images

Mode `editable=true` :
- `.hero-bg` gagne `cursor: pointer`, outline subtil `1px dashed rgba(255,255,255,0.25)`. Au hover, overlay centré avec 2 boutons réels : **✂ Cadrer** et **🖼 Remplacer**.
- Chaque item galerie idem, plus un bouton **× Retirer**.
- Boutons stylés sobrement (fond `var(--color-bg)`, bordure `var(--color-line)`), visibles au hover ou au focus clavier (`:focus-within`).
- `aria-label` explicite : `"Cadrer la cover"`, `"Remplacer la cover"`, `"Cadrer l'image 3"`, etc.

### Actions image

- **Cadrer cover** → MobilierComponent ouvre `<app-image-crop-picker>` avec `form.coverImage` + `form.coverCrop`. Validation → `form.patchValue({ coverCrop })`.
- **Remplacer cover** → ouvre `<app-photo-picker>`. Sélection → `form.patchValue({ coverImage, coverCrop: null })`. Le crop est **explicitement réinitialisé** à NULL.
- **Cadrer item galerie** → ouvre le crop-picker avec `gallery[index]`. Validation → patch du signal galerie pour l'item.
- **Remplacer item galerie** → ouvre photo-picker. Sélection → remplace url + reset crop à null pour l'item.
- **Retirer item galerie** → `gallerySignal.update(arr => arr.filter((_, i) => i !== index))`.

### Click-to-focus pour textes

Chaque zone texte cliquable est un span avec `role="button"`, `tabindex="0"`, `(click)="textFieldClick.emit('title')"`. Au keyboard, Enter ou Espace déclenchent l'action (handler natif `<button>` ou listener `keydown`).

Le MobilierComponent reçoit `(textFieldClick)` et appelle `focusField(name)` :

```ts
focusField(name: string): void {
  const el = document.getElementById(`field-${name}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  (el as HTMLInputElement | HTMLTextAreaElement).focus();
}
```

Les inputs/textareas du form gagnent des `id="field-title"`, `id="field-description"`, etc.

### Drag-reorder galerie depuis preview

La grille galerie dans le view (mode editable) accueille `appReorderable` (directive existante). Source de vérité : `gallerySignal`. Drag dans preview OU drag dans `<app-gallery-editor>` form-side → même `(reordered)` → même update du signal.

## Refactor du public

`FurnitureDetailComponent` :
- Template réduit : remplace l'inline hero/description/galerie/CTA par `<app-furniture-detail-view [item]="item()" [story]="story()" [displaySlides]="displaySlides()" [content]="content()" (viewerOpen)="onViewerOpen($event)">`.
- Garde la responsabilité de charger les data (PortfolioService), gérer le routing, la story viewer queue, le contact form, les hooks SEO (Meta/Title si présents).
- Styles inline du hero / galerie / story-inline déplacés vers le view.
- Méthodes `coverCropStyle()` / `galleryItemStyle()` (déjà obsolètes au sous-projet 1) supprimées si encore présentes.

## Edge cases

| Cas | Comportement |
|---|---|
| Mode création (form vide) | Preview suit. Canvas hero vide (placeholder gris du composant). Pas d'erreur. |
| Form invalide | Preview rend quand même. Validation reste un signal du form gauche. |
| Image URL invalide / 404 | Canvas vide le buffer (déjà géré). |
| Galerie vide | Section galerie disparaît côté preview (`@if (item.gallery.length > 0)`), cohérent avec public. |
| Story manquante | Story-inline ne s'affiche pas, cohérent. |
| Slides éditées ailleurs (`/admin/stories`) | Preview montre la version DB au dernier chargement. Acceptable. |
| Galerie 20+ items | Pas de pagination. Le cache d'image natif du canvas suffit. |
| Modifs non sauvées + navigation | Hors portée de ce sous-projet. Si un guard `CanDeactivate` existe, il s'applique à l'admin mobilier sans modification. Sinon, à traiter dans un chantier séparé d'amélioration UX admin. |
| Responsive admin | Split → empilé sous 1280px → preview masqué sous 768px. |

## Tests

### Unitaires (Karma + Jasmine)

- `furniture-detail-view.spec.ts` (~8 tests) : rend les sections depuis un input ; pas d'overlay si `editable=false` ; émet coverEdit/galleryItemEdit/textFieldClick au clic en mode editable ; story-inline conditionnel ; click-to-focus émet le bon nom ; gallery reorder émet l'ordre.
- `furniture-preview.spec.ts` (~6 tests) : `previewItem()` agrège form + signal galerie ; modifier le form patche previewItem ; emit handler de cover ouvre la bonne modale ; click-to-focus appelle focusField.
- `mobilier.component.spec.ts` (~4 nouveaux tests) : `focusField()` scrolle et focus le bon input ; handlers preview cover/gallery ouvrent les bonnes modales ; reorder depuis preview met à jour le signal.
- `furniture-detail.component.spec.ts` : tests existants conservés ; nouveau "passe les inputs corrects au view".

### Régression visuelle (Playwright)

- **`furniture-detail` (public)** : doit rester pixel-identique. Aucune régénération de baseline. Si Playwright passe sans `--update`, refactor view validé.
- **`admin/mobilier`** : nouveau layout split. Régénération de baseline **après validation visuelle manuelle utilisateur** (règle projet stricte sur baselines Playwright).

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| Régression visuelle public lors de l'extraction | Playwright furniture-detail sans `--update`. |
| Live update silencieusement cassé | Test unitaire dédié : `form.patchValue({ title: 'X' })` → `previewItem().title === 'X'`. |
| Perte contact form / story viewer dans le refactor | Tests existants `furniture-detail.spec.ts` doivent rester verts. |
| Click-to-focus fragile | IDs déterministes `field-<name>` sur inputs, focus via `document.getElementById`. |
| Split layout responsive | Validation visuelle manuelle + media queries documentées. |
| Drag-reorder concurrent | Source unique = `gallerySignal`. Aucun conflit possible. |
| SEO meta tags perdus | Hooks Meta/Title restent dans la page publique. |
| A11y overlays | Boutons réels, aria-label, focus visible, Tab fonctionne. |
| Performance galerie 20+ items | Acceptable en admin. Lazy via IntersectionObserver si constaté. |

## Documentation

- **ADR-0018** : pattern page-vs-view pour fiches détail. À créer au merge. Sous-projets 3 et 4 référenceront cette ADR.
- **docs/SPECIFICATION_TECHNIQUE.md** : composants nouveaux, refactor furniture-detail.
- **docs/SPECIFICATION_FONCTIONNELLE.md** : preview WYSIWYG admin mobilier.

## Référence

- Sous-projet 1 (crop tool) : `docs/superpowers/specs/2026-06-07-image-crop-tool-design.md`
- ADR-0017 (Cropper.js) : `docs/adr/0017-cropperjs-image-crop-tool.md`
