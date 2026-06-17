# Lightbox images des fiches (mobilier/exposition) — Spec

**Date** : 2026-06-17
**Statut** : Validé — à planifier
**Type** : Feature standalone (backlog, demandée le 13/06/2026). Hors chantier WYSIWYG v2 (clos).

## Objectif

Permettre au visiteur d'agrandir une image de la **galerie** d'une fiche mobilier ou exposition (mode **public**) en cliquant dessus : ouverture d'une **lightbox** plein écran avec navigation précédent/suivant entre les images de la galerie.

## Contexte

Les fiches publiques (`furniture-detail-view` / `exhibition-detail-view`, vues pures partagées) rendent la galerie en grille (`.g-grid`) où chaque image est un `<app-cropped-image-canvas mode="cover">` (affiche la **région cropée** définie par l'admin). Aujourd'hui ces images ne sont pas cliquables. Le `<app-story-viewer>` existe mais est spécifique aux stories (queue de slides, barres de progression) — non réutilisable tel quel ; on en **reprend le pattern** (overlay dialog a11y hébergé par la page). Le mode `fit` de `<app-cropped-image-canvas>` (ajouté au sous-projet 6b) rend une région cropée exacte au ratio du crop — idéal pour la lightbox.

## Périmètre validé

| Choix | Retenu | Écarté |
| --- | --- | --- |
| Images cliquables | **Galerie uniquement** | Cover hero ; images de slide (déjà via story-viewer) |
| Contenu lightbox | **Région cropée agrandie** (mode `fit`) | Image originale complète |
| Navigation | **Précédent/suivant** (boutons ‹ › + flèches clavier), **circulaire**, compteur « i / N » | Image seule |
| Déclenchement | Mode **public** uniquement | Mode editable (garde ses overlays Cadrer/Remplacer/Retirer) |
| Backend | **Aucun changement** | — |

## Décisions architecturales

### 1. Composant `<app-image-lightbox>` (nouveau, générique)

Chemin : `frontend/src/app/components/image-lightbox/image-lightbox.component.ts`.

- **Inputs** : `images: LightboxImage[]`, `startIndex: number`.
  - `LightboxImage = { url: string; crop?: Crop | null; alt: string }` (type local au composant ou dans un petit modèle).
- **Output** : `closed = new EventEmitter<void>()`.
- **État interne** : `index = signal<number>(startIndex)` (initialisé depuis l'input au `ngOnInit`).
- **Rendu** : backdrop sombre plein écran (`position: fixed; inset: 0; z-index élevé`), `role="dialog"` + `aria-modal="true"` + `aria-label` (ex. « Image N sur M »), `cdkTrapFocus cdkTrapFocusAutoCapture`. Image courante via `<app-cropped-image-canvas mode="fit" [imageUrl]="current().url" [crop]="current().crop ?? null" [alt]="current().alt">` centrée (le mode `fit` letterbox naturellement sur le fond).
- **Contrôles** :
  - Bouton **Fermer** (✕, `aria-label="Fermer"`).
  - Boutons **‹ Précédent** / **Suivant ›** (`aria-label`), navigation **circulaire** (`(index - 1 + n) % n`, `(index + 1) % n`). Masqués/désactivés s'il n'y a qu'une image.
  - **Clavier** : `Échap` ferme (émet `closed`) ; `←`/`→` naviguent (via `@HostListener('document:keydown...')` ou sur le backdrop).
  - **Clic sur le backdrop** (hors image/contrôles) ferme.
  - **Compteur** « {{ index()+1 }} / {{ images.length }} ».
  - Région `aria-live="polite"` annonçant l'image courante (alt + position).
- **Restitution du focus** : mémorise `document.activeElement` à l'ouverture (`ngOnInit`) et le restaure à la destruction (`ngOnDestroy`) — pattern du `story-viewer`.
- Composant **pur** (pas de service/Router/HttpClient). Importe `A11yModule` (cdkTrapFocus) + `CroppedImageCanvasComponent`.

### 2. Vues détail — galerie publique cliquable

Dans `furniture-detail-view` et `exhibition-detail-view`, branche **non-editable** (`@else`) de la galerie : chaque image devient déclencheur. La rendre accessible : envelopper l'image dans un `<button type="button" class="gallery-open-btn" aria-label="Agrandir l'image {{ i+1 }}" (click)="galleryImageOpen.emit(i)">` (ou rendre la figure cliquable avec rôle/clavier ; le `<button>` est préféré pour l'a11y native). Le `<app-cropped-image-canvas>` reste à l'intérieur.

- Nouvel `@Output() galleryImageOpen = new EventEmitter<number>();` dans chaque vue détail.
- La branche **editable** est **inchangée** (overlays d'édition + drag ; pas de lightbox).
- CSS : curseur `zoom-in` + focus visible sur le bouton ; le bouton ne doit pas casser la grille (`display: block; width/height: 100%; padding: 0; border: 0; background: none`).

### 3. Pages publiques — hôtes de l'overlay

`furniture-detail.component` et `exhibition-detail.component` (pages publiques qui délèguent le rendu à la vue détail et hébergent déjà `<app-story-viewer>`) :

- Signal `lightboxIndex = signal<number | null>(null)`.
- Sur `(galleryImageOpen)="lightboxIndex.set($event)"`.
- `computed galleryImages()` : mappe `item.gallery` → `{ url: img.url, crop: img.crop ?? null, alt: <titre> + ' — vue ' + (i+1) }` (cohérent avec l'alt actuel de la galerie).
- Rendu :
```html
@if (lightboxIndex() !== null) {
  <app-image-lightbox [images]="galleryImages()" [startIndex]="lightboxIndex()!" (closed)="lightboxIndex.set(null)" />
}
```

### 4. Mode admin (preview)

En mode editable (preview admin des fiches), la galerie conserve ses affordances d'édition ; `galleryImageOpen` n'est pas câblé/émis (la lightbox est une fonctionnalité **publique**). Aucun impact sur l'édition.

## Tests

- **`image-lightbox.component.spec.ts`** (nouveau) : rend l'image au `startIndex` ; bouton suivant → image suivante (et circulaire : dernier → premier) ; précédent (premier → dernier) ; flèches clavier ← → ; `Échap` émet `closed` ; clic backdrop émet `closed` ; compteur « i / N » correct ; une seule image → pas de navigation ; `role="dialog"`/`aria-modal` présents.
- **`furniture-detail-view` / `exhibition-detail-view` specs** : en mode public, les images de galerie sont des boutons et le clic émet `galleryImageOpen(i)` ; en mode editable, pas de bouton lightbox (overlays d'édition conservés).
- **pages publiques specs** : `galleryImageOpen` ouvre la lightbox avec les bonnes `images`/`startIndex` ; `closed` la referme ; `galleryImages()` mappe correctement url/crop/alt.
- **Baselines Playwright** : la galerie au repos est inchangée visuellement (le `<button>` enveloppant ne modifie pas le rendu) → baselines a priori intactes ; à confirmer après validation visuelle (régénérer seulement si diff justifié).

## Hors portée

- Cover hero cliquable.
- Images de slide (déjà visibles en plein écran via le `story-viewer` des sliders).
- Zoom/pan dans l'image, swipe tactile (boutons + clavier suffisent), téléchargement de l'image.
- Image originale non cropée (on affiche la région cropée, validé).
- Lightbox en mode admin/preview.
