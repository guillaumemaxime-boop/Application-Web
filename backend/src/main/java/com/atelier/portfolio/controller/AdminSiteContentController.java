package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.SiteContentService;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Mutation de site_content sous /api/admin/** : route authentifiee par
 * SecurityConfig (anyRequest authenticated derriere /api/admin/**).
 * Le GET public reste expose par {@link SiteContentController}.
 */
@RestController
@RequestMapping("/api/admin/content")
public class AdminSiteContentController {

    private final SiteContentService service;

    public AdminSiteContentController(SiteContentService service) {
        this.service = service;
    }

    @PutMapping
    public Map<String, String> updateAll(@RequestBody Map<String, String> content) {
        return service.saveAll(content);
    }
}
