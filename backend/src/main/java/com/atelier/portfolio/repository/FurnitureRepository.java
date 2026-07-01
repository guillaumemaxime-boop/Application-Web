package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.FurnitureEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FurnitureRepository extends JpaRepository<FurnitureEntity, String> {

    List<FurnitureEntity> findByFeaturedTrue();

    Optional<FurnitureEntity> findBySlug(String slug);

    @Query("SELECT DISTINCT f.category FROM FurnitureEntity f ORDER BY f.category ASC")
    List<String> findDistinctCategories();

    boolean existsByVideoId(String videoId);
}
