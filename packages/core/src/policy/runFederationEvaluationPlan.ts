import type { FederationExecutionPlanDiagnostic } from './materializeFederationExecutionPlan.js';
import type { PolicyEvaluationResult } from '../topology/PolicyEvaluationResult.js';
import type { PolicyPackExecutionContext } from './PolicyPackExecutionContext.js';
import type { PolicyPackEvaluationResult } from './PolicyPackEvaluationResult.js';
import type { PolicyPackEvaluator } from './PolicyPackEvaluator.js';
import { normalizePolicyPackFinding } from './normalizePolicyPackFinding.js';
import type { NormalizedPolicyPackFinding } from './PolicyPackFinding.js';

export interface NormalizedPolicyPackEvaluationResult extends Omit<PolicyPackEvaluationResult, 'findings'> {
    readonly findings: readonly NormalizedPolicyPackFinding[];
}

export interface FederationEvaluationPackResult {
    readonly policyPackId: string;
    readonly plannedStatus: 'runnable' | 'degraded' | 'blocked' | 'skipped';
    readonly executionStatus: 'succeeded' | 'failed' | 'skipped' | 'blocked';
    readonly isDegraded: boolean;
    readonly evaluationResult?: NormalizedPolicyPackEvaluationResult;
    readonly humanReadableSummary: string;
}

/**
 * Represents the final evaluation stage outcome.
 */
export interface FederationEvaluationResult {
    /**
     * @deprecated Use executionSucceeded instead. This field previously overloaded execution-permission semantics and is being phased out.
     */
    readonly allowed: boolean;
    /**
     * Indicates whether the runner was allowed to begin execution at all.
     * Derived from FederationExecutionPlanDiagnostic.overallPlanStatus.
     * Invalid or Blocked plans mean false. Partial, Complete, or Empty mean true.
     */
    readonly executionPermitted: boolean;
    /**
     * Indicates whether execution completed without failing packs.
     */
    readonly executionSucceeded: boolean;
    readonly overallResult: 'success' | 'partial-failure' | 'blocked' | 'invalid' | 'empty';
    readonly executedPackCount: number;
    readonly failedPackCount: number;
    readonly skippedPackCount: number;
    readonly blockedPackCount: number;
    readonly packResults: readonly FederationEvaluationPackResult[];
}

