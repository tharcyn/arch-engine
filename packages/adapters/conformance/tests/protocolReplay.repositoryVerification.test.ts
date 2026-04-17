import { describe, expect, test } from 'vitest';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { 
    repositoryMismatchPayload,
    advisoryRepositoryPayload 
} from '../fixtures/protocol-v1/payloads.js';

export function defineProtocolReplayRepositoryVerificationTests(adapter: AdapterConformanceTestCase): void {
    if (!adapter.supportsRepositoryVerification) return;

    describe(`[Protocol v1 Replay] Repository Verification (${adapter.adapterName})`, () => {
        // Note: Full end-to-end repository mismatch verification depends on the mocked environment 
        // in the specific adapter's conformance invocation. 
        // We will assert the resulting output if it properly simulates mismatch.

        test('strong mismatch -> execute refused', async () => {
            const originalEnvGithub = process.env.GITHUB_REPOSITORY;
            const originalEnvGitlab = process.env.CI_PROJECT_PATH;
            process.env.GITHUB_REPOSITORY = 'mismatch/different';
            process.env.CI_PROJECT_PATH = 'mismatch/different';

            const payload = repositoryMismatchPayload;
            const { plan } = adapter.buildExecutionPlan(payload);
            
            const result = await adapter.executePlan(plan, { execute: true, disableDryRun: true });
            expect(result.repositoryContextVerified).toBe(false);
            expect(result.adapterOutcome).toBe('refused');
            expect(result.refusalReason).toBe(REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH);

            process.env.GITHUB_REPOSITORY = originalEnvGithub;
            process.env.CI_PROJECT_PATH = originalEnvGitlab;
        });

        test('weak mismatch dry-run -> advisory', async () => {
            const originalEnvGithub = process.env.GITHUB_REPOSITORY;
            const originalEnvGitlab = process.env.CI_PROJECT_PATH;
            process.env.GITHUB_REPOSITORY = 'mismatch/different';
            process.env.CI_PROJECT_PATH = 'mismatch/different';

            const payload = advisoryRepositoryPayload;
            const { plan } = adapter.buildExecutionPlan(payload);

            // dry-run
            const result = await adapter.executePlan(plan, { execute: false });
            expect(result.repositoryContextVerified).toBe(false);
            // It allows dry-run completion, but includes an advisory
            expect(result.adapterOutcome).not.toBe('refused');
            expect(result.repositoryIdentityAdvisory).toBe(true);
            expect(result.refusalReason).toBeUndefined();

            process.env.GITHUB_REPOSITORY = originalEnvGithub;
            process.env.CI_PROJECT_PATH = originalEnvGitlab;
        });

        test('weak mismatch execute -> refused', async () => {
            const originalEnvGithub = process.env.GITHUB_REPOSITORY;
            const originalEnvGitlab = process.env.CI_PROJECT_PATH;
            process.env.GITHUB_REPOSITORY = 'mismatch/different';
            process.env.CI_PROJECT_PATH = 'mismatch/different';

            const payload = advisoryRepositoryPayload;
            const { plan } = adapter.buildExecutionPlan(payload);

            // live execute
            const result = await adapter.executePlan(plan, { execute: true, disableDryRun: true });
            expect(result.repositoryContextVerified).toBe(false);
            expect(result.adapterOutcome).toBe('refused');
            expect(result.refusalReason).toBe(REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH);

            process.env.GITHUB_REPOSITORY = originalEnvGithub;
            process.env.CI_PROJECT_PATH = originalEnvGitlab;
        });
    });
}
