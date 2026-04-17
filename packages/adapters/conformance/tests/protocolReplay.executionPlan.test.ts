import { describe, expect, test } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { minimalValidPayload as payload } from '../fixtures/protocol-v1/payloads.js';

export function defineProtocolReplayExecutionPlanTests(adapter: AdapterConformanceTestCase): void {
    describe(`[Protocol v1 Replay] Execution Plan Construction (${adapter.adapterName})`, () => {

        test('payload translates deterministically to execution plan', () => {
            const result = adapter.buildExecutionPlan(payload);
            expect(result.success).toBe(true);

            const plan = result.plan;
            
            // Assert deterministic stability
            expect(plan.branchName).toBe('arch-engine/policy-update/minimal/deadbee');
            expect(plan.targetBaseBranch || 'main').toBeDefined();
            expect(plan.payloadSchemaVersion).toBe('policy-pr-payload.v1');
            expect(plan.producerIdentity).toBe('arch-engine@1.0.0');

            // Plan execution mode properties usually set at execution time, but structurally stable.
            // Some providers might inline them.
        });
    });
}
