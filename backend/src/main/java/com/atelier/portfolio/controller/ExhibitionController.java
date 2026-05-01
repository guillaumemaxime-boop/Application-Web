package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Exhibition;
import com.atelier.portfolio.service.ExhibitionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
