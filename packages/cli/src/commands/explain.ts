import pc from 'picocolors';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { discoverEnvironment } from '../autodiscovery.js';
import {
  executeRunnerBridge,
  BridgeAdapterConflictError,
  type BridgeAdapterSummary,
} from '../runner-bridge.js';
import { loadPolicyConfig, evaluatePolicy, type EvaluatorEdge, type PolicyViolation } from '@arch-engine/core';
import { liftToComposedPolicy } from '../policy-lift.js';
import { SUPPORTED_EXPLAIN_TARGETS } from '../help-text.js';
import {
  buildDiagnostic,
  diagnosticToJson,
  emitDiagnosticHuman,
  emitDiagnosticJson,
  type CliDiagnostic,
} from '../format-error.js';
import {
  buildSummary,
  buildDataAdapterBlock,
  deriveStatusForExit,
  renderCliJsonV2,
  type V2RenderInput,
} from '../render-v2.js';
import { renderCliMarkdown } from '../render-markdown.js';
import { emitFormattedOutput } from '../output-writer.js';
import type { CliOutputOptions } from '../cli-options.js';
import { rejectBaselineForUnsupportedCommand } from '../cli-options.js';

export async function explainCommand(target: string, options: any) {
  const cwd = process.cwd();
  const out: CliOutputOptions = options.outputOptions;
  rejectBaselineForUnsupportedCommand(out, 'explain');

  // ── Special target: regression ────────────────────────
  if (target === 'regression') {
    return explainRegression(cwd, options, out);
  }

  // ── Special target: policy ────────────────────────────
  if (target === 'policy') {
    return explainPolicy(cwd, options, out);
  }

  if (out.format === 'human' && !out.quiet && !out.json) {
    console.log(pc.dim('Querying reasoning trace...\n'));
  }

  const discovery = discoverEnvironment(cwd);
  let bridge;
  try {
    bridge = await executeRunnerBridge(cwd, discovery);
  } catch (err) {
    if (err instanceof BridgeAdapterConflictError) {
      const d = err.diagnostics[0]!;
      if (out.format === 'json') {
        emitDiagnosticJson(d);
      } else {
        emitDiagnosticHuman(d);
      }
      process.exit(3);
    }
    throw err;
  }

  const { engineResult, extractionMetadata } = bridge;
  const canonicalIndex = engineResult.canonicalIndex;
  // Pass 2B — explain JSON v2 carries the adapter identity sourced
  // from the same runner-bridge selection every topology-extracting
  // command uses.
  const adapterSummary = bridge.adapterSummary;

  if (!canonicalIndex || canonicalIndex.total_edges === 0) {
    const diagnostic = buildDiagnostic({
      code: 'ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL',
      message:
        'No edges in canonical index. Topology coverage is too low to explain any relationships.',
    });
    if (out.format === 'json') {
      const v1 = {
        matches: [],
        suggestions: [],
        supportedSpecialTargets: SUPPORTED_EXPLAIN_TARGETS.map((t) => t.keyword),
        diagnostics: [diagnosticToJson(diagnostic)],
      };
      if (out.jsonSchema === 'v2') {
        emitFormattedOutput(
          renderCliJsonV2(buildExplainV2EnvelopeInput(out, target, 'unmatched', v1, [diagnostic], adapterSummary)) + '\n',
          out,
        );
      } else {
        emitFormattedOutput(JSON.stringify(v1, null, 2) + '\n', out);
      }
    } else if (out.format === 'markdown') {
      const v1 = {
        target,
        mode: 'unmatched',
        matches: [],
        suggestions: [],
        supportedSpecialTargets: SUPPORTED_EXPLAIN_TARGETS.map((t) => t.keyword),
      };
      emitFormattedOutput(
        renderCliMarkdown(buildExplainV2EnvelopeInput(out, target, 'unmatched', v1, [diagnostic], adapterSummary)),
        out,
      );
    } else {
      console.log(pc.yellow('No edges in canonical index. Falling back to raw extraction data.\n'));
      console.log(pc.dim('Try running with a more populated workspace.'));
      if (!out.quiet) {
        console.log('');
        console.log('Next: run `arch-engine inspect` to confirm what topology was extracted.');
      }
    }
    return;
  }

  // Tolerant match: search both source and target fields
  const matches = canonicalIndex.edges.filter(
    (e: EvaluatorEdge) => e.source.toLowerCase().includes(target.toLowerCase()) ||
         e.target.toLowerCase().includes(target.toLowerCase()),
  );

  if (matches.length === 0) {
    const allEntities = new Set<string>();
    for (const edge of canonicalIndex.edges) {
      allEntities.add(edge.source);
      allEntities.add(edge.target);
    }

    const suggestions = [...allEntities]
      .filter((e: string) => e.toLowerCase().includes(target.toLowerCase().slice(0, 3)))
      .slice(0, 5);

    const diagnostic = buildDiagnostic({
      code: 'ARCH_ENGINE_TARGET_NOT_FOUND',
      message: `No matches found for '${target}'. Supported special targets are listed in supportedSpecialTargets[].`,
      details: { target },
    });

    if (out.format === 'json') {
      const v1 = {
        matches: [],
        suggestions,
        supportedSpecialTargets: SUPPORTED_EXPLAIN_TARGETS.map((t) => t.keyword),
        diagnostics: [diagnosticToJson(diagnostic)],
      };
      if (out.jsonSchema === 'v2') {
        emitFormattedOutput(
          renderCliJsonV2(buildExplainV2EnvelopeInput(out, target, 'unmatched', v1, [diagnostic], adapterSummary)) + '\n',
          out,
        );
      } else {
        emitFormattedOutput(JSON.stringify(v1, null, 2) + '\n', out);
      }
    } else if (out.format === 'markdown') {
      const v1 = {
        target,
        mode: 'unmatched',
        matches: [],
        suggestions,
        supportedSpecialTargets: SUPPORTED_EXPLAIN_TARGETS.map((t) => t.keyword),
      };
      emitFormattedOutput(
        renderCliMarkdown(buildExplainV2EnvelopeInput(out, target, 'unmatched', v1, [diagnostic], adapterSummary)),
        out,
      );
    } else {
      console.log(pc.yellow(`No matches found for '${target}'.`));
      if (!out.quiet) {
        console.log('');
        console.log(pc.dim('Supported special targets:'));
        for (const t of SUPPORTED_EXPLAIN_TARGETS) {
          console.log(pc.dim(`  ${t.keyword.padEnd(12)} ${t.description}`));
        }
        if (suggestions.length > 0) {
          console.log('');
          console.log(pc.dim('Or did you mean a topology node/edge:'));
          for (const s of suggestions) {
            console.log(pc.dim(`  → ${s}`));
          }
        }
        console.log('');
        console.log('Next: run `arch-engine inspect` to list every node and edge.');
      }
    }
    return;
  }

  // Matched
  if (out.format === 'json') {
    const v1 = {
      matches,
      extractionMode: extractionMetadata.extractionMode,
      diagnostics: [],
    };
    if (out.jsonSchema === 'v2') {
      emitFormattedOutput(
        renderCliJsonV2(
          buildExplainV2EnvelopeInput(out, target, 'matched', { target, mode: 'matched', matches, extractionMode: extractionMetadata.extractionMode }, [], adapterSummary),
        ) + '\n',
        out,
      );
    } else {
      emitFormattedOutput(JSON.stringify(v1, null, 2) + '\n', out);
    }
    return;
  }

  if (out.format === 'markdown') {
    emitFormattedOutput(
      renderCliMarkdown(
        buildExplainV2EnvelopeInput(out, target, 'matched', { target, mode: 'matched', matches, extractionMode: extractionMetadata.extractionMode }, [], adapterSummary),
      ),
      out,
    );
    return;
  }

  // Human
  console.log(`Found ${pc.bold(matches.length)} relationship(s) involving '${target}':\n`);

  for (const match of matches.slice(0, 10)) {
    console.log(pc.bold('Relationship:'));
    console.log(`  ${pc.cyan(match.source)} → ${pc.cyan(match.target)}`);
    console.log(`\n  ${pc.bold('Edge Type:')} ${match.type}`);
    console.log(`  ${pc.bold('Confidence:')} ${match.confidence_score.toFixed(2)}`);
    console.log(`  ${pc.bold('Authority Level:')} ${match.authority_level}`);
    console.log(`  ${pc.bold('Adapter Count:')} ${match.adapter_count}`);

    if (match.adapters.length > 0) {
      console.log(`  ${pc.bold('Contributing Adapters:')}`);
      for (const adapter of match.adapters) {
        console.log(`    ${pc.green('●')} ${adapter}`);
      }
    }
    console.log('─'.repeat(55));
  }

  if (matches.length > 10) {
    console.log(pc.dim(`\n... and ${matches.length - 10} more edges. Use --json to see all.`));
  }

  if (!out.quiet) {
    console.log('');
    console.log('Next: run `arch-engine check` to verify whether this explanation affects the policy verdict.');
  }
}

