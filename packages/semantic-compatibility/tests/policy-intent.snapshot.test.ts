import { describe, test, expect, vi } from 'vitest';
import { semanticTranslatePolicyCommand } from '../../cli/src/commands/semantic/index.js';

describe('Policy Intent', () => {
    test('renders deterministic policy intent', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await semanticTranslatePolicyCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "policy-translated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
