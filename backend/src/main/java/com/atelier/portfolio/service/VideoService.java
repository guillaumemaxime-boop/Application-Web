package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.VideoEntity;
import com.atelier.portfolio.entity.VideoStatus;
import com.atelier.portfolio.model.Video;
import com.atelier.portfolio.repository.ExhibitionRepository;
import com.atelier.portfolio.repository.FurnitureRepository;
import com.atelier.portfolio.repository.SiteContentRepository;
import com.atelier.portfolio.repository.VideoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Stockage et pipeline de transcodage des fichiers video auto-heberges.
 *
 * Cycle de vie d'une video :
 *  UPLOADED → (async) PROCESSING → READY
 *                               ↘ FAILED (avec source conservee pour retry)
 *
 * Mode de degradation : si ffmpeg est indisponible, la video source brute
 * passe directement READY (sans transcodage ni poster).
 *
 * Les sous-titres (.vtt) passent par {@link #storeCaptions} ou
 * {@link #store} (compat retrograde) — pas d'entite VideoEntity.
 */
@Service
public class VideoService {

    // Allowlist stricte des extensions autorisees a l'upload.
    private static final Set<String> ALLOWED_CAPTION_EXTENSIONS = Set.of(".vtt");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".mp4", ".webm", ".vtt");

    private final VideoRepository repository;
    private final VideoTranscoder transcoder;
    private final FurnitureRepository furnitureRepository;
    private final ExhibitionRepository exhibitionRepository;
    private final SiteContentRepository siteContentRepository;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${app.video.base-url:/api/videos/files}")
    private String baseUrl;

    @Value("${app.video.max-height:1080}")
    private int maxHeight;

    @Value("${app.video.crf:23}")
    private int crf;

    @Value("${app.video.preset:medium}")
    private String preset;

    @Value("${app.video.transcode-timeout-seconds:600}")
    private int timeoutSeconds;

    @Value("${app.video.poster-offset-seconds:1}")
    private int posterOffsetSeconds;

    @Value("${app.video.hls-time-seconds:6}")
    private int hlsTimeSeconds;

    @Value("${app.video.hls-preset:veryfast}")
    private String hlsPreset;

    @Value("${app.video.gc-grace-hours:24}")
    int gcGraceHours;

    public VideoService(VideoRepository repository, VideoTranscoder transcoder,
                        FurnitureRepository furnitureRepository,
                        ExhibitionRepository exhibitionRepository,
                        SiteContentRepository siteContentRepository) {
        this.repository = repository;
        this.transcoder = transcoder;
        this.furnitureRepository = furnitureRepository;
        this.exhibitionRepository = exhibitionRepository;
        this.siteContentRepository = siteContentRepository;
    }

    // -----------------------------------------------------------------------
    // Upload
    // -----------------------------------------------------------------------

    /**
     * Stocke un fichier video (.mp4/.webm) ou une piste de sous-titres (.vtt).
     *
     * Pour une video : cree l'entite VideoEntity (UPLOADED) et declenche le
     * transcodage async. Retourne StoredVideo avec id + status="UPLOADED".
     * Pour un .vtt : comportement retrograde (ecriture directe, pas d'entite).
     */
    @Transactional
    public StoredVideo store(MultipartFile file) throws IOException {
        String ext = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Extension non autorisee: " + ext);
        }
        if (ALLOWED_CAPTION_EXTENSIONS.contains(ext)) {
            // Compat retrograde : les .vtt passent aussi par store()
            return storeCaptionsInternal(file, ext);
        }
        return storeVideoInternal(file, ext);
    }

    /**
     * Stocke uniquement une piste de sous-titres (.vtt).
     * Pas d'entite VideoEntity creee.
     */
    @Transactional
    public StoredVideo storeCaptions(MultipartFile file) throws IOException {
        String ext = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_CAPTION_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Extension non autorisee pour les sous-titres: " + ext);
        }
        return storeCaptionsInternal(file, ext);
    }

    private StoredVideo storeVideoInternal(MultipartFile file, String ext) throws IOException {
        String id = "vid-" + UUID.randomUUID().toString().substring(0, 8);
        String sourceFilename = id + "-src" + ext;

        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        Path target = dir.resolve(sourceFilename);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target);
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "video" + ext;

        VideoEntity entity = new VideoEntity();
        entity.setId(id);
        entity.setStatus(VideoStatus.UPLOADED);
        entity.setSourceFilename(sourceFilename);
        entity.setOriginalName(originalName);
        entity.setCreatedAt(Instant.now().toString());
        repository.save(entity);

        transcodeAsync(id);

        return new StoredVideo(id, "UPLOADED", null, sourceFilename);
    }

    private StoredVideo storeCaptionsInternal(MultipartFile file, String ext) throws IOException {
        String filename = UUID.randomUUID() + ext;
        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        Path target = dir.resolve(filename);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target);
        }
        String url = baseUrl + "/" + filename;
        return new StoredVideo(null, null, url, filename);
    }

    // -----------------------------------------------------------------------
    // Transcodage async + synchrone (testable)
    // -----------------------------------------------------------------------

    @Async("videoExecutor")
    public void transcodeAsync(String id) {
        try {
            transcode(id);
        } catch (Exception ignored) {
            // Le statut FAILED est deja pose dans transcode()
        }
    }

    /**
     * Pipeline de transcodage synchrone (package-private pour les tests).
     *
     * Mode degradation : si ffmpeg indisponible → READY avec la source brute.
     * Mode normal     : PROCESSING → ffmpeg → READY (source supprimee) ou FAILED.
     *
     * Volontairement NON @Transactional : appelee en self-invocation depuis
     * transcodeAsync (le proxy AOP serait court-circuite de toute facon), et on
     * VEUT que chaque repository.save() soit committe independamment (tx propre du
     * repository Spring Data) — ainsi le passage PROCESSING est visible des pollers
     * pendant le transcodage long, et un READY/FAILED final persiste meme apres une
     * transaction precedente fermee.
     */
    void transcode(String id) {
        VideoEntity entity = repository.findById(id).orElseThrow(
                () -> new IllegalArgumentException("Video introuvable: " + id));

        if (!transcoder.isAvailable()) {
            // Mode degradation : sert la source brute directement
            entity.setOutputFilename(entity.getSourceFilename());
            entity.setStatus(VideoStatus.READY);
            entity.setUpdatedAt(Instant.now().toString());
            repository.save(entity);
            return;
        }

        // Passe en PROCESSING et commit avant le transcodage long
        entity.setStatus(VideoStatus.PROCESSING);
        entity.setUpdatedAt(Instant.now().toString());
        repository.save(entity);

        Path dir = Paths.get(uploadDir);
        Path src = dir.resolve(entity.getSourceFilename());
        String outputFilename = id + ".mp4";
        String posterFilename = id + "-poster.jpg";

        try {
            VideoTranscoder.VideoMeta meta = transcoder.probe(src);
            transcoder.transcode(
                    src,
                    dir.resolve(outputFilename),
                    dir.resolve(posterFilename),
                    new VideoTranscoder.TranscodeOptions(
                            maxHeight, crf, preset, timeoutSeconds, posterOffsetSeconds));

            entity.setOutputFilename(outputFilename);
            entity.setPosterFilename(posterFilename);
            entity.setDurationSeconds(meta.durationSeconds());
            entity.setWidth(meta.width());
            entity.setHeight(meta.height());

            // HLS best-effort : echec non fatal, le mp4 progressif reste le fallback
            try {
                Path hlsDir = dir.resolve(id + "-hls");
                transcoder.generateHls(dir.resolve(outputFilename), hlsDir, meta.height(),
                        new VideoTranscoder.HlsOptions(hlsTimeSeconds, hlsPreset));
                entity.setHlsMasterFilename(id + "-hls/master.m3u8");
            } catch (Exception hlsErr) {
                // best-effort : le mp4 progressif reste le fallback ; on ne FAIL pas la video
            }

            entity.setStatus(VideoStatus.READY);
            entity.setUpdatedAt(Instant.now().toString());
            repository.save(entity);

            // Supprime la source brute une fois le transcodage reussi
            Files.deleteIfExists(src);

        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            entity.setStatus(VideoStatus.FAILED);
            entity.setErrorMessage(msg.length() > 500 ? msg.substring(0, 500) : msg);
            entity.setUpdatedAt(Instant.now().toString());
            repository.save(entity);
            // NE supprime PAS la source — elle est necessaire pour un eventuel retry
        }
    }

    // -----------------------------------------------------------------------
    // Lecture du statut
    // -----------------------------------------------------------------------

    public Video getStatus(String id) {
        return repository.findById(id).map(this::toDto).orElse(null);
    }

    private Video toDto(VideoEntity e) {
        boolean ready = e.getStatus() == VideoStatus.READY;
        String url = ready ? baseUrl + "/" + e.getOutputFilename() : null;
        String poster = (ready && e.getPosterFilename() != null)
                ? "/api/photos/files/" + e.getPosterFilename()
                : null;
        String hls = (ready && e.getHlsMasterFilename() != null)
                ? baseUrl + "/" + e.getHlsMasterFilename()
                : null;
        Double duration = ready ? e.getDurationSeconds() : null;
        Integer width   = ready ? e.getWidth()           : null;
        Integer height  = ready ? e.getHeight()          : null;
        // errorMessage = sortie ffmpeg brute (peut contenir des chemins serveur) :
        // on ne l'expose que pour un statut FAILED (et uniquement a l'admin, JWT).
        String error = e.getStatus() == VideoStatus.FAILED ? e.getErrorMessage() : null;
        return new Video(e.getId(), e.getStatus().name(), url, poster, hls,
                duration, width, height, error);
    }

    // -----------------------------------------------------------------------
    // Acces public (fiches mobilier/expo/studio)
    // -----------------------------------------------------------------------

    public record ResolvedVideo(String url, String posterUrl,
                                Double durationSeconds, Integer width, Integer height,
                                String hlsUrl) {}

    public Optional<ResolvedVideo> resolveForPublic(String id) {
        return repository.findById(id)
                .filter(e -> e.getStatus() == VideoStatus.READY)
                .map(e -> {
                    String hlsUrl = e.getHlsMasterFilename() != null
                            ? baseUrl + "/" + e.getHlsMasterFilename()
                            : null;
                    return new ResolvedVideo(
                            baseUrl + "/" + e.getOutputFilename(),
                            e.getPosterFilename() != null
                                    ? "/api/photos/files/" + e.getPosterFilename()
                                    : null,
                            e.getDurationSeconds(),
                            e.getWidth(),
                            e.getHeight(),
                            hlsUrl);
                });
    }

    // -----------------------------------------------------------------------
    // Retry
    // -----------------------------------------------------------------------

    @Transactional
    public boolean retry(String id) {
        return repository.findById(id)
                .filter(e -> e.getStatus() == VideoStatus.FAILED)
                .filter(e -> {
                    if (e.getSourceFilename() == null) return false;
                    return Files.exists(Paths.get(uploadDir).resolve(e.getSourceFilename()));
                })
                .map(e -> {
                    transcodeAsync(id);
                    return true;
                })
                .orElse(false);
    }

    // -----------------------------------------------------------------------
    // HLS batch
    // -----------------------------------------------------------------------

    public record VideoHlsReport(int count, int generated) {}

    /** Garde de ré-entrance : empêche deux batchs HLS concurrents de traiter les
     *  mêmes vidéos (segments corrompus). Process-local (un seul backend). */
    private final java.util.concurrent.atomic.AtomicBoolean hlsBatchRunning =
            new java.util.concurrent.atomic.AtomicBoolean(false);

    /**
     * Genere le HLS pour toutes les videos READY qui n'en ont pas encore.
     * Best-effort : une erreur sur une video n'interrompt pas les suivantes.
     * Refuse un second appel concurrent ({@link IllegalStateException} → 409).
     */
    @Transactional
    public VideoHlsReport generateHlsAll() {
        if (!hlsBatchRunning.compareAndSet(false, true)) {
            throw new IllegalStateException("Un batch HLS est deja en cours.");
        }
        try {
            int count = 0, generated = 0;
            Path dir = Paths.get(uploadDir);
            for (VideoEntity e : repository.findByStatus(VideoStatus.READY)) {
                count++;
                if (e.getHlsMasterFilename() != null) continue;
                if (e.getOutputFilename() == null) continue;
                Path mp4 = dir.resolve(e.getOutputFilename());
                if (!Files.exists(mp4)) continue;
                try {
                    int h = e.getHeight() != null ? e.getHeight() : transcoder.probe(mp4).height();
                    Path hlsDir = dir.resolve(e.getId() + "-hls");
                    transcoder.generateHls(mp4, hlsDir, h,
                            new VideoTranscoder.HlsOptions(hlsTimeSeconds, hlsPreset));
                    e.setHlsMasterFilename(e.getId() + "-hls/master.m3u8");
                    e.setUpdatedAt(Instant.now().toString());
                    repository.save(e);
                    generated++;
                } catch (Exception ignored) { /* best-effort */ }
            }
            return new VideoHlsReport(count, generated);
        } finally {
            hlsBatchRunning.set(false);
        }
    }

    // -----------------------------------------------------------------------
    // Références (GC)
    // -----------------------------------------------------------------------

    /** true si l'id video est reference par une fiche mobilier/expo ou par le Studio. */
    public boolean isReferenced(String videoId) {
        if (videoId == null) return false;
        if (furnitureRepository.existsByVideoId(videoId)) return true;
        if (exhibitionRepository.existsByVideoId(videoId)) return true;
        return siteContentRepository.findById("studio.video.id")
                .map(e -> videoId.equals(e.getValue())).orElse(false);
    }

    /** Supprime la video (fichiers + entite) uniquement si plus referencee nulle part. */
    public void deleteIfUnreferenced(String id) {
        if (id == null || isReferenced(id)) return;
        delete(id);
    }

    public record VideoGcReport(java.util.List<String> orphanVideos, java.util.List<String> orphanFiles, boolean deleted) {}

    /** true si la video est protegee par la periode de grace (en cours / trop recente). */
    private boolean inGrace(VideoEntity e) {
        if (e.getStatus() == VideoStatus.UPLOADED || e.getStatus() == VideoStatus.PROCESSING) return true;
        String created = e.getCreatedAt();
        if (created == null || created.isBlank()) return false;
        try {
            return Instant.parse(created).isAfter(Instant.now().minus(java.time.Duration.ofHours(gcGraceHours)));
        } catch (Exception ex) { return false; }
    }

    /** Extrait l'id video d'un nom d'entree : "vid-ab12.mp4"/"vid-ab12-hls"/"vid-ab12-src.mp4" -> "vid-ab12". */
    static String videoIdFromEntry(String name) {
        String base = name;
        int dot = base.lastIndexOf('.');
        if (dot > 0) base = base.substring(0, dot);
        for (String suf : new String[]{"-hls", "-src", "-poster"}) {
            if (base.endsWith(suf)) return base.substring(0, base.length() - suf.length());
        }
        return base;
    }

    /** GC des videos orphelines (entites non referencees + fichiers vid-* sans entite). */
    public VideoGcReport gcOrphans(boolean dryRun) {
        java.util.List<String> orphanVideos = new java.util.ArrayList<>();
        java.util.List<String> orphanFiles = new java.util.ArrayList<>();
        java.util.Set<String> knownIds = new java.util.HashSet<>();
        for (VideoEntity e : repository.findAll()) {
            knownIds.add(e.getId());
            if (inGrace(e)) continue;
            if (!isReferenced(e.getId())) orphanVideos.add(e.getId());
        }
        Path dir = Paths.get(uploadDir);
        if (Files.isDirectory(dir)) {
            try (var stream = Files.list(dir)) {
                for (Path p : stream.toList()) {
                    String name = p.getFileName().toString();
                    if (!name.startsWith("vid-")) continue;
                    String id = videoIdFromEntry(name);
                    if (id != null && knownIds.contains(id)) continue;
                    try {
                        if (Files.getLastModifiedTime(p).toInstant()
                                .isAfter(Instant.now().minus(java.time.Duration.ofHours(gcGraceHours)))) continue;
                    } catch (IOException ignored) {}
                    orphanFiles.add(name);
                }
            } catch (IOException ignored) {}
        }
        if (!dryRun) {
            for (String id : orphanVideos) delete(id);
            Path uploadPath = dir.toAbsolutePath().normalize();
            for (String name : orphanFiles) {
                Path fp = uploadPath.resolve(name).normalize();
                if (!fp.startsWith(uploadPath)) continue;
                if (Files.isDirectory(fp)) deleteDirRecursive(fp);
                else { try { Files.deleteIfExists(fp); } catch (IOException ignored) {} }
            }
        }
        return new VideoGcReport(orphanVideos, orphanFiles, !dryRun);
    }

    // -----------------------------------------------------------------------
    // Suppression
    // -----------------------------------------------------------------------

    /**
     * Supprime tous les fichiers associes a une video et son entite.
     * Retourne true si l'entite existait, false sinon.
     */
    @Transactional
    public boolean delete(String id) {
        return repository.findById(id).map(entity -> {
            Path dir = Paths.get(uploadDir);
            deleteIfPresent(dir, entity.getSourceFilename());
            deleteIfPresent(dir, entity.getOutputFilename());
            deleteIfPresent(dir, entity.getPosterFilename());
            deleteDirRecursive(dir.resolve(id + "-hls"));
            repository.delete(entity);
            return true;
        }).orElse(false);
    }

    /**
     * Supprime un fichier par son nom de fichier simple (sans entite DB).
     * Conserve pour la compatibilite avec AdminVideoController existant qui
     * appelle delete(filename) sur les .vtt (pas d'entite Video).
     * La refonte d'AdminVideoController interviendra dans la tache suivante.
     */
    public boolean deleteByFilename(String filename) {
        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(filename).normalize();
            if (!filePath.startsWith(uploadPath)) {
                return false;
            }
            return Files.deleteIfExists(filePath);
        } catch (IOException e) {
            return false;
        }
    }

    private void deleteIfPresent(Path dir, String filename) {
        if (filename == null) return;
        try {
            Files.deleteIfExists(dir.resolve(filename));
        } catch (IOException ignored) {
        }
    }

    private void deleteDirRecursive(Path dir) {
        if (!Files.exists(dir)) return;
        try (var walk = Files.walk(dir)) {
            walk.sorted(java.util.Comparator.reverseOrder())
                    .forEach(p -> { try { Files.deleteIfExists(p); } catch (IOException ignored) {} });
        } catch (IOException ignored) {}
    }

    // -----------------------------------------------------------------------
    // Recovery au demarrage
    // -----------------------------------------------------------------------

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void recoverStaleProcessing() {
        List<VideoEntity> stale = repository.findByStatus(VideoStatus.PROCESSING);
        for (VideoEntity e : stale) {
            e.setStatus(VideoStatus.FAILED);
            e.setErrorMessage("Transcodage interrompu (redemarrage)");
            e.setUpdatedAt(Instant.now().toString());
            repository.save(e);
        }
    }

    // -----------------------------------------------------------------------
    // Service des fichiers (utilise par VideoController)
    // -----------------------------------------------------------------------

    public Resource loadAsResource(String filename) throws MalformedURLException {
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

    // -----------------------------------------------------------------------
    // DTO interne
    // -----------------------------------------------------------------------

    /**
     * Resultat de l'upload.
     *
     * Pour une video (.mp4/.webm) : id=vid-xxx, status=UPLOADED, url=null (pas encore prete),
     *   filename=fichier source.
     * Pour des sous-titres (.vtt) : id=null, status=null, url=url_directe, filename=nom fichier.
     * La retrocompatibilite avec AdminVideoController est assuree via les accesseurs url() et
     * filename() qui existaient dans l'ancienne implementation.
     */
    public record StoredVideo(String id, String status, String url, String filename) {}

    // -----------------------------------------------------------------------
    // Utilitaires
    // -----------------------------------------------------------------------

    private static String extractExtension(String originalName) {
        if (originalName == null || originalName.isEmpty()) return "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex < 0) return "";
        return originalName.substring(dotIndex).toLowerCase(Locale.ROOT);
    }
}
