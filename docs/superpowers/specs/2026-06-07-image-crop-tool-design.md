# Outil de cadrage d'image (crop) — Spec

**Date** : 2026-06-07
**Statut** : Validé — prêt pour writing-plans
**Sous-projet** : 1/4 d'un chantier plus large « Console admin de configuration d'affichage des images ». Les 3 specs suivants traiteront du preview WYSIWYG (Mobilier → Exposition → Accueil) et s'appuieront sur ce premier livrable.

## Objectif

Donner à l'admin un outil de cadrage rectangulaire précis pour décrire exactement la portion d'image à afficher côté public. Remplace le focal point actuel (limité à un point X/Y) par un crop avec présets d'aspect ratio.

## Portée de cette itération

| Emplacement | Avant | Après |
|---|---|---|
| Cover mobilier | focal point (X/Y) | crop rectangulaire (x/y/w/h) |
| Cover exposition | focal point (X/Y) | crop rectangulaire |
| Cover story | URL brute | URL + crop optionnel |
| Galerie mobilier | URL brute | URL + crop optionnel |
| Galerie exposition | URL brute | URL + crop optionnel |

Hors portée (autres specs ou plus tard) :
- Slides individuels d'une story (l'image au sein du slide narratif)
- Items composés de la home
- Preview WYSIWYG des pages
- Génération serveur des variantes croppées

## Décisions

### Modèle de crop : rectangulaire fixe

L'admin trace un rectangle précis sur l'image (origine top-left, largeur, hauteur en %). C'est cette zone EXACTE qui s'affiche côté public. Pas de "garde visible" automatique : l'admin a le contrôle pixel-perfect.

### Aspect ratio : présets choisis à chaque crop

Au moment du cadrage, l'admin choisit un preset (`16:9`, `4:5`, `1:1`, `Libre`). Le ratio choisi n'est pas stocké : c'est la valeur `w / h` du rectangle qui définit implicitement le ratio. Pas de redondance.

### Stockage : par usage (cover + chaque entrée de galerie)

Le crop est porté par l'**entité qui utilise l'image** (cohérent avec le focal point actuel), pas par la photo elle-même. Une même photo réutilisée à 2 endroits peut avoir 2 crops différents.

### Focal point : remplacement complet

Drop des colonnes `cover_focal_x/y` et suppression du composant `<app-focal-point-picker>`. Les fiches ayant un focal défini perdront leur réglage — acceptable (aucune migration data).

### UI : Cropper.js (lib externe)

Première lib UI tierce du projet. ~50KB gzipped, mature, support touch + clavier. À mentionner dans un ADR au merge.

### Rendu public : CSS pur (transform + scale)

L'`<img>` charge l'image entière (déjà optimisée à 1920px par Thumbnailator). Le crop est appliqué via `[style.transform]` calculé en TS : `translate(-tx%, -ty%) scale(s)` avec `transform-origin: 0% 0%` et conteneur en `overflow: hidden`. Aucun stockage additionnel, recalcul instantané.

## Modèle de données

### Migration Liquibase 028

Un seul changeset atomique :

```yaml
- changeSet:
    id: 028-replace-focal-point-with-crop
    author: atelier-lumen
    changes:
      # Furniture cover : drop focal, add crop
      - dropColumn:
          tableName: furniture
          columns:
            - column: { name: cover_focal_x }
            - column: { name: cover_focal_y }
      - addColumn:
          tableName: furniture
          columns:
            - { column: { name: cover_crop_x, type: double } }
            - { column: { name: cover_crop_y, type: double } }
            - { column: { name: cover_crop_w, type: double } }
            - { column: { name: cover_crop_h, type: double } }

      # Exhibition cover : symétrique
      - dropColumn:
          tableName: exhibition
          columns:
            - column: { name: cover_focal_x }
            - column: { name: cover_focal_y }
      - addColumn:
          tableName: exhibition
          columns:
            - { column: { name: cover_crop_x, type: double } }
            - { column: { name: cover_crop_y, type: double } }
            - { column: { name: cover_crop_w, type: double } }
            - { column: { name: cover_crop_h, type: double } }

      # Furniture gallery : 4 colonnes crop par entrée
      - addColumn:
          tableName: furniture_gallery
          columns:
            - { column: { name: crop_x, type: double } }
            - { column: { name: crop_y, type: double } }
            - { column: { name: crop_w, type: double } }
            - { column: { name: crop_h, type: double } }

      # Exhibition gallery : symétrique
      - addColumn:
          tableName: exhibition_gallery
          columns:
            - { column: { name: crop_x, type: double } }
            - { column: { name: crop_y, type: double } }
            - { column: { name: crop_w, type: double } }
            - { column: { name: crop_h, type: double } }

      # Story cover : 4 colonnes crop
      - addColumn:
          tableName: story
          columns:
            - { column: { name: cover_crop_x, type: double } }
            - { column: { name: cover_crop_y, type: double } }
            - { column: { name: cover_crop_w, type: double } }
            - { column: { name: cover_crop_h, type: double } }
```

