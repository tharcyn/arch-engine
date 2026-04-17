import { describe, expect, test } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import { schemaMismatchPayload, repositoryMismatchPayload, missingHashPayload } from '../fixtures/protocol-v1/payloads.js';

export function defineProtocolReplayRefusalReasonsTests(adapter: AdapterConformanceTestCase): void {
    describe(`[Protocol v1 Replay] Refusal Reasons (${adapter.adapterName})`, () => {
        test('schema mismatch always emits exact byte-stable refusal string', () => {
            const result = adapter.buildExecutionPlan(schemaMismatchPayload);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.refusalReason).toStrictEqual('SCHEMA_MISMATCH');
            }
        });

        test('repository mismatch always emits exact byte-stable refusal string', async () => {
            if (!adapter.supportsRepositoryVerification) return;
            const originalEnvGithub = process.env.GITHUB_REPOSITORY;
            const originalEnvGitlab = process.env.CI_PROJECT_PATH;
            process.env.GITHUB_REPOSITORY = 'mismatch/different';
            process.env.CI_PROJECT_PATH = 'mismatch/different';

            const { plan } = adapter.buildExecutionPlan(repositoryMismatchPayload);
            const result = await adapter.executePlan(plan, { execute: true, disableDryRun: true });
            
            expect(result.adapterOutcome).toBe('refused');
            expect(result.refusalReason).toStrictEqual('repository_identity_mismatch_with_runtime_context');

            process.env.GITHUB_REPOSITORY = originalEnvGithub;
            process.env.CI_PROJECT_PATH = originalEnvGitlab;
        });

        test('missing integrity hash always emits exact byte-stable refusal string', () => {
            const result = adapter.buildExecutionPlan(missingHashPayload);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.refusalReason).toStrictEqual('missing_integrity_hash_for_branch_suffix');
            }
        });

        test('missing token emits byte-stable provider-specific refusal string', async () => {
            const { plan } = adapter.buildExecutionPlan({
                ...repositoryMismatchPayload,
                repositoryHint: 'group/project',
                pullRequestPayloadSchemaVersion: 'policy-patch-pr.v1' as any
            });

            if (!plan) return;

            const originalGithubToken = process.env.GITHUB_TOKEN;
            const originalGitlabToken = process.env.GITLAB_TOKEN;
            delete process.env.GITHUB_TOKEN;
            delete process.env.GITLAB_TOKEN;

            const result = await adapter.executePlan(plan, { execute: true, disableDryRun: true });
            expect(result.adapterOutcome).toBe('refused');
            
            const expectedTokens = ['MISSING_GITHUB_TOKEN', 'MISSING_GITLAB_TOKEN', 'repository_identity_mismatch_with_runtime_context'];
            expect(expectedTokens.includes(result.refusalReason as string)).toBe(true);

            process.env.GITHUB_TOKEN = originalGithubToken;
            process.env.GITLAB_TOKEN = originalGitlabToken;
        });
    });
}
