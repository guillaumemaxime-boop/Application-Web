# 19. Vidéos auto-hébergées (fiches + Studio)

Date : 2026-06-19
Statut : Accepté

## Contexte

Le backlog demandait d'intégrer des vidéos dans les fiches mobilier/exposition et la page Studio. Trois sources possibles :
- **Embed YouTube/Vimeo** (`<iframe>`) — la CSP whitelistait déjà `frame-src youtube/vimeo`, zéro stockage, streaming adaptatif gratuit, mais dépendance tierce + cookies/branding de la plateforme.
- **URL vers un `.mp4` externe (CDN)** — pas de stockage local mais hébergement externe à gérer + `media-src` à élargir.
- **Auto-hébergé** — upload d'un fichier servi par le backend, look épuré sans tiers, au prix d'un stockage/bande passante accrus et d'une gestion du seek (HTTP Range).

## Décision

**Auto-héberger** les vidéos, en réutilisant le répertoire d'upload existant (`app.upload.dir`) :

- **`VideoService`** (distinct de `PhotoService`, image-only) : allowlist stricte `.mp4`/`.webm` (vidéo) + `.vtt` (sous-titres), stockage **brut** (pas de transcodage ni d'optimisation), nom `UUID + extension` immuable, garde anti-path-traversal. Upload **streamé** (`Files.copy(InputStream, …)`) pour ne pas charger 200 Mo en heap.
- **`VideoController`** `GET /api/videos/files/{filename}` (permitAll) : support **HTTP Range** via `ResourceRegion` (206 Partial Content si en-tête `Range`, 200 sinon, 416 si hors borne, `Accept-Ranges: bytes` systématique) — indispensable au seek dans `<video>`. Cache immuable 1 an (noms UUID).
- **`AdminVideoController`** `POST /api/admin/videos` (upload) + `DELETE /api/admin/videos/files/{filename}`, sous `/api/admin/**` (JWT).
- **Schéma** : colonnes nullables `video_url`/`video_poster`/`video_captions` sur `furniture` et `exhibition` (migrations 032/033) ; clés `SiteContent` `studio.video.*` pour le Studio (pas d'entité vidéo dédiée — l'URL servie est persistée sur l'entité propriétaire).
- **Rendu** : `<app-video-player>` (composant pur, `<video controls>` natif, `preload="none"` si poster sinon `metadata`, piste `<track kind="captions" srclang="fr" default>`). Édition admin via `<app-video-field>` (upload vidéo/poster/sous-titres). Bloc « Vidéo » dédié sous la galerie des fiches et sur le Studio, affiché uniquement si une vidéo est présente.
- **CSP** : ajout de `media-src 'self'` (couvre `<video>`/`<source>`/`<track>` même origine). Aucun JS inline (lecteur natif).
- **Infra** : limite d'upload relevée à **200 Mo** (Spring `multipart.max-*-size` + Nginx `client_max_body_size`).

## Conséquences

- (+) Aucune dépendance tierce, look maîtrisé, pas de cookies externes ; cohérent avec la CSP stricte du projet.
- (+) Seek fonctionnel (Range/206) et cache navigateur 1 an (noms immuables).
- (+) RGAA : sous-titres `.vtt` synchronisés + lecteur natif navigable clavier.
- (-) **Pas de transcodage** : l'admin doit fournir un mp4 web-ready (H.264/AAC) — documenté.
- (-) Stockage/bande passante accrus sur le volume Railway (même volume que les images) ; pas de streaming adaptatif (HLS/DASH).
- (-) Fichiers potentiellement orphelins au remplacement/retrait (pas de GC automatique en v1 — dette acceptée en single-tenant).

## Alternatives écartées

- **Embed YouTube/Vimeo** : dépendance tierce + branding/cookies contraires à l'esprit épuré du portfolio, malgré une CSP déjà prête.
- **URL `.mp4` externe / CDN** : reporte le problème de stockage hors du projet et élargit `media-src` à des origines externes.
- **Variantes responsive / transcodage serveur** : hors scope (pas de pipeline d'encodage) ; envisageable ultérieurement comme la Phase 2 des images.
