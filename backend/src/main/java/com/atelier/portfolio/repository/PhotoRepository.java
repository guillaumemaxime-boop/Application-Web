package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.PhotoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PhotoRepository extends JpaRepository<PhotoEntity, String> {

    Optional<PhotoEntity> findByFilename(String filename);
}
