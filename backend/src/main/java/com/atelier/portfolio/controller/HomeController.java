package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.HomePageData;
import com.atelier.portfolio.service.HomeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/home")
public class HomeController {

    private final HomeService service;

    public HomeController(HomeService service) {
        this.service = service;
    }

    @GetMapping
    public HomePageData get() {
        return service.getHomeData();
    }
}
