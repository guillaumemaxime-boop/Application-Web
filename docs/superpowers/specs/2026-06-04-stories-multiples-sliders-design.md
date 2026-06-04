# Stories multiples par owner + sliders d'actualités

Date : 2026-06-04
Statut : Validé (en attente de plan d'implémentation)

## Contexte

Aujourd'hui, chaque mobilier et chaque exposition ne peut avoir qu'**une seule story** : la table `story_slide` contient directement la séquence de slides indexée par `(owner_kind, owner_id, position)`, sans entité intermédiaire. Côté public, le `story-viewer` ouvre cette séquence unique lorsque l'utilisateur clique sur une catégorie ou une expo dans la rangée stories de la home.

Objectif : permettre **plusieurs stories par mobilier/exposition** (par exemple « Making-of », « Installation », « Interview »), et exposer ces stories au sein de **sliders d'actualités** créés et administrés depuis la console, et placés sur des emplacements définis du site public.

## Décisions structurantes

| Axe | Décision |
|---|---|
| Nombre de sliders | **Plusieurs sliders nommés**, chacun assigné à une zone |
| Modèle story | **Entité propre** avec titre, cover, slides, owner **obligatoire** |
| Composition slider | **Sélection explicite + drag & drop** (zéro auto, contrôle total éditorial) |
| Placement v1 | **3 zones prédéfinies sur la home** : `home-top`, `home-middle`, `home-bottom`. Extension trivial à d'autres pages plus tard. |
| Format visuel public | **Carousel de cards** (aspect 4:5, 3 visibles desktop / 1.5 mobile, scroll horizontal natif) |
| Admin stories | Édition **intégrée à la fiche owner** (mobilier ou expo) — extension de l'éditeur de slides existant |
| Admin sliders | **Nouvel onglet `/admin/sliders`** (nav SITE) |
| Migration data | **Auto-wrap** des slides existantes dans une « Story principale » par owner, titre = nom du owner, cover = `coverImage` du owner |
| API legacy | **Clean break** : retrait de `GET\|PUT /api/admin/slides/{kind}/{ownerId}` |

## Périmètre

**Inclus :**

- Nouveau modèle relationnel : entités `Story`, `NewsSlider`, `NewsSliderStory` + refactor de `StorySlide`.
- 4 changesets Liquibase ordonnés (création table story, seed des stories par défaut, refactor `story_slide`, création tables slider).
- Nouveaux endpoints REST publics (`/api/stories`, `/api/sliders`) et admin (`/api/admin/stories`, `/api/admin/sliders`).
- Adaptation des services Spring (`StoryService` refactoré, nouveau `NewsSliderService`).
- Nouveau composant Angular `<app-news-slider>` (carousel de cards).
- Adaptation de `HomeComponent` pour injecter les 3 zones.
- Adaptation mineure de `StoryViewerComponent` (queue alimentée par stories au lieu d'owners pour la rangée catégories).
- Refactor des pages admin `/admin/mobilier/:slug` et `/admin/expositions/:slug` pour lister/créer/supprimer/réordonner les N stories d'un owner.
- Nouvelle page admin `/admin/sliders` avec composition drag & drop.
- Tests unitaires (backend + frontend), test d'intégration backend sur la migration, mise à jour des fixtures Playwright + regen de la baseline `home.png`.

**Exclus (v1) :**

- Autres zones que la home (studio, contact, expositions). Pattern extensible mais hors-scope v1.
- Sliders sur la page détail mobilier/expo (les stories restent accessibles via leur fiche).
- Auto-composition (top N stories par date, tag-based, etc.) — composition 100 % manuelle.
- Flag « brouillon / publié » par story — toutes les stories sont publiques dès création.
- Programmation temporelle d'apparition d'un slider (`publishAt`, `expireAt`) — sortie immédiate.
- Multilingue / variantes de stories par langue.
- Statistiques de vues par story.

## Architecture

### Modèle relationnel

```
┌─────────────┐ 1     N ┌─────────────────┐ 1     N ┌──────────────┐
│  furniture  │────────►│      story      │────────►│  story_slide │
└─────────────┘         │                 │         │  (refactoré) │
┌─────────────┐ 1     N │  - id           │         └──────────────┘
│ exhibition  │────────►│  - owner_kind   │
└─────────────┘         │  - owner_id     │
                        │  - title        │
                        │  - cover_image  │
                        │  - slug (uniq)  │
                        │  - position     │
                        │  - created_at   │
                        └─────────────────┘
                                ▲
                                │ N
                        ┌───────┴─────────┐
                        │  slider_story   │
                        │  - slider_id    │
                        │  - story_id     │
                        │  - position     │
                        │  PK(slider,story)│
                        └───────┬─────────┘
                                │ N
                        ┌───────▼─────────┐
                        │  news_slider    │
                        │  - id           │
                        │  - slug (uniq)  │
                        │  - title        │
                        │  - zone_key     │ UNIQUE WHERE NOT NULL
                        │  - created_at   │
                        └─────────────────┘
```

### Détail des tables

| Table | Action | Colonnes clés |
|---|---|---|
| `story` | **CRÉE** | `id varchar(50) PK`, `owner_kind varchar(20)`, `owner_id varchar(50)`, `title varchar(200)`, `cover_image varchar(500)`, `slug varchar(200) UNIQUE`, `position int`, `created_at timestamp`. Index `(owner_kind, owner_id, position)`. |
| `story_slide` | **REFACTOR** | Drop `owner_kind` + `owner_id`. Add `story_id varchar(50) NOT NULL FK story(id) ON DELETE CASCADE`. Index `(story_id, position)`. |
| `news_slider` | **CRÉE** | `id varchar(50) PK`, `slug varchar(100) UNIQUE`, `title varchar(200)`, `zone_key varchar(50) NULL`, `created_at timestamp`. UNIQUE partiel sur `zone_key` (1 slider max par zone). |
| `slider_story` | **CRÉE** | `slider_id varchar(50) FK news_slider(id) ON DELETE CASCADE`, `story_id varchar(50) FK story(id) ON DELETE CASCADE`, `position int`. PK `(slider_id, story_id)`. Index `(slider_id, position)`. |
| `home_feed` | **INCHANGÉ** | Grille de cards owner — sans rapport avec les sliders de stories. |

### Migration Liquibase (ordre strict)

1. **`022-create-story.yaml`** — crée la table `story` vide.
2. **`023-seed-default-stories.yaml`** — script SQL qui, pour chaque `(owner_kind, owner_id)` distinct dans `story_slide`, insère 1 story :
   - `id = 'st-' || md5(owner_kind || ':' || owner_id) suffix court`
   - `title = (SELECT title FROM furniture/exhibition WHERE slug = owner_id)` (jointure dynamique selon `owner_kind`)
   - `cover_image = (SELECT cover_image FROM …)`
   - `slug = owner_id || '-principale'`
   - `position = 0`
   - `created_at = NOW()`
3. **`024-add-story-id-to-story-slide.yaml`** — séquence atomique :
   1. `ADD COLUMN story_id varchar(50) NULL`
   2. `UPDATE story_slide ss SET story_id = (SELECT id FROM story WHERE story.owner_kind = ss.owner_kind AND story.owner_id = ss.owner_id)`
   3. `ALTER COLUMN story_id NOT NULL`
   4. `ADD FK story_id → story(id) ON DELETE CASCADE`
   5. `DROP COLUMN owner_kind, owner_id`
   6. `DROP INDEX idx_story_slide_owner_pos`, `CREATE INDEX idx_story_slide_story_pos (story_id, position)`
4. **`025-create-news-slider.yaml`** — crée `news_slider` + `slider_story` + contrainte UNIQUE partielle sur `news_slider.zone_key`.

Pas de rollback explicite ; en cas de problème en prod, restaurer depuis snapshot.

### Entités JPA (backend)

| Entité | Statut | Notes |
|---|---|---|
| `StoryEntity` | **Nouvelle** | `@Entity @Table(name="story")`, champs id/ownerKind/ownerId/title/coverImage/slug/position/createdAt + `@OneToMany(mappedBy="story", cascade=ALL, orphanRemoval=true) List<StorySlideEntity> slides` |
| `StorySlideEntity` | **Refactor** | Drop `ownerKind`/`ownerId`. Add `@ManyToOne @JoinColumn(name="story_id") StoryEntity story`. Le reste (type, src, caption, quote, link, specs) inchangé. |
| `NewsSliderEntity` | **Nouvelle** | `id`, `slug`, `title`, `zoneKey` (enum `SliderZone` mappé en `STRING`), `createdAt`, `@OneToMany List<NewsSliderStoryEntity> stories` |
| `NewsSliderStoryEntity` | **Nouvelle** | Composite key `(sliderId, storyId)`, `position`, `@ManyToOne StoryEntity story` |

Enum :

```java
public enum SliderZone {
    HOME_TOP("home-top"),
    HOME_MIDDLE("home-middle"),
    HOME_BOTTOM("home-bottom");

    private final String key;
    SliderZone(String key) { this.key = key; }
    public String getKey() { return key; }
    public static SliderZone fromKey(String key) { /* …throws on unknown */ }
}
```

### API REST

**Endpoints publics :**

| Méthode | URL | Réponse |
|---|---|---|
| `GET` | `/api/stories?ownerKind=&ownerId=` | `Story[]` triées par `position` |
| `GET` | `/api/stories/{slug}` | `StoryWithSlides` (story + slides ordonnées) |
| `GET` | `/api/sliders` | `NewsSliderView[]` (chaque slider avec ses stories enrichies, slug+title+coverImage+ownerLabel) |

`ownerLabel` est calculé côté backend : `furniture.title` ou `exhibition.title + " · " + exhibition.venue` selon `owner_kind`.

**Endpoints admin (JWT) :**

| Méthode | URL | Body / effet |
|---|---|---|
| `GET` | `/api/admin/stories?ownerKind=&ownerId=` | `Story[]` complètes (équivalent public mais peut différer si futures restrictions) |
| `POST` | `/api/admin/stories` | `{ownerKind, ownerId, title, coverImage}` → crée story avec `position = max+1`, slug auto |
| `PUT` | `/api/admin/stories/{id}` | `{title, coverImage, position}` |
| `DELETE` | `/api/admin/stories/{id}` | Supprime story + slides + entrées sliders (CASCADE) |
| `PUT` | `/api/admin/stories/{id}/slides` | `Slide[]` → remplace toutes les slides (réutilise la logique existante `replaceSlides`) |
| `GET` | `/api/admin/sliders` | `NewsSlider[]` avec composition |
| `POST` | `/api/admin/sliders` | `{title, zoneKey?}` → crée slider |
| `PUT` | `/api/admin/sliders/{id}` | `{title, zoneKey?}` |
| `DELETE` | `/api/admin/sliders/{id}` | Supprime slider + entrées CASCADE |
| `PUT` | `/api/admin/sliders/{id}/stories` | `{storyIds: string[]}` → replace la composition dans l'ordre fourni |

**Endpoints supprimés (clean break) :**

- `GET /api/admin/slides/{kind}/{ownerId}` → utiliser `GET /api/admin/stories?ownerKind=&ownerId=` puis `GET /api/admin/stories/{id}/slides` (ou via le payload `getStory`)
- `PUT /api/admin/slides/{kind}/{ownerId}` → utiliser `PUT /api/admin/stories/{id}/slides`

### Validation & cas limites

- `zoneKey` : enum strict côté server, rejet 400 si valeur hors-liste. NULL accepté (= slider non publié).
- `slug` story : auto-généré au create comme `<owner.slug>-<seq>` avec dédoublonnage si collision (`-2`, `-3`…). Unicité globale.
- **1 slider max par zone** : contrainte UNIQUE partielle (`WHERE zone_key IS NOT NULL`). Tentative d'assigner un slider à une zone déjà occupée → 409 Conflict + UI propose de désassigner l'occupant.
- Suppression d'un owner (furniture/exhibition) : pas de CASCADE depuis owner → story. Le code applicatif (FurnitureService.delete) doit appeler `storyService.deleteAllForOwner(kind, ownerId)` avant suppression. À couvrir par un test d'intégration.
- Cover obligatoire sur une story : `cover_image NOT NULL`, validation côté admin (champ requis dans le form).

### Frontend public

**Nouveau composant `<app-news-slider>`** :

```
frontend/src/app/components/news-slider/
├── news-slider.component.ts     # carousel B (cards 4:5, scroll horizontal natif, snap CSS)
└── news-slider.component.spec.ts
```

`@Input() slider: NewsSliderView` — title + array de stories enrichies (`{id, slug, title, coverImage, ownerKind, ownerSlug, ownerLabel}`).

`@Output() storyOpen = new EventEmitter<NewsSliderStory>()` — le parent (`HomeComponent`) ouvre le viewer.

Markup : section `<section class="news-slider">` avec `<header>` (eyebrow "ACTUALITÉS" + title) puis `<div class="track">` scrollable contenant des `<button class="card">` (button car ouvre une modale, pas une nav). Format card identique à `.feed .card` de la home (aspect-ratio 4:5, eyebrow + titre serif). Snap CSS, 3 cards desktop / 1.5 mobile, no JS de défilement (scroll natif).

A11y : `<button>` natif, focus-visible géré par les CSS RGAA globaux. `aria-label` sur chaque card incluant titre story + owner.

**Adaptation `HomeComponent`** :

`ngOnInit` :
```ts
forkJoin({
  home: this.portfolio.getHome(),
  content: this.portfolio.getContent(),
  sliders: this.portfolio.getPublicSliders(),
}).subscribe({
  next: ({ home, content, sliders }) => {
    this.data.set(home);
    this.content.set(content);
    this.sliders.set(this.indexByZone(sliders));
    this.loadingSvc.stop('page');
    this.loadingSvc.stop('nav');
  },
  ...
});
```

Template — 3 emplacements fixes :

```html
<section class="hero">…</section>

@if (sliders()['home-top']; as s) {
  <app-news-slider [slider]="s" (storyOpen)="openStory($event)" />
}

<section class="stories">…</section>

@if (sliders()['home-middle']; as s) {
  <app-news-slider [slider]="s" (storyOpen)="openStory($event)" />
}

<section class="feed">…</section>

@if (sliders()['home-bottom']; as s) {
  <app-news-slider [slider]="s" (storyOpen)="openStory($event)" />
}
```

Si aucun slider n'est assigné à une zone, rien ne s'affiche (pas de placeholder vide).

**Adaptation `StoryViewerComponent`** :

L'API du viewer ne change pas (`queue: StoryItem[]`). Adaptation côté alimentation :

- Click sur card d'un slider (`HomeComponent.openStory(story)`) → fait un `GET /api/stories/{slug}` pour récupérer les slides, puis pousse `queue = [storyItem]`.
- Click sur la rangée catégories existante (`openCategory(cat)`) → pour chaque owner de la catégorie, fait `GET /api/stories?ownerKind=furniture&ownerId=<slug>` et prend la **première story** (`stories[0]`) — typiquement la « Story principale » auto-créée par migration. Queue de toutes ces stories.
- Click sur la rangée expos (`openExhibition(exh)`) → équivalent, première story de l'expo.

Tableau de fallback : si un owner n'a aucune story (cas rare post-suppression manuelle), il est filtré silencieusement de la queue.

**Service frontend** :

`portfolio.service.ts` ajoute :

```ts
getStories(ownerKind, ownerId): Observable<Story[]>
getStory(slug): Observable<StoryWithSlides>
getPublicSliders(): Observable<NewsSliderView[]>

// Admin
getAdminStories(ownerKind, ownerId): Observable<Story[]>
createStory(input): Observable<Story>
updateStory(id, input): Observable<Story>
deleteStory(id): Observable<void>
replaceStorySlides(storyId, slides): Observable<Slide[]>
getAdminSliders(): Observable<NewsSliderAdminView[]>
createSlider(input): Observable<NewsSlider>
updateSlider(id, input): Observable<NewsSlider>
deleteSlider(id): Observable<void>
replaceSliderStories(sliderId, storyIds): Observable<NewsSliderAdminView>
```

Anciennes méthodes `getSlides(kind, ownerId)` et `replaceSlides(kind, ownerId, slides)` **supprimées**.

Nouveaux modèles TS : `Story`, `StoryWithSlides`, `NewsSlider`, `NewsSliderView`, `NewsSliderAdminView`, enum/type `SliderZone = 'home-top' | 'home-middle' | 'home-bottom'`.

### Frontend admin

**Refactor `/admin/mobilier/:slug` et `/admin/expositions/:slug`** :

L'éditeur de slides existant (intégré à la fiche) devient un **bloc « Stories » listant les N stories** :

```
┌──── Stories ────────────────────────────────────┐
│ [+ Nouvelle story]                              │
│                                                 │
│ 📖 Story principale                             │
│    Cover [thumb]                                │
│    [↑↓] [Éditer slides] [Renommer] [Supprimer]  │
│                                                 │
│ 📖 Making-of                                    │
│    [↑↓] [Éditer slides] [Renommer] [Supprimer]  │
│                                                 │
│ 📖 Installation                                 │
│    [↑↓] [Éditer slides] [Renommer] [Supprimer]  │
└─────────────────────────────────────────────────┘
```

« Éditer slides » ouvre l'**éditeur slides existant** (`slides-editor` ou équivalent) en mode édition pour cette story (paramétré par `storyId` au lieu de `(kind, ownerId)`). Le reste de l'UI slides (image picker, types image/video/spec/quote/link, drag/drop slides) reste intact.

« Nouvelle story » ouvre un mini-form (title + coverImage avec image-field). La story est créée vide ; on peut éditer ses slides ensuite.

« Renommer » ouvre le même mini-form en édition.

« Supprimer » avec confirmation (slides perdues, retire des sliders qui la référencent).

Réorganisation (`↑↓` boutons) via PUT `position` côté backend (atomique, échange de positions). Pattern identique aux slides existantes.

**Nouvelle page `/admin/sliders`** (entrée « Sliders » dans nav SITE) :

```
┌── Zones disponibles ──────────────────────────────────┐
│ • home-top      → [aucun slider · Choisir ▾]          │
│ • home-middle   → "Coups de cœur" (3 stories) [Éditer]│
│ • home-bottom   → "Actualités récentes" (5)   [Éditer]│
└───────────────────────────────────────────────────────┘

┌── Tous les sliders ────────────────────────────────────┐
│ [+ Nouveau slider]                                    │
│                                                       │
│ 📊 "Actualités récentes" → zone home-bottom           │
│    Stories : Tabouret Aurore · Making-of  →           │
│              Lumen · Installation  → +3 autres        │
│    [Composition] [Renommer] [Changer zone] [Suppr.]   │
│                                                       │
│ 📊 "Coups de cœur" → zone home-middle                 │
│    …                                                  │
└───────────────────────────────────────────────────────┘
```

**Éditeur « Composition »** (modal ou route nested) :

```
┌── Composition du slider "Actualités récentes" ────────┐
│                                                       │
│ Stories disponibles            Composition du slider  │
│ [recherche...]                                        │
│                                                       │
│ ☐ Tabouret Aurore · Making-of  ▣ Lumen · Installation │
│ ☐ Tabouret Aurore · Story princ  ▣ Tabouret Aurore… │
│ ☐ Table Lumen · Story principale                      │
│ ☐ Lumen · Story principale                            │
│ ...                                                   │
│                                                       │
│            [→ Ajouter sélection]    [← Retirer]       │
│                                                       │
│  (les items à droite sont drag & drop pour l'ordre)   │
└───────────────────────────────────────────────────────┘
            [Annuler]  [Enregistrer]
```

Réutilise le pattern du sélecteur de cards de `/admin/accueil` (`home_feed`).

### Tests

**Backend** :
- `StoryServiceTest` (refactor) : CRUD stories, listing par owner, suppression cascade.
- `NewsSliderServiceTest` (nouveau) : CRUD slider, composition, contrainte UNIQUE par zone.
- `AdminStoriesControllerTest` (refactor) : nouveaux endpoints.
- `AdminSlidersControllerTest` (nouveau).
- Test d'intégration de migration : seed → exécuter changelog → vérifier qu'une story est créée par owner avec ses slides correctement rattachées.

**Frontend unit** :
- `NewsSliderComponent` (nouveau) : rendu cards, scroll, émission `storyOpen`.
- `HomeComponent` (adaptation) : `forkJoin` étendu, indexation `sliders()` par zone.
- `StoryViewerComponent` (adaptation mineure) : queue alimentée par stories.
- Admin : forms create/edit story, composition slider.

**Frontend visuel (Playwright)** :
- Étendre `frontend/e2e/fixtures/` avec `sliders.json` (1-2 sliders peuplés).
- Étendre `frontend/e2e/helpers/stub-api.ts` STUBS avec `**/api/sliders`.
- Régénérer `home.spec.ts` baselines (la home a maintenant des sliders en plus). Inspecter visuellement avant commit.

## Risques et points d'attention

- **Migration data complexe** : changeset 023 requiert une jointure SQL portable entre `story_slide` et `furniture`/`exhibition` (le owner_kind discrimine la table à joindre). À tester sur H2 (test) ET sur Postgres (staging) — les deux dialectes diffèrent sur `CASE` et sous-requêtes.
- **Refactor `story_slide` non-trivial** : la suppression des colonnes `owner_kind`/`owner_id` est destructive. Snapshot Postgres staging avant déploiement.
- **Story sans slides** : possible après création. UI doit afficher un état vide, le carousel public peut afficher la story (mais clic = viewer vide → faut soit filtrer, soit afficher message « story en cours »). **Décision : filtrer côté API publique** — `getPublicSliders()` n'inclut que les stories ayant au moins une slide.
- **Contrainte UNIQUE partielle** : la syntaxe `UNIQUE (zone_key) WHERE zone_key IS NOT NULL` est supportée Postgres mais pas H2 par défaut. **Décision : validation applicative dans `NewsSliderService.assignToZone()`** (vérifie qu'aucun autre slider n'occupe la zone avant le save, jette 409 sinon). Pas d'index UNIQUE en base. Plus simple, portable H2/Postgres, et la fenêtre de race condition est négligeable (1 seul admin éditeur).
- **Régénération massive baselines visuelles** : la home change visuellement (3 zones potentielles). À la première regen, valider que les sliders s'affichent au bon endroit.

## Évolutions possibles (hors v1)

- Zones additionnelles (studio, contact, expositions, fiche détail mobilier/expo).
- Story sans owner (« actu atelier libre »).
- Flag « brouillon / publié » par story, programmation temporelle.
- Auto-composition (top N par date / tag).
- Statistiques de vues par story.
- Multilingue.
- Format slider alternatif (hero rotatif option C) configurable par slider.
