import pc from 'picocolors';
import {
  executeRunnerBridge,
  loadMonorepoAdapter,
  BridgeAdapterConflictError,
  type BridgeAdapterSummary,
} from '../runner-bridge.js';
import { discoverEnvironment } from '../autodiscovery.js';
import { type RouteServiceEntry } from '@arch-engine/core';
import { autoInitializeArchitectureContext } from '../auto-init.js';
import { detectPolicyFile } from '../policy-presence.js';
import {
  buildDiagnostic,
  diagnosticToJson,
  emitDiagnosticHuman,
  emitDiagnosticJson,
  type CliDiagnostic,
} from '../format-error.js';
import {
  classifyConfidence,
  confidenceDescription,
  countDomainDistribution,
  checkDomainIntegrity,
  checkQualityFloor,
  formatWarnings,
  formatWarningHeader,
} from '../renderers.js';
import {
  buildSummary,
  buildDataAdapterBlock,
  deriveStatusForExit,
  renderCliJsonV2,
  type V2RenderInput,
} from '../render-v2.js';
import { renderCliMarkdown } from '../render-markdown.js';
import { emitFormattedOutput } from '../output-writer.js';
import type { CliOutputOptions } from '../cli-options.js';
import { rejectBaselineForUnsupportedCommand } from '../cli-options.js';
import {
  buildCanonicalTopologyFromAdjacencyMap,
  type CanonicalTopology,
} from '../canonical-topology.js';

export async function inspectCommand(options: any) {
  const cwd = process.cwd();
  const out: CliOutputOptions = options.outputOptions;
  rejectBaselineForUnsupportedCommand(out, 'inspect');

  // Auto-init silently
  autoInitializeArchitectureContext(cwd);

  if (out.format === 'human' && !out.quiet && !out.json) {
    // No literal command echo — see CLI Experience Specification §4 P12.
    console.log(pc.dim('Summarizing canonical topology...\n'));
  }

  // Adapter resolution via runner-bridge (Pass 2). For inspect, the
  // bridge result is the source of truth for both the legacy
  // extraction shape AND the adapter selection summary.
  const discovery = discoverEnvironment(cwd);
  let bridge;
  try {
    bridge = await executeRunnerBridge(cwd, discovery);
  } catch (err) {
    if (err instanceof BridgeAdapterConflictError) {
      const d = err.diagnostics[0]!;
      if (out.format === 'json') {
        emitDiagnosticJson(d);
      } else {
        emitDiagnosticHuman(d);
      }
      process.exit(3);
    }
    throw err;
  }
  const adapter = await loadMonorepoAdapter();
  const extraction = bridge.extractionLegacy;
  const meta = extraction.metadata;

  // Domain distribution
  const domainPackages = Object.entries(extraction.routeServiceMap.forward as Record<string, RouteServiceEntry>).map(
    ([route, entry]: [string, RouteServiceEntry]) => ({ authorityDomain: adapter.classifyAuthorityDomain(entry.backend_route) }),
  );
  const domainDist = countDomainDistribution(domainPackages);
  const domainIntegrity = checkDomainIntegrity(domainDist);

  const edgeCount = Object.values(extraction.edgesByAdapter).flat().length;
  const confidenceLabel = classifyConfidence(meta.topologyConfidence);

  // v1.2.0 — build canonical topology unconditionally.
  const canonicalTopology = buildCanonicalTopologyFromAdjacencyMap(
    (extraction.adjacencyMap ?? {}) as Record<string, ReadonlyArray<string>>,
  );

  // Phase 6 (v1.0.3): structured diagnostics array (additive; never
  // removes or renames existing JSON keys).
  const diagnostics: CliDiagnostic[] = [];
  const floorCheck = checkQualityFloor(meta);
  if (floorCheck.belowFloor) {
    diagnostics.push(
      buildDiagnostic({
        code: 'ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL',
        message: floorCheck.message ?? 'Topology coverage is too low for confident evaluation.',
      }),
    );
  }
  // Pass 2: surface adapter-level diagnostics.
  for (const d of bridge.adapterDiagnostics) diagnostics.push(d);

  const data = {
    nodes: meta.detectedNodes,
    edges: edgeCount,
    crossings: extraction.authorityCrossings.length,
    confidence: meta.topologyConfidence,
    topologyConfidenceLabel: confidenceLabel,
    confidenceDescription: confidenceDescription(meta),
    coverage: meta.coverage,
    connectivity: meta.connectivity,
    extractionMode: meta.extractionMode,
    workspaceType: meta.workspaceType,
    domainDistribution: domainDist,
    warnings: meta.warnings,
    adaptersActive: ['adapter-monorepo'],
    // Phase 6 additive
    diagnostics: diagnostics.map(diagnosticToJson),
  };

  // ── v1.1.0: format-aware emission ──────────────────────────
  if (out.format === 'json') {
    if (out.jsonSchema === 'v2') {
      emitFormattedOutput(buildInspectV2(out, data, diagnostics, canonicalTopology, bridge.adapterSummary) + '\n', out);
      return;
    }
    emitFormattedOutput(JSON.stringify(data, null, 2) + '\n', out);
    return;
  }

  if (out.format === 'markdown') {
    const v2 = buildInspectV2EnvelopeInput(out, data, diagnostics, canonicalTopology, bridge.adapterSummary);
    emitFormattedOutput(renderCliMarkdown(v2), out);
    return;
  }

  // Human mode (preserves v1.0.3 byte-identical when --quiet/--verbose are off)
  console.log(`Nodes detected:       ${pc.bold(data.nodes)}`);
  console.log(`Edges:                ${pc.bold(data.edges)}`);
  console.log(`Crossings observed:   ${pc.bold(data.crossings)}`);
  console.log(`Coverage:             ${pc.bold((data.coverage * 100).toFixed(0))}%`);
  console.log(`Connectivity:         ${pc.bold((data.connectivity * 100).toFixed(0))}%`);
  console.log(`Confidence:           ${pc.bold(data.confidenceDescription)}`);
  console.log(`Extraction mode:      ${pc.bold(data.extractionMode)}`);
  console.log(`Workspace type:       ${pc.bold(data.workspaceType)}`);

  // Domain Distribution (suppress under --quiet)
  if (!out.quiet) {
    console.log(`\n${pc.bold('Domain Distribution:')}`);
    for (const [domain, count] of Object.entries(data.domainDistribution as Record<string, number>)) {
      if (count > 0) {
        const icon = domain === 'UNCLASSIFIED' ? pc.yellow('●') : pc.green('●');
        console.log(`  ${icon} ${domain}: ${pc.bold(count)}`);
      }
    }
  }

  // Domain integrity
  if (domainIntegrity.degraded) {
    console.log(`\n${pc.yellow('⚠')} ${pc.yellow(domainIntegrity.message!)}`);
  }

  // Quality floor
  const floor = checkQualityFloor(meta);
  if (floor.belowFloor) {
    console.log(`\n${pc.yellow('⚠')} ${pc.yellow(floor.message!)}`);
  }

  // Warnings
  if (data.warnings.length > 0 && !out.quiet) {
    console.log(`\n${formatWarningHeader(data.warnings.length)}`);
    for (const line of formatWarnings(data.warnings)) {
      console.log(line);
    }
  }

  // Adapters
  if (!out.quiet) {
    console.log(`\n${pc.bold('Adapters active:')}`);
    for (const adapter of data.adaptersActive) {
      console.log(`  ${pc.green('●')} ${adapter}`);
    }
  }

  // Single final next-action line.
  const policyPresence = detectPolicyFile(cwd);
  if (!out.quiet) {
    console.log('');
    if (!policyPresence.configured) {
      console.log('Next: run `arch-engine analyze` to score architecture signal, or add `arch-policy.yml` and run `arch-engine check`.');
    } else {
      console.log('Next: run `arch-engine check` to evaluate your policy against this topology.');
    }
  }
}

