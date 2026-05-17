# Traçabilité des accès — Umami auto-hébergé — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une mesure d'audience auto-hébergée (Umami) au portfolio, avec un onglet **Analytics** intégré à `/admin` affichant les pages consultées et l'origine géographique des visiteurs, sans cookie ni IP persistée.

**Architecture:** Un conteneur `umami` ajouté à la stack Docker, partageant la base Postgres existante via un schéma dédié. Nginx du conteneur frontend sert le snippet et un endpoint `/env.js` qui injecte les IDs Umami via `envsubst` au démarrage. L'admin charge le dashboard natif Umami en `<iframe>` via un lien de partage public-mais-opaque.

**Tech Stack:** Docker Compose, image `ghcr.io/umami-software/umami:postgresql-latest`, Nginx (envsubst déjà utilisé pour `BACKEND_HOST`), Angular 21 standalone components (signaux + nouvelle control flow), Postgres 16.

**Spec de référence:** [docs/superpowers/specs/2026-05-17-tracabilite-acces-umami-design.md](../specs/2026-05-17-tracabilite-acces-umami-design.md)

---

## File Structure

### Fichiers modifiés

| Fichier | Responsabilité de la modification |
|---|---|
| `docker-compose.yml` | Ajouter le service `umami` à la stack locale |
| `deploy/base/docker-compose.yml` | Ajouter le service `umami` à la stack Rancher/Railway, paramétré |
| `deploy/envs/local/.env` | Ajouter les variables `UMAMI_*` pour le déploiement local |
| `frontend/Dockerfile` | Étendre `NGINX_ENVSUBST_FILTER` pour autoriser `UMAMI_WEBSITE_ID` et `UMAMI_SHARE_TOKEN` |
| `frontend/nginx.conf` | Ajouter 4 `location` : `/env.js`, `/umami.js`, `/umami/api/send`, `/umami/share/` |
| `frontend/src/index.html` | Charger `/env.js` en `<head>` avant le bootstrap Angular |
| `frontend/src/main.ts` | Injecter le snippet Umami au démarrage si `window.__UMAMI__.websiteId` présent |
| `frontend/src/app/pages/admin/admin.component.ts` | Ajouter le tab `analytics` (type `Tab`, bouton, bloc de rendu, méthodes) |
| `frontend/src/app/pages/admin/admin.component.spec.ts` | Tester le rendu conditionnel de l'iframe et du fallback |
| `.github/workflows/sync-rancher.yml` | Ajouter le healthcheck Umami à la boucle de vérification post-déploiement |

### Fichiers créés

| Fichier | Responsabilité |
|---|---|
| `docs/adr/0012-mesure-audience-umami.md` | ADR documentant le choix Umami auto-hébergé et le positionnement RGPD |

### Hors-périmètre (à faire manuellement après l'implémentation)

- Création du compte admin Umami au premier démarrage (UI Umami)
- Création du website Umami → récupération du `UMAMI_WEBSITE_ID`
- Génération du token de partage public Umami → récupération du `UMAMI_SHARE_TOKEN`
- Configuration de la rétention 14 mois dans l'UI Umami (Settings → Data)
- Configuration du filtre d'exclusion `/admin*` dans l'UI Umami
- Création du service `umami` côté Railway (one-shot, branché sur la Postgres existante)
- Rédaction de la page « Politique de confidentialité » (contenu éditorial)

---

## Task 1 : Ajouter le service `umami` à `docker-compose.yml` (local)

**Files:**
- Modify: `docker-compose.yml` (ajouter un service entre `backend` et `frontend`)

- [ ] **Step 1.1 : Ajouter le service `umami`**

Insérer dans `docker-compose.yml`, juste avant le service `frontend` (après la fin du service `backend`, avant la ligne `frontend:`) :

```yaml
  umami:
    image: ghcr.io/umami-software/umami:postgresql-v2.13.0
    container_name: atelier-umami
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://portfolio:portfolio@postgres:5432/portfolio?schema=umami
      DATABASE_TYPE: postgresql
      APP_SECRET: "umami-dev-secret-change-in-production-min-32-chars"
      TRACKER_SCRIPT_NAME: umami
    expose:
      - "3000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:3000/api/heartbeat"]
      interval: 20s
      timeout: 3s
      retries: 5
      start_period: 30s
    networks:
      - atelier-net
```

- [ ] **Step 1.2 : Ajouter `umami` dans `depends_on` du service `frontend`**

Remplacer dans la section `frontend:` :

```yaml
    depends_on:
      backend:
        condition: service_healthy
```

par :

```yaml
    depends_on:
      backend:
        condition: service_healthy
      umami:
        condition: service_healthy
```

- [ ] **Step 1.3 : Valider que le compose parse et démarre Umami**

