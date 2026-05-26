# Réorganisation de l'espace d'administration — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Statut :** ✅ Prêt à exécuter (Tasks 1-9 rédigées avec code TDD complet).

**Goal :** Décomposer le monolithe `frontend/src/app/pages/admin/admin.component.ts` (2441 lignes) en 9 composants route standalone lazy-chargés, avec un layout shell + sidebar groupée + tableau de bord, sans modifier aucune API backend.

**Architecture :** Shell `AdminLayoutComponent` avec sidebar groupée (CONTENU / SITE / MESURES), `<router-outlet>` pour les sections et `<app-toasts>` global. Chaque section est un composant standalone chargé par `loadComponent`. Migration incrémentale section par section ; le monolithe legacy reste accessible à `/admin/legacy` pendant toute la migration et n'est supprimé qu'à la dernière étape.

**Tech Stack :** Angular 21 standalone, signals, `@if` / `@for`, `RouterLink` / `RouterLinkActive` / `RouterOutlet`, `FormBuilder` + `ReactiveFormsModule`, `PortfolioService` (unique point HTTP).

**Référence spec :** [docs/superpowers/specs/2026-05-23-reorganisation-admin-design.md](../specs/2026-05-23-reorganisation-admin-design.md)

---

## Cartographie des fichiers

### À créer

```text
frontend/src/app/pages/admin/
  admin-layout.component.ts          (shell : header + sidebar + <router-outlet>)
  admin-layout.component.spec.ts
  admin.routes.ts                    (export des routes enfants)

  dashboard/
    dashboard.component.ts
    dashboard.component.spec.ts

  mobilier/
    mobilier.component.ts            (liste pièces + form + bloc Catégories)
    mobilier.component.spec.ts

  expositions/
    expositions.component.ts         (liste expos + form + bloc Position home)
    expositions.component.spec.ts

  textes/
    textes.component.ts
    textes.component.spec.ts

  mediatheque/
    mediatheque.component.ts
    mediatheque.component.spec.ts

  accueil/
    accueil.component.ts             (feed homepage uniquement)
    accueil.component.spec.ts

  navigation/
    navigation.component.ts          (visibilité menu nav)
    navigation.component.spec.ts

  typographie/
    typographie.component.ts
    typographie.component.spec.ts

  analytics/
    analytics.component.ts           (iframe Umami)
    analytics.component.spec.ts

  shared/
    toast.service.ts
    toast.service.spec.ts
    toasts.component.ts
    photo-picker.component.ts
    photo-picker.component.spec.ts
    gallery-editor.component.ts
    gallery-editor.component.spec.ts
```

### À modifier

- `frontend/src/app/app.routes.ts` — bascule `/admin` de `loadComponent` vers `loadChildren`.
- `frontend/src/app/pages/admin/admin.component.ts` — sera retiré section par section, supprimé à la Task 9.

### Décisions importantes

- **`slides-editor.component.ts` et `mail-settings/` restent à leur emplacement actuel** pendant toute la migration (ils sont déjà extraits et fonctionnels). Le composant `MailSettingsComponent` est ajouté comme route `/admin/email` dès Task 1.
- **Route `/admin/legacy`** pointe vers le monolithe pour permettre la coexistence pendant la migration ; supprimée à Task 9.
- **`HomeAdminItem` et `ExhibitionMetaRow`** restent des interfaces locales aux composants concernés (`AccueilComponent` et `ExpositionsComponent` respectivement).

---

## Task 1 : Infrastructure (shell, routes, dashboard, toasts)

**Fichiers :**
- Créer : `frontend/src/app/pages/admin/shared/toast.service.ts`
- Créer : `frontend/src/app/pages/admin/shared/toast.service.spec.ts`
- Créer : `frontend/src/app/pages/admin/shared/toasts.component.ts`
- Créer : `frontend/src/app/pages/admin/admin-layout.component.ts`
- Créer : `frontend/src/app/pages/admin/admin-layout.component.spec.ts`
- Créer : `frontend/src/app/pages/admin/admin.routes.ts`
- Créer : `frontend/src/app/pages/admin/dashboard/dashboard.component.ts`
- Créer : `frontend/src/app/pages/admin/dashboard/dashboard.component.spec.ts`
- Modifier : `frontend/src/app/app.routes.ts`

- [ ] **Step 1 : Écrire les tests `toast.service.spec.ts` (failing)**

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('success() ajoute un toast type success', () => {
    service.success('OK');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].type).toBe('success');
    expect(service.toasts()[0].text).toBe('OK');
  });

  it('error() ajoute un toast type error', () => {
    service.error('KO');
    expect(service.toasts()[0].type).toBe('error');
  });

  it('dismiss() retire le toast par id', () => {
    service.success('A');
    const id = service.toasts()[0].id;
    service.dismiss(id);
    expect(service.toasts().length).toBe(0);
  });

  it('les toasts expirent après 4 secondes', fakeAsync(() => {
    service.success('expire');
    expect(service.toasts().length).toBe(1);
    tick(4000);
    expect(service.toasts().length).toBe(0);
  }));

  it('empile plusieurs toasts', () => {
    service.success('A');
    service.error('B');
    expect(service.toasts().length).toBe(2);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Commande : `cd frontend && npx ng test --watch=false --include='**/toast.service.spec.ts'`
Attendu : ÉCHEC avec "Cannot find module './toast.service'".

- [ ] **Step 3 : Implémenter `toast.service.ts`**

```typescript
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  type: 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  success(text: string): void { this.flash(text, 'success'); }
  error(text: string): void { this.flash(text, 'error'); }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private flash(text: string, type: 'success' | 'error'): void {
    const id = ++this.counter;
    this.toasts.update(list => [...list, { id, text, type }]);
    setTimeout(() => this.dismiss(id), 4000);
  }
}
```

- [ ] **Step 4 : Vérifier le passage des tests ToastService**

Commande : `cd frontend && npx ng test --watch=false --include='**/toast.service.spec.ts'`
Attendu : 5 tests OK.

- [ ] **Step 5 : Créer `shared/toasts.component.ts`**

```typescript
import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  template: `
    @if (toast.toasts().length > 0) {
      <div class="toast-stack" aria-live="polite">
        @for (t of toast.toasts(); track t.id) {
          <div class="toast" [class.error]="t.type === 'error'" role="status">
            <span class="toast-text">{{ t.text }}</span>
            <button type="button" class="toast-close" (click)="toast.dismiss(t.id)" aria-label="Fermer">×</button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      background: var(--color-bg);
      border: 1px solid var(--color-line);
      border-left: 3px solid var(--color-accent);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      font-size: 0.9rem;
      pointer-events: auto;
      animation: toast-slide-in 220ms ease-out;
    }
    .toast.error {
      border-left-color: #b1532a;
      color: #8a3d1f;
      background: rgba(177, 83, 42, 0.04);
    }
    .toast-text { flex: 1; line-height: 1.4; }
    .toast-close {
      background: none;
      border: none;
      color: var(--color-mute);
      font-size: 1.2rem;
      line-height: 1;
      padding: 0 4px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .toast-close:hover { color: var(--color-ink); }
    @keyframes toast-slide-in {
      from { transform: translateX(40px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @media (max-width: 600px) {
      .toast-stack { left: 12px; right: 12px; bottom: 12px; max-width: none; }
    }
  `]
})
export class ToastsComponent {
  protected readonly toast = inject(ToastService);
}
```

- [ ] **Step 6 : Écrire `admin-layout.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('crée le composant', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche le bouton sidebar (mobile)', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.sidebar-toggle'))).toBeTruthy();
  });

  it('toggleSidebar inverse sidebarOpen', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    expect(cmp.sidebarOpen()).toBeFalse();
    cmp.toggleSidebar();
    expect(cmp.sidebarOpen()).toBeTrue();
  });

  it('contient la sidebar groupée (CONTENU / SITE / MESURES)', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('CONTENU');
    expect(html).toContain('SITE');
    expect(html).toContain('MESURES');
  });
});
```

- [ ] **Step 7 : Vérifier l'échec**

Commande : `cd frontend && npx ng test --watch=false --include='**/admin-layout.component.spec.ts'`
Attendu : ÉCHEC (composant inexistant).

- [ ] **Step 8 : Implémenter `admin-layout.component.ts`**

```typescript
import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastsComponent } from './shared/toasts.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastsComponent],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <span class="eyebrow">Console d'administration</span>
          <h1>Gérer le contenu</h1>
          <p class="lead">Ajoutez, modifiez ou supprimez les pièces de mobilier et les expositions présentées sur le site.</p>
        </div>

        <div class="admin-layout">
          <button type="button" class="sidebar-toggle" (click)="toggleSidebar()"
                  [attr.aria-expanded]="sidebarOpen()" aria-controls="admin-nav">
            <span class="burger-icon" aria-hidden="true">☰</span>
            <span>Menu</span>
          </button>

          <nav id="admin-nav" class="sidebar" [class.open]="sidebarOpen()" (click)="onNavClick()">
            <a class="nav-item nav-dashboard" routerLink="/admin" routerLinkActive="active"
               [routerLinkActiveOptions]="{exact: true}">Tableau de bord</a>

            <span class="nav-group">CONTENU</span>
            <a class="nav-item" routerLink="/admin/mobilier" routerLinkActive="active">Mobilier</a>
            <a class="nav-item" routerLink="/admin/expositions" routerLinkActive="active">Expositions</a>
            <a class="nav-item" routerLink="/admin/textes" routerLinkActive="active">Textes du site</a>
            <a class="nav-item" routerLink="/admin/mediatheque" routerLinkActive="active">Médiathèque</a>

            <span class="nav-group">SITE</span>
            <a class="nav-item" routerLink="/admin/accueil" routerLinkActive="active">Accueil</a>
            <a class="nav-item" routerLink="/admin/navigation" routerLinkActive="active">Navigation</a>
            <a class="nav-item" routerLink="/admin/typographie" routerLinkActive="active">Typographie</a>
            <a class="nav-item" routerLink="/admin/email" routerLinkActive="active">Email</a>

            <span class="nav-group">MESURES</span>
            <a class="nav-item" routerLink="/admin/analytics" routerLinkActive="active">Analytics</a>
          </nav>

          <div class="admin-content">
            <router-outlet></router-outlet>
          </div>
        </div>
      </div>
    </section>

    <app-toasts></app-toasts>
  `,
  styles: [`
    .section { padding: 128px 0 96px; }
    .head { max-width: 720px; margin-bottom: 48px; }
    .head h1 { margin-top: 16px; }
    .lead { margin-top: 16px; color: var(--color-ink-soft); }

    .admin-layout {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 40px;
      align-items: start;
    }
    .admin-content { min-width: 0; }

    .sidebar-toggle {
      display: none;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      width: 100%;
      background: var(--color-bg-alt);
      border: 1px solid var(--color-line);
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-ink);
      cursor: pointer;
      grid-column: 1 / -1;
    }
    .burger-icon { font-size: 1.1rem; }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 2px;
      position: sticky;
      top: 96px;
      border-right: 1px solid var(--color-line);
      padding-right: 12px;
    }

    .nav-group {
      font-size: 0.65rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-mute);
      padding: 16px 14px 4px;
      display: block;
    }
    .nav-group:first-of-type { padding-top: 4px; }

    .nav-item {
      background: transparent;
      border: 0;
      padding: 10px 14px;
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      color: var(--color-ink-soft);
      cursor: pointer;
      text-align: left;
      border-left: 2px solid transparent;
      transition: color var(--transition), border-color var(--transition), background var(--transition);
      text-decoration: none;
      display: block;
    }
    .nav-item:hover { color: var(--color-ink); background: var(--color-bg-alt); }
    .nav-item.active {
      color: var(--color-ink);
      border-left-color: var(--color-accent);
      background: var(--color-bg-alt);
      font-weight: 500;
    }
    .nav-dashboard { margin-bottom: 8px; font-weight: 500; }

    @media (max-width: 720px) {
      .admin-layout { grid-template-columns: 1fr; gap: 0; }
      .sidebar-toggle { display: flex; margin-bottom: 16px; }
      .sidebar {
        position: static;
        border-right: none;
        padding-right: 0;
        margin-bottom: 24px;
        max-height: 0;
        overflow: hidden;
        transition: max-height 240ms ease;
      }
      .sidebar.open { max-height: 700px; }
    }
  `]
})
export class AdminLayoutComponent {
  protected readonly sidebarOpen = signal(false);
  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  onNavClick(): void { this.sidebarOpen.set(false); }
}
```

- [ ] **Step 9 : Créer `admin.routes.ts` (avec route `legacy` pour le monolithe)**

```typescript
import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Tableau de bord — Administration',
      },
      {
        path: 'mobilier',
        loadComponent: () => import('./mobilier/mobilier.component').then(m => m.MobilierComponent),
        title: 'Mobilier — Administration',
      },
      {
        path: 'expositions',
        loadComponent: () => import('./expositions/expositions.component').then(m => m.ExpositionsComponent),
        title: 'Expositions — Administration',
      },
      {
        path: 'textes',
        loadComponent: () => import('./textes/textes.component').then(m => m.TextesComponent),
        title: 'Textes — Administration',
      },
      {
        path: 'mediatheque',
        loadComponent: () => import('./mediatheque/mediatheque.component').then(m => m.MediathequeComponent),
        title: 'Médiathèque — Administration',
      },
      {
        path: 'accueil',
        loadComponent: () => import('./accueil/accueil.component').then(m => m.AccueilComponent),
        title: 'Accueil — Administration',
      },
      {
        path: 'navigation',
        loadComponent: () => import('./navigation/navigation.component').then(m => m.NavigationComponent),
        title: 'Navigation — Administration',
      },
      {
        path: 'typographie',
        loadComponent: () => import('./typographie/typographie.component').then(m => m.TypographieComponent),
        title: 'Typographie — Administration',
      },
      {
        path: 'email',
        loadComponent: () => import('./mail-settings/mail-settings.component').then(m => m.MailSettingsComponent),
        title: 'Email — Administration',
      },
      {
        path: 'analytics',
        loadComponent: () => import('./analytics/analytics.component').then(m => m.AnalyticsComponent),
        title: 'Analytics — Administration',
      },
      {
        path: 'legacy',
        loadComponent: () => import('./admin.component').then(m => m.AdminComponent),
        title: 'Administration (legacy) — Milo GUILLAUME Design',
      },
    ],
  },
];
```

NOTE : les routes pointent vers des composants qui n'existent pas encore (Tasks 2-9). Angular ne charge un composant qu'à la navigation, donc tant qu'on ne visite pas la route, pas d'erreur. Pour Task 1, on créera des composants stubs minimaux pour `mobilier`, `expositions`, `textes`, `mediatheque`, `accueil`, `navigation`, `typographie`, `analytics` afin que la compilation passe — ces stubs seront remplacés par les vraies implémentations dans les Tasks suivantes.

> ⚠ DÉCISION D'IMPLÉMENTATION À TRANCHER : choix entre (a) stubs minimaux dès Task 1 ou (b) ajouter les routes au fur et à mesure que les composants sont créés. Option (b) est plus propre — adopter l'approche : Task 1 ne référence dans `admin.routes.ts` que les routes effectivement implémentées (dashboard + email + legacy), puis chaque Task suivante ajoute sa route.

- [ ] **Step 10 : Modifier `frontend/src/app/app.routes.ts`**

Remplacer le bloc admin :

```typescript
// AVANT
{
  path: 'admin',
  loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
  title: 'Administration — Milo GUILLAUME Design',
  canActivate: [authGuard],
},

// APRÈS
{
  path: 'admin',
  loadChildren: () => import('./pages/admin/admin.routes').then(m => m.adminRoutes),
  canActivate: [authGuard],
  title: 'Administration — Milo GUILLAUME Design',
},
```

- [ ] **Step 11 : Écrire `dashboard.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('crée le composant', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche 4 cartes d\'action', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.action-card')).length).toBe(4);
  });
});
```

- [ ] **Step 12 : Implémenter `dashboard/dashboard.component.ts`**

```typescript
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dashboard">
      <h2>Tableau de bord</h2>
      <p class="hint">Bienvenue dans l'espace d'administration. Choisissez une action rapide ou naviguez via la sidebar.</p>
      <div class="actions-grid">
        <a routerLink="/admin/mobilier" [queryParams]="{ new: 1 }" class="action-card">
          <span class="action-icon">+</span>
          <span class="action-label">Nouvelle pièce</span>
        </a>
        <a routerLink="/admin/expositions" [queryParams]="{ new: 1 }" class="action-card">
          <span class="action-icon">+</span>
          <span class="action-label">Nouvelle exposition</span>
        </a>
        <a routerLink="/admin/mediatheque" [queryParams]="{ import: 1 }" class="action-card">
          <span class="action-icon">↑</span>
          <span class="action-label">Importer photo</span>
        </a>
        <a routerLink="/admin/accueil" class="action-card">
          <span class="action-icon">✎</span>
          <span class="action-label">Éditer l'accueil</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 720px; }
    h2 { margin: 0 0 8px; font-family: var(--serif); font-weight: 400; font-size: 2rem; }
    .hint { margin: 0 0 48px; color: var(--color-ink-soft); }
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 20px;
    }
    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 24px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      text-decoration: none;
      color: var(--color-ink);
      transition: background var(--transition), border-color var(--transition);
      text-align: center;
    }
    .action-card:hover { background: var(--color-bg-alt); border-color: var(--color-accent); }
    .action-icon { font-size: 1.8rem; color: var(--color-accent); line-height: 1; }
    .action-label {
      font-size: 0.85rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
    }
  `]
})
export class DashboardComponent {}
```

