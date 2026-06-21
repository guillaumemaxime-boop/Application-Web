package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.SiteContentEntity;
import com.atelier.portfolio.repository.SiteContentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires pour la résolution vidéo studio dans SiteContentService.
 * Vérifie que findAll() résout studio.video.id → studio.video.url via VideoService (READY only).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SiteContentServiceVideoTest {

    @Mock SiteContentRepository repository;
    @Mock VideoService videoService;

    @InjectMocks SiteContentService service;

    private static final VideoService.ResolvedVideo READY_VIDEO =
            new VideoService.ResolvedVideo(
                    "/api/videos/files/vid-studio.mp4",
                    "/api/photos/files/vid-studio-poster.jpg",
                    42.0, 1920, 1080);

    private static SiteContentEntity entry(String key, String value) {
        SiteContentEntity e = new SiteContentEntity();
        e.setKey(key);
        e.setValue(value);
        return e;
    }

    // -----------------------------------------------------------------------
    // studio.video.id présent + vidéo READY → studio.video.url résolu
    // -----------------------------------------------------------------------

    @Test
    void findAll_studioVideoId_READY_expose_videoUrl_resolu() {
        when(repository.findAll()).thenReturn(List.of(
                entry("studio.video.id", "vid-studio"),
                entry("studio.title", "Notre studio")
        ));
        when(videoService.resolveForPublic("vid-studio")).thenReturn(Optional.of(READY_VIDEO));

        Map<String, String> result = service.findAll();

        assertThat(result.get("studio.video.url")).isEqualTo("/api/videos/files/vid-studio.mp4");
        // Les autres clés sont préservées
        assertThat(result.get("studio.title")).isEqualTo("Notre studio");
        assertThat(result.get("studio.video.id")).isEqualTo("vid-studio");
    }

    @Test
    void findAll_studioVideoId_READY_poster_override_prime_sur_poster_resolu() {
        when(repository.findAll()).thenReturn(List.of(
                entry("studio.video.id", "vid-studio"),
                entry("studio.video.poster", "/api/photos/files/custom-poster.jpg")
        ));
        when(videoService.resolveForPublic("vid-studio")).thenReturn(Optional.of(READY_VIDEO));

        Map<String, String> result = service.findAll();

        assertThat(result.get("studio.video.url")).isEqualTo("/api/videos/files/vid-studio.mp4");
        // Le poster override conservé tel quel (pas écrasé par le poster résolu)
        assertThat(result.get("studio.video.poster")).isEqualTo("/api/photos/files/custom-poster.jpg");
    }

    @Test
    void findAll_studioVideoId_READY_poster_resolu_si_pas_d_override() {
        when(repository.findAll()).thenReturn(List.of(
                entry("studio.video.id", "vid-studio")
                // pas de studio.video.poster dans la BDD
        ));
        when(videoService.resolveForPublic("vid-studio")).thenReturn(Optional.of(READY_VIDEO));

        Map<String, String> result = service.findAll();

        assertThat(result.get("studio.video.url")).isEqualTo("/api/videos/files/vid-studio.mp4");
        // Le poster résolu est injecté automatiquement
        assertThat(result.get("studio.video.poster")).isEqualTo("/api/photos/files/vid-studio-poster.jpg");
    }

    // -----------------------------------------------------------------------
    // studio.video.id absent ou vidéo non READY → pas de vidéo
    // -----------------------------------------------------------------------

    @Test
    void findAll_studioVideoId_non_READY_pas_de_videoUrl() {
        when(repository.findAll()).thenReturn(List.of(
                entry("studio.video.id", "vid-en-cours")
        ));
        when(videoService.resolveForPublic("vid-en-cours")).thenReturn(Optional.empty());

        Map<String, String> result = service.findAll();

        assertThat(result.get("studio.video.url")).isNull();
    }

    @Test
    void findAll_sans_studioVideoId_pas_de_videoUrl() {
        when(repository.findAll()).thenReturn(List.of(
                entry("studio.title", "Atelier")
        ));

        Map<String, String> result = service.findAll();

        assertThat(result.get("studio.video.url")).isNull();
    }
}
