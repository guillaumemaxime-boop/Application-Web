package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.NewsSlider;
import com.atelier.portfolio.model.NewsSliderInput;
import com.atelier.portfolio.service.NewsSliderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/sliders")
public class AdminSlidersController {

    private final NewsSliderService service;

    public AdminSlidersController(NewsSliderService service) {
        this.service = service;
    }

    @GetMapping
    public List<NewsSlider> list() { return service.findAll(); }

    @PostMapping
    public ResponseEntity<NewsSlider> create(@Valid @RequestBody NewsSliderInput input) {
        return ResponseEntity.ok(service.create(input));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NewsSlider> update(@PathVariable String id, @Valid @RequestBody NewsSliderInput input) {
        return ResponseEntity.ok(service.update(id, input));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/stories")
    public ResponseEntity<NewsSlider> replaceStories(@PathVariable String id, @RequestBody Map<String, List<String>> body) {
        List<String> storyIds = body.getOrDefault("storyIds", List.of());
        return ResponseEntity.ok(service.replaceStories(id, storyIds));
    }
}
