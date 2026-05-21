import { VideoMetadata } from '../types';

interface Props {
  video: VideoMetadata;
  onReset: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPreview({ video, onReset }: Props) {
  return (
    <div className="card w-full animate-fade-in flex gap-4">
      <div className="relative w-40 h-24 shrink-0 rounded-xl overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration(video.duration)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium text-white truncate">{video.title}</h3>
            <p className="text-sm text-white/50 mt-0.5">{video.author}</p>
          </div>
          <button onClick={onReset} className="btn-ghost shrink-0 p-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
