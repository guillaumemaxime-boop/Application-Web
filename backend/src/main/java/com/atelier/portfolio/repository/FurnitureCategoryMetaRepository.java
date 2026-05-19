package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.FurnitureCategoryMetaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface FurnitureCategoryMetaRepository extends JpaRepository<FurnitureCategoryMetaEntity, String> {
    List<FurnitureCategoryMetaEntity> findAllByOrderByPositionAsc();
    List<FurnitureCategoryMetaEntity> findByVisibleTrueOrderByPositionAsc();
    @Query("SELECT COALESCE(MAX(e.position), -1) FROM FurnitureCategoryMetaEntity e")
    int findMaxPosition();
}
