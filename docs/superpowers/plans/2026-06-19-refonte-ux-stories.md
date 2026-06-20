# Refonte UX stories — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centraliser la gestion des stories dans une page admin dédiée (`/admin/stories`) avec modale de création (owner + cover + slider), éditeur de slides deux panneaux (`/admin/stories/:id`), correctif du cover, et retrait de la gestion stories des fiches.

**Architecture:** Backend — nouvel endpoint `GET /api/admin/stories/manage` renvoyant une liste enrichie (`StoryAdminView` = story + slideCount + sliders + ownerTitle), + correctif de préservation de `coverCrop`. Frontend — `StoriesAdminComponent` (liste/filtre/actions), `StoryCreateModalComponent` (création), `StorySlideEditorComponent` (deux panneaux, réutilise la logique d'édition des 4 types de `story-inline`), nouvelle route+entrée nav, retrait du bloc Stories des éditeurs mobilier/expo.

**Tech Stack:** Spring Boot 4 (Java 25), JUnit 5, JPA ; Angular 21 standalone+signals, `@if`/`@for`, `appReorderable`, Karma+Jasmine.

**Branche :** `feat/refonte-ux-stories` (créée, spec committée).

**Spec :** `docs/superpowers/specs/2026-06-19-refonte-ux-stories-design.md`

**Conventions :** tests via `docker compose -f docker-compose.test.yml run --rm {backend-test,frontend-test}`. Records DTO Java. `@if`/`@for`, pas de `HttpClient` en composant (→ `PortfolioService`). Copie FR, apostrophes typographiques `’`. Ne JAMAIS régénérer les baselines Playwright avant validation visuelle manuelle.

**Faits de référence (vérifiés) :**
- `StoryInput(ownerKind, ownerId, title, coverImage, coverCrop)` ; `Story(id, ownerKind, ownerId, title, coverImage, coverCrop, slug, position, createdAt)`.
- `StorySlideRepository` a `findDistinctStoryIdsWithSlides()` ; ajouter une projection de comptage.
- `NewsSliderEntity.getStories()` → `List<NewsSliderStoryEntity>` (chacun `getStory()`).
- Service Angular : `getAllFurniture()`, `getAllExhibitions()`, `getAdminStories(kind,id)`, `createStory`, `updateStory`, `updateStoryPosition`, `deleteStory`, `getStorySlides`, `replaceStorySlides`, `getAdminSliders()`, `replaceSliderStories(id, storyIds)`.
- `story-inline.component.ts` porte déjà : `addSlide(type)`, `insertSlide`, `deleteSlide`, `onReorder(order)` (via `appReorderable`), `onCaptionBlur`/`onVideoUrlChange`/`onQuoteBlur`/`onSpecCellBlur`/`addSpecRow`/`removeSpecRow`, `newSlide(type)`, et l'émission `slidesChange`. **À réutiliser.**
- Slide (front) : `ImageSlide{type,src,caption,crop?}`, `VideoSlide{type,src,caption}`, `SpecSlide{type,specs[]}`, `QuoteSlide{type,body,cite}`.
- Routes admin : `frontend/src/app/pages/admin/admin.routes.ts` (children) ; nav : `admin-layout.component.ts` (liste `.nav-item`).

---

## Task 1 — Backend : endpoint de gestion enrichi `/api/admin/stories/manage`

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/model/StoryAdminView.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/repository/StorySlideRepository.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/StoryService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminStoriesController.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java`

- [ ] **Step 1 : Écrire le test (service)**

Ajouter dans `StoryServiceTest` :
```java
@Test
void findAllForManagement_enrichit_slideCount_et_owner() {
    Story s = service.create(new StoryInput("furniture", "f-001", "Manage test", "https://example.com/c.jpg", null));
    service.replaceSlides(s.id(), List.of(new Slide.ImageSlide(null, 0, "https://example.com/1.jpg", null, null)));

    var views = service.findAllForManagement();
    var view = views.stream().filter(v -> v.id().equals(s.id())).findFirst().orElseThrow();

    assertThat(view.slideCount()).isEqualTo(1);
    assertThat(view.ownerKind()).isEqualTo("furniture");
    assertThat(view.ownerTitle()).isNotBlank();        // titre du meuble f-001
    assertThat(view.title()).isEqualTo("Manage test");
}

@Test
void findAllForManagement_inclut_les_stories_vides() {
    Story empty = service.create(new StoryInput("furniture", "f-001", "Vide", "https://example.com/c.jpg", null));
    var ids = service.findAllForManagement().stream().map(StoryAdminView::id).toList();
    assertThat(ids).contains(empty.id());   // contrairement a findAllWithSlides
}
```

- [ ] **Step 2 : Lancer → échec compilation** (`StoryAdminView`/`findAllForManagement` absents)

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`

- [ ] **Step 3 : Créer le record `StoryAdminView`**

```java
package com.atelier.portfolio.model;

import java.util.List;

/**
 * Vue enrichie d'une story pour la page de gestion admin : la story + le nombre
 * de slides + les sliders qui la contiennent + le titre de l'owner (meuble/expo).
 */
public record StoryAdminView(
        String id,
        String ownerKind,
        String ownerId,
        String ownerTitle,
        String title,
        String coverImage,
        ImageCrop coverCrop,
        String slug,
        int position,
        int slideCount,
        List<SliderRef> sliders
) {
    public record SliderRef(String id, String title) {}
}
```

- [ ] **Step 4 : Projection de comptage des slides**

Dans `StorySlideRepository`, ajouter :
```java
import org.springframework.data.jpa.repository.Query;
// ... (deja present : @Query pour findDistinctStoryIdsWithSlides)

/** [storyId, count] des slides groupes par story. */
@Query("select s.story.id, count(s) from StorySlideEntity s group by s.story.id")
List<Object[]> countSlidesByStory();
```

- [ ] **Step 5 : Service `findAllForManagement()`**

Dans `StoryService`, injecter `NewsSliderRepository` (ajouter au constructeur + champ) et ajouter :
```java
// + import java.util.HashMap; java.util.Map; (HashSet/Set deja la)
// + import com.atelier.portfolio.repository.NewsSliderRepository;
// + import com.atelier.portfolio.model.StoryAdminView;

public List<StoryAdminView> findAllForManagement() {
    // slideCount par story
    Map<String, Integer> counts = new HashMap<>();
    for (Object[] row : slideRepo.countSlidesByStory()) {
        counts.put((String) row[0], ((Long) row[1]).intValue());
    }
    // sliders par story (id+titre)
    Map<String, List<StoryAdminView.SliderRef>> bySlider = new HashMap<>();
    for (var slider : sliderRepo.findAll()) {
        var ref = new StoryAdminView.SliderRef(slider.getId(), slider.getTitle());
        for (var link : slider.getStories()) {
            bySlider.computeIfAbsent(link.getStory().getId(), k -> new ArrayList<>()).add(ref);
        }
    }
    return storyRepo.findAll().stream().map(e -> {
        String ownerTitle = ownerTitle(e.getOwnerKind(), e.getOwnerId());
        return new StoryAdminView(
                e.getId(), e.getOwnerKind(), e.getOwnerId(), ownerTitle,
                e.getTitle(), e.getCoverImage(),
                ImageCrop.ofNullable(e.getCoverCropX(), e.getCoverCropY(), e.getCoverCropW(), e.getCoverCropH()),
                e.getSlug(), e.getPosition(),
                counts.getOrDefault(e.getId(), 0),
                bySlider.getOrDefault(e.getId(), List.of()));
    }).toList();
}

private String ownerTitle(String ownerKind, String ownerId) {
    if ("furniture".equals(ownerKind)) {
        return furnitureRepo.findById(ownerId).map(FurnitureEntity::getTitle).orElse(ownerId);
    }
    if ("exhibition".equals(ownerKind)) {
        return exhibitionRepo.findById(ownerId).map(ExhibitionEntity::getTitle).orElse(ownerId);
    }
    return ownerId;
}
```
Ajouter le champ/constructeur : `private final NewsSliderRepository sliderRepo;` (et le paramètre dans le constructeur existant).

- [ ] **Step 6 : Endpoint contrôleur**

Dans `AdminStoriesController`, ajouter (et l'import `StoryAdminView`) :
```java
@GetMapping("/manage")
public List<StoryAdminView> manage() {
    return stories.findAllForManagement();
}
```

- [ ] **Step 7 : Lancer → vert**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: BUILD SUCCESS, nouveaux tests verts.

- [ ] **Step 8 : Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/model/StoryAdminView.java backend/src/main/java/com/atelier/portfolio/repository/StorySlideRepository.java backend/src/main/java/com/atelier/portfolio/service/StoryService.java backend/src/main/java/com/atelier/portfolio/controller/AdminStoriesController.java backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java
git commit -m "feat(stories): endpoint /api/admin/stories/manage (liste enrichie slideCount+sliders+ownerTitle)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2 — Backend : correctif cover (coverCrop jamais reset par omission)

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/StoryService.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java`

Le bug « le cover ne fonctionne pas » a une cause connue : les updates partielles (renommage notamment, côté front) envoient `coverCrop=null` → `update()` reset le crop. Côté backend, `update()` applique déjà `coverCrop` du `StoryInput`. Le correctif backend garantit qu'un update **préserve** le crop existant quand l'entrée ne fournit ni cover ni crop (sémantique « patch »). On rend `update()` robuste : si `input.coverImage()` est null/blank ET `input.coverCrop()` est null, **ne pas toucher** cover/crop.

- [ ] **Step 1 : Test de régression**

Ajouter dans `StoryServiceTest` :
```java
@Test
void update_sans_cover_preserve_le_crop_existant() {
    Story s = service.create(new StoryInput("furniture", "f-001", "Crop garde",
            "https://example.com/c.jpg", new ImageCrop(5.0, 10.0, 80.0, 60.0)));
    // update "titre seul" : coverImage null, coverCrop null
    service.update(s.id(), new StoryInput("furniture", "f-001", "Renomme", null, null));
    StoryWithSlides reloaded = service.findBySlugWithSlides(s.slug()).orElseThrow();
    assertThat(reloaded.story().title()).isEqualTo("Renomme");
    assertThat(reloaded.story().coverCrop()).isNotNull();
    assertThat(reloaded.story().coverCrop().w()).isEqualTo(80.0);
}
```

- [ ] **Step 2 : Lancer → échec** (le crop est resetté)

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`

- [ ] **Step 3 : Rendre `update()` patch-safe**

Dans `StoryService.update(...)`, remplacer le bloc cover/crop par :
```java
        e.setTitle(input.title());
        boolean coverProvided = input.coverImage() != null && !input.coverImage().isBlank();
        if (coverProvided) {
            e.setCoverImage(input.coverImage());
        }
        // Le crop n'est touche que si une nouvelle cover OU un crop explicite est fourni :
        // un update "titre seul" (cover/crop null) ne reinitialise plus le cadrage.
        if (coverProvided || input.coverCrop() != null) {
            ImageCrop c = input.coverCrop();
            e.setCoverCropX(c != null ? c.x() : null);
            e.setCoverCropY(c != null ? c.y() : null);
            e.setCoverCropW(c != null ? c.w() : null);
            e.setCoverCropH(c != null ? c.h() : null);
        }
```

> Note : `create()` garde sa sémantique actuelle (crop = ce qui est fourni). Le correctif front (Task 7/8) appellera de toute façon `updateStory` avec cover+crop lors d'une vraie édition de cover.

- [ ] **Step 4 : Lancer → vert**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`

- [ ] **Step 5 : Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/service/StoryService.java backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java
git commit -m "fix(stories): update patch-safe — un renommage ne reinitialise plus le cadrage cover" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3 — Frontend : modèle + service `getStoriesForManagement()`

**Files:**
- Modify: `frontend/src/app/models/story.model.ts`
- Modify: `frontend/src/app/services/portfolio.service.ts`
- Modify: `frontend/src/app/services/portfolio.service.spec.ts`

- [ ] **Step 1 : Modèle**

Dans `story.model.ts`, ajouter :
```ts
export interface StorySliderRef { id: string; title: string; }

export interface StoryAdminView {
  id: string;
  ownerKind: 'furniture' | 'exhibition';
  ownerId: string;
  ownerTitle: string;
  title: string;
  coverImage: string;
  coverCrop?: Crop | null;
  slug: string;
  position: number;
  slideCount: number;
  sliders: StorySliderRef[];
}
```
(importer `Crop` est déjà fait en tête du fichier.)

- [ ] **Step 2 : Test service**

Dans `portfolio.service.spec.ts`, ajouter (suivre le style des autres tests HTTP du fichier) :
```ts
it('getStoriesForManagement appelle GET /api/admin/stories/manage', () => {
  service.getStoriesForManagement().subscribe();
  const req = httpMock.expectOne('/api/admin/stories/manage');
  expect(req.request.method).toBe('GET');
  req.flush([]);
});
```

- [ ] **Step 3 : Lancer → échec**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`

- [ ] **Step 4 : Méthode service**

Dans `portfolio.service.ts`, près de `getAdminStories` :
```ts
  getStoriesForManagement(): Observable<StoryAdminView[]> {
    return this.http.get<StoryAdminView[]>(`${API}/admin/stories/manage`);
  }
```
(ajouter `StoryAdminView` à l'import depuis `../models/story.model`.)

- [ ] **Step 5 : Lancer → vert** · **Step 6 : Commit**

```bash
git add frontend/src/app/models/story.model.ts frontend/src/app/services/portfolio.service.ts frontend/src/app/services/portfolio.service.spec.ts
git commit -m "feat(stories): modele StoryAdminView + getStoriesForManagement()" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4 — Frontend : route `/admin/stories` + entrée nav + composant liste (squelette)

**Files:**
- Create: `frontend/src/app/pages/admin/stories/stories-admin.component.ts`
- Create: `frontend/src/app/pages/admin/stories/stories-admin.component.spec.ts`
- Modify: `frontend/src/app/pages/admin/admin.routes.ts`
- Modify: `frontend/src/app/pages/admin/admin-layout.component.ts`

- [ ] **Step 1 : Spec liste (squelette)**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StoriesAdminComponent } from './stories-admin.component';
import { PortfolioService } from '../../../services/portfolio.service';
import { StoryAdminView } from '../../../models/story.model';

describe('StoriesAdminComponent', () => {
  let fixture: ComponentFixture<StoriesAdminComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  const rows: StoryAdminView[] = [
    { id: 'st-1', ownerKind: 'furniture', ownerId: 'f-1', ownerTitle: 'Tabouret', title: 'Story A', coverImage: '/c.jpg', coverCrop: null, slug: 'a', position: 0, slideCount: 3, sliders: [{ id: 'sl-1', title: 'Accueil' }] },
    { id: 'st-2', ownerKind: 'exhibition', ownerId: 'e-1', ownerTitle: 'Lumen', title: 'Story B', coverImage: '/d.jpg', coverCrop: null, slug: 'b', position: 0, slideCount: 0, sliders: [] },
  ];

  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService', ['getStoriesForManagement']);
    portfolio.getStoriesForManagement.and.returnValue(of(rows));
    await TestBed.configureTestingModule({
      imports: [StoriesAdminComponent],
      providers: [provideHttpClient(), provideRouter([]), { provide: PortfolioService, useValue: portfolio }],
    }).compileComponents();
    fixture = TestBed.createComponent(StoriesAdminComponent);
    fixture.detectChanges();
  });

  function rowsEls(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.story-row')); }

  it('liste les stories', () => {
    expect(rowsEls().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Story A');
  });

  it('signale une story vide', () => {
    expect(fixture.nativeElement.textContent).toContain('vide');
  });

  it('filtre par recherche', () => {
    const input = fixture.nativeElement.querySelector('input[aria-label="Rechercher une story"]') as HTMLInputElement;
    input.value = 'Story A'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(rowsEls().length).toBe(1);
  });
});
```

- [ ] **Step 2 : Lancer → échec** (composant absent)

- [ ] **Step 3 : Implémenter le composant liste**

`stories-admin.component.ts` — standalone, signals. Inputs : aucun. Charge `getStoriesForManagement()` au constructeur dans un signal `rows`. Filtre par `ownerFilter` (signal `'all'|'furniture'|'exhibition'`) + `search` (signal). `computed filtered`. Template : en-tête avec « + Nouvelle story » (bouton ouvrant la modale — câblé en Task 5, pour l'instant un signal `createOpen`), barre filtres (select owner + input recherche `aria-label="Rechercher une story"`), liste de `.story-row` (vignette `<app-cropped-image-canvas mode="cover">`, titre, badge owner + ownerTitle, `slideCount`, sliders, « ⚠ vide » si `slideCount===0`, actions : « Éditer » → `routerLink ['/admin/stories', row.id]`, « Cover » → `coverEdit.set(row)`, « Supprimer » → `onDelete(row)`, ↑/↓ → `onReorder`). Réutilise `ToastService`. Utilise `@if`/`@for`, copie FR.

Squelette (logique clé) :
```ts
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';
import { StoryAdminView } from '../../../models/story.model';
import { CroppedImageCanvasComponent } from '../shared/cropped-image-canvas.component';

@Component({
  selector: 'app-stories-admin',
  standalone: true,
  imports: [RouterLink, CroppedImageCanvasComponent],
  template: ` ... voir description ci-dessus ... `,
  styles: [` /* styles cohérents avec les autres pages admin */ `],
})
export class StoriesAdminComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<StoryAdminView[]>([]);
  protected readonly ownerFilter = signal<'all' | 'furniture' | 'exhibition'>('all');
  protected readonly search = signal('');
  protected readonly createOpen = signal(false);

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const f = this.ownerFilter();
    return this.rows()
      .filter(r => f === 'all' || r.ownerKind === f)
      .filter(r => !q || r.title.toLowerCase().includes(q) || r.ownerTitle.toLowerCase().includes(q));
  });

  constructor() { this.reload(); }

  protected reload(): void {
    this.portfolio.getStoriesForManagement().subscribe(r => this.rows.set(r));
  }

  protected onDelete(row: StoryAdminView): void {
    if (!confirm(`Supprimer la story « ${row.title} » et ses slides ?`)) return;
    this.portfolio.deleteStory(row.id).subscribe({
      next: () => { this.rows.update(a => a.filter(x => x.id !== row.id)); this.toast.success('Story supprimée.'); },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }
  // onReorder (↑/↓) : updateStoryPosition au sein du même owner, puis reload().
}
```
> Le template complet, les styles, et `onReorder` sont à écrire en suivant le style des pages admin existantes (ex. `sliders.component.ts`). La modale de création (`createOpen`) et l'édition de cover (`coverEdit`) sont câblées en Tasks 5 et 6.

- [ ] **Step 4 : Route + nav**

Dans `admin.routes.ts`, ajouter dans `children` (avant le redirect `sliders`) :
```ts
      {
        path: 'stories',
        loadComponent: () => import('./stories/stories-admin.component').then(m => m.StoriesAdminComponent),
        title: 'Stories — Administration',
      },
      {
        path: 'stories/:id',
        loadComponent: () => import('./stories/story-slide-editor.component').then(m => m.StorySlideEditorComponent),
        title: 'Édition d’une story — Administration',
      },
```
> `stories/:id` charge le composant de la Task 7 ; créer un stub minimal maintenant si nécessaire pour compiler, ou ajouter cette route en Task 7. **Recommandation : ajouter la route `stories` ici, et la route `stories/:id` en Task 7** pour éviter un import cassé.

Dans `admin-layout.component.ts`, sous le groupe `CONTENU`, ajouter après Expositions :
```html
            <a class="nav-item" routerLink="/admin/stories" routerLinkActive="active">Stories</a>
```

- [ ] **Step 5 : Lancer → vert** (suite front) · **Step 6 : Commit**

```bash
git add frontend/src/app/pages/admin/stories/ frontend/src/app/pages/admin/admin.routes.ts frontend/src/app/pages/admin/admin-layout.component.ts
git commit -m "feat(stories): page /admin/stories (liste+filtres) + entree nav" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5 — Frontend : modale de création `StoryCreateModalComponent`

**Files:**
- Create: `frontend/src/app/pages/admin/stories/story-create-modal.component.ts`
- Create: `frontend/src/app/pages/admin/stories/story-create-modal.component.spec.ts`
- Modify: `frontend/src/app/pages/admin/stories/stories-admin.component.ts` (câblage `createOpen` + navigation après création)

- [ ] **Step 1 : Spec**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { StoryCreateModalComponent } from './story-create-modal.component';
import { PortfolioService } from '../../../services/portfolio.service';

describe('StoryCreateModalComponent', () => {
  let fixture: ComponentFixture<StoryCreateModalComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService',
      ['getAllFurniture', 'getAllExhibitions', 'getAdminSliders', 'createStory', 'replaceSliderStories']);
    portfolio.getAllFurniture.and.returnValue(of([{ slug: 'f1', title: 'Meuble 1' } as any]));
    portfolio.getAllExhibitions.and.returnValue(of([{ slug: 'e1', title: 'Expo 1' } as any]));
    portfolio.getAdminSliders.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [StoryCreateModalComponent],
      providers: [provideHttpClient(), { provide: PortfolioService, useValue: portfolio }],
    }).compileComponents();
    fixture = TestBed.createComponent(StoryCreateModalComponent);
    fixture.detectChanges();
  });

  it('création : appelle createStory avec owner + titre', () => {
    const created: { id: string } | null = null as any;
    let emitted: string | null = null;
    portfolio.createStory.and.returnValue(of({ id: 'st-new' } as any));
    fixture.componentInstance.created.subscribe(id => emitted = id);
    const c = fixture.componentInstance;
    c.ownerKey.set('furniture::f1'); c.title.set('Ma story');
    c.submit();
    expect(portfolio.createStory).toHaveBeenCalled();
    expect(emitted).toBe('st-new');
  });
});
```

- [ ] **Step 2 : Lancer → échec** · **Step 3 : Implémenter**

`story-create-modal.component.ts` — modale `role="dialog"` `aria-modal` `cdkTrapFocus`. Inputs : `presetOwner?: {kind, id} | null`. Outputs : `created = EventEmitter<string>()` (id de la nouvelle story), `cancel = EventEmitter<void>()`. Charge `getAllFurniture()`, `getAllExhibitions()`, `getAdminSliders()` au ngOnInit dans des signals. Owner picker = `<select>` peuplé de `furniture::<slug ou id>` et `exhibition::<...>` (utiliser l'`id` technique de l'owner : pour furniture/exhibition, l'owner d'une story est l'**id** technique — le `createStory` attend `ownerId`. Mapper depuis la liste). Champs : `title` (signal), cover via `<app-image-field cropEnabled [formControl]>` + crop signal, `sliderId` optionnel (`<select>`). `submit()` :
```ts
submit(): void {
  const [kind, id] = this.ownerKey().split('::');
  if (!kind || !id || !this.title().trim()) return;
  this.portfolio.createStory({
    ownerKind: kind as 'furniture' | 'exhibition', ownerId: id,
    title: this.title().trim(), coverImage: this.coverCtrl.value ?? '', coverCrop: this.coverCrop(),
  }).subscribe(story => {
    const sid = this.sliderId();
    if (sid) {
      const slider = this.sliders().find(s => s.id === sid);
      const ids = [...(slider?.storyIds ?? []), story.id];
      this.portfolio.replaceSliderStories(sid, ids).subscribe();
    }
    this.created.emit(story.id);
  });
}
```
> ⚠ L'owner d'une story est l'**id technique** du meuble/expo (`f-xxxx`/`e-xxxx`), pas le slug. La liste `getAllFurniture()` renvoie des `Furniture` qui ont `id`. Construire `ownerKey = kind + '::' + item.id` et le label = titre. Vérifier le champ `id` sur le modèle `Furniture`/`Exhibition` front.

Dans `stories-admin.component.ts` : importer `StoryCreateModalComponent`, l'afficher `@if (createOpen())`, sur `(created)="onStoryCreated($event)"` → naviguer vers `/admin/stories/<id>` (router) ; sur `(cancel)="createOpen.set(false)"`. « + Nouvelle story » → `createOpen.set(true)`.

- [ ] **Step 4 : Lancer → vert** · **Step 5 : Commit**

```bash
git add frontend/src/app/pages/admin/stories/
git commit -m "feat(stories): modale de creation (owner + titre + cover/crop + ajout slider)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6 — Frontend : édition du cover depuis la page Stories (correctif end-to-end)

**Files:**
- Modify: `frontend/src/app/pages/admin/stories/stories-admin.component.ts` (+ spec)

Édition du cover d'une story existante depuis la liste, avec préservation du crop (s'appuie sur le backend patch-safe de Task 2).

- [ ] **Step 1 : Spec** — « clic Cover ouvre l'éditeur ; saveCover appelle `updateStory` avec coverImage + coverCrop ».
- [ ] **Step 2 : Lancer → échec.**
- [ ] **Step 3 : Implémenter** — signal `coverEdit = signal<StoryAdminView | null>(null)` ; un `<app-image-field cropEnabled [formControl]="coverCtrl" [cropValue]="coverCropSig()" (cropChange)="coverCropSig.set($event)">` dans un petit panneau `@if (coverEdit())`. `saveCover()` :
```ts
saveCover(): void {
  const row = this.coverEdit(); if (!row) return;
  this.portfolio.updateStory(row.id, {
    ownerKind: row.ownerKind, ownerId: row.ownerId,
    title: row.title, coverImage: this.coverCtrl.value ?? '', coverCrop: this.coverCropSig(),
  }).subscribe({ next: () => { this.coverEdit.set(null); this.reload(); this.toast.success('Cover mise à jour.'); },
                 error: () => this.toast.error('Erreur lors de la mise à jour.') });
}
```
> `updateStory` envoie **toujours** title+cover+crop ensemble → plus de reset. (Backend Task 2 protège aussi les updates « titre seul ».)
- [ ] **Step 4 : Lancer → vert** · **Step 5 : Commit** `fix(stories): edition du cover avec preservation du cadrage (page Stories)`.

---

## Task 7 — Frontend : éditeur de slides deux panneaux `/admin/stories/:id`

**Files:**
- Create: `frontend/src/app/pages/admin/stories/story-slide-editor.component.ts`
- Create: `frontend/src/app/pages/admin/stories/story-slide-editor.component.spec.ts`
- Modify: `frontend/src/app/pages/admin/admin.routes.ts` (route `stories/:id` — si pas déjà ajoutée en Task 4)

**Réutilisation :** lire `frontend/src/app/components/story-inline/story-inline.component.ts` — il porte déjà l'édition des 4 types (`addSlide`/`insertSlide`/`deleteSlide`/`onReorder`/`onCaptionBlur`/`onVideoUrlChange`/`onQuoteBlur`/`onSpecCellBlur`/`addSpecRow`/`removeSpecRow`/`newSlide`) et l'auto-save via `slidesChange`. **Reprendre cette logique** dans le panneau droit (édition du slide sélectionné), avec un **rail gauche** de vignettes (sélection + `appReorderable` + ajout/suppression).

- [ ] **Step 1 : Spec** (squelette)

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { StorySlideEditorComponent } from './story-slide-editor.component';
import { PortfolioService } from '../../../services/portfolio.service';
import { Slide } from '../../../models/slide.model';

describe('StorySlideEditorComponent', () => {
  let fixture: ComponentFixture<StorySlideEditorComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;
  const slides: Slide[] = [
    { id: 's1', position: 0, type: 'image', src: '/a.jpg', caption: null },
    { id: 's2', position: 1, type: 'quote', body: 'Texte', cite: null },
  ];
  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService', ['getStorySlides', 'replaceStorySlides']);
    portfolio.getStorySlides.and.returnValue(of(slides));
    portfolio.replaceStorySlides.and.returnValue(of(slides));
    await TestBed.configureTestingModule({
      imports: [StorySlideEditorComponent],
      providers: [
        provideHttpClient(), provideRouter([]),
        { provide: PortfolioService, useValue: portfolio },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'st-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(StorySlideEditorComponent);
    fixture.detectChanges();
  });
  it('charge les slides et affiche le rail', () => {
    expect(portfolio.getStorySlides).toHaveBeenCalledWith('st-1');
    expect(fixture.nativeElement.querySelectorAll('.rail-item').length).toBe(2);
  });
  it('sélectionne un slide au clic', () => {
    const items = fixture.nativeElement.querySelectorAll('.rail-item');
    items[1].click(); fixture.detectChanges();
    expect(fixture.componentInstance.selectedIndex()).toBe(1);
  });
  it('ajoute un slide et auto-save', () => {
    fixture.componentInstance.addSlide('quote');
    expect(portfolio.replaceStorySlides).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer → échec** · **Step 3 : Implémenter**

`story-slide-editor.component.ts` — standalone, signals. Lit `:id` via `ActivatedRoute`. État : `slides = signal<Slide[]>([])`, `selectedIndex = signal(0)`. `getStorySlides(id)` au constructeur. **Rail gauche** : `@for` sur `slides()` → `.rail-item` (numéro + type + vignette), `appReorderable (reordered)="onReorder($event)"`, clic → `selectedIndex.set(i)`, bouton supprimer, barre d'ajout (`+ Image/Vidéo/Spec/Citation` → `addSlide(type)`). **Panneau droit** : éditeur du `slides()[selectedIndex()]` selon type — **reprendre les handlers de `story-inline`** (`onCaptionBlur`/`onVideoUrlChange`/`onQuoteBlur`/`onSpecCellBlur`/`addSpecRow`/`removeSpecRow`, et pour l'image le crop via `<app-image-crop-picker>` + `<app-image-field>`). Toute mutation → `commit(next)` qui `slides.set(next)` + **auto-save** `replaceStorySlides(id, next).subscribe()`. **Bouton « Aperçu »** → ouvre `<app-story-viewer>` (importer ; lui passer la story courante + slides). En-tête : lien retour « ← Stories » (`routerLink /admin/stories`). a11y : rail navigable (boutons), `aria-live` annonçant ajout/suppression/réordre, focus visible.

`newSlide(type)` (repris de story-inline) :
```ts
private newSlide(type: Slide['type']): Slide {
  const id = 'sl-' + Math.random().toString(36).slice(2, 10);
  switch (type) {
    case 'image': return { id, position: 0, type: 'image', src: '', caption: null, crop: null };
    case 'video': return { id, position: 0, type: 'video', src: '', caption: null };
    case 'spec':  return { id, position: 0, type: 'spec', specs: [] };
    case 'quote': return { id, position: 0, type: 'quote', body: '', cite: null };
  }
}
addSlide(type: Slide['type']): void {
  const next = [...this.slides(), this.newSlide(type)].map((s, i) => ({ ...s, position: i }));
  this.commit(next);
  this.selectedIndex.set(next.length - 1);
}
private commit(next: Slide[]): void {
  this.slides.set(next);
  this.portfolio.replaceStorySlides(this.storyId, next).subscribe(saved => this.slides.set(saved));
}
onReorder(order: number[]): void {
  const cur = this.slides();
  this.commit(order.map((srcIdx, i) => ({ ...cur[srcIdx], position: i })));
}
```
> Le rendu/édition par type et le crop image sont à reprendre fidèlement de `story-inline` (lire le fichier). Garder l'auto-save (`replaceStorySlides`) cohérent.

- [ ] **Step 4 : Lancer → vert** · **Step 5 : Commit**

```bash
git add frontend/src/app/pages/admin/stories/story-slide-editor.component.ts frontend/src/app/pages/admin/stories/story-slide-editor.component.spec.ts frontend/src/app/pages/admin/admin.routes.ts
git commit -m "feat(stories): editeur de slides deux panneaux (/admin/stories/:id, rail + editeur 4 types + apercu + auto-save)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8 — Frontend : retrait du bloc Stories des fiches + lien « Gérer les stories »

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` (+ spec)
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts` (+ spec)
- Modify: vues détail / preview si elles hébergent la gestion des stories (`story-inline` en mode editable + `story-manager-bar`)

**Lire d'abord** les deux composants admin + leur usage de `story-inline`/`story-manager-bar` dans le preview. Retirer la **gestion** des stories (création/rename/cover/suppression/réordre + édition slides in-preview), en conservant le reste de l'éditeur de fiche intact (cover fiche, galerie, tags, vidéo). La story n'étant plus rendue sur la fiche publique (SP6a), aucun rendu public n'est impacté.

- [ ] **Step 1 : Spec** — vérifier que la fiche admin n'affiche plus le bloc Stories et expose un lien « Gérer les stories » → `/admin/stories?ownerKind=furniture&ownerId=<id>` (ex. mobilier). Adapter les specs existants qui testaient `newStory`/`renameStory`/cover story (les supprimer ou les déplacer).
- [ ] **Step 2 : Lancer → échec/rouge.**
- [ ] **Step 3 : Implémenter** — supprimer les méthodes et le template du bloc Stories (form-side + in-preview) dans mobilier/expo ; retirer les imports devenus inutiles (`StoryInlineComponent`, `StoryManagerBarComponent`, etc. s'ils ne servent plus) ; ajouter un bouton/lien « Gérer les stories » (routerLink vers `/admin/stories` avec query params owner). Nettoyer les handlers `onPreviewStory*`.
> ⚠ Vérifier que `furniture-detail-view`/`exhibition-detail-view` n'exigent plus les Inputs/Outputs liés à la gestion des stories (les rendre optionnels ou les retirer) ; conserver le `StoryManagerBarComponent`/`story-inline` UNIQUEMENT si encore utilisés ailleurs (sinon supprimer les fichiers et leurs specs).
- [ ] **Step 4 : Lancer → vert** (suite front + back) · **Step 5 : Commit**

```bash
git commit -am "refactor(stories): retrait du bloc Stories des fiches mobilier/expo + lien « Gerer les stories »" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Après toutes les tâches

1. **Revue finale holistique** du diff de branche (intégration page↔modale↔éditeur↔backend ; cover fix ; suppression propre côté fiches).
2. **Redéploiement** back+front (`docker compose up --build -d backend frontend`).
3. **Validation visuelle utilisateur** : créer une story (owner + cover + cadrage + slider) → éditeur deux panneaux (ajout/réordre/types/aperçu) → vérifier le **cover cadré** (création, renommage qui ne reset plus, rendu viewer/news-slider) → liste (filtres, slideCount, sliders, vide) → fiche : plus de bloc Stories, lien « Gérer les stories » OK.
4. **Playwright** sans `--update` (admin hors baselines publiques) ; régénérer seulement si une page publique bouge (a priori non).
5. **Audits avant merge** : **RGAA** (modale, éditeur clavier/drag/aria-live/focus, intitulés) ; **sécurité** allégée (endpoint `/manage` = lecture admin JWT, pas de nouvelle surface d'écriture) — proposer, corriger les findings.
6. **Doc** : `SPECIFICATION_TECHNIQUE.md` (endpoint `/manage`, page Stories, éditeur 2 panneaux, route) ; `SPECIFICATION_FONCTIONNELLE.md` (parcours stories) ; envisager un ADR (page Stories dédiée = nouvelle IA admin).
7. **Merge** sur `main` après confirmation explicite utilisateur.

---

## Self-review (effectuée)

- **Couverture spec** : page dédiée+nav (T4), modale création+owner+slider (T5), cover fix back (T2)+front (T6), éditeur 2 panneaux (T7), endpoint enrichi (T1)+service front (T3), retrait fiches (T8). Tous les points du backlog couverts.
- **Cohérence types** : `StoryAdminView` (back T1 ↔ front T3) champs identiques ; `getStoriesForManagement()` consommé en T4 ; `createStory(StoryInput)` signature respectée (T5) ; `replaceStorySlides` auto-save (T7) ; `coverCrop` patch-safe (T2) consommé par T6.
- **Placeholders** : les composants volumineux (T4/T5/T7/T8) fournissent interfaces + logique clé en entier et **référencent explicitement `story-inline`/`sliders.component` à lire** pour le détail répétitif (édition par type, styles) — choix assumé vu la taille ; le code nouveau (rail, sélection, commit/auto-save, manage endpoint, owner picker, cover save) est fourni.
- **Risque** : T8 (retrait) doit vérifier les dépendances `story-inline`/`story-manager-bar` (réutilisés par l'éditeur 2 panneaux en T7 — NE PAS supprimer `story-inline` si T7 en réutilise des morceaux ; préférer extraire la logique partagée). Ordre conseillé : T1→T7 puis T8 en dernier.
