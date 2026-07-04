# Médiathèque vidéo (SP4) — Design

Date : 2026-07-03
Statut : Validé (brainstorming)
Chantier : Vidéos — sous-projet 4. S'appuie sur SP1 (transcodage async), SP2 (HLS), et **révise SP3** (GC orphelins, branche `feat/videos-sp3-gc` non mergée).

## Contexte & objectif

Aujourd'hui une vidéo est **uploadée directement** sur une fiche mobilier/expo ou le Studio (`<app-video-field>`), et il n'existe aucun moyen de **réutiliser** une vidéo existante : ni liste, ni picker, ni page de gestion. La médiathèque ne contient que des images.

Objectif : une **médiathèque vidéo** symétrique de la médiathèque photo — une **page de gestion** (parcourir, uploader, voir les usages, supprimer) et un **picker** pour réutiliser une vidéo existante depuis le champ vidéo d'une fiche/Studio.

## Modèle de cycle de vie : bibliothèque (révise SP3)

Décision structurante : une entité `Video` devient un **asset de première classe**, indépendant des fiches. Elle persiste jusqu'à **suppression explicite**. Les fiches/Studio ne font que la *référencer* (`furniture.video_id`, `exhibition.video_id`, clé `studio.video.id`), plusieurs pouvant partager la même vidéo (déjà supporté par `isReferenced` multi-propriétaires de SP3 T1).

Ce modèle est **incompatible** avec l'auto-nettoyage de SP3, qui traite « vidéo non référencée = déchet ». SP3 est donc révisé (il n'est pas mergé, c'est le bon moment) :

