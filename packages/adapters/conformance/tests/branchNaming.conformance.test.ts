import { describe, test, expect } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { FederationEvaluationPolicyPullRequestPayload, POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';
import { buildShortIntegritySuffix } from '@arch-engine/adapter-shared';

export function defineBranchNamingTests(adapter: AdapterConformanceTestCase) {
    describe('Branch Naming Determinism', () => {
        const createPayload = (hash: string, profile: string): FederationEvaluationPolicyPullRequestPayload => ({
            pullRequestPayloadSchemaVersion: POLICY_PR_PAYLOAD_SCHEMA_VERSION,
            exportArtifactSchemaVersion: 'export.v1',
            exportArtifactProducerIdentity: 'arch-engine@1.0.0',
            exportArtifactIntegrityHash: hash,
            targetProfile: profile,
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
        });

        test('same payload → identical branch name', () => {
            const hash = 'a1b2c3d4e5f6';
            const payload1 = createPayload(hash, 'ci');
            const payload2 = createPayload(hash, 'ci');

            const plan1 = adapter.buildExecutionPlan(payload1);
            const plan2 = adapter.buildExecutionPlan(payload2);

            expect(plan1.success).toBe(true);
            expect(plan2.success).toBe(true);

            if (plan1.success && plan2.success) {
                expect(plan1.plan.branchName).toBe(plan2.plan.branchName);
                
                const expectedSuffix = buildShortIntegritySuffix(hash);
                expect(plan1.plan.branchName).toBe(`arch-engine/policy-update/ci/${expectedSuffix}`);
            }
        });

        test('different payload → different branch name', () => {
            const hash1 = 'a1b2c3d4e5f6';
            const hash2 = '9z8y7x6w5v4u';
            const payload1 = createPayload(hash1, 'ci');
            const payload2 = createPayload(hash2, 'ci');

            const plan1 = adapter.buildExecutionPlan(payload1);
            const plan2 = adapter.buildExecutionPlan(payload2);

            expect(plan1.success).toBe(true);
            expect(plan2.success).toBe(true);

            if (plan1.success && plan2.success) {
                expect(plan1.plan.branchName).not.toBe(plan2.plan.branchName);
            }
        });
    });
}
