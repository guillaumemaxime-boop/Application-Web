# Refonte de la home en stories Instagram-like

**Date** : 2026-05-12
**Statut** : Design validé, prêt pour plan d'implémentation
**Auteur** : Maxime Guillaume (avec Claude)
**Prototype** : `docs/prototypes/home/index.html`

## 1. Contexte & motivation

Le portfolio Atelier Lumen présente actuellement le mobilier et les expositions à travers trois pages distinctes : home (avec sections featured), liste mobilier, liste expositions. Le ton est éditorial — galerie d'art, typographie serif, beaucoup d'espace.

L'objectif de cette refonte est d'emprunter à Instagram **son mode de découverte par stories** : permettre au visiteur de feuilleter rapidement les pièces et les expositions, slide après slide, avec une expérience plein écran immersive. Sans transformer le site en réseau social (pas de likes, commentaires, follows) et sans casser l'identité éditoriale (typographie, palette, espacement conservés).

Le contenu vivant (coulisses d'atelier, processus) est servi par des slides intégrées à chaque pièce/expo plutôt que par un feed séparé.

## 2. Décisions structurantes

### 2.1 Architecture des routes

| Route | Statut |
|---|---|
| `/` | **Refondue** — devient l'entrée principale (hero épuré + stories sticky + masonry éditorial mixte) |
| `/mobilier` | **Supprimée** — la home remplace la page liste |
| `/mobilier/{slug}` | **Conservée** — fiche détail accessible depuis la dernière slide de la story et via URL directe (SEO, partage, presse) |
| `/expositions` | **Supprimée** |
| `/expositions/{slug}` | **Conservée** |
| `/studio` | Inchangée |
| `/login`, `/admin` | Inchangées |

### 2.2 Navigation

Nav header simplifiée à `Accueil · Studio`. Les liens `Mobilier` et `Expositions` disparaissent (les listes correspondantes n'existent plus). L'accès aux pièces et expos se fait par la home.

### 2.3 Layout de la home

Trois zones verticales :

1. **Hero épuré** (~50vh) — titre serif court. Pas de bouton CTA.
2. **Bandeau Stories** — `position: sticky` sous le header une fois le hero passé. Box-shadow douce qui apparaît à l'état "stuck" pour décoller du contenu.
3. **Grid masonry mixte** — 3 colonnes desktop, 2 tablette, 1 mobile. Tous les items du `home_feed` mélangés dans **un ordre éditorial figé** contrôlé par l'admin.

### 2.4 Modèle de stories

Le bandeau combine deux types de ronds, séparés par un caractère `·` neutre :

**Ronds de catégorie de mobilier** (`Tables`, `Sièges`, `Consoles`) :
- Anneau encre simple 1px.
- Au clic : le viewer enchaîne automatiquement les stories de toutes les pièces de la catégorie, puis passe à la catégorie suivante du bandeau. L'ordre des pièces à l'intérieur d'une catégorie est **alphabétique en dur** pour cette itération (pas de contrôle admin — voir Hors scope §9).

**Ronds d'exposition** (`Lumen`, `Sève`, ...) :
- Anneau encre double (`box-shadow: inset` pour le visuel "anneau dans anneau").
- Au clic : joue la story de l'expo, puis passe au rond suivant du bandeau.

**Cartes du masonry** — chaque carte est une pièce ou une expo individuelle. Au clic, le viewer joue **uniquement la story de cet item**, puis se ferme à la fin. Les expos portent un badge `Exposition` discret en haut à gauche pour les distinguer des pièces.

### 2.5 Types de slides

Cinq types, sealed dans le modèle Java :

| Type | Fond | Contenu |
|---|---|---|
| `cover` | Noir, image plein cadre | Image cover + titre via header overlay (titre serif blanc + sous-titre `Catégorie · Année` ou `Lieu · Période`) |
| `image` | Noir, image plein cadre | Image + légende serif blanc en bas |
| `spec` | Crème, header bascule en noir | Bloc `<dl>` `Dimensions / Matériau / Édition / ...` |
| `quote` | Crème | Citation serif centrée + signature presse en small-caps |
| `link` | Crème | Titre + description + bouton `Voir la fiche complète →` vers `/mobilier/{slug}` ou `/expositions/{slug}` |

Convention : chaque item doit comporter une slide `link` en dernière position pour offrir l'accès à la fiche détail. L'admin peut la supprimer (warning non bloquant à l'enregistrement, idem `cover`) ; dans ce cas la story se ferme sans passerelle vers la fiche.

### 2.6 Story Viewer

Modale plein écran, fond `rgba(10,10,10,0.96)`, contenu cadré 440px de large max et 94vh max de haut — y compris sur desktop, on assume le format mobile-portrait comme code Instagram.

**Anatomie :**
- Progress bars fines (2px) en haut, une par slide de l'item courant, animation linéaire `width 0→100%` sur 5000ms.
- Header (28px du haut) : avatar `L` rond, titre de l'item, sous-titre contextuel, croix de fermeture. La couleur du header bascule en ink quand la slide a un fond crème (spec / quote / link).
- Tap zones invisibles : tiers gauche = `prev`, deux tiers droits = `next`.
- Caption ou contenu typé selon le type de slide.

**Interactions :**
- Tap droit / flèche `→` / fin du timer → slide suivante. Tap gauche / flèche `←` → précédente.
- **Hold (mousedown > 180ms)** → pause de l'animation et du timer. Relâche → reprend depuis le point de pause exact (calcul `pausedAt` / `remaining`).
- `Esc` ou clic sur le backdrop → ferme.
- À la fin du dernier slide d'un item : passe à l'item suivant de la **queue** si elle existe, sinon ferme.

**Modèle de queue :**
- Depuis une carte masonry → queue = `[item]` (1 item, ferme à la fin).
- Depuis un rond d'expo → queue = `[expo]` (1 item, ferme à la fin).
- Depuis un rond de catégorie → queue = `[toutes les pièces de la catégorie]` (N items, ferme après le dernier).

## 3. Data model

### 3.1 Schéma DB (4 nouvelles tables Liquibase)

**`story_slide`** — slides d'une pièce ou d'une expo.

| Colonne | Type | Notes |
|---|---|---|
| `id` | varchar(50) PK | id court généré côté service |
| `owner_kind` | varchar(20) NOT NULL | `furniture` ou `exhibition` |
| `owner_id` | varchar(50) NOT NULL | référence logique vers `furniture.id` ou `exhibition.id` |
| `position` | int NOT NULL | ordre dans la story (0-indexé) |
| `type` | varchar(20) NOT NULL | discriminant : `cover` / `image` / `spec` / `quote` / `link` |
| `src` | varchar(500) NULL | image (cover/image) |
| `caption` | varchar(500) NULL | légende (image uniquement) |
| `quote_body` | varchar(2000) NULL | citation |
| `quote_cite` | varchar(500) NULL | source citation |
| `link_label` | varchar(200) NULL | label CTA (null = défaut `Voir la fiche complète`) |
| `link_desc` | varchar(500) NULL | description sous le titre |
| `link_href` | varchar(500) NULL | URL cible (null = calculée `/{owner_kind}/{slug}`) |

Index : `(owner_kind, owner_id, position)`.

Pas de FK stricte vers `furniture` ou `exhibition` à cause des deux propriétaires possibles. Le cleanup au delete d'un Furniture ou d'une Exhibition est géré applicativement (hook `@PreRemove` ou cascade explicite en service).

**`story_slide_spec`** — entrées d'une slide de type `spec`.

| Colonne | Type | Notes |
|---|---|---|
| `story_slide_id` | varchar(50) NOT NULL FK → `story_slide(id)` ON DELETE CASCADE |
| `position` | int NOT NULL |
| `label` | varchar(100) NOT NULL | ex: "Dimensions" |
| `entry_value` | varchar(200) NOT NULL | ex: "180 × 45 × 80 cm" |

PK composite `(story_slide_id, position)`. Pattern identique à `furniture_dimension` existant.

**`home_feed`** — ordre éditorial figé du masonry.

| Colonne | Type | Notes |
|---|---|---|
| `position` | int PK | 0-indexé, séquentiel |
| `kind` | varchar(20) NOT NULL | `furniture` ou `exhibition` |
| `ref_slug` | varchar(200) NOT NULL | slug de la pièce ou de l'expo |

Quand l'admin réordonne : `DELETE FROM home_feed; INSERT ...` en transaction unique.

**`furniture_category_meta`** — métadonnées de présentation pour le bandeau.

| Colonne | Type | Notes |
|---|---|---|
| `category` | varchar(100) PK | doit matcher `furniture.category` |
| `cover_image` | varchar(500) NOT NULL | image affichée dans le rond |
| `position` | int NOT NULL | ordre du rond dans le bandeau |
| `visible` | boolean NOT NULL DEFAULT true | permet de masquer une catégorie sans la supprimer |

Pas de migration de `furniture.category` vers une FK : cette table est purement décorative, son absence laisse la fiche détail accessible.

### 3.2 Modèle Java — `Slide` sealed interface

Java 25 supporte les sealed types. Polymorphisme Jackson via `@JsonTypeInfo` + `@JsonSubTypes`.

```java
@JsonTypeInfo(use = Id.NAME, property = "type")
@JsonSubTypes({
  @Type(value = CoverSlide.class, name = "cover"),
  @Type(value = ImageSlide.class, name = "image"),
  @Type(value = SpecSlide.class, name = "spec"),
  @Type(value = QuoteSlide.class, name = "quote"),
  @Type(value = LinkSlide.class, name = "link")
})
public sealed interface Slide permits CoverSlide, ImageSlide, SpecSlide, QuoteSlide, LinkSlide {
  String id();
  int position();
}

public record CoverSlide(String id, int position, String src) implements Slide {}
public record ImageSlide(String id, int position, String src, String caption) implements Slide {}
public record SpecSlide(String id, int position, List<SpecEntry> specs) implements Slide {}
public record QuoteSlide(String id, int position, String body, String cite) implements Slide {}
public record LinkSlide(String id, int position, String label, String description, String href) implements Slide {}

public record SpecEntry(String label, String value) {}
```

Une **seule entité JPA** `StorySlideEntity` regroupe tous les champs nullable et le discriminant `type`. La conversion entité → record sealed se fait dans le service via un `switch` exhaustif (pattern matching Java 25).

### 3.3 Modèle TypeScript (frontend)

```typescript
// frontend/src/app/models/slide.model.ts
export type Slide = CoverSlide | ImageSlide | SpecSlide | QuoteSlide | LinkSlide;

export interface CoverSlide { type: 'cover'; id: string; position: number; src: string; }
export interface ImageSlide { type: 'image'; id: string; position: number; src: string; caption: string; }
export interface SpecSlide  { type: 'spec';  id: string; position: number; specs: SpecEntry[]; }
export interface QuoteSlide { type: 'quote'; id: string; position: number; body: string; cite: string; }
export interface LinkSlide  { type: 'link';  id: string; position: number; label: string | null; description: string | null; href: string | null; }

export interface SpecEntry { label: string; value: string; }
```

Les modèles `Furniture` et `Exhibition` existants gagnent un champ `slides: Slide[]`.

## 4. API

### 4.1 Endpoints publics

**Enrichissement des endpoints existants** (rétrocompatible) :

- `GET /api/furniture/{slug}` retourne désormais le champ `slides` peuplé.
- `GET /api/exhibitions/{slug}` retourne désormais le champ `slides` peuplé.

Ces endpoints ne sont appelés que quand l'utilisateur ouvre une story (lazy load) — la home ne les déclenche pas au chargement initial.

**Nouvel endpoint agrégé `GET /api/home`** — un seul round-trip pour charger la home :

```json
{
  "categories": [
    { "category": "Tables", "slug": "tables", "cover": "/uploads/tables.jpg",
      "itemSlugs": ["table-seve", "table-origine"] },
    { "category": "Sièges",   "slug": "sieges",   "cover": "...", "itemSlugs": [...] },
    { "category": "Consoles", "slug": "consoles", "cover": "...", "itemSlugs": [...] }
  ],
  "exhibitions": [
    { "title": "Lumen", "slug": "lumen", "cover": "...",
      "venue": "Pavillon des Arts", "period": "mai → juin 2026" },
    ...
  ],
  "feed": [
    { "kind": "furniture", "slug": "console-lumiere",
      "title": "Console Lumière", "category": "Consoles", "year": 2026, "cover": "..." },
    { "kind": "exhibition", "slug": "lumen",
      "title": "Lumen", "venue": "Pavillon des Arts", "period": "mai → juin 2026", "cover": "..." },
    ...
  ]
}
```

Les `feed[]` n'incluent **pas** les slides — juste le minimum pour afficher la carte du masonry. Les slides sont chargées au clic.

`slug` côté `categories[]` est dérivé du label (slugification).

### 4.2 Endpoints admin (protégés)

Tous sous `/api/admin/*`, protégés par le même mécanisme d'auth que les endpoints admin existants (`AuthController` actuel).

```
GET    /api/admin/slides/{kind}/{slug}        → slides d'un item, ordonnées
PUT    /api/admin/slides/{kind}/{slug}        → remplace toutes les slides (atomic)

GET    /api/admin/home/feed                   → ordre actuel du masonry
PUT    /api/admin/home/feed                   → nouvel ordre

GET    /api/admin/categories                  → liste catégories + meta (cover, position, visible)
PUT    /api/admin/categories/{category}       → maj cover, position, visible d'une catégorie
```

**Sémantique `PUT /api/admin/slides/{kind}/{slug}`** : prend un tableau de slides en body. Le service en transaction unique :
1. Valide chaque slide (subtype connu, champs requis selon le type).
2. Supprime toutes les slides existantes de cet owner.
3. Insère les nouvelles avec leur position recalculée (0..N-1).
4. Pour les slides `spec`, insère les `SpecEntry` dans `story_slide_spec`.

**Sémantique `PUT /api/admin/home/feed`** : prend un tableau `[{ kind, slug }, ...]`. Valide que chaque slug existe en base avant écriture. Transaction.

## 5. Admin UI

### 5.1 Stratégie d'intégration

Pas d'écrans isolés. On enrichit la console admin existante :

| Onglet | Évolution |
|---|---|
| Mobilier | + section pliable **"Slides"** dans l'éditeur de chaque pièce |
| Expositions | + section pliable **"Slides"** dans l'éditeur de chaque expo |
| Textes du site | inchangé |
| Médiathèque | inchangée (réutilisée comme picker d'images) |
| **Accueil** | **nouvel onglet** — ordre du masonry + meta des catégories |

### 5.2 Section "Slides"

Bloc accordion (replié par défaut) sous le formulaire de l'item. Comporte :

- Bouton `[+ Ajouter une slide ▾]` avec menu déroulant des 5 types.
- Liste verticale de cartes-slides, chacune avec :
  - Drag handle `⠿` à gauche pour réordonner.
  - Badge type (`COVER`, `IMAGE`, `SPEC`, `QUOTE`, `LINK`).
  - Bouton de suppression `✕`.
  - Champs inline selon le type (pas de modale).
  - Pour `cover` / `image` : bouton `[Changer l'image]` qui ouvre le `photoPicker` existant de la Médiathèque.
- Boutons de bas de section : `[Annuler]` `[Enregistrer les slides]` — distincts du bouton d'enregistrement de la pièce/expo.

**Validations front :**

- Warning (non bloquant) si pas de slide `cover` en première position.
- Warning (non bloquant) si pas de slide `link` en dernière position.
- `spec` doit avoir ≥ 1 entrée (bloquant).
- `image` doit avoir `src` ; `quote` doit avoir `body`. Bouton "Enregistrer" désactivé sinon.

### 5.3 Onglet "Accueil"

Deux blocs verticaux :

**Bloc 1 — Ordre éditorial du masonry.** Liste verticale de **tous** les items existants (mobilier + expos). Chaque ligne :
- Drag handle.
- Thumbnail cover.
- Badge `MOBILIER` ou `EXPO`.
- Titre + sous-titre (catégorie/année ou lieu/période).
- Checkbox `Inclure dans le feed`.

À l'enregistrement, on envoie la liste des items cochés dans leur ordre courant.

**Bloc 2 — Catégories.** Liste des catégories distinctes détectées dans `furniture.category`. Chaque ligne :
- Drag handle (ordre dans le bandeau).
- Cover circulaire (clic → `photoPicker`).
- Label.
- Compteur `N pièces` (informatif).
- Checkbox `Visible dans le bandeau`.

### 5.4 Drag & drop

Directive Angular standalone `appReorderable` (~80 lignes), fondée sur les events HTML5 natifs `dragstart` / `dragover` / `drop`. Émet un output `(reordered)="onReorder($event)"` avec le nouvel ordre. Pas de dépendance `@angular/cdk` ajoutée.

Limitation acceptée : touch events HTML5 sont fragiles, l'admin est donc principalement desktop.

## 6. Liquibase changelogs à créer

| Fichier | Contenu |
|---|---|
| `007-create-story-slides.yaml` | Tables `story_slide` et `story_slide_spec`, index |
| `008-create-home-feed.yaml` | Table `home_feed` |
| `009-create-category-meta.yaml` | Table `furniture_category_meta` |
| `010-seed-stories.yaml` | Seed des slides pour les 6 pièces + 3 expos existantes |
| `011-seed-home-feed.yaml` | Seed de l'ordre éditorial initial du masonry |
| `012-seed-category-meta.yaml` | Seed des 3 catégories (Tables, Sièges, Consoles) avec cover |

Aucune modification des tables existantes — uniquement des ajouts.

## 7. Frontend — fichiers à créer / modifier

**À créer :**
- `pages/home/home.component.ts` (refonte complète du composant existant)
- `pages/home/story-viewer.component.ts` — modale plein écran
- `pages/home/stories-bar.component.ts` — bandeau sticky des ronds
- `pages/home/home-feed.component.ts` — grid masonry
- `pages/admin/slides-editor.component.ts` — bloc accordion réutilisé par Mobilier et Expositions
- `pages/admin/home-editor.component.ts` — onglet Accueil
- `directives/reorderable.directive.ts` — drag&drop natif
- `models/slide.model.ts`, `models/home.model.ts`

**À modifier :**
- `app.routes.ts` — suppression des routes `/mobilier` (liste) et `/expositions` (liste). Les routes détail restent.
- `components/header/header.component.ts` — nav réduite à `Accueil · Studio`.
- `services/portfolio.service.ts` — ajout des appels `getHome()`, `getSlides()`, et endpoints admin.
- `pages/admin/admin.component.ts` — ajout de l'onglet `Accueil` et intégration de la section Slides dans Mobilier/Expositions.
- `models/furniture.model.ts`, `models/exhibition.model.ts` — ajout du champ `slides`.

**À supprimer :**
- `pages/furniture-list/` (composant et tests).
- `pages/exhibitions-list/` (composant et tests).

## 8. Backend — fichiers à créer / modifier

**À créer :**
- `model/Slide.java` (sealed interface) + 5 records (Cover/Image/Spec/Quote/Link).
- `model/SpecEntry.java`, `model/HomePageData.java`, `model/HomeFeedEntry.java`, `model/CategoryMeta.java`.
- `entity/StorySlideEntity.java`, `entity/HomeFeedEntryEntity.java`, `entity/FurnitureCategoryMetaEntity.java`.
- `repository/StorySlideRepository.java`, `repository/HomeFeedRepository.java`, `repository/FurnitureCategoryMetaRepository.java`.
- `service/StoryService.java`, `service/HomeService.java`.
- `controller/HomeController.java`, `controller/AdminStoriesController.java`, `controller/AdminHomeController.java`, `controller/AdminCategoriesController.java`.
- Liquibase changelogs `007` à `012`.

**À modifier :**
- `model/Furniture.java`, `model/Exhibition.java` — ajout du champ `slides`.
- `service/FurnitureService.java`, `service/ExhibitionService.java` — peuplent `slides` via `StoryService` dans `findBySlug`.
- `db/changelog/db.changelog-master.yaml` — déclarer les nouveaux changes.

## 9. Hors scope

- Pas de likes, commentaires, partages, follows, comptes utilisateurs publics.
- Pas de stories éphémères 24h — uniquement des highlights persistants.
- Pas de feed algorithmique — ordre éditorial figé contrôlé par l'admin.
- Pas de support touch drag&drop dans l'admin (HTML5 only, desktop assumé).
- Pas de mode hors ligne, pas de PWA installable.
- Pas d'analytique des vues de stories pour cette itération.
- Pas de migration de `furniture.category` vers une FK — `furniture_category_meta` est décorative uniquement.
- Pas de contrôle admin sur l'ordre des pièces à l'intérieur d'une catégorie — ordre alphabétique en dur.

## 10. Alternatives écartées

| Alternative | Pourquoi écartée |
|---|---|
| Page `/carnet` dédiée + nav inchangée | Demande utilisateur de pivoter vers une refonte de la home plutôt qu'une rubrique séparée. |
| Stories éphémères 24h | Surcomplexité (cron de purge, état) sans bénéfice pour un studio qui publie quelques fois par mois. |
| Tables `furniture_slide` + `exhibition_slide` séparées | Permettrait des FK strictes mais duplique les colonnes et la logique service. Discriminant `owner_kind` + cleanup applicatif jugé suffisant. |
| Endpoint `/api/home` éclaté en 3 (`/categories`, `/exhibitions/home`, `/feed`) | 3 round-trips inutiles pour une vue qui les agrège tous. |
| Record `Slide` unique fourre-tout avec champs nullable | Perte de type-safety, branchements multiples côté front. Sealed interface + polymorphisme Jackson plus propre. |
| Opérations granulaires (POST/PATCH/DELETE par slide) | Plus complexes côté admin (diff côté serveur, race conditions). PUT atomique simplifie la sauvegarde par drag&drop. |
| Migration de `furniture.category` vers une vraie FK `category_id` | Migration douloureuse pour un gain limité (la category reste une string libre dans le formulaire). |
| Angular CDK pour le drag&drop | Nouvelle dépendance lourde pour ~80 lignes de directive native équivalente. |

## 11. Risques

- **Cleanup orphelin** : si une pièce est supprimée et que le hook applicatif rate la suppression des `story_slide` associées, on garde des slides orphelines. Mitigation : tâche périodique de cleanup OU contrainte par défaut sur le service (test d'intégration de la suppression).
- **Cohérence `home_feed` ↔ existence des items** : si l'admin supprime une pièce référencée dans `home_feed`, l'entrée devient invalide. Mitigation : cleanup en cascade dans le service de suppression + filtre côté `HomeService.findFeed()` (ignore les entrées sans cible).
- **Performance du `GET /api/home`** : 9 cartes + 3 catégories + 3 expos = ~15 lignes. Acceptable, mais à surveiller si le contenu croît (pagination future).
- **Drag&drop HTML5 sur mobile admin** : fragile, mais l'admin est censé être desktop. À documenter, pas à corriger pour cette itération.
- **SEO** : la suppression des pages `/mobilier` et `/expositions` casse les liens existants. Mitigation : redirections 301 → `/` (ajouter dans `WebConfig` ou nginx).

## 12. Critères d'acceptation

- [ ] La home `/` affiche un hero épuré, un bandeau de stories sticky (catégories + expos), et un masonry mixte respectant l'ordre éditorial.
- [ ] Le Story Viewer ouvre en plein écran au clic sur un rond ou une carte, joue les slides à 5s par défaut, supporte tap zones, hold-to-pause, flèches clavier et Esc.
- [ ] Le viewer enchaîne les pièces d'une catégorie quand il est ouvert depuis un rond de catégorie.
- [ ] La dernière slide d'un item est de type `link` et amène à `/mobilier/{slug}` ou `/expositions/{slug}`.
- [ ] Les pages `/mobilier` et `/expositions` (listes) sont supprimées et redirigées vers `/`.
- [ ] L'admin peut éditer les slides de chaque pièce/expo (ajout, suppression, réordre, édition inline), avec sauvegarde atomique.
- [ ] L'admin peut réordonner et filtrer les items du masonry depuis l'onglet "Accueil".
- [ ] L'admin peut éditer la cover, l'ordre et la visibilité de chaque catégorie de mobilier.
- [ ] Aucun changement destructif sur les tables `furniture` ou `exhibition` existantes.

## 13. Suite

Cette spec sera traduite en plan d'implémentation découpé (Liquibase → backend models → backend services → backend controllers → frontend models → frontend pages → frontend admin → suppression des anciennes pages) via la skill `superpowers:writing-plans`.
