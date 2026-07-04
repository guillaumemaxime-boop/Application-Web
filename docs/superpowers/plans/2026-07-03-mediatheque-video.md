# Médiathèque vidéo (SP4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer les vidéos en assets de bibliothèque réutilisables — page de gestion « Médiathèque vidéo » (liste, upload central, usages, suppression) + picker de réutilisation dans le champ vidéo — en révisant SP3 vers le modèle bibliothèque.

**Architecture:** Backend Spring Boot 4.1 : révision du cleanup SP3 (on retire l'auto-suppression, on garde le GC des fichiers disque sans entité), endpoint liste `GET /api/admin/videos` avec référencement inverse `usedBy` calculé en lot, DELETE gardé (409 si référencée). Frontend Angular 21 (standalone, signals, `@if`/`@for`) : composant `<app-video-picker>` miroir de `<app-photo-picker>`, page `mediatheque-video` miroir de la médiathèque photo, méthodes `PortfolioService`.

**Tech Stack:** Java 25, Spring Boot 4.1, JPA (H2 en test PostgreSQL-mode), Jackson 3 (`tools.jackson`), JUnit 5 + Mockito ; Angular 21, Karma + Jasmine, Angular CDK `A11yModule`.

## Global Constraints

- **Modèle bibliothèque** : une entité `Video` persiste jusqu'à suppression explicite ; remplacer/détacher une vidéo d'une fiche ne la supprime plus.
- **Aucune migration** : l'entité `Video` porte déjà `original_name`, `created_at`, `duration_seconds`, `width`/`height`, `poster_filename`, `hls_master_filename`.
- **Le GC ne cible que les entrées `vid-*`** (fichiers disque sans entité) ; les photos `{uuid}.ext` ne sont jamais candidates. Suppression confinée à `uploadDir` (`startsWith` sur chemin normalisé).
- **Résolution d'URLs** (identique à `resolveForPublic`) : `url = baseUrl + "/" + outputFilename` ; `poster = "/api/photos/files/" + posterFilename` ; `hls = baseUrl + "/" + hlsMasterFilename`. `baseUrl` = `app.video.base-url` (défaut `/api/videos/files`).
- **DELETE d'une vidéo référencée → 409** avec corps `{ usedBy: VideoUsage[] }`.
- **Codebase français** (UI, commits, noms de tests). Commits conventional-commits FR, terminés par `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Frontend** : standalone components, signals (pas de RxJS pour l'état), `@if`/`@for`, pas de `HttpClient` dans les composants (tout via `PortfolioService`).
- **Playwright** : ne générer AUCUNE baseline avant validation visuelle manuelle par l'utilisateur.
- **Branche** : `feat/videos-sp3-gc` (non mergée, contient SP3 ; ce plan la révise). Renommage optionnel en `feat/videos-sp4-mediatheque` — sans incidence sur les tâches.
- **Tests via Docker** : `docker compose -f docker-compose.test.yml run --rm backend-test` / `frontend-test`.

---

### Task 1: Révision du cleanup SP3 (modèle bibliothèque)

Retirer l'auto-suppression des vidéos (hooks au remplacement/suppression + GC des entités orphelines) ; garder uniquement le GC des **fichiers disque `vid-*` sans entité**. `isReferenced`/`existsByVideoId` sont conservés (réutilisés Tasks 2-3).

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/VideoService.java` (méthodes `gcOrphans`, record `VideoGcReport`, suppression de `deleteIfUnreferenced` et `inGrace`)
- Modify: `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java:99-122` (`update`, `deleteBySlug`)
- Modify: `backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java:95-119` (`update`, `deleteBySlug`)
- Modify: `backend/src/main/java/com/atelier/portfolio/service/SiteContentService.java:67-90` (`saveAll`)
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java:108-115` (`gc`)
- Test: `backend/src/test/java/com/atelier/portfolio/service/VideoServiceTest.java`, `FurnitureServiceTest.java`, `ExhibitionServiceTest.java`, `SiteContentServiceTest.java`, `controller/AdminVideoControllerTest.java`

**Interfaces:**
- Consumes: rien (première tâche).
- Produces: `VideoService.VideoGcReport(java.util.List<String> orphanFiles, boolean deleted)` ; `public boolean isReferenced(String videoId)` (inchangé) ; `gcOrphans(boolean dryRun)` retourne le nouveau report.

- [ ] **Step 1 : Adapter les tests SP3 devenus caducs (les faire échouer/compiler d'abord)**

Dans les fichiers de test, **supprimer** les tests qui asservissent le comportement retiré (ils ne compileront plus après le changement de signature `VideoGcReport`, ou asserteront un comportement supprimé) :
- `VideoServiceTest` : supprimer les tests de `deleteIfUnreferenced` et les cas de `gcOrphans` portant sur les **entités orphelines** (`orphanVideos`). Conserver/adapter les cas « fichiers disque ».
- `FurnitureServiceTest` / `ExhibitionServiceTest` : supprimer les tests vérifiant qu'`update`/`deleteBySlug` appelle `videoService.deleteIfUnreferenced(...)` (ajoutés en SP3 T2).
- `SiteContentServiceTest` : supprimer le test vérifiant que `saveAll` appelle `deleteIfUnreferenced` sur l'ancien `studio.video.id`.

Ajouter le **nouveau** test de `gcOrphans` (disque-seul) dans `VideoServiceTest` (utilise `@TempDir`, `VideoRepository` mocké) :

```java
@Test
void gcOrphans_recense_les_fichiers_vid_sans_entite_hors_grace() throws Exception {
    // repository ne connaît AUCUNE entité → tout fichier vid-* ancien est orphelin
    when(repository.findAll()).thenReturn(java.util.List.of());
    java.nio.file.Path dir = tempDir; // @TempDir injecté, = app.upload.dir du test
    java.nio.file.Path orphan = java.nio.file.Files.createFile(dir.resolve("vid-dead.mp4"));
    // mtime ancien (au-delà de la grâce de 24h)
    java.nio.file.Files.setLastModifiedTime(orphan,
        java.nio.file.attribute.FileTime.from(java.time.Instant.now().minus(java.time.Duration.ofHours(48))));
    java.nio.file.Files.createFile(dir.resolve("photo.jpg")); // non vid-* → ignoré

    VideoService.VideoGcReport report = service.gcOrphans(false);

    assertTrue(report.orphanFiles().contains("vid-dead.mp4"));
    assertTrue(report.deleted());
    assertFalse(java.nio.file.Files.exists(orphan)); // supprimé
    assertTrue(java.nio.file.Files.exists(dir.resolve("photo.jpg"))); // intact
}

@Test
void gcOrphans_epargne_les_fichiers_recents_periode_de_grace() throws Exception {
    when(repository.findAll()).thenReturn(java.util.List.of());
    java.nio.file.Path fresh = java.nio.file.Files.createFile(tempDir.resolve("vid-fresh.mp4"));
    // mtime récent → protégé par la grâce
    VideoService.VideoGcReport report = service.gcOrphans(true); // dry-run
    assertFalse(report.orphanFiles().contains("vid-fresh.mp4"));
    assertTrue(java.nio.file.Files.exists(fresh));
}
```

> Note : si `VideoServiceTest` n'a pas encore de champ `@TempDir java.nio.file.Path tempDir` câblé sur `app.upload.dir`, s'aligner sur le pattern déjà utilisé par les tests `delete`/`gcOrphans` existants (le champ `uploadDir` de `VideoService` est injecté par réflexion via `ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString())` et `"gcGraceHours", 24`).

- [ ] **Step 2 : Lancer les tests → échec de compilation / rouge**

Run : `cd backend ; mvn -q -Dtest=VideoServiceTest test`
Expected : échec de compilation (signature `VideoGcReport` / `deleteIfUnreferenced` absents) ou tests rouges.

- [ ] **Step 3 : Réviser `VideoService`**

Changer le record et `gcOrphans`, supprimer `deleteIfUnreferenced` et `inGrace` :

```java
public record VideoGcReport(java.util.List<String> orphanFiles, boolean deleted) {}

