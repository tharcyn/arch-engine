"use client";

import React, { useState, useEffect } from 'react';
import { ModeToggle } from '../components/ModeToggle';
import { landingCopy } from '../content/landing-copy';

type Mode = 'plain' | 'technical';

export default function Home() {
  const [mode, setMode] = useState<Mode>('plain');
  
  useEffect(() => {
    const saved = localStorage.getItem('archengine-mode') as Mode;
    if (saved && saved !== 'plain') {
      setTimeout(() => setMode(saved as Mode), 0);
    }
  }, []);

  const toggleMode = (m: Mode) => {
    setMode(m);
    localStorage.setItem('archengine-mode', m);
  };

  const copy = landingCopy[mode];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800">
      
      {/* HEADER WITH TOGGLE */}
      <header className="sticky top-0 z-50 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-5 md:px-6 py-3 flex items-center justify-between">
          <div className="font-bold tracking-tight">Arch-Engine</div>
          <ModeToggle mode={mode} setMode={toggleMode} />
        </div>
      </header>

      {/* HERO SECTION — white */}
      <section className="bg-white dark:bg-neutral-950 pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5 animate-in fade-in duration-500">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {copy.heroTitle}
            </h1>
            <h2 className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed whitespace-pre-line">
              {copy.heroSubtitle}
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-4 pt-1">
            <a 
              href="https://github.com/tharcyn/arch-engine" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-50 px-6 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION — neutral */}
      <section className="bg-neutral-50 dark:bg-neutral-900/40 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">The Problem</h2>
          <div className="max-w-3xl text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-2 border-red-500/20 pl-6 space-y-3">
            <p>{copy.problemLines[0]}</p>
            <p>
              {copy.problemLines[1].split('\n').map((line: string, i: number) => (
                <React.Fragment key={i}>
                  {line}
                  {i < copy.problemLines[1].split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {copy.problemLines[2].split('\n').map((line: string, i: number) => (
                <React.Fragment key={i}>
                  {line}
                  {i < copy.problemLines[2].split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>
      </section>

      {/* DIFFERENTIATION SECTION — white */}
      <section className="bg-white dark:bg-neutral-950 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">{copy.differentiationTitle}</h2>
          <div className="max-w-3xl text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-3">
            <div className="space-y-1">
              {copy.differentiationLines.map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {copy.differentiationConclusion}
            </p>
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION — neutral */}
      <section className="bg-neutral-50 dark:bg-neutral-900/40 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">The Solution</h2>
          <div className="max-w-3xl p-5 md:p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 space-y-3 text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p>{copy.solutionIntro}</p>
            <p>{copy.solutionDetails}</p>
            <ul className="list-disc pl-5 mt-1 space-y-1 md:space-y-1.5">
              {copy.solutionBullets.map((bullet: string, i: number) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
            {copy.solutionTrailing && <p className="pt-1">{copy.solutionTrailing}</p>}
          </div>
        </div>
      </section>

      {/* CLI EXAMPLE SECTION — white */}
      <section className="bg-white dark:bg-neutral-950 py-8 md:py-12">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Diagnostic Runtime</h2>
          <p className="max-w-3xl text-lg text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
            {copy.cli}
          </p>
          <div className="max-w-3xl rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
            <pre className="px-4 py-4 md:px-6 md:py-5 overflow-x-auto text-sm font-mono leading-relaxed text-zinc-800 dark:text-zinc-300">
              <code>npx arch-engine doctor</code>
            </pre>
          </div>

          {/* Example Output */}
          <div className="max-w-3xl rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
            <div className="px-4 md:px-6 py-2 bg-neutral-100 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Example output</span>
            </div>
            <pre className="px-4 py-3 md:px-6 md:py-4 bg-neutral-100 dark:bg-neutral-900 overflow-x-auto text-sm font-mono leading-relaxed text-zinc-600 dark:text-zinc-400">
              <code>{`✔ Topology extracted successfully
✔ Workspace type resolved as: single (highest confidence)
✔ Packages detected: 1 / 1 expected
✔ Connected nodes: 1
✔ Coverage: 100%
✔ Connectivity: 100%
✔ Confidence: HIGH (Structured single workspace extraction)
✔ Authority crossings observed: 0`}</code>
            </pre>
          </div>

          {/* Exec Summary */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            {copy.cliExecSummary.map((line: string, i: number) => (
              <span key={i}>{line}</span>
            ))}
          </div>

          {/* Safety & Runtime Signals */}
          <div className="max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 space-y-0.5">
            <p>{copy.cliSafetyNote}</p>
            <p>{copy.cliOffline} {copy.cliDuration}</p>
            <p>{copy.cliNpxNote}</p>
          </div>

          {mode === 'technical' && (
            <div className="pt-1">
              <p className="text-sm font-medium mb-2">Outputs:</p>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-disc pl-5">
                <li>workspace classification</li>
                <li>dependency topology confidence</li>
                <li>authority crossings</li>
                <li>policy readiness signals</li>
                <li><code className="font-mono text-zinc-500 dark:text-zinc-500">--json</code> flag provides machine-readable output for CI integration</li>
                <li>Exit codes reflect diagnostic status for CI usage</li>
              </ul>
              {copy.cliDoctorScope && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
                  {copy.cliDoctorScope}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* POLICY PACKS SECTION — neutral */}
      <section className="bg-neutral-50 dark:bg-neutral-900/40 py-8 md:py-12">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Policy Packs</h2>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {copy.policyPackOptional}
          </p>
          <p className="max-w-3xl text-lg text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
            {copy.policyPacks}
          </p>
          {copy.federationOptIn && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {copy.federationOptIn}
            </p>
          )}
          {mode === 'technical' && (
            <div className="pt-1">
              <p className="text-sm font-medium mb-1.5">Shipped packs:</p>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-0.5 list-disc pl-5">
                <li>authority-boundary enforcement</li>
                <li>REST contract parity validation</li>
                <li>journey regression detection</li>
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ADAPTERS SECTION — white */}
      <section className="bg-white dark:bg-neutral-950 py-8 md:py-12">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Adapters</h2>
          <p className="max-w-3xl text-lg text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
            {copy.adapters}
          </p>
          {copy.adapterSafety && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {copy.adapterSafety}
            </p>
          )}
          {mode === 'technical' && (
            <div className="inline-block px-3 py-1.5 mt-1 bg-neutral-100 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded font-mono text-sm text-zinc-600 dark:text-zinc-400">
              Example: @arch-engine/adapter-monorepo
            </div>
          )}
        </div>
      </section>

      {/* TRUST SIGNALS SECTION — neutral */}
      <section className="bg-neutral-50 dark:bg-neutral-900/40 py-8 md:py-12">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Production Ready</h2>
          <p className="text-lg text-zinc-700 dark:text-zinc-300">{copy.trustIntro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
              <div className="text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">{copy.trustCard1Title}</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.trustCard1Desc}</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
              <div className="text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">{copy.trustCard2Title}</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.trustCard2Desc}</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
              <div className="font-medium mb-0.5 text-zinc-900 dark:text-zinc-100">{copy.trustCard3Title}</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.trustCard3Desc}</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
              <div className="font-medium mb-0.5 text-zinc-900 dark:text-zinc-100">{copy.trustCard4Title}</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.trustCard4Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION — white */}
      <section className="bg-white dark:bg-neutral-950 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 text-center flex flex-col items-center space-y-5">
          <h2 className="text-3xl font-bold tracking-tight whitespace-pre-line">
            {copy.cta}
          </h2>
          <div className="inline-block text-left rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <pre className="px-4 py-4 md:px-6 md:py-5 bg-zinc-950 text-sm font-mono leading-relaxed text-zinc-300">
              <code>
                {mode === 'plain' ? (
                  <><span className="text-emerald-400">npm</span> install @arch-engine/cli</>
                ) : (
                  <>
                    <span className="text-emerald-400">npm</span> install @arch-engine/cli{'\n'}
                    <span className="text-emerald-400">npm</span> install @arch-engine/adapter-monorepo{'\n\n'}
                    <span className="text-emerald-400">npx</span> arch-engine doctor
                  </>
                )}
              </code>
            </pre>
          </div>
          <p className="text-sm text-zinc-500 font-medium">{copy.ctaFooter}</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-5xl px-5 md:px-6 py-8 flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Arch-Engine. MIT Licensed.</p>
          <div className="flex gap-6">
            <a href="https://github.com/tharcyn/arch-engine" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">GitHub</a>
            <a href="https://www.npmjs.com/package/@arch-engine/cli" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">npm</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
