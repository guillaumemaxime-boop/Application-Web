package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ExhibitionEntity;
import com.atelier.portfolio.entity.FurnitureEntity;
import com.atelier.portfolio.entity.StoryEntity;
import com.atelier.portfolio.entity.StorySlideEntity;
import com.atelier.portfolio.entity.StorySlideSpecEntry;
import com.atelier.portfolio.model.ImageCrop;
import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.SpecEntry;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.model.StoryWithSlides;
import com.atelier.portfolio.model.StoryAdminView;
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
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class StoryService {

    private final StoryRepository storyRepo;
    private final StorySlideRepository slideRepo;
    private final FurnitureRepository furnitureRepo;
    private final ExhibitionRepository exhibitionRepo;
    private final NewsSliderRepository sliderRepo;

    public StoryService(StoryRepository storyRepo, StorySlideRepository slideRepo,
                        FurnitureRepository furnitureRepo, ExhibitionRepository exhibitionRepo,
                        NewsSliderRepository sliderRepo) {
        this.storyRepo = storyRepo;
        this.slideRepo = slideRepo;
        this.furnitureRepo = furnitureRepo;
        this.exhibitionRepo = exhibitionRepo;
        this.sliderRepo = sliderRepo;
    }

    public List<Story> findByOwner(String ownerKind, String ownerId) {
        return storyRepo.findByOwnerKindAndOwnerIdOrderByPosition(ownerKind, ownerId)
                .stream().map(StoryService::toDto).toList();
    }

    public List<Story> findAll() {
        return storyRepo.findAll().stream().map(StoryService::toDto).toList();
    }

    /**
     * Liste enrichie de toutes les stories (vides incluses) pour la page de gestion admin.
     * Chaque vue porte : slideCount, sliders d'appartenance, titre de l'owner.
     */
    public List<StoryAdminView> findAllForManagement() {
        // slideCount par story
        Map<String, Integer> counts = new HashMap<>();
        for (Object[] row : slideRepo.countSlidesByStory()) {
            counts.put((String) row[0], ((Long) row[1]).intValue());
        }
        // sliders par story (id + titre)
        Map<String, List<StoryAdminView.SliderRef>> bySlider = new HashMap<>();
        for (var slider : sliderRepo.findAll()) {
            var ref = new StoryAdminView.SliderRef(slider.getId(), slider.getTitle());
            for (var link : slider.getStories()) {
                bySlider.computeIfAbsent(link.getStory().getId(), k -> new ArrayList<>()).add(ref);
            }
        }
        return storyRepo.findAll().stream().map(e -> {
            String ownerTitle = ownerTitle(e.getOwnerKind(), e.getOwnerId());
            return new StoryAdminView(
                    e.getId(), e.getOwnerKind(), e.getOwnerId(), ownerTitle,
                    e.getTitle(), e.getCoverImage(),
                    ImageCrop.ofNullable(e.getCoverCropX(), e.getCoverCropY(), e.getCoverCropW(), e.getCoverCropH()),
                    e.getSlug(), e.getPosition(),
                    counts.getOrDefault(e.getId(), 0),
                    bySlider.getOrDefault(e.getId(), List.of()));
        }).toList();
    }

    private String ownerTitle(String ownerKind, String ownerId) {
        if ("furniture".equals(ownerKind)) {
            return furnitureRepo.findById(ownerId).map(FurnitureEntity::getTitle).orElse(ownerId);
        }
        if ("exhibition".equals(ownerKind)) {
            return exhibitionRepo.findById(ownerId).map(ExhibitionEntity::getTitle).orElse(ownerId);
        }
        return ownerId;
    }

    /**
     * Stories ayant au moins un slide. Utilise pour la liste « Disponibles » de
     * composition d'un slider : une story sans slide n'apparait pas sur le site,
     * donc on ne propose pas de l'ajouter a un slider.
     */
    public List<Story> findAllWithSlides() {
        Set<String> withSlides = new HashSet<>(slideRepo.findDistinctStoryIdsWithSlides());
        return storyRepo.findAll().stream()
                .filter(e -> withSlides.contains(e.getId()))
                .map(StoryService::toDto)
                .toList();
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
        return storyRepo.findBySlug(slug).map(e -> {
            List<Slide> slides = loadSlides(e.getId());
            boolean showLink;
            String ownerSlug;
            if ("furniture".equals(e.getOwnerKind())) {
                var f = furnitureRepo.findById(e.getOwnerId());
                showLink = f.map(FurnitureEntity::isShowStoryLink).orElse(true);
                ownerSlug = f.map(FurnitureEntity::getSlug).orElse("");
            } else if ("exhibition".equals(e.getOwnerKind())) {
                var ex = exhibitionRepo.findById(e.getOwnerId());
                showLink = ex.map(ExhibitionEntity::isShowStoryLink).orElse(true);
                ownerSlug = ex.map(ExhibitionEntity::getSlug).orElse("");
            } else {
                showLink = false;
                ownerSlug = "";
            }
            return new StoryWithSlides(toDto(e), slides, showLink, ownerSlug);
        });
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
        // coverCrop : null = reset (centrer par defaut cote affichage)
        ImageCrop c = input.coverCrop();
        e.setCoverCropX(c != null ? c.x() : null);
        e.setCoverCropY(c != null ? c.y() : null);
        e.setCoverCropW(c != null ? c.w() : null);
        e.setCoverCropH(c != null ? c.h() : null);
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
        boolean coverProvided = input.coverImage() != null && !input.coverImage().isBlank();
        if (coverProvided) {
            e.setCoverImage(input.coverImage());
        }
        // Le crop n'est touche que si une nouvelle cover OU un crop explicite est fourni :
        // un update "titre seul" (cover/crop null) ne reinitialise plus le cadrage.
        if (coverProvided || input.coverCrop() != null) {
            ImageCrop c = input.coverCrop();
            e.setCoverCropX(c != null ? c.x() : null);
            e.setCoverCropY(c != null ? c.y() : null);
            e.setCoverCropW(c != null ? c.w() : null);
            e.setCoverCropH(c != null ? c.h() : null);
        }
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
        ImageCrop coverCrop = ImageCrop.ofNullable(e.getCoverCropX(), e.getCoverCropY(),
                e.getCoverCropW(), e.getCoverCropH());
        return new Story(e.getId(), e.getOwnerKind(), e.getOwnerId(),
                e.getTitle(), e.getCoverImage(), coverCrop, e.getSlug(), e.getPosition(), e.getCreatedAt());
    }

    private static Slide toSlideDto(StorySlideEntity e) {
        return switch (e.getType()) {
            case "image" -> new Slide.ImageSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption(),
                    ImageCrop.ofNullable(e.getImageCropX(), e.getImageCropY(), e.getImageCropW(), e.getImageCropH()));
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
            case Slide.ImageSlide i -> {
                e.setType("image"); e.setSrc(i.src()); e.setCaption(i.caption());
                ImageCrop c = i.crop();
                e.setImageCropX(c != null ? c.x() : null);
                e.setImageCropY(c != null ? c.y() : null);
                e.setImageCropW(c != null ? c.w() : null);
                e.setImageCropH(c != null ? c.h() : null);
            }
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
