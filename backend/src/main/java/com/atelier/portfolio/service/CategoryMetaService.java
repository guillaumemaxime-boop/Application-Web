package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.FurnitureCategoryMetaEntity;
import com.atelier.portfolio.repository.FurnitureCategoryMetaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class CategoryMetaService {

    public record CategoryView(String category, String coverImage, int position, boolean visible) {}

    private final FurnitureCategoryMetaRepository repository;

    public CategoryMetaService(FurnitureCategoryMetaRepository repository) {
        this.repository = repository;
    }

    public List<CategoryView> findAll() {
        return repository.findAllByOrderByPositionAsc().stream()
                .map(m -> new CategoryView(m.getCategory(), m.getCoverImage(), m.getPosition(), m.isVisible()))
                .toList();
    }

    @Transactional
    public Optional<CategoryView> update(String category, CategoryView input) {
        return repository.findById(category).map(existing -> {
            existing.setCoverImage(input.coverImage());
            existing.setPosition(input.position());
            existing.setVisible(input.visible());
            FurnitureCategoryMetaEntity saved = repository.save(existing);
            return new CategoryView(saved.getCategory(), saved.getCoverImage(), saved.getPosition(), saved.isVisible());
        });
    }

    @Transactional
    public CategoryView create(CategoryView input) {
        FurnitureCategoryMetaEntity e = new FurnitureCategoryMetaEntity();
        e.setCategory(input.category());
        e.setCoverImage(input.coverImage());
        e.setPosition(input.position());
        e.setVisible(input.visible());
        FurnitureCategoryMetaEntity saved = repository.save(e);
        return new CategoryView(saved.getCategory(), saved.getCoverImage(), saved.getPosition(), saved.isVisible());
    }
}
