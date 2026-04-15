import React from 'react';

type Mode = 'plain' | 'technical';

interface ModeToggleProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

export function ModeToggle({ mode, setMode }: ModeToggleProps) {
  return (
    <div className="flex flex-col items-end sm:items-center sm:flex-row gap-2">
      <span className="uppercase tracking-wide text-[10px] sm:text-xs text-neutral-500 font-medium">
        View mode:
      </span>
      <div 
        className="flex p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800"
        role="radiogroup" 
        aria-label="Content Complexity Mode"
      >
        <button
          role="radio"
          aria-checked={mode === 'plain'}
          onClick={() => setMode('plain')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('plain'); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300 ${
            mode === 'plain' 
              ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-neutral-100' 
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          Plain
        </button>
        <button
          role="radio"
          aria-checked={mode === 'technical'}
          onClick={() => setMode('technical')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('technical'); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300 ${
            mode === 'technical' 
              ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-neutral-100' 
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          Technical
        </button>
      </div>
    </div>
  );
}
