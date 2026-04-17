import { describe, test, expect } from 'vitest';
import { validateTrustPolicyConfig } from '../src/trust/validateTrustPolicyConfig';

describe('Phase 11D Trust-Root Enforcement Surface', () => {
    test('missing_config_safe', () => {
        expect(validateTrustPolicyConfig(undefined)).toBe(false);
        expect(validateTrustPolicyConfig(null)).toBe(false);
        expect(validateTrustPolicyConfig({})).toBe(true);
    });

    test('valid_config_accepted', () => {
        expect(validateTrustPolicyConfig({
            requireSignatures: true,
            allowedNamespaces: ['@arch-engine'],
            trustedRegistries: ['https://registry.arch-engine.dev']
        })).toBe(true);
    });

    test('invalid_config_rejected', () => {
        expect(validateTrustPolicyConfig({ requireSignatures: 'yes' })).toBe(false);
        expect(validateTrustPolicyConfig({ allowedNamespaces: 'all' })).toBe(false);
        expect(validateTrustPolicyConfig({ allowedNamespaces: [123] })).toBe(false);
        expect(validateTrustPolicyConfig({ trustedRegistries: {} })).toBe(false);
    });
});
