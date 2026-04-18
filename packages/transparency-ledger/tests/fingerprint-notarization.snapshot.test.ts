import { describe, test, expect, vi } from 'vitest';
import { notarizeFingerprintCommand } from '../../cli/src/commands/ledger/index.js';

describe('Fingerprint Notarization', () => {
    test('renders deterministic fingerprint notarization', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await notarizeFingerprintCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "fingerprint-notarized",
          }
        `);
        consoleSpy.mockRestore();
    });
});
