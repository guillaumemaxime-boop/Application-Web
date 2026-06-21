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
@Table(name = "furniture")
public class FurnitureEntity {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false, length = 100)
    private String category;

    private String material;

    @Column(name = "year_made")
    private Integer year;

    @Column(name = "cover_image", length = 500)
    private String coverImage;

    @Column(name = "cover_crop_x") private Double coverCropX;
    @Column(name = "cover_crop_y") private Double coverCropY;
    @Column(name = "cover_crop_w") private Double coverCropW;
    @Column(name = "cover_crop_h") private Double coverCropH;

    @Column(name = "short_description", length = 1000)
    private String shortDescription;

    @Column(length = 4000)
    private String description;

    private String designer;

    @Column(nullable = false)
    private boolean featured;

    @Column(name = "show_story_link", nullable = false)
    private boolean showStoryLink = true;

    @Column(name = "show_story_button", nullable = false)
    private boolean showStoryButton = true;

    @Column(name = "video_id", length = 64)
    private String videoId;

    @Column(name = "video_poster", length = 500)
    private String videoPoster;

    @Column(name = "video_captions", length = 500)
    private String videoCaptions;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "furniture_gallery", joinColumns = @JoinColumn(name = "furniture_id"))
    @OrderColumn(name = "position")
    @BatchSize(size = 50)
    private List<GalleryEntry> gallery = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "furniture_dimension", joinColumns = @JoinColumn(name = "furniture_id"))
    @OrderColumn(name = "position")
    @Column(name = "entry_value", nullable = false)
    @BatchSize(size = 50)
    private List<String> dimensions = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "furniture_tag", joinColumns = @JoinColumn(name = "furniture_id"))
    @OrderColumn(name = "position")
    @Column(name = "entry_value", nullable = false)
    @BatchSize(size = 50)
    private List<String> tags = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

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

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDesigner() { return designer; }
    public void setDesigner(String designer) { this.designer = designer; }

    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }

    public boolean isShowStoryLink() { return showStoryLink; }
    public void setShowStoryLink(boolean showStoryLink) { this.showStoryLink = showStoryLink; }

    public boolean isShowStoryButton() { return showStoryButton; }
    public void setShowStoryButton(boolean showStoryButton) { this.showStoryButton = showStoryButton; }

    public String getVideoId() { return videoId; }
    public void setVideoId(String videoId) { this.videoId = videoId; }

    public String getVideoPoster() { return videoPoster; }
    public void setVideoPoster(String videoPoster) { this.videoPoster = videoPoster; }

    public String getVideoCaptions() { return videoCaptions; }
    public void setVideoCaptions(String videoCaptions) { this.videoCaptions = videoCaptions; }

    public List<GalleryEntry> getGallery() { return gallery; }
    public void setGallery(List<GalleryEntry> gallery) { this.gallery = gallery; }

    public List<String> getDimensions() { return dimensions; }
    public void setDimensions(List<String> dimensions) { this.dimensions = dimensions; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
