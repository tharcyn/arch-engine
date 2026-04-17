import { describe, test, expect } from 'vitest';
import { runFederationEvaluationPlan } from '../../src/policy/runFederationEvaluationPlan';
import type { FederationExecutionPlanDiagnostic } from '../../src/policy/materializeFederationExecutionPlan';
import type { PolicyPackExecutionContext } from '../../src/policy/PolicyPackExecutionContext';
import type { PolicyPackEvaluator } from '../../src/policy/PolicyPackEvaluator';

describe('Phase 16A runFederationEvaluationPlan', () => {

    test('successful execution of runnable packs', () => {
        const plan: FederationExecutionPlanDiagnostic = {
            allowed: true,
            overallPlanStatus: 'complete',
            preflightStatus: 'ready',
            totalPolicyPacks: 1,
            runnablePolicyPacks: 1,
            blockedPolicyPacks: 0,
            degradedPolicyPacks: 0,
            packResults: [{
                policyPackId: 'pack1',
                executionStatus: 'runnable',
                compatibilitySummary: '',
                blockingFindings: [],
                humanReadableReason: ''
            }],
            preflightDiagnostic: {} as any
        };

        const context = {} as PolicyPackExecutionContext;
        const packs: Record<string, PolicyPackEvaluator> = {
            'pack1': () => ({ status: 'success', findings: [], summaryMessage: 'Execution succeeded.' })
        };

        const result = runFederationEvaluationPlan(plan, context, packs);

        expect(result.allowed).toBe(true);
        expect(result.executionPermitted).toBe(true);
        expect(result.executionSucceeded).toBe(true);
        expect(result.overallResult).toBe('success');
        expect(result.executedPackCount).toBe(1);
        expect(result.failedPackCount).toBe(0);
        expect(result.packResults[0].executionStatus).toBe('succeeded');
    });

    test('degraded pack execution', () => {
        const plan: FederationExecutionPlanDiagnostic = {
            allowed: true,
            overallPlanStatus: 'partial',
            preflightStatus: 'degraded',
            totalPolicyPacks: 1,
            runnablePolicyPacks: 0,
            blockedPolicyPacks: 0,
            degradedPolicyPacks: 1,
            packResults: [{
                policyPackId: 'pack1',
                executionStatus: 'degraded',
                compatibilitySummary: '',
                blockingFindings: [],
                humanReadableReason: ''
            }],
            preflightDiagnostic: {} as any
        };

        const context = {} as PolicyPackExecutionContext;
        const packs: Record<string, PolicyPackEvaluator> = {
            'pack1': () => ({ status: 'success', findings: [], summaryMessage: 'Execution succeeded.' })
        };

        const result = runFederationEvaluationPlan(plan, context, packs);

        expect(result.allowed).toBe(true);
        expect(result.executionPermitted).toBe(true);
        expect(result.executionSucceeded).toBe(true);
        expect(result.overallResult).toBe('success');
        expect(result.executedPackCount).toBe(1);
        expect(result.packResults[0].executionStatus).toBe('succeeded');
        expect(result.packResults[0].isDegraded).toBe(true);
    });

    test('blocked plan prevents execution', () => {
        const plan: FederationExecutionPlanDiagnostic = {
            allowed: false,
            overallPlanStatus: 'blocked',
            preflightStatus: 'blocked',
            totalPolicyPacks: 1,
            runnablePolicyPacks: 1,
            blockedPolicyPacks: 0,
            degradedPolicyPacks: 0,
            packResults: [{
                policyPackId: 'pack1',
                executionStatus: 'runnable', // Planned as runnable, but overall is blocked
                compatibilitySummary: '',
                blockingFindings: [],
                humanReadableReason: ''
            }],
            preflightDiagnostic: {} as any
        };

        const context = {} as PolicyPackExecutionContext;
        const packs: Record<string, PolicyPackEvaluator> = {
            'pack1': () => { throw new Error('Should not execute'); }
        };

        const result = runFederationEvaluationPlan(plan, context, packs);

        expect(result.allowed).toBe(false);
        expect(result.executionPermitted).toBe(false);
        expect(result.executionSucceeded).toBe(false);
        expect(result.overallResult).toBe('blocked');
        expect(result.executedPackCount).toBe(0);
        expect(result.packResults[0].executionStatus).toBe('blocked');
    });

    test('partial-failure when one executing pack fails', () => {
        const plan: FederationExecutionPlanDiagnostic = {
            allowed: true,
            overallPlanStatus: 'complete',
            preflightStatus: 'ready',
            totalPolicyPacks: 1,
            runnablePolicyPacks: 1,
            blockedPolicyPacks: 0,
            degradedPolicyPacks: 0,
            packResults: [{
                policyPackId: 'pack1',
                executionStatus: 'runnable',
                compatibilitySummary: '',
                blockingFindings: [],
                humanReadableReason: ''
            }],
            preflightDiagnostic: {} as any
        };

        const context = {} as PolicyPackExecutionContext;
        const packs: Record<string, PolicyPackEvaluator> = {
            'pack1': () => ({ status: 'failure', findings: [], summaryMessage: 'Execution failed.' })
        };

        const result = runFederationEvaluationPlan(plan, context, packs);

        expect(result.allowed).toBe(false); // Fail closed on evaluation failure
        expect(result.executionPermitted).toBe(true);
        expect(result.executionSucceeded).toBe(false);
        expect(result.overallResult).toBe('partial-failure');
        expect(result.executedPackCount).toBe(1);
        expect(result.failedPackCount).toBe(1);
        expect(result.packResults[0].executionStatus).toBe('failed');
    });

    test('empty plan result', () => {
        const plan: FederationExecutionPlanDiagnostic = {
            allowed: true,
            overallPlanStatus: 'empty',
            preflightStatus: 'ready',
            totalPolicyPacks: 0,
            runnablePolicyPacks: 0,
            blockedPolicyPacks: 0,
            degradedPolicyPacks: 0,
            packResults: [],
            preflightDiagnostic: {} as any
        };

        const result = runFederationEvaluationPlan(plan, {} as any, []);

        expect(result.allowed).toBe(true);
        expect(result.executionPermitted).toBe(true);
        expect(result.executionSucceeded).toBe(true);
        expect(result.overallResult).toBe('empty');
        expect(result.executedPackCount).toBe(0);
    });

    test('skipped/blocked packs are recorded but not run', () => {
        const plan: FederationExecutionPlanDiagnostic = {
            allowed: true,
            overallPlanStatus: 'partial',
            preflightStatus: 'degraded',
            totalPolicyPacks: 2,
            runnablePolicyPacks: 1,
            blockedPolicyPacks: 1,
            degradedPolicyPacks: 0,
            packResults: [{
                policyPackId: 'pack1',
                executionStatus: 'runnable',
                compatibilitySummary: '',
                blockingFindings: [],
                humanReadableReason: ''
            }, {
                policyPackId: 'pack2',
                executionStatus: 'blocked',
                compatibilitySummary: '',
                blockingFindings: [],
                humanReadableReason: ''
            }],
            preflightDiagnostic: {} as any
        };

        const context = {} as PolicyPackExecutionContext;
        const packs: Record<string, PolicyPackEvaluator> = {
            'pack1': () => ({ status: 'success', findings: [], summaryMessage: 'Execution succeeded.' }),
            'pack2': () => { throw new Error('Should not execute blocked pack'); }
        };

        const result = runFederationEvaluationPlan(plan, context, packs);

        expect(result.allowed).toBe(true);
        expect(result.executionPermitted).toBe(true);
        expect(result.executionSucceeded).toBe(true);
        expect(result.overallResult).toBe('success');
        expect(result.executedPackCount).toBe(1);
        expect(result.blockedPackCount).toBe(1);
        expect(result.packResults.find(p => p.policyPackId === 'pack2')?.executionStatus).toBe('blocked');
    });
});
