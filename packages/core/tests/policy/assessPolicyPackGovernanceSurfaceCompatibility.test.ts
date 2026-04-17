import { describe, test, expect } from 'vitest';
import { assessPolicyPackGovernanceSurfaceCompatibility } from '../../src/policy/assessPolicyPackGovernanceSurfaceCompatibility';

describe('Phase 14C assessPolicyPackGovernanceSurfaceCompatibility', () => {

    test('compatible when policy packs declare no governance requirements', () => {
        const result = assessPolicyPackGovernanceSurfaceCompatibility(
            {}, {}, {}, {},
            [{ policyPackId: 'pack1', description: '', category: '' }]
        );
        expect(result.overallStatus).toBe('compatible');
        expect(result.findings).toHaveLength(0);
    });

    test('incompatible when required mutation class is missing', () => {
        const result = assessPolicyPackGovernanceSurfaceCompatibility(
            { 'some_other_class': {} }, {}, {}, {},
            [{ 
                policyPackId: 'pack1', description: '', category: '', 
                requiredMutationClasses: ['required_class'] 
            }]
        );
        expect(result.overallStatus).toBe('incompatible');
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0]).toEqual(expect.objectContaining({
            packId: 'pack1',
            code: 'POLICY_PACK_GOVERNANCE_MISSING_MUTATION_CLASS',
            requiredKey: 'required_class',
            missingFrom: 'mutation_class_registry'
        }));
    });

    test('compatible when required mutation class is present', () => {
        const result = assessPolicyPackGovernanceSurfaceCompatibility(
            { 'required_class': {} }, {}, {}, {},
            [{ 
                policyPackId: 'pack1', description: '', category: '', 
                requiredMutationClasses: ['required_class'] 
            }]
        );
        expect(result.overallStatus).toBe('compatible');
    });

    test('incompatible when required authority scope is missing', () => {
        const result = assessPolicyPackGovernanceSurfaceCompatibility(
            {}, { 'other_scope': {} }, {}, {},
            [{ 
                policyPackId: 'pack2', description: '', category: '', 
                requiredAuthorityScopes: ['required_scope'] 
            }]
        );
        expect(result.overallStatus).toBe('incompatible');
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0]).toEqual(expect.objectContaining({
            packId: 'pack2',
            code: 'POLICY_PACK_GOVERNANCE_MISSING_AUTHORITY_SCOPE',
            requiredKey: 'required_scope',
            missingFrom: 'authority_scope_registry'
        }));
    });

    test('incompatible when required surface confidence key is missing', () => {
        const result = assessPolicyPackGovernanceSurfaceCompatibility(
            {}, {}, { 'other_key': {} }, {},
            [{ 
                policyPackId: 'pack3', description: '', category: '', 
                requiredSurfaceConfidenceKeys: ['required_key'] 
            }]
        );
        expect(result.overallStatus).toBe('incompatible');
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0]).toEqual(expect.objectContaining({
            packId: 'pack3',
            code: 'POLICY_PACK_GOVERNANCE_MISSING_SURFACE_CONFIDENCE',
            requiredKey: 'required_key',
            missingFrom: 'surface_confidence_registry'
        }));
    });

    test('incompatible when required trust boundary rule is missing', () => {
        const result = assessPolicyPackGovernanceSurfaceCompatibility(
            {}, {}, {}, { 'other_rule': {} },
            [{ 
                policyPackId: 'pack4', description: '', category: '', 
                requiredTrustBoundaryRules: ['required_rule'] 
            }]
        );
        expect(result.overallStatus).toBe('incompatible');
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0]).toEqual(expect.objectContaining({
            packId: 'pack4',
            code: 'POLICY_PACK_GOVERNANCE_MISSING_TRUST_BOUNDARY_RULE',
            requiredKey: 'required_rule',
            missingFrom: 'trust_boundary_rules'
        }));
    });

    test('unknown when no policy packs are provided', () => {
        const result = assessPolicyPackGovernanceSurfaceCompatibility(
            {}, {}, {}, {},
            []
        );
        expect(result.overallStatus).toBe('unknown');
    });

    test('incompatible with multiple missing requirements across multiple packs', () => {
        const result = assessPolicyPackGovernanceSurfaceCompatibility(
            {}, {}, {}, {},
            [
                { 
                    policyPackId: 'packA', description: '', category: '', 
                    requiredMutationClasses: ['classA'] 
                },
                { 
                    policyPackId: 'packB', description: '', category: '', 
                    requiredTrustBoundaryRules: ['ruleB'] 
                }
            ]
        );
        expect(result.overallStatus).toBe('incompatible');
        expect(result.findings).toHaveLength(2);
        expect(result.findings.map(f => f.packId)).toEqual(expect.arrayContaining(['packA', 'packB']));
    });
});
