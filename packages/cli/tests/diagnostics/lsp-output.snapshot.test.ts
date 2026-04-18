import { describe, test, expect, vi } from 'vitest';
import { diagnosticsWorkspaceCommand } from '../../src/commands/diagnostics/index.js';

describe('LSP Output', () => {
    test('renders deterministic LSP-compatible json', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await diagnosticsWorkspaceCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          [
            {
              "code": "rule-boundary",
              "message": "Authority boundary violation detected",
              "range": {
                "end": {
                  "character": 50,
                  "line": 10,
                },
                "start": {
                  "character": 5,
                  "line": 10,
                },
              },
              "relatedInformation": [
                {
                  "location": {
                    "range": {
                      "end": {
                        "character": 50,
                        "line": 10,
                      },
                      "start": {
                        "character": 5,
                        "line": 10,
                      },
                    },
                    "uri": "file:///src/main.ts",
                  },
                  "message": "Suggested resolution: Remove cross-boundary call (Trace: trace-1)",
                },
              ],
              "severity": 1,
              "source": "arch-engine",
            },
          ]
        `);
        consoleSpy.mockRestore();
    });
});
