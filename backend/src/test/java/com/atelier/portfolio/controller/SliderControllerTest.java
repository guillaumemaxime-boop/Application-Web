package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.NewsSliderView;
import com.atelier.portfolio.service.NewsSliderService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SliderControllerTest {

    @Mock NewsSliderService service;
    @InjectMocks SliderController controller;

    @Test
    void listReturnsPublishedSliderViews() {
        NewsSliderView view = new NewsSliderView("sld-1", "test", "Test", "home-top", List.of());
        when(service.findAllPublishedView()).thenReturn(List.of(view));
        List<NewsSliderView> result = controller.list();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo("sld-1");
    }

    @Test
    void listReturnsEmptyWhenNoneAssigned() {
        when(service.findAllPublishedView()).thenReturn(List.of());
        assertThat(controller.list()).isEmpty();
    }
}
