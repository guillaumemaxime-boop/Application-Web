package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ExhibitionEntity;
import com.atelier.portfolio.model.Exhibition;
import com.atelier.portfolio.repository.ExhibitionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires pour la résolution vidéo dans ExhibitionService.
 * Vérifie que toDto() résout correctement video_id → URL/métadonnées via VideoService.
 */
@ExtendWith(MockitoExtension.class)
class ExhibitionServiceVideoTest {

    @Mock ExhibitionRepository repository;
    @Mock StoryService storyService;
    @Mock HomeFeedService homeFeedService;
    @Mock ExhibitionMetaService exhibitionMetaService;
    @Mock VideoService videoService;

    @InjectMocks ExhibitionService exhibitionService;

    private static final VideoService.ResolvedVideo READY_VIDEO =
            new VideoService.ResolvedVideo(
                    "/api/videos/files/vid-1.mp4",
                    "/api/photos/files/vid-1-poster.jpg",
                    12.5, 1920, 1080, null);

    private ExhibitionEntity baseEntity() {
        ExhibitionEntity e = new ExhibitionEntity();
        e.setId("e-test");
        e.setTitle("Test Expo");
        e.setSlug("test-expo");
        e.setFeatured(false);
        e.setShowStoryLink(true);
        e.setShowStoryButton(true);
        e.setGallery(new ArrayList<>());
        e.setTags(new ArrayList<>());
        return e;
    }

    // -----------------------------------------------------------------------
    // Tests de lecture (toDto)
    // -----------------------------------------------------------------------

    @Test
    void toDto_videoId_READY_expose_url_et_metadata() {
        ExhibitionEntity entity = baseEntity();
        entity.setVideoId("vid-1");

        when(repository.findBySlug("test-expo")).thenReturn(Optional.of(entity));
        when(videoService.resolveForPublic("vid-1")).thenReturn(Optional.of(READY_VIDEO));
        when(storyService.findSlidesForOwner("exhibition", "e-test")).thenReturn(List.of());

        Exhibition result = exhibitionService.findBySlug("test-expo").orElseThrow();

        assertThat(result.videoUrl()).isEqualTo("/api/videos/files/vid-1.mp4");
        assertThat(result.videoPoster()).isEqualTo("/api/photos/files/vid-1-poster.jpg");
        assertThat(result.durationSeconds()).isEqualTo(12.5);
        assertThat(result.width()).isEqualTo(1920);
        assertThat(result.height()).isEqualTo(1080);
        assertThat(result.videoId()).isEqualTo("vid-1");
    }

    @Test
    void toDto_videoPoster_override_prime_sur_poster_resolu() {
        ExhibitionEntity entity = baseEntity();
        entity.setVideoId("vid-1");
        entity.setVideoPoster("/api/photos/files/custom-poster.jpg");

        when(repository.findBySlug("test-expo")).thenReturn(Optional.of(entity));
        when(videoService.resolveForPublic("vid-1")).thenReturn(Optional.of(READY_VIDEO));
        when(storyService.findSlidesForOwner("exhibition", "e-test")).thenReturn(List.of());

        Exhibition result = exhibitionService.findBySlug("test-expo").orElseThrow();

        assertThat(result.videoPoster()).isEqualTo("/api/photos/files/custom-poster.jpg");
        assertThat(result.videoUrl()).isEqualTo("/api/videos/files/vid-1.mp4");
        assertThat(result.durationSeconds()).isEqualTo(12.5);
    }

    @Test
    void toDto_videoId_non_READY_expose_null() {
        ExhibitionEntity entity = baseEntity();
        entity.setVideoId("vid-processing");

        when(repository.findBySlug("test-expo")).thenReturn(Optional.of(entity));
        when(videoService.resolveForPublic("vid-processing")).thenReturn(Optional.empty());
        when(storyService.findSlidesForOwner("exhibition", "e-test")).thenReturn(List.of());

        Exhibition result = exhibitionService.findBySlug("test-expo").orElseThrow();

        assertThat(result.videoUrl()).isNull();
        assertThat(result.videoPoster()).isNull();
        assertThat(result.durationSeconds()).isNull();
        assertThat(result.width()).isNull();
        assertThat(result.height()).isNull();
    }

