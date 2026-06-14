package com.atelier.portfolio.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "story_slide")
public class StorySlideEntity {

    @Id
    @Column(length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private StoryEntity story;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(length = 500)
    private String src;

    @Column(length = 500)
    private String caption;

    @Column(name = "quote_body", length = 2000)
    private String quoteBody;

    @Column(name = "quote_cite", length = 500)
    private String quoteCite;

    @Column(name = "link_label", length = 200)
    private String linkLabel;

    @Column(name = "link_desc", length = 500)
    private String linkDesc;

    @Column(name = "link_href", length = 500)
    private String linkHref;

    @Column(name = "image_crop_x")
    private Double imageCropX;

    @Column(name = "image_crop_y")
    private Double imageCropY;

    @Column(name = "image_crop_w")
    private Double imageCropW;

    @Column(name = "image_crop_h")
    private Double imageCropH;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "story_slide_spec", joinColumns = @JoinColumn(name = "story_slide_id"))
    @OrderColumn(name = "position")
    private List<StorySlideSpecEntry> specs = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public StoryEntity getStory() { return story; }
    public void setStory(StoryEntity story) { this.story = story; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSrc() { return src; }
    public void setSrc(String src) { this.src = src; }

    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }

    public String getQuoteBody() { return quoteBody; }
    public void setQuoteBody(String quoteBody) { this.quoteBody = quoteBody; }

    public String getQuoteCite() { return quoteCite; }
    public void setQuoteCite(String quoteCite) { this.quoteCite = quoteCite; }

    public String getLinkLabel() { return linkLabel; }
    public void setLinkLabel(String linkLabel) { this.linkLabel = linkLabel; }

    public String getLinkDesc() { return linkDesc; }
    public void setLinkDesc(String linkDesc) { this.linkDesc = linkDesc; }

    public String getLinkHref() { return linkHref; }
    public void setLinkHref(String linkHref) { this.linkHref = linkHref; }

    public Double getImageCropX() { return imageCropX; }
    public void setImageCropX(Double imageCropX) { this.imageCropX = imageCropX; }

    public Double getImageCropY() { return imageCropY; }
    public void setImageCropY(Double imageCropY) { this.imageCropY = imageCropY; }

    public Double getImageCropW() { return imageCropW; }
    public void setImageCropW(Double imageCropW) { this.imageCropW = imageCropW; }

    public Double getImageCropH() { return imageCropH; }
    public void setImageCropH(Double imageCropH) { this.imageCropH = imageCropH; }

    public List<StorySlideSpecEntry> getSpecs() { return specs; }
    public void setSpecs(List<StorySlideSpecEntry> specs) { this.specs = specs; }
}