- [ ] **Step 13 : Lancer la suite de tests frontend**

Commande : `cd frontend && npx ng test --watch=false`
Attendu : tous tests OK, y compris `admin.component.spec.ts` toujours en place (le monolithe est encore accessible via `/admin/legacy`).

- [ ] **Step 14 : Smoke test manuel**

```powershell
cd frontend
npm start
```

Ouvrir http://localhost:4200/admin → doit afficher le dashboard avec 4 cartes + sidebar groupée.
Ouvrir http://localhost:4200/admin/legacy → doit afficher le monolithe (encore complet).
Cliquer une carte d'action → navigation vers la section (404 ou route vide tant que les composants n'existent pas — comportement attendu à ce stade).

- [ ] **Step 15 : Commit**

```bash
git add frontend/src/app/pages/admin/shared/toast.service.ts \
        frontend/src/app/pages/admin/shared/toast.service.spec.ts \
        frontend/src/app/pages/admin/shared/toasts.component.ts \
        frontend/src/app/pages/admin/admin-layout.component.ts \
        frontend/src/app/pages/admin/admin-layout.component.spec.ts \
        frontend/src/app/pages/admin/admin.routes.ts \
        frontend/src/app/pages/admin/dashboard/dashboard.component.ts \
        frontend/src/app/pages/admin/dashboard/dashboard.component.spec.ts \
        frontend/src/app/app.routes.ts
git commit -m "feat(admin): infrastructure shell + dashboard + toast service

Pose les fondations de la réorganisation admin (spec 2026-05-23) :
- AdminLayoutComponent : sidebar groupée (CONTENU/SITE/MESURES) + router-outlet
- DashboardComponent : 4 actions rapides
- ToastService + ToastsComponent : gestion globale des toasts
- Bascule /admin de loadComponent vers loadChildren
- Route /admin/legacy temporaire pointant vers l'ancien AdminComponent"
```

---

## Task 2 : AnalyticsComponent

**Fichiers :**
- Créer : `frontend/src/app/pages/admin/analytics/analytics.component.ts`
- Créer : `frontend/src/app/pages/admin/analytics/analytics.component.spec.ts`
- Modifier : `frontend/src/app/pages/admin/admin.routes.ts` (ajouter route `analytics`)
- Modifier : `frontend/src/app/pages/admin/admin.component.ts` (retirer le bloc `tab() === 'analytics'`, le bouton de tab, l'entrée `analytics` du type `Tab`, les méthodes `umamiConfigured()`, `umamiIframeUrl()`, l'import `DomSanitizer`/`SafeResourceUrl`)

- [ ] **Step 1 : Écrire `analytics.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AnalyticsComponent } from './analytics.component';

describe('AnalyticsComponent', () => {
  afterEach(() => {
    delete (window as any).__UMAMI__;
  });

  it('crée le composant', async () => {
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche le fallback quand __UMAMI__ est absent', async () => {
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.umami-fallback'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('iframe.umami-frame'))).toBeFalsy();
  });

  it('affiche l\'iframe quand __UMAMI__ est complet', async () => {
    (window as any).__UMAMI__ = { websiteId: 'abc', shareToken: 'xyz' };
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('iframe.umami-frame'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.umami-fallback'))).toBeFalsy();
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Commande : `cd frontend && npx ng test --watch=false --include='**/analytics.component.spec.ts'`
Attendu : ÉCHEC (module inexistant).

- [ ] **Step 3 : Implémenter `analytics/analytics.component.ts`**

```typescript
import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-analytics',
  standalone: true,
  template: `
    @if (umamiConfigured()) {
      <iframe
        class="umami-frame"
        [src]="umamiIframeUrl()"
        title="Analytics Umami"
        loading="lazy"></iframe>
    } @else {
      <div class="umami-fallback">
        <h2>Analytics</h2>
        <p>Configuration analytics manquante. Renseignez <code>UMAMI_WEBSITE_ID</code> et <code>UMAMI_SHARE_TOKEN</code> dans les variables d'environnement du conteneur frontend, puis redémarrez-le.</p>
      </div>
    }
  `,
  styles: [`
    .umami-frame {
      width: 100%;
      height: calc(100vh - 280px);
      min-height: 600px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
    }
    .umami-fallback {
      padding: 48px;
      border: 1px dashed var(--color-line);
      background: var(--color-bg-alt);
      text-align: center;
    }
    .umami-fallback h2 { margin: 0 0 16px; font-size: 1.5rem; }
    .umami-fallback p { margin: 0; color: var(--color-ink-soft); }
    .umami-fallback code {
      background: var(--color-bg);
      padding: 2px 6px;
      border: 1px solid var(--color-line);
      font-size: 0.85rem;
    }
  `]
})
export class AnalyticsComponent {
  private readonly sanitizer = inject(DomSanitizer);

  protected umamiConfigured(): boolean {
    const env = (window as unknown as { __UMAMI__?: { websiteId?: string; shareToken?: string } }).__UMAMI__;
    return !!(env && env.websiteId && env.shareToken);
  }