- **Retirer** le nettoyage immédiat au remplacement/suppression (SP3 T2) : les hooks `deleteIfUnreferenced` dans `FurnitureService.update`/`deleteBySlug`, `ExhibitionService.update`/`deleteBySlug`, `SiteContentService.saveAll`. Remplacer/détacher une vidéo ne la supprime plus — elle reste en bibliothèque.
- **Retirer** le GC des **entités** orphelines : une entité `Video` non référencée n'est plus un déchet.
- **Garder** le GC des **fichiers disque** `vid-*` **sans entité** (vrais orphelins techniques : restes d'échecs/suppressions). `POST /gc` subsiste, `VideoGcReport` → `{orphanFiles, deleted}`.
- **Supprimer** `deleteIfUnreferenced` (devenu mort). **Conserver** `isReferenced` + `existsByVideoId` — réutilisés pour l'affichage des usages et le garde-fou de suppression.
- Suppression désormais **explicite** depuis la page médiathèque, **refusée (409) si la vidéo est référencée**.

## Architecture (unités)

**Backend**
1. Révision cleanup SP3 (voir ci-dessus).
2. Référencement inverse (`usedBy`) : quelles fiches/expo/Studio pointent une vidéo, calculé **en lot**.
3. Endpoint **liste** `GET /api/admin/videos` + endpoint **DELETE gardé**.

**Frontend**
4. `<app-video-picker>` partagé (modale, miroir de `photo-picker`), branché dans `<app-video-field>`.
5. Page **Médiathèque vidéo** (liste + upload central + usages + suppression).
6. Nav + route + méthodes `PortfolioService` + modèle.

## Backend — détail

### Endpoints `/api/admin/videos` (JWT)

| Méthode | Endpoint | Statut | Rôle |
|---|---|---|---|
| **GET** | `/api/admin/videos` | nouveau | Liste toutes les vidéos (tous statuts, tri `createdAt` décroissant) → `VideoSummary[]`. Sert la page ET le picker (qui filtre `READY` côté client). |
| **DELETE** | `/api/admin/videos/{id}` | modifié | **409 + `usedBy`** si référencée ; sinon supprime fichiers + entité → 204. |
| POST | `/api/admin/videos` | existant | Upload async (réutilisé pour l'upload central). |
| GET | `/api/admin/videos/{id}` | existant | Polling statut. |
| POST | `/api/admin/videos/{id}/retry` | existant | Relance si FAILED. |
| POST | `/api/admin/videos/gc?dryRun` | simplifié | Disque seul → `{orphanFiles, deleted}`. |
| POST | `/api/admin/videos/hls` | existant | Batch HLS. |

### DTOs (records)

- `VideoUsage(String type, String label, String slug)` — `type` ∈ `furniture` / `exhibition` / `studio` ; `slug` null pour Studio (label = « Studio »).
- `VideoSummary(String id, String status, String originalName, String url, String poster, String hls, Double durationSeconds, Integer width, Integer height, String createdAt, String errorMessage, List<VideoUsage> usedBy)` — `url`/`poster`/`hls` résolus si les fichiers correspondants existent (réutilise la logique de résolution existante de `VideoService`, variante **admin** = tous statuts + `errorMessage`, contrairement à `resolveForPublic` READY-only).

### Référencement inverse (`usedBy`) — en lot

Pour éviter N requêtes, calcul en 3 requêtes puis regroupement en mémoire par `videoId` :
- `FurnitureRepository.findByVideoIdIsNotNull()` → `VideoUsage("furniture", title, slug)`.
- `ExhibitionRepository.findByVideoIdIsNotNull()` → `VideoUsage("exhibition", title, slug)`.
- Clé `studio.video.id` du `SiteContentRepository` → `VideoUsage("studio", "Studio", null)`.

Nouvelles méthodes repo : `List<FurnitureEntity> findByVideoIdIsNotNull()`, `List<ExhibitionEntity> findByVideoIdIsNotNull()`. (`existsByVideoId` de SP3 T1 conservé.)

### DELETE gardé

`DELETE /api/admin/videos/{id}` : si `isReferenced(id)` → `409` avec le corps `{ usedBy: VideoUsage[] }` (pour que l'UI explique). Sinon suppression (fichiers source/output/poster + `{id}-hls/` + entité) → `204`. `404` si l'entité n'existe pas.

### Schéma

**Aucune migration** : l'entité `Video` porte déjà `original_name`, `created_at`, `duration_seconds`, `width`/`height`, `poster_filename`, `hls_master_filename`. Le référencement inverse s'appuie sur les colonnes `video_id` existantes.

## Frontend — détail

### `<app-video-picker>` (partagé)

Miroir de `photo-picker` : modale accessible (`role=dialog`, `aria-modal`, piège de focus `cdkTrapFocus` + restitution du focus à la fermeture). Liste les vidéos **`READY`** : vignette poster, nom d'origine, durée (mm:ss), dimensions. Champ de recherche par nom (filtre client). Input `[videos]: VideoSummary[]` (le parent fournit la liste) ; outputs `selected(videoId: string)` + `closed()`.

### Intégration `<app-video-field>`

Nouveau bouton **« Choisir une vidéo existante »** (à côté d'« Ajouter une vidéo ») : au clic, `getVideos()` puis ouvre le picker. À la sélection : `videoId = id` + `videoIdChange.emit(id)` + `loadVideoStatus(id)` (réutilise le flux existant). Le poster override par fiche n'est **pas** modifié (s'il est vide, l'auto-poster de la vidéo choisie s'affiche).

### Page « Médiathèque vidéo » (`pages/admin/mediatheque-video/`)

Grille de cartes, miroir de la médiathèque photo :
- Carte : vignette poster, nom d'origine, **badge de statut** (READY / PROCESSING via `aria-live` / FAILED + bouton **Relancer**), durée·dimensions, date, et bloc **« Utilisée par : … »** avec liens (édition fiche mobilier, édition expo, Studio).
- **Zone d'upload central** : file input `video/mp4,video/webm` → `uploadVideo` → polling statut (comme `<app-video-field>`) ; la nouvelle vidéo apparaît dans la grille (PROCESSING → READY).
- **Supprimer** : bouton désactivé si `usedBy` non vide (infobulle « utilisée par … ») ; sinon confirmation → `deleteVideo(id)`. Le serveur garde le `409` en filet (toast d'erreur si reçu).

### `PortfolioService` + modèle

Nouvelles méthodes : `getVideos(): Observable<VideoSummary[]>` (GET liste), `deleteVideo(id): Observable<void>` (DELETE, gère 409). `uploadVideo`/`getVideoStatus`/`retryVideo` existent déjà. Interfaces `VideoSummary` / `VideoUsage` ajoutées à `video.model.ts`.

### Nav + routes

- `admin.routes.ts` : route lazy `mediatheque-video` (`loadComponent`).
- Nav admin (`navigation.component`) : entrée **« Médiathèque vidéo »**. Renommage de l'entrée existante « Médiathèque » → **« Médiathèque photo »** (libellé, pour lever l'ambiguïté).

### Accessibilité (RGAA)

Modale : piège + restitution de focus, `aria-modal`, fermeture Échap. Statuts d'upload via `aria-live`. Boutons (choisir, supprimer, relancer) avec libellés explicites. Vignettes avec `alt`. Navigation clavier complète. Miroir des garanties a11y déjà en place sur `photo-picker` / médiathèque photo.

## Flux de données

1. **Réutilisation** : champ vidéo → « Choisir une vidéo existante » → `getVideos()` → picker (READY) → `selected(id)` → `video_id` de la fiche mis à jour à l'enregistrement → résolution DTO publique READY-only inchangée.
2. **Upload central** : page médiathèque → upload → entité `Video(UPLOADED)` → transcodage async → READY → visible dans la grille et le picker.
3. **Suppression** : page → si `usedBy` vide → DELETE → 204 ; sinon bloqué (UI) / 409 (serveur).
4. **GC disque** : `POST /gc` supprime uniquement les fichiers `vid-*` sans entité.

## Gestion d'erreurs

- Upload : extension refusée → 400 (message) ; transcodage FAILED → badge + Relancer.
- DELETE d'une vidéo référencée → 409 + `usedBy` (UI l'empêche déjà, serveur en filet).
- Liste : erreur réseau → message + réessai.

## Tests

**Backend (H2 + Mockito)** : `VideoService.listAll` (usedBy en lot, tri, résolution d'URLs, tous statuts) ; DELETE gardé (409 si référencée, 204 sinon, 404 inconnu) ; `gcOrphans` simplifié (fichiers disque seuls) ; **revert des hooks** vérifié (remplacer/supprimer une fiche **ne supprime plus** la vidéo).

**Frontend (Karma+Jasmine)** : `video-picker` (liste/sélection/fermeture/focus) ; `mediatheque-video` (upload/poll/usages/suppression bloquée si utilisée) ; méthodes `PortfolioService`.

**Playwright** : **aucune baseline** générée avant validation visuelle manuelle des deux surfaces (page + picker) par l'utilisateur — conforme à la règle établie.

## Hors périmètre / backlog

- **Fix aperçu poster** (`<app-video-player>` : `hls.js autoStartLoad:false` pour que le poster reste visible jusqu'au play) : bug distinct, petit ; à traiter séparément ou à bundler.
- Libellé/titre éditable par vidéo (au-delà du nom d'origine) : YAGNI pour l'instant.
- Déclenchement périodique/planifié du GC disque (aujourd'hui manuel).
- Tags/filtres avancés sur la médiathèque vidéo.

## Documentation impactée (au merge)

ADR-0021 (section SP4 + révision de la section SP3), `SPECIFICATION_TECHNIQUE.md` §4.10 (endpoints liste/DELETE gardé, modèle bibliothèque, GC simplifié), `SPECIFICATION_FONCTIONNELLE.md` (médiathèque vidéo côté admin).