Run :
```powershell
docker compose config | Select-String "umami"
```
Expected : 3-4 lignes mentionnant `atelier-umami`, l'image et `umami` réseau.

Run (en arrière-plan, peut être long) :
```powershell
docker compose up -d postgres umami
```
Puis attendre que le healthcheck passe :
```powershell
for ($i=0; $i -lt 24; $i++) { $h = docker inspect --format '{{.State.Health.Status}}' atelier-umami 2>$null; if ($h -eq 'healthy') { Write-Host "Umami healthy"; break }; Write-Host "Status: $h ($i/24)"; Start-Sleep 5 }
```
Expected : `Umami healthy` avant 120 s.

Run :
```powershell
docker exec atelier-umami wget -q -O- http://localhost:3000/api/heartbeat
```
Expected : JSON contenant `"status":"ok"`.

- [ ] **Step 1.4 : Vérifier que le schéma `umami` est bien créé dans Postgres**

Run :
```powershell
docker exec atelier-postgres psql -U portfolio -d portfolio -c "\dn umami"
```
Expected : une ligne avec `umami` et `portfolio` comme propriétaire.

Run :
```powershell
docker exec atelier-postgres psql -U portfolio -d portfolio -c "\dt umami.*"
```
Expected : liste des tables Umami (`session`, `website_event`, `account`, etc., ~10 tables).

- [ ] **Step 1.5 : Arrêter les conteneurs et commiter**

Run :
```powershell
docker compose down
```

Run :
```powershell
git add docker-compose.yml
git commit -m "feat(umami): ajouter le service Umami a docker-compose local"
```

---

## Task 2 : Ajouter le service `umami` à `deploy/base/docker-compose.yml`

**Files:**
- Modify: `deploy/base/docker-compose.yml`
- Modify: `deploy/envs/local/.env`

- [ ] **Step 2.1 : Ajouter le service `umami` paramétré dans le compose de base**

Insérer dans `deploy/base/docker-compose.yml`, juste avant le service `frontend` (après la fin du service `backend`) :

```yaml
  umami:
    image: ghcr.io/umami-software/umami:${UMAMI_VERSION:-postgresql-v2.13.0}
    container_name: atelier-umami
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=umami
      DATABASE_TYPE: postgresql
      APP_SECRET: ${UMAMI_APP_SECRET}
      TRACKER_SCRIPT_NAME: umami
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:3000/api/heartbeat"]
      interval: 20s
      timeout: 3s
      retries: 5
      start_period: 30s
    networks: [atelier-net]
```

- [ ] **Step 2.2 : Faire dépendre `frontend` de `umami` healthy dans le compose de base**

Remplacer dans la section `frontend:` :

```yaml
    depends_on:
      backend:
        condition: service_healthy
```

par :

```yaml
    depends_on:
      backend:
        condition: service_healthy
      umami:
        condition: service_healthy
```

- [ ] **Step 2.3 : Ajouter les vars `UMAMI_*` dans `deploy/envs/local/.env`**

Ajouter à la fin du fichier `deploy/envs/local/.env` :

```bash

# --- Umami analytics ---
UMAMI_VERSION=postgresql-v2.13.0
UMAMI_APP_SECRET=umami-rancher-local-secret-change-me-min-32-chars
# Renseigner apres la creation initiale dans l'UI Umami :
UMAMI_WEBSITE_ID=
UMAMI_SHARE_TOKEN=
```

- [ ] **Step 2.4 : Valider que le compose de base parse**

Run :
```powershell
docker compose -f deploy/base/docker-compose.yml --env-file deploy/envs/local/.env config | Select-String "atelier-umami"
```
Expected : une ligne mentionnant le `container_name: atelier-umami`.

- [ ] **Step 2.5 : Commit**

Run :
```powershell
git add deploy/base/docker-compose.yml deploy/envs/local/.env
git commit -m "feat(umami): ajouter le service Umami au compose Rancher/Railway"
```

---

## Task 3 : Étendre le filtre `NGINX_ENVSUBST_FILTER` du frontend

**Files:**
- Modify: `frontend/Dockerfile`

- [ ] **Step 3.1 : Ajouter `UMAMI_WEBSITE_ID` et `UMAMI_SHARE_TOKEN` au filtre envsubst**

Dans `frontend/Dockerfile`, remplacer :

```dockerfile
ENV PORT=80 \
    BACKEND_HOST=overflowing-stillness.railway.internal \
    BACKEND_PORT=8080 \
    NGINX_ENVSUBST_FILTER='^(PORT|BACKEND_HOST|BACKEND_PORT)$'
```

par :

