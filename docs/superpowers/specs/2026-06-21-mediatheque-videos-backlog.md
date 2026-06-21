# Inclure les vidéos dans la médiathèque — Backlog

**Date** : 2026-06-21
**Statut** : Idée — à cadrer (backlog, demandée le 21/06/2026)
**Type** : Feature (gestion de médias admin).

## Demande

> Inclure les vidéos dans la médiathèque.

## Existant (à connaître avant de cadrer)

- La **médiathèque** (`/admin/mediatheque`, `PhotoEntity` + `PhotoService` + `photo-picker`) est aujourd'hui
  **images uniquement** (allowlist `.jpg/.jpeg/.png/.webp/.gif/.avif`). C'était un **choix de portée assumé** :
  voir `2026-06-19-videos-fiches-studio-design.md`, section « Hors portée » (« Vidéo dans … la médiathèque »)
  et l'architecture (« La médiathèque (`PhotoEntity`) reste **images uniquement** »).
- Les **vidéos** existent déjà comme fichiers servis (ADR-0019, spec technique §4.10) : `VideoService` +
  `VideoController` `GET /api/videos/files/{filename}` (allowlist `.mp4/.webm/.vtt`, stockage brut UUID,
  HTTP Range). Mais elles **ne sont pas indexées en base** : pas d'entité vidéo, l'URL est juste persistée
  sur l'entité propriétaire (`furniture.video_url`, `exhibition.video_url`) ou les clés `studio.video.*`.
  Upload via `<app-video-field>` (3 sous-uploads : vidéo / poster / `.vtt`), pas via le `photo-picker`.

Conséquence : aujourd'hui une vidéo uploadée n'est **ni listée, ni réutilisable, ni supprimable** depuis la
médiathèque — elle est « invisible » une fois posée sur une fiche. C'est le manque que cette feature adresse.

## Objectif (à cadrer)

Faire apparaître les vidéos dans la médiathèque pour les **lister, prévisualiser, réutiliser et supprimer**
comme les images, et permettre de **choisir une vidéo existante** depuis un `video-picker` (à l'image du
poster vidéo déjà sélectionnable depuis la médiathèque, commit `feat(videos): choisir le poster …`).

## Pistes / décisions à trancher

- **Indexation en base** : créer une entité/registre `MediaAsset` (ou `VideoEntity`) pour lister les vidéos
  — aujourd'hui il n'y a aucune table vidéo, donc impossible de lister sans scanner le disque. À arbitrer :
  table dédiée vs. table médias unifiée (images + vidéos) vs. scan du répertoire d'upload.
- **Médiathèque unifiée vs. onglets** : un seul écran filtrable par type, ou onglets « Images / Vidéos ».
- **`video-picker`** : pendant `photo-picker`, pour réutiliser une vidéo déjà uploadée dans `<app-video-field>`.
- **Suppression sûre** : empêcher (ou avertir) la suppression d'une vidéo encore référencée par une fiche /
  le Studio (intégrité — aujourd'hui les URLs sont des chaînes libres, pas de FK).
- **Vignette/preview** : poster comme vignette ; à défaut, 1ʳᵉ frame (nécessiterait extraction → transcodage,
  cf. backlog streaming) ou icône générique.
- **Migration de l'existant** : indexer les vidéos déjà posées sur les fiches/Studio (rétro-remplissage).

## Points d'attention

- **Pas de FK aujourd'hui** entre médias et entités : le comptage de références suppose de scanner
  `furniture`/`exhibition`/`site_content` (ou d'introduire de vraies relations).
- **RGAA / sécurité** : conserver l'allowlist stricte d'extensions vidéo et la garde anti-path-traversal
  existantes (`VideoService`) ; le picker reste derrière `/api/admin/**` (JWT).
- **Lien avec le backlog streaming** : si une indexation médias est introduite, prévoir les colonnes utiles
  (poster, durée, variantes) pour ne pas remigrer.

## Hors portée (a priori)

- Transcodage / génération automatique de vignette par extraction de frame (→ backlog streaming).
- Galerie de plusieurs vidéos par surface (backlog distinct).
