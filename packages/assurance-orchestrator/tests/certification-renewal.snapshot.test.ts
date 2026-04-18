import { describe, test, expect, vi } from 'vitest';
import { assuranceRenewCertificationsCommand } from '../../cli/src/commands/assurance/index.js';

describe('Certification Renewal', () => {
    test('renders deterministic certification rollover', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await assuranceRenewCertificationsCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "certifications-renewed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
