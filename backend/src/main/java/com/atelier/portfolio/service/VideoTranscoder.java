package com.atelier.portfolio.service;

import java.io.IOException;
import java.nio.file.Path;

/** Abstraction du transcodage video. Mockable en test ; impl FFmpeg en prod. */
public interface VideoTranscoder {
    boolean isAvailable();
    VideoMeta probe(Path source) throws IOException, InterruptedException;
    void transcode(Path source, Path outMp4, Path outPoster, TranscodeOptions options)
            throws IOException, InterruptedException;

    record VideoMeta(double durationSeconds, int width, int height) {}
    record TranscodeOptions(int maxHeight, int crf, String preset, int timeoutSeconds, int posterOffsetSeconds) {}
}
