import { describe, test, expect, vi } from 'vitest';
import { bundleVerifyAuthorityCommand } from '../../../cli/src/commands/bundle/verify-authority.js';

describe('Authority Resolution', () => {
    test('renders deterministic authority resolution', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await bundleVerifyAuthorityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "bundleAuthorityCertificate": "bundle-cert-1",
            "bundlePublisherIdentity": "pub-a",
            "bundleSignatureChain": [
              "sig-1",
              "sig-root",
            ],
            "status": "verified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
