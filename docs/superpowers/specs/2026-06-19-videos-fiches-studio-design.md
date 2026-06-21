# Vidéos dans les fiches (mobilier/exposition) et le Studio — Spec

**Date** : 2026-06-19
**Statut** : ✅ Implémenté — mergé sur main (ADR-0019)
**Type** : Feature standalone (backlog, demandée le 13/06/2026).

## Objectif

Permettre d'attacher **une vidéo (optionnelle)** à une fiche mobilier, une fiche exposition et à la page Studio. Vidéos **auto-hébergées** (fichier `.mp4`/`.webm` uploadé), rendues via un lecteur HTML natif `<video>`, avec **poster** (image d'affiche) et **sous-titres** (`.vtt`) optionnels. Affichage dans un **bloc dédié sous la galerie** (fiches) et dans un bloc dédié sur le Studio.

## Décisions de cadrage (validées)

| Sujet | Choix retenu | Écarté |
| --- | --- | --- |
| Source/hébergement | **Auto-hébergé** (upload `.mp4`/`.webm`) | Embed YouTube/Vimeo ; URL externe |
| Cardinalité | **Une vidéo optionnelle** par surface | Galerie de plusieurs vidéos |
| Poster | **Image d'affiche optionnelle** (réutilise l'upload image) | — |
| Sous-titres | **`.vtt` inclus en v1** (piste captions) | Report v2 |
| Placement | **Bloc « Vidéo » dédié sous la galerie** (fiches) / bloc dédié (Studio) | Intégré à la galerie d'images |
| Limite d'upload | **200 MB** | 50 MB (actuel) |

## Contexte (existant)

- **Stockage médias** : `PhotoService` n'accepte que des **images** (allowlist `.jpg/.jpeg/.png/.webp/.gif/.avif`, `.svg` exclu, optimisation Thumbnailator), servies par `PhotoController` `GET /api/photos/files/{filename}` (cache immuable 1 an, noms UUID). Upload admin via `AdminPhotoController` `POST /api/admin/photos` (multipart, JWT).
- **CSP** (`SecurityConfig`) : `default-src 'self'` ; `script-src 'self'` (aucun JS inline) ; `media-src` **non défini** → fallback `default-src 'self'` (la vidéo même origine est donc déjà autorisée) ; `frame-src` whiteliste déjà YouTube/Vimeo (non utilisé par cette feature).
- **Fiches** : `FurnitureEntity`/`ExhibitionEntity` (+ records DTO `Furniture`/`Exhibition`) portent cover, galerie, tags, story. Rendu via les vues pures `furniture-detail-view`/`exhibition-detail-view` (pattern page/view ADR-0018) ; édition en preview admin.
- **Studio** : `StudioComponent` piloté par `Profile` + `SiteContent` (clés `studio.*`). Édition admin via la page **Textes** (`textes.component.ts`).
- **Infra** : upload limité à **50 MB** (`spring.servlet.multipart.max-file-size`/`max-request-size`) et Nginx `client_max_body_size 50M` sur `/api/`. Uploads persistés sur volume (les images en prod fonctionnent).

## Architecture

### 1. Modèle de données

- **Fiches** — 3 colonnes nullables ajoutées sur `furniture` ET `exhibition` :
  - `video_url` VARCHAR(500) — URL du fichier vidéo servi.
  - `video_poster` VARCHAR(500) — URL de l'image d'affiche (sert aussi de fallback LCP).
  - `video_captions` VARCHAR(500) — URL du fichier `.vtt`.
  - Migrations Liquibase numérotées (une par table, registres dans `db.changelog-master.yaml`). `ddl-auto=validate` → la suite H2 rejoue le changelog.
  - Ajout des champs `videoUrl`, `videoPoster`, `videoCaptions` aux records DTO `Furniture`/`Exhibition` et aux modèles frontend correspondants ; mapping dans les services/mappers de lecture **et** d'écriture admin.
- **Studio** — pas de schéma. Clés `SiteContent` : `studio.video.url`, `studio.video.poster`, `studio.video.captions` (table clé-valeur générique).
- **Pas d'entité vidéo en base** : le fichier uploadé est stocké + servi ; son URL est persistée sur l'entité propriétaire ou la clé Studio. La médiathèque (`PhotoEntity`) reste **images uniquement**.

### 2. Backend — stockage & service

- **`VideoService`** (nouveau, distinct de `PhotoService`) :
  - Allowlist stricte : `.mp4`, `.webm` (vidéo) et `.vtt` (sous-titres). Stockage **brut** (aucun transcodage ni optimisation).
  - Stockage dans `app.upload.dir` (même répertoire/volume que les images), nom `UUID + extension`.
  - `store(MultipartFile)` → renvoie `{ url, filename }` ; rejette toute extension hors allowlist (`IllegalArgumentException` → 400).
  - `loadAsResource(filename)` avec **garde anti-path-traversal** (confinement sous `uploadDir`, même logique que `PhotoService`).
  - `delete(filename)` best-effort (suppression fichier au remplacement/retrait).
- **`AdminVideoController`** `/api/admin/videos` (JWT) :
  - `POST` (multipart) → `VideoService.store`, 201 `{ url, filename }` ; 400 si extension refusée.
  - `DELETE /files/{filename}` → suppression best-effort, 204/404.
- **`VideoController`** `/api/videos/files/{filename}` (permitAll GET) :
  - **Support HTTP Range** pour la vidéo : si en-tête `Range` présent → `206 Partial Content` via `ResourceRegion` ; sinon `200` complet. Toujours `Accept-Ranges: bytes`. Indispensable au **seek** dans `<video>`.
  - Content-type par extension : `video/mp4`, `video/webm`, `text/vtt`. Le `.vtt` (petit) est servi en `200` simple.
  - Cache immuable 1 an (`max-age=31536000, public, immutable`) — noms UUID immuables (cohérent avec `PhotoController`).
