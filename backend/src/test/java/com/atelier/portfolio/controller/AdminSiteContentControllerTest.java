package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.SiteContentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSiteContentControllerTest {

    @Mock
    private SiteContentService service;

    @InjectMocks
    private AdminSiteContentController controller;

    @Test
    void updateAll_delegueAuServiceEtRenvoieLeContenuMisAJour() {
        Map<String, String> input = Map.of("home.hero.title", "Nouveau titre");
        Map<String, String> persisted = Map.of("home.hero.title", "Nouveau titre", "home.hero.lead", "lead");
        when(service.saveAll(input)).thenReturn(persisted);

        Map<String, String> result = controller.updateAll(input);

        assertEquals(persisted, result);
        verify(service).saveAll(input);
    }
}
