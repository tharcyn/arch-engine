/**
 * ═══════════════════════════════════════════════════════════
 *  PR Summary Renderer — Architecture Health Dashboard
 * ═══════════════════════════════════════════════════════════
 *
 *  Week 5.5: Extended with machine-readable JSON block,
 *  regression severity display, trend indicators, and
 *  summary schema version lock.
 *
 *  Renders a structured Markdown architecture report for
 *  the GitHub Job Summary surface. Designed to look like an
 *  architecture health dashboard snapshot, not console output.
 *
 *  Appends a hidden machine-readable JSON block parseable by
 *  GitHub Apps, dashboards, and automation bots.
 */

import type { RegressionResult, RegressionSeverity, RegressionConfidence, RegressionConfidenceSource, TrendIndicators } from './regressionDetector.js';
import type { PolicyEvaluationResult } from '@arch-engine/core';

// ─── Constants ──────────────────────────────────────────

/**
 * COMPATIBILITY CONTRACT:
 * MAJOR increment: Signals a breaking machine-reader payload change.
 * MINOR increment: Signals additive structural fields mapping (like 1.1).
 * 1.x readers MUST ignore unknown additive fields unconditionally.
 * 1.1 natively maintains full downstream legacy extraction mappings mapping 1.0 logic.
 */
export const SUMMARY_SCHEMA_VERSION = '1.1';
export const EXPECTED_ARTIFACT_COMPATIBILITY_VERSION = '1.0';

// ─── Types ──────────────────────────────────────────────

type StabilityTier = 'STABLE' | 'HEALTHY' | 'WARNING' | 'CRITICAL';
type ConfidenceLabel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';

export interface SummaryInput {
  tier: StabilityTier;
  score: number;
  confLabel: ConfidenceLabel;

  workspaceType: string;
  extractionMode: string;

  coverage: number;
  connectivity: number;
  topologyConfidence: number;

  detectedNodes: number;
  expectedNodes: number;
  connectedNodes: number;

  crossingCount: number;
  crossings: Array<{
    source_entity: string;
    target_entity: string;
    authority_domain: string;
  }>;

  domainDistribution: Record<string, number>;

  warnings: string[];

  components: {
    agreement_ratio: number;
    confidence_variance: number;
    conflict_rate: number;
    authority_coverage: number;
  };

  executionMetrics: {
    extractionMs: number;
    pipelineMs: number;
    totalMs: number;
  };

  regression: RegressionResult | null;
  policyEval: PolicyEvaluationResult | null;
  policyExists: boolean;
}

// ─── Machine-Readable Summary Schema ────────────────────

export interface SummaryJSON {
  summarySchemaVersion: string;
  artifactCompatibilityVersion: string;
  workspaceType: string;
  extractionMode: string;
  stabilityTier: StabilityTier;
  stabilityScore: number;
  coverage: number;
  connectivity: number;
  topologyConfidenceLabel: ConfidenceLabel;
  topologyConfidence: number;
  authorityCrossings: number;
  detectedNodes: number;
  expectedNodes: number;
  regressionSeverity: RegressionSeverity | null;
  regressionConfidence: RegressionConfidence | null;
  regressionConfidenceSource: RegressionConfidenceSource | null;
  trendIndicators: TrendIndicators | null;
  lineageDepth: number | null;
  warnings: number;
  executionMs: number;
  policyViolations?: number;
  policyMode?: string;
  policyVersion?: number;
  policyHash?: string;
  evaluationStrategyVersion?: number;
  policyRuleHits?: Record<string, number>;
  policyDetected?: boolean;
}

// ─── Helpers ────────────────────────────────────────────

function tierEmoji(tier: StabilityTier): string {
  switch (tier) {
    case 'STABLE': return '🟢';
    case 'HEALTHY': return '🟢';
    case 'WARNING': return '🟡';
    case 'CRITICAL': return '🔴';
  }
}

