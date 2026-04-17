import type { FederationEvaluationResult } from './runFederationEvaluationPlan.js';
import type { FederationEvaluationSeveritySummary } from './aggregateFederationEvaluationSeverity.js';
import type { PolicyPackFindingCategory } from './PolicyPackFinding.js';
import { resolveFindingSeverityThreshold } from './resolveFindingSeverityThreshold.js';
import { getMatchingWaiver } from './resolveEvaluationWaivers.js';

export type FederationEvaluationSeverityThreshold = 'none' | 'info' | 'warning' | 'error';

export interface FederationEvaluationWaiver {
    readonly code?: string;
    readonly category?: PolicyPackFindingCategory;
    readonly packName?: string;
    
    readonly reason?: string;
    readonly owner?: string;
    readonly ticket?: string;
    readonly validUntil?: string;
}

export interface FederationEvaluationWaiverUsageEntry {
    readonly waiver: FederationEvaluationWaiver;
    readonly matchedCount: number;
    readonly matchedPacks: readonly string[];
}

export interface FederationEvaluationWaiverAudit {
    readonly totalWaiversDefined: number;
    readonly totalWaiversMatched: number;
    readonly totalWaiversUnused: number;
    readonly matchedWaiverEntries: readonly FederationEvaluationWaiverUsageEntry[];
    readonly unusedWaiverEntries: readonly FederationEvaluationWaiver[];
    readonly waivedFindingsCount: number;
    readonly waivedPacks: readonly string[];
    readonly waiverAffectedOutcome: boolean;
    readonly broadWaiverWarnings: readonly string[];
    
    readonly waiversMissingReason: number;
    readonly waiversMissingOwner: number;
    readonly waiversMissingTicket: number;
    readonly expiredWaivers: number;
    readonly broadWaiversWithoutReason: number;
}

export interface FederationEvaluationGatePolicy {
    readonly defaultThreshold: FederationEvaluationSeverityThreshold;
    readonly extends?: string;
    readonly categoryOverrides?: Readonly<Partial<Record<PolicyPackFindingCategory, FederationEvaluationSeverityThreshold>>>;
    readonly codeOverrides?: Readonly<Record<string, FederationEvaluationSeverityThreshold>>;
    readonly waivers?: readonly FederationEvaluationWaiver[];
    
    readonly rejectExpiredWaivers?: boolean;
    readonly rejectOutcomeAffectingWaiversWithoutOwner?: boolean;
    readonly rejectOutcomeAffectingWaiversWithoutTicket?: boolean;
    readonly rejectBroadWaiversWithoutReason?: boolean;
}

export type FederationEvaluationSeverityThresholdInput = FederationEvaluationSeverityThreshold | FederationEvaluationGatePolicy;

export interface FederationEvaluationPolicyDecision {
    readonly evaluationAccepted: boolean;
    readonly evaluationPolicyStatus: 'accepted' | 'degraded' | 'rejected';
    readonly thresholdPolicy: FederationEvaluationGatePolicy;
    readonly highestSeverity: 'none' | 'info' | 'warning' | 'error';
    readonly triggeringFindingsSummary: string;
    readonly triggeringPacks: readonly string[];
    readonly triggeringCategories: readonly PolicyPackFindingCategory[];
    readonly triggeringCodes: readonly string[];
    readonly waivedFindingsCount: number;
    readonly waivedPacks: readonly string[];
    readonly waiverAudit?: FederationEvaluationWaiverAudit;
    readonly waiverGovernanceRejected: boolean;
    readonly waiverGovernanceTriggers: readonly string[];
    readonly summaryMessage: string;
}

