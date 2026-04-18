import { describe, test, expect, vi } from 'vitest';
import { packGraphCommand } from '../../src/commands/docs/packGraph.js';

describe('Pack Graph Command', () => {
    test('outputs explain doc', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await packGraphCommand('test-pack', { json: true });
        
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "conflictGraph": {
              "nodes": [
                "delta",
              ],
            },
            "dependencyGraph": {
              "edges": [
                "alpha->beta",
              ],
              "nodes": [
                "alpha",
                "beta",
              ],
            },
            "lockfileClosureMapping": {
              "alpha": "hash-a",
              "beta": "hash-b",
            },
            "optionalDependencyGraph": {
              "nodes": [
                "gamma",
              ],
            },
            "packId": "test-pack",
            "resolutionOrder": [
              "beta",
              "alpha",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
