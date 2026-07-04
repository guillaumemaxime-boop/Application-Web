export type VideoStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export interface VideoStatusDto {
  id: string;
  status: VideoStatus;
  url?: string | null;
  hls?: string | null;
  poster?: string | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  errorMessage?: string | null;
}

export interface VideoUsage {
  type: 'furniture' | 'exhibition' | 'studio';
  label: string;
  slug: string | null;
}

export interface VideoSummary {
  id: string;
  status: VideoStatus;
  originalName: string | null;
  url: string | null;
  poster: string | null;
  hls: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  createdAt: string | null;
  errorMessage: string | null;
  usedBy: VideoUsage[];
}
