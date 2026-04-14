/**
 * ═══════════════════════════════════════════════════════════
 *  arch-engine/check-boundaries@v1 — GitHub Action Entrypoint
 * ═══════════════════════════════════════════════════════════
 *
 *  Week 5: Enterprise-grade architecture governance surface.
 *
 *  Orchestrates:
 *  1. Configuration resolution (preset + overrides)
 *  2. Topology extraction + engine pipeline
 *  3. Regression detection vs baseline
 *  4. Badge artifact generation
 *  5. PR annotation emission
 *  6. Summary rendering
 *  7. Artifact persistence
 *  8. Exit code mapping
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import * as crypto from 'node:crypto';

import { resolveConfig, getPresetDescription } from './configProfiles.js';
import { detectRegressions, type RegressionResult } from './regressionDetector.js';
import { mapAnnotations, emitAnnotations, type CrossingEntry } from './annotationMapper.js';
import { writeBadges } from './badgeRenderer.js';
import { renderSummary, type SummaryInput } from './summaryRenderer.js';
import { loadPolicyConfig, evaluatePolicy, type EvaluatorEdge } from '@arch-engine/core';

// ─── GitHub Actions Helpers ─────────────────────────────

function getInput(name: string): string {
  return process.env[`INPUT_${name.replace(/-/g, '_').toUpperCase()}`] ?? '';
}

function setOutput(name: string, value: string): void {
  const outputFile = process.env['GITHUB_OUTPUT'];
  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`);
  }
}

function setSummary(markdown: string): void {
  const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
  if (summaryFile) {
    fs.appendFileSync(summaryFile, markdown);
  }
}

function logError(message: string): void {
  console.log(`::error::${message}`);
}

// ─── Classification ─────────────────────────────────────

type StabilityTier = 'STABLE' | 'HEALTHY' | 'WARNING' | 'CRITICAL';
type ConfidenceLabel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';

function classifyTier(score: number): StabilityTier {
  if (score >= 0.90) return 'STABLE';
  if (score >= 0.75) return 'HEALTHY';
  if (score >= 0.50) return 'WARNING';
  return 'CRITICAL';
}

function classifyConfidence(c: number): ConfidenceLabel {
  if (c >= 0.85) return 'HIGH';
  if (c >= 0.65) return 'MODERATE';
  if (c >= 0.40) return 'LOW';
  return 'VERY_LOW';
}

function classifyDomain(relativePath: string): string {
  const top = relativePath.replace(/\\/g, '/').split('/')[0]?.toLowerCase() ?? '';
  switch (top) {
    case 'apps': case 'app': return 'APPLICATION';
    case 'services': case 'service': return 'SERVICE';
    case 'packages': case 'package': return 'LIBRARY';
    case 'libs': case 'lib': return 'FOUNDATION';
    case 'infra': case 'tools': case 'scripts': case 'config': return 'INFRASTRUCTURE';
    default: return 'UNCLASSIFIED';
  }
}

function computeRepoHash(cwd: string): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim() || 'unknown';
  } catch {
    return path.basename(cwd);
  }
}

// ─── Main ───────────────────────────────────────────────

async function run(): Promise<void> {
  try {
    const totalStart = Date.now();
    const cwd = process.env['GITHUB_WORKSPACE'] ?? process.cwd();
    const generateBadges = getInput('generate-badges') !== 'false';

    // 1. Resolve config from preset + overrides
    const config = resolveConfig({
      mode: getInput('mode') || 'adoption',
      minCoverage: getInput('min-coverage') || undefined,
      failOnWarnings: getInput('fail-on-warnings') || undefined,
      failOnFallbackMode: getInput('fail-on-fallback-mode') || undefined,
      failOnRegression: getInput('fail-on-regression') || undefined,
    });

    const presetName = getInput('mode') || 'adoption';
    console.log(`::notice::${getPresetDescription(presetName)}`);

    // 2. Import adapter + engine
    const { runMonorepoExtraction, classifyAuthorityDomain } = await import('@arch-engine/adapter-monorepo');
    const { EngineRunner, parseEngineManifest } = await import('@arch-engine/core');

    // 3. Detect regressions BEFORE overwriting baseline
    const extractionStart = Date.now();
    const extraction = runMonorepoExtraction(cwd);
    const extractionMs = Date.now() - extractionStart;
    const meta = extraction.metadata;

    // 4. Run engine pipeline
    const manifest = parseEngineManifest({
      engine_id: 'arch-engine-action',
      engine_version: '4.0.0',
      schema_versions: {
        capability_schema: '1.0.0', topology_schema: '1.0.0',
        entity_identity_schema: '1.0.0', reasoning_protocol: '1.0.0',
        adapter_contract: '1.0.0', mutation_model: '1.0.0',
        authority_model: '1.0.0', confidence_model: '1.0.0',
      },
      supported_adapter_contract_versions: ['1.0.0'],
      minimum_adapter_contract_version: '1.0.0',
      models: {
        mutation_hierarchy: 'canonical-v1',
        authority_scoring: 'trust-weighted-v1',
        confidence_propagation: 'minimum-path-v1',
      },
    });

    const runner = new EngineRunner(manifest, { logger: () => {} });
    const pipelineStart = Date.now();
    const engineResult = await runner.executePipeline({
      adjacencyMap: extraction.adjacencyMap,
      routeServiceMap: extraction.routeServiceMap,
      crossings: extraction.authorityCrossings,
      edgesByAdapter: extraction.edgesByAdapter,
    });
    const pipelineMs = Date.now() - pipelineStart;
    const totalMs = Date.now() - totalStart;

    const score = engineResult.stabilityIndex.topology_reliability_score;
    const tier = classifyTier(score);
    const confLabel = classifyConfidence(meta.topologyConfidence);
    const crossingCount = engineResult.stabilityIndex.authority_crossings.total_crossings;
    const blockerCount = engineResult.stabilityIndex.authority_crossings.blocker_crossings;

    // 5. Domain distribution (compute before regression to enable unclassifiedRatio)
    const domainDistribution: Record<string, number> = {
      APPLICATION: 0, SERVICE: 0, LIBRARY: 0,
      FOUNDATION: 0, INFRASTRUCTURE: 0, UNCLASSIFIED: 0,
    };
    for (const entry of Object.values(extraction.routeServiceMap.forward)) {
      const domain = classifyDomain(entry.backend_route);
      domainDistribution[domain] = (domainDistribution[domain] ?? 0) + 1;
    }
    const domainTotal = Object.values(domainDistribution).reduce((a, b) => a + b, 0);
    const unclassifiedRatio = domainTotal > 0 ? (domainDistribution['UNCLASSIFIED'] ?? 0) / domainTotal : 0;

    // 6. Regression detection (with severity + confidence classification)
    const regression = detectRegressions(cwd, {
      coverage: meta.coverage,
      connectivity: meta.connectivity,
      stabilityScore: score,
      stabilityTier: tier,
      topologyConfidence: meta.topologyConfidence,
      topologyConfidenceLabel: confLabel,
      detectedNodes: meta.detectedNodes,
      connectedNodes: meta.connectedNodes,
      authorityCrossings: crossingCount,
      extractionMode: meta.extractionMode,
      minCoverage: config.minCoverage,
      unclassifiedRatio,
      warnings: [...meta.warnings],
    });

    // Global policy detected computation
    const policyCfgPath = `${cwd}/.archengine/policy.yml`;
    const policyExists = fs.existsSync(policyCfgPath);

    // Policy Evaluation
    const policyDoc = loadPolicyConfig(cwd);
    let policyEval = null;

    if (policyDoc) {
      const edges: EvaluatorEdge[] = [];
      for (const [src, targets] of Object.entries(extraction.adjacencyMap)) {
        for (const t of targets) edges.push({ source: src, target: t });
      }
      policyEval = evaluatePolicy(edges, policyDoc.config, confLabel, policyDoc.hash);
    }

    // 7. Set action outputs
    setOutput('stability-score', score.toFixed(4));
    setOutput('coverage', meta.coverage.toFixed(4));
    setOutput('connectivity', meta.connectivity.toFixed(4));
    setOutput('classification', tier);
    setOutput('regressed', String(regression.regressed));

    // 8. Write stability artifact (AFTER regression check reads old baseline)
    const artifactDir = path.join(cwd, '.arch-engine');
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    const artifactPayload = {
      snapshotVersion: '1.0',
      schemaVersion: '1.0.0',
      artifactCompatibilityVersion: '1.0',
      engineVersion: '4.0.0',
      timestamp: new Date().toISOString(),
      repoHash: computeRepoHash(cwd),

      workspaceType: meta.workspaceType,
      extractionMode: meta.extractionMode,

      coverage: Number(meta.coverage.toFixed(4)),
      connectivity: Number(meta.connectivity.toFixed(4)),
      topologyConfidence: Number(meta.topologyConfidence.toFixed(4)),
      stabilityScore: Number(score.toFixed(4)),

      stabilityTier: tier,
      topologyConfidenceLabel: confLabel,

      detectedNodes: meta.detectedNodes,
      connectedNodes: meta.connectedNodes,
      expectedNodes: meta.expectedNodes,

      authorityCrossings: crossingCount,
      warnings: [...meta.warnings].sort(),

      regressionSeverity: regression.severity,
      regressionConfidence: regression.regressionConfidence,
      regressionConfidenceSource: regression.regressionConfidenceSource,

      regression: {
        detected: regression.regressed,
        severity: regression.severity,
        confidence: regression.regressionConfidence,
        confidenceSource: regression.regressionConfidenceSource,
        baselineFound: regression.baselineFound,
        summary: regression.summary,
      },

      regressionDelta: regression.numericDeltas ?? undefined,

      trendIndicators: regression.trendIndicators ?? undefined,

      comparisonBaseline: regression.comparisonBaseline ?? undefined,

      executionMetrics: {
        extractionMs: Math.round(extractionMs),
        pipelineMs: Math.round(pipelineMs),
        totalMs: Math.round(totalMs),
      },
      
      policyEvaluation: policyEval ? {
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
        evaluationStrategyVersion: policyEval.evaluationStrategyVersion,
        policyDetected: policyEval.policyDetected,
        policyRuleHits: policyEval.policyRuleHits
      } : {
        violations: 0,
        policyDetected: policyExists
      },
    };

    fs.writeFileSync(
      path.join(artifactDir, 'stability-score.json'),
      JSON.stringify(artifactPayload, null, 2),
      'utf-8',
    );

    // 9. Generate badges
    if (generateBadges) {
      writeBadges(cwd, tier, score, confLabel, meta.topologyConfidence, meta.coverage);
    }

    // 10. Map and emit annotations
    const crossingEntries: CrossingEntry[] = engineResult.stabilityIndex.authority_crossings.entries.map(e => ({
      source_entity: e.source_entity,
      target_entity: e.target_entity,
      authority_domain: e.authority_domain,
    }));

    const annotations = mapAnnotations({
      meta,
      stabilityTier: tier,
      stabilityScore: score,
      crossings: crossingEntries,
      crossingCount,
      blockerCount,
      domainDistribution,
      regression,
      config,
      policyEval, // Pass policy eval object
      policyExists, // Pass to summary template
      executionMetrics: { extractionMs, pipelineMs, totalMs },
    });

    emitAnnotations(annotations);

    // 11. Render PR summary
    const summaryInput: SummaryInput = {
      tier,
      score,
      confLabel,
      workspaceType: meta.workspaceType,
      extractionMode: meta.extractionMode,
      coverage: meta.coverage,
      connectivity: meta.connectivity,
      topologyConfidence: meta.topologyConfidence,
      detectedNodes: meta.detectedNodes,
      expectedNodes: meta.expectedNodes,
      connectedNodes: meta.connectedNodes,
      crossingCount,
      crossings: crossingEntries,
      domainDistribution,
      warnings: meta.warnings,
      components: engineResult.stabilityIndex.components,
      policyEval, // pass generic object
      policyExists, // pass to summary block mapping
      executionMetrics: { extractionMs, pipelineMs, totalMs },
      regression,
    };

    const summary = renderSummary(summaryInput);
    setSummary(summary);
    console.log(summary);

    // 12. Exit code gating
    let exitCode = 0;

    if (config.failOnFallbackMode && meta.extractionMode === 'fallback_directory_scan') {
      logError('Workspace detection fell back to directory scan mode.');
      exitCode = 4;
    }

    if (config.failOnWarnings && meta.warnings.length > 0) {
      logError(`${meta.warnings.length} extraction warning(s) detected.`);
      exitCode = exitCode || 2;
    }

    if (config.minCoverage > 0 && meta.coverage < config.minCoverage) {
      logError(`Coverage (${meta.coverage.toFixed(2)}) is below threshold (${config.minCoverage}).`);
      exitCode = exitCode || 3;
    }

    if (policyEval && policyEval.violations.length > 0 && policyEval.policyMode === 'enforce') {
      logError(`${policyEval.violations.length} policy violation(s) detected.`);
      exitCode = exitCode || 5;
    }

    if (blockerCount > 0) {
      logError(`${blockerCount} BLOCKER violation(s) detected.`);
      exitCode = exitCode || 2;
    }

    if (config.failOnRegression && regression.regressed) {
      logError(`Architecture regression detected: ${regression.summary}`);
      exitCode = exitCode || 2;
    }

    process.exit(exitCode);
  } catch (error) {
    logError(`Action failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

run();
