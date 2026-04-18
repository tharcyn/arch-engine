import { describe, test, expect, vi } from 'vitest';
import { certifyMaturityCommand } from '../../cli/src/commands/certify/index.js';

describe('Maturity Certification', () => {
    test('renders deterministic maturity certification', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await certifyMaturityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "maturity-certified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
