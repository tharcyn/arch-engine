import React from 'react';

/**
 * ArchitectureFlowSection — visual mental model of the engine pipeline.
 *
 * Renders a clean step-flow diagram: Code → Graph → Adapters → Policies → Diagnostics.
 * Responsive: horizontal on desktop, vertical on mobile.
 * No external dependencies, no SVG, no canvas.
 */

const FLOW_NODES = [
  {
    label: 'Code',
    caption: 'Routes, services, modules and dependencies become structural input',
  },
  {
    label: 'Graph Extraction',
    caption: 'A deterministic topology is built directly from real relationships',
  },
  {
    label: 'Capability Adapters',
    caption: 'Domain-aware analyzers enrich structure with execution meaning',
  },
  {
    label: 'Policy Packs',
    caption: 'Architecture rules evaluate authority, contracts and journeys',
  },
  {
    label: 'Diagnostics',
    caption: 'Actionable findings surface before drift reaches production',
  },
] as const;

function Arrow() {
  return (
    <div className="flex items-center justify-center shrink-0" aria-hidden="true">
      {/* Vertical arrow on mobile */}
      <div className="block md:hidden text-neutral-300 dark:text-neutral-700 text-xl font-light leading-none">
        ↓
      </div>
      {/* Horizontal arrow on desktop */}
      <div className="hidden md:block text-neutral-300 dark:text-neutral-700 text-xl font-light leading-none">
        →
      </div>
    </div>
  );
}

export function ArchitectureFlowSection() {
  return (
    <section
      className="bg-white dark:bg-neutral-950 py-10 md:py-14"
      aria-label="Architecture overview"
    >
      <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            How Arch-Engine works
          </h2>
          <p className="max-w-3xl text-sm text-neutral-500 dark:text-neutral-400">
            Arch-Engine converts source structure into enforceable architecture diagnostics in a deterministic pipeline.
          </p>
        </div>

        <div>
          {/* Authority signal micro-label */}
          <div className="uppercase tracking-wide text-xs text-neutral-500 dark:text-neutral-500 mb-3 font-medium">
            Structural enforcement pipeline
          </div>
          
          {/* Flow diagram */}
          <div
            className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-3"
            role="presentation"
          >
            {FLOW_NODES.map((node, i) => {
              const isLast = i === FLOW_NODES.length - 1;
              return (
                <React.Fragment key={node.label}>
                  {i > 0 && <Arrow />}
                  <div className={`flex-1 min-w-0 p-4 rounded-xl border flex flex-col justify-center ${
                    isLast 
                      ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800' 
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50'
                  }`}>
                    <div className={`text-sm font-semibold mb-1 ${
                      isLast 
                        ? 'text-neutral-900 dark:text-neutral-50' 
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}>
                      {node.label}
                    </div>
                    <p className={`text-xs leading-relaxed ${
                      isLast 
                        ? 'text-neutral-600 dark:text-neutral-300' 
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}>
                      {node.caption}
                    </p>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
