package com.atelier.portfolio.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class ImageOptimizerTest {

    @Test
    void redimensionne_une_grande_image_jpeg_au_max_1920px() throws IOException {
        byte[] input = makeJpeg(3000, 2000);
        byte[] output = ImageOptimizer.optimize(input, ".jpg");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(output));
        assertThat(decoded.getWidth()).isEqualTo(1920);
        assertThat(decoded.getHeight()).isEqualTo(1280);
        assertThat(output.length).isLessThan(input.length);
    }

    @Test
    void redimensionne_une_grande_image_png_au_max_1920px() throws IOException {
        byte[] input = makePng(2500, 2500);
        byte[] output = ImageOptimizer.optimize(input, ".png");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(output));
        assertThat(decoded.getWidth()).isEqualTo(1920);
        assertThat(decoded.getHeight()).isEqualTo(1920);
    }

    @Test
    void recompresse_un_jpeg_deja_plus_petit_que_1920px() throws IOException {
        byte[] input = makeJpegHighQuality(800, 600);
        byte[] output = ImageOptimizer.optimize(input, ".jpeg");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(output));
        // Dimensions inchangees (pas d'upscale)
        assertThat(decoded.getWidth()).isEqualTo(800);
        assertThat(decoded.getHeight()).isEqualTo(600);
        // Compression a 0.85 vs source non compressee → output plus petit
        assertThat(output.length).isLessThan(input.length);
    }

    @Test
    void laisse_un_png_petit_inchange() throws IOException {
        byte[] input = makePng(400, 300);
        byte[] output = ImageOptimizer.optimize(input, ".png");
        assertThat(output).isSameAs(input);
    }

    @Test
    void laisse_un_gif_inchange() throws IOException {
        byte[] input = makeJpeg(3000, 2000); // contenu jpeg mais extension gif → on ne touche pas
        byte[] output = ImageOptimizer.optimize(input, ".gif");
        assertThat(output).isSameAs(input);
    }

    @Test
    void laisse_un_webp_inchange() throws IOException {
        byte[] input = makeJpeg(3000, 2000);
        byte[] output = ImageOptimizer.optimize(input, ".webp");
        assertThat(output).isSameAs(input);
    }

    @Test
    void laisse_un_avif_inchange() throws IOException {
        byte[] input = makeJpeg(3000, 2000);
        byte[] output = ImageOptimizer.optimize(input, ".avif");
        assertThat(output).isSameAs(input);
    }

    @Test
    void retourne_input_inchange_si_bytes_corrompus() {
        byte[] input = new byte[] { 1, 2, 3, 4, 5 };
        byte[] output = ImageOptimizer.optimize(input, ".jpg");
        assertThat(output).isSameAs(input);
    }

    @Test
    void retourne_input_inchange_si_null_ou_vide() {
        assertThat(ImageOptimizer.optimize(null, ".jpg")).isNull();
        byte[] empty = new byte[0];
        assertThat(ImageOptimizer.optimize(empty, ".jpg")).isSameAs(empty);
    }

    @Test
    void garde_loriginal_si_loptim_aboutit_a_un_fichier_plus_gros() throws IOException {
        // Petit JPEG deja tres compresse en source — l'optim peut produire plus gros
        byte[] input = makeJpegAlreadyCompressed(100, 100);
        byte[] output = ImageOptimizer.optimize(input, ".jpg");
        assertThat(output.length).isLessThanOrEqualTo(input.length);
    }

    @Test
    void extension_en_majuscules_est_normalisee() throws IOException {
        byte[] input = makeJpeg(2500, 2500);
        byte[] output = ImageOptimizer.optimize(input, ".JPG");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(output));
        assertThat(decoded.getWidth()).isEqualTo(1920);
    }

    @Test
    void preserve_le_ratio_aspect_quand_redimensionne() throws IOException {
        byte[] input = makeJpeg(4000, 1000);
        byte[] output = ImageOptimizer.optimize(input, ".jpg");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(output));
        assertThat(decoded.getWidth()).isEqualTo(1920);
        assertThat(decoded.getHeight()).isEqualTo(480);
    }

    // --- helpers ---

    private static byte[] makeJpeg(int w, int h) throws IOException {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        paintNoise(img);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", out);
        return out.toByteArray();
    }

    private static byte[] makeJpegHighQuality(int w, int h) throws IOException {
        // Force qualite max via Thumbnails pour creer une source "lourde"
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        paintNoise(img);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        net.coobird.thumbnailator.Thumbnails.of(img).scale(1.0).outputFormat("jpg").outputQuality(1.0).toOutputStream(out);
        return out.toByteArray();
    }

    private static byte[] makeJpegAlreadyCompressed(int w, int h) throws IOException {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        // Aplat uni : encode tres petit en JPEG
        Graphics2D g = img.createGraphics();
        g.setColor(Color.GRAY);
        g.fillRect(0, 0, w, h);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        net.coobird.thumbnailator.Thumbnails.of(img).scale(1.0).outputFormat("jpg").outputQuality(0.4).toOutputStream(out);
        return out.toByteArray();
    }

    private static byte[] makePng(int w, int h) throws IOException {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        paintNoise(img);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    private static void paintNoise(BufferedImage img) {
        // Bruit pseudo-aleatoire deterministe pour creer un contenu reellement
        // compressible (eviter les aplats qui rendent les tests fragiles).
        long seed = 42;
        for (int y = 0; y < img.getHeight(); y++) {
            for (int x = 0; x < img.getWidth(); x++) {
                seed = (seed * 1103515245L + 12345L) & 0x7fffffffL;
                int rgb = (int) (seed & 0xffffff);
                img.setRGB(x, y, rgb);
            }
        }
    }
}
