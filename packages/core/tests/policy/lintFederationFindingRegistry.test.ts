import { describe, test, expect } from 'vitest';
import { lintFederationFindingRegistry } from '../../src/policy/lintFederationFindingRegistry';
import type { FederationEvaluationResult } from '../../src/policy/runFederationEvaluationPlan';

describe('Phase 16S lintFederationFindingRegistry', () => {

    test('generates no issues for clean run', () => {
        const result = {
            packResults: [
                {
                    policyPackId: 'pack-a',
                    evaluationResult: {
                        findings: [
                            { code: 'ARCH_TRUST_01', category: 'trust', severity: 'warning', taxonomyRepaired: false },
                            { code: 'LOCAL_01', category: 'advisory', severity: 'info', taxonomyRepaired: false }
                        ]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        const report = lintFederationFindingRegistry(result);
        expect(report.totalIssues).toBe(0);
        expect(report.issues).toHaveLength(0);
        expect(report.summaryMessage).toBe('Finding registry is clean. No taxonomy or core protection issues found.');
    });

    test('detects taxonomy repaired findings', () => {
        const result = {
            packResults: [
                {
                    policyPackId: 'pack-a',
                    evaluationResult: {
                        findings: [
                            { code: 'LOCAL_01', category: 'trust', taxonomyRepaired: true }
                        ]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        const report = lintFederationFindingRegistry(result);
        expect(report.totalIssues).toBe(1);
        expect(report.issues[0].issueType).toBe('TAXONOMY_REPAIRED_FINDING');
        expect(report.issues[0].severity).toBe('warning');
    });

    test('detects core prefix impersonation', () => {
        const result = {
            packResults: [
                {
                    policyPackId: 'pack-a',
                    evaluationResult: {
                        findings: [
                            { code: 'INVALID_PREFIX_ARCH_BAD', category: 'trust', taxonomyRepaired: true }
                        ]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        const report = lintFederationFindingRegistry(result);
        // It should flag both TAXONOMY_REPAIRED and CORE_PREFIX_IMPERSONATION
        expect(report.totalIssues).toBe(2);
        
        const impersonation = report.issues.find(i => i.issueType === 'CORE_PREFIX_IMPERSONATION');
        expect(impersonation).toBeDefined();
        expect(impersonation!.severity).toBe('error');
    });

    test('detects reserved code category mismatch', () => {
        const result = {
            packResults: [
                {
                    policyPackId: 'pack-core',
                    evaluationResult: {
                        findings: [
                            { code: 'ARCH_EXECUTION_01', category: 'trust', taxonomyRepaired: false }
                        ]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        const report = lintFederationFindingRegistry(result);
        expect(report.totalIssues).toBe(1);
        expect(report.issues[0].issueType).toBe('RESERVED_CODE_CATEGORY_MISMATCH');
        expect(report.issues[0].severity).toBe('error');
    });

    test('detects suspicious core like code', () => {
        const result = {
            packResults: [
                {
                    policyPackId: 'pack-a',
                    evaluationResult: {
                        findings: [
                            { code: 'ARCHAIC_CODE', category: 'trust', taxonomyRepaired: false },
                            { code: 'ARC_CODE', category: 'trust', taxonomyRepaired: false }
                        ]
                    }
                }
            ]
        } as unknown as FederationEvaluationResult;

        const report = lintFederationFindingRegistry(result);
        expect(report.totalIssues).toBe(2);
        expect(report.issues.every(i => i.issueType === 'SUSPICIOUS_CORE_LIKE_CODE')).toBe(true);
    });
});
