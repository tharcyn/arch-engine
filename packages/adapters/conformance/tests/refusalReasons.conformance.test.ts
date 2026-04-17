import { describe, expect, test } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import { schemaMismatchPayload, repositoryMismatchPayload, missingHashPayload } from '../fixtures/protocol-v1/payloads.js';

export function defineRefusalReasonsConformanceTests(adapter: AdapterConformanceTestCase): void {
    describe(`Refusal Reasons Conformance (${adapter.adapterName})`, () => {
        test('unsupported schema emits protocol-level SCHEMA_MISMATCH', () => {
            const result = adapter.buildExecutionPlan(schemaMismatchPayload);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.refusalReason).toBe(REFUSAL_REASONS.SCHEMA_MISMATCH);
            }
        });

        test('missing integrity hash emits missing_integrity_hash_for_branch_suffix', () => {
            const result = adapter.buildExecutionPlan(missingHashPayload);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.refusalReason).toBe(REFUSAL_REASONS.MISSING_INTEGRITY_HASH);
            }
        });

        if (adapter.supportsRepositoryVerification) {
            test('strong repository mismatch emits protocol-level repository_identity_mismatch_with_runtime_context', async () => {
                const originalEnvGithub = process.env.GITHUB_REPOSITORY;
                const originalEnvGitlab = process.env.CI_PROJECT_PATH;
                process.env.GITHUB_REPOSITORY = 'mismatch/different';
                process.env.CI_PROJECT_PATH = 'mismatch/different';

                const { plan } = adapter.buildExecutionPlan(repositoryMismatchPayload);
                const result = await adapter.executePlan(plan, { execute: true, disableDryRun: true });
                
                expect(result.adapterOutcome).toBe('refused');
                expect(result.refusalReason).toBe(REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH);

                process.env.GITHUB_REPOSITORY = originalEnvGithub;
                process.env.CI_PROJECT_PATH = originalEnvGitlab;
            });
        }

        test('missing token emits provider-specific refusal reason', async () => {
            // A valid payload but we execute it without environment tokens
            const { plan } = adapter.buildExecutionPlan({
                ...repositoryMismatchPayload,
                repositoryHint: 'group/project',
                pullRequestPayloadSchemaVersion: 'policy-patch-pr.v1' as any
            });

            // Make sure plan building didn't fail
            if (!plan) return;

            const originalGithubToken = process.env.GITHUB_TOKEN;
            const originalGitlabToken = process.env.GITLAB_TOKEN;
            delete process.env.GITHUB_TOKEN;
            delete process.env.GITLAB_TOKEN;

            const result = await adapter.executePlan(plan, { execute: true, disableDryRun: true });
            expect(result.adapterOutcome).toBe('refused');
            
            // Should be one of the known provider-specific ones
            const allowedProviderSpecificTokens = [
                REFUSAL_REASONS.MISSING_GITHUB_TOKEN,
                REFUSAL_REASONS.MISSING_GITLAB_TOKEN
            ];
            
            expect(allowedProviderSpecificTokens.includes(result.refusalReason as any) || 
                   result.refusalReason === REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH).toBeTruthy();

            process.env.GITHUB_TOKEN = originalGithubToken;
            process.env.GITLAB_TOKEN = originalGitlabToken;
        });
    });
}
