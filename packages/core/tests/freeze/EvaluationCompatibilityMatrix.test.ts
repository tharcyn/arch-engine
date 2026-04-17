import { describe, it, expect } from 'vitest';
import { verifyEvaluationCompatibilityMatrix } from '../../src/policy/verifyEvaluationCompatibilityMatrix';
import type { PolicyExecutionContext } from '../../src/policy/PolicyExecutionContext';
import type { TopologyPolicyPack } from '../../src/topology/TopologyPolicyPack';

describe('EvaluationCompatibilityMatrix', () => {
    it('returns compatible when capabilities match', () => {
        const pack: TopologyPolicyPack = {
            policyPackId: 'test_pack',
            metadata: { requiredDatasetCapabilities: ['supports_directionality'] }
        };
        const context: PolicyExecutionContext = {
            policyRelevantDiff: { additions: [], removals: [], metadataChanges: [], isZeroDiff: false },
            topologyGraph: { nodes: [], edges: [] },
            capabilityManifest: { 'supports_directionality': true }
        };

        const result = verifyEvaluationCompatibilityMatrix(pack, context);
        expect(result.isCompatible).toBe(true);
        expect(result.violations).toHaveLength(0);
        expect(result.resolvedCapabilities).toContain('supports_directionality');
    });

    it('returns incompatible when a capability is missing', () => {
        const pack: TopologyPolicyPack = {
            policyPackId: 'test_pack',
            metadata: { requiredDatasetCapabilities: ['supports_directionality'] }
        };
        const context: PolicyExecutionContext = {
            policyRelevantDiff: { additions: [], removals: [], metadataChanges: [], isZeroDiff: false },
            topologyGraph: { nodes: [], edges: [] },
            capabilityManifest: {}
        };

        const result = verifyEvaluationCompatibilityMatrix(pack, context);
        expect(result.isCompatible).toBe(false);
        expect(result.violations[0]).toContain('MISSING_CAPABILITY');
    });

    it('emits warnings when dataset pack implies capability that is missing', () => {
        const pack: TopologyPolicyPack = { policyPackId: 'test_pack' };
        const context: PolicyExecutionContext = {
            policyRelevantDiff: { additions: [], removals: [], metadataChanges: [], isZeroDiff: false },
            topologyGraph: { nodes: [], edges: [] },
            capabilityManifest: {},
            policyPackMetadata: { 'supports_directionality': true }
        };

        const result = verifyEvaluationCompatibilityMatrix(pack, context);
        expect(result.isCompatible).toBe(true); // Warnings don't fail compatibility
        expect(result.warnings[0]).toContain('Dataset implies directionality support');
    });
});
