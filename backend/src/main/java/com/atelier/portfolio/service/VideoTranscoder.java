package com.atelier.portfolio.service;

import java.io.IOException;
import java.nio.file.Path;

/** Abstraction du transcodage video. Mockable en test ; impl FFmpeg en prod. */
public interface VideoTranscoder {
    boolean isAvailable();
    VideoMeta probe(Path source) throws IOException, InterruptedException;
    void transcode(Path source, Path outMp4, Path outPoster, TranscodeOptions options)
            throws IOException, InterruptedException;
    /** Genere un HLS multi-rendition (TS) dans hlsDir a partir de inputMp4. */
    void generateHls(java.nio.file.Path inputMp4, java.nio.file.Path hlsDir, int sourceHeight, HlsOptions options)
            throws java.io.IOException, InterruptedException;

    record VideoMeta(double durationSeconds, int width, int height) {}
    record TranscodeOptions(int maxHeight, int crf, String preset, int timeoutSeconds, int posterOffsetSeconds) {}
    record HlsOptions(int hlsTimeSeconds, String preset) {}
    record Rendition(int height, int videoBitrateK, int audioBitrateK) {}
}
