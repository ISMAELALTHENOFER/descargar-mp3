import { useReducer, useCallback, useRef } from 'react';
import Header from './components/Header';
import UrlInput from './components/UrlInput';
import VideoPreview from './components/VideoPreview';
import DownloadButton from './components/DownloadButton';
import ProgressBar from './components/ProgressBar';
import RelatedList from './components/RelatedList';
import QueuePanel from './components/QueuePanel';
import PlaylistView from './components/PlaylistView';
import {
  VideoMetadata,
  RelatedVideo,
  DownloadJob,
  DownloadStatus,
  PlaylistItem,
  DownloadQuality,
  BatchProgress,
} from './types';
import {
  analyzeUrl,
  startDownload,
  getPlaylist,
  startBatchDownload,
  createSSEConnection,
} from './services/api';
import { downloadBlob } from './services/file-system';

function isPlaylistUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.searchParams.has('list') || u.searchParams.has('start_radio');
  } catch {
    return url.includes('list=') || url.includes('start_radio=1');
  }
}

function log(...args: unknown[]) {
  console.log('[MP3Download]', ...args);
}

interface State {
  url: string;
  status: DownloadStatus;
  progress: number;
  video: VideoMetadata | null;
  related: RelatedVideo[];
  jobId: string | null;
  error: string | null;
  queue: DownloadJob[];
  playlistItems: PlaylistItem[];
  playlistTitle: string;
  selectedIds: Set<string>;
  quality: DownloadQuality;
  batchId: string | null;
  batchProgress: BatchProgress | null;
  loadingMessage: string | null;
}

