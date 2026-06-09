package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.HomeFeedCoverCropRequest;
import com.atelier.portfolio.model.ImageCrop;
import com.atelier.portfolio.service.HomeFeedService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminHomeControllerTest {

    @Mock private HomeFeedService feed;
    @InjectMocks private AdminHomeController controller;

    @Test
    void setFeedCoverCrop_delegue_au_service_et_retourne_204() {
        HomeFeedCoverCropRequest request = new HomeFeedCoverCropRequest(
                "furniture", "console", new ImageCrop(10.0, 20.0, 50.0, 60.0));

        ResponseEntity<Void> response = controller.setFeedCoverCrop(request);

        assertEquals(204, response.getStatusCode().value());
        verify(feed).setCoverCrop("furniture", "console", new ImageCrop(10.0, 20.0, 50.0, 60.0));
    }

    @Test
    void setFeedCoverCrop_crop_null_reset_delegue_au_service() {
        HomeFeedCoverCropRequest request = new HomeFeedCoverCropRequest("exhibition", "lumen", null);

        ResponseEntity<Void> response = controller.setFeedCoverCrop(request);

        assertEquals(204, response.getStatusCode().value());
        verify(feed).setCoverCrop("exhibition", "lumen", null);
    }

    @Test
    void handleInvalid_retourne_400_avec_message() {
        ResponseEntity<?> response = controller.handleInvalid(new IllegalArgumentException("entry introuvable"));

        assertEquals(400, response.getStatusCode().value());
        assertTrue(response.getBody().toString().contains("entry introuvable"));
    }
}
