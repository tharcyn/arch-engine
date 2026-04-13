import pc from 'picocolors';
import { discoverEnvironment } from '../autodiscovery.js';
import { runMonorepoExtraction, classifyAuthorityDomain } from '@arch-engine/adapter-monorepo';
import { autoInitializeArchitectureContext } from '../auto-init.js';
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

export async function doctorCommand(options: any) {
  const cwd = process.cwd();

  // Auto-init on first run
  const initResult = autoInitializeArchitectureContext(cwd);

  if (!options.json) {
    console.log(pc.bold(pc.cyan('arch-engine doctor')));
    console.log(pc.dim('Diagnosing environment readiness...\n'));

    if (initResult.initialized) {
      console.log(`${pc.green('✔')} ${initResult.message}`);
      if (initResult.filesCreated.length > 0) {
        console.log(pc.dim(`  Created: ${initResult.filesCreated.join(', ')}\n`));
      }
    }
  }

  const discovery = discoverEnvironment(cwd);
  const extraction = runMonorepoExtraction(cwd);
  const meta = extraction.metadata;

  // Domain distribution
  const domainPackages = Object.entries(extraction.routeServiceMap.forward).map(
    ([, entry]) => ({ authorityDomain: classifyAuthorityDomain(entry.backend_route) }),
  );
  const domainDist = countDomainDistribution(domainPackages);
  const domainIntegrity = checkDomainIntegrity(domainDist);
  const stability = classifyStability(meta.topologyConfidence); // Approximate from confidence for doctor (no engine run)

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
    hasPolicyFile: false,
  };

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Workspace detection transparency
  if (meta.extractionMode === 'structured') {
    console.log(`${pc.green('✔')} Workspace type resolved as: ${pc.bold(meta.workspaceType)} (highest confidence)`);
  } else {
    console.log(`${pc.yellow('⚠')} Workspace: ${pc.bold('fallback directory scan')} (degraded extraction mode)`);
  }

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
  const activeDomains = Object.entries(domainDist).filter(([, c]) => c > 0);
  if (activeDomains.length > 0) {
    console.log(`\n${pc.bold('Domain Distribution:')}`);
    for (const [domain, count] of activeDomains) {
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

  // Policy file
  console.log(`\n${pc.yellow('⚠')} No policy file detected (arch-policy.yml)`);

  // Warnings
  if (meta.warnings.length > 0) {
    console.log(`\n${formatWarningHeader(meta.warnings.length)}`);
    for (const line of formatWarnings(meta.warnings)) {
      console.log(line);
    }
  }
}
