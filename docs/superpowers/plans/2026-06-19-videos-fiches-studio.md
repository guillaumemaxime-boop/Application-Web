# Vidéos fiches (mobilier/expo) + Studio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attacher une vidéo optionnelle (auto-hébergée `.mp4`/`.webm` + poster image + sous-titres `.vtt`) aux fiches mobilier/exposition et à la page Studio, rendue par un lecteur `<video>` natif.

**Architecture:** Backend — `VideoService` (stockage brut dans `app.upload.dir`, allowlist stricte, garde path-traversal), `VideoController` public (serve avec HTTP Range + cache immuable), `AdminVideoController` (upload/delete JWT). 3 colonnes nullables (`video_url`, `video_poster`, `video_captions`) sur `furniture`+`exhibition` ; clés `studio.video.*` en `SiteContent`. Frontend — `<app-video-player>` (pur) + `<app-video-field>` (admin), câblés dans les vues détail (bloc « Vidéo » sous la galerie), le Studio et l'admin Textes.

**Tech Stack:** Spring Boot 4 (Java 25), JUnit 5 + Mockito, Liquibase ; Angular 21 (standalone, signals, `@if`/`@for`), Karma+Jasmine.

**Branche :** `feat/videos-fiches-studio` (déjà créée, spec committée).

**Spec de référence :** `docs/superpowers/specs/2026-06-19-videos-fiches-studio-design.md`

**Conventions critiques :**
- Tests backend : `docker compose -f docker-compose.test.yml run --rm backend-test` (H2 PostgreSQL mode, rejoue tout le changelog Liquibase).
- Tests frontend : `docker compose -f docker-compose.test.yml run --rm frontend-test`.
- Java : records pour DTO, entités mutables JPA. Pas de `*ngIf`/`*ngFor` (utiliser `@if`/`@for`). Pas de `HttpClient` injecté dans un composant (passer par `portfolio.service`). Copie UI en **français**, apostrophes typographiques `’` conservées.
- Ne JAMAIS régénérer les baselines Playwright avant validation visuelle manuelle.

---

## Décomposition (fichiers)

**Backend (créés)** : `service/VideoService.java`, `controller/VideoController.java`, `controller/AdminVideoController.java`, tests associés, migrations `032-add-video-to-furniture.yaml` + `033-add-video-to-exhibition.yaml`.
**Backend (modifiés)** : `entity/FurnitureEntity.java`, `entity/ExhibitionEntity.java`, `model/Furniture.java`, `model/Exhibition.java`, `service/FurnitureService.java`, `service/ExhibitionService.java`, `config/SecurityConfig.java`, `resources/application.properties`, `resources/db/changelog/db.changelog-master.yaml`, tests existants impactés par le changement de signature des records.
**Infra** : `frontend/nginx.conf`.
**Frontend (créés)** : `components/video-player/video-player.component.ts` (+spec), `pages/admin/shared/video-field.component.ts` (+spec).
**Frontend (modifiés)** : `services/portfolio.service.ts`, `models/furniture.model.ts`, `models/exhibition.model.ts`, `components/furniture-detail-view/furniture-detail-view.component.ts` (+spec), `components/exhibition-detail-view/exhibition-detail-view.component.ts` (+spec), `pages/studio/studio.component.ts` (+spec), `pages/admin/mobilier/mobilier.component.ts`, `pages/admin/expositions/expositions.component.ts`, `pages/admin/textes/textes.component.ts` (+spec).

---

## Task 1: VideoService (stockage + service fichier)

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/service/VideoService.java`
- Create: `backend/src/test/java/com/atelier/portfolio/service/VideoServiceTest.java`

Mirroir de `PhotoService` mais **sans optimisation**, **sans entité DB** (le fichier est juste stocké + servi ; son URL est persistée sur l'entité propriétaire). Allowlist vidéo + sous-titres.

- [ ] **Step 1: Écrire le test (allowlist + path traversal)**

```java
package com.atelier.portfolio.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class VideoServiceTest {

    private VideoService newService(Path dir) {
        VideoService service = new VideoService();
        ReflectionTestUtils.setField(service, "uploadDir", dir.toString());
        ReflectionTestUtils.setField(service, "baseUrl", "/api/videos/files");
        return service;
    }

    @Test
    void store_accepte_mp4_et_renvoie_url(@TempDir Path dir) throws Exception {
        VideoService service = newService(dir);
        MockMultipartFile file = new MockMultipartFile("file", "clip.mp4", "video/mp4", new byte[]{1, 2, 3});

        VideoService.StoredVideo result = service.store(file);

        assertTrue(result.url().startsWith("/api/videos/files/"));
        assertTrue(result.filename().endsWith(".mp4"));
    }

    @Test
    void store_accepte_vtt(@TempDir Path dir) throws Exception {
        VideoService service = newService(dir);
        MockMultipartFile file = new MockMultipartFile("file", "subs.vtt", "text/vtt", "WEBVTT".getBytes());

        VideoService.StoredVideo result = service.store(file);

        assertTrue(result.filename().endsWith(".vtt"));
    }

    @Test
    void store_rejette_extension_interdite(@TempDir Path dir) {
        VideoService service = newService(dir);
        MockMultipartFile file = new MockMultipartFile("file", "hack.exe", "application/octet-stream", new byte[]{0});

        assertThrows(IllegalArgumentException.class, () -> service.store(file));
    }

    @Test
    void loadAsResource_bloque_path_traversal(@TempDir Path dir) throws Exception {
        VideoService service = newService(dir);
        assertNull(service.loadAsResource("../../etc/passwd"));
    }

    @Test
    void loadAsResource_renvoie_null_si_absent(@TempDir Path dir) throws Exception {
        VideoService service = newService(dir);
        assertNull(service.loadAsResource("inexistant.mp4"));
    }
}
```

- [ ] **Step 2: Lancer le test → échec compilation (VideoService absent)**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: échec de compilation (`VideoService` n'existe pas).

- [ ] **Step 3: Implémenter VideoService**

```java
package com.atelier.portfolio.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Stockage et service des fichiers video auto-heberges (et de leurs pistes
 * de sous-titres .vtt). Distinct de PhotoService : pas d'optimisation, pas
 * d'entite DB — l'URL retournee est persistee sur l'entite proprietaire
 * (fiche) ou la cle SiteContent (studio.video.*).
 */
@Service
public class VideoService {

