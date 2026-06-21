# Preview WYSIWYG Accueil — Spec

**Date** : 2026-06-09
**Statut** : ✅ Implémenté — mergé sur main (ADR-0018)
**Sous-projet** : 4/4 du chantier « Console admin de configuration d'affichage des images ». S'appuie sur sous-projets 1 (crop tool), 2 (preview WYSIWYG mobilier) et 3 (preview WYSIWYG exposition), tous mergés sur main. Dernier sous-projet du chantier.

## Objectif

Donner à l'admin un aperçu live (WYSIWYG) de la page d'accueil pendant l'édition. Pattern page/view (ADR-0018) appliqué à `home`. Édition inline des textes du hero (eyebrow / title / lead) directement depuis le preview avec **auto-save** vers `site_content`. Hover overlay sur les cards du feed : toggle inclusion + drag-reorder. Les news-sliders restent en lecture seule (édition via `<app-admin-sliders>` form-side).

## Portée

| Élément | Comportement preview |
|---|---|
| Hero eyebrow | Click → focus form (site_content key). Dblclick → édition inline contenteditable, blur auto-save. |
| Hero title | Idem. |
| Hero lead | Idem. |
| News-sliders (3 zones) | Lecture seule. Cartouche `[i]` discret en haut-droite → scroll vers form-side sliders + switch mode Modifier. |
| Feed cards | Hover overlay : checkbox Inclus + drag-handle ⋮⋮. RouterLink désactivé en editable. |
| Cards exclues | Rendu opacité 0.35 + badge « Exclu ». |
| Story-viewer (modale) | Rendu toplevel par la page publique. Désactivé en preview admin. |

**Spécificité home vs sous-projets 2-3** : **auto-save** au lieu d'un FormGroup local. Le home admin n'a pas de form unique — `homeItems` est un signal d'état éditorial, `site_content` est une map de clés sauvegardée via `updateContent()` API existante. Pas de bouton « Enregistrer » global dans la toolbar preview.

**Hors portée — reporté**

- Édition inline du contenu des news-sliders (titre, ordre).
- Édition inline des cards (cover/title/excerpt) — édité dans les fiches sources.
- Drag entre les zones news-sliders (top/middle/bottom).
- Crop des covers de cards depuis la home.
- Édition `HomeCategoryView`, `HomeExhibitionView` (rendu masonry).
- Application à d'autres pages (about, contact) — hors chantier.

## Décisions architecturales

### Pattern page/view (ADR-0018)

Appliqué à home. `<app-home-view>` extrait, standalone, partagé public+admin. Aucune dépendance HttpClient/Router/PortfolioService dans le view.

### Layout admin : toggle Modifier/Aperçu

Pas de split. Toggle plein-largeur (signal `accueilViewMode = 'form' | 'preview'`). Le « form » (liste éditoriale + sliders) reste rendu en DOM (`position: absolute; left: -100vw; pointer-events: none`) en mode preview pour préserver les ViewChild.

### Auto-save inline (différence clé)

Édition inline texte hero : blur ou Entrée → emit `textFieldEdit({key, value})` → `AccueilComponent` appelle `portfolio.updateContent({ ...this.content(), [e.key]: e.value })` immédiatement. Toast léger « Texte sauvegardé. » sur succès, revert + toast erreur sur échec.

Reorder feed et toggle inclusion : auto-save existant déjà sur `AccueilComponent.onFeedReorder` / `toggleIncluded` (PUT `/api/admin/home/feed`). Le preview wrapper appelle les mêmes méthodes.

### Toolbar preview

- **Pas de bouton « 💾 Enregistrer »** (auto-save partout).
- Bouton **⤢ Plein écran** / **⤡ Réduire**.
- Label « Aperçu » à gauche.

### Cards éditables

Le rendu public est `<a class="card" [routerLink]>`. En mode editable, on rend la card en `<li class="card editable">` (pas de RouterLink) + overlay hover. Le routerLink est désactivé pour empêcher la navigation accidentelle.

### Sliders cartouche `[i]`

Les sliders restent rendus tels quels en preview. Un cartouche `[i]` (rond noir 24×24, opacité 0.6 → 1 au hover) en haut-droite de chaque slider en mode editable → click → emit `sliderEditRequested(zoneKey)` → AccueilComponent switch `accueilViewMode.set('form')` + scroll vers la section sliders.

