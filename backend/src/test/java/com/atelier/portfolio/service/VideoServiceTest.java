package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.FurnitureEntity;
import com.atelier.portfolio.entity.SiteContentEntity;
import com.atelier.portfolio.entity.VideoEntity;
import com.atelier.portfolio.entity.VideoStatus;
import com.atelier.portfolio.model.Video;
import com.atelier.portfolio.model.VideoSummary;
import com.atelier.portfolio.repository.ExhibitionRepository;
import com.atelier.portfolio.repository.FurnitureRepository;
import com.atelier.portfolio.repository.SiteContentRepository;
import com.atelier.portfolio.repository.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VideoServiceTest {

    @TempDir
    Path tmp;

    @Mock
    VideoRepository repository;

    @Mock
    VideoTranscoder transcoder;

    @Mock
    FurnitureRepository furnitureRepository;

    @Mock
    ExhibitionRepository exhibitionRepository;

    @Mock
    SiteContentRepository siteContentRepository;

    VideoService service;

    @BeforeEach
    void setUp() {
        service = new VideoService(repository, transcoder, furnitureRepository, exhibitionRepository, siteContentRepository);
        ReflectionTestUtils.setField(service, "uploadDir", tmp.toString());
        ReflectionTestUtils.setField(service, "baseUrl", "/api/videos/files");
        ReflectionTestUtils.setField(service, "maxHeight", 1080);
        ReflectionTestUtils.setField(service, "crf", 23);
        ReflectionTestUtils.setField(service, "preset", "medium");
        ReflectionTestUtils.setField(service, "timeoutSeconds", 600);
        ReflectionTestUtils.setField(service, "posterOffsetSeconds", 1);

        // repository.save renvoie l'entite telle quelle par defaut
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    // -----------------------------------------------------------------------
    // 1. store(.mp4) : fichier source sur disque, entite UPLOADED, id non nul
    // -----------------------------------------------------------------------

    @Test
    void store_mp4_createsSourceFileAndSavesUploadedEntity() throws IOException {
        byte[] content = "fake-mp4-content".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "ma-video.mp4", "video/mp4", content);

        VideoService.StoredVideo result = service.store(file);

        // L'id doit etre non nul et prefixe vid-
        assertNotNull(result.id());
        assertTrue(result.id().startsWith("vid-"));

        // Statut UPLOADED
        assertEquals("UPLOADED", result.status());

        // Le fichier source existe bien sur disque
        String sourceFilename = result.filename();
        assertTrue(Files.exists(tmp.resolve(sourceFilename)),
                "Le fichier source devrait etre ecrit sur disque");

        // save() appele avec une entite UPLOADED
        ArgumentCaptor<VideoEntity> captor = ArgumentCaptor.forClass(VideoEntity.class);
        verify(repository).save(captor.capture());
        VideoEntity saved = captor.getValue();
        assertEquals(VideoStatus.UPLOADED, saved.getStatus());
        assertEquals(result.id(), saved.getId());
        assertNotNull(saved.getCreatedAt());
    }

    @Test
    void storeCaptions_vtt_storesFileWithoutVideoEntity() throws IOException {
        byte[] content = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "sous-titres.vtt", "text/vtt", content);

        VideoService.StoredVideo result = service.storeCaptions(file);

        assertNotNull(result.url());
        assertTrue(result.url().endsWith(".vtt"));
        // Pas d'entite Video creee
        verify(repository, never()).save(any());
    }

    @Test
    void store_unknownExtension_throwsIllegalArgument() {
        MockMultipartFile file = new MockMultipartFile("file", "virus.exe", "application/octet-stream",
                "bad".getBytes());
        assertThrows(IllegalArgumentException.class, () -> service.store(file));
    }

    // Compatibilite : store(.vtt) via store() renvoie url/filename comme avant
    @Test
    void store_vtt_viaBehaviourCompat_renvoieUrl() throws IOException {
        byte[] content = "WEBVTT".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "subs.vtt", "text/vtt", content);

        VideoService.StoredVideo result = service.store(file);

        assertNotNull(result.url());
        assertTrue(result.filename().endsWith(".vtt"));
        verify(repository, never()).save(any());
    }

    // -----------------------------------------------------------------------
    // 2. transcode -> READY (ffmpeg disponible, transcode ok)
    // -----------------------------------------------------------------------

    @Test
    void transcode_ffmpegAvailable_setsReadyWithMetadata() throws Exception {
        String id = "vid-abcd1234";
        VideoEntity entity = uploadedEntity(id, "vid-abcd1234-src.mp4");
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(transcoder.isAvailable()).thenReturn(true);
        when(transcoder.probe(any())).thenReturn(new VideoTranscoder.VideoMeta(12.5, 1920, 1080));

        // Cree le fichier source factice
        Files.writeString(tmp.resolve(entity.getSourceFilename()), "fake");

        service.transcode(id);

        ArgumentCaptor<VideoEntity> captor = ArgumentCaptor.forClass(VideoEntity.class);
        // save est appele au moins 2 fois : PROCESSING puis READY
        verify(repository, atLeast(2)).save(captor.capture());

        VideoEntity finalSave = captor.getAllValues().stream()
                .filter(e -> e.getStatus() == VideoStatus.READY)
                .findFirst()
                .orElseThrow(() -> new AssertionError("Aucun save avec status READY"));

        assertEquals(VideoStatus.READY, finalSave.getStatus());
        assertNotNull(finalSave.getOutputFilename());
        assertTrue(finalSave.getOutputFilename().endsWith(".mp4"));
        assertNotNull(finalSave.getPosterFilename());
        assertEquals(12.5, finalSave.getDurationSeconds());
        assertEquals(1920, finalSave.getWidth());
        assertEquals(1080, finalSave.getHeight());

        // transcoder.transcode appele
        verify(transcoder).transcode(any(), any(), any(), any());

        // Fichier source supprime
        assertFalse(Files.exists(tmp.resolve(entity.getSourceFilename())),
                "Le fichier source doit etre supprime apres transcodage reussi");
    }

    // -----------------------------------------------------------------------
    // 3. transcode -> FAILED (IOException pendant ffmpeg)
    // -----------------------------------------------------------------------

    @Test
    void transcode_ffmpegThrows_setsFailedAndKeepsSource() throws Exception {
        String id = "vid-fail1234";
        VideoEntity entity = uploadedEntity(id, "vid-fail1234-src.mp4");
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(transcoder.isAvailable()).thenReturn(true);
        when(transcoder.probe(any())).thenReturn(new VideoTranscoder.VideoMeta(5.0, 640, 480));
        doThrow(new IOException("ffmpeg error")).when(transcoder).transcode(any(), any(), any(), any());

        // Cree le fichier source factice
        Files.writeString(tmp.resolve(entity.getSourceFilename()), "fake");

        service.transcode(id);

        ArgumentCaptor<VideoEntity> captor = ArgumentCaptor.forClass(VideoEntity.class);
        verify(repository, atLeast(1)).save(captor.capture());

        VideoEntity failedSave = captor.getAllValues().stream()
                .filter(e -> e.getStatus() == VideoStatus.FAILED)
                .findFirst()
                .orElseThrow(() -> new AssertionError("Aucun save avec status FAILED"));

        assertEquals(VideoStatus.FAILED, failedSave.getStatus());
        assertNotNull(failedSave.getErrorMessage());
        assertFalse(failedSave.getErrorMessage().isBlank());

        // Source conservee
        assertTrue(Files.exists(tmp.resolve(entity.getSourceFilename())),
                "Le fichier source doit etre conserve en cas d'echec");
    }

    // -----------------------------------------------------------------------
    // 4. degradation : ffmpeg indisponible -> READY avec source brute
    // -----------------------------------------------------------------------

    @Test
    void transcode_ffmpegUnavailable_setsReadyWithSourceFilename() throws Exception {
        String id = "vid-degraded1";
        VideoEntity entity = uploadedEntity(id, "vid-degraded1-src.mp4");
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(transcoder.isAvailable()).thenReturn(false);

        Files.writeString(tmp.resolve(entity.getSourceFilename()), "fake");

        service.transcode(id);

        ArgumentCaptor<VideoEntity> captor = ArgumentCaptor.forClass(VideoEntity.class);
        verify(repository).save(captor.capture());
        VideoEntity saved = captor.getValue();

        assertEquals(VideoStatus.READY, saved.getStatus());
        assertEquals(entity.getSourceFilename(), saved.getOutputFilename());

        // probe et transcode pas appeles
        verify(transcoder, never()).probe(any());
        verify(transcoder, never()).transcode(any(), any(), any(), any());
    }

    // -----------------------------------------------------------------------
    // 5. getStatus : mappe en DTO Video
    // -----------------------------------------------------------------------

    @Test
    void getStatus_readyEntity_returnsVideoDtoWithUrl() {
        String id = "vid-ready001";
        VideoEntity entity = readyEntity(id, "vid-ready001.mp4", "vid-ready001-poster.jpg");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        Video dto = service.getStatus(id);

        assertNotNull(dto);
        assertEquals(id, dto.id());
        assertEquals("READY", dto.status());
        assertNotNull(dto.url());
        assertTrue(dto.url().contains("vid-ready001.mp4"));
        assertNotNull(dto.poster());
        assertTrue(dto.poster().contains("vid-ready001-poster.jpg"));
        assertEquals(10.0, dto.durationSeconds());
        assertEquals(1280, dto.width());
        assertEquals(720, dto.height());
    }

    @Test
    void getStatus_processingEntity_urlIsNull() {
        String id = "vid-proc001";
        VideoEntity entity = new VideoEntity();
        entity.setId(id);
        entity.setStatus(VideoStatus.PROCESSING);
        entity.setSourceFilename("vid-proc001-src.mp4");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        Video dto = service.getStatus(id);

        assertNotNull(dto);
        assertEquals("PROCESSING", dto.status());
        assertNull(dto.url());
        assertNull(dto.poster());
    }

    @Test
    void getStatus_notFound_returnsNull() {
        when(repository.findById("unknown")).thenReturn(Optional.empty());

        Video dto = service.getStatus("unknown");

        assertNull(dto);
    }

    // -----------------------------------------------------------------------
    // 6. resolveForPublic
    // -----------------------------------------------------------------------

    @Test
    void resolveForPublic_readyEntity_returnsPresent() {
        String id = "vid-pub001";
        VideoEntity entity = readyEntity(id, "vid-pub001.mp4", "vid-pub001-poster.jpg");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        var result = service.resolveForPublic(id);

        assertTrue(result.isPresent());
        VideoService.ResolvedVideo rv = result.get();
        assertNotNull(rv.url());
        assertTrue(rv.url().contains("vid-pub001.mp4"));
        assertNotNull(rv.posterUrl());
        assertEquals(10.0, rv.durationSeconds());
        assertEquals(1280, rv.width());
        assertEquals(720, rv.height());
    }

    @Test
    void resolveForPublic_processingEntity_returnsEmpty() {
        String id = "vid-pub002";
        VideoEntity entity = new VideoEntity();
        entity.setId(id);
        entity.setStatus(VideoStatus.PROCESSING);
        entity.setSourceFilename("vid-pub002-src.mp4");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        var result = service.resolveForPublic(id);

        assertTrue(result.isEmpty());
    }

    @Test
    void resolveForPublic_unknownId_returnsEmpty() {
        when(repository.findById("nope")).thenReturn(Optional.empty());

        var result = service.resolveForPublic("nope");

        assertTrue(result.isEmpty());
    }

    // -----------------------------------------------------------------------
    // 7. recoverStaleProcessing
    // -----------------------------------------------------------------------

    @Test
    void recoverStaleProcessing_setsStalesToFailed() {
        String id = "vid-stale1";
        VideoEntity stale = new VideoEntity();
        stale.setId(id);
        stale.setStatus(VideoStatus.PROCESSING);
        stale.setSourceFilename("vid-stale1-src.mp4");

        when(repository.findByStatus(VideoStatus.PROCESSING)).thenReturn(List.of(stale));

        service.recoverStaleProcessing();

        ArgumentCaptor<VideoEntity> captor = ArgumentCaptor.forClass(VideoEntity.class);
        verify(repository).save(captor.capture());
        VideoEntity saved = captor.getValue();
        assertEquals(VideoStatus.FAILED, saved.getStatus());
        assertNotNull(saved.getErrorMessage());
        assertFalse(saved.getErrorMessage().isBlank());
    }

    // -----------------------------------------------------------------------
    // 8. retry
    // -----------------------------------------------------------------------

    @Test
    void retry_failedEntityWithSourceOnDisk_returnsTrue() throws Exception {
        String id = "vid-retry001";
        VideoEntity entity = new VideoEntity();
        entity.setId(id);
        entity.setStatus(VideoStatus.FAILED);
        entity.setSourceFilename("vid-retry001-src.mp4");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        // Cree le fichier source factice
        Files.writeString(tmp.resolve(entity.getSourceFilename()), "fake");

        boolean result = service.retry(id);

        assertTrue(result);
    }

    @Test
    void retry_failedEntityWithoutSource_returnsFalse() {
        String id = "vid-retry002";
        VideoEntity entity = new VideoEntity();
        entity.setId(id);
        entity.setStatus(VideoStatus.FAILED);
        entity.setSourceFilename("vid-retry002-src.mp4");
        // pas de fichier sur disque
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        boolean result = service.retry(id);

        assertFalse(result);
    }

    @Test
    void retry_readyEntity_returnsFalse() {
        String id = "vid-retry003";
        VideoEntity entity = readyEntity(id, "vid-retry003.mp4", null);
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        boolean result = service.retry(id);

        assertFalse(result);
    }

    // -----------------------------------------------------------------------
    // loadAsResource : garde-fous path-traversal (conserves de l'ancienne impl)
    // -----------------------------------------------------------------------

    @Test
    void loadAsResource_blocksPathTraversal() throws Exception {
        assertNull(service.loadAsResource("../../etc/passwd"));
    }

    @Test
    void loadAsResource_returnsNullForMissingFile() throws Exception {
        assertNull(service.loadAsResource("inexistant.mp4"));
    }

    // -----------------------------------------------------------------------
    // HLS — Step 3 (Tache 3)
    // -----------------------------------------------------------------------

    /**
     * HLS-1 : transcode reussi → generateHls appele ; hlsMasterFilename = id+"-hls/master.m3u8" ; READY.
     */
    @Test
    void transcode_ffmpegAvailable_generateHlsCalled_hlsMasterFilenameSet() throws Exception {
        String id = "vid-hls0001";
        VideoEntity entity = uploadedEntity(id, id + "-src.mp4");
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(transcoder.isAvailable()).thenReturn(true);
        when(transcoder.probe(any())).thenReturn(new VideoTranscoder.VideoMeta(10.0, 1920, 1080));

        Files.writeString(tmp.resolve(entity.getSourceFilename()), "fake");

        service.transcode(id);

        verify(transcoder).generateHls(any(), any(), eq(1080), any());

        ArgumentCaptor<VideoEntity> captor = ArgumentCaptor.forClass(VideoEntity.class);
        verify(repository, atLeast(2)).save(captor.capture());

        VideoEntity readySave = captor.getAllValues().stream()
                .filter(e -> e.getStatus() == VideoStatus.READY)
                .findFirst()
                .orElseThrow(() -> new AssertionError("Aucun save READY"));

        assertEquals(id + "-hls/master.m3u8", readySave.getHlsMasterFilename());
        assertEquals(VideoStatus.READY, readySave.getStatus());
    }

    /**
     * HLS-2 : generateHls leve une exception → video reste READY, hlsMasterFilename null (best-effort).
     */
    @Test
    void transcode_generateHlsThrows_videoStillReady_hlsMasterNull() throws Exception {
        String id = "vid-hls0002";
        VideoEntity entity = uploadedEntity(id, id + "-src.mp4");
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(transcoder.isAvailable()).thenReturn(true);
        when(transcoder.probe(any())).thenReturn(new VideoTranscoder.VideoMeta(10.0, 1920, 1080));
        doThrow(new IOException("hls error")).when(transcoder).generateHls(any(), any(), anyInt(), any());

        Files.writeString(tmp.resolve(entity.getSourceFilename()), "fake");

        service.transcode(id);

        ArgumentCaptor<VideoEntity> captor = ArgumentCaptor.forClass(VideoEntity.class);
        verify(repository, atLeast(2)).save(captor.capture());

        VideoEntity readySave = captor.getAllValues().stream()
                .filter(e -> e.getStatus() == VideoStatus.READY)
                .findFirst()
                .orElseThrow(() -> new AssertionError("Aucun save READY — la video doit rester READY meme si HLS echoue"));

        assertEquals(VideoStatus.READY, readySave.getStatus());
        assertNull(readySave.getHlsMasterFilename());
    }

    /**
     * HLS-3 : resolveForPublic, video READY avec hlsMaster → hlsUrl non null.
     */
    @Test
    void resolveForPublic_readyWithHlsMaster_hlsUrlPresent() {
        String id = "vid-hls0003";
        VideoEntity entity = readyEntity(id, id + ".mp4", id + "-poster.jpg");
        entity.setHlsMasterFilename(id + "-hls/master.m3u8");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        var result = service.resolveForPublic(id);

        assertTrue(result.isPresent());
        VideoService.ResolvedVideo rv = result.get();
        assertNotNull(rv.hlsUrl());
        assertEquals("/api/videos/files/" + id + "-hls/master.m3u8", rv.hlsUrl());
    }

    /**
     * HLS-3b : resolveForPublic, video READY sans hlsMaster → hlsUrl null.
     */
    @Test
    void resolveForPublic_readyWithoutHlsMaster_hlsUrlNull() {
        String id = "vid-hls0003b";
        VideoEntity entity = readyEntity(id, id + ".mp4", id + "-poster.jpg");
        // hlsMasterFilename non positionne
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        var result = service.resolveForPublic(id);

        assertTrue(result.isPresent());
        assertNull(result.get().hlsUrl());
    }

    /**
     * HLS-4 : getStatus → Video.hls() non null si READY + hlsMaster, null sinon.
     */
    @Test
    void getStatus_readyWithHlsMaster_videoDtoHlsNonNull() {
        String id = "vid-hls0004";
        VideoEntity entity = readyEntity(id, id + ".mp4", id + "-poster.jpg");
        entity.setHlsMasterFilename(id + "-hls/master.m3u8");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        Video dto = service.getStatus(id);

        assertNotNull(dto);
        assertNotNull(dto.hls());
        assertTrue(dto.hls().contains(id + "-hls/master.m3u8"));
    }

    @Test
    void getStatus_readyWithoutHlsMaster_videoDtoHlsNull() {
        String id = "vid-hls0004b";
        VideoEntity entity = readyEntity(id, id + ".mp4", id + "-poster.jpg");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        Video dto = service.getStatus(id);

        assertNotNull(dto);
        assertNull(dto.hls());
    }

    /**
     * HLS-5 : generateHlsAll — READY sans hlsMaster + mp4 sur disque → generateHls appele, hlsMaster pose.
     * Idempotent : video avec hlsMaster deja → skip.
     */
    @Test
    void generateHlsAll_readyWithoutHls_generatesAndSaves() throws Exception {
        String id1 = "vid-hls0005a"; // sans hlsMaster, mp4 sur disque
        String id2 = "vid-hls0005b"; // avec hlsMaster → skip

        VideoEntity e1 = readyEntity(id1, id1 + ".mp4", null);
        e1.setHeight(720);

        VideoEntity e2 = readyEntity(id2, id2 + ".mp4", null);
        e2.setHlsMasterFilename(id2 + "-hls/master.m3u8");

        when(repository.findByStatus(VideoStatus.READY)).thenReturn(List.of(e1, e2));

        // Cree le mp4 de e1 sur disque
        Files.writeString(tmp.resolve(id1 + ".mp4"), "fake-mp4");

        ReflectionTestUtils.setField(service, "hlsTimeSeconds", 6);
        ReflectionTestUtils.setField(service, "hlsPreset", "veryfast");

        VideoService.VideoHlsReport report = service.generateHlsAll();

        // generateHls appele 1 seule fois (e1 uniquement)
        verify(transcoder, times(1)).generateHls(any(), any(), eq(720), any());

        // e1 : hlsMaster positionne et sauvegarde
        ArgumentCaptor<VideoEntity> captor = ArgumentCaptor.forClass(VideoEntity.class);
        verify(repository, times(1)).save(captor.capture());
        VideoEntity saved = captor.getValue();
        assertEquals(id1 + "-hls/master.m3u8", saved.getHlsMasterFilename());

        // Rapport
        assertEquals(2, report.count());
        assertEquals(1, report.generated());
    }

    /**
     * HLS-5b : generateHlsAll idempotent — toutes les videos ont deja hlsMaster → generated=0.
     */
    @Test
    void generateHlsAll_allAlreadyHaveHls_generatedZero() throws Exception {
        String id = "vid-hls0005c";
        VideoEntity e = readyEntity(id, id + ".mp4", null);
        e.setHlsMasterFilename(id + "-hls/master.m3u8");
        when(repository.findByStatus(VideoStatus.READY)).thenReturn(List.of(e));

        ReflectionTestUtils.setField(service, "hlsTimeSeconds", 6);
        ReflectionTestUtils.setField(service, "hlsPreset", "veryfast");

        VideoService.VideoHlsReport report = service.generateHlsAll();

        verify(transcoder, never()).generateHls(any(), any(), anyInt(), any());
        assertEquals(1, report.count());
        assertEquals(0, report.generated());
    }

    // -----------------------------------------------------------------------
    // GC — isReferenced (conserve — reutilise Tasks 2-3 SP4)
    // -----------------------------------------------------------------------

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
        var sc = new SiteContentEntity(); sc.setKey("studio.video.id"); sc.setValue("vid-3");
        when(siteContentRepository.findById("studio.video.id")).thenReturn(Optional.of(sc));
        assertTrue(service.isReferenced("vid-3"));
    }

    // -----------------------------------------------------------------------
    // GC — gcOrphans : fichiers disque vid-* sans entite (modele bibliotheque)
    // -----------------------------------------------------------------------

    @Test
    void gcOrphans_recense_les_fichiers_vid_sans_entite_hors_grace() throws Exception {
        // repository ne connait AUCUNE entite → tout fichier vid-* ancien est orphelin
        when(repository.findAll()).thenReturn(java.util.List.of());
        java.nio.file.Path dir = tmp;
        java.nio.file.Path orphan = java.nio.file.Files.createFile(dir.resolve("vid-dead.mp4"));
        // mtime ancien (au-dela de la grace de 24h)
        java.nio.file.Files.setLastModifiedTime(orphan,
            java.nio.file.attribute.FileTime.from(java.time.Instant.now().minus(java.time.Duration.ofHours(48))));
        java.nio.file.Files.createFile(dir.resolve("photo.jpg")); // non vid-* → ignore

        ReflectionTestUtils.setField(service, "gcGraceHours", 24);
        VideoService.VideoGcReport report = service.gcOrphans(false);

        assertTrue(report.orphanFiles().contains("vid-dead.mp4"));
        assertTrue(report.deleted());
        assertFalse(java.nio.file.Files.exists(orphan)); // supprime
        assertTrue(java.nio.file.Files.exists(dir.resolve("photo.jpg"))); // intact
    }

    @Test
    void gcOrphans_epargne_les_fichiers_recents_periode_de_grace() throws Exception {
        when(repository.findAll()).thenReturn(java.util.List.of());
        java.nio.file.Files.createFile(tmp.resolve("vid-fresh.mp4"));
        // mtime recent → protege par la grace (mtime = maintenant par defaut)
        ReflectionTestUtils.setField(service, "gcGraceHours", 24);
        VideoService.VideoGcReport report = service.gcOrphans(true); // dry-run
        assertFalse(report.orphanFiles().contains("vid-fresh.mp4"));
        assertTrue(java.nio.file.Files.exists(tmp.resolve("vid-fresh.mp4")));
    }

    @Test
    void gcOrphans_scan_disque_liste_les_fichiers_vid_sans_entite() throws Exception {
        java.nio.file.Files.writeString(tmp.resolve("vid-orphan.mp4"), "x");
        java.nio.file.Files.setLastModifiedTime(tmp.resolve("vid-orphan.mp4"),
            java.nio.file.attribute.FileTime.from(Instant.now().minusSeconds(48*3600)));
        java.nio.file.Files.writeString(tmp.resolve("8f3a-photo.jpg"), "x");
        when(repository.findAll()).thenReturn(List.of());
        ReflectionTestUtils.setField(service, "gcGraceHours", 24);
        var report = service.gcOrphans(true);
        assertTrue(report.orphanFiles().contains("vid-orphan.mp4"));
        assertFalse(report.orphanFiles().stream().anyMatch(f -> f.contains("photo")));
    }

    // -----------------------------------------------------------------------
    // listAll / referencesOf (Task 2 SP4)
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private static VideoEntity uploadedEntity(String id, String sourceFilename) {
        VideoEntity e = new VideoEntity();
        e.setId(id);
        e.setStatus(VideoStatus.UPLOADED);
        e.setSourceFilename(sourceFilename);
        e.setOriginalName("video.mp4");
        e.setCreatedAt("2026-06-21T10:00:00Z");
        return e;
    }

    private static VideoEntity readyEntity(String id, String outputFilename, String posterFilename) {
        VideoEntity e = new VideoEntity();
        e.setId(id);
        e.setStatus(VideoStatus.READY);
        e.setOutputFilename(outputFilename);
        e.setPosterFilename(posterFilename);
        e.setSourceFilename(null);
        e.setDurationSeconds(10.0);
        e.setWidth(1280);
        e.setHeight(720);
        e.setCreatedAt("2026-06-21T10:00:00Z");
        return e;
    }
}
