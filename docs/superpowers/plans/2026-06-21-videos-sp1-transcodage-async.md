# Vidéos SP1 — Transcodage async + poster + métadonnées — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** À l'upload d'une vidéo, transcoder en mp4 web-ready (H.264/AAC faststart, ≤1080p) en tâche de fond, générer un poster et les métadonnées, le tout porté par une entité `Video` à statut ; les fiches/Studio référencent la vidéo par `video_id` et ne l'exposent au public qu'une fois `READY`.

**Architecture:** Backend Spring Boot : entité `Video` (statut UPLOADED→PROCESSING→READY/FAILED), `VideoTranscoder` (interface ; impl FFmpeg via `ProcessBuilder`, no-op si indisponible), pipeline `@Async` in-process + recovery au démarrage. Les propriétaires (`furniture`/`exhibition`/`SiteContent studio.video.id`) stockent un `video_id` ; la résolution DTO n'expose la vidéo (URL de sortie + poster + durée/dimensions) que si `READY`. Frontend admin : `<app-video-field>` polle le statut. FFmpeg ajouté à l'image Docker.

**Tech Stack:** Java 25 / Spring Boot 4.1, Liquibase, JPA/H2 (tests) + Postgres, Angular 21 (signals), FFmpeg (binaire), JUnit 5 + Mockito, Karma/Jasmine.

**Référence spec :** `docs/superpowers/specs/2026-06-21-videos-sp1-transcodage-async-design.md`
**Branche :** `feat/videos-sp1-transcodage`

---

## File Structure

**Backend (nouveau)**
- `entity/VideoEntity.java` — entité JPA `video`.
- `entity/VideoStatus.java` — enum `UPLOADED/PROCESSING/READY/FAILED`.
- `repository/VideoRepository.java` — JPA repo.
- `model/Video.java` — DTO (statut admin + champs résolus).
- `service/VideoTranscoder.java` — interface + records `VideoMeta`, `TranscodeOptions`.
- `service/FfmpegVideoTranscoder.java` — impl FFmpeg (ProcessBuilder).
- `config/AsyncConfig.java` — `@EnableAsync` + executor borné.
- `db/changelog/changes/034-create-video.yaml` — migration.

**Backend (modifié)**
- `service/VideoService.java` — pipeline complet.
- `controller/AdminVideoController.java` — upload async + statut + retry + delete.
- `entity/FurnitureEntity.java`, `entity/ExhibitionEntity.java` — `video_url`→`video_id`.
- `service/FurnitureService.java`, `service/ExhibitionService.java`, `service/HomeService.java` — résolution `video_id`→`Video(READY)`.
- `model/Furniture.java`, `model/Exhibition.java` — ajout `videoId` (write) + `durationSeconds`/`width`/`height` (read) ; `videoUrl` reste (résolu).
- `Dockerfile`, `application.properties`, `META-INF/additional-spring-configuration-metadata.json`.

**Frontend (modifié)**
- `models/video.model.ts` (nouveau), `services/portfolio.service.ts`, `pages/admin/shared/video-field.component.ts`, composants d'édition fiche (mobilier/expo preview) + Studio.

**Doc**
- `docs/adr/0021-videos-transcodage-async.md`.

---

## Task 1: Infra FFmpeg + config + AsyncConfig

**Files:**
- Modify: `backend/Dockerfile:18`
- Modify: `backend/src/main/resources/application.properties`
- Modify: `backend/src/main/resources/META-INF/additional-spring-configuration-metadata.json`
- Create: `backend/src/main/java/com/atelier/portfolio/config/AsyncConfig.java`

- [ ] **Step 1 — Dockerfile : installer ffmpeg.** Ajouter `ffmpeg` à la ligne `apk add` du stage runtime :

```dockerfile
RUN apk add --no-cache su-exec ffmpeg
```

- [ ] **Step 2 — application.properties : config vidéo.** Ajouter après `app.video.base-url` :

```properties
app.video.transcode.enabled=${VIDEO_TRANSCODE_ENABLED:true}
app.video.ffmpeg-path=${FFMPEG_PATH:ffmpeg}
app.video.ffprobe-path=${FFPROBE_PATH:ffprobe}
app.video.max-height=1080
app.video.crf=23
app.video.preset=medium
app.video.transcode-timeout-seconds=600
app.video.poster-offset-seconds=1
```

