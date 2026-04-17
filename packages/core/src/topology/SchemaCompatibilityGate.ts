import type {
  DatasetFormatValidated,
  DatasetIngestionDiagnostic,
  SchemaCompatibilityVerified,
} from './external-topology-types';
import {
  extractTopologySchemaVersion,
  TopologyDatasetIngestionError,
} from './external-topology-types';

export const DEFAULT_SUPPORTED_TOPOLOGY_SCHEMA_VERSIONS = ['1.0.0'];

export function verifySchemaCompatibility(
  input: DatasetFormatValidated,
  supportedSchemaVersions: string[] = DEFAULT_SUPPORTED_TOPOLOGY_SCHEMA_VERSIONS,
): SchemaCompatibilityVerified {
  const diagnostics: DatasetIngestionDiagnostic[] = [...input.diagnostics];

  let schemaVersion: string;

  try {
    schemaVersion = extractTopologySchemaVersion(
      input.dataset.topology_schema_version,
    );
  } catch (error) {
    diagnostics.push({
      gate: 'SchemaCompatibilityGate',
      code: 'INVALID_SCHEMA_VERSION_SURFACE',
      status: 'failure',
      reason:
        error instanceof Error
          ? error.message
          : 'Invalid topology_schema_version surface.',
      field: 'topology_schema_version',
      received: input.dataset.topology_schema_version,
    });

    throw new TopologyDatasetIngestionError(
      'Invalid topology_schema_version surface.',
      diagnostics,
    );
  }

  if (!supportedSchemaVersions.includes(schemaVersion)) {
    diagnostics.push({
      gate: 'SchemaCompatibilityGate',
      code: 'UNSUPPORTED_SCHEMA_VERSION',
      status: 'failure',
      reason: `Unsupported schema version: ${schemaVersion}`,
      field: 'topology_schema_version',
      expected: supportedSchemaVersions,
      received: schemaVersion,
    });

    throw new TopologyDatasetIngestionError(
      `Unsupported schema version: ${schemaVersion}`,
      diagnostics,
    );
  }

  diagnostics.push({
    gate: 'SchemaCompatibilityGate',
    code: 'SCHEMA_VERSION_SUPPORTED',
    status: 'success',
    reason: `Schema version supported: ${schemaVersion}`,
    field: 'topology_schema_version',
    received: schemaVersion,
  });

  return {
    ...input,
    diagnostics,
    schemaVersion,
    supportedSchemaVersions,
  };
}
