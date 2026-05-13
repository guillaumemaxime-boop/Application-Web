package com.atelier.portfolio.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = Slide.CoverSlide.class, name = "cover"),
        @JsonSubTypes.Type(value = Slide.ImageSlide.class, name = "image"),
        @JsonSubTypes.Type(value = Slide.SpecSlide.class, name = "spec"),
        @JsonSubTypes.Type(value = Slide.QuoteSlide.class, name = "quote"),
        @JsonSubTypes.Type(value = Slide.LinkSlide.class, name = "link")
})
public sealed interface Slide
        permits Slide.CoverSlide, Slide.ImageSlide, Slide.SpecSlide, Slide.QuoteSlide, Slide.LinkSlide {

    String id();
    int position();

    record CoverSlide(
            @Size(max = 50) String id,
            int position,
            @NotBlank @Size(max = 500) String src
    ) implements Slide {}

    record ImageSlide(
            @Size(max = 50) String id,
            int position,
            @NotBlank @Size(max = 500) String src,
            @Size(max = 500) String caption
    ) implements Slide {}

    record SpecSlide(
            @Size(max = 50) String id,
            int position,
            List<SpecEntry> specs
    ) implements Slide {}

    record QuoteSlide(
            @Size(max = 50) String id,
            int position,
            @NotBlank @Size(max = 2000) String body,
            @Size(max = 500) String cite
    ) implements Slide {}

    record LinkSlide(
            @Size(max = 50) String id,
            int position,
            @Size(max = 200) String label,
            @Size(max = 500) String description,
            @Size(max = 500) String href
    ) implements Slide {}
}