- [ ] **Step 3 — metadata JSON.** Ajouter dans le tableau `properties` de `additional-spring-configuration-metadata.json` des entrées `{"name":"app.video.transcode.enabled","type":"java.lang.Boolean","defaultValue":true}` et idem pour `app.video.ffmpeg-path`/`ffprobe-path` (String), `max-height`/`crf`/`transcode-timeout-seconds`/`poster-offset-seconds` (java.lang.Integer), `preset` (String). (Évite les warnings IDE « unknown property ».)

- [ ] **Step 4 — AsyncConfig.** Créer :

```java
package com.atelier.portfolio.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Active le traitement asynchrone (transcodage video). Pool borné : un seul
 * backend single-tenant, le transcodage est CPU-lourd — on limite le parallélisme
 * pour ne pas saturer l'instance Railway. Le transcodage lui-même tourne dans un
 * process ffmpeg externe (pas dans le heap JVM).
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "videoExecutor")
    public Executor videoExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("video-");
        executor.initialize();
        return executor;
    }
}
```

- [ ] **Step 5 — Commit.** `git add` les 4 fichiers ; `git commit -m "feat(videos): infra ffmpeg (Dockerfile) + config app.video.* + AsyncConfig"`.

---

## Task 2: Entité Video + repository

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/entity/VideoStatus.java`
- Create: `backend/src/main/java/com/atelier/portfolio/entity/VideoEntity.java`
- Create: `backend/src/main/java/com/atelier/portfolio/repository/VideoRepository.java`

- [ ] **Step 1 — Enum.**

```java
package com.atelier.portfolio.entity;

public enum VideoStatus { UPLOADED, PROCESSING, READY, FAILED }
```

- [ ] **Step 2 — Entité.** Table `video` (colonnes en snake_case). S'inspirer de `PhotoEntity` pour le style (classe mutable, getters/setters).

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "video")
public class VideoEntity {
    @Id
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VideoStatus status;

    @Column(name = "source_filename", length = 255)
    private String sourceFilename;
    @Column(name = "output_filename", length = 255)
    private String outputFilename;
    @Column(name = "poster_filename", length = 255)
    private String posterFilename;
    @Column(name = "duration_seconds")
    private Double durationSeconds;
    private Integer width;
    private Integer height;
    @Column(name = "error_message", length = 500)
    private String errorMessage;
    @Column(name = "original_name", length = 255)
    private String originalName;
    @Column(name = "created_at", length = 40)
    private String createdAt;
    @Column(name = "updated_at", length = 40)
    private String updatedAt;

    // getters/setters pour tous les champs (suivre le style de PhotoEntity)
}
```

- [ ] **Step 3 — Repository.**

```java
package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.VideoEntity;
import com.atelier.portfolio.entity.VideoStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VideoRepository extends JpaRepository<VideoEntity, String> {
    List<VideoEntity> findByStatus(VideoStatus status);
}
```

- [ ] **Step 4 — Compile.** `cd backend ; mvn -q -DskipTests compile` → exit 0. (Pas de test : code de structure ; couvert par les tests des tâches suivantes.)

- [ ] **Step 5 — Commit.** `git commit -m "feat(videos): entite Video + statut + repository"`.

---

## Task 3: VideoTranscoder (interface + FFmpeg)

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/service/VideoTranscoder.java`
- Create: `backend/src/main/java/com/atelier/portfolio/service/FfmpegVideoTranscoder.java`
- Test: `backend/src/test/java/com/atelier/portfolio/service/FfmpegVideoTranscoderTest.java`

- [ ] **Step 1 — Interface + records.**

```java
package com.atelier.portfolio.service;

import java.io.IOException;
import java.nio.file.Path;

/** Abstraction du transcodage video. Mockable en test ; impl FFmpeg en prod. */
public interface VideoTranscoder {
    /** true si l'outil est disponible/active (sinon le service degrade en READY brut). */
    boolean isAvailable();
    /** Lit duree/dimensions (ffprobe). Leve si l'entree n'est pas une video valide. */
    VideoMeta probe(Path source) throws IOException, InterruptedException;
    /** Transcode source -> outMp4 (web-ready) + extrait outPoster (jpg). */
    void transcode(Path source, Path outMp4, Path outPoster, TranscodeOptions options)
            throws IOException, InterruptedException;

