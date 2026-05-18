package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.ExhibitionMetaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExhibitionMetaRepository extends JpaRepository<ExhibitionMetaEntity, String> {
    List<ExhibitionMetaEntity> findAllByOrderByPositionAsc();
    List<ExhibitionMetaEntity> findByVisibleTrueOrderByPositionAsc();
}
