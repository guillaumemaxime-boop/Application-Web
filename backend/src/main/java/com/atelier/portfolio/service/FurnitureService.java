package com.atelier.portfolio.service;

import com.atelier.portfolio.model.Furniture;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FurnitureService {

    private final List<Furniture> items = List.of(
            new Furniture(
                    "f-001",
                    "Onde — Fauteuil sculpté",
                    "onde-fauteuil-sculpte",
                    "Sièges",
                    "Chêne massif & cuir tanné",
                    2024,
                    "https://picsum.photos/seed/onde-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/onde-1/1200/800",
                            "https://picsum.photos/seed/onde-2/1200/800",
                            "https://picsum.photos/seed/onde-3/1200/800"
                    ),
                    "Une silhouette inspirée du mouvement de la mer, façonnée d'un seul bloc.",
                    """
                    Onde est un fauteuil pensé comme une vague figée. Le piétement, taillé dans une bille
                    de chêne d'une seule pièce, supporte une assise enveloppante recouverte d'un cuir
                    végétal teinté à la main. La courbure du dossier, calculée pour offrir un soutien
                    ergonomique, joue avec la lumière du matin et révèle le veinage profond du bois.
                    Pièce signée et numérotée, éditée à 12 exemplaires.
                    """,
                    List.of("Hauteur 92 cm", "Largeur 78 cm", "Profondeur 84 cm", "Assise 42 cm"),
                    "Atelier Lumen",
                    true
            ),
            new Furniture(
                    "f-002",
                    "Strate — Table basse en marbre",
                    "strate-table-basse-marbre",
                    "Tables",
                    "Marbre Calacatta & laiton brossé",
                    2023,
                    "https://picsum.photos/seed/strate-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/strate-1/1200/800",
                            "https://picsum.photos/seed/strate-2/1200/800"
                    ),
                    "Trois plateaux superposés évoquant les couches géologiques.",
                    """
                    Strate joue sur la rencontre du minéral et du métal. Le plateau supérieur en marbre
                    Calacatta accueille les objets du quotidien, tandis que les niveaux inférieurs en
                    laiton brossé renvoient une lumière feutrée. Les arêtes ont été polies à la main
                    pour suggérer une érosion lente et naturelle.
                    """,
                    List.of("Hauteur 38 cm", "Diamètre 110 cm"),
                    "Atelier Lumen",
                    true
            ),
            new Furniture(
                    "f-003",
                    "Voile — Bibliothèque modulaire",
                    "voile-bibliotheque-modulaire",
                    "Rangements",
                    "Frêne thermo-traité & acier patiné",
                    2024,
                    "https://picsum.photos/seed/voile-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/voile-1/1200/800",
                            "https://picsum.photos/seed/voile-2/1200/800",
                            "https://picsum.photos/seed/voile-3/1200/800"
                    ),
                    "Une bibliothèque qui se déploie comme une voile au vent.",
                    """
                    Voile propose un système modulaire de rangement adaptable aux espaces résidentiels
                    comme tertiaires. Les modules en frêne thermo-traité s'assemblent sans visserie
                    apparente sur une structure d'acier patiné. Chaque configuration est unique.
                    """,
                    List.of("Module H 220 × L 90 × P 32 cm", "Configurations 1 à 6 modules"),
                    "Atelier Lumen",
                    false
            ),
            new Furniture(
                    "f-004",
                    "Halo — Suspension lumineuse",
                    "halo-suspension-lumineuse",
                    "Luminaires",
                    "Verre soufflé & laiton",
                    2023,
                    "https://picsum.photos/seed/halo-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/halo-1/1200/800",
                            "https://picsum.photos/seed/halo-2/1200/800"
                    ),
                    "Un halo de lumière diffuse, soufflé à la bouche en Bohême.",
                    """
                    Halo est une suspension réalisée en collaboration avec un maître verrier de Bohême.
                    Le verre, soufflé à la bouche, capte la lumière d'une source LED dissimulée et
                    la diffuse en un halo doux. La structure en laiton apparente met en valeur le
                    geste artisanal.
                    """,
                    List.of("Diamètre 45 cm", "Hauteur réglable jusqu'à 180 cm"),
                    "Atelier Lumen",
                    false
            ),
            new Furniture(
                    "f-005",
                    "Racine — Banc d'entrée",
                    "racine-banc-entree",
                    "Sièges",
                    "Noyer brut & lin huilé",
                    2022,
                    "https://picsum.photos/seed/racine-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/racine-1/1200/800",
                            "https://picsum.photos/seed/racine-2/1200/800"
                    ),
                    "Un banc taillé dans une racine centenaire de noyer.",
                    """
                    Chaque banc Racine est une pièce unique. La sélection de la racine, son séchage
                    de plus de deux ans et sa taille à la main préservent les irrégularités naturelles
                    du bois. L'assise est garnie d'un coussin en lin lavé et huilé.
                    """,
                    List.of("Variable selon la pièce", "Longueur ≈ 160 cm"),
                    "Atelier Lumen",
                    true
            ),
            new Furniture(
                    "f-006",
                    "Brume — Paravent textile",
                    "brume-paravent-textile",
                    "Cloisons",
                    "Lin tissé main & frêne",
                    2024,
                    "https://picsum.photos/seed/brume-cover/1200/800",
                    List.of(
                            "https://picsum.photos/seed/brume-1/1200/800",
                            "https://picsum.photos/seed/brume-2/1200/800"
                    ),
                    "Un paravent qui filtre la lumière comme une brume matinale.",
                    """
                    Brume articule trois panneaux de lin tissé sur un cadre en frêne huilé. Le tissage,
                    réalisé sur métier traditionnel, alterne fils mats et fils de soie pour créer un
                    jeu de transparences subtil au passage de la lumière.
                    """,
                    List.of("Hauteur 180 cm", "Largeur déployée 240 cm"),
                    "Atelier Lumen",
                    false
            )
    );

    public List<Furniture> findAll() {
        return items;
    }

    public List<Furniture> findFeatured() {
        return items.stream().filter(Furniture::featured).toList();
    }

    public Optional<Furniture> findBySlug(String slug) {
        return items.stream().filter(f -> f.slug().equals(slug)).findFirst();
    }

    public List<String> categories() {
        return items.stream().map(Furniture::category).distinct().sorted().toList();
    }
}
