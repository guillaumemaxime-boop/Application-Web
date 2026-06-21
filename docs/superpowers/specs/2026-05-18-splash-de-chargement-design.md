# Splash de chargement (logo + pulse)

**Date** : 2026-05-18
**Statut** : ✅ Implémenté — mergé sur main (composant `splash`)
**Périmètre** : frontend uniquement (Angular 21)

## Contexte et problème

En staging, lors du chargement initial et lors de chaque navigation entre pages, l'utilisateur voit brièvement l'application avec ses **valeurs par défaut** (libellés non personnalisés, items de menu tous visibles, etc.) avant que les appels API ne ramènent le contenu CMS et les données de page. Le contenu se substitue ensuite, produisant un effet de flash désagréable.

Cause technique :

1. `AppComponent` rend immédiatement `<header>` + `<router-outlet>` + `<footer>`.
2. Chaque composant déclenche son propre `portfolio.getContent()` au `ngOnInit`. Le service n'est **pas mis en cache** ([portfolio.service.ts:75-77](../../../frontend/src/app/services/portfolio.service.ts#L75-L77)), donc ~9 GET HTTP redondants sont émis au cold-start.
3. En attendant les réponses, les composants affichent leurs signals par défaut. Quand la réponse arrive, ils ré-rendent → flash.

La latence backend en staging amplifie le phénomène (par rapport au dev local).

## Objectif

Afficher un **splash de chargement** (logo Milo Guillaume centré, animation de respiration douce) tant que les données nécessaires au premier rendu ne sont pas prêtes :

- Au cold-start (avant et pendant le bootstrap Angular).
- Lors de chaque navigation interne, tant que la page de destination n'a pas fini de charger ses données.

Le splash disparaît avec un fade out doux dès que les données sont prêtes, avec une durée minimale d'affichage de 400 ms pour éviter les flashs stroboscopiques.

## Choix de conception validés

| Décision | Choix |
| -------- | ----- |
| Périmètre du chargement attendu | Contenu CMS (`/api/content`) **+** données de la page courante |
| Déclenchement | Cold-start + chaque navigation entre pages |
| Visuel | Logo + animation de respiration (pulse + fade opacité) |
| Durée minimale | 400 ms |
| Timeout utilisateur visible | **Non** (choix assumé, à revisiter si la stabilité staging déçoit) |
| Garde-fou silencieux | **Oui** : 15 s par clé avec `console.warn`, force le `stop` pour éviter un blocage permanent en cas de bug |
| Admin (`/admin`) | **Exclu** du splash (UI directement visible après login) |

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ index.html                                                  │
│  <div id="app-splash">  ← rendu instantané (~0ms)           │
│    <img logo /> + CSS inline (pulse)                        │
│  </div>                                                     │
│  <app-root></app-root>                                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼  bundle Angular chargé
┌─────────────────────────────────────────────────────────────┐
│ AppComponent                                                │
│  ngOnInit → loadingService.start('init')                    │
│            getContent() (shareReplay) ──> stop('init')      │
│  @if (loading.visible()) <app-splash />  ← overlay Angular  │
│  <app-header /> <router-outlet /> <app-footer />            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼  Router NavigationStart
┌─────────────────────────────────────────────────────────────┐
│ LoadingService écoute Router events :                       │
│   NavigationStart → start('nav')                            │
│ Page (Home/Catalog/...) :                                   │
│   ngOnInit → start('page')                                  │
│   forkJoin(...).subscribe(... → stop('page') + stop('nav')) │
│ Le splash reste visible tant qu'une clé est active.         │
└─────────────────────────────────────────────────────────────┘
```

## Composants nouveaux

### 1. Splash HTML statique dans `index.html`

But : couvrir la fenêtre **avant** que le bundle Angular ne soit téléchargé et exécuté (le seul moment où aucun code Angular ne tourne encore).

Dans `<head>` (CSS inline pour être appliqué immédiatement) :

```html
<style>
  #app-splash {
    position: fixed; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: #ffffff;            /* doit rester aligné avec var(--color-bg) dans styles.css */
    z-index: 9999;
    transition: opacity 320ms ease;
  }
  #app-splash img {
    height: 96px; width: auto;
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

Dans `<body>`, juste avant `<app-root>` :

```html
<div id="app-splash" aria-hidden="true">
  <img src="logo.jpg" alt="" />
</div>
```

