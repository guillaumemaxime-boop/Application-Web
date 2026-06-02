package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.HomeFeedService;
import com.atelier.portfolio.service.HomeFeedService.FeedEntry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/home")
public class AdminHomeController {

    private final HomeFeedService feed;

    public AdminHomeController(HomeFeedService feed) {
        this.feed = feed;
    }

    @GetMapping("/feed")
    public List<FeedEntry> get() {
        return feed.getAll();
    }

    @PutMapping("/feed")
    public List<FeedEntry> replace(@RequestBody List<FeedEntry> entries) {
        return feed.replace(entries);
    }

    /**
     * HomeFeedService.replace() leve IllegalArgumentException pour kind/slug
     * invalides — on traduit en 400 plutot que de laisser remonter en 500.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleInvalid(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
