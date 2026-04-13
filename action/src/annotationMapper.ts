/**
 * ═══════════════════════════════════════════════════════════
 *  PR Annotation Engine — Signal-to-Annotation Mapper
 * ═══════════════════════════════════════════════════════════
 *
 *  Week 5.5: Extended with regression-severity-aware mapping.
 *
 *  Translates architecture signals into GitHub Actions
 *  ::error / ::warning / ::notice annotations that surface
 *  directly inside the PR review UI.
 *
 *  Severity-to-annotation mapping:
 *    critical → ::error
 *    major    → ::warning
 *    moderate → ::notice
 *    minor    → ::notice
 */

import type { RegressionResult, RegressionSeverity } from './regressionDetector.js';
import type { PolicyEvaluationResult } from '@arch-engine/core';

// ─── Annotation Types ───────────────────────────────────

export type AnnotationLevel = 'error' | 'warning' | 'notice';

export interface Annotation {
  level: AnnotationLevel;
  message: string;
  file?: string;
  line?: number;
}

// ─── Tier/Label Classifiers ─────────────────────────────

type StabilityTier = 'STABLE' | 'HEALTHY' | 'WARNING' | 'CRITICAL';
type ConfidenceLabel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';

function classifyConfidence(c: number): ConfidenceLabel {
  if (c >= 0.85) return 'HIGH';
  if (c >= 0.65) return 'MODERATE';
  if (c >= 0.40) return 'LOW';
  return 'VERY_LOW';
}

// ─── Severity-to-Level Mapping ──────────────────────────

export function severityToAnnotationLevel(severity: RegressionSeverity): AnnotationLevel {
  switch (severity) {
    case 'critical': return 'error';
    case 'major': return 'warning';
    case 'moderate': return 'notice';
    case 'minor': return 'notice';
    default: return 'notice';
  }
}

// ─── Crossing Info ──────────────────────────────────────

export interface CrossingEntry {
  source_entity: string;
  target_entity: string;
  authority_domain: string;
  crossing_type?: string;
  confidence?: number;
}

// ─── Annotation Mapper ──────────────────────────────────

export interface AnnotationMapperInput {
  meta: ExtractionMetadata;
  stabilityTier: StabilityTier;
  stabilityScore: number;
  crossings: CrossingEntry[];
  crossingCount: number;
  blockerCount: number;
  domainDistribution: Record<string, number>;
  regression: RegressionResult | null;
  config: {
    minCoverage: number;
    failOnFallback: boolean;
    failOnWarnings: boolean;
    failOnRegression: boolean;
  };
  policyEval: PolicyEvaluationResult | null; 
  executionMetrics: {
    extractionMs: number;
    pipelineMs: number;
    totalMs: number;
  };
}

/**
 * Map architecture signals to GitHub annotation commands.
 * Includes severity-aware regression annotations with delta values.
 */
