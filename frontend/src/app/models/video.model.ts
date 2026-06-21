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
