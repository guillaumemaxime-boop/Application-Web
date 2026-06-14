# Édition des slides EN PLACE (6b) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éditer les slides d'une story en place (WYSIWYG, auto-save) sur le rendu de `<app-story-inline>` dans le bloc d'auteur admin, en remplacement de la modale `<app-slides-editor>` du 6a.

**Architecture:** `<app-story-inline>` (admin-only depuis 6a) gagne un mode `editable` : working-copy interne en signal (réinitialisée au changement de référence de l'input), rendu des 4 types avec affordances (drag-reorder, supprimer, édition inline des champs, ajout barre + points d'insertion), et émet `slidesChange: Slide[]` à chaque mutation committée + `imageReplaceRequest: string` (le remplacement d'image est délégué à la page qui détient la médiathèque). Les pages auto-sauvent via `replaceStorySlides` + indicateur discret. La modale slides du 6a et le bouton « ⚙ Éditer slides » sont retirés.

**Tech Stack:** Angular 21 standalone, signals, `@if`/`@for`, `@Input()`/`@Output()` décorateurs (style de `story-inline`), `ReorderableDirective` (drag), `parseVideoUrl` (détection vidéo). Tests Karma+Jasmine via Docker (`docker compose -f docker-compose.test.yml run --rm frontend-test`).

**Branche :** `feat/wysiwyg-slides-en-place-6b` (créée, spec commitée).

**Spec :** `docs/superpowers/specs/2026-06-13-wysiwyg-slides-en-place-6b-design.md`

**Baseline tests :** **956 SUCCESS** (état de `main` au début de 6b). Chaque tâche rapporte le compte exact.

**Garde-fous projet (RAPPEL à chaque tâche) :**
- AUCUNE normalisation d'apostrophe typographique `'` → ASCII sur des lignes existantes. Vérifier `git diff` au niveau caractère.
- Copie UI en français. Templates en `@if`/`@for` (jamais `*ngIf`/`*ngFor`).
- Conserver le style `@Input()`/`@Output() = new EventEmitter` dans `story-inline`, les vues détail et les previews.
- Edits ciblés, pas de réécriture de fichier.

---

## Modèle (référence, NE PAS modifier)

`frontend/src/app/models/slide.model.ts` :
```typescript
export type Slide = ImageSlide | VideoSlide | SpecSlide | QuoteSlide;
export interface BaseSlide { id: string; position: number; }
export interface ImageSlide extends BaseSlide { type: 'image'; src: string; caption: string | null; }
export interface VideoSlide extends BaseSlide { type: 'video'; src: string; caption: string | null; }
export interface SpecSlide  extends BaseSlide { type: 'spec';  specs: SpecEntry[]; }
export interface QuoteSlide extends BaseSlide { type: 'quote'; body: string; cite: string | null; }
export interface SpecEntry { label: string; value: string; }
```
`ImageSlide` n'a PAS de crop. Service : `replaceStorySlides(storyId, slides): Observable<Slide[]>`, `getStorySlides(id)`.

## Structure des fichiers

| Fichier | Rôle | Tâches |
| --- | --- | --- |
| `frontend/src/app/components/story-inline/story-inline.component.ts` (+`.spec.ts`) | Mode éditable : working-copy, rendu éditable 4 types, drag/delete, édition inline, ajout, outputs `slidesChange`/`imageReplaceRequest`. | 1-4 |
| `frontend/src/app/components/furniture-detail-view/...` (+`.spec`) | Bloc admin : `[editable]="true"` + slides bruts ; relais `slidesChange`/`imageReplaceRequest`. Retrait `slidesEdit` (T8). | 5, 8 |
| `frontend/src/app/components/exhibition-detail-view/...` (+`.spec`) | Idem (miroir). | 5, 8 |
| `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts` (+`.spec`) | Relais des 2 outputs ; retrait relais `storySlidesEdit` (T8). | 6, 8 |
| `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts` (+`.spec`) | Idem (miroir). | 6, 8 |
| `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` (+`.spec`) | Feed slides bruts au bloc ; `onStorySlidesChange` (auto-save + `slidesSaveState`) ; `onStoryImageReplaceRequest` (photo-picker) ; retrait modale (T8). | 7, 8 |
| `frontend/src/app/pages/admin/expositions/expositions.component.ts` (+`.spec`) | Idem (miroir). | 7, 8 |
| `frontend/src/app/components/story-manager-bar/story-manager-bar.component.ts` (+`.spec`) | Retrait bouton/output `slidesEdit`. | 8 |

**Ordre voulu :** construire l'éditeur en place (T1-4) → câbler (T5-7, la modale 6a coexiste encore) → retirer la modale + plomberie `slidesEdit` une fois l'édition en place fonctionnelle (T8).

---

## Task 1 : `story-inline` — scaffold éditable (working-copy, drag, delete)

**Files:**
- Modify: `frontend/src/app/components/story-inline/story-inline.component.ts`
- Test: `frontend/src/app/components/story-inline/story-inline.component.spec.ts`

LIS le composant en entier d'abord. Le rendu lecture seule (sur `sections()`) doit rester **inchangé** quand `editable=false`.

- [ ] **Step 1 : Tests (rouge)**

Ajouter dans le spec (créer un HostComponent si besoin pour piloter `[slides]`/`[editable]` ; importer `Slide` depuis `../../models/slide.model`) :
```typescript
  function rawSlides() {
    return [
      { id: 's1', type: 'quote', position: 0, body: 'Bonjour', cite: null },
      { id: 's2', type: 'image', position: 1, src: '/a.jpg', caption: 'A' },
    ] as any[];
  }

  it('mode lecture seule : pas d\'affordance d\'édition', () => {
    component.slides = rawSlides();
    component.editable = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.slide-edit-block')).toBeNull();
  });

  it('mode éditable : un bloc éditable par slide avec poignée drag + supprimer', () => {
    component.slides = rawSlides();
    component.editable = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.slide-edit-block').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.slide-drag').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.slide-del').length).toBe(2);
  });

  it('supprimer un slide émet slidesChange sans ce slide', () => {
    component.slides = rawSlides();
    component.editable = true;
    fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    (fixture.nativeElement.querySelectorAll('.slide-del')[0] as HTMLButtonElement).click();
    expect(emitted!.map(s => s.id)).toEqual(['s2']);
  });

  it('réordonnancement via onReorder émet slidesChange ordonné', () => {
    component.slides = rawSlides();
    component.editable = true;
    fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    (component as any).onReorder([1, 0]);
    expect(emitted!.map(s => s.id)).toEqual(['s2', 's1']);
  });

  it('un nouvel input slides réinitialise la working-copy', () => {
    component.slides = rawSlides();
    component.editable = true;
    fixture.detectChanges();
    component.slides = [{ id: 'x', type: 'quote', position: 0, body: 'X', cite: null } as any];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.slide-edit-block').length).toBe(1);
  });
