package com.atelier.portfolio.service;

import com.atelier.portfolio.service.VideoTranscoder.TranscodeOptions;
import org.junit.jupiter.api.Test;
import java.nio.file.Path;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class FfmpegVideoTranscoderTest {
    @Test
    void buildTranscodeArgs_contient_h264_aac_faststart_et_plafond_hauteur() {
        List<String> args = FfmpegVideoTranscoder.buildTranscodeArgs(
                "ffmpeg", Path.of("in.mp4"), Path.of("out.mp4"),
                new TranscodeOptions(1080, 23, "medium", 600, 1));
        assertTrue(args.contains("libx264"));
        assertTrue(args.contains("aac"));
        assertTrue(args.contains("+faststart"));
        assertTrue(args.stream().anyMatch(a -> a.contains("min(1080,ih)")), "plafond hauteur sans upscale");
        assertTrue(args.stream().anyMatch(a -> a.contains("23")), "crf");
        assertEquals("ffmpeg", args.get(0));
        assertEquals("out.mp4", args.get(args.size() - 1));
    }

    @Test
    void buildPosterArgs_extrait_une_frame_a_l_offset() {
        List<String> args = FfmpegVideoTranscoder.buildPosterArgs(
                "ffmpeg", Path.of("in.mp4"), Path.of("p.jpg"), 1);
        assertTrue(args.contains("-ss"));
        assertTrue(args.contains("1"));
        assertTrue(args.contains("-frames:v"));
        assertEquals("p.jpg", args.get(args.size() - 1));
    }

    @Test
    void buildProbeArgs_demande_json_streams_format() {
        List<String> args = FfmpegVideoTranscoder.buildProbeArgs("ffprobe", Path.of("in.mp4"));
        assertTrue(args.contains("-show_streams"));
        assertTrue(args.contains("-show_format"));
        assertTrue(args.contains("json"));
    }

    @Test
    void renditionsFor_plafonne_a_la_hauteur_source() {
        var r = FfmpegVideoTranscoder.renditionsFor(720);
        assertEquals(java.util.List.of(360, 720), r.stream().map(VideoTranscoder.Rendition::height).toList());
        assertFalse(FfmpegVideoTranscoder.renditionsFor(240).isEmpty());
        assertEquals(3, FfmpegVideoTranscoder.renditionsFor(1080).size());
    }

    @Test
    void buildHlsArgs_master_varstreammap_et_libx264() {
        var rends = java.util.List.of(new VideoTranscoder.Rendition(360, 800, 96),
                                      new VideoTranscoder.Rendition(720, 2500, 128));
        var args = FfmpegVideoTranscoder.buildHlsArgs("ffmpeg",
                java.nio.file.Path.of("in.mp4"), java.nio.file.Path.of("/up/vid-1-hls"), rends, 6, "veryfast");
        assertEquals("ffmpeg", args.get(0));
        assertTrue(args.contains("libx264"));
        assertTrue(args.stream().anyMatch(a -> a.contains("v:0,a:0")));
        assertTrue(args.stream().anyMatch(a -> a.contains("master.m3u8")));
        assertTrue(args.contains("hls"));
        assertTrue(args.stream().anyMatch(a -> a.contains("h=360")));
        assertTrue(args.stream().anyMatch(a -> a.contains("h=720")));
    }
}
