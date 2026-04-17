import { describe, test, expect } from 'vitest';
import { assessPolicyPackExecutionCompatibility } from '../../src/policy/assessPolicyPackExecutionCompatibility';
import type { PolicyPackMetadata } from '../../src/policy/PolicyPackMetadata';

describe('Phase 14D assessPolicyPackExecutionCompatibility', () => {

    test('compatible when policy packs declare no capabilities or governance requirements', () => {
        const result = assessPolicyPackExecutionCompatibility(
            {}, {}, {}, {}, {},
            [{ policyPackId: 'pack1', description: '', category: '' }]
        );
        expect(result.overallStatus).toBe('compatible');
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].code).toBe('POLICY_PACK_EXECUTION_COMPATIBLE');
        expect(result.packResults).toHaveLength(1);
        expect(result.packResults[0].executionStatus).toBe('compatible');
    });

    test('incompatible when capability is missing', () => {
        const result = assessPolicyPackExecutionCompatibility(
            {}, // empty capability manifest
            {}, {}, {}, {},
            [{ 
                policyPackId: 'pack1', description: '', category: '', 
                requiredDatasetCapabilities: ['supports_foo'] 
            }]
        );
        expect(result.overallStatus).toBe('incompatible');
        expect(result.packResults[0].executionStatus).toBe('incompatible');
        expect(result.packResults[0].capabilityStatus).toBe('incompatible');
        expect(result.packResults[0].governanceStatus).toBe('compatible');
        expect(result.findings[0].code).toBe('POLICY_PACK_EXECUTION_INCOMPATIBLE');
        expect(result.findings[0].capabilityFindings).toHaveLength(1);
    });

    test('incompatible when governance requirement is missing', () => {
        const result = assessPolicyPackExecutionCompatibility(
            { 'supports_foo': true },
            {}, {}, {}, {},
            [{ 
                policyPackId: 'pack1', description: '', category: '', 
                requiredDatasetCapabilities: ['supports_foo'],
                requiredMutationClasses: ['some_mutation']
            }]
        );
        expect(result.overallStatus).toBe('incompatible');
        expect(result.packResults[0].executionStatus).toBe('incompatible');
        expect(result.packResults[0].capabilityStatus).toBe('compatible'); // capabilities are fine
        expect(result.packResults[0].governanceStatus).toBe('incompatible'); // governance failed
        expect(result.findings[0].code).toBe('POLICY_PACK_EXECUTION_INCOMPATIBLE');
        expect(result.findings[0].governanceFindings).toHaveLength(1);
    });

    test('partially-compatible when optional capability is missing', () => {
        const result = assessPolicyPackExecutionCompatibility(
            {}, // empty capability manifest
            {}, {}, {}, {},
            [{ 
                policyPackId: 'pack1', description: '', category: '', 
                optionalDatasetCapabilities: ['supports_foo'] 
            }]
        );
        expect(result.overallStatus).toBe('partially-compatible');
        expect(result.packResults[0].executionStatus).toBe('partially-compatible');
        expect(result.packResults[0].capabilityStatus).toBe('partially-compatible');
        expect(result.findings[0].code).toBe('POLICY_PACK_EXECUTION_PARTIALLY_COMPATIBLE');
    });

    test('incompatible with mixed packs (one fully compatible, one missing capability)', () => {
        const result = assessPolicyPackExecutionCompatibility(
            { 'core_feature': true },
            { 'core_mutation': {} }, {}, {}, {},
            [
                { 
                    policyPackId: 'packA', description: '', category: '', 
                    requiredDatasetCapabilities: ['core_feature'],
                    requiredMutationClasses: ['core_mutation']
                },
                { 
                    policyPackId: 'packB', description: '', category: '', 
                    requiredDatasetCapabilities: ['advanced_feature'] 
                }
            ]
        );
        expect(result.overallStatus).toBe('incompatible');
        expect(result.packResults).toHaveLength(2);
        
        const packA = result.packResults.find(p => p.policyPackId === 'packA')!;
        expect(packA.executionStatus).toBe('compatible');
        
        const packB = result.packResults.find(p => p.policyPackId === 'packB')!;
        expect(packB.executionStatus).toBe('incompatible');
    });

    test('unknown when no policy packs are provided', () => {
        const result = assessPolicyPackExecutionCompatibility(
            {}, {}, {}, {}, {},
            []
        );
        expect(result.overallStatus).toBe('unknown');
    });

});
