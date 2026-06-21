package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.VideoEntity;
import com.atelier.portfolio.entity.VideoStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VideoRepository extends JpaRepository<VideoEntity, String> {
    List<VideoEntity> findByStatus(VideoStatus status);
}
