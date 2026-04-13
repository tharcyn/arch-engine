import { describe, it, expect } from 'vitest';
import { hydrateManifest, MANIFEST_HYDRATION_CONTRACT_VERSION } from '../src/policy/contracts/manifestHydrationContract.js';

describe('Phase 3E: Manifest Hydration Ordering Freeze', () => {

  it('Test 1: Manifest hydration preserves exactly declared dependency ordering', () => {
    const raw = {
      dependencies: ['dep-c', 'dep-a', 'dep-b']
    };
    
    // Sort behavior or mutating behavior should not occur. It should be exact.
    const hydrated = hydrateManifest(raw);
    expect(hydrated.dependencies).toEqual(['dep-c', 'dep-a', 'dep-b']);
  });

  it('Test 2: Manifest hydration preserves extends ordering', () => {
    const raw = {
      extends: ['B', 'A', 'C']
    };
    
    const hydrated = hydrateManifest(raw);
    expect(hydrated.extends).toEqual(['B', 'A', 'C']);
  });

  it('Test 3: Contract version matches exported constant', () => {
    expect(MANIFEST_HYDRATION_CONTRACT_VERSION).toBe('v1');
  });

});
