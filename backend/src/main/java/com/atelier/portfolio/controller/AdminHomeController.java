package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.HomeFeedService;
import com.atelier.portfolio.service.HomeFeedService.FeedEntry;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
