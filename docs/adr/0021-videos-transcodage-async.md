# 21. Vidéos : transcodage asynchrone + entité Video

Date : 2026-06-21
Statut : Accepté (supersède en partie l'[ADR-0019](0019-videos-auto-hebergees.md))

## Contexte

L'ADR-0019 a acté l'auto-hébergement des vidéos **sans transcodage** (l'admin devait fournir un mp4 web-ready H.264/AAC), **sans poster automatique**, **sans entité vidéo** (l'URL était persistée directement sur la fiche / la clé `SiteContent studio.video.url`) et **sans streaming adaptatif**. Le chantier « amélioration vidéos + streaming » (décomposé en SP1/SP2/SP3) lève ces limites. **SP1** (cet ADR) pose les fondations : normalisation web-ready, poster auto, métadonnées, et un modèle à statut qui prépare le HLS (SP2).

## Décision

- **FFmpeg** ajouté à l'image Docker backend (`apk add ffmpeg`). Flag `app.video.transcode.enabled` (défaut `true`) : si ffmpeg est absent/désactivé, **dégradation gracieuse** — la vidéo brute passe directement `READY` (comportement ADR-0019).
- **Entité `Video`** (table `video`) à statut `UPLOADED → PROCESSING → READY | FAILED`, avec `source/output/poster_filename`, `duration_seconds`, `width`/`height`, `error_message`. Repository + DTO `Video`.
- **`VideoTranscoder`** (interface, mockable) + **`FfmpegVideoTranscoder`** : invocation via `ProcessBuilder` avec **liste d'arguments** (jamais de shell → pas d'injection), **timeout + kill** du process, `ffprobe` (JSON) pour durée/dimensions.
- **Pipeline `@Async`** (executor `videoExecutor` borné à 1 thread — single-tenant, transcodage CPU-lourd en process externe) : `store` crée `Video(UPLOADED)` et déclenche `transcodeAsync` → `PROCESSING` → transcode mp4 **web-ready** (H.264/AAC, `+faststart`, plafond **1080p** sans upscale, CRF 23) + **poster** (frame ~1 s) + métadonnées → `READY` (source supprimée) ; toute erreur/timeout → `FAILED` (source conservée pour relance). **Recovery** au démarrage (`ApplicationReadyEvent`) : toute vidéo restée `PROCESSING` (conteneur tombé) repasse `FAILED`. Le transcodage tourne **hors transaction `readOnly`** (chaque `save` dans sa propre transaction → le passage `PROCESSING` est visible des pollers).
- **Endpoints admin** (`/api/admin/videos`, JWT) : `POST` upload **async** (`{id, status}`), `GET /{id}` (statut **pollé** par l'UI), `POST /{id}/retry`, `DELETE /{id}`. Le serve public (`VideoController`, **Range/206** déjà en place) sert le mp4 de sortie ; le poster (jpg) est servi par le serve images.
- **Référence par id** : `furniture`/`exhibition` portent `video_id` (remplace `video_url`) ; le Studio utilise la clé `studio.video.id` (remplace `studio.video.url`). `video_poster`/`studio.video.poster` restent comme **override** optionnel (poster choisi en médiathèque) ; `video_captions` (`.vtt`) inchangé (pas d'entité). **Résolution DTO** : la vidéo n'est exposée au public (`videoUrl` + poster + durée/dimensions) **que si `READY`** — l'état `PROCESSING`/`FAILED` n'est jamais visible côté public (bloc masqué). Le poster override prime sur le poster auto.
- **Migrations** : `034` crée la table `video` + ajoute `video_id` + migre l'existant (chaque `video_url` → une `Video` `READY` pointant sur le fichier brut existant, **pas de re-transcodage rétro**) ; `035` supprime la colonne `video_url`. Le Studio reste lisible sans changement frontend grâce à une clé synthétique `studio.video.url` résolue injectée par `SiteContentService` quand `studio.video.id` est `READY`.
- **Frontend** : `<app-video-field>` (admin) **polle le statut** (« Traitement en cours… » / aperçu quand `READY` / message + **Relancer** sur `FAILED`) et émet `videoId`. Le rendu public (`<app-video-player>`) lit `videoUrl` résolu — **inchangé**.

## Conséquences

- (+) Vidéos normalisées/compressées web-ready, **poster automatique**, métadonnées exposées ; lecture progressive fluide (faststart + Range).
- (+) La surface publique **masque** une vidéo non prête ; aucune fuite d'état de traitement.
- (+) Sécurité : exécution ffmpeg sans shell (args en liste), timeout/kill, async borné (pas de CPU public à la demande) ; recovery au démarrage.
- (-) Image backend plus lourde (ffmpeg) ; **CPU/temps de transcodage** non négligeables sur l'instance Railway (borné par preset medium + plafond 1080p + timeout).
- (-) Suppression de la source après `READY` : **SP2 (HLS)** dérivera les rendus du **mp4 normalisé** (perte générationnelle mineure acceptée pour économiser le volume).
- (-) Dette : **streaming adaptatif HLS** = SP2 ; **GC global des orphelins** (vidéos non référencées) = SP3.

## SP2 — Streaming adaptatif HLS (extension, 2026-06-21)

Le pipeline SP1 est étendu pour produire, **en best-effort** (un échec HLS laisse la vidéo `READY` avec le mp4 progressif en fallback), un **HLS multi-rendition TS** dérivé du mp4 normalisé :

- `FfmpegVideoTranscoder.generateHls` (`buildHlsArgs` : `split` + `scale` par rendition, `var_stream_map`, `master.m3u8` + `{0,1,2}.m3u8` + segments `.ts`) dans `{id}-hls/` ; escalier **360/720/1080p** plafonné à la hauteur source. Colonne `hls_master_filename` (migration 036) ; batch `POST /api/admin/videos/hls` pour l'existant.
- **Correctif** : exécution des process ffmpeg redirigée vers un **fichier temp** (`runToFile`) — élimine le risque de blocage de pipe (sortie volumineuse des longues vidéos) noté en SP1.
- **Serve** : `VideoController` passe à `{*filename}` (chemins HLS imbriqués), content-types `application/vnd.apple.mpegurl`/`video/mp2t`, garde anti-path-traversal conservée. **Résolution DTO** : `videoHls` (fiches) + `studio.video.hls` (Studio), exposés `READY`-only.
- **Player** : `<app-video-player>` choisit HLS **natif** (Safari/iOS), sinon **hls.js** (Chrome/FF/Edge), sinon **fallback mp4**. Dépendance `hls.js` (1ʳᵉ lib player tierce). CSP : segments via `connect-src 'self'` + `media-src 'self'` (déjà en place).
- `delete` retire récursivement le dossier `{id}-hls/`. **GC global des orphelins = SP3** (dette).

## SP3 — Housekeeping / GC des orphelins (extension, 2026-06-21)

La dette de SP1/SP2 (accumulation de vidéos non référencées et de fichiers `vid-*` sans entité, au fil des remplacements/suppressions) est levée par deux mécanismes complémentaires :

- **Nettoyage immédiat** — `VideoService.isReferenced(id)` (= `existsByVideoId` sur `furniture`/`exhibition` + valeur de la clé `studio.video.id`) et `deleteIfUnreferenced(id)`. Appelés au **remplacement** de la vidéo d'une fiche mobilier/expo ou du Studio, et à la **suppression** d'un propriétaire (`FurnitureService`/`ExhibitionService`/`SiteContentService`). L'ancienne vidéo n'est supprimée (entité + fichiers) que si **plus aucun** propriétaire ne la référence. Échec de suppression non bloquant pour l'opération métier (`try/catch` best-effort). `VideoService` injecte les **repositories** (pas les services) propriétaires → pas de cycle de beans.
- **GC batch** — `gcOrphans(dryRun)` recense (a) les entités `Video` non référencées et (b) les entrées `vid-*` du `uploadDir` sans entité connue, puis supprime si `dryRun=false`. **Période de grâce** (`app.video.gc-grace-hours`, défaut **24 h**, env `VIDEO_GC_GRACE_HOURS`) : exclut les vidéos `UPLOADED`/`PROCESSING` et tout ce qui est plus récent que la fenêtre (entité `READY` par `createdAt`, fichier par mtime) → protège un **upload frais non encore rattaché** à une fiche sauvegardée. Endpoint `POST /api/admin/videos/gc?dryRun` (JWT, **`dryRun` défaut `true`** = aperçu sans suppression), réponse `{orphanVideos, orphanFiles, deleted}`.
- **Sûreté** : le scan ne cible **que** les entrées préfixées `vid-` (les photos `{uuid}.ext` ne sont jamais candidates). Suppression **confinée au `uploadDir`** (`startsWith` sur chemin normalisé, plus une garde défensive interne à `deleteDirRecursive`) ; `Files.walk` ne suit pas les symlinks par défaut. La réponse du dry-run liste les noms de fichiers orphelins **à dessein** (aperçu opérationnel avant une opération destructive), derrière le gate JWT admin.

## Supersession

Cet ADR **supersède en partie l'ADR-0019** : les points « pas de transcodage » et « pas d'entité vidéo / URL persistée sur la fiche » ne sont plus valables. Le reste de l'ADR-0019 demeure : auto-hébergement (pas d'embed tiers), serve avec HTTP Range/206, CSP `media-src 'self'`, allowlist `.mp4`/`.webm`/`.vtt`, upload streamé, limite 200 Mo.
