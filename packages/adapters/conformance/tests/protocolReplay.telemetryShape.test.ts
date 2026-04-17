import { describe, expect, test } from 'vitest';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { minimalValidPayload as payload } from '../fixtures/protocol-v1/payloads.js';

export function defineProtocolReplayTelemetryShapeTests(adapter: AdapterConformanceTestCase): void {
    describe(`[Protocol v1 Replay] Telemetry Structure (${adapter.adapterName})`, () => {
        test('execution returns stable AdapterExecutionResultBase shape', async () => {
            const { plan } = adapter.buildExecutionPlan(payload);
            const result = await adapter.executePlan(plan);
            
            // Validate required AdapterExecutionResultBase properties
            expect(result).toHaveProperty('executionMode');
            expect(result).toHaveProperty('executionPerformed');
            expect(result).toHaveProperty('branchName');
            expect(result).toHaveProperty('repositoryContextVerified');
            expect(result).toHaveProperty('repositoryIdentityAdvisory');
            expect(result).toHaveProperty('adapterOutcome');

            // Enforce values for dry-run
            expect(['dry-run', 'execute']).toContain(result.executionMode);
            expect(result.executionMode).toBe('dry-run');
            expect(result.executionPerformed).toBe(false);
            expect(['dry-run', 'refused', 'pr-created', 'pr-reused']).toContain(result.adapterOutcome);
            expect(result.adapterOutcome).toBe('dry-run');

            // Enforce nullability invariants (no nulls allowed)
            for (const key of Object.keys(result)) {
                expect((result as any)[key]).not.toBeNull();
            }
        });
    });
}
