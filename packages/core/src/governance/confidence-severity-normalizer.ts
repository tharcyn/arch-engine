/**
 * ═══════════════════════════════════════════════════════════
 *  Confidence-Aware Severity Normalizer — Phase 2.6
 * ═══════════════════════════════════════════════════════════
 *
 *  Transforms static violation severities into confidence-
 *  weighted severities. Low-confidence edges produce lower-
 *  severity violations; high-confidence edges preserve the
 *  original severity.
 *
 *  Default: disabled (backward compatible).
 *  Enable via: config.confidenceSeverityScaling = true
 *
 *  Forward-portable to: @arch-engine/core/enforcement
 */

// ─── Severity Taxonomy (matches enforcement-engine) ─────

export type Severity = 'BLOCKER' | 'CRITICAL' | 'WARNING' | 'INFO';

const SEVERITY_ORDER: Severity[] = ['INFO', 'WARNING', 'CRITICAL', 'BLOCKER'];

// ─── Adjustment Strategies ──────────────────────────────

export type SeverityAdjustmentStrategy =
  | 'threshold_downgrade'   // Step-function: below threshold → downgrade N levels
  | 'weighted_downgrade'    // Continuous: severity drops proportional to confidence gap
  | 'pack_specific'         // Per-pack adjustment thresholds
  | 'gate_specific';        // Per-gate adjustment thresholds

// ─── Configuration ──────────────────────────────────────

export interface ThresholdDowngradeConfig {
  strategy: 'threshold_downgrade';
  /** Below this score: downgrade 1 severity level */
  downgrade_threshold: number;
  /** Below this score: downgrade 2 severity levels */
  double_downgrade_threshold: number;
}

export interface WeightedDowngradeConfig {
  strategy: 'weighted_downgrade';
  /** Confidence floor below which maximum downgrade applies */
  floor: number;
  /** Confidence ceiling above which no downgrade applies */
  ceiling: number;
  /** Maximum downgrade levels (1 or 2) */
  max_downgrade: number;
}

export interface PackSpecificConfig {
  strategy: 'pack_specific';
  /** Per-pack threshold overrides */
  pack_thresholds: Record<string, {
    downgrade_threshold: number;
    double_downgrade_threshold: number;
  }>;
  /** Fallback for unlisted packs */
  default_threshold: number;
  default_double_threshold: number;
}

export interface GateSpecificConfig {
  strategy: 'gate_specific';
  /** Per-gate threshold overrides */
  gate_thresholds: Record<string, {
    downgrade_threshold: number;
    double_downgrade_threshold: number;
  }>;
  /** Fallback for unlisted gates */
  default_threshold: number;
  default_double_threshold: number;
}

export type SeverityScalingConfig =
  | ThresholdDowngradeConfig
  | WeightedDowngradeConfig
  | PackSpecificConfig
  | GateSpecificConfig;

// ─── Master Config ──────────────────────────────────────

export interface ConfidenceSeverityConfig {
  /** Master switch: false = no adjustment (backward compatible) */
  enabled: boolean;

  /** Adjustment strategy configuration */
  scaling: SeverityScalingConfig;
}

export const DEFAULT_CONFIG: ConfidenceSeverityConfig = {
  enabled: false,
  scaling: {
    strategy: 'threshold_downgrade',
    downgrade_threshold: 0.60,
    double_downgrade_threshold: 0.40,
  },
};

// ─── Adjustment Result ──────────────────────────────────

export interface SeverityAdjustmentResult {
  original_severity: Severity;
  adjusted_severity: Severity;
  confidence_score: number;
  strategy: SeverityAdjustmentStrategy;
  downgrade_levels: number;
  reason: string;
}

// ─── Core Functions ─────────────────────────────────────

function downgrade(severity: Severity, levels: number): Severity {
  const idx = SEVERITY_ORDER.indexOf(severity);
  const newIdx = Math.max(0, idx - levels);
  return SEVERITY_ORDER[newIdx];
}

/**
 * Adjust a violation's severity based on edge confidence.
 *
 * @param originalSeverity  The static severity from the gate
 * @param confidenceScore   The confidence score of the evidence
 * @param config            Scaling configuration
 * @param context           Optional gate/pack context for specific strategies
 * @returns                 Adjustment result
 */
