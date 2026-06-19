# Perf images Phase 1 — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réduire le temps de chargement des images via cache HTTP immuable (backend) + lazy-loading des images canvas sous la ligne de flottaison + `decoding="async"` (frontend), sans pipeline de variantes.

**Architecture:** Le backend pose un `Cache-Control` immuable sur les fichiers servis (noms UUID content-immutables). Le composant partagé `<app-cropped-image-canvas>` gagne un input opt-in `lazy` (chargement différé via `IntersectionObserver`, fallback eager) et `priority` (`fetchPriority='high'` pour la cover LCP) ; on l'active sur les galeries/cards publiques (lazy) et les covers (priority). Les `<img>` bruts reçoivent `decoding="async"`.

**Tech Stack:** Spring Boot (PhotoController + `CacheControl`), Angular 21 (signals, IntersectionObserver). Tests : backend `mvn` (test Mockito du contrôleur), frontend Karma+Jasmine via Docker.

**Branche :** `feat/perf-images-phase1` (créée, spec commitée).

**Spec :** `docs/superpowers/specs/2026-06-19-perf-images-phase1-design.md`

**Baselines tests :** backend et frontend verts au début (constater). Chaque tâche rapporte le compte exact.

**Garde-fous projet :** apostrophes `'` intactes ; `@if`/`@for` ; style `@Input()`/`@Output()` (cropped-image-canvas est en décorateurs) ; edits ciblés ; copie FR.

---

## Structure des fichiers

| Fichier | Rôle | Tâche |
| --- | --- | --- |
| `backend/.../controller/PhotoController.java` (+ test) | Cache-Control immuable sur `serve`. | 1 |
| `frontend/.../pages/admin/shared/cropped-image-canvas.component.ts` (+ spec) | Inputs `lazy` (IntersectionObserver) + `priority` (fetchPriority). | 2 |
| `furniture-detail-view` / `exhibition-detail-view` / `home-view` (+ specs) | `[lazy]="true"` sur galeries/cards publiques ; `[priority]="true"` sur covers hero. | 3 |
| `news-slider.component.ts` / `story-inline.component.ts` (+ specs) | `decoding="async"` sur les `<img>` bruts (déjà `loading="lazy"`). | 4 |

---

## Task 1 : Cache HTTP immuable (backend)

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/PhotoController.java`
- Test: `backend/src/test/java/com/atelier/portfolio/controller/PhotoControllerTest.java`

État actuel de `serve` :
```java
    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) throws IOException {
        Resource resource = service.loadAsResource(filename);
        if (resource == null) {
            return ResponseEntity.notFound().build();
        }
        String contentType = contentTypeFor(filename);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }
```

- [ ] **Step 1 : Test (rouge)** — ajouter dans `PhotoControllerTest` :
```java
    @Test
    void serve_pose_un_cache_control_immuable_longue_duree() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("photo.jpg")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("photo.jpg");

        String cacheControl = result.getHeaders().getCacheControl();
        assertNotNull(cacheControl);
        assertTrue(cacheControl.contains("max-age=31536000"), "doit cacher 1 an : " + cacheControl);
        assertTrue(cacheControl.contains("immutable"), "doit etre immutable : " + cacheControl);
    }
```

- [ ] **Step 2 : Lancer le test → échec.**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test` (ou `mvn -Dtest=PhotoControllerTest test`)
Expected: FAIL (cacheControl null).

