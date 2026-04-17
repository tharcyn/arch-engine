import { describe, test, expect } from 'vitest';
import { validateEvaluationPolicyFile } from '../../src/policy/validateEvaluationPolicyFile';

describe('Phase 16I validateEvaluationPolicyFile', () => {

    test('validates a simple defaultThreshold policy', () => {
        const file = validateEvaluationPolicyFile({ defaultThreshold: 'warning' });
        expect(file.defaultProfile).toBe('default');
        expect(file.profiles['default'].defaultThreshold).toBe('warning');
        expect(file.profiles['default'].categoryOverrides).toBeUndefined();
    });

    test('validates a policy with overrides', () => {
        const file = validateEvaluationPolicyFile({
            defaultThreshold: 'error',
            categoryOverrides: { trust: 'warning', advisory: 'none' }
        });
        expect(file.profiles['default'].defaultThreshold).toBe('error');
        expect(file.profiles['default'].categoryOverrides?.trust).toBe('warning');
        expect(file.profiles['default'].categoryOverrides?.advisory).toBe('none');
    });

    test('validates a policy with code overrides', () => {
        const file = validateEvaluationPolicyFile({
            defaultThreshold: 'error',
            codeOverrides: { 'ARCH_TRUST_123': 'info' }
        });
        expect(file.profiles['default'].defaultThreshold).toBe('error');
        expect(file.profiles['default'].codeOverrides?.['ARCH_TRUST_123']).toBe('info');
    });

    test('rejects non-object', () => {
        expect(() => validateEvaluationPolicyFile(null)).toThrow('Evaluation policy file must be an object.');
        expect(() => validateEvaluationPolicyFile('error')).toThrow('Evaluation policy file must be an object.');
    });

    test('rejects missing or invalid defaultThreshold', () => {
        expect(() => validateEvaluationPolicyFile({})).toThrow('Gate policy must specify a defaultThreshold.');
        expect(() => validateEvaluationPolicyFile({ defaultThreshold: 'critical' })).toThrow('Invalid defaultThreshold: critical.');
    });

    test('rejects unknown category override', () => {
        expect(() => validateEvaluationPolicyFile({
            defaultThreshold: 'error',
            categoryOverrides: { unknown_category: 'warning' }
        })).toThrow('Unknown category override key: unknown_category.');
    });

    test('rejects invalid threshold value in overrides', () => {
        expect(() => validateEvaluationPolicyFile({
            defaultThreshold: 'error',
            categoryOverrides: { trust: 'critical' }
        })).toThrow('Invalid threshold value for category trust: critical.');
    });

    test('rejects invalid threshold value in code overrides', () => {
        expect(() => validateEvaluationPolicyFile({
            defaultThreshold: 'error',
            codeOverrides: { 'ARCH_TRUST_123': 'critical' }
        })).toThrow('Invalid threshold value for code ARCH_TRUST_123: critical.');
    });

    test('validates a profile-based file', () => {
        const file = validateEvaluationPolicyFile({
            defaultProfile: 'ci',
            profiles: {
                ci: { defaultThreshold: 'error' },
                local: { defaultThreshold: 'warning' }
            }
        });
        expect(file.defaultProfile).toBe('ci');
        expect(file.profiles['ci'].defaultThreshold).toBe('error');
        expect(file.profiles['local'].defaultThreshold).toBe('warning');
    });

    test('rejects invalid defaultProfile', () => {
        expect(() => validateEvaluationPolicyFile({
            defaultProfile: 'prod',
            profiles: {
                ci: { defaultThreshold: 'error' }
            }
        })).toThrow("defaultProfile 'prod' does not exist in profiles.");
    });

    test('rejects malformed profile', () => {
        expect(() => validateEvaluationPolicyFile({
            profiles: {
                ci: { defaultThreshold: 'critical' }
            }
        })).toThrow("Invalid profile 'ci': Invalid defaultThreshold: critical.");
    });

    test('validates a policy with waiver metadata', () => {
        const file = validateEvaluationPolicyFile({
            defaultThreshold: 'warning',
            waivers: [
                {
                    code: 'RULE_1',
                    reason: 'Legacy exception',
                    owner: 'team-trust',
                    ticket: 'JIRA-123',
                    validUntil: '2030-01-01T00:00:00Z'
                }
            ]
        });
        expect(file.profiles['default'].waivers![0].reason).toBe('Legacy exception');
        expect(file.profiles['default'].waivers![0].validUntil).toBe('2030-01-01T00:00:00Z');
    });

    test('rejects invalid waiver validUntil format', () => {
        expect(() => validateEvaluationPolicyFile({
            defaultThreshold: 'warning',
            waivers: [{ code: 'RULE_1', validUntil: 'not-a-date' }]
        })).toThrow("Invalid validUntil date format in waiver at index 0.");
    });
});
