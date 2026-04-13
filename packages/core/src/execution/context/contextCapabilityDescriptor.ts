/**
 * Phase 8 Objective 5: Context Capability Descriptor
 *
 * Defines explicit logic integration support structures allowing transparent
 * feature federation negotiation between disconnected runtimes. Allows backwards-compatible upgrades.
 */

export const CONTEXT_CAPABILITY_DESCRIPTOR_VERSION = 'v1';

/**
 * Phase 8.9 C-4 FIX: Object.freeze at declaration ensures runtime
 * immutability. `as const` alone is compile-time only.
 */
export const CONTEXT_RUNTIME_CAPABILITIES = Object.freeze({
  /** Context engine version */
  version: 8,
  principalSignalsSupported: true,
  resourceSignalsSupported: true,
  tenantScopeSupported: true,
  environmentSignalsSupported: true,
  temporalSignalsSupported: true,
  trustAnchorSignalsSupported: true,
  featureFlagsSupported: true,
  customSignalsSupported: true,
  deterministicSerialization: true
});

export type ContextRuntimeCapabilities = typeof CONTEXT_RUNTIME_CAPABILITIES;
