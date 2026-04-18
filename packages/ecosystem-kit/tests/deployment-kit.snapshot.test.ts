import { describe, test, expect, vi } from 'vitest';
import { ecosystemInitReferenceCommand } from '../../cli/src/commands/ecosystem/index.js';

describe('Deployment Kit', () => {
    test('renders deterministic reference deployment templates', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await ecosystemInitReferenceCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "reference-initialized",
          }
        `);
        consoleSpy.mockRestore();
    });
});
