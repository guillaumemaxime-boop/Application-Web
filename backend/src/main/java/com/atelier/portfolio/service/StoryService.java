package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StoryEntity;
import com.atelier.portfolio.entity.StorySlideEntity;
import com.atelier.portfolio.entity.StorySlideSpecEntry;
import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.SpecEntry;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.model.StoryWithSlides;
import com.atelier.portfolio.repository.StoryRepository;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class StoryService {

    private final StoryRepository storyRepo;
    private final StorySlideRepository slideRepo;

    public StoryService(StoryRepository storyRepo, StorySlideRepository slideRepo) {
        this.storyRepo = storyRepo;
        this.slideRepo = slideRepo;
    }

    public List<Story> findByOwner(String ownerKind, String ownerId) {
        return storyRepo.findByOwnerKindAndOwnerIdOrderByPosition(ownerKind, ownerId)
                .stream().map(StoryService::toDto).toList();
    }

    public List<Story> findAll() {
        return storyRepo.findAll().stream().map(StoryService::toDto).toList();
    }

    /**
     * Aggrege les slides de toutes les stories d'un owner (ordre : stories par position, puis slides par position).
     * Utilise par FurnitureService/ExhibitionService pour exposer les slides dans la page detail.
     */
    public List<Slide> findSlidesForOwner(String ownerKind, String ownerId) {
        return storyRepo.findByOwnerKindAndOwnerIdOrderByPosition(ownerKind, ownerId).stream()
                .flatMap(story -> loadSlides(story.getId()).stream())
                .toList();
    }

    public Optional<StoryWithSlides> findBySlugWithSlides(String slug) {
        return storyRepo.findBySlug(slug)
                .map(e -> new StoryWithSlides(toDto(e), loadSlides(e.getId())));
    }

    public List<Slide> findSlidesByStoryId(String storyId) {
        return loadSlides(storyId);
    }

    @Transactional
    public Story create(StoryInput input) {
        StoryEntity e = new StoryEntity();
        e.setId("st-" + UUID.randomUUID().toString().substring(0, 12));
        e.setOwnerKind(input.ownerKind());
        e.setOwnerId(input.ownerId());
        e.setTitle(input.title());
        e.setCoverImage(input.coverImage());
        e.setSlug(generateUniqueSlug(input.ownerId()));
        e.setPosition(nextPosition(input.ownerKind(), input.ownerId()));
        e.setCreatedAt(Instant.now());
        return toDto(storyRepo.save(e));
    }

    @Transactional
    public Story update(String id, StoryInput input) {
        StoryEntity e = storyRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + id));
        e.setTitle(input.title());
        e.setCoverImage(input.coverImage());
        return toDto(storyRepo.save(e));
    }

    @Transactional
    public void updatePosition(String id, int newPosition) {
        StoryEntity e = storyRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + id));
        e.setPosition(newPosition);
        storyRepo.save(e);
    }

    @Transactional
    public void delete(String id) {
        StoryEntity e = storyRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + id));
        storyRepo.delete(e);
    }

    @Transactional
    public void deleteAllForOwner(String ownerKind, String ownerId) {
        storyRepo.deleteByOwnerKindAndOwnerId(ownerKind, ownerId);
    }

    @Transactional
    public List<Slide> replaceSlides(String storyId, List<Slide> slides) {
        StoryEntity story = storyRepo.findById(storyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + storyId));
        slideRepo.deleteByStoryId(storyId);
        List<StorySlideEntity> entities = new ArrayList<>();
        for (int i = 0; i < slides.size(); i++) {
            entities.add(toSlideEntity(slides.get(i), story, i));
        }
        slideRepo.saveAll(entities);
        return loadSlides(storyId);
    }

    private int nextPosition(String ownerKind, String ownerId) {
        return storyRepo.findByOwnerKindAndOwnerIdOrderByPosition(ownerKind, ownerId)
                .stream().mapToInt(StoryEntity::getPosition).max().orElse(-1) + 1;
    }

    private String generateUniqueSlug(String ownerId) {
        String base = ownerId + "-" + Long.toString(System.currentTimeMillis(), 36);
        String candidate = base;
        int suffix = 2;
        while (storyRepo.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private List<Slide> loadSlides(String storyId) {
        return slideRepo.findByStoryIdOrderByPosition(storyId)
                .stream().map(StoryService::toSlideDto).toList();
    }

    private static Story toDto(StoryEntity e) {
        return new Story(e.getId(), e.getOwnerKind(), e.getOwnerId(),
                e.getTitle(), e.getCoverImage(), e.getSlug(), e.getPosition(), e.getCreatedAt());
    }

    private static Slide toSlideDto(StorySlideEntity e) {
        return switch (e.getType()) {
            case "image" -> new Slide.ImageSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption());
            case "video" -> new Slide.VideoSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption());
            case "spec"  -> new Slide.SpecSlide(e.getId(), e.getPosition(),
                    e.getSpecs().stream().map(s -> new SpecEntry(s.getLabel(), s.getValue())).toList());
            case "quote" -> new Slide.QuoteSlide(e.getId(), e.getPosition(), e.getQuoteBody(), e.getQuoteCite());
            default -> throw new IllegalStateException("Unknown slide type: " + e.getType());
        };
    }

    private static StorySlideEntity toSlideEntity(Slide slide, StoryEntity story, int position) {
        StorySlideEntity e = new StorySlideEntity();
        e.setId(slide.id() != null && !slide.id().isBlank() ? slide.id() : "sl-" + UUID.randomUUID().toString().substring(0, 8));
        e.setStory(story);
        e.setPosition(position);
        switch (slide) {
            case Slide.ImageSlide i -> { e.setType("image"); e.setSrc(i.src()); e.setCaption(i.caption()); }
            case Slide.VideoSlide v -> { e.setType("video"); e.setSrc(v.src()); e.setCaption(v.caption()); }
            case Slide.SpecSlide s -> {
                e.setType("spec");
                List<StorySlideSpecEntry> specs = s.specs().stream().map(entry -> {
                    StorySlideSpecEntry se = new StorySlideSpecEntry();
                    se.setLabel(entry.label());
                    se.setValue(entry.value());
                    return se;
                }).toList();
                e.setSpecs(new ArrayList<>(specs));
            }
            case Slide.QuoteSlide q -> { e.setType("quote"); e.setQuoteBody(q.body()); e.setQuoteCite(q.cite()); }
        }
        return e;
    }
}
