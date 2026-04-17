import { describe, expect, test } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { minimalValidPayload as payload } from '../fixtures/protocol-v1/payloads.js';

export function defineProtocolReplayCrossProviderParityTests(adapter: AdapterConformanceTestCase): void {
    describe(`[Protocol v1 Replay] Cross-Provider Parity (${adapter.adapterName})`, () => {

        test('identical inputs yield consistent protocol-compliant plans across providers', () => {
            const result = adapter.buildExecutionPlan(payload);
            expect(result.success).toBe(true);

            const plan = result.plan;
            
            // Standard deterministic fields matching across all adapters
            expect(plan.branchName).toBe('arch-engine/policy-update/minimal/deadbee');
            expect(plan.changedPaths).toEqual(['evaluation-policy.json']);
            expect(plan.payloadSchemaVersion).toBe('policy-pr-payload.v1');
            
            // Repository identity
            expect(plan.repository).toBeDefined();
            expect(plan.repository.repositoryNamespace).toBe('tharcyn');
            expect(plan.repository.repositoryName).toBe('arch-engine');
        });
    });
}