    // Allowlist stricte. Pas de transcodage : l'admin fournit un mp4 web-ready.
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".mp4", ".webm", ".vtt");

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${app.video.base-url:/api/videos/files}")
    private String baseUrl;

    public StoredVideo store(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "video";
        String extension = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalName.substring(dotIndex);
        }
        String normalizedExt = extension.toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(normalizedExt)) {
            throw new IllegalArgumentException("Extension non autorisee: " + extension);
        }
        String filename = UUID.randomUUID() + normalizedExt;

        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        Path target = dir.resolve(filename);
        Files.write(target, file.getBytes());

        return new StoredVideo(filename, baseUrl + "/" + filename);
    }

    public Resource loadAsResource(String filename) throws MalformedURLException {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path filePath = uploadPath.resolve(filename).normalize();
        if (!filePath.startsWith(uploadPath)) {
            return null;
        }
        Resource resource = new UrlResource(filePath.toUri());
        if (resource.exists() && resource.isReadable()) {
            return resource;
        }
        return null;
    }

    public boolean delete(String filename) {
        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(filename).normalize();
            if (!filePath.startsWith(uploadPath)) {
                return false;
            }
            return Files.deleteIfExists(filePath);
        } catch (IOException e) {
            return false;
        }
    }

    public record StoredVideo(String filename, String url) {}
}
```

- [ ] **Step 4: Lancer le test → vert**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: les 5 tests `VideoServiceTest` passent.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/service/VideoService.java backend/src/test/java/com/atelier/portfolio/service/VideoServiceTest.java
git commit -m "feat(videos): VideoService (stockage brut mp4/webm/vtt, garde path-traversal)"
```

---

## Task 2: VideoController public (serve + HTTP Range)

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/controller/VideoController.java`
- Create: `backend/src/test/java/com/atelier/portfolio/controller/VideoControllerTest.java`

Serve public `GET /api/videos/files/{filename}` avec support Range (seek) + cache immuable. Test unitaire pur (mock service, appel direct du contrôleur — style `PhotoControllerTest`).

- [ ] **Step 1: Écrire le test**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.VideoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VideoControllerTest {

    @Mock
    private VideoService service;

    @InjectMocks
    private VideoController controller;

    @Test
    void serve_sans_range_renvoie_200_complet_et_accept_ranges() throws IOException {
        Resource resource = mock(Resource.class);
        when(resource.contentLength()).thenReturn(1000L);
        when(service.loadAsResource("clip.mp4")).thenReturn(resource);

        HttpHeaders headers = new HttpHeaders();
        ResponseEntity<ResourceRegion> result = controller.serve("clip.mp4", headers);

        assertEquals(200, result.getStatusCode().value());
        assertEquals("bytes", result.getHeaders().getFirst(HttpHeaders.ACCEPT_RANGES));
        assertEquals("video/mp4", result.getHeaders().getContentType().toString());
        assertNotNull(result.getBody());
        assertEquals(0, result.getBody().getPosition());
        assertEquals(1000L, result.getBody().getCount());
    }

    @Test
    void serve_avec_range_renvoie_206_partiel() throws IOException {
        Resource resource = mock(Resource.class);
        when(resource.contentLength()).thenReturn(1000L);
        when(service.loadAsResource("clip.mp4")).thenReturn(resource);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.RANGE, "bytes=100-199");
        ResponseEntity<ResourceRegion> result = controller.serve("clip.mp4", headers);

        assertEquals(206, result.getStatusCode().value());
        assertEquals(100, result.getBody().getPosition());
        assertEquals(100, result.getBody().getCount());
    }

    @Test
    void serve_pose_cache_immuable() throws IOException {
        Resource resource = mock(Resource.class);
        when(resource.contentLength()).thenReturn(10L);
        when(service.loadAsResource("clip.mp4")).thenReturn(resource);

        ResponseEntity<ResourceRegion> result = controller.serve("clip.mp4", new HttpHeaders());

        String cc = result.getHeaders().getCacheControl();
        assertTrue(cc.contains("max-age=31536000"));
        assertTrue(cc.contains("immutable"));
    }

    @Test
    void serve_vtt_renvoie_text_vtt() throws IOException {
        Resource resource = mock(Resource.class);
        when(resource.contentLength()).thenReturn(50L);
        when(service.loadAsResource("subs.vtt")).thenReturn(resource);

        ResponseEntity<ResourceRegion> result = controller.serve("subs.vtt", new HttpHeaders());

        assertEquals("text/vtt", result.getHeaders().getContentType().toString());
    }

    @Test
    void serve_absent_renvoie_404() throws IOException {
        when(service.loadAsResource("missing.mp4")).thenReturn(null);

        ResponseEntity<ResourceRegion> result = controller.serve("missing.mp4", new HttpHeaders());

        assertEquals(404, result.getStatusCode().value());
        assertNull(result.getBody());
    }
}
```

- [ ] **Step 2: Lancer le test → échec (VideoController absent)**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: échec de compilation.

- [ ] **Step 3: Implémenter VideoController**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.VideoService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

/**
 * Service public des fichiers video/sous-titres. GET permitAll (catalogue).
 * Supporte les requetes HTTP Range (seek video) via ResourceRegion : 206
 * Partial Content si en-tete Range present, 200 complet sinon.
 */
@RestController
@RequestMapping("/api/videos")
public class VideoController {

    // Taille max d'un chunk renvoye pour une requete Range (1 Mo).
    private static final long MAX_CHUNK = 1_048_576L;

    private final VideoService service;

    public VideoController(VideoService service) {
        this.service = service;
    }

    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<ResourceRegion> serve(@PathVariable String filename,
                                                @RequestHeader HttpHeaders headers) throws IOException {
        Resource resource = service.loadAsResource(filename);
        if (resource == null) {
            return ResponseEntity.notFound().build();
        }
        long length = resource.contentLength();
        List<HttpRange> ranges = headers.getRange();

        ResourceRegion region;
        HttpStatus status;
        if (ranges.isEmpty()) {
            region = new ResourceRegion(resource, 0, length);
            status = HttpStatus.OK;
        } else {
            HttpRange range = ranges.get(0);
            long start = range.getRangeStart(length);
            long end = range.getRangeEnd(length);
            long count = Math.min(MAX_CHUNK, end - start + 1);
            region = new ResourceRegion(resource, start, count);
            status = HttpStatus.PARTIAL_CONTENT;
        }

        return ResponseEntity.status(status)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentType(contentTypeFor(filename))
                .body(region);
    }

