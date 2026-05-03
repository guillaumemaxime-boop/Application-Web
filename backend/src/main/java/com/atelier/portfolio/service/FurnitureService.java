package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.FurnitureEntity;
import com.atelier.portfolio.model.Furniture;
import com.atelier.portfolio.repository.FurnitureRepository;
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

    public FurnitureService(FurnitureRepository repository) {
        this.repository = repository;
    }

    public List<Furniture> findAll() {
        return repository.findAll().stream().map(FurnitureService::toDto).toList();
    }

    public List<Furniture> findFeatured() {
        return repository.findByFeaturedTrue().stream().map(FurnitureService::toDto).toList();
    }

    public Optional<Furniture> findBySlug(String slug) {
        return repository.findBySlug(slug).map(FurnitureService::toDto);
    }

    public List<String> categories() {
        return repository.findDistinctCategories();
    }

    @Transactional
    public Furniture create(Furniture input) {
        FurnitureEntity entity = new FurnitureEntity();
        String id = (input.id() == null || input.id().isBlank()) ? "f-" + UUID.randomUUID().toString().substring(0, 8) : input.id();
        entity.setId(id);
        applyChanges(entity, input);
        if (entity.getSlug() == null || entity.getSlug().isBlank()) {
            entity.setSlug(slugify(entity.getTitle()));
        }
        return toDto(repository.save(entity));
    }

    @Transactional
    public Optional<Furniture> update(String slug, Furniture input) {
        return repository.findBySlug(slug).map(entity -> {
            applyChanges(entity, input);
            return toDto(repository.save(entity));
        });
    }

    @Transactional
    public boolean deleteBySlug(String slug) {
        return repository.findBySlug(slug).map(entity -> {
            repository.delete(entity);
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
        if (input.shortDescription() != null) entity.setShortDescription(input.shortDescription());
        if (input.description() != null) entity.setDescription(input.description());
        if (input.designer() != null) entity.setDesigner(input.designer());
        entity.setFeatured(input.featured());
        if (input.gallery() != null) {
            entity.getGallery().clear();
            entity.getGallery().addAll(new ArrayList<>(input.gallery()));
        }
        if (input.dimensions() != null) {
            entity.getDimensions().clear();
            entity.getDimensions().addAll(new ArrayList<>(input.dimensions()));
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

    private static Furniture toDto(FurnitureEntity entity) {
        return new Furniture(
                entity.getId(),
                entity.getTitle(),
                entity.getSlug(),
                entity.getCategory(),
                entity.getMaterial(),
                entity.getYear(),
                entity.getCoverImage(),
                List.copyOf(entity.getGallery()),
                entity.getShortDescription(),
                entity.getDescription(),
                List.copyOf(entity.getDimensions()),
                entity.getDesigner(),
                entity.isFeatured()
        );
    }
}
