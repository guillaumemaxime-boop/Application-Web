# Éditeur de slides v2 — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Refondre l'éditeur de slides admin (picker médiathèque, cover/lien implicites, mini-aperçu par carte, slide vidéo YouTube/Vimeo) et adapter le rendu public + le backend en conséquence.

**Architecture :** Le modèle API frontend (`Slide`) passe de 5 types (`cover`/`image`/`spec`/`quote`/`link`) à 4 (`image`/`video`/`spec`/`quote`). Le rendu public consomme un type plus large `DisplaySlide` qui inclut des slides synthétiques `cover` et `link` générées par le composant parent (`furniture-detail`, `exhibition-detail`). Backend : sealed interface `Slide` et `StoryService` mis à jour, migration Liquibase 008 supprime les rows legacy. La CSP est élargie pour autoriser les iframes YouTube/Vimeo.

**Tech Stack :** Angular 21 standalone + signals + ReactiveForms, DomSanitizer pour les iframes vidéo, Karma+Jasmine. Spring Boot 4 + Liquibase + Jackson sealed types. H2 (tests backend), PostgreSQL (prod).

**Spec :** [`docs/superpowers/specs/2026-05-31-slides-editor-v2-design.md`](../specs/2026-05-31-slides-editor-v2-design.md)

---

## Cartographie des fichiers

### À créer

- `frontend/src/app/utils/video-url.ts` — fonction pure `parseVideoUrl(url)` reconnaissant YouTube + Vimeo.
- `frontend/src/app/utils/video-url.spec.ts` — tests unitaires (5 patterns reconnus + cas null).
- `frontend/src/app/models/display-slide.model.ts` — type `DisplaySlide` (union incluant `cover` et `link` synthétiques pour le rendu public uniquement).
- `backend/src/main/resources/db/changelog/changes/008-drop-legacy-cover-link-slides.yaml` — migration `DELETE` des rows legacy.

### À modifier

- `frontend/src/app/models/slide.model.ts` — retirer `CoverSlide`/`LinkSlide`, ajouter `VideoSlide`.
- `frontend/src/app/components/story-viewer/story-viewer.component.ts` (+ spec) — `Input` passe à `DisplaySlide[]`, ajout branche `video`.
- `frontend/src/app/components/story-inline/story-inline.component.ts` (+ spec) — idem.
- `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts` (+ spec) — calcule la liste `DisplaySlide[]` enrichie.
- `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts` (+ spec) — idem.
- `frontend/src/app/pages/admin/shared/slides-editor.component.ts` (+ spec) — v2 UX (retire cover/link, ajout vidéo, ImageFieldComponent, mini-vignette).
- `backend/src/main/java/com/atelier/portfolio/model/Slide.java` — sealed updated.
- `backend/src/main/java/com/atelier/portfolio/service/StoryService.java` — switchs entité↔DTO updated.
- `backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java` (s'il existe ; sinon créer) — tests pour la branche `video` et rejet `cover`/`link`.
- `backend/src/main/resources/db/changelog/db.changelog-master.yaml` — inclure le changelog 008.
- `backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java` — `frame-src` autorise `youtube.com` + `player.vimeo.com`.

---

## Task 1 — Utilitaire `parseVideoUrl`

**Files :**

- Créer : `frontend/src/app/utils/video-url.ts`
- Créer : `frontend/src/app/utils/video-url.spec.ts`

- [ ] **Step 1 : Écrire les tests (failing)**

```typescript
// frontend/src/app/utils/video-url.spec.ts
import { parseVideoUrl } from './video-url';

describe('parseVideoUrl', () => {
  it('reconnaît https://www.youtube.com/watch?v=ID', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toEqual({ platform: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('reconnaît https://youtu.be/ID', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ'))
      .toEqual({ platform: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('reconnaît https://www.youtube.com/embed/ID', () => {
    expect(parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'))
      .toEqual({ platform: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('reconnaît https://vimeo.com/ID', () => {
    expect(parseVideoUrl('https://vimeo.com/123456789'))
      .toEqual({ platform: 'vimeo', id: '123456789' });
  });

  it('reconnaît https://player.vimeo.com/video/ID', () => {
    expect(parseVideoUrl('https://player.vimeo.com/video/123456789'))
      .toEqual({ platform: 'vimeo', id: '123456789' });
  });

  it('ignore les paramètres additionnels YouTube', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share'))
      .toEqual({ platform: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('retourne null pour URL vide', () => {
    expect(parseVideoUrl('')).toBeNull();
  });

  it('retourne null pour URL non vidéo', () => {
    expect(parseVideoUrl('https://example.com/foo')).toBeNull();
  });

  it('retourne null pour URL malformée', () => {
    expect(parseVideoUrl('not a url')).toBeNull();
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Commande : `cd frontend && docker compose -f ../docker-compose.test.yml run --rm frontend-test --include='**/video-url.spec.ts'`
Attendu : ÉCHEC (`Cannot find module './video-url'`).

- [ ] **Step 3 : Implémenter `video-url.ts`**

```typescript
// frontend/src/app/utils/video-url.ts
export type VideoPlatform = 'youtube' | 'vimeo';

export interface ParsedVideo {
  platform: VideoPlatform;
  id: string;
}

const YOUTUBE_PATTERNS: RegExp[] = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/i,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{6,})/i,
  /^https?:\/\/youtu\.be\/([\w-]{6,})/i,
];

const VIMEO_PATTERNS: RegExp[] = [
  /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i,
  /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i,
];

