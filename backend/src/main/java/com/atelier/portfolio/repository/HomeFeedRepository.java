package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HomeFeedRepository extends JpaRepository<HomeFeedEntryEntity, Integer> {
    List<HomeFeedEntryEntity> findAllByOrderByPositionAsc();
}
