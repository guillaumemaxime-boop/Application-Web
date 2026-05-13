package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.*;
import com.atelier.portfolio.model.*;
import com.atelier.portfolio.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HomeServiceTest {

    @Mock private FurnitureRepository furnitureRepo;
    @Mock private ExhibitionRepository exhibitionRepo;
    @Mock private HomeFeedRepository feedRepo;
    @Mock private FurnitureCategoryMetaRepository categoryRepo;

    @InjectMocks private HomeService service;

    @Test
    void getHomeData_assemblesCategoriesExhibitionsAndFeed() {
        FurnitureEntity table = furniture("f-001", "table-seve", "Table Sève", "Tables", 2025);
        FurnitureEntity console = furniture("f-002", "console-lumiere", "Console Lumière", "Consoles", 2026);

        ExhibitionEntity lumen = exhibition("e-001", "lumen", "Lumen", "Pavillon des Arts",
                LocalDate.of(2026, 5, 1), LocalDate.of(2026, 6, 30));

        FurnitureCategoryMetaEntity tablesCat = categoryMeta("Tables", "tables-cover.jpg", 0);
        FurnitureCategoryMetaEntity consolesCat = categoryMeta("Consoles", "consoles-cover.jpg", 1);

        HomeFeedEntryEntity feed1 = feedEntry(0, "furniture", "console-lumiere");
        HomeFeedEntryEntity feed2 = feedEntry(1, "exhibition", "lumen");

        when(categoryRepo.findByVisibleTrueOrderByPositionAsc()).thenReturn(List.of(tablesCat, consolesCat));
        when(furnitureRepo.findAll()).thenReturn(List.of(table, console));
        when(exhibitionRepo.findAll()).thenReturn(List.of(lumen));
        when(feedRepo.findAllByOrderByPositionAsc()).thenReturn(List.of(feed1, feed2));

        HomePageData result = service.getHomeData();

        assertEquals(2, result.categories().size());
        assertEquals("Tables", result.categories().get(0).category());
        assertEquals(List.of("table-seve"), result.categories().get(0).itemSlugs());

        assertEquals(1, result.exhibitions().size());
        assertEquals("Lumen", result.exhibitions().get(0).title());

        assertEquals(2, result.feed().size());
        assertEquals("furniture", result.feed().get(0).kind());
        assertEquals("console-lumiere", result.feed().get(0).slug());
        assertEquals("Consoles · 2026", result.feed().get(0).subtitle());
        assertEquals("exhibition", result.feed().get(1).kind());
    }

    private static FurnitureEntity furniture(String id, String slug, String title, String category, int year) {
        FurnitureEntity f = new FurnitureEntity();
        f.setId(id); f.setSlug(slug); f.setTitle(title); f.setCategory(category); f.setYear(year);
        f.setCoverImage("cover-" + slug + ".jpg");
        return f;
    }

    private static ExhibitionEntity exhibition(String id, String slug, String title, String venue, LocalDate start, LocalDate end) {
        ExhibitionEntity e = new ExhibitionEntity();
        e.setId(id); e.setSlug(slug); e.setTitle(title); e.setVenue(venue);
        e.setStartDate(start); e.setEndDate(end);
        e.setCoverImage("cover-" + slug + ".jpg");
        return e;
    }

    private static FurnitureCategoryMetaEntity categoryMeta(String cat, String cover, int pos) {
        FurnitureCategoryMetaEntity m = new FurnitureCategoryMetaEntity();
        m.setCategory(cat); m.setCoverImage(cover); m.setPosition(pos); m.setVisible(true);
        return m;
    }

    private static HomeFeedEntryEntity feedEntry(int pos, String kind, String slug) {
        HomeFeedEntryEntity e = new HomeFeedEntryEntity();
        e.setPosition(pos); e.setKind(kind); e.setRefSlug(slug);
        return e;
    }
}
