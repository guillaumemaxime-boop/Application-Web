package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ExhibitionEntity;
import com.atelier.portfolio.entity.GalleryEntry;
import com.atelier.portfolio.model.Exhibition;
import com.atelier.portfolio.model.GalleryImage;
import com.atelier.portfolio.model.ImageCrop;
import com.atelier.portfolio.repository.ExhibitionRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@Transactional(readOnly = true)
public class ExhibitionService {

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]+");

    private final ExhibitionRepository repository;
    private final StoryService storyService;
    private final HomeFeedService homeFeedService;
    private final ExhibitionMetaService exhibitionMetaService;
    private final VideoService videoService;

    public ExhibitionService(ExhibitionRepository repository,
                             StoryService storyService,
                             HomeFeedService homeFeedService,
                             ExhibitionMetaService exhibitionMetaService,
                             VideoService videoService) {
        this.repository = repository;
        this.storyService = storyService;
        this.homeFeedService = homeFeedService;
        this.exhibitionMetaService = exhibitionMetaService;
        this.videoService = videoService;
    }

    public List<Exhibition> findAll() {
        return repository.findAllByOrderByStartDateDesc().stream().map(this::toDto).toList();
    }

    public List<Exhibition> findFeatured() {
        return repository.findByFeaturedTrueOrderByStartDateDesc().stream().map(this::toDto).toList();
    }

    public Optional<Exhibition> findBySlug(String slug) {
        return repository.findBySlug(slug).map(entity -> {
            Exhibition base = toDto(entity);
            return new Exhibition(
                    base.id(), base.title(), base.slug(), base.venue(), base.city(),
                    base.country(), base.startDate(), base.endDate(), base.coverImage(),
                    base.coverCrop(),
                    base.gallery(), base.curator(), base.shortDescription(), base.description(),
                    base.tags(), base.featured(),
                    base.showStoryLink(),
                    base.showStoryButton(),
                    storyService.findSlidesForOwner("exhibition", entity.getId()),
                    base.videoUrl(),
                    base.videoPoster(),
                    base.videoCaptions(),
                    base.videoId(),
                    base.durationSeconds(),
                    base.width(),
                    base.height(),
                    base.videoHls()
            );
        });
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public Exhibition create(Exhibition input) {
        ExhibitionEntity entity = new ExhibitionEntity();
        String id = (input.id() == null || input.id().isBlank()) ? "e-" + UUID.randomUUID().toString().substring(0, 8) : input.id();
        entity.setId(id);
        applyChanges(entity, input);
        if (entity.getSlug() == null || entity.getSlug().isBlank()) {
            entity.setSlug(slugify(entity.getTitle()));
        }
        ExhibitionEntity saved = repository.save(entity);
        exhibitionMetaService.ensureExists(saved.getSlug());
        homeFeedService.appendIfNotPresent("exhibition", saved.getSlug());
        return toDto(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public Optional<Exhibition> update(String slug, Exhibition input) {
        return repository.findBySlug(slug).map(entity -> {
            applyChanges(entity, input);
            return toDto(repository.save(entity));
        });
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public boolean deleteBySlug(String slug) {
        return repository.findBySlug(slug).map(entity -> {
            storyService.deleteAllForOwner("exhibition", entity.getId());
            homeFeedService.removeBySlug("exhibition", entity.getSlug());
            exhibitionMetaService.removeBySlug(entity.getSlug());
            repository.delete(entity);
            return true;
        }).orElse(false);
    }

    private static void applyChanges(ExhibitionEntity entity, Exhibition input) {
        if (input.title() != null) entity.setTitle(input.title());
        if (input.slug() != null && !input.slug().isBlank()) entity.setSlug(input.slug());
        if (input.venue() != null) entity.setVenue(input.venue());
        if (input.city() != null) entity.setCity(input.city());
        if (input.country() != null) entity.setCountry(input.country());
        if (input.startDate() != null) entity.setStartDate(input.startDate());
        if (input.endDate() != null) entity.setEndDate(input.endDate());
        if (input.coverImage() != null) entity.setCoverImage(input.coverImage());
        // coverCrop : null = reset (centrer par defaut cote affichage)
        ImageCrop c = input.coverCrop();
        entity.setCoverCropX(c != null ? c.x() : null);
        entity.setCoverCropY(c != null ? c.y() : null);
        entity.setCoverCropW(c != null ? c.w() : null);
        entity.setCoverCropH(c != null ? c.h() : null);
        if (input.curator() != null) entity.setCurator(input.curator());
        if (input.shortDescription() != null) entity.setShortDescription(input.shortDescription());
        if (input.description() != null) entity.setDescription(input.description());
        entity.setFeatured(input.featured());
        entity.setShowStoryLink(input.showStoryLink());
        entity.setShowStoryButton(input.showStoryButton());
        // Champs video : set inconditionnel (null = retrait), comme coverCrop.
        entity.setVideoId(input.videoId());
        entity.setVideoPoster(input.videoPoster());
        entity.setVideoCaptions(input.videoCaptions());
        if (input.gallery() != null) {
            entity.getGallery().clear();
            for (GalleryImage gi : input.gallery()) {
                GalleryEntry ge = new GalleryEntry(gi.url());
                if (gi.crop() != null) {
                    ge.setCropX(gi.crop().x());
                    ge.setCropY(gi.crop().y());
                    ge.setCropW(gi.crop().w());
                    ge.setCropH(gi.crop().h());
                }
                ge.setColSpan(gi.colSpan() != null ? gi.colSpan() : 1);
                ge.setRowSpan(gi.rowSpan() != null ? gi.rowSpan() : 1);
                entity.getGallery().add(ge);
            }
        }
        if (input.tags() != null) {
            entity.getTags().clear();
            entity.getTags().addAll(new ArrayList<>(input.tags()));
        }
    }

    private static String slugify(String input) {
        if (input == null) return UUID.randomUUID().toString().substring(0, 8);
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase();
        normalized = WHITESPACE.matcher(normalized).replaceAll("-");
        normalized = NON_LATIN.matcher(normalized).replaceAll("");
        return normalized.replaceAll("-+", "-").replaceAll("^-|-$", "");
    }

    private Exhibition toDto(ExhibitionEntity entity) {
        ImageCrop coverCrop = ImageCrop.ofNullable(entity.getCoverCropX(), entity.getCoverCropY(),
                                        entity.getCoverCropW(), entity.getCoverCropH());
        List<GalleryImage> gallery = entity.getGallery().stream()
                .map(e -> new GalleryImage(e.getUrl(), ImageCrop.ofNullable(e.getCropX(), e.getCropY(), e.getCropW(), e.getCropH()),
                        e.getColSpan() != null ? e.getColSpan() : 1,
                        e.getRowSpan() != null ? e.getRowSpan() : 1))
                .toList();
        String videoId = entity.getVideoId();
        Optional<VideoService.ResolvedVideo> resolved = videoId != null
                ? videoService.resolveForPublic(videoId)
                : Optional.empty();
        String videoUrl     = resolved.map(VideoService.ResolvedVideo::url).orElse(null);
        String videoPoster  = entity.getVideoPoster() != null
                ? entity.getVideoPoster()
                : resolved.map(VideoService.ResolvedVideo::posterUrl).orElse(null);
        Double durationSecs = resolved.map(VideoService.ResolvedVideo::durationSeconds).orElse(null);
        Integer width       = resolved.map(VideoService.ResolvedVideo::width).orElse(null);
        Integer height      = resolved.map(VideoService.ResolvedVideo::height).orElse(null);
        String videoHls     = resolved.map(VideoService.ResolvedVideo::hlsUrl).orElse(null);
        return new Exhibition(
                entity.getId(),
                entity.getTitle(),
                entity.getSlug(),
                entity.getVenue(),
                entity.getCity(),
                entity.getCountry(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getCoverImage(),
                coverCrop,
                gallery,
                entity.getCurator(),
                entity.getShortDescription(),
                entity.getDescription(),
                List.copyOf(entity.getTags()),
                entity.isFeatured(),
                entity.isShowStoryLink(),
                entity.isShowStoryButton(),
                List.of(),
                videoUrl,
                videoPoster,
                entity.getVideoCaptions(),
                videoId,
                durationSecs,
                width,
                height,
                videoHls
        );
    }
}
