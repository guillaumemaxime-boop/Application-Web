package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.HomePageData;
import com.atelier.portfolio.service.HomeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HomeControllerTest {

    @Mock private HomeService service;
    @InjectMocks private HomeController controller;

    @Test
    void get_returnsHomePageDataFromService() {
        HomePageData data = new HomePageData(List.of(), List.of(), List.of());
        when(service.getHomeData()).thenReturn(data);

        assertSame(data, controller.get());
    }
}
