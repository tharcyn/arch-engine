/**
 * Phase 7 Objective 9: Execution Runtime Capability Descriptor
 *
 * Export detailed execution behavior rules to support multi-cluster
 * federation capability negotiations. Allows safe protocol upgrades.
 */

export const EXECUTION_RUNTIME_CAPABILITIES_VERSION = 'v1';

/**
 * Phase 8.9 C-4 FIX: Object.freeze at declaration ensures runtime
 * immutability. `as const` alone is compile-time only.
 */
export const EXECUTION_RUNTIME_CAPABILITIES = Object.freeze({
  /** Execution runtime version */
  version: 7,
  deterministicExecutionOrdering: true,
  replayStableEvaluation: true,
  annotationAggregationSupported: true,
  fallbackTerminationSupported: true,
  namespaceOverridePropagation: true,
  trustOverridePropagation: true,
  explainabilityEmissionSupported: true
});

export type ExecutionRuntimeCapabilities = typeof EXECUTION_RUNTIME_CAPABILITIES;
