import { describe, test, expect } from 'vitest';
import { inspectFederationEvaluationFindings } from '../../src/policy/inspectFederationEvaluationFindings';
import type { FederationEvaluationResult } from '../../src/policy/runFederationEvaluationPlan';

describe('Phase 16Q inspectFederationEvaluationFindings', () => {

    test('inspects an empty result', () => {
        const result = { packResults: [] } as unknown as FederationEvaluationResult;
        const report = inspectFederationEvaluationFindings(result);

        expect(report.totalFindings).toBe(0);
        expect(report.codesObserved).toBe(0);
        expect(report.coreReservedCodesObserved).toBe(0);
        expect(report.packLocalCodesObserved).toBe(0);
        expect(report.taxonomyRepairedCount).toBe(0);
        expect(report.codeSummaries).toEqual([]);
    });

    test('aggregates counts and detects core reserved vs pack local', () => {
        const result = {
            packResults: [
                {
                    policyPackId: 'pack-a',
                    evaluationResult: {
                        findings: [
                            { code: 'ARCH_TRUST_01', category: 'trust', severity: 'error', taxonomyRepaired: false },
                            { code: 'ARCH_TRUST_01', category: 'trust', severity: 'warning', taxonomyRepaired: false },
                            { code: 'LOCAL_01', category: 'advisory', severity: 'info', taxonomyRepaired: true }
                        ]
                    }
                },
                {
                    policyPackId: 'pack-b',
                    evaluationResult: {
                        findings: [
                            { code: 'LOCAL_01', category: 'advisory', severity: 'warning', taxonomyRepaired: false }
                        ]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        const report = inspectFederationEvaluationFindings(result);

        expect(report.totalFindings).toBe(4);
        expect(report.codesObserved).toBe(2);
        expect(report.coreReservedCodesObserved).toBe(1);
        expect(report.packLocalCodesObserved).toBe(1);
        expect(report.taxonomyRepairedCount).toBe(1);
        expect(report.taxonomyRepairedCodes).toEqual(['LOCAL_01']);

        expect(report.countsBySeverity).toEqual({ info: 1, warning: 2, error: 1 });
        expect(report.countsByCategory).toEqual({ trust: 2, advisory: 2 });
        expect(report.countsByCode).toEqual({ ARCH_TRUST_01: 2, LOCAL_01: 2 });

        expect(report.codeSummaries).toHaveLength(2);
        
        // Sorting means ARCH_TRUST_01 comes first
        const archSummary = report.codeSummaries[0];
        expect(archSummary.code).toBe('ARCH_TRUST_01');
        expect(archSummary.category).toBe('trust');
        expect(archSummary.coreReserved).toBe(true);
        expect(archSummary.taxonomyRepairedObserved).toBe(false);
        expect(archSummary.countsBySeverity).toEqual({ info: 0, warning: 1, error: 1 });
        expect(archSummary.observedPacks).toEqual(['pack-a']);

        const localSummary = report.codeSummaries[1];
        expect(localSummary.code).toBe('LOCAL_01');
        expect(localSummary.coreReserved).toBe(false);
        expect(localSummary.taxonomyRepairedObserved).toBe(true);
        expect(localSummary.countsBySeverity).toEqual({ info: 1, warning: 1, error: 0 });
        expect(localSummary.observedPacks).toEqual(['pack-a', 'pack-b']);
    });

});
