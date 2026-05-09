package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.SiteContentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/content")
public class SiteContentController {

    private final SiteContentService service;

    public SiteContentController(SiteContentService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, String> getAll() {
        return service.findAll();
    }

    @PutMapping
    public Map<String, String> updateAll(@RequestBody Map<String, String> content) {
        return service.saveAll(content);
    }
}
