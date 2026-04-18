import { describe, test, expect } from 'vitest';
import { declareSupportedExecutionModes, validateExecutionModeCompatibility } from '../src/policy-pack/execution-modes/index.js';

describe('Execution Mode Contract', () => {
    test('orders modes deterministically', () => {
        expect(declareSupportedExecutionModes(['multi-provider', 'single-provider'])).toMatchInlineSnapshot(`
          [
            "multi-provider",
            "single-provider",
          ]
        `);
    });

    test('validates execution mode registry alignment', () => {
        expect(() => validateExecutionModeCompatibility(['single-provider', 'federated'])).not.toThrow();
        expect(() => validateExecutionModeCompatibility(['single-provider', 'invalid-mode'] as any)).toThrow('Invalid execution mode declared: invalid-mode');
    });
});
