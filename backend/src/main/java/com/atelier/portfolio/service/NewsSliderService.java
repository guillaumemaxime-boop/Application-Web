package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.NewsSliderEntity;
import com.atelier.portfolio.entity.NewsSliderStoryEntity;
import com.atelier.portfolio.entity.StoryEntity;
import com.atelier.portfolio.enums.SliderZone;
import com.atelier.portfolio.model.NewsSlider;
import com.atelier.portfolio.model.NewsSliderInput;
import com.atelier.portfolio.model.NewsSliderView;
import com.atelier.portfolio.model.SliderStoryRef;
import com.atelier.portfolio.repository.ExhibitionRepository;
import com.atelier.portfolio.repository.FurnitureRepository;
import com.atelier.portfolio.repository.NewsSliderRepository;
import com.atelier.portfolio.repository.StoryRepository;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class NewsSliderService {

    private final NewsSliderRepository sliderRepo;
    private final StoryRepository storyRepo;
    private final FurnitureRepository furnitureRepo;
    private final ExhibitionRepository exhibitionRepo;
    private final StorySlideRepository slideRepo;

    public NewsSliderService(NewsSliderRepository sliderRepo, StoryRepository storyRepo,
                             FurnitureRepository furnitureRepo, ExhibitionRepository exhibitionRepo,
                             StorySlideRepository slideRepo) {
        this.sliderRepo = sliderRepo;
        this.storyRepo = storyRepo;
        this.furnitureRepo = furnitureRepo;
        this.exhibitionRepo = exhibitionRepo;
        this.slideRepo = slideRepo;
    }

    public List<NewsSliderView> findAllPublishedView() {
        return sliderRepo.findAllByZoneKeyIsNotNull().stream()
                .map(this::toView)
                .toList();
    }

    private NewsSliderView toView(NewsSliderEntity e) {
        List<SliderStoryRef> refs = new ArrayList<>();
        for (NewsSliderStoryEntity link : e.getStories()) {
            StoryEntity story = link.getStory();
            // Filtre : story doit avoir au moins une slide pour apparaitre publiquement
            if (slideRepo.findByStoryIdOrderByPosition(story.getId()).isEmpty()) continue;
            refs.add(new SliderStoryRef(
                    story.getId(), story.getSlug(), story.getTitle(), story.getCoverImage(),
                    story.getOwnerKind(), story.getOwnerId(),
                    ownerLabelFor(story.getOwnerKind(), story.getOwnerId())
            ));
        }
        return new NewsSliderView(e.getId(), e.getSlug(), e.getTitle(), e.getZoneKey(), refs);
    }

    private String ownerLabelFor(String ownerKind, String ownerId) {
        if ("furniture".equals(ownerKind)) {
            return furnitureRepo.findById(ownerId)
                    .map(f -> f.getTitle())
                    .orElse(ownerId);
        } else if ("exhibition".equals(ownerKind)) {
            return exhibitionRepo.findById(ownerId)
                    .map(ex -> ex.getTitle() + " - " + ex.getVenue())
                    .orElse(ownerId);
        }
        return ownerId;
    }

    public List<NewsSlider> findAll() {
        return sliderRepo.findAll().stream().map(NewsSliderService::toDto).toList();
    }

    public List<NewsSliderEntity> findAllPublished() {
        return sliderRepo.findAllByZoneKeyIsNotNull();
    }

    @Transactional
    public NewsSlider create(NewsSliderInput input) {
        validateZone(input.zoneKey());
        checkZoneAvailable(input.zoneKey(), null);
        NewsSliderEntity e = new NewsSliderEntity();
        e.setId("sld-" + UUID.randomUUID().toString().substring(0, 12));
        e.setSlug(generateUniqueSlug(input.title()));
        e.setTitle(input.title());
        e.setZoneKey(input.zoneKey());
        e.setCreatedAt(Instant.now());
        return toDto(sliderRepo.save(e));
    }

    @Transactional
    public NewsSlider update(String id, NewsSliderInput input) {
        validateZone(input.zoneKey());
        checkZoneAvailable(input.zoneKey(), id);
        NewsSliderEntity e = sliderRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "slider not found: " + id));
        e.setTitle(input.title());
        e.setZoneKey(input.zoneKey());
        return toDto(sliderRepo.save(e));
    }

    @Transactional
    public void delete(String id) {
        sliderRepo.deleteById(id);
    }

    @Transactional
    public NewsSlider replaceStories(String sliderId, List<String> storyIds) {
        NewsSliderEntity slider = sliderRepo.findById(sliderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "slider not found: " + sliderId));
        slider.getStories().clear();
        for (int i = 0; i < storyIds.size(); i++) {
            String storyId = storyIds.get(i);
            StoryEntity story = storyRepo.findById(storyId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + storyId));
            NewsSliderStoryEntity link = new NewsSliderStoryEntity();
            link.setSlider(slider);
            link.setStory(story);
            link.setPosition(i);
            slider.getStories().add(link);
        }
        return toDto(sliderRepo.save(slider));
    }

    private void validateZone(String zoneKey) {
        if (zoneKey != null && !zoneKey.isBlank()) {
            SliderZone.fromKey(zoneKey);
        }
    }

    private void checkZoneAvailable(String zoneKey, String excludeId) {
        if (zoneKey == null || zoneKey.isBlank()) return;
        sliderRepo.findByZoneKey(zoneKey).ifPresent(existing -> {
            if (!existing.getId().equals(excludeId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Zone " + zoneKey + " already occupied by slider " + existing.getId());
            }
        });
    }

    private String generateUniqueSlug(String title) {
        String base = title.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (base.isBlank()) base = "slider";
        String candidate = base;
        int suffix = 2;
        while (sliderRepo.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    static NewsSlider toDto(NewsSliderEntity e) {
        List<String> ids = new ArrayList<>();
        for (NewsSliderStoryEntity link : e.getStories()) {
            ids.add(link.getStory().getId());
        }
        return new NewsSlider(e.getId(), e.getSlug(), e.getTitle(), e.getZoneKey(), ids);
    }
}