type Action =
  | { type: 'SET_URL'; url: string }
  | { type: 'ANALYZING' }
  | { type: 'ANALYZED'; video: VideoMetadata }
  | { type: 'ANALYZE_ERROR'; error: string }
  | { type: 'PLAYLIST_LOADED'; title: string; items: PlaylistItem[] }
  | { type: 'TOGGLE_ITEM'; id: string }
  | { type: 'SELECT_ALL' }
  | { type: 'DESELECT_ALL' }
  | { type: 'DOWNLOADING'; jobId: string }
  | { type: 'BATCH_STARTED'; batchId: string; jobs: { jobId: string; url: string }[] }
  | { type: 'PROGRESS'; progress: number; status: DownloadStatus }
  | { type: 'DONE' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' }
  | { type: 'ADD_TO_QUEUE'; job: DownloadJob }
  | { type: 'QUEUE_UPDATE'; jobs: DownloadJob[] }
  | { type: 'SET_QUALITY'; quality: DownloadQuality }
  | { type: 'SET_BATCH_PROGRESS'; progress: BatchProgress }
  | { type: 'SET_LOADING'; message: string | null };

const initialState: State = {
  url: '',
  status: 'idle',
  progress: 0,
  video: null,
  related: [],
  jobId: null,
  error: null,
  queue: [],
  playlistItems: [],
  playlistTitle: '',
  selectedIds: new Set(),
  quality: '192',
  batchId: null,
  batchProgress: null,
  loadingMessage: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_URL':
      return { ...state, url: action.url, error: null };
    case 'ANALYZING':
      return { ...state, status: 'analyzing', error: null };
    case 'ANALYZED':
      return {
        ...state,
        status: 'ready',
        video: action.video,
        related: action.video.related,
        loadingMessage: null,
      };
    case 'ANALYZE_ERROR':
      return { ...state, status: 'idle', error: action.error, loadingMessage: null };
    case 'PLAYLIST_LOADED': {
      const ids = new Set<string>(action.items.map((i) => i.id));
      return {
        ...state,
        status: 'playlist',
        playlistTitle: action.title,
        playlistItems: action.items,
        selectedIds: ids,
        loadingMessage: null,
      };
    }
    case 'TOGGLE_ITEM': {
      const next = new Set(state.selectedIds);
      if (next.has(action.id)) {
        next.delete(action.id);
      } else {
        next.add(action.id);
      }
      return { ...state, selectedIds: next };
    }
    case 'SELECT_ALL': {
      const all = new Set(state.playlistItems.map((i) => i.id));
      return { ...state, selectedIds: all };
    }
    case 'DESELECT_ALL':
      return { ...state, selectedIds: new Set() };
    case 'DOWNLOADING':
      return { ...state, status: 'queued', jobId: action.jobId };
    case 'BATCH_STARTED':
      return {
        ...state,
        status: 'queued',
        batchId: action.batchId,
        jobId: action.batchId,
        batchProgress: {
          total: action.jobs.length,
          done: 0,
          error: 0,
          jobs: action.jobs.map((j) => ({
            id: j.jobId,
            status: 'queued',
            progress: 0,
          })),
        },
      };
    case 'PROGRESS':
      return {
        ...state,
        status: action.status,
        progress: action.progress,
      };
    case 'DONE':
      return { ...state, status: 'done', progress: 100, loadingMessage: null };
    case 'ERROR':
      return { ...state, status: 'error', error: action.error, loadingMessage: null };
    case 'RESET':
      return initialState;
    case 'ADD_TO_QUEUE':
      return {
        ...state,
        queue: [...state.queue.filter((j) => j.id !== action.job.id), action.job],
      };
    case 'QUEUE_UPDATE':
      return { ...state, queue: action.jobs };
    case 'SET_QUALITY':
      return { ...state, quality: action.quality };
    case 'SET_BATCH_PROGRESS':
      return { ...state, batchProgress: action.progress };
    case 'SET_LOADING':
      return { ...state, loadingMessage: action.message };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const esRef = useRef<EventSource | null>(null);
  const savedJobsRef = useRef<Set<string>>(new Set());

  const handleAnalyze = useCallback(async (url: string) => {
    dispatch({ type: 'SET_URL', url });
    log('Analyzing URL:', url);

    if (isPlaylistUrl(url)) {
      dispatch({ type: 'ANALYZING' });
      dispatch({ type: 'SET_LOADING', message: 'Fetching playlist info...' });
      try {
        const playlist = await getPlaylist(url);
        log('Playlist loaded:', playlist.title, `${playlist.items.length} items`);
        dispatch({
          type: 'PLAYLIST_LOADED',
          title: playlist.title,
          items: playlist.items,
        });
      } catch (err) {
        log('Playlist analysis failed:', (err as Error).message);
        dispatch({
          type: 'ANALYZE_ERROR',
          error: (err as Error).message,
        });
      }
      return;
    }

    dispatch({ type: 'ANALYZING' });
    dispatch({ type: 'SET_LOADING', message: 'Analyzing video...' });
    try {
      const video = await analyzeUrl(url);
      log('Video analyzed:', video.title);
      dispatch({ type: 'ANALYZED', video });
    } catch (err) {
      log('Analysis failed:', (err as Error).message);
      dispatch({
        type: 'ANALYZE_ERROR',
        error: (err as Error).message,
      });
    }
  }, []);

  const saveFileToDirectory = useCallback(async (jobId: string, filename: string) => {
    if (savedJobsRef.current.has(jobId)) return;
    savedJobsRef.current.add(jobId);

    try {
      log(`Fetching file: ${filename}`);
      const res = await fetch(`/api/v1/download/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch file');
      const blob = await res.blob();
      await downloadBlob(blob, filename);
      log(`Downloaded: ${filename}`);
    } catch (err) {
      log(`Failed to save ${filename}:`, (err as Error).message);
      dispatch({ type: 'ERROR', error: `Error al guardar ${filename}: ${(err as Error).message}` });
    }
  }, []);

  const handleSingleDownload = useCallback(async () => {
    if (!state.video) return;
    try {
      log('Starting single download:', state.url);

      dispatch({ type: 'SET_LOADING', message: 'Starting download...' });
      const { jobId } = await startDownload(state.url, state.quality);
      dispatch({ type: 'DOWNLOADING', jobId });
      log('Job created:', jobId);

      esRef.current?.close();
      const es = createSSEConnection(jobId, false, (event) => {
        const data = JSON.parse(event.data);
        log(`SSE event [${jobId.slice(0, 8)}]:`, data.type, data.data);

        switch (data.type) {
          case 'progress':
            dispatch({
              type: 'PROGRESS',
              progress: data.data.progress,
              status: 'downloading',
            });
            break;
          case 'status':
            dispatch({
              type: 'PROGRESS',
              progress: state.progress,
              status: data.data.status as DownloadStatus,
            });
            break;
          case 'done': {
            dispatch({ type: 'DONE' });
            const filename = data.data.filename || `${state.video?.title || 'audio'}.mp3`;
            saveFileToDirectory(jobId, filename);
            es.close();
            break;
          }
          case 'error':
            dispatch({ type: 'ERROR', error: data.data.error });
            es.close();
            break;
        }
      });
      esRef.current = es;
    } catch (err) {
      log('Download failed:', (err as Error).message);
      dispatch({ type: 'ERROR', error: (err as Error).message });
    }
  }, [state.url, state.video, state.quality, state.progress, saveFileToDirectory]);

  const handleBatchDownload = useCallback(async (urls: string[]) => {
    try {
      log(`Starting batch download: ${urls.length} items`);

      dispatch({ type: 'SET_LOADING', message: 'Starting batch download...' });

      const result = await startBatchDownload(urls, state.quality);
      log('Batch created:', result.batchId, `${result.jobs.length} jobs`);

      const jobUrlMap = new Map<string, string>();
      for (const j of result.jobs) {
        jobUrlMap.set(j.jobId, j.url);
      }

      dispatch({ type: 'BATCH_STARTED', batchId: result.batchId, jobs: result.jobs });

      const queueJobs: DownloadJob[] = result.jobs.map((j) => ({
        id: j.jobId,
        url: j.url,
        status: 'queued' as DownloadStatus,
        progress: 0,
        metadata: null,
        error: null,
        title: state.playlistItems.find((p) => p.url === j.url)?.title,
      }));
      dispatch({ type: 'QUEUE_UPDATE', jobs: queueJobs });

      esRef.current?.close();
      const es = createSSEConnection(result.batchId, true, (event) => {
        const data = JSON.parse(event.data);
        log(`SSE batch event:`, data.type);

        if (data.type === 'batch-progress') {
          const batchProgress = data.data as BatchProgress;

          const updatedJobs: DownloadJob[] = batchProgress.jobs.map((j) => ({
            id: j.id,
            url: jobUrlMap.get(j.id) || '',
            status: j.status as DownloadStatus,
            progress: j.progress,
            metadata: null,
            error: j.error || null,
            downloadUrl: j.status === 'done' ? `/api/v1/download/${j.id}` : undefined,
            title: j.title || state.playlistItems.find((p) => p.url === jobUrlMap.get(j.id))?.title,
          }));

          dispatch({ type: 'QUEUE_UPDATE', jobs: updatedJobs });
          dispatch({ type: 'SET_BATCH_PROGRESS', progress: batchProgress });

          for (const j of batchProgress.jobs) {
            if (j.status === 'done' && j.title) {
              const filename = `${j.title.replace(/[^\w\s]/g, '')}.mp3`;
              saveFileToDirectory(j.id, filename);
            }
          }

          const doneCount = batchProgress.done + batchProgress.error;
          if (doneCount >= batchProgress.total) {
            log(`Batch complete: ${batchProgress.done} done, ${batchProgress.error} errors`);
            if (batchProgress.error === 0) {
              dispatch({ type: 'DONE' });
            } else {
              dispatch({ type: 'SET_LOADING', message: null });
            }
            es.close();
          }
        } else if (data.type === 'done') {
          const filename = data.data.filename;
          if (filename) {
            saveFileToDirectory(data.jobId, filename);
          }
        }
      });
      esRef.current = es;
    } catch (err) {
      log('Batch download failed:', (err as Error).message);
      dispatch({ type: 'ERROR', error: (err as Error).message });
    }
  }, [state.quality, state.playlistItems, saveFileToDirectory]);

  const handleDownload = useCallback(async () => {
    if (state.status === 'playlist') {
      const urls = state.playlistItems
        .filter((item) => state.selectedIds.has(item.id))
        .map((item) => item.url);

      if (urls.length === 0) return;
      await handleBatchDownload(urls);
    } else {
      await handleSingleDownload();
    }
  }, [state.status, state.playlistItems, state.selectedIds, handleSingleDownload, handleBatchDownload]);

  const handleReset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    savedJobsRef.current.clear();
    dispatch({ type: 'RESET' });
  }, []);

  const handleSelectAll = useCallback(() => dispatch({ type: 'SELECT_ALL' }), []);
  const handleDeselectAll = useCallback(() => dispatch({ type: 'DESELECT_ALL' }), []);
  const handleToggle = useCallback((id: string) => dispatch({ type: 'TOGGLE_ITEM', id }), []);

  const showingProgress =
    state.status === 'queued' ||
    state.status === 'downloading' ||
    state.status === 'converting';

  const isBatchDone = state.batchProgress != null &&
    (state.batchProgress.done + state.batchProgress.error) >= state.batchProgress.total;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-2xl mx-auto w-full gap-6">
        <UrlInput
          onSubmit={handleAnalyze}
          disabled={state.status === 'analyzing'}
        />

        {state.loadingMessage && (
          <div className="glass rounded-xl px-6 py-4 w-full animate-fade-in flex items-center gap-3">
            <svg className="w-5 h-5 text-accent animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-white/70">{state.loadingMessage}</span>
          </div>
        )}

        {state.error && (
          <div className="glass rounded-xl px-4 py-3 text-red-400 text-sm w-full animate-fade-in">
            {state.error}
          </div>
        )}

        {state.video && (
          <VideoPreview video={state.video} onReset={handleReset} />
        )}

        {state.status === 'playlist' && state.playlistItems.length > 0 && (
          <PlaylistView
            title={state.playlistTitle || 'Playlist'}
            items={state.playlistItems}
            selectedIds={state.selectedIds}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onDownloadSelected={handleDownload}
            disabled={showingProgress}
          />
        )}

        {state.status === 'ready' && (
          <DownloadButton
            onClick={handleDownload}
            quality={state.quality}
            onQualityChange={(q) => dispatch({ type: 'SET_QUALITY', quality: q })}
          />
        )}

        {showingProgress && (
          <ProgressBar progress={state.progress} status={state.status} />
        )}

        {state.batchProgress && (
          <div className="w-full card animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">
                Batch: {state.batchProgress.done + state.batchProgress.error} of {state.batchProgress.total}
              </span>
              <span className="text-xs text-white/50">
                {state.batchProgress.error > 0 && `${state.batchProgress.error} errors`}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((state.batchProgress.done + state.batchProgress.error) / state.batchProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {(state.status === 'done' || isBatchDone) && !state.batchProgress && state.jobId && (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="text-accent font-medium">Download complete!</div>
            <a
              href={`/api/v1/download/${state.jobId}`}
              className="btn-primary"
              download
            >
              Download MP3
            </a>
          </div>
        )}

        {(state.status === 'done' || isBatchDone) && state.batchProgress && (
          <div className="flex flex-col items-center gap-4 animate-fade-in w-full">
            <div className="text-accent font-medium">
              Batch complete! {state.batchProgress.done} downloaded
              {state.batchProgress.error > 0 && `, ${state.batchProgress.error} failed`}
            </div>
            {state.batchProgress.jobs
              .filter((j) => j.status === 'done')
              .map((j) => (
                <a
                  key={j.id}
                  href={`/api/v1/download/${j.id}`}
                  className="btn-primary text-sm px-4 py-2"
                  download
                >
                  Download {j.title || j.id.slice(0, 8)}.mp3
                </a>
              ))}
          </div>
        )}

        {state.related.length > 0 && state.status !== 'playlist' && (
          <RelatedList
            videos={state.related}
            onSelect={(id) =>
              handleAnalyze(`https://youtube.com/watch?v=${id}`)
            }
          />
        )}
      </main>
      <QueuePanel queue={state.queue} />
    </div>
  );
}
