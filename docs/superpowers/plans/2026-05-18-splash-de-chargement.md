# Splash de chargement — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Masquer derrière un splash logo+pulse le flash de contenu par défaut visible au cold-start et lors de chaque navigation interne.

**Architecture:** Splash HTML statique dans `index.html` (rendu instantané, avant Angular) **+** overlay Angular `<app-splash>` piloté par un `LoadingService` signal-based qui s'affiche tant qu'une clé (`init` / `nav` / `page`) est active. Cache `shareReplay(1)` sur `PortfolioService.getContent()` pour éviter ~9 GET HTTP redondants au boot.

**Tech Stack:** Angular 21 (standalone components, signals, `@if/@for`), RxJS pour les flux HTTP, Karma + Jasmine (FirefoxHeadless local).

**Spec source:** [docs/superpowers/specs/2026-05-18-splash-de-chargement-design.md](../specs/2026-05-18-splash-de-chargement-design.md)

---

## File Structure

| Fichier | Statut | Responsabilité |
| ------- | ------ | -------------- |
| `frontend/src/app/services/loading.service.ts` | Création | Compteur de clés actives, signal `visible`, gestion du délai minimum 400 ms et du garde-fou 15 s |
| `frontend/src/app/services/loading.service.spec.ts` | Création | Couverture du service |
| `frontend/src/app/components/splash/splash.component.ts` | Création | Overlay Angular (logo + pulse), même look que le splash HTML |
| `frontend/src/app/components/splash/splash.component.spec.ts` | Création | Rendu minimal |
| `frontend/src/index.html` | Modification | Bloc `<div id="app-splash">` + CSS inline dans `<head>` |
| `frontend/src/app/services/portfolio.service.ts` | Modification | `shareReplay(1)` sur `getContent()` + `invalidateContentCache()` + invalidation dans `updateContent()` |
| `frontend/src/app/services/portfolio.service.spec.ts` | Modification | 3 nouveaux tests : cache partagé, invalidation, invalidation via `updateContent` |
| `frontend/src/app/app.component.ts` | Modification | Import `<app-splash>`, `start('init')`, écoute Router |
| `frontend/src/app/app.component.spec.ts` | Création (le fichier n'existe pas) | Vérifie l'init du splash et l'écoute Router |
| `frontend/src/app/pages/home/home.component.ts` | Modification | `start/stop('page')` + `stop('nav')` |
| `frontend/src/app/pages/catalog/catalog.component.ts` | Modification | Idem |
| `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts` | Modification | Idem |
| `frontend/src/app/pages/expositions-list/expositions-list.component.ts` | Modification | Idem |
| `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts` | Modification | Idem |
| `frontend/src/app/pages/studio/studio.component.ts` | Modification | Idem |
| `frontend/src/app/pages/contact/contact.component.ts` | Modification | Idem |

Toutes les modifications sont **frontend uniquement** (aucun changement backend, schéma, ou config CI).

---

## Task 1 : `LoadingService` (TDD)

**Files:**
- Create: `frontend/src/app/services/loading.service.ts`
- Create: `frontend/src/app/services/loading.service.spec.ts`

- [ ] **Step 1.1 : Écrire le spec failing**

Créer `frontend/src/app/services/loading.service.spec.ts` :

```ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LoadingService] });
    service = TestBed.inject(LoadingService);
  });

  it('starts hidden', () => {
    expect(service.visible()).toBe(false);
  });

  it('becomes visible when a key is started', () => {
    service.start('a');
    expect(service.visible()).toBe(true);
  });

  it('stays visible while at least one key is active', fakeAsync(() => {
    service.start('a');
    service.start('b');
    tick(400);
    service.stop('a');
    tick(500);
    expect(service.visible()).toBe(true);
    service.stop('b');
    tick(500);
    expect(service.visible()).toBe(false);
  }));

  it('respects the 400 ms minimum visible duration', fakeAsync(() => {
    service.start('a');
    tick(100);
    service.stop('a');
    tick(100);
    expect(service.visible()).toBe(true);   // pas encore 400 ms écoulés
    tick(300);
    expect(service.visible()).toBe(false);  // 400 ms total écoulés
  }));

  it('hides immediately if 400 ms already elapsed', fakeAsync(() => {
    service.start('a');
    tick(500);
    service.stop('a');
    tick(0);
    expect(service.visible()).toBe(false);
  }));

  it('safety timeout releases a never-stopped key after 15 s', fakeAsync(() => {
    spyOn(console, 'warn');
    service.start('stuck');
    tick(15_000);
    tick(500); // délai min cumulé
    expect(service.visible()).toBe(false);
    expect(console.warn).toHaveBeenCalled();
  }));

  it('removes the static html splash element only once', fakeAsync(() => {
    const el = document.createElement('div');
    el.id = 'app-splash';
    document.body.appendChild(el);

    service.start('a');
    tick(500);
    service.stop('a');
    tick(500);  // déclenchement de hideHtmlSplash
    tick(400);  // fin de la transition

    expect(document.getElementById('app-splash')).toBeNull();

    // Second cycle ne doit pas rejouer
    service.start('b');
    tick(500);
    service.stop('b');
    tick(500);
    tick(400);
    // pas d'erreur, pas de re-insertion → ok implicite
  }));
});
```

- [ ] **Step 1.2 : Lancer le spec pour vérifier qu'il échoue**

Run: `cd frontend; npx ng test --watch=false --include='**/loading.service.spec.ts'`

Expected: FAIL, "Cannot find module './loading.service'" ou équivalent.

- [ ] **Step 1.3 : Écrire l'implémentation minimale**

Créer `frontend/src/app/services/loading.service.ts` :

```ts
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly active = signal(new Set<string>());
  private readonly timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private firstHidden = false;
  private shownAt = 0;
  private readonly MIN_VISIBLE_MS = 400;
  private readonly SAFETY_TIMEOUT_MS = 15_000;

  readonly visible = computed(() => this.active().size > 0);

  start(key: string): void {
    if (this.active().size === 0) {
      this.shownAt = Date.now();
    }
    this.active.update(s => {
      const next = new Set(s);
      next.add(key);
      return next;
    });
    const existing = this.timeouts.get(key);
    if (existing) clearTimeout(existing);
    this.timeouts.set(
      key,
      setTimeout(() => {
        console.warn(`[LoadingService] safety timeout for key "${key}"`);
        this.stop(key);
      }, this.SAFETY_TIMEOUT_MS)
    );
  }

  stop(key: string): void {
    const t = this.timeouts.get(key);
    if (t) {
      clearTimeout(t);
      this.timeouts.delete(key);
    }
    const elapsed = Date.now() - this.shownAt;
    const remaining = Math.max(0, this.MIN_VISIBLE_MS - elapsed);
    setTimeout(() => {
      this.active.update(s => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
      if (!this.firstHidden && this.active().size === 0) {
        this.firstHidden = true;
        this.hideHtmlSplash();
      }
    }, remaining);
  }

  private hideHtmlSplash(): void {
    const el = document.getElementById('app-splash');
    if (!el) return;
    el.classList.add('is-hiding');
    setTimeout(() => el.remove(), 400);
  }
}
```

- [ ] **Step 1.4 : Lancer le spec pour vérifier qu'il passe**

Run: `cd frontend; npx ng test --watch=false --include='**/loading.service.spec.ts'`

Expected: 7 specs, 7 successes, 0 failures.

- [ ] **Step 1.5 : Commit**

```powershell
git add frontend/src/app/services/loading.service.ts frontend/src/app/services/loading.service.spec.ts
git commit -m "feat(frontend): ajouter LoadingService signal-based pour piloter le splash"
```

---

## Task 2 : `SplashComponent`

**Files:**
- Create: `frontend/src/app/components/splash/splash.component.ts`
- Create: `frontend/src/app/components/splash/splash.component.spec.ts`

- [ ] **Step 2.1 : Écrire le spec failing**

Créer `frontend/src/app/components/splash/splash.component.spec.ts` :

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplashComponent } from './splash.component';

