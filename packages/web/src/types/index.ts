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

export interface PlaylistItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  duration?: number;
}

export interface PlaylistMetadata {
  title: string;
  items: PlaylistItem[];
  totalItems: number;
}

export type DownloadStatus =
  | 'idle'
  | 'analyzing'
  | 'ready'
  | 'playlist'
  | 'queued'
  | 'downloading'
  | 'converting'
  | 'done'
  | 'error';

export interface DownloadJob {
  id: string;
  url: string;
  status: DownloadStatus;
  progress: number;
  metadata: VideoMetadata | null;
  error: string | null;
  downloadUrl?: string;
  title?: string;
}

export interface BatchDownloadResponse {
  batchId: string;
  jobs: { jobId: string; url: string }[];
}

export interface BatchProgress {
  total: number;
  done: number;
  error: number;
  jobs: {
    id: string;
    status: string;
    progress: number;
    title?: string;
    error?: string;
  }[];
}

export type DownloadQuality = '128' | '192' | '320';
