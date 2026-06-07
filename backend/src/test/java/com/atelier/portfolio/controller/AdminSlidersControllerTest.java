package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.NewsSlider;
import com.atelier.portfolio.model.NewsSliderInput;
import com.atelier.portfolio.service.NewsSliderService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminSlidersControllerTest {

    @Mock NewsSliderService service;
    @InjectMocks AdminSlidersController controller;

    @Test
    void listDelegatesToService() {
        when(service.findAll()).thenReturn(List.of());
        assertThat(controller.list()).isEmpty();
        verify(service).findAll();
    }

    @Test
    void createReturnsServiceResult() {
        NewsSliderInput input = new NewsSliderInput("Test", null);
        NewsSlider expected = new NewsSlider("sld-1", "test", "Test", null, List.of());
        when(service.create(input)).thenReturn(expected);
        assertThat(controller.create(input).getBody()).isEqualTo(expected);
    }

    @Test
    void updateForwardsIdAndInput() {
        NewsSliderInput input = new NewsSliderInput("Renamed", "home-top");
        NewsSlider expected = new NewsSlider("sld-1", "renamed", "Renamed", "home-top", List.of());
        when(service.update("sld-1", input)).thenReturn(expected);
        assertThat(controller.update("sld-1", input).getBody()).isEqualTo(expected);
    }

    @Test
    void deleteReturnsNoContent() {
        assertThat(controller.delete("sld-1").getStatusCode().value()).isEqualTo(204);
        verify(service).delete("sld-1");
    }

    @Test
    void replaceStoriesPassesIdsList() {
        Map<String, List<String>> body = Map.of("storyIds", List.of("st-a", "st-b"));
        NewsSlider expected = new NewsSlider("sld-1", "x", "X", null, List.of("st-a", "st-b"));
        when(service.replaceStories("sld-1", List.of("st-a", "st-b"))).thenReturn(expected);
        assertThat(controller.replaceStories("sld-1", body).getBody()).isEqualTo(expected);
    }

    @Test
    void replaceStoriesEmptyBodyDefaultsToEmptyList() {
        Map<String, List<String>> body = Map.of();
        NewsSlider expected = new NewsSlider("sld-1", "x", "X", null, List.of());
        when(service.replaceStories("sld-1", List.of())).thenReturn(expected);
        controller.replaceStories("sld-1", body);
        verify(service).replaceStories("sld-1", List.of());
    }

    @Test
    void handleInvalidReturns400WithErrorMessage() {
        IllegalArgumentException ex = new IllegalArgumentException("Unknown zone key: bad");
        ResponseEntity<Map<String, String>> response = controller.handleInvalid(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("error", "Unknown zone key: bad");
    }

    @Test
    void replaceStoriesAvec51ElementsRetourne400() {
        List<String> ids = java.util.Collections.nCopies(51, "st-x");
        Map<String, List<String>> body = Map.of("storyIds", ids);
        assertThat(controller.replaceStories("sld-1", body).getStatusCode().value()).isEqualTo(400);
        verifyNoInteractions(service);
    }

    @Test
    void replaceStoriesAvec50ElementsEst_accepte() {
        List<String> ids = java.util.Collections.nCopies(50, "st-x");
        Map<String, List<String>> body = Map.of("storyIds", ids);
        NewsSlider expected = new NewsSlider("sld-1", "x", "X", null, ids);
        when(service.replaceStories("sld-1", ids)).thenReturn(expected);
        assertThat(controller.replaceStories("sld-1", body).getStatusCode().value()).isEqualTo(200);
    }
}
