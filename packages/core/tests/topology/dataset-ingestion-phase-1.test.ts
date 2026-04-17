import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  runDatasetIngestionPipeline,
} from '../../src/topology/DatasetIngestionPipeline';
import { loadExternalTopologyDataset } from '../../src/topology/ExternalTopologyDatasetLoader';
import { TopologyDatasetIngestionError } from '../../src/topology/external-topology-types';

describe('Phase 1 Dataset Ingestion', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-engine-test-'));

  function writeTestDataset(name: string, data: any): string {
    const fullPath = path.join(tempDir, name);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
    return fullPath;
  }

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const validDataset = {
    topology_dataset_identity: {
      dataset_id: "test-dataset",
      dataset_semver: "1.0.0",
      dataset_producer_version: "1.0"
    },
    dataset_format_identifier: "arch_engine_topology_export_v1",
    topology_schema_version: "1.0.0",
    policy_pack_compatibility: {
      authority_pack: "1.0.0",
      rest_contract_pack: "1.0.0",
      journey_pack: "1.0.0"
    },
    topology_capability_manifest: {
      supports_authority_scope: true,
      supports_directionality: true,
      supports_edge_confidence: true
    }
  };

  test('loader success', () => {
    const p = writeTestDataset('success.json', validDataset);
    const result = loadExternalTopologyDataset(p);
    expect(result.dataset).toBeDefined();
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.every(d => d.status === 'success')).toBe(true);
  });

  test('loader missing required root field', () => {
    const p = writeTestDataset('root-field.json', {
      topology_dataset_identity: validDataset.topology_dataset_identity,
    });
    expect(() => loadExternalTopologyDataset(p)).toThrow(TopologyDatasetIngestionError);
    expect(() => loadExternalTopologyDataset(p)).toThrow(/Required root field missing/);
  });

  test('deep identity field present but empty string', () => {
    const badIdentity = { ...validDataset, topology_dataset_identity: { ...validDataset.topology_dataset_identity, dataset_id: "" } };
    const p = writeTestDataset('deep-identity.json', badIdentity);
    try {
      loadExternalTopologyDataset(p);
      expect(true).toBe(false); // should not reach
    } catch (err: any) {
      expect(err).toBeInstanceOf(TopologyDatasetIngestionError);
      expect(err.diagnostics.some((d: any) => d.code === 'MISSING_DEEP_IDENTITY_FIELD')).toBe(true);
    }
  });

  test('invalid dataset_semver format', () => {
    const badIdentity = { ...validDataset, topology_dataset_identity: { ...validDataset.topology_dataset_identity, dataset_semver: "not-a-version" } };
    const p = writeTestDataset('invalid-semver.json', badIdentity);
    try {
      loadExternalTopologyDataset(p);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(TopologyDatasetIngestionError);
      expect(err.diagnostics.some((d: any) => d.code === 'INVALID_DATASET_SEMVER')).toBe(true);
    }
  });

  test('unsupported format', () => {
    const data = { ...validDataset, dataset_format_identifier: "unsupported_v2" };
    const p = writeTestDataset('unsupported-format.json', data);
    try {
      runDatasetIngestionPipeline(p);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.diagnostics.some((d: any) => d.code === 'UNSUPPORTED_DATASET_FORMAT')).toBe(true);
    }
  });

  test('unsupported schema version', () => {
    const data = { ...validDataset, topology_schema_version: "9.9.9" };
    const p = writeTestDataset('unsupported-schema.json', data);
    try {
      runDatasetIngestionPipeline(p);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.diagnostics.some((d: any) => d.code === 'UNSUPPORTED_SCHEMA_VERSION')).toBe(true);
    }
  });

  test('schema version success using object form', () => {
    const data = { ...validDataset, topology_schema_version: { version: "1.0.0" } };
    const p = writeTestDataset('schema-object.json', data);
    const result = runDatasetIngestionPipeline(p);
    expect(result.schemaVersion).toBe('1.0.0');
    expect(result.diagnostics.every(d => d.status === 'success')).toBe(true);
  });

  test('schema version object missing version fails', () => {
    const data = { ...validDataset, topology_schema_version: { not_version: "1.0.0" } };
    const p = writeTestDataset('schema-missing-version.json', data);
    try {
      runDatasetIngestionPipeline(p);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.diagnostics.some((d: any) => d.code === 'INVALID_SCHEMA_VERSION_SURFACE')).toBe(true);
    }
  });

  test('missing capability manifest', () => {
    const data = { ...validDataset };
    delete (data as any).topology_capability_manifest;
    const p = writeTestDataset('missing-manifest.json', data);
    try {
      runDatasetIngestionPipeline(p);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.diagnostics.some((d: any) => d.code === 'MISSING_CAPABILITY_MANIFEST')).toBe(true);
    }
  });

  test('missing required capability', () => {
    const data = { ...validDataset, topology_capability_manifest: { supports_authority_scope: false } };
    const p = writeTestDataset('missing-cap.json', data);
    try {
      runDatasetIngestionPipeline(p);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.diagnostics.some((d: any) => d.code === 'MISSING_REQUIRED_CAPABILITY')).toBe(true);
    }
  });

  test('incompatible policy pack range', () => {
    const data = { ...validDataset, policy_pack_compatibility: { authority_pack: ">=2.0.0" } };
    const p = writeTestDataset('incompat-pack.json', data);
    try {
      runDatasetIngestionPipeline(p);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.diagnostics.some((d: any) => d.code === 'UNSUPPORTED_POLICY_PACK_RANGE')).toBe(true);
    }
  });

  test('full pipeline success', () => {
    const p = writeTestDataset('full-success.json', validDataset);
    const result = runDatasetIngestionPipeline(p);
    expect(result.schemaVersion).toBe('1.0.0');
    expect(result.diagnostics.every(d => d.status === 'success')).toBe(true);
  });
});