describe('SplashComponent', () => {
  let fixture: ComponentFixture<SplashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplashComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SplashComponent);
    fixture.detectChanges();
  });

  it('renders the logo image with empty alt (decorative)', () => {
    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('logo.jpg');
    expect(img.getAttribute('alt')).toBe('');
  });

  it('marks the container as aria-hidden', () => {
    const container = fixture.nativeElement.querySelector('.splash');
    expect(container).toBeTruthy();
    expect(container.getAttribute('aria-hidden')).toBe('true');
  });
});
```

- [ ] **Step 2.2 : Lancer le spec pour vérifier qu'il échoue**

Run: `cd frontend; npx ng test --watch=false --include='**/splash.component.spec.ts'`

Expected: FAIL, "Cannot find module './splash.component'".

- [ ] **Step 2.3 : Écrire le composant**

Créer `frontend/src/app/components/splash/splash.component.ts` :

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-splash',
  standalone: true,
  template: `
    <div class="splash" aria-hidden="true">
      <img src="logo.jpg" alt="" />
    </div>
  `,
  styles: [`
    .splash {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg);
      z-index: 9999;
    }
    .splash img {
      height: 96px;
      width: auto;
      animation: app-splash-pulse 1.6s ease-in-out infinite;
    }
    @keyframes app-splash-pulse {
      0%, 100% { opacity: 0.55; transform: scale(1); }
      50%      { opacity: 1;    transform: scale(1.04); }
    }
    @media (prefers-reduced-motion: reduce) {
      .splash img { animation: none; opacity: 0.9; }
    }
  `]
})
export class SplashComponent {}
```

