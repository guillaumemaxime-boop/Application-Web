# Vidéos SP3 — GC des vidéos orphelines — Spec

**Date** : 2026-06-21
**Statut** : Validé — à planifier
**Type** : Feature backend (housekeeping). Troisième et dernier sous-projet du chantier vidéos.

## Contexte

SP1/SP2 (mergés) : entité `Video` (statut, fichiers `{id}.mp4`/`{id}-poster.jpg`/`{id}-hls/`/`{id}-src.*`, tous préfixés **`vid-`**), référencée par `furniture.video_id`/`exhibition.video_id`/`SiteContent studio.video.id`. `VideoService.delete(id)` supprime déjà fichiers + entité pour un id donné. **Manque** : quand l'admin **remplace** la vidéo d'une fiche/Studio ou **supprime** une fiche, l'ancienne `Video` + ses fichiers deviennent **orphelins** (jamais nettoyés) → accumulation sur le volume.

## Décisions validées

| Sujet | Choix |
| --- | --- |
| Déclenchement | **Nettoyage immédiat** au remplacement/suppression **+** endpoint GC manuel (filet). |
| Périmètre GC | **Entités orphelines + fichiers `vid-*` disque** sans entité. |
| Frontend | **Endpoint-only** (console), cohérent avec les batches `optimize`/`variants`/`hls`. Pas d'UI. |
| Périmètre | **Vidéos uniquement** (photos = médiathèque ; `.vtt` orphelins hors scope). |
| Sécurité | Ne touche que le préfixe `vid-` (zéro risque photos) ; **période de grâce** (voir §3). |

## Architecture

### 1. « Référencée » — `isReferenced(videoId)`
Une `Video` est référencée si son id apparaît dans `furniture.video_id`, `exhibition.video_id`, ou `site_content` clé `studio.video.id`. `VideoService` injecte **`FurnitureRepository`, `ExhibitionRepository`, `SiteContentRepository`** (repositories, pas les services → pas de cycle de dépendances) et expose :
```java
boolean isReferenced(String videoId)
  = furnitureRepository.existsByVideoId(videoId)
 || exhibitionRepository.existsByVideoId(videoId)
 || siteContentRepository.existsByContentKeyAndContentValue("studio.video.id", videoId);
```
(Ajouter `existsByVideoId` à `FurnitureRepository`/`ExhibitionRepository` et `existsByContentKeyAndContentValue` à `SiteContentRepository` si absent.)

### 2. Nettoyage immédiat (hygiène primaire)
- **`VideoService.deleteIfUnreferenced(String id)`** : si `id != null` et `!isReferenced(id)` → `delete(id)` (fichiers source/output/poster + dossier `{id}-hls/` + entité, déjà en place).
- **Remplacement** :
  - `FurnitureService.update` / `ExhibitionService.update` : capturer l'ancien `video_id` (`entity.getVideoId()`) avant d'appliquer le nouveau ; après save, si `old != null && !old.equals(new)` → `videoService.deleteIfUnreferenced(old)`.
  - Studio : à l'écriture de la clé `studio.video.id` (`SiteContentService` / le contrôleur admin qui persiste les clés), même logique sur l'ancienne valeur.
- **Suppression d'une fiche** : `FurnitureService.delete` / `ExhibitionService.delete` : si l'entité a un `video_id` → `videoService.deleteIfUnreferenced(video_id)` après suppression de la fiche.
- L'appel est **best-effort** (une erreur de suppression de fichier ne fait pas échouer l'update/delete de la fiche).

### 3. GC manuel — `POST /api/admin/videos/gc` (JWT)
Paramètre `dryRun` (défaut **`true`** — sécurité). Recense :
1. **Entités Video orphelines** : `repository.findAll()` filtré par `!isReferenced(id)` **et** éligibles (voir grâce).
2. **Fichiers/dossiers `vid-*` orphelins** : entrées de `uploadDir` commençant par `vid-` (fichiers `vid-*.*` et dossiers `vid-*-hls`) dont l'id extrait ne correspond à **aucune** entité Video.
- `dryRun=true` → renvoie `{orphanVideos:[ids], orphanFiles:[noms], deleted:false}` sans rien supprimer.
- `dryRun=false` → supprime (entités orphelines via `delete(id)` ; fichiers/dossiers orphelins via suppression directe confinée à `uploadDir`) → renvoie `{orphanVideos, orphanFiles, deleted:true}`.
- Service : `VideoGcReport gcOrphans(boolean dryRun)`.

**Garde-fou — période de grâce** : le GC **ignore** (ne considère pas orphelines) :
- les vidéos de statut `UPLOADED` ou `PROCESSING` (en cours) ;
- les vidéos `READY`/`FAILED` créées il y a **< 24 h** (`created_at`) — l'admin peut être en train de rattacher la vidéo à une fiche pas encore enregistrée.
Idem pour le scan disque : un fichier `vid-*` dont l'entité est en grâce n'est pas listé ; un fichier `vid-*` **sans aucune entité** et modifié il y a < 24 h est ignoré (upload partiel en cours). (Config `app.video.gc-grace-hours`, défaut 24.)

### 4. Confinement / sécurité
- Toute suppression de fichier passe par un chemin résolu + `startsWith(uploadPath)` (garde path-traversal, déjà dans `deleteByFilename`/`delete`).
- Le scan disque ne considère que le préfixe `vid-` → n'atteint jamais les photos (`{uuid}.ext`).
- `POST /api/admin/videos/gc` sous `/api/admin/**` (JWT).

## Tests
- **Backend** : `isReferenced` (les 3 sources, existsBy…) ; `deleteIfUnreferenced` (supprime si non référencé, ne touche pas si référencé) ; nettoyage immédiat au remplacement (`update` avec nouveau video_id → ancien supprimé) + à la suppression d'owner ; `gcOrphans(dryRun=true)` recense sans supprimer ; `dryRun=false` supprime ; **période de grâce** (skip UPLOADED/PROCESSING + READY < 24 h) ; fichiers `vid-*` orphelins listés/supprimés, fichier `vid-*` en grâce non listé ; **une vidéo référencée n'est jamais supprimée** ; endpoint `POST /gc` (JWT, dryRun défaut true, 200 + résumé). Transcoder/repos mockés + `@TempDir`.
- **Régression** : suites back + front vertes.

## Risques / contraintes
- Le nettoyage immédiat touche les flux `update`/`delete` des fiches — best-effort pour ne pas casser l'édition si un fichier est verrouillé.
- La période de grâce protège les uploads en cours d'attachement ; sans elle, un GC déclenché entre upload et enregistrement de fiche supprimerait une vidéo légitime.

## Hors portée
- GC des photos médiathèque (admin dédié) et des `.vtt` orphelins (non liés à l'entité Video).
- GC automatique planifié (`@Scheduled`) — le nettoyage immédiat + le GC manuel suffisent en single-tenant.
