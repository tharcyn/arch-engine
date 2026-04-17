import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { EngineRunner } from '../../src/runner/engine-runner';
import { runDatasetIngestionPipeline } from '../../src/topology/DatasetIngestionPipeline';
import { projectValidatedDatasetToValidatorView, __computeProjectionSurfaceHash_internal } from '../../src/topology/projectValidatedDatasetToValidatorView';

describe('Phase 2A Validator Topology Projection', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-engine-test-projection-'));

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
      dataset_producer_version: "1.0",
      producer: "arch-engine-test",
      dataset: "test-dataset-full"
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

  test('projection_surface_version_is_present', () => {
    const p = writeTestDataset('projection-basic.json', validDataset);
    const ingested = runDatasetIngestionPipeline(p);
    const view = projectValidatedDatasetToValidatorView(ingested);

    expect(view.projectionSurfaceVersion).toBe('1.0.0');
  });

  test('projection_surface_contains_no_gate_artifacts', () => {
    const p = writeTestDataset('projection-gate.json', validDataset);
    const ingested = runDatasetIngestionPipeline(p);
    const view = projectValidatedDatasetToValidatorView(ingested);

    expect((view as any).diagnostics).toBeUndefined();
    expect((view as any).adapterPipeline).toBeUndefined();
    expect((view as any).supportedSchemaVersions).toBeUndefined();
    expect((view as any).dataset_format_identifier).toBeUndefined();
  });

  test('projection_output_is_runtime_immutable', () => {
    const p = writeTestDataset('projection-mutability.json', validDataset);
    const ingested = runDatasetIngestionPipeline(p);
    const view = projectValidatedDatasetToValidatorView(ingested);

    // Mutate the original ingestion output after projection
    ingested.dataset.topology_dataset_identity.dataset_id = "hacked-id";
    (ingested.dataset as any).topology_capability_manifest.supports_authority_scope = false;
    ingested.dataset.policy_pack_compatibility.authority_pack = "99.0.0";

    // Verify projection output remains unchanged
    expect(view.identity.dataset_id).toBe('test-dataset');
    expect(view.capabilities.manifest.supports_authority_scope).toBe(true);
    expect(view.capabilities.policyPackCompatibility.authority_pack).toBe('1.0.0');
  });

  test('projection_is_idempotent', () => {
    const p = writeTestDataset('projection-idempotent.json', validDataset);
    const ingested = runDatasetIngestionPipeline(p);
    
    // called twice
    const view1 = projectValidatedDatasetToValidatorView(ingested);
    const view2 = projectValidatedDatasetToValidatorView(ingested);

    // structurally identical output objects
    expect(view1).toEqual(view2);
  });

  test('projects structurally correct object', () => {
    const p = writeTestDataset('projection-structure.json', validDataset);
    const ingested = runDatasetIngestionPipeline(p);
    const view = projectValidatedDatasetToValidatorView(ingested);

    expect(view.datasetPath).toBe(p);
    expect(view.datasetSemver).toBe('1.0.0');
    expect(view.schemaVersion).toBe('1.0.0');

    // Identity preservation
    expect(view.identity.dataset_id).toBe('test-dataset');
    expect(view.identity.dataset_semver).toBe('1.0.0');
    expect(view.identity.dataset_producer_version).toBe('1.0');
    expect(view.identity.producer).toBe('arch-engine-test');
    expect(view.identity.dataset).toBe('test-dataset-full');

    // Capabilities preservation
    expect(view.capabilities.manifest).toEqual(validDataset.topology_capability_manifest);
    expect(view.capabilities.policyPackCompatibility).toEqual(validDataset.policy_pack_compatibility);
  });

  test('projection_surface_hash_is_deterministic', () => {
    const p = writeTestDataset('projection-hash-det.json', validDataset);
    const ingested = runDatasetIngestionPipeline(p);
    
    const view1 = projectValidatedDatasetToValidatorView(ingested);
    const view2 = projectValidatedDatasetToValidatorView(ingested);

    expect(view1.projectionSurfaceHash).toEqual(view2.projectionSurfaceHash);
    expect(typeof view1.projectionSurfaceHash).toBe('string');
  });

  test('projection_surface_hash_changes_when_identity_changes', () => {
    const p1 = writeTestDataset('projection-hash-1.json', validDataset);
    const ingested1 = runDatasetIngestionPipeline(p1);
    const view1 = projectValidatedDatasetToValidatorView(ingested1);

    const validDatasetMutated = JSON.parse(JSON.stringify(validDataset));
    validDatasetMutated.topology_dataset_identity.dataset_semver = "1.0.1";
    
    const p2 = writeTestDataset('projection-hash-2.json', validDatasetMutated);
    const ingested2 = runDatasetIngestionPipeline(p2);
    const view2 = projectValidatedDatasetToValidatorView(ingested2);

    expect(view1.projectionSurfaceHash).not.toEqual(view2.projectionSurfaceHash);
  });

  test('projection_surface_hash_independent_from_dataset_path', () => {
    const p1 = writeTestDataset('projection-hash-path-1.json', validDataset);
    const ingested1 = runDatasetIngestionPipeline(p1);
    const view1 = projectValidatedDatasetToValidatorView(ingested1);

    const p2 = writeTestDataset('projection-hash-path-2.json', validDataset); // same dataset, diff file
    const ingested2 = runDatasetIngestionPipeline(p2);
    const view2 = projectValidatedDatasetToValidatorView(ingested2);

    expect(view1.projectionSurfaceHash).toEqual(view2.projectionSurfaceHash);
  });

  test('projection_surface_hash_independent_from_diagnostics', () => {
    const p = writeTestDataset('projection-hash-diag.json', validDataset);
    const ingested1 = runDatasetIngestionPipeline(p);
    const view1 = projectValidatedDatasetToValidatorView(ingested1);

    const ingested2 = runDatasetIngestionPipeline(p);
    // Inject diagnostic mutation conceptually
    ingested2.diagnostics.push({ message: "fake diagnostic" } as any);
    const view2 = projectValidatedDatasetToValidatorView(ingested2);

    expect(view1.projectionSurfaceHash).toEqual(view2.projectionSurfaceHash);
  });

  test('projection_surface_hash_changes_when_projection_version_changes', () => {
    const basePayload = {
      projectionSurfaceVersion: '1.0.0',
      dataset_id: 'test-dataset',
      dataset_semver: '1.0.0',
      dataset_producer_version: '1.0',
      schemaVersion: '1.0.0',
      policy_pack_compatibility: { authority_pack: '1.0.0' },
      topology_capability_manifest: { supports_authority_scope: true }
    };

    const hash1 = __computeProjectionSurfaceHash_internal(basePayload);
    
    const mutatedPayload = { ...basePayload, projectionSurfaceVersion: '1.1.0' };
    const hash2 = __computeProjectionSurfaceHash_internal(mutatedPayload);

    expect(hash1).not.toEqual(hash2);
    expect(typeof hash1).toBe('string');
  });

  test('EngineRunner integration', () => {
    const p = writeTestDataset('projection-runner.json', validDataset);
    
    // Stub engine manifest for engine runner creation
    const manifest = { schemaVersion: '1', version: '1.0.0', capabilities: {} } as any;
    const runner = new EngineRunner(manifest);

    const view = runner.projectTopologyForValidation(p);
    expect(view.projectionSurfaceVersion).toBe('1.0.0');
    expect(view.datasetPath).toBe(p);
    expect(view.identity.dataset_id).toBe('test-dataset');
    expect((view as any).diagnostics).toBeUndefined();
  });
});
