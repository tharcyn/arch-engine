import { describe, test, expect, vi } from 'vitest';
import { runFederatedEvaluationPlan } from '../../src/federation/runFederatedEvaluationPlan.js';

vi.mock('../../src/topology/projectValidatedDatasetToValidatorView.js', () => ({
    projectValidatedDatasetToValidatorView: vi.fn((ds) => ds)
}));

vi.mock('../../src/topology/extractTopologyGraph.js', () => ({
    extractTopologyGraph: vi.fn(() => ({ nodes: [], edges: [] }))
}));

vi.mock('../../src/federation/computeFederatedCapabilityMatrix.js', () => ({
    computeFederatedCapabilityMatrix: vi.fn(() => ({
        intersectionCapabilities: [],
        unionCapabilities: [],
        incompatibleCapabilities: [],
        federationCompatible: true,
        diagnostics: []
    }))
}));

vi.mock('../../src/federation/loadFederatedTopologyDatasets.js', () => ({
    loadFederatedTopologyDatasets: vi.fn(() => ({
        datasets: [],
        datasetIdentityHashes: ['h1'],
        datasetCapabilityIntersection: { supports_magic: true },
        datasetCapabilityUnion: { supports_magic: true },
        providerDatasetMap: { github: {} }
    }))
}));

vi.mock('../../src/topology/PolicyPackRunner.js', () => {
    return {
        PolicyPackRunner: class {
            run() {
                return [{
                    policyPackId: 'test',
                    success: true,
                    diagnostics: [{ severity: 'error', code: 'TEST', message: 'msg', policyRuleId: 'r1' }]
                }];
            }
        }
    };
});

describe('Federated Evaluation Runner', () => {
    test('invokes dependencies and returns federated evaluation result', () => {
        const inputs = [{ providerId: 'github', datasetPath: 'dummy.json' }];
        const result = runFederatedEvaluationPlan(inputs, []);

        expect(result.providers).toEqual(['github']);
        expect(result.mergedFindings.length).toBe(1);
        expect(result.mergedFindings[0].code).toBe('TEST');
        expect(result.compatibilityDiagnostics.length).toBe(0);
        expect(result.federationExecutionHash).toBeDefined();
    });
});
