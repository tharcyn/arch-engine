import { describe, test, expect, vi } from 'vitest';
import { observeTopologyCommand } from '../../cli/src/commands/observe/index.js';

describe('Signal Stream', () => {
    test('renders deterministic signal stream', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await observeTopologyCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "topology-observed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