## Modèle de composants

```
frontend/src/app/
├── components/
│   └── home-view/                              ← NOUVEAU
│       ├── home-view.component.ts
│       └── home-view.component.spec.ts
│
├── pages/
│   ├── home/
│   │   └── home.component.ts                   ← refactor : délègue au view
│   │
│   └── admin/
│       └── accueil/
│           ├── accueil.component.ts            ← toggle + handlers preview
│           ├── accueil.component.spec.ts
│           └── preview/
│               ├── home-preview.component.ts   ← NOUVEAU
│               └── home-preview.component.spec.ts
```

### `<app-home-view>` — interface

```ts
export type EditableHomeContentKey =
  | 'home.hero.eyebrow' | 'home.hero.title' | 'home.hero.lead';

@Input({ required: true }) data: HomePageData | null;
@Input() content: SiteContent = {};
@Input() editable = false;

@Output() feedReorder = new EventEmitter<number[]>();
@Output() feedItemToggleInclude = new EventEmitter<{ kind: 'furniture' | 'exhibition'; slug: string; included: boolean }>();
@Output() textFieldEdit = new EventEmitter<{ key: EditableHomeContentKey; value: string }>();
@Output() sliderEditRequested = new EventEmitter<'home-top' | 'home-middle' | 'home-bottom'>();
@Output() storyOpen = new EventEmitter<SliderStoryRef>();
@Output() viewerOpen = new EventEmitter<StoryItem[]>();
```

### `<app-home-preview>` — interface admin

```ts
@Input({ required: true }) data: Signal<HomePageData | null>;
@Input() content: Signal<SiteContent>;
// 6 Outputs re-emit du view
```

Pas de FormGroup. Le wrapper passe directement les signaux du parent.

## Refactor du public

`home.component.ts` :
- Template réduit : remplace l'inline hero / news-sliders / feed grid par `<app-home-view [data]="data()" [content]="content()" (storyOpen)="openStoryFromSlider($event)" (viewerOpen)="onViewerOpen($event)">`.
- Garde : chargement API (`PortfolioService.getHome()`), `<app-story-viewer>` toplevel conditionnel sur viewerQueue, hooks SEO.
- Méthodes `heroEyebrow()`, `heroTitle()`, `heroLead()`, `eyebrowStyleVar()` etc. migrent dans le view (avec accès via Input content).
- `openStoryFromSlider`, `closeViewer` restent dans la page.

## Comportements d'interaction

### Édition inline texte hero — auto-save

1. Mode editable + hover sur eyebrow/title/lead → léger outline dashed.
2. Double-clic → `[attr.contenteditable]="true"` + outline accent (sélection auto via `range.selectNodeContents`).
3. Blur ou Entrée → emit `textFieldEdit({ key, value: el.textContent.trim() })`.
4. `AccueilComponent.onPreviewTextFieldEdit(e)` :
   ```ts
   const next = { ...this.content(), [e.key]: e.value };
   this.portfolio.updateContent(next).subscribe({
     next: () => { this.content.set(next); this.toast.success('Texte sauvegardé.'); },
     error: () => this.toast.error('Erreur lors de la sauvegarde.'),
   });
   ```
5. Échap → cancel (le contenteditable est blurré sans emit).

### Drag-reorder feed

Pastille `⋮⋮` (top-left) sur chaque card éditable → HTML5 drag via `ReorderableDirective`. Drop → `feedReorder.emit(order)` → `AccueilComponent.onPreviewFeedReorder(order)` → met à jour `homeItems` signal + PUT `/api/admin/home/feed`.

### Toggle inclusion

Checkbox dans overlay → change → emit `feedItemToggleInclude({ kind, slug, included })` → handler appelle même endpoint que `toggleIncluded` existante.

### Sliders cartouche `[i]`

Click → `sliderEditRequested.emit(zoneKey)` → `AccueilComponent` switch `accueilViewMode.set('form')` + `document.getElementById('admin-sliders-' + zoneKey)?.scrollIntoView()`.

## Edge cases