```dockerfile
ENV PORT=80 \
    BACKEND_HOST=overflowing-stillness.railway.internal \
    BACKEND_PORT=8080 \
    UMAMI_WEBSITE_ID='' \
    UMAMI_SHARE_TOKEN='' \
    NGINX_ENVSUBST_FILTER='^(PORT|BACKEND_HOST|BACKEND_PORT|UMAMI_WEBSITE_ID|UMAMI_SHARE_TOKEN)$'
```

Les valeurs par défaut vides signifient « pas de tracking » si aucune valeur n'est passée à `docker run` — comportement attendu pour les tests CI et le dev local sans Umami configuré.

- [ ] **Step 3.2 : Commit**

Run :
```powershell
git add frontend/Dockerfile
git commit -m "feat(umami): autoriser UMAMI_WEBSITE_ID et UMAMI_SHARE_TOKEN dans Nginx envsubst"
```

---

## Task 4 : Ajouter les `location` Nginx pour Umami

**Files:**
- Modify: `frontend/nginx.conf`

- [ ] **Step 4.1 : Ajouter les 4 nouveaux `location` au template Nginx**

Dans `frontend/nginx.conf`, juste après la ligne `gzip_min_length 1024;` (avant la première `location ^~ /api/`), insérer :

```nginx
    # Runtime env injection: served as a JS literal, evaluated before Angular bootstraps.
    # ${UMAMI_*} are substituted by Nginx's docker-entrypoint envsubst at container start.
    location = /env.js {
        default_type application/javascript;
        add_header Cache-Control "no-store" always;
        return 200 'window.__UMAMI__={"websiteId":"${UMAMI_WEBSITE_ID}","shareToken":"${UMAMI_SHARE_TOKEN}"};';
    }

    # Umami tracker script (same-origin → no CSP relaxation needed)
    location = /umami.js {
        proxy_pass http://umami:3000/script.js;
        proxy_set_header Host $host;
    }

    # Umami event ingestion (the only Umami write endpoint exposed publicly)
    location = /umami/api/send {
        proxy_pass http://umami:3000/api/send;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Umami public share dashboard (consumed by the admin iframe)
    location /umami/share/ {
        proxy_pass http://umami:3000/share/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

Vérification : aucune autre route Umami n'est exposée. L'admin Umami, les settings et l'API d'écriture autre que `/api/send` restent inaccessibles depuis Internet.

- [ ] **Step 4.2 : Vérifier que Nginx interprète bien le template après build**

Run (rebuild du frontend) :
```powershell
docker compose build frontend
```
Expected : pas d'erreur de build.

Run (démarrage de la stack complète) :
```powershell
docker compose up -d
```

Attendre que tout passe healthy :
```powershell
for ($i=0; $i -lt 24; $i++) { $h = docker inspect --format '{{.State.Health.Status}}' atelier-frontend 2>$null; if ($h -eq 'healthy') { Write-Host "Frontend healthy"; break }; Start-Sleep 5 }
```
Expected : `Frontend healthy`.

- [ ] **Step 4.3 : Tester `/env.js` avec et sans IDs**

Run :
```powershell
(curl http://localhost:4200/env.js).Content
```
Expected : `window.__UMAMI__={"websiteId":"","shareToken":""};` (vides parce que pas passés au compose local).

Run (forcer une valeur) :
```powershell
docker compose run -e UMAMI_WEBSITE_ID=test-uuid -e UMAMI_SHARE_TOKEN=test-token --rm -p 4201:80 frontend &
Start-Sleep 5
(curl http://localhost:4201/env.js).Content
```
Expected : `window.__UMAMI__={"websiteId":"test-uuid","shareToken":"test-token"};`.

Tuer le conteneur de test :
```powershell
docker ps --filter "publish=4201" --format "{{.ID}}" | ForEach-Object { docker rm -f $_ }
```

- [ ] **Step 4.4 : Tester `/umami.js` (le snippet de tracking)**

Run :
```powershell
(curl http://localhost:4200/umami.js).Content.Substring(0, 200)
```
Expected : du code JavaScript minifié — Umami sert son tracker.

- [ ] **Step 4.5 : Tester que les autres routes Umami sont fermées**

Run :
```powershell
try { Invoke-WebRequest http://localhost:4200/umami/settings -UseBasicParsing -ErrorAction Stop } catch { $_.Exception.Response.StatusCode }
```
Expected : `NotFound` (404) — l'admin Umami n'est pas exposé.

- [ ] **Step 4.6 : Arrêter la stack et commit**

Run :
```powershell
docker compose down
```

Run :
```powershell
git add frontend/nginx.conf
git commit -m "feat(umami): proxy Nginx pour /env.js, /umami.js, /umami/api/send et /umami/share/"
```

---

## Task 5 : Charger `/env.js` dans `index.html`

**Files:**
- Modify: `frontend/src/index.html`

- [ ] **Step 5.1 : Ajouter la balise `<script src="/env.js">`**

Dans `frontend/src/index.html`, remplacer :

```html
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
```

par :

```html
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <!-- Runtime env injected by Nginx envsubst; defines window.__UMAMI__ -->
  <script src="/env.js"></script>
</head>
```

Note : pas de `defer` ici car on veut que `window.__UMAMI__` soit défini avant que `main.ts` s'exécute. Le fichier `/env.js` est minuscule (< 100 octets) donc le coût de blocage est négligeable. En dev (`ng serve`), le script renvoie 404 et le navigateur log une erreur — `window.__UMAMI__` reste `undefined`, ce que `main.ts` gère.

- [ ] **Step 5.2 : Commit**

Run :
```powershell
git add frontend/src/index.html
git commit -m "feat(umami): charger /env.js avant le bootstrap Angular"
```

---

## Task 6 : Injecter le snippet Umami depuis `main.ts`

**Files:**
- Modify: `frontend/src/main.ts`

- [ ] **Step 6.1 : Étendre `main.ts` avec l'injection conditionnelle du snippet**

Remplacer le contenu intégral de `frontend/src/main.ts` :

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
```

par :

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

interface UmamiRuntimeEnv {
  websiteId?: string;
  shareToken?: string;
}

function injectUmamiTracker(): void {
  const env = (window as unknown as { __UMAMI__?: UmamiRuntimeEnv }).__UMAMI__ ?? {};
  if (!env.websiteId) {
    return;
  }
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/umami.js';
  script.dataset['websiteId'] = env.websiteId;
  document.head.appendChild(script);
}

injectUmamiTracker();
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
```

- [ ] **Step 6.2 : Vérifier que le build Angular passe**

Run :
```powershell
cd frontend; npx ng build --configuration development; cd ..
```
Expected : build OK, pas d'erreur TypeScript.

- [ ] **Step 6.3 : Commit**

Run :
```powershell
git add frontend/src/main.ts
git commit -m "feat(umami): injecter le snippet de tracking depuis window.__UMAMI__"
```

---

## Task 7 : Ajouter le tab `analytics` à `AdminComponent` (TDD)

**Files:**
- Modify: `frontend/src/app/pages/admin/admin.component.ts`
- Modify: `frontend/src/app/pages/admin/admin.component.spec.ts`

### 7a. Test : rendu de l'iframe quand les IDs sont présents

- [ ] **Step 7.1 : Écrire le test qui décrit le comportement attendu**

Ajouter dans `frontend/src/app/pages/admin/admin.component.spec.ts`, à la fin du dernier `describe`, juste avant la fermeture finale `});` :

```ts
  describe('analytics tab', () => {
    afterEach(() => {
      delete (window as any).__UMAMI__;
    });

    it('rend une iframe Umami quand websiteId et shareToken sont definis', () => {
      (window as any).__UMAMI__ = { websiteId: 'wid-123', shareToken: 'tok-abc' };
      component['tab'].set('analytics');
      fixture.detectChanges();

      const iframe = fixture.nativeElement.querySelector('iframe.umami-frame') as HTMLIFrameElement | null;
      expect(iframe).withContext('iframe rendue').not.toBeNull();
      expect(iframe!.src).toContain('/umami/share/tok-abc/wid-123');
    });

    it('affiche un message de fallback si la config Umami est absente', () => {
      (window as any).__UMAMI__ = undefined;
      component['tab'].set('analytics');
      fixture.detectChanges();

      const iframe = fixture.nativeElement.querySelector('iframe.umami-frame');
      const fallback = fixture.nativeElement.querySelector('.umami-fallback');
      expect(iframe).toBeNull();
      expect(fallback).withContext('message de fallback rendu').not.toBeNull();
      expect(fallback!.textContent).toContain('Configuration analytics manquante');
    });

    it('affiche un message de fallback si shareToken est manquant', () => {
      (window as any).__UMAMI__ = { websiteId: 'wid-123', shareToken: '' };
      component['tab'].set('analytics');
      fixture.detectChanges();

      const iframe = fixture.nativeElement.querySelector('iframe.umami-frame');
      const fallback = fixture.nativeElement.querySelector('.umami-fallback');
      expect(iframe).toBeNull();
      expect(fallback).not.toBeNull();
    });
  });
```

- [ ] **Step 7.2 : Exécuter le test pour vérifier qu'il échoue**

Run :
```powershell
cd frontend; npx ng test --watch=false --include='**/admin.component.spec.ts'; cd ..
```
Expected : 3 tests FAIL (références à `'analytics'`, `.umami-frame`, `.umami-fallback` qui n'existent pas encore).

### 7b. Implémentation minimale

- [ ] **Step 7.3 : Étendre le type `Tab`**

Dans `frontend/src/app/pages/admin/admin.component.ts`, remplacer :

```ts
type Tab = 'furniture' | 'exhibitions' | 'texts' | 'photos';
```

par :

```ts
type Tab = 'furniture' | 'exhibitions' | 'texts' | 'photos' | 'analytics';
```

- [ ] **Step 7.4 : Ajouter le bouton tab `Analytics`**

Dans le template, juste après le bouton tab `Médiathèque` (le 4e bouton, qui termine par `}">Médiathèque</button>`) et avant la fermeture de `</div>` du `tabs role="tablist"`, insérer :

```html
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === 'analytics'"
            [class.active]="tab() === 'analytics'"
            (click)="switchTab('analytics')">Analytics</button>
```

- [ ] **Step 7.5 : Ajouter le bloc de rendu du tab `analytics`**

Dans le template, juste avant la fin du `<div class="container">` (après le bloc `@if (tab() === 'photos') { ... }` et son contenu), insérer :

```html
        @if (tab() === 'analytics') {
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
        }
```

- [ ] **Step 7.6 : Ajouter les méthodes `umamiConfigured()` et `umamiIframeUrl()` à la classe**

Dans `AdminComponent`, juste après la méthode `closeViewer()` et avant `private splitLines(...)`, insérer :

```ts
  protected umamiConfigured(): boolean {
    const env = (window as unknown as { __UMAMI__?: { websiteId?: string; shareToken?: string } }).__UMAMI__;
    return !!(env && env.websiteId && env.shareToken);
  }

  protected umamiIframeUrl(): string {
    const env = (window as unknown as { __UMAMI__?: { websiteId?: string; shareToken?: string } }).__UMAMI__;
    return `/umami/share/${env?.shareToken ?? ''}/${env?.websiteId ?? ''}`;
  }
```

- [ ] **Step 7.7 : Ajouter les styles `.umami-frame` et `.umami-fallback`**

Dans le bloc `styles: [...]`, juste avant la dernière media query `@media (max-width: 960px)`, insérer :

```css
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
```

- [ ] **Step 7.8 : Le test du `iframeUrl` utilise `iframe.src` (absolu) — adapter l'attribut**

Angular `[src]` sur un `<iframe>` peut être sanitisé. Pour que le test passe avec `iframe.src.toContain('/umami/share/...')` et que Angular n'émette pas d'avertissement de sécurité, on utilise un binding `[attr.src]` ou on déclare l'URL safe via `DomSanitizer`.

Le plus simple et le plus correct ici est d'utiliser `DomSanitizer.bypassSecurityTrustResourceUrl` côté composant, parce que le `src` change selon la config.

Mettre à jour les imports en haut du fichier `admin.component.ts` (ligne 1-2 actuellement) :

Remplacer :

```ts
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
```

par :

```ts
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
```

Dans la classe `AdminComponent`, ajouter l'injection juste après `private readonly fb = inject(FormBuilder);` :

```ts
  private readonly sanitizer = inject(DomSanitizer);
```

Remplacer la méthode `umamiIframeUrl()` ajoutée à l'étape 7.6 par :

```ts
  protected umamiIframeUrl(): SafeResourceUrl {
    const env = (window as unknown as { __UMAMI__?: { websiteId?: string; shareToken?: string } }).__UMAMI__;
    const url = `/umami/share/${env?.shareToken ?? ''}/${env?.websiteId ?? ''}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
```

- [ ] **Step 7.9 : Exécuter le test pour vérifier qu'il passe**

Run :
```powershell
cd frontend; npx ng test --watch=false --include='**/admin.component.spec.ts'; cd ..
```
Expected : tous les tests du fichier passent, en particulier les 3 nouveaux du `describe('analytics tab')`.

Note : si `iframe.src` retourne une URL complète avec le host (ex. `http://localhost:9876/umami/share/tok-abc/wid-123`), le test `.toContain('/umami/share/tok-abc/wid-123')` passe quand même grâce à `toContain`. Si jamais le SafeResourceUrl bloque la lecture de `.src`, remplacer dans le test `iframe!.src` par `iframe!.getAttribute('src')`.

- [ ] **Step 7.10 : Lancer toute la suite de tests frontend pour s'assurer qu'on n'a rien cassé**

Run :
```powershell
cd frontend; npx ng test --watch=false; cd ..
```
Expected : tous les tests passent, le seuil de couverture de 80% est maintenu.

- [ ] **Step 7.11 : Commit**

Run :
```powershell
git add frontend/src/app/pages/admin/admin.component.ts frontend/src/app/pages/admin/admin.component.spec.ts
git commit -m "feat(admin): onglet Analytics avec iframe Umami et fallback"
```

---

## Task 8 : Étendre le healthcheck CI sur Umami

**Files:**
- Modify: `.github/workflows/sync-rancher.yml`

- [ ] **Step 8.1 : Ajouter une étape healthcheck Umami après celle du backend**

Dans `.github/workflows/sync-rancher.yml`, juste après l'étape `- name: Health check (backend)` (qui se termine par `exit 1`, ligne 67 environ), avant `- name: Prune dangling images`, insérer :

```yaml
      - name: Health check (umami)
        shell: bash
        run: |
          for i in {1..12}; do
            if docker exec atelier-umami wget -q --spider http://127.0.0.1:3000/api/heartbeat 2>/dev/null; then
              echo "Umami healthy"; exit 0
            fi
            echo "Waiting for umami... ($i/12)"; sleep 10
          done
          echo "Umami health check failed — dumping logs:"
          docker compose -f deploy/base/docker-compose.yml --env-file deploy/envs/local/.env logs --tail=200 umami
          exit 1
```

- [ ] **Step 8.2 : Commit**

Run :
```powershell
git add .github/workflows/sync-rancher.yml
git commit -m "ci(rancher): ajouter le healthcheck Umami au sync"
```

---

## Task 9 : Rédiger l'ADR-0012

**Files:**
- Create: `docs/adr/0012-mesure-audience-umami.md`

- [ ] **Step 9.1 : Créer le fichier ADR-0012**

Créer `docs/adr/0012-mesure-audience-umami.md` avec le contenu suivant :

```markdown
# ADR-0012 : Mesure d'audience par Umami auto-hébergé

- **Statut** : Accepted
- **Date** : 2026-05-17
- **Décideurs** : Maxime Guillaume
- **Tags** : frontend, infra, rgpd, observabilite

## Contexte

Le portfolio en production n'a aucune mesure d'audience. Le besoin est de connaître :
- les pages les plus consultées,
- l'origine géographique des visiteurs (pays, ville),
- la tendance temporelle du trafic.

Contraintes :
- RGPD : pas de cookie persistant, pas d'IP en clair en base.
- Cohérence avec l'ADR-0010 (supervision minimaliste, auto-hébergement par défaut).
- CSP stricte (`script-src 'self'`) à preserver : pas de script tiers chargé depuis un domaine externe.
- Projet solo, pas de SLA : pas de plateforme d'analytics dédiée coûteuse.

## Décision

Adopter **Umami auto-hébergé** dans la stack Docker existante.

- Conteneur unique `ghcr.io/umami-software/umami:postgresql-vX.Y.Z`, tag pinné, branché sur la Postgres existante via un schéma dédié `umami`.
- Snippet `/umami.js` servi en same-origin par le Nginx du frontend (proxy vers `umami:3000`) : aucun assouplissement de la CSP.
- Endpoint `/umami/api/send` exposé publiquement pour l'ingestion d'events ; toutes les autres routes Umami restent privées au réseau Docker.
- Dashboard intégré dans `/admin` via une `<iframe>` consommant un lien de partage public-opaque (`UMAMI_SHARE_TOKEN`).
- IDs injectés à runtime via `envsubst` Nginx (endpoint `/env.js`), même pattern que `BACKEND_HOST`.

## Conséquences

### Positives

- **RGPD conforme par défaut** : aucun cookie, identifiant visiteur = hash quotidien irréversible, IP jetée après dérivation pays/ville → pas de bannière de consentement requise (doctrine CNIL, mars 2021).
- **Aucune dépendance tierce** : pas de domaine externe à autoriser dans la CSP, pas de fournisseur SaaS, données chez nous.
- **Cohérent ADR-0006/0010** : Docker single-container, healthcheck `wget`, supervision uniforme.
- **Coût quasi nul** : 1 conteneur Railway de plus, partage la Postgres existante.
- **Découplage** : si Umami doit être migré ailleurs, `pg_dump --schema=umami` extrait toutes les données proprement.

### Négatives / compromis

- Trafic des visiteurs équipés d'adblockers (ublock filtre `/api/send`) non mesuré, malgré le renommage `TRACKER_SCRIPT_NAME=umami`. Acceptable pour un portfolio.
- Mise à jour Umami manuelle (bump du tag d'image) : une release majeure peut casser les migrations Prisma. Toujours tester en local avant production.
- Pas de tracking d'événements custom (clics CTA, formulaire contact) au MVP — ajoutable plus tard via `umami.track('event', ...)` sans changement infra.

### Neutres

- L'exclusion de `/admin*` du tracking est configurée dans l'UI Umami (filtre dashboard), pas via le code — choix volontaire pour éviter de coupler le code et la config opérationnelle.
- La rétention 14 mois est gérée par Umami (purge automatique configurée dans l'UI) — pas de job CRON applicatif à maintenir.

## Alternatives envisagées

### Option A — In-house Spring + Postgres + tableau de bord Angular

Implémenter la collecte (`OncePerRequestFilter`), la dérivation GeoIP (lib MaxMind), le hashing, le schéma Liquibase, le service de queries, le dashboard Angular custom avec librairie de charts.

**Écartée** : effort disproportionné par rapport à un outil OSS mature et déjà conforme RGPD. Refait ce que Umami offre out-of-the-box (top pages, carte monde, tendance, sources, devices, OS, browsers).

### Option B — Plausible Cloud / Umami Cloud (SaaS)

Service hébergé par l'éditeur, snippet JS depuis leur domaine.

**Écartée** : impose un assouplissement de la CSP `script-src` pour autoriser le domaine externe, dépendance vendor, et pour Plausible un coût récurrent (~9€/mois). Le bénéfice (zéro infra) ne compense pas la perte de simplicité côté CSP/données.

### Option C — Plausible Community Edition (self-hosted)

Équivalent OSS de Plausible Cloud.

**Écartée** : nécessite un cluster Clickhouse en plus de Postgres → 2 conteneurs supplémentaires + un second moteur de base à apprendre et opérer. Surdimensionné pour le volume du portfolio.

### Option D — Google Analytics 4

**Écartée** : non conforme RGPD sans bannière complexe (et déclaration CNIL post-2022). Données chez Google. Hors-philosophie du projet.

## Références

- [`docs/superpowers/specs/2026-05-17-tracabilite-acces-umami-design.md`](../superpowers/specs/2026-05-17-tracabilite-acces-umami-design.md) — spec design complet
- [`docker-compose.yml`](../../docker-compose.yml), [`deploy/base/docker-compose.yml`](../../deploy/base/docker-compose.yml) — service Umami
- [`frontend/nginx.conf`](../../frontend/nginx.conf) — proxy et `/env.js`
- [Umami — documentation](https://umami.is/docs)
- [CNIL — cookies & traceurs : exemption pour la mesure d'audience](https://www.cnil.fr/fr/cookies-et-traceurs-que-dit-la-loi)
- ADR-0010 (Supervision et monitoring) — coexiste avec celui-ci, ne le supersède pas
```

- [ ] **Step 9.2 : Mettre à jour [docs/adr/README.md](docs/adr/README.md) avec la nouvelle entrée**

Lire d'abord le fichier pour repérer le format de la liste :

```powershell
Get-Content docs/adr/README.md
```

Ajouter une ligne pour `ADR-0012` à la liste, dans l'ordre numérique.

(Si le README liste les ADRs sous forme de tableau, ajouter une ligne `| 0012 | Mesure d'audience par Umami auto-hébergé | Accepted |`. S'il liste sous forme de bullets, ajouter `- [0012 — Mesure d'audience par Umami auto-hébergé](0012-mesure-audience-umami.md) — Accepted`.)

- [ ] **Step 9.3 : Commit**

Run :
```powershell
git add docs/adr/0012-mesure-audience-umami.md docs/adr/README.md
git commit -m "docs(adr): ADR-0012 mesure d'audience par Umami auto-heberge"
```

---

## Task 10 : Validation manuelle end-to-end

Cette tâche n'est pas testable automatiquement — c'est un checklist de fumée à exécuter une fois tout commité. Aucun commit produit, sauf si une régression est trouvée.

- [ ] **Step 10.1 : Démarrer la stack complète**

Run :
```powershell
docker compose up --build -d
```

Attendre que les 4 conteneurs soient healthy :
```powershell
docker compose ps
```
Expected : 4 lignes `healthy` (postgres, backend, umami, frontend).

- [ ] **Step 10.2 : Initialiser Umami (one-shot)**

Ouvrir `http://localhost:4200/umami/login` (compte par défaut : `admin` / `umami`).

Note : ce path n'est PAS exposé par notre Nginx (seul `/umami/share/` l'est). Pour l'initialisation, faire le proxy temporaire :
```powershell
docker run --rm -p 4300:3000 --network atelier-net --name umami-tmp nginx:alpine sh -c "echo 'server { listen 3000; location / { proxy_pass http://atelier-umami:3000/; } }' > /etc/nginx/conf.d/default.conf; nginx -g 'daemon off;'"
```

