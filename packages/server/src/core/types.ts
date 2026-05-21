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
}

export interface PlaylistMetadata {
  title: string;
  items: PlaylistItem[];
}

export type JobStatus =
  | 'queued'
  | 'analyzing'
  | 'downloading'
  | 'converting'
  | 'done'
  | 'error';

export interface Job {
  id: string;
  url: string;
  status: JobStatus;
  progress: number;
  metadata: VideoMetadata | null;
  error: string | null;
  createdAt: Date;
}

export interface SSEEvent {
  type: 'progress' | 'status' | 'error' | 'done';
  jobId: string;
  data: unknown;
}

export type DownloadQuality = '128' | '192' | '320';

export interface DownloadOptions {
  url: string;
  quality?: DownloadQuality;
}
