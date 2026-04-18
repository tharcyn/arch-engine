import { describe, test, expect, vi } from 'vitest';
import { semanticListCommand } from '../../cli/src/commands/semantic/index.js';

describe('Semantic Mapping', () => {
    test('renders deterministic semantic mapping', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await semanticListCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "semantics-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
