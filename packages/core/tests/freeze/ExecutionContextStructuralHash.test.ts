import { describe, it, expect } from 'vitest';
import { computeExecutionContextHash } from '../../src/policy/PolicyExecutionContext';

describe('ExecutionContextStructuralHash', () => {
    it('generates a stable deterministic hash trimming undefined', () => {
        const hash = computeExecutionContextHash({
            policyRelevantDiff: { additions: [], removals: [], metadataChanges: [], isZeroDiff: false },
            topologyGraph: { nodes: [], edges: [], graphSurfaceVersion: '1.0.0', graphSurfaceHash: 'hash123' },
            capabilityManifest: { 'supports_directionality': true },
            policyPackMetadata: { 'core_pack': true },
            executionPlanMetadata: { evaluationMode: 'strict' },
            engineRuntimeMetadata: { version: '1.0.0' }
        });
        
        expect(hash).toMatchInlineSnapshot(`"b3382b3cb9607672efa37a371ddf17b0527b0f96da66737a62bf68626c465393"`);
    });

    it('generates identical hash regardless of key order', () => {
        const hash1 = computeExecutionContextHash({
            policyRelevantDiff: { additions: [], removals: [], metadataChanges: [], isZeroDiff: false },
            topologyGraph: { nodes: [], edges: [], graphSurfaceVersion: '1.0.0', graphSurfaceHash: 'hash123' },
            capabilityManifest: { 'supports_directionality': true, 'other_cap': false },
            policyPackMetadata: { 'core_pack': true },
            executionPlanMetadata: { evaluationMode: 'strict' },
            engineRuntimeMetadata: { version: '1.0.0' }
        });

        const hash2 = computeExecutionContextHash({
            policyRelevantDiff: { additions: [], removals: [], metadataChanges: [], isZeroDiff: false },
            topologyGraph: { nodes: [], edges: [], graphSurfaceVersion: '1.0.0', graphSurfaceHash: 'hash123' },
            capabilityManifest: { 'other_cap': false, 'supports_directionality': true },
            policyPackMetadata: { 'core_pack': true },
            executionPlanMetadata: { evaluationMode: 'strict' },
            engineRuntimeMetadata: { version: '1.0.0' }
        });

        expect(hash1).toBe(hash2);
    });
});
