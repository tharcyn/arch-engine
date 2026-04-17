import { describe, test, expect } from 'vitest';
import { normalizePolicyPackFinding } from '../../src/policy/normalizePolicyPackFinding';
import type { PolicyPackFinding } from '../../src/policy/PolicyPackFinding';

describe('Phase 16F normalizePolicyPackFinding', () => {

    test('fills missing optional fields deterministically', () => {
        const raw: PolicyPackFinding = {
            severity: 'error',
            message: 'An error occurred'
        };

        const normalized = normalizePolicyPackFinding(raw);
        expect(normalized.severity).toBe('error');
        expect(normalized.message).toBe('An error occurred');
        expect(normalized.code).toBe('UNKNOWN');
        expect(normalized.category).toBe('policy-pack');
        expect(normalized.surface).toBeUndefined();
        expect(normalized.classification).toBeUndefined();
        expect(normalized.taxonomyRepaired).toBe(true);
        expect((normalized as any)._taxonomyRepaired).toBeUndefined();
    });

    test('preserves provided taxonomy fields', () => {
        const raw: PolicyPackFinding = {
            severity: 'info',
            message: 'Trust info',
            code: 'TRUST_001',
            category: 'trust',
            surface: 'identity',
            classification: 'config-missing'
        };

        const normalized = normalizePolicyPackFinding(raw);
        expect(normalized.code).toBe('TRUST_001');
        expect(normalized.category).toBe('trust');
        expect(normalized.surface).toBe('identity');
        expect(normalized.classification).toBe('config-missing');
        expect(normalized.taxonomyRepaired).toBeUndefined();
        expect((normalized as any)._taxonomyRepaired).toBeUndefined();
    });

    test('normalizes custom finding codes to uppercase and alphanumeric', () => {
        const raw: PolicyPackFinding = {
            severity: 'info',
            message: 'test',
            code: ' my-custom-code.123 ',
            category: 'policy-pack'
        };

        const normalized = normalizePolicyPackFinding(raw);
        expect(normalized.code).toBe('MY_CUSTOM_CODE_123');
        expect(normalized.taxonomyRepaired).toBe(true);
    });

    test('handles empty custom finding code', () => {
        const raw: PolicyPackFinding = {
            severity: 'info',
            message: 'test',
            code: '   ',
            category: 'policy-pack'
        };

        const normalized = normalizePolicyPackFinding(raw);
        expect(normalized.code).toBe('UNKNOWN');
        expect(normalized.taxonomyRepaired).toBe(true);
    });

    test('handles illegal reserved prefix by custom pack', () => {
        const raw: PolicyPackFinding = {
            severity: 'info',
            message: 'test',
            code: 'ARCH_CORE_123',
            category: 'policy-pack'
        };

        const normalized = normalizePolicyPackFinding(raw);
        expect(normalized.code).toBe('INVALID_PREFIX_ARCH_CORE_123');
        expect(normalized.taxonomyRepaired).toBe(true);
    });

    test('allows reserved prefix for core category', () => {
        const raw: PolicyPackFinding = {
            severity: 'info',
            message: 'test',
            code: 'ARCH_CORE_123',
            category: 'trust'
        };

        const normalized = normalizePolicyPackFinding(raw);
        expect(normalized.code).toBe('ARCH_CORE_123');
        expect(normalized.taxonomyRepaired).toBeUndefined();
    });

    test('supports legacy _taxonomyRepaired flag', () => {
        const raw: PolicyPackFinding = {
            severity: 'info',
            message: 'test',
            code: 'ALREADY_VALID',
            category: 'policy-pack',
            _taxonomyRepaired: true
        };

        const normalized = normalizePolicyPackFinding(raw);
        expect(normalized.code).toBe('ALREADY_VALID');
        expect(normalized.taxonomyRepaired).toBe(true);
        expect((normalized as any)._taxonomyRepaired).toBeUndefined();
    });

});