function severityEmoji(severity: RegressionSeverity): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'major': return '🟠';
    case 'moderate': return '🟡';
    case 'minor': return '⚪';
    default: return '';
  }
}

function trendArrow(dir: string): string {
  switch (dir) {
    case 'up': return '↑';
    case 'down': return '↓';
    default: return '→';
  }
}

// ─── Public API ─────────────────────────────────────────

/**
 * Render the full PR summary as Markdown with appended
 * machine-readable JSON block.
 */
export function renderSummary(input: SummaryInput): string {
  const { tier, score, confLabel, policyEval } = input;
  const sections: string[] = [];

  // ── Header ────────────────────────────────────────────
  sections.push(`## ${tierEmoji(tier)} Architecture Stability Report`);

  // ── Policy Enforcement Block ──────────────────────────
  if (policyEval) {
    const policyColor = policyEval.violations.length > 0 ? (policyEval.policyMode === 'enforce' ? '🔴 **FAILED**' : '🟡 **ADVISORY**') : '🟢 **PASS**';
    sections.push(`### 🛡️ Policy Status: ${policyColor}`);
    if (policyEval.violations.length > 0) {
      sections.push(`Detected **${policyEval.violations.length}** violation(s) evaluated against \`policy.yml\` (Hash: \`${policyEval.policyHash}\`).\n`);
      sections.push(`| Category | From | To | Severity | Rule | Source Chain | Authority |`);
      sections.push(`|---|---|---|---|---|---|---|`);
      for (const v of policyEval.violations.slice(0, 5)) {
        let chainText = '-';
        if (v.originPolicyChain && v.originPolicyChain.length > 0) {
          if (v.originPolicyChain.length <= 3) {
            chainText = v.originPolicyChain.join(' → ');
          } else {
            chainText = `${v.originPolicyChain[0]} → … → ${v.originPolicyChain[v.originPolicyChain.length - 1]}`;
          }
        }
        sections.push(`| \`${v.violationCategory}\` | \`${v.from}\` | \`${v.to}\` | ${v.severity} | \`${v.ruleId || v.ruleSource}\` | \`${chainText}\` | \`${v.mergeAuthority || '?'}\` |`);
      }
      if (policyEval.violations.length > 5) {
        sections.push(`| ... | ... | ... | ... | ... | ... | ... |`);
      }
    }
  }

  // ── Core Metrics Table ────────────────────────────────
  const trendSuffix = input.regression?.trendIndicators
    ? ` ${trendArrow(input.regression.trendIndicators.stabilityTrend)}`
    : '';
  const coverageTrend = input.regression?.trendIndicators
    ? ` ${trendArrow(input.regression.trendIndicators.coverageTrend)}`
    : '';

  sections.push(`
| Metric | Value |
|---|---|
| **Stability** | ${tier} (${score.toFixed(2)})${trendSuffix} |
| **Coverage** | ${(input.coverage * 100).toFixed(0)}%${coverageTrend} |
| **Connectivity** | ${(input.connectivity * 100).toFixed(0)}% |
| **Authority Crossings** | ${input.crossingCount} observed |
| **Confidence** | ${confLabel} (${input.extractionMode}) |
| **Workspace** | ${input.workspaceType} |
| **Nodes** | ${input.detectedNodes} / ${input.expectedNodes} |`);

  // ── Quality Floor ─────────────────────────────────────
  if (input.coverage < 0.30 || input.detectedNodes < 2) {
    sections.push(
      '\n> ⚠️ **Signal quality is too low for reliable conclusions.** Consider adding more packages to the workspace.',
    );
  }

  // ── Regression Summary ────────────────────────────────
  if (input.regression?.baselineFound) {
    if (input.regression.regressed && input.regression.severity) {
      const sev = input.regression.severity;
      const regConf = input.regression.regressionConfidence;
      const source = input.regression.regressionConfidenceSource;
      const degraded = input.regression.deltas.filter(d => d.direction === 'degraded');
      
      sections.push(`\n### ${severityEmoji(sev)} Regression Detected\n`);
      sections.push(`- **Regression Severity**: ${sev.toUpperCase()}`);
      if (regConf) sections.push(`- **Regression Confidence**: ${regConf}`);
      if (source) sections.push(`- **Confidence Source**: ${source}`);
      if (input.regression.trendIndicators?.regressionConfidenceTrend) {
        sections.push(`- **Confidence Trend**: ${input.regression.trendIndicators.regressionConfidenceTrend.toUpperCase()}`);
      }
      sections.push('');

      sections.push('| Field | Previous | Current | Delta |');
      sections.push('|---|---|---|---|');
      for (const d of degraded) {
        const delta = typeof d.previous === 'number' && typeof d.current === 'number'
          ? (d.current as number - (d.previous as number)).toFixed(4)
          : '—';
        sections.push(`| ${d.field} | ${d.previous} | ${d.current} | ${delta} |`);
      }
    } else {
      const improved = input.regression.deltas.filter(d => d.direction === 'improved');
      if (improved.length > 0) {
        sections.push(`\n### ⬆️ Architecture Improvements\n`);
        sections.push('| Field | Previous | Current | Delta |');
        sections.push('|---|---|---|---|');
        for (const d of improved) {
          const delta = typeof d.previous === 'number' && typeof d.current === 'number'
            ? (d.current as number - (d.previous as number)).toFixed(4)
            : '—';
          sections.push(`| ${d.field} | ${d.previous} | ${d.current} | ${delta} |`);
        }
      }
    }

    // Trend indicators
    if (input.regression.trendIndicators) {
      const ti = input.regression.trendIndicators;
      sections.push(`\n<details>\n<summary>Trend Indicators</summary>\n`);
      sections.push('| Metric | Trend |');
      sections.push('|---|---|');
      sections.push(`| Coverage | ${trendArrow(ti.coverageTrend)} ${ti.coverageTrend} |`);
      sections.push(`| Connectivity | ${trendArrow(ti.connectivityTrend)} ${ti.connectivityTrend} |`);
      sections.push(`| Stability | ${trendArrow(ti.stabilityTrend)} ${ti.stabilityTrend} |`);
      sections.push(`| Confidence | ${trendArrow(ti.confidenceTrend)} ${ti.confidenceTrend} |`);
      sections.push(`| Crossings | ${trendArrow(ti.crossingTrend)} ${ti.crossingTrend} |`);
      sections.push(`| Regression Confidence | ${trendArrow(ti.regressionConfidenceTrend)} ${ti.regressionConfidenceTrend} |`);
      if (ti.confidenceSourceTrend) {
        // Just visual row if present
        sections.push(`| Confidence Source | → ${ti.confidenceSourceTrend} |`);
      }
      sections.push('\n</details>');
    }
  }

  // ── Domain Distribution ───────────────────────────────
  const activeDomains = Object.entries(input.domainDistribution).filter(([, c]) => c > 0);
  if (activeDomains.length > 0) {
    sections.push(`\n<details>\n<summary>Domain Distribution</summary>\n`);
    sections.push('| Domain | Count |');
    sections.push('|---|---|');
    for (const [domain, count] of activeDomains) {
      sections.push(`| ${domain} | ${count} |`);
    }
    sections.push('\n</details>');
  }

  // ── Observed Crossings ────────────────────────────────
  if (input.crossings.length > 0) {
    sections.push(`\n<details>\n<summary>Observed Crossings (${input.crossings.length})</summary>\n`);
    sections.push('| Source | Target | Domain |');
    sections.push('|---|---|---|');
    for (const c of input.crossings.slice(0, 15)) {
      sections.push(`| ${c.source_entity} | ${c.target_entity} | ${c.authority_domain} |`);
    }
    if (input.crossings.length > 15) {
      sections.push(`\n*... and ${input.crossings.length - 15} more*`);
    }
    sections.push('\n</details>');
  }

  // ── Warnings ──────────────────────────────────────────
  if (input.warnings.length > 0) {
    sections.push(`\n### ⚠️ Warnings\n`);
    for (const w of input.warnings) {
      sections.push(`- ${w}`);
    }
  }

  // ── Stability Components ──────────────────────────────
  sections.push(`\n<details>\n<summary>Stability Components</summary>\n`);
  sections.push('| Component | Value |');
  sections.push('|---|---|');
  sections.push(`| Agreement Ratio | ${(input.components.agreement_ratio * 100).toFixed(1)}% |`);
  sections.push(`| Confidence Variance | ${input.components.confidence_variance.toFixed(4)} |`);
  sections.push(`| Conflict Rate | ${(input.components.conflict_rate * 100).toFixed(1)}% |`);
  sections.push(`| Authority Coverage | ${(input.components.authority_coverage * 100).toFixed(1)}% |`);
  sections.push('\n</details>');

  // ── Execution Telemetry ───────────────────────────────
  sections.push(`\n<details>\n<summary>Execution Telemetry</summary>\n`);
  sections.push('| Phase | Duration |');
  sections.push('|---|---|');
  sections.push(`| Extraction | ${input.executionMetrics.extractionMs}ms |`);
  sections.push(`| Pipeline | ${input.executionMetrics.pipelineMs}ms |`);
  sections.push(`| Total | ${input.executionMetrics.totalMs}ms |`);
  sections.push('\n</details>');

  // ── Footer ────────────────────────────────────────────
  sections.push(`\n---\n*Generated by [arch-engine/check-boundaries](https://github.com/arch-engine/check-boundaries) • ${tier} • ${confLabel}*`);

  // ── Machine-Readable JSON Block ───────────────────────
  const summaryJSON = buildSummaryJSON(input);
  sections.push('\n<!-- ARCH_ENGINE_SUMMARY_JSON_START -->');
  sections.push(`<!-- ${JSON.stringify(summaryJSON)} -->`);
  sections.push('<!-- ARCH_ENGINE_SUMMARY_JSON_END -->');

  return sections.join('\n');
}

