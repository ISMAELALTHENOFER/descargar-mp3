import { VideoMetadata, DownloadJob, PlaylistMetadata, BatchDownloadResponse, BatchProgress, DownloadQuality } from '../types';

const API_BASE = '/api/v1';

export async function analyzeUrl(url: string): Promise<VideoMetadata> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Failed to analyze URL');
  }
  return res.json();
}

export async function getPlaylist(url: string): Promise<PlaylistMetadata> {
  const res = await fetch(`${API_BASE}/playlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Failed to fetch playlist');
  }
  return res.json();
}

export async function startDownload(
  url: string,
  quality: DownloadQuality = '192'
): Promise<{ jobId: string }> {
  const res = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, quality }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(err.error || 'Failed to start download');
  }
  return res.json();
}

export async function startBatchDownload(
  urls: string[],
  quality: DownloadQuality = '192'
): Promise<BatchDownloadResponse> {
  const res = await fetch(`${API_BASE}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, quality }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Batch failed' }));
    throw new Error(err.error || 'Failed to start batch download');
  }
  return res.json();
}

export async function getJob(jobId: string): Promise<DownloadJob> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}

export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/download/${jobId}`;
}

export function createSSEConnection(
  id: string,
  isBatch: boolean,
  onEvent: (event: MessageEvent) => void
): EventSource {
  const path = isBatch
    ? `${API_BASE}/batch/${id}/stream`
    : `${API_BASE}/jobs/${id}/stream`;
  const es = new EventSource(path);
  es.onmessage = onEvent;
  es.onerror = () => es.close();
  return es;
}
