package com.atelier.portfolio.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
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

    private static final List<VideoTranscoder.Rendition> LADDER = List.of(
            new VideoTranscoder.Rendition(360, 800, 96),
            new VideoTranscoder.Rendition(720, 2500, 128),
            new VideoTranscoder.Rendition(1080, 5000, 128));

    static List<VideoTranscoder.Rendition> renditionsFor(int sourceHeight) {
        var kept = LADDER.stream().filter(r -> r.height() <= sourceHeight).toList();
        return kept.isEmpty() ? List.of(LADDER.get(0)) : kept;
    }

    static List<String> buildHlsArgs(String ffmpeg, Path in, Path hlsDir,
            List<VideoTranscoder.Rendition> rends, int hlsTime, String preset) {
        List<String> a = new ArrayList<>();
        a.add(ffmpeg); a.add("-y"); a.add("-i"); a.add(in.toString());
        StringBuilder fc = new StringBuilder("[0:v]split=").append(rends.size());
        for (int i = 0; i < rends.size(); i++) fc.append("[v").append(i).append("]");
        fc.append(";");
        for (int i = 0; i < rends.size(); i++) {
            fc.append("[v").append(i).append("]scale=w=-2:h=").append(rends.get(i).height())
              .append("[v").append(i).append("out]");
            if (i < rends.size() - 1) fc.append(";");
        }
        a.add("-filter_complex"); a.add(fc.toString());
        for (int i = 0; i < rends.size(); i++) {
            var r = rends.get(i);
            a.add("-map"); a.add("[v" + i + "out]");
            a.add("-c:v:" + i); a.add("libx264");
            a.add("-preset"); a.add(preset);
            a.add("-b:v:" + i); a.add(r.videoBitrateK() + "k");
            a.add("-maxrate:v:" + i); a.add((int)(r.videoBitrateK() * 1.07) + "k");
            a.add("-bufsize:v:" + i); a.add((r.videoBitrateK() * 2) + "k");
            a.add("-g"); a.add("48"); a.add("-keyint_min"); a.add("48"); a.add("-sc_threshold"); a.add("0");
            a.add("-map"); a.add("a:0?");
            a.add("-c:a:" + i); a.add("aac");
            a.add("-b:a:" + i); a.add(r.audioBitrateK() + "k");
        }
        StringBuilder vsm = new StringBuilder();
        for (int i = 0; i < rends.size(); i++) { if (i > 0) vsm.append(" "); vsm.append("v:").append(i).append(",a:").append(i); }
        a.add("-var_stream_map"); a.add(vsm.toString());
        a.add("-master_pl_name"); a.add("master.m3u8");
        a.add("-f"); a.add("hls");
        a.add("-hls_time"); a.add(String.valueOf(hlsTime));
        a.add("-hls_playlist_type"); a.add("vod");
        a.add("-hls_segment_filename"); a.add(hlsDir.resolve("%v_%03d.ts").toString());
        a.add(hlsDir.resolve("%v.m3u8").toString());
        return a;
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
        runToFile(buildTranscodeArgs(ffmpeg, source, outMp4, o), o.timeoutSeconds());
        runToFile(buildPosterArgs(ffmpeg, source, outPoster, o.posterOffsetSeconds()), 60);
    }

    @Override
    public void generateHls(Path inputMp4, Path hlsDir, int sourceHeight, HlsOptions o)
            throws IOException, InterruptedException {
        Files.createDirectories(hlsDir);
        runToFile(buildHlsArgs(ffmpeg, inputMp4, hlsDir, renditionsFor(sourceHeight), o.hlsTimeSeconds(), o.preset()), 1800);
    }

    /** Lance un process (stdout+stderr -> fichier temp, evite tout blocage de pipe),
     *  timeout + kill. Leve si exit != 0 (extrait plafonne du diagnostic). */
    private void runToFile(List<String> args, int timeoutSeconds) throws IOException, InterruptedException {
        Path log = Files.createTempFile("ff", ".log");
        try {
            Process p = new ProcessBuilder(args).redirectErrorStream(true).redirectOutput(log.toFile()).start();
            if (!p.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                throw new IOException("Timeout (" + timeoutSeconds + "s) : " + args.get(0));
            }
            if (p.exitValue() != 0) {
                byte[] tail; long size = Files.size(log); long from = Math.max(0, size - 4096);
                try (FileChannel ch = FileChannel.open(log)) {
                    ch.position(from);
                    ByteBuffer buf = ByteBuffer.allocate((int) Math.min(4096, size));
                    while (buf.hasRemaining() && ch.read(buf) > 0) { /* fill */ }
                    tail = Arrays.copyOf(buf.array(), buf.position());
                }
                throw new IOException(args.get(0) + " a echoue (code " + p.exitValue() + ") : "
                        + new String(tail, StandardCharsets.UTF_8));
            }
        } finally {
            Files.deleteIfExists(log);
        }
    }

    private String runCapture(List<String> args, int timeoutSeconds) throws IOException, InterruptedException {
        Path out = Files.createTempFile("ffprobe", ".json");
        try {
            Process p = new ProcessBuilder(args).redirectErrorStream(true).redirectOutput(out.toFile()).start();
            if (!p.waitFor(timeoutSeconds, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new IOException("Timeout ffprobe"); }
            if (p.exitValue() != 0) throw new IOException("ffprobe a echoue (code " + p.exitValue() + ")");
            try (var in = Files.newInputStream(out)) { return new String(in.readNBytes(1_048_576), StandardCharsets.UTF_8); }
        } finally {
            Files.deleteIfExists(out);
        }
    }
}
