/**
 * Phase 4.13 Objective 7: Loader Protocol Capability Descriptor
 *
 * Transport-safe export describing the loader kernel's capabilities.
 * Enables cross-engine negotiation, federation capability alignment,
 * runtime compatibility detection, and future protocol migration tooling.
 *
 * Phase 8.9 C-4 FIX: Object.freeze at declaration ensures runtime
 * immutability. `as const` alone is compile-time only.
 */

export const LOADER_PROTOCOL_CAPABILITY_DESCRIPTOR_VERSION = 'v1';

export const LOADER_PROTOCOL_CAPABILITIES = Object.freeze({
  /** Protocol version this kernel implements */
  version: 4,
  /** SnapshotEnvelope schema version */
  snapshotEnvelopeVersion: 'v3',
  /** Pipeline contract version */
  pipelineContractVersion: 'v5',
  /** Topology surfaces computed deterministically */
  deterministicTopology: true,
  /** Manifest entropy feeds into extended fingerprint */
  manifestEntropyAwareIdentity: true,
  /** Registry provenance traced per-entry */
  registryProvenanceTracing: true,
  /** Explainability graph replay-stable */
  explainabilityReplayStable: true,
  /** All metadata deeply frozen post-pipeline */
  deepMetadataImmutability: true,
  /** Planner boundary contract enforced */
  plannerBoundaryEnforced: true,
  /** Envelope field whitelist guarded */
  envelopeFieldWhitelisted: true,
  /** Identity-surface membership locked */
  identitySurfaceMembershipLocked: true,
  /** Plain-object metadata graph enforced */
  plainObjectMetadataEnforced: true,
  /** Transport compatibility certified */
  transportCompatibilityCertified: true,
  /** Metadata graph shape coherence certified */
  metadataGraphShapeCertified: true,
  /** Structural hash diagnostic available */
  structureHashDiagnostic: true,
  /** Snapshot replay validation */
  snapshotReplayValidation: true
});

export type LoaderProtocolCapabilities = typeof LOADER_PROTOCOL_CAPABILITIES;

