# Vidéos SP2 — Streaming adaptatif HLS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer un HLS adaptatif (multi-rendition TS, dérivé du mp4 normalisé) à l'upload + en batch, le servir, et le lire via hls.js (fallback HLS natif Safari, fallback mp4 progressif), porté par l'entité `Video` (colonne `hls_master_filename`).

**Architecture:** Extension du pipeline SP1 : `FfmpegVideoTranscoder.generateHls` produit `{id}-hls/master.m3u8` + playlists + segments `.ts` ; `VideoService.transcode` l'appelle en **best-effort** (échec ⇒ reste `READY`). Serve des fichiers HLS imbriqués + résolution DTO `hlsUrl` (READY-only). Player `<app-video-player>` choisit natif/hls.js/mp4. Correctif SP1 inclus : redirection des process ffmpeg vers fichier temp (anti-blocage de pipe).

**Tech Stack:** Java 25 / Spring Boot 4.1, FFmpeg (HLS TS), Liquibase, Angular 21 + **hls.js**, JUnit 5 + Mockito, Karma/Jasmine.

**Référence spec :** `docs/superpowers/specs/2026-06-21-videos-sp2-hls-design.md`
**Branche :** `feat/videos-sp2-hls` (sur `main` qui contient SP1).

---

## File Structure

**Backend (modifié)**
- `service/VideoTranscoder.java` — ajout `generateHls(...)` + record `HlsOptions`/`Rendition`.
- `service/FfmpegVideoTranscoder.java` — impl `generateHls` + `buildHlsArgs` (static) + refactor `runToFile` (redirect fichier temp).
- `service/VideoService.java` — `transcode` pose `hlsMasterFilename` (best-effort) ; `generateHlsAll()` (batch) ; `delete` retire `{id}-hls/` ; `resolveForPublic` ajoute `hlsUrl` ; `getStatus`/`Video` DTO ajoute `hls`.
- `model/Video.java` — ajout `hls`.
- `entity/VideoEntity.java` — ajout `hlsMasterFilename`.
- `controller/AdminVideoController.java` — `POST /api/admin/videos/hls`.
- `controller/VideoController.java` — serve `{*filename}` + content-types m3u8/ts.
- `model/Furniture.java`/`Exhibition.java` + `service/FurnitureService`/`ExhibitionService`/`SiteContentService` — `videoHls` / `studio.video.hls`.
- Migration `036-add-hls-to-video.yaml` + master changelog.

**Frontend (modifié)**
- `package.json` — dépendance `hls.js`.
- `components/video-player/video-player.component.ts` — `hlsSrc` + logique natif/hls.js/fallback.
- `pages/admin/shared/video-field.component.ts`, detail-views, `services/portfolio.service.ts` (`generateVideoHls`), modèles TS `furniture`/`exhibition` (`videoHls`).

---

## Task 1: FfmpegVideoTranscoder — generateHls + buildHlsArgs + correctif drainage pipe

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/VideoTranscoder.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/FfmpegVideoTranscoder.java`
- Test: `backend/src/test/java/com/atelier/portfolio/service/FfmpegVideoTranscoderTest.java`

- [ ] **Step 1 — Interface : ajouter `generateHls` + records.** Dans `VideoTranscoder` :

```java
/** Genere un HLS multi-rendition (TS) dans hlsDir a partir de inputMp4. */
void generateHls(java.nio.file.Path inputMp4, java.nio.file.Path hlsDir, int sourceHeight, HlsOptions options)
        throws java.io.IOException, InterruptedException;

