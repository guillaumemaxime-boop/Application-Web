package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Furniture;
import com.atelier.portfolio.service.FurnitureService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
