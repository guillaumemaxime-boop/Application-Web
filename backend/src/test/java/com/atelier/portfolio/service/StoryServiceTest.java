package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StorySlideEntity;
import com.atelier.portfolio.entity.StorySlideSpecEntry;
import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.SpecEntry;
import com.atelier.portfolio.repository.StorySlideRepository;
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
class StoryServiceTest {

    @Mock private StorySlideRepository repository;

    @InjectMocks private StoryService service;

    @Test
    void findByOwner_returnsMixedSlideTypes() {
        StorySlideEntity cover = entity("s1", "furniture", "f-001", 0, "cover");
        cover.setSrc("cover.jpg");

        StorySlideEntity image = entity("s2", "furniture", "f-001", 1, "image");
        image.setSrc("img.jpg"); image.setCaption("Détail");

        StorySlideEntity quote = entity("s3", "furniture", "f-001", 2, "quote");
        quote.setQuoteBody("Le bois parle"); quote.setQuoteCite("— Maître Asaba");

        when(repository.findByOwnerKindAndOwnerIdOrderByPosition("furniture", "f-001"))
                .thenReturn(List.of(cover, image, quote));

        List<Slide> result = service.findByOwner("furniture", "f-001");

        assertEquals(3, result.size());
        assertInstanceOf(Slide.CoverSlide.class, result.get(0));
        assertInstanceOf(Slide.ImageSlide.class, result.get(1));
        assertInstanceOf(Slide.QuoteSlide.class, result.get(2));
        assertEquals("cover.jpg", ((Slide.CoverSlide) result.get(0)).src());
        assertEquals("Détail", ((Slide.ImageSlide) result.get(1)).caption());
        assertEquals("Le bois parle", ((Slide.QuoteSlide) result.get(2)).body());
    }

    @Test
    @SuppressWarnings("unchecked")
    void replaceSlides_deletesOldThenInsertsNewWithRecalculatedPositions() {
        List<Slide> input = List.of(
                new Slide.CoverSlide(null, 99, "new-cover.jpg"),
                new Slide.LinkSlide(null, 7, "Voir", "desc", "/x")
        );

        service.replaceSlides("furniture", "f-001", input);

        verify(repository).deleteByOwnerKindAndOwnerId("furniture", "f-001");
        ArgumentCaptor<List<StorySlideEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());

        List<StorySlideEntity> saved = captor.getValue();
        assertEquals(2, saved.size());
        assertEquals(0, saved.get(0).getPosition());
        assertEquals(1, saved.get(1).getPosition());
        assertEquals("cover", saved.get(0).getType());
        assertEquals("link", saved.get(1).getType());
        assertNotNull(saved.get(0).getId());
    }

    @Test
    @SuppressWarnings("unchecked")
    void replaceSlides_specSlideSavesSpecEntries() {
        List<Slide> input = List.of(
                new Slide.SpecSlide(null, 0, List.of(
                        new SpecEntry("Dimensions", "180 cm"),
                        new SpecEntry("Matériau", "Frêne")
                ))
        );

        service.replaceSlides("furniture", "f-001", input);

        ArgumentCaptor<List<StorySlideEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());

        StorySlideEntity saved = captor.getValue().get(0);
        assertEquals("spec", saved.getType());
        assertEquals(2, saved.getSpecs().size());
        assertEquals("Dimensions", saved.getSpecs().get(0).getLabel());
        assertEquals("180 cm", saved.getSpecs().get(0).getValue());
    }

    private static StorySlideEntity entity(String id, String kind, String ownerId, int pos, String type) {
        StorySlideEntity e = new StorySlideEntity();
        e.setId(id); e.setOwnerKind(kind); e.setOwnerId(ownerId);
        e.setPosition(pos); e.setType(type);
        return e;
    }
}
