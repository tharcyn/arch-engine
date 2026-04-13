import { describe, it, expect } from 'vitest';
import { resolveRegistryCandidate, RegistryResolutionCandidate, REGISTRY_RESOLUTION_CONTRACT_VERSION } from '../src/policy/contracts/registryResolutionContract.js';

describe('Phase 3E: Registry Index Ordering Contract Freeze', () => {

  it('Test 1: lockfile binding overrides explicit namespace mapping', () => {
    const candidates: RegistryResolutionCandidate[] = [
      { uri: 'ns1', source: 'explicit_namespace', resolvedNamespace: 'B' },
      { uri: 'ns2', source: 'default_registry', resolvedNamespace: 'C' },
      { uri: 'ns3', source: 'lockfile', resolvedNamespace: 'A' },
      { uri: 'ns4', source: 'mirror_registry', resolvedNamespace: 'D' }
    ];

    const result = resolveRegistryCandidate(candidates);
    expect(result?.source).toBe('lockfile');
    expect(result?.resolvedNamespace).toBe('A');
  });

  it('Test 2: default registry used if no lockfile or explicit namespace mapping', () => {
    const candidates: RegistryResolutionCandidate[] = [
      { uri: 'ns2', source: 'default_registry', resolvedNamespace: 'C' },
      { uri: 'ns4', source: 'mirror_registry', resolvedNamespace: 'D' }
    ];

    const result = resolveRegistryCandidate(candidates);
    expect(result?.source).toBe('default_registry');
  });

  it('Test 3: Contract version matches exported constant', () => {
    expect(REGISTRY_RESOLUTION_CONTRACT_VERSION).toBe('v1');
  });

});
