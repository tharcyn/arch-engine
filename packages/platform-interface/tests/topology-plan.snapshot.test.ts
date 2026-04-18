import { describe, test, expect, vi } from 'vitest';
import { platformTopologyPlanCommand } from '../../cli/src/commands/platform/index.js';

describe('Topology Plan', () => {
    test('renders deterministic deployment topology resolution', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await platformTopologyPlanCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "topology-planned",
          }
        `);
        consoleSpy.mockRestore();
    });
});