    record VideoMeta(double durationSeconds, int width, int height) {}
    record TranscodeOptions(int maxHeight, int crf, String preset, int timeoutSeconds, int posterOffsetSeconds) {}
}
```

- [ ] **Step 2 — Test (construction de commande, sans exécuter ffmpeg).** `FfmpegVideoTranscoder` expose en `static` la construction d'arguments pour rendre la logique testable sans binaire :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.service.VideoTranscoder.TranscodeOptions;
import org.junit.jupiter.api.Test;
import java.nio.file.Path;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class FfmpegVideoTranscoderTest {
    @Test
    void buildTranscodeArgs_contient_h264_aac_faststart_et_plafond_hauteur() {
        List<String> args = FfmpegVideoTranscoder.buildTranscodeArgs(
                "ffmpeg", Path.of("in.mp4"), Path.of("out.mp4"),
                new TranscodeOptions(1080, 23, "medium", 600, 1));
        assertTrue(args.contains("libx264"));
        assertTrue(args.contains("aac"));
        assertTrue(args.contains("+faststart"));
        assertTrue(args.stream().anyMatch(a -> a.contains("min(1080,ih)")), "plafond hauteur sans upscale");
        assertTrue(args.stream().anyMatch(a -> a.contains("23")), "crf");
        assertEquals("ffmpeg", args.get(0));
        assertEquals("out.mp4", args.get(args.size() - 1));
    }

    @Test
    void buildPosterArgs_extrait_une_frame_a_l_offset() {
        List<String> args = FfmpegVideoTranscoder.buildPosterArgs(
                "ffmpeg", Path.of("in.mp4"), Path.of("p.jpg"), 1);
        assertTrue(args.contains("-ss"));
        assertTrue(args.contains("1"));
        assertTrue(args.contains("-frames:v"));
        assertEquals("p.jpg", args.get(args.size() - 1));
    }

    @Test
    void buildProbeArgs_demande_json_streams_format() {
        List<String> args = FfmpegVideoTranscoder.buildProbeArgs("ffprobe", Path.of("in.mp4"));
        assertTrue(args.contains("-show_streams"));
        assertTrue(args.contains("-show_format"));
        assertTrue(args.contains("json"));
    }
}
```

- [ ] **Step 3 — Run → FAIL** (classe absente). `cd backend ; mvn -q -Dtest=FfmpegVideoTranscoderTest test` → compile error / fail.

- [ ] **Step 4 — Impl.** `FfmpegVideoTranscoder` : builders d'arguments `static` + exécution `ProcessBuilder` (liste d'args = pas d'injection shell), `waitFor(timeout)` + `destroyForcibly` si dépassé, parse JSON ffprobe (Jackson `ObjectMapper`, déjà au classpath). `isAvailable()` = flag `app.video.transcode.enabled` ET `which`/exécution `ffmpeg -version` réussie (mémoïsée).

