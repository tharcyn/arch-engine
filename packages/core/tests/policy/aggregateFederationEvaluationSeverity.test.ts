import { describe, test, expect } from 'vitest';
import { aggregateFederationEvaluationSeverity } from '../../src/policy/aggregateFederationEvaluationSeverity';
import type { FederationEvaluationResult } from '../../src/policy/runFederationEvaluationPlan';

describe('Phase 16D aggregateFederationEvaluationSeverity', () => {

    test('no findings yields none', () => {
        const result: FederationEvaluationResult = {
            allowed: true,
            executionPermitted: true,
            executionSucceeded: true,
            overallResult: 'success',
            executedPackCount: 1,
            failedPackCount: 0,
            skippedPackCount: 0,
            blockedPackCount: 0,
            packResults: [
                {
                    policyPackId: 'pack1',
                    plannedStatus: 'runnable',
                    executionStatus: 'succeeded',
                    isDegraded: false,
                    humanReadableSummary: 'Ok',
                    evaluationResult: {
                        status: 'success',
                        findings: [],
                        summaryMessage: 'Ok'
                    }
                }
            ]
        };

        const summary = aggregateFederationEvaluationSeverity(result);
        expect(summary.highestSeverity).toBe('none');
        expect(summary.severityCounts.info).toBe(0);
        expect(summary.severityCounts.warning).toBe(0);
        expect(summary.severityCounts.error).toBe(0);
        expect(summary.blockingSeverityReached).toBe(false);
    });

    test('mixed findings yield highest severity and correct counts', () => {
        const result: FederationEvaluationResult = {
            allowed: false,
            executionPermitted: true,
            executionSucceeded: false,
            overallResult: 'partial-failure',
            executedPackCount: 2,
            failedPackCount: 1,
            skippedPackCount: 0,
            blockedPackCount: 0,
            packResults: [
                {
                    policyPackId: 'pack1',
                    plannedStatus: 'runnable',
                    executionStatus: 'succeeded',
                    isDegraded: false,
                    humanReadableSummary: 'Ok',
                    evaluationResult: {
                        status: 'success',
                        findings: [
                            { severity: 'info', message: 'i1' },
                            { severity: 'warning', message: 'w1' }
                        ],
                        summaryMessage: 'Ok'
                    }
                },
                {
                    policyPackId: 'pack2',
                    plannedStatus: 'runnable',
                    executionStatus: 'failed',
                    isDegraded: false,
                    humanReadableSummary: 'Fail',
                    evaluationResult: {
                        status: 'failure',
                        findings: [
                            { severity: 'error', message: 'e1' },
                            { severity: 'error', message: 'e2' },
                            { severity: 'info', message: 'i2' }
                        ],
                        summaryMessage: 'Fail'
                    }
                }
            ]
        };

        const summary = aggregateFederationEvaluationSeverity(result);
        expect(summary.highestSeverity).toBe('error');
        expect(summary.severityCounts.info).toBe(2);
        expect(summary.severityCounts.warning).toBe(1);
        expect(summary.severityCounts.error).toBe(2);

        expect(summary.packsWithInfo).toContain('pack1');
        expect(summary.packsWithInfo).toContain('pack2');
        expect(summary.packsWithWarnings).toContain('pack1');
        expect(summary.packsWithWarnings).not.toContain('pack2');
        expect(summary.packsWithErrors).toContain('pack2');
        expect(summary.packsWithErrors).not.toContain('pack1');

        expect(summary.blockingSeverityReached).toBe(true);
    });

    test('skipped or blocked packs do not artificially lower severity', () => {
        const result: FederationEvaluationResult = {
            allowed: true,
            executionPermitted: true,
            executionSucceeded: true,
            overallResult: 'success',
            executedPackCount: 1,
            failedPackCount: 0,
            skippedPackCount: 1,
            blockedPackCount: 0,
            packResults: [
                {
                    policyPackId: 'pack-skipped',
                    plannedStatus: 'skipped',
                    executionStatus: 'skipped',
                    isDegraded: false,
                    humanReadableSummary: 'Skipped'
                },
                {
                    policyPackId: 'pack1',
                    plannedStatus: 'runnable',
                    executionStatus: 'succeeded',
                    isDegraded: false,
                    humanReadableSummary: 'Ok',
                    evaluationResult: {
                        status: 'success',
                        findings: [
                            { severity: 'warning', message: 'w1' }
                        ],
                        summaryMessage: 'Ok'
                    }
                }
            ]
        };

        const summary = aggregateFederationEvaluationSeverity(result);
        expect(summary.highestSeverity).toBe('warning');
        expect(summary.severityCounts.warning).toBe(1);
        expect(summary.packsWithWarnings).toContain('pack1');
        expect(summary.perPack).toHaveLength(2);
        expect(summary.perPack.find(p => p.policyPackId === 'pack-skipped')?.highestSeverity).toBe('none');
    });

});
