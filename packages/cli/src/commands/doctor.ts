import pc from 'picocolors';
import { discoverEnvironment } from '../autodiscovery.js';
import { loadMonorepoAdapter } from '../runner-bridge.js';
import { type RouteServiceEntry } from '@arch-engine/core';
import { autoInitializeArchitectureContext } from '../auto-init.js';
import { detectPolicyFile } from '../policy-presence.js';
import { buildDiagnostic, diagnosticToJson, type CliDiagnostic } from '../format-error.js';
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

  const adapter = await loadMonorepoAdapter();
  const discovery = discoverEnvironment(cwd);
  const extraction = adapter.runMonorepoExtraction(cwd);
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
  const activeDomains = Object.entries(domainDist as Record<string, number>).filter(([domain, c]: [string, number]) => c > 0);
  if (activeDomains.length > 0) {
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
  if (policyPresence.configured) {
    console.log(`\n${pc.green('✔')} Policy file detected: ${pc.bold(policyPresence.path!)}`);
  } else {
    console.log(`\n${pc.dim('No policy file is configured yet.')}`);
    console.log(pc.dim('  Topology extraction completed successfully.'));
  }

  // Warnings
  if (meta.warnings.length > 0) {
    console.log(`\n${formatWarningHeader(meta.warnings.length)}`);
    for (const line of formatWarnings(meta.warnings)) {
      console.log(line);
    }
  }

  // Single final next-action line.
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
