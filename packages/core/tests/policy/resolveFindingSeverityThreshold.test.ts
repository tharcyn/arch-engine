import { describe, test, expect } from 'vitest';
import { resolveFindingSeverityThreshold } from '../../src/policy/resolveFindingSeverityThreshold';
import type { FederationEvaluationGatePolicy } from '../../src/policy/assessFederationEvaluationPolicyGate';

describe('Phase 16G resolveFindingSeverityThreshold', () => {

    test('returns default when no overrides exist', () => {
        const policy: FederationEvaluationGatePolicy = {
            defaultThreshold: 'error'
        };
        expect(resolveFindingSeverityThreshold({ category: 'trust' }, policy)).toBe('error');
    });

    test('returns default when override is missing for category', () => {
        const policy: FederationEvaluationGatePolicy = {
            defaultThreshold: 'warning',
            categoryOverrides: {
                advisory: 'info'
            }
        };
        expect(resolveFindingSeverityThreshold({ category: 'trust' }, policy)).toBe('warning');
    });

    test('returns override when present', () => {
        const policy: FederationEvaluationGatePolicy = {
            defaultThreshold: 'error',
            categoryOverrides: {
                trust: 'info'
            }
        };
        expect(resolveFindingSeverityThreshold({ category: 'trust' }, policy)).toBe('info');
    });

    test('returns code override when present, ignoring category override', () => {
        const policy: FederationEvaluationGatePolicy = {
            defaultThreshold: 'error',
            categoryOverrides: {
                trust: 'warning'
            },
            codeOverrides: {
                'ARCH_TRUST_123': 'info'
            }
        };
        expect(resolveFindingSeverityThreshold({ category: 'trust', code: 'ARCH_TRUST_123' }, policy)).toBe('info');
    });

    test('returns category override when code override misses', () => {
        const policy: FederationEvaluationGatePolicy = {
            defaultThreshold: 'error',
            categoryOverrides: {
                trust: 'warning'
            },
            codeOverrides: {
                'ARCH_TRUST_123': 'info'
            }
        };
        expect(resolveFindingSeverityThreshold({ category: 'trust', code: 'OTHER_CODE' }, policy)).toBe('warning');
    });

});
