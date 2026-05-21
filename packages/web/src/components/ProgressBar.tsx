import { DownloadStatus } from '../types';

interface Props {
  progress: number;
  status: DownloadStatus;
}

const statusLabels: Record<string, string> = {
  queued: 'Waiting in queue...',
  downloading: 'Downloading audio...',
  converting: 'Converting to MP3...',
};

export default function ProgressBar({ progress, status }: Props) {
  const label = statusLabels[status] || status;

  return (
    <div className="w-full card animate-fade-in">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50 font-mono">{progress}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
