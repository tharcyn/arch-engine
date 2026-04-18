import { describe, test, expect, vi } from 'vitest';
import { computeFederatedCapabilityMatrix } from '../../src/federation/computeFederatedCapabilityMatrix.js';
import * as assess from '../../src/policy/assessPolicyPackExecutionCompatibility.js';

vi.mock('../../src/policy/assessPolicyPackExecutionCompatibility.js', () => ({
    assessPolicyPackExecutionCompatibility: vi.fn((manifest, mut, auth, surf, trust, packs) => {
        if (!manifest.supports_magic && packs.length > 0) {
            return {
                overallStatus: 'incompatible',
                violations: ['Missing supports_magic']
            };
        }
        return {
            overallStatus: 'compatible',
            violations: []
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
        expect(result.diagnostics).toContain('Missing supports_magic');
    });
});
