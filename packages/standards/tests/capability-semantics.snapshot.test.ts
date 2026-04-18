import { describe, test, expect, vi } from 'vitest';
import { standardsCapabilitiesCommand } from '../../cli/src/commands/standards/index.js';

describe('Capability Semantics', () => {
    test('renders deterministic capability semantics', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await standardsCapabilitiesCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "capabilities-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
