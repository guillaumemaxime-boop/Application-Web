package com.atelier.portfolio.service;

import net.coobird.thumbnailator.Thumbnails;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

/**
 * Optimise les images uploadees : redimensionne au max {@value #MAX_DIMENSION}px
 * sur le grand cote, compresse JPEG a {@value #JPEG_QUALITY}. PNG reste PNG
 * (preservation de l'alpha). GIF/WebP/AVIF passent inchanges car ImageIO/Thumbnailator
 * standard ne les supporte pas (GIF animes seraient casses, WebP/AVIF non encodables).
 *
 * <p><b>EXIF orientation preservee :</b> les photos prises en portrait (orientation
 * EXIF 6 / 8 / 3 / etc.) sont automatiquement pivotees aux pixels avant l'optim via
 * {@code useExifOrientation(true)}. Sans ca, le decode JPEG ignorait l'EXIF et
 * l'image ressortait pivotee de travers.
 *
 * <p>Aucun upscale : les dimensions sont lues d'abord ; si la source est deja plus
 * petite que MAX_DIMENSION, on passe par {@code scale(1.0)} pour preserver la taille
 * (Thumbnailator's {@code size()} agrandit par defaut).
 *
 * <p>Si l'optim aboutit a un fichier plus gros que l'original (image deja optimale),
 * l'original est conserve.
 *
 * <p>Sur erreur de decoding (image corrompue, format inconnu), les bytes originaux
 * sont retournes : la conformite (l'image arrive a destination) prime sur l'optim.
 */
public final class ImageOptimizer {

    static final int MAX_DIMENSION = 1920;
    static final double JPEG_QUALITY = 0.85;

    private static final Set<String> OPTIMIZABLE_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png");

    private ImageOptimizer() {
    }

    /**
     * Renvoie les bytes optimises pour les extensions JPEG/PNG, les bytes inchanges
     * pour tout le reste. Ne leve jamais : en cas d'erreur, fallback sur l'entree.
     */
    public static byte[] optimize(byte[] input, String extension) {
        if (input == null || input.length == 0) return input;
        String normalized = extension == null ? "" : extension.toLowerCase(Locale.ROOT);
        if (!OPTIMIZABLE_EXTENSIONS.contains(normalized)) return input;

        boolean isJpeg = normalized.equals(".jpg") || normalized.equals(".jpeg");
        String outputFormat = isJpeg ? "jpg" : "png";

        try {
            int maxSide = readMaxDimension(input);
            if (maxSide <= 0) return input;
            boolean needsResize = maxSide > MAX_DIMENSION;

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.Builder<? extends InputStream> builder = Thumbnails.of(new ByteArrayInputStream(input))
                    .useExifOrientation(true)
                    .outputFormat(outputFormat);
            if (needsResize) {
                builder = builder.size(MAX_DIMENSION, MAX_DIMENSION).keepAspectRatio(true);
            } else {
                builder = builder.scale(1.0);
            }
            if (isJpeg) {
                builder = builder.outputQuality(JPEG_QUALITY);
            }
            builder.toOutputStream(out);

            byte[] optimized = out.toByteArray();
            return optimized.length < input.length ? optimized : input;
        } catch (Exception e) {
            return input;
        }
    }

    private static int readMaxDimension(byte[] input) throws IOException {
        try (ImageInputStream iis = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            if (iis == null) return 0;
            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) return 0;
            ImageReader reader = readers.next();
            try {
                reader.setInput(iis);
                return Math.max(reader.getWidth(0), reader.getHeight(0));
            } finally {
                reader.dispose();
            }
        }
    }
}
