package com.atelier.portfolio.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class FfmpegVideoTranscoder implements VideoTranscoder {

    private final boolean enabled;
    private final String ffmpeg;
    private final String ffprobe;
    private final ObjectMapper mapper = new ObjectMapper();
    private Boolean availableCache;

    public FfmpegVideoTranscoder(
            @Value("${app.video.transcode.enabled:true}") boolean enabled,
            @Value("${app.video.ffmpeg-path:ffmpeg}") String ffmpeg,
            @Value("${app.video.ffprobe-path:ffprobe}") String ffprobe) {
        this.enabled = enabled;
        this.ffmpeg = ffmpeg;
        this.ffprobe = ffprobe;
    }

    static List<String> buildTranscodeArgs(String ffmpeg, Path in, Path out, TranscodeOptions o) {
        List<String> a = new ArrayList<>(List.of(
                ffmpeg, "-y", "-i", in.toString(),
                "-vf", "scale=-2:'min(" + o.maxHeight() + ",ih)'",
                "-c:v", "libx264", "-preset", o.preset(), "-crf", String.valueOf(o.crf()),
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                out.toString()));
        return a;
    }

    static List<String> buildPosterArgs(String ffmpeg, Path in, Path poster, int offsetSeconds) {
        return List.of(ffmpeg, "-y", "-ss", String.valueOf(offsetSeconds), "-i", in.toString(),
                "-frames:v", "1", "-q:v", "3", poster.toString());
    }

    static List<String> buildProbeArgs(String ffprobe, Path in) {
        return List.of(ffprobe, "-v", "error", "-show_streams", "-show_format",
                "-of", "json", in.toString());
    }

    @Override
    public boolean isAvailable() {
        if (!enabled) return false;
        if (availableCache != null) return availableCache;
        try {
            Process p = new ProcessBuilder(ffmpeg, "-version").redirectErrorStream(true).start();
            availableCache = p.waitFor(10, TimeUnit.SECONDS) && p.exitValue() == 0;
        } catch (IOException | InterruptedException e) {
            availableCache = false;
        }
        return availableCache;
    }

    @Override
    public VideoMeta probe(Path source) throws IOException, InterruptedException {
        String json = runCapture(buildProbeArgs(ffprobe, source), 30);
        JsonNode root = mapper.readTree(json);
        double duration = root.path("format").path("duration").asDouble(0);
        int w = 0, h = 0;
        for (JsonNode s : root.path("streams")) {
            if ("video".equals(s.path("codec_type").asText())) {
                w = s.path("width").asInt(0);
                h = s.path("height").asInt(0);
                break;
            }
        }
        if (w == 0 || h == 0) throw new IOException("Pas de flux video valide");
        return new VideoMeta(duration, w, h);
    }

    @Override
    public void transcode(Path source, Path outMp4, Path outPoster, TranscodeOptions o)
            throws IOException, InterruptedException {
        runVoid(buildTranscodeArgs(ffmpeg, source, outMp4, o), o.timeoutSeconds());
        runVoid(buildPosterArgs(ffmpeg, source, outPoster, o.posterOffsetSeconds()), 60);
    }

    private void runVoid(List<String> args, int timeoutSeconds) throws IOException, InterruptedException {
        Process p = new ProcessBuilder(args).redirectErrorStream(true).start();
        if (!p.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
            p.destroyForcibly();
            throw new IOException("Timeout ffmpeg apres " + timeoutSeconds + "s");
        }
        if (p.exitValue() != 0) {
            // Cap la lecture du diagnostic (le process a deja quitte) : evite un
            // OOM theorique si ffmpeg crache une sortie anormalement volumineuse.
            String diag = new String(p.getInputStream().readNBytes(4096), java.nio.charset.StandardCharsets.UTF_8);
            throw new IOException("ffmpeg a echoue (code " + p.exitValue() + ") : " + diag);
        }
    }

    private String runCapture(List<String> args, int timeoutSeconds) throws IOException, InterruptedException {
        Process p = new ProcessBuilder(args).start();
        byte[] out = p.getInputStream().readAllBytes();
        if (!p.waitFor(timeoutSeconds, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new IOException("Timeout ffprobe"); }
        if (p.exitValue() != 0) throw new IOException("ffprobe a echoue (code " + p.exitValue() + ")");
        return new String(out);
    }
}
