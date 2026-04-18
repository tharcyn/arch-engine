import { describe, test, expect } from 'vitest';
import { mergeFederatedFindings } from '../../src/federation/mergeFederatedFindings.js';
import type { NormalizedPolicyPackFinding } from '../../src/policy/normalizePolicyPackFinding.js';

describe('Federated Findings Merge', () => {
    test('deduplicates canonical findings structurally', () => {
        const findingA: NormalizedPolicyPackFinding = {
            severity: 'error',
            message: 'Violation',
            code: 'V1',
            policyRuleId: 'rule1',
            category: 'cat1'
        };

        const findingB: NormalizedPolicyPackFinding = {
            severity: 'error',
            message: 'Violation',
            code: 'V1',
            policyRuleId: 'rule1',
            category: 'cat1' // Structurally identical
        };

        const findingC: NormalizedPolicyPackFinding = {
            severity: 'warning',
            message: 'Violation 2',
            code: 'V2',
            policyRuleId: 'rule2',
            category: 'cat2'
        };

        const result = mergeFederatedFindings([[findingA, findingC], [findingB]]);

        expect(result.totalFindings).toBe(3);
        expect(result.totalDeduplicated).toBe(1);
        expect(result.findings.length).toBe(2);
        
        const codes = result.findings.map(f => f.code).sort();
        expect(codes).toEqual(['V1', 'V2']);
    });
});
