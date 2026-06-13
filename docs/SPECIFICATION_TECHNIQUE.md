# Spécification Technique — Milo GUILLAUME Design

**Version** : 2.11.0
**Date** : 13/06/2026
**Statut** : Vivant (mis à jour en continu)
**Auteur** : Maxime Guillaume

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture globale](#2-architecture-globale)
3. [Modèle de données](#3-modèle-de-données)
4. [API REST — Référence complète](#4-api-rest--référence-complète)
5. [Frontend — Composants & routes](#5-frontend--composants--routes)
6. [Infrastructure & déploiement](#6-infrastructure--déploiement)
7. [Pipeline CI/CD](#7-pipeline-cicd)
8. [Guide développeur](#8-guide-développeur)
9. [Tests](#9-tests)
10. [Décisions d'architecture (ADR)](#10-décisions-darchitecture-adr)

---

## 1. Vue d'ensemble

### 1.1 Présentation

**Milo GUILLAUME Design** est une application web portfolio full-stack présentant l'œuvre de Milo Guillaume — designer de mobilier sculpté et scénographe. L'application expose un catalogue de pièces uniques, des expositions artistiques et le profil du studio.

### 1.2 Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend | Spring Boot | 4.0.0 |
| Langage backend | Java (Eclipse Temurin) | 25 |
| Build backend | Maven | 3.9 |
| Frontend | Angular (standalone + signals) | 21 |
| Langage frontend | TypeScript | 5.9 |
| Base de données | PostgreSQL | 16 |
| Migrations BDD | Liquibase | — |
| Conteneurisation | Docker (multi-stage) | — |
| Reverse proxy | Nginx | 1.27-alpine |
| CI/CD | GitHub Actions | — |
| Registry images | GitHub Container Registry (GHCR) | — |
| Hébergement cloud | Railway | — |
| Environnement local | Rancher Desktop | — |
| Lib UI crop admin | Cropper.js | 1.6.2 |

### 1.3 Périmètre fonctionnel

- Catalogue mobilier : liste, filtrage par catégorie, fiche détaillée
- Expositions : liste chronologique, fiche détaillée
- **Page Créations** (`/creations`) : catalogue agrégé mobilier + expositions, filtres type / années / tags, deep-link via query params
- Studio : profil, biographie, presse, distinctions
- **Stories éditoriales** : N stories par pièce/exposition, slides visuels, viewer plein écran
- **Sliders d'actualités** : carrousels composés de stories assignés à 3 zones de la home (`news.primary/.secondary/.tertiary`)
- Administration : CRUD complet mobilier & expositions, page Accueil (masonry + sliders), navigation CMS, tags
- Authentification : login JWT via `POST /api/auth/login`, garde Angular (`authGuard`), intercepteur HTTP
- Santé API : endpoint `/actuator/health` pour les healthchecks

**Hors périmètre actuel :** paiement, internationalisation, SSR.

---

## 2. Architecture globale

```
┌──────────────────────────────────────────────────────────┐
│                        Client (navigateur)               │
│              Angular 21 — http://localhost:4200          │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP (SPA + proxy /api)
                         ▼
┌──────────────────────────────────────────────────────────┐
│                     Nginx 1.27-alpine                    │
│  • Sert les assets statiques Angular (dist/)             │
│  • Reverse-proxy /api/* → backend:8080                   │
│  • Gzip, cache 7j pour assets, fallback SPA              │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP (réseau Docker interne)
                         ▼
┌──────────────────────────────────────────────────────────┐
│               Spring Boot 4.0 — port 8080                │
│  • API REST JSON                                         │
│  • CORS autorisé : localhost:4200, localhost, 127.0.0.1, 127.0.0.1:4200             │
│  • Liquibase (migrations au démarrage)                   │
│  • Actuator /health                                      │
└────────────────────────┬─────────────────────────────────┘
                         │ JDBC / JPA
                         ▼
┌──────────────────────────────────────────────────────────┐
│              PostgreSQL 16-alpine — port 5432            │
│  • Base : portfolio                                      │
│  • Schéma géré entièrement par Liquibase                 │
└──────────────────────────────────────────────────────────┘
```

### 2.1 Organisation des sources

```
Application-Web/
├── backend/                     # Spring Boot
│   ├── src/main/java/com/atelier/portfolio/
│   │   │   ├── config/              # SecurityConfig (CORS + JWT filter), JwtUtil
│   │   ├── controller/          # FurnitureController, ExhibitionController, ProfileController, AuthController
│   │   ├── entity/              # FurnitureEntity, ExhibitionEntity (JPA)
│   │   ├── model/               # Furniture, Exhibition, Profile, LoginRequest, LoginResponse (records Java)
│   │   ├── repository/          # FurnitureRepository, ExhibitionRepository (JPA)
│   │   └── service/             # FurnitureService, ExhibitionService
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/changelog/        # Liquibase (master + changes/)
│   └── Dockerfile
├── frontend/                    # Angular 21
│   ├── src/app/
│   │   ├── components/          # HeaderComponent, FooterComponent
│   │   ├── guards/              # auth.guard.ts (protège /admin)
│   │   ├── interceptors/        # auth.interceptor.ts (injecte Bearer token, gère 401)
│   │   ├── models/              # furniture.model.ts, exhibition.model.ts, profile.model.ts
│   │   ├── pages/               # home, furniture-list, furniture-detail,
│   │   │                        # exhibitions-list, exhibition-detail, studio, admin, login
│   │   ├── services/            # portfolio.service.ts, auth.service.ts
│   │   ├── app.routes.ts
│   │   └── app.config.ts
│   ├── nginx.conf               # Template Nginx (envsubst au démarrage)
│   └── Dockerfile
├── deploy/
│   ├── base/docker-compose.yml  # Compose image-based (Rancher + modèle envs)
│   └── envs/
│       ├── local/.env           # Versions d'images locales
│       ├── staging/versions.yaml
│       └── production/versions.yaml
├── docker-compose.yml           # Compose build-from-source (dev local)
└── .github/workflows/           # CI/CD pipelines
```

---

## 3. Modèle de données

### 3.1 Schéma relationnel

```
furniture
─────────────────────────────────────────────────────
id            VARCHAR(50)  PK   "f-" + 8 chars UUID
title         VARCHAR(255) NOT NULL
slug          VARCHAR(255) NOT NULL UNIQUE
category      VARCHAR(100) NOT NULL
material      VARCHAR(255)
year_made     INTEGER
cover_image   VARCHAR(500)
cover_crop_x  DOUBLE       nullable  (% 0–100, cadrage cover)
cover_crop_y  DOUBLE       nullable
cover_crop_w  DOUBLE       nullable
cover_crop_h  DOUBLE       nullable
short_desc    VARCHAR(1000)
description   VARCHAR(4000)
designer      VARCHAR(255)
featured      BOOLEAN      NOT NULL DEFAULT false

furniture_gallery (N:1 → furniture, cascade delete)
─────────────────────────────────────────────────────
furniture_id  FK
image_url     VARCHAR(500)
crop_x        DOUBLE       nullable  (% 0–100, cadrage item galerie)
crop_y        DOUBLE       nullable
crop_w        DOUBLE       nullable
crop_h        DOUBLE       nullable
col_span      INT          NOT NULL DEFAULT 1   (span CSS grille, 1–3)
row_span      INT          NOT NULL DEFAULT 1   (span CSS grille, 1–4)
position      INTEGER      (ordre d'affichage)

furniture_dimension (N:1 → furniture, cascade delete)
─────────────────────────────────────────────────────
furniture_id  FK
value         VARCHAR(255) (ex: "L 80 × l 60 × H 120 cm")
position      INTEGER

exhibition
─────────────────────────────────────────────────────
id            VARCHAR(50)  PK   "e-" + 8 chars UUID
title         VARCHAR(255) NOT NULL
slug          VARCHAR(255) NOT NULL UNIQUE
venue         VARCHAR(255)
city          VARCHAR(100)
country       VARCHAR(100)
start_date    DATE
end_date      DATE
cover_image   VARCHAR(500)
cover_crop_x  DOUBLE       nullable  (% 0–100, cadrage cover)
cover_crop_y  DOUBLE       nullable
cover_crop_w  DOUBLE       nullable
cover_crop_h  DOUBLE       nullable
curator       VARCHAR(255)
short_desc    VARCHAR(1000)
description   VARCHAR(4000)
featured      BOOLEAN      NOT NULL DEFAULT false

exhibition_gallery (N:1 → exhibition, cascade delete)
─────────────────────────────────────────────────────
exhibition_id FK
image_url     VARCHAR(500)
crop_x        DOUBLE       nullable  (% 0–100, cadrage item galerie)
crop_y        DOUBLE       nullable
crop_w        DOUBLE       nullable
crop_h        DOUBLE       nullable
col_span      INT          NOT NULL DEFAULT 1   (span CSS grille, 1–3)
row_span      INT          NOT NULL DEFAULT 1   (span CSS grille, 1–4)
position      INTEGER

exhibition_tag (N:1 → exhibition, cascade delete)
─────────────────────────────────────────────────────
exhibition_id FK
tag           VARCHAR(100)
position      INTEGER

furniture_tag (N:1 → furniture, cascade delete)
─────────────────────────────────────────────────────
furniture_id  FK
position      INTEGER     (PK composite avec furniture_id)
entry_value   VARCHAR(255) NOT NULL

story
─────────────────────────────────────────────────────
id            VARCHAR(50)  PK
owner_kind    VARCHAR(20)  NOT NULL   "furniture" | "exhibition"
owner_id      VARCHAR(50)  NOT NULL
title         VARCHAR(200) NOT NULL
cover_image   VARCHAR(500) NOT NULL
cover_crop_x  DOUBLE       nullable  (% 0–100, cadrage cover story)
cover_crop_y  DOUBLE       nullable
cover_crop_w  DOUBLE       nullable
cover_crop_h  DOUBLE       nullable
slug          VARCHAR(200) NOT NULL UNIQUE
position      INTEGER      NOT NULL DEFAULT 0
created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
Index : idx_story_owner_pos(owner_kind, owner_id, position)

story_slide (N:1 → story via story_id, cascade delete)
─────────────────────────────────────────────────────
id            VARCHAR(50)  PK
story_id      FK → story(id) CASCADE
type          VARCHAR(20)  NOT NULL   "image" | "video" | "quote" | ...
position      INTEGER      NOT NULL
(+ colonnes métadonnées selon type : image_url, caption, quote_text, etc.)
Index : idx_story_slide_story_pos(story_id, position)

news_slider
─────────────────────────────────────────────────────
id            VARCHAR(50)  PK
slug          VARCHAR(100) NOT NULL UNIQUE
title         VARCHAR(200) NOT NULL
zone_key      VARCHAR(50)  nullable   "news.primary" | "news.secondary" | "news.tertiary"
created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP

slider_story (table de jointure news_slider ↔ story, cascade delete des deux côtés)
─────────────────────────────────────────────────────
slider_id     FK → news_slider(id) CASCADE   PK composite
story_id      FK → story(id) CASCADE         PK composite
position      INTEGER      NOT NULL
Index : idx_slider_story_position(slider_id, position)

home_feed (items de la page d'accueil — mobilier ou exposition)
─────────────────────────────────────────────────────
id            VARCHAR(50)  PK
kind          VARCHAR(20)  NOT NULL   "furniture" | "exhibition"
ref_slug      VARCHAR(255) NOT NULL   (slug de la fiche source)
included      BOOLEAN      NOT NULL DEFAULT true
position      INTEGER      NOT NULL
cover_crop_x  DOUBLE PRECISION nullable  (cadrage cover override, % 0–100 ; null = utilise la fiche source)
cover_crop_y  DOUBLE PRECISION nullable
cover_crop_w  DOUBLE PRECISION nullable
cover_crop_h  DOUBLE PRECISION nullable
Index : idx_home_feed_kind_slug(kind, ref_slug) UNIQUE
```

### 3.2 Fichiers de migration Liquibase

| Fichier | Contenu |
|---------|---------|
| `001-create-schema.yaml` | Création des tables initiales |
| `002-seed-furniture.yaml` | Données initiales mobilier |
| `003-seed-exhibitions.yaml` | Données initiales expositions |
| `004-rename-studio-brand.yaml` | Migration rebrand Atelier Lumen → Milo GUILLAUME Design |
| `005-create-site-content.yaml` | Table `site_content` (blocs texte CMS) |
| `006-create-photos.yaml` | Table `photo` (médiathèque) |
| `007-create-story-slides.yaml` | Table `story_slide` (slides éditoriaux, premier modèle) |
| `008-create-home-feed.yaml` | Tables `home_feed_entry` + métadonnées accueil |
| `009-create-category-meta.yaml` | Table `furniture_category_meta` |
| `013-create-exhibition-meta.yaml` | Table `exhibition_meta` |
| `015-create-contact-requests.yaml` | Table `contact_request` |
| `016-create-mail-settings.yaml` | Table `mail_settings` |
| `021-add-tags-to-photo.yaml` | Tags sur photos |
| `022-create-story.yaml` | Table `story` — entité éditoriale (1 owner → N stories) |
| `023-seed-default-stories.yaml` | Backfill d'une story par owner existant |
| `024-refactor-story-slide.yaml` | Ajout `story_id` sur `story_slide` (nullable → backfill → NOT NULL → FK → drop ancien index) |
| `025-create-news-slider.yaml` | Tables `news_slider` + `slider_story` |
| `026-add-tags-to-furniture.yaml` | Table `furniture_tag` (`@ElementCollection` sur mobilier) |
| `027-add-cover-focal-point.yaml` | Colonnes `cover_focal_x/y` sur `furniture` et `exhibition` (supersédé par 028) |
| `028-replace-focal-point-with-crop.yaml` | DROP `cover_focal_x/y` sur `furniture` + `exhibition` ; ADD `cover_crop_x/y/w/h` (DOUBLE nullable) sur `furniture`, `exhibition`, `story` ; ADD `crop_x/y/w/h` (DOUBLE nullable) sur `furniture_gallery` + `exhibition_gallery` |
| `029-add-gallery-item-spans.yaml` | ADD `col_span` + `row_span` INT NOT NULL DEFAULT 1 sur `furniture_gallery` et `exhibition_gallery` (spans grille WYSIWYG) |
| `030-add-home-feed-cover-crop.yaml` | ADD `cover_crop_x/y/w/h` DOUBLE PRECISION nullable sur `home_feed` (cadrage cover par item de feed, override de la fiche source) |

### 3.3 Records Java (DTOs)

```java
// model/ImageCrop.java — coordonnées de cadrage normalisées (% 0–100)
record ImageCrop(
    @DecimalMin("0.0") @DecimalMax("100.0") Double x,
    @DecimalMin("0.0") @DecimalMax("100.0") Double y,
    @DecimalMin("0.0") @DecimalMax("100.0") Double w,
    @DecimalMin("0.0") @DecimalMax("100.0") Double h
) {
    // Factory : retourne null si tous les champs sont null
    static ImageCrop ofNullable(Double x, Double y, Double w, Double h) { ... }
}

// model/GalleryImage.java — item de galerie avec cadrage optionnel et spans grille
record GalleryImage(
    @Size(max = 500) String url,
    @Valid ImageCrop crop,          // nullable
    @Min(1) @Max(3) Integer colSpan,  // span colonnes grille (défaut 1)
    @Min(1) @Max(4) Integer rowSpan   // span rangées grille (défaut 1)
) {}

// model/Furniture.java
record Furniture(
    String id, String title, String slug, String category,
    String material, Integer year, String coverImage,
    ImageCrop coverCrop,                    // nullable — cadrage cover
    @Valid List<GalleryImage> gallery,      // breaking : était List<String>
    String shortDescription, String description,
    List<String> dimensions, String designer, boolean featured
) {}

// model/Exhibition.java
record Exhibition(
    String id, String title, String slug,
    String venue, String city, String country,
    LocalDate startDate, LocalDate endDate,
    String coverImage,
    ImageCrop coverCrop,                    // nullable — cadrage cover
    @Valid List<GalleryImage> gallery,      // breaking : était List<String>
    String curator, String shortDescription, String description,
    List<String> tags, boolean featured
) {}

// model/Profile.java — retourné par ProfileController (données hardcodées)
record Profile(
    String studio, String tagline, String bio,
    String contactEmail, String location,
    List<Map<String, String>> press,  // [{title, year}]
    List<String> awards
) {}

// model/Story.java
record Story(
    String id, String ownerKind, String ownerId,
    String title, String coverImage,
    ImageCrop coverCrop,    // nullable — cadrage cover story
    String slug, int position
) {}

// model/StoryWithSlides.java
record StoryWithSlides(
    String id, String ownerKind, String ownerId,
    String title, String coverImage,
    ImageCrop coverCrop,
    String slug, int position,
    List<Slide> slides
) {}

// model/Slide.java
record Slide(String id, String type, int position, /* champs métadonnées selon type */ ...) {}

// model/NewsSlider.java
record NewsSlider(String id, String slug, String title, String zoneKey, List<Story> stories) {}

// model/NewsSliderView.java — projection allégée pour l'affichage public
record NewsSliderView(String id, String slug, String title, String zoneKey, List<StoryWithSlides> stories) {}

// model/HomeFeedItem.java — item home feed (mobilier ou exposition)
record HomeFeedItem(
    String id, String kind, String slug, String title,
    String coverImage, ImageCrop coverCrop,  // nullable
    boolean featured, int position
) {}
```

> **Breaking change DTO (028) :** le champ `gallery` dans `Furniture` et `Exhibition` était `List<String>` (URLs brutes) ; il est maintenant `List<GalleryImage>`. Tout client consommant l'API doit adapter la désérialisation.

### 3.4 Interfaces TypeScript (frontend)

```typescript
// models/crop.model.ts
interface Crop { x: number; y: number; w: number; h: number; }

// models/gallery-item.model.ts
interface GalleryItem {
  url: string;
  crop?: Crop | null;
  colSpan?: number;   // span colonnes CSS grille (1–3, défaut 1 côté view)
  rowSpan?: number;   // span rangées CSS grille (1–4, défaut 1 côté view)
}

// models/furniture.model.ts
interface Furniture {
  id: string; title: string; slug: string; category: string;
  material: string; year: number; coverImage: string;
  coverCrop?: Crop | null;          // cadrage cover (nullable)
  gallery: GalleryItem[];           // breaking : était string[]
  shortDescription: string; description: string;
  dimensions: string[]; designer: string; featured: boolean;
}

// models/exhibition.model.ts
interface Exhibition {
  id: string; title: string; slug: string;
  venue: string; city: string; country: string;
  startDate: string; endDate: string;   // ISO date string (yyyy-MM-dd)
  coverImage: string;
  coverCrop?: Crop | null;          // cadrage cover (nullable)
  gallery: GalleryItem[];           // breaking : était string[]
  curator: string; shortDescription: string; description: string;
  tags: string[]; featured: boolean;
}

// models/profile.model.ts
interface Profile {
  studio: string; tagline: string; bio: string;
  contactEmail: string; location: string;
  press: { title: string; year: string }[];
  awards: string[];
}

// models/story.model.ts
interface Story {
  id: string; ownerKind: string; ownerId: string;
  title: string; coverImage: string;
  coverCrop?: Crop | null;    // cadrage cover story (nullable)
  slug: string; position: number;
}
interface StoryWithSlides extends Story { slides: Slide[]; }
interface Slide { id: string; type: string; position: number; [key: string]: unknown; }

// models/news-slider.model.ts
interface NewsSliderView {
  id: string; slug: string; title: string; zoneKey: string | null;
  stories: StoryWithSlides[];
}

// models/home-feed-item.model.ts
interface HomeFeedItem {
  id: string; kind: 'furniture' | 'exhibition';
  slug: string; title: string; coverImage: string;
  coverCrop?: Crop | null;    // cadrage cover home feed (nullable)
  featured: boolean; position: number;
}

// models/creation.model.ts
interface CreationItem {
  kind: 'furniture' | 'exhibition';
  slug: string; title: string; cover: string;
  subtitle: string; year: number;
  tags: string[]; href: string;
}
```

---

## 4. API REST — Référence complète

**Base URL :** `http://localhost:8080`
**Format :** JSON (`Content-Type: application/json`)
**CORS :** `http://localhost:4200`, `http://localhost`, `http://127.0.0.1`, `http://127.0.0.1:4200`
**Auth :** routes mutatives protégées par JWT — header `Authorization: Bearer <token>`

### 4.1 Mobilier — `/api/furniture`

| Méthode | Endpoint | Description | Réponse |
|---------|----------|-------------|---------|
| GET | `/api/furniture` | Tous les meubles | `Furniture[]` 200 |
| GET | `/api/furniture/featured` | Meubles mis en avant | `Furniture[]` 200 |
| GET | `/api/furniture/categories` | Catégories distinctes (triées) | `string[]` 200 |
| GET | `/api/furniture/{slug}` | Meuble par slug | `Furniture` 200 / 404 |
| POST | `/api/furniture` | Créer un meuble | `Furniture` 200 |
| PUT | `/api/furniture/{slug}` | Mettre à jour un meuble | `Furniture` 200 / 404 |
| DELETE | `/api/furniture/{slug}` | Supprimer un meuble | 204 / 404 |

**Génération de l'ID :** `"f-" + UUID(8 chars)` — ex. `f-a3f9c12b`

**Génération du slug** (si absent) : titre en minuscules, accents retirés, espaces → tirets.
Ex. `"Chaise Éclat"` → `"chaise-eclat"`

**Exemple de corps POST :**
```json
{
  "title": "Chaise Éclat",
  "category": "Sièges",
  "material": "Chêne massif",
  "year": 2025,
  "coverImage": "https://...",
  "coverCrop": { "x": 10.5, "y": 5.0, "w": 80.0, "h": 70.0 },
  "gallery": [
    { "url": "https://...", "crop": { "x": 0.0, "y": 0.0, "w": 100.0, "h": 100.0 } },
    { "url": "https://...", "crop": null }
  ],
  "shortDescription": "Siège sculpté en chêne.",
  "description": "Description longue...",
  "dimensions": ["L 52 × P 55 × H 82 cm"],
  "designer": "Milo Guillaume",
  "featured": true
}
```

**Validation crop :** les valeurs `x`, `y`, `w`, `h` doivent être dans `[0.0, 100.0]` — toute valeur hors bornes retourne **400** (`@DecimalMin`/`@DecimalMax` sur `ImageCrop`). La validation est en cascade (`@Valid`) depuis `Furniture`/`Exhibition`/`Story`.

### 4.2 Expositions — `/api/exhibitions`

| Méthode | Endpoint | Description | Réponse |
|---------|----------|-------------|---------|
| GET | `/api/exhibitions` | Toutes les expositions (ordre `startDate DESC`) | `Exhibition[]` 200 |
| GET | `/api/exhibitions/featured` | Expositions mises en avant | `Exhibition[]` 200 |
| GET | `/api/exhibitions/{slug}` | Exposition par slug | `Exhibition` 200 / 404 |
| POST | `/api/exhibitions` | Créer une exposition | `Exhibition` 200 |
| PUT | `/api/exhibitions/{slug}` | Mettre à jour une exposition | `Exhibition` 200 / 404 |
| DELETE | `/api/exhibitions/{slug}` | Supprimer une exposition | 204 / 404 |

**Génération de l'ID :** `"e-" + UUID(8 chars)` — ex. `e-b7d1e345`

### 4.3 Authentification — `/api/auth`

| Méthode | Endpoint | Description | Corps | Réponse |
|---------|----------|-------------|-------|---------|
| POST | `/api/auth/login` | Authentification admin | `{username, password}` | `{token, expiresIn}` 200 / 401 |

- Identifiants configurés via `ADMIN_USERNAME` et `ADMIN_PASSWORD_HASH` (bcrypt)
- Token JWT signé HS384, expiration 24h (`JWT_SECRET`, `JWT_EXPIRATION_MS`)
- Endpoint `permitAll()` — aucun token requis pour s'authentifier

### 4.4 Profil — `/api/profile`

| Méthode | Endpoint | Description | Réponse |
|---------|----------|-------------|---------|
| GET | `/api/profile` | Profil du studio (données statiques) | `Profile` 200 |

> Données hardcodées dans `ProfileController`. Pour les modifier, éditer directement le contrôleur.

### 4.5 Tags — `/api/tags`

| Méthode | Endpoint | Description | Réponse | Auth |
|---------|----------|-------------|---------|------|
| GET | `/api/tags` | Union dédupliquée + triée (FR) des tags mobilier et expositions | `string[]` 200 | `permitAll` |

### 4.6 Stories & Sliders d'actualités

#### Stories publiques — `/api/stories`

| Méthode | Endpoint | Description | Réponse | Auth |
|---------|----------|-------------|---------|------|
| GET | `/api/stories?ownerKind=&ownerId=` | Stories d'un owner (mobilier ou exposition) | `Story[]` 200 | `permitAll` |
| GET | `/api/stories/{slug}` | Story avec ses slides, par slug | `StoryWithSlides` 200 / 404 | `permitAll` |

**Shape `Story` :**
```json
{
  "id": "s-abc123",
  "ownerKind": "furniture",
  "ownerId": "f-a3f9c12b",
  "title": "En atelier",
  "coverImage": "https://...",
  "slug": "chaise-eclat-en-atelier",
  "position": 0
}
```

#### Sliders d'actualités publics — `/api/sliders`

| Méthode | Endpoint | Description | Réponse | Auth |
|---------|----------|-------------|---------|------|
| GET | `/api/sliders` | Tous les sliders publiés avec leurs stories et slides | `NewsSliderView[]` 200 | `permitAll` |

**Shape `NewsSliderView` :**
```json
{
  "id": "sl-xyz",
  "slug": "actualites-printemps",
  "title": "Actualités printemps 2026",
  "zoneKey": "news.primary",
  "stories": [{ "id": "...", "title": "...", "slides": [...] }]
}
```

Zones reconnues : `news.primary`, `news.secondary`, `news.tertiary`. La `zoneKey` peut être `null` (slider non assigné à la home).

#### Stories admin — `/api/admin/stories` (JWT requis)

| Méthode | Endpoint | Description | Réponse |
|---------|----------|-------------|---------|
| GET | `/api/admin/stories?ownerKind=&ownerId=` | Stories d'un owner | `Story[]` 200 |
| GET | `/api/admin/stories/all` | Toutes les stories (page Sliders) | `Story[]` 200 |
| POST | `/api/admin/stories` | Créer une story | `Story` 200 |
| PUT | `/api/admin/stories/{id}` | Modifier une story | `Story` 200 |
| PUT | `/api/admin/stories/{id}/position` | Mettre à jour la position | 204 |
| DELETE | `/api/admin/stories/{id}` | Supprimer une story | 204 |
| GET | `/api/admin/stories/{id}/slides` | Slides d'une story | `Slide[]` 200 |
| PUT | `/api/admin/stories/{id}/slides` | Remplacer les slides | `Slide[]` 200 |

#### Sliders admin — `/api/admin/sliders` (JWT requis)

| Méthode | Endpoint | Description | Réponse |
|---------|----------|-------------|---------|
| GET | `/api/admin/sliders` | Tous les sliders | `NewsSlider[]` 200 |
| POST | `/api/admin/sliders` | Créer un slider | `NewsSlider` 200 |
| PUT | `/api/admin/sliders/{id}` | Modifier un slider | `NewsSlider` 200 |
| DELETE | `/api/admin/sliders/{id}` | Supprimer un slider | 204 |
| PUT | `/api/admin/sliders/{id}/stories` | Remplacer la liste des stories (max 50) | `NewsSlider` 200 / 400 |

**Validation :** `storyIds.size() > 50` → 400. `zoneKey` invalide → 400 (`IllegalArgumentException` traduit par `@ExceptionHandler`).

### 4.7 Home admin — `/api/admin/home` (JWT requis)

#### Feed

| Méthode | Endpoint | Description | Corps | Réponse |
|---------|----------|-------------|-------|---------|
| GET | `/api/admin/home` | Données complètes de la home (feed + site_content) | — | `HomePageData` 200 |
| PUT | `/api/admin/home/feed` | Remplacer la liste des items du feed | `HomeFeedItem[]` | `HomeFeedItem[]` 200 |
| PUT | `/api/admin/home/feed/cover-crop` | Définir (ou effacer) le cadrage cover d'un item | `HomeFeedCoverCropRequest` | 204 |

**DTO `HomeFeedCoverCropRequest` :**

```java
record HomeFeedCoverCropRequest(
    @NotBlank @Pattern(regexp = "furniture|exhibition") String kind,
    @NotBlank String slug,
    @Valid ImageCrop crop    // nullable → efface le crop override
) {}
```

**Comportement `PUT .../feed/cover-crop` :**

- Trouve l'entry `home_feed` par `(kind, slug)` via `HomeFeedRepository.findByKindAndRefSlug`.
- Si `crop` non null : set `cover_crop_x/y/w/h`.
- Si `crop` null : reset les 4 colonnes à null (fallback automatique à la fiche source).
- `@Transactional` + `@CacheEvict` (`home$` Angular invalidé côté service).
- 404 si l'entry n'existe pas.

**Comportement `PUT .../feed` (replace) :**

- Snapshot `kind:slug → double[]` des coverCrop existants avant delete+insert.
- Réapplique les coverCrops snapshot sur les nouvelles entries pour préserver les cadrages lors du réordonnancement.

#### Contenu éditorial

| Méthode | Endpoint                  | Description                                  | Corps                 | Réponse |
|---------|---------------------------|----------------------------------------------|-----------------------|---------|
| PUT     | `/api/admin/home/content` | Mettre à jour les blocs texte CMS de la home | `Map<String, String>` | 200     |

### 4.8 Actuator

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/actuator/health` | Santé de l'application (`{"status":"UP"}`) |

---

## 5. Frontend — Composants & routes

### 5.1 Configuration Angular

**`app.config.ts` :**
- `provideZoneChangeDetection({ eventCoalescing: true })`
- `provideRouter(routes, withInMemoryScrolling(...), withAnchorScrolling())`
- `provideHttpClient(withFetch())`

**`proxy.conf.json` :** proxifie `/api` → `http://localhost:8080` en développement (évite le CORS).

### 5.2 Routes

| Path | Composant | Lazy | Guard | Titre de page |
|------|-----------|------|-------|---------------|
| `` (racine) | `HomeComponent` | ✅ | — | "Milo GUILLAUME Design — Mobilier sculpté & expositions" |
| `mobilier` | `FurnitureListComponent` | ✅ | — | "Mobilier — Milo GUILLAUME Design" |
| `mobilier/:slug` | `FurnitureDetailComponent` | ✅ | — | (dynamique : titre du meuble) |
| `expositions` | `ExhibitionsListComponent` | ✅ | — | "Expositions — Milo GUILLAUME Design" |
| `expositions/:slug` | `ExhibitionDetailComponent` | ✅ | — | (dynamique : titre de l'exposition) |
| `creations` | `CreationsComponent` | ✅ | — | "Créations — Milo GUILLAUME Design" |
| `studio` | `StudioComponent` | ✅ | — | "Studio — Milo GUILLAUME Design" |
| `login` | `LoginComponent` | ✅ | — | "Connexion — Milo GUILLAUME Design" |
| `admin` | `AdminLayoutComponent` | ✅ | `authGuard` | — |
| `admin/accueil` | `AccueilComponent` | ✅ | `authGuard` | "Accueil — Admin" |
| `admin/mobilier` | `MobilierComponent` | ✅ | `authGuard` | "Mobilier — Admin" |
| `admin/expositions` | `ExpositionsAdminComponent` | ✅ | `authGuard` | "Expositions — Admin" |
| `admin/navigation` | `NavigationComponent` | ✅ | `authGuard` | "Navigation — Admin" |
| `admin/sliders` | redirect → `admin/accueil` | — | — | (fusionné dans Accueil) |
| `**` | redirect → `/` | — | — | — |

### 5.3 Services

#### `PortfolioService`

Singleton (`providedIn: 'root'`). Base : `/api`. Utilise `HttpClient` injecté via `inject()`.

| Méthode | HTTP | Endpoint |
|---------|------|----------|
| `getAllFurniture()` | GET | `/api/furniture` |
| `getFeaturedFurniture()` | GET | `/api/furniture/featured` |
| `getFurnitureCategories()` | GET | `/api/furniture/categories` |
| `getFurniture(slug)` | GET | `/api/furniture/{slug}` |
| `createFurniture(input)` | POST | `/api/furniture` |
| `updateFurniture(slug, input)` | PUT | `/api/furniture/{slug}` |
| `deleteFurniture(slug)` | DELETE | `/api/furniture/{slug}` |
| `getAllExhibitions()` | GET | `/api/exhibitions` |
| `getFeaturedExhibitions()` | GET | `/api/exhibitions/featured` |
| `getExhibition(slug)` | GET | `/api/exhibitions/{slug}` |
| `createExhibition(input)` | POST | `/api/exhibitions` |
| `updateExhibition(slug, input)` | PUT | `/api/exhibitions/{slug}` |
| `deleteExhibition(slug)` | DELETE | `/api/exhibitions/{slug}` |
| `getProfile()` | GET | `/api/profile` |
| `getAllTags()` | GET | `/api/tags` |
| `getSliders()` | GET | `/api/sliders` |
| `getStoriesByOwner(ownerKind, ownerId)` | GET | `/api/stories?ownerKind=&ownerId=` |
| `getStoryBySlug(slug)` | GET | `/api/stories/{slug}` |
| `updateHomeFeedCoverCrop(kind, slug, crop)` | PUT | `/api/admin/home/feed/cover-crop` |

#### `AuthService`

Singleton (`providedIn: 'root'`). Gère le cycle de vie du token JWT.

| Méthode | Description |
|---------|-------------|
| `login(username, password)` | POST `/api/auth/login` → stocke le token en `localStorage` |
| `logout()` | Supprime le token, met `isLoggedIn` à `false` |
| `getToken()` | Retourne le token brut depuis `localStorage` |
| `isLoggedIn` | Signal booléen — vrai si token présent et non expiré |

**`authInterceptor`** : injecte `Authorization: Bearer <token>` sur chaque requête sortante ; redirige vers `/login` sur 401/403.

**`authGuard`** : `CanActivateFn` — vérifie `isLoggedIn()`, redirige vers `/login` sinon.

### 5.4 Composants

#### `HomeComponent` (`/`)
- Sections : hero, mobilier featured (grille 3 col.), expositions featured, pull-quote
- Signals : `featuredFurniture`, `featuredExhibitions`, `loadingFurniture`, `loadingExhibitions`, `errorFurniture`

#### `FurnitureListComponent` (`/mobilier`)
- Signals : `all`, `loading`, `error`, `active` (catégorie sélectionnée)
- Computed : `categories` (distinct, trié), `filtered` (filtrage par `active`)
- Boutons filtre par catégorie + filtre "Tout"

#### `FurnitureDetailComponent` (`/mobilier/:slug`)

- Refactoré (375 → 137 lignes) — délègue le rendu à `<app-furniture-detail-view>`.
- Responsabilités conservées : chargement API (`PortfolioService`), routing, story-viewer queue, contact form (projeté dans `[ctaSlot]`), hooks SEO (`Meta`/`Title`).
- Signals : `item`, `loading`, `notFound`
- Template : `<app-furniture-detail-view [item]="item()" [story]="story()" [displaySlides]="displaySlides()" [content]="content()" (viewerOpen)="onViewerOpen($event)">` + `<ng-content select="[ctaSlot]">`.

#### `ExhibitionsListComponent` (`/expositions`)
- Liste chronologique `startDate DESC`
- Pas de filtre catégorie (contrairement au mobilier)

#### `ExhibitionDetailComponent` (`/expositions/:slug`)

- Refactoré (307 → 98 lignes) — délègue le rendu à `<app-exhibition-detail-view>`.
- Responsabilités conservées : chargement API (`PortfolioService`), routing, story-viewer queue, hooks SEO (`document.title`).
- Signals : `item`, `loading`, `notFound`
- Template : `<app-exhibition-detail-view [item]="item()" [story]="story()" [displaySlides]="displaySlides()" [content]="content()" (viewerOpen)="onViewerOpen($event)">`.

#### `StudioComponent` (`/studio`)
- Affiche `Profile` : bio, presse, distinctions, email, localisation

#### `LoginComponent` (`/login`)
- Formulaire réactif (username + password), `ReactiveFormsModule`
- Appelle `AuthService.login()` → redirige vers `/admin` en cas de succès
- Affiche un message d'erreur sur 401

#### `CreationsComponent` (`/creations`)
- Charge mobilier + expositions en parallèle via `forkJoin`
- Filtre type (Tout / Mobilier / Expositions), années, tags — union OR
- Facettes calculées en `signal`/`computed`, compteurs dynamiques par facette
- Synchronisation des filtres dans les query params (`?tags=&years=&kind=`) pour le deep-linking
- Clic sur un tag dans une carte active directement le filtre correspondant

#### `HomeComponent` (`/`)

- Refactoré (200 → 78 lignes) — délègue le rendu à `<app-home-view>`.
- Responsabilités conservées : chargement API (`PortfolioService.getHome()`), `<app-story-viewer>` toplevel conditionnel sur `viewerQueue`, hooks SEO.
- Template : `<app-home-view [data]="data()" [content]="content()" (storyOpen)="openStoryFromSlider($event)" (viewerOpen)="onViewerOpen($event)">`.

#### `AdminLayoutComponent` + sous-pages admin (`/admin/**`)
- Protégé par `authGuard` — redirige vers `/login` si non authentifié
- Navigation latérale : Accueil · Mobilier · Expositions · Navigation · Médiathèque · Textes · Typographie · Statistiques · Paramètres
- `/admin/sliders` redirige vers `/admin/accueil` (sliders fusionnés dans la page Accueil)

#### `AccueilComponent` (`/admin/accueil`) — WYSIWYG preview

- **Squelette WYSIWYG** : délégué à `<app-admin-preview-shell>` (§5.5) — mode-bar tablist, panel form hors-écran, toolbar ⤢, plein écran. Inputs : `[(viewMode)]="accueilViewMode"`, pas de bouton 💾 (auto-save, `showSave` absent).
- **Handlers preview** (feed + textes hero) :
  - `onPreviewFeedReorder(order)` — préserve les items exclus lors du réordonnancement, PUT `/api/admin/home/feed`.
  - `onPreviewFeedItemToggleInclude({ kind, slug, included })` — toggle inclusion d'un item, PUT feed.
  - `onPreviewTextFieldEdit({ key, value })` — **auto-save** immédiat via `updateContent` (pas de FormGroup, pas de bouton Enregistrer).
  - `onPreviewFeedItemCropEdit({ kind, slug })` — ouvre la modale `<app-image-crop-picker>` + sauvegarde via `PUT /api/admin/home/feed/cover-crop`.
- **Sliders in-preview** : édition des sliders depuis le preview en auto-save — `onSliderTitleEdit`/`onSliderZoneChange`/`onSliderDelete`/`onSliderCreate` (appels `updateSlider`/`deleteSlider`/`createSlider` + re-fetch `getPublicSliders`) ; composition via `<app-slider-composition-editor>` en overlay (`onSliderCompositionRequested` charge `getAllAdminStories` en lazy, `onSliderCompositionSave` → `replaceSliderStories`). Garde « une zone = un slider » sur le changement de zone.
- **Auto-save inline texte hero** : blur ou Entrée → `portfolio.updateContent({ ...this.content(), [e.key]: e.value }).subscribe(...)`. Toast « Texte sauvegardé. » sur succès, revert + toast erreur sur échec.
- **`saveFeed()`** : retourne un `Observable` (permet le chaînage lors des saves consécutifs).
- **`[formModalOpen]="cropEditOpen()"`** : Échap ferme la modale crop sans réduire le plein écran. Résiduel connu : le story-viewer ouvert depuis le preview se ferme en même temps que le plein écran sur Échap.

#### `MobilierComponent` (`/admin/mobilier`) — WYSIWYG preview

- **Squelette WYSIWYG** : délégué à `<app-admin-preview-shell>` (§5.5) — mode-bar tablist, panel form hors-écran, toolbar 💾/⤢, plein écran. Inputs : `[active]="previewActive()"`, two-way `[(viewMode)]="mobilierViewMode"`, `[showSave]="true"`, `[hidePreviewOnMobile]="true"`.
- **Handlers preview** : `focusField`/`onPreviewTextFieldEdit` (whitelist `FOCUSABLE_FIELDS` typée `EditableTextField`) et 5 handlers galerie créés via les composables `preview-page-helpers` (§5.5).
- IDs déterministes `field-title`, `field-category`, `field-material`, `field-shortDescription`, `field-description` sur les inputs/textareas pour le click-to-focus.
- **`saveFurniture()`** : recharge l'item depuis la réponse serveur (au lieu de reset du form) — préserve la fiche après save.
- **Garde-fou dirty** : sélection liste / « + Nouvelle » passent par des wrappers gardés (`confirmIfDirty`) ; les flux internes (reload post-save, suppression, `?new=1`, « Annuler ») restent sans garde. Liste latérale `inert` quand l'aperçu est en plein écran (`fullscreenChange`).
- **Undo/redo** : champ `history` (`createUndoHistory`), snapshots avant chaque opération discrète (galerie via `onBeforeMutate`, éditions inline, crop cover avec garde no-op, `imagesChange`), vidé au changement d'item, conservé après save (un undo au-delà du save re-marque dirty).
- **Tags in-preview** : `[tagSuggestions]="allTags()"` passé au preview ; `onPreviewTagsChange` → `history.record()` + `patchValue({ tags })` + `markAsDirty()` (édition des tags depuis la fiche sans repasser par le form).

#### `ExpositionsComponent` (`/admin/expositions`) — WYSIWYG preview

- **Squelette WYSIWYG** : délégué à `<app-admin-preview-shell>` (§5.5) — mode-bar tablist, panel form hors-écran, toolbar 💾/⤢, plein écran. Inputs : `[active]="previewActive()"`, two-way `[(viewMode)]="expoViewMode"`, `[showSave]="true"` (pas de `hidePreviewOnMobile`).
- **Handlers preview** : `focusField`/`onPreviewTextFieldEdit` (whitelist `FOCUSABLE_FIELDS`) et `onPreviewDateFieldEdit` (whitelist `DATE_FIELDS = {startDate, endDate}`) via `createTextFieldEditHandler`, et 5 handlers galerie via composables `preview-page-helpers` (§5.5).
- IDs déterministes `field-title`, `field-venue`, `field-city`, `field-country`, `field-startDate`, `field-endDate`, `field-curator`, `field-shortDescription`, `field-description` sur les inputs/textareas pour le click-to-focus.
- **`saveExhibition()`** : recharge l'item depuis la réponse serveur (au lieu de reset du form) — préserve la fiche après save.
- **Garde-fou dirty** : sélection liste / « + Nouvelle » passent par des wrappers gardés (`confirmIfDirty`) ; les flux internes (reload post-save, suppression, `?new=1`, « Annuler ») restent sans garde. Liste latérale `inert` quand l'aperçu est en plein écran (`fullscreenChange`).
- **Undo/redo** : champ `history` (`createUndoHistory`), snapshots avant chaque opération discrète (galerie via `onBeforeMutate`, éditions inline, crop cover avec garde no-op, `imagesChange`), vidé au changement d'item, conservé après save (un undo au-delà du save re-marque dirty).
- **Tags in-preview** : `[tagSuggestions]="allTags()"` passé au preview ; `onPreviewTagsChange` → `history.record()` + `patchValue({ tags })` + `markAsDirty()` (édition des tags depuis la fiche sans repasser par le form).

### 5.5 Composants partagés

#### `<app-furniture-detail-view>` (`FurnitureDetailViewComponent`)

Chemin : `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts`

Composant standalone purement présentation, partagé entre la page publique (`FurnitureDetailComponent`) et le preview admin (`FurniturePreviewComponent`). Aucune dépendance sur `HttpClient`, `Router` ou `PortfolioService`.

**Inputs :**

| Input | Type | Description |
| ------- | ------ | ----------- |
| `item` (required) | `Furniture \| null` | Pièce à rendre |
| `story` | `Story \| null` | Première story attachée (story-inline) |
| `displaySlides` | `DisplaySlide[]` | Slides à afficher dans le story-inline |
| `content` | `SiteContent` | Contenu CMS (styles typographiques) |
| `editable` | `boolean` | Active les overlays WYSIWYG (défaut `false`) |
| `tagSuggestions` | `string[]` | Catalogue de tags pour l'autocomplétion (mode editable) |

**Outputs :**

| Output | Type | Description |
| -------- | ------ | ----------- |
| `coverEdit` | `'crop' \| 'replace'` | Clic bouton cover (cadrer / remplacer) |
| `galleryItemEdit` | `{ index, action: 'crop' \| 'replace' \| 'remove' }` | Action sur un item galerie |
| `galleryReorder` | `number[]` | Nouvel ordre des indices après drag-reorder |
| `galleryAdd` | `void` | Clic tuile « + Ajouter une image » |
| `textFieldClick` | `EditableTextField` | Click simple → focus champ form |
| `textFieldEdit` | `{ field: EditableTextField; value: string }` | Double-clic inline → valeur validée au blur |
| `galleryItemResize` | `{ index, colSpan, rowSpan }` | Fin de resize WYSIWYG d'un item galerie |
| `viewerOpen` | `StoryItem[]` | Ouverture du story-viewer plein écran |
| `tagsChange` | `string[]` | Nouveau tableau de tags après ajout/retrait via `<app-tag-editor>` (mode editable) |

**Type exporté :** `EditableTextField = 'title' | 'category' | 'material' | 'description' | 'shortDescription'`

**Fonctionnalités mode `editable=true` :**

- Overlays hover/focus sur cover et items galerie (boutons Cadrer / Remplacer / Retirer).
- Édition inline texte : double-clic → `[attr.contenteditable]="true"` + outline accent ; blur valide + émet `textFieldEdit`.
- Click simple sur texte → émet `textFieldClick` (click-to-focus côté parent).
- Drag-reorder galerie via `ReorderableDirective` HTML5. La tuile « + Ajouter » porte `data-no-drag` pour être exclue.
- Resize WYSIWYG galerie : pastille `⤡` (bottom-right), pointer drag, badge live `N × M`, snap grid (1–3 cols × 1–4 rows). Le `[style.grid-column]` / `[style.grid-row]` est appliqué sur le `<li>` (item de grille).

#### `<app-furniture-preview>` (`FurniturePreviewComponent`)

Chemin : `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts`

Composant admin standalone qui wrap `<app-furniture-detail-view>` en mode `editable=true`. Construit un `Furniture` virtuel via un `computed` depuis le `FormGroup` + signal galerie du `MobilierComponent`.

**Pattern de réactivité :** signal interne `_formTick` incrémenté à chaque `form.valueChanges` (abonnement RxJS). `previewItem = computed(() => { _formTick(); return buildFurnitureFrom(form.getRawValue(), gallery()); })`. Cela contourne l'impossibilité d'utiliser `toSignal()` dans un `computed`.

**Inputs :**

| Input | Type | Description |
| ------- | ------ | ----------- |
| `form` (required) | `FormGroup` | Formulaire mobilier du composant parent |
| `gallery` (required) | `Signal<GalleryItem[]>` | Signal galerie du composant parent (lecture seule) |
| `story` | `Story \| null` | Story active |
| `displaySlides` | `DisplaySlide[]` | Slides story-inline |
| `content` | `SiteContent` | Contenu CMS |

**Outputs :** identiques à `FurnitureDetailViewComponent` (relayés vers `MobilierComponent`).

#### `<app-exhibition-detail-view>` (`ExhibitionDetailViewComponent`)

Chemin : `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts`

Composant standalone purement présentation, partagé entre la page publique (`ExhibitionDetailComponent`) et le preview admin (`ExhibitionPreviewComponent`). Aucune dépendance sur `HttpClient`, `Router` ou `PortfolioService`.

**Inputs :**

| Input | Type | Description |
| ------- | ------ | ----------- |
| `item` (required) | `Exhibition \| null` | Exposition à rendre |
| `story` | `Story \| null` | Première story attachée (story-inline) |
| `displaySlides` | `DisplaySlide[]` | Slides à afficher dans le story-inline |
| `content` | `SiteContent` | Contenu CMS (styles typographiques) |
| `editable` | `boolean` | Active les overlays WYSIWYG (défaut `false`) |
| `tagSuggestions` | `string[]` | Catalogue de tags pour l'autocomplétion (mode editable) |

**Outputs :**

| Output | Type | Description |
| -------- | ------ | ----------- |
| `coverEdit` | `'crop' \| 'replace'` | Clic bouton cover (cadrer / remplacer) |
| `galleryItemEdit` | `{ index, action: 'crop' \| 'replace' \| 'remove' }` | Action sur un item galerie |
| `galleryReorder` | `number[]` | Nouvel ordre des indices après drag-reorder |
| `galleryAdd` | `void` | Clic tuile « + Ajouter une image » |
| `galleryItemResize` | `{ index, colSpan, rowSpan }` | Fin de resize WYSIWYG d'un item galerie |
| `textFieldClick` | `EditableExhibitionField \| 'startDate' \| 'endDate'` | Click simple → focus champ form |
| `textFieldEdit` | `{ field: EditableExhibitionField; value: string }` | Double-clic inline → valeur validée au blur |
| `dateFieldEdit` | `{ field: 'startDate' \| 'endDate'; value: string }` | Swap input date → valeur ISO au blur |
| `viewerOpen` | `StoryItem[]` | Ouverture du story-viewer plein écran |
| `tagsChange` | `string[]` | Nouveau tableau de tags après ajout/retrait via `<app-tag-editor>` (mode editable) |

**Type exporté :** `EditableExhibitionField = 'title' | 'venue' | 'city' | 'country' | 'curator' | 'shortDescription' | 'description'`

**Fonctionnalités mode `editable=true` :**

- Overlays hover/focus sur cover et items galerie (boutons Cadrer / Remplacer / Retirer).
- **Eyebrow composite décomposé** : `venue · city, country` rendu publiquement en un seul `<span>` ; en mode editable, décomposé en 3 spans contigus + 2 séparateurs `aria-hidden`, pour que chaque champ soit cliquable/éditable individuellement. Visuellement identique au rendu public.
- Édition inline texte : double-clic → `[attr.contenteditable]="true"` + outline accent ; blur valide + émet `textFieldEdit`.
- **Édition inline dates** : double-clic sur un span date → swap visible vers `<input type="date">` (validation browser native, format ISO `yyyy-MM-dd`). Blur → `dateFieldEdit.emit(...)` ; Échap annule.
- Click simple sur texte → émet `textFieldClick` (click-to-focus côté parent).
- Drag-reorder galerie via `ReorderableDirective` HTML5. La tuile « + Ajouter » porte `data-no-drag` pour être exclue.
- Resize WYSIWYG galerie : pastille `⤡` (bottom-right), pointer drag, badge live `N × M`, snap grid (1–3 cols × 1–4 rows).

#### `<app-exhibition-preview>` (`ExhibitionPreviewComponent`)

Chemin : `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts`

Composant admin standalone qui wrap `<app-exhibition-detail-view>` en mode `editable=true`. Construit un `Exhibition` virtuel via un `computed` depuis le `FormGroup` + signal galerie de `ExpositionsComponent`.

**Pattern de réactivité :** signal interne `_formTick` incrémenté à chaque `form.valueChanges` (abonnement RxJS). `previewItem = computed(() => { _formTick(); return buildExhibitionFrom(form.getRawValue(), gallery()); })`. Ce pattern contourne l'impossibilité d'utiliser `toSignal()` dans un `computed` (identique au sous-projet 2, mobilier).

**Inputs :**

| Input | Type | Description |
| ------- | ------ | ----------- |
| `form` (required) | `FormGroup` | Formulaire exposition du composant parent |
| `gallery` (required) | `Signal<GalleryItem[]>` | Signal galerie du composant parent (lecture seule) |
| `story` | `Story \| null` | Story active |
| `displaySlides` | `DisplaySlide[]` | Slides story-inline |
| `content` | `SiteContent` | Contenu CMS |

**Outputs :** identiques à `ExhibitionDetailViewComponent` (relayés vers `ExpositionsComponent`).

#### `<app-home-view>` (`HomeViewComponent`)

Chemin : `frontend/src/app/components/home-view/home-view.component.ts`

Composant standalone purement présentation, partagé entre la page publique (`HomeComponent`) et le preview admin (`HomePreviewComponent`). Aucune dépendance sur `HttpClient`, `Router` ou `PortfolioService`.

**Type exporté :** `EditableHomeContentKey = 'home.hero.eyebrow' | 'home.hero.title' | 'home.hero.lead'`

**Inputs :**

| Input | Type | Description |
| ------- | ------ | ----------- |
| `data` (required) | `HomePageData \| null` | Données complètes de la home (feed + sliders) |
| `content` | `SiteContent` | Contenu CMS (textes hero) |
| `editable` | `boolean` | Active les overlays WYSIWYG (défaut `false`) |

**Outputs :**

| Output | Type | Description |
| -------- | ------ | ----------- |
| `feedReorder` | `number[]` | Nouvel ordre des indices du feed après drag-reorder |
| `feedItemToggleInclude` | `{ kind: 'furniture' \| 'exhibition'; slug: string; included: boolean }` | Toggle inclusion d'un item |
| `textFieldEdit` | `{ key: EditableHomeContentKey; value: string }` | Double-clic inline → valeur auto-save au blur |
| `feedItemCropEdit` | `{ kind: 'furniture' \| 'exhibition'; slug: string }` | Clic overlay crop d'une card |
| `sliderTitleEdit` | `{ id: string; title: string }` | Blur après édition inline du titre d'un slider |
| `sliderCompositionRequested` | `string` | Clic bouton « Composer » → ouvre l'éditeur de composition en overlay |
| `sliderDelete` | `string` | Clic bouton `×` → suppression du slider |
| `sliderZoneChange` | `{ id: string; zoneKey: 'home-top' \| 'home-middle' \| 'home-bottom' }` | Changement de zone via sélecteur |
| `sliderCreate` | `'home-top' \| 'home-middle' \| 'home-bottom'` | Clic placeholder « + Créer un slider ici » sur zone vide |
| `storyOpen` | `SliderStoryRef` | Ouverture d'une story depuis un slider |
| `viewerOpen` | `StoryItem[]` | Ouverture du story-viewer plein écran |

**Fonctionnalités mode `editable=true` :**

- **Hero texts** : hover → outline dashed sur eyebrow/title/lead ; double-clic → `[attr.contenteditable]="true"` + outline accent, blur émet `textFieldEdit`.
- **Feed cards** : rendu en `<li>` (pas de `RouterLink`) + overlay hover avec checkbox Inclus et pastille drag `⋮⋮`. Cards exclues en opacité 0.35 + badge « Exclu ». Overlay crop card émet `feedItemCropEdit`.
- **Drag-reorder feed** : `ReorderableDirective` HTML5 sur les cards, drop émet `feedReorder`.
- **News-sliders** : barre d'édition par slider (titre éditable inline, bouton Composer, sélecteur de zone, bouton `×` supprimer) ; zone vide → placeholder « + Créer un slider ici » émettant `sliderCreate`. Rendu public (carrousels `<app-news-slider>`) inchangé — aucune affordance en mode non-editable.

#### `<app-home-preview>` (`HomePreviewComponent`)

Chemin : `frontend/src/app/pages/admin/accueil/preview/home-preview.component.ts`

Composant admin standalone qui wrap `<app-home-view>` en mode `editable=true`. Reçoit les données directement sous forme de `Signal<T>` — **pas de `FormGroup`**, différence fondamentale avec les sous-projets 2 et 3.

**Inputs :**

| Input | Type | Description |
| ------- | ------ | ----------- |
| `data` (required) | `Signal<HomePageData \| null>` | Signal données home du composant parent |
| `content` | `Signal<SiteContent>` | Signal contenu CMS du composant parent |

**Outputs :** identiques aux Outputs de `HomeViewComponent` (relayés vers `AccueilComponent`).

**Pattern de réactivité :** pas de tick intermédiaire (contrairement à FurniturePreviewComponent / ExhibitionPreviewComponent) — les Inputs sont des Signals consommés directement dans le template via `data()` et `content()`.

#### `<app-tag-editor>` (`TagEditorComponent`)

Chemin : `frontend/src/app/components/tag-editor/tag-editor.component.ts`

Éditeur de tags présentation pur (combobox a11y : listbox, flèches ↑/↓, Enter/virgule pour ajouter, Backspace pour retirer le dernier, Échap, chips supprimables, autocomplétion filtrée). Aucune dépendance Router/HttpClient/forms (ADR-0018). Inputs : `tags`, `suggestions`, `disabled`, `placeholder`, `ariaLabel`. Output : `tagsChange` (tableau neuf immutable). Consommé par `<app-tag-input>` (wrapper CVA form-side) et par les vues détail mobilier/exposition en mode editable (édition des tags in-preview).

#### `<app-tag-input>` (`TagInputComponent`)

Chemin : `frontend/src/app/pages/admin/shared/tag-input.component.ts`

- Wrapper `ControlValueAccessor` autour de `<app-tag-editor>` — toute la logique combobox/a11y vit dans `<app-tag-editor>` ; ce composant gère uniquement le contrat CVA (intégration `ReactiveFormsModule`).
- `writeValue` alimente le signal interne `value` ; `onEditorChange` met à jour `value` + notifie le form via `onChangeFn`/`onTouchedFn`.
- `@Input() suggestions: string[]` — liste d'autocomplétion injectée par le parent (ex. résultat de `GET /api/tags`).

#### `<app-slider-composition-editor>` (`SliderCompositionEditorComponent`)

Chemin : `frontend/src/app/pages/admin/shared/slider-composition-editor.component.ts`

Modale de composition d'un slider d'actualités (liste « disponibles » filtrable + sélection, liste « composition courante » réordonnable ↑↓ + retrait). Extraite de `SlidersComponent` pour être partagée entre l'éditeur form-side et le preview accueil. Inputs : `sliderId`, `title`, `storyIds`, `allStories`. Outputs : `save` (liste d'ids ordonnée), `cancel`. La persistance (`replaceSliderStories`) est faite par le consommateur. Réinitialise sa composition pendante uniquement quand `sliderId` change (pas à chaque référence de `storyIds`), pour ne pas écraser les modifications en cours. Modale `role=dialog` + `aria-modal` + `cdkTrapFocus`.

#### `<app-image-crop-picker>` (`ImageCropPickerComponent`)

Chemin : `frontend/src/app/pages/admin/shared/image-crop-picker.component.ts`

- Modale de cadrage d'image wrappant **Cropper.js 1.6.2** (voir ADR-0017).
- Présets aspect ratio : **16:9 / 4:5 / 1:1 / Libre** (sélection par défaut : Libre).
- Fermeture par touche Échap ; détection automatique de l'aspect du crop existant à la réouverture ; destroy + recreate du cropper à chaque changement de préset.
- Retourne un objet `Crop { x, y, w, h }` en coordonnées normalisées (% 0–100).
- CSS focus override dans le backdrop : `.crop-backdrop :focus-visible { outline-color: #fff }` pour lisibilité sur fond sombre.
- Instanciation manuelle dans `ngAfterViewInit`, cleanup dans `ngOnDestroy` (pas de wrapper Angular maintenu pour Cropper.js).

#### `<app-cropped-image-canvas>` (`CroppedImageCanvasComponent`)

Chemin : `frontend/src/app/pages/admin/shared/cropped-image-canvas.component.ts`

- Rendu pixel-perfect d'une image cadrée via `<canvas>` + `drawImage()`.
- Deux modes :
  - `adaptive` — le canvas adapte sa largeur à l'aspect du crop (preview unique).
  - `cover` — canvas à taille fixe CSS avec cover-fit (grille de vignettes).
- Utilise `ResizeObserver` (mode cover) et un cache d'image en mémoire.
- `role="img"` + `aria-label` pour l'accessibilité ; `crossOrigin="anonymous"` pour éviter le canvas tainted.

#### `<app-image-field>` (extension)

Chemin : `frontend/src/app/pages/admin/shared/image-field.component.ts`

- Étendu avec le flag `cropEnabled` : affiche un bouton **Cadrer** ouvrant `<app-image-crop-picker>`.
- Prévisualisation du crop courant via `<app-cropped-image-canvas>`.

#### `<app-gallery-editor>` (extension)

Chemin : `frontend/src/app/pages/admin/shared/gallery-editor.component.ts`

- Bouton ✂ par vignette pour ouvrir le cadrage individuel d'un item de galerie.
- Indicateur visuel de crop présent ; preview canvas via `<app-cropped-image-canvas>`.

#### `<app-story-viewer>` (`StoryViewerComponent`)

Chemin : `frontend/src/app/components/story-viewer/story-viewer.component.ts`

- Modale plein écran pour visionner les slides d'une story.
- Focus trap à l'ouverture (RGAA B-02) ; fermeture par touche Échap ou bouton Fermer ; restore focus sur l'élément déclencheur à la fermeture.
- Navigation tactile (swipe) et clavier (flèches gauche/droite).
- Réutilisable depuis `HomeComponent` (sliders d'actualités), fiches mobilier et fiches exposition.

#### `<app-admin-preview-shell>` (`AdminPreviewShellComponent`)

Chemin : `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts`

Squelette partagé des 3 pages admin à preview WYSIWYG (accueil, mobilier, expositions). Possède : mode-bar `role=tablist` (✏/👁), panel form `#panel-form` projeté par `ng-content` (maintenu hors-écran `is-hidden` + `inert` en mode preview — préserve les `ViewChild` et les modales `position: fixed`), panel preview `#panel-preview` rendu par `ngTemplateOutlet` d'un `<ng-template shellPreview>` (directive marqueur `ShellPreviewDirective`, détruit/recréé au toggle), toolbar (💾 si `showSave`, ⤢/⤡), plein écran (`role=dialog` + `aria-modal` + `cdkTrapFocus`, z-index 1200), CSS partagé + media queries. Stack z-index : preview fullscreen 1200 · photo picker 1300 · crop picker 1400.

Clavier & annonces (sous-projet 2/6) : tablist au pattern APG (roving tabindex, flèches ←/→ cycliques + Home/End, activation automatique) ; Ctrl+S/Cmd+S émet `save` quand `showSave` (preventDefault systématique ; neutralisé si `formModalOpen`) ; Échap réduit le plein écran et rend le focus au bouton ⤢ (inactif si `formModalOpen`) ; quitter le mode preview réinitialise le plein écran (pas de mode-bar inert fantôme) ; mode-bar `inert` en plein écran ; `aria-controls` du tab Aperçu conditionnel au panel rendu ; annonces `LiveAnnouncer` : « Mode aperçu/édition », « Aperçu plein écran/réduit ». Undo/redo (sous-projet 3/6) : Ctrl+Z → `undoRequested`, Ctrl+Shift+Z ou Ctrl+Y → `redoRequested`, uniquement si `historyEnabled`, hors modale (`formModalOpen`) et hors champ de saisie (input/textarea/contenteditable : l'undo natif du navigateur prime).

| Membre | Type | Description |
| --- | --- | --- |
| `active` | input `boolean` (défaut `true`) | Affiche mode-bar et panel preview (item en édition) |
| `modeBarAriaLabel` / `formTabLabel` / `previewDialogLabel` | input `string` requis | Libellés par page |
| `showSave` / `saveDisabled` / `saving` | input `boolean` | Bouton 💾 toolbar |
| `hidePreviewOnMobile` | input `boolean` | Préserve le comportement mobilier (preview masqué ≤768px) |
| `formModalOpen` | input `boolean` | Suspend l'`inert` du panel form tant qu'une modale form-side (photo/crop picker, descendante DOM du panel) est ouverte — sinon elle est infocusable/incliquable. Alimenté par `coverField.modalOpen() \|\| galleryEditor.modalOpen()` (mobilier/expo) |
| `viewMode` | `model<'form' \| 'preview'>` | Two-way avec le signal de la page |
| `save` | output `void` | Clic 💾 |
| `fullscreenChange` | output `boolean` | Entrée/sortie plein écran — les pages rendent `inert` leur liste latérale |
| `historyEnabled` / `canUndo` / `canRedo` | input `boolean` | Boutons ↶/↷ + raccourcis Ctrl+Z/Ctrl+Y (mobilier/expo ; accueil sans historique) |
| `undoRequested` / `redoRequested` | output `void` | Clic ↶/↷ ou raccourci clavier |

#### Composables `preview-page-helpers.ts`

Chemin : `frontend/src/app/pages/admin/shared/preview-page-helpers.ts`

- `formTickSignal(form, destroyRef)` — tick signal sur `valueChanges` (remplace le pattern `_formTick` dupliqué — pages mobilier/expositions et composants preview).
- `createFieldFocus(whitelist)` — click-to-focus avec guard whitelist (généralisé à mobilier, qui ne l'avait pas).
- `createTextFieldEditHandler(form, whitelist)` — patch + markAsDirty derrière whitelist (sert aussi `onPreviewDateFieldEdit` expo avec whitelist `{startDate, endDate}`).
- `createGalleryPreviewHandlers({gallery, galleryEditor, coverField})` — les 5 handlers galerie communs mobilier/expo (getters pour les ViewChild, interfaces structurelles `GalleryEditorLike`/`CoverFieldLike`).
- `confirmIfDirty(form, message)` — garde-fou perte de saisie (wrappers UI `onSelectFurniture`/`onNewFurniture` et équivalents expo ; `markAsPristine()` après save réussi).
- Options `onMutate` (markAsDirty sur remove/reorder/resize galerie) et `announcer` (annonces SR reorder/resize, pluriel accordé ; reorder = heuristique « plus grand déplacement », ±1 sur déplacement adjacent) de `createGalleryPreviewHandlers`.
- `createUndoHistory({capture, restore, limit=50, announcer})` — historique undo/redo à snapshots (piles bornées FIFO, signaux `canUndo`/`canRedo`, annonces « Action annulée/rétablie »). Consommé par mobilier/expo : snapshot `{form, gallery}`, restore = patchValue + set + markAsDirty.
- Option `onBeforeMutate` de `createGalleryPreviewHandlers` (avant remove/reorder/resize) et `createTextFieldEditHandler` (avant patch, avec garde anti-bruit : blur sans modification = no-op complet) — point d'enregistrement de l'historique.

### 5.6 Utilitaires frontend

#### `ReorderableDirective` (`frontend/src/app/directives/reorderable.directive.ts`)

Directive standalone `[appReorderable]` : active le drag-reorder HTML5 sur les enfants d'un conteneur. Output `(reordered)` émet le tableau d'indices dans le nouvel ordre. Les enfants portant `data-no-drag` (ex. tuile « + Ajouter ») sont exclus du drag et de l'ordre émis.

Feedback visuel (sous-projet 2/6) : classe `reorder-dragging` sur la source, `reorder-drag-over` sur la cible (compteur dragenter/dragleave), animation FLIP au drop (~180 ms, garde anti-rects périmés 300 ms, désactivée par `prefers-reduced-motion`), styles globaux dans `styles.css`.

#### `cropTransform()` (`frontend/src/app/utils/crop-transform.ts`)

Calcule les propriétés CSS (`object-position`, `transform`) pour simuler un cadrage via une `<img>` + CSS. Utilisé sur les composants dont le conteneur a un aspect ratio proche du crop (`story-viewer` slides, `news-slider` thumbs). Les composants de rendu principal (hero `furniture-detail`, `exhibition-detail`, masonry `home`) utilisent désormais `<app-cropped-image-canvas>` (rendu canvas pixel-perfect).

---

## 6. Infrastructure & déploiement

### 6.1 Images Docker

#### Backend (`backend/Dockerfile`)
```
Build  : maven:3.9-eclipse-temurin-25
Runtime: eclipse-temurin:25-jre-alpine
```
- Utilisateur non-root `app`
- `entrypoint.sh` : parse `DATABASE_URL` (format Railway) → variables JDBC
- Healthcheck : `wget /actuator/health | grep UP`
- Port exposé : `8080`

#### Frontend (`frontend/Dockerfile`)
```
Build  : node:20-alpine
Runtime: nginx:1.27-alpine
```
- Variables d'environnement runtime (substitution par `envsubst`) :
  - `PORT=80` (port d'écoute nginx)
  - `BACKEND_HOST=overflowing-stillness.railway.internal` ← **défaut Railway**
  - `BACKEND_PORT=8080`
  - `NGINX_ENVSUBST_FILTER='^(PORT|BACKEND_HOST|BACKEND_PORT)$'`
- **Surcharge obligatoire en local :** `BACKEND_HOST=backend` (nom du service Docker Compose)
- Healthcheck : `wget http://localhost:${PORT}/`
- Port exposé : `80`

> **Point d'attention :** Le défaut `BACKEND_HOST` dans l'image est l'hôte Railway.
> Dans `docker-compose.yml` (root) et `deploy/base/docker-compose.yml`, il est surchargé par `BACKEND_HOST: backend`.

### 6.2 Docker Compose — développement local (build depuis les sources)

**Fichier :** `docker-compose.yml` (racine)

```yaml
# Variables critiques backend
PGHOST: postgres
PGPORT: "5432"
PGDATABASE: portfolio
PGUSER: portfolio
PGPASSWORD: portfolio

# Variables critiques frontend
PORT: "80"
BACKEND_HOST: backend
BACKEND_PORT: "8080"
```

Ports hôte : backend `8080`, frontend `4200`, postgres `5432`.

**Lancement :**
```powershell
docker compose build --no-cache
docker compose up -d
```

### 6.3 Docker Compose — déploiement image-based (Rancher / Railway)

**Fichier :** `deploy/base/docker-compose.yml`

Images pré-construites via variables d'environnement :
```
BACKEND_IMAGE=ghcr.io/guillaumemaxime-boop/portfolio-backend:<sha>
FRONTEND_IMAGE=ghcr.io/guillaumemaxime-boop/portfolio-frontend:<sha>
BACKEND_PORT=8080
FRONTEND_PORT=4200
POSTGRES_DB=portfolio
POSTGRES_USER=portfolio
POSTGRES_PASSWORD=portfolio
```

**Env file local :** `deploy/envs/local/.env` (mis à jour automatiquement par le pipeline CI).

### 6.4 Environnements

| Env | Compose | Env file | Déclencheur | Images | Ports |
|-----|---------|----------|-------------|--------|-------|
| **Local (dev)** | `docker-compose.yml` | — | Manuel | Build local | 8080 / 4200 |
| **Local (Rancher)** | `deploy/base/docker-compose.yml` | `envs/local/.env` | Push `deploy/envs/local/**` | GHCR `:<sha>` | 8080 / 4200 |
| **Staging** | Railway | `envs/staging/` | Push `deploy/envs/staging/versions.yaml` | GHCR `:staging` | Railway |
| **Production** | Railway | `envs/production/` | PR + approbation env `production` | GHCR `:production` | Railway |

### 6.5 Source of truth des versions

**`deploy/envs/<env>/versions.yaml` :**
```yaml
backend:
  tag: "9fc95bbce3d5"   # SHA Git 12 chars
frontend:
  tag: "9fc95bbce3d5"
```

Les tags flottants (`:staging`, `:production`) pointent vers le SHA de `versions.yaml`. Tags immuables = rollback simple par revert du commit de bump.

---

## 7. Pipeline CI/CD

### 7.1 Flux complet

```
push → main (code source)
   │
   ├─ backend-tests.yml   ─┐
   └─ frontend-tests.yml  ─┴─► build-and-deploy.yml
                                    │
                               build & push GHCR
                               :latest + :<sha>
                                    │
                               bump versions.yaml staging + local
                               commit "[skip ci]"
                                    │
                         sync-staging.yml  (déclenché par bump)
                               ├─ retag :<sha> → :staging
                               └─ railway redeploy staging
                                    │
                         [Manuel] PR : staging/versions.yaml → production/versions.yaml
                                    │
                         sync-production.yml  (env "production", approbation requise)
                               ├─ retag :<sha> → :production
                               └─ railway redeploy production

push → deploy/envs/local/**
   │
   └─ sync-rancher.yml  (runner self-hosted rancher-desktop)
         └─ docker compose pull + up -d
```

### 7.2 Workflows

| Fichier | Déclencheur | Runner | Rôle |
|---------|-------------|--------|------|
| `build-and-deploy.yml` | push main (hors docs/deploy) | ubuntu-latest | Tests → build images → bump versions |
| `backend-tests.yml` | push backend/, appelé en reusable | ubuntu-latest | `mvn clean test` + rapport JaCoCo |
| `frontend-tests.yml` | push frontend/, appelé en reusable | ubuntu-latest | `ng test --headless` + coverage |
| `sync-staging.yml` | push staging/versions.yaml | ubuntu-latest | retag GHCR + railway redeploy |
| `sync-production.yml` | push production/versions.yaml | ubuntu-latest | retag GHCR + railway redeploy (gated) |
| `sync-rancher.yml` | push deploy/base/ ou deploy/envs/local/** | `self-hosted, rancher-desktop` | docker compose pull + up |

### 7.3 Secrets & variables requis

| Nom | Portée | Utilisé par |
|-----|--------|-------------|
| `GITHUB_TOKEN` | auto | push GHCR, commit bump |
| `RAILWAY_TOKEN_STAGING` | repo secrets | sync-staging |
| `RAILWAY_TOKEN_PRODUCTION` | env `production` | sync-production |
| `RAILWAY_SERVICE_BACKEND_STAGING` | repo vars | sync-staging |
| `RAILWAY_SERVICE_FRONTEND_STAGING` | repo vars | sync-staging |
| `RAILWAY_SERVICE_BACKEND_PRODUCTION` | env `production` vars | sync-production |
| `RAILWAY_SERVICE_FRONTEND_PRODUCTION` | env `production` vars | sync-production |

### 7.4 Rollback

Revenir à une version précédente = revert du commit de bump dans `versions.yaml`.
Le workflow de sync correspondant se re-déclenche avec l'ancien SHA.
L'image immutable est encore disponible sur GHCR.

---

## 8. Guide développeur

### 8.1 Prérequis

| Outil | Version minimale |
|-------|-----------------|
| JDK (Eclipse Temurin) | 25 |
| Maven | 3.9 |
| Node.js | 20 |
| npm | 10 |
| Docker Desktop / Rancher Desktop | tout récent |
| Git | — |

### 8.2 Lancer en local (sans Docker)

**Backend :**
```powershell
# Démarrer PostgreSQL (ou utiliser Docker)
docker run -d --name portfolio-pg -e POSTGRES_DB=portfolio -e POSTGRES_USER=portfolio -e POSTGRES_PASSWORD=portfolio -p 5432:5432 postgres:16-alpine

cd backend
./mvnw spring-boot:run
# API disponible sur http://localhost:8080
```

**Frontend :**
```powershell
cd frontend
npm install
npm start
# App disponible sur http://localhost:4200
# /api proxifié automatiquement vers localhost:8080 (proxy.conf.json)
```

### 8.3 Lancer avec Docker Compose (build local)

```powershell
# Depuis la racine du projet
docker compose build --no-cache   # Build des images
docker compose up -d              # Démarrage en arrière-plan
docker compose logs -f            # Suivi des logs
docker compose down               # Arrêt (données conservées)
docker compose down -v            # Arrêt + suppression du volume postgres
```

### 8.4 Déployer sur Rancher Desktop (images GHCR)

```powershell
# Connexion au registry (token GitHub avec read:packages)
docker login ghcr.io -u <username> --password-stdin

# Pull et démarrage avec les dernières images locales
docker compose -f deploy/base/docker-compose.yml --env-file deploy/envs/local/.env pull
docker compose -f deploy/base/docker-compose.yml --env-file deploy/envs/local/.env up -d --remove-orphans
```

Ou pousser un commit sur `deploy/envs/local/**` pour déclencher `sync-rancher.yml` automatiquement (runner self-hosted requis — voir `scripts/setup-rancher-runner.ps1`).

### 8.5 Configurer le runner self-hosted Rancher

```powershell
# Script d'installation du runner GitHub Actions
./scripts/setup-rancher-runner.ps1
```

Le runner doit être taggé `self-hosted, rancher-desktop` dans les paramètres du dépôt GitHub.

### 8.6 Configuration de l'application

**Variables d'environnement backend :**

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PGHOST` | `localhost` | Hôte PostgreSQL |
| `PGPORT` | `5432` | Port PostgreSQL |
| `PGDATABASE` | `portfolio` | Nom de la base |
| `PGUSER` | `portfolio` | Utilisateur |
| `PGPASSWORD` | `portfolio` | Mot de passe |
| `DATABASE_URL` | — | Alternative Railway-style (parsé par `entrypoint.sh`) |
| `JWT_SECRET` | — | Clé HMAC-SHA384 (obligatoire) |
| `JWT_EXPIRATION_MS` | `86400000` | Durée de vie du token JWT (ms) — défaut 24h |
| `ADMIN_USERNAME` | — | Identifiant de l'administrateur |
| `ADMIN_PASSWORD_HASH` | — | Hash bcrypt du mot de passe admin |

**Variables d'environnement frontend (runtime nginx) :**

| Variable | Défaut image | Valeur locale | Description |
|----------|-------------|---------------|-------------|
| `PORT` | `80` | `80` | Port d'écoute nginx |
| `BACKEND_HOST` | `overflowing-stillness.railway.internal` | `backend` | Hôte du backend |
| `BACKEND_PORT` | `8080` | `8080` | Port du backend |

### 8.7 Migrations Liquibase

Les migrations se jouent automatiquement au démarrage du backend.
Pour ajouter une migration :

1. Créer `backend/src/main/resources/db/changelog/changes/00N-description.yaml`
2. Référencer dans `db.changelog-master.yaml`
3. Redémarrer l'application

---

## 9. Tests

### 9.1 Backend (JUnit 5 + H2)

```powershell
cd backend
mvn clean test                    # Tests + rapport JaCoCo
mvn clean verify                  # Idem + vérification seuils coverage
```

- Base de données : H2 in-memory (scope test)
- Rapports : `target/surefire-reports/`, `target/site/jacoco/`
- Objectif coverage : **≥ 80 %**
- Tests : `controller/*ControllerTest.java`, `service/*ServiceTest.java`, `model/*Test.java`

**Tests d'intégration crop (ajoutés en 028) :**

- `SecurityIntegrationTest.postFurniture_coverCropHorsBornes_retourne400()` — vérifie qu'un `coverCrop` avec valeurs > 100.0 retourne 400.
- `SecurityIntegrationTest.postFurniture_galleryItemCropHorsBornes_retourne400()` — vérifie qu'un crop de galerie hors bornes retourne 400.

### 9.2 Frontend (Jasmine + Karma)

```powershell
cd frontend
npm test                                              # Watch mode
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage  # CI
```

- Rapports : `frontend/coverage/`
- Fichiers de test : `*.spec.ts` pour chaque composant/service

### 9.3 Intégration continue

Les deux suites de tests sont obligatoires avant le build des images (`build-and-deploy.yml`).
Un échec de test bloque la publication sur GHCR.

---

## 10. Décisions d'architecture (ADR)

Les ADR sont dans `docs/adr/`. Format : `NNNN-titre.md`.

| ADR | Titre |
|-----|-------|
| 0001 | Utiliser des ADR |
| 0002 | Architecture full-stack séparée |
| 0003 | Backend Spring Boot |
| 0004 | Frontend Angular — standalone & signaux |
| 0005 | Données en mémoire (état initial) |
| 0006 | Conteneurisation Docker + Rancher Desktop |
| 0007 | CI GitHub Actions — workflows réutilisables |
| 0008 | Stratégie de tests |
| 0009 | CORS en développement local |
| 0010 | Supervision et monitoring |
| 0011 | Authentification JWT admin |
| 0012 | Mesure d'audience Umami |
| 0013 | Configuration SMTP en base chiffrée (superseded) |
| 0014 | Bascule vers Resend pour les mails transactionnels |
| 0015 | Stories multiples par owner + sliders d'actualités |
| 0016 | Tags partagés mobilier/exposition et page publique /creations |
| 0017 | Cropper.js pour l'outil de cadrage d'image admin |
| 0018 | Pattern page/view — composants de rendu partagés entre page publique et preview admin |

---

## Historique des révisions

| Version | Date | Modifications |
|---------|------|---------------|
| 1.0.0 | 01/05/2026 | Spécification fonctionnelle initiale (Atelier Lumen) |
| 2.0.0 | 04/05/2026 | Refonte complète — spécification technique synchronisée avec l'implémentation réelle (rebrand Milo GUILLAUME Design, stack Java 25 / Angular 21, pipeline CI/CD GitOps, infrastructure Railway + Rancher) |
| 2.1.0 | 11/05/2026 | Authentification JWT (AuthController, SecurityConfig, authGuard, authInterceptor, LoginComponent) · Suppression lien Admin du menu · Correction CORS (`127.0.0.1:4200`) · ADR-0011 ajouté |
| 2.2.0 | 07/06/2026 | Stories multiples par owner + sliders d'actualités (ADR-0015) · Tags sur mobilier + page `/creations` (ADR-0016) · Nouveaux endpoints `/api/tags`, `/api/sliders`, `/api/stories`, `/api/admin/sliders/**`, `/api/admin/stories/**` · Schéma BDD : tables `story`, `story_slide` refactorisé, `news_slider`, `slider_story`, `furniture_tag` · Composants partagés `TagInputComponent` et `StoryViewerComponent` · Route `/creations` · ADR-0012 à 0016 ajoutés à la table |
| 2.3.0 | 08/06/2026 | Outil de cadrage d'image — sous-projet 1/4 (ADR-0017) · Changeset 028 : DROP `cover_focal_x/y`, ADD `cover_crop_x/y/w/h` sur `furniture`/`exhibition`/`story`, ADD `crop_x/y/w/h` sur `furniture_gallery`/`exhibition_gallery` · Breaking change DTO : `gallery` passe de `List<String>` à `List<GalleryImage>` · Nouveaux records `ImageCrop`, `GalleryImage` + `@Valid` cascade · Nouveaux composants admin `ImageCropPickerComponent` (Cropper.js 1.6.2), `CroppedImageCanvasComponent` ; extensions `ImageFieldComponent`, `GalleryEditorComponent` · Utilitaire `cropTransform()` · Interfaces TS `Crop`, `GalleryItem` · Stack : ajout Cropper.js 1.6.2 |
| 2.4.0 | 08/06/2026 | Preview WYSIWYG fiche mobilier — sous-projet 2/4 (ADR-0018) · Changeset 029 : ADD `col_span`/`row_span` sur `furniture_gallery` et `exhibition_gallery` · Pattern page/view : `FurnitureDetailViewComponent` extrait, `FurniturePreviewComponent` créé · `FurnitureDetailComponent` refactoré (375 → 137 lignes) · `MobilierComponent` toggle Modifier/Aperçu, form hors-écran, click-to-focus, handlers preview, `saveFurniture()` reload · ADR-0018 ajouté |
| 2.5.0 | 09/06/2026 | Preview WYSIWYG fiche exposition — sous-projet 3/4 (ADR-0018) · Pattern page/view appliqué à exhibition-detail : `ExhibitionDetailViewComponent` extrait, `ExhibitionPreviewComponent` créé · `ExhibitionDetailComponent` refactoré (307 → 98 lignes) · `ExpositionsComponent` toggle Modifier/Aperçu, form hors-écran, 9 IDs `field-*`, handlers preview dont `onPreviewDateFieldEdit`, `saveExhibition()` reload · Eyebrow composite décomposé (3 spans + 2 séparateurs ARIA-hidden en mode editable) · Édition inline dates via swap `<input type="date">` · Type `EditableExhibitionField`, Output `dateFieldEdit` |
| 2.6.0 | 09/06/2026 | Preview WYSIWYG accueil — sous-projet 4/4, clôture chantier (ADR-0018) · Changeset 030 : ADD `cover_crop_x/y/w/h` DOUBLE PRECISION nullable sur `home_feed` · `HomeFeedEntryEntity` étendu (4 champs + getters/setters) · `HomeFeedService.setCoverCrop` (@Transactional + @CacheEvict) + `replace` préserve les coverCrops existants via snapshot · `HomeService.buildFeedItem` : override coverCrop home si défini, sinon fallback fiche source · Endpoint `PUT /api/admin/home/feed/cover-crop` + DTO `HomeFeedCoverCropRequest(kind, slug, crop)` · `HomeFeedRepository.findByKindAndRefSlug` ajouté · Pattern page/view appliqué à home : `HomeViewComponent` extrait, `HomePreviewComponent` créé · `HomeComponent` refactoré (200 → 78 lignes) · `AccueilComponent` toggle Modifier/Aperçu, handlers preview (`onPreviewFeedReorder`, `onPreviewFeedItemToggleInclude`, `onPreviewTextFieldEdit`, `onPreviewFeedItemCropEdit`, `onSliderEditRequested`) · **Auto-save inline** texte hero (pas de FormGroup, PUT `updateContent` immédiat) · Pas de bouton 💾 dans toolbar preview · Cartouche `[i]` sliders navigation cross-mode · `saveFeed()` retourne Observable · `PortfolioService.updateHomeFeedCoverCrop` ajouté · Type `EditableHomeContentKey`, 7 Outputs `HomeViewComponent` |
| 2.7.0 | 10/06/2026 | Socle factorisé previews WYSIWYG (chantier v2, sous-projet 1/6) : `<app-admin-preview-shell>` + composables `preview-page-helpers` · migration accueil/mobilier/expositions · whitelist focus généralisée à mobilier · previews adoptent `formTickSignal` |
| 2.8.0 | 11/06/2026 | UX socle + a11y previews WYSIWYG (chantier v2, sous-projet 2/6) : garde-fou dirty (`confirmIfDirty` + pristine post-save) · Ctrl+S · roving tabindex APG · Échap plein écran + restitution focus · reset fullscreen hors preview · mode-bar/liste `inert` en fullscreen · annonces `LiveAnnouncer` (mode, fullscreen, galerie) · drag-reorder : classes + FLIP + reduced-motion · `formModalOpen` accueil |
| 2.9.0 | 11/06/2026 | Undo/redo previews WYSIWYG (chantier v2, sous-projet 3/6) : `createUndoHistory` (snapshots form+galerie, limite 50) · option `onBeforeMutate` des composables · boutons ↶/↷ + Ctrl+Z/Ctrl+Y dans le shell (undo natif préservé dans les champs) · annonces SR « Action annulée/rétablie » · garde anti-bruit blur sans modification |
| 2.10.0 | 13/06/2026 | Tags éditables in-preview (chantier v2, sous-projet 4/6) : extraction `<app-tag-editor>` pur (combobox partagé), `<app-tag-input>` devient wrapper CVA, édition des tags dans les previews mobilier/exposition avec autocomplétion + undo/redo |
| 2.11.0 | 13/06/2026 | Sliders éditables in-preview accueil (chantier v2, sous-projet 5/6) : extraction `<app-slider-composition-editor>` (partagé form-side + preview), édition des sliders depuis le preview (titre, composition, créer/supprimer/zone) en auto-save, garde « une zone = un slider » |
