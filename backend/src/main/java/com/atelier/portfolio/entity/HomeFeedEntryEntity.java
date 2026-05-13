package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "home_feed")
public class HomeFeedEntryEntity {

    @Id
    private int position;

    @Column(nullable = false, length = 20)
    private String kind;

    @Column(name = "ref_slug", nullable = false, length = 200)
    private String refSlug;

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getRefSlug() { return refSlug; }
    public void setRefSlug(String refSlug) { this.refSlug = refSlug; }
}
