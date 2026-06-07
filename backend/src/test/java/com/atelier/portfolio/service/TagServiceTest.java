package com.atelier.portfolio.service;

import com.atelier.portfolio.repository.ExhibitionRepository;
import com.atelier.portfolio.repository.FurnitureRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class TagServiceTest {

    @Autowired TagService tagService;
    @Autowired FurnitureRepository furnitureRepo;
    @Autowired ExhibitionRepository exhibitionRepo;

    @Test
    void findAllTagsReturnsUnionSortedDedup() {
        List<String> tags = tagService.findAllTags();
        assertThat(tags).doesNotHaveDuplicates();
        for (int i = 1; i < tags.size(); i++) {
            assertThat(tags.get(i - 1).compareToIgnoreCase(tags.get(i))).isLessThanOrEqualTo(0);
        }
    }

    @Test
    void findAllTagsReturnsEmptyListWhenNoTagsExist() {
        // Vide les tags sur toutes les entités (rollback en fin de test)
        furnitureRepo.findAll().forEach(f -> { f.getTags().clear(); furnitureRepo.save(f); });
        exhibitionRepo.findAll().forEach(e -> { e.getTags().clear(); exhibitionRepo.save(e); });

        List<String> tags = tagService.findAllTags();

        assertThat(tags).isEmpty();
    }
}
