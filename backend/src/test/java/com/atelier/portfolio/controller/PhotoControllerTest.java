package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.service.PhotoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhotoControllerTest {

    @Mock
    private PhotoService service;

    @InjectMocks
    private PhotoController controller;

    private Photo samplePhoto;

    @BeforeEach
    void setUp() {
        samplePhoto = new Photo(
                "ph-abc12345",
                "8f3a1b2c-uuid.jpg",
                "portrait-studio.jpg",
                "/api/photos/files/8f3a1b2c-uuid.jpg",
                "2026-05-10T18:47:54.746Z",
                List.of()
        );
    }

    // --- list ---

    @Test
    void testList_ReturnsAllPhotos() {
        when(service.findAll()).thenReturn(List.of(samplePhoto));

        List<Photo> result = controller.list();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(samplePhoto, result.get(0));
        verify(service, times(1)).findAll();
    }

    @Test
    void testList_EmptyLibrary_ReturnsEmptyList() {
        when(service.findAll()).thenReturn(List.of());

        List<Photo> result = controller.list();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // --- serve ---

    @Test
    void testServe_ExistingFile_ReturnsOkWithBody() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("8f3a1b2c-uuid.jpg")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("8f3a1b2c-uuid.jpg");

        assertEquals(200, result.getStatusCode().value());
        assertEquals(mockResource, result.getBody());
        assertNotNull(result.getHeaders().get(HttpHeaders.CONTENT_DISPOSITION));
    }

    @Test
    void testServe_NonExistingFile_ReturnsNotFound() throws IOException {
        when(service.loadAsResource("missing.jpg")).thenReturn(null);

        ResponseEntity<Resource> result = controller.serve("missing.jpg");

        assertEquals(404, result.getStatusCode().value());
        assertNull(result.getBody());
    }

    @Test
    void serve_renvoie_image_jpeg_pour_jpg() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("photo.jpg")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("photo.jpg");

        assertEquals(200, result.getStatusCode().value());
        assertEquals("image/jpeg", result.getHeaders().getContentType().toString());
    }

    @Test
    void serve_renvoie_image_png_pour_png() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("photo.PNG")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("photo.PNG");

        assertEquals("image/png", result.getHeaders().getContentType().toString());
    }

    @Test
    void serve_renvoie_octet_stream_pour_extension_inconnue() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("file.xyz")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("file.xyz");

        assertEquals("application/octet-stream", result.getHeaders().getContentType().toString());
    }

    @Test
    void serve_renvoie_octet_stream_pour_fichier_sans_extension() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("noext")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("noext");

        assertEquals("application/octet-stream", result.getHeaders().getContentType().toString());
    }
}
