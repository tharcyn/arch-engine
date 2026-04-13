/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/core/analysis
 * ═══════════════════════════════════════════════════════════
 *
 *  Impact simulation, taxonomy, and graph mutation confidence 
 *  subsystems.
 */

export {
  CONFIDENCE_SCORE_MAP,
  classifyEdgeConfidence,
  higherConfidence,
  getConfidenceScore,
  MUTATION_WEIGHTING_COEFFICIENTS,
  isWriteMutation,
  isReadOnly,
  isAuthoritySensitive,
  isMutationEdge,
  isConcreteMutationSubtype,
  isAsyncMutation
} from '../confidence/edge-confidence';

export {
  ImpactSimulator
} from '../traversal/impact-simulator';

export {
  computeDistanceAwareConfidence
} from '../traversal/confidence-decay';
