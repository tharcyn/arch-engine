import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <main className="mx-auto max-w-[900px] px-6 py-24 space-y-32">
        {/* HERO SECTION */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Arch-Engine
            </h1>
            <h2 className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 font-medium">
              A topology reasoning runtime for architecture governance
            </h2>
          </div>
          
          <p className="text-lg leading-relaxed text-zinc-700 dark:text-zinc-300 max-w-2xl">
            Arch-Engine extracts dependency topology from real repositories, 
            constructs deterministic architecture graphs, 
            and applies composable governance policy packs over that structure.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <a 
              href="https://github.com/tharcyn/arch-engine" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-50 px-6 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300"
            >
              View on GitHub
            </a>
            <a 
              href="https://www.npmjs.com/package/@arch-engine/cli" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300"
            >
              Try the CLI
            </a>
          </div>
        </section>

        {/* DIFFERENTIATION SECTION */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 className="font-semibold mb-2">Topology-first analysis</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Operates on the structural dependency graph rather than individual files or arbitrary strings.</p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 className="font-semibold mb-2">Deterministic execution replay</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Generates stable closureGraphHash signatures to ensure evaluation behavior is identical across environments.</p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 className="font-semibold mb-2">Composable governance packs</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Overlay multiple architectures rulesets seamlessly without modifying core runtime behavior.</p>
          </div>
        </section>

        {/* QUICKSTART SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Quickstart</h2>
          <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <pre className="p-4 bg-zinc-50 dark:bg-zinc-900/80 overflow-x-auto text-sm font-mono leading-relaxed text-zinc-800 dark:text-zinc-300">
              <code>
<span className="text-zinc-500"># Install the CLI</span>{'\n'}
npm install @arch-engine/cli@rc{'\n\n'}
<span className="text-zinc-500"># Install a workspace adapter</span>{'\n'}
npm install @arch-engine/adapter-monorepo@rc{'\n\n'}
<span className="text-zinc-500"># Run architecture diagnostics</span>{'\n'}
npx arch-engine doctor
              </code>
            </pre>
          </div>
          
          <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 mt-6">
            <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Example Output</div>
            <pre className="p-4 bg-zinc-50 dark:bg-zinc-900/80 overflow-x-auto text-sm font-mono leading-relaxed text-zinc-800 dark:text-zinc-300">
              <code>
✔ Workspace type resolved as: single (highest confidence){'\n'}
✔ Packages detected: 1 / 1 expected{'\n'}
✔ Connected nodes: 1{'\n'}
✔ Coverage: 100%{'\n'}
✔ Connectivity: 100%{'\n'}
✔ Confidence: HIGH (Structured single workspace extraction){'\n'}
✔ Authority crossings observed: 0
              </code>
            </pre>
          </div>
        </section>

        {/* CONSTELLATION SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Package Constellation</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">Package</th>
                  <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">schema</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Canonical contracts and shared structures</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">core</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Topology reasoning runtime engine</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">cli</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Command-line validation interface</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">adapter-monorepo</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Workspace topology extraction</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">governance-pack-authority</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Authority boundary governance overlay</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">governance-pack-rest-contract</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">REST contract parity governance overlay</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">governance-pack-journey</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Journey lifecycle governance overlay</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SNAPSHOT REPLAY SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Snapshot Replay</h2>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Arch-Engine guarantees execution determinism through structural hashing. Every topology graph and policy composition produces a unique <code className="font-mono text-sm bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">closureGraphHash</code>. 
          </p>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            This hash represents a cryptographic footprint of the evaluation. By maintaining execution lineage, users can confidently perform snapshot comparisons across environments, guaranteeing that identical structures evaluate identically without hidden side-effects.
          </p>
        </section>

        {/* EXAMPLE SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Example Walkthrough</h2>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            The reference example at <code className="font-mono text-sm bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">examples/sample-monorepo</code> demonstrates a standard fan-in topology using a local monorepo setup.
          </p>
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-4">
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm font-medium">api</span>
              <span className="text-zinc-400">→ depends on →</span>
              <span className="font-mono text-sm font-medium">shared</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm font-medium">web</span>
              <span className="text-zinc-400">→ depends on →</span>
              <span className="font-mono text-sm font-medium">shared</span>
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Adapters automatically intercept workspace edges to correctly resolve these relative boundaries under extraction.
          </p>
        </section>

        {/* REPOSITORY STRUCTURE SECTION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Repository Structure</h2>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
              <code className="font-mono text-sm md:w-32 shrink-0">packages/</code>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 m-0">The core runtime packages, CLI, extraction adapters, and official governance overlays.</p>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
              <code className="font-mono text-sm md:w-32 shrink-0">examples/</code>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 m-0">Self-contained topology specimens and policy composition scenarios.</p>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
              <code className="font-mono text-sm md:w-32 shrink-0">docs/</code>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 m-0">Architecture contracts, federation mechanics, versioning strategies, and capability models.</p>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
              <code className="font-mono text-sm md:w-32 shrink-0">scripts/</code>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 m-0">Internal repository maintenance tooling.</p>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
              <code className="font-mono text-sm md:w-32 shrink-0">schemas/</code>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 m-0">JSON schema definitions for diagnostics and execution capability descriptors.</p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
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
