export type SupportedDatasetFormatIdentifier =
  | 'arch_engine_topology_export_v1';

export type DatasetIngestionGateName =
  | 'ExternalTopologyDatasetLoader'
  | 'DatasetFormatRouter'
  | 'SchemaCompatibilityGate'
  | 'CapabilityManifestGate'
  | 'DatasetIngestionPipeline';

export interface DatasetIngestionDiagnostic {
  gate: DatasetIngestionGateName;
  code: string;
  status: 'success' | 'failure';
  reason: string;
  field: string;
  expected?: string | string[];
  received?: unknown;
}

export interface TopologyDatasetIdentitySurface {
  dataset?: string;
  dataset_id?: string;
  producer?: string;
  dataset_semver?: string;
  dataset_producer_version?: string;
  [key: string]: unknown;
}

export interface TopologySchemaVersionSurface {
  version: string;
  compatibility?: string;
  [key: string]: unknown;
}

export interface TopologyCapabilityManifest {
  [capabilityName: string]: boolean;
}

export interface PolicyPackCompatibilitySurface {
  [policyPackName: string]: string;
}

export interface ExternalTopologyDataset {
  topology_dataset_identity: TopologyDatasetIdentitySurface;
  dataset_format_identifier: string;
  topology_schema_version: string | TopologySchemaVersionSurface;
  policy_pack_compatibility: PolicyPackCompatibilitySurface;
  topology_capability_manifest?: TopologyCapabilityManifest;
  dataset_lineage?: Record<string, unknown>;
  mutation_class_registry?: Record<string, unknown>;
  authority_scope_registry?: Record<string, unknown>;
  surface_confidence_registry?: Record<string, unknown>;
  trust_boundary_rules?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ExternalTopologyDatasetLoaded {
  datasetPath: string;
  dataset: ExternalTopologyDataset;
  diagnostics: DatasetIngestionDiagnostic[];
}

export interface DatasetFormatValidated extends ExternalTopologyDatasetLoaded {
  datasetFormatIdentifier: SupportedDatasetFormatIdentifier;
  adapterPipeline: 'topology_export_ingestion_v1';
}

export interface SchemaCompatibilityVerified extends DatasetFormatValidated {
  schemaVersion: string;
  supportedSchemaVersions: string[];
}

export interface CapabilityManifestCompatibilityVerified
  extends SchemaCompatibilityVerified {
  requiredCapabilities: string[];
  supportedPolicyPacks: Record<string, string>;
}

export type ValidatedTopologyDataset =
  CapabilityManifestCompatibilityVerified;

export type DatasetIngestionPipelineReady = ValidatedTopologyDataset;

export class TopologyDatasetIngestionError extends Error {
  public readonly diagnostics: DatasetIngestionDiagnostic[];

  constructor(message: string, diagnostics: DatasetIngestionDiagnostic[]) {
    super(message);
    this.name = 'TopologyDatasetIngestionError';
    this.diagnostics = diagnostics;
  }
}

export function parseSemver(version: string): [number, number, number] {
  const cleaned = version.trim().replace(/^v/i, '').replace(/-.+$/, '');

  if (!/^\d+\.\d+\.\d+$/.test(cleaned)) {
    throw new Error(
      `Invalid semver version: '${version}'. Expected MAJOR.MINOR.PATCH.`,
    );
  }

  const [major, minor, patch] = cleaned.split('.').map(Number);
  return [major, minor, patch];
}

export function compareSemver(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = parseSemver(a);
  const [bMajor, bMinor, bPatch] = parseSemver(b);

  if (aMajor !== bMajor) return aMajor > bMajor ? 1 : -1;
  if (aMinor !== bMinor) return aMinor > bMinor ? 1 : -1;
  if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;
  return 0;
}

export function extractTopologySchemaVersion(
  topologySchemaVersion: ExternalTopologyDataset['topology_schema_version'],
): string {
  if (typeof topologySchemaVersion === 'string') {
    return topologySchemaVersion;
  }

  if (
    topologySchemaVersion &&
    typeof topologySchemaVersion === 'object' &&
    typeof topologySchemaVersion.version === 'string'
  ) {
    return topologySchemaVersion.version;
  }

  throw new Error(
    'Invalid topology_schema_version. Expected a version string or an object containing a version field.',
  );
}

export function supportsVersionRequirement(
  supportedVersion: string,
  requiredRange: string,
): boolean {
  const normalizedRange = requiredRange.trim();

  if (normalizedRange.startsWith('>=')) {
    return compareSemver(supportedVersion, normalizedRange.slice(2).trim()) >= 0;
  }

  return compareSemver(supportedVersion, normalizedRange) === 0;
}
