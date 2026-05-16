package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.ContactRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactRequestRepository extends JpaRepository<ContactRequestEntity, String> {
}
