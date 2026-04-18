import { describe, test, expect, vi } from 'vitest';
import { capabilityListCommand } from '../../src/commands/docs/capability.js';

describe('Capability List Command', () => {
    test('outputs list', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await capabilityListCommand({ json: true });
        
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          [
            {
              "capabilityId": "authority-boundary",
              "description": "Detects cross-authority boundaries",
              "policyPacks": [
                "alpha",
                "beta",
              ],
            },
            {
              "capabilityId": "directionality-analysis",
              "description": "Checks edges direction",
              "policyPacks": [
                "alpha",
              ],
            },
          ]
        `);
        consoleSpy.mockRestore();
    });
});
