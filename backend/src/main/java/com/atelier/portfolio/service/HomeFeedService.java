package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import com.atelier.portfolio.model.ImageCrop;
import com.atelier.portfolio.repository.HomeFeedRepository;
import jakarta.persistence.EntityManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class HomeFeedService {

    public record FeedEntry(String kind, String slug) {}

    // Restreint le kind a la liste ferme des types autorises. Les valeurs
    // arrivent via l'API admin et seront utilisees pour join avec furniture
    // ou exhibition cote HomeService.
    private static final Set<String> ALLOWED_KINDS = Set.of("furniture", "exhibition");
    private static final int MAX_SLUG_LENGTH = 200;

    private final HomeFeedRepository repository;
    private final EntityManager entityManager;

    public HomeFeedService(HomeFeedRepository repository, EntityManager entityManager) {
        this.repository = repository;
        this.entityManager = entityManager;
    }

    public List<FeedEntry> getAll() {
        return repository.findAllByOrderByPositionAsc().stream()
                .map(e -> new FeedEntry(e.getKind(), e.getRefSlug()))
                .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public List<FeedEntry> replace(List<FeedEntry> entries) {
        validateEntries(entries);
        repository.deleteAllInBatch();
        // deleteAllInBatch passe outre le persistence context : on le vide pour
        // eviter une collision sur la PK quand on re-insere des entites a position=0..n.
        entityManager.flush();
        entityManager.clear();
        List<HomeFeedEntryEntity> toSave = new ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            HomeFeedEntryEntity e = new HomeFeedEntryEntity();
            e.setPosition(i);
            e.setKind(entries.get(i).kind());
            e.setRefSlug(entries.get(i).slug());
            toSave.add(e);
        }
        repository.saveAll(toSave);
        return getAll();
    }

    private static void validateEntries(List<FeedEntry> entries) {
        if (entries == null) return;
        for (FeedEntry e : entries) {
            if (e == null || e.kind() == null || !ALLOWED_KINDS.contains(e.kind())) {
                throw new IllegalArgumentException(
                        "kind invalide: " + (e == null ? "null" : e.kind()));
            }
            if (e.slug() == null || e.slug().isBlank() || e.slug().length() > MAX_SLUG_LENGTH) {
                throw new IllegalArgumentException(
                        "slug invalide: " + (e.slug() == null ? "null" : "len=" + e.slug().length()));
            }
        }
    }

    @Transactional
    public void appendIfNotPresent(String kind, String slug) {
        if (repository.existsByKindAndRefSlug(kind, slug)) return;
        int nextPos = repository.findMaxPosition() + 1;
        HomeFeedEntryEntity entry = new HomeFeedEntryEntity();
        entry.setPosition(nextPos);
        entry.setKind(kind);
        entry.setRefSlug(slug);
        repository.save(entry);
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public void setCoverCrop(String kind, String slug, ImageCrop crop) {
        HomeFeedEntryEntity entry = repository.findByKindAndRefSlug(kind, slug)
                .orElseThrow(() -> new IllegalArgumentException(
                        "entry introuvable pour kind=" + kind + " slug=" + slug));
        if (crop == null) {
            entry.setCoverCropX(null);
            entry.setCoverCropY(null);
            entry.setCoverCropW(null);
            entry.setCoverCropH(null);
        } else {
            entry.setCoverCropX(crop.x());
            entry.setCoverCropY(crop.y());
            entry.setCoverCropW(crop.w());
            entry.setCoverCropH(crop.h());
        }
        repository.save(entry);
    }

    @Transactional
    @CacheEvict(cacheNames = "home", allEntries = true)
    public void removeBySlug(String kind, String slug) {
        List<HomeFeedEntryEntity> all = repository.findAllByOrderByPositionAsc();
        List<HomeFeedEntryEntity> kept = all.stream()
                .filter(e -> !(kind.equals(e.getKind()) && slug.equals(e.getRefSlug())))
                .toList();
        if (kept.size() == all.size()) return;
        // Snapshot des donnees avant de purger : on libere ensuite le persistence context
        // pour permettre la re-insertion sur les memes valeurs de PK (position).
        List<FeedEntry> snapshot = kept.stream()
                .map(e -> new FeedEntry(e.getKind(), e.getRefSlug()))
                .toList();
        repository.deleteAllInBatch();
        entityManager.flush();
        entityManager.clear();
        List<HomeFeedEntryEntity> toSave = new ArrayList<>();
        for (int i = 0; i < snapshot.size(); i++) {
            HomeFeedEntryEntity e = new HomeFeedEntryEntity();
            e.setPosition(i);
            e.setKind(snapshot.get(i).kind());
            e.setRefSlug(snapshot.get(i).slug());
            toSave.add(e);
        }
        repository.saveAll(toSave);
    }
}
