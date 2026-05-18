package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.service.StoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/slides")
public class AdminStoriesController {

    private final StoryService stories;

    public AdminStoriesController(StoryService stories) {
        this.stories = stories;
    }

    @GetMapping("/{kind}/{ownerId}")
    public List<Slide> get(@PathVariable String kind, @PathVariable String ownerId) {
        validateKind(kind);
        return stories.findByOwner(kind, ownerId);
    }

    @PutMapping("/{kind}/{ownerId}")
    public ResponseEntity<List<Slide>> replace(@PathVariable String kind,
                                                @PathVariable String ownerId,
                                                @Valid @RequestBody List<Slide> slides) {
        validateKind(kind);
        stories.replaceSlides(kind, ownerId, slides);
        return ResponseEntity.ok(stories.findByOwner(kind, ownerId));
    }

    private static void validateKind(String kind) {
        if (!"furniture".equals(kind) && !"exhibition".equals(kind)) {
            throw new IllegalArgumentException("Invalid kind: " + kind);
        }
    }
}
