package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.ExhibitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExhibitionRepository extends JpaRepository<ExhibitionEntity, String> {

    List<ExhibitionEntity> findAllByOrderByStartDateDesc();

    List<ExhibitionEntity> findByFeaturedTrueOrderByStartDateDesc();

    Optional<ExhibitionEntity> findBySlug(String slug);

    boolean existsByVideoId(String videoId);

    List<ExhibitionEntity> findByVideoIdIsNotNull();
}
