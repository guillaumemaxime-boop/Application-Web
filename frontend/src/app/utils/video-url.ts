export type VideoPlatform = 'youtube' | 'vimeo';

export interface ParsedVideo {
  platform: VideoPlatform;
  id: string;
}

const YOUTUBE_PATTERNS: RegExp[] = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/i,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{6,})/i,
  /^https?:\/\/youtu\.be\/([\w-]{6,})/i,
];

const VIMEO_PATTERNS: RegExp[] = [
  /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i,
  /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i,
];

export function parseVideoUrl(url: string): ParsedVideo | null {
  if (!url) return null;
  for (const pattern of YOUTUBE_PATTERNS) {
    const m = url.match(pattern);
    if (m) return { platform: 'youtube', id: m[1] };
  }
  for (const pattern of VIMEO_PATTERNS) {
    const m = url.match(pattern);
    if (m) return { platform: 'vimeo', id: m[1] };
  }
  return null;
}
