import React from 'react';

/**
 * QuickstartSection — installability evidence block.
 *
 * Shows install → execute → output in a single composed panel.
 * Static, server-render safe, zero dependencies.
 */
export function QuickstartSection() {
  return (
    <section
      className="bg-neutral-50 dark:bg-neutral-900 py-10 md:py-14"
      aria-label="Quickstart"
    >
      <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Try it locally in 30 seconds
        </h2>

        <div className="max-w-3xl rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
          {/* Step 1 — Install */}
          <div className="border-b border-neutral-200 dark:border-neutral-800">
            <div className="px-4 md:px-6 py-2 bg-neutral-100 dark:bg-neutral-800">
              <span className="uppercase tracking-wide text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Install
              </span>
            </div>
            <pre className="px-4 py-3 md:px-6 md:py-4 bg-neutral-50 dark:bg-neutral-950 overflow-x-auto text-sm font-mono leading-relaxed text-neutral-900 dark:text-neutral-100">
              <code>npm install @arch-engine/cli</code>
            </pre>
          </div>

          {/* Step 2 — Execute */}
          <div className="border-b border-neutral-200 dark:border-neutral-800">
            <div className="px-4 md:px-6 py-2 bg-neutral-100 dark:bg-neutral-800">
              <span className="uppercase tracking-wide text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Execute
              </span>
            </div>
            <pre className="px-4 py-3 md:px-6 md:py-4 bg-neutral-50 dark:bg-neutral-950 overflow-x-auto text-sm font-mono leading-relaxed text-neutral-900 dark:text-neutral-100">
              <code>npx arch-engine doctor</code>
            </pre>
          </div>

          {/* Step 3 — Output */}
          <div>
            <div className="px-4 md:px-6 py-2 bg-neutral-100 dark:bg-neutral-800">
              <span className="uppercase tracking-wide text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Output
              </span>
            </div>
            <pre
              className="px-4 py-3 md:px-6 md:py-4 bg-neutral-50 dark:bg-neutral-950 overflow-x-auto text-sm font-mono leading-relaxed text-neutral-600 dark:text-neutral-400"
              aria-label="Example CLI output"
            >
              <code>{`Detected authority boundary crossing:
  frontend → database mutation layer

Suggested policy:
  enforce service isolation boundary`}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
