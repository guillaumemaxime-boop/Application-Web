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
}
