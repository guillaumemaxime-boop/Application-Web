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
    void garde_les_dimensions_d_un_jpeg_petit_sans_upscale() throws IOException {
        byte[] input = makeJpegHighQuality(800, 600);
        byte[] output = ImageOptimizer.optimize(input, ".jpeg");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(output));
        // Dimensions inchangees, pas d'upscale (Thumbnails size() ne grossit pas)
        assertThat(decoded.getWidth()).isEqualTo(800);
        assertThat(decoded.getHeight()).isEqualTo(600);
        // Securite : si Thumbnailator n'a pas pu reduire (deja optimal), garde l'original
        assertThat(output.length).isLessThanOrEqualTo(input.length);
    }

    @Test
    void garde_les_dimensions_d_un_png_petit_sans_upscale() throws IOException {
        byte[] input = makePng(400, 300);
        byte[] output = ImageOptimizer.optimize(input, ".png");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(output));
        assertThat(decoded.getWidth()).isEqualTo(400);
        assertThat(decoded.getHeight()).isEqualTo(300);
        assertThat(output.length).isLessThanOrEqualTo(input.length);
    }

    @Test
    void accepte_un_jpeg_avec_segment_EXIF_sans_planter() throws IOException {
        // JPEG avec un segment APP1 EXIF (orientation 1, par defaut). On verifie juste
        // que useExifOrientation(true) n'explose pas sur un input avec EXIF.
        // La validation effective de la rotation se fait en manuel avec une vraie photo
        // d'appareil (les EXIF forges manuellement ne sont pas toujours reconnus par
        // l'ImageReader JPEG standard, suivant l'ordre des segments APP).
        byte[] withExif = makeJpegWithExifOrientation(800, 600, 1);
        byte[] output = ImageOptimizer.optimize(withExif, ".jpg");
        assertThat(output).isNotNull();
        assertThat(output.length).isGreaterThan(0);
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

    /**
     * Construit un JPEG avec un segment APP1 EXIF contenant uniquement la balise
     * Orientation. Format TIFF little-endian, IFD0 avec une seule entree.
     * Suffisant pour valider que Thumbnailator detecte et applique l'EXIF.
     */
    private static byte[] makeJpegWithExifOrientation(int w, int h, int orientation) throws IOException {
        // Genere d'abord un JPEG normal
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        paintNoise(img);
        ByteArrayOutputStream base = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", base);
        byte[] baseBytes = base.toByteArray();

        // Construit le payload EXIF
        ByteArrayOutputStream exif = new ByteArrayOutputStream();
        exif.write('E'); exif.write('x'); exif.write('i'); exif.write('f'); exif.write(0); exif.write(0);
        // TIFF header (little-endian)
        exif.write('I'); exif.write('I');
        writeLE16(exif, 0x002A);          // magic 42
        writeLE32(exif, 8);                // offset vers IFD0 (immediat apres header)
        // IFD0
        writeLE16(exif, 1);                // 1 entree
        // Entry : tag=0x0112 (Orientation), type=3 (SHORT), count=1, value=orientation
        writeLE16(exif, 0x0112);
        writeLE16(exif, 3);
        writeLE32(exif, 1);
        // SHORT (2 bytes) + padding (2 bytes) — la valeur tient dans les 4 bytes du champ value
        writeLE16(exif, orientation);
        writeLE16(exif, 0);
        // next IFD offset = 0
        writeLE32(exif, 0);

        byte[] exifPayload = exif.toByteArray();

        // Assemble le JPEG final : SOI + APP1[EXIF] + (rest of base JPEG sans son SOI)
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0xFF); out.write(0xD8);  // SOI
        out.write(0xFF); out.write(0xE1);  // APP1 marker
        int segmentLen = exifPayload.length + 2;  // +2 pour les 2 octets de longueur
        out.write((segmentLen >> 8) & 0xFF);
        out.write(segmentLen & 0xFF);
        out.write(exifPayload);
        // Rest of base JPEG (skip ses 2 octets SOI)
        out.write(baseBytes, 2, baseBytes.length - 2);
        return out.toByteArray();
    }

    private static void writeLE16(ByteArrayOutputStream out, int v) {
        out.write(v & 0xFF);
        out.write((v >> 8) & 0xFF);
    }

    private static void writeLE32(ByteArrayOutputStream out, int v) {
        out.write(v & 0xFF);
        out.write((v >> 8) & 0xFF);
        out.write((v >> 16) & 0xFF);
        out.write((v >> 24) & 0xFF);
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
