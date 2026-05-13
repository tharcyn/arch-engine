import pc from 'picocolors';
import { discoverEnvironment } from '../autodiscovery.js';
import {
  executeRunnerBridge,
  loadMonorepoAdapter,
  BridgeAdapterConflictError,
  type BridgeAdapterSummary,
} from '../runner-bridge.js';
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
  confidenceDescription,
  classifyConfidence,
  classifyStability,
  checkQualityFloor,
  countDomainDistribution,
  checkDomainIntegrity,
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

export async function doctorCommand(options: any) {
  const cwd = process.cwd();
  const out: CliOutputOptions = options.outputOptions;
  rejectBaselineForUnsupportedCommand(out, 'doctor');

  // Auto-init on first run
  const initResult = autoInitializeArchitectureContext(cwd);

  if (out.format === 'human' && !out.quiet && !out.json) {
    // No literal command echo. No hardcoded version strings. The pre-extraction
    // "Adapter resolution OK / Topology extraction ready" lines were removed
    // because they ran BEFORE the adapter was actually loaded — false reassurance.
    console.log(pc.dim('Diagnosing environment readiness...\n'));

    if (initResult.initialized) {
      console.log(`${pc.green('✔')} ${initResult.message}`);
      if (initResult.filesCreated.length > 0) {
        console.log(pc.dim(`  Created: ${initResult.filesCreated.join(', ')}\n`));
      }
    }
  }

  // Adapter selection via runner-bridge (Pass 2). On conflict, exit 3.
  const adapter = await loadMonorepoAdapter();
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
  const extraction = bridge.extractionLegacy;
  const meta = extraction.metadata;
  const policyPresence = detectPolicyFile(cwd);

  // Domain distribution
  const domainPackages = Object.entries(extraction.routeServiceMap.forward as Record<string, RouteServiceEntry>).map(
    ([route, entry]: [string, RouteServiceEntry]) => ({ authorityDomain: adapter.classifyAuthorityDomain(entry.backend_route) }),
  );
  const domainDist = countDomainDistribution(domainPackages);
  const domainIntegrity = checkDomainIntegrity(domainDist);
  const stability = classifyStability(meta.topologyConfidence); // Approximate from confidence for doctor (no engine run)

  // Phase 6 (v1.0.3): build the structured `diagnostics[]` array
  // additively. Existing JSON keys above are preserved verbatim.
  const diagnostics: CliDiagnostic[] = [];
  if (!policyPresence.configured) {
    diagnostics.push(
      buildDiagnostic({
        code: 'ARCH_ENGINE_POLICY_NOT_FOUND',
        message:
          'No policy file is configured yet. Topology was extracted successfully; nothing was enforced.',
      }),
    );
  }
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

  const results = {
    environment: meta.workspaceType,
    extractionMode: meta.extractionMode,
    topologyConfidence: meta.topologyConfidence,
    topologyConfidenceLabel: classifyConfidence(meta.topologyConfidence),
    confidenceDescription: confidenceDescription(meta),
    detectedNodes: meta.detectedNodes,
    expectedNodes: meta.expectedNodes,
    connectedNodes: meta.connectedNodes,
    coverage: meta.coverage,
    connectivity: meta.connectivity,
    crossings: extraction.authorityCrossings.length,
    domainDistribution: domainDist,
    domainIntegrity,
    warnings: meta.warnings,
    autoInitialized: initResult.initialized,
    hasPolicyFile: policyPresence.configured,
    // Phase 6 additive — JSON v1.0.3 ships `diagnostics: []` on every
    // command's --json. Always present (empty when no diagnostics).
    diagnostics: diagnostics.map(diagnosticToJson),
  };

  // ── v1.1.0: format-aware emission ──────────────────────────
  if (out.format === 'json') {
    if (out.jsonSchema === 'v2') {
      emitFormattedOutput(buildDoctorV2(out, results, diagnostics, policyPresence.configured, bridge.adapterSummary) + '\n', out);
      return;
    }
    // v1 (default) — preserve byte-identical v1.0.3 shape.
    emitFormattedOutput(JSON.stringify(results, null, 2) + '\n', out);
    return;
  }

  if (out.format === 'markdown') {
    const v2 = buildDoctorV2EnvelopeInput(out, results, diagnostics, policyPresence.configured, bridge.adapterSummary);
    emitFormattedOutput(renderCliMarkdown(v2), out);
    return;
  }

  // Human mode — preserve byte-identical v1.2.x rendering except for
  // the Pass 2B "Adapter" line, which is documented v1.3.0 behavior.
  // Honour --quiet by suppressing the verdict header lines.
  // Workspace detection transparency
  if (meta.extractionMode === 'structured') {
    console.log(`${pc.green('✔')} Workspace type resolved as: ${pc.bold(meta.workspaceType)} (highest confidence)`);
  } else {
    console.log(`${pc.yellow('⚠')} Workspace: ${pc.bold('fallback directory scan')} (degraded extraction mode)`);
  }

  // Pass 2B — concise adapter identity line. Surfaces the registered
  // adapter that produced the topology so users running pnpm /
  // multi-adapter setups can confirm at a glance that the right
  // adapter handled their repo.
  const summaryConfidence = bridge.adapterSummary.confidence;
  const confidenceIcon =
    summaryConfidence === 'HIGH'
      ? pc.green('✔')
      : summaryConfidence === 'MEDIUM'
        ? pc.green('✔')
        : pc.yellow('⚠');
  console.log(
    `${confidenceIcon} Adapter: ${pc.bold(bridge.adapterSummary.name)} (${summaryConfidence} confidence)`,
  );

  // Nodes
  console.log(`${pc.green('✔')} Packages detected: ${pc.bold(meta.detectedNodes)} / ${meta.expectedNodes} expected`);
  console.log(`${pc.green('✔')} Connected nodes: ${pc.bold(meta.connectedNodes)}`);

  // Coverage + Confidence
  console.log(`${pc.green('✔')} Coverage: ${pc.bold((meta.coverage * 100).toFixed(0))}%`);
  console.log(`${pc.green('✔')} Connectivity: ${pc.bold((meta.connectivity * 100).toFixed(0))}%`);
  console.log(`${meta.topologyConfidence >= 0.70 ? pc.green('✔') : pc.yellow('⚠')} Confidence: ${pc.bold(results.confidenceDescription)}`);

  // Authority crossings
  console.log(`${pc.green('✔')} Authority crossings observed: ${pc.bold(extraction.authorityCrossings.length)}`);

  // Domain Distribution
  const activeDomains = Object.entries(domainDist as Record<string, number>).filter(([_domain, c]: [string, number]) => c > 0);
  if (activeDomains.length > 0 && !out.quiet) {
    console.log(`\n${pc.bold('Domain Distribution:')}`);
    for (const [domain, count] of activeDomains) {
      const icon = domain === 'UNCLASSIFIED' ? pc.yellow('●') : pc.green('●');
      console.log(`  ${icon} ${domain}: ${pc.bold(count as number)}`);
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

  // Policy file — informational, not a warning. Setup gap, not error.
  if (!out.quiet) {
    if (policyPresence.configured) {
      console.log(`\n${pc.green('✔')} Policy file detected: ${pc.bold(policyPresence.path!)}`);
    } else {
      console.log(`\n${pc.dim('No policy file is configured yet.')}`);
      console.log(pc.dim('  Topology extraction completed successfully.'));
    }
  }

  // Warnings
  if (meta.warnings.length > 0 && !out.quiet) {
    console.log(`\n${formatWarningHeader(meta.warnings.length)}`);
    for (const line of formatWarnings(meta.warnings)) {
      console.log(line);
    }
  }

  // Single final next-action line.
  if (!out.quiet) {
    console.log('');
    if (!policyPresence.configured) {
      console.log(
        'Next: run `arch-engine inspect` to review the topology, then add ' +
          '`arch-policy.yml` when you are ready to enforce rules.',
      );
    } else {
      console.log('Next: run `arch-engine check` to evaluate your policy.');
    }
  }

  // Reference an unused symbol so the linter doesn't yell — `stability`
  // is computed for parity with the v1.0.x flow even though doctor's
  // human render doesn't print it.
  void stability;
}

// ─── v1.1.0 v2 envelope helpers ────────────────────────────────

function buildDoctorV2EnvelopeInput(
  out: CliOutputOptions,
  v1: any,
  diagnostics: CliDiagnostic[],
  policyConfigured: boolean,
  adapterSummary: BridgeAdapterSummary,
): V2RenderInput {
  const status = deriveStatusForExit(0, diagnostics, 0);
  const ready = !policyConfigured ? true : true; // doctor's `ready` is informational
  const summary = buildSummary(
    ready ? 'Workspace topology extracted.' : 'Workspace not ready.',
    status,
    {
      warnings: diagnostics.filter((d) => d.severity === 'WARNING').length,
      diagnostics: diagnostics.length,
    },
  );

  const data = {
    ready,
    policyConfigured,
    workspace: {
      type: v1.environment,
      extractionMode: v1.extractionMode,
      packageCount: v1.detectedNodes,
    },
    // Pass 2 — full data.adapter block per spec §12.2. Replaces the
    // v1.2.0 `{id, resolved}` shape with the richer canonical shape,
    // sourced from the adapter selection summary.
    adapter: buildDataAdapterBlock(adapterSummary),
    topology: {
      nodes: v1.detectedNodes,
      edges: v1.crossings,
      coverage: v1.coverage,
      connectivity: v1.connectivity,
      topologyConfidence: v1.topologyConfidence,
      topologyConfidenceLabel: v1.topologyConfidenceLabel,
      confidenceTier: v1.topologyConfidenceLabel,
    },
    domains: v1.domainDistribution,
    domainIntegrity: v1.domainIntegrity,
    warnings: v1.warnings,
  };

  const nextActions: string[] = [];
  if (!policyConfigured) {
    nextActions.push(
      'Run `arch-engine inspect` to review the topology, then add `arch-policy.yml` to enforce rules.',
    );
  } else {
    nextActions.push('Run `arch-engine check` to evaluate your policy.');
  }

  return {
    command: 'doctor',
    exitCode: 0,
    status,
    summary,
    data,
    diagnostics,
    artifacts: [],
    nextActions,
    includeAbsolutePath: out.verbose,
  };
}

function buildDoctorV2(
  out: CliOutputOptions,
  v1: any,
  diagnostics: CliDiagnostic[],
  policyConfigured: boolean,
  adapterSummary: BridgeAdapterSummary,
): string {
  return renderCliJsonV2(
    buildDoctorV2EnvelopeInput(out, v1, diagnostics, policyConfigured, adapterSummary),
  );
}
