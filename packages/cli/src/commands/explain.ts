import pc from 'picocolors';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { discoverEnvironment } from '../autodiscovery.js';
import { executeRunnerBridge } from '../runner-bridge.js';
import { loadPolicyConfig, evaluatePolicy, type EvaluatorEdge } from '@arch-engine/core';

export async function explainCommand(target: string, options: any) {
  const cwd = process.cwd();

  // ── Special target: regression ────────────────────────
  if (target === 'regression') {
    return explainRegression(cwd, options);
  }

  // ── Special target: policy ────────────────────────────
  if (target === 'policy') {
    return explainPolicy(cwd, options);
  // ── Special target: policy-resolution ───────────────────
  if (target === 'policy-resolution') {
    return explainPolicyResolution(cwd, options);
  }

  if (!options.json) {
    console.log(pc.bold(pc.cyan(`arch-engine explain ${target}`)));
    console.log(pc.dim('Querying reasoning trace...\n'));
  }

  const discovery = discoverEnvironment(cwd);
  const bridge = await executeRunnerBridge(cwd, discovery);

  const { engineResult, extractionMetadata } = bridge;
  const canonicalIndex = engineResult.canonicalIndex;

  if (!canonicalIndex || canonicalIndex.total_edges === 0) {
    if (!options.json) {
      console.log(pc.yellow('No edges in canonical index. Falling back to raw extraction data.\n'));
    }

    // Fallback: search raw edges from adapter output
    const allEdges = Object.values(engineResult.reconciliationTrace)
    if (!options.json) {
      console.log(pc.dim('Try running with a more populated workspace.'));
    }
    return;
  }

  // Tolerant match: search both source and target fields
  const matches = canonicalIndex.edges.filter(
    e => e.source.toLowerCase().includes(target.toLowerCase()) ||
         e.target.toLowerCase().includes(target.toLowerCase()),
  );

  if (matches.length === 0) {
    // Show nearest suggestions
    const allEntities = new Set<string>();
    for (const edge of canonicalIndex.edges) {
      allEntities.add(edge.source);
      allEntities.add(edge.target);
    }

    const suggestions = [...allEntities]
      .filter(e => e.toLowerCase().includes(target.toLowerCase().slice(0, 3)))
      .slice(0, 5);

    if (options.json) {
      console.log(JSON.stringify({ matches: [], suggestions }, null, 2));
    } else {
      console.log(pc.yellow(`No matches found for '${target}'.`));
      if (suggestions.length > 0) {
        console.log(pc.dim('\nDid you mean:'));
        for (const s of suggestions) {
          console.log(pc.dim(`  → ${s}`));
        }
      }
    }
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ matches, extractionMode: extractionMetadata.extractionMode }, null, 2));
    return;
  }

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
}

// ─── Regression Context Explainer ───────────────────────

/**
 * Explain the current regression context by reading the
 * stability-score.json artifact and surfacing its regression
 * intelligence fields.
 *
 * Supports: policy-layer traceability (Week 6 hook)
 */