  protected umamiIframeUrl(): SafeResourceUrl {
    const env = (window as unknown as { __UMAMI__?: { websiteId?: string; shareToken?: string } }).__UMAMI__;
    const url = `/umami/share/${env?.shareToken ?? ''}/${env?.websiteId ?? ''}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
```

- [ ] **Step 4 : Vérifier le passage**

Commande : `cd frontend && npx ng test --watch=false --include='**/analytics.component.spec.ts'`
Attendu : 3 tests OK.

- [ ] **Step 5 : Ajouter la route `analytics` dans `admin.routes.ts`**

Insérer dans le tableau `children` avant l'entrée `legacy` :

```typescript
{
  path: 'analytics',
  loadComponent: () => import('./analytics/analytics.component').then(m => m.AnalyticsComponent),
  title: 'Analytics — Administration',
},
```

- [ ] **Step 6 : Retirer la section analytics du monolithe**

Dans `frontend/src/app/pages/admin/admin.component.ts` :

1. Retirer dans le type `Tab` la valeur `'analytics'`.
2. Retirer le bouton de tab `<button … switchTab('analytics')…>Analytics</button>`.
3. Retirer l'entrée `analytics: 'Analytics'` dans `tabLabels`.
4. Retirer tout le bloc `@if (tab() === 'analytics') { … }` du template.
5. Retirer les méthodes `umamiConfigured()` et `umamiIframeUrl()`.
6. Retirer l'injection `private readonly sanitizer = inject(DomSanitizer);` (si plus utilisée).
7. Retirer l'import `DomSanitizer, SafeResourceUrl` (si plus utilisé).
8. Retirer les styles inutilisés (`.umami-frame`, `.umami-fallback`).
9. Mettre à jour le commentaire du switch tab par défaut si nécessaire.

- [ ] **Step 7 : Adapter `admin.component.spec.ts`**

Retirer tout test qui référence l'onglet `analytics` (recherche : `'analytics'`). Si aucun test n'existe pour cet onglet, laisser tel quel.

- [ ] **Step 8 : Lancer tous les tests frontend**

Commande : `cd frontend && npx ng test --watch=false`
Attendu : tous tests OK.

- [ ] **Step 9 : Smoke test manuel**

```powershell
cd frontend
npm start
```

Navigation `/admin/analytics` → affiche iframe Umami (ou fallback selon env). Le monolithe `/admin/legacy` ne propose plus l'onglet Analytics.

- [ ] **Step 10 : Commit**

```bash
git add frontend/src/app/pages/admin/analytics \
        frontend/src/app/pages/admin/admin.routes.ts \
        frontend/src/app/pages/admin/admin.component.ts \
        frontend/src/app/pages/admin/admin.component.spec.ts
git commit -m "feat(admin): extraire AnalyticsComponent (route /admin/analytics)

Première section extraite du monolithe vers le nouveau shell.
- AnalyticsComponent standalone avec iframe Umami + fallback
- Route /admin/analytics ajoutée à admin.routes.ts
- Bloc analytics retiré du monolithe (template + méthodes + import DomSanitizer)"
```

---

## Task 3 : TypographieComponent

**Fichiers :**
- Créer : `frontend/src/app/pages/admin/typographie/typographie.component.ts`
- Créer : `frontend/src/app/pages/admin/typographie/typographie.component.spec.ts`
- Modifier : `frontend/src/app/pages/admin/admin.routes.ts` (ajouter route `typographie`)
- Modifier : `frontend/src/app/pages/admin/admin.component.ts` (retirer le bloc `tab() === 'typography'`)

- [ ] **Step 1 : Écrire `typographie.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { TypographieComponent } from './typographie.component';
import { ToastService } from '../shared/toast.service';

describe('TypographieComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypographieComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('crée le composant et charge les contenus typo', () => {
    const fixture = TestBed.createComponent(TypographieComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/site-content');
    expect(req.request.method).toBe('GET');
    req.flush({ 'typo.title.font': 'serif', 'typo.title.style': 'italic' });
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche une carte par rôle typo', () => {
    const fixture = TestBed.createComponent(TypographieComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/site-content').flush({});
    fixture.detectChanges();
    const cards = fixture.debugElement.queryAll(By.css('.typo-card'));
    expect(cards.length).toBeGreaterThan(0);
  });

  it('saveTypo() persiste la sélection et notifie via ToastService', () => {
    const fixture = TestBed.createComponent(TypographieComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/site-content').flush({});
    fixture.detectChanges();
    (fixture.componentInstance as any).saveTypo();
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/site-content');
    put.flush({});
    expect(toast.success).toHaveBeenCalled();
  });

  it('saveTypo() affiche un toast d\'erreur si l\'API échoue', () => {
    const fixture = TestBed.createComponent(TypographieComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/site-content').flush({});
    fixture.detectChanges();
    (fixture.componentInstance as any).saveTypo();
    httpMock.expectOne('/api/admin/site-content').flush({}, { status: 500, statusText: 'fail' });
    expect(toast.error).toHaveBeenCalled();
  });
});
```

> NOTE : si les routes exactes `/api/site-content` et `/api/admin/site-content` ne correspondent pas à `PortfolioService`, ajuster en ouvrant `frontend/src/app/services/portfolio.service.ts` aux méthodes `getContent()` et `updateContent()`.

- [ ] **Step 2 : Vérifier l'échec**

Commande : `cd frontend && npx ng test --watch=false --include='**/typographie.component.spec.ts'`
Attendu : ÉCHEC (module inexistant).

- [ ] **Step 3 : Implémenter `typographie/typographie.component.ts`**

```typescript
import { Component, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { SiteContent } from '../../../models/site-content.model';
import { TITLE_FONTS, TITLE_STYLES, titleStyle, TypoRole, TYPO_ROLES } from '../../../utils/title-style';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-typographie',
  standalone: true,
  imports: [ReactiveFormsModule, NgStyle],
  template: `
    <div class="typo-editor">
      <p class="hint">Choisis une police et un style pour chaque rôle typographique. Les changements s'appliquent automatiquement à toutes les zones du site qui partagent ce rôle.</p>
      <form [formGroup]="typoForm" (ngSubmit)="saveTypo()">
        <div class="typo-grid">
          @for (role of typoRoles; track role.value) {
            <article class="typo-card">
              <header>
                <h3>{{ role.label }}</h3>
                <span class="role-key">typo.{{ role.value }}</span>
              </header>

              <div class="typo-controls">
                <label>
                  <span>Police</span>
                  <select [formControlName]="role.value + '_font'">
                    <option value="">— par défaut —</option>
                    @for (f of titleFonts; track f.value) {
                      <option [value]="f.value">{{ f.label }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>Style</span>
                  <select [formControlName]="role.value + '_style'">
                    <option value="">— par défaut —</option>
                    @for (s of titleStyles; track s.value) {
                      <option [value]="s.value">{{ s.label }}</option>
                    }
                  </select>
                </label>
              </div>

              <div class="typo-preview"
                   [class.eyebrow-preview]="role.value === 'eyebrow'"
                   [ngStyle]="previewStyleFor(role.value)">
                {{ role.preview }}
              </div>
            </article>
          }
        </div>

        <div class="texts-actions">
          <button type="submit" class="btn-primary" [disabled]="savingTypo()">
            {{ savingTypo() ? 'Enregistrement…' : 'Enregistrer la typographie' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .typo-editor { max-width: 920px; }
    .typo-editor .hint { margin: 0 0 32px; color: var(--color-ink-soft); font-size: 0.92rem; }
    .typo-grid { display: flex; flex-direction: column; gap: 20px; margin-bottom: 32px; }
    .typo-card {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 24px;
      align-items: center;
      padding: 24px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
    }
    .typo-card header { display: flex; flex-direction: column; gap: 6px; }
    .typo-card header h3 { font-family: var(--serif); font-weight: 400; font-size: 1.3rem; line-height: 1.2; margin: 0; color: var(--color-ink); }
    .typo-card .role-key { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .typo-controls { grid-column: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .typo-controls label { display: flex; flex-direction: column; gap: 6px; }
    .typo-controls label > span { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .typo-controls select { font: inherit; padding: 8px 10px; border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink); }
    .typo-preview { grid-column: 2; grid-row: 1 / span 2; padding: 24px; background: var(--color-bg-alt); border-left: 2px solid var(--color-ink); font-size: 1.6rem; line-height: 1.25; color: var(--color-ink); }
    .typo-preview.eyebrow-preview { font-size: 0.78rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .texts-actions { display: flex; gap: 12px; }
    .btn-primary { padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0; cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 720px) {
      .typo-card { grid-template-columns: 1fr; }
      .typo-controls { grid-column: 1; }
      .typo-preview { grid-column: 1; grid-row: auto; }
    }
  `]
})
export class TypographieComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly savingTypo = signal(false);
  protected readonly titleFonts = TITLE_FONTS;
  protected readonly titleStyles = TITLE_STYLES;
  protected readonly typoRoles = TYPO_ROLES;

  protected readonly typoForm = this.fb.group({
    'title_font': [''],
    'title_style': [''],
    'section-title_font': [''],
    'section-title_style': [''],
    'subtitle_font': [''],
    'subtitle_style': [''],
    'card-title_font': [''],
    'card-title_style': [''],
    'eyebrow_font': [''],
    'eyebrow_style': [''],
  });

  constructor() {
    this.portfolio.getContent().subscribe({
      next: content => this.hydrateTypoRoles(content),
      error: () => this.toast.error('Impossible de charger la typographie.'),
    });
  }

  private hydrateTypoRoles(content: SiteContent): void {
    this.typoForm.reset({
      'title_font': content['typo.title.font'] ?? '',
      'title_style': content['typo.title.style'] ?? '',
      'section-title_font': content['typo.section-title.font'] ?? '',
      'section-title_style': content['typo.section-title.style'] ?? '',
      'subtitle_font': content['typo.subtitle.font'] ?? '',
      'subtitle_style': content['typo.subtitle.style'] ?? '',
      'card-title_font': content['typo.card-title.font'] ?? '',
      'card-title_style': content['typo.card-title.style'] ?? '',
      'eyebrow_font': content['typo.eyebrow.font'] ?? '',
      'eyebrow_style': content['typo.eyebrow.style'] ?? '',
    });
  }

  protected previewStyleFor(role: TypoRole): { [prop: string]: string } {
    const v = this.typoForm.getRawValue();
    const synthetic: SiteContent = {
      [`typo.${role}.font`]: (v[`${role}_font` as keyof typeof v] as string) ?? '',
      [`typo.${role}.style`]: (v[`${role}_style` as keyof typeof v] as string) ?? '',
    };
    return titleStyle(synthetic, `typo.${role}`);
  }

  saveTypo(): void {
    const v = this.typoForm.getRawValue();
    const payload: SiteContent = {
      'typo.title.font': v['title_font'] ?? '',
      'typo.title.style': v['title_style'] ?? '',
      'typo.section-title.font': v['section-title_font'] ?? '',
      'typo.section-title.style': v['section-title_style'] ?? '',
      'typo.subtitle.font': v['subtitle_font'] ?? '',
      'typo.subtitle.style': v['subtitle_style'] ?? '',
      'typo.card-title.font': v['card-title_font'] ?? '',
      'typo.card-title.style': v['card-title_style'] ?? '',
      'typo.eyebrow.font': v['eyebrow_font'] ?? '',
      'typo.eyebrow.style': v['eyebrow_style'] ?? '',
    };
    this.savingTypo.set(true);
    this.portfolio.updateContent(payload).subscribe({
      next: () => {
        this.savingTypo.set(false);
        this.toast.success('Typographie enregistrée.');
      },
      error: () => {
        this.savingTypo.set(false);
        this.toast.error('Erreur lors de l\'enregistrement de la typographie.');
      }
    });
  }
}
```

- [ ] **Step 4 : Vérifier le passage** — `cd frontend && npx ng test --watch=false --include='**/typographie.component.spec.ts'` → 4 tests OK.

- [ ] **Step 5 : Ajouter la route `typographie` dans `admin.routes.ts`** (insérer avant `email`) :

```typescript
{
  path: 'typographie',
  loadComponent: () => import('./typographie/typographie.component').then(m => m.TypographieComponent),
  title: 'Typographie — Administration',
},
```

- [ ] **Step 6 : Retirer la section typo du monolithe** (`admin.component.ts`) :
  1. Retirer `'typography'` du type `Tab`.
  2. Retirer le bouton `<button … switchTab('typography')…>Typographie</button>`.
  3. Retirer `typography: 'Typographie'` de `tabLabels`.
  4. Retirer le bloc `@if (tab() === 'typography') { … }`.
  5. Retirer `typoForm`, `savingTypo`, `titleFonts`, `titleStyles`, `typoRoles`, `hydrateTypoRoles()`, `previewStyleFor()`, `saveTypo()`.
  6. Dans `refreshTexts()`, retirer l'appel `this.hydrateTypoRoles(content);`.
  7. Retirer l'import `TITLE_FONTS, TITLE_STYLES, titleStyle, TypoRole, TYPO_ROLES` et `NgStyle` si plus utilisés.
  8. Retirer les styles `.typo-editor`, `.typo-grid`, `.typo-card`, `.typo-controls`, `.typo-preview`.

- [ ] **Step 7 : Adapter `admin.component.spec.ts`** — retirer les tests qui référencent `'typography'`.

- [ ] **Step 8 : Lancer tous les tests** — `cd frontend && npx ng test --watch=false` → tous OK.

- [ ] **Step 9 : Smoke test manuel** — navigation `/admin/typographie`, changer une police, enregistrer, vérifier le toast.

- [ ] **Step 10 : Commit**

```bash
git add frontend/src/app/pages/admin/typographie \
        frontend/src/app/pages/admin/admin.routes.ts \
        frontend/src/app/pages/admin/admin.component.ts \
        frontend/src/app/pages/admin/admin.component.spec.ts
git commit -m "feat(admin): extraire TypographieComponent (route /admin/typographie)

- TypographieComponent standalone avec form, preview, sauvegarde via PortfolioService
- ToastService utilisé pour les feedbacks
- Route /admin/typographie ajoutée
- Bloc typographie retiré du monolithe"
```

---

## Task 4 : TextesComponent

**Fichiers :**
- Créer : `frontend/src/app/pages/admin/textes/textes.component.ts`
- Créer : `frontend/src/app/pages/admin/textes/textes.component.spec.ts`
- Modifier : `frontend/src/app/pages/admin/admin.routes.ts` (ajouter route `textes`)
- Modifier : `frontend/src/app/pages/admin/admin.component.ts` (retirer le bloc `tab() === 'texts'`)

- [ ] **Step 1 : Écrire `textes.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { TextesComponent } from './textes.component';
import { ToastService } from '../shared/toast.service';

describe('TextesComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('charge le contenu site au démarrage', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/site-content');
    req.flush({ 'home.hero.eyebrow': 'Atelier' });
    fixture.detectChanges();
    const eyebrowInput = fixture.debugElement.query(By.css('input[formControlName="home_hero_eyebrow"]'));
    expect(eyebrowInput.nativeElement.value).toBe('Atelier');
  });

  it('affiche les 3 grandes sections (Accueil / Studio / Contact)', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/site-content').flush({});
    fixture.detectChanges();
    const titles = fixture.debugElement.queryAll(By.css('.texts-section-title'));
    expect(titles.length).toBe(3);
  });

  it('saveTexts() envoie un PUT et notifie via ToastService', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/site-content').flush({});
    fixture.detectChanges();
    (fixture.componentInstance as any).saveTexts();
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/site-content');
    put.flush({});
    expect(toast.success).toHaveBeenCalled();
  });

  it('saveTexts() affiche un toast d\'erreur en cas d\'échec API', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/site-content').flush({});
    fixture.detectChanges();
    (fixture.componentInstance as any).saveTexts();
    httpMock.expectOne('/api/admin/site-content').flush({}, { status: 500, statusText: 'fail' });
    expect(toast.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Vérifier l'échec** — `cd frontend && npx ng test --watch=false --include='**/textes.component.spec.ts'` → ÉCHEC (module inexistant).

- [ ] **Step 3 : Implémenter `textes/textes.component.ts`**

```typescript
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { SiteContent } from '../../../models/site-content.model';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-textes',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (loading()) {
      <p class="status">Chargement des textes…</p>
    } @else {
      <form class="texts-form" [formGroup]="textsForm" (ngSubmit)="saveTexts()">

        <div class="texts-section">
          <h2 class="texts-section-title">Page d'accueil</h2>

          <div class="texts-group">
            <h3 class="texts-group-label">Bloc héro</h3>
            <label>
              <span>Chapeau</span>
              <input type="text" formControlName="home_hero_eyebrow" />
            </label>
            <label>
              <span>Titre (saut de ligne avec ↵)</span>
              <textarea rows="2" formControlName="home_hero_title"></textarea>
            </label>
            <label>
              <span>Accroche</span>
              <textarea rows="3" formControlName="home_hero_lead"></textarea>
            </label>
          </div>

          <div class="texts-group">
            <h3 class="texts-group-label">Section mobilier phare</h3>
            <label>
              <span>Chapeau</span>
              <input type="text" formControlName="home_featured_eyebrow" />
            </label>
            <label>
              <span>Titre</span>
              <input type="text" formControlName="home_featured_title" />
            </label>
          </div>

          <div class="texts-group">
            <h3 class="texts-group-label">Section expositions</h3>
            <label>
              <span>Chapeau</span>
              <input type="text" formControlName="home_exhibitions_eyebrow" />
            </label>
            <label>
              <span>Titre</span>
              <input type="text" formControlName="home_exhibitions_title" />
            </label>
          </div>

          <div class="texts-group">
            <h3 class="texts-group-label">Citation</h3>
            <label>
              <span>Texte de la citation</span>
              <textarea rows="2" formControlName="home_quote_text"></textarea>
            </label>
            <label>
              <span>Attribution</span>
              <input type="text" formControlName="home_quote_cite" />
            </label>
          </div>
        </div>

        <div class="texts-section">
          <h2 class="texts-section-title">Studio — Processus de création</h2>

          @for (i of [1,2,3,4]; track i) {
            <div class="texts-group">
              <h3 class="texts-group-label">Étape 0{{ i }}</h3>
              <div class="row-2">
                <label>
                  <span>Titre</span>
                  <input type="text" [formControlName]="'studio_step' + i + '_title'" />
                </label>
              </div>
              <label>
                <span>Description</span>
                <textarea rows="3" [formControlName]="'studio_step' + i + '_desc'"></textarea>
              </label>
            </div>
          }
        </div>

        <div class="texts-section">
          <h2 class="texts-section-title">Contact &amp; réseaux sociaux</h2>

          <div class="texts-group">
            <label>
              <span>Localisation</span>
              <input type="text" formControlName="profile_location" />
            </label>
            <div class="row-2">
              <label>
                <span>Email de contact</span>
                <input type="email" formControlName="profile_contactEmail" />
              </label>
              <label>
                <span>Téléphone</span>
                <input type="tel" formControlName="profile_phone" />
              </label>
            </div>
            <div class="row-2">
              <label>
                <span>Instagram (URL)</span>
                <input type="url" formControlName="profile_instagram" placeholder="https://instagram.com/votre-handle" />
              </label>
              <label>
                <span>LinkedIn (URL)</span>
                <input type="url" formControlName="profile_linkedin" placeholder="https://www.linkedin.com/in/votre-profil" />
              </label>
            </div>
          </div>
        </div>

        <div class="texts-actions">
          <button type="submit" class="btn-primary" [disabled]="saving()">
            {{ saving() ? 'Enregistrement…' : 'Enregistrer les textes' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: [`
    .status { color: var(--color-mute); }
    .texts-form { max-width: 760px; display: flex; flex-direction: column; gap: 40px; }
    .texts-section { display: flex; flex-direction: column; gap: 24px; }
    .texts-section-title { font-family: var(--serif); font-weight: 400; font-size: 1.6rem; margin: 0 0 8px; }
    .texts-group { display: flex; flex-direction: column; gap: 14px; padding: 24px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .texts-group-label { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); margin: 0; }
    .texts-group label { display: flex; flex-direction: column; gap: 6px; }
    .texts-group label > span { font-size: 0.78rem; color: var(--color-ink-soft); }
    .texts-group input, .texts-group textarea {
      font: inherit; padding: 8px 10px; border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink); resize: vertical;
    }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .texts-actions { display: flex; gap: 12px; }
    .btn-primary { padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0; cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 720px) {
      .row-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class TextesComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly textsForm = this.fb.group({
    home_hero_eyebrow: [''],
    home_hero_title: [''],
    home_hero_lead: [''],
    home_featured_eyebrow: [''],
    home_featured_title: [''],
    home_exhibitions_eyebrow: [''],
    home_exhibitions_title: [''],
    home_quote_text: [''],
    home_quote_cite: [''],
    studio_step1_title: [''],
    studio_step1_desc: [''],
    studio_step2_title: [''],
    studio_step2_desc: [''],
    studio_step3_title: [''],
    studio_step3_desc: [''],
    studio_step4_title: [''],
    studio_step4_desc: [''],
    profile_contactEmail: [''],
    profile_phone: [''],
    profile_location: [''],
    profile_instagram: [''],
    profile_linkedin: [''],
  });

  constructor() {
    this.portfolio.getContent().subscribe({
      next: content => {
        this.loading.set(false);
        this.textsForm.reset({
          home_hero_eyebrow: content['home.hero.eyebrow'] ?? '',
          home_hero_title: content['home.hero.title'] ?? '',
          home_hero_lead: content['home.hero.lead'] ?? '',
          home_featured_eyebrow: content['home.featured.eyebrow'] ?? '',
          home_featured_title: content['home.featured.title'] ?? '',
          home_exhibitions_eyebrow: content['home.exhibitions.eyebrow'] ?? '',
          home_exhibitions_title: content['home.exhibitions.title'] ?? '',
          home_quote_text: content['home.quote.text'] ?? '',
          home_quote_cite: content['home.quote.cite'] ?? '',
          studio_step1_title: content['studio.step1.title'] ?? '',
          studio_step1_desc: content['studio.step1.desc'] ?? '',
          studio_step2_title: content['studio.step2.title'] ?? '',
          studio_step2_desc: content['studio.step2.desc'] ?? '',
          studio_step3_title: content['studio.step3.title'] ?? '',
          studio_step3_desc: content['studio.step3.desc'] ?? '',
          studio_step4_title: content['studio.step4.title'] ?? '',
          studio_step4_desc: content['studio.step4.desc'] ?? '',
          profile_contactEmail: content['profile.contactEmail'] ?? '',
          profile_phone: content['profile.phone'] ?? '',
          profile_location: content['profile.location'] ?? '',
          profile_instagram: content['profile.instagram'] ?? '',
          profile_linkedin: content['profile.linkedin'] ?? '',
        });
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Impossible de charger les textes.');
      }
    });
  }

  saveTexts(): void {
    const v = this.textsForm.getRawValue();
    const payload: SiteContent = {
      'home.hero.eyebrow': v.home_hero_eyebrow ?? '',
      'home.hero.title': v.home_hero_title ?? '',
      'home.hero.lead': v.home_hero_lead ?? '',
      'home.featured.eyebrow': v.home_featured_eyebrow ?? '',
      'home.featured.title': v.home_featured_title ?? '',
      'home.exhibitions.eyebrow': v.home_exhibitions_eyebrow ?? '',
      'home.exhibitions.title': v.home_exhibitions_title ?? '',
      'home.quote.text': v.home_quote_text ?? '',
      'home.quote.cite': v.home_quote_cite ?? '',
      'studio.step1.title': v.studio_step1_title ?? '',
      'studio.step1.desc': v.studio_step1_desc ?? '',
      'studio.step2.title': v.studio_step2_title ?? '',
      'studio.step2.desc': v.studio_step2_desc ?? '',
      'studio.step3.title': v.studio_step3_title ?? '',
      'studio.step3.desc': v.studio_step3_desc ?? '',
      'studio.step4.title': v.studio_step4_title ?? '',
      'studio.step4.desc': v.studio_step4_desc ?? '',
      'profile.contactEmail': v.profile_contactEmail ?? '',
      'profile.phone': v.profile_phone ?? '',
      'profile.location': v.profile_location ?? '',
      'profile.instagram': v.profile_instagram ?? '',
      'profile.linkedin': v.profile_linkedin ?? '',
    };
    this.saving.set(true);
    this.portfolio.updateContent(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Textes mis à jour avec succès.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erreur lors de l\'enregistrement des textes.');
      }
    });
  }
}
```

- [ ] **Step 4 : Vérifier le passage** — `cd frontend && npx ng test --watch=false --include='**/textes.component.spec.ts'` → 4 tests OK.

- [ ] **Step 5 : Ajouter la route `textes` dans `admin.routes.ts`** (insérer après `expositions`/avant `mediatheque`) :

```typescript
{
  path: 'textes',
  loadComponent: () => import('./textes/textes.component').then(m => m.TextesComponent),
  title: 'Textes — Administration',
},
```

- [ ] **Step 6 : Retirer la section textes du monolithe** (`admin.component.ts`) :
  1. Retirer `'texts'` du type `Tab`.
  2. Retirer le bouton `<button … switchTab('texts')…>Textes du site</button>`.
  3. Retirer `texts: 'Textes du site'` de `tabLabels`.
  4. Retirer le bloc `@if (tab() === 'texts') { … }`.
  5. Retirer `textsForm`, `loadingTexts`.
  6. Retirer `refreshTexts()`. Garder uniquement la partie nav (qui partira en Task 8 — pour l'instant déplacer le chargement de `navMobilierVisible/navExpositionsVisible/navStudioVisible` dans le constructeur via un appel direct à `portfolio.getContent()`).
  7. Retirer `saveTexts()`.
  8. Retirer les styles `.texts-form`, `.texts-section`, `.texts-group`, `.texts-actions`.
  9. Retirer du constructeur l'appel `this.refreshTexts();` ; à la place : `this.portfolio.getContent().subscribe(c => { this.navMobilierVisible.set(c['nav.mobilier.visible'] !== 'false'); this.navExpositionsVisible.set(c['nav.expositions.visible'] !== 'false'); this.navStudioVisible.set(c['nav.studio.visible'] !== 'false'); });`

- [ ] **Step 7 : Adapter `admin.component.spec.ts`** — retirer les tests `'texts'`.

- [ ] **Step 8 : Tous les tests** — `cd frontend && npx ng test --watch=false` → OK.

- [ ] **Step 9 : Smoke test manuel** — `/admin/textes` charge correctement, modifier un champ, enregistrer, toast OK.

- [ ] **Step 10 : Commit**

```bash
git add frontend/src/app/pages/admin/textes \
        frontend/src/app/pages/admin/admin.routes.ts \
        frontend/src/app/pages/admin/admin.component.ts \
        frontend/src/app/pages/admin/admin.component.spec.ts
git commit -m "feat(admin): extraire TextesComponent (route /admin/textes)

- TextesComponent standalone avec form 22 champs (home/studio/profile)
- ToastService utilisé pour les feedbacks
- Route /admin/textes ajoutée
- Bloc textes retiré du monolithe ; refreshTexts() simplifié à la hydratation nav uniquement"
```

---

### Task 5 — MediathequeComponent + PhotoPickerComponent

## Task 5 : MediathequeComponent + PhotoPickerComponent

**Fichiers :**
- Créer : `frontend/src/app/pages/admin/shared/photo-picker.component.ts`
- Créer : `frontend/src/app/pages/admin/shared/photo-picker.component.spec.ts`
- Créer : `frontend/src/app/pages/admin/mediatheque/mediatheque.component.ts`
- Créer : `frontend/src/app/pages/admin/mediatheque/mediatheque.component.spec.ts`
- Modifier : `frontend/src/app/pages/admin/admin.routes.ts` (ajouter route `mediatheque`)
- Modifier : `frontend/src/app/pages/admin/admin.component.ts` (retirer le bloc `tab() === 'photos'` + le viewer ; **garder temporairement la modale `photoPicker` inline** : elle sera retirée en Task 6 et Task 7 quand les sections Mobilier/Expositions migrent et basculent sur PhotoPickerComponent extrait)

> NOTE IMPORTANTE : la médiathèque (`tab() === 'photos'`) est extraite ici, mais le **picker inline** du monolithe reste actif pour les onglets Mobilier et Expositions tant qu'ils ne sont pas migrés (Tasks 6-7). Le PhotoPickerComponent partagé est créé en parallèle dans `shared/` mais n'est consommé que par les nouveaux composants — pas par le monolithe.

- [ ] **Step 1 : Écrire `shared/photo-picker.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PhotoPickerComponent } from './photo-picker.component';
import { Photo } from '../../../models/photo.model';

describe('PhotoPickerComponent', () => {
  const photos: Photo[] = [
    { id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', mimeType: 'image/jpeg', sizeBytes: 1, createdAt: '' },
    { id: '2', filename: 'b.jpg', originalName: 'B', url: '/uploads/b.jpg', mimeType: 'image/jpeg', sizeBytes: 1, createdAt: '' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PhotoPickerComponent] }).compileComponents();
  });

  it('affiche la grille de photos', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.picker-item')).length).toBe(2);
  });

  it('affiche un message si la galerie est vide', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', []);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.picker-empty'))).toBeTruthy();
  });

  it('émet (selected) au clic sur une photo', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    let received: Photo | null = null;
    fixture.componentInstance.selected.subscribe(p => received = p);
    fixture.debugElement.queryAll(By.css('.picker-item'))[0].nativeElement.click();
    expect(received).toEqual(photos[0]);
  });

  it('émet (closed) au clic sur le backdrop', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => closed = true);
    fixture.debugElement.query(By.css('.picker-backdrop')).nativeElement.click();
    expect(closed).toBeTrue();
  });

  it('émet (closed) à la touche Escape', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => closed = true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBeTrue();
  });
});
```

- [ ] **Step 2 : Vérifier l'échec** — `cd frontend && npx ng test --watch=false --include='**/photo-picker.component.spec.ts'` → ÉCHEC.

- [ ] **Step 3 : Implémenter `shared/photo-picker.component.ts`**

```typescript
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Photo } from '../../../models/photo.model';

@Component({
  selector: 'app-photo-picker',
  standalone: true,
  template: `
    <div class="picker-backdrop" (click)="emitClose()">
      <div class="picker-panel" (click)="$event.stopPropagation()">
        <div class="picker-head">
          <h3>
            @if (target === 'gallery') { Ajouter à la galerie } @else { Choisir une image }
          </h3>
          <button type="button" class="picker-close" (click)="emitClose()" aria-label="Fermer">×</button>
        </div>
        @if (target === 'gallery') {
          <p class="picker-hint">Cliquez sur une photo pour l'ajouter à la galerie.</p>
        } @else {
          <p class="picker-hint">Cliquez sur une photo pour la sélectionner comme image principale.</p>
        }
        @if (photos.length === 0) {
          <p class="picker-empty">Aucune photo disponible. Importez des images dans la Médiathèque.</p>
        } @else {
          <div class="picker-grid">
            @for (photo of photos; track photo.id) {
              <button type="button" class="picker-item" (click)="select(photo)" [title]="photo.originalName">
                <img [src]="photo.url" [alt]="photo.originalName" loading="lazy" />
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .picker-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .picker-panel {
      background: var(--color-bg); width: 100%; max-width: 860px; max-height: 80vh;
      display: flex; flex-direction: column;
    }
    .picker-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid var(--color-line); flex-shrink: 0;
    }
    .picker-head h3 { margin: 0; font-size: 1.1rem; }
    .picker-close {
      background: transparent; border: 0; font-size: 1.5rem; color: var(--color-mute);
      cursor: pointer; line-height: 1; padding: 4px 8px;
    }
    .picker-close:hover { color: var(--color-ink); }
    .picker-hint { padding: 12px 24px 0; font-size: 0.85rem; color: var(--color-mute); flex-shrink: 0; margin: 0; }
    .picker-empty { padding: 32px 24px; color: var(--color-mute); font-size: 0.9rem; }
    .picker-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px; padding: 16px 24px 24px; overflow-y: auto;
    }
    .picker-item {
      border: 2px solid var(--color-line); background: var(--color-bg-alt); padding: 0;
      cursor: pointer; aspect-ratio: 1; overflow: hidden;
    }
    .picker-item:hover { border-color: var(--color-accent); }
    .picker-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `]
})
export class PhotoPickerComponent {
  @Input() target: 'cover' | 'gallery' = 'cover';
  @Input() photos: Photo[] = [];

  @Output() selected = new EventEmitter<Photo>();
  @Output() closed = new EventEmitter<void>();

  select(photo: Photo): void {
    this.selected.emit(photo);
  }

  emitClose(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
```

- [ ] **Step 4 : Vérifier le passage PhotoPicker** — `cd frontend && npx ng test --watch=false --include='**/photo-picker.component.spec.ts'` → 5 tests OK.

- [ ] **Step 5 : Écrire `mediatheque/mediatheque.component.spec.ts` (failing)**

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { MediathequeComponent } from './mediatheque.component';
import { ToastService } from '../shared/toast.service';

describe('MediathequeComponent', () => {
  let httpMock: HttpTestingController;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [MediathequeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(queryParams)) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock?.verify());

  it('charge la liste de photos au démarrage', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/photos');
    req.flush([{ id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', mimeType: 'image/jpeg', sizeBytes: 1, createdAt: '' }]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.photo-card')).length).toBe(1);
  });

  it('affiche un message vide quand pas de photo', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.photos-empty'))).toBeTruthy();
  });

  it('supprime une photo et notifie via toast', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([
      { id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', mimeType: 'image/jpeg', sizeBytes: 1, createdAt: '' }
    ]);
    fixture.detectChanges();
    (fixture.componentInstance as any).removePhoto({ id: '1', originalName: 'A' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/admin/photos/1').flush(null);
    expect(toast.success).toHaveBeenCalled();
  });

  it('déclenche le file input quand ?import=1 est présent', fakeAsync(() => {
    configure({ import: '1' });
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    const fileInput = fixture.debugElement.query(By.css('input[type="file"]')).nativeElement as HTMLInputElement;
    spyOn(fileInput, 'click');
    tick();
    fixture.detectChanges();
    expect(fileInput.click).toHaveBeenCalled();
  }));
});
```

- [ ] **Step 6 : Vérifier l'échec** — `cd frontend && npx ng test --watch=false --include='**/mediatheque.component.spec.ts'` → ÉCHEC.

- [ ] **Step 7 : Implémenter `mediatheque/mediatheque.component.ts`**

```typescript
import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PortfolioService } from '../../../services/portfolio.service';
import { Photo } from '../../../models/photo.model';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-mediatheque',
  standalone: true,
  template: `
    <div class="photos-tab">
      <div class="photos-upload-zone">
        <h2>Importer des photos</h2>
        <p class="photos-upload-hint">Formats acceptés : JPG, PNG, WebP, GIF · Taille max : 20 Mo par fichier</p>
        <input #fileInput type="file" accept="image/*" multiple style="display:none" (change)="uploadFiles($event)" />
        <button type="button" class="btn-primary" [disabled]="uploading()" (click)="fileInput.click()">
          {{ uploading() ? 'Importation en cours…' : 'Choisir des fichiers' }}
        </button>
      </div>

      @if (loading()) {
        <p class="status">Chargement de la médiathèque…</p>
      } @else if (photos().length === 0) {
        <p class="status photos-empty">Aucune photo importée. Commencez par importer des images ci-dessus.</p>
      } @else {
        <div class="photos-count">{{ photos().length }} photo{{ photos().length > 1 ? 's' : '' }}</div>
        <div class="photos-grid">
          @for (photo of photos(); track photo.id) {
            <div class="photo-card">
              <div class="photo-thumb">
                <button type="button" class="photo-thumb-btn" (click)="openViewer(photo)" [title]="photo.originalName">
                  <img [src]="photo.url" [alt]="photo.originalName" loading="lazy" />
                </button>
              </div>
              <div class="photo-info">
                <span class="photo-name" [title]="photo.originalName">{{ photo.originalName }}</span>
              </div>
              <div class="photo-actions">
                <button type="button" class="btn-copy" (click)="copyUrl(photo.url)" title="Copier l'URL">
                  Copier URL
                </button>
                <button type="button" class="photo-del" (click)="removePhoto(photo)" aria-label="Supprimer">×</button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (viewingPhoto()) {
      <div class="viewer-backdrop" (click)="closeViewer()">
        <div class="viewer-panel" (click)="$event.stopPropagation()">
          <button type="button" class="viewer-close" (click)="closeViewer()" aria-label="Fermer">×</button>
          <div class="viewer-img-wrap">
            <img [src]="viewingPhoto()!.url" [alt]="viewingPhoto()!.originalName" />
          </div>
          <div class="viewer-caption">
            <span class="viewer-name">{{ viewingPhoto()!.originalName }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .photos-tab { display: flex; flex-direction: column; gap: 24px; }
    .photos-upload-zone {
      padding: 32px; border: 1px dashed var(--color-line); background: var(--color-bg-alt); text-align: center;
    }
    .photos-upload-zone h2 { margin: 0 0 8px; font-size: 1.3rem; }
    .photos-upload-hint { margin: 0 0 20px; color: var(--color-mute); font-size: 0.85rem; }
    .btn-primary {
      padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0;
      cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { color: var(--color-mute); }
    .photos-count { font-size: 0.85rem; color: var(--color-mute); }
    .photos-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;
    }
    .photo-card { display: flex; flex-direction: column; border: 1px solid var(--color-line); background: var(--color-bg); }
    .photo-thumb { aspect-ratio: 1; overflow: hidden; }
    .photo-thumb-btn {
      background: transparent; border: 0; padding: 0; cursor: pointer; width: 100%; height: 100%; display: block;
    }
    .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .photo-info { padding: 8px 12px; }
    .photo-name { font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
    .photo-actions { display: flex; justify-content: space-between; padding: 8px 12px; border-top: 1px solid var(--color-line); }
    .btn-copy { background: transparent; border: 1px solid var(--color-line); padding: 4px 10px; font-size: 0.75rem; cursor: pointer; }
    .photo-del { background: transparent; border: 0; color: var(--color-mute); font-size: 1.2rem; cursor: pointer; padding: 0 6px; }
    .photo-del:hover { color: #b1532a; }

    .viewer-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 1100;
      display: flex; align-items: center; justify-content: center;
    }
    .viewer-panel {
      position: relative; display: flex; align-items: center; justify-content: center;
      width: 100%; height: 100%; padding: 64px 80px 56px; box-sizing: border-box;
    }
    .viewer-img-wrap { display: flex; align-items: center; justify-content: center; max-width: 100%; max-height: 100%; }
    .viewer-img-wrap img {
      max-width: 100%; max-height: calc(100vh - 120px); object-fit: contain; display: block;
      box-shadow: 0 8px 48px rgba(0,0,0,0.6);
    }
    .viewer-close {
      position: absolute; top: 16px; right: 20px; background: transparent; border: 0;
      color: rgba(255,255,255,0.7); font-size: 2.5rem; line-height: 1; cursor: pointer; padding: 4px 10px; z-index: 10;
    }
    .viewer-close:hover { color: #fff; }
    .viewer-caption {
      position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 24px;
      background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.75);
      font-size: 0.8rem; letter-spacing: 0.06em;
    }
    .viewer-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `]
})
export class MediathequeComponent implements AfterViewInit {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  protected readonly photos = signal<Photo[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly viewingPhoto = signal<Photo | null>(null);

  constructor() {
    this.refresh();
  }

  ngAfterViewInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('import') === '1') {
        setTimeout(() => this.fileInput?.nativeElement.click(), 0);
      }
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.portfolio.getPhotos().subscribe({
      next: data => { this.photos.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Impossible de charger la médiathèque.'); }
    });
  }

  uploadFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    this.uploading.set(true);
    let remaining = files.length;
    let errors = 0;

    for (const file of files) {
      this.portfolio.uploadPhoto(file).subscribe({
        next: photo => {
          this.photos.update(list => [photo, ...list]);
          remaining--;
          if (remaining === 0) {
            this.uploading.set(false);
            const msg = errors > 0
              ? `${files.length - errors} photo(s) importée(s), ${errors} erreur(s).`
              : `${files.length} photo(s) importée(s) avec succès.`;
            if (errors > 0) this.toast.error(msg); else this.toast.success(msg);
          }
        },
        error: () => {
          errors++;
          remaining--;
          if (remaining === 0) {
            this.uploading.set(false);
            this.toast.error(`${files.length - errors} photo(s) importée(s), ${errors} erreur(s).`);
          }
        }
      });
    }
    input.value = '';
  }

  removePhoto(photo: Photo): void {
    if (!confirm(`Supprimer la photo "${photo.originalName}" ?`)) return;
    this.portfolio.deletePhoto(photo.id).subscribe({
      next: () => {
        this.photos.update(list => list.filter(p => p.id !== photo.id));
        this.toast.success('Photo supprimée.');
      },
      error: () => this.toast.error('Erreur lors de la suppression.')
    });
  }

  copyUrl(url: string): void {
    navigator.clipboard.writeText(url).then(() => this.toast.success('URL copiée dans le presse-papier.'));
  }

  openViewer(photo: Photo): void { this.viewingPhoto.set(photo); }
  closeViewer(): void { this.viewingPhoto.set(null); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.viewingPhoto()) this.closeViewer();
  }
}
```

- [ ] **Step 8 : Vérifier le passage Mediatheque** — `cd frontend && npx ng test --watch=false --include='**/mediatheque.component.spec.ts'` → 4 tests OK.

- [ ] **Step 9 : Ajouter la route `mediatheque` dans `admin.routes.ts`** :

```typescript
{
  path: 'mediatheque',
  loadComponent: () => import('./mediatheque/mediatheque.component').then(m => m.MediathequeComponent),
  title: 'Médiathèque — Administration',
},
```

- [ ] **Step 10 : Retirer la section photos + viewer du monolithe** (`admin.component.ts`) :
  1. Retirer `'photos'` du type `Tab`.
  2. Retirer le bouton `<button … switchTab('photos')…>Médiathèque</button>`.
  3. Retirer `photos: 'Médiathèque'` de `tabLabels`.
  4. Retirer le bloc `@if (tab() === 'photos') { … }`.
  5. **GARDER** dans le monolithe : `photos` signal, `loadingPhotos`, `refreshPhotos()`, `uploading`, `viewingPhoto`, `photoPicker`, `openPicker()`, `closePicker()`, `pickerIsGallery()`, `selectPhoto()`, `openViewer()`, `closeViewer()`, `uploadFiles()`, `removePhoto()`, `copyUrl()`, le `@HostListener` Escape, et la modale picker inline en bas du template. Ces éléments restent nécessaires pour les onglets Mobilier et Expositions tant qu'ils ne sont pas migrés.
  6. Retirer le bloc `@if (viewingPhoto()) { viewer }` puisque le viewer n'est plus accessible (plus de tab `photos`).
  7. Retirer les styles `.photos-tab`, `.photos-upload-zone`, `.photos-count`, `.photos-grid`, `.photo-card`, `.photo-thumb`, `.photo-info`, `.photo-name`, `.photo-actions`, `.btn-copy`, `.photo-del`, `.viewer-backdrop`, `.viewer-panel`, `.viewer-img-wrap`, `.viewer-close`, `.viewer-caption`, `.viewer-name`.

- [ ] **Step 11 : Adapter `admin.component.spec.ts`** — retirer les tests qui référencent `'photos'` ou `viewingPhoto`.

- [ ] **Step 12 : Tous les tests** — `cd frontend && npx ng test --watch=false` → OK.

- [ ] **Step 13 : Smoke test manuel** — `/admin/mediatheque` charge, upload une photo, ouverture/fermeture du viewer (clic photo, Escape). `/admin/legacy` : les onglets Mobilier et Expositions doivent toujours pouvoir piocher des photos via le picker inline.

- [ ] **Step 14 : Commit**

```bash
git add frontend/src/app/pages/admin/shared/photo-picker.component.ts \
        frontend/src/app/pages/admin/shared/photo-picker.component.spec.ts \
        frontend/src/app/pages/admin/mediatheque \
        frontend/src/app/pages/admin/admin.routes.ts \
        frontend/src/app/pages/admin/admin.component.ts \
        frontend/src/app/pages/admin/admin.component.spec.ts
git commit -m "feat(admin): extraire MediathequeComponent + PhotoPickerComponent partagé

- MediathequeComponent : upload, grille, viewer (lightbox), query param ?import=1
- PhotoPickerComponent (shared) : modal réutilisable, target cover|gallery, Escape
- Route /admin/mediatheque ajoutée
- Bloc photos retiré du monolithe ; picker inline conservé pour Mobilier/Expositions"
```

---

### Task 6 — MobilierComponent + GalleryEditorComponent + bloc Catégories

## Task 6 : MobilierComponent + GalleryEditorComponent + bloc Catégories

**Fichiers :**
- Créer : `frontend/src/app/pages/admin/shared/gallery-editor.component.ts`
- Créer : `frontend/src/app/pages/admin/shared/gallery-editor.component.spec.ts`
- Créer : `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Créer : `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts`
- Modifier : `frontend/src/app/pages/admin/admin.routes.ts`
- Modifier : `frontend/src/app/pages/admin/admin.component.ts` (retirer le bloc Mobilier + section Catégories)

- [ ] **Step 1 : Écrire `gallery-editor.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { GalleryEditorComponent } from './gallery-editor.component';

describe('GalleryEditorComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('affiche le message vide quand images est vide', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', []);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.gallery-empty'))).toBeTruthy();
  });

  it('affiche une vignette par image', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', ['/a.jpg', '/b.jpg']);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.gallery-thumb')).length).toBe(2);
  });

  it('émet imagesChange quand on retire une image', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', ['/a.jpg', '/b.jpg']);
    let received: string[] | null = null;
    fixture.componentInstance.imagesChange.subscribe(v => received = v);
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('.thumb-remove'))[0].nativeElement.click();
    expect(received).toEqual(['/b.jpg']);
  });

  it('ouvre le PhotoPicker au clic sur "+ Ajouter" et charge les photos', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', []);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('.btn-pick')).nativeElement.click();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('app-photo-picker'))).toBeTruthy();
  });
});
```

- [ ] **Step 2 : Vérifier l'échec** — `cd frontend && npx ng test --watch=false --include='**/gallery-editor.component.spec.ts'` → ÉCHEC.

- [ ] **Step 3 : Implémenter `shared/gallery-editor.component.ts`**

```typescript
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { Photo } from '../../../models/photo.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { PhotoPickerComponent } from './photo-picker.component';

@Component({
  selector: 'app-gallery-editor',
  standalone: true,
  imports: [ReorderableDirective, PhotoPickerComponent],
  template: `
    <div class="gallery-block">
      <div class="gallery-block-head">
        <span class="gallery-label">Galerie</span>
        <button type="button" class="btn-pick" (click)="openPicker()" title="Ajouter depuis la médiathèque">
          + Ajouter
        </button>
      </div>
      @if (images.length === 0) {
        <p class="gallery-empty">Aucune image. Cliquez sur « Ajouter » pour insérer une photo depuis la médiathèque.</p>
      } @else {
        <ul class="gallery-thumbs" appReorderable (reordered)="onReorder($event)">
          @for (url of images; track url) {
            <li class="gallery-thumb">
              <img [src]="url" alt="" />
              <button type="button" class="thumb-remove" (click)="removeImage(url)" aria-label="Retirer">×</button>
            </li>
          }
        </ul>
        <p class="gallery-hint">Glisse une vignette pour réordonner.</p>
      }
    </div>

    @if (pickerOpen()) {
      <app-photo-picker
        target="gallery"
        [photos]="photos()"
        (selected)="onPhotoSelected($event)"
        (closed)="closePicker()" />
    }
  `,
  styles: [`
    .gallery-block { display: flex; flex-direction: column; gap: 8px; }
    .gallery-block-head { display: flex; align-items: center; justify-content: space-between; }
    .gallery-label { font-size: 0.78rem; color: var(--color-ink-soft); }
    .btn-pick {
      background: transparent; border: 1px solid var(--color-line); padding: 6px 12px;
      font-size: 0.78rem; cursor: pointer; color: var(--color-ink-soft);
    }
    .btn-pick:hover { color: var(--color-ink); border-color: var(--color-ink); }
    .gallery-empty { padding: 16px; background: var(--color-bg-alt); color: var(--color-mute); font-size: 0.85rem; margin: 0; }
    .gallery-thumbs {
      list-style: none; padding: 0; margin: 0; display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;
    }
    .gallery-thumb { position: relative; aspect-ratio: 1; border: 1px solid var(--color-line); cursor: grab; }
    .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb-remove {
      position: absolute; top: 4px; right: 4px;
      background: rgba(0,0,0,0.6); color: #fff; border: 0; width: 24px; height: 24px;
      border-radius: 50%; cursor: pointer; font-size: 1rem; line-height: 1;
    }
    .gallery-hint { font-size: 0.75rem; color: var(--color-mute); margin: 0; }
  `]
})
export class GalleryEditorComponent {
  private readonly portfolio = inject(PortfolioService);

  @Input() images: string[] = [];
  @Output() imagesChange = new EventEmitter<string[]>();

  protected readonly pickerOpen = signal(false);
  protected readonly photos = signal<Photo[]>([]);

  openPicker(): void {
    this.pickerOpen.set(true);
    this.portfolio.getPhotos().subscribe(p => this.photos.set(p));
  }

  closePicker(): void {
    this.pickerOpen.set(false);
  }

  onPhotoSelected(photo: Photo): void {
    if (!this.images.includes(photo.url)) {
      this.imagesChange.emit([...this.images, photo.url]);
    }
  }

  removeImage(url: string): void {
    this.imagesChange.emit(this.images.filter(u => u !== url));
  }

  onReorder(order: number[]): void {
    this.imagesChange.emit(order.map(i => this.images[i]));
  }
}
```

- [ ] **Step 4 : Vérifier le passage GalleryEditor** — `cd frontend && npx ng test --watch=false --include='**/gallery-editor.component.spec.ts'` → 4 tests OK.

- [ ] **Step 5 : Écrire `mobilier.component.spec.ts` (failing) — version minimale**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { MobilierComponent } from './mobilier.component';
import { ToastService } from '../shared/toast.service';

describe('MobilierComponent', () => {
  let httpMock: HttpTestingController;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [MobilierComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(queryParams)) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock?.verify());

  it('charge la liste des pièces et les catégories', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([{ id: '1', slug: 'chaise', title: 'Chaise', category: 'Sièges', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false }]);
    httpMock.expectOne('/api/admin/categories').flush([]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.list li')).length).toBe(1);
  });

  it('ouvre un formulaire vierge si ?new=1', () => {
    configure({ new: '1' });
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/admin/categories').flush([]);
    fixture.detectChanges();
    expect((fixture.componentInstance as any).editingFurnitureSlug()).toBeNull();
  });

  it('saveFurniture() POST quand nouveau', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/admin/categories').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024 });
    cmp.saveFurniture();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/furniture').flush({});
    httpMock.expectOne('/api/furniture').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6 : Vérifier l'échec** — `cd frontend && npx ng test --watch=false --include='**/mobilier.component.spec.ts'` → ÉCHEC.

- [ ] **Step 7 : Implémenter `mobilier/mobilier.component.ts`**

> Extraction quasi-mécanique depuis `admin.component.ts` du bloc `tab() === 'furniture'` + `tab() === 'home'` (partie Catégories). Le code complet ci-dessous reprend les comportements existants en injectant `ToastService`, en consommant `GalleryEditorComponent` au lieu du HTML inline, et en lisant `?new=1`.

```typescript
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import { Furniture } from '../../../models/furniture.model';
import { AdminCategoryView } from '../../../models/home.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { SlidesEditorComponent } from '../slides-editor.component';
import { GalleryEditorComponent } from '../shared/gallery-editor.component';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-mobilier',
  standalone: true,
  imports: [ReactiveFormsModule, ReorderableDirective, SlidesEditorComponent, GalleryEditorComponent],
  template: `
    <div class="grid-admin">
      <aside class="list">
        <div class="list-head">
          <h2>Pièces existantes</h2>
          <button type="button" class="btn-link" (click)="newFurniture()">+ Nouvelle pièce</button>
        </div>
        @if (loadingFurniture()) {
          <p class="status">Chargement…</p>
        } @else if (furniture().length === 0) {
          <p class="status">Aucune pièce.</p>
        } @else {
          <ul>
            @for (item of furniture(); track item.id) {
              <li [class.selected]="editingFurnitureSlug() === item.slug">
                <button type="button" class="row" (click)="loadFurniture(item)">
                  <span class="row-title">{{ item.title }}</span>
                  <span class="row-meta">{{ item.category }} · {{ item.year }}</span>
                </button>
                <button type="button" class="row-del" (click)="removeFurniture(item)" aria-label="Supprimer">×</button>
              </li>
            }
          </ul>
        }
      </aside>

      <form class="form" [formGroup]="furnitureForm" (ngSubmit)="saveFurniture()">
        <div class="form-head">
          <h2>{{ editingFurnitureSlug() ? 'Modifier la pièce' : 'Nouvelle pièce' }}</h2>
          @if (editingFurnitureSlug(); as s) {
            <a class="view-link" [href]="'/mobilier/' + s" target="_blank" rel="noopener" title="Voir sur le site">Voir sur le site ↗</a>
          }
        </div>

        <label><span>Titre *</span><input type="text" formControlName="title" /></label>
        @if (editingFurnitureSlug()) {
          <label class="readonly-row"><span>Slug</span><input type="text" formControlName="slug" readonly /></label>
        }
        <div class="row-2">
          <label><span>Catégorie *</span><input type="text" formControlName="category" placeholder="Sièges, Tables…" /></label>
          <label><span>Année</span><input type="number" formControlName="year" /></label>
        </div>
        <label><span>Matériaux</span><input type="text" formControlName="material" /></label>
        <label><span>Designer</span><input type="text" formControlName="designer" /></label>

        <label><span>Image principale (URL)</span><input type="url" formControlName="coverImage" /></label>

        <app-gallery-editor
          [images]="furnitureGallery()"
          (imagesChange)="furnitureGallery.set($event)" />

        <fieldset class="dim-fieldset">
          <legend>Dimensions</legend>
          <div class="dim-grid">
            <label class="dim-cell"><span>Largeur (cm)</span><input type="number" step="0.1" min="0" formControlName="dimW" placeholder="—" /></label>
            <label class="dim-cell"><span>Profondeur (cm)</span><input type="number" step="0.1" min="0" formControlName="dimD" placeholder="—" /></label>
            <label class="dim-cell"><span>Hauteur (cm)</span><input type="number" step="0.1" min="0" formControlName="dimH" placeholder="—" /></label>
          </div>
          <label class="dim-notes">
            <span>Autres dimensions (une par ligne)</span>
            <textarea rows="2" formControlName="dimNotes" placeholder="Ex. : Diamètre assise 45 cm"></textarea>
          </label>
        </fieldset>
        <label><span>Description courte</span><textarea rows="2" formControlName="shortDescription"></textarea></label>
        <label><span>Description longue</span><textarea rows="5" formControlName="description"></textarea></label>

        @if (editingFurnitureId(); as ownerId) {
          <app-slides-editor kind="furniture" [ownerId]="ownerId" [ownerSlug]="editingFurnitureSlug()" />
        } @else {
          <p class="slides-hint">Enregistre la pièce une première fois pour pouvoir éditer ses slides.</p>
        }

        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="furnitureForm.invalid || saving()">
            {{ saving() ? 'Enregistrement…' : (editingFurnitureSlug() ? 'Mettre à jour' : 'Créer') }}
          </button>
          @if (editingFurnitureSlug()) {
            <button type="button" class="btn-link" (click)="newFurniture()">Annuler</button>
          }
        </div>
      </form>
    </div>

    <section class="categories-section">
      <h2>Catégories de mobilier</h2>
      <p class="hint">Glisse pour réordonner. Décoche pour masquer une catégorie de la home.</p>
      @if (categoryMeta(); as cats) {
        <ul class="cat-list" appReorderable (reordered)="onCategoryReorder($event)">
          @for (c of cats; track c.category) {
            <li class="home-row">
              <span class="handle">⠿</span>
              <img [src]="c.coverImage" [alt]="c.category" class="thumb-round" />
              <span class="title">{{ c.category }}</span>
              <label class="incl">
                <input type="checkbox" [checked]="c.visible" (change)="toggleCategoryVisibility(c, $event)" /> Visible
              </label>
            </li>
          }
        </ul>
      } @else {
        <p class="status">Chargement…</p>
      }
    </section>
  `,
  styles: [`
    .grid-admin { display: grid; grid-template-columns: 320px 1fr; gap: 48px; align-items: start; }
    .list { border: 1px solid var(--color-line); background: var(--color-bg); position: sticky; top: 112px; max-height: calc(100vh - 144px); overflow-y: auto; }
    .list-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-line); background: var(--color-bg-alt); }
    .list-head h2 { font-size: 1rem; margin: 0; letter-spacing: 0.04em; }
    .list ul { list-style: none; margin: 0; padding: 0; }
    .list li { display: flex; align-items: stretch; border-bottom: 1px solid var(--color-line); }
    .list li:last-child { border-bottom: 0; }
    .list li.selected { background: rgba(139, 111, 71, 0.08); }
    .row { flex: 1; text-align: left; background: transparent; border: 0; padding: 14px 20px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
    .row:hover { background: var(--color-bg-alt); }
    .row-title { color: var(--color-ink); font-size: 0.95rem; }
    .row-meta { font-size: 0.75rem; color: var(--color-mute); letter-spacing: 0.06em; text-transform: uppercase; }
    .row-del { background: transparent; border: 0; padding: 0 16px; color: var(--color-mute); font-size: 1.5rem; cursor: pointer; line-height: 1; }
    .row-del:hover { color: #b1532a; }
    .form { display: flex; flex-direction: column; gap: 20px; padding: 32px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .form h2 { margin: 0; font-size: 1.5rem; }
    .form-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .view-link { font-size: 0.85rem; color: var(--color-accent); text-decoration: none; }
    .form label { display: flex; flex-direction: column; gap: 6px; }
    .form label > span { font-size: 0.78rem; color: var(--color-ink-soft); }
    .form input, .form textarea { font: inherit; padding: 8px 10px; border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink); resize: vertical; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .readonly-row input { background: var(--color-bg-alt); color: var(--color-mute); }
    .dim-fieldset { border: 1px solid var(--color-line); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .dim-fieldset legend { font-size: 0.78rem; color: var(--color-ink-soft); padding: 0 8px; }
    .dim-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .dim-cell { display: flex; flex-direction: column; gap: 6px; }
    .actions { display: flex; gap: 16px; align-items: center; }
    .btn-primary { padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0; cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-link { background: transparent; border: 0; color: var(--color-accent); cursor: pointer; font-size: 0.85rem; }
    .slides-hint { padding: 12px 16px; background: var(--color-bg-alt); border-left: 3px solid var(--color-mute); font-size: 0.85rem; color: var(--color-ink-soft); font-style: italic; }

    .categories-section { margin-top: 64px; }
    .categories-section h2 { font-family: var(--serif); font-weight: 400; font-size: 1.5rem; margin: 0 0 8px; }
    .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .cat-list { list-style: none; padding: 0; margin: 0; }
    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .home-row .handle { color: var(--color-mute); font-size: 1.1rem; user-select: none; }
    .home-row .thumb-round { width: 40px; height: 40px; object-fit: cover; border-radius: 50%; flex-shrink: 0; }
    .home-row .title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
    .status { color: var(--color-mute); }
    @media (max-width: 960px) {
      .grid-admin { grid-template-columns: 1fr; }
      .list { position: static; max-height: none; }
      .row-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class MobilierComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly furniture = signal<Furniture[]>([]);
  protected readonly loadingFurniture = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingFurnitureSlug = signal<string | null>(null);
  protected readonly editingFurnitureId = signal<string | null>(null);
  protected readonly furnitureGallery = signal<string[]>([]);
  protected readonly categoryMeta = signal<AdminCategoryView[] | null>(null);

  protected readonly furnitureForm = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    category: ['', Validators.required],
    year: [new Date().getFullYear(), Validators.required],
    material: [''],
    designer: ['Milo GUILLAUME Design'],
    coverImage: [''],
    dimW: [null as number | null],
    dimD: [null as number | null],
    dimH: [null as number | null],
    dimNotes: [''],
    shortDescription: [''],
    description: [''],
  });

  constructor() {
    this.refreshFurniture();
    this.portfolio.getAdminCategories().subscribe(c => this.categoryMeta.set(c));
    this.route.queryParamMap.subscribe(params => {
      if (params.get('new') === '1') this.newFurniture();
    });
  }

  private refreshFurniture(): void {
    this.loadingFurniture.set(true);
    this.portfolio.getAllFurniture().subscribe({
      next: data => { this.furniture.set(data); this.loadingFurniture.set(false); },
      error: () => { this.loadingFurniture.set(false); this.toast.error('Impossible de charger les pièces.'); }
    });
  }

  newFurniture(): void {
    this.editingFurnitureSlug.set(null);
    this.editingFurnitureId.set(null);
    this.furnitureForm.reset({
      title: '', slug: '', category: '', year: new Date().getFullYear(),
      material: '', designer: 'Milo GUILLAUME Design', coverImage: '',
      dimW: null, dimD: null, dimH: null, dimNotes: '',
      shortDescription: '', description: '',
    });
    this.furnitureGallery.set([]);
  }

  loadFurniture(item: Furniture): void {
    this.editingFurnitureSlug.set(item.slug);
    this.editingFurnitureId.set(item.id ?? null);
    const dims = this.parseDimensions(item.dimensions ?? []);
    this.furnitureForm.reset({
      title: item.title, slug: item.slug, category: item.category, year: item.year,
      material: item.material ?? '', designer: item.designer ?? '', coverImage: item.coverImage ?? '',
      dimW: dims.w, dimD: dims.d, dimH: dims.h, dimNotes: dims.notes,
      shortDescription: item.shortDescription ?? '', description: item.description ?? '',
    });
    this.furnitureGallery.set([...(item.gallery ?? [])]);
  }

  private parseDimensions(list: string[]): { w: number | null; d: number | null; h: number | null; notes: string } {
    const widthRe = /^(L|Larg(?:eur)?\.?)\s*[:.]?\s*([0-9]+(?:[.,][0-9]+)?)/i;
    const depthRe = /^(P|Prof(?:ondeur)?\.?)\s*[:.]?\s*([0-9]+(?:[.,][0-9]+)?)/i;
    const heightRe = /^(H|Haut(?:eur)?\.?)\s*[:.]?\s*([0-9]+(?:[.,][0-9]+)?)/i;
    let w: number | null = null, d: number | null = null, h: number | null = null;
    const notes: string[] = [];
    for (const raw of list) {
      const line = (raw ?? '').trim();
      if (!line) continue;
      let m = w === null ? line.match(widthRe) : null;
      if (m) { w = parseFloat(m[2].replace(',', '.')); continue; }
      m = d === null ? line.match(depthRe) : null;
      if (m) { d = parseFloat(m[2].replace(',', '.')); continue; }
      m = h === null ? line.match(heightRe) : null;
      if (m) { h = parseFloat(m[2].replace(',', '.')); continue; }
      notes.push(line);
    }
    return { w, d, h, notes: notes.join('\n') };
  }

  private serializeDimensions(w: number | null, d: number | null, h: number | null, notesText: string): string[] {
    const result: string[] = [];
    if (w !== null && !isNaN(w)) result.push(`L ${w} cm`);
    if (d !== null && !isNaN(d)) result.push(`P ${d} cm`);
    if (h !== null && !isNaN(h)) result.push(`H ${h} cm`);
    result.push(...this.splitLines(notesText));
    return result;
  }

  private splitLines(value: string | null | undefined): string[] {
    if (!value) return [];
    return value.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
  }

  saveFurniture(): void {
    if (this.furnitureForm.invalid) return;
    const v = this.furnitureForm.getRawValue();
    const slug = this.editingFurnitureSlug();
    const existing = slug ? this.furniture().find(f => f.slug === slug) : null;
    const payload: Partial<Furniture> = {
      title: v.title!,
      slug: v.slug || undefined,
      category: v.category!,
      year: v.year ?? undefined,
      material: v.material ?? '',
      designer: v.designer ?? '',
      coverImage: v.coverImage ?? '',
      gallery: [...this.furnitureGallery()],
      dimensions: this.serializeDimensions(v.dimW ?? null, v.dimD ?? null, v.dimH ?? null, v.dimNotes ?? ''),
      shortDescription: v.shortDescription ?? '',
      description: v.description ?? '',
      featured: existing?.featured ?? false,
    };
    this.saving.set(true);
    const op$ = slug
      ? this.portfolio.updateFurniture(slug, payload)
      : this.portfolio.createFurniture(payload);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(slug ? 'Pièce mise à jour.' : 'Pièce créée.');
        this.refreshFurniture();
        this.newFurniture();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erreur lors de l\'enregistrement.');
      }
    });
  }

  removeFurniture(item: Furniture): void {
    if (!confirm(`Supprimer la pièce "${item.title}" ?`)) return;
    this.portfolio.deleteFurniture(item.slug).subscribe({
      next: () => {
        this.toast.success('Pièce supprimée.');
        if (this.editingFurnitureSlug() === item.slug) this.newFurniture();
        this.refreshFurniture();
      },
      error: () => this.toast.error('Erreur lors de la suppression.')
    });
  }

  onCategoryReorder(order: number[]): void {
    const current = this.categoryMeta();
    if (!current) return;
    this.categoryMeta.set(order.map((i, newPos) => ({ ...current[i], position: newPos })));
    this.persistCategories();
  }

  toggleCategoryVisibility(c: AdminCategoryView, event: Event): void {
    const visible = (event.target as HTMLInputElement).checked;
    this.categoryMeta.update(cats => cats?.map(x => x.category === c.category ? { ...x, visible } : x) ?? null);
    this.persistCategories();
  }

  private persistCategories(): void {
    const cats = this.categoryMeta() ?? [];
    const requests = cats.map(c => this.portfolio.updateAdminCategory(c.category, c));
    if (requests.length === 0) return;
    forkJoin(requests).subscribe({
      next: () => this.toast.success('Catégories enregistrées.'),
      error: () => this.toast.error('Impossible d\'enregistrer les catégories.'),
    });
  }
}
```

- [ ] **Step 8 : Vérifier le passage Mobilier** — `cd frontend && npx ng test --watch=false --include='**/mobilier.component.spec.ts'` → 3 tests OK.

- [ ] **Step 9 : Ajouter la route `mobilier` dans `admin.routes.ts`** :

```typescript
{
  path: 'mobilier',
  loadComponent: () => import('./mobilier/mobilier.component').then(m => m.MobilierComponent),
  title: 'Mobilier — Administration',
},
```

- [ ] **Step 10 : Retirer la section Mobilier + Catégories du monolithe** (`admin.component.ts`) :
  1. Retirer `'furniture'` du type `Tab`.
  2. Retirer le bouton `<button … switchTab('furniture')…>Mobilier</button>`.
  3. Retirer `furniture: 'Mobilier'` de `tabLabels`.
  4. Retirer le bloc `@if (tab() === 'furniture') { … }`.
  5. Dans le bloc `@if (tab() === 'home') { … }` retirer le sous-bloc « Catégories de mobilier » (h2 + ul `cat-list` + `categoryMeta` rendering).
  6. Retirer signals/forms/méthodes : `furniture`, `loadingFurniture`, `editingFurnitureSlug`, `editingFurnitureId`, `furnitureGallery`, `furnitureForm`, `refreshFurniture`, `newFurniture`, `loadFurniture`, `parseDimensions`, `serializeDimensions`, `splitLines` si plus utilisé, `saveFurniture`, `removeFurniture`, `onFurnitureGalleryReorder`, `removeFurnitureGalleryImage`, `categoryMeta`, `onCategoryReorder`, `toggleCategoryVisibility`, `persistCategories`.
  7. Dans `loadHomeTab()`, retirer le sous-appel `this.portfolio.getAdminCategories().subscribe(c => this.categoryMeta.set(c));`.
  8. Dans le constructeur, retirer `this.refreshFurniture();`.
  9. Si initialement le `tab` par défaut était `'furniture'`, changer la valeur initiale du signal `tab` à une valeur encore présente (ex. `'exhibitions'`).
  10. Retirer du `selectPhoto()` la branche `target === 'furniture-cover'` et `target === 'furniture-gallery'`.
  11. Retirer du type `PickerTarget` les valeurs `'furniture-cover'` et `'furniture-gallery'`.
  12. Retirer les styles inutilisés (`.dim-fieldset`, `.cat-list`, etc. uniquement s'ils ne sont plus référencés par le bloc Expositions restant).

- [ ] **Step 11 : Adapter `admin.component.spec.ts`** — retirer tests `'furniture'`, `categoryMeta`.

- [ ] **Step 12 : Tous les tests** — `cd frontend && npx ng test --watch=false` → OK.

- [ ] **Step 13 : Smoke test manuel** — `/admin/mobilier` charge, créer/modifier/supprimer une pièce, galerie via picker partagé, catégories en bas de page (drag, toggle visible). `/admin/legacy` : l'onglet Mobilier n'est plus présent, mais Expositions fonctionne toujours.

- [ ] **Step 14 : Commit**

```bash
git add frontend/src/app/pages/admin/shared/gallery-editor.component.ts \
        frontend/src/app/pages/admin/shared/gallery-editor.component.spec.ts \
        frontend/src/app/pages/admin/mobilier \
        frontend/src/app/pages/admin/admin.routes.ts \
        frontend/src/app/pages/admin/admin.component.ts \
        frontend/src/app/pages/admin/admin.component.spec.ts
git commit -m "feat(admin): extraire MobilierComponent + GalleryEditorComponent + bloc Catégories

- MobilierComponent : liste, form, slides editor, dimensions, query param ?new=1
- GalleryEditorComponent (shared) : Input images, Output imagesChange, PhotoPicker intégré
- Bloc Catégories rapatrié depuis l'onglet Accueil
- Route /admin/mobilier ajoutée ; section retirée du monolithe"
```

---

### Task 7 — ExpositionsComponent + bloc Position sur la home

## Task 7 : ExpositionsComponent + bloc Position sur la home

**Fichiers :**
- Créer : `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Créer : `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts`
- Modifier : `frontend/src/app/pages/admin/admin.routes.ts`
- Modifier : `frontend/src/app/pages/admin/admin.component.ts` (retirer bloc Expositions + bandeau dans Home)

- [ ] **Step 1 : Écrire `expositions.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { ExpositionsComponent } from './expositions.component';
import { ToastService } from '../shared/toast.service';

describe('ExpositionsComponent', () => {
  let httpMock: HttpTestingController;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [ExpositionsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(queryParams)) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock?.verify());

  it('charge expos et metadata', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('saveExhibition() POST quand nouveau', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.exhibitionForm.patchValue({ title: 'T', startDate: '2024-01-01', endDate: '2024-02-01' });
    cmp.saveExhibition();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/exhibitions').flush({});
    httpMock.expectOne('/api/exhibitions').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('ajoute et retire un tag', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.newExhibitionTag.set('moderne');
    const fakeEvent = { preventDefault: () => {} } as Event;
    cmp.addExhibitionTag(fakeEvent);
    expect(cmp.exhibitionTags()).toEqual(['moderne']);
    cmp.removeExhibitionTag('moderne');
    expect(cmp.exhibitionTags()).toEqual([]);
  });

  it('ouvre formulaire vierge si ?new=1', () => {
    configure({ new: '1' });
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    fixture.detectChanges();
    expect((fixture.componentInstance as any).editingExhibitionSlug()).toBeNull();
  });
});
```

- [ ] **Step 2 : Vérifier l'échec** — `cd frontend && npx ng test --watch=false --include='**/expositions.component.spec.ts'` → ÉCHEC.

- [ ] **Step 3 : Implémenter `expositions/expositions.component.ts`**

```typescript
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import { Exhibition } from '../../../models/exhibition.model';
import { AdminExhibitionMetaView } from '../../../models/home.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { SlidesEditorComponent } from '../slides-editor.component';
import { GalleryEditorComponent } from '../shared/gallery-editor.component';
import { ToastService } from '../shared/toast.service';

interface ExhibitionMetaRow {
  slug: string;
  title: string;
  cover: string;
  position: number;
  visible: boolean;
}

@Component({
  selector: 'app-expositions',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ReorderableDirective, SlidesEditorComponent, GalleryEditorComponent],
  template: `
    <div class="grid-admin">
      <aside class="list">
        <div class="list-head">
          <h2>Expositions existantes</h2>
          <button type="button" class="btn-link" (click)="newExhibition()">+ Nouvelle exposition</button>
        </div>
        @if (loadingExhibitions()) {
          <p class="status">Chargement…</p>
        } @else if (exhibitions().length === 0) {
          <p class="status">Aucune exposition.</p>
        } @else {
          <ul>
            @for (item of exhibitions(); track item.id) {
              <li [class.selected]="editingExhibitionSlug() === item.slug">
                <button type="button" class="row" (click)="loadExhibition(item)">
                  <span class="row-title">{{ item.title }}</span>
                  <span class="row-meta">{{ item.venue }} · {{ item.city }}</span>
                </button>
                <button type="button" class="row-del" (click)="removeExhibition(item)" aria-label="Supprimer">×</button>
              </li>
            }
          </ul>
        }
      </aside>

      <form class="form" [formGroup]="exhibitionForm" (ngSubmit)="saveExhibition()">
        <div class="form-head">
          <h2>{{ editingExhibitionSlug() ? 'Modifier l\\'exposition' : 'Nouvelle exposition' }}</h2>
          @if (editingExhibitionSlug(); as s) {
            <a class="view-link" [href]="'/expositions/' + s" target="_blank" rel="noopener">Voir sur le site ↗</a>
          }
        </div>

        <label><span>Titre *</span><input type="text" formControlName="title" /></label>
        @if (editingExhibitionSlug()) {
          <label class="readonly-row"><span>Slug</span><input type="text" formControlName="slug" readonly /></label>
        }
        <label><span>Lieu</span><input type="text" formControlName="venue" /></label>
        <div class="row-2">
          <label><span>Ville</span><input type="text" formControlName="city" /></label>
          <label><span>Pays</span><input type="text" formControlName="country" /></label>
        </div>
        <div class="row-2">
          <label><span>Date de début *</span><input type="date" formControlName="startDate" /></label>
          <label><span>Date de fin *</span><input type="date" formControlName="endDate" /></label>
        </div>
        <label><span>Commissaire</span><input type="text" formControlName="curator" /></label>

        <label><span>Image principale (URL)</span><input type="url" formControlName="coverImage" /></label>

        <app-gallery-editor
          [images]="exhibitionGallery()"
          (imagesChange)="exhibitionGallery.set($event)" />

        <label>
          <span>Tags</span>
          <div class="chips-input">
            @for (t of exhibitionTags(); track t) {
              <span class="chip">{{ t }}<button type="button" class="chip-remove" (click)="removeExhibitionTag(t)" aria-label="Retirer">×</button></span>
            }
            <input
              type="text"
              [ngModel]="newExhibitionTag()"
              (ngModelChange)="newExhibitionTag.set($event)"
              [ngModelOptions]="{ standalone: true }"
              (keydown.enter)="addExhibitionTag($event)"
              (keydown.backspace)="onTagBackspace($event)"
              placeholder="Ajouter un tag puis Entrée"
              class="chip-input-field" />
          </div>
        </label>
        <label><span>Description courte</span><textarea rows="2" formControlName="shortDescription"></textarea></label>
        <label><span>Description longue</span><textarea rows="5" formControlName="description"></textarea></label>

        @if (editingExhibitionId(); as ownerId) {
          <app-slides-editor kind="exhibition" [ownerId]="ownerId" [ownerSlug]="editingExhibitionSlug()" />
        } @else {
          <p class="slides-hint">Enregistre l'exposition une première fois pour pouvoir éditer ses slides.</p>
        }

        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="exhibitionForm.invalid || saving()">
            {{ saving() ? 'Enregistrement…' : (editingExhibitionSlug() ? 'Mettre à jour' : 'Créer') }}
          </button>
          @if (editingExhibitionSlug()) {
            <button type="button" class="btn-link" (click)="newExhibition()">Annuler</button>
          }
        </div>
      </form>
    </div>

    <section class="meta-section">
      <h2>Position sur la home</h2>
      <p class="hint">Glisse pour réordonner. Décoche pour masquer une exposition du bandeau (la fiche reste accessible via son URL).</p>
      @if (exhibitionsMeta(); as rows) {
        <ul class="exh-list" appReorderable (reordered)="onExhibitionMetaReorder($event)">
          @for (r of rows; track r.slug) {
            <li class="home-row">
              <span class="handle">⠿</span>
              <img [src]="r.cover" [alt]="r.title" class="thumb-round" />
              <span class="title">{{ r.title }}</span>
              <label class="incl">
                <input type="checkbox" [checked]="r.visible" (change)="toggleExhibitionVisibility(r, $event)" /> Visible
              </label>
            </li>
          }
        </ul>
      } @else {
        <p class="status">Chargement…</p>
      }
    </section>
  `,
  styles: [`
    .grid-admin { display: grid; grid-template-columns: 320px 1fr; gap: 48px; align-items: start; }
    .list { border: 1px solid var(--color-line); background: var(--color-bg); position: sticky; top: 112px; max-height: calc(100vh - 144px); overflow-y: auto; }
    .list-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-line); background: var(--color-bg-alt); }
    .list-head h2 { font-size: 1rem; margin: 0; letter-spacing: 0.04em; }
    .list ul { list-style: none; margin: 0; padding: 0; }
    .list li { display: flex; align-items: stretch; border-bottom: 1px solid var(--color-line); }
    .list li.selected { background: rgba(139, 111, 71, 0.08); }
    .row { flex: 1; text-align: left; background: transparent; border: 0; padding: 14px 20px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
    .row:hover { background: var(--color-bg-alt); }
    .row-title { color: var(--color-ink); font-size: 0.95rem; }
    .row-meta { font-size: 0.75rem; color: var(--color-mute); letter-spacing: 0.06em; text-transform: uppercase; }
    .row-del { background: transparent; border: 0; padding: 0 16px; color: var(--color-mute); font-size: 1.5rem; cursor: pointer; line-height: 1; }
    .form { display: flex; flex-direction: column; gap: 20px; padding: 32px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .form h2 { margin: 0; font-size: 1.5rem; }
    .form-head { display: flex; align-items: baseline; justify-content: space-between; }
    .view-link { font-size: 0.85rem; color: var(--color-accent); text-decoration: none; }
    .form label { display: flex; flex-direction: column; gap: 6px; }
    .form label > span { font-size: 0.78rem; color: var(--color-ink-soft); }
    .form input, .form textarea { font: inherit; padding: 8px 10px; border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink); resize: vertical; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .readonly-row input { background: var(--color-bg-alt); color: var(--color-mute); }
    .actions { display: flex; gap: 16px; }
    .btn-primary { padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0; cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-link { background: transparent; border: 0; color: var(--color-accent); cursor: pointer; font-size: 0.85rem; }
    .slides-hint { padding: 12px 16px; background: var(--color-bg-alt); border-left: 3px solid var(--color-mute); font-size: 0.85rem; color: var(--color-ink-soft); font-style: italic; }

    .chips-input { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--color-bg-alt); font-size: 0.8rem; }
    .chip-remove { background: transparent; border: 0; color: var(--color-mute); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0; }
    .chip-input-field { flex: 1; min-width: 120px; border: 0; padding: 4px; background: transparent; }
    .chip-input-field:focus { outline: none; }

    .meta-section { margin-top: 64px; }
    .meta-section h2 { font-family: var(--serif); font-weight: 400; font-size: 1.5rem; margin: 0 0 8px; }
    .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .exh-list { list-style: none; padding: 0; margin: 0; }
    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .home-row .handle { color: var(--color-mute); font-size: 1.1rem; }
    .home-row .thumb-round { width: 40px; height: 40px; object-fit: cover; border-radius: 50%; flex-shrink: 0; }
    .home-row .title { flex: 1; font-size: 0.9rem; }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
    .status { color: var(--color-mute); }
    @media (max-width: 960px) {
      .grid-admin { grid-template-columns: 1fr; }
      .list { position: static; max-height: none; }
      .row-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class ExpositionsComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly exhibitions = signal<Exhibition[]>([]);
  protected readonly loadingExhibitions = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingExhibitionSlug = signal<string | null>(null);
  protected readonly editingExhibitionId = signal<string | null>(null);
  protected readonly exhibitionGallery = signal<string[]>([]);
  protected readonly exhibitionTags = signal<string[]>([]);
  protected readonly newExhibitionTag = signal('');
  protected readonly exhibitionsMeta = signal<ExhibitionMetaRow[] | null>(null);

  protected readonly exhibitionForm = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    venue: [''],
    city: [''],
    country: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    curator: [''],
    coverImage: [''],
    shortDescription: [''],
    description: [''],
  });

  constructor() {
    this.refreshExhibitions();
    this.refreshExhibitionsMeta();
    this.route.queryParamMap.subscribe(params => {
      if (params.get('new') === '1') this.newExhibition();
    });
  }

  private refreshExhibitions(): void {
    this.loadingExhibitions.set(true);
    this.portfolio.getAllExhibitions().subscribe({
      next: data => { this.exhibitions.set(data); this.loadingExhibitions.set(false); },
      error: () => { this.loadingExhibitions.set(false); this.toast.error('Impossible de charger les expositions.'); }
    });
  }

  private refreshExhibitionsMeta(): void {
    forkJoin([
      this.portfolio.getAllExhibitions(),
      this.portfolio.getAdminExhibitionsMeta(),
    ]).subscribe(([expos, metas]) => {
      const byMeta = new Map(metas.map(m => [m.slug, m]));
      const rows: ExhibitionMetaRow[] = expos
        .map(e => {
          const m = byMeta.get(e.slug);
          if (!m) return null;
          return { slug: e.slug, title: e.title, cover: e.coverImage, position: m.position, visible: m.visible };
        })
        .filter((r): r is ExhibitionMetaRow => r !== null)
        .sort((a, b) => a.position - b.position);
      this.exhibitionsMeta.set(rows);
    });
  }

  newExhibition(): void {
    this.editingExhibitionSlug.set(null);
    this.editingExhibitionId.set(null);
    this.exhibitionForm.reset({
      title: '', slug: '', venue: '', city: '', country: '',
      startDate: '', endDate: '', curator: '', coverImage: '',
      shortDescription: '', description: '',
    });
    this.exhibitionGallery.set([]);
    this.exhibitionTags.set([]);
    this.newExhibitionTag.set('');
  }

  loadExhibition(item: Exhibition): void {
    this.editingExhibitionSlug.set(item.slug);
    this.editingExhibitionId.set(item.id ?? null);
    this.exhibitionForm.reset({
      title: item.title, slug: item.slug, venue: item.venue ?? '', city: item.city ?? '', country: item.country ?? '',
      startDate: item.startDate ?? '', endDate: item.endDate ?? '', curator: item.curator ?? '',
      coverImage: item.coverImage ?? '', shortDescription: item.shortDescription ?? '', description: item.description ?? '',
    });
    this.exhibitionGallery.set([...(item.gallery ?? [])]);
    this.exhibitionTags.set([...(item.tags ?? [])]);
    this.newExhibitionTag.set('');
  }

  addExhibitionTag(event: Event): void {
    event.preventDefault();
    const value = this.newExhibitionTag().trim();
    if (!value) return;
    const current = this.exhibitionTags();
    if (current.includes(value)) {
      this.newExhibitionTag.set('');
      return;
    }
    this.exhibitionTags.set([...current, value]);
    this.newExhibitionTag.set('');
  }

  removeExhibitionTag(tag: string): void {
    this.exhibitionTags.update(tags => tags.filter(t => t !== tag));
  }

  onTagBackspace(event: Event): void {
    if (this.newExhibitionTag() !== '') return;
    event.preventDefault();
    this.exhibitionTags.update(tags => tags.slice(0, -1));
  }

  saveExhibition(): void {
    if (this.exhibitionForm.invalid) return;
    const v = this.exhibitionForm.getRawValue();
    const slug = this.editingExhibitionSlug();
    const existing = slug ? this.exhibitions().find(e => e.slug === slug) : null;
    const payload: Partial<Exhibition> = {
      title: v.title!, slug: v.slug || undefined,
      venue: v.venue ?? '', city: v.city ?? '', country: v.country ?? '',
      startDate: v.startDate!, endDate: v.endDate!,
      curator: v.curator ?? '', coverImage: v.coverImage ?? '',
      gallery: [...this.exhibitionGallery()],
      tags: [...this.exhibitionTags()],
      shortDescription: v.shortDescription ?? '', description: v.description ?? '',
      featured: existing?.featured ?? false,
    };
    this.saving.set(true);
    const op$ = slug
      ? this.portfolio.updateExhibition(slug, payload)
      : this.portfolio.createExhibition(payload);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(slug ? 'Exposition mise à jour.' : 'Exposition créée.');
        this.refreshExhibitions();
        this.refreshExhibitionsMeta();
        this.newExhibition();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erreur lors de l\'enregistrement.');
      }
    });
  }

  removeExhibition(item: Exhibition): void {
    if (!confirm(`Supprimer l'exposition "${item.title}" ?`)) return;
    this.portfolio.deleteExhibition(item.slug).subscribe({
      next: () => {
        this.toast.success('Exposition supprimée.');
        if (this.editingExhibitionSlug() === item.slug) this.newExhibition();
        this.refreshExhibitions();
        this.refreshExhibitionsMeta();
      },
      error: () => this.toast.error('Erreur lors de la suppression.')
    });
  }

  onExhibitionMetaReorder(order: number[]): void {
    const current = this.exhibitionsMeta();
    if (!current) return;
    this.exhibitionsMeta.set(order.map((i, newPos) => ({ ...current[i], position: newPos })));
    this.persistExhibitionsMeta();
  }

  toggleExhibitionVisibility(row: ExhibitionMetaRow, event: Event): void {
    const visible = (event.target as HTMLInputElement).checked;
    this.exhibitionsMeta.update(rows => rows?.map(x => x.slug === row.slug ? { ...x, visible } : x) ?? null);
    this.persistExhibitionsMeta();
  }

  private persistExhibitionsMeta(): void {
    const rows = this.exhibitionsMeta() ?? [];
    const requests = rows.map(r => this.portfolio.updateAdminExhibitionMeta(r.slug, {
      slug: r.slug, position: r.position, visible: r.visible,
    } as AdminExhibitionMetaView));
    if (requests.length === 0) return;
    forkJoin(requests).subscribe({
      next: () => this.toast.success('Expositions enregistrées.'),
      error: () => this.toast.error('Impossible d\'enregistrer les expositions.'),
    });
  }
}
```

- [ ] **Step 4 : Vérifier le passage** — `cd frontend && npx ng test --watch=false --include='**/expositions.component.spec.ts'` → 4 tests OK.

- [ ] **Step 5 : Ajouter la route `expositions` dans `admin.routes.ts`** :

```typescript
{
  path: 'expositions',
  loadComponent: () => import('./expositions/expositions.component').then(m => m.ExpositionsComponent),
  title: 'Expositions — Administration',
},
```

- [ ] **Step 6 : Retirer la section Expositions + bandeau du monolithe** (`admin.component.ts`) :
  1. Retirer `'exhibitions'` du type `Tab`.
  2. Retirer le bouton `<button … switchTab('exhibitions')…>Expositions</button>`.
  3. Retirer `exhibitions: 'Expositions'` de `tabLabels`.
  4. Retirer le bloc `@if (tab() === 'exhibitions') { … }`.
  5. Dans `@if (tab() === 'home') { … }`, retirer le sous-bloc « Bandeau des expositions ».
  6. Retirer signals/forms/méthodes : `exhibitions`, `loadingExhibitions`, `editingExhibitionSlug`, `editingExhibitionId`, `exhibitionGallery`, `exhibitionTags`, `newExhibitionTag`, `exhibitionForm`, `refreshExhibitions`, `newExhibition`, `loadExhibition`, `addExhibitionTag`, `removeExhibitionTag`, `onTagBackspace`, `saveExhibition`, `removeExhibition`, `onExhibitionGalleryReorder`, `removeExhibitionGalleryImage`, `exhibitionsMeta`, `onExhibitionMetaReorder`, `toggleExhibitionVisibility`, `persistExhibitionsMeta`.
  7. Dans `loadHomeTab()`, retirer le `forkJoin` qui hydrate `exhibitionsMeta`.
  8. Dans `selectPhoto()`, retirer `'exhibition-cover'` et `'exhibition-gallery'`.
  9. Dans le type `PickerTarget`, retirer `'exhibition-cover'` et `'exhibition-gallery'`. Le type devient effectivement vide → on peut retirer toute la machinerie picker du monolithe (signal `photoPicker`, méthodes `openPicker`, `closePicker`, `pickerIsGallery`, `selectPhoto`, et la modale picker en bas du template). À noter : `photos`, `loadingPhotos`, `refreshPhotos` deviennent inutiles, les retirer aussi.
  10. Retirer l'import `FormsModule` et `SlidesEditorComponent` si plus utilisés dans le monolithe.
  11. Si le tab par défaut était `'exhibitions'`, basculer sur `'home'` (la seule section restante).

> ⚠ Après cette task, le monolithe ne contient plus que les sections **Accueil (feed)** et **Navigation** intriquées dans `tab() === 'home'`. Elles seront extraites en Task 8.

- [ ] **Step 7 : Adapter `admin.component.spec.ts`** — retirer tests `'exhibitions'`, `exhibitionsMeta`, picker.

- [ ] **Step 8 : Tous les tests** — `cd frontend && npx ng test --watch=false` → OK.

- [ ] **Step 9 : Smoke test manuel** — `/admin/expositions` : créer, modifier, supprimer une expo ; ajouter/retirer un tag ; section « Position sur la home » fonctionne (drag, toggle visible). `/admin/legacy` ne contient plus que Mobilier/Expo n'apparaissent plus, seuls Accueil restent.

- [ ] **Step 10 : Commit**

```bash
git add frontend/src/app/pages/admin/expositions \
        frontend/src/app/pages/admin/admin.routes.ts \
        frontend/src/app/pages/admin/admin.component.ts \
        frontend/src/app/pages/admin/admin.component.spec.ts
git commit -m "feat(admin): extraire ExpositionsComponent + bloc Position home

- ExpositionsComponent : liste, form, tags, slides editor, query param ?new=1
- Réutilise GalleryEditorComponent + PhotoPickerComponent partagés
- Bloc « Bandeau des expositions » rapatrié depuis l'onglet Accueil
- Route /admin/expositions ajoutée ; section + picker machinery retirés du monolithe"
```

---

### Task 8 — AccueilComponent + NavigationComponent

## Task 8 : AccueilComponent + NavigationComponent

**Fichiers :**
- Créer : `frontend/src/app/pages/admin/accueil/accueil.component.ts`
- Créer : `frontend/src/app/pages/admin/accueil/accueil.component.spec.ts`
- Créer : `frontend/src/app/pages/admin/navigation/navigation.component.ts`
- Créer : `frontend/src/app/pages/admin/navigation/navigation.component.spec.ts`
- Modifier : `frontend/src/app/pages/admin/admin.routes.ts`
- Modifier : `frontend/src/app/pages/admin/admin.component.ts` (retirer le bloc `home`)

- [ ] **Step 1 : Écrire `accueil.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { AccueilComponent } from './accueil.component';
import { ToastService } from '../shared/toast.service';

describe('AccueilComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccueilComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('charge mobilier, expositions et feed', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([{ id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false }]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.home-row')).length).toBe(1);
  });

  it('toggleIncluded() persiste le feed', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([{ id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false }]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.toggleIncluded(cmp.homeItems()[0], { target: { checked: true } } as unknown as Event);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Vérifier l'échec** — `cd frontend && npx ng test --watch=false --include='**/accueil.component.spec.ts'` → ÉCHEC.

- [ ] **Step 3 : Implémenter `accueil/accueil.component.ts`**

```typescript
import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import { AdminFeedEntry } from '../../../models/home.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { ToastService } from '../shared/toast.service';

interface HomeAdminItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  included: boolean;
}

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [ReorderableDirective],
  template: `
    <div class="home-editor">
      <h2>Ordre éditorial du masonry</h2>
      <p class="hint">Glisse pour réordonner. Décoche pour exclure du feed. Les modifications sont enregistrées automatiquement.</p>
      @if (homeItems(); as items) {
        <ul class="ordering-list" appReorderable (reordered)="onFeedReorder($event)">
          @for (entry of items; track entry.kind + ':' + entry.slug) {
            <li class="home-row">
              <span class="handle">⠿</span>
              <span class="kind-badge">{{ entry.kind === 'furniture' ? 'MOBILIER' : 'EXPO' }}</span>
              <img [src]="entry.cover" [alt]="entry.title" class="thumb" />
              <span class="title">{{ entry.title }}</span>
              <label class="incl">
                <input type="checkbox" [checked]="entry.included" (change)="toggleIncluded(entry, $event)" /> Inclure
              </label>
            </li>
          }
        </ul>
      } @else {
        <p class="status">Chargement…</p>
      }
    </div>
  `,
  styles: [`
    .home-editor h2 { margin: 0 0 8px; font-family: var(--serif); font-weight: 400; font-size: 1.5rem; }
    .home-editor .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .ordering-list { list-style: none; padding: 0; margin: 0; }
    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .home-row .handle { color: var(--color-mute); font-size: 1.1rem; user-select: none; }
    .home-row .kind-badge { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); min-width: 64px; }
    .home-row .thumb { width: 40px; height: 40px; object-fit: cover; flex-shrink: 0; }
    .home-row .title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
    .status { color: var(--color-mute); }
  `]
})
export class AccueilComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);

  protected readonly homeItems = signal<HomeAdminItem[] | null>(null);

  constructor() {
    forkJoin([
      this.portfolio.getAllFurniture(),
      this.portfolio.getAllExhibitions(),
      this.portfolio.getAdminFeed(),
    ]).subscribe(([furniture, expos, feed]) => {
      const included = new Set(feed.map(f => `${f.kind}:${f.slug}`));
      const items: HomeAdminItem[] = [];
      for (const f of feed) {
        const fur = furniture.find(x => x.slug === f.slug && f.kind === 'furniture');
        if (fur) items.push({ kind: 'furniture', slug: fur.slug, title: fur.title, cover: fur.coverImage, included: true });
        const exh = expos.find(x => x.slug === f.slug && f.kind === 'exhibition');
        if (exh) items.push({ kind: 'exhibition', slug: exh.slug, title: exh.title, cover: exh.coverImage, included: true });
      }
      for (const fur of furniture) {
        if (!included.has(`furniture:${fur.slug}`)) {
          items.push({ kind: 'furniture', slug: fur.slug, title: fur.title, cover: fur.coverImage, included: false });
        }
      }
      for (const exh of expos) {
        if (!included.has(`exhibition:${exh.slug}`)) {
          items.push({ kind: 'exhibition', slug: exh.slug, title: exh.title, cover: exh.coverImage, included: false });
        }
      }
      this.homeItems.set(items);
    });
  }

  onFeedReorder(order: number[]): void {
    const current = this.homeItems();
    if (!current) return;
    this.homeItems.set(order.map(i => current[i]));
    this.persistFeed();
  }

  toggleIncluded(item: HomeAdminItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.homeItems.update(items => items?.map(x => x === item ? { ...x, included: checked } : x) ?? null);
    this.persistFeed();
  }

  private persistFeed(): void {
    const items = this.homeItems() ?? [];
    const entries: AdminFeedEntry[] = items.filter(i => i.included).map(i => ({ kind: i.kind, slug: i.slug }));
    this.portfolio.replaceAdminFeed(entries).subscribe({
      next: () => this.toast.success('Ordre enregistré.'),
      error: () => this.toast.error('Impossible d\'enregistrer l\'ordre.'),
    });
  }
}
```

- [ ] **Step 4 : Écrire `navigation.component.spec.ts` (failing)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { NavigationComponent } from './navigation.component';
import { ToastService } from '../shared/toast.service';

describe('NavigationComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('charge les 3 toggles de visibilité depuis getContent', () => {
    const fixture = TestBed.createComponent(NavigationComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/site-content');
    req.flush({
      'nav.mobilier.visible': 'true',
      'nav.expositions.visible': 'false',
      'nav.studio.visible': 'true',
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    expect(cmp.navMobilierVisible()).toBeTrue();
    expect(cmp.navExpositionsVisible()).toBeFalse();
    expect(cmp.navStudioVisible()).toBeTrue();
  });

  it('toggleNavSection() PUT et notifie via ToastService', () => {
    const fixture = TestBed.createComponent(NavigationComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/site-content').flush({});
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.toggleNavSection('mobilier', { target: { checked: false } } as unknown as Event);
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/site-content');
    expect(put.request.body).toEqual({ 'nav.mobilier.visible': 'false' });
    put.flush({});
    expect(toast.success).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5 : Vérifier l'échec** — `cd frontend && npx ng test --watch=false --include='**/navigation.component.spec.ts'` → ÉCHEC.

- [ ] **Step 6 : Implémenter `navigation/navigation.component.ts`**

```typescript
import { Component, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';

type NavSection = 'mobilier' | 'expositions' | 'studio';

@Component({
  selector: 'app-navigation',
  standalone: true,
  template: `
    <div class="nav-editor">
      <h2>Sections visibles dans le menu</h2>
      <p class="hint">Active ou désactive l'apparition de chaque section dans l'en-tête et le pied de page. Les pages restent accessibles via leur URL si elles existent.</p>
      <ul class="nav-vis-list">
        <li class="home-row">
          <span class="kind-badge">MENU</span>
          <span class="title">Mobilier</span>
          <label class="incl">
            <input type="checkbox" [checked]="navMobilierVisible()" (change)="toggleNavSection('mobilier', $event)" /> Visible
          </label>
        </li>
        <li class="home-row">
          <span class="kind-badge">MENU</span>
          <span class="title">Expositions</span>
          <label class="incl">
            <input type="checkbox" [checked]="navExpositionsVisible()" (change)="toggleNavSection('expositions', $event)" /> Visible
          </label>
        </li>
        <li class="home-row">
          <span class="kind-badge">MENU</span>
          <span class="title">Studio</span>
          <label class="incl">
            <input type="checkbox" [checked]="navStudioVisible()" (change)="toggleNavSection('studio', $event)" /> Visible
          </label>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .nav-editor h2 { margin: 0 0 8px; font-family: var(--serif); font-weight: 400; font-size: 1.5rem; }
    .nav-editor .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .nav-vis-list { list-style: none; padding: 0; margin: 0; }
    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .home-row .kind-badge { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); min-width: 64px; }
    .home-row .title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
  `]
})
export class NavigationComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);

  protected readonly navMobilierVisible = signal(true);
  protected readonly navExpositionsVisible = signal(true);
  protected readonly navStudioVisible = signal(true);

  constructor() {
    this.portfolio.getContent().subscribe({
      next: content => {
        this.navMobilierVisible.set(content['nav.mobilier.visible'] !== 'false');
        this.navExpositionsVisible.set(content['nav.expositions.visible'] !== 'false');
        this.navStudioVisible.set(content['nav.studio.visible'] !== 'false');
      },
      error: () => this.toast.error('Impossible de charger la navigation.'),
    });
  }

  toggleNavSection(section: NavSection, event: Event): void {
    const visible = (event.target as HTMLInputElement).checked;
    if (section === 'mobilier') this.navMobilierVisible.set(visible);
    else if (section === 'expositions') this.navExpositionsVisible.set(visible);
    else this.navStudioVisible.set(visible);
    this.portfolio.updateContent({ [`nav.${section}.visible`]: visible ? 'true' : 'false' }).subscribe({
      next: () => this.toast.success('Visibilité de la section enregistrée.'),
      error: () => this.toast.error('Impossible d\'enregistrer la visibilité.'),
    });
  }
}
```

- [ ] **Step 7 : Vérifier le passage des deux composants** — `cd frontend && npx ng test --watch=false --include='**/accueil.component.spec.ts' --include='**/navigation.component.spec.ts'` → tous OK.

- [ ] **Step 8 : Ajouter les routes `accueil` et `navigation` dans `admin.routes.ts`** :

```typescript
{
  path: 'accueil',
  loadComponent: () => import('./accueil/accueil.component').then(m => m.AccueilComponent),
  title: 'Accueil — Administration',
},
{
  path: 'navigation',
  loadComponent: () => import('./navigation/navigation.component').then(m => m.NavigationComponent),
  title: 'Navigation — Administration',
},
```

- [ ] **Step 9 : Retirer la section `home` du monolithe** (`admin.component.ts`) :
  1. Retirer `'home'` du type `Tab`.
  2. Retirer le bouton `<button … switchTab('home')…>Accueil</button>`.
  3. Retirer `home: 'Accueil'` de `tabLabels`.
  4. Retirer le bloc `@if (tab() === 'home') { … }`.
  5. Retirer `homeItems`, `loadHomeTab`, `onFeedReorder`, `toggleIncluded`, `persistFeed`, `navMobilierVisible`, `navExpositionsVisible`, `navStudioVisible`, `toggleNavSection`.
  6. Dans `switchTab()`, retirer la branche `if (tab === 'home')`.
  7. Dans le constructeur, retirer l'appel à `portfolio.getContent()` qui pré-hydrate les flags nav (résidu de Task 4).
  8. Retirer les styles `.home-editor`, `.ordering-list`, `.nav-vis-list`.

> À ce stade, le monolithe ne contient probablement plus que les sections Email (mail-settings) et un shell vide. Si `tab()` n'a plus aucune valeur valide, le type devient `never` et la classe ne compile plus → Task 9 supprime tout.

- [ ] **Step 10 : Adapter `admin.component.spec.ts`** — retirer tests `'home'`, `homeItems`, `navMobilierVisible`, etc.

- [ ] **Step 11 : Tous les tests** — `cd frontend && npx ng test --watch=false` → OK.

- [ ] **Step 12 : Smoke test manuel** — `/admin/accueil` permet de réordonner le feed et toggle inclusion. `/admin/navigation` permet de toggle les 3 entrées menu. Vérifier sur le site public (header) que les toggles affectent la visibilité.

- [ ] **Step 13 : Commit**

```bash
git add frontend/src/app/pages/admin/accueil \
        frontend/src/app/pages/admin/navigation \
        frontend/src/app/pages/admin/admin.routes.ts \
        frontend/src/app/pages/admin/admin.component.ts \
        frontend/src/app/pages/admin/admin.component.spec.ts
git commit -m "feat(admin): extraire AccueilComponent + NavigationComponent

- AccueilComponent : ordre éditorial du masonry (feed)
- NavigationComponent : visibilité Mobilier/Expositions/Studio dans le menu
- Routes /admin/accueil et /admin/navigation ajoutées
- Bloc home retiré du monolithe (devient quasi vide, supprimé en Task 9)"
```

---

### Task 9 — Nettoyage final

## Task 9 : Nettoyage final

**Fichiers :**
- Supprimer : `frontend/src/app/pages/admin/admin.component.ts`
- Supprimer : `frontend/src/app/pages/admin/admin.component.spec.ts`
- Déplacer : `frontend/src/app/pages/admin/slides-editor.component.ts` → `frontend/src/app/pages/admin/shared/slides-editor.component.ts`
- Déplacer : `frontend/src/app/pages/admin/slides-editor.component.spec.ts` → `frontend/src/app/pages/admin/shared/slides-editor.component.spec.ts`
- Modifier : `frontend/src/app/pages/admin/admin.routes.ts` (retirer route `legacy`)
- Modifier : `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` (mise à jour import slides-editor)
- Modifier : `frontend/src/app/pages/admin/expositions/expositions.component.ts` (mise à jour import slides-editor)

- [ ] **Step 1 : Retirer la route `legacy` dans `admin.routes.ts`**

Supprimer l'entrée :

```typescript
{
  path: 'legacy',
  loadComponent: () => import('./admin.component').then(m => m.AdminComponent),
  title: 'Administration (legacy) — Milo GUILLAUME Design',
},
```

- [ ] **Step 2 : Supprimer le monolithe et son spec**

Commandes :

```powershell
Remove-Item "frontend\src\app\pages\admin\admin.component.ts"
Remove-Item "frontend\src\app\pages\admin\admin.component.spec.ts"
```

- [ ] **Step 3 : Lancer les tests pour vérifier l'absence de référence pendante**

Commande : `cd frontend && npx ng test --watch=false`
Attendu : tous tests OK (aucun spec ne devrait dépendre du monolithe à ce stade, mais le compilateur signale toute import résiduel).

Si un test échoue avec une erreur d'import vers `./admin.component`, le retirer ou le réécrire.

- [ ] **Step 4 : Déplacer `slides-editor.component.ts` vers `shared/`**

Commandes :

```powershell
Move-Item "frontend\src\app\pages\admin\slides-editor.component.ts" "frontend\src\app\pages\admin\shared\slides-editor.component.ts"
Move-Item "frontend\src\app\pages\admin\slides-editor.component.spec.ts" "frontend\src\app\pages\admin\shared\slides-editor.component.spec.ts"
```

- [ ] **Step 5 : Mettre à jour les imports dans `mobilier.component.ts`**

Remplacer :

```typescript
import { SlidesEditorComponent } from '../slides-editor.component';
```

par :

```typescript
import { SlidesEditorComponent } from '../shared/slides-editor.component';
```

- [ ] **Step 6 : Mettre à jour les imports dans `expositions.component.ts`**

Idem : `../slides-editor.component` → `../shared/slides-editor.component`.

- [ ] **Step 7 : Vérifier les autres consommateurs de `slides-editor`**

Commande : `cd frontend && grep -rn "slides-editor.component" src/`
Attendu : seuls `mobilier.component.ts`, `expositions.component.ts` et `shared/slides-editor.component.spec.ts` apparaissent. Sinon, corriger.

- [ ] **Step 8 : Lancer la suite complète avec couverture**

Commande : `cd frontend && npx ng test --watch=false --code-coverage`
Attendu : tous tests OK ; rapport `coverage/portfolio-frontend/index.html` montre couverture globale ≥ 80% (seuil enforced par `karma.conf.js`).

- [ ] **Step 9 : Vérifier qu'aucun import vers `admin.component` ne subsiste**

Commande : `cd frontend && grep -rn "admin.component" src/`
Attendu : aucun résultat (en dehors de cette ligne dans des fichiers générés type lockfile, ignorables).

- [ ] **Step 10 : Smoke test manuel complet**

```powershell
cd frontend
npm start
```

Naviguer chaque route :

- `/admin` (dashboard, 4 cartes)
- `/admin/mobilier` (liste + form + bloc Catégories)
- `/admin/expositions` (liste + form + bloc Position home)
- `/admin/textes` (3 sections de form)
- `/admin/mediatheque` (upload + grille + viewer)
- `/admin/accueil` (feed reorder)
- `/admin/navigation` (3 toggles)
- `/admin/typographie` (5 cartes role)
- `/admin/email` (mail-settings)
- `/admin/analytics` (iframe Umami / fallback)
- `/admin/legacy` (doit donner 404 ou redirect, plus disponible)

Vérifier les query params :

- `/admin/mobilier?new=1` → form vierge ouvert.
- `/admin/expositions?new=1` → form vierge ouvert.
- `/admin/mediatheque?import=1` → file picker déclenché.

Vérifier l'effet sur le site public :

- toggle navigation studio off → `Studio` disparaît du header.
- création d'une pièce → apparaît sur `/mobilier`.
- réordonnancement feed → ordre reflété sur la home `/`.

- [ ] **Step 11 : Build prod**

Commande : `cd frontend && npm run build`
Attendu : build OK, bundle généré dans `frontend/dist/portfolio-frontend/browser`. Vérifier la taille du chunk admin lazy → doit être inférieur à celui d'avant (monolithe 2441 lignes était dans le bundle initial via `loadComponent`, désormais 9 chunks séparés).

- [ ] **Step 12 : Commit final**

```bash
git add -A frontend/src/app/pages/admin/
git commit -m "refactor(admin): supprimer monolithe + déplacer slides-editor dans shared

Étape finale de la réorganisation admin (spec 2026-05-23).
- admin.component.ts (2441 lignes) supprimé
- slides-editor.component.ts déplacé dans shared/
- Imports mobilier/expositions mis à jour
- Route /admin/legacy retirée
- Couverture globale ≥ 80% confirmée"
```

- [ ] **Step 13 : Mettre à jour MEMORY.md**

Marquer la réorga admin terminée dans `C:\Users\Utilisateur\.claude\projects\...\memory\MEMORY.md`. Soit retirer l'entrée `reorganisation-admin-en-cours`, soit la renommer en `reorganisation-admin-terminee.md` avec un résumé court du résultat. À ce stade, le memory file `reorganisation-admin-en-cours.md` est obsolète.

- [ ] **Step 14 : Vérifier l'ADR**

Si la réorga admin mérite une ADR (architecture decision record), créer `docs/adr/00xx-reorganisation-admin.md` documentant :

- Le passage monolithe → routes lazy + shell.
- Le pattern `shared/` pour les composants réutilisables (ToastService, PhotoPicker, GalleryEditor).
- La décision de garder le picker inline avant la migration de Mobilier/Expositions, et de migrer Mobilier avant Expositions pour valider le pattern d'extraction GalleryEditor.

> Décision optionnelle : si la spec et le plan suffisent à expliquer la décision, on peut s'en passer. Demander à l'utilisateur.

---

## Self-Review du plan

Après rédaction complète des 9 tasks, vérifier :

### 1. Couverture de la spec

| Élément spec | Task |
|---|---|
| AdminLayoutComponent + sidebar groupée | Task 1 |
| DashboardComponent + 4 actions rapides | Task 1 |
| Routes `/admin/*` lazy chargées | Tasks 1-8 |
| Re-thématisation Catégories → Mobilier | Task 6 |
| Re-thématisation Position expo → Expositions | Task 7 |
| Re-thématisation Nav → Navigation | Task 8 |
| Feed homepage isolé dans Accueil | Task 8 |
| PhotoPickerComponent extrait | Task 5 |
| GalleryEditorComponent extrait | Task 6 |
| ToastsComponent + ToastService extraits | Task 1 |
| slides-editor déplacé dans shared/ | Task 9 |
| Suppression du monolithe | Task 9 |
| Migration incrémentale section par section | ✓ Ordre Tasks 2 → 8 |
| Tests par section (`*.component.spec.ts`) | ✓ chaque Task |
| Couverture ≥ 80% | Task 9 step 8 |

### 2. Placeholder scan

Aucun `TBD`, `TODO`, `implement later` ne doit subsister dans les sections de code. Si un point reste à trancher (ex. ADR Task 9 step 14), il est explicité avec contexte suffisant pour décider.

### 3. Type consistency

- `ToastService.success(text: string): void` (Task 1) ↔ utilisé partout via `this.toast.success(...)` (Tasks 3-8). ✓
- `PhotoPickerComponent` (Task 5) : `@Input() target: 'cover' | 'gallery'`, `@Output() selected = new EventEmitter<Photo>()`, `@Output() closed = new EventEmitter<void>()` ↔ consommé par `GalleryEditorComponent` (Task 6) avec `target="gallery"`. ✓
- `GalleryEditorComponent` (Task 6) : `@Input() images: string[]`, `@Output() imagesChange = new EventEmitter<string[]>()` ↔ consommé par MobilierComponent et ExpositionsComponent avec `[images]="..." (imagesChange)="..."`. ✓
- `HomeAdminItem` interface : déclarée localement dans AccueilComponent (Task 8). N'est pas exportée car non partagée.
- `ExhibitionMetaRow` interface : déclarée localement dans ExpositionsComponent (Task 7). N'est pas exportée car non partagée.

### 4. Ambiguïté

- Lecture des query params `?new=1` et `?import=1` : utilise `route.queryParamMap` (Observable) et un check explicite contre `'1'`. Documenté dans chaque task concernée (5, 6, 7).
- Picker inline du monolithe gardé pendant Tasks 5-6 : explicité dans la note de Task 5 et dans les checklist Tasks 5-6.
- L'extraction du picker du monolithe se fait progressivement (Task 6 retire les variantes `furniture-*`, Task 7 retire les variantes `exhibition-*` et la machinerie globale).

---

## Annexe : Ordre d'exécution conseillé

Si les Tasks sont exécutées en parallèle dans des branches/worktrees séparés via `subagent-driven-development`, respecter ces dépendances :

```text
Task 1 (infra)
  │
  ├─ Task 2 (Analytics)        ← indépendante
  ├─ Task 3 (Typographie)       ← indépendante
  ├─ Task 4 (Textes)            ← indépendante (mais touche `refreshTexts` partagé avec Task 8 — exécuter avant Task 8)
  ├─ Task 5 (Médiathèque + PhotoPicker)  ← introduit `shared/photo-picker.component.ts`
  │     │
  │     └─ Task 6 (Mobilier + GalleryEditor + Catégories)  ← consomme PhotoPicker via GalleryEditor
  │           │
  │           └─ Task 7 (Expositions + bandeau)  ← consomme GalleryEditor + PhotoPicker
  │                 │
  │                 └─ Task 8 (Accueil + Navigation)  ← retire le dernier bloc du monolithe (`tab() === 'home'`)
  │                       │
  │                       └─ Task 9 (Cleanup)  ← supprime le monolithe et déplace slides-editor
```

Tasks 2, 3, 4 peuvent s'exécuter en parallèle après Task 1.
Tasks 5 → 6 → 7 → 8 sont strictement séquentielles (chacune modifie le monolithe et consomme un artefact créé par la précédente).
Task 9 close la chaîne et nécessite que toutes les autres soient mergées.

---

## Conventions et contraintes

- **Standalone components + signals** uniquement.
- `@if` / `@for` / `@empty` / `@else` (jamais `*ngIf` / `*ngFor`).
- `loadComponent` pour les routes enfants.
- Tous les appels API passent par `PortfolioService` (aucun `HttpClient` injecté dans les composants).
- Aucun NgModule, aucun NgRx.
- Copy / labels en français.
- Pas d'inline `<script>` (CSP stricte côté backend).
- Commit messages : conventional-commits français (`feat(admin): …`).