```java
package com.atelier.portfolio.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class FfmpegVideoTranscoder implements VideoTranscoder {

    private final boolean enabled;
    private final String ffmpeg;
    private final String ffprobe;
    private final ObjectMapper mapper = new ObjectMapper();
    private Boolean availableCache;

    public FfmpegVideoTranscoder(
            @Value("${app.video.transcode.enabled:true}") boolean enabled,
            @Value("${app.video.ffmpeg-path:ffmpeg}") String ffmpeg,
            @Value("${app.video.ffprobe-path:ffprobe}") String ffprobe) {
        this.enabled = enabled;
        this.ffmpeg = ffmpeg;
        this.ffprobe = ffprobe;
    }

    static List<String> buildTranscodeArgs(String ffmpeg, Path in, Path out, TranscodeOptions o) {
        List<String> a = new ArrayList<>(List.of(
                ffmpeg, "-y", "-i", in.toString(),
                "-vf", "scale=-2:'min(" + o.maxHeight() + ",ih)'",
                "-c:v", "libx264", "-preset", o.preset(), "-crf", String.valueOf(o.crf()),
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                out.toString()));
        return a;
    }

    static List<String> buildPosterArgs(String ffmpeg, Path in, Path poster, int offsetSeconds) {
        return List.of(ffmpeg, "-y", "-ss", String.valueOf(offsetSeconds), "-i", in.toString(),
                "-frames:v", "1", "-q:v", "3", poster.toString());
    }

    static List<String> buildProbeArgs(String ffprobe, Path in) {
        return List.of(ffprobe, "-v", "error", "-show_streams", "-show_format",
                "-of", "json", in.toString());
    }

    @Override
    public boolean isAvailable() {
        if (!enabled) return false;
        if (availableCache != null) return availableCache;
        try {
            Process p = new ProcessBuilder(ffmpeg, "-version").redirectErrorStream(true).start();
            availableCache = p.waitFor(10, TimeUnit.SECONDS) && p.exitValue() == 0;
        } catch (IOException | InterruptedException e) {
            availableCache = false;
        }
        return availableCache;
    }

    @Override
    public VideoMeta probe(Path source) throws IOException, InterruptedException {
        String json = runCapture(buildProbeArgs(ffprobe, source), 30);
        JsonNode root = mapper.readTree(json);
        double duration = root.path("format").path("duration").asDouble(0);
        int w = 0, h = 0;
        for (JsonNode s : root.path("streams")) {
            if ("video".equals(s.path("codec_type").asText())) {
                w = s.path("width").asInt(0);
                h = s.path("height").asInt(0);
                break;
            }
        }
        if (w == 0 || h == 0) throw new IOException("Pas de flux video valide");
        return new VideoMeta(duration, w, h);
    }

    @Override
    public void transcode(Path source, Path outMp4, Path outPoster, TranscodeOptions o)
            throws IOException, InterruptedException {
        runVoid(buildTranscodeArgs(ffmpeg, source, outMp4, o), o.timeoutSeconds());
        runVoid(buildPosterArgs(ffmpeg, source, outPoster, o.posterOffsetSeconds()), 60);
    }

    private void runVoid(List<String> args, int timeoutSeconds) throws IOException, InterruptedException {
        Process p = new ProcessBuilder(args).redirectErrorStream(true).start();
        if (!p.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
            p.destroyForcibly();
            throw new IOException("Timeout ffmpeg apres " + timeoutSeconds + "s");
        }
        if (p.exitValue() != 0) {
            throw new IOException("ffmpeg a echoue (code " + p.exitValue() + ") : " + new String(p.getInputStream().readAllBytes()));
        }
    }

    private String runCapture(List<String> args, int timeoutSeconds) throws IOException, InterruptedException {
        Process p = new ProcessBuilder(args).start();
        byte[] out = p.getInputStream().readAllBytes();
        if (!p.waitFor(timeoutSeconds, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new IOException("Timeout ffprobe"); }
        if (p.exitValue() != 0) throw new IOException("ffprobe a echoue (code " + p.exitValue() + ")");
        return new String(out);
    }
}
```

- [ ] **Step 5 — Run → PASS.** `cd backend ; mvn -q -Dtest=FfmpegVideoTranscoderTest test` → vert.
- [ ] **Step 6 — Commit.** `git commit -m "feat(videos): VideoTranscoder (interface + impl FFmpeg ProcessBuilder)"`.

---

## Task 4: VideoService — pipeline async + recovery + statut

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/VideoService.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/Video.java`
- Test: `backend/src/test/java/com/atelier/portfolio/service/VideoServiceTest.java`

- [ ] **Step 1 — DTO `Video`.** Record renvoyé à l'admin (statut) :

```java
package com.atelier.portfolio.model;

public record Video(
    String id, String status, String url, String poster,
    Double durationSeconds, Integer width, Integer height, String errorMessage) {}
