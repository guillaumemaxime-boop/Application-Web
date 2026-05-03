package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Exhibition;
import com.atelier.portfolio.service.ExhibitionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/exhibitions")
public class ExhibitionController {

    private final ExhibitionService service;

    public ExhibitionController(ExhibitionService service) {
        this.service = service;
    }

    @GetMapping
    public List<Exhibition> all() {
        return service.findAll();
    }

    @GetMapping("/featured")
    public List<Exhibition> featured() {
        return service.findFeatured();
    }

    @GetMapping("/{slug}")
    public ResponseEntity<Exhibition> bySlug(@PathVariable String slug) {
        return service.findBySlug(slug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Exhibition> create(@RequestBody Exhibition input) {
        Exhibition created = service.create(input);
        return ResponseEntity.created(URI.create("/api/exhibitions/" + created.slug())).body(created);
    }

    @PutMapping("/{slug}")
    public ResponseEntity<Exhibition> update(@PathVariable String slug, @RequestBody Exhibition input) {
        return service.update(slug, input)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<Void> delete(@PathVariable String slug) {
        return service.deleteBySlug(slug)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
