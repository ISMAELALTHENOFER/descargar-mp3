import { useReducer, useCallback } from 'react';
import Header from './components/Header';
import UrlInput from './components/UrlInput';
import VideoPreview from './components/VideoPreview';
import DownloadButton from './components/DownloadButton';
import ProgressBar from './components/ProgressBar';
import RelatedList from './components/RelatedList';
import QueuePanel from './components/QueuePanel';
import {
  VideoMetadata,
  RelatedVideo,
  DownloadJob,
  DownloadStatus,
} from './types';
import { analyzeUrl, startDownload, createSSEConnection } from './services/api';

interface State {
  url: string;
  status: DownloadStatus;
  progress: number;
  video: VideoMetadata | null;
  related: RelatedVideo[];
  jobId: string | null;
  error: string | null;
  queue: DownloadJob[];
}

type Action =
  | { type: 'SET_URL'; url: string }
  | { type: 'ANALYZING' }
  | { type: 'ANALYZED'; video: VideoMetadata }
  | { type: 'ANALYZE_ERROR'; error: string }
  | { type: 'DOWNLOADING'; jobId: string }
  | { type: 'PROGRESS'; progress: number; status: DownloadStatus }
  | { type: 'DONE' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' }
  | { type: 'ADD_TO_QUEUE'; job: DownloadJob };

const initialState: State = {
  url: '',
  status: 'idle',
  progress: 0,
  video: null,
  related: [],
  jobId: null,
  error: null,
  queue: [],
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
      };
    case 'ANALYZE_ERROR':
      return { ...state, status: 'idle', error: action.error };
    case 'DOWNLOADING':
      return { ...state, status: 'queued', jobId: action.jobId };
    case 'PROGRESS':
      return {
        ...state,
        status: action.status,
        progress: action.progress,
      };
    case 'DONE':
      return { ...state, status: 'done', progress: 100 };
    case 'ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'RESET':
      return initialState;
    case 'ADD_TO_QUEUE':
      return {
        ...state,
        queue: [...state.queue.filter((j) => j.id !== action.job.id), action.job],
      };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleAnalyze = useCallback(async (url: string) => {
    dispatch({ type: 'SET_URL', url });
    dispatch({ type: 'ANALYZING' });
    try {
      const video = await analyzeUrl(url);
      dispatch({ type: 'ANALYZED', video });
    } catch (err) {
      dispatch({
        type: 'ANALYZE_ERROR',
        error: (err as Error).message,
      });
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!state.video) return;
    try {
      const { jobId } = await startDownload(state.url);
      dispatch({ type: 'DOWNLOADING', jobId });

      const es = createSSEConnection(jobId, (event) => {
        const data = JSON.parse(event.data);
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
          case 'done':
            dispatch({ type: 'DONE' });
            es.close();
            break;
          case 'error':
            dispatch({
              type: 'ERROR',
              error: data.data.error as string,
            });
            es.close();
            break;
        }
      });
    } catch (err) {
      dispatch({
        type: 'ERROR',
        error: (err as Error).message,
      });
    }
  }, [state.url, state.video, state.progress]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-2xl mx-auto w-full gap-6">
        <UrlInput
          onSubmit={handleAnalyze}
          disabled={state.status === 'analyzing'}
        />

        {state.error && (
          <div className="glass rounded-xl px-4 py-3 text-red-400 text-sm w-full animate-fade-in">
            {state.error}
          </div>
        )}

        {state.video && (
          <VideoPreview
            video={state.video}
            onReset={handleReset}
          />
        )}

        {state.status === 'ready' && (
          <DownloadButton onClick={handleDownload} />
        )}

        {(state.status === 'queued' ||
          state.status === 'downloading' ||
          state.status === 'converting') && (
          <ProgressBar
            progress={state.progress}
            status={state.status}
          />
        )}

        {state.status === 'done' && state.jobId && (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="text-accent font-medium">
              Download complete!
            </div>
            <a
              href={`/api/v1/download/${state.jobId}`}
              className="btn-primary"
              download
            >
              Download MP3
            </a>
          </div>
        )}

        {state.related.length > 0 && (
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
