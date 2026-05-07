import pc from 'picocolors';
import { loadMonorepoAdapter } from '../runner-bridge.js';
import { type RouteServiceEntry } from '@arch-engine/core';
import { autoInitializeArchitectureContext } from '../auto-init.js';
import { detectPolicyFile } from '../policy-presence.js';
import { buildDiagnostic, diagnosticToJson, type CliDiagnostic } from '../format-error.js';
import {
  classifyConfidence,
  confidenceDescription,
  countDomainDistribution,
  checkDomainIntegrity,
  checkQualityFloor,
  formatWarnings,
  formatWarningHeader,
} from '../renderers.js';

export async function inspectCommand(options: any) {
  const cwd = process.cwd();

  // Auto-init silently
  autoInitializeArchitectureContext(cwd);

  if (!options.json) {
    // No literal command echo — see CLI Experience Specification §4 P12.
    console.log(pc.dim('Summarizing canonical topology...\n'));
  }

  const adapter = await loadMonorepoAdapter();
  const extraction = adapter.runMonorepoExtraction(cwd);
  const meta = extraction.metadata;

  // Domain distribution
  const domainPackages = Object.entries(extraction.routeServiceMap.forward as Record<string, RouteServiceEntry>).map(
    ([route, entry]: [string, RouteServiceEntry]) => ({ authorityDomain: adapter.classifyAuthorityDomain(entry.backend_route) }),
  );
  const domainDist = countDomainDistribution(domainPackages);
  const domainIntegrity = checkDomainIntegrity(domainDist);

  const edgeCount = Object.values(extraction.edgesByAdapter).flat().length;
  const confidenceLabel = classifyConfidence(meta.topologyConfidence);

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

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`Nodes detected:       ${pc.bold(data.nodes)}`);
  console.log(`Edges:                ${pc.bold(data.edges)}`);
  console.log(`Crossings observed:   ${pc.bold(data.crossings)}`);
  console.log(`Coverage:             ${pc.bold((data.coverage * 100).toFixed(0))}%`);
  console.log(`Connectivity:         ${pc.bold((data.connectivity * 100).toFixed(0))}%`);
  console.log(`Confidence:           ${pc.bold(data.confidenceDescription)}`);
  console.log(`Extraction mode:      ${pc.bold(data.extractionMode)}`);
  console.log(`Workspace type:       ${pc.bold(data.workspaceType)}`);

  // Domain Distribution
  console.log(`\n${pc.bold('Domain Distribution:')}`);
  for (const [domain, count] of Object.entries(data.domainDistribution as Record<string, number>)) {
    if (count > 0) {
      const icon = domain === 'UNCLASSIFIED' ? pc.yellow('●') : pc.green('●');
      console.log(`  ${icon} ${domain}: ${pc.bold(count)}`);
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
  if (data.warnings.length > 0) {
    console.log(`\n${formatWarningHeader(data.warnings.length)}`);
    for (const line of formatWarnings(data.warnings)) {
      console.log(line);
    }
  }

  // Adapters
  console.log(`\n${pc.bold('Adapters active:')}`);
  for (const adapter of data.adaptersActive) {
    console.log(`  ${pc.green('●')} ${adapter}`);
  }

  // Single final next-action line.
  const policyPresence = detectPolicyFile(cwd);
  console.log('');
  if (!policyPresence.configured) {
    console.log('Next: run `arch-engine analyze` to score architecture signal, or add `arch-policy.yml` and run `arch-engine check`.');
  } else {
    console.log('Next: run `arch-engine check` to evaluate your policy against this topology.');
  }
}
