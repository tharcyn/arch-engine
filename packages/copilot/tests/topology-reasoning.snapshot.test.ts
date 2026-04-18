import { describe, test, expect, vi } from 'vitest';
import { copilotReasonTopologyCommand } from '../../cli/src/commands/copilot/index.js';

describe('Topology Reasoning', () => {
    test('renders deterministic topology reasoning', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await copilotReasonTopologyCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "topology-reasoned",
          }
        `);
        consoleSpy.mockRestore();
    });
});
