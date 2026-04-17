import { describe, test, expect } from 'vitest';
import { validatePolicyPackManifest } from '../src/policy/validatePolicyPackManifest';

describe('Phase 10C Policy-Pack Manifest Validation Surface', () => {

  test('valid_manifest_accepted', () => {
    const manifest = {
      policyPackId: 'id1',
      description: 'desc',
      category: 'cat',
      rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }]
    };
    expect(validatePolicyPackManifest(manifest)).toBe(true);
  });

  test('missing_policyPackId_rejected', () => {
    const manifest = { description: 'desc', category: 'cat' };
    expect(validatePolicyPackManifest(manifest)).toBe(false);
  });

  test('missing_description_rejected', () => {
    const manifest = { policyPackId: 'id', category: 'cat' };
    expect(validatePolicyPackManifest(manifest)).toBe(false);
  });

  test('missing_category_rejected', () => {
    const manifest = { policyPackId: 'id', description: 'desc' };
    expect(validatePolicyPackManifest(manifest)).toBe(false);
  });

  test('invalid_rules_rejected', () => {
    const manifest = {
      policyPackId: 'id', description: 'd', category: 'c',
      rules: [{ type: 'allow-edge', from: 'a', to: 'b' }]
    };
    expect(validatePolicyPackManifest(manifest)).toBe(false);
  });

  test('non_object_rejected', () => {
    expect(validatePolicyPackManifest(null)).toBe(false);
    expect(validatePolicyPackManifest('string')).toBe(false);
    expect(validatePolicyPackManifest([])).toBe(false);
  });

});
