import pc from 'picocolors';
import * as fs from 'node:fs';
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

export async function checkCommand(options: any) {
  const cwd = process.cwd();

  // Auto-init silently
  autoInitializeArchitectureContext(cwd);

  if (!options.json) {
    // No literal command echo — see CLI Experience Specification §4 P12.
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
    // Phase 8 (v1.0.3): structurised fatal path. Maps generic
    // adapter/runner-bridge failures to ARCH_ENGINE_ADAPTER_NOT_FOUND
    // (severity ERROR, exit 3). Exit code is preserved verbatim — only
    // the rendering becomes structured. JSON mode now emits a minimal
    // `{ diagnostics: [...] }` envelope instead of silent exit, closing a
    // pre-existing JSON contract hole additively (no existing keys are
    // altered because there were none).
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
    if (options.json) {
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

  // Single source of truth for policy presence (matches doctor + analyze).
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
    // Workspace detection transparency. The "Stability Score" line that
    // previously printed "CRITICAL" before "No blocking violations" was
    // removed — see CLI Experience Specification §5.4 for the contradiction
    // it produced. The numeric score remains visible only when the headline
    // grades it (i.e., a policy file is configured AND signal is sufficient).
    console.log(`  Workspace:            ${pc.bold(meta.workspaceType)} (${meta.extractionMode})`);
    console.log(`  Confidence:           ${pc.bold(confidenceDescription(meta))}`);
    if (headline.kind === 'tier') {
      // Single, calibrated stability line (Phase C unified the previous
      // "Stability Score: CRITICAL (0.47)" + headline duplication into
      // one line).
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
  } else {
    // Backward-compatible JSON shape. Existing keys preserved verbatim.
    // Phase A additive: `policyConfigured`, `headlineKind`.
    // Phase 6 (v1.0.3) additive: `diagnostics: []`.
    // Phase 7 (v1.0.3) additive: `violations: []`, `artifactRelativePath`.
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
    const violationsJson = buildViolationsJson(policyEval);
    if (violationsJson.length > 0 && policyEval && policyEval.policyMode === 'enforce') {
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
      policyConfigured: policyExists,
      headlineKind: headline.kind,
      // Phase 6 additive
      diagnostics: diagnostics.map(diagnosticToJson),
      // Phase 7 additive: violation surface + repo-relative artifact path
      violations: violationsJson,
      artifactRelativePath: toRepoRelative(cwd, artifactPath),
    }, null, 2));
  }

  // Exit code 3: Coverage threshold not met
  if (minCoverage > 0 && meta.coverage < minCoverage) {
    if (!options.json) {
      console.error(pc.red(`\n✖ Topology coverage (${meta.coverage.toFixed(2)}) is below the required threshold of ${minCoverage}.`));
      console.error('');
      console.error(`Fix: lower --min-coverage, or improve adapter coverage (see https://arch-engine.dev/adapters).`);
      console.error(`Exit 3: coverage threshold not met.`);
    }
    process.exit(3);
  }

  // Exit code 5: Policy violations in ENFORCE mode
  if (policyEval && policyEval.violations.length > 0) {
    const isEnforcing = policyEval.policyMode === 'enforce';
    if (!options.json) {
      const verdict = isEnforcing
        ? pc.red(pc.bold(`Blocked: ${policyEval.violations.length} architecture violation${policyEval.violations.length === 1 ? '' : 's'}.`))
        : pc.yellow(pc.bold(`${policyEval.violations.length} policy warning${policyEval.violations.length === 1 ? '' : 's'} (advisory mode).`));
      console.log('');
      console.log(verdict);
      console.log('');
      // Per-violation block. Show rule id and severity so the user can
      // act on exactly the rule they need to. Five-violation cap kept
      // from v1.0.1 — the artifact JSON has the full list.
      for (const v of policyEval.violations.slice(0, 5)) {
        const ciNote = isEnforcing && v.severity === 'error' ? pc.dim('(blocks CI)') : pc.dim('(advisory)');
        const arrow = isEnforcing ? pc.red('✗') : pc.yellow('⚠');
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
    if (isEnforcing) {
      if (!options.json) {
        console.log('');
        console.log(`Fix: remove or re-route the offending edge(s) above, or update your policy to allow them.`);
        console.log(`Exit 1: blocking architecture violations.`);
      }
      // Phase D-Lite: blocking architecture violations exit with code 1
      // (was 5 in v1.0.1 — see audit
      // ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md). Code 5 is
      // now reserved for internal invariant failures.
      process.exit(1);
    }
  }

  // BLOCKER authority-tier crossings (internal heuristic-detected
  // architecture violations). These are blocking violations from the
  // user's perspective and now exit with the same code as enforce-mode
  // policy violations: 1.
  const blockerCount = engineResult.stabilityIndex.authority_crossings.blocker_crossings;
  if (blockerCount > 0) {
    if (!options.json) {
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
    // Phase D-Lite: was exit 2 in v1.0.1; migrated to 1 to align with
    // the "blocking architecture violations" semantic. Code 2 is now
    // reserved for invalid input or configuration.
    process.exit(1);
  }

  // Happy path. The verdict line MUST be consistent with the rest of the
  // output — never "CRITICAL" + "no blocking violations" together. We
  // distinguish two no-block scenarios:
  //   1. policy is configured AND was evaluated cleanly → "Pass."
  //   2. no policy is configured → "No policy to evaluate against."
  if (!options.json) {
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

/**
 * Convert the policy-evaluator's violation list into the
 * `violations[]` JSON shape per spec §10.4.
 *
 * Each violation gets a stable hash-based id (no timestamps,
 * no random) so re-running the same input yields byte-identical
 * IDs.
 */
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

/**
 * Convert an absolute artifact path to a repo-relative form. If
 * the artifact lives outside the cwd (e.g. running on a tempdir
 * fixture), we still emit a relative form using `…/<file>` so
 * machine consumers don't have to special-case absolute paths.
 *
 * Path separators are normalised to POSIX forward slashes per
 * spec §12.1.
 */
function toRepoRelative(cwd: string, absPath: string): string {
  const rel = path.relative(cwd, absPath);
  // If `rel` starts with `..` the artifact is outside the cwd.
  // Surface it as `…/<basename>` to avoid leaking `../../tmp/...`
  // chains in CI logs.
  if (rel.startsWith('..')) {
    return `…/${path.basename(absPath)}`;
  }
  return rel.split(path.sep).join('/');
}
