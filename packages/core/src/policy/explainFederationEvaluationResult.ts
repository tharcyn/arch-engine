import type { FederationEvaluationResult, FederationEvaluationPackResult } from './runFederationEvaluationPlan.js';
import { aggregateFederationEvaluationSeverity } from './aggregateFederationEvaluationSeverity.js';
import type { FederationEvaluationSeveritySummary } from './aggregateFederationEvaluationSeverity.js';
import { assessFederationEvaluationPolicyGate } from './assessFederationEvaluationPolicyGate.js';
import type { FederationEvaluationPolicyDecision, FederationEvaluationSeverityThresholdInput } from './assessFederationEvaluationPolicyGate.js';

export interface FederationEvaluationPackExplanation {
    readonly policyPackId: string;
    readonly executionStatus: 'succeeded' | 'failed' | 'skipped' | 'blocked';
    readonly isDegraded: boolean;
    readonly summaryMessage: string;
    readonly findingsSummary: readonly string[];
    readonly findings: readonly import('./PolicyPackFinding.js').NormalizedPolicyPackFinding[];
}

export interface FederationEvaluationExplanation {
    readonly executionPermitted: boolean;
    readonly executionSucceeded: boolean;
    readonly overallResult: 'success' | 'partial-failure' | 'blocked' | 'invalid' | 'empty';
    
    readonly summaryMessage: string;
    readonly suggestedNextAction?: string;

    readonly effectivePolicySource: 'cli' | 'file' | 'default';
    readonly effectivePolicyProfile?: string;
    readonly effectivePolicyProfileChain?: readonly string[];
    readonly effectivePolicy: import('./assessFederationEvaluationPolicyGate.js').FederationEvaluationGatePolicy;

    readonly totalExecutedCount: number;
    readonly totalFailedCount: number;
    readonly totalSkippedCount: number;
    readonly totalBlockedCount: number;

    readonly waivedFindingsCount: number;
    readonly waivedPacks: readonly string[];
    readonly waiverAudit?: import('./assessFederationEvaluationPolicyGate.js').FederationEvaluationWaiverAudit;
    readonly waiverGovernanceRejected: boolean;
    readonly waiverGovernanceTriggers: readonly string[];

    readonly succeededPacks: readonly FederationEvaluationPackExplanation[];
    readonly failedPacks: readonly FederationEvaluationPackExplanation[];
    readonly skippedPacks: readonly FederationEvaluationPackExplanation[];
    readonly blockedPacks: readonly FederationEvaluationPackExplanation[];
    readonly degradedPacks: readonly FederationEvaluationPackExplanation[];

    readonly severitySummary: FederationEvaluationSeveritySummary;
    readonly policyDecision: FederationEvaluationPolicyDecision;
}

export function explainFederationEvaluationResult(
    result: FederationEvaluationResult,
    policyThresholdInput: FederationEvaluationSeverityThresholdInput = 'error',
    policySource: 'cli' | 'file' | 'default' = 'default',
    policyProfile?: string,
    policyProfileChain?: readonly string[]
): FederationEvaluationExplanation {
    const succeededPacks: FederationEvaluationPackExplanation[] = [];
    const failedPacks: FederationEvaluationPackExplanation[] = [];
    const skippedPacks: FederationEvaluationPackExplanation[] = [];
    const blockedPacks: FederationEvaluationPackExplanation[] = [];
    const degradedPacks: FederationEvaluationPackExplanation[] = [];

    for (const pack of result.packResults) {
        const findingsSummary: string[] = [];
        const findings: import('./PolicyPackFinding.js').NormalizedPolicyPackFinding[] = [];
        if (pack.evaluationResult?.findings) {
            for (const f of pack.evaluationResult.findings) {
                const repairNote = f.taxonomyRepaired ? ' [TAXONOMY REPAIRED]' : '';
                findingsSummary.push(`[${f.severity.toUpperCase()}] ${f.category}/${f.code}: ${f.message}${repairNote}`);
                findings.push(f);
            }
        }

        const packExplanation: FederationEvaluationPackExplanation = {
            policyPackId: pack.policyPackId,
            executionStatus: pack.executionStatus,
            isDegraded: pack.isDegraded,
            summaryMessage: pack.humanReadableSummary,
            findingsSummary,
            findings
        };

        if (pack.isDegraded) {
            degradedPacks.push(packExplanation);
        }

        if (pack.executionStatus === 'succeeded') {
            succeededPacks.push(packExplanation);
        } else if (pack.executionStatus === 'failed') {
            failedPacks.push(packExplanation);
        } else if (pack.executionStatus === 'skipped') {
            skippedPacks.push(packExplanation);
        } else if (pack.executionStatus === 'blocked') {
            blockedPacks.push(packExplanation);
        }
    }

    let summaryMessage = '';
    let suggestedNextAction: string | undefined = undefined;

    switch (result.overallResult) {
        case 'invalid':
            summaryMessage = 'Execution was not permitted because the execution plan is globally invalid. Check trust preconditions and lockfile integrity.';
            suggestedNextAction = 'Run `arch-engine policies preflight` to diagnose trust and configuration errors.';
            break;
        case 'blocked':
            summaryMessage = 'Execution was not permitted because the execution plan is globally blocked by incompatibilities or strict enforcement rules.';
            suggestedNextAction = 'Run `arch-engine policies plan` to inspect missing capabilities or required governance surfaces.';
            break;
        case 'empty':
            summaryMessage = 'Execution permitted, but no eligible policy packs were available to run.';
            suggestedNextAction = 'Verify that policy packs are installed or check dataset capability alignment.';
            break;
        case 'success':
            if (degradedPacks.length > 0) {
                summaryMessage = 'Execution succeeded, but some packs executed in a degraded state.';
            } else {
                summaryMessage = 'Execution succeeded. All executed policy packs completed successfully.';
            }
            break;
        case 'partial-failure':
            summaryMessage = 'Execution failed. One or more policy packs failed during evaluation.';
            suggestedNextAction = 'Inspect the failed packs list and their normalized findings. Correct dataset violations and retry.';
            break;
    }

    const severitySummary = aggregateFederationEvaluationSeverity(result);
    const policyDecision = assessFederationEvaluationPolicyGate(result, severitySummary, policyThresholdInput);

    return {
        executionPermitted: result.executionPermitted,
        executionSucceeded: result.executionSucceeded,
        overallResult: result.overallResult,
        summaryMessage,
        suggestedNextAction,
        effectivePolicySource: policySource,
        effectivePolicyProfile: policyProfile,
        effectivePolicyProfileChain: policyProfileChain,
        effectivePolicy: policyDecision.thresholdPolicy,
        totalExecutedCount: result.executedPackCount,
        totalFailedCount: result.failedPackCount,
        totalSkippedCount: result.skippedPackCount,
        totalBlockedCount: result.blockedPackCount,
        waivedFindingsCount: policyDecision.waivedFindingsCount,
        waivedPacks: policyDecision.waivedPacks,
        waiverAudit: policyDecision.waiverAudit,
        waiverGovernanceRejected: policyDecision.waiverGovernanceRejected,
        waiverGovernanceTriggers: policyDecision.waiverGovernanceTriggers,
        succeededPacks,
        failedPacks,
        skippedPacks,
        blockedPacks,
        degradedPacks,
        severitySummary,
        policyDecision
    };
}