- [ ] **Step 2.4 : Lancer le spec pour vérifier qu'il passe**

Run: `cd frontend; npx ng test --watch=false --include='**/splash.component.spec.ts'`

Expected: 2 specs, 2 successes, 0 failures.

- [ ] **Step 2.5 : Commit**

```powershell
git add frontend/src/app/components/splash/
git commit -m "feat(frontend): ajouter SplashComponent (logo + pulse) pour overlay Angular"
```

---

## Task 3 : Splash HTML statique dans `index.html`

**Files:**
- Modify: `frontend/src/index.html`

- [ ] **Step 3.1 : Ajouter le CSS inline dans `<head>`**

Ouvrir `frontend/src/index.html`. Juste avant `</head>` (ligne 14), insérer :

```html
  <!-- Splash de cold-start : affiché avant que le bundle Angular ne soit chargé.
       Retiré par LoadingService.hideHtmlSplash() une fois le contenu prêt.
       NB : la couleur de fond doit rester alignée avec --color-bg dans styles.css. -->
  <style>
    #app-splash {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      z-index: 9999;
      transition: opacity 320ms ease;
    }
    #app-splash img {
      height: 96px;
      width: auto;
      animation: app-splash-pulse 1.6s ease-in-out infinite;
    }
    #app-splash.is-hiding { opacity: 0; pointer-events: none; }
    @keyframes app-splash-pulse {
      0%, 100% { opacity: 0.55; transform: scale(1); }
      50%      { opacity: 1;    transform: scale(1.04); }
    }
    @media (prefers-reduced-motion: reduce) {
      #app-splash img { animation: none; opacity: 0.9; }
    }
  </style>
```

- [ ] **Step 3.2 : Ajouter le bloc splash dans `<body>`**

Toujours dans `frontend/src/index.html`, remplacer le bloc `<body>` :

```html
<body>
  <app-root></app-root>
</body>
```

par :

```html
<body>
  <div id="app-splash" aria-hidden="true">
    <img src="logo.jpg" alt="" />
  </div>
  <app-root></app-root>
</body>
```

- [ ] **Step 3.3 : Vérification visuelle manuelle**

Run dans un terminal séparé : `cd frontend; npm start`

Ouvrir `http://localhost:4200/`. **Avant** que le bundle ne charge (DevTools → Network → Throttling "Slow 3G"), on doit voir le logo centré qui pulse.

