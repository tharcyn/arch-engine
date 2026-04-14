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
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800">
      
      {/* HEADER WITH TOGGLE */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-[900px] px-6 h-16 flex items-center justify-between">
          <div className="font-bold tracking-tight">Arch-Engine</div>
          <ModeToggle mode={mode} setMode={toggleMode} />
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-6 py-24 space-y-32">
        {/* HERO SECTION */}
        <section className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {copy.heroTitle}
            </h1>
            <h2 className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
              {copy.heroSubtitle}
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <a 
              href="https://github.com/tharcyn/arch-engine" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-50 px-6 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300"
            >
              View on GitHub
            </a>
          </div>
        </section>

        {/* PROBLEM SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">The Problem</h2>
          <div className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-2 border-red-500/20 pl-6 space-y-4">
            <p>{copy.problemLines[0]}</p>
            <p>
              {copy.problemLines[1].split('\\n').map((line: string, i: number) => (
                <React.Fragment key={i}>
                  {line}
                  {i < copy.problemLines[1].split('\\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {copy.problemLines[2].split('\\n').map((line: string, i: number) => (
                <React.Fragment key={i}>
                  {line}
                  {i < copy.problemLines[2].split('\\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          </div>
        </section>

        {/* SOLUTION SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">The Solution</h2>
          <div className="p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p>{copy.solutionIntro}</p>
            <p>{copy.solutionDetails}</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              {copy.solutionBullets.map((bullet: string, i: number) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
            {copy.solutionTrailing && <p className="pt-2">{copy.solutionTrailing}</p>}
          </div>
        </section>

        {/* CLI EXAMPLE SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Diagnostic Runtime</h2>
          <p className="text-lg text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {copy.cli}
          </p>
          <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <pre className="p-4 bg-zinc-50 dark:bg-zinc-900/80 overflow-x-auto text-sm font-mono leading-relaxed text-zinc-800 dark:text-zinc-300">
              <code>npx arch-engine doctor</code>
            </pre>
          </div>
          {mode === 'technical' && (
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Outputs:</p>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-disc pl-5">
                <li>workspace classification</li>
                <li>dependency topology confidence</li>
                <li>authority crossings</li>
                <li>policy readiness signals</li>
              </ul>
            </div>
          )}
        </section>

        {/* ADAPTERS SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Adapters</h2>
          <p className="text-lg text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {copy.adapters}
          </p>
          {mode === 'technical' && (
            <div className="inline-block px-3 py-1.5 mt-2 bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-sm text-zinc-600 dark:text-zinc-400">
              Example: @arch-engine/adapter-monorepo
            </div>
          )}
        </section>

        {/* POLICY PACKS SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Policy Packs</h2>
          <p className="text-lg text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {copy.policyPacks}
          </p>
          {mode === 'technical' && (
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Examples:</p>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-disc pl-5">
                <li>authority-boundary enforcement</li>
                <li>REST contract parity validation</li>
                <li>journey regression detection</li>
              </ul>
            </div>
          )}
        </section>

        {/* TRUST SIGNALS SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Production Ready</h2>
          <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-6">{copy.trustIntro}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div className="text-emerald-600 dark:text-emerald-400 font-medium mb-1">{copy.trustCard1Title}</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.trustCard1Desc}</p>
            </div>
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div className="text-emerald-600 dark:text-emerald-400 font-medium mb-1">{copy.trustCard2Title}</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.trustCard2Desc}</p>
            </div>
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div className="font-medium mb-1 text-zinc-900 dark:text-zinc-100">{copy.trustCard3Title}</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.trustCard3Desc}</p>
            </div>
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div className="font-medium mb-1 text-zinc-900 dark:text-zinc-100">{copy.trustCard4Title}</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.trustCard4Desc}</p>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="text-center space-y-6 py-12 flex flex-col items-center">
          <h2 className="text-3xl font-bold tracking-tight whitespace-pre-wrap">
            {copy.cta}
          </h2>
          <div className="inline-block text-left rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <pre className="p-6 bg-zinc-950 text-sm font-mono leading-relaxed text-zinc-300">
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
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 mt-24">
        <div className="mx-auto max-w-[900px] px-6 py-8 flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
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
