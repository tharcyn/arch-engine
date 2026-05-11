import pc from 'picocolors';
import Table from 'cli-table3';
import { createRequire } from 'node:module';
import { discoverEnvironment } from '../autodiscovery.js';
import { executeRunnerBridge, loadMonorepoAdapter } from '../runner-bridge.js';
import { type RouteServiceEntry } from '@arch-engine/core';
import { autoInitializeArchitectureContext } from '../auto-init.js';
import { detectPolicyFile } from '../policy-presence.js';
import { buildDiagnostic, diagnosticToJson, type CliDiagnostic } from '../format-error.js';
import {
  classifyStability,
  classifyConfidence,
  confidenceDescription,
  checkQualityFloor,
  countDomainDistribution,
  checkDomainIntegrity,
  deriveAnalysisHeadline,
  formatWarnings,
  formatWarningHeader,
} from '../renderers.js';
import { createStabilityArtifact, writeStabilityArtifact } from '../snapshot.js';
import {
  buildSummary,
  deriveStatusForExit,
  normalizeArtifactPath,
  readPackageVersion,
  renderCliJsonV2,
  type V2Artifact,
  type V2RenderInput,
} from '../render-v2.js';
import { renderCliMarkdown } from '../render-markdown.js';
import { emitFormattedOutput } from '../output-writer.js';
import type { CliOutputOptions } from '../cli-options.js';
import {
  buildCanonicalTopologyFromAdjacencyMap,
  type CanonicalTopology,
} from '../canonical-topology.js';
import {
  readBaselineReport,
  BaselineReadError,
  type BaselineReadResult,
} from '../baseline-reader.js';
import {
  emitDiagnosticHuman,
  emitDiagnosticJson,
} from '../format-error.js';
import {
  computeArchitectureDrift,
  buildDriftJsonBlock,
  buildDriftSummaryMirror,
  buildDriftHeadlineSuffix,
  type DriftResult,
} from '../drift.js';