- [ ] **Step 3 : Implémenter** — ajouter le `Cache-Control` sur la réponse `serve` (import `org.springframework.http.CacheControl` + `java.time.Duration`) :
```java
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic().immutable())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
```
(`CacheControl.maxAge(365 jours).cachePublic().immutable()` produit `max-age=31536000, public, immutable`. Ajouter l'import `import org.springframework.http.CacheControl;`.)

- [ ] **Step 4 : Lancer le test → vert.** Vérifier que les autres tests de `PhotoControllerTest` (content-type, 404, content-disposition) passent toujours. Rapporter le résultat backend (BUILD SUCCESS + nb tests).

- [ ] **Step 5 : Commit**
```powershell
git add backend/src/main/java/com/atelier/portfolio/controller/PhotoController.java backend/src/test/java/com/atelier/portfolio/controller/PhotoControllerTest.java
git commit -m "perf(photos): cache HTTP immuable (max-age 1 an) sur les fichiers images servis"
```

---

## Task 2 : `cropped-image-canvas` — inputs `lazy` + `priority`

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/cropped-image-canvas.component.ts`
- Test: `frontend/src/app/pages/admin/shared/cropped-image-canvas.component.spec.ts`

LIS le composant (structure actuelle : `@Input() imageUrl/crop/alt/mode/targetHeight/maxWidth`, `ngAfterViewInit` qui appelle `render()` + crée un `ResizeObserver` pour `cover`/`fit`, `ngOnChanges` → `queueMicrotask(render)`, `render()` avec la garde `requestedUrl !== this.imageUrl`, `ngOnDestroy` qui déconnecte le ResizeObserver, un cache `cachedImage`).

Comportement visé :
- `lazy=false` (défaut) → **inchangé** (rendu immédiat).
- `lazy=true` → ne rend QUE lorsque l'hôte approche du viewport (`IntersectionObserver`, `rootMargin: '200px'`, déconnexion après 1re intersection). Avant ça, ne crée aucune `Image`.
- Sans `IntersectionObserver` (test/vieux navigateur) → fallback eager (rendu immédiat).
- `priority=true` → l'`Image` créée dans `render()` reçoit `fetchPriority = 'high'`.

- [ ] **Step 1 : Tests (rouge)** — ajouter au spec (mocker `IntersectionObserver` pour capter le callback) :
```typescript
  it('lazy=true : ne crée pas d\'Image tant que pas intersecté, puis rend à l\'intersection', () => {
    // Mock IntersectionObserver capturant le callback + l'instance
    let ioCallback: ((entries: any[]) => void) | null = null;
    const observe = jasmine.createSpy('observe');
    const disconnect = jasmine.createSpy('disconnect');
    (window as any).IntersectionObserver = class {
      constructor(cb: any) { ioCallback = cb; }
      observe = observe; disconnect = disconnect; unobserve = () => {};
    };
    const imageSpy = spyOn(window as any, 'Image').and.callThrough();

    // créer le composant avec [lazy]="true" + imageUrl (data URI), detectChanges (ngAfterViewInit)
    // ... setup TestBed ...
    expect(imageSpy).not.toHaveBeenCalled();         // rien chargé tant que pas visible
    expect(observe).toHaveBeenCalled();

    ioCallback!([{ isIntersecting: true }]);          // simule l'entrée dans le viewport
    expect(imageSpy).toHaveBeenCalled();              // chargement déclenché
    expect(disconnect).toHaveBeenCalled();            // IO déconnecté après 1re intersection
  });

  it('lazy=false (défaut) : rend immédiatement (Image créée au render)', () => {
    const imageSpy = spyOn(window as any, 'Image').and.callThrough();
    // créer le composant SANS lazy + imageUrl, detectChanges
    expect(imageSpy).toHaveBeenCalled();
  });

  it('priority=true : l\'Image reçoit fetchPriority high', () => {
    // créer avec [priority]="true" (lazy=false), capter l'Image créée, vérifier img.fetchPriority === 'high'
    // (spy sur Image renvoyant un objet capturé, ou vérifier via le prototype)
  });
```
(Adapte au harnais du spec existant — instanciation directe ; restaure `window.IntersectionObserver`/`Image` en `afterEach` pour ne pas polluer les autres tests. Si le 3e test est trop fragile à câbler, garde au moins les 2 premiers + un test que `priority` ne casse pas le rendu.)

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter**

Ajouter les inputs + l'état lazy :
```typescript
  @Input() lazy = false;
  @Input() priority = false;

  private lazyObserver?: IntersectionObserver;
  /** Passe à true dès que le chargement est autorisé (intersection en lazy, ou immédiat sinon). */
  private intersected = false;
```
Modifier `ngAfterViewInit` :
```typescript
  ngAfterViewInit(): void {
    if (this.lazy && typeof IntersectionObserver !== 'undefined' && this.canvasRef) {
      this.lazyObserver = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
          this.intersected = true;
          this.lazyObserver?.disconnect();
          this.lazyObserver = undefined;
          this.render();
        }
      }, { rootMargin: '200px' });
      this.lazyObserver.observe(this.canvasRef.nativeElement);
    } else {
      // eager (défaut) ou fallback sans IntersectionObserver
      this.intersected = true;
      this.render();
    }
    if ((this.mode === 'cover' || this.mode === 'fit') && this.canvasRef && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.render());
      this.resizeObserver.observe(this.canvasRef.nativeElement);
    }
  }
