import { describe, it, expect } from 'vitest';
import { resolvePolicyDependencies } from '../../src/transport/resolvePolicyDependencies.js';

describe('Phase 4: resolvePolicyDependencies', () => {

  it('Test 1: Generates stack entry securely from manifest', () => {
    const manifest = {
      extends: ['parent'],
      dependencies: [],
      namespaces: {},
      issuerData: [],
      manifestMetadata: { version: 2 }
    };
    const entry = resolvePolicyDependencies('ns', 'id', manifest);
    expect(entry.policyId).toBe('id');
    expect(entry.policyNamespace).toBe('ns');
    expect(entry.config.extends).toEqual(['parent']);
    expect(entry.config.version).toBe(2);
  });

});
