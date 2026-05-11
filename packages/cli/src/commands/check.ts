import pc from 'picocolors';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { discoverEnvironment } from '../autodiscovery.js';
import { executeRunnerBridge } from '../runner-bridge.js';
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
  classifyStability,
  classifyConfidence,
  confidenceDescription,
  checkQualityFloor,
  deriveAnalysisHeadline,
  formatWarnings,
  formatWarningHeader,
} from '../renderers.js';
import { createStabilityArtifact, writeStabilityArtifact } from '../snapshot.js';
import { loadPolicyConfig, evaluatePolicy, type EvaluatorEdge, type RankedAuthorityCrossing, type PolicyViolation } from '@arch-engine/core';
import { liftToComposedPolicy } from '../policy-lift.js';
import {
  buildSummary,
  deriveStatusForExit,
  normalizeArtifactPath,
  renderCliJsonV2,
  type V2Artifact,
  type V2ExitCode,
  type V2RenderInput,
  type V2Status,
} from '../render-v2.js';
import { renderCliMarkdown } from '../render-markdown.js';
import { emitFormattedOutput } from '../output-writer.js';
import type { CliOutputOptions } from '../cli-options.js';

export async function checkCommand(options: any) {
  const cwd = process.cwd();
  const out: CliOutputOptions = options.outputOptions;

  // Auto-init silently
  autoInitializeArchitectureContext(cwd);

  if (out.format === 'human' && !out.quiet && !out.json) {
    // No literal command echo — see CLI Experience Specification §4 P12.
    console.log(pc.dim('Executing policy pipeline...\n'));
  }

  const discovery = discoverEnvironment(cwd);

  if (discovery.isFallback && out.format === 'human' && !out.quiet) {
    console.log(pc.dim(`No arch-engine.yml found. Using workspace autodetection mode (${discovery.detectedType}).`));
  }

  // Extraction + Pipeline
  let bridge;
  try {
    bridge = await executeRunnerBridge(cwd, discovery);
  } catch (error) {
    const diagnostic = buildDiagnostic({
      code: 'ARCH_ENGINE_ADAPTER_NOT_FOUND',
      title: 'Topology extraction failed.',
      message:
        `The workspace adapter could not extract topology for this repo. ` +
        `Underlying error: ${(error as Error).message}`,
      fix:
        'Run `arch-engine doctor` to inspect adapter detection. If `@arch-engine/adapter-monorepo` ' +
        'is not installed, install it with `npm install --save-dev @arch-engine/adapter-monorepo`.',
    });
    if (out.format === 'json') {
      emitDiagnosticJson(diagnostic);
    } else {
      emitDiagnosticHuman(diagnostic, error);
    }
    process.exit(3);
  }

  const { engineResult, extractionMetadata: meta, executionMetrics, adjacencyMap } = bridge;
  const score = engineResult.stabilityIndex.topology_reliability_score;
  const stability = classifyStability(score);
  const confidenceLabel = classifyConfidence(meta.topologyConfidence);
  const crossingCount = engineResult.stabilityIndex.authority_crossings.total_crossings;

  // Single source of truth for policy presence
  const policyPresence = detectPolicyFile(cwd);
  const policyExists = policyPresence.configured;
  const headline = deriveAnalysisHeadline({ score, meta, policyConfigured: policyExists });

  // Policy Evaluation
  const policyDoc = loadPolicyConfig(cwd);
  let policyEval = null;

  if (policyDoc) {
    const edges: EvaluatorEdge[] = [];
    for (const [src, targets] of Object.entries(adjacencyMap)) {
      for (const t of targets) edges.push({ source: src, target: t });
    }
    const composedPolicy = liftToComposedPolicy(policyDoc.config, policyDoc.hash);
    policyEval = evaluatePolicy(edges, composedPolicy, confidenceLabel, policyDoc.hash);
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
    (artifact as any).policyEvaluation = {
      violations: 0,
      policyDetected: policyExists
    };
  }

  const artifactPath = writeStabilityArtifact(cwd, artifact);

  // Coverage gating
  const minCoverage = options.minCoverage ? parseFloat(options.minCoverage) : 0;
  const coverageBelowMin = minCoverage > 0 && meta.coverage < minCoverage;

  // Compute violations + diagnostics in advance (used by every output mode)
  const violationsJson = buildViolationsJson(policyEval);
  const isEnforcing = !!policyEval && policyEval.policyMode === 'enforce';
  const blockerCount = engineResult.stabilityIndex.authority_crossings.blocker_crossings;
  const diagnostics: CliDiagnostic[] = [];
  if (!policyExists) {
    diagnostics.push(
      buildDiagnostic({
        code: 'ARCH_ENGINE_POLICY_NOT_FOUND',
        message:
          'No policy file is configured yet — nothing was enforced. ' +
          'Run with a policy file at .archengine/policy.yml to evaluate architecture rules.',
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
  if (violationsJson.length > 0 && isEnforcing) {
    diagnostics.push(
      buildDiagnostic({
        code: 'ARCH_ENGINE_BLOCKING_VIOLATION',
        title: `Blocked: ${violationsJson.length} architecture violation${violationsJson.length === 1 ? '' : 's'}.`,
        message:
          `Detected ${violationsJson.length} blocking architecture ` +
          `violation${violationsJson.length === 1 ? '' : 's'} in enforce mode. ` +
          'Each violation appears in the `violations[]` array below.',
        details: { count: violationsJson.length },
      }),
    );
  }

  // Determine final exit code (used by both v2 envelope and exit semantics)
  const blocking = (isEnforcing && violationsJson.length > 0) || blockerCount > 0;
  const finalExit: V2ExitCode = coverageBelowMin ? 3 : blocking ? 1 : 0;

  // Common v1 payload (preserve byte-identical default)
  const v1Json = {
    score,
    classification: stability.tier,
    stabilityTier: stability.tier,
    topologyConfidenceLabel: confidenceLabel,
    coverage: meta.coverage,
    connectivity: meta.connectivity,
    extractionMode: meta.extractionMode,
    topologyConfidence: meta.topologyConfidence,
    authorityCrossings: crossingCount,
    blockerCrossings: blockerCount,
    warnings: meta.warnings,
    executionMetrics,
    artifactPath,
    policyConfigured: policyExists,
    headlineKind: headline.kind,
    diagnostics: diagnostics.map(diagnosticToJson),
    violations: violationsJson,
    artifactRelativePath: toRepoRelative(cwd, artifactPath),
  };

  // ── v1.1.0: format-aware emission ──────────────────────────
  if (out.format === 'json') {
    if (out.jsonSchema === 'v2') {
      emitFormattedOutput(
        renderCliJsonV2(
          buildCheckV2EnvelopeInput(
            out, v1Json, diagnostics, violationsJson, artifactPath, finalExit, policyEval, headline.kind, cwd, blockerCount,
          ),
        ) + '\n',
        out,
      );
    } else {
      // v1 default — preserve byte-identical v1.0.3 shape.
      emitFormattedOutput(JSON.stringify(v1Json, null, 2) + '\n', out);
    }
    process.exit(finalExit);
  }

  if (out.format === 'markdown') {
    emitFormattedOutput(
      renderCliMarkdown(
        buildCheckV2EnvelopeInput(
          out, v1Json, diagnostics, violationsJson, artifactPath, finalExit, policyEval, headline.kind, cwd, blockerCount,
        ),
      ),
      out,
    );
    process.exit(finalExit);
  }

  // ── Human Mode (existing behavior preserved) ──────────────

  if (!out.quiet) {
    console.log(`  Workspace:            ${pc.bold(meta.workspaceType)} (${meta.extractionMode})`);
    console.log(`  Confidence:           ${pc.bold(confidenceDescription(meta))}`);
    if (headline.kind === 'tier') {
      console.log(`  Stability:            ${stability.color(pc.bold(`${stability.tier} (${score.toFixed(2)} / 1.00)`))}`);
    }
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
  }

  // Exit code 3: Coverage threshold not met
  if (coverageBelowMin) {
    if (!out.quiet) {
      console.error(pc.red(`\n✖ Topology coverage (${meta.coverage.toFixed(2)}) is below the required threshold of ${minCoverage}.`));
      console.error('');
      console.error(`Fix: lower --min-coverage, or improve adapter coverage (see https://arch-engine.dev/adapters).`);
      console.error(`Exit 3: coverage threshold not met.`);
    }
    process.exit(3);
  }

  // Exit code 1: Policy violations in ENFORCE mode
  if (policyEval && policyEval.violations.length > 0) {
    const isEnforcingHere = policyEval.policyMode === 'enforce';
    if (!out.quiet) {
      const verdict = isEnforcingHere
        ? pc.red(pc.bold(`Blocked: ${policyEval.violations.length} architecture violation${policyEval.violations.length === 1 ? '' : 's'}.`))
        : pc.yellow(pc.bold(`${policyEval.violations.length} policy warning${policyEval.violations.length === 1 ? '' : 's'} (advisory mode).`));
      console.log('');
      console.log(verdict);
      console.log('');
      for (const v of policyEval.violations.slice(0, 5)) {
        const ciNote = isEnforcingHere && v.severity === 'error' ? pc.dim('(blocks CI)') : pc.dim('(advisory)');
        const arrow = isEnforcingHere ? pc.red('✗') : pc.yellow('⚠');
        console.log(`  ${arrow} ${pc.bold(v.from)} → ${pc.bold(v.to)}   ${ciNote}`);
        if (v.ruleId) {
          console.log(`    Rule:     ${v.ruleId}`);
        }
        console.log(`    Severity: ${v.severity}`);
      }
      if (policyEval.violations.length > 5) {
        console.log(pc.dim(`    ... and ${policyEval.violations.length - 5} more (see ${artifactPath}).`));
      }
    }
    if (isEnforcingHere) {
      // The verdict line MUST always print under --ci even when --quiet is set,
      // so the CI log includes the machine-quotable Exit line.
      if (!out.quiet || out.ci) {
        console.log('');
        console.log(`Fix: remove or re-route the offending edge(s) above, or update your policy to allow them.`);
        console.log(`Exit 1: blocking architecture violations.`);
      }
      process.exit(1);
    }
  }

  // BLOCKER authority-tier crossings → exit 1
  if (blockerCount > 0) {
    if (!out.quiet) {
      console.error(pc.red(`\n✖ Detected ${blockerCount} blocking authority-tier violation(s).`));
      const blockers = engineResult.stabilityIndex.authority_crossings.entries
        .filter((c: RankedAuthorityCrossing) => c.recommended_severity === 'BLOCKER');
      for (const b of blockers.slice(0, 5)) {
        console.error(pc.red(`  ${b.source_entity} → ${b.target_entity} [${b.authority_domain}]`));
      }
      console.error('');
      console.error(`Fix: review the authority-tier crossings above. Each must be either resolved or explicitly allowed.`);
      console.error(`Exit 1: blocking architecture violations.`);
    }
    process.exit(1);
  }

  // Happy path
  if (!out.quiet) {
    if (policyExists) {
      console.log(pc.green(`\n✔ Pass. No blocking architecture violations.`));
    } else {
      console.log(pc.dim(`\nNo policy file is configured yet — nothing was enforced.`));
    }
    console.log(pc.dim(`Artifact: ${artifactPath}`));
    console.log(pc.dim(`Extraction: ${executionMetrics.extractionMs}ms | Pipeline: ${executionMetrics.pipelineMs}ms | Total: ${executionMetrics.totalMs}ms`));
    console.log('');
    if (policyExists) {
      console.log('Exit 0: no blocking architecture violations.');
    } else {
      console.log('Next: add `arch-policy.yml` to enforce boundaries. No blocking rules were evaluated.');
    }
  }
  process.exit(0);
}

// ─── Phase 7 (v1.0.3) helpers ────────────────────────────

function buildViolationsJson(
  policyEval: { violations: PolicyViolation[]; policyMode: string } | null,
): Array<{
  id: string;
  ruleId: string | undefined;
  edge: { from: string; to: string; type: string };
  severity: string;
  ciBlocking: boolean;
  category: string;
  code: 'ARCH_ENGINE_BLOCKING_VIOLATION';
}> {
  if (!policyEval || policyEval.violations.length === 0) return [];
  const isEnforcing = policyEval.policyMode === 'enforce';
  return policyEval.violations.map((v) => {
    const hash = crypto
      .createHash('sha256')
      .update(`check|${v.ruleId ?? ''}|${v.from}|${v.to}|${v.violationCategory}`)
      .digest('hex')
      .slice(0, 8);
    return {
      id: `v_${hash}`,
      ruleId: v.ruleId,
      edge: { from: v.from, to: v.to, type: 'workspace_dependency' },
      severity: v.severity ?? 'error',
      ciBlocking: isEnforcing && (v.severity ?? 'error') === 'error',
      category: v.violationCategory,
      code: 'ARCH_ENGINE_BLOCKING_VIOLATION' as const,
    };
  });
}

function toRepoRelative(cwd: string, absPath: string): string {
  const rel = path.relative(cwd, absPath);
  if (rel.startsWith('..')) {
    return `…/${path.basename(absPath)}`;
  }
  return rel.split(path.sep).join('/');
}

// ─── v1.1.0 v2 envelope helpers ────────────────────────────────

function buildCheckV2EnvelopeInput(
  out: CliOutputOptions,
  v1: any,
  diagnostics: CliDiagnostic[],
  violationsJson: ReturnType<typeof buildViolationsJson>,
  artifactPath: string,
  finalExit: V2ExitCode,
  policyEval: { policyMode: string } | null,
  headlineKind: string,
  cwd: string,
  blockerCount: number,
): V2RenderInput {
  // Determine status. For check, exit 1 → blocked; exit 0 + no policy → not_enforced;
  // exit 0 + policy + no violations → passed; exit 3 → error.
  const status: V2Status =
    finalExit === 1
      ? 'blocked'
      : finalExit === 3
        ? 'error'
        : !v1.policyConfigured
          ? 'not_enforced'
          : 'passed';

  const headline: string =
    status === 'blocked'
      ? `Blocked: ${violationsJson.length || blockerCount} architecture violation${(violationsJson.length || blockerCount) === 1 ? '' : 's'}.`
      : status === 'not_enforced'
        ? 'No policy configured — nothing was enforced.'
        : status === 'error'
          ? 'Coverage below required threshold.'
          : `Pass — no blocking architecture violations.`;

  const summary = buildSummary(headline, status, {
    score: v1.score,
    violations: violationsJson.length,
    warnings: diagnostics.filter((d) => d.severity === 'WARNING').length,
    diagnostics: diagnostics.length,
  });

  const data: Record<string, unknown> = {
    verdict: status,
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
      authorityCrossings: v1.authorityCrossings,
      blockerCrossings: v1.blockerCrossings,
    },
    violations: [...violationsJson].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    policyConfigured: v1.policyConfigured,
    policyMode: policyEval?.policyMode ?? 'enforce',
    executionMetrics: v1.executionMetrics,
    warnings: v1.warnings,
  };

  const artifacts: V2Artifact[] = [
    {
      kind: 'stability-score',
      relativePath: normalizeArtifactPath(cwd, artifactPath),
      ...(out.verbose ? { absolutePath: artifactPath } : {}),
    },
  ];

  const nextActions: string[] = [];
  if (status === 'blocked') {
    nextActions.push(
      'Remove or re-route the offending edge(s) above, or update your policy to allow them.',
    );
  } else if (status === 'not_enforced') {
    nextActions.push(
      'Add `arch-policy.yml` to enforce boundaries. No blocking rules were evaluated.',
    );
  } else if (status === 'passed') {
    nextActions.push('Continue iterating; re-run `arch-engine check` on each PR.');
  } else if (status === 'error') {
    nextActions.push(
      'Lower --min-coverage, or improve adapter coverage. See https://arch-engine.dev/adapters.',
    );
  }

  // Status derivation cross-check: violations count drives blocked status,
  // but avoid divergence with deriveStatusForExit by trusting the manual
  // mapping above (check has the most nuanced flow).
  void deriveStatusForExit;

  return {
    command: 'check',
    exitCode: finalExit,
    status,
    summary,
    data,
    diagnostics,
    artifacts,
    nextActions,
    includeAbsolutePath: out.verbose,
  };
}