```
Modifier `ngOnChanges` pour ne pas rendre tant que le lazy n'a pas déclenché (NB : `ngOnChanges` s'exécute AVANT `ngAfterViewInit` au 1er cycle → le flag `intersected` garantit qu'on ne charge pas trop tôt en lazy) :
```typescript
  ngOnChanges(): void {
    // En lazy tant que pas intersecté, on attend l'IntersectionObserver (sinon on charge trop tôt).
    if (this.lazy && !this.intersected) return;
    queueMicrotask(() => this.render());
  }
```
Dans `render()`, après `const img = new Image();` et `img.crossOrigin = 'anonymous';`, ajouter la priorité :
```typescript
    if (this.priority) {
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
    }
```
(Conserver la garde `requestedUrl !== this.imageUrl` et le reste de `render()`.)
`ngOnDestroy` : déconnecter aussi le lazy observer :
```typescript
  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.lazyObserver?.disconnect();
  }
```
Implémenter `OnChanges`/`OnDestroy` sont déjà dans la signature de classe (le composant implémente déjà `AfterViewInit, OnChanges, OnDestroy`).

- [ ] **Step 4 : Suite → vert.** Compte exact. Vérifier que les usages existants (sans `lazy`) sont inchangés (tests cover/fit/contain/adaptive toujours verts).

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/pages/admin/shared/cropped-image-canvas.component.ts frontend/src/app/pages/admin/shared/cropped-image-canvas.component.spec.ts
git commit -m "perf(images): cropped-image-canvas - inputs lazy (IntersectionObserver) + priority (fetchPriority)"
```

---

## Task 3 : Activer lazy/priority sur les usages publics

**Files:**
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts` (+ `.spec.ts`)
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts` (+ `.spec.ts`)
- Modify: `frontend/src/app/components/home-view/home-view.component.ts` (+ `.spec.ts`)

Cibles (vérifier les lignes en lisant) :
- **furniture-detail-view** : cover hero `<app-cropped-image-canvas>` (≈ ligne 28, dans `.hero-bg`) → ajouter `[priority]="true"`. Galerie **publique** (`@else`, ≈ ligne 178, dans `.gallery-img-wrap`) → ajouter `[lazy]="true"`. NE PAS toucher la galerie editable (≈ ligne 142).
- **exhibition-detail-view** : cover hero (≈ ligne 30) → `[priority]="true"`. Galerie publique (≈ ligne 213) → `[lazy]="true"`. Galerie editable (≈ 179) inchangée.
- **home-view** : card **publique** (`@else`, ≈ ligne 164, dans `.thumb`) → `[lazy]="true"`. Card editable (≈ 135, preview admin) inchangée. (Pas de cover hero canvas dans home-view.)

CLS : vérifier que les conteneurs des canvas lazifiés réservent leur hauteur (galerie : `figure` sous `grid-auto-rows: 220px` → OK ; home `.thumb` : a un `aspect-ratio` → vérifier ; sinon ajouter `aspect-ratio`). N'ajouter une règle que si un conteneur lazifié n'a pas de hauteur/aspect réservé.

