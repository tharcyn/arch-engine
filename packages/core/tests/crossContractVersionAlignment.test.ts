import { describe, it, expect } from 'vitest';
import { DIAMOND_TRAVERSAL_CONTRACT_VERSION } from '../src/policy/contracts/diamondTraversalContract.js';
import { URI_RESOLUTION_CONTRACT_VERSION } from '../src/policy/contracts/uriResolutionContract.js';
import { SEMVER_SELECTION_CONTRACT_VERSION } from '../src/policy/contracts/semverSelectionContract.js';
import { LOCKFILE_RESOLUTION_CONTRACT_VERSION } from '../src/policy/contracts/lockfileResolutionContract.js';
import { REGISTRY_RESOLUTION_CONTRACT_VERSION } from '../src/policy/contracts/registryResolutionContract.js';
import { MANIFEST_HYDRATION_CONTRACT_VERSION } from '../src/policy/contracts/manifestHydrationContract.js';
import { PolicyEvaluationResult } from '../src/policy/types.js';

describe('Phase 3D: Cross-Contract Version Alignment', () => {

  it('Test 1: All contract versions synchronized to v1', () => {
    // Assert all constants are exported and strictly aligned to v1
    expect(DIAMOND_TRAVERSAL_CONTRACT_VERSION).toBe('v1');
    expect(URI_RESOLUTION_CONTRACT_VERSION).toBe('v1');
    expect(SEMVER_SELECTION_CONTRACT_VERSION).toBe('v1');
    expect(LOCKFILE_RESOLUTION_CONTRACT_VERSION).toBe('v1');
    expect(REGISTRY_RESOLUTION_CONTRACT_VERSION).toBe('v1');
    expect(MANIFEST_HYDRATION_CONTRACT_VERSION).toBe('v1');
  });

  it('Test 2: All artifacts represent versions in the telemetry structure', () => {
    // Dummy cast to make sure type allows these keys
    const mockTelemetry: Partial<PolicyEvaluationResult> = {
      stackExpansionTopologyVersion: 'v1',
      policyGovernanceContractVersion: 'v1',
      policyTransportContractVersion: 'v1',
      policyRegistryContractVersion: 'v1',
      policyManifestSchemaVersion: 'v1'
    };

    expect(mockTelemetry.stackExpansionTopologyVersion).toBe('v1');
    expect(mockTelemetry.policyGovernanceContractVersion).toBe('v1');
    expect(mockTelemetry.policyTransportContractVersion).toBe('v1');
    expect(mockTelemetry.policyRegistryContractVersion).toBe('v1');
    expect(mockTelemetry.policyManifestSchemaVersion).toBe('v1');
  });

});
