import { describe, test, expect, vi } from 'vitest';
import { transparencyCertificationLogCommand } from '../../cli/src/commands/transparency/index.js';

describe('Certification Log', () => {
    test('renders deterministic certification log', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await transparencyCertificationLogCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "certification-logged",
          }
        `);
        consoleSpy.mockRestore();
    });
});