Ouvrir `http://localhost:4300/login`, se connecter, changer le mot de passe.

Créer un Website pour le domaine local → récupérer le `Website ID` (UUID).

Aller dans le menu Websites → ⋯ → **Share URL** → activer → récupérer le token (segment juste après `/share/` dans l'URL).

Tuer le proxy temporaire :
```powershell
docker stop umami-tmp
```

- [ ] **Step 10.3 : Configurer les vars et redémarrer le frontend**

Recréer le frontend avec les IDs :
```powershell
docker compose down frontend
$env:UMAMI_WEBSITE_ID="<UUID-recupere>"
$env:UMAMI_SHARE_TOKEN="<token-recupere>"
docker compose up -d frontend
```

(Ou plus durable : ajouter `UMAMI_WEBSITE_ID` et `UMAMI_SHARE_TOKEN` dans `environment:` du service `frontend` de `docker-compose.yml` — mais pour la validation locale, le passage par env de session suffit.)

- [ ] **Step 10.4 : Vérifier que les events partent**

Ouvrir `http://localhost:4200/` dans le navigateur, devtools Network actif.

Filtrer sur `umami` → vérifier :
- `GET /env.js` → 200, content `window.__UMAMI__={"websiteId":"...","shareToken":"..."};`
- `GET /umami.js` → 200, du JS minifié
- `POST /umami/api/send` → 200, déclenché au pageview

Naviguer sur 3-4 pages publiques (`/`, `/mobilier`, `/expositions`, `/studio`).

- [ ] **Step 10.5 : Vérifier le dashboard dans l'admin**

Aller sur `http://localhost:4200/login`, se connecter (admin / mot de passe du portfolio).

Aller sur `http://localhost:4200/admin`, cliquer sur l'onglet **Analytics**.

Expected : l'iframe affiche le dashboard Umami avec :
- les 4-5 pageviews qu'on vient de générer,
- la carte du monde (vide ou France selon notre IP),
- les top pages,
- un graphique temporel.

- [ ] **Step 10.6 : Vérifier l'absence de violation CSP**

Devtools Console : pas de message rouge mentionnant `Content Security Policy` ou `Refused to load`.

- [ ] **Step 10.7 : Vérifier que /admin n'est pas tracé**

Dans le dashboard Umami → Pages : vérifier qu'aucune entrée `/admin` n'apparaît. Si présente, configurer un filtre d'exclusion dans Umami : Settings → Filters → ajouter `/admin*` en `URL contains` à exclure.

- [ ] **Step 10.8 : Vérifier Do Not Track**

Activer DNT dans le navigateur (Firefox : Préférences → Vie privée → toujours envoyer DNT).

Recharger une page, vérifier dans Network qu'aucun `POST /umami/api/send` n'est envoyé. (Umami respecte DNT par défaut.)

- [ ] **Step 10.9 : Arrêter la stack**

Run :
```powershell
docker compose down
```

- [ ] **Step 10.10 : Si tout est OK, push de la branche**

Run :
```powershell
git push -u origin worktree-tracabilite-acces-umami
```

Expected : la branche est créée sur le remote, prête pour une PR.

---

## Self-Review — checklist

Après écriture du plan, vérifier :

- [x] **Spec coverage** : chaque section du spec est couverte
  - Section 2.1 (Umami self-hosted) → Tasks 1, 2, 9
  - Section 2.2 (iframe dans admin) → Task 7
  - Section 2.3 (topologie réseau) → Task 4
  - Section 2.4 (RGPD) → Task 9 + 10.6/10.7/10.8
  - Section 3.1 (service umami) → Tasks 1, 2
  - Section 3.2 (injection IDs) → Tasks 3, 4, 5, 6
  - Section 3.3 (locations Nginx) → Task 4
  - Section 3.4 (tab Analytics) → Task 7
  - Section 3.5 (variables d'env) → Tasks 1, 2, 3
  - Section 4 (flux de données) → Task 10 (validation manuelle)
  - Section 5.1/5.2 (déploiement local/Railway) → Tasks 1, 2
  - Section 5.3 (CI) → Task 8
  - Section 5.4 (config initiale Umami) → Task 10.2
  - Section 5.5 (ADR-0012) → Task 9
  - Section 6.2 (tests frontend) → Task 7

- [x] **Placeholder scan** : aucune occurrence de "TBD", "TODO", "implement later", "add appropriate", "similar to Task N", "write tests for the above"

- [x] **Type consistency** :
  - `Tab` étendu uniformément (`'analytics'` ajouté partout)
  - `UMAMI_WEBSITE_ID` / `UMAMI_SHARE_TOKEN` : noms identiques dans Dockerfile, nginx.conf, .env, et runtime JS
  - `window.__UMAMI__` : structure `{ websiteId, shareToken }` identique entre /env.js, main.ts, admin.component.ts
  - `umamiConfigured()` / `umamiIframeUrl()` : signatures et noms cohérents entre l'implémentation et les tests