    @Test
    void toDto_sans_videoId_expose_null() {
        ExhibitionEntity entity = baseEntity();

        when(repository.findBySlug("test-expo")).thenReturn(Optional.of(entity));
        when(storyService.findSlidesForOwner("exhibition", "e-test")).thenReturn(List.of());

        Exhibition result = exhibitionService.findBySlug("test-expo").orElseThrow();

        assertThat(result.videoUrl()).isNull();
        assertThat(result.videoId()).isNull();
        assertThat(result.durationSeconds()).isNull();
    }

    @Test
    void toDto_videoId_READY_avec_hlsUrl_expose_videoHls() {
        ExhibitionEntity entity = baseEntity();
        entity.setVideoId("vid-1");

        VideoService.ResolvedVideo resolvedWithHls = new VideoService.ResolvedVideo(
                "/api/videos/files/vid-1.mp4",
                "/api/photos/files/vid-1-poster.jpg",
                12.5, 1920, 1080,
                "/api/videos/files/vid-1-hls/master.m3u8");

        when(repository.findBySlug("test-expo")).thenReturn(Optional.of(entity));
        when(videoService.resolveForPublic("vid-1")).thenReturn(Optional.of(resolvedWithHls));
        when(storyService.findSlidesForOwner("exhibition", "e-test")).thenReturn(List.of());

        Exhibition result = exhibitionService.findBySlug("test-expo").orElseThrow();

        assertThat(result.videoHls()).isEqualTo("/api/videos/files/vid-1-hls/master.m3u8");
    }

    @Test
    void toDto_videoId_READY_sans_hlsUrl_videoHls_est_null() {
        ExhibitionEntity entity = baseEntity();
        entity.setVideoId("vid-1");

        // READY_VIDEO a hlsUrl=null
        when(repository.findBySlug("test-expo")).thenReturn(Optional.of(entity));
        when(videoService.resolveForPublic("vid-1")).thenReturn(Optional.of(READY_VIDEO));
        when(storyService.findSlidesForOwner("exhibition", "e-test")).thenReturn(List.of());

        Exhibition result = exhibitionService.findBySlug("test-expo").orElseThrow();

        assertThat(result.videoHls()).isNull();
    }

    // -----------------------------------------------------------------------
    // Tests d'écriture (create/update avec videoId)
    // -----------------------------------------------------------------------

    @Test
    void create_avec_videoId_sauvegarde_videoId_sur_entite() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(videoService.resolveForPublic(any())).thenReturn(Optional.empty());

        Exhibition input = new Exhibition(
                null, "Expo Test", null,
                "Lieu", "Ville", "Pays",
                java.time.LocalDate.of(2026, 1, 1),
                java.time.LocalDate.of(2026, 2, 1),
                null, null,
                List.of(), null, null, null,
                List.of(), false, true, true, List.of(),
                null,    // videoUrl (lecture seulement)
                null,    // videoPoster (override)
                null,    // videoCaptions
                "vid-9", // videoId
                null, null, null, null // durationSeconds, width, height, videoHls
        );

        Exhibition created = exhibitionService.create(input);

        assertThat(created.videoId()).isEqualTo("vid-9");
    }

    @Test
    void update_avec_videoId_sauvegarde_videoId_sur_entite() {
        ExhibitionEntity existing = baseEntity();
        existing.setVideoId(null);

        when(repository.findBySlug("test-expo")).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(videoService.resolveForPublic("vid-9")).thenReturn(Optional.empty());

        Exhibition input = new Exhibition(
                "e-test", "Test Expo", "test-expo",
                null, null, null, null, null,
                null, null,
                List.of(), null, null, null,
                List.of(), false, true, true, List.of(),
                null,    // videoUrl
                null,    // videoPoster
                null,    // videoCaptions
                "vid-9", // videoId
                null, null, null, null // durationSeconds, width, height, videoHls
        );

        Exhibition result = exhibitionService.update("test-expo", input).orElseThrow();

        assertThat(result.videoId()).isEqualTo("vid-9");
    }
}
