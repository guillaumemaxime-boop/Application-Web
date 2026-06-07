package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryWithSlides;
import com.atelier.portfolio.service.StoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stories")
public class StoryController {

    private final StoryService stories;

    public StoryController(StoryService stories) {
        this.stories = stories;
    }

    @GetMapping
    public List<Story> list(@RequestParam String ownerKind, @RequestParam String ownerId) {
        return stories.findByOwner(ownerKind, ownerId);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<StoryWithSlides> bySlug(@PathVariable String slug) {
        return stories.findBySlugWithSlides(slug)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
