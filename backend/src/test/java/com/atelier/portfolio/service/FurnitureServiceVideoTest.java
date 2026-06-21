package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.FurnitureEntity;
import com.atelier.portfolio.model.Furniture;
import com.atelier.portfolio.repository.FurnitureRepository;
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
 * Tests unitaires pour la résolution vidéo dans FurnitureService.
 * Vérifie que toDto() résout correctement video_id → URL/métadonnées via VideoService.
 */
@ExtendWith(MockitoExtension.class)
class FurnitureServiceVideoTest {

    @Mock FurnitureRepository repository;
    @Mock StoryService storyService;
    @Mock HomeFeedService homeFeedService;
    @Mock CategoryMetaService categoryMetaService;
    @Mock VideoService videoService;

    @InjectMocks FurnitureService furnitureService;

    private static final VideoService.ResolvedVideo READY_VIDEO =
            new VideoService.ResolvedVideo(
                    "/api/videos/files/vid-1.mp4",
                    "/api/photos/files/vid-1-poster.jpg",
                    12.5, 1920, 1080, null);

    private FurnitureEntity baseEntity() {
        FurnitureEntity e = new FurnitureEntity();
        e.setId("f-test");
        e.setTitle("Test");
        e.setSlug("test");
        e.setCategory("Sièges");
        e.setFeatured(false);
        e.setShowStoryLink(true);
        e.setShowStoryButton(true);
        e.setGallery(new ArrayList<>());
        e.setDimensions(new ArrayList<>());
        e.setTags(new ArrayList<>());
        return e;
    }

    // -----------------------------------------------------------------------
    // Tests de lecture (toDto)
    // -----------------------------------------------------------------------

    @Test
    void toDto_videoId_READY_expose_url_et_metadata() {
        FurnitureEntity entity = baseEntity();
        entity.setVideoId("vid-1");

        when(repository.findBySlug("test")).thenReturn(Optional.of(entity));
        when(videoService.resolveForPublic("vid-1")).thenReturn(Optional.of(READY_VIDEO));
        when(storyService.findSlidesForOwner("furniture", "f-test")).thenReturn(List.of());

        Furniture result = furnitureService.findBySlug("test").orElseThrow();

        assertThat(result.videoUrl()).isEqualTo("/api/videos/files/vid-1.mp4");
        assertThat(result.videoPoster()).isEqualTo("/api/photos/files/vid-1-poster.jpg");
        assertThat(result.durationSeconds()).isEqualTo(12.5);
        assertThat(result.width()).isEqualTo(1920);
        assertThat(result.height()).isEqualTo(1080);
        assertThat(result.videoId()).isEqualTo("vid-1");
    }

    @Test
    void toDto_videoPoster_override_prime_sur_poster_resolu() {
        FurnitureEntity entity = baseEntity();
        entity.setVideoId("vid-1");
        entity.setVideoPoster("/api/photos/files/custom-poster.jpg");

        when(repository.findBySlug("test")).thenReturn(Optional.of(entity));
        when(videoService.resolveForPublic("vid-1")).thenReturn(Optional.of(READY_VIDEO));
        when(storyService.findSlidesForOwner("furniture", "f-test")).thenReturn(List.of());

        Furniture result = furnitureService.findBySlug("test").orElseThrow();

        // Le poster explicite de l'entité prime sur celui résolu
        assertThat(result.videoPoster()).isEqualTo("/api/photos/files/custom-poster.jpg");
        // L'URL vidéo et les métadonnées viennent bien de la résolution
        assertThat(result.videoUrl()).isEqualTo("/api/videos/files/vid-1.mp4");
        assertThat(result.durationSeconds()).isEqualTo(12.5);
    }

    @Test
    void toDto_videoId_non_READY_expose_null() {
        FurnitureEntity entity = baseEntity();
        entity.setVideoId("vid-processing");

        when(repository.findBySlug("test")).thenReturn(Optional.of(entity));
        when(videoService.resolveForPublic("vid-processing")).thenReturn(Optional.empty());
        when(storyService.findSlidesForOwner("furniture", "f-test")).thenReturn(List.of());

        Furniture result = furnitureService.findBySlug("test").orElseThrow();

        assertThat(result.videoUrl()).isNull();
        assertThat(result.videoPoster()).isNull();
        assertThat(result.durationSeconds()).isNull();
        assertThat(result.width()).isNull();
        assertThat(result.height()).isNull();
    }

    @Test
    void toDto_sans_videoId_expose_null() {
        FurnitureEntity entity = baseEntity();
        // videoId non défini

        when(repository.findBySlug("test")).thenReturn(Optional.of(entity));
        when(storyService.findSlidesForOwner("furniture", "f-test")).thenReturn(List.of());

        Furniture result = furnitureService.findBySlug("test").orElseThrow();

        assertThat(result.videoUrl()).isNull();
        assertThat(result.videoId()).isNull();
        assertThat(result.durationSeconds()).isNull();
    }

    // -----------------------------------------------------------------------
    // Tests d'écriture (create/update avec videoId)
    // -----------------------------------------------------------------------

    @Test
    void create_avec_videoId_sauvegarde_videoId_sur_entite() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(videoService.resolveForPublic(any())).thenReturn(Optional.empty());

        Furniture input = new Furniture(
                null, "T", null, "Sièges", null, 2024,
                null, null,
                List.of(), null, null, List.of(), null,
                false, true, true, List.of(), List.of(),
                null,   // videoUrl (lecture seulement)
                null,   // videoPoster (override)
                null,   // videoCaptions
                "vid-9", // videoId
                null, null, null // durationSeconds, width, height
        );

        Furniture created = furnitureService.create(input);

        assertThat(created.videoId()).isEqualTo("vid-9");
    }

    @Test
    void update_avec_videoId_sauvegarde_videoId_sur_entite() {
        FurnitureEntity existing = baseEntity();
        existing.setVideoId(null);

        when(repository.findBySlug("test")).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(videoService.resolveForPublic("vid-9")).thenReturn(Optional.empty());

        Furniture input = new Furniture(
                "f-test", "Test", "test", "Sièges", null, 2024,
                null, null,
                List.of(), null, null, List.of(), null,
                false, true, true, List.of(), List.of(),
                null,   // videoUrl (lecture seulement)
                null,   // videoPoster
                null,   // videoCaptions
                "vid-9", // videoId
                null, null, null
        );

        Furniture result = furnitureService.update("test", input).orElseThrow();

        assertThat(result.videoId()).isEqualTo("vid-9");
    }
}
