import { PolicyStackEntry } from '../policy/types.js';
import { NamespaceTrustPolicy } from '../transport/namespaceTrustPolicy.js';
import { ScopedNamespaceTrustPolicy } from '../transport/namespaceTrustScopePolicy.js';
import { LoaderRuntimeCapabilities } from '../transport/validateManifestCapabilities.js';

export interface PolicyURIResult {
  namespace: string;
  policyId: string;
  versionRange?: string;
  registrySource?: string;
}

export interface RegistryResolutionResult {
  namespace: string;
  policyId: string;
  availableVersions: string[];
  registrySource: string;
  manifests: Record<string, any>;
  // F-5: Mirror fallback provenance (optional).
  // These fields are metadata only — they MUST NOT affect fingerprint identity.
  readonly mirrorSourceId?: string;
  readonly isMirrorFallback?: boolean;
}

export interface HydratedPolicyManifest {
  dependencies: string[];
  extends: string[];
  namespaces: Record<string, string>;
  issuerData: string[];
  manifestMetadata: any;
  simulatedCapabilityCompatibility?: any;
  negotiationWarnings?: any;
  executionMetadata?: any;
}

// ═══════════════════════════════════════════════════════════
// Phase 4.10: Registry Provenance Surface
// ═══════════════════════════════════════════════════════════

export interface RegistryProvenanceEntry {
  namespace: string;
  source: string;
  uri: string;
}

// ═══════════════════════════════════════════════════════════
// Phase 4.10→4.11: Loader Protocol Version Anchor
// ═══════════════════════════════════════════════════════════

export const LOADER_PROTOCOL_VERSION = '4.13';

// ═══════════════════════════════════════════════════════════
// Phase 4.9→4.11: SnapshotEnvelope
// ═══════════════════════════════════════════════════════════

export interface ClosureProvenance {
  manifestContentHash: string;
  signatureDigest: string;
  registryTrustRootId: string;
  trustRootEpoch: number;
}

export interface SnapshotEnvelope {
  /** Phase 4.7: Closure graph fingerprint */
  snapshotClosureGraphHash: string;
  closureGraphContractVersion: string;
  closureProvenance?: ClosureProvenance;
  /** Phase 4.5: Trust policy identity */
  namespaceTrustPolicyVersion: string;
  namespaceTrustPolicyHash: string;
  namespaceTrustScopeHash?: string;
  activeTrustScopes: string[];
  /** Phase 4.9: Unified stack fingerprint */
  policyStackFingerprint: string;
  /** Phase 4.9: Snapshot envelope contract version */
  snapshotEnvelopeVersion: string;
  /** Phase 4.10: Registry provenance surface */
  registryProvenance: RegistryProvenanceEntry[];
  /** Phase 4.10: Manifest digest set hash */
  manifestDigestSetHash: string;
  /** Phase 4.10: Loader protocol version anchor */
  loaderProtocolVersion: string;
  /** Phase 4.11 Obj 1: Registry source hash */
  registrySourceHash: string;
  /** Phase 4.11 Obj 2: Dependency graph shape hash */
  dependencyGraphShapeHash: string;
  /** Phase 4.11 Obj 4: Namespace set hash */
  namespaceSetHash: string;
  /** Phase 4.11 Obj 5: Explainability graph hash */
  explainabilityGraphHash: string;
  /** Phase 4.13 Obj 4: Structural digest (transport-diagnostic only) */
  structureHash: string;
}

export const SNAPSHOT_ENVELOPE_VERSION = 'v3';

// ═══════════════════════════════════════════════════════════
// Phase 4.9: PolicyStackFingerprint (unchanged)
// ═══════════════════════════════════════════════════════════

export interface PolicyStackFingerprint {
  closureGraphHash: string;
  trustScopeHash: string;
  trustPolicyHash: string;
  fingerprint: string;
  fingerprintVersion: string;
}

export const POLICY_STACK_FINGERPRINT_VERSION = 'v1';

// ═══════════════════════════════════════════════════════════
// Phase 4.8→4.11 Pipeline Options
// ═══════════════════════════════════════════════════════════

export interface LoaderPipelineOptions {
  lockfileEntries?: { namespace: string; id: string; lockedVersion: string }[];
  /** Phase 4.8: Externalized trust policy */
  trustPolicy?: NamespaceTrustPolicy;
  /** Phase 4.8: Externalized scoped trust policy */
  scopedTrustPolicy?: ScopedNamespaceTrustPolicy;
  /** Phase 4.8: Externalized runtime capabilities */
  runtimeCapabilities?: LoaderRuntimeCapabilities;
  /** Phase 4.8: Snapshot hashes for replay validation */
  snapshotReplayHashes?: {
    namespaceTrustPolicyHash?: string;
    namespaceTrustScopeHash?: string;
    snapshotClosureGraphHash?: string;
  };
  /** Phase 4.9: Strict namespace dependency resolution */
  strictNamespaceDependencyResolution?: boolean;
  /** Phase 4.9: Allow implicit trust policy construction */
  allowImplicitTrustPolicy?: boolean;
  /** Phase 4.14: Target overlay orchestration boundaries */
  overlayExecutionContext?: import('../topology/seamContracts.js').OverlaySeamExecutionContext;
}
