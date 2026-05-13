package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.CategoryMetaService;
import com.atelier.portfolio.service.CategoryMetaService.CategoryView;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/categories")
public class AdminCategoriesController {

    private final CategoryMetaService service;

    public AdminCategoriesController(CategoryMetaService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoryView> all() {
        return service.findAll();
    }

    @PutMapping("/{category}")
    public ResponseEntity<CategoryView> update(@PathVariable String category, @RequestBody CategoryView input) {
        return service.update(category, input)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(service.create(input)));
    }
}
