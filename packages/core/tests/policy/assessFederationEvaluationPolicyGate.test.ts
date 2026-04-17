import { describe, test, expect } from 'vitest';
import { assessFederationEvaluationPolicyGate } from '../../src/policy/assessFederationEvaluationPolicyGate';
import type { FederationEvaluationSeveritySummary } from '../../src/policy/aggregateFederationEvaluationSeverity';
import type { FederationEvaluationResult } from '../../src/policy/runFederationEvaluationPlan';

describe('Phase 16E assessFederationEvaluationPolicyGate', () => {

    const emptyResult = { packResults: [] } as unknown as FederationEvaluationResult; // It inspects findings now

    test('no findings is accepted under all thresholds', () => {
        const summary: FederationEvaluationSeveritySummary = {
            highestSeverity: 'none',
            severityCounts: { info: 0, warning: 0, error: 0 },
            packsWithInfo: [],
            packsWithWarnings: [],
            packsWithErrors: [],
            perPack: [],
            summaryMessage: '',
            blockingSeverityReached: false
        };

        for (const threshold of ['none', 'info', 'warning', 'error'] as const) {
            const decision = assessFederationEvaluationPolicyGate(emptyResult, summary, threshold);
            expect(decision.evaluationAccepted).toBe(true);
            expect(decision.evaluationPolicyStatus).toBe('accepted');
            expect(decision.triggeringPacks).toHaveLength(0);
        }
    });

    test('info findings only', () => {
        const summary: FederationEvaluationSeveritySummary = {
            highestSeverity: 'info',
            severityCounts: { info: 1, warning: 0, error: 0 },
            packsWithInfo: ['pack-info'],
            packsWithWarnings: [],
            packsWithErrors: [],
            perPack: [],
            summaryMessage: '',
            blockingSeverityReached: false
        };

        const resultWithFindings = {
            packResults: [
                {
                    policyPackId: 'pack-info',
                    evaluationResult: {
                        findings: [{ severity: 'info', message: 'test', category: 'policy-pack', code: 'UNKNOWN' }]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        // none -> accepted, degraded
        const dNone = assessFederationEvaluationPolicyGate(resultWithFindings, summary, 'none');
        expect(dNone.evaluationAccepted).toBe(true);
        expect(dNone.evaluationPolicyStatus).toBe('degraded');

        // info -> rejected
        const dInfo = assessFederationEvaluationPolicyGate(resultWithFindings, summary, 'info');
        expect(dInfo.evaluationAccepted).toBe(false);
        expect(dInfo.evaluationPolicyStatus).toBe('rejected');
        expect(dInfo.triggeringPacks).toEqual(['pack-info']);

        // warning/error -> accepted, degraded
        const dWarn = assessFederationEvaluationPolicyGate(resultWithFindings, summary, 'warning');
        expect(dWarn.evaluationAccepted).toBe(true);
        expect(dWarn.evaluationPolicyStatus).toBe('degraded');
    });

    test('mixed warning and info findings', () => {
        const summary: FederationEvaluationSeveritySummary = {
            highestSeverity: 'warning',
            severityCounts: { info: 2, warning: 1, error: 0 },
            packsWithInfo: ['pack-info', 'pack-mixed'],
            packsWithWarnings: ['pack-mixed'],
            packsWithErrors: [],
            perPack: [],
            summaryMessage: '',
            blockingSeverityReached: false
        };

        const resultWithFindings = {
            packResults: [
                {
                    policyPackId: 'pack-info',
                    evaluationResult: {
                        findings: [{ severity: 'info', message: 'test', category: 'policy-pack', code: 'UNKNOWN' }]
                    }
                },
                {
                    policyPackId: 'pack-mixed',
                    evaluationResult: {
                        findings: [
                            { severity: 'info', message: 'test', category: 'policy-pack', code: 'UNKNOWN' },
                            { severity: 'warning', message: 'test', category: 'policy-pack', code: 'UNKNOWN' }
                        ]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        // none -> accepted, degraded
        const dNone = assessFederationEvaluationPolicyGate(resultWithFindings, summary, 'none');
        expect(dNone.evaluationAccepted).toBe(true);

        // info -> rejected (triggers on both)
        const dInfo = assessFederationEvaluationPolicyGate(resultWithFindings, summary, 'info');
        expect(dInfo.evaluationAccepted).toBe(false);
        expect(dInfo.triggeringPacks).toEqual(['pack-info', 'pack-mixed']);

        // warning -> rejected (triggers on pack-mixed only)
        const dWarn = assessFederationEvaluationPolicyGate(resultWithFindings, summary, 'warning');
        expect(dWarn.evaluationAccepted).toBe(false);
        expect(dWarn.triggeringPacks).toEqual(['pack-mixed']);

        // error -> accepted, degraded
        const dErr = assessFederationEvaluationPolicyGate(resultWithFindings, summary, 'error');
        expect(dErr.evaluationAccepted).toBe(true);
        expect(dErr.evaluationPolicyStatus).toBe('degraded');
    });

    test('category overrides', () => {
        const summary: FederationEvaluationSeveritySummary = {
            highestSeverity: 'warning',
            severityCounts: { info: 1, warning: 1, error: 0 },
            packsWithInfo: ['pack-trust'],
            packsWithWarnings: ['pack-advisory'],
            packsWithErrors: [],
            perPack: [],
            summaryMessage: '',
            blockingSeverityReached: false
        };

        const resultWithFindings = {
            packResults: [
                {
                    policyPackId: 'pack-trust',
                    evaluationResult: {
                        findings: [{ severity: 'info', message: 'test', category: 'trust', code: 'TRUST_01' }]
                    }
                },
                {
                    policyPackId: 'pack-advisory',
                    evaluationResult: {
                        findings: [{ severity: 'warning', message: 'test', category: 'advisory', code: 'ADV_01' }]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        // Default error -> degraded (since max is warning)
        const dErr = assessFederationEvaluationPolicyGate(resultWithFindings, summary, 'error');
        expect(dErr.evaluationAccepted).toBe(true);

        // Override: trust=info, default=error -> rejected by trust
        const overrideTrust = assessFederationEvaluationPolicyGate(resultWithFindings, summary, {
            defaultThreshold: 'error',
            categoryOverrides: { trust: 'info' }
        });
        expect(overrideTrust.evaluationAccepted).toBe(false);
        expect(overrideTrust.triggeringPacks).toEqual(['pack-trust']);
        expect(overrideTrust.triggeringCategories).toEqual(['trust']);

        // Override: advisory=error, default=warning -> accepted!
        // Because default is warning, but advisory warnings are ignored (advisory is error threshold).
        // Wait, trust finding is 'info', default is 'warning', so trust passes.
        // Advisory finding is 'warning', advisory threshold is 'error', so advisory passes.
        const overrideAdv = assessFederationEvaluationPolicyGate(resultWithFindings, summary, {
            defaultThreshold: 'warning',
            categoryOverrides: { advisory: 'error' }
        });
        expect(overrideAdv.evaluationAccepted).toBe(true);
    });

    test('code overrides precedence over category overrides', () => {
        const summary: FederationEvaluationSeveritySummary = {
            highestSeverity: 'warning',
            severityCounts: { info: 0, warning: 1, error: 0 },
            packsWithInfo: [],
            packsWithWarnings: ['pack-trust'],
            packsWithErrors: [],
            perPack: [],
            summaryMessage: '',
            blockingSeverityReached: false
        };

        const resultWithFindings = {
            packResults: [
                {
                    policyPackId: 'pack-trust',
                    evaluationResult: {
                        findings: [{ severity: 'warning', message: 'test', category: 'trust', code: 'TRUST_01' }]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        // Category says error (so warning passes), but code override says info (so warning fails)
        const dFail = assessFederationEvaluationPolicyGate(resultWithFindings, summary, {
            defaultThreshold: 'error',
            categoryOverrides: { trust: 'error' },
            codeOverrides: { 'TRUST_01': 'info' }
        });
        expect(dFail.evaluationAccepted).toBe(false);
        expect(dFail.triggeringCodes).toEqual(['TRUST_01']);

        // Category says info (so warning fails), but code override says error (so warning passes)
        const dPass = assessFederationEvaluationPolicyGate(resultWithFindings, summary, {
            defaultThreshold: 'error',
            categoryOverrides: { trust: 'info' },
            codeOverrides: { 'TRUST_01': 'error' }
        });
        expect(dPass.evaluationAccepted).toBe(true);
    });

    test('waivers prevent rejection', () => {
        const summary: FederationEvaluationSeveritySummary = {
            highestSeverity: 'error',
            severityCounts: { info: 0, warning: 0, error: 1 },
            packsWithInfo: [],
            packsWithWarnings: [],
            packsWithErrors: ['pack-trust'],
            perPack: [],
            summaryMessage: '',
            blockingSeverityReached: true
        };

        const resultWithFindings = {
            packResults: [
                {
                    policyPackId: 'pack-trust',
                    evaluationResult: {
                        findings: [{ severity: 'error', message: 'test', category: 'trust', code: 'TRUST_01' }]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        const dFail = assessFederationEvaluationPolicyGate(resultWithFindings, summary, {
            defaultThreshold: 'warning'
        });
        expect(dFail.evaluationAccepted).toBe(false);

        const dWaived = assessFederationEvaluationPolicyGate(resultWithFindings, summary, {
            defaultThreshold: 'warning',
            waivers: [{ code: 'TRUST_01' }, { code: 'UNUSED_WAIVER' }, { category: 'advisory' }]
        });
        expect(dWaived.evaluationAccepted).toBe(true);
        expect(dWaived.waivedFindingsCount).toBe(1);
        expect(dWaived.waivedPacks).toEqual(['pack-trust']);
        expect(dWaived.triggeringFindingsSummary).toBe('Accepted (rejection prevented by 1 waiver).');
        
        expect(dWaived.waiverAudit).toBeDefined();
        expect(dWaived.waiverAudit!.totalWaiversDefined).toBe(3);
        expect(dWaived.waiverAudit!.totalWaiversMatched).toBe(1);
        expect(dWaived.waiverAudit!.totalWaiversUnused).toBe(2);
        expect(dWaived.waiverAudit!.waiverAffectedOutcome).toBe(true);
        expect(dWaived.waiverAudit!.broadWaiverWarnings).toHaveLength(1); // the advisory category waiver
        expect(dWaived.waiverAudit!.broadWaiverWarnings[0]).toContain("category 'advisory' is waived for all codes and packs");
    });
    test('rejects due to waiver governance enforcement (rejectExpiredWaivers)', () => {
        const summary: FederationEvaluationSeveritySummary = {
            highestSeverity: 'warning',
            severityCounts: { info: 0, warning: 1, error: 0 },
            packsWithInfo: [],
            packsWithWarnings: ['pack-trust'],
            packsWithErrors: [],
            perPack: [],
            summaryMessage: '',
            blockingSeverityReached: true
        };

        const resultWithFindings = {
            packResults: [
                {
                    policyPackId: 'pack-trust',
                    evaluationResult: {
                        findings: [{ severity: 'warning', message: 'test', category: 'trust', code: 'TRUST_01' }]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        const dWaived = assessFederationEvaluationPolicyGate(resultWithFindings, summary, {
            defaultThreshold: 'warning',
            waivers: [{ code: 'TRUST_01', validUntil: '2020-01-01T00:00:00Z' }],
            rejectExpiredWaivers: true
        });

        // The finding would normally be waived, but the waiver is expired, and rejectExpiredWaivers is true.
        // Wait, the finding is still waived (it's skipped for threshold). BUT waiver governance rejects the run!
        expect(dWaived.evaluationAccepted).toBe(false);
        expect(dWaived.waivedFindingsCount).toBe(1);
        expect(dWaived.waiverGovernanceRejected).toBe(true);
        expect(dWaived.waiverGovernanceTriggers).toContain('expiredWaivers');
        expect(dWaived.summaryMessage).toBe('Evaluation rejected by waiver governance escalation.');
    });

    test('rejects due to waiver governance enforcement (broadWaiversWithoutReason)', () => {
        const summary: FederationEvaluationSeveritySummary = {
            highestSeverity: 'info',
            severityCounts: { info: 1, warning: 0, error: 0 },
            packsWithInfo: ['pack-trust'],
            packsWithWarnings: [],
            packsWithErrors: [],
            perPack: [],
            summaryMessage: '',
            blockingSeverityReached: false
        };

        const resultWithFindings = {
            packResults: [
                {
                    policyPackId: 'pack-trust',
                    evaluationResult: {
                        findings: [{ severity: 'info', message: 'test', category: 'trust', code: 'TRUST_01' }]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        const dWaived = assessFederationEvaluationPolicyGate(resultWithFindings, summary, {
            defaultThreshold: 'warning',
            waivers: [{ category: 'trust' }], // broad without reason
            rejectBroadWaiversWithoutReason: true
        });

        expect(dWaived.evaluationAccepted).toBe(false);
        expect(dWaived.waiverGovernanceRejected).toBe(true);
        expect(dWaived.waiverGovernanceTriggers).toContain('broadWaiversWithoutReason');
    });
});
