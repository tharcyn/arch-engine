// Projection boundary rule:
// Projection consumes ValidatedTopologyDataset exclusively.
// Never consume pre-gate ingestion structures directly.

import type { ValidatedTopologyDataset } from './external-topology-types';
import type { ValidatorTopologyView } from './validator-topology-view';
import * as crypto from 'node:crypto';

// Test-only internal export.
// Not part of the public projection contract surface.
// Subject to change without notice.
export { computeProjectionSurfaceHash as __computeProjectionSurfaceHash_internal };

function computeProjectionSurfaceHash(payload: Record<string, any>): string {
  const sortObjectKeys = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);
    return Object.keys(obj).sort().reduce((result: Record<string, any>, key) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
  };

  const deterministicString = JSON.stringify(sortObjectKeys(payload));
  return crypto.createHash('sha256').update(deterministicString).digest('hex');
}

export function projectValidatedDatasetToValidatorView(
  dataset: ValidatedTopologyDataset,
): ValidatorTopologyView {
  const identitySrc = dataset.dataset.topology_dataset_identity;

  const manifest = { ...dataset.dataset.topology_capability_manifest } as Record<string, boolean>;
  const policyPackCompatibility = { ...dataset.dataset.policy_pack_compatibility } as Record<string, string>;
  const supportedPolicyPacks = { ...dataset.supportedPolicyPacks } as Record<string, string>;
  const requiredCapabilities = [...dataset.requiredCapabilities];

  const hashPayload = {
    projectionSurfaceVersion: '1.0.0',
    dataset_id: String(identitySrc.dataset_id),
    dataset_semver: String(identitySrc.dataset_semver),
    dataset_producer_version: String(identitySrc.dataset_producer_version),
    schemaVersion: dataset.schemaVersion,
    policy_pack_compatibility: policyPackCompatibility,
    topology_capability_manifest: manifest,
  };

  const projectionSurfaceHash = computeProjectionSurfaceHash(hashPayload);

  return Object.freeze({
    projectionSurfaceVersion: '1.0.0',
    projectionSurfaceHash,
    datasetPath: dataset.datasetPath,
    datasetSemver: String(identitySrc.dataset_semver),
    schemaVersion: dataset.schemaVersion,
    identity: Object.freeze({
      dataset_id: String(identitySrc.dataset_id),
      dataset_semver: String(identitySrc.dataset_semver),
      dataset_producer_version: String(identitySrc.dataset_producer_version),
      producer: identitySrc.producer ? String(identitySrc.producer) : undefined,
      dataset: identitySrc.dataset ? String(identitySrc.dataset) : undefined,
    }),
    capabilities: Object.freeze({
      manifest: Object.freeze(manifest),
      policyPackCompatibility: Object.freeze(policyPackCompatibility),
      supportedPolicyPacks: Object.freeze(supportedPolicyPacks),
      requiredCapabilities: Object.freeze(requiredCapabilities),
    }),
  });
}
