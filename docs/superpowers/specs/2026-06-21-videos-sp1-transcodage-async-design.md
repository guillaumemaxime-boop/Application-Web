# Vidéos SP1 — Fondations : FFmpeg + transcodage async + poster + métadonnées — Spec

**Date** : 2026-06-21
**Statut** : Validé — à planifier
**Type** : Feature full-stack (backend pipeline + frontend admin). Premier sous-projet du chantier « amélioration vidéos + streaming ».

## Contexte

Chantier « amélioration vidéos + streaming » décomposé en 3 sous-projets :
- **SP1 (cette spec)** : fondations — FFmpeg, transcodage async, poster auto, métadonnées, entité `Video` + statut.
- **SP2** : streaming adaptatif HLS (multi-rendition + `.m3u8` + hls.js). S'appuie sur SP1.
- **SP3** : housekeeping (GC des fichiers orphelins).

État actuel (ADR-0019) : vidéos auto-hébergées, stockage **brut sans transcodage** (l'admin doit fournir un mp4 web-ready), serve avec **HTTP Range/206 déjà en place** (seek/progressif OK), player `<video>` natif, URL persistée sur la fiche (`furniture.video_url`/`exhibition.video_url` + `SiteContent studio.video.*`). Manques : pas de transcodage/compression, pas de poster auto, pas de métadonnées, pas de streaming adaptatif.

## Décisions validées

| Sujet | Choix |
| --- | --- |
| Objectif global | Pipeline complet (transcodage + HLS + poster) — décomposé ; SP1 = fondations. |
| Exécution async | **`@Async` in-process** + recovery au démarrage (proportionné single-tenant). |
| Existant | **Migré tel quel en `READY`** (pas de re-transcodage rétro). |
| Modèle de référence | Entité **`Video`** + statut ; les fiches/Studio référencent la vidéo par **id**. |
| Preset | H.264/AAC, `+faststart`, plafond **1080p** (pas d'upscale), CRF 23, preset medium. |
| Source après transcodage | Supprimée sur `READY` ; conservée sur `FAILED` (pour relancer). |
| Player public SP1 | Inchangé (progressif sur mp4 normalisé) ; vidéo exposée **seulement si `READY`**. |

## Architecture

### 1. Infra FFmpeg
- Ajout de **ffmpeg + ffprobe** à l'image Docker backend ([backend/Dockerfile](../../../backend/Dockerfile)).
- Feature-flag `app.video.transcode.enabled` (défaut `true`). Si désactivé ou binaire absent (tests) → **dégradation gracieuse** : la vidéo est stockée brute et passée directement `READY` (= comportement ADR-0019), poster/métadonnées nuls.
- Config `app.video.*` : `ffmpeg-path` (défaut `ffmpeg`), `ffprobe-path` (défaut `ffprobe`), `max-height` (1080), `crf` (23), `preset` (medium), `transcode-timeout` (ex. 600s), `poster-offset-seconds` (1).

### 2. Domaine — entité `Video`
Table `video` (migration Liquibase) :
- `id` varchar PK (`vid-` + uuid court), `status` varchar (`UPLOADED`/`PROCESSING`/`READY`/`FAILED`),
- `source_filename`, `output_filename` (null avant READY), `poster_filename` (null avant READY),
- `duration_seconds` double null, `width` int null, `height` int null,
- `error_message` varchar(500) null, `original_name`, `created_at`, `updated_at`.

Référence côté propriétaires :
- `furniture`/`exhibition` : colonne **`video_id`** (varchar, nullable) remplace `video_url`. `video_captions` conservé (`.vtt`). `video_poster` conservé comme **override** optionnel (poster choisi en médiathèque ; sinon poster auto de la `Video`).
- Studio : clé `SiteContent` **`studio.video.id`** (remplace `studio.video.url`) ; `studio.video.poster`/`studio.video.captions` conservés.

### 3. Pipeline async
- **`VideoTranscoder`** (interface) : `probe(Path) : VideoMeta(duration,width,height)` et `transcode(Path source, Path outMp4, Path outPoster, options)`. Implémentation `FfmpegVideoTranscoder` (ProcessBuilder, **liste d'arguments** — pas de shell, pas d'injection ; timeout + kill). Implémentation no-op si flag off / binaire absent.
- **`POST /api/admin/videos`** (JWT) : `VideoService.store` écrit le fichier brut (streamé), crée `Video(UPLOADED)`, déclenche `transcodeAsync(id)`, renvoie `{id, status, originalName}`.
- **`transcodeAsync(id)`** (`@Async`, `@Transactional` par étape) : `PROCESSING` → probe (valide que c'est une vidéo) → transcode mp4 web-ready (H.264 libx264 CRF 23 preset medium, AAC, `-movflags +faststart`, `scale` plafond hauteur 1080 sans upscale via `scale='min(1080,ih)'` ratio conservé) → poster (`-ss offset -frames:v 1`) → `READY` (output/poster/duration/dims) + **suppression du source**. Erreur/timeout → `FAILED` + `error_message`, source conservée.
- **Recovery** (`ApplicationReadyEvent` ou `@PostConstruct`) : `UPDATE video SET status=FAILED, error_message='interrompu' WHERE status='PROCESSING'`.
- **`GET /api/admin/videos/{id}`** (JWT) : DTO `{id, status, url?, poster?, durationSeconds?, width?, height?, errorMessage?}` (pollé par l'UI admin).
- **`POST /api/admin/videos/{id}/retry`** (JWT) : si source présente et statut `FAILED` → re-déclenche `transcodeAsync`.
- **`DELETE /api/admin/videos/{id}`** (JWT) : supprime fichiers (source/output/poster) + entité. (Le GC plus large = SP3.)

### 4. Serve
- mp4 normalisé : **`VideoController` existant** (Range/206, cache immuable) — l'URL `output` est sous `/api/videos/files/{output_filename}`.
- poster jpg : **serve images existant** (`/api/photos/files/{poster_filename}`, avec fallback logo).

### 5. Résolution DTO (public vs admin)
- **Public** (`Furniture`/`Exhibition`/Home Studio) : on résout `video_id` → si `Video.status == READY`, exposer `video` `{url, poster (override sinon auto), captions, durationSeconds, width, height}` ; sinon **aucune vidéo** (bloc masqué). Pas de fuite de l'état `PROCESSING`/`FAILED` au public.
- **Admin** : exposer le statut complet (pour l'UI « traitement en cours » / « échec »).

### 6. Frontend admin (`<app-video-field>`)
- Upload → reçoit `{id, status}` → **polling** `GET /api/admin/videos/{id}` (intervalle ~2 s, arrêt sur `READY`/`FAILED`, timeout de garde).
- `PROCESSING` : indicateur « Traitement de la vidéo en cours… » + spinner, champ vidéo désactivé.
- `READY` : aperçu `<app-video-player>` (mp4 normalisé) + poster auto affiché ; override poster (médiathèque) toujours possible.
- `FAILED` : message d'erreur + boutons **Relancer** (`/retry`) et **Remplacer**.
- Persistance : la fiche stocke `video_id` (et poster/captions). L'admin peut enregistrer pendant le traitement.

### 7. Migration de l'existant
Changeset Liquibase :
1. créer table `video` ; ajouter `video_id` à `furniture`/`exhibition`.
2. pour chaque `furniture`/`exhibition` à `video_url` non nul : insérer `Video(READY, source_filename=output_filename=fichier existant, poster_filename` dérivé de `video_poster` si présent`)`, fixer `video_id`.
3. `studio.video.url` (SiteContent) → créer `Video(READY)` + clé `studio.video.id`.
4. supprimer la colonne `video_url` (et la clé `studio.video.url`) après migration.
- Backfill durée/dimensions de l'existant : best-effort via ffprobe au démarrage si le binaire est présent (sinon nul, non bloquant).

## Tests
- **Backend** : `VideoService` transitions de statut (UPLOADED→PROCESSING→READY/FAILED) avec un `VideoTranscoder` **mocké/fake** ; recovery au démarrage (PROCESSING→FAILED) ; résolution DTO (seul `READY` exposé au public) ; retry (FAILED+source→PROCESSING) ; dégradation gracieuse (flag off → READY brut) ; migration (vidéos existantes → Video READY + video_id). Construction de la ligne de commande ffmpeg/ffprobe (args attendus) testée sans exécuter le binaire. Un test d'intégration ffmpeg réel **gated** sur la présence du binaire (skip sinon).
- **Frontend** : `<app-video-field>` polling (mock service : PROCESSING puis READY → aperçu ; FAILED → message + retry) ; le bloc vidéo public n'apparaît pas si non `READY`.
- **Régression** : suites back+front vertes ; pas de baselines Playwright avant validation visuelle.

## Risques / contraintes
- **CPU/RAM/temps** de transcodage sur Railway : preset medium + plafond 1080p pour borner ; timeout de garde. Un seul backend → `@Async` borne le parallélisme (pool 1–2).
- Conteneur tombé pendant un job → recovery `FAILED` (l'admin relance).
- Suppression de la source sur `READY` : SP2 (HLS) dérivera les rendus du **mp4 normalisé** (perte générationnelle mineure acceptée pour économiser le volume).
- Image backend plus lourde (ffmpeg).

## Hors portée (→ SP2/SP3)
- HLS multi-rendition + manifeste + hls.js (SP2).
- GC global des orphelins / vidéos non référencées (SP3).
- Choix de poster par l'admin parmi plusieurs frames extraites (backlog).
