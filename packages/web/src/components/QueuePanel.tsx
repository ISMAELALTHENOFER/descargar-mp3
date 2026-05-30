import { DownloadJob } from '../types';

interface Props {
  queue: DownloadJob[];
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'done':
      return (
        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'queued':
      return (
        <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      );
  }
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    queued: 'Waiting',
    analyzing: 'Analyzing...',
    downloading: 'Downloading...',
    converting: 'Converting...',
    done: 'Saved',
    error: 'Failed',
  };
  return <span className="text-xs">{labels[status] || status}</span>;
}

export default function QueuePanel({ queue }: Props) {
  if (queue.length === 0) return null;

  const done = queue.filter((j) => j.status === 'done').length;
  const errors = queue.filter((j) => j.status === 'error').length;
  const active = queue.filter((j) => !['done', 'error', 'queued'].includes(j.status)).length;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[500px] overflow-auto glass rounded-2xl p-4 animate-fade-in z-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider">
          Downloads
        </h4>
        <div className="flex gap-2 text-xs">
          {active > 0 && (
            <span className="text-accent">{active} active</span>
          )}
          {done > 0 && (
            <span className="text-white/40">{done} done</span>
          )}
          {errors > 0 && (
            <span className="text-red-400">{errors} failed</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {queue.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5"
          >
            <div className="shrink-0">
              <StatusIcon status={job.status} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 truncate">
                {job.title || job.metadata?.title || 'Unknown'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusLabel status={job.status} />
                {job.progress > 0 && job.progress < 100 && (
                  <span className="text-xs text-white/40">{job.progress}%</span>
                )}
                {job.error && (
                  <span className="text-xs text-red-400 truncate">{job.error}</span>
                )}
              </div>
              {(job.status === 'downloading' || job.status === 'converting') && (
                <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              )}
            </div>
            {job.status === 'done' && job.downloadUrl && (
              <a
                href={job.downloadUrl}
                className="shrink-0 p-1.5 text-accent hover:text-accent/80"
                download
                title="Download again"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
