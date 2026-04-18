import { describe, test, expect, vi } from 'vitest';
import { identityInspectCommand } from '../../../cli/src/commands/identity/index.js';

describe('Identity Chain', () => {
    test('renders deterministic identity chain', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await identityInspectCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "issuerIdentity": "root-authority",
            "publicKey": "inspect-key",
            "revocationStatus": "valid",
            "signatureAlgorithm": "ed25519",
            "trustTier": "tier-1",
            "validityWindow": "2026-01-01T00:00:00Z/2027-01-01T00:00:00Z",
          }
        `);
        consoleSpy.mockRestore();
    });
});