| Cas | Comportement |
|---|---|
| Feed vide | Section feed disparaît public, en editable affiche message « Aucun item — gère via les fiches Mobilier/Expositions ». |
| Tous items exclus | Feed vide. Idem. |
| Aucune story | News-sliders vides non rendus (filtrage backend). |
| Aucun site_content défini | Hero affiche les defaults hardcodés (déjà géré). |
| Network error sur updateContent | Toast erreur + revert contenteditable au valeur précédente. Signal content **pas** mis à jour. |
| Network error sur reorder/toggle | Toast erreur + refetch `getHome()`. |
| Card avec coverCrop défini | Canvas honore le crop (HomeFeedItem.coverCrop, sous-projet 1). |
| Double-clic eyebrow alors qu'autre champ en édition | Premier champ blurré (auto-save) puis édition démarre. |
| Site_content key inexistante | `updateContent` envoie la map entière, la nouvelle clé est créée. |
| Plein écran preview | `cdkTrapFocus` + `aria-modal=true` (pattern sous-projet 3). |

## Tests

### Unitaires (Karma + Jasmine)

- `home-view.component.spec.ts` (~15 tests) : rend hero (3 spans + outline editable), news-sliders 3 zones, feed cards avec badge mobilier/expo ; mode editable=true active overlays cards + cartouche sliders ; émet `feedReorder`, `feedItemToggleInclude`, `textFieldEdit` (3 keys), `sliderEditRequested`, `storyOpen`, `viewerOpen` ; routerLink désactivé en editable ; cards exclues opacité 0.35.
- `home-preview.component.spec.ts` (~5 tests) : rend `<app-home-view editable=true>` ; passe data/content depuis Inputs Signal ; re-emit des Outputs.
- `accueil.component.spec.ts` (~6 nouveaux tests) : `accueilViewMode` default form/preview, `onPreviewFeedReorder` met à jour homeItems et déclenche refresh, `onPreviewFeedItemToggleInclude` toggle inclusion, `onPreviewTextFieldEdit` appelle `updateContent` + met à jour content signal + toast, error path revert, `onSliderEditRequested` switch mode + scroll.
- `home.component.spec.ts` : tests existants conservés + « passe data + content au view ».

### Régression visuelle (Playwright)

- `home` (public) : doit rester pixel-identique. Aucun `--update`. Si fail → fix view CSS. Si galerie/cards migrent au canvas (déjà fait sous-projet 1 pour la home) → pas de changement attendu.

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| Régression visuelle public lors de l'extraction | Playwright sans `--update`. Itération CSS si écart. |
| Auto-save spam de PUTs | Reorder fire une fois au drop (HTML5). Toggle inclusion une fois par change. Édition inline une fois par blur. Pas de debounce nécessaire. |
| Network error pendant édition inline | Revert contenteditable + toast. Test unitaire. |
| `updateContent` envoie tout le map (gros payload) | Acceptable : site_content reste < 100 clés. |
| Sliders cartouche `[i]` interfère avec rendu | Position absolute, opacity 0.6 → 1, test visuel. |
| `cdkTrapFocus` en fullscreen casse édition inline | Déjà éprouvé sous-projet 3. |
| AccueilComponent existant (144 lignes) grossit avec handlers preview | Garder en l'état, ajouter le toggle + handlers. Pas de refactor du form-side existant. |
| Couverture branches CI déjà à 76% | Ajouter tests handlers + lower à 75 si besoin (pattern éprouvé sous-projet 3). |

## Documentation

- **ADR-0018** (existant) : référencé. Pattern page/view appliqué 3ème fois.
- `docs/SPECIFICATION_TECHNIQUE.md` : composants `<app-home-view>` + `<app-home-preview>`, refactor `home.component.ts`, handlers AccueilComponent avec `updateContent` auto-save.
- `docs/SPECIFICATION_FONCTIONNELLE.md` : preview WYSIWYG accueil avec auto-save inline (différent des fiches détail).

## Référence

- Sous-projet 3 (preview WYSIWYG expo) : `docs/superpowers/specs/2026-06-09-exhibition-detail-wysiwyg-preview-design.md`
- Sous-projet 2 (preview WYSIWYG mobilier) : `docs/superpowers/specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md`
- Sous-projet 1 (crop tool) : `docs/superpowers/specs/2026-06-07-image-crop-tool-design.md`
- ADR-0018 (pattern page/view) : `docs/adr/0018-page-vs-view-pattern.md`