**Conventions** :
- Valeurs en `DOUBLE`, plage 0.0 à 100.0 (pourcentages de l'image originale).
- `NULL` partout = pas de crop = comportement par défaut (`object-fit: cover` natif).
- Pas de stockage de l'aspect ratio (déductible de `w/h`).

### Java — entités JPA

`FurnitureEntity` et `ExhibitionEntity` :
- Supprimer les champs `coverFocalX`, `coverFocalY`.
- Ajouter 4 champs `Double coverCropX`, `coverCropY`, `coverCropW`, `coverCropH` mappés sur les colonnes.

`StoryEntity` :
- Ajouter 4 champs `Double coverCropX/Y/W/H` (pas de focal point à dropper, c'est nouveau).

`furniture_gallery` et `exhibition_gallery` passent d'une `@ElementCollection<String>` (mappée sur `url`) à une `@ElementCollection<GalleryEntry>` où `GalleryEntry` est une classe `@Embeddable` :

```java
@Embeddable
public class GalleryEntry {
    @Column(name = "url", length = 500, nullable = false)
    private String url;
    @Column(name = "crop_x") private Double cropX;
    @Column(name = "crop_y") private Double cropY;
    @Column(name = "crop_w") private Double cropW;
    @Column(name = "crop_h") private Double cropH;
    // getters/setters
}
```

Les `OrderColumn` et `BatchSize` existants sont conservés.

### Java — records DTOs

Nouveau record :

```java
public record ImageCrop(
    @DecimalMin("0.0") @DecimalMax("100.0") Double x,
    @DecimalMin("0.0") @DecimalMax("100.0") Double y,
    @DecimalMin("0.0") @DecimalMax("100.0") Double w,
    @DecimalMin("0.0") @DecimalMax("100.0") Double h
) {}
```

Nouveau record `GalleryImage` :

```java
public record GalleryImage(
    @Size(max = 500) String url,
    ImageCrop crop
) {}
```

`Furniture` :
- Supprimer `coverFocalX`, `coverFocalY`.
- Ajouter `ImageCrop coverCrop` (nullable) à la position de l'ancien focal.
- Changer `List<String> gallery` → `List<GalleryImage> gallery`.

`Exhibition` : symétrique.

`Story` :
- Ajouter `ImageCrop coverCrop` (nullable) à la position juste après `coverImage`.

### TypeScript — interfaces

```ts
export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GalleryItem {
  url: string;
  crop?: Crop | null;
}

export interface Furniture {
  // … champs existants moins coverFocalX/Y …
  coverImage: string;
  coverCrop?: Crop | null;
  gallery: GalleryItem[];   // était : string[]
  // …
}

export interface Exhibition {
  // …
  coverImage: string;
  coverCrop?: Crop | null;
  gallery: GalleryItem[];
  // …
}

export interface Story {
  // … champs existants …
  coverImage: string;
  coverCrop?: Crop | null;
  // …
}
```

## Composant UI : `<app-image-crop-picker>`

### API

```ts
@Component({ selector: 'app-image-crop-picker', standalone: true })
export class ImageCropPickerComponent {
  @Input({ required: true }) imageUrl!: string;
  @Input() initialCrop: Crop | null = null;
  @Input() aspectRatios: AspectRatio[] = DEFAULT_ASPECT_RATIOS;
  // DEFAULT_ASPECT_RATIOS = [{label:'16:9',value:16/9},{label:'4:5',value:4/5},{label:'1:1',value:1},{label:'Libre',value:NaN}]

  @Output() validated = new EventEmitter<Crop>();
  @Output() cancelled = new EventEmitter<void>();
}
```

### Comportement

- Modale plein écran avec backdrop semi-transparent + `cdkTrapFocus`.
- Initialise Cropper.js sur l'`<img>` au `ngAfterViewInit`, avec `data: initialCrop` converti en `{x,y,width,height}` au format Cropper.
- Select aspect ratio en haut → `cropper.setAspectRatio(value)`. Présets 16:9, 4:5, 1:1, libre (NaN).
- Bouton "Réinitialiser" : crop devient l'image entière, ratio libre.
- Affichage live des coordonnées calculées (`X 12% · Y 8% · L 75% · H 42%`).
- Bouton "Valider" : récupère `cropper.getData(true)`, normalise en pourcentages, émet via `validated`.
- Bouton "Annuler" / clic backdrop / Escape : émet `cancelled` sans payload.
- Clavier : flèches déplacent le rectangle (natif Cropper.js), +/- zoom, Escape ferme.
- `ngOnDestroy` : `cropper.destroy()` pour éviter fuite mémoire.

### Intégration admin

**Pour le cover** :
- Étendre `<app-image-field>` : ajouter un bouton « Cadrer » à droite du bouton « Médiathèque », disabled tant qu'aucune URL d'image n'est définie.
- Clic « Cadrer » → ouvre `<app-image-crop-picker>` en modale. Validation patche le champ `coverCrop` du parent via `(validated)`.
- Composant `<app-focal-point-picker>` supprimé du dossier `shared/`.

**Pour la galerie** :
- `<app-gallery-editor>` adapté pour gérer `GalleryItem[]` au lieu de `string[]`.
- Chaque vignette de galerie reçoit un overlay au hover avec icône « ✂️ Cadrer » → ouvre la modale pour cet item.
- Indicateur visuel sur la vignette : mini-rectangle en overlay montrant la zone du crop défini, ou rien si crop null.
- Optionnel : chip en coin de vignette avec le ratio approximatif (« 4:5 », « 16:9 », « libre »).

**Pour le cover de story** :
- Le cover de story est édité dans `mobilier.component` et `expositions.component` (modale d'édition / inline avec `<app-image-field>` + `coverEditCtrl`).
- Étendre la zone d'édition pour inclure un bouton « Cadrer » à côté de l'`<app-image-field>` du cover de story.
- Validation patche un nouveau champ `coverCrop` envoyé dans le payload `PUT /api/admin/stories/{id}`.

## Rendu public (CSS)

### Formule

Soit `crop = { x, y, w, h }` (en %) et l'image originale W × H. On veut que le rectangle crop occupe tout le conteneur, sans déformation.

```ts
function cropTransform(crop: Crop | null | undefined): {
  transform: string;
  transformOrigin: string;
} {
  if (!crop || !crop.w || !crop.h) {
    return { transform: 'none', transformOrigin: '0% 0%' };
  }
  const { x, y, w, h } = crop;
  // Facteur d'echelle : agrandir l'image pour que le rectangle de crop
  // remplisse le conteneur. Cover = max(scaleW, scaleH).
  const scaleW = 100 / w;
  const scaleH = 100 / h;
  const scale = Math.max(scaleW, scaleH);
  // Translation pour amener le coin top-left du crop a (0, 0) du conteneur.
  // CSS translate(%, %) est relatif aux dimensions originales de l'element
  // (avant transform), donc l'image telle qu'elle est rendue a 100% du conteneur.
  const tx = -x * scale;
  const ty = -y * scale;
  return {
    transform: `translate(${tx}%, ${ty}%) scale(${scale})`,
    transformOrigin: '0% 0%',
  };
}
```

**Note math** : si `w = 50` (crop à 50% de largeur), `scale = 2` → l'image est doublée. Si `x = 25`, `tx = -50%` → translation de 50% de la largeur du conteneur vers la gauche, ce qui amène le coin du crop à l'origine.

### Template

```html
<div class="cropped-img-wrap">
  <img
    [src]="item.coverImage"
    [alt]="item.title"
    [style.transform]="cropStyle().transform"
    [style.transform-origin]="cropStyle().transformOrigin"
    class="cropped-img" />
</div>
```

### CSS du wrapper

```css
.cropped-img-wrap {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}
.cropped-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### Fallback gracieux

Si `crop` est `null` (fiches sans crop défini, soit toutes après migration) → `transform: 'none'` → l'image s'affiche en `object-fit: cover` natif comme avant. **Aucune régression visuelle**.

### Sites publics impactés

- `furniture-detail.component` : hero img + chaque image de galerie.
- `exhibition-detail.component` : hero img + chaque image de galerie.
- `story-viewer.component` : slide de type `cover` au début de la story (utilise `story.coverImage` via `enrichSlides`).
- `story-inline.component` : la cover de story affichée dans la fiche détail mobilier.
- `news-slider.component` : chaque card affiche `story.coverImage` — le crop story s'y applique.

Les autres sites (home masonry, catalogue, médiathèque, etc.) servent les images en `object-fit: cover` standard et **ne sont pas touchés** dans ce spec.

## Découpe en commits

1. **Backend** : Liquibase 028 + entités (Furniture, Exhibition, Story, GalleryEntry) + records (`ImageCrop`, `GalleryImage`, MAJ `Furniture`/`Exhibition`/`Story`) + services + tests existants adaptés. Breaking interne (DTO `gallery`) mais autonome côté backend.
2. **Frontend modèle** : interfaces TS `Crop` + `GalleryItem`, MAJ de `Furniture`/`Exhibition`/`Story`. Adapter le service mock + helpers + tests qui consommaient `gallery: string[]`. Pas de rendu modifié encore.
3. **Frontend composant** : `<app-image-crop-picker>` + spec, sans intégration. Install `cropperjs` dans package.json.
4. **Frontend intégration + rendu public** : remplace `<app-focal-point-picker>` (supprimé) par le nouveau bouton "Cadrer" dans `<app-image-field>` (cover mobilier + expo + story), étend `<app-gallery-editor>` pour `GalleryItem`, branche `cropTransform` sur les fiches détail + story-viewer + story-inline + news-slider. Régen baselines Playwright après validation visuelle utilisateur.

## Tests

### Backend (∼15 nouveaux/adaptés)

- `ImageCropTest` (record) : validation contraintes 0-100, equals/hashCode, null OK.
- `GalleryImageTest` : équivalence URL + crop.
- `FurnitureServiceTest` + `ExhibitionServiceTest` : 4-5 tests par service (create/update avec et sans crop, propagation aux galerie items, round-trip cover crop).
- `StoryServiceTest` : 2-3 tests pour propagation du `coverCrop` au save/load.
- `FurnitureControllerTest` + `ExhibitionControllerTest` + `AdminStoryControllerTest` : 1-2 tests sur POST/PUT avec crop.
- Tous les tests existants qui construisaient `new Furniture(...)` ou `new Exhibition(...)` adaptés au nouveau record (cf. pattern utilisé pour les ajouts précédents).

### Frontend (∼25 nouveaux/adaptés)

- `ImageCropPickerComponent.spec` : 10 tests — init avec/sans `initialCrop`, change aspect, validate émet le payload normalisé, cancel n'émet rien, Escape ferme, destroy nettoie Cropper.js.
- `cropTransform` utility .spec : 8 tests — null → 'none', valeurs nominales, edge cases (w=0, h=0, ratios opposés).
- `mobilier.component.spec` + `expositions.component.spec` : adapter le pattern existant (focal point retiré), ajout test « crop persiste dans le payload save » + « gallery items contiennent crop » + « cover crop de story est envoyé au PUT story ».
- `furniture-detail.component.spec` + `exhibition-detail.component.spec` : test du `[style.transform]` calculé selon crop fourni / null.
- `story-viewer.component.spec` + `story-inline.component.spec` + `news-slider.component.spec` : test que le crop story est appliqué via transform au cover.
- `gallery-editor.spec` : adapter au nouveau modèle `GalleryItem[]`.

### Tests visuels Playwright

- Régénération des baselines `furniture-detail`, `exhibition-detail`, et `home` (à cause des news-sliders) après validation visuelle manuelle.
- Probablement aucune régression visible si les fixtures n'ont pas de crop défini (fallback `transform: none`), mais à vérifier en visuel d'abord (règle projet).
- Aucun nouveau spec Playwright dans cette itération.

## Risques et notes

- **Cropper.js sans wrapper Angular officiel** : on importe directement et gère `cropper.destroy()` au `ngOnDestroy`. Pattern standard, pas insurmontable.
- **Pas de SSR** : OK pour Cropper.js.
- **Bundle admin +50KB gzipped** : acceptable, admin pas critique pour SEO. Chargé via lazy chunk admin.
- **Première lib UI tierce du projet** : prévoir une ligne dans CLAUDE.md « Conventions » + un ADR au merge mentionnant la dépendance.
- **Breaking change `gallery: string[]` → `GalleryItem[]`** : forte cascade côté tests + composants existants (gallery-editor, slides-editor, fiches détail). C'est le point le plus volumineux du chantier, mécanique mais long.

## Critères de complétion

- L'admin peut cropper le cover d'un mobilier/expo, le cover d'une story, et chaque image de galerie via la modale.
- Le crop choisi s'affiche pixel-perfect sur la fiche publique (hero, galerie, story-viewer, story-inline, news-slider cards).
- Aucun focal point résiduel dans le code ou la DB (colonnes droppées, composant supprimé, refs supprimées).
- Backend tests verts + frontend tests verts.
- Baselines Playwright régénérées après validation visuelle utilisateur.
- Une mention de Cropper.js dans la doc projet (CLAUDE.md + ADR au merge).
