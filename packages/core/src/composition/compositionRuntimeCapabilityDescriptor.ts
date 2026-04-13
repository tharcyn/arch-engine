/**
 * Phase 5 Objective 8: Composition Runtime Capability Descriptor
 *
 * Transport-safe export describing the specific capabilities and
 * backward-compatibility flags of this composition runtime version.
 * Used for future federation and multi-cluster mesh policy negotiation.
 */

/**
 * Phase 8.9 C-4 FIX: Object.freeze at declaration ensures runtime
 * immutability. `as const` alone is compile-time only.
 */
export const COMPOSITION_RUNTIME_CAPABILITIES = Object.freeze({
  /** Composition runtime version */
  version: 5,
  deterministicTierResolution: true,
  conflictSurfaceDetection: true,
  precedenceGraphPlanning: true,
  replayStableExecutionOrdering: true,
  plannerBoundaryCompliance: true
});

export type CompositionRuntimeCapabilities = typeof COMPOSITION_RUNTIME_CAPABILITIES;