```

- [ ] **Step 2 — Tests `VideoServiceTest`** (transcoder mocké). Couvrir : `store` crée `Video(UPLOADED)` + écrit le fichier ; `transcode(id)` synchrone (appelé directement dans le test) avec transcoder mocké → `READY` + output/poster/duration ; transcoder qui lève → `FAILED` + errorMessage + source conservée ; `transcodeDisabled` (isAvailable=false) → `READY` brut (output=source) ; `recoverStaleProcessing()` passe `PROCESSING`→`FAILED` ; `retry(id)` sur `FAILED` avec source présente → relance. Utiliser `@TempDir`, `@Mock VideoTranscoder`, `@Mock VideoRepository` (ou un repo en mémoire), `ReflectionTestUtils.setField(service,"uploadDir",tmp)`.

```java
// Exemple — transcode marque READY avec metadata
@Test
void transcode_marque_ready_avec_output_poster_et_metadata() throws Exception {
    when(transcoder.isAvailable()).thenReturn(true);
    when(transcoder.probe(any())).thenReturn(new VideoTranscoder.VideoMeta(12.5, 1920, 1080));
    // store
    var stored = service.store(multipart("clip.mp4", new byte[]{1,2,3}));
    // transcode (methode package-private synchrone, l'async delegue dessus)
    service.transcode(stored.id());
    var dto = service.getStatus(stored.id());
    assertEquals("READY", dto.status());
    assertNotNull(dto.url());
    assertNotNull(dto.poster());
    assertEquals(12.5, dto.durationSeconds());
    verify(transcoder).transcode(any(), any(), any(), any());
}
```

- [ ] **Step 3 — Run → FAIL.**
- [ ] **Step 4 — Impl VideoService.** Réécrire : injecter `VideoRepository` + `VideoTranscoder` + `@Value app.video.*`. Méthodes :
  - `StoredVideo store(MultipartFile)` : valide extension (allowlist existante) ; **.vtt** reste géré comme aujourd'hui (pas d'entité Video — c'est un sous-titre ; renvoyer juste l'URL comme avant). Pour `.mp4/.webm` : `id = "vid-"+uuid8` ; `sourceFilename = id+"-src"+ext` ; écrit le fichier ; crée `VideoEntity(UPLOADED, source, originalName, createdAt)` ; déclenche `transcodeAsync(id)` ; renvoie `StoredVideo(id, status, ...)`.
  - `@Async("videoExecutor") void transcodeAsync(String id)` → délègue à `transcode(id)` (package-private, synchrone, testable).
  - `void transcode(String id)` : charge l'entité ; si transcoder indisponible → `output=source`, `READY` (dégradation) ; sinon `PROCESSING` (save), `probe` → meta, `output = id+".mp4"`, `poster = id+"-poster.jpg"`, `transcode(...)`, set `READY` + champs + supprime la source ; `catch` → `FAILED` + message (source conservée).
  - `Video getStatus(String id)` : mappe l'entité ; `url` = `READY ? baseUrl+"/"+output : null` ; `poster` = `READY && posterFilename!=null ? "/api/photos/files/"+poster : null`.
  - `Optional<ResolvedVideo> resolveForPublic(String id)` : `READY` → `ResolvedVideo(url, posterUrl, duration, w, h)` ; sinon `Optional.empty()` (utilisé par les services propriétaires). Définir le record dans `VideoService` : `public record ResolvedVideo(String url, String posterUrl, Double durationSeconds, Integer width, Integer height) {}` (où `url = baseUrl+"/"+outputFilename`, `posterUrl = posterFilename!=null ? "/api/photos/files/"+posterFilename : null`).
  - `boolean retry(String id)` : si `FAILED` && source existe → `transcodeAsync`.
  - `boolean delete(String id)` : supprime source/output/poster + entité.
  - `void recoverStaleProcessing()` : `findByStatus(PROCESSING)` → `FAILED("interrompu")`. Appelée via un `@EventListener(ApplicationReadyEvent.class)` (nouveau petit bean ou méthode annotée dans le service).
  - Conserver `loadAsResource(filename)` (inchangé) pour `VideoController`.
- [ ] **Step 5 — Run → PASS** (`mvn -q -Dtest=VideoServiceTest test`).
- [ ] **Step 6 — Commit.** `git commit -m "feat(videos): pipeline transcodage async + statut + recovery dans VideoService"`.

---

## Task 5: AdminVideoController — upload async + statut + retry + delete

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java`
- Test: `backend/src/test/java/com/atelier/portfolio/controller/AdminVideoControllerTest.java`