/** GC des seuls FICHIERS disque vid-* sans entite connue (modele bibliotheque :
 *  une entite Video non referencee n'est PAS un dechet). */
public VideoGcReport gcOrphans(boolean dryRun) {
    java.util.Set<String> knownIds = new java.util.HashSet<>();
    for (VideoEntity e : repository.findAll()) knownIds.add(e.getId());
    java.util.List<String> orphanFiles = new java.util.ArrayList<>();
    Path dir = Paths.get(uploadDir);
    if (Files.isDirectory(dir)) {
        try (var stream = Files.list(dir)) {
            for (Path p : stream.toList()) {
                String name = p.getFileName().toString();
                if (!name.startsWith("vid-")) continue;
                String id = videoIdFromEntry(name);
                if (id != null && knownIds.contains(id)) continue;
                try {
                    if (Files.getLastModifiedTime(p).toInstant()
                            .isAfter(Instant.now().minus(java.time.Duration.ofHours(gcGraceHours)))) continue;
                } catch (IOException ignored) {}
                orphanFiles.add(name);
            }
        } catch (IOException ignored) {}
    }
    if (!dryRun) {
        Path uploadPath = dir.toAbsolutePath().normalize();
        for (String name : orphanFiles) {
            Path fp = uploadPath.resolve(name).normalize();
            if (!fp.startsWith(uploadPath)) continue;
            if (Files.isDirectory(fp)) deleteDirRecursive(fp);
            else { try { Files.deleteIfExists(fp); } catch (IOException ignored) {} }
        }
    }
    return new VideoGcReport(orphanFiles, !dryRun);
}
```

Supprimer entièrement les méthodes `public void deleteIfUnreferenced(String id)` et `private boolean inGrace(VideoEntity e)`. **Conserver** `isReferenced`, `videoIdFromEntry`, `deleteDirRecursive`, `delete`.

- [ ] **Step 4 : Retirer les hooks dans `FurnitureService`**

`update` :
```java
    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public Optional<Furniture> update(String slug, Furniture input) {
        return repository.findBySlug(slug).map(entity -> {
            applyChanges(entity, input);
            return toDto(repository.save(entity));
        });
    }
```
`deleteBySlug` :
```java
    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public boolean deleteBySlug(String slug) {
        return repository.findBySlug(slug).map(entity -> {
            storyService.deleteAllForOwner("furniture", entity.getId());
            homeFeedService.removeBySlug("furniture", entity.getSlug());
            repository.delete(entity);
            return true;
        }).orElse(false);
    }
```
> Garder le champ `videoService` (utilisé par `toDto` → `resolveForPublic`). Ne pas toucher au constructeur.

- [ ] **Step 5 : Retirer les hooks dans `ExhibitionService`** (même transformation)

`update` :
```java
    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public Optional<Exhibition> update(String slug, Exhibition input) {
        return repository.findBySlug(slug).map(entity -> {
            applyChanges(entity, input);
            return toDto(repository.save(entity));
        });
    }
```
`deleteBySlug` :
```java
    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public boolean deleteBySlug(String slug) {
        return repository.findBySlug(slug).map(entity -> {
            storyService.deleteAllForOwner("exhibition", entity.getId());
            homeFeedService.removeBySlug("exhibition", entity.getSlug());
            exhibitionMetaService.removeBySlug(entity.getSlug());
            repository.delete(entity);
            return true;
        }).orElse(false);
    }
```

- [ ] **Step 6 : Retirer le hook dans `SiteContentService.saveAll`**

```java
    @Transactional
    public Map<String, String> saveAll(Map<String, String> entries) {
        var entities = entries.entrySet().stream()
                .map(e -> {
                    SiteContentEntity entity = new SiteContentEntity();
                    entity.setKey(e.getKey());
                    entity.setValue(e.getValue());
                    return entity;
                })
                .toList();
        repository.saveAll(entities);
        return findAll();
    }
```
> Garder le champ `videoService` (utilisé par `findAll`).

- [ ] **Step 7 : Adapter l'endpoint `AdminVideoController.gc`**

```java
    @PostMapping("/gc")
    public ResponseEntity<?> gc(@RequestParam(defaultValue = "true") boolean dryRun) {
        VideoService.VideoGcReport r = service.gcOrphans(dryRun);
        return ResponseEntity.ok(Map.of("orphanFiles", r.orphanFiles(), "deleted", r.deleted()));
    }
```
Adapter les 2 tests `gc_*` de `AdminVideoControllerTest` au report 2-arg :
```java
    @Test
    void gc_dryRun_par_defaut_recense() {
        when(service.gcOrphans(true)).thenReturn(
            new VideoService.VideoGcReport(java.util.List.of("vid-b.mp4"), false));
        ResponseEntity<?> r = controller.gc(true);
        assertEquals(200, r.getStatusCode().value());
        assertEquals(false, ((java.util.Map<?,?>) r.getBody()).get("deleted"));
    }

    @Test
    void gc_execute_supprime() {
        when(service.gcOrphans(false)).thenReturn(
            new VideoService.VideoGcReport(java.util.List.of(), true));
        ResponseEntity<?> r = controller.gc(false);
        assertEquals(200, r.getStatusCode().value());
        assertEquals(true, ((java.util.Map<?,?>) r.getBody()).get("deleted"));
    }
