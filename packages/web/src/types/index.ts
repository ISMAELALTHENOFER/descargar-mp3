export interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  author: string;
  url: string;
  formats: AudioFormat[];
  related: RelatedVideo[];
}

export interface AudioFormat {
  itag: number;
  quality: string;
  bitrate: number;
  container: string;
  hasAudio: boolean;
}

export interface RelatedVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
}

export type DownloadStatus =
  | 'idle'
  | 'analyzing'
  | 'ready'
  | 'queued'
  | 'downloading'
  | 'converting'
  | 'done'
  | 'error';

export interface DownloadJob {
  id: string;
  status: DownloadStatus;
  progress: number;
  metadata: VideoMetadata | null;
  error: string | null;
}

export interface SSEEvent {
  type: 'progress' | 'status' | 'error' | 'done';
  jobId: string;
  data: Record<string, unknown>;
}
