import { DownloadJob } from '../types';

interface Props {
  queue: DownloadJob[];
}

export default function QueuePanel({ queue }: Props) {
  if (queue.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 max-h-96 overflow-auto glass rounded-2xl p-3 animate-fade-in">
      <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
        Downloads
      </h4>
      <div className="flex flex-col gap-2">
        {queue.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-3 bg-white/5 rounded-xl p-2"
          >
            {job.metadata?.thumbnail && (
              <img
                src={job.metadata.thumbnail}
                alt=""
                className="w-8 h-8 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 truncate">
                {job.metadata?.title ?? 'Unknown'}
              </p>
              <p className="text-xs text-white/30">{job.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
