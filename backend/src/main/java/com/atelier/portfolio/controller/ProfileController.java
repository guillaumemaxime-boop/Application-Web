package com.atelier.portfolio.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    public record Profile(
            String studio,
            String tagline,
            String bio,
            String contactEmail,
            String location,
            List<Map<String, String>> press,
            List<String> awards
    ) {
    }

    @GetMapping
    public Profile profile() {
        return new Profile(
                "Milo GUILLAUME Design",
                "Mobilier sculpté & scénographies sensibles",
                """
                Fondé en 2017 dans une ancienne menuiserie parisienne, Milo GUILLAUME Design conçoit des
                pièces de mobilier en éditions limitées et signe des scénographies d'exposition
                pour des institutions culturelles européennes. Notre travail explore la rencontre
                entre savoir-faire artisanal et écriture contemporaine.
                """,
                "contact@miloguillaume.fr",
                "Paris, France",
                List.of(
                        Map.of("title", "AD Magazine — Portrait", "year", "2024"),
                        Map.of("title", "Wallpaper* — Design Awards Nominee", "year", "2024"),
                        Map.of("title", "Le Monde — Cahier Design", "year", "2023")
                ),
                List.of(
                        "Prix Liliane Bettencourt pour l'intelligence de la main — 2023",
                        "Wallpaper* Design Awards — Best New Studio (nominé) — 2024"
                )
        );
    }
}