```

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter le scaffold (TS)**

Imports : ajouter `EventEmitter, Output` et `ReorderableDirective` :
```typescript
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { Slide } from '../../models/slide.model';
import { ReorderableDirective } from '../../directives/reorderable.directive';
```
Ajouter `ReorderableDirective` au tableau `imports` du décorateur.

Dans la classe, après le setter `slides` existant, ajouter le mode éditable :
```typescript
  @Input() editable = false;
  @Output() slidesChange = new EventEmitter<Slide[]>();
  @Output() imageReplaceRequest = new EventEmitter<string>();

  /** Working-copy éditable, réinitialisée à chaque nouvelle référence d'input `slides`. */
  protected readonly workingSlides = signal<Slide[]>([]);

  // (dans le setter `slides`, après `this._slides.set(...)`)
  // réinitialise la working-copy depuis les 4 types narratifs uniquement
```
Modifier le setter `slides` pour alimenter aussi la working-copy :
```typescript
  @Input({ required: true })
  set slides(value: DisplaySlide[]) {
    this._slides.set(value ?? []);
    this.workingSlides.set(
      (value ?? []).filter(
        (s): s is Slide => s.type === 'image' || s.type === 'video' || s.type === 'spec' || s.type === 'quote',
      ),
    );
  }
```
Méthodes de mutation (émettent la liste complète) :
```typescript
  private commit(next: Slide[]): void {
    this.workingSlides.set(next);
    this.slidesChange.emit(next);
  }

  protected deleteSlide(id: string): void {
    this.commit(this.workingSlides().filter(s => s.id !== id));
  }

  protected onReorder(order: number[]): void {
    const cur = this.workingSlides();
    this.commit(order.map(i => cur[i]).filter((s): s is Slide => !!s));
  }
