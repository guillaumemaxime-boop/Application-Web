package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import com.atelier.portfolio.repository.HomeFeedRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class HomeFeedService {

    public record FeedEntry(String kind, String slug) {}

    private final HomeFeedRepository repository;

    public HomeFeedService(HomeFeedRepository repository) {
        this.repository = repository;
    }

    public List<FeedEntry> getAll() {
        return repository.findAllByOrderByPositionAsc().stream()
                .map(e -> new FeedEntry(e.getKind(), e.getRefSlug()))
                .toList();
    }

    @Transactional
    public List<FeedEntry> replace(List<FeedEntry> entries) {
        repository.deleteAllInBatch();
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

    @Transactional
    public void appendIfNotPresent(String kind, String slug) {
        boolean exists = repository.findAll().stream()
                .anyMatch(e -> kind.equals(e.getKind()) && slug.equals(e.getRefSlug()));
        if (exists) return;
        int nextPos = repository.findAll().stream()
                .mapToInt(HomeFeedEntryEntity::getPosition)
                .max().orElse(-1) + 1;
        HomeFeedEntryEntity entry = new HomeFeedEntryEntity();
        entry.setPosition(nextPos);
        entry.setKind(kind);
        entry.setRefSlug(slug);
        repository.save(entry);
    }

    @Transactional
    public void removeBySlug(String kind, String slug) {
        List<HomeFeedEntryEntity> all = repository.findAllByOrderByPositionAsc();
        List<HomeFeedEntryEntity> kept = all.stream()
                .filter(e -> !(kind.equals(e.getKind()) && slug.equals(e.getRefSlug())))
                .toList();
        if (kept.size() == all.size()) return;
        repository.deleteAllInBatch();
        List<HomeFeedEntryEntity> toSave = new ArrayList<>();
        for (int i = 0; i < kept.size(); i++) {
            HomeFeedEntryEntity e = new HomeFeedEntryEntity();
            e.setPosition(i);
            e.setKind(kept.get(i).getKind());
            e.setRefSlug(kept.get(i).getRefSlug());
            toSave.add(e);
        }
        repository.saveAll(toSave);
    }
}
