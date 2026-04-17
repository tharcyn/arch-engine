import { describe, test, expect } from 'vitest';
import { validatePolicyPackCompatibility } from '../src/policy/validatePolicyPackCompatibility';
import type { PolicyPackManifest } from '../src/policy/PolicyPackManifest';
import { ARCH_ENGINE_VERSION } from '../src/version';

describe('Phase 10D Policy-Pack Version Compatibility Surface', () => {

  const baseManifest: PolicyPackManifest = {
    policyPackId: 'id',
    description: 'desc',
    category: 'cat'
  };

  test('missing_compatibility_accepted', () => {
    const res = validatePolicyPackCompatibility({ ...baseManifest });
    expect(res.compatible).toBe(true);
    expect(res.actualVersion).toBe(ARCH_ENGINE_VERSION);
  });

  test('exact_version_accepted', () => {
    const res = validatePolicyPackCompatibility({ ...baseManifest, engineCompatibility: ARCH_ENGINE_VERSION });
    expect(res.compatible).toBe(true);
  });

  test('caret_compatible_major_accepted', () => {
    const res = validatePolicyPackCompatibility({ ...baseManifest, engineCompatibility: `^${ARCH_ENGINE_VERSION}` });
    expect(res.compatible).toBe(true);
  });

  test('major_mismatch_rejected', () => {
    const res = validatePolicyPackCompatibility({ ...baseManifest, engineCompatibility: '^99.0.0' });
    expect(res.compatible).toBe(false);
  });

  test('invalid_string_rejected', () => {
    const res = validatePolicyPackCompatibility({ ...baseManifest, engineCompatibility: 'abc' });
    expect(res.compatible).toBe(false);
  });

});
