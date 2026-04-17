import { describe, test, expect } from 'vitest';
import { assessPolicyPackDatasetCapabilityCompatibility } from '../../src/policy/assessPolicyPackDatasetCapabilityCompatibility';
import type { PolicyPackMetadata } from '../../src/policy/PolicyPackMetadata';

const activeManifest = {
    supports_authority_scope: true,
    supports_directionality: true
};

function makePack(id: string, required?: string[], optional?: string[]): PolicyPackMetadata {
    return {
        policyPackId: id,
        description: 'Test pack',
        category: 'test',
        requiredDatasetCapabilities: required,
        optionalDatasetCapabilities: optional
    };
}

describe('assessPolicyPackDatasetCapabilityCompatibility', () => {
    test('returns compatible when no packs require capabilities', () => {
        const result = assessPolicyPackDatasetCapabilityCompatibility(activeManifest, [
            makePack('pack1'),
            makePack('pack2')
        ]);
        expect(result.overallStatus).toBe('compatible'); // Evaluated packs = 0, so it defaults to compatible
    });

    test('returns compatible when all required and optional capabilities are present', () => {
        const result = assessPolicyPackDatasetCapabilityCompatibility(activeManifest, [
            makePack('pack1', ['supports_authority_scope'], ['supports_directionality'])
        ]);
        expect(result.overallStatus).toBe('compatible');
        expect(result.findings.length).toBe(2);
        expect(result.findings.every(f => f.status === 'compatible')).toBe(true);
    });

    test('returns incompatible when a required capability is missing', () => {
        const result = assessPolicyPackDatasetCapabilityCompatibility(activeManifest, [
            makePack('pack1', ['supports_authority_scope', 'supports_magic'])
        ]);
        expect(result.overallStatus).toBe('incompatible');
        const missing = result.findings.find(f => f.code === 'POLICY_PACK_DATASET_CAPABILITY_MISSING_REQUIRED');
        expect(missing).toBeDefined();
        expect(missing!.capability).toBe('supports_magic');
    });

    test('returns partially-compatible when an optional capability is missing', () => {
        const result = assessPolicyPackDatasetCapabilityCompatibility(activeManifest, [
            makePack('pack1', ['supports_authority_scope'], ['supports_magic'])
        ]);
        expect(result.overallStatus).toBe('partially-compatible');
        const missing = result.findings.find(f => f.code === 'POLICY_PACK_DATASET_CAPABILITY_MISSING_OPTIONAL');
        expect(missing).toBeDefined();
        expect(missing!.capability).toBe('supports_magic');
    });

    test('returns incompatible if both required and optional are missing', () => {
        const result = assessPolicyPackDatasetCapabilityCompatibility(activeManifest, [
            makePack('pack1', ['missing_req'], ['missing_opt'])
        ]);
        expect(result.overallStatus).toBe('incompatible'); // Incompatible overrides partially-compatible
    });

    test('mixed multiple policy packs', () => {
        const result = assessPolicyPackDatasetCapabilityCompatibility(activeManifest, [
            makePack('pack1', ['supports_authority_scope']), // Compatible
            makePack('pack2', undefined, ['missing_opt']), // Partially-compatible
            makePack('pack3', ['missing_req']) // Incompatible
        ]);
        expect(result.overallStatus).toBe('incompatible');
        
        expect(result.findings.some(f => f.status === 'compatible')).toBe(true);
        expect(result.findings.some(f => f.status === 'partially-compatible')).toBe(true);
        expect(result.findings.some(f => f.status === 'incompatible')).toBe(true);
    });

    test('handles undefined manifest safely', () => {
        const result = assessPolicyPackDatasetCapabilityCompatibility(undefined, [
            makePack('pack1', ['any_req'])
        ]);
        expect(result.overallStatus).toBe('incompatible');
    });
});
