package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.ExhibitionMetaService;
import com.atelier.portfolio.service.ExhibitionMetaService.ExhibitionMetaView;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/exhibitions-meta")
public class AdminExhibitionsMetaController {

    private final ExhibitionMetaService service;

    public AdminExhibitionsMetaController(ExhibitionMetaService service) {
        this.service = service;
    }

    @GetMapping
    public List<ExhibitionMetaView> all() {
        return service.findAll();
    }

    @PutMapping("/{slug}")
    public ResponseEntity<ExhibitionMetaView> update(@PathVariable String slug, @RequestBody ExhibitionMetaView input) {
        return service.update(slug, input)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(service.create(input)));
    }
}
