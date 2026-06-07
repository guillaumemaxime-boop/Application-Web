package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.NewsSliderEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NewsSliderRepository extends JpaRepository<NewsSliderEntity, String> {
    Optional<NewsSliderEntity> findByZoneKey(String zoneKey);
    List<NewsSliderEntity> findAllByZoneKeyIsNotNull();
    boolean existsBySlug(String slug);
}
