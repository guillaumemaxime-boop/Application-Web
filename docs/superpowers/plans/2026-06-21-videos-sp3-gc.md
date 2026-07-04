# Vidéos SP3 — GC des vidéos orphelines — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éviter l'accumulation de fichiers vidéo orphelins : nettoyage immédiat quand l'admin remplace/supprime une vidéo, + un endpoint GC manuel (dry-run + exécution) qui recense/supprime les entités `Video` non référencées et les fichiers `vid-*` sans entité, avec une période de grâce protégeant les uploads en cours.

**Architecture:** `VideoService` injecte `FurnitureRepository`/`ExhibitionRepository`/`SiteContentRepository` (repos = feuilles → pas de cycle avec `FurnitureService`→`VideoService`) et expose `isReferenced`/`deleteIfUnreferenced`/`gcOrphans`. Les flux `update`/`delete` des fiches et `SiteContentService.saveAll` (Studio) appellent `deleteIfUnreferenced(ancienId)` en best-effort. L'endpoint `POST /api/admin/videos/gc?dryRun` déclenche le GC.

**Tech Stack:** Java 25 / Spring Boot 4.1, JPA/H2, JUnit 5 + Mockito.

## Global Constraints

- Codebase **français** (copie, commits conventionnels `feat(...)`/`fix(...)`).
- Tests via Docker : `docker compose -f docker-compose.test.yml run --rm backend-test` (H2 + changelog complet). Compilation ciblée : `cd backend ; mvn -q -Dtest=X test`.
- **Zéro suppression hors `uploadDir`** : toute suppression de fichier via un chemin résolu + garde `startsWith(uploadPath)`.
- Le scan disque ne considère QUE le préfixe `vid-` (n'atteint jamais les photos `{uuid}.ext`).
- `Video.created_at` est une String ISO (`Instant.toString()`) et peut être **null** (vidéos migrées) → le traiter comme « hors grâce » (éligible).

---

## Task 1: isReferenced + deleteIfUnreferenced (repos + VideoService)

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/repository/FurnitureRepository.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/repository/ExhibitionRepository.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/VideoService.java`
- Test: `backend/src/test/java/com/atelier/portfolio/service/VideoServiceTest.java`

**Interfaces:**
- Produces: `boolean VideoService.isReferenced(String videoId)` ; `void VideoService.deleteIfUnreferenced(String id)`.
- Consumes (existant) : `VideoService.delete(String id)` (supprime fichiers source/output/poster + dossier `{id}-hls/` + entité).

- [ ] **Step 1 — Repos : `existsByVideoId`.** Ajouter dans `FurnitureRepository` et `ExhibitionRepository` :
```java
boolean existsByVideoId(String videoId);
```
(Spring Data dérive la requête du champ `videoId` de l'entité. `SiteContentRepository` : pas de nouvelle méthode — on utilisera `findById("studio.video.id")` + comparaison en Java pour éviter un `WHERE` sur la colonne CLOB `content_value`.)

- [ ] **Step 2 — Tests `VideoServiceTest`** (mocks), puis FAIL. Injecter les 3 repos dans le service de test (le constructeur va changer — voir Step 4). Cas :
```java
@Test
void isReferenced_vrai_si_furniture_ou_exhibition_ou_studio_pointe_l_id() {
    when(furnitureRepository.existsByVideoId("vid-1")).thenReturn(true);
    assertTrue(service.isReferenced("vid-1"));

    when(furnitureRepository.existsByVideoId("vid-2")).thenReturn(false);
    when(exhibitionRepository.existsByVideoId("vid-2")).thenReturn(false);
    when(siteContentRepository.findById("studio.video.id")).thenReturn(Optional.empty());
    assertFalse(service.isReferenced("vid-2"));

    when(furnitureRepository.existsByVideoId("vid-3")).thenReturn(false);
    when(exhibitionRepository.existsByVideoId("vid-3")).thenReturn(false);
    var sc = new com.atelier.portfolio.entity.SiteContentEntity();
    sc.setContentKey("studio.video.id"); sc.setContentValue("vid-3");
    when(siteContentRepository.findById("studio.video.id")).thenReturn(Optional.of(sc));
    assertTrue(service.isReferenced("vid-3"));
}

@Test
void deleteIfUnreferenced_supprime_si_non_reference_sinon_non() {
    // non référencé → delete appelé
    when(furnitureRepository.existsByVideoId("vid-x")).thenReturn(false);
    when(exhibitionRepository.existsByVideoId("vid-x")).thenReturn(false);
    when(siteContentRepository.findById("studio.video.id")).thenReturn(Optional.empty());
    var e = new com.atelier.portfolio.entity.VideoEntity(); e.setId("vid-x"); e.setStatus(com.atelier.portfolio.entity.VideoStatus.READY);
    when(repository.findById("vid-x")).thenReturn(Optional.of(e));
    service.deleteIfUnreferenced("vid-x");
    verify(repository).delete(e);

    // référencé → pas de delete
    when(furnitureRepository.existsByVideoId("vid-y")).thenReturn(true);
    service.deleteIfUnreferenced("vid-y");
    verify(repository, never()).delete(argThat(v -> "vid-y".equals(v.getId())));

    // id null → no-op
    service.deleteIfUnreferenced(null);
}
```
(Vérifier que `SiteContentEntity` a bien `getContentValue()`/`setContentValue()`/`setContentKey()` ; sinon adapter.)

- [ ] **Step 3 — Run → FAIL.**

- [ ] **Step 4 — Impl `VideoService`.** Ajouter les 3 repos au **constructeur** (après `repository`, `transcoder`) :
```java
private final FurnitureRepository furnitureRepository;
private final ExhibitionRepository exhibitionRepository;
private final SiteContentRepository siteContentRepository;
```
(injecter dans le constructeur ; imports `com.atelier.portfolio.repository.*`.) Puis :
```java
/** true si l'id vidéo est référencé par une fiche mobilier/expo ou par le Studio. */
public boolean isReferenced(String videoId) {
    if (videoId == null) return false;
    if (furnitureRepository.existsByVideoId(videoId)) return true;
    if (exhibitionRepository.existsByVideoId(videoId)) return true;
    return siteContentRepository.findById("studio.video.id")
            .map(e -> videoId.equals(e.getContentValue())).orElse(false);
}

/** Supprime la vidéo (fichiers + entité) uniquement si plus référencée nulle part. */
public void deleteIfUnreferenced(String id) {
    if (id == null || isReferenced(id)) return;
    delete(id);
}
```
⚠️ `FurnitureService`/`ExhibitionService`/`SiteContentService` injectent déjà `VideoService`. Injecter des **repositories** (pas des services) dans `VideoService` ne crée pas de cycle. Mais mettre à jour tous les sites de construction de `VideoService` dans les **tests** (le constructeur gagne 3 params) — cherche `new VideoService(` et ajoute les mocks repos.

- [ ] **Step 5 — Run → PASS** (`mvn -q -Dtest=VideoServiceTest test`) + `mvn -q -DskipTests compile`.
- [ ] **Step 6 — Commit** : `feat(videos): isReferenced + deleteIfUnreferenced (GC — hooks de reference)`.

---

## Task 2: Nettoyage immédiat (remplacement + suppression)

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/SiteContentService.java`
- Test: `FurnitureServiceTest`, `ExhibitionServiceTest`, `SiteContentServiceVideoTest`

**Interfaces:**
- Consumes: `VideoService.deleteIfUnreferenced(String id)` (Task 1).

- [ ] **Step 1 — Tests**, puis FAIL :
  - `FurnitureServiceTest` : `update` d'une fiche dont `video_id="old"` avec un input `video_id="new"` → `videoService.deleteIfUnreferenced("old")` appelé. Input `video_id` inchangé → pas d'appel. `deleteBySlug` d'une fiche à `video_id="v"` → `deleteIfUnreferenced("v")` appelé. (Mock `videoService`.)
  - `ExhibitionServiceTest` : idem.
  - `SiteContentServiceVideoTest` : `saveAll` avec `studio.video.id` changé (ancien "a" en DB, nouveau "b") → `deleteIfUnreferenced("a")` ; `saveAll` sans la clé `studio.video.id` → pas d'appel.
- [ ] **Step 2 — Run → FAIL.**
- [ ] **Step 3 — Impl.**
  - `FurnitureService.update(slug, input)` : dans le `.map(entity -> {...})`, **capturer** `String oldVideoId = entity.getVideoId();` AVANT `applyChanges(entity, input)`. Après le save de l'entité, `if (oldVideoId != null && !oldVideoId.equals(input.videoId())) { try { videoService.deleteIfUnreferenced(oldVideoId); } catch (Exception ignored) {} }`.
  - `FurnitureService.deleteBySlug(slug)` : capturer `String vid = entity.getVideoId();` ; après la suppression de l'entité, `if (vid != null) { try { videoService.deleteIfUnreferenced(vid); } catch (Exception ignored) {} }`. (À placer après `repository.delete(entity)` et le nettoyage stories existant.)
  - `ExhibitionService.update`/`deleteBySlug` : mêmes modifications.
  - `SiteContentService.saveAll(entries)` : si `entries.containsKey("studio.video.id")`, capturer `String old = repository.findById("studio.video.id").map(SiteContentEntity::getContentValue).orElse(null);` AVANT `saveAll`. Après, `String neu = entries.get("studio.video.id"); if (old != null && !old.isBlank() && !old.equals(neu)) { try { videoService.deleteIfUnreferenced(old); } catch (Exception ignored) {} }`.
- [ ] **Step 4 — Run → PASS** + suite back complète (`docker compose -f docker-compose.test.yml run --rm backend-test`).
- [ ] **Step 5 — Commit** : `feat(videos): nettoyage immediat de la video au remplacement/suppression (fiche + studio)`.

---

## Task 3: gcOrphans(dryRun) + période de grâce + scan disque

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/VideoService.java`
- Modify: `backend/src/main/resources/application.properties`
- Modify: `backend/src/main/resources/META-INF/additional-spring-configuration-metadata.json`
- Test: `VideoServiceTest`

**Interfaces:**
- Produces: `record VideoService.VideoGcReport(java.util.List<String> orphanVideos, java.util.List<String> orphanFiles, boolean deleted)` ; `VideoGcReport VideoService.gcOrphans(boolean dryRun)`.

- [ ] **Step 1 — Config.** `application.properties` : `app.video.gc-grace-hours=${VIDEO_GC_GRACE_HOURS:24}`. Metadata JSON : entrée `app.video.gc-grace-hours` (Integer, 24). `VideoService` : `@Value("${app.video.gc-grace-hours:24}") int gcGraceHours;`.

- [ ] **Step 2 — Tests `VideoServiceTest`**, puis FAIL :
```java
@Test
void gcOrphans_dryRun_recense_les_orphelines_sans_supprimer() throws Exception {
    // vid-a : orpheline READY ancienne (created_at il y a 48h) -> listée
    var a = video("vid-a", VideoStatus.READY, Instant.now().minusSeconds(48*3600).toString());
    // vid-b : orpheline mais PROCESSING -> ignorée (grâce)
    var b = video("vid-b", VideoStatus.PROCESSING, Instant.now().minusSeconds(48*3600).toString());
    // vid-c : orpheline READY récente (2h) -> ignorée (grâce)
    var c = video("vid-c", VideoStatus.READY, Instant.now().minusSeconds(2*3600).toString());
    // vid-d : READY ancienne MAIS référencée -> jamais listée
    var d = video("vid-d", VideoStatus.READY, Instant.now().minusSeconds(48*3600).toString());
    when(repository.findAll()).thenReturn(List.of(a,b,c,d));
    when(furnitureRepository.existsByVideoId(anyString())).thenReturn(false);
    when(exhibitionRepository.existsByVideoId(anyString())).thenReturn(false);
    when(siteContentRepository.findById("studio.video.id")).thenReturn(Optional.empty());
    when(furnitureRepository.existsByVideoId("vid-d")).thenReturn(true);

    var report = service.gcOrphans(true);
    assertTrue(report.orphanVideos().contains("vid-a"));
    assertFalse(report.orphanVideos().contains("vid-b"));
    assertFalse(report.orphanVideos().contains("vid-c"));
    assertFalse(report.orphanVideos().contains("vid-d"));
    assertFalse(report.deleted());
    verify(repository, never()).delete(any());
}

@Test
void gcOrphans_execute_supprime_les_orphelines() throws Exception {
    var a = video("vid-a", VideoStatus.READY, Instant.now().minusSeconds(48*3600).toString());
    when(repository.findAll()).thenReturn(List.of(a));
    when(repository.findById("vid-a")).thenReturn(Optional.of(a));
    when(furnitureRepository.existsByVideoId("vid-a")).thenReturn(false);
    when(exhibitionRepository.existsByVideoId("vid-a")).thenReturn(false);
    when(siteContentRepository.findById("studio.video.id")).thenReturn(Optional.empty());

    var report = service.gcOrphans(false);
    assertTrue(report.orphanVideos().contains("vid-a"));
    assertTrue(report.deleted());
    verify(repository).delete(a);
}

@Test
void gcOrphans_scan_disque_liste_les_fichiers_vid_sans_entite() throws Exception {
    // fichier vid-orphan.mp4 sur disque, aucune entité, mtime ancien -> listé
    java.nio.file.Files.writeString(tmp.resolve("vid-orphan.mp4"), "x");
    java.nio.file.Files.setLastModifiedTime(tmp.resolve("vid-orphan.mp4"),
        java.nio.file.attribute.FileTime.from(Instant.now().minusSeconds(48*3600)));
    // photo non-vid -> jamais touchée
    java.nio.file.Files.writeString(tmp.resolve("8f3a-photo.jpg"), "x");
    when(repository.findAll()).thenReturn(List.of());
    var report = service.gcOrphans(true);
    assertTrue(report.orphanFiles().contains("vid-orphan.mp4"));
    assertFalse(report.orphanFiles().stream().anyMatch(f -> f.contains("photo")));
}
```
Helper de test : `VideoEntity video(String id, VideoStatus s, String createdAt)` qui set id/status/createdAt/outputFilename. `@TempDir Path tmp` + `ReflectionTestUtils.setField(service,"uploadDir",tmp.toString())` + `setField(service,"gcGraceHours",24)`.

- [ ] **Step 3 — Run → FAIL.**
- [ ] **Step 4 — Impl `VideoService.gcOrphans`.**
```java
public record VideoGcReport(java.util.List<String> orphanVideos, java.util.List<String> orphanFiles, boolean deleted) {}

/** true si la vidéo est protégée par la période de grâce (en cours / trop récente). */
private boolean inGrace(VideoEntity e) {
    if (e.getStatus() == VideoStatus.UPLOADED || e.getStatus() == VideoStatus.PROCESSING) return true;
    String created = e.getCreatedAt();
    if (created == null || created.isBlank()) return false;   // migrée / inconnue → hors grâce
    try {
        return Instant.parse(created).isAfter(Instant.now().minus(java.time.Duration.ofHours(gcGraceHours)));
    } catch (Exception ex) { return false; }
}

public VideoGcReport gcOrphans(boolean dryRun) {
    java.util.List<String> orphanVideos = new java.util.ArrayList<>();
    java.util.List<String> orphanFiles = new java.util.ArrayList<>();
    java.util.Set<String> knownIds = new java.util.HashSet<>();
    // 1. entités orphelines
    for (VideoEntity e : repository.findAll()) {
        knownIds.add(e.getId());
        if (inGrace(e)) continue;
        if (!isReferenced(e.getId())) orphanVideos.add(e.getId());
    }
    // 2. fichiers/dossiers vid-* sur disque sans entité connue (mtime hors grâce)
    Path dir = Paths.get(uploadDir);
    if (Files.isDirectory(dir)) {
        try (var stream = Files.list(dir)) {
            for (Path p : stream.toList()) {
                String name = p.getFileName().toString();
                if (!name.startsWith("vid-")) continue;
                String id = videoIdFromEntry(name);           // "vid-ab12.mp4"/"vid-ab12-hls"/"vid-ab12-src.mp4" -> "vid-ab12"
                if (id != null && knownIds.contains(id)) continue;    // rattaché à une entité connue
                try {
                    if (Files.getLastModifiedTime(p).toInstant()
                            .isAfter(Instant.now().minus(java.time.Duration.ofHours(gcGraceHours)))) continue;  // récent
                } catch (IOException ignored) {}
                orphanFiles.add(name);
            }
        } catch (IOException ignored) {}
    }
    if (!dryRun) {
        for (String id : orphanVideos) delete(id);
        for (String name : orphanFiles) {
            Path uploadPath = dir.toAbsolutePath().normalize();
            Path fp = uploadPath.resolve(name).normalize();
            if (!fp.startsWith(uploadPath)) continue;          // garde path-traversal
            if (Files.isDirectory(fp)) deleteDirRecursive(fp); else { try { Files.deleteIfExists(fp); } catch (IOException ignored) {} }
        }
    }
    return new VideoGcReport(orphanVideos, orphanFiles, !dryRun);
}

/** Extrait l'id vidéo d'un nom de fichier/dossier : garde le préfixe jusqu'au 1er suffixe connu. */
static String videoIdFromEntry(String name) {
    // enlève l'extension éventuelle
    String base = name;
    int dot = base.lastIndexOf('.');
    if (dot > 0) base = base.substring(0, dot);   // vid-ab12-src.mp4 -> vid-ab12-src ; vid-ab12.mp4 -> vid-ab12
    // enlève les suffixes -hls / -src / -poster
    for (String suf : new String[]{"-hls", "-src", "-poster"}) {
        if (base.endsWith(suf)) return base.substring(0, base.length() - suf.length());
    }
    return base;   // vid-ab12
}
```
(`deleteDirRecursive` existe déjà — SP2. Réutilise-le.)

- [ ] **Step 5 — Run → PASS** + suite back complète.
- [ ] **Step 6 — Commit** : `feat(videos): gcOrphans (dry-run/execute) + periode de grace + scan disque vid-*`.

---

## Task 4: endpoint POST /api/admin/videos/gc

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java`
- Test: `AdminVideoControllerTest`

**Interfaces:**
- Consumes: `VideoService.gcOrphans(boolean dryRun)` → `VideoGcReport(orphanVideos, orphanFiles, deleted)`.

- [ ] **Step 1 — Test**, puis FAIL :
```java
@Test
void gc_dryRun_par_defaut_recense() {
    when(service.gcOrphans(true)).thenReturn(
        new VideoService.VideoGcReport(java.util.List.of("vid-a"), java.util.List.of("vid-b.mp4"), false));
    ResponseEntity<?> r = controller.gc(true);
    assertEquals(200, r.getStatusCode().value());
    // body contient orphanVideos / orphanFiles / deleted
}

@Test
void gc_execute_supprime() {
    when(service.gcOrphans(false)).thenReturn(
        new VideoService.VideoGcReport(java.util.List.of("vid-a"), java.util.List.of(), true));
    ResponseEntity<?> r = controller.gc(false);
    assertEquals(200, r.getStatusCode().value());
}
```
- [ ] **Step 2 — Run → FAIL.**
- [ ] **Step 3 — Impl** : ajouter dans `AdminVideoController` :
```java
@PostMapping("/gc")
public ResponseEntity<?> gc(@RequestParam(defaultValue = "true") boolean dryRun) {
    VideoService.VideoGcReport r = service.gcOrphans(dryRun);
    return ResponseEntity.ok(Map.of(
        "orphanVideos", r.orphanVideos(),
        "orphanFiles", r.orphanFiles(),
        "deleted", r.deleted()));
}
```
(import `org.springframework.web.bind.annotation.RequestParam` déjà présent ; `/gc` = segment littéral, pas d'ambiguïté avec `/{id}`.)
- [ ] **Step 4 — Run → PASS** + suite back complète (`docker compose -f docker-compose.test.yml run --rm backend-test`).
- [ ] **Step 5 — Commit** : `feat(videos): endpoint POST /api/admin/videos/gc (dry-run par defaut)`.

---

## Validation finale (hors tâches TDD)
- Suite back complète verte.
- Rebuild + redeploy ; tester : remplacer la vidéo d'une fiche → l'ancien `{id}.mp4`/`{id}-hls/` disparaît du volume ; `POST /api/admin/videos/gc?dryRun=true` (console admin) recense les orphelins, `dryRun=false` les supprime ; une vidéo fraîchement uploadée non encore attachée n'est PAS supprimée (grâce). Validation utilisateur.
- Doc : SPEC_TECHNIQUE §4.10 (GC + endpoint) + note ADR-0021 (SP3). Audits proportionnés (sécurité : suppression confinée `uploadDir`, endpoint JWT, grâce). Merge sur confirmation.
