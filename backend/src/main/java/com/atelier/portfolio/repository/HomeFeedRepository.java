package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface HomeFeedRepository extends JpaRepository<HomeFeedEntryEntity, Integer> {
    List<HomeFeedEntryEntity> findAllByOrderByPositionAsc();
    boolean existsByKindAndRefSlug(String kind, String refSlug);
    @Query("SELECT COALESCE(MAX(e.position), -1) FROM HomeFeedEntryEntity e")
    int findMaxPosition();
}
