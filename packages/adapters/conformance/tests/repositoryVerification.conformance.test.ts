import { describe, test, expect } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { POLICY_PR_PAYLOAD_SCHEMA_VERSION, FederationEvaluationPolicyPullRequestPayload } from '@arch-engine/core';

export function defineRepositoryVerificationTests(adapter: AdapterConformanceTestCase) {
    if (!adapter.supportsRepositoryVerification) {
        return;
    }

    describe('Repository Identity Verification Conformance', () => {
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

        test('strong match → allowed execution plan', async () => {
            const originalEnvGithub = process.env.GITHUB_REPOSITORY;
            const originalEnvGitlab = process.env.CI_PROJECT_PATH;
            process.env.GITHUB_REPOSITORY = 'tharcyn/arch-engine';
            process.env.CI_PROJECT_PATH = 'tharcyn/arch-engine';

            const planResult = adapter.buildExecutionPlan(basePayload);
            expect(planResult.success).toBe(true);

            if (planResult.success) {
                const result = await adapter.executePlan(planResult.plan, { execute: false });
                expect(result.adapterOutcome).toBe('dry-run');
                expect(result.repositoryContextVerified).toBe(true);
            }

            process.env.GITHUB_REPOSITORY = originalEnvGithub;
            process.env.CI_PROJECT_PATH = originalEnvGitlab;
        });

        test('strong mismatch → refusal result', async () => {
            const originalEnvGithub = process.env.GITHUB_REPOSITORY;
            const originalEnvGitlab = process.env.CI_PROJECT_PATH;
            process.env.GITHUB_REPOSITORY = 'other/repo';
            process.env.CI_PROJECT_PATH = 'other/repo';

            const planResult = adapter.buildExecutionPlan(basePayload);
            expect(planResult.success).toBe(true);

            if (planResult.success) {
                const result = await adapter.executePlan(planResult.plan, { execute: true });
                expect(result.adapterOutcome).toBe('refused');
                expect(result.repositoryContextVerified).toBe(false);
            }

            process.env.GITHUB_REPOSITORY = originalEnvGithub;
            process.env.CI_PROJECT_PATH = originalEnvGitlab;
        });

        test('weak mismatch advisory → allowed dry-run', async () => {
            const weakPayload = { ...basePayload, repositoryHintSource: 'package-json' as const, authoritative: false };
            const originalEnvGithub = process.env.GITHUB_REPOSITORY;
            const originalEnvGitlab = process.env.CI_PROJECT_PATH;
            process.env.GITHUB_REPOSITORY = 'other/repo';
            process.env.CI_PROJECT_PATH = 'other/repo';

            const planResult = adapter.buildExecutionPlan(weakPayload);
            expect(planResult.success).toBe(true);

            if (planResult.success) {
                const result = await adapter.executePlan(planResult.plan, { execute: false });
                expect(result.adapterOutcome).toBe('dry-run');
                expect(result.repositoryContextVerified).toBe(false);
                expect(result.repositoryIdentityAdvisory).toBe(true);
            }

            process.env.GITHUB_REPOSITORY = originalEnvGithub;
            process.env.CI_PROJECT_PATH = originalEnvGitlab;
        });

        test('weak mismatch execute → refusal', async () => {
            const weakPayload = { ...basePayload, repositoryHintSource: 'package-json' as const, authoritative: false };
            const originalEnvGithub = process.env.GITHUB_REPOSITORY;
            const originalEnvGitlab = process.env.CI_PROJECT_PATH;
            process.env.GITHUB_REPOSITORY = 'other/repo';
            process.env.CI_PROJECT_PATH = 'other/repo';

            const planResult = adapter.buildExecutionPlan(weakPayload);
            expect(planResult.success).toBe(true);

            if (planResult.success) {
                const result = await adapter.executePlan(planResult.plan, { execute: true });
                expect(result.adapterOutcome).toBe('refused');
                expect(result.repositoryContextVerified).toBe(false);
            }

            process.env.GITHUB_REPOSITORY = originalEnvGithub;
            process.env.CI_PROJECT_PATH = originalEnvGitlab;
        });
    });
}