```

- [ ] **Step 8 : Lancer la suite backend complète → verte**

Run : `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected : `BUILD SUCCESS`, 0 échec. (Confirme aussi que remplacer/supprimer une fiche ne supprime plus la vidéo — les tests d'auto-cleanup ont été retirés.)

- [ ] **Step 9 : Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/service/VideoService.java \
        backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java \
        backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java \
        backend/src/main/java/com/atelier/portfolio/service/SiteContentService.java \
        backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java \
        backend/src/test/java/com/atelier/portfolio/
git commit -m "refactor(videos): modele bibliotheque - retrait auto-cleanup, GC disque seul (revise SP3)"
```

---

### Task 2: Référencement inverse + endpoint liste `GET /api/admin/videos`

Ajouter le calcul en lot des usages (`usedBy`) et l'endpoint qui liste toutes les vidéos avec métadonnées + usages.

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/model/VideoUsage.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/VideoSummary.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/repository/FurnitureRepository.java` (ajout `findByVideoIdIsNotNull`)
- Modify: `backend/src/main/java/com/atelier/portfolio/repository/ExhibitionRepository.java` (ajout `findByVideoIdIsNotNull`)
- Modify: `backend/src/main/java/com/atelier/portfolio/service/VideoService.java` (ajout `listAll`, `referencesOf`)
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java` (ajout `GET`)
- Test: `backend/src/test/java/com/atelier/portfolio/service/VideoServiceTest.java`, `controller/AdminVideoControllerTest.java`

**Interfaces:**
- Consumes: `VideoService.isReferenced` (Task 1) ; `FurnitureEntity.getTitle()/getSlug()/getVideoId()`, `ExhibitionEntity.getTitle()/getSlug()/getVideoId()`.
- Produces :
  - `record VideoUsage(String type, String label, String slug)` — `type` ∈ `"furniture"`/`"exhibition"`/`"studio"`.
  - `record VideoSummary(String id, String status, String originalName, String url, String poster, String hls, Double durationSeconds, Integer width, Integer height, String createdAt, String errorMessage, java.util.List<VideoUsage> usedBy)`.
  - `public java.util.List<VideoSummary> VideoService.listAll()` — tri `createdAt` décroissant (nulls en fin).
  - `public java.util.List<VideoUsage> VideoService.referencesOf(String videoId)`.

- [ ] **Step 1 : Créer les records DTO**

`model/VideoUsage.java` :
```java
package com.atelier.portfolio.model;

public record VideoUsage(String type, String label, String slug) {}
```
`model/VideoSummary.java` :
```java
package com.atelier.portfolio.model;

import java.util.List;

public record VideoSummary(
        String id, String status, String originalName,
        String url, String poster, String hls,
        Double durationSeconds, Integer width, Integer height,
        String createdAt, String errorMessage,
        List<VideoUsage> usedBy) {}
```

- [ ] **Step 2 : Ajouter les méthodes repo**

`FurnitureRepository` : ajouter `List<FurnitureEntity> findByVideoIdIsNotNull();`
`ExhibitionRepository` : ajouter `List<ExhibitionEntity> findByVideoIdIsNotNull();`

- [ ] **Step 3 : Écrire les tests `VideoService.listAll` / `referencesOf` (rouge)**

Dans `VideoServiceTest` (les repos `furnitureRepository`/`exhibitionRepository`/`siteContentRepository` sont déjà des mocks injectés dans `VideoService`) :
```java
@Test
void listAll_construit_usedBy_en_lot_et_trie_par_date_desc() {
    VideoEntity v1 = new VideoEntity(); v1.setId("vid-1"); v1.setStatus(VideoStatus.READY);
    v1.setOriginalName("intro.mp4"); v1.setOutputFilename("vid-1.mp4");
    v1.setPosterFilename("vid-1-poster.jpg"); v1.setCreatedAt("2026-07-01T10:00:00Z");
    VideoEntity v2 = new VideoEntity(); v2.setId("vid-2"); v2.setStatus(VideoStatus.PROCESSING);
    v2.setOriginalName("clip.mp4"); v2.setCreatedAt("2026-07-02T10:00:00Z");
    when(repository.findAll()).thenReturn(java.util.List.of(v1, v2));

    FurnitureEntity f = new FurnitureEntity(); f.setTitle("Chaise"); f.setSlug("chaise"); f.setVideoId("vid-1");
    when(furnitureRepository.findByVideoIdIsNotNull()).thenReturn(java.util.List.of(f));
    when(exhibitionRepository.findByVideoIdIsNotNull()).thenReturn(java.util.List.of());
    var studio = new com.atelier.portfolio.entity.SiteContentEntity();
    studio.setKey("studio.video.id"); studio.setValue("vid-2");
    when(siteContentRepository.findById("studio.video.id")).thenReturn(java.util.Optional.of(studio));

    java.util.List<VideoSummary> list = service.listAll();

    assertEquals(2, list.size());
    assertEquals("vid-2", list.get(0).id()); // 2026-07-02 avant 2026-07-01
    VideoSummary s1 = list.stream().filter(s -> s.id().equals("vid-1")).findFirst().orElseThrow();
    assertEquals("/api/videos/files/vid-1.mp4", s1.url());
    assertEquals("/api/photos/files/vid-1-poster.jpg", s1.poster());
    assertEquals(1, s1.usedBy().size());
    assertEquals("furniture", s1.usedBy().get(0).type());
    assertEquals("chaise", s1.usedBy().get(0).slug());
    VideoSummary s2 = list.stream().filter(s -> s.id().equals("vid-2")).findFirst().orElseThrow();
    assertEquals("studio", s2.usedBy().get(0).type());
    assertNull(s2.url()); // PROCESSING → pas de fichier de sortie
}
```
Run : `cd backend ; mvn -q -Dtest=VideoServiceTest test` → FAIL (méthodes absentes).

- [ ] **Step 4 : Implémenter `referencesOf` et `listAll` dans `VideoService`**

```java
/** Usages d'une video (fiches mobilier/expo + Studio). Vide si orpheline. */
public java.util.List<VideoUsage> referencesOf(String videoId) {
    java.util.List<VideoUsage> usages = new java.util.ArrayList<>();
    for (var f : furnitureRepository.findByVideoIdIsNotNull()) {
        if (videoId.equals(f.getVideoId())) usages.add(new VideoUsage("furniture", f.getTitle(), f.getSlug()));
    }
    for (var e : exhibitionRepository.findByVideoIdIsNotNull()) {
        if (videoId.equals(e.getVideoId())) usages.add(new VideoUsage("exhibition", e.getTitle(), e.getSlug()));
    }
    siteContentRepository.findById("studio.video.id")
        .filter(s -> videoId.equals(s.getValue()))
        .ifPresent(s -> usages.add(new VideoUsage("studio", "Studio", null)));
    return usages;
}

/** Liste admin de toutes les videos (tous statuts) avec usages, tri date desc. */
public java.util.List<VideoSummary> listAll() {
    // usedBy en lot : une passe sur chaque source, regroupee par videoId
    java.util.Map<String, java.util.List<VideoUsage>> byVideo = new java.util.HashMap<>();
    for (var f : furnitureRepository.findByVideoIdIsNotNull()) {
        byVideo.computeIfAbsent(f.getVideoId(), k -> new java.util.ArrayList<>())
               .add(new VideoUsage("furniture", f.getTitle(), f.getSlug()));
    }
    for (var e : exhibitionRepository.findByVideoIdIsNotNull()) {
        byVideo.computeIfAbsent(e.getVideoId(), k -> new java.util.ArrayList<>())
               .add(new VideoUsage("exhibition", e.getTitle(), e.getSlug()));
    }
    siteContentRepository.findById("studio.video.id")
        .map(com.atelier.portfolio.entity.SiteContentEntity::getValue)
        .filter(v -> v != null && !v.isBlank())
        .ifPresent(v -> byVideo.computeIfAbsent(v, k -> new java.util.ArrayList<>())
               .add(new VideoUsage("studio", "Studio", null)));

    java.util.Comparator<VideoEntity> byDateDesc = java.util.Comparator.comparing(
        VideoEntity::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder()));
    return repository.findAll().stream()
        .sorted(byDateDesc)
        .map(e -> new VideoSummary(
            e.getId(), e.getStatus().name(), e.getOriginalName(),
            e.getOutputFilename() != null ? baseUrl + "/" + e.getOutputFilename() : null,
            e.getPosterFilename() != null ? "/api/photos/files/" + e.getPosterFilename() : null,
            e.getHlsMasterFilename() != null ? baseUrl + "/" + e.getHlsMasterFilename() : null,
            e.getDurationSeconds(), e.getWidth(), e.getHeight(),
            e.getCreatedAt(), e.getErrorMessage(),
            byVideo.getOrDefault(e.getId(), java.util.List.of())))
        .toList();
}
```
> `nullsLast(reverseOrder())` sur `createdAt` (String ISO-8601 triable lexicographiquement) donne le plus récent en tête, nulls en fin.

- [ ] **Step 5 : Ajouter l'endpoint GET dans `AdminVideoController`**

```java
    // GET / — liste (mediatheque video + picker)
    @GetMapping
    public ResponseEntity<java.util.List<VideoSummary>> list() {
        return ResponseEntity.ok(service.listAll());
    }
