package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.SiteContentEntity;
import com.atelier.portfolio.repository.SiteContentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SiteContentService {

    private final SiteContentRepository repository;

    public SiteContentService(SiteContentRepository repository) {
        this.repository = repository;
    }

    public Map<String, String> findAll() {
        return repository.findAll().stream()
                .collect(Collectors.toMap(SiteContentEntity::getKey, SiteContentEntity::getValue));
    }

    public String get(String key, String defaultValue) {
        return repository.findById(key)
                .map(SiteContentEntity::getValue)
                .orElse(defaultValue);
    }

    @Transactional
    public Map<String, String> saveAll(Map<String, String> entries) {
        var entities = entries.entrySet().stream()
                .map(e -> {
                    SiteContentEntity entity = new SiteContentEntity();
                    entity.setKey(e.getKey());
                    entity.setValue(e.getValue());
                    return entity;
                })
                .toList();
        repository.saveAll(entities);
        return findAll();
    }
}
