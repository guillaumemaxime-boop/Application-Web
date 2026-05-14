package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ExhibitionEntity;
import com.atelier.portfolio.entity.FurnitureEntity;
import com.atelier.portfolio.model.*;
import com.atelier.portfolio.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class HomeService {

    private static final DateTimeFormatter MONTH_YEAR = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH);

    private final FurnitureRepository furnitureRepo;
    private final ExhibitionRepository exhibitionRepo;
    private final HomeFeedRepository feedRepo;
    private final FurnitureCategoryMetaRepository categoryRepo;
    private final ExhibitionMetaRepository exhibitionMetaRepo;

    public HomeService(FurnitureRepository furnitureRepo,
                       ExhibitionRepository exhibitionRepo,
                       HomeFeedRepository feedRepo,
                       FurnitureCategoryMetaRepository categoryRepo,
                       ExhibitionMetaRepository exhibitionMetaRepo) {
        this.furnitureRepo = furnitureRepo;
        this.exhibitionRepo = exhibitionRepo;
        this.feedRepo = feedRepo;
        this.categoryRepo = categoryRepo;
        this.exhibitionMetaRepo = exhibitionMetaRepo;
    }

    public HomePageData getHomeData() {
        List<FurnitureEntity> allFurniture = furnitureRepo.findAll();
        List<ExhibitionEntity> allExhibitions = exhibitionRepo.findAll();

        Map<String, FurnitureEntity> furnitureBySlug = new HashMap<>();
        for (FurnitureEntity f : allFurniture) furnitureBySlug.put(f.getSlug(), f);

        Map<String, ExhibitionEntity> exhibitionBySlug = new HashMap<>();
        for (ExhibitionEntity e : allExhibitions) exhibitionBySlug.put(e.getSlug(), e);

        List<HomeCategoryView> categories = categoryRepo.findByVisibleTrueOrderByPositionAsc().stream()
                .map(meta -> new HomeCategoryView(
                        meta.getCategory(),
                        slugify(meta.getCategory()),
                        meta.getCoverImage(),
                        allFurniture.stream()
                                .filter(f -> meta.getCategory().equals(f.getCategory()))
                                .sorted((a, b) -> a.getTitle().compareToIgnoreCase(b.getTitle()))
                                .map(FurnitureEntity::getSlug)
                                .toList()
                ))
                .toList();

        List<HomeExhibitionView> exhibitions = exhibitionMetaRepo.findByVisibleTrueOrderByPositionAsc().stream()
                .map(meta -> exhibitionBySlug.get(meta.getSlug()))
                .filter(e -> e != null)
                .map(e -> new HomeExhibitionView(
                        e.getTitle(), e.getSlug(), e.getCoverImage(), e.getVenue(),
                        formatPeriod(e)
                ))
                .toList();

        List<HomeFeedItem> feed = feedRepo.findAllByOrderByPositionAsc().stream()
                .map(entry -> {
                    if ("furniture".equals(entry.getKind())) {
                        FurnitureEntity f = furnitureBySlug.get(entry.getRefSlug());
                        if (f == null) return null;
                        return new HomeFeedItem("furniture", f.getSlug(), f.getTitle(),
                                f.getCoverImage(),
                                f.getCategory() + " · " + f.getYear());
                    } else if ("exhibition".equals(entry.getKind())) {
                        ExhibitionEntity e = exhibitionBySlug.get(entry.getRefSlug());
                        if (e == null) return null;
                        return new HomeFeedItem("exhibition", e.getSlug(), e.getTitle(),
                                e.getCoverImage(),
                                e.getVenue() + " · " + formatPeriod(e));
                    }
                    return null;
                })
                .filter(item -> item != null)
                .toList();

        return new HomePageData(categories, exhibitions, feed);
    }

    private static String formatPeriod(ExhibitionEntity e) {
        if (e.getStartDate() == null) return "";
        if (e.getEndDate() == null) return MONTH_YEAR.format(e.getStartDate());
        return MONTH_YEAR.format(e.getStartDate()) + " → " + MONTH_YEAR.format(e.getEndDate());
    }

    private static String slugify(String input) {
        String n = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(Locale.FRENCH);
        return n.replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }
}
