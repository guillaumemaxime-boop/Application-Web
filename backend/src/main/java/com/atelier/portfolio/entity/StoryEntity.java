package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "story")
public class StoryEntity {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "owner_kind", nullable = false, length = 20)
    private String ownerKind;

    @Column(name = "owner_id", nullable = false, length = 50)
    private String ownerId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "cover_image", nullable = false, length = 500)
    private String coverImage;

    @Column(name = "cover_crop_x") private Double coverCropX;
    @Column(name = "cover_crop_y") private Double coverCropY;
    @Column(name = "cover_crop_w") private Double coverCropW;
    @Column(name = "cover_crop_h") private Double coverCropH;

    @Column(nullable = false, unique = true, length = 200)
    private String slug;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOwnerKind() { return ownerKind; }
    public void setOwnerKind(String ownerKind) { this.ownerKind = ownerKind; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }

    public Double getCoverCropX() { return coverCropX; }
    public void setCoverCropX(Double coverCropX) { this.coverCropX = coverCropX; }

    public Double getCoverCropY() { return coverCropY; }
    public void setCoverCropY(Double coverCropY) { this.coverCropY = coverCropY; }

    public Double getCoverCropW() { return coverCropW; }
    public void setCoverCropW(Double coverCropW) { this.coverCropW = coverCropW; }

    public Double getCoverCropH() { return coverCropH; }
    public void setCoverCropH(Double coverCropH) { this.coverCropH = coverCropH; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