- [ ] **Step 1 : Tests (rouge)** — pour chaque vue, vérifier le binding via `By.directive(CroppedImageCanvasComponent)` :
```typescript
  it('galerie publique : le canvas est en lazy', () => {
    // mode public, item avec gallery ; detectChanges
    const canvases = fixture.debugElement.queryAll(By.directive(CroppedImageCanvasComponent));
    const galleryCanvas = canvases.find(c => c.componentInstance.lazy === true);
    expect(galleryCanvas).toBeTruthy();
  });

  it('cover hero : le canvas est en priority (et non lazy)', () => {
    // furniture/exhibition detail-view ; detectChanges
    const canvases = fixture.debugElement.queryAll(By.directive(CroppedImageCanvasComponent));
    const hero = canvases.find(c => c.componentInstance.priority === true);
    expect(hero).toBeTruthy();
    expect(hero!.componentInstance.lazy).toBeFalse();
  });
```
(home-view : test « card publique en lazy ». Importer `By` + `CroppedImageCanvasComponent` si absents. Adapter le harnais — fournir item/data + mode public.)

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter** — ajouter les bindings `[priority]="true"` (covers hero) et `[lazy]="true"` (galeries publiques + card publique home) aux balises identifiées. Vérifier/compléter le CSS de réservation de hauteur si nécessaire (home `.thumb`).

- [ ] **Step 4 : Suite → vert.** Compte exact.

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/components/furniture-detail-view/ frontend/src/app/components/exhibition-detail-view/ frontend/src/app/components/home-view/
git commit -m "perf(images): lazy sur galeries/cards publiques, priority sur covers hero"
```

---

## Task 4 : `decoding="async"` sur les `<img>` bruts

**Files:**
- Modify: `frontend/src/app/components/news-slider/news-slider.component.ts` (+ `.spec.ts`)
- Modify: `frontend/src/app/components/story-inline/story-inline.component.ts` (+ `.spec.ts`)

- **news-slider** : la vignette `<img ... loading="lazy" ...>` (≈ ligne 31) → ajouter `decoding="async"`.
- **story-inline** : l'`<img>` du rendu **lecture seule** (case `image`, qui a déjà `loading="lazy"`) → ajouter `decoding="async"`. (Le mode éditable rend un `cropped-image-canvas`, pas concerné.)

- [ ] **Step 1 : Tests (rouge)**
```typescript
  // news-slider.spec
  it('les vignettes ont decoding="async"', () => {
    // fournir un slider avec 1 story ; detectChanges
    const img = fixture.nativeElement.querySelector('.thumb img') as HTMLImageElement;
    expect(img.getAttribute('decoding')).toBe('async');
  });
```
```typescript
  // story-inline.spec (mode lecture seule)
  it('l\'image de slide (lecture seule) a decoding="async"', () => {
    // slides image, editable=false ; detectChanges
    const img = fixture.nativeElement.querySelector('.image img') as HTMLImageElement;
    expect(img.getAttribute('decoding')).toBe('async');
  });
```
(Adapter au harnais des specs existants.)

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter** — ajouter `decoding="async"` à l'`<img>` de la vignette news-slider et à l'`<img>` du case image lecture seule de story-inline. (Attribut statique, pas de binding.)

- [ ] **Step 4 : Suite → vert.** Compte exact.

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/components/news-slider/ frontend/src/app/components/story-inline/
git commit -m "perf(images): decoding=async sur les vignettes news-slider et l'image de slide publique"
```

---

## Après toutes les tâches

1. **Validation visuelle locale** (`docker compose up --build -d backend frontend`) : le rendu est inchangé ; les images de galerie/cards se chargent en approchant du viewport (vérifier dans l'onglet Réseau du navigateur que les images sous la ligne de flottaison ne sont pas chargées au premier paint) ; la cover se charge en priorité.
2. **Mesure avant/après** : Lighthouse (mobile + desktop) sur l'accueil + une fiche mobilier riche → comparer LCP, poids transféré images, requêtes au chargement. (Le cache immuable se vérifie sur la 2e visite / navigation : `Cache-Control` présent, images servies depuis le cache disque.)
3. **Baselines Playwright** : rendu final inchangé → confirmer aucun diff (le lazy ne change que le moment du chargement ; en test Playwright, vérifier que les images attendues sont bien présentes — si le lazy retarde trop, augmenter l'attente du spec ou scroller ; régénérer seulement si diff justifié après validation).
4. **Audits RGAA + sécurité** (sécu : cache d'images publiques = pas de donnée sensible ; RGAA : pas d'impact, le lazy ne change pas la sémantique) puis merge.
5. **Doc** : `SPECIFICATION_TECHNIQUE.md` (cache immuable des images + inputs `lazy`/`priority` de cropped-image-canvas). Mentionner la Phase 2 (variantes/WebP) en backlog.
