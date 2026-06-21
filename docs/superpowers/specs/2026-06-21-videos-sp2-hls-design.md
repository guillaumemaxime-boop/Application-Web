# Vidéos SP2 — Streaming adaptatif HLS — Spec

**Date** : 2026-06-21
**Statut** : Validé — à planifier
**Type** : Feature full-stack (extension pipeline backend + serve + player frontend). Deuxième sous-projet du chantier vidéos (après SP1).

## Contexte

SP1 (mergé en local) a livré : transcodage async vers mp4 web-ready (H.264/AAC faststart ≤1080p) + poster + métadonnées, entité `Video` à statut, `video_id` sur fiches/Studio, résolution publique READY-only, `<app-video-player>` natif (mp4 progressif, Range/206). SP2 ajoute le **streaming adaptatif HLS** (s'adapte au débit).

## Décisions validées

| Sujet | Choix |
| --- | --- |
| Format segments | **MPEG-TS (`.ts`)** (compatibilité max, simple). |
| Périmètre | **Nouveaux uploads + batch** pour l'existant. |
| Escalier | **360p / 720p / 1080p**, uniquement ≤ hauteur source (pas d'upscale). |
| Fallback | **mp4 progressif conservé** (no-JS, hls.js absent/erreur, vidéos sans HLS). |
| Player | **hls.js** (Chrome/FF/Edge) + **HLS natif** (Safari/iOS) + fallback mp4. |
| HLS dans le pipeline | **Best-effort** : échec HLS ⇒ la vidéo reste `READY` (mp4 fallback). |
| Source du HLS | Dérivé du **mp4 normalisé** (la source brute est supprimée en SP1). |

## Architecture

### 1. Génération HLS (extension du pipeline SP1)
- `VideoTranscoder` : nouvelle méthode `generateHls(Path inputMp4, Path hlsDir, HlsOptions)` (impl FFmpeg). Construit un HLS multi-rendition TS : `master.m3u8` + `{height}p.m3u8` par rendition + segments `.ts`, dans `{id}-hls/`. Renditions = sous-ensemble de {360,720,1080} avec hauteur ≤ source (déduite de `probe`). Builder d'args `static` testable.
- `VideoService.transcode(id)` : après mp4 + poster, tente `generateHls(outputMp4, dir.resolve(id+"-hls"), ...)` ; si succès → `hlsMasterFilename = id+"-hls/master.m3u8"` ; si échec → log/ignore (reste `READY`, `hlsMasterFilename` null). Puis `READY` + suppression source (inchangé).
- **Correctif SP1 (drainage pipe)** : `FfmpegVideoTranscoder` redirige la sortie des process vers un **fichier temp** (`redirectOutput(File)`) au lieu d'un pipe non drainé → plus de blocage sur sortie volumineuse (longues vidéos). S'applique à `runVoid` (transcode/poster) et à la commande HLS ; lecture plafonnée du diagnostic sur erreur.

### 2. Entité / migration
- Colonne `hls_master_filename` VARCHAR(255) nullable sur `video` (migration **036**).

### 3. Batch existant
- `POST /api/admin/videos/hls` (JWT) → `generateHlsAll()` : pour chaque `Video` `READY` sans `hls_master_filename` et dont le mp4 de sortie existe, génère le HLS (idempotent : skip si dossier déjà présent). Renvoie `{count, generated}`.

### 4. Serve
- Servir les fichiers HLS (`master.m3u8`, playlists, `.ts`) via le `VideoController`, en **chemins imbriqués** (`{id}-hls/...`). Endpoint `GET /api/videos/files/{*filename}` (PathPattern capturant les `/`) — garde anti-path-traversal **conservée** (`startsWith(uploadPath)`). Content-types : `application/vnd.apple.mpegurl` (`.m3u8`), `video/mp2t` (`.ts`). Cache immuable (VOD, noms fixes). Le mp4 progressif (Range/206) reste servi à l'identique.
- Le `master.m3u8` référence les playlists/segments en **chemins relatifs** → le navigateur les résout sous `/api/videos/files/{id}-hls/`.

### 5. Résolution DTO
- `VideoService.resolveForPublic(id)` (record `ResolvedVideo`) : ajoute `hlsUrl` = `READY && hlsMasterFilename != null ? baseUrl+"/"+hlsMasterFilename : null`.
- DTO publics `Furniture`/`Exhibition` : ajout `videoHls` (à côté de `videoUrl` mp4) ; Studio : clé synthétique résolue `studio.video.hls`. READY-only inchangé.

### 6. Player frontend — `<app-video-player>`
- Dépendance **hls.js** (npm). Nouvel `@Input() hlsSrc: string | null`.
- À l'init (`@ViewChild('video')`, `ngAfterViewInit`) :
  - `hlsSrc` ET `video.canPlayType('application/vnd.apple.mpegurl')` (Safari/iOS) → `video.src = hlsSrc` (natif) ;
  - sinon `hlsSrc` ET `Hls.isSupported()` → `new Hls(); hls.loadSource(hlsSrc); hls.attachMedia(video)` ; sur `Hls.Events.ERROR` fatal → fallback mp4 (`src`) ;
  - sinon → mp4 `src` (comportement SP1).
  - Sans `hlsSrc` → mp4 (inchangé). `ngOnDestroy` détruit l'instance hls.js.
- `<app-video-field>` (admin) / detail-views / Studio passent `hlsSrc` (depuis le DTO résolu) à côté de `src`.

### 7. CSP
Aucun changement : hls.js fetch segments → `connect-src 'self'` (OK) ; natif → `media-src 'self'` (OK) ; lib bundlée → `script-src 'self'` (pas d'inline).

### 8. Suppression
`VideoService.delete(id)` retire aussi le dossier `{id}-hls/` (récursif, best-effort). (Le **GC global** des dossiers orphelins reste SP3.)

## Tests
- **Backend** : `buildHlsArgs` (renditions ≤ source, master + var_stream_map) ; `transcode` pose `hlsMasterFilename` (transcoder mocké) ; échec HLS → reste `READY` sans hlsMaster ; `generateHlsAll` idempotent ; `resolveForPublic` renvoie `hlsUrl` ; serve HLS (content-types m3u8/ts, path imbriqué, path-traversal rejeté) ; `delete` retire le dossier HLS. Un test d'intégration ffmpeg HLS réel **gated** sur la présence du binaire.
- **Frontend** : `<app-video-player>` choisit natif vs hls.js vs fallback mp4 (mock `Hls`/`canPlayType`) ; cleanup en destroy ; `<app-video-field>`/detail-views passent `hlsSrc`.
- **Régression** : suites back + front vertes ; pas de baseline Playwright avant validation visuelle.

## Risques / contraintes
- **CPU/temps** : la génération multi-rendition allonge le transcodage (borné par le pool async 1 + timeout). Acceptable single-tenant ; le HLS est best-effort (n'empêche pas READY).
- **Volume** : HLS multiplie les fichiers (segments) → un dossier par vidéo ; pèse sur le volume Railway (mp4 + HLS coexistent). À surveiller ; GC = SP3.
- hls.js = nouvelle dépendance front (taille bundle ; chargée pour le player).

## Hors portée (→ SP3 / backlog)
- GC global des fichiers/dossiers vidéo orphelins (non référencés).
- DASH / multi-DRM ; sous-titres intégrés au HLS (les `.vtt` restent servis via `<track>`).
- Choix manuel de la qualité par l'utilisateur (hls.js = auto/ABR par défaut).
