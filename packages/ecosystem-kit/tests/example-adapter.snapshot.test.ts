import { describe, test, expect, vi } from 'vitest';
import { ecosystemGenerateExampleAdapterCommand } from '../../cli/src/commands/ecosystem/index.js';

describe('Example Adapter', () => {
    test('renders deterministic example adapter scaffolds', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await ecosystemGenerateExampleAdapterCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "example-adapter-generated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