```
Ajouter l'import `import com.atelier.portfolio.model.VideoSummary;`.
Test contrôleur dans `AdminVideoControllerTest` :
```java
@Test
void list_renvoie_200_avec_les_videos() {
    when(service.listAll()).thenReturn(java.util.List.of(
        new com.atelier.portfolio.model.VideoSummary("vid-1", "READY", "a.mp4",
            "/api/videos/files/vid-1.mp4", null, null, 12.0, 1920, 1080,
            "2026-07-01T10:00:00Z", null, java.util.List.of())));
    ResponseEntity<?> r = controller.list();
    assertEquals(200, r.getStatusCode().value());
    assertEquals(1, ((java.util.List<?>) r.getBody()).size());
}
```

- [ ] **Step 6 : Lancer les tests ciblés → verts**

Run : `cd backend ; mvn -q -Dtest=VideoServiceTest,AdminVideoControllerTest test`
Expected : PASS.

- [ ] **Step 7 : Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/model/VideoUsage.java \
        backend/src/main/java/com/atelier/portfolio/model/VideoSummary.java \
        backend/src/main/java/com/atelier/portfolio/repository/FurnitureRepository.java \
        backend/src/main/java/com/atelier/portfolio/repository/ExhibitionRepository.java \
        backend/src/main/java/com/atelier/portfolio/service/VideoService.java \
        backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java \
        backend/src/test/java/com/atelier/portfolio/
git commit -m "feat(videos): endpoint GET /api/admin/videos (liste + usages en lot)"
```

---

### Task 3: DELETE gardé (409 si vidéo référencée)

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java:121-126` (`deleteById`)
- Test: `backend/src/test/java/com/atelier/portfolio/controller/AdminVideoControllerTest.java`

**Interfaces:**
- Consumes: `VideoService.referencesOf(String)` (Task 2), `VideoService.delete(String)` (existant, retourne `boolean`).
- Produces: `DELETE /api/admin/videos/{id}` → `409 {usedBy}` si référencée, `204` si supprimée, `404` si inconnue.

- [ ] **Step 1 : Écrire les tests (rouge)**

Dans `AdminVideoControllerTest` — remplacer/compléter les tests DELETE existants :
```java
@Test
void deleteById_referencee_renvoie_409_avec_usedBy() {
    when(service.referencesOf("vid-1")).thenReturn(java.util.List.of(
        new com.atelier.portfolio.model.VideoUsage("furniture", "Chaise", "chaise")));
    ResponseEntity<?> r = controller.deleteById("vid-1");
    assertEquals(409, r.getStatusCode().value());
    assertTrue(((java.util.Map<?,?>) r.getBody()).containsKey("usedBy"));
    verify(service, never()).delete("vid-1");
}

@Test
void deleteById_non_referencee_existante_renvoie_204() {
    when(service.referencesOf("vid-1")).thenReturn(java.util.List.of());
    when(service.delete("vid-1")).thenReturn(true);
    ResponseEntity<?> r = controller.deleteById("vid-1");
    assertEquals(204, r.getStatusCode().value());
}

@Test
void deleteById_non_referencee_inconnue_renvoie_404() {
    when(service.referencesOf("vid-x")).thenReturn(java.util.List.of());
    when(service.delete("vid-x")).thenReturn(false);
    ResponseEntity<?> r = controller.deleteById("vid-x");
    assertEquals(404, r.getStatusCode().value());
}
```
> Supprimer l'ancien `deleteById_existant_renvoie_204` / `deleteById_absent_renvoie_404` s'ils n'attendent pas `referencesOf` (ils casseraient avec le nouveau flux). Le type de retour de `deleteById` passe de `ResponseEntity<Void>` à `ResponseEntity<?>`.

Run : `cd backend ; mvn -q -Dtest=AdminVideoControllerTest test` → FAIL.

- [ ] **Step 2 : Implémenter le garde-fou**

```java
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteById(@PathVariable String id) {
        java.util.List<com.atelier.portfolio.model.VideoUsage> usedBy = service.referencesOf(id);
        if (!usedBy.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("usedBy", usedBy));
        }
        return service.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
```

- [ ] **Step 3 : Tests ciblés → verts**

Run : `cd backend ; mvn -q -Dtest=AdminVideoControllerTest test`
Expected : PASS.

- [ ] **Step 4 : Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java \
        backend/src/test/java/com/atelier/portfolio/controller/AdminVideoControllerTest.java
git commit -m "feat(videos): DELETE /api/admin/videos/{id} garde (409 si referencee)"
```

---

### Task 4: `PortfolioService` — `getVideos` / `deleteVideo` + modèles front

**Files:**
- Modify: `frontend/src/app/models/video.model.ts` (ajout `VideoUsage`, `VideoSummary`)
- Modify: `frontend/src/app/services/portfolio.service.ts` (ajout `getVideos`, `deleteVideo`)
- Test: `frontend/src/app/services/portfolio.service.spec.ts`

**Interfaces:**
- Consumes: endpoints `GET /api/admin/videos`, `DELETE /api/admin/videos/{id}` (Tasks 2-3).
- Produces (TypeScript) :
  - `interface VideoUsage { type: 'furniture' | 'exhibition' | 'studio'; label: string; slug: string | null; }`
  - `interface VideoSummary { id; status: VideoStatus; originalName: string | null; url: string | null; poster: string | null; hls: string | null; durationSeconds: number | null; width: number | null; height: number | null; createdAt: string | null; errorMessage: string | null; usedBy: VideoUsage[]; }`
  - `getVideos(): Observable<VideoSummary[]>`, `deleteVideo(id: string): Observable<void>`.

- [ ] **Step 1 : Ajouter les interfaces dans `video.model.ts`**

