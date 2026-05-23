package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.MailSettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MailSettingsRepository extends JpaRepository<MailSettingsEntity, String> {
}
