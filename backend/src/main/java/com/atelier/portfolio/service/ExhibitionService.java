package com.atelier.portfolio.service;

import com.atelier.portfolio.model.Exhibition;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class ExhibitionService {

    private final List<Exhibition> items = List.of(
            new Exhibition(
                    "e-001",
                    "Matières silencieuses",
                    "matieres-silencieuses",
                    "Galerie Joseph",
                    "Paris",
                    "France",
                    LocalDate.of(2025, 3, 14),
                    LocalDate.of(2025, 5, 18),
                    "https://picsum.photos/seed/matieres-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/matieres-1/1200/800",
                            "https://picsum.photos/seed/matieres-2/1200/800",
                            "https://picsum.photos/seed/matieres-3/1200/800"
                    ),
                    "Léa Bornand",
                    "Une exploration du silence comme matière première.",
                    """
                    Matières silencieuses réunit douze pièces de mobilier sculpté autour d'une question :
                    qu'est-ce qu'un objet qui se tait ? Présentée dans la nef de la Galerie Joseph,
                    l'exposition met en dialogue le bois, la pierre et le textile dans un parcours
                    immersif baigné d'une lumière naturelle filtrée.
                    """,
                    List.of("Mobilier", "Sculpture", "Lumière naturelle"),
                    true
            ),
            new Exhibition(
                    "e-002",
                    "L'atelier ouvert",
                    "l-atelier-ouvert",
                    "Design Miami",
                    "Miami",
                    "États-Unis",
                    LocalDate.of(2024, 12, 3),
                    LocalDate.of(2024, 12, 8),
                    "https://picsum.photos/seed/atelier-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/atelier-1/1200/800",
                            "https://picsum.photos/seed/atelier-2/1200/800"
                    ),
                    "Hans Verlaat",
                    "L'atelier reconstitué au cœur de la foire.",
                    """
                    Pour Design Miami 2024, l'atelier a été démonté, transporté puis remonté à
                    l'identique sur le stand. Visiteurs et collectionneurs ont assisté en direct
                    à la fabrication d'une édition spéciale de douze tabourets.
                    """,
                    List.of("Performance", "Édition limitée", "Foire internationale"),
                    true
            ),
            new Exhibition(
                    "e-003",
                    "Bois & lumière",
                    "bois-et-lumiere",
                    "Fondation Cartier",
                    "Tokyo",
                    "Japon",
                    LocalDate.of(2024, 9, 1),
                    LocalDate.of(2024, 11, 24),
                    "https://picsum.photos/seed/bois-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/bois-1/1200/800",
                            "https://picsum.photos/seed/bois-2/1200/800",
                            "https://picsum.photos/seed/bois-3/1200/800"
                    ),
                    "Mariko Tanaka",
                    "Dialogue entre menuiserie française et tradition japonaise.",
                    """
                    Bois & lumière a été conçue comme une rencontre entre deux traditions du bois.
                    Six pièces de l'atelier ont été présentées en regard de six créations d'un
                    maître menuisier de Kyoto, dans une scénographie minimaliste signée Mariko
                    Tanaka.
                    """,
                    List.of("Collaboration", "Japon", "Bois"),
                    false
            ),
            new Exhibition(
                    "e-004",
                    "Saison brute",
                    "saison-brute",
                    "Villa Noailles",
                    "Hyères",
                    "France",
                    LocalDate.of(2025, 6, 21),
                    LocalDate.of(2025, 9, 30),
                    "https://picsum.photos/seed/saison-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/saison-1/1200/800",
                            "https://picsum.photos/seed/saison-2/1200/800"
                    ),
                    "Pascale Mussard",
                    "Le mobilier face aux éléments, en plein air.",
                    """
                    Pendant tout l'été, dix pièces de mobilier ont été exposées dans les jardins
                    de la Villa Noailles. Soumises au vent, à la lumière et à la pluie, elles
                    évoluent au fil des semaines : leurs traces sont documentées chaque jour.
                    """,
                    List.of("Plein air", "Patines", "Documentation"),
                    true
            ),
            new Exhibition(
                    "e-005",
                    "Esquisses",
                    "esquisses",
                    "Atelier Lumen",
                    "Lyon",
                    "France",
                    LocalDate.of(2024, 4, 10),
                    LocalDate.of(2024, 4, 28),
                    "https://picsum.photos/seed/esquisses-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/esquisses-1/1200/800",
                            "https://picsum.photos/seed/esquisses-2/1200/800"
                    ),
                    "Atelier Lumen",
                    "Des dessins préparatoires aux prototypes.",
                    """
                    Esquisses ouvre les coulisses du studio : carnets, dessins techniques, maquettes
                    et prototypes inachevés. Une plongée dans la fabrique d'une pièce, du premier
                    croquis à la signature finale.
                    """,
                    List.of("Studio ouvert", "Processus", "Archives"),
                    false
            )
    );

    public List<Exhibition> findAll() {
        return items.stream()
                .sorted(Comparator.comparing(Exhibition::startDate).reversed())
                .toList();
    }

    public List<Exhibition> findFeatured() {
        return items.stream().filter(Exhibition::featured)
                .sorted(Comparator.comparing(Exhibition::startDate).reversed())
                .toList();
    }

    public Optional<Exhibition> findBySlug(String slug) {
        return items.stream().filter(e -> e.slug().equals(slug)).findFirst();
    }
}
