import { readFileSync, existsSync } from 'node:fs';

import type {
  DatasetIngestionDiagnostic,
  ExternalTopologyDataset,
  ExternalTopologyDatasetLoaded,
} from './external-topology-types';
import { TopologyDatasetIngestionError, parseSemver } from './external-topology-types';

const REQUIRED_ROOT_FIELDS = [
  'topology_dataset_identity',
  'dataset_format_identifier',
  'topology_schema_version',
  'policy_pack_compatibility',
] as const;

function makeDiagnostic(
  diagnostic: DatasetIngestionDiagnostic,
): DatasetIngestionDiagnostic {
  return diagnostic;
}

function assertRecord(
  value: unknown,
  field: string,
  diagnostics: DatasetIngestionDiagnostic[],
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    diagnostics.push(
      makeDiagnostic({
        gate: 'ExternalTopologyDatasetLoader',
        code: 'INVALID_JSON_ROOT',
        status: 'failure',
        reason: 'Topology dataset root must be a JSON object.',
        field,
        expected: 'object',
        received: value,
      }),
    );

    throw new TopologyDatasetIngestionError(
      'Topology dataset root must be a JSON object.',
      diagnostics,
    );
  }
}

export function loadExternalTopologyDataset(
  datasetPath: string,
): ExternalTopologyDatasetLoaded {
  const diagnostics: DatasetIngestionDiagnostic[] = [];

  if (!existsSync(datasetPath)) {
    diagnostics.push(
      makeDiagnostic({
        gate: 'ExternalTopologyDatasetLoader',
        code: 'DATASET_NOT_FOUND',
        status: 'failure',
        reason: `Topology dataset not found at path: ${datasetPath}`,
        field: 'datasetPath',
        received: datasetPath,
      }),
    );

    throw new TopologyDatasetIngestionError(
      `Topology dataset not found at path: ${datasetPath}`,
      diagnostics,
    );
  }

  diagnostics.push(
    makeDiagnostic({
      gate: 'ExternalTopologyDatasetLoader',
      code: 'DATASET_FOUND',
      status: 'success',
      reason: 'Topology dataset file found.',
      field: 'datasetPath',
      received: datasetPath,
    }),
  );

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(datasetPath, 'utf-8'));
  } catch (error) {
    diagnostics.push(
      makeDiagnostic({
        gate: 'ExternalTopologyDatasetLoader',
        code: 'INVALID_JSON',
        status: 'failure',
        reason: error instanceof Error ? error.message : 'Invalid JSON payload.',
        field: 'datasetPath',
        received: datasetPath,
      }),
    );

    throw new TopologyDatasetIngestionError(
      'Failed to parse topology dataset JSON.',
      diagnostics,
    );
  }

  assertRecord(parsed, 'root', diagnostics);

  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!(field in parsed)) {
      diagnostics.push(
        makeDiagnostic({
          gate: 'ExternalTopologyDatasetLoader',
          code: 'MISSING_REQUIRED_ROOT_FIELD',
          status: 'failure',
          reason: `Required root field missing: ${field}`,
          field,
        }),
      );

      throw new TopologyDatasetIngestionError(
        `Required root field missing: ${field}`,
        diagnostics,
      );
    }

    diagnostics.push(
      makeDiagnostic({
        gate: 'ExternalTopologyDatasetLoader',
        code: 'REQUIRED_ROOT_FIELD_PRESENT',
        status: 'success',
        reason: `Required root field present: ${field}`,
        field,
      }),
    );
  }

  // Deep Identity Validation
  const identity = parsed.topology_dataset_identity as Record<string, unknown>;
  const { dataset_id, dataset_semver, dataset_producer_version } = identity;

  for (const [key, value] of Object.entries({ dataset_id, dataset_semver, dataset_producer_version })) {
    if (typeof value !== 'string' || value.trim() === '') {
      diagnostics.push(
        makeDiagnostic({
          gate: 'ExternalTopologyDatasetLoader',
          code: 'MISSING_DEEP_IDENTITY_FIELD',
          status: 'failure',
          reason: `Deep identity validation failed: ${key} must exist as a non-empty string.`,
          field: `topology_dataset_identity.${key}`,
          expected: 'non-empty string',
          received: value,
        }),
      );
      throw new TopologyDatasetIngestionError(
        `Deep identity validation failed: ${key} must exist as a non-empty string.`,
        diagnostics,
      );
    }
  }

  try {
    parseSemver(dataset_semver as string);
  } catch (e) {
    diagnostics.push(
      makeDiagnostic({
        gate: 'ExternalTopologyDatasetLoader',
        code: 'INVALID_DATASET_SEMVER',
        status: 'failure',
        reason: `Deep identity validation failed: dataset_semver must be semver-shaped.`,
        field: 'topology_dataset_identity.dataset_semver',
        expected: 'semver-shaped string',
        received: dataset_semver,
      }),
    );
    throw new TopologyDatasetIngestionError(
        `Deep identity validation failed: dataset_semver must be semver-shaped.`,
        diagnostics,
    );
  }

  diagnostics.push(
    makeDiagnostic({
      gate: 'ExternalTopologyDatasetLoader',
      code: 'DEEP_IDENTITY_VALIDATED',
      status: 'success',
      reason: 'Deep identity fields matched non-empty strings and semver constraints.',
      field: 'topology_dataset_identity',
      received: identity,
    })
  );

  return {
    datasetPath,
    dataset: parsed as ExternalTopologyDataset,
    diagnostics,
  };
}
