package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.FurnitureCategoryMetaEntity;
import com.atelier.portfolio.repository.FurnitureCategoryMetaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryMetaServiceTest {

    @Mock private FurnitureCategoryMetaRepository repository;
    @InjectMocks private CategoryMetaService service;

    @Test
    void findAll_returnsAllOrderedByPosition() {
        FurnitureCategoryMetaEntity m = entity("Tables", "tables.jpg", 0, true);
        when(repository.findAllByOrderByPositionAsc()).thenReturn(List.of(m));

        List<CategoryMetaService.CategoryView> result = service.findAll();

        assertEquals(1, result.size());
        assertEquals("Tables", result.get(0).category());
    }

    @Test
    void update_existingCategory_savesAndReturns() {
        FurnitureCategoryMetaEntity existing = entity("Tables", "old.jpg", 0, true);
        when(repository.findById("Tables")).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = service.update("Tables",
                new CategoryMetaService.CategoryView("Tables", "new.jpg", 1, false));

        assertTrue(result.isPresent());
        assertEquals("new.jpg", result.get().coverImage());
        assertEquals(1, result.get().position());
        assertFalse(result.get().visible());
    }

    private static FurnitureCategoryMetaEntity entity(String cat, String cover, int pos, boolean visible) {
        FurnitureCategoryMetaEntity e = new FurnitureCategoryMetaEntity();
        e.setCategory(cat); e.setCoverImage(cover); e.setPosition(pos); e.setVisible(visible);
        return e;
    }
}