export function adjustSeverity(
  originalSeverity: Severity,
  confidenceScore: number,
  config: ConfidenceSeverityConfig = DEFAULT_CONFIG,
  context?: { gate_id?: string; pack_id?: string },
): SeverityAdjustmentResult {
  // Guard: disabled means no adjustment
  if (!config.enabled) {
    return {
      original_severity: originalSeverity,
      adjusted_severity: originalSeverity,
      confidence_score: confidenceScore,
      strategy: config.scaling.strategy,
      downgrade_levels: 0,
      reason: 'confidence_severity_scaling_disabled',
    };
  }

  let levels = 0;
  let reason = '';

  switch (config.scaling.strategy) {
    case 'threshold_downgrade': {
      const s = config.scaling as ThresholdDowngradeConfig;
      if (confidenceScore < s.double_downgrade_threshold) {
        levels = 2;
        reason = `confidence ${confidenceScore} < double_downgrade_threshold ${s.double_downgrade_threshold}`;
      } else if (confidenceScore < s.downgrade_threshold) {
        levels = 1;
        reason = `confidence ${confidenceScore} < downgrade_threshold ${s.downgrade_threshold}`;
      } else {
        reason = `confidence ${confidenceScore} >= threshold ${s.downgrade_threshold}`;
      }
      break;
    }

    case 'weighted_downgrade': {
      const s = config.scaling as WeightedDowngradeConfig;
      if (confidenceScore >= s.ceiling) {
        levels = 0;
        reason = `confidence ${confidenceScore} >= ceiling ${s.ceiling}`;
      } else if (confidenceScore <= s.floor) {
        levels = s.max_downgrade;
        reason = `confidence ${confidenceScore} <= floor ${s.floor}`;
      } else {
        const range = s.ceiling - s.floor;
        const deficit = s.ceiling - confidenceScore;
        const ratio = deficit / range;
        levels = Math.round(ratio * s.max_downgrade);
        reason = `weighted: ${confidenceScore} in [${s.floor}, ${s.ceiling}] → ${levels} levels`;
      }
      break;
    }

    case 'pack_specific': {
      const s = config.scaling as PackSpecificConfig;
      const packId = context?.pack_id || '';
      const thresholds = s.pack_thresholds[packId] || {
        downgrade_threshold: s.default_threshold,
        double_downgrade_threshold: s.default_double_threshold,
      };
      if (confidenceScore < thresholds.double_downgrade_threshold) {
        levels = 2;
        reason = `pack ${packId}: confidence < ${thresholds.double_downgrade_threshold}`;
      } else if (confidenceScore < thresholds.downgrade_threshold) {
        levels = 1;
        reason = `pack ${packId}: confidence < ${thresholds.downgrade_threshold}`;
      } else {
        reason = `pack ${packId}: confidence meets threshold`;
      }
      break;
    }

    case 'gate_specific': {
      const s = config.scaling as GateSpecificConfig;
      const gateId = context?.gate_id || '';
      const thresholds = s.gate_thresholds[gateId] || {
        downgrade_threshold: s.default_threshold,
        double_downgrade_threshold: s.default_double_threshold,
      };
      if (confidenceScore < thresholds.double_downgrade_threshold) {
        levels = 2;
        reason = `gate ${gateId}: confidence < ${thresholds.double_downgrade_threshold}`;
      } else if (confidenceScore < thresholds.downgrade_threshold) {
        levels = 1;
        reason = `gate ${gateId}: confidence < ${thresholds.downgrade_threshold}`;
      } else {
        reason = `gate ${gateId}: confidence meets threshold`;
      }
      break;
    }
  }

  return {
    original_severity: originalSeverity,
    adjusted_severity: downgrade(originalSeverity, levels),
    confidence_score: confidenceScore,
    strategy: config.scaling.strategy,
    downgrade_levels: levels,
    reason,
  };
}

/**
 * Batch-adjust an array of violation-like objects.
 * Returns a new array with added confidence severity metadata.
 * Does NOT mutate the input violations.
 */
export function batchAdjustSeverities(
  violations: Array<{
    severity: Severity;
    entity: string;
    gate: string;
    confidence_score?: number;
  }>,
  config: ConfidenceSeverityConfig = DEFAULT_CONFIG,
): Array<{
  original: typeof violations[number];
  adjustment: SeverityAdjustmentResult;
}> {
  return violations.map(v => ({
    original: v,
    adjustment: adjustSeverity(
      v.severity,
      v.confidence_score ?? 0.75,
      config,
      { gate_id: v.gate },
    ),
  }));
}
