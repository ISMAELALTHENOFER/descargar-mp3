import { RelatedVideo } from '../types';

interface Props {
  videos: RelatedVideo[];
  onSelect: (id: string) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RelatedList({ videos, onSelect }: Props) {
  if (videos.length === 0) return null;

  return (
    <div className="w-full animate-fade-in">
      <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
        Related Videos
      </h3>
      <div className="flex flex-col gap-2">
        {videos.slice(0, 10).map((video) => (
          <button
            key={video.id}
            onClick={() => onSelect(video.id)}
            className="card glass-hover flex gap-3 items-start text-left w-full"
          >
            <div className="relative w-24 h-16 shrink-0 rounded-lg overflow-hidden">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                {formatDuration(video.duration)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate">{video.title}</p>
              <p className="text-xs text-white/40 mt-0.5">{video.author}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