record HlsOptions(int hlsTimeSeconds, String preset) {}
record Rendition(int height, int videoBitrateK, int audioBitrateK) {}
```

- [ ] **Step 2 — Tests `FfmpegVideoTranscoderTest` (ajouts), puis FAIL.** Ajoute :

```java
@Test
void renditionsFor_plafonne_a_la_hauteur_source() {
    // 720p source -> 360 + 720 (pas de 1080)
    var r = FfmpegVideoTranscoder.renditionsFor(720);
    assertEquals(java.util.List.of(360, 720), r.stream().map(VideoTranscoder.Rendition::height).toList());
    // source tres petite (240) -> au moins une rendition (240)
    assertFalse(FfmpegVideoTranscoder.renditionsFor(240).isEmpty());
    // 1080p -> 360 + 720 + 1080
    assertEquals(3, FfmpegVideoTranscoder.renditionsFor(1080).size());
}

@Test
void buildHlsArgs_master_varstreammap_et_libx264() {
    var rends = java.util.List.of(new VideoTranscoder.Rendition(360, 800, 96),
                                  new VideoTranscoder.Rendition(720, 2500, 128));
    var args = FfmpegVideoTranscoder.buildHlsArgs("ffmpeg",
            java.nio.file.Path.of("in.mp4"), java.nio.file.Path.of("/up/vid-1-hls"), rends, 6, "veryfast");
    assertEquals("ffmpeg", args.get(0));
    assertTrue(args.contains("libx264"));
    assertTrue(args.stream().anyMatch(a -> a.contains("v:0,a:0")), "var_stream_map");
    assertTrue(args.stream().anyMatch(a -> a.contains("master.m3u8")));
    assertTrue(args.contains("hls"));
    assertTrue(args.stream().anyMatch(a -> a.contains("h=360")));
    assertTrue(args.stream().anyMatch(a -> a.contains("h=720")));
}
```

- [ ] **Step 3 — Run → FAIL** : `cd backend ; mvn -q -Dtest=FfmpegVideoTranscoderTest test`.

- [ ] **Step 4 — Impl dans `FfmpegVideoTranscoder`.**

```java
private static final java.util.List<VideoTranscoder.Rendition> LADDER = java.util.List.of(
        new VideoTranscoder.Rendition(360, 800, 96),
        new VideoTranscoder.Rendition(720, 2500, 128),
        new VideoTranscoder.Rendition(1080, 5000, 128));

/** Renditions de l'escalier de hauteur <= source ; au moins la plus petite si source tres petite. */
static java.util.List<VideoTranscoder.Rendition> renditionsFor(int sourceHeight) {
    var kept = LADDER.stream().filter(r -> r.height() <= sourceHeight).toList();
    return kept.isEmpty() ? java.util.List.of(LADDER.get(0)) : kept;
}

static java.util.List<String> buildHlsArgs(String ffmpeg, java.nio.file.Path in, java.nio.file.Path hlsDir,
        java.util.List<VideoTranscoder.Rendition> rends, int hlsTime, String preset) {
    java.util.List<String> a = new java.util.ArrayList<>();
    a.add(ffmpeg); a.add("-y"); a.add("-i"); a.add(in.toString());
    // filter_complex : split en N puis scale par rendition (largeur auto paire -2)
    StringBuilder fc = new StringBuilder("[0:v]split=").append(rends.size());
    for (int i = 0; i < rends.size(); i++) fc.append("[v").append(i).append("]");
    fc.append(";");
    for (int i = 0; i < rends.size(); i++) {
        fc.append("[v").append(i).append("]scale=w=-2:h=").append(rends.get(i).height())
          .append("[v").append(i).append("out]");
        if (i < rends.size() - 1) fc.append(";");
    }
    a.add("-filter_complex"); a.add(fc.toString());
    for (int i = 0; i < rends.size(); i++) {
        var r = rends.get(i);
        a.add("-map"); a.add("[v" + i + "out]");
        a.add("-c:v:" + i); a.add("libx264");
        a.add("-preset"); a.add(preset);
        a.add("-b:v:" + i); a.add(r.videoBitrateK() + "k");
        a.add("-maxrate:v:" + i); a.add((int)(r.videoBitrateK() * 1.07) + "k");
        a.add("-bufsize:v:" + i); a.add((r.videoBitrateK() * 2) + "k");
        a.add("-g"); a.add("48"); a.add("-keyint_min"); a.add("48"); a.add("-sc_threshold"); a.add("0");
        a.add("-map"); a.add("a:0?");
        a.add("-c:a:" + i); a.add("aac");
        a.add("-b:a:" + i); a.add(r.audioBitrateK() + "k");
    }
    StringBuilder vsm = new StringBuilder();
    for (int i = 0; i < rends.size(); i++) { if (i > 0) vsm.append(" "); vsm.append("v:").append(i).append(",a:").append(i); }
    a.add("-var_stream_map"); a.add(vsm.toString());
    a.add("-master_pl_name"); a.add("master.m3u8");
    a.add("-f"); a.add("hls");
    a.add("-hls_time"); a.add(String.valueOf(hlsTime));
    a.add("-hls_playlist_type"); a.add("vod");
    a.add("-hls_segment_filename"); a.add(hlsDir.resolve("%v_%03d.ts").toString());
    a.add(hlsDir.resolve("%v.m3u8").toString());
    return a;
}

