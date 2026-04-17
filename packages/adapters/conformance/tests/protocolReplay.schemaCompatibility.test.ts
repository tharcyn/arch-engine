import { describe, expect, test } from 'vitest';
import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';
import type { AdapterConformanceTestCase } from '../src/types/AdapterConformanceTestCase.js';
import { schemaMismatchPayload as payload } from '../fixtures/protocol-v1/payloads.js';

export function defineProtocolReplaySchemaCompatibilityTests(adapter: AdapterConformanceTestCase): void {
    describe(`[Protocol v1 Replay] Schema Compatibility (${adapter.adapterName})`, () => {

        test('unsupported payload schema always produces refusalReason', () => {
            const result = adapter.buildExecutionPlan(payload);
            expect(result.success).toBe(false);
            if (!result.success) {
                // Ensure refusal naming stability
                expect(result.refusalReason).toBe(REFUSAL_REASONS.SCHEMA_MISMATCH);
            }
        });
    });
}
