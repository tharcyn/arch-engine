import { describe, test, expect } from 'vitest';
import { getMatchingWaiver } from '../../src/policy/resolveEvaluationWaivers';
import type { NormalizedPolicyPackFinding } from '../../src/policy/PolicyPackFinding';
import type { FederationEvaluationWaiver } from '../../src/policy/assessFederationEvaluationPolicyGate';

describe('Phase 16M resolveEvaluationWaivers', () => {

    const finding: NormalizedPolicyPackFinding = {
        severity: 'error',
        category: 'trust',
        code: 'TRUST_01',
        message: 'msg',
        taxonomyRepaired: false
    };

    test('returns null if no waivers provided', () => {
        expect(getMatchingWaiver(finding, 'pack-a')).toBeNull();
        expect(getMatchingWaiver(finding, 'pack-a', [])).toBeNull();
    });

    test('exact code match', () => {
        const waivers: FederationEvaluationWaiver[] = [{ code: 'TRUST_01' }];
        expect(getMatchingWaiver(finding, 'pack-a', waivers)).toBe(waivers[0]);
        expect(getMatchingWaiver({ ...finding, code: 'TRUST_02' }, 'pack-a', waivers)).toBeNull();
    });

    test('exact category + code match', () => {
        const waivers: FederationEvaluationWaiver[] = [{ category: 'trust', code: 'TRUST_01' }];
        expect(getMatchingWaiver(finding, 'pack-a', waivers)).toBe(waivers[0]);
        expect(getMatchingWaiver({ ...finding, category: 'advisory' }, 'pack-a', waivers)).toBeNull();
    });

    test('exact packName + code match', () => {
        const waivers: FederationEvaluationWaiver[] = [{ packName: 'pack-a', code: 'TRUST_01' }];
        expect(getMatchingWaiver(finding, 'pack-a', waivers)).toBe(waivers[0]);
        expect(getMatchingWaiver(finding, 'pack-b', waivers)).toBeNull();
    });

    test('multiple waivers, one matches', () => {
        const waivers: FederationEvaluationWaiver[] = [
            { code: 'OTHER' },
            { category: 'advisory' },
            { packName: 'pack-b' },
            { code: 'TRUST_01' }
        ];
        expect(getMatchingWaiver(finding, 'pack-a', waivers)).toBe(waivers[3]);
    });

});