    private static MediaType contentTypeFor(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0) return MediaType.APPLICATION_OCTET_STREAM;
        return switch (filename.substring(dot + 1).toLowerCase(Locale.ROOT)) {
            case "mp4" -> MediaType.parseMediaType("video/mp4");
            case "webm" -> MediaType.parseMediaType("video/webm");
            case "vtt" -> MediaType.parseMediaType("text/vtt");
            default -> MediaType.APPLICATION_OCTET_STREAM;
        };
    }
}
```

- [ ] **Step 4: Lancer le test → vert**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: les 5 tests `VideoControllerTest` passent.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/controller/VideoController.java backend/src/test/java/com/atelier/portfolio/controller/VideoControllerTest.java
git commit -m "feat(videos): VideoController public serve avec HTTP Range + cache immuable"
```

---

## Task 3: AdminVideoController (upload + delete)

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java`
- Create: `backend/src/test/java/com/atelier/portfolio/controller/AdminVideoControllerTest.java`

Mutations sous `/api/admin/**` (JWT via SecurityConfig). Mirroir d'`AdminPhotoController`.

- [ ] **Step 1: Écrire le test**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.VideoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminVideoControllerTest {

    @Mock
    private VideoService service;

    @InjectMocks
    private AdminVideoController controller;

    @Test
    void upload_ok_renvoie_201() throws IOException {
        MultipartFile file = new MockMultipartFile("file", "clip.mp4", "video/mp4", new byte[]{1});
        when(service.store(file)).thenReturn(new VideoService.StoredVideo("uuid.mp4", "/api/videos/files/uuid.mp4"));

        ResponseEntity<?> result = controller.upload(file);

        assertEquals(201, result.getStatusCode().value());
    }

    @Test
    void upload_extension_refusee_renvoie_400() throws IOException {
        MultipartFile file = new MockMultipartFile("file", "x.exe", "application/octet-stream", new byte[]{1});
        when(service.store(file)).thenThrow(new IllegalArgumentException("Extension non autorisee: .exe"));

        ResponseEntity<?> result = controller.upload(file);

        assertEquals(400, result.getStatusCode().value());
    }

    @Test
    void delete_ok_renvoie_204() {
        when(service.delete("uuid.mp4")).thenReturn(true);
        assertEquals(204, controller.delete("uuid.mp4").getStatusCode().value());
    }

    @Test
    void delete_absent_renvoie_404() {
        when(service.delete("missing.mp4")).thenReturn(false);
        assertEquals(404, controller.delete("missing.mp4").getStatusCode().value());
    }
}
```

- [ ] **Step 2: Lancer le test → échec (contrôleur absent)**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: échec de compilation.

- [ ] **Step 3: Implémenter AdminVideoController**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.VideoService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.Map;

/**
 * Mutations video sous /api/admin/** : route authentifiee par SecurityConfig.
 * Le GET public (serve) reste expose par {@link VideoController}.
 */
@RestController
@RequestMapping("/api/admin/videos")
public class AdminVideoController {

    private final VideoService service;

