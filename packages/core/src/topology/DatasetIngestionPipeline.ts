import type {
  DatasetIngestionPipelineReady,
  ValidatedTopologyDataset,
} from './external-topology-types';
import {
  loadExternalTopologyDataset,
} from './ExternalTopologyDatasetLoader';
import { routeDatasetFormat } from './DatasetFormatRouter';
import { verifySchemaCompatibility } from './SchemaCompatibilityGate';
import { verifyCapabilityManifestCompatibility } from './CapabilityManifestGate';

export function runDatasetIngestionPipeline(
  datasetPath: string,
): DatasetIngestionPipelineReady {
  const loaded = loadExternalTopologyDataset(datasetPath);
  const formatValidated = routeDatasetFormat(loaded);
  const schemaVerified = verifySchemaCompatibility(formatValidated);
  const capabilityVerified =
    verifyCapabilityManifestCompatibility(schemaVerified);

  return capabilityVerified as ValidatedTopologyDataset;
}
