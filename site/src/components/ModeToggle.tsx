import React from 'react';

type Mode = 'plain' | 'technical';

interface ModeToggleProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

export function ModeToggle({ mode, setMode }: ModeToggleProps) {
  return (
    <div className="flex flex-col items-end sm:items-center sm:flex-row gap-2">
      <span className="text-[10px] sm:text-xs text-zinc-500 font-medium uppercase tracking-wider">
        View mode:
      </span>
      <div 
        className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
        role="radiogroup" 
        aria-label="Content Complexity Mode"
      >
        <button
          role="radio"
          aria-checked={mode === 'plain'}
          onClick={() => setMode('plain')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('plain'); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 ${
            mode === 'plain' 
              ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Plain
        </button>
        <button
          role="radio"
          aria-checked={mode === 'technical'}
          onClick={() => setMode('technical')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('technical'); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 ${
            mode === 'technical' 
              ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Technical
        </button>
      </div>
    </div>
  );
}
