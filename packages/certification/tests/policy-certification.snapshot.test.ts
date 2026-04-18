import { describe, test, expect, vi } from 'vitest';
import { certifyPolicyPackCommand } from '../../cli/src/commands/certify/index.js';

describe('Policy Certification', () => {
    test('renders deterministic policy pack certification', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await certifyPolicyPackCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "policy-pack-certified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
