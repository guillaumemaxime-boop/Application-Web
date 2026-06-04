package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.service.StoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/stories")
public class AdminStoriesController {

    private final StoryService stories;

    public AdminStoriesController(StoryService stories) {
        this.stories = stories;
    }

    @GetMapping
    public List<Story> list(@RequestParam String ownerKind, @RequestParam String ownerId) {
        validateKind(ownerKind);
        return stories.findByOwner(ownerKind, ownerId);
    }

    @PostMapping
    public ResponseEntity<Story> create(@Valid @RequestBody StoryInput input) {
        validateKind(input.ownerKind());
        return ResponseEntity.ok(stories.create(input));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Story> update(@PathVariable String id, @Valid @RequestBody StoryInput input) {
        validateKind(input.ownerKind());
        return ResponseEntity.ok(stories.update(id, input));
    }

    @PutMapping("/{id}/position")
    public ResponseEntity<Void> updatePosition(@PathVariable String id, @RequestParam int position) {
        stories.updatePosition(id, position);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        stories.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/slides")
    public List<Slide> getSlides(@PathVariable String id) {
        return stories.findSlidesByStoryId(id);
    }

    @PutMapping("/{id}/slides")
    public ResponseEntity<List<Slide>> replaceSlides(@PathVariable String id, @Valid @RequestBody List<Slide> slides) {
        return ResponseEntity.ok(stories.replaceSlides(id, slides));
    }

    private static void validateKind(String kind) {
        if (!"furniture".equals(kind) && !"exhibition".equals(kind)) {
            throw new IllegalArgumentException("Invalid kind: " + kind);
        }
    }
}