export function assessFederationEvaluationPolicyGate(
    result: FederationEvaluationResult,
    severitySummary: FederationEvaluationSeveritySummary,
    thresholdInput: FederationEvaluationSeverityThresholdInput
): FederationEvaluationPolicyDecision {
    const policy: FederationEvaluationGatePolicy = typeof thresholdInput === 'string'
        ? { defaultThreshold: thresholdInput }
        : thresholdInput;

    const severityWeight = {
        none: 0,
        info: 1,
        warning: 2,
        error: 3
    };

    let evaluationAccepted = true;
    const triggeringPacks = new Set<string>();
    const triggeringCategories = new Set<PolicyPackFindingCategory>();
    const triggeringCodes = new Set<string>();

    let waivedFindingsCount = 0;
    const waivedPacks = new Set<string>();

    const waiverMatchMap = new Map<FederationEvaluationWaiver, { count: number, packs: Set<string> }>();

    // Evaluate each finding against its specific threshold
    for (const pack of result.packResults) {
        if (!pack.evaluationResult?.findings) continue;

        for (const finding of pack.evaluationResult.findings) {
            const matchedWaiver = getMatchingWaiver(finding, pack.policyPackId, policy.waivers);
            if (matchedWaiver) {
                waivedFindingsCount++;
                waivedPacks.add(pack.policyPackId);

                let matchStats = waiverMatchMap.get(matchedWaiver);
                if (!matchStats) {
                    matchStats = { count: 0, packs: new Set<string>() };
                    waiverMatchMap.set(matchedWaiver, matchStats);
                }
                matchStats.count++;
                matchStats.packs.add(pack.policyPackId);

                continue; // Skip threshold enforcement for waived finding
            }

            const effectiveThreshold = resolveFindingSeverityThreshold(finding, policy);
            const findingWeight = severityWeight[finding.severity];
            const thresholdWeight = effectiveThreshold === 'none' ? 999 : severityWeight[effectiveThreshold];

            if (findingWeight >= thresholdWeight) {
                evaluationAccepted = false;
                triggeringPacks.add(pack.policyPackId);
                triggeringCategories.add(finding.category);
                triggeringCodes.add(finding.code);
            }
        }
    }

    const actualWeight = severityWeight[severitySummary.highestSeverity];
    let evaluationPolicyStatus: 'accepted' | 'degraded' | 'rejected' = 'accepted';

    if (!evaluationAccepted) {
        evaluationPolicyStatus = 'rejected';
    } else if (actualWeight > 0) {
        evaluationPolicyStatus = 'degraded';
    }

    const triggerList = Array.from(triggeringPacks).sort();
    const categoryList = Array.from(triggeringCategories).sort();
    const codeList = Array.from(triggeringCodes).sort();
    const waivedPacksList = Array.from(waivedPacks).sort();
    
    let triggerSummary = 'No threshold exceeded.';
    if (!evaluationAccepted) {
        const overridesCount = policy.categoryOverrides ? Object.keys(policy.categoryOverrides).length : 0;
        if (overridesCount > 0) {
            triggerSummary = `Rejected due to findings exceeding thresholds (default: ${policy.defaultThreshold}, overrides: ${overridesCount}).`;
        } else {
            triggerSummary = `Rejected due to findings exceeding the ${policy.defaultThreshold} threshold.`;
        }
    } else if (waivedFindingsCount > 0) {
        triggerSummary = `Accepted (rejection prevented by ${waivedFindingsCount} waiver${waivedFindingsCount === 1 ? '' : 's'}).`;
    }

    // Determine if waiver affected outcome
    // The outcome was affected if it is currently accepted/degraded, but would have been rejected without waivers.
    // We already know `blockingSeverityReached` from the summary without waivers. Wait, the summary passed in
    // is pre-waiver! If summary.blockingSeverityReached is true, and we are currently evaluationAccepted == true,
    // then waivers definitely changed the outcome!
    // But wait, the threshold might be different. Let's recalculate if the waived findings would have crossed the threshold.
    let waiverAffectedOutcome = false;
    if (evaluationAccepted && waivedFindingsCount > 0) {
        // If we rejected any of the waived findings, would it have blocked?
        for (const pack of result.packResults) {
            if (!pack.evaluationResult?.findings) continue;
            for (const finding of pack.evaluationResult.findings) {
                if (getMatchingWaiver(finding, pack.policyPackId, policy.waivers)) {
                    const effectiveThreshold = resolveFindingSeverityThreshold(finding, policy);
                    const findingWeight = severityWeight[finding.severity];
                    const thresholdWeight = effectiveThreshold === 'none' ? 999 : severityWeight[effectiveThreshold];
                    if (findingWeight >= thresholdWeight) {
                        waiverAffectedOutcome = true;
                        break;
                    }
                }
            }
            if (waiverAffectedOutcome) break;
        }
    }

    let waiverAudit: FederationEvaluationWaiverAudit | undefined = undefined;
    if (policy.waivers) {
        const matchedEntries: FederationEvaluationWaiverUsageEntry[] = [];
        const unusedEntries: FederationEvaluationWaiver[] = [];
        const warnings: string[] = [];

        let missingReason = 0;
        let missingOwner = 0;
        let missingTicket = 0;
        let expiredCount = 0;
        let broadNoReasonCount = 0;

        const nowTime = Date.now();

        for (const w of policy.waivers) {
            const stats = waiverMatchMap.get(w);
            if (stats) {
                matchedEntries.push({
                    waiver: w,
                    matchedCount: stats.count,
                    matchedPacks: Array.from(stats.packs).sort()
                });
            } else {
                unusedEntries.push(w);
            }

            if (!w.reason) missingReason++;
            if (!w.owner) missingOwner++;
            if (!w.ticket) missingTicket++;

            if (w.validUntil) {
                const expiry = new Date(w.validUntil).getTime();
                if (!isNaN(expiry) && expiry < nowTime) {
                    expiredCount++;
                }
            }

            // Broadness detection
            let isBroad = false;
            if (!w.code) {
                if (w.category && !w.packName) {
                    warnings.push(`Broad waiver warning: category '${w.category}' is waived for all codes and packs.`);
                    isBroad = true;
                } else if (w.packName && !w.category) {
                    warnings.push(`Broad waiver warning: pack '${w.packName}' is waived for all codes and categories.`);
                    isBroad = true;
                } else if (w.category && w.packName) {
                    warnings.push(`Broad waiver warning: pack '${w.packName}' category '${w.category}' is waived for all codes.`);
                    isBroad = true;
                }
            }

            if (isBroad && !w.reason) {
                broadNoReasonCount++;
            }
        }

        waiverAudit = {
            totalWaiversDefined: policy.waivers.length,
            totalWaiversMatched: matchedEntries.length,
            totalWaiversUnused: unusedEntries.length,
            matchedWaiverEntries: matchedEntries,
            unusedWaiverEntries: unusedEntries,
            waivedFindingsCount,
            waivedPacks: waivedPacksList,
            waiverAffectedOutcome,
            broadWaiverWarnings: warnings,
            waiversMissingReason: missingReason,
            waiversMissingOwner: missingOwner,
            waiversMissingTicket: missingTicket,
            expiredWaivers: expiredCount,
            broadWaiversWithoutReason: broadNoReasonCount
        };
    }

    let waiverGovernanceRejected = false;
    const waiverGovernanceTriggers: string[] = [];

    if (waiverAudit) {
        if (policy.rejectExpiredWaivers && waiverAudit.expiredWaivers > 0) {
            waiverGovernanceRejected = true;
            waiverGovernanceTriggers.push('expiredWaivers');
        }
        if (policy.rejectOutcomeAffectingWaiversWithoutOwner && waiverAudit.waiverAffectedOutcome && waiverAudit.waiversMissingOwner > 0) {
            waiverGovernanceRejected = true;
            waiverGovernanceTriggers.push('outcomeAffectingWaiversWithoutOwner');
        }
        if (policy.rejectOutcomeAffectingWaiversWithoutTicket && waiverAudit.waiverAffectedOutcome && waiverAudit.waiversMissingTicket > 0) {
            waiverGovernanceRejected = true;
            waiverGovernanceTriggers.push('outcomeAffectingWaiversWithoutTicket');
        }
        if (policy.rejectBroadWaiversWithoutReason && waiverAudit.broadWaiversWithoutReason > 0) {
            waiverGovernanceRejected = true;
            waiverGovernanceTriggers.push('broadWaiversWithoutReason');
        }

        if (waiverGovernanceRejected) {
            evaluationAccepted = false;
            evaluationPolicyStatus = 'rejected';
        }
    }

    let summaryMessage = '';
    if (evaluationPolicyStatus === 'rejected') {
        if (waiverGovernanceRejected) {
            summaryMessage = `Evaluation rejected by waiver governance escalation.`;
        } else {
            summaryMessage = `Evaluation rejected by severity policy gate.`;
        }
    } else if (evaluationPolicyStatus === 'degraded') {
        summaryMessage = `Evaluation accepted but degraded.`;
        if (waivedFindingsCount > 0) summaryMessage += ` (${waivedFindingsCount} findings waived)`;
    } else {
        summaryMessage = 'Evaluation accepted cleanly by severity policy gate.';
        if (waivedFindingsCount > 0) summaryMessage += ` (${waivedFindingsCount} findings waived)`;
    }

    return {
        evaluationAccepted,
        evaluationPolicyStatus,
        thresholdPolicy: policy,
        highestSeverity: severitySummary.highestSeverity,
        triggeringFindingsSummary: triggerSummary,
        triggeringPacks: triggerList,
        triggeringCategories: categoryList,
        triggeringCodes: codeList,
        waivedFindingsCount,
        waivedPacks: waivedPacksList,
        waiverAudit,
        waiverGovernanceRejected,
        waiverGovernanceTriggers,
        summaryMessage
    };
}
