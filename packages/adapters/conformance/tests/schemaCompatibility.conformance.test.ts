import { describe, test, expect } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { FederationEvaluationPolicyPullRequestPayload, POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';

export function defineSchemaCompatibilityTests(adapter: AdapterConformanceTestCase) {
    if (!adapter.supportsSchemaCompatibilityValidation) {
        return;
    }

    describe('Schema Compatibility Conformance', () => {
        const basePayload: FederationEvaluationPolicyPullRequestPayload = {
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

        test('unsupported pullRequestPayloadSchemaVersion → refusal', async () => {
            const unsupportedPayload = { ...basePayload, pullRequestPayloadSchemaVersion: 'unsupported-schema.v999' };
            const planResult = adapter.buildExecutionPlan(unsupportedPayload);
            
            // It could fail at plan generation or execution depending on the adapter implementation.
            if (planResult.success === false) {
                // Expected, plan generation refused it
                expect(planResult.success).toBe(false);
            } else {
                // If plan is generated, execution must refuse it
                const result = await adapter.executePlan(planResult.plan);
                expect(result.adapterOutcome).toBe('refused');
            }
        });

        test('supported schema version → accepted', () => {
            const planResult = adapter.buildExecutionPlan(basePayload);
            expect(planResult.success).toBe(true);
        });
    });
}
