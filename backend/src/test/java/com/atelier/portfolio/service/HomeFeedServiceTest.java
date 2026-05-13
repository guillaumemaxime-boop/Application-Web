package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import com.atelier.portfolio.repository.HomeFeedRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomeFeedServiceTest {

    @Mock private HomeFeedRepository repository;
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
}
