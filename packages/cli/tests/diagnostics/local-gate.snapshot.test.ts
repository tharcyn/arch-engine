import { describe, test, expect, vi } from 'vitest';
import { gateLocalCommand } from '../../src/commands/gate/local.js';

describe('Local Gate Output', () => {
    test('renders deterministic local gate output', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const exitCode = await gateLocalCommand({ json: true, failOn: 'severity>=medium' });
        expect(exitCode).toBe(1);
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "diagnosticsEmitted": 1,
            "exitCode": 1,
            "incrementalEvaluation": true,
            "mode": "local",
            "traceReferences": [
              "trace-1",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
