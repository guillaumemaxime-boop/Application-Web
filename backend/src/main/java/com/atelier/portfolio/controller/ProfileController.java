package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.SiteContentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    public record PressItem(String title, String year) {}

    public record Profile(
            String studio,
            String tagline,
            String bio,
            String contactEmail,
            String location,
            List<PressItem> press,
            List<String> awards
    ) {}

    private final SiteContentService contentService;

    public ProfileController(SiteContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping
    public Profile profile() {
        String pressRaw = contentService.get("profile.press",
                "AD Magazine — Portrait|2024\nWallpaper* — Design Awards Nominee|2024\nLe Monde — Cahier Design|2023");
        List<PressItem> press = Arrays.stream(pressRaw.split("\n"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(line -> {
                    int sep = line.lastIndexOf('|');
                    if (sep < 0) return new PressItem(line, "");
                    return new PressItem(line.substring(0, sep).trim(), line.substring(sep + 1).trim());
                })
                .toList();

        String awardsRaw = contentService.get("profile.awards",
                "Prix Liliane Bettencourt pour l'intelligence de la main — 2023\nWallpaper* Design Awards — Best New Studio (nominé) — 2024");
        List<String> awards = Arrays.stream(awardsRaw.split("\n"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();

        return new Profile(
                contentService.get("profile.studio", "Milo GUILLAUME Design"),
                contentService.get("profile.tagline", "Mobilier sculpté & scénographies sensibles"),
                contentService.get("profile.bio",
                        """
                        Fondé en 2017 dans une ancienne menuiserie parisienne, Milo GUILLAUME Design conçoit des
                        pièces de mobilier en éditions limitées et signe des scénographies d'exposition
                        pour des institutions culturelles européennes. Notre travail explore la rencontre
                        entre savoir-faire artisanal et écriture contemporaine.
                        """),
                contentService.get("profile.contactEmail", "contact@miloguillaume.fr"),
                contentService.get("profile.location", "Paris, France"),
                press,
                awards
        );
    }
}
