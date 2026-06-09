package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import com.atelier.portfolio.model.ImageCrop;
import com.atelier.portfolio.repository.HomeFeedRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomeFeedServiceTest {

    @Mock private HomeFeedRepository repository;
    @Mock private EntityManager entityManager;
    @InjectMocks private HomeFeedService service;

    @Test
    @SuppressWarnings("unchecked")
    void replace_deletesAllThenSavesInOrder() {
        List<HomeFeedService.FeedEntry> input = List.of(
                new HomeFeedService.FeedEntry("furniture", "console"),
                new HomeFeedService.FeedEntry("exhibition", "lumen")
        );
        when(repository.findAllByOrderByPositionAsc()).thenReturn(List.of());

        service.replace(input);

        verify(repository).deleteAllInBatch();
        ArgumentCaptor<List<HomeFeedEntryEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        List<HomeFeedEntryEntity> saved = captor.getValue();
        assertEquals(0, saved.get(0).getPosition());
        assertEquals("console", saved.get(0).getRefSlug());
        assertEquals(1, saved.get(1).getPosition());
        assertEquals("lumen", saved.get(1).getRefSlug());
    }

    // --- F-07 : validation kind/slug ---

    @Test
    void replace_rejette_kind_inconnu() {
        List<HomeFeedService.FeedEntry> input = List.of(
                new HomeFeedService.FeedEntry("etrange-type", "ok-slug")
        );

        assertThrows(IllegalArgumentException.class, () -> service.replace(input));
        verify(repository, never()).deleteAllInBatch();
        verify(repository, never()).saveAll(any());
    }

    @Test
    void replace_rejette_kind_null() {
        List<HomeFeedService.FeedEntry> input = List.of(
                new HomeFeedService.FeedEntry(null, "ok-slug")
        );

        assertThrows(IllegalArgumentException.class, () -> service.replace(input));
        verify(repository, never()).deleteAllInBatch();
    }

    @Test
    void replace_rejette_slug_vide() {
        List<HomeFeedService.FeedEntry> input = List.of(
                new HomeFeedService.FeedEntry("furniture", "")
        );

        assertThrows(IllegalArgumentException.class, () -> service.replace(input));
        verify(repository, never()).deleteAllInBatch();
    }

    @Test
    void replace_rejette_slug_blank() {
        List<HomeFeedService.FeedEntry> input = List.of(
                new HomeFeedService.FeedEntry("furniture", "   ")
        );

        assertThrows(IllegalArgumentException.class, () -> service.replace(input));
    }

    @Test
    void replace_rejette_slug_null() {
        List<HomeFeedService.FeedEntry> input = List.of(
                new HomeFeedService.FeedEntry("furniture", null)
        );

        assertThrows(IllegalArgumentException.class, () -> service.replace(input));
    }

    @Test
    void replace_rejette_slug_trop_long() {
        String longSlug = "a".repeat(201);
        List<HomeFeedService.FeedEntry> input = List.of(
                new HomeFeedService.FeedEntry("furniture", longSlug)
        );

        assertThrows(IllegalArgumentException.class, () -> service.replace(input));
    }

    // --- setCoverCrop ---

    @Test
    void setCoverCrop_set_persiste_les_quatre_champs() {
        HomeFeedEntryEntity entry = new HomeFeedEntryEntity();
        entry.setPosition(0); entry.setKind("furniture"); entry.setRefSlug("console");
        when(repository.findByKindAndRefSlug("furniture", "console")).thenReturn(Optional.of(entry));

        service.setCoverCrop("furniture", "console", new ImageCrop(10.0, 20.0, 50.0, 60.0));

        ArgumentCaptor<HomeFeedEntryEntity> captor = ArgumentCaptor.forClass(HomeFeedEntryEntity.class);
        verify(repository).save(captor.capture());
        HomeFeedEntryEntity saved = captor.getValue();
        assertEquals(10.0, saved.getCoverCropX());
        assertEquals(20.0, saved.getCoverCropY());
        assertEquals(50.0, saved.getCoverCropW());
        assertEquals(60.0, saved.getCoverCropH());
    }

    @Test
    void setCoverCrop_null_remet_les_quatre_champs_a_null() {
        HomeFeedEntryEntity entry = new HomeFeedEntryEntity();
        entry.setPosition(0); entry.setKind("furniture"); entry.setRefSlug("console");
        entry.setCoverCropX(10.0); entry.setCoverCropY(20.0);
        entry.setCoverCropW(50.0); entry.setCoverCropH(60.0);
        when(repository.findByKindAndRefSlug("furniture", "console")).thenReturn(Optional.of(entry));

        service.setCoverCrop("furniture", "console", null);

        ArgumentCaptor<HomeFeedEntryEntity> captor = ArgumentCaptor.forClass(HomeFeedEntryEntity.class);
        verify(repository).save(captor.capture());
        HomeFeedEntryEntity saved = captor.getValue();
        assertNull(saved.getCoverCropX());
        assertNull(saved.getCoverCropY());
        assertNull(saved.getCoverCropW());
        assertNull(saved.getCoverCropH());
    }

    @Test
    void setCoverCrop_entry_introuvable_leve_exception() {
        when(repository.findByKindAndRefSlug("furniture", "inconnu")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.setCoverCrop("furniture", "inconnu", new ImageCrop(0.0, 0.0, 100.0, 100.0)));
        verify(repository, never()).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void replace_accepte_furniture_et_exhibition() {
        List<HomeFeedService.FeedEntry> input = List.of(
                new HomeFeedService.FeedEntry("furniture", "ok-1"),
                new HomeFeedService.FeedEntry("exhibition", "ok-2")
        );
        when(repository.findAllByOrderByPositionAsc()).thenReturn(List.of());

        service.replace(input);

        verify(repository).deleteAllInBatch();
        verify(repository).saveAll(any());
    }

}