async function explainRegression(cwd: string, options: any): Promise<void> {
  const artifactPath = path.join(cwd, '.arch-engine', 'stability-score.json');

  if (!fs.existsSync(artifactPath)) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'No stability-score.json artifact found. Run arch-engine check first.' }));
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

  // Extract regression context fields
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

  if (options.json) {
    console.log(JSON.stringify(context, null, 2));
    return;
  }

  console.log(pc.bold(pc.cyan('arch-engine explain regression')));
  console.log(pc.dim('Regression context from stability-score.json\n'));

  // Status
  const reg = context.regression as Record<string, unknown> | null;
  const detected = reg?.detected === true;

  if (!detected) {
    console.log(pc.green('✔ No regression detected'));
    if (reg?.baselineFound === false) {
      console.log(pc.dim('  (No baseline — first run)'));
    }
  } else {
    const sev = context.regressionSeverity as string ?? 'unknown';
    const conf = context.regressionConfidence as string ?? 'unknown';
    const source = context.regressionConfidenceSource as string ?? 'unknown';
    const sevColor = sev === 'critical' || sev === 'major' ? pc.red : sev === 'moderate' ? pc.yellow : pc.dim;
    console.log(sevColor(`⚠ Regression:`));
    console.log(`  Regression Severity: ${sev.toUpperCase()}`);
    console.log(`  Regression Confidence: ${conf}`);
    console.log(`  Confidence Source: ${source}`);
    console.log(pc.dim(`\n  ${reg?.summary ?? ''}`));
  }

  console.log('');

  // Deltas
  const deltas = context.regressionDelta as Record<string, number> | null;
  if (deltas) {
    console.log(pc.bold('Numeric Deltas:'));
    for (const [key, value] of Object.entries(deltas)) {
      const arrow = value > 0 ? pc.green('↑') : value < 0 ? pc.red('↓') : pc.dim('→');
      console.log(`  ${arrow} ${key}: ${value > 0 ? '+' : ''}${typeof value === 'number' ? value.toFixed(4) : value}`);
    }
    console.log('');
  }

  // Trends
  const trends = context.trendIndicators as Record<string, string> | null;
  if (trends) {
    console.log(pc.bold('Trend Indicators:'));
    for (const [key, value] of Object.entries(trends)) {
      const arrow = value === 'up' ? pc.green('↑') : value === 'down' ? pc.red('↓') : pc.dim('→');
      console.log(`  ${arrow} ${key}: ${value}`);
    }
    console.log('');
  }

  // Baseline lineage
  const baseline = context.comparisonBaseline as Record<string, unknown> | null;
  if (baseline) {
    console.log(pc.bold('Baseline Lineage:'));
    console.log(`  Repo Hash: ${baseline.baselineRepoHash ?? 'unknown'}`);
    console.log(`  Generated: ${baseline.baselineGeneratedAt ?? 'unknown'}`);
    console.log(`  Artifact Version: ${baseline.baselineArtifactVersion ?? 'unknown'}`);
    console.log(`  Lineage Depth: ${baseline.lineageDepth ?? 'unknown'}`);
  }
}

async function explainPolicy(cwd: string, options: any) {
  const policyDoc = loadPolicyConfig(cwd);

  if (!policyDoc) {
    if (options.json) console.log(JSON.stringify({ error: 'No policy found' }));
    else console.log(pc.yellow('No .archengine/policy.yml configuration found.'));
    return;
  }

  const discovery = discoverEnvironment(cwd);
  const bridge = await executeRunnerBridge(cwd, discovery);
  
  const edges: EvaluatorEdge[] = [];
  for (const [src, targets] of Object.entries(bridge.adjacencyMap)) {
    for (const t of targets) edges.push({ source: src, target: t });
  }

  const evalResult = evaluatePolicy(edges, policyDoc.config, 'EXPLAIN', policyDoc.hash);
  
  let targetRuleId = (options._ && options._.length > 0) ? options._[0] : null;

  let violations = evalResult.violations;
  if (targetRuleId) {
    violations = violations.filter(v => v.ruleId === targetRuleId || v.ruleSource === targetRuleId);
  }

  if (options.json) {
    console.log(JSON.stringify({
      explainSchemaVersion: 1,
      policyHash: evalResult.policyHash,
      policyMode: evalResult.policyMode,
      policyVersion: evalResult.policyVersion,
      matchedEdges: evalResult.matchedEdges,
      violations
    }, null, 2));
    return;
  }

  console.log(pc.bold(pc.cyan(`arch-engine explain policy${targetRuleId ? ` ${targetRuleId}` : ''}`)));
  console.log(`Hash: ${evalResult.policyHash} | Mode: ${evalResult.policyMode}\n`);

  if (violations.length === 0) {
    console.log(pc.green(`✔ No policy violations ${targetRuleId ? `for rule '${targetRuleId}' ` : ''}detected.`));
    return;
  }

  console.log(`Found ${pc.bold(pc.red(violations.length))} violation(s):\n`);

  for (const v of violations) {
    console.log(pc.bold('Violation: ') + `${pc.red(v.from)} → ${pc.red(v.to)}`);
    console.log(`  ${pc.bold('Category:')} ${pc.yellow(v.violationCategory)}`);
    console.log(`  ${pc.bold('Rule:')}     ${v.ruleId || v.ruleSource}`);
    console.log(`  ${pc.bold('Severity:')} ${v.severity}`);

    // Source Chain Rendering
    if (v.originPolicyChain && v.originPolicyChain.length > 0) {
      console.log(`\n  ${pc.bold('Violation Source Chain:')}`);
      // Render from bottom to top (most local -> root)
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
}