```

- [ ] **Step 4 : Implémenter le rendu éditable (template)**

Ajouter, dans le template, une branche `@if (editable) { ... } @else { <rendu lecture seule existant> }`. Le rendu lecture seule actuel (le `@if (sections().length > 0)`) reste dans le `@else`. La branche éditable :
```html
    @if (editable) {
      <section class="story-inline editable">
        <div class="container narrow header"><span class="eyebrow">Histoire de la pièce</span></div>
        <ul class="slides-edit-list" appReorderable (reordered)="onReorder($event)">
          @for (s of workingSlides(); track s.id; let i = $index) {
            <li class="slide-edit-block">
              <div class="slide-edit-toolbar">
                <span class="slide-drag" title="Glisser pour réordonner" aria-hidden="true">⋮⋮</span>
                <span class="slide-type">{{ s.type }}</span>
                <button type="button" class="slide-del" aria-label="Supprimer ce slide" (click)="deleteSlide(s.id)">×</button>
              </div>
              <!-- Rendu par type (lecture pour l'instant ; édition inline = Task 2/3) -->
              @switch (s.type) {
                @case ('image') { <figure class="block image"><img [src]="$any(s).src" [alt]="$any(s).caption ?? ''" /></figure> }
                @case ('video') { <figure class="block video"><div class="video-frame">@if (videoEmbedUrl($any(s).src); as url) {<iframe [src]="url" title="Vidéo"></iframe>}</div></figure> }
                @case ('spec')  { <div class="block spec"><div class="container narrow"><dl>@for (e of $any(s).specs; track $index) {<div><dt>{{ e.label }}</dt><dd>{{ e.value }}</dd></div>}</dl></div></div> }
                @case ('quote') { <div class="block quote"><div class="container narrow"><blockquote>{{ $any(s).body }}</blockquote></div></div> }
              }
            </li>
          }
        </ul>
      </section>
    } @else {
      <!-- rendu lecture seule EXISTANT, inchangé -->
    }
```
CSS (ajouter au tableau `styles`) :
```css
    .slides-edit-list { list-style: none; padding: 0; margin: 0; }
    .slide-edit-block { position: relative; border: 1px dashed var(--color-line); padding: 12px; margin: 0 16px 16px; }
    .slide-edit-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .slide-drag { cursor: grab; color: var(--color-mute); }
    .slide-type { font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .slide-del { margin-left: auto; background: transparent; border: 1px solid var(--color-line); cursor: pointer; padding: 2px 8px; }
    .slide-del:hover { color: #b1532a; border-color: #b1532a; }
```

- [ ] **Step 5 : Suite → vert.** Compte exact.

- [ ] **Step 6 : Commit**
```powershell
git add frontend/src/app/components/story-inline/
git commit -m "feat(admin): story-inline - scaffold mode editable (working-copy, drag-reorder, supprimer slide)"
```

---

## Task 2 : `story-inline` — édition inline des champs par type

**Files:** mêmes que Task 1.

- [ ] **Step 1 : Tests (rouge)** — un par type :
```typescript
  it('éditer la légende image (blur) émet slidesChange', () => {
    component.slides = [{ id: 's1', type: 'image', position: 0, src: '/a.jpg', caption: 'A' } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    const cap = fixture.nativeElement.querySelector('.slide-caption') as HTMLElement;
    cap.textContent = 'Nouvelle légende'; cap.dispatchEvent(new Event('blur'));
    expect(emitted![0].caption).toBe('Nouvelle légende');
  });

  it('éditer l\'URL vidéo (change) émet slidesChange', () => {
    component.slides = [{ id: 's1', type: 'video', position: 0, src: '', caption: null } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    const input = fixture.nativeElement.querySelector('.slide-video-url') as HTMLInputElement;
    input.value = 'https://youtu.be/abc'; input.dispatchEvent(new Event('change'));
    expect(emitted![0].src).toBe('https://youtu.be/abc');
  });

  it('éditer une cellule spec (blur) émet slidesChange', () => {
    component.slides = [{ id: 's1', type: 'spec', position: 0, specs: [{ label: 'L', value: 'V' }] } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    const dd = fixture.nativeElement.querySelector('.spec-value') as HTMLElement;
    dd.textContent = 'V2'; dd.dispatchEvent(new Event('blur'));
    expect(emitted![0].specs[0].value).toBe('V2');
  });

  it('ajouter / retirer une ligne de spec émet slidesChange', () => {
    component.slides = [{ id: 's1', type: 'spec', position: 0, specs: [{ label: 'L', value: 'V' }] } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    (fixture.nativeElement.querySelector('.spec-add') as HTMLButtonElement).click();
    expect(emitted![0].specs.length).toBe(2);
    (fixture.nativeElement.querySelectorAll('.spec-row-del')[1] as HTMLButtonElement).click();
    expect(emitted![0].specs.length).toBe(1);
  });

  it('éditer le corps et la source d\'une citation émet slidesChange', () => {
    component.slides = [{ id: 's1', type: 'quote', position: 0, body: 'B', cite: null } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    const body = fixture.nativeElement.querySelector('.quote-body') as HTMLElement;
    body.textContent = 'Nouveau'; body.dispatchEvent(new Event('blur'));
    expect(emitted![0].body).toBe('Nouveau');
  });
```

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Méthodes de patch (TS)**
```typescript
  private patchSlide(id: string, patch: Partial<Slide>): void {
    this.commit(this.workingSlides().map(s => s.id === id ? ({ ...s, ...patch } as Slide) : s));
  }
  protected onCaptionBlur(id: string, ev: Event): void {
    this.patchSlide(id, { caption: (ev.target as HTMLElement).textContent?.trim() || null } as Partial<Slide>);
  }
  protected onVideoUrlChange(id: string, ev: Event): void {
    this.patchSlide(id, { src: (ev.target as HTMLInputElement).value.trim() } as Partial<Slide>);
  }
  protected onQuoteBlur(id: string, field: 'body' | 'cite', ev: Event): void {
    const v = (ev.target as HTMLElement).textContent?.trim() ?? '';
    this.patchSlide(id, (field === 'body' ? { body: v } : { cite: v || null }) as Partial<Slide>);
  }
  protected onSpecCellBlur(id: string, idx: number, field: 'label' | 'value', ev: Event): void {
    const v = (ev.target as HTMLElement).textContent?.trim() ?? '';
    this.commit(this.workingSlides().map(s => {
      if (s.id !== id || s.type !== 'spec') return s;
      const specs = s.specs.map((e, i) => i === idx ? { ...e, [field]: v } : e);
      return { ...s, specs };
    }));
  }
  protected addSpecRow(id: string): void {
    this.commit(this.workingSlides().map(s =>
      s.id === id && s.type === 'spec' ? { ...s, specs: [...s.specs, { label: '', value: '' }] } : s));
  }
  protected removeSpecRow(id: string, idx: number): void {
    this.commit(this.workingSlides().map(s =>
      s.id === id && s.type === 'spec' ? { ...s, specs: s.specs.filter((_, i) => i !== idx) } : s));
  }
```
Importer `parseVideoUrl` est déjà fait (méthode `videoEmbedUrl` existante). Ajouter FormsModule n'est PAS nécessaire (on utilise `(change)`/`(blur)` natifs, pas `[(ngModel)]`).

- [ ] **Step 4 : Template éditable par type** — remplacer les rendus « lecture » de la branche éditable (Task 1 Step 4) par les versions éditables :
```html
                @case ('image') {
                  <figure class="block image">
                    <img [src]="$any(s).src" [alt]="$any(s).caption ?? ''" />
                    <figcaption class="container narrow slide-caption" contenteditable="true" role="textbox"
                                aria-label="Légende de l'image" (blur)="onCaptionBlur(s.id, $event)">{{ $any(s).caption }}</figcaption>
                  </figure>
                }
                @case ('video') {
                  <figure class="block video">
                    <div class="video-frame">@if (videoEmbedUrl($any(s).src); as url) {<iframe [src]="url" title="Vidéo"></iframe>}</div>
                    <div class="container narrow">
                      <input type="url" class="slide-video-url" [value]="$any(s).src" placeholder="URL YouTube ou Vimeo"
                             aria-label="URL de la vidéo" (change)="onVideoUrlChange(s.id, $event)" />
                      <figcaption class="slide-caption" contenteditable="true" role="textbox"
                                  aria-label="Légende de la vidéo" (blur)="onCaptionBlur(s.id, $event)">{{ $any(s).caption }}</figcaption>
                    </div>
                  </figure>
                }
                @case ('spec') {
                  <div class="block spec"><div class="container narrow">
                    <span class="eyebrow">Caractéristiques</span>
                    <dl>
                      @for (e of $any(s).specs; track $index; let j = $index) {
                        <div>
                          <dt class="spec-label" contenteditable="true" role="textbox" aria-label="Libellé"
                              (blur)="onSpecCellBlur(s.id, j, 'label', $event)">{{ e.label }}</dt>
                          <dd class="spec-value" contenteditable="true" role="textbox" aria-label="Valeur"
                              (blur)="onSpecCellBlur(s.id, j, 'value', $event)">{{ e.value }}</dd>
                          <button type="button" class="spec-row-del" aria-label="Retirer cette ligne" (click)="removeSpecRow(s.id, j)">×</button>
                        </div>
                      }
                    </dl>
                    <button type="button" class="spec-add" (click)="addSpecRow(s.id)">＋ Entrée</button>
                  </div></div>
                }
                @case ('quote') {
                  <div class="block quote"><div class="container narrow">
                    <blockquote class="quote-body" contenteditable="true" role="textbox" aria-label="Citation"
                                (blur)="onQuoteBlur(s.id, 'body', $event)">{{ $any(s).body }}</blockquote>
                    <cite class="quote-cite" contenteditable="true" role="textbox" aria-label="Source"
                          (blur)="onQuoteBlur(s.id, 'cite', $event)">{{ $any(s).cite }}</cite>
                  </div></div>
                }
```
CSS focus pour les zones éditables :
```css
    .slide-edit-block [contenteditable]:hover, .slide-edit-block [contenteditable]:focus { outline: 1px dashed var(--color-accent); outline-offset: 2px; }
    .slide-video-url { width: 100%; padding: 6px 8px; border: 1px solid var(--color-line); margin: 8px 0; font: inherit; }
    .spec-row-del, .spec-add { background: transparent; border: 1px solid var(--color-line); cursor: pointer; padding: 2px 8px; font-size: 0.78rem; }
```

- [ ] **Step 5 : Suite → vert.** Compte exact.

- [ ] **Step 6 : Commit**
```powershell
git add frontend/src/app/components/story-inline/
git commit -m "feat(admin): story-inline - edition inline des champs par type (legende, url video, cellules spec, citation)"
```

---

## Task 3 : `story-inline` — remplacement d'image délégué (output)

**Files:** mêmes.

- [ ] **Step 1 : Test (rouge)**
```typescript
  it('le bouton Remplacer image émet imageReplaceRequest avec l\'id', () => {
    component.slides = [{ id: 's1', type: 'image', position: 0, src: '/a.jpg', caption: null } as any];
    component.editable = true; fixture.detectChanges();
    let req: string | null = null;
    component.imageReplaceRequest.subscribe((id: string) => req = id);
    (fixture.nativeElement.querySelector('.slide-img-replace') as HTMLButtonElement).click();
    expect(req).toBe('s1');
  });
```

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Template** — dans le `@case ('image')` de la branche éditable, ajouter sous l'`<img>` :
```html
                    <button type="button" class="slide-img-replace" (click)="imageReplaceRequest.emit(s.id)">🖼 Remplacer l'image</button>
```
CSS :
```css
    .slide-img-replace { display: inline-block; margin: 8px 16px; padding: 4px 10px; background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; font-size: 0.8rem; }
```
(`imageReplaceRequest` est déjà déclaré en Task 1.)

- [ ] **Step 4 : Suite → vert.** Compte exact.

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/components/story-inline/
git commit -m "feat(admin): story-inline - bouton remplacer image (delegue a la page via imageReplaceRequest)"
```

---

## Task 4 : `story-inline` — ajout de slide (barre de fin + points d'insertion)

**Files:** mêmes.

- [ ] **Step 1 : Tests (rouge)**
```typescript
  it('barre de fin : + Image ajoute un slide image en fin', () => {
    component.slides = [{ id: 's1', type: 'quote', position: 0, body: 'B', cite: null } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    (fixture.nativeElement.querySelector('.add-bar-image') as HTMLButtonElement).click();
    expect(emitted!.length).toBe(2);
    expect(emitted![1].type).toBe('image');
  });

  it('point d\'insertion : insère un slide spec à la position donnée', () => {
    component.slides = [
      { id: 's1', type: 'quote', position: 0, body: 'B', cite: null },
      { id: 's2', type: 'quote', position: 1, body: 'C', cite: null },
    ] as any[];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    (component as any).insertSlide(1, 'spec'); // entre s1 et s2
    expect(emitted!.map(s => s.type)).toEqual(['quote', 'spec', 'quote']);
  });
```

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : TS — fabrique + insertion/ajout**
```typescript
  private newSlide(type: Slide['type']): Slide {
    const id = 'tmp-' + Math.random().toString(36).slice(2, 8);
    switch (type) {
      case 'image': return { id, type, position: 0, src: '', caption: null };
      case 'video': return { id, type, position: 0, src: '', caption: null };
      case 'spec':  return { id, type, position: 0, specs: [{ label: '', value: '' }] };
      case 'quote': return { id, type, position: 0, body: '', cite: null };
    }
  }
  protected addSlide(type: Slide['type']): void {
    this.commit([...this.workingSlides(), this.newSlide(type)]);
  }
  protected insertSlide(index: number, type: Slide['type']): void {
    const next = [...this.workingSlides()];
    next.splice(index, 0, this.newSlide(type));
    this.commit(next);
    this.insertMenuAt.set(null);
  }
  /** Index du point d'insertion dont le menu de types est ouvert (null = aucun). */
  protected readonly insertMenuAt = signal<number | null>(null);
```

- [ ] **Step 4 : Template — points d'insertion + barre de fin**

La liste `appReorderable` ne doit contenir QUE les `.slide-edit-block` (pour que le drag réordonne bien `workingSlides` index-pour-index, comme la galerie). Le **point d'insertion « avant ce slide »** est rendu À L'INTÉRIEUR du haut de chaque bloc (pas en `<li>` frère). Combiné à la **barre de fin** (insertion après le dernier), on couvre toutes les positions.
```html
        <ul class="slides-edit-list" appReorderable (reordered)="onReorder($event)">
          @for (s of workingSlides(); track s.id; let i = $index) {
            <li class="slide-edit-block">
              <div class="slide-insert-point">
                <button type="button" class="insert-btn" aria-label="Insérer un slide avant celui-ci"
                        (click)="insertMenuAt.set(insertMenuAt() === i ? null : i)">＋</button>
                @if (insertMenuAt() === i) {
                  <div class="insert-menu">
                    <button type="button" (click)="insertSlide(i, 'image')">Image</button>
                    <button type="button" (click)="insertSlide(i, 'video')">Vidéo</button>
                    <button type="button" (click)="insertSlide(i, 'spec')">Spec</button>
                    <button type="button" (click)="insertSlide(i, 'quote')">Citation</button>
                  </div>
                }
              </div>
              <div class="slide-edit-toolbar"> ... (inchangé, Task 1) ... </div>
              @switch (s.type) { ... (rendus éditables Task 2/3) ... }
            </li>
          }
        </ul>
        <div class="add-bar">
          <button type="button" class="add-bar-image" (click)="addSlide('image')">+ Image</button>
          <button type="button" class="add-bar-video" (click)="addSlide('video')">+ Vidéo</button>
          <button type="button" class="add-bar-spec" (click)="addSlide('spec')">+ Spec</button>
          <button type="button" class="add-bar-quote" (click)="addSlide('quote')">+ Citation</button>
        </div>
```
Ainsi la `<ul appReorderable>` ne contient que des `.slide-edit-block` ⇒ `onReorder($event)` reçoit des index alignés sur `workingSlides`. Le test `insertSlide(1, 'spec')` (appel direct) valide l'insertion indépendamment de l'UI du menu.
CSS :
```css
    .slide-insert-point { list-style: none; text-align: center; min-height: 8px; position: relative; }
    .insert-btn { opacity: 0; background: var(--color-bg); border: 1px solid var(--color-line); border-radius: 999px; cursor: pointer; padding: 0 8px; }
    .slide-insert-point:hover .insert-btn, .insert-btn:focus { opacity: 1; }
    .insert-menu { display: inline-flex; gap: 4px; margin-top: 4px; }
    .insert-menu button { background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; padding: 2px 8px; font-size: 0.78rem; }
    .add-bar { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; padding: 16px; border-top: 1px dashed var(--color-line); margin: 0 16px; }
    .add-bar button { background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; padding: 6px 14px; font-size: 0.85rem; }
```

- [ ] **Step 5 : Suite → vert.** Compte exact. Vérifie aussi la couverture (seuils 80%/75%).

- [ ] **Step 6 : Commit**
```powershell
git add frontend/src/app/components/story-inline/
git commit -m "feat(admin): story-inline - ajout de slide (barre de fin + points d'insertion entre slides)"
```

---

## Task 5 : Vues détail — câbler le bloc éditable

**Files:**
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts` (+`.spec.ts`)
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts` (+`.spec.ts`)

Le bloc d'auteur (6a) contient `@if (displaySlides.length > 0) { <app-story-inline [slides]="displaySlides"></app-story-inline> }`. On passe `story-inline` en éditable et on relaie ses 2 outputs.

- [ ] **Step 1 : Tests (rouge)** — dans CHAQUE spec de vue détail :
```typescript
  it('le bloc story-inline est en mode editable et relaie slidesChange', () => {
    // editable = true ; displaySlides non vides
    fixture.detectChanges();
    const si = fixture.debugElement.query(By.directive(StoryInlineComponent)).componentInstance as StoryInlineComponent;
    expect(si.editable).toBeTrue();
    let received: any[] | null = null;
    component.storySlidesChange.subscribe((s: any[]) => received = s);
    si.slidesChange.emit([{ id: 'x' } as any]);
    expect(received).toEqual([{ id: 'x' }]);
  });
```
(Importer `By`, `StoryInlineComponent`.)

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter** — dans le bloc d'auteur, remplacer la ligne story-inline :
```html
            @if (displaySlides.length > 0) {
              <app-story-inline [slides]="displaySlides" [editable]="true"
                (slidesChange)="storySlidesChange.emit($event)"
                (imageReplaceRequest)="storyImageReplaceRequest.emit($event)"></app-story-inline>
            }
```
Nouveaux outputs (à côté des `story*` du 6a) dans CHAQUE vue détail :
```typescript
  @Output() storySlidesChange = new EventEmitter<Slide[]>();
  @Output() storyImageReplaceRequest = new EventEmitter<string>();
```
Importer `Slide` : `import { Slide } from '../../models/slide.model';` (si absent).

- [ ] **Step 4 : Suite → vert.** Compte exact.

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/components/furniture-detail-view/ frontend/src/app/components/exhibition-detail-view/
git commit -m "feat(admin): vues detail - story-inline editable + relais slidesChange/imageReplaceRequest"
```

---

## Task 6 : Previews — relayer les 2 outputs

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts` (+`.spec.ts`)
- Modify: `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts` (+`.spec.ts`)

- [ ] **Step 1 : Tests (rouge)** — dans CHAQUE spec : relais de `storySlidesChange` (calque sur les tests de relais existants, via `By.directive(<vue détail>)`).
```typescript
  it('relaie storySlidesChange', () => {
    fixture.detectChanges();
    const emitted: any[] = [];
    component.storySlidesChange.subscribe((s: any) => emitted.push(s));
    const view = fixture.debugElement.query(By.directive(FurnitureDetailViewComponent)).componentInstance as FurnitureDetailViewComponent;
    view.storySlidesChange.emit([{ id: 'x' } as any]);
    expect(emitted.length).toBe(1);
  });
```

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter** — dans chaque preview : ajouter les 2 outputs + relais sur la vue détail :
```typescript
  @Output() storySlidesChange = new EventEmitter<Slide[]>();
  @Output() storyImageReplaceRequest = new EventEmitter<string>();
```
```html
      (storySlidesChange)="storySlidesChange.emit($event)"
      (storyImageReplaceRequest)="storyImageReplaceRequest.emit($event)"
```
Importer `Slide` si absent.

- [ ] **Step 4 : Suite → vert.** Compte exact.

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/pages/admin/mobilier/preview/ frontend/src/app/pages/admin/expositions/preview/
git commit -m "feat(admin): previews - relais slidesChange/imageReplaceRequest"
```

---

## Task 7 : Pages — slides bruts, auto-save + indicateur, remplacement image

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` (+`.spec.ts`)
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts` (+`.spec.ts`)

Objectif : (a) feeder les slides BRUTS (`activeStorySlides()`) au bloc d'auteur en éditable (au lieu de `previewDisplaySlides()` enrichi) ; (b) `onStorySlidesChange` → `replaceStorySlides` + indicateur `slidesSaveState` ; (c) `onStoryImageReplaceRequest` → photo-picker → set `src` du slide + persiste ; (d) le shell suspend l'`inert` quand le photo-picker est ouvert.

LIS le composant `<app-photo-picker>` (`pages/admin/shared/photo-picker.component.ts`) pour ses inputs/outputs réels (`target`, `[photos]`, `(selected)`, `(closed)`) — calque sur l'usage dans `image-field.component.ts`.

- [ ] **Step 1 : Tests (rouge)** — dans CHAQUE spec de page :
```typescript
  it('onStorySlidesChange persiste via replaceStorySlides et passe par saving puis saved', () => {
    const cmp = fixture.componentInstance as any;
    cmp.activeStoryId.set('a');
    cmp.onStorySlidesChange([{ id: 's1', type: 'quote', position: 0, body: 'B', cite: null }]);
    expect(cmp.slidesSaveState()).toBe('saving');
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/stories/a/slides').flush([]);
    expect(cmp.slidesSaveState()).toBe('saved');
  });

  it('onStoryImageReplaceRequest ouvre le photo-picker', () => {
    const cmp = fixture.componentInstance as any;
    cmp.onStoryImageReplaceRequest('s1');
    expect(cmp.replacingImageSlideId()).toBe('s1');
  });
```

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter (TS)**

Importer `PhotoPickerComponent` + `Photo` si besoin. Signaux :
```typescript
  protected readonly slidesSaveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  protected readonly replacingImageSlideId = signal<string | null>(null);
  protected readonly pickerPhotos = signal<Photo[]>([]);
```
Handlers :
```typescript
  protected onStorySlidesChange(slides: Slide[]): void {
    const id = this.activeStoryId();
    if (!id) return;
    this.activeStorySlides.set(slides);
    this.slidesSaveState.set('saving');
    this.portfolio.replaceStorySlides(id, slides).subscribe({
      next: () => { this.slidesSaveState.set('saved'); setTimeout(() => { if (this.slidesSaveState() === 'saved') this.slidesSaveState.set('idle'); }, 2000); },
      error: () => { this.slidesSaveState.set('error'); this.toast.error('Erreur lors de l\'enregistrement des slides.'); },
    });
  }
  protected onStoryImageReplaceRequest(slideId: string): void {
    this.replacingImageSlideId.set(slideId);
    this.portfolio.getPhotos().subscribe(p => this.pickerPhotos.set(p));
  }
  protected onSlideImageSelected(photo: Photo): void {
    const slideId = this.replacingImageSlideId();
    this.replacingImageSlideId.set(null);
    if (!slideId) return;
    const next = this.activeStorySlides().map(s => s.id === slideId && s.type === 'image' ? { ...s, src: photo.url } : s);
    this.onStorySlidesChange(next);
  }
  protected onSlidePickerClosed(): void { this.replacingImageSlideId.set(null); }
```

- [ ] **Step 4 : Implémenter (template)**

Sur `<app-furniture-preview>` / `<app-exhibition-preview>` :
- Changer la source des slides du bloc : passer **les slides bruts** au lieu des enrichis. Le bloc reçoit ses slides via `[displaySlides]`. Remplacer `[displaySlides]="previewDisplaySlides()"` par `[displaySlides]="activeStorySlides()"`. (Supprimer le computed `previewDisplaySlides` s'il n'est plus utilisé ailleurs, et l'import `enrichSlides` s'il devient inutilisé — vérifier.)
- Ajouter les relais :
```html
            (storySlidesChange)="onStorySlidesChange($event)"
            (storyImageReplaceRequest)="onStoryImageReplaceRequest($event)"
```
Ajouter l'indicateur + le photo-picker au niveau racine du template :
```html
    @if (slidesSaveState() !== 'idle') {
      <div class="slides-save-state" aria-live="polite">
        @switch (slidesSaveState()) {
          @case ('saving') { Enregistrement… }
          @case ('saved') { Enregistré ✓ }
          @case ('error') { Erreur d'enregistrement }
        }
      </div>
    }
    @if (replacingImageSlideId()) {
      <app-photo-picker target="cover" [photos]="pickerPhotos()"
        (selected)="onSlideImageSelected($event)" (closed)="onSlidePickerClosed()" />
    }
```
Importer `PhotoPickerComponent` dans `imports`. CSS indicateur :
```css
    .slides-save-state { position: fixed; bottom: 16px; right: 16px; z-index: 1200; background: var(--color-ink); color: var(--color-bg); padding: 6px 14px; font-size: 0.8rem; border-radius: 4px; }
```
**Inert/médiathèque** : le shell `<app-admin-preview-shell [formModalOpen]="...">` doit suspendre l'`inert` quand le photo-picker est ouvert. Adapter l'expression existante `[formModalOpen]="cropEditOpen()"` (mobilier) en `[formModalOpen]="cropEditOpen() || replacingImageSlideId() !== null"` (et l'équivalent expo).

- [ ] **Step 5 : Suite → vert.** Compte exact + couverture.

- [ ] **Step 6 : Commit**
```powershell
git add frontend/src/app/pages/admin/mobilier/mobilier.component.ts frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts frontend/src/app/pages/admin/expositions/expositions.component.ts frontend/src/app/pages/admin/expositions/expositions.component.spec.ts
git commit -m "feat(admin): pages - auto-save slides en place + indicateur + remplacement image via mediatheque"
```

---

## Task 8 : Retrait de la modale slides 6a + plomberie `slidesEdit`

**Files:** `story-manager-bar` (+spec), les 2 vues détail (+specs), les 2 previews (+specs), les 2 pages (+specs).

L'édition en place fonctionne (T1-7). On retire la modale et le bouton « ⚙ Éditer slides » désormais redondants.

- [ ] **Step 1 : Tests (rouge / mise à jour)**
- `story-manager-bar.spec.ts` : supprimer le test du bouton `.smb-slides` (qui n'existera plus) ; ajouter : `expect(fixture.nativeElement.querySelector('.smb-slides')).toBeNull();`
- Pages specs : supprimer les tests `onPreviewStorySlidesEdit ouvre la modale` ; ajouter (mobilier+expo) : `expect(cmp.previewSlidesStoryId).toBeUndefined();` n'est pas fiable — préférer vérifier l'absence de rendu de la modale : `expect(fixture.nativeElement.querySelector('app-slides-editor')).toBeNull();` après détection (en mode édition).

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter le retrait**
- `story-manager-bar.component.ts` : retirer le bouton `.smb-slides` du template ET l'output `slidesEdit`.
- Vues détail (`furniture`/`exhibition`) : retirer le relais `(slidesEdit)="storySlidesEdit.emit($event)"` et l'output `storySlidesEdit`.
- Previews : retirer le relais `(storySlidesEdit)` et l'output `storySlidesEdit`.
- Pages : retirer le handler `onPreviewStorySlidesEdit`, le signal `previewSlidesStoryId`, le binding `(storySlidesEdit)`, et le bloc template `@if (previewSlidesStoryId(); as sid) { <app-slides-editor ...> }`. Retirer l'import `SlidesEditorComponent` des pages s'il n'est plus utilisé **dans la page** (NB : `SlidesEditorComponent` reste utilisé form-side via le panneau — vérifier : s'il est encore référencé dans le template form-side, garder l'import). Retirer `A11yModule` UNIQUEMENT s'il n'est plus utilisé (il l'est probablement encore ailleurs — vérifier avant de retirer).

- [ ] **Step 4 : Suite → vert.** Compte exact + couverture.

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/components/story-manager-bar/ frontend/src/app/components/furniture-detail-view/ frontend/src/app/components/exhibition-detail-view/ frontend/src/app/pages/admin/mobilier/ frontend/src/app/pages/admin/expositions/
git commit -m "refactor(admin): retire la modale slides 6a + bouton Editer slides (edition en place desormais)"
```

---

## Après toutes les tâches

1. **Validation visuelle locale** (`docker compose up --build -d frontend`) : preview admin mobilier/expo → bloc story, slides éditables en place (4 types), légendes/cellules/URL éditables, drag-reorder, supprimer, ajout barre + points d'insertion, remplacement d'image via médiathèque, indicateur « Enregistré ✓ ». La modale a disparu. Mode public toujours sans story.
2. **Baselines Playwright** : rendu public inchangé → baselines intactes (confirmer via `npm run test:visual:docker:update` qu'aucun diff n'apparaît, après validation visuelle).
3. **Audits RGAA + sécurité** sur la branche, puis merge sur main (après confirmation).
4. **Doc** : mettre à jour `SPECIFICATION_FONCTIONNELLE.md` (édition slides en place, modale retirée) ; `SPECIFICATION_TECHNIQUE.md` si besoin (story-inline éditable). Le chantier WYSIWYG v2 est alors **terminé** (6/6).
