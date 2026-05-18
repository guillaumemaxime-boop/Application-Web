package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "furniture_category_meta")
public class FurnitureCategoryMetaEntity {

    @Id
    @Column(length = 100)
    private String category;

    @Column(name = "cover_image", nullable = false, length = 500)
    private String coverImage;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean visible = true;

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }
}