```typescript
export interface VideoUsage {
  type: 'furniture' | 'exhibition' | 'studio';
  label: string;
  slug: string | null;
}

export interface VideoSummary {
  id: string;
  status: VideoStatus;
  originalName: string | null;
  url: string | null;
  poster: string | null;
  hls: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  createdAt: string | null;
  errorMessage: string | null;
  usedBy: VideoUsage[];
}
```

- [ ] **Step 2 : Écrire le test service (rouge)**

Dans `portfolio.service.spec.ts` (pattern `HttpTestingController` déjà utilisé dans ce spec) :
```typescript
it('getVideos GET /api/admin/videos', () => {
  service.getVideos().subscribe(v => expect(v.length).toBe(1));
  const req = httpMock.expectOne('/api/admin/videos');
  expect(req.request.method).toBe('GET');
  req.flush([{ id: 'vid-1', status: 'READY', originalName: 'a.mp4', url: null, poster: null,
    hls: null, durationSeconds: null, width: null, height: null, createdAt: null,
    errorMessage: null, usedBy: [] }]);
});

it('deleteVideo DELETE /api/admin/videos/:id', () => {
  service.deleteVideo('vid-1').subscribe();
  const req = httpMock.expectOne('/api/admin/videos/vid-1');
  expect(req.request.method).toBe('DELETE');
  req.flush(null);
});
```
> Vérifier l'URL exacte selon la constante `API` du spec (probablement `/api`). Aligner sur les tests existants (`uploadVideo`, `deletePhoto`).

Run : `cd frontend ; npx ng test --watch=false --include='**/portfolio.service.spec.ts'` → FAIL.

- [ ] **Step 3 : Implémenter les méthodes dans `portfolio.service.ts`**

Près des autres méthodes vidéo (après `generateHls`) :
```typescript
  getVideos(): Observable<VideoSummary[]> {
    return this.http.get<VideoSummary[]>(`${API}/admin/videos`);
  }

  deleteVideo(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/videos/${id}`);
  }
```
Ajouter `VideoSummary` à l'import depuis `../models/video.model`.

- [ ] **Step 4 : Tests service → verts**

Run : `cd frontend ; npx ng test --watch=false --include='**/portfolio.service.spec.ts'`
Expected : SUCCESS.

- [ ] **Step 5 : Commit**

```bash
git add frontend/src/app/models/video.model.ts \
        frontend/src/app/services/portfolio.service.ts \
        frontend/src/app/services/portfolio.service.spec.ts
git commit -m "feat(videos): PortfolioService getVideos/deleteVideo + modeles VideoSummary/VideoUsage"
```

---

### Task 5: `<app-video-picker>` + intégration dans `<app-video-field>`

Composant modale (miroir de `<app-photo-picker>`) listant les vidéos `READY` ; bouton « Choisir une vidéo existante » dans le champ vidéo.

**Files:**
- Create: `frontend/src/app/pages/admin/shared/video-picker.component.ts`
- Create: `frontend/src/app/pages/admin/shared/video-picker.component.spec.ts`
- Modify: `frontend/src/app/pages/admin/shared/video-field.component.ts` (bouton + ouverture picker + sélection)
- Test: `frontend/src/app/pages/admin/shared/video-field.component.spec.ts`

**Interfaces:**
- Consumes: `PortfolioService.getVideos()` (Task 4), `VideoSummary` (Task 4).
- Produces: `VideoPickerComponent` — `@Input() videos: VideoSummary[]`, `@Output() selected = EventEmitter<string>` (émet le `videoId`), `@Output() closed = EventEmitter<void>`.

- [ ] **Step 1 : Écrire le test du picker (rouge)**

`video-picker.component.spec.ts` :
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoPickerComponent } from './video-picker.component';
import { VideoSummary } from '../../../models/video.model';

const ready = (id: string): VideoSummary => ({
  id, status: 'READY', originalName: id + '.mp4', url: '/api/videos/files/' + id + '.mp4',
  poster: null, hls: null, durationSeconds: 65, width: 1920, height: 1080,
  createdAt: null, errorMessage: null, usedBy: [],
});

describe('VideoPickerComponent', () => {
  let fixture: ComponentFixture<VideoPickerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VideoPickerComponent] }).compileComponents();
    fixture = TestBed.createComponent(VideoPickerComponent);
  });

  it('ne liste que les vidéos READY', () => {
    fixture.componentInstance.videos = [ready('vid-1'),
      { ...ready('vid-2'), status: 'PROCESSING' }];
    fixture.detectChanges();
    expect(fixture.componentInstance['readyVideos']().length).toBe(1);
  });

  it('émet selected(videoId) au choix', () => {
    let picked: string | null = null;
    fixture.componentInstance.selected.subscribe((id: string) => picked = id);
    fixture.componentInstance.select(ready('vid-9'));
    expect(picked).toBe('vid-9');
  });

  it('formate la durée en mm:ss', () => {
    expect(fixture.componentInstance.fmtDuration(65)).toBe('1:05');
    expect(fixture.componentInstance.fmtDuration(null)).toBe('');
  });
});
```
Run : `cd frontend ; npx ng test --watch=false --include='**/video-picker.component.spec.ts'` → FAIL.

- [ ] **Step 2 : Implémenter `video-picker.component.ts`**

Miroir de `photo-picker.component.ts` (reprendre la même structure de modale accessible : `role="dialog"`, `aria-modal`, `cdkTrapFocus cdkTrapFocusAutoCapture`, restitution du focus dans `ngOnInit`/`ngOnDestroy`, `@HostListener('document:keydown.escape')`). Reprendre les styles `.picker-*` de `photo-picker.component.ts` (backdrop, panel, head, search, grid, item). Différences : liste `READY`, vignette poster (placeholder si null), nom + durée.