// ─── Regression Context Explainer ───────────────────────

async function explainRegression(cwd: string, _options: any, out: CliOutputOptions): Promise<void> {
  const artifactPath = path.join(cwd, '.arch-engine', 'stability-score.json');

  if (!fs.existsSync(artifactPath)) {
    const diagnostic = buildDiagnostic({
      code: 'ARCH_ENGINE_NO_BASELINE',
      message: 'No stability-score.json artifact found. Run arch-engine check first.',
    });
    if (out.format === 'json') {
      const v1 = {
        error: 'No stability-score.json artifact found. Run arch-engine check first.',
        diagnostics: [diagnosticToJson(diagnostic)],
      };
      if (out.jsonSchema === 'v2') {
        emitFormattedOutput(
          renderCliJsonV2(
            buildExplainV2EnvelopeInput(out, 'regression', 'regression', { target: 'regression', mode: 'regression', regression: { detected: false, baselineFound: false } }, [diagnostic]),
          ) + '\n',
          out,
        );
      } else {
        emitFormattedOutput(JSON.stringify(v1, null, 2) + '\n', out);
      }
    } else if (out.format === 'markdown') {
      emitFormattedOutput(
        renderCliMarkdown(
          buildExplainV2EnvelopeInput(out, 'regression', 'regression', { target: 'regression', mode: 'regression', regression: { detected: false, baselineFound: false } }, [diagnostic]),
        ),
        out,
      );
    } else {
      console.log(pc.yellow('No stability-score.json found.'));
      console.log(pc.dim('Run `arch-engine check` to generate the artifact first.'));
    }
    return;
  }

  let artifact: Record<string, unknown>;
  try {
    const raw = fs.readFileSync(artifactPath, 'utf-8');
    artifact = JSON.parse(raw);
  } catch {
    console.log(pc.red('Failed to parse stability-score.json'));
    return;
  }

  const context = {
    regressionSeverity: artifact.regressionSeverity ?? null,
    regressionConfidence: artifact.regressionConfidence ?? null,
    regressionConfidenceSource: artifact.regressionConfidenceSource ?? null,
    regression: artifact.regression ?? null,
    regressionDelta: artifact.regressionDelta ?? null,
    trendIndicators: artifact.trendIndicators ?? null,
    comparisonBaseline: artifact.comparisonBaseline ?? null,
    stabilityTier: artifact.stabilityTier,
    topologyConfidenceLabel: artifact.topologyConfidenceLabel,
    coverage: artifact.coverage,
    connectivity: artifact.connectivity,
    stabilityScore: artifact.stabilityScore,
  };

  const diagnostics: CliDiagnostic[] = [];
  const regForDiag = context.regression as Record<string, unknown> | null;
  if (regForDiag?.baselineFound === false) {
    diagnostics.push(
      buildDiagnostic({
        code: 'ARCH_ENGINE_NO_BASELINE',
        message:
          'No baseline found for regression comparison. The current run will become the baseline for future comparisons.',
      }),
    );
  }

  if (out.format === 'json') {
    const v1 = {
      ...context,
      diagnostics: diagnostics.map(diagnosticToJson),
    };
    if (out.jsonSchema === 'v2') {
      emitFormattedOutput(
        renderCliJsonV2(
          buildExplainV2EnvelopeInput(out, 'regression', 'regression', { target: 'regression', mode: 'regression', ...context }, diagnostics),
        ) + '\n',
        out,
      );
    } else {
      emitFormattedOutput(JSON.stringify(v1, null, 2) + '\n', out);
    }
    return;
  }

  if (out.format === 'markdown') {
    emitFormattedOutput(
      renderCliMarkdown(
        buildExplainV2EnvelopeInput(out, 'regression', 'regression', { target: 'regression', mode: 'regression', ...context }, diagnostics),
      ),
      out,
    );
    return;
  }

  // Human
  if (!out.quiet) {
    console.log(pc.dim('Regression context from stability-score.json\n'));
  }

  const reg = context.regression as Record<string, unknown> | null;
  const detected = reg?.detected === true;

  if (!detected) {
    console.log(pc.green('✔ No regression detected'));
    if (reg?.baselineFound === false) {
      console.log(pc.dim('  (No baseline — first run)'));
    }
  } else {
    const sev = (context.regressionSeverity as string) ?? 'unknown';
    const conf = (context.regressionConfidence as string) ?? 'unknown';
    const source = (context.regressionConfidenceSource as string) ?? 'unknown';
    const sevColor = sev === 'critical' || sev === 'major' ? pc.red : sev === 'moderate' ? pc.yellow : pc.dim;
    console.log(sevColor(`⚠ Regression:`));
    console.log(`  Regression Severity: ${sev.toUpperCase()}`);
    console.log(`  Regression Confidence: ${conf}`);
    console.log(`  Confidence Source: ${source}`);
    console.log(pc.dim(`\n  ${reg?.summary ?? ''}`));
  }

  console.log('');

  const deltas = context.regressionDelta as Record<string, number> | null;
  if (deltas && !out.quiet) {
    console.log(pc.bold('Numeric Deltas:'));
    for (const [key, value] of Object.entries(deltas)) {
      const arrow = value > 0 ? pc.green('↑') : value < 0 ? pc.red('↓') : pc.dim('→');
      console.log(`  ${arrow} ${key}: ${value > 0 ? '+' : ''}${typeof value === 'number' ? value.toFixed(4) : value}`);
    }
    console.log('');
  }

  const trends = context.trendIndicators as Record<string, string> | null;
  if (trends && !out.quiet) {
    console.log(pc.bold('Trend Indicators:'));
    for (const [key, value] of Object.entries(trends)) {
      const arrow = value === 'up' ? pc.green('↑') : value === 'down' ? pc.red('↓') : pc.dim('→');
      console.log(`  ${arrow} ${key}: ${value}`);
    }
    console.log('');
  }

  const baseline = context.comparisonBaseline as Record<string, unknown> | null;
  if (baseline && !out.quiet) {
    console.log(pc.bold('Baseline Lineage:'));
    console.log(`  Repo Hash: ${baseline.baselineRepoHash ?? 'unknown'}`);
    console.log(`  Generated: ${baseline.baselineGeneratedAt ?? 'unknown'}`);
    console.log(`  Artifact Version: ${baseline.baselineArtifactVersion ?? 'unknown'}`);
    console.log(`  Lineage Depth: ${baseline.lineageDepth ?? 'unknown'}`);
  }

  if (!out.quiet) {
    console.log('');
    console.log('Next: run `arch-engine check` to verify whether this regression affects the policy verdict.');
  }
}

