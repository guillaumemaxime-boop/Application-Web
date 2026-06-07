package com.atelier.portfolio.service;

import net.coobird.thumbnailator.Thumbnails;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;

/**
 * Optimise les images uploadees : redimensionne au max {@value #MAX_DIMENSION}px
 * sur le grand cote, compresse JPEG a {@value #JPEG_QUALITY}. PNG reste PNG
 * (preservation de l'alpha). GIF/WebP/AVIF passent inchanges car ImageIO/Thumbnailator
 * standard ne les supporte pas (GIF animes seraient casses, WebP/AVIF non encodables).
 *
 * Aucun upscale : si l'image source est deja plus petite que MAX_DIMENSION,
 * elle est juste recompressee (JPEG) ou laissee telle quelle (PNG).
 *
 * Sur erreur de decoding (image corrompue, format inconnu), les bytes originaux
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

        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(input));
            if (source == null) return input;

            int maxSide = Math.max(source.getWidth(), source.getHeight());
            boolean needsResize = maxSide > MAX_DIMENSION;
            boolean isJpeg = normalized.equals(".jpg") || normalized.equals(".jpeg");

            // PNG deja plus petit que MAX_DIMENSION : aucune compression utile, sortie identique
            if (!needsResize && !isJpeg) return input;

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.Builder<BufferedImage> builder = Thumbnails.of(source);
            if (needsResize) {
                builder = builder.size(MAX_DIMENSION, MAX_DIMENSION);
            } else {
                builder = builder.scale(1.0);
            }
            if (isJpeg) {
                builder = builder.outputFormat("jpg").outputQuality(JPEG_QUALITY);
            } else {
                builder = builder.outputFormat("png");
            }
            builder.toOutputStream(out);

            byte[] optimized = out.toByteArray();
            // Securite : si l'optim a paradoxalement augmente la taille (petites images
            // PNG, deja optimisees), garde l'original.
            return optimized.length < input.length ? optimized : input;
        } catch (IOException e) {
            return input;
        }
    }
}