    public AdminVideoController(VideoService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam MultipartFile file) throws IOException {
        try {
            VideoService.StoredVideo stored = service.store(file);
            return ResponseEntity.created(URI.create(stored.url()))
                    .body(Map.of("url", stored.url(), "filename", stored.filename()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/files/{filename:.+}")
    public ResponseEntity<Void> delete(@PathVariable String filename) {
        return service.delete(filename)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
```

- [ ] **Step 4: Lancer le test → vert**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: les 4 tests passent.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java backend/src/test/java/com/atelier/portfolio/controller/AdminVideoControllerTest.java
git commit -m "feat(videos): AdminVideoController upload/delete (JWT)"
```

---

## Task 4: Config taille upload 200MB + Nginx + CSP media-src

**Files:**
- Modify: `backend/src/main/resources/application.properties:44-45`
- Modify: `frontend/nginx.conf:103`
- Modify: `backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java:69-77`

Pas de test unitaire dédié (config) — validé par le build + la suite existante qui doit rester verte.

- [ ] **Step 1: Relever la limite multipart à 200MB**

Dans `application.properties`, remplacer :
```properties
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB
```
par :
```properties
spring.servlet.multipart.max-file-size=200MB
spring.servlet.multipart.max-request-size=200MB
```
Ajouter sous `app.upload.base-url` la base vidéo :
```properties
app.video.base-url=/api/videos/files
```

- [ ] **Step 2: Relever `client_max_body_size` Nginx**

Dans `frontend/nginx.conf`, `location ^~ /api/`, remplacer `client_max_body_size 50M;` par :
```nginx
client_max_body_size 200M;
```

- [ ] **Step 3: Ajouter `media-src 'self'` au CSP**

Dans `SecurityConfig.policyDirectives`, ajouter la directive `media-src 'self';` (après `img-src`) :
```java
.policyDirectives("default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "media-src 'self'; " +
        "connect-src 'self'; " +
        "frame-src 'self' https://www.youtube.com https://player.vimeo.com; " +
        "frame-ancestors 'none'"))
```

- [ ] **Step 4: Build + suite verte**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: BUILD SUCCESS, aucune régression.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/application.properties frontend/nginx.conf backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java
git commit -m "chore(videos): upload 200MB (Spring+Nginx) + CSP media-src 'self'"
```

---

## Task 5: Migrations Liquibase (colonnes video)

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/032-add-video-to-furniture.yaml`
- Create: `backend/src/main/resources/db/changelog/changes/033-add-video-to-exhibition.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml:93-95` (ajout des deux include après le 031)

`ddl-auto=validate` — sans ces colonnes le mapping des Tasks 6/7 fera échouer la validation Hibernate. La suite H2 rejoue le changelog.

- [ ] **Step 1: Créer 032-add-video-to-furniture.yaml**

```yaml
databaseChangeLog:
  - changeSet:
      id: 032-add-video-to-furniture
      author: milo-guillaume
      comment: >
        Ajoute video_url, video_poster, video_captions (nullables) sur furniture
        pour le bloc video optionnel de la fiche. URLs servies par /api/videos/files.
      changes:
        - sql:
            sql: ALTER TABLE furniture ADD COLUMN video_url VARCHAR(500);
        - sql:
            sql: ALTER TABLE furniture ADD COLUMN video_poster VARCHAR(500);
        - sql:
            sql: ALTER TABLE furniture ADD COLUMN video_captions VARCHAR(500);
```

- [ ] **Step 2: Créer 033-add-video-to-exhibition.yaml**

```yaml
databaseChangeLog:
  - changeSet:
      id: 033-add-video-to-exhibition
      author: milo-guillaume
      comment: >
        Ajoute video_url, video_poster, video_captions (nullables) sur exhibition
        pour le bloc video optionnel de la fiche.
      changes:
        - sql:
            sql: ALTER TABLE exhibition ADD COLUMN video_url VARCHAR(500);
        - sql:
            sql: ALTER TABLE exhibition ADD COLUMN video_poster VARCHAR(500);
        - sql:
            sql: ALTER TABLE exhibition ADD COLUMN video_captions VARCHAR(500);
```

- [ ] **Step 3: Enregistrer dans le master**

À la fin de `db.changelog-master.yaml` (après l'include du `031-...`), ajouter :
```yaml
  - include:
      file: changes/032-add-video-to-furniture.yaml
      relativeToChangelogFile: true
  - include:
      file: changes/033-add-video-to-exhibition.yaml
      relativeToChangelogFile: true
```

- [ ] **Step 4: Vérifier le changelog (suite verte)**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: Liquibase applique 032/033 sur H2 sans erreur ; suite verte.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/changelog/
git commit -m "feat(videos): migrations colonnes video_url/poster/captions (furniture+exhibition)"
```

---

## Task 6: Furniture — entité + DTO + mapping

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/entity/FurnitureEntity.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/Furniture.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java`
- Modify (compilation) : tous les sites construisant `new Furniture(...)` — notamment `FurnitureService.findBySlug`/`toDto` et `backend/src/test/java/com/atelier/portfolio/service/FurnitureServiceTest.java`.

⚠️ Ajouter 3 champs au record `Furniture` change sa signature → **tous les `new Furniture(...)` positionnels doivent recevoir les 3 nouveaux arguments**. Placer les champs en fin de record. Sémantique : video fields posés **inconditionnellement** dans `applyChanges` (`null` = retrait), comme `coverCrop`.

- [ ] **Step 1: Écrire le test (round-trip des champs video)**

Ajouter dans `FurnitureServiceTest` (adapter au style existant — repository mocké ou réel selon le fichier) un test :
```java
@Test
void update_persiste_les_champs_video() {
    // GIVEN une fiche existante mockee/seedee de slug "tabouret-aurore"
    // WHEN on update avec videoUrl/videoPoster/videoCaptions renseignes
    // THEN le DTO retourne porte ces 3 valeurs
    // (suivre le pattern des autres tests update du fichier : construire un
    //  Furniture d'entree avec les 3 champs video non-null en derniers args,
    //  appeler service.update(slug, input), asserter result.get().videoUrl() etc.)
}
```
> Note d'implémentation : reprendre exactement la forme des tests `update_*` déjà présents dans `FurnitureServiceTest` (mêmes mocks/seed). Les 3 nouveaux args sont les **3 derniers** du constructeur `Furniture`.

- [ ] **Step 2: Lancer → échec (champs/méthodes absents)**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: échec de compilation (`videoUrl()` absent).

- [ ] **Step 3a: FurnitureEntity — 3 colonnes + accesseurs**

Après les colonnes `cover_crop_*`, ajouter :
```java
    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Column(name = "video_poster", length = 500)
    private String videoPoster;

    @Column(name = "video_captions", length = 500)
    private String videoCaptions;
```
Et les accesseurs (près des autres getters/setters) :
```java
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getVideoPoster() { return videoPoster; }
    public void setVideoPoster(String videoPoster) { this.videoPoster = videoPoster; }

    public String getVideoCaptions() { return videoCaptions; }
    public void setVideoCaptions(String videoCaptions) { this.videoCaptions = videoCaptions; }
```

- [ ] **Step 3b: Furniture record — 3 champs en fin**

Remplacer la fin du record `Furniture` (`... List<Slide> slides, @Size(max = 30) List<...> tags`) en ajoutant après `tags` :
```java
    List<Slide> slides,
    @Size(max = 30) List<@Size(max = 255) String> tags,
    @Size(max = 500) String videoUrl,
    @Size(max = 500) String videoPoster,
    @Size(max = 500) String videoCaptions
) {
}
```

- [ ] **Step 3c: FurnitureService — mapping**

Dans `applyChanges`, après `entity.setShowStoryButton(...)` (avant le bloc gallery), ajouter (set inconditionnel = `null` retire) :
```java
        entity.setVideoUrl(input.videoUrl());
        entity.setVideoPoster(input.videoPoster());
        entity.setVideoCaptions(input.videoCaptions());
```
Dans `toDto`, ajouter les 3 derniers arguments du `new Furniture(...)` :
```java
                List.of(),
                List.copyOf(entity.getTags()),
                entity.getVideoUrl(),
                entity.getVideoPoster(),
                entity.getVideoCaptions()
        );
```
Dans `findBySlug`, le `new Furniture(...)` reconstruit doit aussi passer les 3 champs (depuis `base`) en derniers args :
```java
                    storyService.findSlidesForOwner("furniture", entity.getId()),
                    base.tags(),
                    base.videoUrl(),
                    base.videoPoster(),
                    base.videoCaptions()
            );
```

- [ ] **Step 3d: Corriger les autres `new Furniture(...)`**

Compiler et corriger chaque site (tests inclus) en ajoutant `null, null, null` (ou valeurs de test) comme 3 derniers args. Rechercher : `new Furniture(` dans `backend/src/`.

- [ ] **Step 4: Lancer → vert**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: suite verte, nouveau test `update_persiste_les_champs_video` passe.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/entity/FurnitureEntity.java backend/src/main/java/com/atelier/portfolio/model/Furniture.java backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java backend/src/test/java/com/atelier/portfolio/service/FurnitureServiceTest.java
git commit -m "feat(videos): champs video sur Furniture (entite + DTO + mapping)"
```

---

## Task 7: Exhibition — entité + DTO + mapping

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/entity/ExhibitionEntity.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/Exhibition.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java`
- Modify (compilation) : tous les `new Exhibition(...)` (service + tests).

Strictement analogue à la Task 6. **Lire d'abord `ExhibitionService.java`** pour reproduire exactement son `toDto`/`applyChanges`/`findBySlug` (même structure que `FurnitureService`). Champs video = **3 derniers** du record `Exhibition` (après `slides`).

- [ ] **Step 1: Test round-trip video sur ExhibitionService**

Ajouter `update_persiste_les_champs_video` dans le test d'`ExhibitionService` (même forme que les tests `update_*` existants ; 3 nouveaux args en dernier).

- [ ] **Step 2: Lancer → échec compilation**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: échec (`videoUrl()` absent).

- [ ] **Step 3a: ExhibitionEntity — 3 colonnes + accesseurs**

```java
    @Column(name = "video_url", length = 500)
    private String videoUrl;
    @Column(name = "video_poster", length = 500)
    private String videoPoster;
    @Column(name = "video_captions", length = 500)
    private String videoCaptions;
```
+ getters/setters `getVideoUrl/setVideoUrl`, `getVideoPoster/setVideoPoster`, `getVideoCaptions/setVideoCaptions` (mêmes corps que Task 6 Step 3a).

- [ ] **Step 3b: Exhibition record — 3 champs en fin**

Après `List<Slide> slides` :
```java
        List<Slide> slides,
        @Size(max = 500) String videoUrl,
        @Size(max = 500) String videoPoster,
        @Size(max = 500) String videoCaptions
) {
}
```

- [ ] **Step 3c: ExhibitionService — mapping**

Dans `applyChanges` (après les setters de visibilité story) :
```java
        entity.setVideoUrl(input.videoUrl());
        entity.setVideoPoster(input.videoPoster());
        entity.setVideoCaptions(input.videoCaptions());
```
Dans `toDto` et `findBySlug` : passer `entity.getVideoUrl()/getVideoPoster()/getVideoCaptions()` (resp. `base.videoUrl()/...`) comme 3 derniers args du `new Exhibition(...)`.

- [ ] **Step 3d: Corriger les autres `new Exhibition(...)`** (service + tests) : ajouter `null, null, null` en fin. Rechercher `new Exhibition(`.

- [ ] **Step 4: Lancer → vert**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected: suite verte.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/entity/ExhibitionEntity.java backend/src/main/java/com/atelier/portfolio/model/Exhibition.java backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java backend/src/test/java/com/atelier/portfolio/
git commit -m "feat(videos): champs video sur Exhibition (entite + DTO + mapping)"
```

---

## Task 8: `<app-video-player>` (lecteur public)

**Files:**
- Create: `frontend/src/app/components/video-player/video-player.component.ts`
- Create: `frontend/src/app/components/video-player/video-player.component.spec.ts`

Composant pur, natif, aucune dépendance tierce. `preload="none"` si poster (perf), `metadata` sinon.

- [ ] **Step 1: Écrire le spec**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoPlayerComponent } from './video-player.component';

describe('VideoPlayerComponent', () => {
  let fixture: ComponentFixture<VideoPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VideoPlayerComponent] }).compileComponents();
    fixture = TestBed.createComponent(VideoPlayerComponent);
  });

  function render(props: Partial<VideoPlayerComponent>) {
    Object.assign(fixture.componentInstance, props);
    fixture.detectChanges();
  }

  it('rend la source et le nom accessible', () => {
    render({ src: '/api/videos/files/clip.mp4', label: 'Tabouret Aurore — vidéo' });
    const video: HTMLVideoElement = fixture.nativeElement.querySelector('video');
    const source: HTMLSourceElement = fixture.nativeElement.querySelector('source');
    expect(video.getAttribute('aria-label')).toBe('Tabouret Aurore — vidéo');
    expect(source.getAttribute('src')).toBe('/api/videos/files/clip.mp4');
  });

  it('utilise preload=none avec poster, metadata sans', () => {
    render({ src: '/api/videos/files/clip.mp4', poster: '/api/photos/files/p.jpg', label: 'x' });
    expect(fixture.nativeElement.querySelector('video').getAttribute('preload')).toBe('none');

    const f2 = TestBed.createComponent(VideoPlayerComponent);
    Object.assign(f2.componentInstance, { src: '/api/videos/files/clip.mp4', label: 'x' });
    f2.detectChanges();
    expect(f2.nativeElement.querySelector('video').getAttribute('preload')).toBe('metadata');
  });

  it('ajoute la piste de sous-titres si captions', () => {
    render({ src: '/api/videos/files/clip.mp4', captions: '/api/videos/files/s.vtt', label: 'x' });
    const track: HTMLTrackElement = fixture.nativeElement.querySelector('track');
    expect(track).toBeTruthy();
    expect(track.getAttribute('src')).toBe('/api/videos/files/s.vtt');
    expect(track.getAttribute('kind')).toBe('captions');
  });

  it('omet la piste si pas de captions', () => {
    render({ src: '/api/videos/files/clip.mp4', label: 'x' });
    expect(fixture.nativeElement.querySelector('track')).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer → échec (composant absent)**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: échec de compilation.

- [ ] **Step 3: Implémenter le composant**

```ts
import { Component, Input } from '@angular/core';

/**
 * Lecteur video natif (auto-heberge). Composant pur, aucune dependance tierce,
 * aucun JS inline. Avec poster : preload="none" (aucun telechargement video
 * avant clic). Sans poster : preload="metadata" (affiche la 1re frame).
 * Piste de sous-titres .vtt optionnelle (FR par defaut).
 */
@Component({
  selector: 'app-video-player',
  standalone: true,
  template: `
    <video
      class="vp-video"
      controls
      [attr.aria-label]="label"
      [poster]="poster || null"
      [attr.preload]="poster ? 'none' : 'metadata'">
      <source [attr.src]="src" [attr.type]="mimeType()" />
      @if (captions) {
        <track kind="captions" [attr.src]="captions" srclang="fr" label="Français" default />
      }
    </video>
  `,
  styles: [`
    .vp-video { display: block; width: 100%; max-height: 80vh; background: #000; }
  `]
})
export class VideoPlayerComponent {
  @Input({ required: true }) src = '';
  @Input() poster: string | null = null;
  @Input() captions: string | null = null;
  @Input() label = 'Vidéo';

  protected mimeType(): string {
    return this.src.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
  }
}
```

- [ ] **Step 4: Lancer → vert**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: 4 tests `VideoPlayerComponent` verts.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/video-player/
git commit -m "feat(videos): composant <app-video-player> (natif, poster, sous-titres)"
```

---

## Task 9: portfolio.service.uploadVideo + modèles + `<app-video-field>`

**Files:**
- Modify: `frontend/src/app/services/portfolio.service.ts` (ajout `uploadVideo`, `deleteVideo`)
- Modify: `frontend/src/app/models/furniture.model.ts` (+`videoUrl?`, `videoPoster?`, `videoCaptions?`)
- Modify: `frontend/src/app/models/exhibition.model.ts` (idem)
- Create: `frontend/src/app/pages/admin/shared/video-field.component.ts`
- Create: `frontend/src/app/pages/admin/shared/video-field.component.spec.ts`

`<app-video-field>` : 3 sous-uploads (vidéo, poster=image, sous-titres) ; émet les URLs ; passe par `portfolio.service` (jamais `HttpClient` direct).

- [ ] **Step 1: Ajouter `uploadVideo`/`deleteVideo` au service**

Dans `portfolio.service.ts`, près d'`uploadPhoto` :
```ts
  uploadVideo(file: File): Observable<{ url: string; filename: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string; filename: string }>(`${API}/admin/videos`, fd);
  }

  deleteVideo(filename: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/videos/files/${filename}`);
  }
```

- [ ] **Step 2: Ajouter les champs aux modèles**

Dans `furniture.model.ts` et `exhibition.model.ts`, ajouter à l'interface :
```ts
  videoUrl?: string | null;
  videoPoster?: string | null;
  videoCaptions?: string | null;
```

- [ ] **Step 3: Écrire le spec `video-field`**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { VideoFieldComponent } from './video-field.component';
import { PortfolioService } from '../../../services/portfolio.service';

describe('VideoFieldComponent', () => {
  let fixture: ComponentFixture<VideoFieldComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService', ['uploadVideo', 'uploadPhoto', 'deleteVideo']);
    await TestBed.configureTestingModule({
      imports: [VideoFieldComponent],
      providers: [{ provide: PortfolioService, useValue: portfolio }],
    }).compileComponents();
    fixture = TestBed.createComponent(VideoFieldComponent);
  });

  it('upload vidéo → émet videoUrl', () => {
    portfolio.uploadVideo.and.returnValue(of({ url: '/api/videos/files/u.mp4', filename: 'u.mp4' }));
    const emitted: string[] = [];
    fixture.componentInstance.videoUrlChange.subscribe(v => emitted.push(v ?? ''));
    fixture.detectChanges();

    const file = new File([new Uint8Array([1])], 'c.mp4', { type: 'video/mp4' });
    fixture.componentInstance.onVideoSelected({ target: { files: [file] } } as unknown as Event);

    expect(portfolio.uploadVideo).toHaveBeenCalled();
    expect(emitted).toContain('/api/videos/files/u.mp4');
  });

  it('retirer → émet null', () => {
    fixture.detectChanges();
    const emitted: (string | null)[] = [];
    fixture.componentInstance.videoUrlChange.subscribe(v => emitted.push(v));
    fixture.componentInstance.removeVideo();
    expect(emitted).toContain(null);
  });

  it('upload sous-titres → émet videoCaptions', () => {
    portfolio.uploadVideo.and.returnValue(of({ url: '/api/videos/files/s.vtt', filename: 's.vtt' }));
    const emitted: (string | null)[] = [];
    fixture.componentInstance.videoCaptionsChange.subscribe(v => emitted.push(v));
    fixture.detectChanges();
    const file = new File(['WEBVTT'], 's.vtt', { type: 'text/vtt' });
    fixture.componentInstance.onCaptionsSelected({ target: { files: [file] } } as unknown as Event);
    expect(emitted).toContain('/api/videos/files/s.vtt');
  });
});
```

- [ ] **Step 4: Lancer → échec (composant absent)**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: échec de compilation.

- [ ] **Step 5: Implémenter `<app-video-field>`**

```ts
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { VideoPlayerComponent } from '../../../components/video-player/video-player.component';

/**
 * Champ admin pour gerer la video optionnelle d'une fiche/page :
 * upload video (.mp4/.webm), poster (image), sous-titres (.vtt) ;
 * apercu + remplacer/retirer. Emet les URLs vers le parent (pas de
 * HttpClient direct : passe par PortfolioService).
 */
@Component({
  selector: 'app-video-field',
  standalone: true,
  imports: [VideoPlayerComponent],
  template: `
    <div class="video-field">
      <span class="vf-title">Vidéo (optionnelle)</span>

      @if (videoUrl) {
        <app-video-player [src]="videoUrl" [poster]="videoPoster ?? null"
          [captions]="videoCaptions ?? null" [label]="label" />
      } @else {
        <p class="vf-empty">Aucune vidéo. Formats : mp4/webm web-ready (≤ 200 Mo).</p>
      }

      <div class="vf-actions">
        <label class="vf-btn">
          {{ videoUrl ? 'Remplacer la vidéo' : 'Ajouter une vidéo' }}
          <input type="file" accept="video/mp4,video/webm" hidden (change)="onVideoSelected($event)" />
        </label>
        <label class="vf-btn">
          {{ videoPoster ? 'Remplacer le poster' : 'Ajouter un poster' }}
          <input type="file" accept="image/*" hidden (change)="onPosterSelected($event)" />
        </label>
        <label class="vf-btn">
          {{ videoCaptions ? 'Remplacer les sous-titres' : 'Ajouter des sous-titres (.vtt)' }}
          <input type="file" accept=".vtt,text/vtt" hidden (change)="onCaptionsSelected($event)" />
        </label>
        @if (videoUrl) {
          <button type="button" class="vf-btn vf-remove" (click)="removeVideo()">Retirer la vidéo</button>
        }
      </div>
      @if (error()) { <p class="vf-error">{{ error() }}</p> }
    </div>
  `,
  styles: [`
    .video-field { display: flex; flex-direction: column; gap: 10px; }
    .vf-title { font-size: 0.78rem; color: var(--color-ink-soft); }
    .vf-empty { font-size: 0.85rem; color: var(--color-mute); }
    .vf-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .vf-btn {
      background: transparent; border: 1px solid var(--color-line); padding: 6px 14px;
      font-size: 0.78rem; cursor: pointer; color: var(--color-ink-soft);
    }
    .vf-btn:hover { color: var(--color-ink); border-color: var(--color-ink); }
    .vf-remove { color: #c0392b; }
    .vf-error { color: #c0392b; font-size: 0.8rem; }
  `]
})
export class VideoFieldComponent {
  private readonly portfolio = inject(PortfolioService);

  @Input() label = 'Vidéo';
  @Input() videoUrl: string | null = null;
  @Input() videoPoster: string | null = null;
  @Input() videoCaptions: string | null = null;

  @Output() videoUrlChange = new EventEmitter<string | null>();
  @Output() videoPosterChange = new EventEmitter<string | null>();
  @Output() videoCaptionsChange = new EventEmitter<string | null>();

  protected readonly error = signal('');

  onVideoSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');
    this.portfolio.uploadVideo(file).subscribe({
      next: (r) => { this.videoUrl = r.url; this.videoUrlChange.emit(r.url); },
      error: () => this.error.set('Échec de l’envoi de la vidéo.'),
    });
  }

  onPosterSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');
    this.portfolio.uploadPhoto(file).subscribe({
      next: (p) => { this.videoPoster = p.url; this.videoPosterChange.emit(p.url); },
      error: () => this.error.set('Échec de l’envoi du poster.'),
    });
  }

  onCaptionsSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');
    this.portfolio.uploadVideo(file).subscribe({
      next: (r) => { this.videoCaptions = r.url; this.videoCaptionsChange.emit(r.url); },
      error: () => this.error.set('Échec de l’envoi des sous-titres.'),
    });
  }

  removeVideo(): void {
    this.videoUrl = null;
    this.videoPoster = null;
    this.videoCaptions = null;
    this.videoUrlChange.emit(null);
    this.videoPosterChange.emit(null);
    this.videoCaptionsChange.emit(null);
  }
}
```

- [ ] **Step 6: Lancer → vert**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: tests `VideoFieldComponent` verts, suite globale verte.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/services/portfolio.service.ts frontend/src/app/models/furniture.model.ts frontend/src/app/models/exhibition.model.ts frontend/src/app/pages/admin/shared/video-field.component.ts frontend/src/app/pages/admin/shared/video-field.component.spec.ts
git commit -m "feat(videos): uploadVideo (service) + modeles + <app-video-field> admin"
```

---

## Task 10: Câblage vues détail (bloc « Vidéo » public + éditable) + payload admin

**Files (lire d'abord intégralement)** :
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts` (+spec)
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts` (+spec)
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`

Bloc « Vidéo » **sous la galerie** : rendu public si `item.videoUrl` ; en mode `editable`, `<app-video-field>` à la place. Les vues émettent un événement de changement vidéo ; les composants admin (qui possèdent l'état du formulaire et appellent `updateFurniture`/`updateExhibition`) le persistent.

- [ ] **Step 1: Spec vue détail (furniture)**

Ajouter dans `furniture-detail-view.component.spec.ts` :
```ts
it('affiche le bloc vidéo en public si videoUrl', () => {
  // GIVEN item avec videoUrl renseigne, editable = false
  // THEN un <app-video-player> est présent sous la galerie
});
it('masque le bloc vidéo si pas de videoUrl (public)', () => {
  // GIVEN item sans videoUrl, editable = false
  // THEN aucun <app-video-player>
});
it('rend <app-video-field> en mode editable', () => {
  // GIVEN editable = true
  // THEN un <app-video-field> est présent (édition)
});
```
> Suivre la forme exacte des specs existants du fichier (création de fixture, `@Input() item`, `editable`).

- [ ] **Step 2: Lancer → échec**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: échec (bloc absent).

- [ ] **Step 3a: furniture-detail-view — imports + outputs + bloc template**

Imports du composant : ajouter `VideoPlayerComponent` et `VideoFieldComponent`.
Ajouter les `@Output()` :
```ts
  @Output() videoUrlChange = new EventEmitter<string | null>();
  @Output() videoPosterChange = new EventEmitter<string | null>();
  @Output() videoCaptionsChange = new EventEmitter<string | null>();
```
Dans le template, **immédiatement après la section galerie** (repérer le `<section>`/bloc `.g-grid` de galerie ; insérer après sa fermeture), ajouter :
```html
@if (editable) {
  <section class="video-block">
    <app-video-field
      label="{{ item.title }} — vidéo"
      [videoUrl]="item.videoUrl ?? null"
      [videoPoster]="item.videoPoster ?? null"
      [videoCaptions]="item.videoCaptions ?? null"
      (videoUrlChange)="videoUrlChange.emit($event)"
      (videoPosterChange)="videoPosterChange.emit($event)"
      (videoCaptionsChange)="videoCaptionsChange.emit($event)" />
  </section>
} @else if (item.videoUrl) {
  <section class="video-block">
    <h2 class="video-title">Vidéo</h2>
    <app-video-player [src]="item.videoUrl" [poster]="item.videoPoster ?? null"
      [captions]="item.videoCaptions ?? null" [label]="item.title + ' — vidéo'" />
  </section>
}
```
Ajouter au `styles` :
```css
.video-block { margin-top: 48px; }
.video-title { font-size: 1.375rem; margin-bottom: 16px; }
```
> Adapter `item.` au nom réel de l'accès (signal `item()` vs `@Input() item`) en suivant le reste du template.

- [ ] **Step 3b: exhibition-detail-view** — répéter exactement Step 3a sur le fichier exposition (même bloc, même outputs, même styles).

- [ ] **Step 3c: mobilier.component.ts (admin)** — câbler les events de la preview vers l'état du formulaire et la persistance :
- Lier `(videoUrlChange)`, `(videoPosterChange)`, `(videoCaptionsChange)` du `<app-furniture-detail-view>` de preview à des handlers qui mettent à jour le modèle de fiche courant (champs `videoUrl`/`videoPoster`/`videoCaptions`) puis déclenchent la sauvegarde existante (`updateFurniture`) — suivre exactement le pattern déjà utilisé pour les autres éditions in-preview (cover/gallery/story). Inclure les 3 champs dans le payload envoyé à `updateFurniture`.

- [ ] **Step 3d: expositions.component.ts (admin)** — idem 3c côté exposition (`updateExhibition`).

- [ ] **Step 4: Lancer → vert**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: suite verte.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/furniture-detail-view/ frontend/src/app/components/exhibition-detail-view/ frontend/src/app/pages/admin/mobilier/mobilier.component.ts frontend/src/app/pages/admin/expositions/expositions.component.ts
git commit -m "feat(videos): bloc video dans fiches mobilier/expo (public + edition in-preview)"
```

---

## Task 11: Câblage Studio (public) + admin Textes

**Files (lire d'abord)** :
- Modify: `frontend/src/app/pages/studio/studio.component.ts` (+spec)
- Modify: `frontend/src/app/pages/admin/textes/textes.component.ts` (+spec)

Studio public : bloc vidéo dédié rendu si `content()['studio.video.url']`. Admin Textes : `<app-video-field>` qui sauvegarde dans les clés `studio.video.url/.poster/.captions` via `updateContent`.

- [ ] **Step 1: Spec Studio public**

Ajouter dans `studio.component.spec.ts` :
```ts
it('affiche le bloc vidéo si studio.video.url', () => {
  // GIVEN content avec 'studio.video.url' renseigne (+ profile minimal)
  // THEN un <app-video-player> est présent
});
it('masque le bloc vidéo sinon', () => {
  // GIVEN content sans 'studio.video.url'
  // THEN aucun <app-video-player>
});
```

- [ ] **Step 2: Lancer → échec**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: échec.

- [ ] **Step 3a: studio.component.ts — bloc public**

Importer `VideoPlayerComponent`. Ajouter un computed :
```ts
  protected readonly videoUrl = computed(() => this.content()['studio.video.url'] ?? '');
  protected readonly videoPoster = computed(() => this.content()['studio.video.poster'] ?? '');
  protected readonly videoCaptions = computed(() => this.content()['studio.video.captions'] ?? '');
```
Dans le template, après la section `process` (ou après la bio si process masqué), ajouter :
```html
@if (videoUrl()) {
  <section class="section studio-video">
    <div class="container">
      <span class="eyebrow" [ngStyle]="eyebrowStyleVar()">Vidéo</span>
      <app-video-player [src]="videoUrl()" [poster]="videoPoster() || null"
        [captions]="videoCaptions() || null" label="Studio — vidéo" />
    </div>
  </section>
}
```

- [ ] **Step 3b: textes.component.ts — `<app-video-field>` Studio**

Importer `VideoFieldComponent`. Dans la section Studio de l'éditeur de textes, ajouter :
```html
<app-video-field
  label="Studio — vidéo"
  [videoUrl]="content()['studio.video.url'] ?? null"
  [videoPoster]="content()['studio.video.poster'] ?? null"
  [videoCaptions]="content()['studio.video.captions'] ?? null"
  (videoUrlChange)="setVideoContent('studio.video.url', $event)"
  (videoPosterChange)="setVideoContent('studio.video.poster', $event)"
  (videoCaptionsChange)="setVideoContent('studio.video.captions', $event)" />
```
Et le handler (sauvegarde via le mécanisme `updateContent` existant ; `null` → clé vidée) :
```ts
  protected setVideoContent(key: string, value: string | null): void {
    const next = { ...this.content(), [key]: value ?? '' };
    this.content.set(next);
    this.portfolio.updateContent({ [key]: value ?? '' }).subscribe();
  }
```
> Adapter `this.content` / `this.portfolio` aux noms réels du composant (lire le fichier) ; réutiliser le pattern d'auto-save déjà présent pour les autres champs Studio.

- [ ] **Step 4: Lancer → vert**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: suite verte.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/studio/ frontend/src/app/pages/admin/textes/
git commit -m "feat(videos): bloc video Studio (public) + champ admin Textes (cles studio.video.*)"
```

---

## Après toutes les tâches

1. **Revue finale holistique** du diff complet de la branche (couvre intégration backend↔frontend, sémantique de retrait null, CSP, Range).
2. **Redéploiement local** : `docker compose up --build -d backend frontend` (les deux : nouveau backend + nginx + front).
3. **Validation visuelle + comportement par l'utilisateur** : upload d'un mp4 web-ready sur une fiche mobilier, une fiche expo, le Studio ; vérifier lecture, seek (Range → 206), poster, sous-titres (activer la piste), retrait, et que le bloc est masqué sans vidéo. Vérifier le rejet d'une extension interdite et d'un fichier > 200 Mo.
4. **Playwright** : APRÈS validation visuelle seulement, régénérer les baselines impactées (fiches + Studio gagnent un bloc) — `npm run test:visual:docker:update`.
5. **Audits avant merge** (scope conséquent : upload de fichiers + nouvelle surface) : proposer **audit sécurité** (`security-auditor` : allowlist/path-traversal/Range/limite taille/CSP) **et audit RGAA** (lecteur natif, sous-titres, focus, titres de section). Corriger ou faire accepter les findings.
6. **Doc** : `docs/SPECIFICATION_TECHNIQUE.md` (endpoints `/api/videos/**`, colonnes video, clés `studio.video.*`, CSP media-src, limite 200MB) ; `docs/SPECIFICATION_FONCTIONNELLE.md` (vidéo dans fiches + Studio) ; envisager un ADR (média auto-hébergé + Range). README/deploy si la limite 200MB impacte le déploiement.
7. **Merge** sur `main` après confirmation explicite utilisateur (ff du bump déploiement puis `--no-ff`).

---

## Self-review (effectuée)

- **Couverture spec** : stockage/serve/upload (T1-T3), config 200MB+nginx+CSP (T4), migrations (T5), schéma+mapping furniture/expo (T6-T7), player (T8), service+modèles+field (T9), câblage fiches public+éditable+payload (T10), Studio public+admin (T11). Sous-titres .vtt couverts (allowlist T1, content-type T2, track T8, upload T9, câblage T10-T11). Poster couvert (T9 réutilise uploadPhoto). RGAA/doc/audits en post-tâches.
- **Cohérence des types** : `StoredVideo(filename, url)` (T1) consommé identiquement en T3 ; `uploadVideo` renvoie `{ url, filename }` (T9) consommé en T9/T10 ; champs record `videoUrl/videoPoster/videoCaptions` en **3 derniers** args (T6-T7) ; modèles front mêmes noms (T9) ; outputs `videoUrlChange/videoPosterChange/videoCaptionsChange` cohérents T9↔T10↔T11.
- **Placeholders** : les Tasks 6/7/10/11 demandent de **lire le fichier cible** pour reproduire le pattern exact (specs de tests existants, accès `item()` vs `@Input`, auto-save Studio) — volontaire car ces fichiers existants varient ; le code à ajouter est fourni en entier, seuls les points d'ancrage sont à confirmer à la lecture.