- `aria-hidden="true"` + `alt=""` : invisible pour les lecteurs d'écran (le splash n'apporte pas d'info utile).
- Le logo est déjà servi via `frontend/public/logo.jpg` → accessible en `/logo.jpg` sans changement.

### 2. `LoadingService`

Nouveau service signal-based dans `frontend/src/app/services/loading.service.ts`.

```ts
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
    if (this.active().size === 0) this.shownAt = Date.now();
    this.active.update(s => new Set(s).add(key));
    // Garde-fou silencieux : libère la clé après 15 s
    this.timeouts.set(key, setTimeout(() => {
      console.warn(`[LoadingService] safety timeout for key "${key}"`);
      this.stop(key);
    }, this.SAFETY_TIMEOUT_MS));
  }

  stop(key: string): void {
    const t = this.timeouts.get(key);
    if (t) { clearTimeout(t); this.timeouts.delete(key); }
    const elapsed = Date.now() - this.shownAt;
    const remaining = Math.max(0, this.MIN_VISIBLE_MS - elapsed);
    setTimeout(() => {
      this.active.update(s => {
        const next = new Set(s); next.delete(key); return next;
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

Points-clé :

- `Set<string>` de clés actives : autorise plusieurs sources concurrentes (`'init'`, `'nav'`, `'page'`). Le splash reste affiché tant qu'une au moins est active.
- `MIN_VISIBLE_MS = 400` : exigé par le choix utilisateur (pas de flash stroboscopique).
- `SAFETY_TIMEOUT_MS = 15_000` : si une clé n'est jamais `stop`-pée (bug de page), elle est libérée silencieusement après 15 s avec un `console.warn`.
- `hideHtmlSplash()` n'est appelé **qu'une seule fois**, lors du tout premier passage du compteur à 0, pour retirer le `<div id="app-splash">` du DOM. Ensuite c'est l'overlay Angular qui prend le relais.

### 3. `SplashComponent` (overlay Angular)

Nouveau composant standalone dans `frontend/src/app/components/splash/splash.component.ts`. Sélecteur `app-splash`. Même rendu visuel que le bloc HTML statique mais en SCSS avec les variables CSS du site.

```ts
@Component({
  selector: 'app-splash',
  standalone: true,
  template: `<div class="splash" aria-hidden="true"><img src="logo.jpg" alt="" /></div>`,
  styles: [`
    .splash {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-bg);
      z-index: 9999;
    }
    .splash img {
      height: 96px; width: auto;
      animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse {
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

## Modifications

### `AppComponent`

```ts
template: `
  @if (loading.visible()) { <app-splash /> }
  <app-header />
  <main><router-outlet /></main>
  <app-footer />
`
```

`ngOnInit` :

1. `loading.start('init')`.
2. S'abonne à `portfolio.getContent()` → `loading.stop('init')` au `next` ou `error`.
3. S'abonne à `router.events` :
   - `NavigationStart` → `loading.start('nav')`.
   - `NavigationCancel` / `NavigationError` → `loading.stop('nav')` (pas de page à charger).
   - `NavigationEnd` → **ne ferme pas `'nav'`** ; c'est le composant de la page qui le fera après chargement de ses données (voir ci-dessous).

### `PortfolioService.getContent()` — mise en cache

Objectif : un seul GET `/api/content` par session, partagé entre tous les appelants (header, footer, AppComponent, pages).

```ts
private contentCache$?: Observable<SiteContent>;

getContent(): Observable<SiteContent> {
  this.contentCache$ ??= this.http.get<SiteContent>(`${API}/content`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));
  return this.contentCache$;
}

invalidateContentCache(): void {
  this.contentCache$ = undefined;
}

updateContent(content: SiteContent): Observable<SiteContent> {
  return this.http.put<SiteContent>(`${API}/content`, content)
    .pipe(tap(() => this.invalidateContentCache()));
}
```

Justification de `refCount: false` : pour un site public read-only, on veut garder la réponse en cache même si plus aucun composant n'y est abonné, jusqu'à reload de la page ou modification depuis l'admin.

### Pages — appels `start`/`stop`

Pour chaque composant qui charge des données dans `ngOnInit` :

```ts
ngOnInit() {
  this.loading.start('page');
  forkJoin({ ... }).subscribe({
    next: data => {
      // peupler signals
      this.loading.stop('page');
      this.loading.stop('nav');
    },
    error: () => {
      this.loading.stop('page');
      this.loading.stop('nav');
    }
  });
}
```

`stop('nav')` est appelé par chaque page car le `LoadingService` ne sait pas, depuis l'event Router seul, à quel moment la page de destination est prête.

**Pages concernées :**

- `home.component.ts` ([pages/home/home.component.ts](../../../frontend/src/app/pages/home/home.component.ts))
- `catalog.component.ts`
- `furniture-detail.component.ts`
- `expositions-list.component.ts`
- `exhibition-detail.component.ts`
- `studio.component.ts`
- `contact.component.ts`

`header` et `footer` n'appellent pas `start/stop` : ils partagent le cache de `getContent()` déclenché par `AppComponent`. CMS prêt = header/footer prêts.

`admin.component.ts` et ses sous-pages sont **exclus** : pas de `start/stop` dans le back-office.

## Tests

### Nouveaux specs

`loading.service.spec.ts` :

- `visible()` est vrai pendant `start`, faux après `stop`.
- Deux clés concurrentes : `visible` reste vrai tant qu'une au moins est active.
- Délai minimum 400 ms respecté (avec `fakeAsync` + `tick`).
- Garde-fou 15 s : clé non-stoppée libérée automatiquement, `console.warn` appelé.
- `hideHtmlSplash` (vérifié par effet de bord sur le DOM) appelé une seule fois au tout premier passage à 0.

`splash.component.spec.ts` :

- Rendu de l'`<img>` avec `alt=""`.
- Classe `splash` présente, animation déclarée.

### Tests modifiés

`portfolio.service.spec.ts` :

- Deux appels successifs à `getContent()` → un seul GET HTTP (via `HttpTestingController`).
- `invalidateContentCache()` force un nouveau GET au prochain appel.
- `updateContent()` invalide le cache (via `tap`).

`app.component.spec.ts` (à créer s'il n'existe pas) :

- `AppComponent` appelle `loading.start('init')` à l'init.
- Sur `NavigationStart` factice du Router, `loading.start('nav')` est appelé.
- Le splash overlay est rendu quand `loading.visible()` est vrai.

### Vérification manuelle (non automatisable)

- DevTools throttling "Slow 3G" : splash visible au boot, fade out une fois la home prête.
- Navigation Home → Mobilier → Exposition : splash réapparaît à chaque transition.
- `prefers-reduced-motion` activé (DevTools → Rendering) : pas d'animation, opacité 0.9.

## Risques et points à surveiller

1. **Pages oubliées** : si on ajoute une nouvelle page sans appeler `start/stop`, la navigation vers cette page laisse `'nav'` actif jusqu'au garde-fou 15 s. → À documenter dans le plan d'implémentation : checklist "ajout d'une page".
2. **Couleur hardcodée** dans `index.html` (`#ffffff`, alignée sur l'actuel `--color-bg`) : si le design system change `--color-bg`, il faut mettre à jour la valeur dans `index.html`. Commentaire de rappel inclus.
3. **Pas de timeout utilisateur visible** : si l'API tombe en staging, l'utilisateur voit le splash 15 s puis une UI vide. Choix assumé pour cette itération ; à revisiter si la QA staging le signale.
4. **`shareReplay` avec `refCount: false`** : cache permanent jusqu'à reload. Voulu pour le site public, mais à garder en tête si on ajoute plus tard du contenu CMS qui doit être ré-interrogé.

## Hors-périmètre

- Pré-chargement côté serveur (SSR) : non utilisé sur le projet, hors scope.
- Animation différente entre cold-start et navigation : un seul style suffit.
- Timeout visible + message d'erreur : explicitement écarté par l'utilisateur.
- Cache des autres endpoints (`/api/home`, `/api/furniture`, etc.) : seul `getContent()` est mis en cache pour le besoin courant. Les autres restent inchangés.

## Critères d'acceptation

- En navigation neuve sur staging (cold-start), aucun flash de contenu par défaut n'est visible : seul le splash apparaît, puis le contenu réel.
- Lors d'une navigation Home → Mobilier, le splash apparaît dès le clic et disparaît une fois la page Mobilier prête (CMS + liste mobilier).
- Sur connexion locale rapide, le splash reste visible au moins 400 ms.
- Les tests unitaires et de coverage passent (seuil 80 % maintenu, cf. `karma.conf.js`).
- Aucune régression visible sur la page admin (pas de splash entre les onglets admin).