- **Config** : `spring.servlet.multipart.max-file-size` et `max-request-size` relevés à **200MB**.

### 3. Frontend — rendu public

- **`<app-video-player>`** (nouveau, composant pur, `frontend/src/app/components/video-player/`) :
  - Inputs : `src: string`, `poster?: string | null`, `captions?: string | null`, `label: string` (nom accessible).
  - Rendu : `<video controls [poster]="poster" [preload]="poster ? 'none' : 'metadata'">` (poster présent → `preload="none"`, aucun téléchargement vidéo avant clic ; sinon `metadata` pour afficher la 1ʳᵉ frame). `<source [src]="src" type="video/mp4">` (type déduit/par défaut mp4). Si `captions` : `<track kind="captions" [src]="captions" srclang="fr" label="Français" default>`. `aria-label` = `label`.
  - Aucun JS inline, aucune dépendance tierce.
- **Câblage fiches** : dans `furniture-detail-view`/`exhibition-detail-view`, bloc `<section class="video-block">` **sous la galerie**, rendu **si `videoUrl` présent** (mode public) ; titre de section « Vidéo ». En mode editable (preview admin) : `<app-video-field>` à la place pour gérer la vidéo.
- **Câblage Studio** : bloc vidéo dédié dans `StudioComponent`, rendu si `studio.video.url` présent (lit `content()`).

### 4. Frontend — admin

- **`<app-video-field>`** (nouveau, `frontend/src/app/pages/admin/shared/`) :
  - Gère 3 sous-uploads : vidéo (`.mp4`/`.webm` via `POST /api/admin/videos`), poster (image via l'upload image existant), sous-titres (`.vtt` via `POST /api/admin/videos`).
  - Aperçu de la vidéo courante + actions **Remplacer**/**Retirer** par média ; émet les URLs vers le parent (pattern Output, pas de `HttpClient` en composant — passe par `portfolio.service`).
- **Fiches admin** : `<app-video-field>` câblé dans la preview des éditeurs mobilier/expo (branche editable de la vue détail) ; les URLs sont sauvegardées avec la fiche (`PUT /api/furniture|exhibitions`).
- **Studio admin** : `<app-video-field>` ajouté à la section Studio de la page **Textes**, sauvegardant dans les clés `studio.video.url/.poster/.captions` via le mécanisme `SiteContent` existant.

### 5. CSP & sécurité

- Ajout explicite de **`media-src 'self'`** au CSP (couvre `<video>`, `<source>` et `<track>` même origine ; clarté — le fallback `default-src` le couvrait déjà implicitement).
- Allowlist d'extensions vidéo **séparée et stricte** ; pas de SVG/exécutable. Garde path-traversal sur le service.
- Upload réservé aux routes `/api/admin/**` (JWT). Le serve public est en lecture seule.
- Pas de JS inline (lecteur natif). `frame-src` YouTube/Vimeo laissé tel quel (hors scope).

### 6. Infra / déploiement

- **Nginx** : `client_max_body_size` relevé à **200M** sur `location ^~ /api/` (`frontend/nginx.conf`).
- **Pas de transcodage** : l'admin doit fournir un **mp4 web-ready (H.264/AAC)** (ou webm VP9/Opus). Documenté dans la doc admin/technique.
- **Volume** : vidéos dans le même répertoire d'upload que les images (mêmes persistance/quota Railway). Conso disque/bande passante accrue — documentée.

### 7. Accessibilité (RGAA)

- `<video controls>` natif : commandes navigables clavier, nom accessible (`aria-label`).
- **Sous-titres `.vtt`** synchronisés (piste `captions` FR par défaut) → critère RGAA « média temporel » adressé pour le contenu parlé.
- Bloc vidéo : titre de section explicite ; le poster a un rôle décoratif (la vidéo porte le nom accessible).

## Tests

- **Backend** :
  - `VideoService` : `.mp4`/`.webm`/`.vtt` acceptés ; extension hors allowlist rejetée (400) ; path-traversal bloqué (`loadAsResource` renvoie null) ; `delete` best-effort.
  - `VideoController` : `Range` → `206` + `Content-Range`/`Accept-Ranges` (région partielle) ; sans `Range` → `200` + `Accept-Ranges: bytes` + cache immuable ; content-type correct par extension (`video/mp4`, `text/vtt`).
  - Migrations : suite H2 verte (changelog rejoué) ; `Furniture`/`Exhibition` exposent et persistent `videoUrl/videoPoster/videoCaptions`.
- **Frontend** :
  - `video-player.spec` : `<video>` rendu avec `src`/`poster`/`aria-label` ; `<track>` présent si `captions` ; `preload` = `none` avec poster, `metadata` sans.
  - `video-field.spec` : upload vidéo/poster/sous-titres ; remplace/retire ; émet les URLs.
  - vues détail : bloc vidéo affiché si `videoUrl`, masqué sinon (public) ; `video-field` en editable.
  - Studio : bloc vidéo rendu si `studio.video.url`.
- **Playwright** : nouveaux blocs → **régénérer les baselines seulement après validation visuelle manuelle** (jamais avant).

## Hors portée

- Plusieurs vidéos par surface (galerie vidéo).
- Embed YouTube/Vimeo / URL externe / CDN dédié.
- Transcodage serveur, génération automatique de poster (extraction de frame), streaming adaptatif (HLS/DASH).
- Plusieurs pistes de sous-titres / multilingue (une piste FR en v1).
- Vidéo dans les stories/slides ou la médiathèque.
