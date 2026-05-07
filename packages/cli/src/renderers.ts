/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Shared Rendering Utilities
 * ═══════════════════════════════════════════════════════════
 *
 *  Pure functions consumed by CLI commands, GitHub Action,
 *  and artifact writer. No side effects. No I/O.
 */

import pc from 'picocolors';
import type { ExtractionMetadata, AuthorityDomain } from '@arch-engine/adapter-monorepo';

// ─── Stability Tier Classification ──────────────────────

export type StabilityTier = 'STABLE' | 'HEALTHY' | 'WARNING' | 'CRITICAL';

export interface StabilityClassification {
  tier: StabilityTier;
  score: number;
  color: (s: string) => string;
}

export function classifyStability(score: number): StabilityClassification {
  if (score >= 0.90) return { tier: 'STABLE', score, color: pc.green };
  if (score >= 0.75) return { tier: 'HEALTHY', score, color: pc.green };
  if (score >= 0.50) return { tier: 'WARNING', score, color: pc.yellow };
  return { tier: 'CRITICAL', score, color: pc.red };
}

// ─── Headline Calibration ──────────────────────────────
//
// Per the CLI Experience Specification §5.3 and §5.4, a headline
// classification must be calibrated to reality:
//
// - When no policy file is configured, the run is "no-policy" — the score
//   collapses against synthetic zero baselines and is not meaningful. Render
//   a neutral headline; do not show the negative tier.
// - When coverage / detected-nodes are too small to evaluate, the run is
//   "low-signal" — render a warning headline; do not show the negative tier.
// - Otherwise, render the actual stability tier from the score.

export type AnalysisHeadlineKind = 'no-policy' | 'low-signal' | 'tier';

export interface AnalysisHeadline {
  readonly kind: AnalysisHeadlineKind;
  readonly text: string;
  readonly color: (s: string) => string;
}

export interface AnalysisHeadlineContext {
  readonly score: number;
  readonly meta: ExtractionMetadata;
  readonly policyConfigured: boolean;
}

export function deriveAnalysisHeadline(ctx: AnalysisHeadlineContext): AnalysisHeadline {
  const { score, meta, policyConfigured } = ctx;
  if (!policyConfigured) {
    return {
      kind: 'no-policy',
      text: 'No policy configured — topology captured but not evaluated.',
      color: pc.dim,
    };
  }
  if (meta.coverage < 0.30 || meta.detectedNodes < 2) {
    return {
      kind: 'low-signal',
      text: 'Topology captured with low signal — score not graded.',
      color: pc.yellow,
    };
  }
  const cls = classifyStability(score);
  return {
    kind: 'tier',
    text: `Stability: ${cls.tier} (${score.toFixed(2)} / 1.00)`,
    color: cls.color,
  };
}

// ─── Confidence Label Mapping ───────────────────────────

export type ConfidenceLabel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';

export function classifyConfidence(confidence: number): ConfidenceLabel {
  if (confidence >= 0.85) return 'HIGH';
  if (confidence >= 0.65) return 'MODERATE';
  if (confidence >= 0.40) return 'LOW';
  return 'VERY_LOW';
}

export function confidenceDescription(meta: ExtractionMetadata): string {
  const label = classifyConfidence(meta.topologyConfidence);
  if (meta.extractionMode === 'structured') {
    return `${label} (Structured ${meta.workspaceType} workspace extraction)`;
  }
  return `${label} (Fallback directory scan — coverage estimate may be coarse)`;
}

// ─── Quality Floor Detection ────────────────────────────

export interface QualityFloorResult {
  belowFloor: boolean;
  message: string | null;
}

export function checkQualityFloor(meta: ExtractionMetadata): QualityFloorResult {
  if (meta.coverage < 0.30 || meta.detectedNodes < 2) {
    return {
      belowFloor: true,
      message:
        'Topology extraction succeeded but signal quality is too low for reliable conclusions. ' +
        `Coverage: ${(meta.coverage * 100).toFixed(0)}%, Nodes: ${meta.detectedNodes}.`,
    };
  }
  return { belowFloor: false, message: null };
}

// ─── Domain Distribution Counter ────────────────────────

export type DomainDistribution = Record<AuthorityDomain, number>;

export function countDomainDistribution(
  packages: Array<{ authorityDomain: AuthorityDomain }>,
): DomainDistribution {
  const dist: DomainDistribution = {
    APPLICATION: 0,
    SERVICE: 0,
    LIBRARY: 0,
    FOUNDATION: 0,
    INFRASTRUCTURE: 0,
    UNCLASSIFIED: 0,
  };
  for (const pkg of packages) {
    dist[pkg.authorityDomain] = (dist[pkg.authorityDomain] ?? 0) + 1;
  }
  return dist;
}

// ─── Warning Formatter ──────────────────────────────────

export function formatWarnings(warnings: string[], useColor: boolean = true): string[] {
  if (warnings.length === 0) return [];
  const prefix = useColor ? pc.yellow('⚠') : '⚠';
  return warnings.map(w => `  ${prefix} ${w}`);
}

export function formatWarningHeader(count: number, useColor: boolean = true): string {
  if (count === 0) return useColor ? pc.green('✔ No warnings') : '✔ No warnings';
  const label = `${count} warning(s):`;
  return useColor ? pc.yellow(label) : label;
}

// ─── Domain Classification Integrity Check ──────────────

export interface DomainIntegrityResult {
  degraded: boolean;
  unclassifiedRatio: number;
  message: string | null;
}

export function checkDomainIntegrity(dist: DomainDistribution): DomainIntegrityResult {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) return { degraded: false, unclassifiedRatio: 0, message: null };

  const ratio = dist.UNCLASSIFIED / total;
  if (ratio > 0.40) {
    return {
      degraded: true,
      unclassifiedRatio: ratio,
      message:
        `High proportion of topology remains unclassified (${(ratio * 100).toFixed(0)}%). ` +
        'Consider adding adapter hints or policy domains.',
    };
  }
  return { degraded: false, unclassifiedRatio: ratio, message: null };
}
