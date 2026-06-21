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
}
