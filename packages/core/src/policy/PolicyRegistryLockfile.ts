import type { PolicyPackMetadata } from './PolicyPackMetadata';

export interface PolicyRegistryLockEntry {
  readonly registryUrl: string;
  readonly packs: readonly PolicyPackMetadata[];
}

export interface PolicyRegistryLockfileSignatureEntry {
  readonly signatureKeyId: string;
  readonly signatureAlgorithm: 'ed25519';
  readonly signature: string;
}

export interface PolicyRegistryLockfileDatasetIdentity {
  readonly topologyDatasetIdentity?: Record<string, unknown>;
  readonly datasetSemver?: string;
  readonly datasetFormatIdentifier?: string;
  readonly topologySchemaVersion?: string;
  readonly datasetLineage?: Record<string, unknown>;
}

export interface PolicyRegistryLockfile {
  readonly lockfileSurfaceVersion: "1.0.0";
  readonly datasetIdentity?: PolicyRegistryLockfileDatasetIdentity;
  readonly datasetCapabilityManifest?: Record<string, boolean>;
  readonly datasetMutationClassRegistry?: Record<string, unknown>;
  readonly datasetAuthorityScopeRegistry?: Record<string, unknown>;
  readonly datasetSurfaceConfidenceRegistry?: Record<string, unknown>;
  readonly datasetTrustBoundaryRules?: Record<string, unknown>;
  readonly registries: readonly PolicyRegistryLockEntry[];
  readonly signature?: string;
  readonly signatureKeyId?: string;
  readonly signatureAlgorithm?: 'ed25519';
  readonly signatures?: readonly PolicyRegistryLockfileSignatureEntry[];
}
