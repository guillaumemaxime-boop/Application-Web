package com.atelier.portfolio.service;

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
        List<String> tags = tagService.findAllTags();
        assertThat(tags).isNotNull();
    }
}