@Override
public void generateHls(java.nio.file.Path inputMp4, java.nio.file.Path hlsDir, int sourceHeight, HlsOptions o)
        throws IOException, InterruptedException {
    Files.createDirectories(hlsDir);
    runToFile(buildHlsArgs(ffmpeg, inputMp4, hlsDir, renditionsFor(sourceHeight), o.hlsTimeSeconds(), o.preset()),
              1800);  // timeout genereux (30 min) pour le multi-rendition
}
```

- [ ] **Step 5 — Refactor process running → `runToFile` (correctif drainage pipe SP1).** Remplace `runVoid` et adapte `runCapture` pour rediriger la sortie vers un fichier temp (évite le blocage de pipe sur sortie volumineuse) :

```java
import java.nio.charset.StandardCharsets;

/** Lance un process (stdout+stderr -> fichier temp, evite tout blocage de pipe),
 *  timeout + kill. Leve si exit != 0 (avec un extrait plafonne du diagnostic). */
private void runToFile(java.util.List<String> args, int timeoutSeconds) throws IOException, InterruptedException {
    java.nio.file.Path log = Files.createTempFile("ff", ".log");
    try {
        Process p = new ProcessBuilder(args).redirectErrorStream(true).redirectOutput(log.toFile()).start();
        if (!p.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
            p.destroyForcibly();
            throw new IOException("Timeout (" + timeoutSeconds + "s) : " + args.get(0));
        }
        if (p.exitValue() != 0) {
            byte[] tail; long size = Files.size(log); long from = Math.max(0, size - 4096);
            try (var ch = java.nio.channels.FileChannel.open(log)) {
                ch.position(from);
                var buf = java.nio.ByteBuffer.allocate((int) Math.min(4096, size));
                while (buf.hasRemaining() && ch.read(buf) > 0) { /* fill */ }
                tail = java.util.Arrays.copyOf(buf.array(), buf.position());
            }
            throw new IOException(args.get(0) + " a echoue (code " + p.exitValue() + ") : " + new String(tail, StandardCharsets.UTF_8));
        }
    } finally {
        Files.deleteIfExists(log);
    }
}
```

Adapte `transcode(...)` (mp4 + poster) pour utiliser `runToFile` au lieu de `runVoid`. Pour `runCapture` (ffprobe, doit récupérer le JSON), réécris-le aussi en redirigeant vers un fichier temp puis en lisant le fichier (cap 1 Mo) :

```java
private String runCapture(java.util.List<String> args, int timeoutSeconds) throws IOException, InterruptedException {
    java.nio.file.Path out = Files.createTempFile("ffprobe", ".json");
    try {
        Process p = new ProcessBuilder(args).redirectErrorStream(true).redirectOutput(out.toFile()).start();
        if (!p.waitFor(timeoutSeconds, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new IOException("Timeout ffprobe"); }
        if (p.exitValue() != 0) throw new IOException("ffprobe a echoue (code " + p.exitValue() + ")");
        try (var in = Files.newInputStream(out)) { return new String(in.readNBytes(1_048_576), StandardCharsets.UTF_8); }
    } finally {
        Files.deleteIfExists(out);
    }
}
```

Supprime l'ancien `runVoid` (remplacé par `runToFile`). Vérifie les imports (`Files` déjà via `java.nio.file`? sinon ajoute `import java.nio.file.Files;`).

- [ ] **Step 6 — Run → PASS** : `mvn -q -Dtest=FfmpegVideoTranscoderTest test`.
- [ ] **Step 7 — Commit** : `feat(videos): FfmpegVideoTranscoder.generateHls (TS multi-rendition) + drainage pipe via fichier temp`.

---

## Task 2: Entité Video `hls_master_filename` + migration 036

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/entity/VideoEntity.java`
- Create: `backend/src/main/resources/db/changelog/changes/036-add-hls-to-video.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

- [ ] **Step 1 — Entité** : ajoute le champ + getter/setter :

```java
@Column(name = "hls_master_filename", length = 255)
private String hlsMasterFilename;
// getHlsMasterFilename / setHlsMasterFilename
```

- [ ] **Step 2 — Migration 036** (format des migrations existantes, cf. `034-create-video.yaml`) :

```yaml
databaseChangeLog:
  - changeSet:
      id: 036-add-hls-to-video
      author: milo-guillaume
      changes:
        - sql:
            sql: ALTER TABLE video ADD COLUMN hls_master_filename VARCHAR(255);
```

- [ ] **Step 3 — Enregistrer** dans `db.changelog-master.yaml` (include après `035-...`).
- [ ] **Step 4 — Suite back** (changelog appliqué) : `docker compose -f docker-compose.test.yml run --rm backend-test` → BUILD SUCCESS (la colonne mappée existe).
- [ ] **Step 5 — Commit** : `feat(videos): colonne hls_master_filename sur video (migration 036)`.

---

## Task 3: VideoService — HLS best-effort + batch + delete dossier + resolveForPublic

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/VideoService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/Video.java`
- Test: `backend/src/test/java/com/atelier/portfolio/service/VideoServiceTest.java`

- [ ] **Step 1 — DTO `Video`** : ajoute un composant `String hls` (après `poster`). Mets à jour tous les `new Video(...)`.

- [ ] **Step 2 — Tests `VideoServiceTest` (ajouts), puis FAIL.** Couvre (transcoder mocké) :
  1. `transcode` succès → `transcoder.generateHls(...)` appelé, entité a `hlsMasterFilename = id+"-hls/master.m3u8"`, statut READY.
  2. `generateHls` lève → la vidéo reste **READY** avec `hlsMasterFilename == null` (best-effort ; vérifie qu'aucune exception ne remonte et que le mp4/poster sont bien posés).
  3. `resolveForPublic` d'une vidéo READY avec hlsMaster → `ResolvedVideo.hlsUrl()` = `/api/videos/files/{id}-hls/master.m3u8` ; sans hlsMaster → `hlsUrl()` null.
  4. `generateHlsAll()` : une vidéo READY sans hlsMaster + mp4 présent → `generateHls` appelé, hlsMaster posé ; idempotent (déjà posé → skip). Renvoie `VideoHlsReport(count, generated)`.

- [ ] **Step 3 — Run → FAIL.**

- [ ] **Step 4 — Impl.**
  - `transcode(id)` : après le bloc mp4+poster (avant `READY`/suppression source ; ou après READY peu importe — mais avant de set READY pour grouper), tente :
    ```java
    try {
        java.nio.file.Path hlsDir = dir.resolve(id + "-hls");
        transcoder.generateHls(dir.resolve(outputFilename), hlsDir, meta.height(),
                new VideoTranscoder.HlsOptions(6, "veryfast"));
        entity.setHlsMasterFilename(id + "-hls/master.m3u8");
    } catch (Exception hlsErr) {
        // best-effort : le mp4 progressif reste le fallback
    }
    ```
    (placé après le transcode mp4 réussi, en utilisant `meta.height()` de la probe ; ne change rien au passage READY ni à la suppression de la source.)
  - `getStatus`/`toDto` : `hls = (status==READY && hlsMasterFilename!=null) ? baseUrl+"/"+hlsMasterFilename : null` → passé au `Video` DTO.
  - `ResolvedVideo` : ajoute `String hlsUrl` (record) ; `resolveForPublic` le calcule (`baseUrl+"/"+hlsMasterFilename` si READY+présent, sinon null). Mets à jour les usages (FurnitureService/ExhibitionService/SiteContentService en Task 6).
  - `record VideoHlsReport(int count, int generated) {}` + `generateHlsAll()` : `repository.findByStatus(READY)` → pour chaque sans `hlsMasterFilename` et dont `outputFilename` existe sur disque : probe la hauteur (ou relire via ffprobe sur le mp4) → `generateHls` → set hlsMaster + save + generated++. (Pour la hauteur : si `width`/`height` de l'entité sont présents, réutilise `entity.getHeight()` ; sinon `transcoder.probe(mp4).height()`.) Idempotent.
  - `delete(id)` : après suppression mp4/poster/source, supprime récursivement le dossier `{id}-hls/` (best-effort) : un helper `deleteDirRecursive(dir.resolve(id+"-hls"))` (walk + delete, ignore erreurs).

- [ ] **Step 5 — Run → PASS** (`mvn -q -Dtest=VideoServiceTest test`).
- [ ] **Step 6 — Commit** : `feat(videos): HLS best-effort dans transcode + generateHlsAll + delete dossier HLS + resolveForPublic hlsUrl`.

---

## Task 4: AdminVideoController — POST /api/admin/videos/hls (batch)

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminVideoController.java`
- Test: `backend/src/test/java/com/atelier/portfolio/controller/AdminVideoControllerTest.java`

- [ ] **Step 1 — Test** : `POST /hls` → `service.generateHlsAll()` renvoie `VideoHlsReport(3,2)` → 200 body `{count:3, generated:2}`. (Mock service.)
- [ ] **Step 2 — Run → FAIL.**
- [ ] **Step 3 — Impl** : `@PostMapping("/hls") public ResponseEntity<?> generateHls() { var r = service.generateHlsAll(); return ResponseEntity.ok(Map.of("count", r.count(), "generated", r.generated())); }`.
- [ ] **Step 4 — Run → PASS.**
- [ ] **Step 5 — Commit** : `feat(videos): endpoint batch POST /api/admin/videos/hls`.

---

## Task 5: VideoController — serve HLS imbriqué + content-types

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/VideoController.java`
- Test: `backend/src/test/java/com/atelier/portfolio/controller/VideoControllerTest.java` (créer s'il n'existe pas)

- [ ] **Step 1 — Test** (Mockito `@Mock VideoService`) : `contentTypeFor("vid-1-hls/master.m3u8")` → `application/vnd.apple.mpegurl` ; `contentTypeFor("vid-1-hls/0_000.ts")` → `video/mp2t` ; le mapping accepte un filename **imbriqué** (avec `/`). Si `contentTypeFor` est privé, teste via `serve(...)` avec un `Resource` mocké et vérifie le `Content-Type`. Vérifie aussi qu'un `.mp4` reste `video/mp4` + 206 sur Range.
- [ ] **Step 2 — Run → FAIL.**
- [ ] **Step 3 — Impl** :
  - Change le mapping `@GetMapping("/files/{filename:.+}")` → `@GetMapping("/files/{*filename}")` (PathPattern capture les `/` ; le `filename` commencera par `/` avec `{*...}` → strip le `/` initial : `if (filename.startsWith("/")) filename = filename.substring(1);`).
  - `contentTypeFor` : ajoute `case "m3u8" -> application/vnd.apple.mpegurl` (`MediaType.parseMediaType("application/vnd.apple.mpegurl")`), `case "ts" -> video/mp2t`. (Extension = après le dernier `.`, déjà géré.)
  - Le reste (Range/206, cache immuable, `loadAsResource` qui garde `startsWith(uploadPath)`) inchangé — la garde path-traversal couvre les chemins imbriqués `{id}-hls/...`.
- [ ] **Step 4 — Run → PASS** + suite back complète (`docker compose -f docker-compose.test.yml run --rm backend-test`).
- [ ] **Step 5 — Commit** : `feat(videos): serve HLS imbrique ({*filename}) + content-types m3u8/ts`.

---

## Task 6: DTO publics — videoHls (fiches) + studio.video.hls

**Files:**
- Modify: `model/Furniture.java`, `model/Exhibition.java`, `service/FurnitureService.java`, `service/ExhibitionService.java`, `service/SiteContentService.java` + tests associés.

- [ ] **Step 1 — Tests** : fiche/Studio avec `Video READY + hlsMaster` → DTO expose `videoHls` (= URL master.m3u8) ; sans hlsMaster → `videoHls` null. (Mock `resolveForPublic` renvoyant un `ResolvedVideo` avec `hlsUrl`.)
- [ ] **Step 2 — Run → FAIL.**
- [ ] **Step 3 — Impl** :
  - `Furniture`/`Exhibition` records : ajoute `@Size(max=500) String videoHls` (lecture). Mets à jour tous les `new Furniture(...)`/`new Exhibition(...)` (services + tests).
  - `FurnitureService`/`ExhibitionService.toDto` : `videoHls = resolved.map(ResolvedVideo::hlsUrl).orElse(null)`.
  - `SiteContentService` : quand `studio.video.id` est READY, injecte aussi `studio.video.hls` = `resolved.hlsUrl()` (si non null), à côté de `studio.video.url`.
- [ ] **Step 4 — Run → PASS** + suite back complète.
- [ ] **Step 5 — Commit** : `feat(videos): DTO videoHls (fiches) + studio.video.hls`.

---

## Task 7: Frontend — hls.js + player + câblage

**Files:**
- Modify: `frontend/package.json` (+ `package-lock.json` via `npm install`).
- Modify: `frontend/src/app/components/video-player/video-player.component.ts` (+ `.spec.ts`).
- Modify: `frontend/src/app/services/portfolio.service.ts` (`generateVideoHls`), `models/furniture.model.ts`/`exhibition.model.ts` (`videoHls?`), `pages/admin/shared/video-field.component.ts`, detail-views (furniture/exhibition), Studio (textes) — passer `hlsSrc`.

- [ ] **Step 1 — Dépendance** : `cd frontend ; npm install hls.js` (ajoute à `dependencies`). Vérifie la version installée.

- [ ] **Step 2 — Test `video-player.component.spec.ts`** (puis FAIL) : 
  - avec `hlsSrc` et `canPlayType` simulant le support natif → `video.src`/`<source>` pointe le m3u8 (pas d'instanciation Hls).
  - avec `hlsSrc`, sans support natif, `Hls.isSupported()` true (mock) → `Hls` instancié + `loadSource(hlsSrc)` + `attachMedia`.
  - sans `hlsSrc` → mp4 (`src`) comme avant.
  Mock `hls.js` (jasmine spy sur le module, ou injecte une fabrique). Si mocker l'import est trop lourd, teste au minimum la **sélection de stratégie** via une méthode pure `chooseStrategy(hlsSrc, hasNative, hlsSupported): 'native'|'hlsjs'|'mp4'` extraite et testée unitairement.

- [ ] **Step 3 — Run → FAIL.**

- [ ] **Step 4 — Impl `video-player.component.ts`.** Passe de pur template à composant avec logique :

```typescript
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import Hls from 'hls.js';

@Component({
  selector: 'app-video-player',
  standalone: true,
  template: `
    <video #video class="vp-video" controls [attr.aria-label]="label"
           [poster]="poster || null" [attr.preload]="poster ? 'none' : 'metadata'">
      @if (!hlsSrc) { <source [attr.src]="src" [attr.type]="mimeType()" /> }
      @if (captions) { <track kind="captions" [attr.src]="captions" srclang="fr" label="Français" default /> }
    </video>
  `,
  styles: [`.vp-video { display: block; width: 100%; max-height: 80vh; background: #000; }`],
})
export class VideoPlayerComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) src = '';
  @Input() hlsSrc: string | null = null;
  @Input() poster: string | null = null;
  @Input() captions: string | null = null;
  @Input() label = 'Vidéo';
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  private hls?: Hls;

  protected mimeType(): string { return this.src.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4'; }

  /** Strategie de lecture (pure, testable). */
  static chooseStrategy(hlsSrc: string | null, hasNativeHls: boolean, hlsSupported: boolean): 'native'|'hlsjs'|'mp4' {
    if (!hlsSrc) return 'mp4';
    if (hasNativeHls) return 'native';
    if (hlsSupported) return 'hlsjs';
    return 'mp4';
  }

  ngAfterViewInit(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    const native = video.canPlayType('application/vnd.apple.mpegurl') !== '';
    const strat = VideoPlayerComponent.chooseStrategy(this.hlsSrc, native, Hls.isSupported());
    if (strat === 'native') {
      video.src = this.hlsSrc!;
    } else if (strat === 'hlsjs') {
      this.hls = new Hls();
      this.hls.loadSource(this.hlsSrc!);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) { this.destroyHls(); video.src = this.src; }  // fallback mp4
      });
    } // 'mp4' : le <source> du template gere
  }

  ngOnDestroy(): void { this.destroyHls(); }
  private destroyHls(): void { if (this.hls) { this.hls.destroy(); this.hls = undefined; } }
}
```

- [ ] **Step 5 — Run → PASS** (`docker compose -f docker-compose.test.yml run --rm frontend-test` ou ng test ciblé si navigateur dispo).

- [ ] **Step 6 — Service + modèles + câblage.**
  - `portfolio.service.ts` : `generateVideoHls()` → POST `/api/admin/videos/hls` → `Observable<{count:number;generated:number}>`.
  - `models/furniture.model.ts`/`exhibition.model.ts` : ajoute `videoHls?: string | null`.
  - Là où `<app-video-player>` est utilisé en lecture (detail-views furniture/exhibition, Studio public) : passe `[hlsSrc]="...videoHls..."` à côté de `[src]="...videoUrl..."`. Pour le Studio, lis `studio.video.hls`. Pour `<app-video-field>` (admin, aperçu READY) : passe `[hlsSrc]` depuis le statut (`status.url` reste le mp4 ; ajoute la lecture du champ hls du DTO statut si exposé — sinon l'aperçu admin peut rester en mp4, c'est acceptable ; documente le choix).
  - Mets à jour les specs impactées (constructeurs de modèles, bindings).

- [ ] **Step 7 — Suite front complète** : `docker compose -f docker-compose.test.yml run --rm frontend-test` → SUCCESS.
- [ ] **Step 8 — Commit** : `feat(videos): hls.js + <app-video-player> adaptatif (natif/hls.js/fallback mp4) + cablage`.

---

## Validation finale (hors tâches TDD)
- Suites back + front vertes.
- Rebuild + redeploy ; **lancer le batch HLS** (`POST /api/admin/videos/hls`) sur l'existant ; uploader une nouvelle vidéo → vérifier `{id}-hls/master.m3u8` généré, lecture adaptative (DevTools → requêtes `.m3u8`/`.ts`) sur Chrome (hls.js) ; fallback mp4 si HLS absent ; validation visuelle utilisateur.
- Mettre à jour ADR-0021 (ou note) + SPEC_TECHNIQUE §4.10 (HLS) ; audits proportionnés (sécurité : le serve `{*filename}` + génération HLS ; RGAA : player inchangé côté contrôles). Merge sur confirmation.
