import { describe, test, expect } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { FederationEvaluationPolicyPullRequestPayload, POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';

export function defineAdapterOutcomeNormalizationTests(adapter: AdapterConformanceTestCase) {
    describe('Adapter Outcome Normalization', () => {
        const payload: FederationEvaluationPolicyPullRequestPayload = {
            pullRequestPayloadSchemaVersion: POLICY_PR_PAYLOAD_SCHEMA_VERSION,
            exportArtifactSchemaVersion: 'export.v1',
            exportArtifactProducerIdentity: 'arch-engine@1.0.0',
            exportArtifactIntegrityHash: 'mock-hash-value',
            targetProfile: 'ci',
            targetProfileSource: 'cli',
            suggestedTitle: 'Mock PR',
            suggestedCommitMessage: 'Mock commit',
            suggestedBodyMarkdown: 'Mock body',
            changedPaths: [],
            evaluationContextFingerprint: 'mock-context-fingerprint',
            policyFileFingerprint: 'mock-policy-fingerprint',
            authoritative: true,
            repositoryHint: 'tharcyn/arch-engine',
            repositoryHintSource: 'env',
            disclaimerFlags: {
                repositoryHintDerivedFromPackageJson: false,
                nonAuthoritativePatch: false
            }
        };

        test('adapters must only emit standard lifecycle variants', async () => {
            const planResult = adapter.buildExecutionPlan(payload);
            expect(planResult.success).toBe(true);

            if (planResult.success) {
                const result = await adapter.executePlan(planResult.plan, { execute: false });
                const validOutcomes = ['dry-run', 'refused', 'pr-created', 'pr-reused'];
                
                expect(validOutcomes).toContain(result.adapterOutcome);
                
                // Ensure no custom variants exist in the returned structure
                expect(result.adapterOutcome).not.toBe('mr-created');
                expect(result.adapterOutcome).not.toBe('merge-request-created');
                expect(result.adapterOutcome).not.toBe('branch-created');
            }
        });
    });
}