export function mapAnnotations(input: AnnotationMapperInput): Annotation[] {
  const annotations: Annotation[] = [];
  const { meta, config } = input;
  const confLabel = classifyConfidence(meta.topologyConfidence);

  // ── ERROR annotations ─────────────────────────────────

  // Coverage threshold breach
  if (config.minCoverage > 0 && meta.coverage < config.minCoverage) {
    annotations.push({
      level: 'error',
      message: `Coverage (${(meta.coverage * 100).toFixed(0)}%) is below threshold (${(config.minCoverage * 100).toFixed(0)}%)`,
    });
  }

  // Fallback mode (if gated)
  if (config.failOnFallback && meta.extractionMode === 'fallback_directory_scan') {
    annotations.push({
      level: 'error',
      message: 'Workspace detection fell back to directory scan mode (fail-on-fallback-mode enabled)',
    });
  }

  // Pipeline blocker violations
  if (input.blockerCount > 0) {
    annotations.push({
      level: 'error',
      message: `${input.blockerCount} BLOCKER authority violation(s) detected`,
    });
  }

  // ── POLICY annotations ────────────────────────────────
  if (input.policyEval && input.policyEval.violations.length > 0) {
    for (const v of input.policyEval.violations) {
      const level = input.policyEval.policyMode === 'enforce' ? 
        (v.severity === 'warning' ? 'warning' : 'error') : 
        'notice';
      
      const ruleText = v.ruleId ? `${v.ruleSource} (${v.ruleId})` : v.ruleSource;
      let msg = `Policy violation [${v.violationCategory}]: ${v.from} → ${v.to} forbidden by ${ruleText} (${v.confidenceContext} confidence)`;
      
      if (v.originPolicyChain && v.originPolicyChain.length > 0) {
        msg += ` | Chain: ${v.originPolicyChain.join(' → ')}`;
      } else if (v.originPolicyId) {
        msg += ` | Origin: ${v.originPolicyId}`;
      }
      if (v.mergeAuthority) msg += ` | Authority: ${v.mergeAuthority}`;
      
      annotations.push({
        level,
        message: msg,
        file: v.from, // map source entity as file if possible
      });
    }
  }

  // ── REGRESSION annotations (severity-aware) ───────────

  if (input.regression?.regressed && input.regression.severity) {
    const sev = input.regression.severity;
    const regConf = input.regression.regressionConfidence;
    const level = config.failOnRegression
      ? 'error' // Always error when gated
      : severityToAnnotationLevel(sev);

    // Main regression annotation — always includes confidence context
    const confContext = regConf
      ? (regConf !== 'HIGH' && input.regression.regressionConfidenceSource)
        ? `, ${regConf} confidence — ${input.regression.regressionConfidenceSource}`
        : `, ${regConf} confidence`
      : '';
    annotations.push({
      level,
      message: `Architecture regression detected (${sev} severity${confContext}): ${input.regression.summary}`,
    });

    // Per-field delta annotations for degraded fields
    const degraded = input.regression.deltas.filter(d => d.direction === 'degraded');
    for (const d of degraded) {
      const deltaMsg = typeof d.previous === 'number' && typeof d.current === 'number'
        ? `${d.field} dropped from ${(d.previous as number).toFixed(4)} → ${(d.current as number).toFixed(4)}`
        : `${d.field} changed from ${d.previous} → ${d.current}`;

      annotations.push({
        level: sev === 'critical' || sev === 'major' ? 'warning' : 'notice',
        message: deltaMsg,
      });
    }

    // Authority crossing trend
    if (input.regression.authorityCrossingDelta !== null && input.regression.authorityCrossingDelta > 0) {
      annotations.push({
        level: 'warning',
        message: `Authority crossings increased by ${input.regression.authorityCrossingDelta} (${input.regression.crossingTrend} trend)`,
      });
    }
  }

  // ── WARNING annotations ───────────────────────────────

  // Authority crossings
  for (const crossing of input.crossings.slice(0, 10)) {
    annotations.push({
      level: 'warning',
      message: `Observed crossing: ${crossing.source_entity} → ${crossing.target_entity} [${crossing.authority_domain}]`,
    });
  }

  // UNCLASSIFIED domain > 40%
  const total = Object.values(input.domainDistribution).reduce((a, b) => a + b, 0);
  if (total > 0) {
    const unclassifiedRatio = (input.domainDistribution['UNCLASSIFIED'] ?? 0) / total;
    if (unclassifiedRatio > 0.40) {
      annotations.push({
        level: 'warning',
        message: `High proportion of topology is UNCLASSIFIED (${(unclassifiedRatio * 100).toFixed(0)}%). Consider adding adapter hints.`,
      });
    }
  }

  // Confidence downgrade
  if (confLabel === 'LOW' || confLabel === 'VERY_LOW') {
    annotations.push({
      level: 'warning',
      message: `Topology confidence is ${confLabel} (${meta.topologyConfidence.toFixed(2)}). Extraction mode: ${meta.extractionMode}.`,
    });
  }

  // Extraction warnings
  for (const w of meta.warnings) {
    annotations.push({ level: 'warning', message: w });
  }

  // ── NOTICE annotations ────────────────────────────────

  // Workspace detection
  annotations.push({
    level: 'notice',
    message: `Workspace resolved as: ${meta.workspaceType} (${meta.extractionMode})`,
  });

  // Confidence HIGH
  if (confLabel === 'HIGH') {
    annotations.push({
      level: 'notice',
      message: `Topology confidence: ${confLabel} (${meta.topologyConfidence.toFixed(2)})`,
    });
  }

  // Execution timing
  annotations.push({
    level: 'notice',
    message: `Extraction: ${input.executionMetrics.extractionMs}ms | Pipeline: ${input.executionMetrics.pipelineMs}ms | Total: ${input.executionMetrics.totalMs}ms`,
  });

  // Domain distribution summary
  const activeDomains = Object.entries(input.domainDistribution)
    .filter(([, c]) => c > 0)
    .map(([d, c]) => `${d}: ${c}`)
    .join(', ');
  if (activeDomains) {
    annotations.push({
      level: 'notice',
      message: `Domain distribution: ${activeDomains}`,
    });
  }

  return annotations;
}

/**
 * Emit annotations to GitHub Actions log.
 */
export function emitAnnotations(annotations: Annotation[]): void {
  for (const a of annotations) {
    const fileClause = a.file ? ` file=${a.file}` : '';
    const lineClause = a.line ? `,line=${a.line}` : '';
    console.log(`::${a.level}${fileClause}${lineClause}::${a.message}`);
  }
}
