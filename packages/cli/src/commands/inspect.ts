import pc from 'picocolors';
import { runMonorepoExtraction, classifyAuthorityDomain } from '@arch-engine/adapter-monorepo';
import { autoInitializeArchitectureContext } from '../auto-init.js';
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
    console.log(pc.bold(pc.cyan('arch-engine inspect')));
    console.log(pc.dim('Summarizing canonical topology...\n'));
  }

  const extraction = runMonorepoExtraction(cwd);
  const meta = extraction.metadata;

  // Domain distribution
  const domainPackages = Object.entries(extraction.routeServiceMap.forward).map(
    ([, entry]) => ({ authorityDomain: classifyAuthorityDomain(entry.backend_route) }),
  );
  const domainDist = countDomainDistribution(domainPackages);
  const domainIntegrity = checkDomainIntegrity(domainDist);

  const edgeCount = Object.values(extraction.edgesByAdapter).flat().length;
  const confidenceLabel = classifyConfidence(meta.topologyConfidence);

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
  for (const [domain, count] of Object.entries(data.domainDistribution)) {
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
}
