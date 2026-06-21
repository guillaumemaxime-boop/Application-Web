# Améliorer la lecture des vidéos — streaming mp4 — Backlog

**Date** : 2026-06-21
**Statut** : Idée — à cadrer (backlog, demandée le 21/06/2026)
**Type** : Amélioration (perf / UX lecture vidéo).

## Demande

> Améliorer la lecture de vidéos en fournissant une fonction de streaming des vidéos mp4.

## Existant (à connaître avant de cadrer)

Le **streaming mp4 de base est déjà en place** (ADR-0019, spec technique §4.10) :

- `VideoController` `GET /api/videos/files/{filename}` supporte déjà **HTTP Range** via `ResourceRegion` :
  `206 Partial Content` quand l'en-tête `Range` est présent (donc **seek** possible dans `<video>`),
  `200` complet sinon, `416` hors borne, `Accept-Ranges: bytes`, cache `max-age=31536000, immutable`.
- Stockage **brut** des `.mp4`/`.webm` (aucun transcodage), lecteur **HTML natif** `<video>` (composant `<app-video-player>`).
- Le **streaming adaptatif (HLS/DASH)** et le **transcodage serveur** sont explicitement listés *hors portée* de la
  feature vidéo initiale (voir `2026-06-19-videos-fiches-studio-design.md`, section « Hors portée »).

Autrement dit, la lecture progressive + seek d'un mp4 web-ready (H.264/AAC) fonctionne déjà. Ce backlog vise donc
l'**amélioration au-delà du Range nu**.

## Pistes à cadrer (non tranchées)

- **Streaming adaptatif (HLS/DASH)** : transcodage multi-débits à l'upload (ex. ffmpeg) + manifeste `.m3u8`/`.mpd`
  + lecteur compatible (HLS natif Safari, `hls.js` ailleurs — première dépendance lecteur, impact CSP `script-src`).
  Bénéfice : adaptation à la bande passante, démarrage plus rapide sur mobile/réseau lent.
- **Transcodage / normalisation à l'upload** : garantir un mp4 *faststart* (atome `moov` en tête → lecture immédiate
  sans télécharger tout le fichier), proposer plusieurs résolutions. Coût : pipeline ffmpeg, CPU, stockage.
- **Poster / preview** : génération automatique d'une frame poster (aujourd'hui poster fourni manuellement).
- **Mesure** : démarrage de lecture, buffering, poids transféré sur réseau contraint, avant/après.

## Points d'attention

- **CSP** : un lecteur tiers (`hls.js`) introduirait du JS tiers — aujourd'hui `script-src 'self'` strict, aucune lib
  lecteur. À arbitrer (ADR si retenu).
- **Infra Railway** : transcodage = CPU + stockage des variantes (cf. quota volume d'upload partagé avec les images).
- **RGAA** : conserver commandes clavier natives + pistes de sous-titres `.vtt` quel que soit le lecteur retenu.

## Hors portée (a priori)

- DRM / vidéos protégées.
- Plusieurs vidéos par surface (galerie vidéo) — déjà backlog distinct.
- Embed YouTube/Vimeo / CDN tiers (écarté en ADR-0019).
