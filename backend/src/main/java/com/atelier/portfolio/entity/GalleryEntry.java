package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class GalleryEntry {

    @Column(name = "url", length = 500, nullable = false)
    private String url;

    @Column(name = "crop_x") private Double cropX;
    @Column(name = "crop_y") private Double cropY;
    @Column(name = "crop_w") private Double cropW;
    @Column(name = "crop_h") private Double cropH;

    public GalleryEntry() {}

    public GalleryEntry(String url) { this.url = url; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public Double getCropX() { return cropX; }
    public void setCropX(Double cropX) { this.cropX = cropX; }

    public Double getCropY() { return cropY; }
    public void setCropY(Double cropY) { this.cropY = cropY; }

    public Double getCropW() { return cropW; }
    public void setCropW(Double cropW) { this.cropW = cropW; }

    public Double getCropH() { return cropH; }
    public void setCropH(Double cropH) { this.cropH = cropH; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof GalleryEntry that)) return false;
        return java.util.Objects.equals(url, that.url)
            && java.util.Objects.equals(cropX, that.cropX)
            && java.util.Objects.equals(cropY, that.cropY)
            && java.util.Objects.equals(cropW, that.cropW)
            && java.util.Objects.equals(cropH, that.cropH);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(url, cropX, cropY, cropW, cropH);
    }
}