// ─── v2 envelope helpers ──────────────────────────────────────

function buildInspectV2EnvelopeInput(
  out: CliOutputOptions,
  v1: any,
  diagnostics: CliDiagnostic[],
  canonicalTopology: CanonicalTopology,
  adapterSummary: BridgeAdapterSummary,
): V2RenderInput {
  const status = deriveStatusForExit(0, diagnostics, 0);
  const summary = buildSummary(
    `Topology: ${v1.nodes} node${v1.nodes === 1 ? '' : 's'}, ${v1.edges} edge${v1.edges === 1 ? '' : 's'}.`,
    status,
    {
      warnings: diagnostics.filter((d) => d.severity === 'WARNING').length,
      diagnostics: diagnostics.length,
    },
  );

  const data = {
    // Pass 2 — additive adapter identity block per
    // docs/adapters/multi-adapter-surface-spec.md §12.2.
    adapter: buildDataAdapterBlock(adapterSummary),
    topology: {
      nodes: v1.nodes,
      edges: v1.edges,
      crossings: v1.crossings,
      coverage: v1.coverage,
      connectivity: v1.connectivity,
      topologyConfidence: v1.confidence,
      topologyConfidenceLabel: v1.topologyConfidenceLabel,
      extractionMode: v1.extractionMode,
      workspaceType: v1.workspaceType,
      // v1.2.0 — canonical topology is emitted unconditionally for
      // every command that has topology data.
      canonical: canonicalTopology,
    },
    domains: v1.domainDistribution,
    warnings: v1.warnings,
    adaptersActive: v1.adaptersActive,
  };

  return {
    command: 'inspect',
    exitCode: 0,
    status,
    summary,
    data,
    diagnostics,
    artifacts: [],
    nextActions: [
      'Run `arch-engine analyze` to score architecture signal, or add `arch-policy.yml` and run `arch-engine check`.',
    ],
    includeAbsolutePath: out.verbose,
  };
}

function buildInspectV2(
  out: CliOutputOptions,
  v1: any,
  diagnostics: CliDiagnostic[],
  canonicalTopology: CanonicalTopology,
  adapterSummary: BridgeAdapterSummary,
): string {
  return renderCliJsonV2(buildInspectV2EnvelopeInput(out, v1, diagnostics, canonicalTopology, adapterSummary));
}
