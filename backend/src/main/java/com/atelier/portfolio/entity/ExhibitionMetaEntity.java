package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "exhibition_meta")
public class ExhibitionMetaEntity {

    @Id
    @Column(length = 200)
    private String slug;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean visible = true;

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }
}
