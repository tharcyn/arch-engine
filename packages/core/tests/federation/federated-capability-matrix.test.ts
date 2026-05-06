import { describe, test, expect, vi } from 'vitest';
import { computeFederatedCapabilityMatrix } from '../../src/federation/computeFederatedCapabilityMatrix.js';
import * as assess from '../../src/policy/assessPolicyPackExecutionCompatibility.js';

// The real assessPolicyPackExecutionCompatibility returns
// { overallStatus, packResults, findings, summaryMessage }; computeFederatedCapabilityMatrix
// consumes `.findings.map(f => f.code + ': ' + f.packId)`. Match the production
// shape here so the diagnostics field is populated correctly.
vi.mock('../../src/policy/assessPolicyPackExecutionCompatibility.js', () => ({
    assessPolicyPackExecutionCompatibility: vi.fn((manifest, mut, auth, surf, trust, packs) => {
        if (!manifest.supports_magic && packs.length > 0) {
            return {
                overallStatus: 'incompatible',
                packResults: [],
                findings: [{ code: 'Missing supports_magic', packId: 'mock-pack' }],
                summaryMessage: 'Missing supports_magic'
            };
        }
        return {
            overallStatus: 'compatible',
            packResults: [],
            findings: [],
            summaryMessage: 'compatible'
        };
    })
}));

describe('Federated Capability Matrix', () => {
    test('computes intersection and union accurately', () => {
        const intersection = { supports_magic: true };
        const union = { supports_magic: true, supports_extra: true };

        const result = computeFederatedCapabilityMatrix(intersection, union);

        expect(result.intersectionCapabilities).toEqual(['supports_magic']);
        expect(result.unionCapabilities).toEqual(['supports_magic', 'supports_extra']);
        expect(result.federationCompatible).toBe(true);
    });

    test('fail-closed incompatibility handling', () => {
        const intersection = { supports_other: true };
        const union = { supports_other: true, supports_extra: true };
        const packs = [{ metadata: { requiredCapabilities: ['supports_magic'] } }];

        const result = computeFederatedCapabilityMatrix(intersection, union, {}, {}, {}, {}, packs);

        expect(result.federationCompatible).toBe(false);
        // Production formats each diagnostic as `${code}: ${packId}`. Test that
        // at least one diagnostic surfaces the missing-capability code.
        expect(result.diagnostics.some(d => d.includes('Missing supports_magic'))).toBe(true);
    });
});
