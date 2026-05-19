package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ExhibitionMetaEntity;
import com.atelier.portfolio.repository.ExhibitionMetaRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ExhibitionMetaService {

    public record ExhibitionMetaView(String slug, int position, boolean visible) {}

    private final ExhibitionMetaRepository repository;

    public ExhibitionMetaService(ExhibitionMetaRepository repository) {
        this.repository = repository;
    }

    public List<ExhibitionMetaView> findAll() {
        return repository.findAllByOrderByPositionAsc().stream()
                .map(m -> new ExhibitionMetaView(m.getSlug(), m.getPosition(), m.isVisible()))
                .toList();
    }

    public List<ExhibitionMetaView> findVisible() {
        return repository.findByVisibleTrueOrderByPositionAsc().stream()
                .map(m -> new ExhibitionMetaView(m.getSlug(), m.getPosition(), m.isVisible()))
                .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public Optional<ExhibitionMetaView> update(String slug, ExhibitionMetaView input) {
        return repository.findById(slug).map(existing -> {
            existing.setPosition(input.position());
            existing.setVisible(input.visible());
            ExhibitionMetaEntity saved = repository.save(existing);
            return new ExhibitionMetaView(saved.getSlug(), saved.getPosition(), saved.isVisible());
        });
    }

    @Transactional
    public ExhibitionMetaView create(ExhibitionMetaView input) {
        ExhibitionMetaEntity e = new ExhibitionMetaEntity();
        e.setSlug(input.slug());
        e.setPosition(input.position());
        e.setVisible(input.visible());
        ExhibitionMetaEntity saved = repository.save(e);
        return new ExhibitionMetaView(saved.getSlug(), saved.getPosition(), saved.isVisible());
    }

    @Transactional
    public void ensureExists(String slug) {
        if (slug == null || slug.isBlank()) return;
        if (repository.existsById(slug)) return;
        int nextPos = repository.findMaxPosition() + 1;
        ExhibitionMetaEntity e = new ExhibitionMetaEntity();
        e.setSlug(slug);
        e.setPosition(nextPos);
        e.setVisible(true);
        repository.save(e);
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public void removeBySlug(String slug) {
        if (slug != null && repository.existsById(slug)) {
            repository.deleteById(slug);
        }
    }
}
