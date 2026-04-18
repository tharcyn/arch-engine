import { describe, test, expect, vi } from 'vitest';
import { assuranceReplayCommand } from '../../cli/src/commands/assurance/index.js';

describe('Temporal Replay', () => {
    test('renders deterministic temporal replay', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceReplayCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "evidence-replayed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
