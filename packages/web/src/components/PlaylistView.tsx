import { PlaylistItem } from '../types';

interface Props {
  title: string;
  items: PlaylistItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDownloadSelected: () => void;
  disabled?: boolean;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlaylistView({
  title,
  items,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onDownloadSelected,
  disabled,
}: Props) {
  if (items.length === 0) return null;

  const allSelected = selectedIds.size === items.length;

  return (
    <div className="w-full animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-medium text-white">{title}</h3>
          <p className="text-xs text-white/40">
            {items.length} videos &middot; {selectedIds.size} selected
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
        {items.map((item) => (
          <label
            key={item.id}
            className="card glass-hover flex gap-3 items-start cursor-pointer p-2"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onChange={() => onToggle(item.id)}
              className="mt-2 accent-accent cursor-pointer"
            />
            <div className="relative w-16 h-10 shrink-0 rounded overflow-hidden">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {item.duration != null && item.duration > 0 && (
                <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
                  {formatDuration(item.duration)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/80 truncate">{item.title}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={onDownloadSelected}
          disabled={selectedIds.size === 0 || disabled}
          className="btn-primary text-sm px-6 py-2.5"
        >
          Download {selectedIds.size} Selected
        </button>
      </div>
    </div>
  );
}
