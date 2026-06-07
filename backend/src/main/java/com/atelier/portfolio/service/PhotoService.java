package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.PhotoEntity;
import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.repository.PhotoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class PhotoService {

    // .svg volontairement exclu — peut contenir du JS executable cote navigateur.
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"
    );

    private final PhotoRepository repository;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${app.upload.base-url:/api/photos/files}")
    private String baseUrl;

    public PhotoService(PhotoRepository repository) {
        this.repository = repository;
    }

    public List<Photo> findAll() {
        return repository.findAllByOrderByUploadedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public Photo store(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "photo";
        String extension = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalName.substring(dotIndex);
        }
        String normalizedExt = extension.toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(normalizedExt)) {
            throw new IllegalArgumentException("Extension non autorisee: " + extension);
        }
        String filename = UUID.randomUUID() + extension;

        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        Path target = dir.resolve(filename);
        byte[] optimized = ImageOptimizer.optimize(file.getBytes(), normalizedExt);
        Files.write(target, optimized);

        String url = baseUrl + "/" + filename;

        PhotoEntity entity = new PhotoEntity();
        entity.setId("ph-" + UUID.randomUUID().toString().substring(0, 8));
        entity.setFilename(filename);
        entity.setOriginalName(originalName);
        entity.setUrl(url);
        entity.setUploadedAt(Instant.now().toString());
        entity.setTags(new ArrayList<>());

        return toDto(repository.save(entity));
    }

    public Resource loadAsResource(String filename) throws MalformedURLException {
        // Confinement strict au repertoire d'upload : on calcule la cible
        // resolue puis on verifie qu'elle reste sous uploadPath. Empeche
        // les tentatives de path traversal du type "../etc/passwd".
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path filePath = uploadPath.resolve(filename).normalize();
        if (!filePath.startsWith(uploadPath)) {
            return null;
        }
        Resource resource = new UrlResource(filePath.toUri());
        if (resource.exists() && resource.isReadable()) {
            return resource;
        }
        return null;
    }

    @Transactional
    public boolean delete(String id) {
        return repository.findById(id).map(entity -> {
            try {
                Path file = Paths.get(uploadDir).resolve(entity.getFilename()).normalize();
                Files.deleteIfExists(file);
            } catch (IOException ignored) {
            }
            repository.delete(entity);
            return true;
        }).orElse(false);
    }

    /**
     * Optimisation batch des fichiers deja uploades (migration one-shot).
     * Idempotent : un appel repete sur des fichiers deja optimises laisse les
     * fichiers tels quels grace au garde-fou de {@link ImageOptimizer}.
     *
     * @return resume : count = nombre traites, optimized = nombre reecrits,
     *                  bytesSaved = octets economises au total
     */
    public OptimizeReport optimizeAll() {
        int count = 0;
        int optimized = 0;
        long bytesSaved = 0;
        Path dir = Paths.get(uploadDir);
        for (PhotoEntity entity : repository.findAll()) {
            count++;
            Path file = dir.resolve(entity.getFilename()).normalize();
            if (!file.startsWith(dir.toAbsolutePath().normalize()) && !file.startsWith(dir.normalize())) continue;
            if (!Files.exists(file)) continue;
            try {
                byte[] original = Files.readAllBytes(file);
                String ext = extractExtension(entity.getFilename());
                byte[] result = ImageOptimizer.optimize(original, ext);
                if (result != original && result.length < original.length) {
                    Files.write(file, result);
                    optimized++;
                    bytesSaved += (original.length - result.length);
                }
            } catch (IOException ignored) {
                // Fichier illisible → skip, on continue le batch
            }
        }
        return new OptimizeReport(count, optimized, bytesSaved);
    }

    private static String extractExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot).toLowerCase(Locale.ROOT) : "";
    }

    public record OptimizeReport(int count, int optimized, long bytesSaved) {}

    @Transactional
    public Optional<Photo> updateTags(String id, List<String> tags) {
        return repository.findById(id).map(entity -> {
            entity.getTags().clear();
            entity.getTags().addAll(normalizeTags(tags));
            return toDto(repository.save(entity));
        });
    }

    static List<String> normalizeTags(List<String> input) {
        if (input == null) return List.of();
        return input.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .map(s -> s.length() > 100 ? s.substring(0, 100) : s)
                .distinct()
                .limit(30)
                .toList();
    }

    private Photo toDto(PhotoEntity entity) {
        return new Photo(
                entity.getId(),
                entity.getFilename(),
                entity.getOriginalName(),
                entity.getUrl(),
                entity.getUploadedAt(),
                List.copyOf(entity.getTags()),
                computeFormat(entity.getFilename()),
                computeSizeBytes(entity.getFilename())
        );
    }

    private static String computeFormat(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) return "";
        return filename.substring(dot + 1).toUpperCase(Locale.ROOT);
    }

    private long computeSizeBytes(String filename) {
        if (filename == null) return 0L;
        try {
            Path file = Paths.get(uploadDir).resolve(filename).normalize();
            if (!Files.exists(file)) return 0L;
            return Files.size(file);
        } catch (IOException e) {
            return 0L;
        }
    }
}
