import { describe, test, expect, vi } from 'vitest';
import { foundationWorkingGroupsCommand } from '../../cli/src/commands/foundation/index.js';

describe('Working Groups', () => {
    test('renders deterministic working group lifecycle', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await foundationWorkingGroupsCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "working-groups-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