async function explainPolicy(cwd: string, options: any, out: CliOutputOptions) {
  const policyDoc = loadPolicyConfig(cwd);

  if (!policyDoc) {
    const diagnostic = buildDiagnostic({
      code: 'ARCH_ENGINE_POLICY_NOT_FOUND',
      message: 'No .archengine/policy.yml configuration found.',
    });
    if (out.format === 'json') {
      const v1 = {
        error: 'No policy found',
        diagnostics: [diagnosticToJson(diagnostic)],
      };
      if (out.jsonSchema === 'v2') {
        emitFormattedOutput(
          renderCliJsonV2(buildExplainV2EnvelopeInput(out, 'policy', 'policy', { target: 'policy', mode: 'policy' }, [diagnostic])) + '\n',
          out,
        );
      } else {
        emitFormattedOutput(JSON.stringify(v1, null, 2) + '\n', out);
      }
    } else if (out.format === 'markdown') {
      emitFormattedOutput(
        renderCliMarkdown(buildExplainV2EnvelopeInput(out, 'policy', 'policy', { target: 'policy', mode: 'policy' }, [diagnostic])),
        out,
      );
    } else {
      console.log(pc.yellow('No .archengine/policy.yml configuration found.'));
    }
    return;
  }

  const discovery = discoverEnvironment(cwd);
  let bridge;
  try {
    bridge = await executeRunnerBridge(cwd, discovery);
  } catch (err) {
    if (err instanceof BridgeAdapterConflictError) {
      const d = err.diagnostics[0]!;
      if (out.format === 'json') {
        emitDiagnosticJson(d);
      } else {
        emitDiagnosticHuman(d);
      }
      process.exit(3);
    }
    throw err;
  }
  const policyAdapterSummary = bridge.adapterSummary;

  const edges: EvaluatorEdge[] = [];
  for (const [src, targets] of Object.entries(bridge.adjacencyMap)) {
    for (const t of targets) edges.push({ source: src, target: t });
  }

  const composedPolicy = liftToComposedPolicy(policyDoc.config, policyDoc.hash);
  const evalResult = evaluatePolicy(edges, composedPolicy, 'EXPLAIN', policyDoc.hash);

  let targetRuleId = (options._ && options._.length > 0) ? options._[0] : null;

  let violations = evalResult.violations;
  if (targetRuleId) {
    violations = violations.filter((v: PolicyViolation) => v.ruleId === targetRuleId || v.ruleSource === targetRuleId);
  }

  const v1 = {
    explainSchemaVersion: 1,
    policyHash: evalResult.policyHash,
    policyMode: evalResult.policyMode,
    policyVersion: evalResult.policyVersion,
    matchedEdges: evalResult.matchedEdges,
    violations,
    diagnostics: [],
  };

  if (out.format === 'json') {
    if (out.jsonSchema === 'v2') {
      emitFormattedOutput(
        renderCliJsonV2(
          buildExplainV2EnvelopeInput(out, 'policy', 'policy', {
            target: 'policy',
            mode: 'policy',
            explainSchemaVersion: 1,
            policyHash: evalResult.policyHash,
            policyMode: evalResult.policyMode,
            policyVersion: evalResult.policyVersion,
            matchedEdges: evalResult.matchedEdges,
            violations,
          }, [], policyAdapterSummary),
        ) + '\n',
        out,
      );
    } else {
      emitFormattedOutput(JSON.stringify(v1, null, 2) + '\n', out);
    }
    return;
  }

  if (out.format === 'markdown') {
    emitFormattedOutput(
      renderCliMarkdown(
        buildExplainV2EnvelopeInput(out, 'policy', 'policy', {
          target: 'policy',
          mode: 'policy',
          explainSchemaVersion: 1,
          policyHash: evalResult.policyHash,
          policyMode: evalResult.policyMode,
          policyVersion: evalResult.policyVersion,
          matchedEdges: evalResult.matchedEdges,
          violations,
        }, [], policyAdapterSummary),
      ),
      out,
    );
    return;
  }

  // Human
  if (!out.quiet) {
    console.log(`Policy: hash ${evalResult.policyHash} | mode ${evalResult.policyMode}\n`);
  }

  if (violations.length === 0) {
    console.log(pc.green(`✔ No policy violations ${targetRuleId ? `for rule '${targetRuleId}' ` : ''}detected.`));
    if (!out.quiet) {
      console.log('');
      console.log('Next: run `arch-engine check` to confirm the verdict in CI mode.');
    }
    return;
  }

  console.log(`Found ${pc.bold(pc.red(violations.length))} violation(s):\n`);

  for (const v of violations) {
    console.log(pc.bold('Violation: ') + `${pc.red(v.from)} → ${pc.red(v.to)}`);
    console.log(`  ${pc.bold('Category:')} ${pc.yellow(v.violationCategory)}`);
    console.log(`  ${pc.bold('Rule:')}     ${v.ruleId || v.ruleSource}`);
    console.log(`  ${pc.bold('Severity:')} ${v.severity}`);

    if (v.originPolicyChain && v.originPolicyChain.length > 0) {
      console.log(`\n  ${pc.bold('Violation Source Chain:')}`);
      const reversedChain = [...v.originPolicyChain].reverse();
      console.log(`  ${pc.cyan(reversedChain[0])}`);
      for (let i = 1; i < reversedChain.length; i++) {
        console.log(`  ${pc.dim('↑ inherited from')} ${pc.cyan(reversedChain[i])}`);
      }
    } else if (v.originPolicyId) {
      console.log(`  ${pc.bold('Origin:')}   ${v.originPolicyId}`);
    }

    console.log('');
  }

  if (!out.quiet) {
    console.log('Next: run `arch-engine check` to confirm whether these violations block CI.');
  }
}

