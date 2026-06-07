package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.StoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoryRepository extends JpaRepository<StoryEntity, String> {
    List<StoryEntity> findByOwnerKindAndOwnerIdOrderByPosition(String ownerKind, String ownerId);
    Optional<StoryEntity> findBySlug(String slug);
    void deleteByOwnerKindAndOwnerId(String ownerKind, String ownerId);
    boolean existsBySlug(String slug);
}
