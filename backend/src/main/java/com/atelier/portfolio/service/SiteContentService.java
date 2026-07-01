package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.SiteContentEntity;
import com.atelier.portfolio.repository.SiteContentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SiteContentService {

    private final SiteContentRepository repository;
    private final VideoService videoService;

    public SiteContentService(SiteContentRepository repository, VideoService videoService) {
        this.repository = repository;
        this.videoService = videoService;
    }

    /**
     * Retourne toutes les clés site_content sous forme de map clé → valeur.
     * <p>
     * Résolution vidéo Studio : si la clé {@code studio.video.id} est présente et pointe
     * une vidéo READY, la clé synthétique {@code studio.video.url} est injectée dans la map
     * avec l'URL résolue. Si aucun override {@code studio.video.poster} n'est déjà stocké,
     * le poster résolu est également injecté.
     * Si la vidéo n'est pas READY (ou si la clé id est absente), aucune clé url n'est ajoutée.
     * </p>
     */
    public Map<String, String> findAll() {
        Map<String, String> result = new HashMap<>(
                repository.findAll().stream()
                        .collect(Collectors.toMap(SiteContentEntity::getKey, SiteContentEntity::getValue))
        );

        // Résolution studio.video.id → studio.video.url (READY only)
        String studioVideoId = result.get("studio.video.id");
        if (studioVideoId != null && !studioVideoId.isBlank()) {
            Optional<VideoService.ResolvedVideo> resolved = videoService.resolveForPublic(studioVideoId);
            resolved.ifPresent(rv -> {
                result.put("studio.video.url", rv.url());
                // Poster : l'override explicite prime ; sinon on injecte le poster résolu
                if (!result.containsKey("studio.video.poster") && rv.posterUrl() != null) {
                    result.put("studio.video.poster", rv.posterUrl());
                }
                // HLS : manifeste master.m3u8 résolu (READY + HLS généré)
                if (rv.hlsUrl() != null) {
                    result.put("studio.video.hls", rv.hlsUrl());
                }
            });
        }

        return result;
    }

    public String get(String key, String defaultValue) {
        return repository.findById(key)
                .map(SiteContentEntity::getValue)
                .orElse(defaultValue);
    }

    @Transactional
    public Map<String, String> saveAll(Map<String, String> entries) {
        String oldStudioVid = null;
        if (entries.containsKey("studio.video.id")) {
            oldStudioVid = repository.findById("studio.video.id")
                    .map(SiteContentEntity::getValue).orElse(null);
        }
        var entities = entries.entrySet().stream()
                .map(e -> {
                    SiteContentEntity entity = new SiteContentEntity();
                    entity.setKey(e.getKey());
                    entity.setValue(e.getValue());
                    return entity;
                })
                .toList();
        repository.saveAll(entities);
        if (entries.containsKey("studio.video.id")) {
            String neu = entries.get("studio.video.id");
            if (oldStudioVid != null && !oldStudioVid.isBlank() && !oldStudioVid.equals(neu)) {
                try { videoService.deleteIfUnreferenced(oldStudioVid); } catch (Exception ignored) {}
            }
        }
        return findAll();
    }
}
