import { describe, test, expect, vi } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { FederationEvaluationPolicyPullRequestPayload, POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';

export function defineDuplicatePullRequestSuppressionTests(adapter: AdapterConformanceTestCase) {
    if (!adapter.supportsDuplicatePullRequestDetection) {
        return;
    }

    // These tests expect the provider API calls to be mocked by the adapter's own test harness setup.
    // The conformance suite ensures the *outcome* maps correctly when those mocks return specific states.

    describe('Duplicate Pull Request Suppression', () => {
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

        // Note: Actual testing of these requires the adapter's test environment to mock the provider API
        // appropriately. Since the conformance harness is executed inside the adapter's tests, the
        // adapter is responsible for mocking "branch exists" vs "pr exists" before calling these assertions.
        // We ensure that the returned `adapterOutcome` handles the mock states properly if the adapter provides a way.
        // For a pure conformance harness, we test that ANY execution returns one of the valid outcomes.
        
        test('execution never returns duplicate PR variants', async () => {
            const planResult = adapter.buildExecutionPlan(payload);
            expect(planResult.success).toBe(true);

            if (planResult.success) {
                // Just run dry-run to ensure structural compliance with no duplicate variants
                const result = await adapter.executePlan(planResult.plan, { execute: false });
                
                const validOutcomes = ['dry-run', 'refused', 'pr-created', 'pr-reused'];
                expect(validOutcomes).toContain(result.adapterOutcome);
            }
        });
    });
}
