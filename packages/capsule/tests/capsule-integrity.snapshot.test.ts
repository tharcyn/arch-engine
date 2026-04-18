import { describe, test, expect, vi } from 'vitest';
import { capsuleVerifyCommand } from '../../cli/src/commands/capsule/index.js';

describe('Capsule Integrity', () => {
    test('renders deterministic capsule integrity', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await capsuleVerifyCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "capsule-verified",
          }
        `);
        consoleSpy.mockRestore();
    });
});
