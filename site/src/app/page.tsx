"use client";

import React, { useState, useEffect } from 'react';
import { ModeToggle } from '../components/ModeToggle';
import { QuickstartSection } from '../components/QuickstartSection';
import { ArchitectureFlowSection } from '../components/ArchitectureFlowSection';
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800">
      
      {/* HEADER WITH TOGGLE */}
      <header className="sticky top-0 z-50 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-5 md:px-6 py-3 flex items-center justify-between">
          <div className="font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Arch-Engine</div>
          <ModeToggle mode={mode} setMode={toggleMode} />
        </div>
      </header>

      {/* HERO SECTION — white */}
      <section className="bg-white dark:bg-neutral-950 py-10 md:py-14 lg:py-20">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-6 animate-in fade-in duration-500">
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {copy.heroTitle}
            </h1>
            <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed whitespace-pre-line">
              {copy.heroSubtitle}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 pt-2">
            <a 
              href="https://github.com/tharcyn/arch-engine" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 text-sm font-medium text-neutral-900 dark:text-neutral-100 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* QUICKSTART EVIDENCE — neutral */}
      <QuickstartSection />

      {/* ARCHITECTURE FLOW — white */}
      <ArchitectureFlowSection />

      {/* PROBLEM SECTION — neutral */}
      <section className="bg-neutral-50 dark:bg-neutral-900 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">The Problem</h2>
          <div className="max-w-3xl text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed border-l-2 border-red-500/20 pl-6 space-y-3">
            <p>{copy.problemLines[0]}</p>
            <p>
              {copy.problemLines[1].split('\n').map((line: string, i: number) => (
                <React.Fragment key={i}>
                  {line}
                  {i < copy.problemLines[1].split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
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
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{copy.differentiationTitle}</h2>
          <div className="max-w-3xl text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed space-y-3">
            <div className="space-y-1">
              {copy.differentiationLines.map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {copy.differentiationConclusion}
            </p>
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION — neutral */}
      <section className="bg-neutral-50 dark:bg-neutral-900 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">The Solution</h2>
          <div className="max-w-3xl p-5 md:p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <p className="text-neutral-900 dark:text-neutral-100 font-medium">{copy.solutionIntro}</p>
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
      <section className="bg-white dark:bg-neutral-950 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-6">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Diagnostic Runtime</h2>
          <p className="max-w-3xl text-lg text-neutral-600 dark:text-neutral-400 whitespace-pre-line">
            {copy.cli}
          </p>
          
          <div className="max-w-3xl rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <pre className="px-4 py-4 md:px-6 md:py-5 overflow-x-auto text-sm font-mono leading-relaxed text-neutral-900 dark:text-neutral-100">
              <code>npx arch-engine doctor</code>
            </pre>
          </div>

          {/* Example Output */}
          <div className="max-w-3xl rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
            <div className="px-4 md:px-6 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800">
              <span className="uppercase tracking-wide text-xs text-neutral-600 dark:text-neutral-400 font-medium">Example output</span>
            </div>
            <pre className="px-4 py-3 md:px-6 md:py-4 bg-neutral-50 dark:bg-neutral-900 overflow-x-auto text-sm font-mono leading-relaxed text-neutral-600 dark:text-neutral-400">
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
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400 font-medium">
            {copy.cliExecSummary.map((line: string, i: number) => (
              <span key={i}>{line}</span>
            ))}
          </div>

          {/* Safety & Runtime Signals */}
          <div className="max-w-3xl text-sm text-neutral-500 dark:text-neutral-400 space-y-0.5">
            <p>{copy.cliSafetyNote}</p>
            <p>{copy.cliOffline} {copy.cliDuration}</p>
            <p>{copy.cliNpxNote}</p>
          </div>

          {mode === 'technical' && (
            <div className="pt-2">
              <p className="text-sm font-bold tracking-tight mb-2 text-neutral-900 dark:text-neutral-100">Outputs:</p>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1 list-disc pl-5">
                <li>workspace classification</li>
                <li>dependency topology confidence</li>
                <li>authority crossings</li>
                <li>policy readiness signals</li>
                <li><code className="font-mono text-neutral-600 dark:text-neutral-500">--json</code> flag provides machine-readable output for CI integration</li>
                <li>Exit codes reflect diagnostic status for CI usage</li>
              </ul>
              {copy.cliDoctorScope && (
                <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  {copy.cliDoctorScope}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* POLICY PACKS SECTION — neutral */}
      <section className="bg-neutral-50 dark:bg-neutral-900 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Policy Packs</h2>
          <p className="uppercase tracking-wide text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {copy.policyPackOptional}
          </p>
          <p className="max-w-3xl text-lg text-neutral-600 dark:text-neutral-400 whitespace-pre-line">
            {copy.policyPacks}
          </p>
          {copy.federationOptIn && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {copy.federationOptIn}
            </p>
          )}
          {mode === 'technical' && (
            <div className="pt-2">
              <p className="text-sm font-bold tracking-tight mb-1.5 text-neutral-900 dark:text-neutral-100">Shipped packs:</p>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-0.5 list-disc pl-5">
                <li>authority-boundary enforcement</li>
                <li>REST contract parity validation</li>
                <li>journey regression detection</li>
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ADAPTERS SECTION — white */}
      <section className="bg-white dark:bg-neutral-950 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-5">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Adapters</h2>
          <p className="max-w-3xl text-lg text-neutral-600 dark:text-neutral-400 whitespace-pre-line">
            {copy.adapters}
          </p>
          {copy.adapterSafety && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {copy.adapterSafety}
            </p>
          )}
          {mode === 'technical' && (
            <div className="inline-block px-3 py-1.5 mt-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded font-mono text-sm text-neutral-600 dark:text-neutral-400">
              Example: @arch-engine/adapter-monorepo
            </div>
          )}
        </div>
      </section>

      {/* TRUST SIGNALS SECTION — neutral */}
      <section className="bg-neutral-50 dark:bg-neutral-900 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6 space-y-6">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Production Ready</h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">{copy.trustIntro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <h3 className="text-neutral-900 dark:text-neutral-100 font-semibold mb-1">{copy.trustCard1Title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{copy.trustCard1Desc}</p>
            </div>
            <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <h3 className="text-neutral-900 dark:text-neutral-100 font-semibold mb-1">{copy.trustCard2Title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{copy.trustCard2Desc}</p>
            </div>
            <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <h3 className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">{copy.trustCard3Title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{copy.trustCard3Desc}</p>
            </div>
            <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <h3 className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">{copy.trustCard4Title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{copy.trustCard4Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION — white */}
      <section className="bg-white dark:bg-neutral-950 py-10 md:py-14 lg:py-20">
        <div className="mx-auto max-w-5xl px-5 md:px-6 text-center flex flex-col items-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-pre-line">
            {copy.cta}
          </h2>
          <div className="inline-block text-left rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
            <pre className="px-5 py-4 md:px-8 md:py-6 bg-neutral-50 dark:bg-neutral-900 text-sm font-mono leading-relaxed text-neutral-900 dark:text-neutral-300">
              <code>
                {mode === 'plain' ? (
                  <><span className="text-neutral-500">npm install</span> @arch-engine/cli</>
                ) : (
                  <>
                    <span className="text-neutral-500">npm install</span> @arch-engine/cli{'\n'}
                    <span className="text-neutral-500">npm install</span> @arch-engine/adapter-monorepo{'\n\n'}
                    <span className="text-neutral-500">npx</span> arch-engine doctor
                  </>
                )}
              </code>
            </pre>
          </div>
          <p className="uppercase tracking-wide text-xs text-neutral-500 font-medium">{copy.ctaFooter}</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-5xl px-5 md:px-6 py-10 flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-neutral-500 dark:text-neutral-400 font-medium">
          <p>© {new Date().getFullYear()} Arch-Engine. MIT Licensed.</p>
          <div className="flex gap-6">
            <a href="https://github.com/tharcyn/arch-engine" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">GitHub</a>
            <a href="https://www.npmjs.com/package/@arch-engine/cli" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">npm</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