⚠️ À ce stade le splash ne disparaîtra **jamais** (le code Angular qui le retire n'existe pas encore). C'est attendu — le test final viendra à la Task 5.

Arrêter le dev server (Ctrl+C).

- [ ] **Step 3.4 : Commit**

```powershell
git add frontend/src/index.html
git commit -m "feat(frontend): ajouter splash HTML statique au cold-start (avant bootstrap Angular)"
```

---

## Task 4 : Cache `getContent()` dans `PortfolioService` (TDD)

**Files:**
- Modify: `frontend/src/app/services/portfolio.service.ts`
- Modify: `frontend/src/app/services/portfolio.service.spec.ts`

- [ ] **Step 4.1 : Ajouter les tests qui échouent**

Ouvrir `frontend/src/app/services/portfolio.service.spec.ts`. Dans le bloc `describe('Site Content API', ...)` (commence ligne 280), remplacer le contenu existant par :

```ts
  describe('Site Content API', () => {
    const mockContent = {
      'home.hero.eyebrow': 'Milo GUILLAUME Design — Paris, France',
      'home.hero.title': 'Mobilier sculpté',
      'profile.studio': 'Milo GUILLAUME Design',
    };

    it('should retrieve all site content', () => {
      service.getContent().subscribe((content) => {
        expect(content).toEqual(mockContent);
      });

      const req = httpMock.expectOne('/api/content');
      expect(req.request.method).toBe('GET');
      req.flush(mockContent);
    });

    it('should share a single HTTP request across multiple subscribers (cache)', () => {
      let firstResult: any = null;
      let secondResult: any = null;

      service.getContent().subscribe(c => firstResult = c);
      service.getContent().subscribe(c => secondResult = c);

      // expectOne() échouerait si plusieurs requêtes étaient émises
      const req = httpMock.expectOne('/api/content');
      req.flush(mockContent);

      expect(firstResult).toEqual(mockContent);
      expect(secondResult).toEqual(mockContent);
    });

    it('should serve subsequent subscribers from cache without new HTTP call', () => {
      service.getContent().subscribe();
      const req = httpMock.expectOne('/api/content');
      req.flush(mockContent);

      let lateResult: any = null;
      service.getContent().subscribe(c => lateResult = c);

      // Aucune nouvelle requête : expectNone n'échoue pas
      httpMock.expectNone('/api/content');
      expect(lateResult).toEqual(mockContent);
    });

    it('should invalidate the cache when updateContent succeeds', () => {
      service.getContent().subscribe();
      httpMock.expectOne('/api/content').flush(mockContent);

      const updates = { 'home.hero.eyebrow': 'Nouveau titre' };
      service.updateContent(updates).subscribe();
      httpMock.expectOne('/api/content').flush(mockContent);

      // Après update, un nouveau getContent doit refaire une requête GET
      service.getContent().subscribe();
      const refreshReq = httpMock.expectOne('/api/content');
      expect(refreshReq.request.method).toBe('GET');
      refreshReq.flush(mockContent);
    });

    it('should update site content via PUT', () => {
      const updates = { 'home.hero.eyebrow': 'Nouveau titre' };

      service.updateContent(updates).subscribe((result) => {
        expect(result).toEqual(mockContent);
      });

      const req = httpMock.expectOne('/api/content');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updates);
      req.flush(mockContent);
    });
  });
```

- [ ] **Step 4.2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `cd frontend; npx ng test --watch=false --include='**/portfolio.service.spec.ts'`

Expected: échec sur "should share a single HTTP request..." (deux requêtes au lieu d'une) et "should invalidate the cache..." (pas de seconde requête après update).

- [ ] **Step 4.3 : Modifier `PortfolioService.getContent` et `updateContent`**

Ouvrir `frontend/src/app/services/portfolio.service.ts`. En haut du fichier, modifier l'import RxJS :

```ts
import { Observable, shareReplay, tap } from 'rxjs';
```

Dans la classe, remplacer les méthodes `getContent` et `updateContent` (lignes 75-81) par :

```ts
  private contentCache$?: Observable<SiteContent>;

  getContent(): Observable<SiteContent> {
    this.contentCache$ ??= this.http
      .get<SiteContent>(`${API}/content`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.contentCache$;
  }

  invalidateContentCache(): void {
    this.contentCache$ = undefined;
  }

  updateContent(content: SiteContent): Observable<SiteContent> {
    return this.http
      .put<SiteContent>(`${API}/content`, content)
      .pipe(tap(() => this.invalidateContentCache()));
  }
```

- [ ] **Step 4.4 : Lancer les tests pour vérifier qu'ils passent**

Run: `cd frontend; npx ng test --watch=false --include='**/portfolio.service.spec.ts'`

Expected: tous les tests `Site Content API` passent (5/5), plus le reste de la suite intact.

- [ ] **Step 4.5 : Commit**

```powershell
git add frontend/src/app/services/portfolio.service.ts frontend/src/app/services/portfolio.service.spec.ts
git commit -m "refactor(frontend): mettre en cache shareReplay PortfolioService.getContent"
```

---

## Task 5 : Intégration `LoadingService` + splash dans `AppComponent`

**Files:**
- Modify: `frontend/src/app/app.component.ts`
- Create: `frontend/src/app/app.component.spec.ts`

- [ ] **Step 5.1 : Écrire le spec failing**

Créer `frontend/src/app/app.component.spec.ts` :

```ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { LoadingService } from './services/loading.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let loading: LoadingService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    loading = TestBed.inject(LoadingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts the init loading key on bootstrap', () => {
    fixture.detectChanges();
    expect(loading.visible()).toBe(true);
  });

  it('stops the init key once content is loaded', fakeAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    tick(500); // dépasse MIN_VISIBLE_MS
    expect(loading.visible()).toBe(false);
  }));

  it('renders the splash overlay when loading is visible', () => {
    fixture.detectChanges();
    // On ne flush pas getContent → loading reste true → splash rendu.
    httpMock.expectOne('/api/content');
    const splash = fixture.nativeElement.querySelector('app-splash');
    expect(splash).toBeTruthy();
  });
});
```

⚠️ **Engineer note :** l'écoute Router (`NavigationStart` → `start('nav')`) n'est **pas** couverte par un spec automatisé : Angular n'expose pas de moyen propre de pousser un event sur `router.events`. Cette branche est validée par la QA manuelle en Step 5.5.

- [ ] **Step 5.2 : Lancer le spec pour vérifier qu'il échoue**

Run: `cd frontend; npx ng test --watch=false --include='**/app.component.spec.ts'`

Expected: FAIL — `LoadingService` non importé dans `AppComponent`, `<app-splash>` absent du template.

- [ ] **Step 5.3 : Modifier `AppComponent`**

Remplacer intégralement le contenu de `frontend/src/app/app.component.ts` par :

```ts
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { SplashComponent } from './components/splash/splash.component';
import { LoadingService } from './services/loading.service';
import { PortfolioService } from './services/portfolio.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, SplashComponent],
  template: `
    @if (loading.visible()) { <app-splash /> }
    <app-header />
    <main>
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
      padding-top: 88px;
    }
  `]
})
export class AppComponent implements OnInit {
  protected readonly loading = inject(LoadingService);
  private readonly portfolio = inject(PortfolioService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.loading.start('init');
    this.portfolio.getContent().subscribe({
      next: () => this.loading.stop('init'),
      error: () => this.loading.stop('init'),
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loading.start('nav');
      } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
        this.loading.stop('nav');
      }
      // NavigationEnd → pas de stop ici ; c'est la page qui appellera stop('nav').
    });
  }
}
```

- [ ] **Step 5.4 : Lancer le spec pour vérifier qu'il passe**

Run: `cd frontend; npx ng test --watch=false --include='**/app.component.spec.ts'`

Expected: 3 specs OK.

- [ ] **Step 5.5 : Vérification visuelle manuelle**

Run dans un terminal : `cd frontend; npm start`

Ouvrir `http://localhost:4200/`. DevTools → Network → "Slow 3G". Hard refresh (Ctrl+Shift+R).

Comportement attendu :
- Le splash HTML apparaît instantanément (logo qui pulse).
- Le bundle Angular charge, le splash overlay Angular prend le relais (continuité visuelle).
- Une fois `/api/content` répondu, le splash fade out et l'app apparaît.
- En cliquant sur "Mobilier" : le splash réapparaît (NavigationStart) … mais ne disparaîtra pas tant que le composant Mobilier ne dira pas `stop('nav')`. Pour cette étape c'est attendu ; la Task 6 corrigera.

Arrêter le dev server.

- [ ] **Step 5.6 : Commit**

```powershell
git add frontend/src/app/app.component.ts frontend/src/app/app.component.spec.ts
git commit -m "feat(frontend): brancher splash overlay + LoadingService dans AppComponent"
```

---

## Task 6 : Câblage `start`/`stop` dans toutes les pages publiques

**Files:**
- Modify: `frontend/src/app/pages/home/home.component.ts`
- Modify: `frontend/src/app/pages/catalog/catalog.component.ts`
- Modify: `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts`
- Modify: `frontend/src/app/pages/expositions-list/expositions-list.component.ts`
- Modify: `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts`
- Modify: `frontend/src/app/pages/studio/studio.component.ts`
- Modify: `frontend/src/app/pages/contact/contact.component.ts`

**Principe commun à toutes les pages :**

1. Injecter `LoadingService` (en plus de `PortfolioService` déjà injecté).
2. Au début de `ngOnInit()` : `this.loading.start('page')`.
3. Combiner les sources HTTP de la page avec `forkJoin` (toutes les sources nécessaires au premier rendu).
4. Quand `forkJoin` complète (next ou error) : `stop('page')` **et** `stop('nav')`.
5. Conserver le signal local `loading()` existant (utilisé pour le "Chargement…" inline) — il sert toujours en filet de sécurité si le splash est masqué.

⚠️ Le signal local de page s'appelle `loading` (signal local) ; le service injecté **doit** s'appeler autrement pour éviter le shadow. On utilise `loadingSvc` ci-dessous.

- [ ] **Step 6.1 : `home.component.ts`**

Ouvrir `frontend/src/app/pages/home/home.component.ts`. Repérer `ngOnInit()` (ligne 138) :

```ts
  ngOnInit() {
    this.portfolio.getHome().subscribe(d => this.data.set(d));
    this.portfolio.getContent().subscribe(c => this.content.set(c));
  }
```

Ajouter en haut du fichier l'import :

```ts
import { LoadingService } from '../../services/loading.service';
```

Dans la classe, ajouter le champ injecté (après `private readonly portfolio = inject(PortfolioService);`) :

```ts
  private readonly loadingSvc = inject(LoadingService);
```

Remplacer `ngOnInit()` par :

```ts
  ngOnInit() {
    this.loadingSvc.start('page');
    forkJoin({
      home: this.portfolio.getHome(),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ home, content }) => {
        this.data.set(home);
        this.content.set(content);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
  }
```

- [ ] **Step 6.2 : `catalog.component.ts`**

Ouvrir `frontend/src/app/pages/catalog/catalog.component.ts`. Ajouter en haut :

```ts
import { LoadingService } from '../../services/loading.service';
import { forkJoin } from 'rxjs';
```

Dans la classe, ajouter le champ injecté (à proximité de `private readonly portfolio = inject(PortfolioService);`) :

```ts
  private readonly loadingSvc = inject(LoadingService);
```

Repérer le bloc autour de la ligne 195 :

```ts
    this.portfolio.getAllFurniture().subscribe({
      next: data => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
    this.portfolio.getContent().subscribe(c => this.content.set(c));
```

Le remplacer par :

```ts
    this.loadingSvc.start('page');
    forkJoin({
      furniture: this.portfolio.getAllFurniture(),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ furniture, content }) => {
        this.items.set(furniture);
        this.content.set(content);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
```

- [ ] **Step 6.3 : `furniture-detail.component.ts`**

Ouvrir `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts`. Ajouter en haut :

```ts
import { LoadingService } from '../../services/loading.service';
import { forkJoin } from 'rxjs';
```

Dans la classe, ajouter (à proximité de `private readonly portfolio = inject(PortfolioService);`) :

```ts
  private readonly loadingSvc = inject(LoadingService);
```

Repérer le bloc autour de la ligne 267 :

```ts
    this.portfolio.getFurniture(slug).subscribe({
      next: data => {
        this.item.set(data);
        this.loading.set(false);
      },
      error: () => { this.notFound.set(true); this.loading.set(false); }
    });
    this.portfolio.getContent().subscribe(c => this.content.set(c));
```

Le remplacer par :

```ts
    this.loadingSvc.start('page');
    forkJoin({
      furniture: this.portfolio.getFurniture(slug),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ furniture, content }) => {
        this.item.set(furniture);
        this.content.set(content);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
```

- [ ] **Step 6.4 : `expositions-list.component.ts`**

Ouvrir `frontend/src/app/pages/expositions-list/expositions-list.component.ts`. Ajouter en haut :

```ts
import { LoadingService } from '../../services/loading.service';
import { forkJoin } from 'rxjs';
```

Dans la classe, ajouter :

```ts
  private readonly loadingSvc = inject(LoadingService);
```

Repérer le bloc autour de la ligne 158 :

```ts
    this.portfolio.getAllExhibitions().subscribe({
      next: data => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
    this.portfolio.getContent().subscribe(c => this.content.set(c));
```

Le remplacer par :

```ts
    this.loadingSvc.start('page');
    forkJoin({
      exhibitions: this.portfolio.getAllExhibitions(),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ exhibitions, content }) => {
        this.items.set(exhibitions);
        this.content.set(content);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
```

- [ ] **Step 6.5 : `exhibition-detail.component.ts`**

Ouvrir `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts`. Ajouter en haut :

```ts
import { LoadingService } from '../../services/loading.service';
import { forkJoin } from 'rxjs';
```

Dans la classe, ajouter :

```ts
  private readonly loadingSvc = inject(LoadingService);
```

Repérer le bloc autour de la ligne 178 :

```ts
    this.portfolio.getExhibition(slug).subscribe({
      next: data => {
        this.item.set(data);
        this.loading.set(false);
      },
      error: () => { this.notFound.set(true); this.loading.set(false); }
    });
    this.portfolio.getContent().subscribe(c => this.content.set(c));
```

Le remplacer par :

```ts
    this.loadingSvc.start('page');
    forkJoin({
      exhibition: this.portfolio.getExhibition(slug),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ exhibition, content }) => {
        this.item.set(exhibition);
        this.content.set(content);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
```

- [ ] **Step 6.6 : `studio.component.ts`**

Ouvrir `frontend/src/app/pages/studio/studio.component.ts`. Ajouter en haut :

```ts
import { LoadingService } from '../../services/loading.service';
import { forkJoin } from 'rxjs';
```

Dans la classe, ajouter :

```ts
  private readonly loadingSvc = inject(LoadingService);
```

Repérer le bloc autour des lignes 187-192 :

```ts
    this.portfolio.getProfile().subscribe({
      next: data => { this.profile.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.portfolio.getContent().subscribe({
      ...
    });
```

Le remplacer par :

```ts
    this.loadingSvc.start('page');
    forkJoin({
      profile: this.portfolio.getProfile(),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ profile, content }) => {
        this.profile.set(profile);
        this.content.set(content);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
```

⚠️ **Engineer note :** lire le code existant autour de `getContent()` dans ce fichier (ligne 191) — il peut y avoir une logique supplémentaire à préserver (par ex. `this.content.set(c)` plus complexe). Si c'est le cas, intégrer la logique dans le `next` du `forkJoin` plutôt que la perdre.

- [ ] **Step 6.7 : `contact.component.ts`**

Ouvrir `frontend/src/app/pages/contact/contact.component.ts`. Le composant n'a qu'une seule source (`getContent`), pas besoin de `forkJoin`. Ajouter en haut :

```ts
import { LoadingService } from '../../services/loading.service';
```

Dans la classe, ajouter :

```ts
  private readonly loadingSvc = inject(LoadingService);
```

Repérer ligne 240 :

```ts
    this.portfolio.getContent().subscribe(c => this.content.set(c));
```

Le remplacer par :

```ts
    this.loadingSvc.start('page');
    this.portfolio.getContent().subscribe({
      next: c => {
        this.content.set(c);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
```

- [ ] **Step 6.8 : Lancer la suite complète des tests frontend**

Run: `cd frontend; npx ng test --watch=false`

Échecs attendus à corriger : certains specs de page existants peuvent casser parce que :
- le composant injecte maintenant `LoadingService` → le `TestBed` doit le fournir (auto-injecté si on garde `providedIn: 'root'`, mais à vérifier),
- les requêtes HTTP attendues changent (deux requêtes via `forkJoin` au lieu de deux `subscribe` séparés — même nombre de requêtes mais émises en parallèle ; `HttpTestingController` reste compatible).

Lire le message d'erreur pour chaque spec rouge et ajuster (provider manquant, ordre des `expectOne`, ou flush manquant). L'objectif final : 100 % verts.

- [ ] **Step 6.9 : QA manuelle complète**

Run dans un terminal : `cd frontend; npm start`

Ouvrir `http://localhost:4200/`. DevTools → Network → "Slow 3G".

Vérifier :

1. **Cold-start** : splash HTML visible immédiatement, fade vers l'app une fois `/api/content` + `/api/home` répondus. **Aucun flash** de header/footer aux valeurs par défaut.
2. **Navigation Home → Mobilier** : splash réapparaît au clic, disparaît une fois `/api/furniture` répondu.
3. **Navigation Mobilier → page d'une pièce** : splash visible le temps que `/api/furniture/<slug>` réponde.
4. **Navigation Mobilier → Expositions → Contact → Studio** : splash entre chaque transition.
5. **`prefers-reduced-motion`** : DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce". Le logo ne pulse plus, opacité fixe ~0.9.
6. **Page admin** : login → onglets admin → **pas** de splash entre les onglets (les contrôles `loadingFurniture`, `loadingExhibitions`, etc. doivent rester les seuls indicateurs).
7. **Console** : aucun `console.warn` `[LoadingService] safety timeout` (sinon une page oublie son `stop`).

Arrêter le dev server.

- [ ] **Step 6.10 : Commit**

```powershell
git add frontend/src/app/pages/home/home.component.ts frontend/src/app/pages/catalog/catalog.component.ts frontend/src/app/pages/furniture-detail/furniture-detail.component.ts frontend/src/app/pages/expositions-list/expositions-list.component.ts frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts frontend/src/app/pages/studio/studio.component.ts frontend/src/app/pages/contact/contact.component.ts
git commit -m "feat(frontend): cabler start/stop LoadingService dans les pages publiques"
```

---

## Task 7 : Vérification finale (build + coverage)

**Files:** aucun (vérification uniquement).

- [ ] **Step 7.1 : Build de production**

Run: `cd frontend; npm run build`

Expected: build réussi sans warning d'erreur, dossier `frontend/dist/portfolio-frontend/browser` peuplé.

- [ ] **Step 7.2 : Coverage**

Run: `cd frontend; npx ng test --watch=false --code-coverage`

Expected: tous les specs passent, seuils 80 % maintenus (cf. `karma.conf.js`). Si la couverture baisse sous le seuil à cause d'un fichier nouveau, ajouter au moins un test supplémentaire couvrant la branche manquante.

- [ ] **Step 7.3 : Vérifier qu'aucun warning lint ne pollue le diff**

Run: `cd frontend; git diff --stat`

Inspecter les imports inutiles, espaces, etc. Si du `import { ... } from` est inutilisé, le retirer.

- [ ] **Step 7.4 : Commit final si correction nécessaire**

S'il a fallu corriger une couverture ou un import :

```powershell
git add frontend/
git commit -m "test(frontend): completer couverture splash + nettoyer imports"
```

---

## Critères d'acceptation finaux

- Cold-start : splash visible immédiatement, sans flash de contenu par défaut, fade-out une fois `/api/content` + données de la home prêtes.
- Navigation entre pages publiques : splash visible pendant chaque transition tant que les données de la page ne sont pas chargées.
- Durée minimale du splash : 400 ms (testé via `fakeAsync`).
- `prefers-reduced-motion` désactive l'animation.
- `/admin` non impacté (UI directement visible après login).
- `npx ng test --watch=false` : 100 % verts, couverture ≥ 80 %.
- `npm run build` : succès.
