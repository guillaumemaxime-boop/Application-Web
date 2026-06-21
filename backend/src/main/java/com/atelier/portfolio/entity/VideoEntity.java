package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "video")
public class VideoEntity {

    @Id
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VideoStatus status;

    @Column(name = "source_filename")
    private String sourceFilename;

    @Column(name = "output_filename")
    private String outputFilename;

    @Column(name = "poster_filename")
    private String posterFilename;

    @Column(name = "duration_seconds")
    private Double durationSeconds;

    private Integer width;

    private Integer height;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "original_name")
    private String originalName;

    @Column(name = "created_at", length = 40)
    private String createdAt;

    @Column(name = "updated_at", length = 40)
    private String updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public VideoStatus getStatus() { return status; }
    public void setStatus(VideoStatus status) { this.status = status; }

    public String getSourceFilename() { return sourceFilename; }
    public void setSourceFilename(String sourceFilename) { this.sourceFilename = sourceFilename; }

    public String getOutputFilename() { return outputFilename; }
    public void setOutputFilename(String outputFilename) { this.outputFilename = outputFilename; }

    public String getPosterFilename() { return posterFilename; }
    public void setPosterFilename(String posterFilename) { this.posterFilename = posterFilename; }

    public Double getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Double durationSeconds) { this.durationSeconds = durationSeconds; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
