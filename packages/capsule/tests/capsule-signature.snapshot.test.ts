import { describe, test, expect, vi } from 'vitest';
import { capsuleSignCommand } from '../../cli/src/commands/capsule/index.js';

describe('Capsule Signature', () => {
    test('renders deterministic trust envelopes', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await capsuleSignCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "capsule-signed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