```typescript
import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { VideoSummary } from '../../../models/video.model';

@Component({
  selector: 'app-video-picker',
  standalone: true,
  imports: [FormsModule, A11yModule],
  template: `
    <div class="picker-backdrop" role="presentation" (click)="emitClose()">
      <div class="picker-panel" role="dialog" aria-modal="true"
           [attr.aria-labelledby]="'video-picker-title'"
           cdkTrapFocus cdkTrapFocusAutoCapture (click)="$event.stopPropagation()">
        <div class="picker-head">
          <h3 id="video-picker-title">Choisir une vidéo existante</h3>
          <button type="button" class="picker-close" (click)="emitClose()" aria-label="Fermer">×</button>
        </div>
        @if (readyVideos().length === 0) {
          <p class="picker-empty">Aucune vidéo prête. Importez une vidéo dans la Médiathèque vidéo.</p>
        } @else {
          <div class="picker-search">
            <input type="search" class="picker-search-input"
              [ngModel]="query()" (ngModelChange)="query.set($event)"
              placeholder="Rechercher par nom…" aria-label="Rechercher une vidéo par nom" />
          </div>
          @if (filtered().length === 0) {
            <p class="picker-empty">Aucun résultat pour « {{ query() }} ».</p>
          } @else {
            <div class="picker-grid">
              @for (v of filtered(); track v.id) {
                <button type="button" class="picker-item vp-item" (click)="select(v)"
                        [title]="v.originalName">
                  @if (v.poster) {
                    <img [src]="v.poster" [alt]="v.originalName ?? 'Vidéo'" loading="lazy" />
                  } @else {
                    <span class="vp-noposter" aria-hidden="true">▶</span>
                  }
                  <span class="vp-caption">
                    <span class="vp-name">{{ v.originalName ?? v.id }}</span>
                    @if (v.durationSeconds) { <span class="vp-dur">{{ fmtDuration(v.durationSeconds) }}</span> }
                  </span>
                </button>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    /* Reprendre .picker-backdrop/.picker-panel/.picker-head/.picker-close/.picker-empty
       /.picker-search/.picker-search-input/.picker-grid/.picker-item de photo-picker.component.ts */
    .vp-item { display: flex; flex-direction: column; aspect-ratio: auto; }
    .vp-item img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
    .vp-noposter { display: flex; align-items: center; justify-content: center; aspect-ratio: 16/9; background: var(--color-bg-alt); color: var(--color-mute); font-size: 1.5rem; }
    .vp-caption { display: flex; justify-content: space-between; gap: 8px; padding: 6px 8px; font-size: 0.72rem; }
    .vp-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .vp-dur { color: var(--color-mute); flex-shrink: 0; }
  `]
})
export class VideoPickerComponent implements OnInit, OnDestroy {
  @Input() videos: VideoSummary[] = [];
  @Output() selected = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  protected readonly query = signal('');
  private previousFocus: HTMLElement | null = null;

  protected readonly readyVideos = computed(() => this.videos.filter(v => v.status === 'READY'));

  protected filtered(): VideoSummary[] {
    const q = this.query().trim().toLowerCase();
    const list = this.readyVideos();
    if (!q) return list;
    return list.filter(v => (v.originalName ?? v.id).toLowerCase().includes(q));
  }

  ngOnInit(): void {
    if (typeof document !== 'undefined') this.previousFocus = document.activeElement as HTMLElement | null;
  }
  ngOnDestroy(): void { this.restorePreviousFocus(); }
  private restorePreviousFocus(): void {
    const t = this.previousFocus;
    if (!t || typeof t.focus !== 'function') return;
    setTimeout(() => { try { t.focus(); } catch { /* ignore */ } }, 0);
    this.previousFocus = null;
  }

  fmtDuration(seconds: number | null): string {
    if (seconds == null) return '';
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  select(v: VideoSummary): void { this.selected.emit(v.id); }
  emitClose(): void { this.closed.emit(); this.restorePreviousFocus(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.emitClose(); }
}
```

- [ ] **Step 3 : Test picker → vert**

Run : `cd frontend ; npx ng test --watch=false --include='**/video-picker.component.spec.ts'`
Expected : SUCCESS.

- [ ] **Step 4 : Intégrer dans `<app-video-field>`**

Dans `video-field.component.ts` :
1. Import : `import { VideoPickerComponent } from './video-picker.component';` et l'ajouter à `imports`. Importer aussi `VideoSummary`.
2. Ajouter dans le template, après le bouton « Poster depuis la médiathèque » (dans `.vf-actions`), un bouton :
```html
        <button type="button" class="vf-btn" (click)="openVideoPicker()">Choisir une vidéo existante</button>
```
3. Ajouter la modale à la fin du template (à côté de `app-photo-picker`) :
```html
    @if (videoPickerOpen()) {
      <app-video-picker
        [videos]="videoLibrary()"
        (selected)="onVideoPicked($event)"
        (closed)="videoPickerOpen.set(false)" />
    }
```
4. Champs + méthodes :
```typescript
  protected readonly videoPickerOpen = signal(false);
  protected readonly videoLibrary = signal<VideoSummary[]>([]);

  openVideoPicker(): void {
    this.videoPickerOpen.set(true);
    this.portfolio.getVideos().subscribe(v => this.videoLibrary.set(v));
  }

  /** Vidéo choisie depuis la médiathèque : adopte son id et recharge le statut. */
  onVideoPicked(videoId: string): void {
    this.videoId = videoId;
    this.videoIdChange.emit(videoId);
    this.videoPickerOpen.set(false);
    this.loadVideoStatusPublic(videoId);
  }
```
> `loadVideoStatus` est `private` ; exposer un wrapper `protected loadVideoStatusPublic(id)` qui appelle `this.loadVideoStatus(id)`, OU rendre `onVideoPicked` appeler directement la logique existante. Le plus simple : renommer l'appel interne — ajouter `protected loadVideoStatusPublic(id: string) { this.loadVideoStatus(id); }`.

- [ ] **Step 5 : Test d'intégration `<app-video-field>`**

Dans `video-field.component.spec.ts`, ajouter (le spec mocke déjà `PortfolioService`) :
```typescript
it('onVideoPicked adopte l\'id et émet videoIdChange', () => {
  let emitted: string | null = null;
  component.videoIdChange.subscribe((id: string | null) => emitted = id);
  component.onVideoPicked('vid-42');
  expect(component.videoId).toBe('vid-42');
  expect(emitted).toBe('vid-42');
  expect(component['videoPickerOpen']()).toBeFalse();
});
```
> S'assurer que le mock `PortfolioService` du spec fournit `getVideos` (renvoyer `of([])`) et `getVideoStatus` (déjà mocké) pour ne pas casser `onVideoPicked` → `loadVideoStatus`.

Run : `cd frontend ; npx ng test --watch=false --include='**/video-field.component.spec.ts'`
Expected : SUCCESS.

- [ ] **Step 6 : Commit**

```bash
git add frontend/src/app/pages/admin/shared/video-picker.component.ts \
        frontend/src/app/pages/admin/shared/video-picker.component.spec.ts \
        frontend/src/app/pages/admin/shared/video-field.component.ts \
        frontend/src/app/pages/admin/shared/video-field.component.spec.ts
git commit -m "feat(videos): app-video-picker + bouton reutiliser une video dans le champ video"
```

---

### Task 6: Page « Médiathèque vidéo » + nav + route

Page de gestion : grille de cartes (poster, nom, statut, usages, suppression bloquée si utilisée), upload central avec polling.

**Files:**
- Create: `frontend/src/app/pages/admin/mediatheque-video/mediatheque-video.component.ts`
- Create: `frontend/src/app/pages/admin/mediatheque-video/mediatheque-video.component.spec.ts`
- Modify: `frontend/src/app/pages/admin/admin.routes.ts` (route `mediatheque-video`)
- Modify: `frontend/src/app/pages/admin/admin-layout.component.ts:34` (renommer + ajouter l'entrée de nav)

**Interfaces:**
- Consumes: `PortfolioService.getVideos()`, `deleteVideo(id)` (Task 4) ; `uploadVideo(file)`, `getVideoStatus(id)`, `retryVideo(id)` (existants) ; `VideoSummary`, `VideoUsage`.
- Produces: composant `MediathequeVideoComponent` + route `/admin/mediatheque-video`.

- [ ] **Step 1 : Écrire le test de la page (rouge)**

`mediatheque-video.component.spec.ts` :
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MediathequeVideoComponent } from './mediatheque-video.component';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';
import { VideoSummary } from '../../../models/video.model';

const used: VideoSummary = { id: 'vid-u', status: 'READY', originalName: 'u.mp4', url: null,
  poster: null, hls: null, durationSeconds: null, width: null, height: null, createdAt: null,
  errorMessage: null, usedBy: [{ type: 'furniture', label: 'Chaise', slug: 'chaise' }] };
const orphan: VideoSummary = { ...used, id: 'vid-o', originalName: 'o.mp4', usedBy: [] };

describe('MediathequeVideoComponent', () => {
  let fixture: ComponentFixture<MediathequeVideoComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService',
      ['getVideos', 'deleteVideo', 'uploadVideo', 'getVideoStatus', 'retryVideo']);
    portfolio.getVideos.and.returnValue(of([used, orphan]));
    portfolio.deleteVideo.and.returnValue(of(void 0));
    await TestBed.configureTestingModule({
      imports: [MediathequeVideoComponent],
      providers: [
        { provide: PortfolioService, useValue: portfolio },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MediathequeVideoComponent);
    fixture.detectChanges();
  });

  it('charge les vidéos au démarrage', () => {
    expect(fixture.componentInstance['videos']().length).toBe(2);
  });

  it('canDelete=false si la vidéo est utilisée', () => {
    expect(fixture.componentInstance.canDelete(used)).toBeFalse();
    expect(fixture.componentInstance.canDelete(orphan)).toBeTrue();
  });

  it('remove ne supprime pas une vidéo utilisée', () => {
    fixture.componentInstance.remove(used);
    expect(portfolio.deleteVideo).not.toHaveBeenCalled();
  });
});
```
Run : `cd frontend ; npx ng test --watch=false --include='**/mediatheque-video.component.spec.ts'` → FAIL.

- [ ] **Step 2 : Implémenter `mediatheque-video.component.ts`**

Miroir de `mediatheque.component.ts` pour la structure (zone d'upload, grille de cartes, styles `.photos-*` réutilisables adaptés). Logique :

```typescript
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';
import { VideoSummary, VideoUsage } from '../../../models/video.model';

@Component({
  selector: 'app-mediatheque-video',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="videos-tab">
      <div class="videos-upload-zone">
        <h2>Importer une vidéo</h2>
        <p class="videos-upload-hint">Formats : MP4 / WebM web-ready · max 200 Mo · transcodage automatique après import.</p>
        <input #fileInput type="file" accept="video/mp4,video/webm" style="display:none" (change)="upload($event)" />
        <button type="button" class="btn-primary" [disabled]="uploading()" (click)="fileInput.click()">
          {{ uploading() ? 'Import en cours…' : 'Choisir un fichier' }}
        </button>
        @if (uploadError()) { <p class="vv-error" role="alert">{{ uploadError() }}</p> }
      </div>

      @if (loading()) {
        <p class="status">Chargement de la médiathèque vidéo…</p>
      } @else if (videos().length === 0) {
        <p class="status">Aucune vidéo. Importez-en une ci-dessus.</p>
      } @else {
        <div class="videos-grid">
          @for (v of videos(); track v.id) {
            <div class="video-card">
              <div class="video-thumb">
                @if (v.poster) { <img [src]="v.poster" [alt]="v.originalName ?? 'Vidéo'" loading="lazy" /> }
                @else { <span class="video-noposter" aria-hidden="true">▶</span> }
                <span class="video-badge" [class.ok]="v.status==='READY'" [class.ko]="v.status==='FAILED'">{{ statusLabel(v.status) }}</span>
              </div>
              <div class="video-info">
                <span class="video-name" [title]="v.originalName ?? v.id">{{ v.originalName ?? v.id }}</span>
                <span class="video-meta">
                  @if (v.durationSeconds) { <span>{{ fmtDuration(v.durationSeconds) }}</span> }
                  @if (v.width && v.height) { <span>{{ v.width }}×{{ v.height }}</span> }
                </span>
              </div>
              @if (v.status === 'PROCESSING' || v.status === 'UPLOADED') {
                <p class="video-processing" aria-live="polite">Traitement en cours…</p>
              }
              @if (v.status === 'FAILED') {
                <div class="video-failed" role="alert">
                  <span>{{ v.errorMessage ?? 'Échec du transcodage.' }}</span>
                  <button type="button" class="btn-link" (click)="retry(v)">Relancer</button>
                </div>
              }
              <div class="video-usage">
                @if (v.usedBy.length === 0) {
                  <span class="video-orphan">Non utilisée</span>
                } @else {
                  <span class="video-usage-label">Utilisée par :</span>
                  <ul>
                    @for (u of v.usedBy; track u.type + (u.slug ?? '')) {
                      <li>
                        @if (u.type === 'furniture') { <a [routerLink]="['/admin/mobilier']" [queryParams]="{ slug: u.slug }">{{ u.label }}</a> }
                        @else if (u.type === 'exhibition') { <a [routerLink]="['/admin/expositions']" [queryParams]="{ slug: u.slug }">{{ u.label }}</a> }
                        @else { <a [routerLink]="['/admin/textes']">Studio</a> }
                      </li>
                    }
                  </ul>
                }
              </div>
              <div class="video-actions">
                <button type="button" class="video-del" [disabled]="!canDelete(v)"
                        [title]="canDelete(v) ? 'Supprimer' : 'Impossible : vidéo utilisée'"
                        (click)="remove(v)">Supprimer</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* Reprendre les styles de mediatheque.component.ts pour .btn-primary/.status.
       Grille et cartes analogues à .photos-grid/.photo-card. */
    .videos-tab { display: flex; flex-direction: column; gap: 24px; }
    .videos-upload-zone { padding: 32px; border: 1px dashed var(--color-line); background: var(--color-bg-alt); text-align: center; }
    .videos-upload-zone h2 { margin: 0 0 8px; font-size: 1.3rem; }
    .videos-upload-hint { margin: 0 0 20px; color: var(--color-mute); font-size: 0.85rem; }
    .btn-primary { padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0; cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .vv-error { color: #c0392b; font-size: 0.85rem; margin-top: 12px; }
    .status { color: var(--color-mute); }
    .videos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .video-card { display: flex; flex-direction: column; border: 1px solid var(--color-line); background: var(--color-bg); }
    .video-thumb { position: relative; aspect-ratio: 16/9; overflow: hidden; background: var(--color-bg-alt); }
    .video-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .video-noposter { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: var(--color-mute); font-size: 1.8rem; }
    .video-badge { position: absolute; top: 6px; left: 6px; font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 6px; background: var(--color-ink); color: var(--color-bg); }
    .video-badge.ok { background: #2e7d32; } .video-badge.ko { background: #c0392b; }
    .video-info { padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
    .video-name { font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .video-meta { display: inline-flex; gap: 10px; font-size: 0.7rem; color: var(--color-mute); }
    .video-processing { padding: 0 12px 8px; font-size: 0.78rem; color: var(--color-ink-soft); }
    .video-failed { padding: 0 12px 8px; font-size: 0.78rem; color: #c0392b; display: flex; flex-direction: column; gap: 4px; }
    .btn-link { background: transparent; border: 0; color: var(--color-accent); cursor: pointer; text-align: left; padding: 0; font: inherit; text-decoration: underline; }
    .video-usage { padding: 8px 12px; border-top: 1px solid var(--color-line); font-size: 0.75rem; }
    .video-usage ul { list-style: none; padding: 0; margin: 4px 0 0; display: flex; flex-direction: column; gap: 2px; }
    .video-usage-label { color: var(--color-mute); }
    .video-orphan { color: var(--color-mute); }
    .video-actions { display: flex; justify-content: flex-end; padding: 8px 12px; border-top: 1px solid var(--color-line); }
    .video-del { background: transparent; border: 1px solid var(--color-line); padding: 4px 12px; font-size: 0.75rem; cursor: pointer; color: #b1532a; }
    .video-del:disabled { opacity: 0.4; cursor: not-allowed; color: var(--color-mute); }
  `]
})
export class MediathequeVideoComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  protected readonly videos = signal<VideoSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal('');
  private pollTimers = new Map<string, ReturnType<typeof setInterval>>();

  constructor() { this.refresh(); }

  private refresh(): void {
    this.loading.set(true);
    this.portfolio.getVideos().subscribe({
      next: v => { this.videos.set(v); this.loading.set(false); this.resumePolling(v); },
      error: () => { this.loading.set(false); this.toast.error('Impossible de charger la médiathèque vidéo.'); },
    });
  }

  canDelete(v: VideoSummary): boolean { return v.usedBy.length === 0; }

  statusLabel(s: string): string {
    return s === 'READY' ? 'Prête' : s === 'FAILED' ? 'Échec' : s === 'PROCESSING' ? 'Traitement' : 'En file';
  }

  fmtDuration(seconds: number | null): string {
    if (seconds == null) return '';
    const m = Math.floor(seconds / 60), sec = Math.floor(seconds % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set('');
    this.portfolio.uploadVideo(file).subscribe({
      next: r => {
        this.uploading.set(false);
        const stub: VideoSummary = { id: r.id, status: r.status, originalName: file.name, url: null,
          poster: null, hls: null, durationSeconds: null, width: null, height: null, createdAt: null,
          errorMessage: null, usedBy: [] };
        this.videos.update(list => [stub, ...list]);
        this.startPolling(r.id);
      },
      error: () => { this.uploading.set(false); this.uploadError.set('Échec de l\'envoi de la vidéo.'); },
    });
  }

  retry(v: VideoSummary): void {
    this.portfolio.retryVideo(v.id).subscribe({
      next: () => { this.patch(v.id, { status: 'UPLOADED', errorMessage: null }); this.startPolling(v.id); },
      error: () => this.toast.error('Impossible de relancer le transcodage.'),
    });
  }

  remove(v: VideoSummary): void {
    if (!this.canDelete(v)) return;
    if (!confirm(`Supprimer la vidéo "${v.originalName ?? v.id}" ?`)) return;
    this.portfolio.deleteVideo(v.id).subscribe({
      next: () => { this.videos.update(list => list.filter(x => x.id !== v.id)); this.toast.success('Vidéo supprimée.'); },
      error: (err) => this.toast.error(err?.status === 409 ? 'Vidéo utilisée : suppression refusée.' : 'Erreur lors de la suppression.'),
    });
  }

  private resumePolling(list: VideoSummary[]): void {
    for (const v of list) if (v.status === 'PROCESSING' || v.status === 'UPLOADED') this.startPolling(v.id);
  }

  private startPolling(id: string): void {
    if (this.pollTimers.has(id)) return;
    const timer = setInterval(() => {
      this.portfolio.getVideoStatus(id).subscribe({
        next: dto => {
          this.patch(id, { status: dto.status, url: dto.url ?? null, poster: dto.poster ?? null,
            hls: dto.hls ?? null, durationSeconds: dto.durationSeconds ?? null,
            width: dto.width ?? null, height: dto.height ?? null, errorMessage: dto.errorMessage ?? null });
          if (dto.status === 'READY' || dto.status === 'FAILED') this.stopPolling(id);
        },
        error: () => this.stopPolling(id),
      });
    }, 2000);
    this.pollTimers.set(id, timer);
  }

  private stopPolling(id: string): void {
    const t = this.pollTimers.get(id);
    if (t) { clearInterval(t); this.pollTimers.delete(id); }
  }

  private patch(id: string, changes: Partial<VideoSummary>): void {
    this.videos.update(list => list.map(x => x.id === id ? { ...x, ...changes } : x));
  }
}
```
> `VideoStatusDto.poster`/`hls` existent déjà dans `video.model.ts`. Le polling est arrêté à `READY`/`FAILED` ; pas de garde-fou de durée max ici (page de gestion, l'utilisateur peut quitter). Ne pas oublier `implements OnDestroy` pour `clearInterval` de tous les timers si tu veux être strict — ajouter `ngOnDestroy() { this.pollTimers.forEach(clearInterval); }`.

- [ ] **Step 3 : Test page → vert**

Run : `cd frontend ; npx ng test --watch=false --include='**/mediatheque-video.component.spec.ts'`
Expected : SUCCESS.

- [ ] **Step 4 : Ajouter la route**

Dans `admin.routes.ts`, après le bloc `mediatheque` :
```typescript
      {
        path: 'mediatheque-video',
        loadComponent: () => import('./mediatheque-video/mediatheque-video.component').then(m => m.MediathequeVideoComponent),
        title: 'Médiathèque vidéo — Administration',
      },
```

- [ ] **Step 5 : Nav — renommer + ajouter l'entrée**

Dans `admin-layout.component.ts`, remplacer la ligne 34 :
```html
            <a class="nav-item" routerLink="/admin/mediatheque" routerLinkActive="active">Médiathèque photo</a>
            <a class="nav-item" routerLink="/admin/mediatheque-video" routerLinkActive="active">Médiathèque vidéo</a>
```

- [ ] **Step 6 : Suite frontend complète → verte**

Run : `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected : SUCCESS, seuil de couverture respecté.

- [ ] **Step 7 : Commit**

```bash
git add frontend/src/app/pages/admin/mediatheque-video/ \
        frontend/src/app/pages/admin/admin.routes.ts \
        frontend/src/app/pages/admin/admin-layout.component.ts
git commit -m "feat(videos): page Mediatheque video (grille, upload, usages, suppression) + nav"
```

---

## Notes d'exécution

- **Ordre** : Tasks 1→2→3 (backend) puis 4→5→6 (frontend). La Task 4 ne dépend que des contrats d'endpoints (Tasks 2-3).
- **Doc au merge** (hors code) : ADR-0021 (section SP4 + révision SP3), `SPECIFICATION_TECHNIQUE.md` §4.10, `SPECIFICATION_FONCTIONNELLE.md`. À traiter en fin de chantier (proposition avant merge).
- **Fix aperçu poster** (hls.js `autoStartLoad:false`) : hors périmètre, petit fix séparé.
- **Validation visuelle** : après Task 6, redéploiement Docker + validation manuelle (page + picker) avant toute baseline Playwright.
