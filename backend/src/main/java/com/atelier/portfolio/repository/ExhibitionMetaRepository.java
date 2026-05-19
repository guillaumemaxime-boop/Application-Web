package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.ExhibitionMetaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ExhibitionMetaRepository extends JpaRepository<ExhibitionMetaEntity, String> {
    List<ExhibitionMetaEntity> findAllByOrderByPositionAsc();
    List<ExhibitionMetaEntity> findByVisibleTrueOrderByPositionAsc();
    @Query("SELECT COALESCE(MAX(e.position), -1) FROM ExhibitionMetaEntity e")
    int findMaxPosition();
}