// ─── Machine-Readable Block Builder ─────────────────────

export function buildSummaryJSON(input: SummaryInput): SummaryJSON {
  const json: SummaryJSON = {
    summarySchemaVersion: SUMMARY_SCHEMA_VERSION,
    artifactCompatibilityVersion: '1.0',
    workspaceType: input.workspaceType,
    extractionMode: input.extractionMode,
    stabilityTier: input.tier,
    stabilityScore: Number(input.score.toFixed(4)),
    coverage: Number(input.coverage.toFixed(4)),
    connectivity: Number(input.connectivity.toFixed(4)),
    topologyConfidenceLabel: input.confLabel,
    topologyConfidence: Number(input.topologyConfidence.toFixed(4)),
    authorityCrossings: input.crossingCount,
    detectedNodes: input.detectedNodes,
    expectedNodes: input.expectedNodes,
    regressionSeverity: input.regression?.severity ?? null,
    regressionConfidence: input.regression?.regressionConfidence ?? null,
    regressionConfidenceSource: input.regression?.regressionConfidenceSource ?? null,
    trendIndicators: input.regression?.trendIndicators ?? null,
    lineageDepth: input.regression?.comparisonBaseline?.lineageDepth ?? null,
    warnings: input.warnings.length,
    executionMs: input.executionMetrics.totalMs,
  };

  if (input.policyEval) {
    json.policyViolations = input.policyEval.violations.length;
    json.policyMode = input.policyEval.policyMode;
    json.policyVersion = input.policyEval.policyVersion;
    json.policyHash = input.policyEval.policyHash;
    json.evaluationStrategyVersion = input.policyEval.evaluationStrategyVersion;
    json.policyDetected = input.policyEval.policyDetected;
    json.policyRuleHits = input.policyEval.policyRuleHits;
  } else {
    json.policyViolations = 0;
    json.policyDetected = input.policyExists;
  }

  return json;
}
