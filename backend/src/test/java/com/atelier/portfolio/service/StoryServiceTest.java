package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ExhibitionEntity;
import com.atelier.portfolio.entity.FurnitureEntity;
import com.atelier.portfolio.model.ImageCrop;
import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.model.StoryWithSlides;
import com.atelier.portfolio.repository.ExhibitionRepository;
import com.atelier.portfolio.repository.FurnitureRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class StoryServiceTest {

    @Autowired StoryService service;
    @Autowired FurnitureRepository furnitureRepo;
    @Autowired ExhibitionRepository exhibitionRepo;

    @Test
    void createStoryAssignsIncrementalPosition() {
        // Note : utiliser 'f-001' (id technique present dans le seed) au lieu d'un slug
        Story s1 = service.create(new StoryInput("furniture", "f-001", "Story extra 1", "https://example.com/c.jpg", null));
        Story s2 = service.create(new StoryInput("furniture", "f-001", "Story extra 2", "https://example.com/c.jpg", null));
        assertThat(s2.position()).isGreaterThan(s1.position());
    }

    @Test
    void createStoryGeneratesUniqueSlug() {
        Story s1 = service.create(new StoryInput("furniture", "f-001", "Premiere", "https://example.com/c.jpg", null));
        Story s2 = service.create(new StoryInput("furniture", "f-001", "Deuxieme", "https://example.com/c.jpg", null));
        assertThat(s1.slug()).isNotEqualTo(s2.slug());
    }

    @Test
    void findByOwnerReturnsStoriesInPositionOrder() {
        // Apres seed 023, f-001 a au moins 1 story (« principale »)
        List<Story> stories = service.findByOwner("furniture", "f-001");
        assertThat(stories).isNotEmpty();
        for (int i = 1; i < stories.size(); i++) {
            assertThat(stories.get(i).position()).isGreaterThanOrEqualTo(stories.get(i - 1).position());
        }
    }

    @Test
    void replaceSlidesAttachesSlidesToStory() {
        Story s = service.create(new StoryInput("furniture", "f-001", "Test", "https://example.com/c.jpg", null));
        service.replaceSlides(s.id(), List.of(
                new Slide.ImageSlide(null, 0, "https://example.com/1.jpg", "Caption 1", null),
                new Slide.ImageSlide(null, 1, "https://example.com/2.jpg", "Caption 2", null)
        ));
        StoryWithSlides loaded = service.findBySlugWithSlides(s.slug()).orElseThrow();
        assertThat(loaded.slides()).hasSize(2);
    }

    @Test
    void deleteStoryRemovesItAndCascadesSlides() {
        Story s = service.create(new StoryInput("furniture", "f-001", "Tmp", "https://example.com/c.jpg", null));
        service.replaceSlides(s.id(), List.of(new Slide.ImageSlide(null, 0, "https://example.com/x.jpg", null, null)));
        service.delete(s.id());
        assertThatThrownBy(() -> service.update(s.id(), new StoryInput("furniture", "f-001", "X", "https://example.com/c.jpg", null)))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void findBySlugWithSlides_furnitureShowStoryLinkTrue_propagatesTrue() {
        FurnitureEntity f = furnitureRepo.findById("f-001").orElseThrow();
        f.setShowStoryLink(true);
        furnitureRepo.save(f);

        Story s = service.create(new StoryInput("furniture", "f-001", "Test link true", "https://example.com/c.jpg", null));
        StoryWithSlides result = service.findBySlugWithSlides(s.slug()).orElseThrow();

        assertThat(result.ownerShowStoryLink()).isTrue();
        assertThat(result.ownerSlug()).isEqualTo(f.getSlug());
    }

    @Test
    void findBySlugWithSlides_furnitureShowStoryLinkFalse_propagatesFalse() {
        FurnitureEntity f = furnitureRepo.findById("f-001").orElseThrow();
        f.setShowStoryLink(false);
        furnitureRepo.save(f);

        Story s = service.create(new StoryInput("furniture", "f-001", "Test link false", "https://example.com/c.jpg", null));
        StoryWithSlides result = service.findBySlugWithSlides(s.slug()).orElseThrow();

        assertThat(result.ownerShowStoryLink()).isFalse();
        assertThat(result.ownerSlug()).isEqualTo(f.getSlug());
    }

    @Test
    void findBySlugWithSlides_exhibitionShowStoryLinkTrue_propagatesTrue() {
        ExhibitionEntity ex = exhibitionRepo.findById("e-001").orElseThrow();
        ex.setShowStoryLink(true);
        exhibitionRepo.save(ex);

        Story s = service.create(new StoryInput("exhibition", "e-001", "Test exh link true", "https://example.com/c.jpg", null));
        StoryWithSlides result = service.findBySlugWithSlides(s.slug()).orElseThrow();

        assertThat(result.ownerShowStoryLink()).isTrue();
        assertThat(result.ownerSlug()).isEqualTo(ex.getSlug());
    }

    @Test
    void findBySlugWithSlides_exhibitionShowStoryLinkFalse_propagatesFalse() {
        ExhibitionEntity ex = exhibitionRepo.findById("e-001").orElseThrow();
        ex.setShowStoryLink(false);
        exhibitionRepo.save(ex);

        Story s = service.create(new StoryInput("exhibition", "e-001", "Test exh link false", "https://example.com/c.jpg", null));
        StoryWithSlides result = service.findBySlugWithSlides(s.slug()).orElseThrow();

        assertThat(result.ownerShowStoryLink()).isFalse();
        assertThat(result.ownerSlug()).isEqualTo(ex.getSlug());
    }

    @Test
    void create_avec_coverCrop_persiste_et_relit() {
        Story created = service.create(new StoryInput(
                "furniture", "f-001", "Crop test", "https://example.com/c.jpg",
                new ImageCrop(5.0, 10.0, 80.0, 60.0)));
        StoryWithSlides reloaded = service.findBySlugWithSlides(created.slug()).orElseThrow();
        assertThat(reloaded.story().coverCrop()).isNotNull();
        assertThat(reloaded.story().coverCrop().w()).isEqualTo(80.0);
        assertThat(reloaded.story().coverCrop().x()).isEqualTo(5.0);
    }

    @Test
    void replaceSlides_persists_image_crop() {
        Story story = service.create(new StoryInput("furniture", "f-001", "Crop slide test", "https://example.com/c.jpg", null));
        var crop = new ImageCrop(10.0, 20.0, 50.0, 60.0);
        var img = new Slide.ImageSlide("sl-img", 0, "/img.jpg", "leg", crop);
        service.replaceSlides(story.id(), java.util.List.of(img));
        var reloaded = service.findSlidesByStoryId(story.id());
        assertThat(reloaded).hasSize(1);
        var first = (Slide.ImageSlide) reloaded.get(0);
        assertThat(first.crop()).isEqualTo(crop);
    }
}
