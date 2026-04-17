import type {
  DatasetFormatValidated,
  DatasetIngestionDiagnostic,
  ExternalTopologyDatasetLoaded,
  SupportedDatasetFormatIdentifier,
} from './external-topology-types';
import { TopologyDatasetIngestionError } from './external-topology-types';

const SUPPORTED_DATASET_FORMATS: Record<
  SupportedDatasetFormatIdentifier,
  'topology_export_ingestion_v1'
> = {
  arch_engine_topology_export_v1: 'topology_export_ingestion_v1',
};

export function routeDatasetFormat(
  input: ExternalTopologyDatasetLoaded,
): DatasetFormatValidated {
  const diagnostics: DatasetIngestionDiagnostic[] = [...input.diagnostics];
  const datasetFormatIdentifier = input.dataset.dataset_format_identifier;

  if (
    typeof datasetFormatIdentifier !== 'string' ||
    !(datasetFormatIdentifier in SUPPORTED_DATASET_FORMATS)
  ) {
    diagnostics.push({
      gate: 'DatasetFormatRouter',
      code: 'UNSUPPORTED_DATASET_FORMAT',
      status: 'failure',
      reason: `Unsupported dataset format identifier: ${String(datasetFormatIdentifier)}`,
      field: 'dataset_format_identifier',
      expected: Object.keys(SUPPORTED_DATASET_FORMATS),
      received: datasetFormatIdentifier,
    });

    throw new TopologyDatasetIngestionError(
      `Unsupported dataset format identifier: ${String(datasetFormatIdentifier)}`,
      diagnostics,
    );
  }

  diagnostics.push({
    gate: 'DatasetFormatRouter',
    code: 'DATASET_FORMAT_ROUTED',
    status: 'success',
    reason: `Dataset format routed successfully: ${datasetFormatIdentifier}`,
    field: 'dataset_format_identifier',
    received: datasetFormatIdentifier,
  });

  return {
    ...input,
    diagnostics,
    datasetFormatIdentifier:
      datasetFormatIdentifier as SupportedDatasetFormatIdentifier,
    adapterPipeline: SUPPORTED_DATASET_FORMATS[
      datasetFormatIdentifier as SupportedDatasetFormatIdentifier
    ],
  };
}
