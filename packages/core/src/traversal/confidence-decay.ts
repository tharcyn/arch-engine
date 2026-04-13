/**
 * ═══════════════════════════════════════════════════════════
 *  Distance-Aware Traversal Confidence Decay — Phase 2.6
 * ═══════════════════════════════════════════════════════════
 *
 *  Applies distance-based confidence attenuation during
 *  graph traversal. Deeper traversal → lower confidence.
 *
 *  Side-car only: does NOT replace existing traversal.
 *
 *  Strategies:
 *    none          — no decay (backward compat)
 *    linear        — fixed penalty per depth step
 *    exponential   — multiplicative penalty per depth step
 *    stepped       — threshold-based decay bands
 *    custom        — user-provided decay function
 *
 *  Forward-portable to: @arch-engine/core/traversal
 */

// ─── Decay Strategy ─────────────────────────────────────

export type DecayStrategy = 'none' | 'linear' | 'exponential' | 'stepped' | 'custom';

// ─── Decay Config ───────────────────────────────────────

export interface LinearDecayConfig {
  strategy: 'linear';
  /** Depth at which decay starts (1-indexed) */
  decay_start_depth: number;
  /** Confidence penalty per step beyond start depth */
  penalty_per_step: number;
  /** Minimum confidence floor */
  floor: number;
}

export interface ExponentialDecayConfig {
  strategy: 'exponential';
  /** Depth at which decay starts */
  decay_start_depth: number;
  /** Decay factor per step (0 < factor < 1, applied multiplicatively) */
  decay_factor: number;
  /** Minimum confidence floor */
  floor: number;
}

export interface SteppedDecayConfig {
  strategy: 'stepped';
  /** Decay bands: [depth_from, depth_to, penalty] */
  bands: Array<{
    from_depth: number;
    to_depth: number;
    penalty: number;
  }>;
  /** Penalty for depths beyond all defined bands */
  overflow_penalty: number;
  /** Minimum confidence floor */
  floor: number;
}

export interface CustomDecayConfig {
  strategy: 'custom';
  /** Custom decay function: (baseConfidence, depth) → adjustedConfidence */
  decayFn: (baseConfidence: number, depth: number) => number;
}

export interface NoDecayConfig {
  strategy: 'none';
}

export type TraversalConfidenceDecayConfig =
  | NoDecayConfig
  | LinearDecayConfig
  | ExponentialDecayConfig
  | SteppedDecayConfig
  | CustomDecayConfig;

export const DEFAULT_DECAY_CONFIG: SteppedDecayConfig = {
  strategy: 'stepped',
  bands: [
    { from_depth: 1, to_depth: 2, penalty: 0.00 },
    { from_depth: 3, to_depth: 4, penalty: 0.05 },
    { from_depth: 5, to_depth: 6, penalty: 0.10 },
  ],
  overflow_penalty: 0.15,
  floor: 0.20,
};

// ─── Decay Result ───────────────────────────────────────

export interface DecayResult {
  /** Original (pre-decay) confidence */
  original_confidence: number;

  /** Adjusted (post-decay) confidence */
  decayed_confidence: number;

  /** Traversal depth */
  depth: number;

  /** Decay strategy used */
  strategy: DecayStrategy;

  /** Penalty applied */
  penalty_applied: number;

  /** Whether decay was actually applied */
  decay_applied: boolean;
}

// ─── Decay Engine ───────────────────────────────────────

/**
 * Compute distance-aware confidence for a single traversal
 * at a given depth.
 *
 * @param baseConfidence  The edge or path confidence score
 * @param depth           Traversal depth (1-indexed)
 * @param config          Decay configuration
 * @returns               Decay result
 */
export function computeDistanceAwareConfidence(
  baseConfidence: number,
  depth: number,
  config: TraversalConfidenceDecayConfig = DEFAULT_DECAY_CONFIG,
): DecayResult {
  if (config.strategy === 'none') {
    return {
      original_confidence: baseConfidence,
      decayed_confidence: baseConfidence,
      depth,
      strategy: 'none',
      penalty_applied: 0,
      decay_applied: false,
    };
  }

  let penalty = 0;
  let floor = 0;

  switch (config.strategy) {
    case 'linear': {
      const c = config as LinearDecayConfig;
      floor = c.floor;
      if (depth > c.decay_start_depth) {
        const stepsDecayed = depth - c.decay_start_depth;
        penalty = stepsDecayed * c.penalty_per_step;
      }
      break;
    }

    case 'exponential': {
      const c = config as ExponentialDecayConfig;
      floor = c.floor;
      if (depth > c.decay_start_depth) {
        const stepsDecayed = depth - c.decay_start_depth;
        // Multiplicative decay: confidence × factor^steps
        const multiplier = Math.pow(c.decay_factor, stepsDecayed);
        const decayed = baseConfidence * multiplier;
        const result = Math.max(floor, decayed);
        return {
          original_confidence: baseConfidence,
          decayed_confidence: Number(result.toFixed(4)),
          depth,
          strategy: 'exponential',
          penalty_applied: Number((baseConfidence - result).toFixed(4)),
          decay_applied: result !== baseConfidence,
        };
      }
      break;
    }

    case 'stepped': {
      const c = config as SteppedDecayConfig;
      floor = c.floor;
      let matched = false;
      for (const band of c.bands) {
        if (depth >= band.from_depth && depth <= band.to_depth) {
          penalty = band.penalty;
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Beyond all defined bands
        const maxBandDepth = c.bands.reduce((max, b) => Math.max(max, b.to_depth), 0);
        if (depth > maxBandDepth) {
          penalty = c.overflow_penalty;
        }
      }
      break;
    }

    case 'custom': {
      const c = config as CustomDecayConfig;
      const result = c.decayFn(baseConfidence, depth);
      return {
        original_confidence: baseConfidence,
        decayed_confidence: Number(result.toFixed(4)),
        depth,
        strategy: 'custom',
        penalty_applied: Number((baseConfidence - result).toFixed(4)),
        decay_applied: result !== baseConfidence,
      };
    }
  }

  const decayed = Math.max(floor, baseConfidence - penalty);

  return {
    original_confidence: baseConfidence,
    decayed_confidence: Number(decayed.toFixed(4)),
    depth,
    strategy: config.strategy,
    penalty_applied: Number(penalty.toFixed(4)),
    decay_applied: penalty > 0,
  };
}

/**
 * Apply distance-aware decay to a full traversal path.
 * Each hop accumulates decay based on its depth.
 */
export function computePathDecay(
  edgeConfidences: number[],
  config: TraversalConfidenceDecayConfig = DEFAULT_DECAY_CONFIG,
): {
  per_hop: DecayResult[];
  path_confidence: number;
  min_decayed_confidence: number;
} {
  const perHop = edgeConfidences.map((conf, i) =>
    computeDistanceAwareConfidence(conf, i + 1, config),
  );

  const decayedScores = perHop.map(r => r.decayed_confidence);
  const pathConfidence = decayedScores.length > 0
    ? Math.min(...decayedScores)
    : 1.0;

  return {
    per_hop: perHop,
    path_confidence: Number(pathConfidence.toFixed(4)),
    min_decayed_confidence: decayedScores.length > 0
      ? Math.min(...decayedScores)
      : 1.0,
  };
}
