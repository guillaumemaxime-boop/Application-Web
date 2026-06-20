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
        writeVariants(dir, filename, optimized, normalizedExt);

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
        Resource direct = resolveUnder(uploadPath, filename);
        if (direct != null) {
            return direct;
        }
        // Fallback variante → original : une variante demandee mais absente
        // (image plus petite que la cible, ou batch pas encore lance) retombe sur
        // l'original. Indispensable pour les <img srcset> (pas de fallback natif
        // vers `src` quand un candidat 404).
        String base = baseFromVariant(filename);
        if (base != null) {
            return resolveUnder(uploadPath, base);
        }
        return null;
    }

    /** Resout un fichier sous uploadPath (garde path-traversal), ou null. */
    private static Resource resolveUnder(Path uploadPath, String filename) throws MalformedURLException {
        Path filePath = uploadPath.resolve(filename).normalize();
        if (!filePath.startsWith(uploadPath)) {
            return null;
        }
        Resource resource = new UrlResource(filePath.toUri());
        return (resource.exists() && resource.isReadable()) ? resource : null;
    }

    /** "uuid-800.jpg" -> "uuid.jpg" ; null si le nom n'est pas une variante {base}-{w}.{ext}. */
    static String baseFromVariant(String filename) {
        if (filename == null) return null;
        var m = VARIANT_NAME.matcher(filename);
        return m.matches() ? m.group(1) + m.group(2) : null;
    }

    private static final java.util.regex.Pattern VARIANT_NAME =
            java.util.regex.Pattern.compile("(.+)-\\d+(\\.[^.]+)$");

    @Transactional
    public boolean delete(String id) {
        return repository.findById(id).map(entity -> {
            try {
                Path file = Paths.get(uploadDir).resolve(entity.getFilename()).normalize();
                Files.deleteIfExists(file);
            } catch (IOException ignored) {
            }
            deleteVariants(entity.getFilename());
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

    // --- Variantes responsive (Phase 2a) ---

    /** Insere -{w} avant l'extension : "uuid.jpg" -> "uuid-800.jpg". */
    static String variantFilename(String filename, int width) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0) return filename + "-" + width;
        return filename.substring(0, dot) + "-" + width + filename.substring(dot);
    }

    /** Genere les variantes (≤ largeur source) a cote de l'original deja ecrit. */
    private void writeVariants(Path dir, String filename, byte[] originalBytes, String extension) {
        for (int w : ImageOptimizer.VARIANT_WIDTHS) {
            try {
                byte[] variant = ImageOptimizer.resizeToWidth(originalBytes, extension, w);
                if (variant != null) {
                    Files.write(dir.resolve(variantFilename(filename, w)), variant);
                }
            } catch (IOException ignored) {
                // conformite d'abord : l'original prime, une variante ratee est sans gravite
            }
        }
    }

    /** Supprime les fichiers variantes d'un original (best-effort). */
    void deleteVariants(String filename) {
        Path dir = Paths.get(uploadDir);
        for (int w : ImageOptimizer.VARIANT_WIDTHS) {
            try {
                Files.deleteIfExists(dir.resolve(variantFilename(filename, w)));
            } catch (IOException ignored) {
            }
        }
    }

    /** Resume du batch de generation de variantes. */
    public record VariantReport(int count, int generated) {}

    /**
     * Genere les variantes manquantes pour toutes les photos existantes (idempotent :
     * une variante deja presente est laissee). Migration one-shot.
     */
    public VariantReport generateVariantsAll() {
        int count = 0;
        int generated = 0;
        Path dir = Paths.get(uploadDir);
        for (PhotoEntity entity : repository.findAll()) {
            count++;
            String filename = entity.getFilename();
            Path original = dir.resolve(filename).normalize();
            if (!Files.exists(original)) continue;
            String ext = extractExtension(filename);
            byte[] originalBytes;
            try {
                originalBytes = Files.readAllBytes(original);
            } catch (IOException e) {
                continue;
            }
            for (int w : ImageOptimizer.VARIANT_WIDTHS) {
                Path variantPath = dir.resolve(variantFilename(filename, w));
                if (Files.exists(variantPath)) continue;  // idempotent
                try {
                    byte[] variant = ImageOptimizer.resizeToWidth(originalBytes, ext, w);
                    if (variant != null) {
                        Files.write(variantPath, variant);
                        generated++;
                    }
                } catch (IOException ignored) {
                }
            }
        }
        return new VariantReport(count, generated);
    }

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
