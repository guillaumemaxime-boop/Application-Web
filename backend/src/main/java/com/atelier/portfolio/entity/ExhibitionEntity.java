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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "exhibition")
public class ExhibitionEntity {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    private String venue;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String country;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "cover_image", length = 500)
    private String coverImage;

    @Column(name = "cover_crop_x") private Double coverCropX;
    @Column(name = "cover_crop_y") private Double coverCropY;
    @Column(name = "cover_crop_w") private Double coverCropW;
    @Column(name = "cover_crop_h") private Double coverCropH;

    private String curator;

    @Column(name = "short_description", length = 1000)
    private String shortDescription;

    @Column(length = 4000)
    private String description;

    @Column(nullable = false)
    private boolean featured;

    @Column(name = "show_story_link", nullable = false)
    private boolean showStoryLink = true;

    @Column(name = "show_story_button", nullable = false)
    private boolean showStoryButton = true;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Column(name = "video_poster", length = 500)
    private String videoPoster;

    @Column(name = "video_captions", length = 500)
    private String videoCaptions;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "exhibition_gallery", joinColumns = @JoinColumn(name = "exhibition_id"))
    @OrderColumn(name = "position")
    @BatchSize(size = 50)
    private List<GalleryEntry> gallery = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "exhibition_tag", joinColumns = @JoinColumn(name = "exhibition_id"))
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

    public String getVenue() { return venue; }
    public void setVenue(String venue) { this.venue = venue; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

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

    public String getCurator() { return curator; }
    public void setCurator(String curator) { this.curator = curator; }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }

    public boolean isShowStoryLink() { return showStoryLink; }
    public void setShowStoryLink(boolean showStoryLink) { this.showStoryLink = showStoryLink; }

    public boolean isShowStoryButton() { return showStoryButton; }
    public void setShowStoryButton(boolean showStoryButton) { this.showStoryButton = showStoryButton; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getVideoPoster() { return videoPoster; }
    public void setVideoPoster(String videoPoster) { this.videoPoster = videoPoster; }

    public String getVideoCaptions() { return videoCaptions; }
    public void setVideoCaptions(String videoCaptions) { this.videoCaptions = videoCaptions; }

    public List<GalleryEntry> getGallery() { return gallery; }
    public void setGallery(List<GalleryEntry> gallery) { this.gallery = gallery; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
