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

    @Column(name = "cover_crop_x")
    private Double coverCropX;

    @Column(name = "cover_crop_y")
    private Double coverCropY;

    @Column(name = "cover_crop_w")
    private Double coverCropW;

    @Column(name = "cover_crop_h")
    private Double coverCropH;

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getRefSlug() { return refSlug; }
    public void setRefSlug(String refSlug) { this.refSlug = refSlug; }
    public Double getCoverCropX() { return coverCropX; }
    public void setCoverCropX(Double coverCropX) { this.coverCropX = coverCropX; }
    public Double getCoverCropY() { return coverCropY; }
    public void setCoverCropY(Double coverCropY) { this.coverCropY = coverCropY; }
    public Double getCoverCropW() { return coverCropW; }
    public void setCoverCropW(Double coverCropW) { this.coverCropW = coverCropW; }
    public Double getCoverCropH() { return coverCropH; }
    public void setCoverCropH(Double coverCropH) { this.coverCropH = coverCropH; }
}
