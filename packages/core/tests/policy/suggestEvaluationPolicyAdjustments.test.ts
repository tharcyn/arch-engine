import { describe, test, expect } from 'vitest';
import { suggestEvaluationPolicyAdjustments } from '../../src/policy/suggestEvaluationPolicyAdjustments';
import type { FederationFindingInspectionReport } from '../../src/policy/inspectFederationEvaluationFindings';
import type { FederationEvaluationPolicyDecision } from '../../src/policy/assessFederationEvaluationPolicyGate';

describe('Phase 16R suggestEvaluationPolicyAdjustments', () => {
    test('generates no suggestions for clean run', () => {
        const report = {
            taxonomyRepairedCodes: [],
            codeSummaries: []
        } as unknown as FederationFindingInspectionReport;

        const result = suggestEvaluationPolicyAdjustments(report);
        expect(result.suggestions).toHaveLength(0);
        expect(result.summaryMessage).toBe('No policy adjustments suggested. Architecture baseline is clean.');
    });

    test('generates taxonomy cleanup suggestions', () => {
        const report = {
            taxonomyRepairedCodes: ['LOCAL_MALFORMED'],
            codeSummaries: []
        } as unknown as FederationFindingInspectionReport;

        const result = suggestEvaluationPolicyAdjustments(report);
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0].suggestionType).toBe('taxonomy_cleanup');
        expect(result.suggestions[0].target).toBe('LOCAL_MALFORMED');
        expect(result.suggestions[0].isRisky).toBe(false);
    });

    test('generates exact code override suggestion when single code fails in a category', () => {
        const report = {
            taxonomyRepairedCodes: [],
            codeSummaries: [
                {
                    code: 'ARCH_TRUST_01',
                    category: 'trust',
                    coreReserved: true,
                    countsBySeverity: { info: 0, warning: 1, error: 0 }
                }
            ]
        } as unknown as FederationFindingInspectionReport;

        const result = suggestEvaluationPolicyAdjustments(report);
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0].suggestionType).toBe('code_override');
        expect(result.suggestions[0].target).toBe('ARCH_TRUST_01');
        expect(result.suggestions[0].isRisky).toBe(true);
        expect(result.suggestions[0].snippetType).toBe('code_override');
        expect(result.suggestions[0].snippetPathHint).toBe('profiles.default.codeOverrides');
        expect(result.suggestions[0].profileTarget).toBe('default');
        expect(result.suggestions[0].profileTargetSource).toBe('synthetic-fallback');
        expect(result.suggestions[0].snippetJson).toEqual({ ARCH_TRUST_01: 'info' });
    });

    test('generates category override suggestion when multiple codes fail in a category', () => {
        const report = {
            taxonomyRepairedCodes: [],
            codeSummaries: [
                {
                    code: 'LOCAL_01',
                    category: 'trust',
                    coreReserved: false,
                    countsBySeverity: { info: 0, warning: 1, error: 0 }
                },
                {
                    code: 'LOCAL_02',
                    category: 'trust',
                    coreReserved: false,
                    countsBySeverity: { info: 0, warning: 0, error: 1 }
                }
            ]
        } as unknown as FederationFindingInspectionReport;

        const result = suggestEvaluationPolicyAdjustments(report);
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0].suggestionType).toBe('category_override');
        expect(result.suggestions[0].target).toBe('trust');
        expect(result.suggestions[0].isRisky).toBe(false);
        expect(result.suggestions[0].snippetType).toBe('category_override');
        expect(result.suggestions[0].snippetPathHint).toBe('profiles.default.categoryOverrides');
        expect(result.suggestions[0].snippetJson).toEqual({ trust: 'info' });
    });

    test('generates waiver review suggestions', () => {
        const report = {
            taxonomyRepairedCodes: [],
            codeSummaries: []
        } as unknown as FederationFindingInspectionReport;

        const decision = {
            waiverAudit: {
                totalWaiversUnused: 2,
                waiverAffectedOutcome: true
            }
        } as unknown as FederationEvaluationPolicyDecision;

        const result = suggestEvaluationPolicyAdjustments(report, decision);
        expect(result.suggestions).toHaveLength(2);
        
        const unused = result.suggestions.find(s => s.target === 'unused_waivers');
        expect(unused).toBeDefined();
        expect(unused!.suggestionType).toBe('waiver_review');

        const outcome = result.suggestions.find(s => s.target === 'outcome_affecting_waivers');
        expect(outcome).toBeDefined();
        expect(outcome!.isRisky).toBe(true);
        expect(outcome!.snippetType).toBe('waiver');
        expect(outcome!.snippetPathHint).toBe('profiles.default.waivers');
        expect(outcome!.profileTargetSource).toBe('synthetic-fallback');
    });

    test('determines provenance from context correctly', () => {
        const report = {
            taxonomyRepairedCodes: [],
            codeSummaries: [
                {
                    code: 'ARCH_TRUST_01',
                    category: 'trust',
                    coreReserved: true,
                    countsBySeverity: { info: 0, warning: 1, error: 0 }
                }
            ]
        } as unknown as FederationFindingInspectionReport;

        // CLI selected
        let result = suggestEvaluationPolicyAdjustments(report, undefined, { cliSelectedProfile: 'ci' });
        expect(result.suggestions[0].profileTargetSource).toBe('cli-selected');
        expect(result.suggestions[0].profileTarget).toBe('ci');
        expect(result.suggestions[0].snippetPathHint).toBe('profiles.ci.codeOverrides');

        // Policy file default
        result = suggestEvaluationPolicyAdjustments(report, undefined, { policyFileDefaultProfile: 'release' });
        expect(result.suggestions[0].profileTargetSource).toBe('policy-file-default');
        expect(result.suggestions[0].profileTarget).toBe('release');

        // Resolved effective
        result = suggestEvaluationPolicyAdjustments(report, undefined, { resolvedEffectiveProfile: 'prod' });
        expect(result.suggestions[0].profileTargetSource).toBe('effective-policy');
        expect(result.suggestions[0].profileTarget).toBe('prod');
    });
});
