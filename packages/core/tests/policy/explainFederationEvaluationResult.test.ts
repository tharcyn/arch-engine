import { describe, test, expect } from 'vitest';
import { explainFederationEvaluationResult } from '../../src/policy/explainFederationEvaluationResult';
import type { FederationEvaluationResult } from '../../src/policy/runFederationEvaluationPlan';

describe('Phase 16B explainFederationEvaluationResult', () => {

    test('explains successful execution', () => {
        const result: FederationEvaluationResult = {
            allowed: true,
            executionPermitted: true,
            executionSucceeded: true,
            overallResult: 'success',
            executedPackCount: 2,
            failedPackCount: 0,
            skippedPackCount: 0,
            blockedPackCount: 0,
            packResults: [
                {
                    policyPackId: 'pack1',
                    plannedStatus: 'runnable',
                    executionStatus: 'succeeded',
                    isDegraded: false,
                    humanReadableSummary: 'Succeeded cleanly',
                    evaluationResult: { status: 'success', findings: [], summaryMessage: 'Success' }
                },
                {
                    policyPackId: 'pack2',
                    plannedStatus: 'degraded',
                    executionStatus: 'succeeded',
                    isDegraded: true,
                    humanReadableSummary: 'Succeeded with degradation',
                    evaluationResult: { status: 'success', findings: [], summaryMessage: 'Success' }
                }
            ]
        };

        const explanation = explainFederationEvaluationResult(result);

        expect(explanation.executionPermitted).toBe(true);
        expect(explanation.overallResult).toBe('success');
        expect(explanation.succeededPacks).toHaveLength(2);
        expect(explanation.degradedPacks).toHaveLength(1);
        expect(explanation.summaryMessage).toContain('degraded state');
        expect(explanation.effectivePolicySource).toBe('default');
        expect(explanation.effectivePolicy.defaultThreshold).toBe('error');
    });

    test('explains partial-failure with normalized findings', () => {
        const result: FederationEvaluationResult = {
            allowed: false,
            executionPermitted: true,
            executionSucceeded: false,
            overallResult: 'partial-failure',
            executedPackCount: 1,
            failedPackCount: 1,
            skippedPackCount: 0,
            blockedPackCount: 0,
            packResults: [
                {
                    policyPackId: 'pack1',
                    plannedStatus: 'runnable',
                    executionStatus: 'failed',
                    isDegraded: false,
                    humanReadableSummary: 'Evaluation failed',
                    evaluationResult: { 
                        status: 'failure', 
                        summaryMessage: 'Failed',
                        findings: [{ severity: 'error', message: 'Syntax error', category: 'policy-pack', code: 'UNKNOWN' } as any] 
                    }
                }
            ]
        };

        const explanation = explainFederationEvaluationResult(result);

        expect(explanation.overallResult).toBe('partial-failure');
        expect(explanation.failedPacks).toHaveLength(1);
        expect(explanation.failedPacks[0].findingsSummary[0]).toBe('[ERROR] policy-pack/UNKNOWN: Syntax error');
        expect(explanation.failedPacks[0].findings[0].severity).toBe('error');
        expect(explanation.failedPacks[0].findings[0].category).toBe('policy-pack');
        expect(explanation.suggestedNextAction).toBeDefined();
        expect(explanation.suggestedNextAction).toContain('Inspect the failed packs list');
        expect(explanation.effectivePolicySource).toBe('default');
    });

    test('explains invalid result', () => {
        const result: FederationEvaluationResult = {
            allowed: false,
            executionPermitted: false,
            executionSucceeded: false,
            overallResult: 'invalid',
            executedPackCount: 0,
            failedPackCount: 0,
            skippedPackCount: 0,
            blockedPackCount: 0,
            packResults: []
        };

        const explanation = explainFederationEvaluationResult(result);

        expect(explanation.executionPermitted).toBe(false);
        expect(explanation.summaryMessage).toContain('Execution was not permitted');
        expect(explanation.suggestedNextAction).toContain('arch-engine policies preflight');
    });

    test('explains skipped and blocked packs', () => {
        const result: FederationEvaluationResult = {
            allowed: true,
            executionPermitted: true,
            executionSucceeded: true,
            overallResult: 'success',
            executedPackCount: 0,
            failedPackCount: 0,
            skippedPackCount: 1,
            blockedPackCount: 1,
            packResults: [
                {
                    policyPackId: 'pack1',
                    plannedStatus: 'blocked',
                    executionStatus: 'blocked',
                    isDegraded: false,
                    humanReadableSummary: 'Blocked by lockfile'
                },
                {
                    policyPackId: 'pack2',
                    plannedStatus: 'runnable',
                    executionStatus: 'skipped',
                    isDegraded: false,
                    humanReadableSummary: 'No executor hook'
                }
            ]
        };

        const explanation = explainFederationEvaluationResult(result);

        expect(explanation.blockedPacks).toHaveLength(1);
        expect(explanation.skippedPacks).toHaveLength(1);
        expect(explanation.blockedPacks[0].summaryMessage).toBe('Blocked by lockfile');
        expect(explanation.skippedPacks[0].summaryMessage).toBe('No executor hook');
    });
});
