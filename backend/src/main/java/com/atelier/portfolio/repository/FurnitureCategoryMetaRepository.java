package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.FurnitureCategoryMetaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FurnitureCategoryMetaRepository extends JpaRepository<FurnitureCategoryMetaEntity, String> {
    List<FurnitureCategoryMetaEntity> findAllByOrderByPositionAsc();
    List<FurnitureCategoryMetaEntity> findByVisibleTrueOrderByPositionAsc();
}
