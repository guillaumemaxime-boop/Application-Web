package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.SiteContentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteContentRepository extends JpaRepository<SiteContentEntity, String> {
}