export function runFederationEvaluationPlan(
    plan: FederationExecutionPlanDiagnostic,
    context: PolicyPackExecutionContext,
    availablePacks: Record<string, PolicyPackEvaluator>
): FederationEvaluationResult {
    if (plan.overallPlanStatus === 'invalid') {
        return {
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
    }

    if (plan.overallPlanStatus === 'blocked') {
        return {
            allowed: false,
            executionPermitted: false,
            executionSucceeded: false,
            overallResult: 'blocked',
            executedPackCount: 0,
            failedPackCount: 0,
            skippedPackCount: 0,
            blockedPackCount: plan.totalPolicyPacks,
            packResults: plan.packResults.map(p => ({
                policyPackId: p.policyPackId,
                plannedStatus: p.executionStatus,
                executionStatus: 'blocked',
                isDegraded: p.executionStatus === 'degraded',
                humanReadableSummary: 'Execution blocked by plan.'
            }))
        };
    }

    if (plan.overallPlanStatus === 'empty') {
        return {
            allowed: true,
            executionPermitted: true,
            executionSucceeded: true,
            overallResult: 'empty',
            executedPackCount: 0,
            failedPackCount: 0,
            skippedPackCount: 0,
            blockedPackCount: 0,
            packResults: []
        };
    }

    const packResults: FederationEvaluationPackResult[] = [];
    let executedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let blockedCount = 0;

    const runnableOrDegraded = plan.packResults.filter(p => p.executionStatus === 'runnable' || p.executionStatus === 'degraded');
    const skippedOrBlocked = plan.packResults.filter(p => p.executionStatus === 'skipped' || p.executionStatus === 'blocked');

    // Record skipped and blocked without running
    for (const p of skippedOrBlocked) {
        if (p.executionStatus === 'blocked') blockedCount++;
        if (p.executionStatus === 'skipped') skippedCount++;
        packResults.push({
            policyPackId: p.policyPackId,
            plannedStatus: p.executionStatus,
            executionStatus: p.executionStatus as 'blocked' | 'skipped',
            isDegraded: false,
            humanReadableSummary: `Pack was planned as ${p.executionStatus}.`
        });
    }

    // Identify which packs to run
    const packsToRun: Array<{ packId: string, evaluator: PolicyPackEvaluator }> = [];
    for (const planPack of runnableOrDegraded) {
        const evaluator: PolicyPackEvaluator | undefined = availablePacks[planPack.policyPackId];
        if (evaluator !== undefined) {
            packsToRun.push({ packId: planPack.policyPackId, evaluator });
        } else {
            // Technically it's runnable but missing from available hooks -> skipped
            skippedCount++;
            packResults.push({
                policyPackId: planPack.policyPackId,
                plannedStatus: planPack.executionStatus,
                executionStatus: 'skipped',
                isDegraded: planPack.executionStatus === 'degraded',
                humanReadableSummary: 'Pack was planned but no execution hook was provided.'
            });
        }
    }

    // Execute packs synchronously using the runner
    for (const packToRun of packsToRun) {
        const rawEvalResult = packToRun.evaluator(context);
        
        let safeFindings: NormalizedPolicyPackFinding[] = [];
        let status = 'failure';
        let rawSummaryMessage = 'Unknown error during evaluation';

        if (rawEvalResult && typeof rawEvalResult === 'object') {
            status = rawEvalResult.status || 'failure';
            rawSummaryMessage = rawEvalResult.summaryMessage || 'Execution completed.';
            if (Array.isArray(rawEvalResult.findings)) {
                safeFindings = rawEvalResult.findings.map(f => normalizePolicyPackFinding(f || {}));
            }
        }

        const evalResult: NormalizedPolicyPackEvaluationResult = {
            ...(rawEvalResult || {}),
            status: status as any,
            summaryMessage: rawSummaryMessage,
            findings: safeFindings
        };
        
        const planPack = plan.packResults.find(p => p.policyPackId === packToRun.packId);
        const plannedStatus = planPack ? planPack.executionStatus : 'runnable';
        let isDegraded = plannedStatus === 'degraded';
        
        executedCount++;
        let executionStatus: 'succeeded' | 'failed' | 'skipped' | 'blocked' = 'succeeded';
        let summary = evalResult.summaryMessage || 'Execution succeeded.';

        if (evalResult.status === 'failure') {
            executionStatus = 'failed';
            failedCount++;
        } else if (evalResult.status === 'degraded') {
            isDegraded = true;
        } else if (evalResult.status === 'skipped') {
            executionStatus = 'skipped';
            skippedCount++;
            executedCount--; // Since we skipped it
        }

        packResults.push({
            policyPackId: packToRun.packId,
            plannedStatus: plannedStatus as any,
            executionStatus,
            isDegraded,
            evaluationResult: evalResult,
            humanReadableSummary: summary
        });
    }

    // Determine aggregate outcome
    let overallResult: FederationEvaluationResult['overallResult'] = 'success';
    let executionSucceeded = true;
    
    // executionPermitted is true if we got past the blocked/invalid checks above
    const executionPermitted = true;

    if (failedCount > 0) {
        overallResult = 'partial-failure';
        executionSucceeded = false; // Fail-closed on pack failure!
    } else if (executedCount === 0 && failedCount === 0) {
        // Technically an empty execution if nothing ran?
        // Let's just return success if we didn't fail.
        if (blockedCount > 0) overallResult = 'blocked';
    }

    return {
        allowed: executionSucceeded, // Deprecated backwards compatibility map
        executionPermitted,
        executionSucceeded,
        overallResult,
        executedPackCount: executedCount,
        failedPackCount: failedCount,
        skippedPackCount: skippedCount,
        blockedPackCount: blockedCount,
        packResults
    };
}
