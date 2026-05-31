package com.atelier.portfolio.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "photo")
public class PhotoEntity {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false)
    private String filename;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(name = "uploaded_at", nullable = false, length = 50)
    private String uploadedAt;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "photo_tag", joinColumns = @JoinColumn(name = "photo_id"))
    @OrderColumn(name = "position")
    @Column(name = "entry_value", length = 100, nullable = false)
    @BatchSize(size = 50)
    private List<String> tags = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(String uploadedAt) { this.uploadedAt = uploadedAt; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
