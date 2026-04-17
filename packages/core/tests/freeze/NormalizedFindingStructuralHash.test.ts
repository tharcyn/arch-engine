import { describe, it, expect } from 'vitest';
import { computeFindingStructuralHash } from '../../src/policy/normalizePolicyPackFinding';
import type { NormalizedPolicyPackFinding } from '../../src/policy/PolicyPackFinding';

describe('NormalizedFindingStructuralHash', () => {
    it('generates a stable deterministic hash trimming undefined', () => {
        const finding: NormalizedPolicyPackFinding = {
            severity: 'error',
            message: 'Test finding',
            code: 'TEST_001',
            category: 'execution',
            policyRuleId: 'rule_1',
            classification: 'high_risk',
            scope: 'global',
            authorityBoundaryCrossing: 'internal->external',
            mutationClass: 'destructive'
        };
        
        const hash = computeFindingStructuralHash(finding);
        expect(hash).toMatchInlineSnapshot(`"a29c850429e0c25f522d75901b33fb03b09ec39942ea108f6e9d6625cc53dbd6"`);
    });

    it('falls back to code and category when policyRuleId and classification are absent', () => {
        const finding1: NormalizedPolicyPackFinding = {
            severity: 'error',
            message: 'Test finding',
            code: 'TEST_001',
            category: 'execution'
        };

        const finding2: NormalizedPolicyPackFinding = {
            severity: 'error',
            message: 'Test finding',
            code: 'TEST_001',
            category: 'execution',
            policyRuleId: 'TEST_001',
            classification: 'execution'
        };

        const hash1 = computeFindingStructuralHash(finding1);
        const hash2 = computeFindingStructuralHash(finding2);

        expect(hash1).toBe(hash2);
    });
});