- [ ] **Step 1 — Tests** (service mocké) : `POST` renvoie 201 + `{id,status}` ; `GET /{id}` renvoie le DTO statut (200) ou 404 ; `POST /{id}/retry` 200 si relancé sinon 409/404 ; `DELETE /{id}` 204/404. (S'inspirer de `AdminPhotoControllerTest`.)
- [ ] **Step 2 — Run → FAIL.**
- [ ] **Step 3 — Impl.** Remplacer `upload` pour renvoyer `{id,status,originalName}` ; ajouter `@GetMapping("/{id}")` (statut, ou 404 si null), `@PostMapping("/{id}/retry")`, `@DeleteMapping("/{id}")`. Conserver `DELETE /files/{filename}` pour les `.vtt` (sous-titres) ou le retirer si plus utilisé (vérifier les usages frontend ; garder par sécurité).
- [ ] **Step 4 — Run → PASS.**
- [ ] **Step 5 — Commit.** `git commit -m "feat(videos): endpoints admin upload async + statut + retry + delete"`.

---

## Task 6: Migration 034 — table video + video_id + migration de l'existant

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/034-create-video.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`
- Test: la migration tourne dans la suite (H2) — couverte par tout test `@SpringBootTest`/repo.

- [ ] **Step 1 — Changeset.** Créer `034-create-video.yaml` (format identique à `032`) :
  1. `CREATE TABLE video (id VARCHAR(64) PRIMARY KEY, status VARCHAR(20) NOT NULL, source_filename VARCHAR(255), output_filename VARCHAR(255), poster_filename VARCHAR(255), duration_seconds DOUBLE PRECISION, width INT, height INT, error_message VARCHAR(500), original_name VARCHAR(255), created_at VARCHAR(40), updated_at VARCHAR(40));`
  2. `ALTER TABLE furniture ADD COLUMN video_id VARCHAR(64);`
  3. `ALTER TABLE exhibition ADD COLUMN video_id VARCHAR(64);`
  4. **Migration de données furniture** (SQL ; un `Video` READY par `video_url` non nul) :
     ```sql
     INSERT INTO video (id, status, source_filename, output_filename, poster_filename, original_name)
     SELECT 'vid-f-' || id, 'READY',
            REPLACE(video_url, '/api/videos/files/', ''),
            REPLACE(video_url, '/api/videos/files/', ''),
            NULLIF(REPLACE(video_poster, '/api/photos/files/', ''), ''),
            'migré'
     FROM furniture WHERE video_url IS NOT NULL AND video_url <> '';
     UPDATE furniture SET video_id = 'vid-f-' || id WHERE video_url IS NOT NULL AND video_url <> '';
     ```
     (idem `exhibition` avec préfixe `vid-e-`.)
  5. **Studio** : `INSERT ... SELECT` un `Video` READY depuis la clé `site_content` `studio.video.url`, puis `INSERT INTO site_content(content_key,content_value) VALUES('studio.video.id', 'vid-studio')` (id déterministe), puis `DELETE FROM site_content WHERE content_key='studio.video.url'`. (Vérifier le nom réel de la table/colonnes `site_content` dans `005-create-site-content.yaml` avant d'écrire le SQL.)
  6. `ALTER TABLE furniture DROP COLUMN video_url;` `ALTER TABLE exhibition DROP COLUMN video_url;`
  - ⚠️ Conserver `video_poster`/`video_captions` (override + sous-titres).
- [ ] **Step 2 — Enregistrer** dans `db.changelog-master.yaml` (include `034-create-video.yaml` après `033`).
- [ ] **Step 3 — Run la suite ciblée** (vérifie que le changelog passe sur H2) : `cd backend ; mvn -q -Dtest=FurnitureServiceTest test` → vert (le contexte applique tout le changelog).
- [ ] **Step 4 — Commit.** `git commit -m "feat(videos): migration table video + video_id (furniture/exhibition/studio)"`.

---

## Task 7: Entités propriétaires + résolution DTO (furniture/exhibition)

**Files:**
- Modify: `entity/FurnitureEntity.java`, `entity/ExhibitionEntity.java` (remplacer le champ `videoUrl` par `videoId`, colonne `video_id` ; garder `videoPoster`/`videoCaptions`).
- Modify: `model/Furniture.java`, `model/Exhibition.java` (ajouter `videoId` + `durationSeconds`/`width`/`height` ; `videoUrl` reste, résolu).
- Modify: `service/FurnitureService.java`, `service/ExhibitionService.java` (injecter `VideoService` ; résoudre).
- Test: `FurnitureServiceTest`, `ExhibitionServiceTest`.

- [ ] **Step 1 — Test résolution** (FurnitureServiceTest) : une fiche avec `video_id` pointant une `Video READY` → le DTO expose `videoUrl` = URL output, `durationSeconds`/`width`/`height` ; une fiche dont la `Video` est `PROCESSING`/`FAILED` → `videoUrl == null` (masquée) ; `videoPoster` override prioritaire sinon poster auto. Mock/inject `VideoService`.
- [ ] **Step 2 — Run → FAIL.**
- [ ] **Step 3 — Impl.**
  - Entités : `@Column(name="video_id") private String videoId;` (supprimer `videoUrl`). Garder `videoPoster`/`videoCaptions`.
  - Modèles : ajouter `videoId` (utilisé en écriture admin), `durationSeconds`/`width`/`height` (lecture). Garder `videoUrl`/`videoPoster`/`videoCaptions`.
  - Services `toDto(...)` : si `entity.videoId != null` → `videoService.resolveForPublic(videoId)` ; présent → `videoUrl = resolved.url()`, `videoPoster = entity.videoPoster != null ? entity.videoPoster : resolved.posterUrl()`, `durationSeconds/width/height` depuis resolved ; absent (non READY/null) → `videoUrl = null`, métadonnées nulles. `videoCaptions` inchangé.
  - Écriture (create/update) : mapper `model.videoId` → `entity.videoId` (au lieu de `videoUrl`). Le frontend admin enverra `videoId`.
- [ ] **Step 4 — Run → PASS** (`FurnitureServiceTest`, `ExhibitionServiceTest`).
- [ ] **Step 5 — Commit.** `git commit -m "feat(videos): furniture/exhibition referencent video_id + resolution DTO (READY only)"`.

---

## Task 8: Studio (SiteContent studio.video.id) — résolution

**Files:**
- Modify: `service/HomeService.java` (ou le service qui assemble le Studio à partir de `SiteContent`).
- Test: `HomeServiceTest`.

- [ ] **Step 1 — Test** : `studio.video.id` pointant une `Video READY` → la sortie Studio expose l'URL vidéo + poster + durée ; non `READY` → pas de vidéo. (Repérer dans `HomeService`/`SiteContentService` comment `studio.video.*` est lu aujourd'hui.)
- [ ] **Step 2 — Run → FAIL.**
- [ ] **Step 3 — Impl** : lire `studio.video.id`, résoudre via `videoService.resolveForPublic(...)`, exposer comme les fiches (URL/poster/durée si READY, sinon rien). `studio.video.poster`/`captions` conservés (override/sous-titres).
- [ ] **Step 4 — Run → PASS.**
- [ ] **Step 5 — Commit.** `git commit -m "feat(videos): Studio resolout studio.video.id (READY only)"`.

---

## Task 9: Frontend — model + service + video-field polling

**Files:**
- Create: `frontend/src/app/models/video.model.ts`
- Modify: `frontend/src/app/services/portfolio.service.ts`
- Modify: `frontend/src/app/pages/admin/shared/video-field.component.ts`
- Test: `video-field.component.spec.ts`, `portfolio.service.spec.ts`

- [ ] **Step 1 — Model.**

```typescript
export type VideoStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';
export interface VideoStatusDto {
  id: string; status: VideoStatus;
  url?: string | null; poster?: string | null;
  durationSeconds?: number | null; width?: number | null; height?: number | null;
  errorMessage?: string | null;
}
```

- [ ] **Step 2 — Service** (`portfolio.service.ts`) : `uploadVideo(file)` renvoie désormais `{id,status,originalName}` (POST `/api/admin/videos`) ; ajouter `getVideoStatus(id): Observable<VideoStatusDto>` (GET `/api/admin/videos/{id}`) et `retryVideo(id)` (POST `/api/admin/videos/{id}/retry`). Conserver `uploadVideo` pour les `.vtt` (sous-titres) **ou** ajouter `uploadCaptions` séparé (le `.vtt` renvoie toujours juste une URL — il ne crée pas de Video). ⚠️ Distinguer : un `.mp4/.webm` → flux Video à statut ; un `.vtt` → URL simple. Le plus clair : `uploadVideo` (mp4/webm → {id,status}) + `uploadCaptions` (vtt → {url}). Mettre à jour les usages.
- [ ] **Step 3 — Test video-field** : upload mp4 → service renvoie `PROCESSING` → composant affiche « Traitement en cours… » et polle ; passage `READY` → aperçu `<app-video-player>` + émet `videoIdChange` ; `FAILED` → message + bouton Relancer (appelle `retryVideo`). Mock `PortfolioService` (un `of(PROCESSING)` puis `of(READY)` via un sujet, ou `getVideoStatus` renvoie séquentiellement).
- [ ] **Step 4 — Run → FAIL.**
- [ ] **Step 5 — Impl video-field** : remplacer `@Input videoUrl`/`@Output videoUrlChange` par `@Input videoId`/`@Output videoIdChange`. Après `uploadVideo` → stocke `videoId`, émet, démarre un polling (`signal` + `setInterval`/`timer` RxJS, intervalle 2s, stop sur `READY`/`FAILED`, garde-fou de timeout, `clearInterval` en `ngOnDestroy`). Statut affiché : `PROCESSING` (spinner), `READY` (aperçu via une URL d'aperçu admin — utiliser `status.url`), `FAILED` (message + Relancer/Remplacer). Le poster (override médiathèque) reste géré comme avant (`videoPoster`). Les sous-titres via `uploadCaptions`.
- [ ] **Step 6 — Run → PASS.**
- [ ] **Step 7 — Commit.** `git commit -m "feat(videos): video-field polle le statut (PROCESSING/READY/FAILED) + video_id"`.

---

## Task 10: Frontend — câblage édition fiche + Studio sur video_id

**Files:**
- Modify: composants d'édition mobilier/expo (preview) + Studio qui utilisent `<app-video-field>` et envoient les champs vidéo dans le payload de sauvegarde. Test : specs associées.

- [ ] **Step 1 — Repérer** les composants liant `<app-video-field>` (`furniture-preview`, `exhibition-preview`, Studio) et leurs modèles `Furniture`/`Exhibition`/Studio (champ `videoUrl` → `videoId`).
- [ ] **Step 2 — Mettre à jour** les bindings : `[videoId]` / `(videoIdChange)` ; inclure `videoId` dans le payload create/update ; le rendu public (detail-view) **reste inchangé** (consomme `furniture.videoUrl` résolu). Mettre à jour les types TS (`Furniture`/`Exhibition` models : `videoId?`, `durationSeconds?`, etc. ; `videoUrl` reste lecture).
- [ ] **Step 3 — Tests** : les specs d'édition compilent et passent ; ajouter une assertion que le payload de sauvegarde inclut `videoId`.
- [ ] **Step 4 — Run** la suite front ciblée → vert.
- [ ] **Step 5 — Commit.** `git commit -m "feat(videos): edition fiche/studio envoie video_id"`.

---

## Task 11: ADR-0021

**Files:**
- Create: `docs/adr/0021-videos-transcodage-async.md`

- [ ] **Step 1 — Rédiger l'ADR** (format des ADR existants) : contexte (manques ADR-0019 : pas de transcodage/poster/adaptatif), décision (FFmpeg + entité `Video` à statut + pipeline `@Async` + recovery + résolution READY-only + migration de l'existant), conséquences (+ poids réduit/poster auto/métadonnées ; − CPU/temps transcodage, image plus lourde, dette HLS→SP2/GC→SP3), **mention que cet ADR supersède en partie l'ADR-0019** (le « pas de transcodage » et le « pas d'entité vidéo »). Ajouter un lien depuis l'ADR-0019 (« superseded in part by ADR-0021 »).
- [ ] **Step 2 — Commit.** `git commit -m "docs(adr): ADR-0021 videos transcodage async (supersede en partie 0019)"`.

---

## Validation finale (hors tâches TDD)
- Suite back complète (`docker compose -f docker-compose.test.yml run --rm backend-test`) + front (`frontend-test`) vertes.
- Build image backend (vérifie l'install ffmpeg) ; redeploy local `docker compose up --build -d` ; upload d'une vraie vidéo → PROCESSING → READY ; aperçu + poster auto ; fiche publique montre la vidéo seulement quand READY ; validation visuelle utilisateur.
- Audits proportionnés au scope (upload/transcodage = surface sensible → audit sécurité recommandé : injection d'args, path traversal, DoS image-bomb/timeout, taille) + RGAA léger (états du champ vidéo annoncés, `aria-live` sur « traitement en cours »). Doc : SPEC_TECHNIQUE (section vidéos) + ADR. Merge sur confirmation.
