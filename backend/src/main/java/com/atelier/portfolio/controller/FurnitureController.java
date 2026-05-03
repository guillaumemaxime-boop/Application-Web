package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Furniture;
import com.atelier.portfolio.service.FurnitureService;
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
@RequestMapping("/api/furniture")
public class FurnitureController {

    private final FurnitureService service;

    public FurnitureController(FurnitureService service) {
        this.service = service;
    }

    @GetMapping
    public List<Furniture> all() {
        return service.findAll();
    }

    @GetMapping("/featured")
    public List<Furniture> featured() {
        return service.findFeatured();
    }

    @GetMapping("/categories")
    public List<String> categories() {
        return service.categories();
    }

    @GetMapping("/{slug}")
    public ResponseEntity<Furniture> bySlug(@PathVariable String slug) {
        return service.findBySlug(slug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Furniture> create(@RequestBody Furniture input) {
        Furniture created = service.create(input);
        return ResponseEntity.created(URI.create("/api/furniture/" + created.slug())).body(created);
    }

    @PutMapping("/{slug}")
    public ResponseEntity<Furniture> update(@PathVariable String slug, @RequestBody Furniture input) {
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
