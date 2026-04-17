import { describe, test, expect } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { FederationEvaluationPolicyPullRequestPayload, POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';

export function defineExecutionTelemetryShapeTests(adapter: AdapterConformanceTestCase) {
    describe(`Execution Telemetry Shape Conformance (${adapter.adapterName})`, () => {
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

        test('required fields always present and no null values emitted', async () => {
            const planResult = adapter.buildExecutionPlan(payload);
            expect(planResult.success).toBe(true);

            if (planResult.success) {
                const result = await adapter.executePlan(planResult.plan, { execute: false });
                
                // executionMode always valid
                expect(result).toHaveProperty('executionMode');
                expect(['dry-run', 'execute']).toContain(result.executionMode);
                
                // executionPerformed consistent with executionMode
                expect(result).toHaveProperty('executionPerformed');
                expect(typeof result.executionPerformed).toBe('boolean');
                if (result.executionMode === 'dry-run') {
                    expect(result.executionPerformed).toBe(false);
                }
                
                expect(result).toHaveProperty('branchName');
                expect(typeof result.branchName).toBe('string');
                
                expect(result).toHaveProperty('repositoryContextVerified');
                expect(typeof result.repositoryContextVerified).toBe('boolean');

                expect(result).toHaveProperty('repositoryIdentityAdvisory');
                expect(typeof result.repositoryIdentityAdvisory).toBe('boolean');
                
                expect(result).toHaveProperty('adapterOutcome');
                expect(['dry-run', 'refused', 'pr-created', 'pr-reused']).toContain(result.adapterOutcome);

                // no null values emitted
                for (const key of Object.keys(result)) {
                    expect((result as any)[key]).not.toBeNull();
                }
            }
        });

        test('optional fields undefined when absent, not null or empty string (unless meaningful)', async () => {
            const planResult = adapter.buildExecutionPlan(payload);
            if (planResult.success) {
                const result = await adapter.executePlan(planResult.plan, { execute: false });
                
                const optionalKeys = [
                    'pullRequestNumber', 'pullRequestUrl', 'mergeRequestIid', 'mergeRequestUrl',
                    'commitSha', 'existingPullRequestNumber', 'existingPullRequestUrl', 'refusalReason'
                ];

                for (const key of optionalKeys) {
                    if (key in result) {
                        const val = (result as any)[key];
                        expect(val).not.toBeNull();
                        expect(val).not.toBe('');
                        expect(val).not.toEqual({});
                        expect(val).not.toBe(false);
                    }
                }
            }
        });
    });
}
