import { describe, test, expect, vi } from 'vitest';
import { trustScoreRegistryCommand } from '../../../cli/src/commands/reputation/index.js';

describe('Registry Score', () => {
    test('renders deterministic registry score', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await trustScoreRegistryCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "registryCredibilityScore": 100,
          }
        `);
        consoleSpy.mockRestore();
    });
});
