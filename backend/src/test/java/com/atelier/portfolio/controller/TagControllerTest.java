package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.TagService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TagControllerTest {

    @Mock TagService tagService;
    @InjectMocks TagController controller;

    @Test
    void listDelegatesToService() {
        when(tagService.findAllTags()).thenReturn(List.of("bois", "sculpture"));
        assertThat(controller.list()).containsExactly("bois", "sculpture");
        verify(tagService).findAllTags();
    }

    @Test
    void listReturnsEmptyWhenNoTags() {
        when(tagService.findAllTags()).thenReturn(List.of());
        assertThat(controller.list()).isEmpty();
    }
}