export async function analyzeCommand(options: any) {
  const cwd = process.cwd();
  const out: CliOutputOptions = options.outputOptions;

  // v1.2.0 — read baseline up front if --baseline is set. Baseline
  // validation is cheap; failing fast here saves a full extraction
  // pass on an invalid path.
  let baseline: BaselineReadResult | null = null;
  if (out.baseline !== undefined) {
    try {
      baseline = readBaselineReport(out.baseline, 'analyze', readPackageVersionSafe());
    } catch (err) {
      if (err instanceof BaselineReadError) {
        if (out.format === 'json') {
          emitDiagnosticJson(err.diagnostic);
        } else {
          emitDiagnosticHuman(err.diagnostic);
        }
        process.exit(2);
      }
      throw err;
    }
  }

  // Auto-init silently
  autoInitializeArchitectureContext(cwd);

  if (out.format === 'human' && !out.quiet && !out.json) {
    console.log(pc.bold(pc.cyan('\n  Architecture Stability Report\n')));
  }

  const discovery = discoverEnvironment(cwd);
  const bridge = await executeRunnerBridge(cwd, discovery);

  const { engineResult, extractionMetadata: meta, executionMetrics, adjacencyMap } = bridge;

  // v1.2.0 — build canonical topology unconditionally.
  const canonicalTopology = buildCanonicalTopologyFromAdjacencyMap(
    (adjacencyMap ?? {}) as Record<string, ReadonlyArray<string>>,
  );
  const score = engineResult.stabilityIndex.topology_reliability_score;
  const stability = classifyStability(score);
  const confidenceLabel = classifyConfidence(meta.topologyConfidence);
  const crossingCount = engineResult.stabilityIndex.authority_crossings.total_crossings;
  const policyPresence = detectPolicyFile(cwd);
  const headline = deriveAnalysisHeadline({ score, meta, policyConfigured: policyPresence.configured });

  // Domain distribution (adapter resolved lazily via runner-bridge)
  const adapter = await loadMonorepoAdapter();
  const extraction = adapter.runMonorepoExtraction(cwd);
  const fwdDomainPkgs = Object.entries(extraction.routeServiceMap.forward as Record<string, RouteServiceEntry>).map(
    ([route, entry]: [string, RouteServiceEntry]) => ({ authorityDomain: adapter.classifyAuthorityDomain(entry.backend_route) }),
  );
  const domainDist = countDomainDistribution(fwdDomainPkgs);
  const domainIntegrity = checkDomainIntegrity(domainDist);

  // Emit artifact with timing
  const artifact = createStabilityArtifact(cwd, meta, score, crossingCount, executionMetrics);
  const artifactPath = writeStabilityArtifact(cwd, artifact);

  // Phase 6 (v1.0.3): structured diagnostics array (additive).
  const diagnostics: CliDiagnostic[] = [];
  if (!policyPresence.configured) {
    diagnostics.push(
      buildDiagnostic({
        code: 'ARCH_ENGINE_POLICY_NOT_FOUND',
        message: 'No policy configured — topology was captured but not evaluated.',
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

  // v1.2.0 — compute drift if --baseline was provided.
  let drift: DriftResult | null = null;
  if (baseline !== null) {
    const baselineSignals = extractBaselineSignals(baseline);
    const baselineViolations = extractBaselineViolations(baseline);
    drift = computeArchitectureDrift(
      {
        canonical: baseline.canonicalTopology,
        violations: baselineViolations,
        signals: baselineSignals,
      },
      {
        canonical: canonicalTopology,
        violations: [], // analyze has no policy evaluation
        signals: {
          score,
          coverage: meta.coverage,
          connectivity: meta.connectivity,
          confidence: meta.topologyConfidence,
          violationsCount: 0,
        },
      },
    );
    if (drift.hasDrift) {
      diagnostics.push(
        buildDiagnostic({
          code: 'ARCH_ENGINE_DRIFT_DETECTED',
          message: buildDriftHumanMessage(baseline, drift),
        }),
      );
    }
    if (baseline.warning) {
      diagnostics.push(baseline.warning);
    }
  }

  // Common v1 payload (preserve byte-identical default)
  const v1Json = {
    score,
    classification: stability.tier,
    stabilityTier: stability.tier,
    topologyConfidenceLabel: confidenceLabel,
    coverage: meta.coverage,
    connectivity: meta.connectivity,
    topologyConfidence: meta.topologyConfidence,
    extractionMode: meta.extractionMode,
    workspaceType: meta.workspaceType,
    authorityCrossings: crossingCount,
    domainDistribution: domainDist,
    blast_radius: engineResult.stabilityIndex.blast_radius_analysis,
    components: engineResult.stabilityIndex.components,
    warnings: meta.warnings,
    executionMetrics,
    policyConfigured: policyPresence.configured,
    headlineKind: headline.kind,
    diagnostics: diagnostics.map(diagnosticToJson),
  };

  // ── v1.1.0: format-aware emission ──────────────────────────
  if (out.format === 'json') {
    if (out.jsonSchema === 'v2') {
      emitFormattedOutput(
        renderCliJsonV2(buildAnalyzeV2EnvelopeInput(out, v1Json, diagnostics, artifactPath, headline.kind, cwd, canonicalTopology, drift, baseline)) + '\n',
        out,
      );
      return;
    }
    emitFormattedOutput(JSON.stringify(v1Json, null, 2) + '\n', out);
    return;
  }

  if (out.format === 'markdown') {
    emitFormattedOutput(
      renderCliMarkdown(buildAnalyzeV2EnvelopeInput(out, v1Json, diagnostics, artifactPath, headline.kind, cwd, canonicalTopology, drift, baseline)),
      out,
    );
    return;
  }

  // ── Human Mode (existing behavior preserved) ──────────────

  // ── Headline ────────────────────────────────────────────
  // Calibrated to policy presence and signal quality. We DO NOT print
  // "Stability Score: CRITICAL" on a no-policy or low-signal fixture.
  console.log(`\n  ${headline.color(pc.bold(headline.text))}`);

  // ── Header ──────────────────────────────────────────────
  if (!out.quiet) {
    console.log(`\n  Workspace Type:       ${pc.bold(meta.workspaceType)}`);
    console.log(`  Extraction Mode:      ${pc.bold(meta.extractionMode)}`);
    console.log(`  Topology Confidence:  ${pc.bold(confidenceDescription(meta))}`);
  }

  // ── Core Metrics ────────────────────────────────────────
  if (!out.quiet) {
    console.log(`\n  Coverage:             ${pc.bold((meta.coverage * 100).toFixed(0))}%`);
    console.log(`  Connectivity:         ${pc.bold((meta.connectivity * 100).toFixed(0))}%`);
  }

  // ── Quality Floor ───────────────────────────────────────
  const floor = checkQualityFloor(meta);
  if (floor.belowFloor) {
    console.log(`\n  ${pc.yellow('⚠')} ${pc.yellow(floor.message!)}`);
  }

  // ── Authority Domain Distribution ───────────────────────
  const activeDomains = Object.entries(domainDist as Record<string, number>).filter(([_domain, c]: [string, number]) => c > 0);
  if (activeDomains.length > 0 && !out.quiet) {
    console.log(`\n  ${pc.bold('Authority Domains:')}`);
    for (const [domain, count] of activeDomains) {
      const icon = domain === 'UNCLASSIFIED' ? pc.yellow('●') : pc.green('●');
      console.log(`    ${icon} ${domain}: ${pc.bold(count as number)}`);
    }
  }

  // ── Domain Integrity ────────────────────────────────────
  if (domainIntegrity.degraded) {
    console.log(`\n  ${pc.yellow('⚠')} ${pc.yellow(domainIntegrity.message!)}`);
  }

  // ── Observed Crossings ──────────────────────────────────
  const crossingEntries = engineResult.stabilityIndex.authority_crossings.entries;
  if (crossingEntries.length > 0 && !out.quiet) {
    console.log(`\n  ${pc.bold('Observed Crossings:')} (${crossingEntries.length})`);
    for (const c of crossingEntries.slice(0, 8)) {
      console.log(`    ${pc.dim(c.source_entity)} → ${pc.dim(c.target_entity)} [${c.authority_domain}]`);
    }
    if (crossingEntries.length > 8) {
      console.log(pc.dim(`    ... and ${crossingEntries.length - 8} more`));
    }
  }

  // ── Blast Radius ────────────────────────────────────────
  const brEntries = engineResult.stabilityIndex.blast_radius_analysis.entries;
  if (brEntries.length > 0 && !out.quiet) {
    console.log(`\n  ${pc.bold('Blast Radius Summary:')}`);
    const table = new Table({
      head: ['Entity', 'Original', 'Weighted', 'Attenuated'],
      style: { head: ['cyan'] },
      chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    });
    for (const e of brEntries.slice(0, 10)) {
      table.push([e.entity, e.original_blast_radius, e.weighted_blast_radius, e.attenuated ? 'Yes' : 'No']);
    }
    console.log(table.toString());
  }

  // ── Warnings ────────────────────────────────────────────
  if (meta.warnings.length > 0 && !out.quiet) {
    console.log(`\n  ${formatWarningHeader(meta.warnings.length)}`);
    for (const line of formatWarnings(meta.warnings)) {
      console.log(`  ${line}`);
    }
  }

  // ── Footer ──────────────────────────────────────────────
  if (!out.quiet) {
    console.log(pc.dim(`\n  Artifact written to ${artifactPath}`));
    console.log(pc.dim(`  Extraction: ${executionMetrics.extractionMs}ms | Pipeline: ${executionMetrics.pipelineMs}ms | Total: ${executionMetrics.totalMs}ms`));
  }

  // ── Architecture drift (v1.2.0) ─────────────────────────
  if (drift && baseline) {
    renderHumanDriftBlock(drift, baseline, out);
  }

  // ── Single final next-action line ──────────────────────
  if (!out.quiet) {
    console.log('');
    if (!policyPresence.configured) {
      console.log('Next: add `arch-policy.yml` to turn topology analysis into enforceable architecture checks.');
    } else {
      console.log('Next: run `arch-engine check` to apply your policy and get a CI verdict.');
    }
  }
}

// ─── v1.2.0 human-output drift block ─────────────────────────

function renderHumanDriftBlock(
  drift: DriftResult,
  baseline: BaselineReadResult,
  out: CliOutputOptions,
): void {
  const display = baselineDisplayPath(baseline, out.verbose);
  if (!drift.hasDrift) {
    console.log('');
    console.log(pc.green(`✔ No architectural drift detected (compared against ${display}).`));
    return;
  }
  const blocking = drift.summary.newViolations > 0;
  const header = blocking
    ? pc.red('Architecture drift detected')
    : pc.yellow('Architecture drift observed');
  console.log('');
  console.log(`${header} (compared against ${display}):`);
  console.log('');

  if (out.quiet) {
    // Quiet mode: surface the counters only, no detail tables.
    const parts: string[] = [];
    if (drift.summary.newViolations > 0) parts.push(`new violations: ${drift.summary.newViolations}`);
    if (drift.summary.resolvedViolations > 0) parts.push(`resolved: ${drift.summary.resolvedViolations}`);
    if (drift.summary.addedEdges > 0) parts.push(`added edges: ${drift.summary.addedEdges}`);
    if (drift.summary.removedEdges > 0) parts.push(`removed edges: ${drift.summary.removedEdges}`);
    console.log(`  ${parts.join('  |  ') || 'topology hash changed'}`);
    return;
  }

  if (drift.violations.new.length > 0) {
    console.log(pc.bold('  New blocking violations:'));
    for (const v of drift.violations.new.slice(0, 5)) {
      const rule = v.ruleId ?? '(unknown rule)';
      console.log(`    ${pc.red('✗')} ${rule}`);
    }
    if (drift.violations.new.length > 5) {
      console.log(pc.dim(`    ... and ${drift.violations.new.length - 5} more (see --json for the full list).`));
    }
    console.log('');
  }
  if (drift.topology.addedEdges.length > 0) {
    console.log(pc.bold(`  Added edges (${drift.topology.addedEdges.length}):`));
    for (const e of drift.topology.addedEdges.slice(0, 5)) {
      console.log(`    ${pc.green('+')} ${e.from} → ${e.to}`);
    }
    if (drift.topology.addedEdges.length > 5) {
      console.log(pc.dim(`    ... and ${drift.topology.addedEdges.length - 5} more (see --json for the full list).`));
    }
    console.log('');
  }
  if (drift.topology.removedEdges.length > 0) {
    console.log(pc.bold(`  Removed edges (${drift.topology.removedEdges.length}):`));
    for (const e of drift.topology.removedEdges.slice(0, 5)) {
      console.log(`    ${pc.dim('-')} ${e.from} → ${e.to}`);
    }
    if (drift.topology.removedEdges.length > 5) {
      console.log(pc.dim(`    ... and ${drift.topology.removedEdges.length - 5} more (see --json for the full list).`));
    }
    console.log('');
  }
  if (drift.signal.scoreDelta !== null && Math.abs(drift.signal.scoreDelta) > 0.005) {
    const direction = drift.signal.scoreDelta > 0 ? pc.green('+') : pc.red('');
    console.log(`  Score delta: ${direction}${drift.signal.scoreDelta.toFixed(3)}`);
  }
}

// ─── v1.1.0 v2 envelope helpers ────────────────────────────────

function buildAnalyzeV2EnvelopeInput(
  out: CliOutputOptions,
  v1: any,
  diagnostics: CliDiagnostic[],
  artifactPath: string,
  headlineKind: string,
  cwd: string,
  canonicalTopology: CanonicalTopology,
  drift: DriftResult | null,
  baseline: BaselineReadResult | null,
): V2RenderInput {
  const status = deriveStatusForExit(0, diagnostics, 0);
  const baseHeadline =
    headlineKind === 'no-policy'
      ? 'No policy configured — topology captured but not evaluated.'
      : headlineKind === 'low-signal'
        ? 'Low-signal topology — coverage too low for confident evaluation.'
        : `Stability ${v1.stabilityTier} (${(v1.score as number).toFixed(2)} / 1.00).`;
  const headline = drift ? `${baseHeadline}${buildDriftHeadlineSuffix(drift)}` : baseHeadline;
  const summary: any = buildSummary(
    headline,
    status,
    {
      score: v1.score,
      warnings: diagnostics.filter((d) => d.severity === 'WARNING').length,
      diagnostics: diagnostics.length,
    },
  );
  if (drift) {
    summary.drift = buildDriftSummaryMirror(drift);
  }

  const data: Record<string, unknown> = {
    stability: {
      score: v1.score,
      tier: v1.stabilityTier,
      headlineKind,
      policyConfigured: v1.policyConfigured,
    },
    topology: {
      coverage: v1.coverage,
      connectivity: v1.connectivity,
      topologyConfidence: v1.topologyConfidence,
      topologyConfidenceLabel: v1.topologyConfidenceLabel,
      extractionMode: v1.extractionMode,
      workspaceType: v1.workspaceType,
      authorityCrossings: v1.authorityCrossings,
      // v1.2.0 — canonical topology is emitted unconditionally.
      canonical: canonicalTopology,
    },
    domains: v1.domainDistribution,
    blastRadius: v1.blast_radius,
    components: v1.components,
    executionMetrics: v1.executionMetrics,
    warnings: v1.warnings,
  };
  if (drift && baseline) {
    data.drift = buildDriftJsonBlock(drift, {
      path: baselineDisplayPath(baseline, out.verbose),
      schemaVersion: baseline.envelope.schemaVersion,
      command: baseline.envelope.command,
      archEngineVersion: baseline.envelope.archEngineVersion,
      emittedAt: baseline.envelope.emittedAt,
      graphSurfaceHash: baseline.canonicalTopology.graphSurfaceHash,
    });
  }

  const artifacts: V2Artifact[] = [
    {
      kind: 'stability-score',
      relativePath: normalizeArtifactPath(cwd, artifactPath),
      ...(out.verbose ? { absolutePath: artifactPath } : {}),
    },
  ];

  const nextActions: string[] = [];
  if (!v1.policyConfigured) {
    nextActions.push(
      'Add `arch-policy.yml` to turn topology analysis into enforceable architecture checks.',
    );
  } else {
    nextActions.push('Run `arch-engine check` to apply your policy and get a CI verdict.');
  }

  return {
    command: 'analyze',
    exitCode: 0,
    status,
    summary,
    data,
    diagnostics,
    artifacts,
    nextActions,
    includeAbsolutePath: out.verbose,
  };
}

// ─── v1.2.0 baseline helpers ─────────────────────────────────

function extractBaselineSignals(baseline: BaselineReadResult): {
  score: number | null;
  coverage: number | null;
  connectivity: number | null;
  confidence: number | null;
  violationsCount: number | null;
} {
  const data = baseline.envelope.data;
  const stability = (data.stability ?? {}) as Record<string, unknown>;
  const topology = (data.topology ?? {}) as Record<string, unknown>;
  const violations = data.violations;
  return {
    score: typeof stability.score === 'number' ? (stability.score as number) : null,
    coverage: typeof topology.coverage === 'number' ? (topology.coverage as number) : null,
    connectivity: typeof topology.connectivity === 'number' ? (topology.connectivity as number) : null,
    confidence: typeof topology.topologyConfidence === 'number' ? (topology.topologyConfidence as number) : null,
    violationsCount: Array.isArray(violations) ? violations.length : null,
  };
}

function extractBaselineViolations(baseline: BaselineReadResult): ReadonlyArray<any> {
  const violations = baseline.envelope.data.violations;
  if (Array.isArray(violations)) return violations;
  return [];
}

function baselineDisplayPath(baseline: BaselineReadResult, verbose: boolean): string {
  if (verbose) return baseline.resolvedPath;
  // Privacy default: basename only, mirroring v1.1.0 path policy.
  const userPath = baseline.userPath;
  const lastSlash = Math.max(userPath.lastIndexOf('/'), userPath.lastIndexOf('\\'));
  if (lastSlash < 0) return userPath;
  return userPath.slice(lastSlash + 1);
}

function buildDriftHumanMessage(baseline: BaselineReadResult, drift: DriftResult): string {
  const parts: string[] = [];
  if (drift.summary.newViolations > 0)
    parts.push(`${drift.summary.newViolations} new violation${drift.summary.newViolations === 1 ? '' : 's'}`);
  if (drift.summary.resolvedViolations > 0)
    parts.push(`${drift.summary.resolvedViolations} resolved violation${drift.summary.resolvedViolations === 1 ? '' : 's'}`);
  if (drift.summary.addedEdges > 0)
    parts.push(`${drift.summary.addedEdges} added edge${drift.summary.addedEdges === 1 ? '' : 's'}`);
  if (drift.summary.removedEdges > 0)
    parts.push(`${drift.summary.removedEdges} removed edge${drift.summary.removedEdges === 1 ? '' : 's'}`);
  if (parts.length === 0) parts.push('topology hash changed');
  return `Compared against ${baselineDisplayPath(baseline, false)}: ${parts.join(', ')}.`;
}

function readPackageVersionSafe(): string {
  return readPackageVersion();
}