// ─── v1.1.0 v2 envelope helpers ────────────────────────────────

function buildExplainV2EnvelopeInput(
  out: CliOutputOptions,
  target: string,
  mode: string,
  data: Record<string, unknown>,
  diagnostics: CliDiagnostic[],
  /**
   * Pass 2B — optional adapter summary. Present whenever
   * `executeRunnerBridge` ran (every explain path except the
   * `regression` mode, which reads `.arch-engine/stability-score.json`
   * and never invokes a workspace adapter for the current run).
   *
   * When absent, the renderer omits `data.adapter` so the envelope
   * remains honest about not having selected an adapter.
   */
  adapterSummary?: BridgeAdapterSummary,
): V2RenderInput {
  const status = deriveStatusForExit(0, diagnostics, 0);
  const matches = Array.isArray(data.matches) ? (data.matches as unknown[]).length : undefined;
  const summary = buildSummary(
    `Explain ${mode}: ${target}`,
    status,
    {
      matches,
      warnings: diagnostics.filter((d) => d.severity === 'WARNING').length,
      diagnostics: diagnostics.length,
    },
  );

  const nextActions: string[] = [];
  if (mode === 'unmatched') {
    nextActions.push('Run `arch-engine inspect` to list every node and edge.');
  } else if (mode === 'regression') {
    nextActions.push('Run `arch-engine check` to verify whether this regression affects the policy verdict.');
  } else if (mode === 'policy') {
    nextActions.push('Run `arch-engine check` to confirm the verdict in CI mode.');
  } else {
    nextActions.push('Run `arch-engine check` to verify whether this explanation affects the policy verdict.');
  }

  // Pass 2B — additive data.adapter block when an adapter ran.
  const enrichedData = adapterSummary
    ? { adapter: buildDataAdapterBlock(adapterSummary), ...data }
    : data;

  return {
    command: 'explain',
    exitCode: 0,
    status,
    summary,
    data: enrichedData,
    diagnostics,
    artifacts: [],
    nextActions,
    includeAbsolutePath: out.verbose,
  };
}
