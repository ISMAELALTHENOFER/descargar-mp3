import { useState, FormEvent } from 'react';

interface Props {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

export default function UrlInput({ onSubmit, disabled }: Props) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col sm:flex-row gap-3 animate-fade-in"
    >
      <div className="relative flex-1">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube URL here..."
          className="input-glass pr-10"
          disabled={disabled}
        />
        {url && (
          <button
            type="button"
            onClick={() => setUrl('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={!url.trim() || disabled}
        className="btn-primary whitespace-nowrap"
      >
        {disabled ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </span>
        ) : (
          'Analyze'
        )}
      </button>
    </form>
  );
}
