package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.StorySlideEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StorySlideRepository extends JpaRepository<StorySlideEntity, String> {
    List<StorySlideEntity> findByOwnerKindAndOwnerIdOrderByPosition(String ownerKind, String ownerId);
    void deleteByOwnerKindAndOwnerId(String ownerKind, String ownerId);
}
