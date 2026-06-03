package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.PhotoEntity;
import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.repository.PhotoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhotoServiceTest {

    @TempDir
    Path tempDir;

    @Mock
    private PhotoRepository repository;

    @InjectMocks
    private PhotoService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
        ReflectionTestUtils.setField(service, "baseUrl", "/api/photos/files");
    }

    // --- findAll ---

    @Test
    void testFindAll_ReturnsMostRecentFirst() {
        PhotoEntity older = entity("ph-001", "a.jpg", "alpha.jpg", "2026-01-01T00:00:00Z");
        PhotoEntity newer = entity("ph-002", "b.jpg", "beta.jpg",  "2026-05-10T12:00:00Z");
        // le tri est délégué au SQL (ORDER BY uploaded_at DESC)
        when(repository.findAllByOrderByUploadedAtDesc()).thenReturn(List.of(newer, older));

        List<Photo> result = service.findAll();

        assertEquals(2, result.size());
        assertEquals("ph-002", result.get(0).id());
        assertEquals("ph-001", result.get(1).id());
    }

    @Test
    void testFindAll_EmptyRepository_ReturnsEmptyList() {
        when(repository.findAllByOrderByUploadedAtDesc()).thenReturn(List.of());

        List<Photo> result = service.findAll();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // --- store ---

    @Test
    void testStore_CreatesFileOnDisk_AndPersistsEntity() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "portrait.jpg", "image/jpeg", new byte[]{10, 20, 30}
        );
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Photo result = service.store(file);

        assertNotNull(result.id());
        assertTrue(result.id().startsWith("ph-"));
        assertEquals("portrait.jpg", result.originalName());
        assertTrue(result.url().startsWith("/api/photos/files/"));
        assertTrue(result.filename().endsWith(".jpg"));

        Path stored = tempDir.resolve(result.filename());
        assertTrue(Files.exists(stored));
        assertArrayEquals(new byte[]{10, 20, 30}, Files.readAllBytes(stored));

        verify(repository, times(1)).save(any(PhotoEntity.class));
    }

    @Test
    void testStore_TwoFilesWithSameName_GetDistinctFilenames() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.png", "image/png", new byte[]{1}
        );
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Photo first  = service.store(file);
        Photo second = service.store(file);

        assertNotEquals(first.filename(), second.filename());
    }

    @Test
    void testStore_FileWithoutExtension_IsRejected() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "noext", "image/jpeg", new byte[]{1}
        );

        assertThrows(IllegalArgumentException.class, () -> service.store(file));
        verifyNoInteractions(repository);
    }

    @Test
    void store_rejette_extension_html() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "evil.html", "text/html", "<script>alert(1)</script>".getBytes()
        );

        assertThrows(IllegalArgumentException.class, () -> service.store(file));
        verifyNoInteractions(repository);
    }

    @Test
    void store_rejette_extension_svg() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "logo.svg", "image/svg+xml",
                "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>".getBytes()
        );

        assertThrows(IllegalArgumentException.class, () -> service.store(file));
        verifyNoInteractions(repository);
    }

    @Test
    void store_accepte_jpg_webp_png_gif_avif() throws IOException {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        for (String ext : new String[]{"jpg", "jpeg", "png", "webp", "gif", "avif"}) {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "photo." + ext, "image/" + ext, new byte[]{1}
            );
            Photo result = service.store(file);
            assertTrue(result.filename().endsWith("." + ext),
                    "extension preservee pour " + ext);
        }
    }

    @Test
    void store_accepte_extension_majuscule() throws IOException {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.JPG", "image/jpeg", new byte[]{1}
        );

        Photo result = service.store(file);

        assertTrue(result.filename().endsWith(".JPG"));
    }

    // --- loadAsResource ---

    @Test
    void testLoadAsResource_ExistingFile_ReturnsReadableResource() throws IOException {
        Path file = tempDir.resolve("existing.jpg");
        Files.write(file, new byte[]{1, 2, 3});

        Resource resource = service.loadAsResource("existing.jpg");

        assertNotNull(resource);
        assertTrue(resource.exists());
        assertTrue(resource.isReadable());
    }

    @Test
    void testLoadAsResource_NonExistingFile_ReturnsNull() throws IOException {
        Resource resource = service.loadAsResource("ghost.jpg");

        assertNull(resource);
    }

    @Test
    void loadAsResource_renvoie_null_pour_path_traversal() throws IOException {
        // Creons un fichier "sensible" hors du tempDir, dans son parent.
        Path outside = tempDir.getParent().resolve("outside-secret.txt");
        Files.write(outside, "secret".getBytes());
        try {
            Resource viaTraversal = service.loadAsResource("../" + outside.getFileName());

            assertNull(viaTraversal, "le traversal doit etre refuse meme si la cible existe");
        } finally {
            Files.deleteIfExists(outside);
        }
    }

    @Test
    void loadAsResource_renvoie_null_pour_chemin_absolu_hors_upload() throws IOException {
        // Path absolu pointant vers la racine du FS — doit etre refuse.
        Path target = tempDir.getRoot().resolve("etc").resolve("passwd");

        Resource resource = service.loadAsResource(target.toString());

        assertNull(resource);
    }

    // --- delete ---

    @Test
    void testDelete_ExistingId_DeletesFileAndEntity() throws IOException {
        Path file = tempDir.resolve("to-delete.jpg");
        Files.write(file, new byte[]{9, 8, 7});

        PhotoEntity entity = entity("ph-del01", "to-delete.jpg", "original.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-del01")).thenReturn(Optional.of(entity));

        boolean result = service.delete("ph-del01");

        assertTrue(result);
        assertFalse(Files.exists(file));
        verify(repository, times(1)).delete(entity);
    }

    @Test
    void testDelete_NonExistingId_ReturnsFalse() {
        when(repository.findById("ph-ghost")).thenReturn(Optional.empty());

        boolean result = service.delete("ph-ghost");

        assertFalse(result);
        verify(repository, never()).delete(any());
    }

    @Test
    void testDelete_MissingFileOnDisk_StillDeletesEntity() {
        PhotoEntity entity = entity("ph-nf01", "missing-on-disk.jpg", "orig.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-nf01")).thenReturn(Optional.of(entity));

        boolean result = service.delete("ph-nf01");

        assertTrue(result);
        verify(repository, times(1)).delete(entity);
    }

    // --- updateTags ---

    @Test
    void updateTags_normalizesTrimLowercaseDistinct() {
        PhotoEntity entity = entity("ph-tag01", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-tag01")).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<Photo> result = service.updateTags(
                "ph-tag01",
                new ArrayList<>(List.of("  Atelier ", "STUDIO", "atelier", ""))
        );

        assertTrue(result.isPresent());
        assertEquals(List.of("atelier", "studio"), entity.getTags());
        assertEquals(List.of("atelier", "studio"), result.get().tags());
    }

    @Test
    void updateTags_clipsAtMaxLength() {
        PhotoEntity entity = entity("ph-tag02", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-tag02")).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        String huge = "x".repeat(150);

        Optional<Photo> result = service.updateTags("ph-tag02", List.of(huge));

        assertTrue(result.isPresent());
        assertEquals(1, entity.getTags().size());
        assertEquals(100, entity.getTags().get(0).length());
    }

    @Test
    void updateTags_clipsAtMax30Tags() {
        PhotoEntity entity = entity("ph-tag03", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-tag03")).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        List<String> manyTags = IntStream.range(0, 50)
                .mapToObj(i -> "tag" + i)
                .toList();

        Optional<Photo> result = service.updateTags("ph-tag03", manyTags);

        assertTrue(result.isPresent());
        assertEquals(30, entity.getTags().size());
    }

    @Test
    void updateTags_returnsEmptyForUnknownId() {
        when(repository.findById("ph-ghost")).thenReturn(Optional.empty());

        Optional<Photo> result = service.updateTags("ph-ghost", List.of("studio"));

        assertTrue(result.isEmpty());
        verify(repository, never()).save(any());
    }

    @Test
    void updateTags_nullInput_storesEmptyList() {
        PhotoEntity entity = entity("ph-tag04", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        entity.getTags().add("preexisting");
        when(repository.findById("ph-tag04")).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<Photo> result = service.updateTags("ph-tag04", null);

        assertTrue(result.isPresent());
        assertTrue(entity.getTags().isEmpty());
        assertTrue(result.get().tags().isEmpty());
    }

    @Test
    void toDto_includesTagsListSnapshot() {
        PhotoEntity entity = entity("ph-tag05", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        entity.getTags().addAll(List.of("a", "b"));
        when(repository.findAllByOrderByUploadedAtDesc()).thenReturn(List.of(entity));

        List<Photo> result = service.findAll();

        assertEquals(1, result.size());
        assertEquals(List.of("a", "b"), result.get(0).tags());
    }

    // --- helper ---

    private static PhotoEntity entity(String id, String filename, String originalName, String uploadedAt) {
        PhotoEntity e = new PhotoEntity();
        e.setId(id);
        e.setFilename(filename);
        e.setOriginalName(originalName);
        e.setUrl("/api/photos/files/" + filename);
        e.setUploadedAt(uploadedAt);
        return e;
    }
}
