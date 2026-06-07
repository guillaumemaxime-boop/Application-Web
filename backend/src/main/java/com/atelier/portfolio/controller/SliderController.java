package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.NewsSliderView;
import com.atelier.portfolio.service.NewsSliderService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sliders")
public class SliderController {

    private final NewsSliderService service;

    public SliderController(NewsSliderService service) {
        this.service = service;
    }

    @GetMapping
    public List<NewsSliderView> list() {
        return service.findAllPublishedView();
    }
}
