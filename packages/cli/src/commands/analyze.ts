import pc from 'picocolors';
import Table from 'cli-table3';
import { discoverEnvironment } from '../autodiscovery.js';
import { executeRunnerBridge, loadMonorepoAdapter } from '../runner-bridge.js';
import { type RouteServiceEntry } from '@arch-engine/core';
import { autoInitializeArchitectureContext } from '../auto-init.js';
import { detectPolicyFile } from '../policy-presence.js';
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

export async function analyzeCommand(options: any) {
  const cwd = process.cwd();

  // Auto-init silently
  autoInitializeArchitectureContext(cwd);

  if (!options.json) {
    console.log(pc.bold(pc.cyan('\n  Architecture Stability Report\n')));
  }

  const discovery = discoverEnvironment(cwd);
  const bridge = await executeRunnerBridge(cwd, discovery);

  const { engineResult, extractionMetadata: meta, executionMetrics } = bridge;
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

  if (options.json) {
    // Backward-compatible JSON shape: existing keys preserved verbatim.
    // Two additive fields: `policyConfigured` and `headlineKind` so that
    // machine consumers can distinguish a no-policy / low-signal run from a
    // genuine "CRITICAL" classification.
    console.log(JSON.stringify({
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
    }, null, 2));
    return;
  }

  // ── Headline ────────────────────────────────────────────
  // Calibrated to policy presence and signal quality. We DO NOT print
  // "Stability Score: CRITICAL" on a no-policy or low-signal fixture.
  console.log(`\n  ${headline.color(pc.bold(headline.text))}`);

  // ── Header ──────────────────────────────────────────────
  console.log(`\n  Workspace Type:       ${pc.bold(meta.workspaceType)}`);
  console.log(`  Extraction Mode:      ${pc.bold(meta.extractionMode)}`);
  console.log(`  Topology Confidence:  ${pc.bold(confidenceDescription(meta))}`);

  // ── Core Metrics ────────────────────────────────────────
  console.log(`\n  Coverage:             ${pc.bold((meta.coverage * 100).toFixed(0))}%`);
  console.log(`  Connectivity:         ${pc.bold((meta.connectivity * 100).toFixed(0))}%`);
  // Numeric score is shown only when the headline grades it. For
  // no-policy / low-signal runs the raw score is misleading.
  if (headline.kind === 'tier') {
    console.log(`  Stability Score:      ${stability.color(pc.bold(`${stability.tier} (${score.toFixed(2)})`))}`)
  }

  // ── Quality Floor ───────────────────────────────────────
  const floor = checkQualityFloor(meta);
  if (floor.belowFloor) {
    console.log(`\n  ${pc.yellow('⚠')} ${pc.yellow(floor.message!)}`);
  }

  // ── Authority Domain Distribution ───────────────────────
  const activeDomains = Object.entries(domainDist as Record<string, number>).filter(([domain, c]: [string, number]) => c > 0);
  if (activeDomains.length > 0) {
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
  if (crossingEntries.length > 0) {
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
  if (brEntries.length > 0) {
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
  if (meta.warnings.length > 0) {
    console.log(`\n  ${formatWarningHeader(meta.warnings.length)}`);
    for (const line of formatWarnings(meta.warnings)) {
      console.log(`  ${line}`);
    }
  }

  // ── Footer ──────────────────────────────────────────────
  console.log(pc.dim(`\n  Artifact written to ${artifactPath}`));
  console.log(pc.dim(`  Extraction: ${executionMetrics.extractionMs}ms | Pipeline: ${executionMetrics.pipelineMs}ms | Total: ${executionMetrics.totalMs}ms`));

  // ── Single final next-action line ──────────────────────
  console.log('');
  if (!policyPresence.configured) {
    console.log('Next: add `arch-policy.yml` to turn topology analysis into enforceable architecture checks.');
  } else {
    console.log('Next: run `arch-engine check` to apply your policy and get a CI verdict.');
  }
}
