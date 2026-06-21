package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Video;
import com.atelier.portfolio.service.VideoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminVideoControllerTest {

    @Mock
    private VideoService service;

    @InjectMocks
    private AdminVideoController controller;

    // -----------------------------------------------------------------------
    // POST /api/admin/videos — upload async
    // -----------------------------------------------------------------------

    /**
     * Cas 1 : upload .mp4 → service renvoie StoredVideo avec id + status=UPLOADED.
     * Le contrôleur doit répondre 201 avec un body contenant id et status.
     */
    @Test
    void upload_mp4_renvoie_201_avec_id_et_status() throws IOException {
        MultipartFile file = new MockMultipartFile("file", "clip.mp4", "video/mp4", new byte[]{1});
        when(service.store(file))
                .thenReturn(new VideoService.StoredVideo("vid-1", "UPLOADED", null, "vid-1-src.mp4"));

        ResponseEntity<?> result = controller.upload(file);

        assertEquals(201, result.getStatusCode().value());
        assertTrue(result.getBody() instanceof Map);
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("vid-1", body.get("id"));
        assertEquals("UPLOADED", body.get("status"));
    }

    /**
     * Cas 2 : upload avec extension refusée → service lève IllegalArgumentException → 400 avec champ "error".
     */
    @Test
    void upload_extension_refusee_renvoie_400() throws IOException {
        MultipartFile file = new MockMultipartFile("file", "x.exe", "application/octet-stream", new byte[]{1});
        when(service.store(file)).thenThrow(new IllegalArgumentException("Extension non autorisee: .exe"));

        ResponseEntity<?> result = controller.upload(file);

        assertEquals(400, result.getStatusCode().value());
        assertTrue(result.getBody() instanceof Map);
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertNotNull(body.get("error"));
    }

    // -----------------------------------------------------------------------
    // GET /api/admin/videos/{id} — statut
    // -----------------------------------------------------------------------

    /**
     * Cas 3a : id connu → service.getStatus renvoie un Video → 200 body = DTO.
     */
    @Test
    void getStatus_id_connu_renvoie_200_avec_dto() {
        Video video = new Video("vid-1", "PROCESSING", null, null, null, null, null, null, null);
        when(service.getStatus("vid-1")).thenReturn(video);

        ResponseEntity<?> result = controller.getStatus("vid-1");

        assertEquals(200, result.getStatusCode().value());
        assertSame(video, result.getBody());
    }

    /**
     * Cas 3b : id inconnu → service.getStatus renvoie null → 404.
     */
    @Test
    void getStatus_id_inconnu_renvoie_404() {
        when(service.getStatus("vid-ghost")).thenReturn(null);

        ResponseEntity<?> result = controller.getStatus("vid-ghost");

        assertEquals(404, result.getStatusCode().value());
    }

    // -----------------------------------------------------------------------
    // POST /api/admin/videos/{id}/retry — relance
    // -----------------------------------------------------------------------

    /**
     * Cas 4a : retry possible (statut FAILED + source présente) → service.retry=true → 200.
     */
    @Test
    void retry_possible_renvoie_200() {
        when(service.retry("vid-1")).thenReturn(true);

        ResponseEntity<?> result = controller.retry("vid-1");

        assertEquals(200, result.getStatusCode().value());
    }

    /**
     * Cas 4b : retry impossible (statut != FAILED, ou source absente, ou id inconnu)
     * → service.retry=false → 409 Conflict.
     *
     * On choisit 409 plutôt que 404 car l'entité peut exister mais être dans un état
     * non-relançable (ex : PROCESSING, READY, UPLOADED) ; le client doit savoir
     * que la ressource existe mais que l'opération est invalide dans l'état courant.
     * Si l'entité est vraiment absente, service.retry renvoie aussi false ; un GET
     * préalable permet au client de distinguer les deux cas.
     */
    @Test
    void retry_impossible_renvoie_409() {
        when(service.retry("vid-1")).thenReturn(false);

        ResponseEntity<?> result = controller.retry("vid-1");

        assertEquals(409, result.getStatusCode().value());
    }

    // -----------------------------------------------------------------------
    // DELETE /api/admin/videos/{id} — suppression par id
    // -----------------------------------------------------------------------

    /**
     * Cas 5a : entité existante → service.delete=true → 204.
     */
    @Test
    void deleteById_existant_renvoie_204() {
        when(service.delete("vid-1")).thenReturn(true);

        ResponseEntity<Void> result = controller.deleteById("vid-1");

        assertEquals(204, result.getStatusCode().value());
        verify(service).delete("vid-1");
    }

    /**
     * Cas 5b : id inconnu → service.delete=false → 404.
     */
    @Test
    void deleteById_absent_renvoie_404() {
        when(service.delete("vid-ghost")).thenReturn(false);

        ResponseEntity<Void> result = controller.deleteById("vid-ghost");

        assertEquals(404, result.getStatusCode().value());
    }

    // -----------------------------------------------------------------------
    // POST /api/admin/videos/hls — batch HLS
    // -----------------------------------------------------------------------

    /**
     * Cas 7 : génération HLS batch → service.generateHlsAll renvoie un rapport → 200 avec count et generated.
     */
    @Test
    void hls_batch_renvoie_le_resume() {
        when(service.generateHlsAll()).thenReturn(new VideoService.VideoHlsReport(3, 2));

        ResponseEntity<?> r = controller.generateHls();

        assertEquals(200, r.getStatusCode().value());
        assertEquals(Map.of("count", 3, "generated", 2), r.getBody());
    }

    /**
     * Cas 8 : un batch HLS déjà en cours (garde de ré-entrance) → 409 Conflict.
     */
    @Test
    void hls_batch_concurrent_renvoie_409() {
        when(service.generateHlsAll()).thenThrow(new IllegalStateException("Un batch HLS est deja en cours."));

        ResponseEntity<?> r = controller.generateHls();

        assertEquals(409, r.getStatusCode().value());
    }

    // -----------------------------------------------------------------------
    // DELETE /api/admin/videos/files/{filename} — suppression .vtt sans entité
    // -----------------------------------------------------------------------

    /**
     * Cas 6a : fichier présent → service.deleteByFilename=true → 204.
     */
    @Test
    void deleteByFilename_present_renvoie_204() {
        when(service.deleteByFilename("subs.vtt")).thenReturn(true);

        ResponseEntity<Void> result = controller.deleteByFilename("subs.vtt");

        assertEquals(204, result.getStatusCode().value());
        verify(service).deleteByFilename("subs.vtt");
    }

    /**
     * Cas 6b : fichier absent → service.deleteByFilename=false → 404.
     */
    @Test
    void deleteByFilename_absent_renvoie_404() {
        when(service.deleteByFilename("missing.vtt")).thenReturn(false);

        ResponseEntity<Void> result = controller.deleteByFilename("missing.vtt");

        assertEquals(404, result.getStatusCode().value());
    }
}
