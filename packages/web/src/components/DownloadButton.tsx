import { DownloadQuality } from '../types';

interface Props {
  onClick: () => void;
  onQualityChange: (q: DownloadQuality) => void;
  quality: DownloadQuality;
}

const qualities: { value: DownloadQuality; label: string }[] = [
  { value: '128', label: '128 kbps' },
  { value: '192', label: '192 kbps' },
  { value: '320', label: '320 kbps' },
];

export default function DownloadButton({ onClick, onQualityChange, quality }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/40">Quality:</span>
        <select
          value={quality}
          onChange={(e) => onQualityChange(e.target.value as DownloadQuality)}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 outline-none focus:border-accent/50 cursor-pointer"
        >
          {qualities.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </select>
      </div>
      <button onClick={onClick} className="btn-primary text-lg px-10 py-4">
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download MP3
        </span>
      </button>
    </div>
  );
}
