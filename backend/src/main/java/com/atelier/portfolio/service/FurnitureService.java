package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.FurnitureEntity;
import com.atelier.portfolio.entity.GalleryEntry;
import com.atelier.portfolio.model.Furniture;
import com.atelier.portfolio.model.GalleryImage;
import com.atelier.portfolio.model.ImageCrop;
import com.atelier.portfolio.repository.FurnitureRepository;
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
public class FurnitureService {

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]+");

    private final FurnitureRepository repository;
    private final StoryService storyService;
    private final HomeFeedService homeFeedService;
    private final CategoryMetaService categoryMetaService;
    private final VideoService videoService;

    public FurnitureService(FurnitureRepository repository,
                            StoryService storyService,
                            HomeFeedService homeFeedService,
                            CategoryMetaService categoryMetaService,
                            VideoService videoService) {
        this.repository = repository;
        this.storyService = storyService;
        this.homeFeedService = homeFeedService;
        this.categoryMetaService = categoryMetaService;
        this.videoService = videoService;
    }

    public List<Furniture> findAll() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    public List<Furniture> findFeatured() {
        return repository.findByFeaturedTrue().stream().map(this::toDto).toList();
    }

    public Optional<Furniture> findBySlug(String slug) {
        return repository.findBySlug(slug).map(entity -> {
            Furniture base = toDto(entity);
            return new Furniture(
                    base.id(), base.title(), base.slug(), base.category(), base.material(),
                    base.year(), base.coverImage(), base.coverCrop(),
                    base.gallery(), base.shortDescription(),
                    base.description(), base.dimensions(), base.designer(), base.featured(),
                    base.showStoryLink(),
                    base.showStoryButton(),
                    storyService.findSlidesForOwner("furniture", entity.getId()),
                    base.tags(),
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

    public List<String> categories() {
        return repository.findDistinctCategories();
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public Furniture create(Furniture input) {
        FurnitureEntity entity = new FurnitureEntity();
        String id = (input.id() == null || input.id().isBlank()) ? "f-" + UUID.randomUUID().toString().substring(0, 8) : input.id();
        entity.setId(id);
        applyChanges(entity, input);
        if (entity.getSlug() == null || entity.getSlug().isBlank()) {
            entity.setSlug(slugify(entity.getTitle()));
        }
        FurnitureEntity saved = repository.save(entity);
        categoryMetaService.ensureExists(saved.getCategory(), saved.getCoverImage());
        homeFeedService.appendIfNotPresent("furniture", saved.getSlug());
        return toDto(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public Optional<Furniture> update(String slug, Furniture input) {
        return repository.findBySlug(slug).map(entity -> {
            String oldVideoId = entity.getVideoId();
            applyChanges(entity, input);
            Furniture result = toDto(repository.save(entity));
            if (oldVideoId != null && !oldVideoId.equals(input.videoId())) {
                try { videoService.deleteIfUnreferenced(oldVideoId); } catch (Exception ignored) {}
            }
            return result;
        });
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public boolean deleteBySlug(String slug) {
        return repository.findBySlug(slug).map(entity -> {
            String vid = entity.getVideoId();
            storyService.deleteAllForOwner("furniture", entity.getId());
            homeFeedService.removeBySlug("furniture", entity.getSlug());
            repository.delete(entity);
            if (vid != null) { try { videoService.deleteIfUnreferenced(vid); } catch (Exception ignored) {} }
            return true;
        }).orElse(false);
    }

    private static void applyChanges(FurnitureEntity entity, Furniture input) {
        if (input.title() != null) entity.setTitle(input.title());
        if (input.slug() != null && !input.slug().isBlank()) entity.setSlug(input.slug());
        if (input.category() != null) entity.setCategory(input.category());
        if (input.material() != null) entity.setMaterial(input.material());
        if (input.year() != null) entity.setYear(input.year());
        if (input.coverImage() != null) entity.setCoverImage(input.coverImage());
        // coverCrop : null = reset (centrer par defaut cote affichage)
        ImageCrop c = input.coverCrop();
        entity.setCoverCropX(c != null ? c.x() : null);
        entity.setCoverCropY(c != null ? c.y() : null);
        entity.setCoverCropW(c != null ? c.w() : null);
        entity.setCoverCropH(c != null ? c.h() : null);
        if (input.shortDescription() != null) entity.setShortDescription(input.shortDescription());
        if (input.description() != null) entity.setDescription(input.description());
        if (input.designer() != null) entity.setDesigner(input.designer());
        entity.setFeatured(input.featured());
        entity.setShowStoryLink(input.showStoryLink());
        entity.setShowStoryButton(input.showStoryButton());
        // video : set inconditionnel (null = retrait, comme coverCrop)
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
        if (input.dimensions() != null) {
            entity.getDimensions().clear();
            entity.getDimensions().addAll(new ArrayList<>(input.dimensions()));
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

    private Furniture toDto(FurnitureEntity entity) {
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
        return new Furniture(
                entity.getId(),
                entity.getTitle(),
                entity.getSlug(),
                entity.getCategory(),
                entity.getMaterial(),
                entity.getYear(),
                entity.getCoverImage(),
                coverCrop,
                gallery,
                entity.getShortDescription(),
                entity.getDescription(),
                List.copyOf(entity.getDimensions()),
                entity.getDesigner(),
                entity.isFeatured(),
                entity.isShowStoryLink(),
                entity.isShowStoryButton(),
                List.of(),
                List.copyOf(entity.getTags()),
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