export function parseVideoUrl(url: string): ParsedVideo | null {
  if (!url) return null;
  for (const pattern of YOUTUBE_PATTERNS) {
    const m = url.match(pattern);
    if (m) return { platform: 'youtube', id: m[1] };
  }
  for (const pattern of VIMEO_PATTERNS) {
    const m = url.match(pattern);
    if (m) return { platform: 'vimeo', id: m[1] };
  }
  return null;
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

Commande : `docker compose -f docker-compose.test.yml run --rm frontend-test`
Attendu : 9 tests `parseVideoUrl` OK, suite totale verte.

- [ ] **Step 5 : Commit**

```bash
git add frontend/src/app/utils/video-url.ts frontend/src/app/utils/video-url.spec.ts
git commit -m "feat(slides): utilitaire parseVideoUrl pour reconnaitre YouTube/Vimeo

Pure function reconnaissant 5 patterns (watch?v=, youtu.be, embed,
vimeo.com, player.vimeo.com). Base pour le slide vide v2."
```

---

## Task 2 — Type `DisplaySlide` (rendu public)

**Files :**

- Créer : `frontend/src/app/models/display-slide.model.ts`

Note : à ce stade, le `Slide` actuel (frontend) contient encore `CoverSlide` et `LinkSlide`. On crée un type plus large `DisplaySlide` qui sera utilisé par les composants de rendu public. Aucun fichier existant n'est cassé.

- [ ] **Step 1 : Créer `display-slide.model.ts`**

```typescript
// frontend/src/app/models/display-slide.model.ts
import { ImageSlide, SpecSlide, QuoteSlide } from './slide.model';

/**
 * Slide affichée côté public. Inclut des types synthétiques (`cover`, `link`)
 * générés par le composant parent (furniture-detail, exhibition-detail) à
 * partir de la coverImage et du slug. Inclut aussi `video` (du modèle API).
 *
 * Le modèle API `Slide` (slide.model.ts) ne contient que les 4 types
 * narratifs (image/video/spec/quote). Les types cover/link ne vivent que
 * dans ce DisplaySlide.
 */
export type DisplaySlide =
  | CoverDisplaySlide
  | ImageSlide
  | VideoDisplaySlide
  | SpecSlide
  | QuoteSlide
  | LinkDisplaySlide;

export interface CoverDisplaySlide {
  type: 'cover';
  id: string;
  position: number;
  src: string;
}

export interface VideoDisplaySlide {
  type: 'video';
  id: string;
  position: number;
  src: string;
  caption: string | null;
}

export interface LinkDisplaySlide {
  type: 'link';
  id: string;
  position: number;
  label: string | null;
  description: string | null;
  href: string | null;
}
```

> NOTE : `VideoDisplaySlide` est défini ici pour le rendu public. Le `VideoSlide` du modèle API sera ajouté en Task 6 dans `slide.model.ts` avec la même structure ; ils seront alignés.

- [ ] **Step 2 : Vérifier que la suite de tests passe inchangée**

Commande : `docker compose -f docker-compose.test.yml run --rm frontend-test`
Attendu : tous les tests passent (aucun ne consomme encore `DisplaySlide`).

- [ ] **Step 3 : Commit**

```bash
git add frontend/src/app/models/display-slide.model.ts
git commit -m "feat(slides): introduire DisplaySlide pour le rendu public

Type union plus large que le Slide API : ajoute des types synthetiques
cover et link (generes par les composants parents) ainsi que video.
Sera consomme par story-viewer et story-inline a la place de Slide."
```

---

## Task 3 — Viewers consomment `DisplaySlide` + branche `video`

**Files :**

- Modifier : `frontend/src/app/components/story-viewer/story-viewer.component.ts` (+ spec)
- Modifier : `frontend/src/app/components/story-inline/story-inline.component.ts` (+ spec)

L'idée : changer le type de l'`@Input() slides` de `Slide[]` à `DisplaySlide[]`. À ce stade, les parents passent toujours `Slide[]` (qui est un sous-ensemble de `DisplaySlide[]` après Task 6), c'est compatible. On ajoute aussi la branche `video` dans les `@switch` (DomSanitizer + parseVideoUrl + iframe).

- [ ] **Step 1 : Écrire le test du rendu vidéo dans story-viewer (failing)**

Ouvrir `frontend/src/app/components/story-viewer/story-viewer.component.spec.ts` et ajouter :

```typescript
import { DisplaySlide } from '../../models/display-slide.model';

it('rend un iframe YouTube pour un slide video YouTube', () => {
  const slides: DisplaySlide[] = [
    { type: 'video', id: 'v1', position: 0, src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: null },
  ];
  const fixture = TestBed.createComponent(StoryViewerComponent);
  fixture.componentRef.setInput('slides', slides);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  const iframe = fixture.debugElement.query(By.css('iframe'));
  expect(iframe).toBeTruthy();
  expect(iframe.nativeElement.src).toContain('youtube.com/embed/dQw4w9WgXcQ');
});

it('rend un iframe Vimeo pour un slide video Vimeo', () => {
  const slides: DisplaySlide[] = [
    { type: 'video', id: 'v1', position: 0, src: 'https://vimeo.com/123456789', caption: null },
  ];
  const fixture = TestBed.createComponent(StoryViewerComponent);
  fixture.componentRef.setInput('slides', slides);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  const iframe = fixture.debugElement.query(By.css('iframe'));
  expect(iframe).toBeTruthy();
  expect(iframe.nativeElement.src).toContain('player.vimeo.com/video/123456789');
});
```

> NOTE : adapter `setInput('open', true)` selon le contrôle réel d'ouverture du viewer (lire la signature actuelle des `@Input()`). Si pas pertinent, retirer ces deux lignes.

- [ ] **Step 2 : Vérifier l'échec**

Commande : `docker compose -f docker-compose.test.yml run --rm frontend-test --include='**/story-viewer.component.spec.ts'`
Attendu : ÉCHEC (pas d'iframe rendu pour les vidéos).

- [ ] **Step 3 : Modifier `story-viewer.component.ts`**

Trois changements :

1. Changer l'import `Slide` → `DisplaySlide` et l'`@Input()` :

```typescript
// avant
import { Slide } from '../../models/slide.model';
@Input({ required: true }) slides: Slide[] = [];

// après
import { DisplaySlide } from '../../models/display-slide.model';
import { parseVideoUrl } from '../../utils/video-url';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
@Input({ required: true }) slides: DisplaySlide[] = [];
```

2. Injecter `DomSanitizer` dans la classe :

```typescript
private readonly sanitizer = inject(DomSanitizer);
```

3. Ajouter une méthode `videoEmbedUrl(src: string): SafeResourceUrl | null` et la branche `video` dans le `@switch` du template (juste après `@case ('image')`) :

```typescript
protected videoEmbedUrl(src: string): SafeResourceUrl | null {
  const parsed = parseVideoUrl(src);
  if (!parsed) return null;
  const url = parsed.platform === 'youtube'
    ? `https://www.youtube.com/embed/${parsed.id}`
    : `https://player.vimeo.com/video/${parsed.id}`;
  return this.sanitizer.bypassSecurityTrustResourceUrl(url);
}
```

Template (à insérer dans `@switch (currentSlide().type)`, après le `@case ('image')`) :

```html
@case ('video') {
  @if (videoEmbedUrl($any(currentSlide()).src); as url) {
    <iframe
      [src]="url"
      title="Vidéo"
      allow="autoplay; fullscreen; encrypted-media"
      allowfullscreen
      style="width:100%;height:100%;border:0;display:block"></iframe>
  }
  @if ($any(currentSlide()).caption) {
    <figcaption class="caption">{{ $any(currentSlide()).caption }}</figcaption>
  }
}
```

> NOTE : le placement exact de la branche dépend de la structure réelle du template (un seul switch ou plusieurs imbriqués selon le mode "fullscreen body"). Ouvrir le fichier et placer la branche au bon endroit (probablement à côté de `@case ('image')` ligne ~46).

4. Mettre à jour la méthode `isMediaSlide()` (ligne ~150 actuellement) pour inclure `'video'` :

```typescript
private isMediaSlide(t: string): boolean {
  return t === 'cover' || t === 'image' || t === 'video';
}
```

- [ ] **Step 4 : Vérifier que les nouveaux tests passent**

Commande : `docker compose -f docker-compose.test.yml run --rm frontend-test --include='**/story-viewer.component.spec.ts'`
Attendu : les deux tests vidéo OK, anciens tests OK.

- [ ] **Step 5 : Répéter les mêmes modifications sur `story-inline.component.ts`**

`story-inline.component.ts` rend les slides « inline » (intégrées au flux de la page, pas en fullscreen). Le pattern est identique : changer `Slide[]` → `DisplaySlide[]`, ajouter `parseVideoUrl` + `DomSanitizer`, ajouter la branche `video` dans le `@switch`, méthode `videoEmbedUrl`.

Ajouter aussi les deux tests vidéo équivalents dans `story-inline.component.spec.ts`.

- [ ] **Step 6 : Lancer la suite complète**

Commande : `docker compose -f docker-compose.test.yml run --rm frontend-test`
Attendu : tous les tests OK.

- [ ] **Step 7 : Commit**

```bash
git add frontend/src/app/components/story-viewer/ frontend/src/app/components/story-inline/
git commit -m "feat(slides): viewers consomment DisplaySlide + rendent les iframes video

Les composants story-viewer et story-inline acceptent maintenant le type
DisplaySlide (superset de Slide). Ajout de la branche 'video' qui construit
un iframe YouTube/Vimeo via parseVideoUrl + DomSanitizer."
```

---

## Task 4 — Parents enrichissent la liste `DisplaySlide[]`

**Files :**

- Modifier : `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts` (+ spec)
- Modifier : `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts` (+ spec)

Le parent reçoit `furniture.slides` (ou `exhibition.slides`) de l'API et construit la liste `DisplaySlide[]` enrichie : préfixe une `cover` synthétique (à partir de `coverImage`), suffixe un `link` synthétique (à partir du slug), filtre défensivement les éventuels rows `cover`/`link` legacy renvoyés par l'API avant migration.

- [ ] **Step 1 : Écrire le test (failing)**

Ajouter à `furniture-detail.component.spec.ts` :

```typescript
import { DisplaySlide } from '../../models/display-slide.model';

it('enrichit la liste de slides avec cover prefix + link suffix', () => {
  const furniture = {
    id: 'f1', slug: 'chaise-bois', title: 'Chaise bois',
    coverImage: '/uploads/cover.jpg',
    slides: [
      { id: 's1', type: 'image', position: 0, src: '/uploads/photo.jpg', caption: 'détail' },
    ],
    // ... autres champs minimaux
  };
  portfolioServiceSpy.getFurnitureBySlug.and.returnValue(of(furniture));
  const fixture = TestBed.createComponent(FurnitureDetailComponent);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  const display: DisplaySlide[] = cmp.displaySlides();
  expect(display.length).toBe(3);
  expect(display[0].type).toBe('cover');
  expect((display[0] as any).src).toBe('/uploads/cover.jpg');
  expect(display[1].type).toBe('image');
  expect(display[display.length - 1].type).toBe('link');
  expect((display[display.length - 1] as any).href).toBe('/mobilier/chaise-bois');
});

it('filtre les slides legacy de type cover/link recues de l\'API', () => {
  const furniture = {
    id: 'f1', slug: 'x', title: 'X', coverImage: '/c.jpg',
    slides: [
      { id: 'legacy-c', type: 'cover', position: 0, src: '/legacy.jpg' },
      { id: 's1', type: 'image', position: 1, src: '/photo.jpg', caption: null },
      { id: 'legacy-l', type: 'link', position: 2, label: 'old', description: null, href: '/old' },
    ],
  };
  portfolioServiceSpy.getFurnitureBySlug.and.returnValue(of(furniture));
  const fixture = TestBed.createComponent(FurnitureDetailComponent);
  fixture.detectChanges();
  const display = (fixture.componentInstance as any).displaySlides();
  // Cover/link legacy filtres, cover/link synthetiques generes : total 3 (cover synth + image + link synth)
  expect(display.length).toBe(3);
  expect(display.filter((s: DisplaySlide) => s.type === 'cover').length).toBe(1);
  expect((display[0] as any).src).toBe('/c.jpg'); // pas /legacy.jpg
});
```

> NOTE : adapter les imports et la signature de `portfolioServiceSpy.getFurnitureBySlug` selon ce qui existe réellement dans `furniture-detail.component.spec.ts` actuel.

- [ ] **Step 2 : Vérifier l'échec**

Commande : `docker compose -f docker-compose.test.yml run --rm frontend-test --include='**/furniture-detail.component.spec.ts'`
Attendu : ÉCHEC (`displaySlides` n'existe pas).

- [ ] **Step 3 : Modifier `furniture-detail.component.ts`**

Ajouter une `computed` `displaySlides`, l'utiliser dans le template, retirer `f.slides` au profit de `displaySlides()`.

```typescript
// Imports
import { DisplaySlide } from '../../models/display-slide.model';

// Dans la classe, après les autres signals/computed :
protected readonly displaySlides = computed<DisplaySlide[]>(() => {
  const f = this.item();
  if (!f) return [];
  const apiSlides = (f.slides ?? [])
    // filtre défensif : si l'API renvoie encore des cover/link legacy, on les ignore
    .filter(s => s.type !== 'cover' && s.type !== 'link');
  const cover: DisplaySlide = {
    type: 'cover', id: '_cover', position: 0, src: f.coverImage ?? '',
  };
  const link: DisplaySlide = {
    type: 'link', id: '_link', position: apiSlides.length + 1,
    label: 'Découvrir la pièce', description: null,
    href: `/mobilier/${f.slug}`,
  };
  return [cover, ...apiSlides as DisplaySlide[], link];
});
```

Adapter le template pour que `<app-story-inline>` reçoive `displaySlides()` au lieu de `f.slides` :

```html
@if (hasSlides()) {
  <app-story-inline [slides]="displaySlides()"></app-story-inline>
}
```

Adapter aussi `hasSlides()` pour vérifier qu'il y a au moins 1 slide narrative ou que `coverImage` est non vide (la story sera toujours non vide grâce au cover/link synthétiques). Cf. décision spec : « Toujours prefix + suffix ». Donc afficher la story dès qu'il y a une coverImage OU des slides narratives :

```typescript
protected readonly hasSlides = computed(() => {
  const f = this.item();
  if (!f) return false;
  return !!f.coverImage || (f.slides?.length ?? 0) > 0;
});
```

Adapter aussi `openViewer()` pour passer `displaySlides()` au lieu de `f.slides`.

- [ ] **Step 4 : Vérifier le passage des tests**

Commande : `docker compose -f docker-compose.test.yml run --rm frontend-test --include='**/furniture-detail.component.spec.ts'`
Attendu : nouveaux tests OK + anciens OK.

- [ ] **Step 5 : Faire la même chose dans `exhibition-detail.component.ts`**

Mêmes modifications. Variation :

- `label: 'Voir l\'exposition'`
- `href: \`/expositions/${e.slug}\``

Ajouter aussi les tests équivalents dans `exhibition-detail.component.spec.ts`.

- [ ] **Step 6 : Lancer la suite complète**

```bash
docker compose -f docker-compose.test.yml run --rm frontend-test
```

Attendu : tous tests OK.

- [ ] **Step 7 : Commit**

```bash
git add frontend/src/app/pages/furniture-detail/ frontend/src/app/pages/exhibition-detail/
git commit -m "feat(slides): cover et lien implicites cotes furniture/exhibition detail

Les composants parents construisent eux-memes la liste DisplaySlide en
prefixant une cover (depuis coverImage) et suffixant un lien (depuis le
slug). Filtre defensif des rows legacy cover/link (transition pre/post
migration 008)."
```

---

## Task 5 — `SlidesEditorComponent` v2 (admin)

**Files :**

- Modifier : `frontend/src/app/pages/admin/shared/slides-editor.component.ts` (+ spec)

Refonte UX :

1. Retirer les types `cover` et `link` des actions / template / `add()` / `canSave()` / méthodes diverses.
2. Ajouter type `video` : bouton « + Vidéo », champ URL avec indicateur de plateforme détectée.
3. Remplacer le champ texte URL de `image` par `<app-image-field>`.
4. Ajouter une mini-vignette à gauche de chaque carte (grille 2 colonnes).
5. Retirer le bloc warnings et toute logique `defaultHref` / `recomputeWarnings`.

- [ ] **Step 1 : Écrire les tests (failing)**

Adapter `slides-editor.component.spec.ts`. Tests à ajouter :

```typescript
it('expose 4 boutons d\'ajout (image/video/spec/quote), plus de cover/link', () => {
  // setup minimal du composant
  const buttons = fixture.debugElement.queryAll(By.css('.actions button'));
  const labels = buttons.map(b => b.nativeElement.textContent.trim());
  expect(labels).toContain('+ Image');
  expect(labels).toContain('+ Vidéo');
  expect(labels).toContain('+ Caractéristiques');
  expect(labels).toContain('+ Citation');
  expect(labels).not.toContain('+ Cover');
  expect(labels).not.toContain('+ Lien');
});

it('add(\'video\') ajoute un slide video avec src vide et caption null', () => {
  const cmp = fixture.componentInstance as any;
  cmp.add('video');
  expect(cmp.slides().length).toBe(1);
  expect(cmp.slides()[0]).toEqual(jasmine.objectContaining({ type: 'video', src: '', caption: null }));
});

it('indique la plateforme detectee pour un slide video', () => {
  const cmp = fixture.componentInstance as any;
  cmp.add('video');
  cmp.patch(0, { src: 'https://www.youtube.com/watch?v=abc12345' });
  fixture.detectChanges();
  const hint = fixture.debugElement.query(By.css('.video-detect'));
  expect(hint.nativeElement.textContent).toContain('YouTube');
  expect(hint.nativeElement.textContent).toContain('abc12345');
});

it('canSave est faux quand un slide video a src vide', () => {
  const cmp = fixture.componentInstance as any;
  cmp.add('video');
  expect(cmp.canSave()).toBeFalse();
  cmp.patch(0, { src: 'https://www.youtube.com/watch?v=abc12345' });
  expect(cmp.canSave()).toBeTrue();
});
```

Retirer (ou adapter) les tests qui référencent encore `cover` ou `link` (s'il y en a).

- [ ] **Step 2 : Vérifier l'échec**

Commande : `docker compose -f docker-compose.test.yml run --rm frontend-test --include='**/slides-editor.component.spec.ts'`
Attendu : ÉCHEC.

- [ ] **Step 3 : Implémenter `slides-editor.component.ts` v2**

Réécrire complètement le fichier (la refonte touche template + classe). La nouvelle version :

```typescript
import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { Slide, ImageSlide, VideoSlide, SpecSlide, QuoteSlide } from '../../../models/slide.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { ImageFieldComponent } from './image-field.component';
import { parseVideoUrl } from '../../../utils/video-url';

@Component({
  selector: 'app-slides-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReorderableDirective, ImageFieldComponent],
  template: `
    <section class="slides-editor">
      <header class="head">
        <h3>Slides ({{ slides().length }})</h3>
        <button type="button" (click)="open.set(!open())">{{ open() ? 'Replier' : 'Déplier' }}</button>
      </header>

      @if (open()) {
        <div class="actions">
          <button type="button" (click)="add('image')">+ Image</button>
          <button type="button" (click)="add('video')">+ Vidéo</button>
          <button type="button" (click)="add('spec')">+ Caractéristiques</button>
          <button type="button" (click)="add('quote')">+ Citation</button>
        </div>

        <ul class="list" appReorderable (reordered)="onReorder($event)">
          @for (s of slides(); track s.id || $index; let i = $index) {
            <li class="slide-card">
              <div class="preview">
                @switch (s.type) {
                  @case ('image') {
                    @if ($any(s).src) {
                      <img [src]="$any(s).src" alt="" />
                    } @else {
                      <div class="preview-empty">image</div>
                    }
                  }
                  @case ('video') {
                    <div class="preview-video">
                      <span class="play">▶</span>
                      @if (detectedPlatform(i); as p) {
                        <span class="badge" [class.yt]="p === 'youtube'" [class.vimeo]="p === 'vimeo'">
                          {{ p === 'youtube' ? 'YT' : 'V' }}
                        </span>
                      }
                    </div>
                  }
                  @case ('spec') {
                    <div class="preview-spec">
                      @for (e of $any(s).specs.slice(0, 2); track $index) {
                        <div><span class="lbl">{{ e.label }}</span><span class="val">{{ e.value }}</span></div>
                      }
                    </div>
                  }
                  @case ('quote') {
                    <div class="preview-quote">« {{ ($any(s).body || '').slice(0, 80) }}{{ ($any(s).body?.length ?? 0) > 80 ? '…' : '' }} »</div>
                  }
                }
              </div>

              <div class="form">
                <div class="row">
                  <span class="handle">⠿</span>
                  <span class="type-badge">{{ s.type.toUpperCase() }}</span>
                  <button type="button" class="del" (click)="remove(i)">✕</button>
                </div>

                @switch (s.type) {
                  @case ('image') {
                    <label>
                      <span>Image principale</span>
                      <app-image-field
                        [value]="$any(s).src"
                        label=""
                        (valueChange)="patch(i, { src: $event })" />
                    </label>
                    <label>
                      <span>Légende</span>
                      <input type="text" [ngModel]="$any(s).caption" (ngModelChange)="patch(i, { caption: $event })" />
                    </label>
                  }
                  @case ('video') {
                    <label>
                      <span>URL YouTube ou Vimeo</span>
                      <input type="url" [ngModel]="$any(s).src" (ngModelChange)="patch(i, { src: $event })" placeholder="https://www.youtube.com/watch?v=..." />
                    </label>
                    <p class="video-detect">
                      @if (detectedPlatform(i); as p) {
                        ✓ {{ p === 'youtube' ? 'YouTube' : 'Vimeo' }} détecté · ID {{ detectedId(i) }}
                      } @else if ($any(s).src) {
                        ⚠ URL non reconnue (YouTube ou Vimeo attendue)
                      }
                    </p>
                    <label>
                      <span>Légende (optionnel)</span>
                      <input type="text" [ngModel]="$any(s).caption" (ngModelChange)="patch(i, { caption: $event })" />
                    </label>
                  }
                  @case ('spec') {
                    <div class="specs">
                      @for (entry of $any(s).specs; track $index; let j = $index) {
                        <div class="spec-row">
                          <input type="text" placeholder="Label" [ngModel]="entry.label" (ngModelChange)="patchSpec(i, j, 'label', $event)" />
                          <input type="text" placeholder="Valeur" [ngModel]="entry.value" (ngModelChange)="patchSpec(i, j, 'value', $event)" />
                          <button type="button" (click)="removeSpec(i, j)">✕</button>
                        </div>
                      }
                      <button type="button" (click)="addSpec(i)">+ Entrée</button>
                    </div>
                  }
                  @case ('quote') {
                    <label>
                      <span>Citation</span>
                      <textarea [ngModel]="$any(s).body" (ngModelChange)="patch(i, { body: $event })"></textarea>
                    </label>
                    <label>
                      <span>Source</span>
                      <input type="text" [ngModel]="$any(s).cite" (ngModelChange)="patch(i, { cite: $event })" />
                    </label>
                  }
                }
              </div>
            </li>
          }
        </ul>

        <footer class="foot">
          <button type="button" (click)="reload()">Annuler</button>
          <button type="button" class="primary" (click)="save()" [disabled]="!canSave()">Enregistrer les slides</button>
        </footer>
      }
    </section>
  `,
  styles: [`
    .slides-editor { border: 1px solid var(--color-line); padding: 16px; margin-top: 24px; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
    .list { list-style: none; padding: 0; }
    .slide-card {
      display: grid; grid-template-columns: 140px 1fr; gap: 12px;
      border: 1px solid var(--color-line); padding: 10px; margin-bottom: 8px; background: var(--color-bg);
    }
    .preview {
      width: 140px; height: 84px; background: #f0ece4; border: 1px solid var(--color-line);
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .preview img { width: 100%; height: 100%; object-fit: cover; }
    .preview-empty { color: var(--color-mute); font-size: 0.78rem; }
    .preview-video { background: #111; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
    .preview-video .play { font-size: 1.6rem; }
    .preview-video .badge { position: absolute; top: 4px; right: 4px; font-size: 0.6rem; padding: 1px 4px; }
    .preview-video .badge.yt { background: #FF0000; }
    .preview-video .badge.vimeo { background: #1ab7ea; }
    .preview-spec { padding: 6px; font-size: 0.65rem; line-height: 1.3; }
    .preview-spec .lbl { color: var(--color-mute); margin-right: 6px; }
    .preview-spec .val { font-family: var(--serif); }
    .preview-quote { padding: 6px; font-style: italic; font-size: 0.7rem; color: var(--color-ink-soft); }
    .row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .handle { cursor: grab; color: var(--color-mute); }
    .type-badge { font-size: 0.65rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .del { margin-left: auto; background: none; border: none; cursor: pointer; }
    label { display: block; font-size: 0.78rem; color: var(--color-ink-soft); margin: 6px 0; }
    label > span { display: block; margin-bottom: 4px; }
    input, textarea { width: 100%; padding: 6px 8px; border: 1px solid var(--color-line); background: #fff; font: inherit; }
    .video-detect { font-size: 0.78rem; color: var(--color-mute); margin: 4px 0; }
    .specs .spec-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; margin-bottom: 6px; }
    .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-line); }
    .primary { background: var(--color-ink); color: var(--color-bg); border: none; padding: 8px 16px; cursor: pointer; }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class SlidesEditorComponent implements OnChanges {
  @Input({ required: true }) kind!: 'furniture' | 'exhibition';
  @Input({ required: true }) ownerId!: string;
  @Input() ownerSlug: string | null = null;

  private portfolio = inject(PortfolioService);

  protected open = signal(false);
  protected slides = signal<Slide[]>([]);

  ngOnChanges(c: SimpleChanges) {
    if (c['ownerId'] || c['kind']) this.reload();
  }

  reload() {
    if (!this.ownerId) return;
    this.portfolio.getSlides(this.kind, this.ownerId).subscribe(slides => {
      // Filtre défensif : ne pas afficher les rows legacy cover/link
      const filtered = slides.filter(s => s.type !== ('cover' as any) && s.type !== ('link' as any));
      this.slides.set(filtered as Slide[]);
    });
  }

  add(type: Slide['type']) {
    const id = 'tmp-' + Math.random().toString(36).slice(2, 8);
    const newSlide: Slide = (() => {
      switch (type) {
        case 'image': return { type, id, position: 0, src: '', caption: null } as ImageSlide;
        case 'video': return { type, id, position: 0, src: '', caption: null } as VideoSlide;
        case 'spec':  return { type, id, position: 0, specs: [{ label: '', value: '' }] } as SpecSlide;
        case 'quote': return { type, id, position: 0, body: '', cite: null } as QuoteSlide;
      }
    })();
    this.slides.update(s => [...s, newSlide]);
  }

  remove(index: number) {
    this.slides.update(s => s.filter((_, i) => i !== index));
  }

  patch(index: number, partial: Partial<Slide>) {
    this.slides.update(s => s.map((slide, i) => i === index ? { ...slide, ...partial } as Slide : slide));
  }

  patchSpec(slideIdx: number, entryIdx: number, field: 'label' | 'value', value: string) {
    this.slides.update(s => s.map((slide, i) => {
      if (i !== slideIdx || slide.type !== 'spec') return slide;
      const specs = slide.specs.map((e, j) => j === entryIdx ? { ...e, [field]: value } : e);
      return { ...slide, specs };
    }));
  }

  addSpec(slideIdx: number) {
    this.slides.update(s => s.map((slide, i) => {
      if (i !== slideIdx || slide.type !== 'spec') return slide;
      return { ...slide, specs: [...slide.specs, { label: '', value: '' }] };
    }));
  }

  removeSpec(slideIdx: number, entryIdx: number) {
    this.slides.update(s => s.map((slide, i) => {
      if (i !== slideIdx || slide.type !== 'spec') return slide;
      return { ...slide, specs: slide.specs.filter((_, j) => j !== entryIdx) };
    }));
  }

  onReorder(order: number[]) {
    const current = this.slides();
    this.slides.set(order.map(i => current[i]));
  }

  detectedPlatform(index: number): 'youtube' | 'vimeo' | null {
    const s = this.slides()[index];
    if (s?.type !== 'video') return null;
    return parseVideoUrl(s.src)?.platform ?? null;
  }

  detectedId(index: number): string | null {
    const s = this.slides()[index];
    if (s?.type !== 'video') return null;
    return parseVideoUrl(s.src)?.id ?? null;
  }

  canSave(): boolean {
    return this.slides().every(s => {
      if (s.type === 'image' && !s.src) return false;
      if (s.type === 'video' && !s.src) return false;
      if (s.type === 'quote' && !s.body) return false;
      if (s.type === 'spec' && s.specs.length === 0) return false;
      return true;
    });
  }

  save() {
    this.portfolio.replaceSlides(this.kind, this.ownerId, this.slides()).subscribe(updated => {
      // Même filtre défensif au retour (au cas où le backend renvoie quelque chose d'inattendu)
      const filtered = updated.filter(s => s.type !== ('cover' as any) && s.type !== ('link' as any));
      this.slides.set(filtered as Slide[]);
    });
  }
}
```

> NOTE : à ce stade, `slide.model.ts` ne contient pas encore `VideoSlide`. Le fichier ne compile donc pas. C'est intentionnel — Task 6 corrige cela. Pour permettre cette task d'être committée verte, exceptionnellement on attend Task 6 avant de commit. Voir Step 5.

- [ ] **Step 4 : Faire Task 6 avant de tenter le build (voir ci-dessous)**

Skip ce step jusqu'à ce que Task 6 soit faite ; reprendre Step 5 ensuite. (Alternative : merger Tasks 5 + 6 en un seul commit ; voir « Note d'ordre » plus bas.)

- [ ] **Step 5 : Une fois Task 6 faite, lancer la suite de tests**

Commande : `docker compose -f docker-compose.test.yml run --rm frontend-test`
Attendu : tous OK (incluant les nouveaux tests admin).

- [ ] **Step 6 : Commit (combiné avec Task 6)**

Voir Task 6 Step 4.

> **Note d'ordre :** Tasks 5 et 6 doivent être committées ensemble (le code de l'admin v2 référence `VideoSlide` qui n'existe qu'après Task 6). Implémenter Task 6 immédiatement après le code Task 5, lancer la suite de tests, puis un seul commit qui couvre les deux.

---

## Task 6 — Frontend `slide.model.ts` mis à jour

**Files :**

- Modifier : `frontend/src/app/models/slide.model.ts`

- [ ] **Step 1 : Réécrire `slide.model.ts`**

```typescript
export type Slide = ImageSlide | VideoSlide | SpecSlide | QuoteSlide;

export interface BaseSlide {
  id: string;
  position: number;
}

export interface ImageSlide extends BaseSlide { type: 'image'; src: string; caption: string | null; }
export interface VideoSlide extends BaseSlide { type: 'video'; src: string; caption: string | null; }
export interface SpecSlide  extends BaseSlide { type: 'spec';  specs: SpecEntry[]; }
export interface QuoteSlide extends BaseSlide { type: 'quote'; body: string; cite: string | null; }

export interface SpecEntry { label: string; value: string; }
```

`CoverSlide` et `LinkSlide` sont supprimés.

- [ ] **Step 2 : Mettre à jour `display-slide.model.ts`**

L'import de `VideoSlide` n'est plus nécessaire dans `display-slide.model.ts` puisque `Slide` en contient maintenant un. Réécrire :

```typescript
// frontend/src/app/models/display-slide.model.ts
import { ImageSlide, VideoSlide, SpecSlide, QuoteSlide } from './slide.model';

export type DisplaySlide =
  | CoverDisplaySlide
  | ImageSlide
  | VideoSlide
  | SpecSlide
  | QuoteSlide
  | LinkDisplaySlide;

export interface CoverDisplaySlide {
  type: 'cover';
  id: string;
  position: number;
  src: string;
}

export interface LinkDisplaySlide {
  type: 'link';
  id: string;
  position: number;
  label: string | null;
  description: string | null;
  href: string | null;
}
```

Le type interne `VideoDisplaySlide` (créé à Task 2) disparaît : `VideoSlide` du modèle API joue le même rôle.

- [ ] **Step 3 : Lancer toute la suite de tests**

```bash
docker compose -f docker-compose.test.yml run --rm frontend-test
```

Attendu : toute la suite verte. Si un spec référence encore `CoverSlide`/`LinkSlide` (par exemple un import inutilisé après Task 3-5), corriger en retirant la ligne d'import.

- [ ] **Step 4 : Commit (combiné Tasks 5 + 6)**

```bash
git add frontend/src/app/models/slide.model.ts frontend/src/app/models/display-slide.model.ts frontend/src/app/pages/admin/shared/slides-editor.component.ts frontend/src/app/pages/admin/shared/slides-editor.component.spec.ts
git commit -m "feat(slides): editeur v2 (picker mediatheque + video + mini-apercu + cover/lien implicites)

- Modele Slide API : drop CoverSlide/LinkSlide, ajout VideoSlide (meme
  structure qu'ImageSlide).
- DisplaySlide nettoye (VideoSlide centralise dans slide.model).
- SlidesEditorComponent refondu : boutons +Image/+Video/+Caracteristiques/
  +Citation (cover et lien geres implicitement cote rendu public).
- Picker mediatheque via ImageFieldComponent pour la source d'image.
- Slide video : un seul champ URL avec detection YouTube/Vimeo en direct.
- Mini-vignette 140x84 a gauche de chaque carte (image rendue, badge plateforme
  video, mini-table specs, citation tronquee).
- Filtre defensif pour ignorer les rows legacy cover/link a la lecture."
```

---

## Task 7 — Backend : `Slide.java` + `StoryService.java`

**Files :**

- Modifier : `backend/src/main/java/com/atelier/portfolio/model/Slide.java`
- Modifier : `backend/src/main/java/com/atelier/portfolio/service/StoryService.java`
- Modifier ou créer : `backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java`

- [ ] **Step 1 : Écrire / adapter les tests backend (failing)**

Tester deux comportements :

1. Le mapping entité→DTO produit un `Slide.VideoSlide` pour `entity.type == "video"`.
2. Le mapping DTO→entité écrit `entity.setType("video")` + `setSrc(...)` + `setCaption(...)` pour un `Slide.VideoSlide`.
3. (Optionnel mais utile) Le `default ->` du switch entité→DTO jette `IllegalStateException` si on lui donne `type="cover"` (donnée legacy oubliée).

```java
// backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StorySlideEntity;
import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class StoryServiceTest {

    @Autowired StoryService service;
    @Autowired StorySlideRepository repository;

    @Test
    void mapsVideoEntityToDto() {
        StorySlideEntity e = new StorySlideEntity();
        e.setId("v-001");
        e.setOwnerKind("furniture");
        e.setOwnerId("f-001");
        e.setPosition(0);
        e.setType("video");
        e.setSrc("https://www.youtube.com/watch?v=abc12345");
        e.setCaption("démo");
        repository.save(e);

        List<Slide> slides = service.list("furniture", "f-001");
        assertThat(slides).hasSize(1);
        assertThat(slides.get(0)).isInstanceOf(Slide.VideoSlide.class);
        Slide.VideoSlide v = (Slide.VideoSlide) slides.get(0);
        assertThat(v.src()).isEqualTo("https://www.youtube.com/watch?v=abc12345");
        assertThat(v.caption()).isEqualTo("démo");
    }

    @Test
    void persistsVideoDtoToEntity() {
        Slide.VideoSlide v = new Slide.VideoSlide("v-002", 0, "https://vimeo.com/123456", "demo");
        service.replace("furniture", "f-002", List.of(v));

        List<StorySlideEntity> stored = repository.findByOwnerKindAndOwnerIdOrderByPositionAsc("furniture", "f-002");
        assertThat(stored).hasSize(1);
        assertThat(stored.get(0).getType()).isEqualTo("video");
        assertThat(stored.get(0).getSrc()).isEqualTo("https://vimeo.com/123456");
        assertThat(stored.get(0).getCaption()).isEqualTo("demo");
    }

    @Test
    void rejectsLegacyCoverTypeAtReadTime() {
        StorySlideEntity legacy = new StorySlideEntity();
        legacy.setId("legacy-c");
        legacy.setOwnerKind("furniture");
        legacy.setOwnerId("f-003");
        legacy.setPosition(0);
        legacy.setType("cover");
        legacy.setSrc("/legacy.jpg");
        repository.save(legacy);

        assertThatThrownBy(() -> service.list("furniture", "f-003"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("cover");
    }
}
```

> NOTE : adapter les méthodes (`list`, `replace`) au nom réel des méthodes publiques de `StoryService` (lire le fichier). Adapter aussi le nom de `StorySlideRepository` et sa méthode de query. Si un test similaire existe déjà, n'ajouter que les 3 méthodes ci-dessus.

- [ ] **Step 2 : Vérifier l'échec**

Commande : `cd backend && mvn -Dtest=StoryServiceTest test`
Attendu : ÉCHEC (compilation : `Slide.VideoSlide` n'existe pas).

- [ ] **Step 3 : Modifier `Slide.java`**

Réécrire l'interface scellée :

```java
package com.atelier.portfolio.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = Slide.ImageSlide.class, name = "image"),
        @JsonSubTypes.Type(value = Slide.VideoSlide.class, name = "video"),
        @JsonSubTypes.Type(value = Slide.SpecSlide.class, name = "spec"),
        @JsonSubTypes.Type(value = Slide.QuoteSlide.class, name = "quote")
})
public sealed interface Slide
        permits Slide.ImageSlide, Slide.VideoSlide, Slide.SpecSlide, Slide.QuoteSlide {

    String id();
    int position();

    record ImageSlide(
            @Size(max = 50) String id,
            int position,
            @NotBlank @Size(max = 500) String src,
            @Size(max = 500) String caption
    ) implements Slide {}

    record VideoSlide(
            @Size(max = 50) String id,
            int position,
            @NotBlank @Size(max = 500) String src,
            @Size(max = 500) String caption
    ) implements Slide {}

    record SpecSlide(
            @Size(max = 50) String id,
            int position,
            List<SpecEntry> specs
    ) implements Slide {}

    record QuoteSlide(
            @Size(max = 50) String id,
            int position,
            @NotBlank @Size(max = 2000) String body,
            @Size(max = 500) String cite
    ) implements Slide {}

    record SpecEntry(
            @Size(max = 200) String label,
            @Size(max = 500) String value
    ) {}
}
```

> NOTE : lire le `Slide.java` actuel pour conserver la signature exacte de `SpecSlide` (notamment si `SpecEntry` est dans un fichier séparé). Adapter en fonction.

- [ ] **Step 4 : Modifier `StoryService.java` — switch entité→DTO**

Localiser le switch (ligne ~48). Remplacer :

```java
// AVANT
return switch (e.getType()) {
    case "cover" -> new Slide.CoverSlide(e.getId(), e.getPosition(), e.getSrc());
    case "image" -> new Slide.ImageSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption());
    case "spec"  -> ...;
    case "quote" -> new Slide.QuoteSlide(e.getId(), e.getPosition(), e.getQuoteBody(), e.getQuoteCite());
    case "link"  -> new Slide.LinkSlide(e.getId(), e.getPosition(), e.getLinkLabel(), e.getLinkDesc(), e.getLinkHref());
    default -> throw new IllegalStateException("Unknown slide type: " + e.getType());
};

// APRÈS
return switch (e.getType()) {
    case "image" -> new Slide.ImageSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption());
    case "video" -> new Slide.VideoSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption());
    case "spec"  -> ...; // inchangé
    case "quote" -> new Slide.QuoteSlide(e.getId(), e.getPosition(), e.getQuoteBody(), e.getQuoteCite());
    default -> throw new IllegalStateException("Unknown slide type: " + e.getType());
};
```

- [ ] **Step 5 : Modifier `StoryService.java` — switch DTO→entité**

Localiser le switch (ligne ~65). Remplacer :

```java
// AVANT
switch (slide) {
    case Slide.CoverSlide c -> { e.setType("cover"); e.setSrc(c.src()); }
    case Slide.ImageSlide i -> { e.setType("image"); e.setSrc(i.src()); e.setCaption(i.caption()); }
    case Slide.SpecSlide s  -> { e.setType("spec"); ... }
    case Slide.QuoteSlide q -> { e.setType("quote"); e.setQuoteBody(q.body()); e.setQuoteCite(q.cite()); }
    case Slide.LinkSlide l  -> { e.setType("link"); e.setLinkLabel(l.label()); e.setLinkDesc(l.description()); e.setLinkHref(l.href()); }
}

// APRÈS
switch (slide) {
    case Slide.ImageSlide i -> { e.setType("image"); e.setSrc(i.src()); e.setCaption(i.caption()); }
    case Slide.VideoSlide v -> { e.setType("video"); e.setSrc(v.src()); e.setCaption(v.caption()); }
    case Slide.SpecSlide s  -> { e.setType("spec"); ... } // inchangé
    case Slide.QuoteSlide q -> { e.setType("quote"); e.setQuoteBody(q.body()); e.setQuoteCite(q.cite()); }
}
```

Comme `Slide` est sealed et permet uniquement `ImageSlide`/`VideoSlide`/`SpecSlide`/`QuoteSlide`, le switch est exhaustif. Le compilateur Java 25 le vérifie.

- [ ] **Step 6 : Lancer les tests backend**

Commande : `cd backend && mvn test`
Attendu : tests `StoryServiceTest` OK + suite complète OK.

> NOTE : le `default -> throw IllegalStateException` du switch entité→DTO va déclencher si la DB contient encore des rows legacy `cover`/`link` au démarrage. C'est OK pour les tests (H2 fresh) mais en prod, la migration Liquibase 008 (Task 8) doit avoir tourné AVANT que la nouvelle image backend reçoive du trafic.

- [ ] **Step 7 : Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/model/Slide.java backend/src/main/java/com/atelier/portfolio/service/StoryService.java backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java
git commit -m "feat(slides): backend Slide v2 (drop cover/link, ajout video)

- model.Slide : sealed interface ne permet plus que ImageSlide, VideoSlide,
  SpecSlide, QuoteSlide. JsonSubTypes refuse automatiquement les types
  'cover' ou 'link' en entree.
- service.StoryService : deux switch (entite->DTO et DTO->entite) mis a jour ;
  type 'video' reutilise la colonne src.
- Tests StoryServiceTest : mappings video aller-retour + verification que
  le default du switch jette IllegalStateException sur les rows legacy."
```

---

## Task 8 — Migration Liquibase `008-drop-legacy-cover-link-slides.yaml`

**Files :**

- Créer : `backend/src/main/resources/db/changelog/changes/008-drop-legacy-cover-link-slides.yaml`
- Modifier : `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

- [ ] **Step 1 : Créer le changelog 008**

```yaml
# backend/src/main/resources/db/changelog/changes/008-drop-legacy-cover-link-slides.yaml
databaseChangeLog:
  - changeSet:
      id: 008-drop-legacy-cover-link-slides
      author: milo-guillaume
      comment: >
        Supprime les rows story_slide de type 'cover' et 'link' devenues obsoletes
        avec l'editeur de slides v2 (cover/lien generes implicitement par le
        rendu public). Idempotent : un second run ne trouvera plus rien a
        supprimer.
      changes:
        - sql:
            sql: DELETE FROM story_slide WHERE type IN ('cover', 'link');
```

- [ ] **Step 2 : Inclure dans le master**

Ajouter une ligne à `backend/src/main/resources/db/changelog/db.changelog-master.yaml` (à la suite des autres `<include>`) :

```yaml
  - include:
      file: db/changelog/changes/008-drop-legacy-cover-link-slides.yaml
```

> NOTE : vérifier la syntaxe et l'indentation du master existant (`<include>` ou autre structure).

- [ ] **Step 3 : Lancer toute la suite backend**

Commande : `cd backend && mvn test`
Attendu : tous tests OK (la migration tourne au démarrage H2 sans rien à faire si la DB de test est fraîche ; pas de rupture).

- [ ] **Step 4 : Vérifier l'effet localement avec quelques rows legacy**

Cette étape est une vérif manuelle optionnelle :

```bash
# Démarrer Postgres + backend en local, insérer une ligne cover legacy :
docker exec atelier-postgres psql -U portfolio -d portfolio -c "INSERT INTO story_slide (id, owner_kind, owner_id, position, type, src) VALUES ('test-cover', 'furniture', 'f1', 0, 'cover', '/x.jpg');"

# Rebuilder + relancer le backend (la migration 008 tourne au boot et supprime la ligne)
docker compose up -d --build backend

# Vérifier qu'elle est partie :
docker exec atelier-postgres psql -U portfolio -d portfolio -c "SELECT * FROM story_slide WHERE type = 'cover';"
# Attendu : 0 rows
```

- [ ] **Step 5 : Commit**

```bash
git add backend/src/main/resources/db/changelog/changes/008-drop-legacy-cover-link-slides.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml
git commit -m "chore(db): migration 008 supprime les story_slide legacy cover/link

Les types 'cover' et 'link' ne sont plus utilises depuis l'editeur de slides
v2. Le rendu public les genere implicitement (cover depuis coverImage,
lien depuis le slug). Cette migration nettoie la base au prochain boot."
```

---

## Task 9 — Élargir la CSP backend pour `frame-src` (YouTube/Vimeo)

**Files :**

- Modifier : `backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java`

- [ ] **Step 1 : Localiser la directive CSP actuelle**

Ouvrir `backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java` et chercher la chaîne `Content-Security-Policy` (probablement dans un `headers().contentSecurityPolicy(...)` ou un header personnalisé). Repérer la directive complète.

- [ ] **Step 2 : Ajouter `frame-src`**

Si la directive actuelle est par exemple :

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'
```

Ajouter `frame-src 'self' https://www.youtube.com https://player.vimeo.com` :

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-src 'self' https://www.youtube.com https://player.vimeo.com
```

> NOTE : si une directive `frame-src` existe déjà (peu probable), ajouter seulement les deux hôtes manquants à sa liste.

- [ ] **Step 3 : Lancer tous les tests backend**

Commande : `cd backend && mvn test`
Attendu : tous OK (la CSP est testée par les tests d'intégration de SecurityConfig si présents ; sinon le simple boot du contexte Spring vérifie la syntaxe).

- [ ] **Step 4 : Smoke test manuel (optionnel)**

Lancer le stack complet en local (`docker compose up -d --build`), ouvrir `/admin`, naviguer vers une pièce avec un slide vidéo, vérifier dans DevTools que l'iframe charge sans erreur CSP.

- [ ] **Step 5 : Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java
git commit -m "chore(security): autoriser frame-src YouTube et Vimeo dans la CSP

Le slide video (cf. editeur de slides v2) embarque une iframe vers
www.youtube.com ou player.vimeo.com selon la plateforme detectee. La CSP
'frame-src self' bloquait ces iframes ; on ajoute les deux hotes."
```

---

## Self-Review

### Couverture spec

| Élément spec | Task |
|---|---|
| Picker médiathèque pour image | Task 5 (`<app-image-field>` dans la branche image) |
| Cover/Lien implicites (modèle frontend) | Task 6 (`slide.model.ts`) |
| Cover/Lien implicites (rendu public) | Tasks 3-4 (viewers DisplaySlide + parents enrichissent) |
| Mini-aperçu par carte | Task 5 (colonne `preview` dans le template) |
| Slide vidéo (modèle frontend) | Task 6 (`VideoSlide`) |
| Slide vidéo (rendu public, iframe) | Task 3 (branche `video` dans viewers) |
| Slide vidéo (admin UI) | Task 5 (bouton + détection) |
| `parseVideoUrl` utility | Task 1 |
| Backend `Slide.java` updated | Task 7 |
| Backend `StoryService.java` updated | Task 7 |
| Migration Liquibase 008 | Task 8 |
| CSP frame-src élargie | Task 9 |
| Tests TDD partout | présent dans chaque task |
| Filtre défensif cover/link | Tasks 4 + 5 (`reload` admin + parents publics) |

### Notes d'ordre d'exécution

- Tasks 5 et 6 doivent être committées dans le même commit (le code de Task 5 référence `VideoSlide` qui n'est ajouté qu'en Task 6).
- Tasks 7 et 8 peuvent être committées séparément. Si on déploie Task 7 sans Task 8, le backend va lancer une `IllegalStateException` au premier `GET /api/admin/slides/...` qui rencontre une row legacy. Donc en CI les commits Task 7 et Task 8 doivent partir ensemble vers staging.
- Task 9 (CSP) peut être faite en parallèle de Task 7/8 mais doit être déployée avant que les vidéos arrivent en production (sinon iframes bloqués).

### Smoke final

Après toutes les tasks committées et la suite de tests verte :

1. `docker compose -f docker-compose.test.yml run --rm frontend-test` → tous OK
2. `cd backend && mvn test` → tous OK
3. `docker compose up -d --build` → stack local fonctionnel
4. Navigation manuelle : `/admin/mobilier`, créer une pièce, ouvrir l'éditeur de slides, ajouter image (via picker) + vidéo YouTube + spec + citation, enregistrer
5. Aller sur `/mobilier/<slug>` côté public, vérifier que la story s'affiche avec cover + slides + lien
6. Cliquer sur la slide vidéo en mode story-viewer fullscreen, vérifier que l'iframe charge

---

## Conventions

- Angular 21 standalone + signals + `@if`/`@for`.
- `PortfolioService` est l'unique point d'entrée HTTP côté frontend.
- Pas de NgModule, pas de librairie tierce.
- Tests via Docker (`docker compose -f docker-compose.test.yml run --rm frontend-test` côté front, `mvn test` côté back).
- Commits conventional-commits français (`feat(slides)`, `chore(db)`, `chore(security)`, etc.).
- Couverture frontend ≥ 80% (seuil karma.conf.js).
- Liquibase : `ddl-auto=validate`, jamais Hibernate qui crée des tables ; chaque changement de données = nouveau changelog numéroté.
