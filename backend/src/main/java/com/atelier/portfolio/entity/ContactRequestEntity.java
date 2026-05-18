package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "contact_request")
public class ContactRequestEntity {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "created_at", nullable = false, length = 50)
    private String createdAt;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 300)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(nullable = false, length = 30)
    private String interest;

    @Column(nullable = false, length = 5000)
    private String message;

    @Column(name = "furniture_id", length = 50)
    private String furnitureId;

    @Column(name = "furniture_slug", length = 200)
    private String furnitureSlug;

    @Column(name = "furniture_title", length = 500)
    private String furnitureTitle;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "mail_sent", nullable = false)
    private boolean mailSent;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getInterest() { return interest; }
    public void setInterest(String interest) { this.interest = interest; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getFurnitureId() { return furnitureId; }
    public void setFurnitureId(String furnitureId) { this.furnitureId = furnitureId; }

    public String getFurnitureSlug() { return furnitureSlug; }
    public void setFurnitureSlug(String furnitureSlug) { this.furnitureSlug = furnitureSlug; }

    public String getFurnitureTitle() { return furnitureTitle; }
    public void setFurnitureTitle(String furnitureTitle) { this.furnitureTitle = furnitureTitle; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isMailSent() { return mailSent; }
    public void setMailSent(boolean mailSent) { this.mailSent = mailSent; }
}
