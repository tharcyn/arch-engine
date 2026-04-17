import { describe, test, expect } from 'vitest';
import { resolveEvaluationPolicyProfile } from '../../src/policy/resolveEvaluationPolicyProfile';
import type { FederationEvaluationPolicyFile } from '../../src/policy/validateEvaluationPolicyFile';

describe('Phase 16L resolveEvaluationPolicyProfile', () => {

    test('resolves simple profile without inheritance', () => {
        const file: FederationEvaluationPolicyFile = {
            profiles: {
                ci: { defaultThreshold: 'warning' }
            }
        };
        const resolved = resolveEvaluationPolicyProfile(file, 'ci');
        expect(resolved.effectivePolicy.defaultThreshold).toBe('warning');
        expect(resolved.profileChain).toEqual(['ci']);
    });

    test('resolves simple inheritance', () => {
        const file: FederationEvaluationPolicyFile = {
            profiles: {
                base: { 
                    defaultThreshold: 'error',
                    categoryOverrides: { trust: 'warning' }
                },
                ci: { 
                    extends: 'base',
                    defaultThreshold: 'warning',
                    codeOverrides: { 'RULE_1': 'info' }
                }
            }
        };
        const resolved = resolveEvaluationPolicyProfile(file, 'ci');
        expect(resolved.profileChain).toEqual(['ci', 'base']);
        expect(resolved.effectivePolicy.defaultThreshold).toBe('warning');
        expect(resolved.effectivePolicy.categoryOverrides).toEqual({ trust: 'warning' });
        expect(resolved.effectivePolicy.codeOverrides).toEqual({ 'RULE_1': 'info' });
    });

    test('resolves deep chained inheritance with overrides', () => {
        const file: FederationEvaluationPolicyFile = {
            profiles: {
                root: { 
                    defaultThreshold: 'none',
                    categoryOverrides: { trust: 'info', advisory: 'none' }
                },
                base: { 
                    extends: 'root',
                    defaultThreshold: 'error',
                    categoryOverrides: { trust: 'warning' }
                },
                ci: { 
                    extends: 'base',
                    defaultThreshold: 'warning',
                    categoryOverrides: { advisory: 'warning' },
                    codeOverrides: { 'RULE_1': 'info' }
                }
            }
        };
        const resolved = resolveEvaluationPolicyProfile(file, 'ci');
        expect(resolved.profileChain).toEqual(['ci', 'base', 'root']);
        expect(resolved.effectivePolicy.defaultThreshold).toBe('warning');
        // From ci: advisory: warning. From base: trust: warning.
        expect(resolved.effectivePolicy.categoryOverrides).toEqual({ trust: 'warning', advisory: 'warning' });
        expect(resolved.effectivePolicy.codeOverrides).toEqual({ 'RULE_1': 'info' });
    });

    test('throws if profile not found', () => {
        const file: FederationEvaluationPolicyFile = { profiles: {} };
        expect(() => resolveEvaluationPolicyProfile(file, 'ci')).toThrow("Profile 'ci' not found in policy file.");
    });
});
