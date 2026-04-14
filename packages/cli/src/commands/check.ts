import pc from 'picocolors';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { discoverEnvironment } from '../autodiscovery.js';
import { executeRunnerBridge } from '../runner-bridge.js';
import { autoInitializeArchitectureContext } from '../auto-init.js';
import { classifyStability, classifyConfidence, confidenceDescription, checkQualityFloor, formatWarnings, formatWarningHeader } from '../renderers.js';
import { createStabilityArtifact, writeStabilityArtifact } from '../snapshot.js';
import { loadPolicyConfig, evaluatePolicy, type EvaluatorEdge } from '@arch-engine/core';

export async function checkCommand(options: any) {
  const cwd = process.cwd();

  // Auto-init silently
  autoInitializeArchitectureContext(cwd);

  if (!options.json) {
    console.log(pc.bold(pc.cyan('arch-engine check')));
    console.log(pc.dim('Executing policy pipeline...\n'));
  }

  const discovery = discoverEnvironment(cwd);

  if (discovery.isFallback && !options.json) {
    console.log(pc.dim(`No arch-engine.yml found. Using workspace autodetection mode (${discovery.detectedType}).`));
  }

  // Extraction + Pipeline
  let bridge;
  try {
    bridge = await executeRunnerBridge(cwd, discovery);
  } catch (error) {
    if (!options.json) {
      console.error(pc.red(`✖ Topology extraction failed: ${(error as Error).message}`));
    }
    process.exit(3);
  }

  const { engineResult, extractionMetadata: meta, executionMetrics, adjacencyMap } = bridge;
  const score = engineResult.stabilityIndex.topology_reliability_score;
  const stability = classifyStability(score);
  const confidenceLabel = classifyConfidence(meta.topologyConfidence);
  const crossingCount = engineResult.stabilityIndex.authority_crossings.total_crossings;

  // Global policy detected computation
  const policyCfgPath = `${cwd}/.archengine/policy.yml`;
  const policyExists = fs.existsSync(policyCfgPath);

  // Policy Evaluation
  const policyDoc = loadPolicyConfig(cwd);
  let policyEval = null;

  if (policyDoc) {
    const edges: EvaluatorEdge[] = [];
    for (const [src, targets] of Object.entries(adjacencyMap)) {
      for (const t of targets) edges.push({ source: src, target: t });
    }
    policyEval = evaluatePolicy(edges, policyDoc.config, confidenceLabel, policyDoc.hash);
  }

  // Always emit stability artifact with full telemetry
  const artifact = createStabilityArtifact(cwd, meta, score, crossingCount, executionMetrics);
  if (policyEval) {
    (artifact as any).policyEvaluation = {
      violations: policyEval.violations.length,
      mode: policyEval.policyMode,
      version: policyEval.policyVersion,
      policyHash: policyEval.policyHash,
      effectivePolicyHash: policyEval.effectivePolicyHash || policyEval.policyHash,
      policyStackIds: policyEval.policyStackIds || ['local'],
      policyStackHashes: policyEval.policyStackHashes || (policyEval.policyHash ? [policyEval.policyHash] : []),
      stackOrderingChecksum: crypto.createHash('sha256').update((policyEval.policyNamespace || 'local') + ':' + (policyEval.policyStackIds || ['local']).join('|')).digest('hex'),
      stackExpansionDeterminismSeed: crypto.createHash('sha256').update((policyEval.policyNamespace || 'local') + ':' + (policyEval.policyHash || '')).digest('hex'),
      stackExpansionTopologyVersion: 'v1',
      policyGovernanceContractVersion: 'v1',
      policyTransportContractVersion: 'v1',
      policyRegistryContractVersion: 'v1',
      policyManifestSchemaVersion: 'v1',
      policyDetected: policyEval.policyDetected,
      evaluationStrategyVersion: policyEval.evaluationStrategyVersion,
      policyRuleHits: policyEval.policyRuleHits
    };
  } else {
    // Artifact requires policyDetected for stateless offline federation
    (artifact as any).policyEvaluation = {
      violations: 0,
      policyDetected: policyExists
    };
  }

  const artifactPath = writeStabilityArtifact(cwd, artifact);

  // Coverage gating
  const minCoverage = options.minCoverage ? parseFloat(options.minCoverage) : 0;

  if (!options.json) {
    // Workspace detection transparency
    console.log(`  Workspace:            ${pc.bold(meta.workspaceType)} (${meta.extractionMode})`);
    console.log(`  Confidence:           ${pc.bold(confidenceDescription(meta))}`);
    console.log(`  Stability Score:      ${stability.color(pc.bold(`${stability.tier} (${score.toFixed(2)})`))}`)
    console.log(`  Coverage:             ${pc.bold((meta.coverage * 100).toFixed(0))}%`);
    console.log(`  Connectivity:         ${pc.bold((meta.connectivity * 100).toFixed(0))}%`);
    console.log(`  Authority cross.:     ${pc.bold(crossingCount)} observed`);
    if (policyEval) {
      console.log(`  Policy Evaluation:    ${policyEval.violations.length > 0 ? pc.red(`${policyEval.violations.length} violations`) : pc.green('Pass')} (${policyEval.policyMode} mode)`);
    }

    // Quality floor
    const floor = checkQualityFloor(meta);
    if (floor.belowFloor) {
      console.log(`\n${pc.yellow('⚠')} ${pc.yellow(floor.message!)}`);
    }

    // Warnings
    if (meta.warnings.length > 0) {
      console.log(`\n${formatWarningHeader(meta.warnings.length)}`);
      for (const line of formatWarnings(meta.warnings)) {
        console.log(line);
      }
    }
  } else {
    console.log(JSON.stringify({
      score,
      classification: stability.tier,
      stabilityTier: stability.tier,
      topologyConfidenceLabel: confidenceLabel,
      coverage: meta.coverage,
      connectivity: meta.connectivity,
      extractionMode: meta.extractionMode,
      topologyConfidence: meta.topologyConfidence,
      authorityCrossings: crossingCount,
      blockerCrossings: engineResult.stabilityIndex.authority_crossings.blocker_crossings,
      warnings: meta.warnings,
      executionMetrics,
      artifactPath,
    }, null, 2));
  }

  // Exit code 3: Coverage threshold not met
  if (minCoverage > 0 && meta.coverage < minCoverage) {
    if (!options.json) {
      console.error(pc.red(`\n✖ Topology coverage (${meta.coverage.toFixed(2)}) is below the required threshold of ${minCoverage}.`));
    }
    process.exit(3);
  }

  // Exit code 5: Policy violations in ENFORCE mode
  if (policyEval && policyEval.violations.length > 0) {
    if (!options.json) {
      const modeStr = policyEval.policyMode === 'enforce' ? pc.red('(ENFORCE)') : pc.yellow('(ADVISORY)');
      console.log(`\n${pc.red('⚠')} Detected ${policyEval.violations.length} Policy violation(s) ${modeStr}.`);
      for (const v of policyEval.violations.slice(0, 5)) {
        console.log(`  ${v.from} → ${v.to} [${v.violationCategory}]`);
      }
    }
    if (policyEval.policyMode === 'enforce') {
      process.exit(5);
    }
  }

  // Exit code 2: BLOCKER policy violations
  const blockerCount = engineResult.stabilityIndex.authority_crossings.blocker_crossings;
  if (blockerCount > 0) {
    if (!options.json) {
      console.error(pc.red(`\n✖ Detected ${blockerCount} internal BLOCKER violation(s).`));
      const blockers = engineResult.stabilityIndex.authority_crossings.entries
        .filter(c => c.recommended_severity === 'BLOCKER');
      for (const b of blockers.slice(0, 5)) {
        console.error(pc.red(`  ${b.source_entity} → ${b.target_entity} [${b.authority_domain}]`));
      }
    }
    process.exit(2);
  }

  if (!options.json) {
    console.log(pc.green(`\n✔ Verification complete. No blocking violations.`));
    console.log(pc.dim(`Artifact: ${artifactPath}`));
    console.log(pc.dim(`Extraction: ${executionMetrics.extractionMs}ms | Pipeline: ${executionMetrics.pipelineMs}ms | Total: ${executionMetrics.totalMs}ms`));
  }
  process.exit(0);
}
